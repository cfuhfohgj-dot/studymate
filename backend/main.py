"""StudyMate API — FastAPI. شغّل: uvicorn main:app --reload  (يتطلب ffmpeg مثبتًا)"""
import os, json, uuid, sqlite3, subprocess, base64, io, textwrap
from pathlib import Path
from dotenv import load_dotenv
load_dotenv("../.env")
import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI
from pypdf import PdfReader
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

ai = OpenAI()  # يقرأ OPENAI_API_KEY
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
MEDIA = Path(os.getenv("MEDIA_DIR", "./media")); MEDIA.mkdir(exist_ok=True)
DB = os.getenv("DATABASE_PATH", "./studymate.db")

app = FastAPI(title="StudyMate")
app.add_middleware(CORSMiddleware, allow_origins=[os.getenv("CORS_ORIGIN", "*")],
                   allow_methods=["*"], allow_headers=["*"])
app.mount("/media", StaticFiles(directory=MEDIA), name="media")

def db():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c
with db() as c:
    c.executescript("""
    CREATE TABLE IF NOT EXISTS studies(id TEXT PRIMARY KEY, lang TEXT, question TEXT, lesson TEXT,
      video_status TEXT DEFAULT 'idle', video_url TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, study_id TEXT, role TEXT, content TEXT);""")

def llm_json(system: str, user_content) -> dict:
    r = ai.chat.completions.create(model=MODEL, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user_content}])
    return json.loads(r.choices[0].message.content)

LANG = {"ar": "Arabic (simple, friendly, clear Modern Standard with a light colloquial tone)", "en": "English"}

# ---------- 1) إدخال متعدد الوسائط + الشرح النصي ----------
@app.post("/api/study")
async def create_study(text: str = Form(""), lang: str = Form("ar"),
                       image: UploadFile | None = File(None), pdf: UploadFile | None = File(None),
                       audio: UploadFile | None = File(None)):
    question = text
    if audio:  # تسجيل صوتي -> نص (Whisper)
        tr = ai.audio.transcriptions.create(model="whisper-1",
             file=(audio.filename or "q.webm", await audio.read()))
        question += "\n" + tr.text
    if pdf:
        reader = PdfReader(io.BytesIO(await pdf.read()))
        question += "\n" + "\n".join((p.extract_text() or "") for p in reader.pages[:15])[:12000]
    parts = [{"type": "text", "text": question.strip() or "Explain the attached image."}]
    if image:
        b64 = base64.b64encode(await image.read()).decode()
        parts.append({"type": "image_url", "image_url": {"url": f"data:{image.content_type};base64,{b64}"}})
    if not question.strip() and not image:
        raise HTTPException(400, "empty input")
    lesson = llm_json(f"""You are an expert, patient tutor. Answer in {LANG.get(lang, LANG['ar'])}.
Return JSON: {{"title": str, "steps": [{{"heading": str, "body": str}}], "example": str,
"summary": [str] (3-6 key points), "quiz": [{{"q": str, "options": [str x4], "answer": int (0-3), "why": str}}] (3 questions)}}.
Explain step by step, simply, with a practical example.""", parts)
    sid = uuid.uuid4().hex[:10]
    with db() as c:
        c.execute("INSERT INTO studies(id,lang,question,lesson) VALUES(?,?,?,?)",
                  (sid, lang, question[:2000], json.dumps(lesson, ensure_ascii=False)))
    return {"id": sid}

@app.get("/api/study")
def history():
    with db() as c:
        rows = c.execute("SELECT id, question, video_status, created FROM studies ORDER BY created DESC LIMIT 50").fetchall()
    return [dict(r) for r in rows]

@app.get("/api/study/{sid}")
def get_study(sid: str):
    with db() as c:
        r = c.execute("SELECT * FROM studies WHERE id=?", (sid,)).fetchone()
        msgs = c.execute("SELECT role, content FROM messages WHERE study_id=? ORDER BY id", (sid,)).fetchall()
    if not r: raise HTTPException(404)
    d = dict(r); d["lesson"] = json.loads(d["lesson"]); d["messages"] = [dict(m) for m in msgs]
    return d

# ---------- 2) خط إنتاج الفيديو: سيناريو -> صوت -> شرائح -> FFmpeg ----------
def make_script(lesson: dict, lang: str) -> list[dict]:
    out = llm_json(f"""Write a 60-120 second explainer video script in {LANG.get(lang, LANG['ar'])} as JSON:
{{"scenes": [{{"title": str (max 6 words), "bullets": [str] (max 3, short), "narration": str (2-3 spoken sentences)}}]}}
4 to 6 scenes. Warm teacher tone, one concrete example, end with a recap.""",
        json.dumps(lesson, ensure_ascii=False))
    return out["scenes"]

def tts(text: str, path: Path):  # ElevenLabs
    r = httpx.post(f"https://api.elevenlabs.io/v1/text-to-speech/{os.environ['ELEVENLABS_VOICE_ID']}",
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"]}, timeout=120,
        json={"text": text, "model_id": "eleven_multilingual_v2"})
    r.raise_for_status(); path.write_bytes(r.content)

def shape(s: str, rtl: bool) -> str:
    return get_display(arabic_reshaper.reshape(s)) if rtl else s

def slide(scene: dict, rtl: bool, path: Path, W=1280, H=720):
    img = Image.new("RGB", (W, H), "#0F1B3D"); d = ImageDraw.Draw(img)
    fp = os.environ["FONT_PATH"]; big = ImageFont.truetype(fp, 64); small = ImageFont.truetype(fp, 40)
    d.rectangle([0, 0, W, 10], fill="#7BE0B0")
    x, anchor = (W - 90, "ra") if rtl else (90, "la")
    d.text((x, 90), shape(scene["title"], rtl), font=big, fill="#FFFFFF", anchor=anchor)
    y = 260
    for b in scene.get("bullets", [])[:3]:
        for line in textwrap.wrap(b, 42):
            d.text((x, y), shape(line, rtl), font=small, fill="#C9D3F5", anchor=anchor); y += 58
        y += 26
    img.save(path)

def render_video(sid: str, lang: str, lesson: dict):
    work = MEDIA / sid; work.mkdir(exist_ok=True)
    try:
        clips = []
        for i, s in enumerate(make_script(lesson, lang)):
            a, p, o = work / f"{i}.mp3", work / f"{i}.png", work / f"{i}.mp4"
            tts(s["narration"], a); slide(s, lang == "ar", p)
            subprocess.run(["ffmpeg", "-y", "-loop", "1", "-i", str(p), "-i", str(a), "-c:v", "libx264",
                "-tune", "stillimage", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(o)],
                check=True, capture_output=True)
            clips.append(o)
        lst = work / "list.txt"; lst.write_text("".join(f"file '{c.resolve()}'\n" for c in clips))
        subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                        "-c:v", "libx264", "-c:a", "aac", str(MEDIA / f"{sid}.mp4")], check=True, capture_output=True)
        status, url = "done", f"/media/{sid}.mp4"
    except Exception as e:
        print("video failed:", e); status, url = "failed", None
    with db() as c:
        c.execute("UPDATE studies SET video_status=?, video_url=? WHERE id=?", (status, url, sid))

@app.post("/api/study/{sid}/video")
def start_video(sid: str, bg: BackgroundTasks):
    s = get_study(sid)
    with db() as c: c.execute("UPDATE studies SET video_status='processing' WHERE id=?", (sid,))
    bg.add_task(render_video, sid, s["lang"], s["lesson"])
    return {"status": "processing"}

# ---------- 3) المساعد التفاعلي ----------
class Chat(BaseModel): message: str

@app.post("/api/study/{sid}/chat")
def chat(sid: str, body: Chat):
    s = get_study(sid)
    hist = [{"role": m["role"], "content": m["content"]} for m in s["messages"]]
    sys = f"You are a friendly tutor. Lesson context: {json.dumps(s['lesson'], ensure_ascii=False)}. Reply in {LANG.get(s['lang'], LANG['ar'])}, briefly and clearly."
    r = ai.chat.completions.create(model=MODEL,
        messages=[{"role": "system", "content": sys}, *hist, {"role": "user", "content": body.message}])
    reply = r.choices[0].message.content
    with db() as c:
        c.executemany("INSERT INTO messages(study_id,role,content) VALUES(?,?,?)",
                      [(sid, "user", body.message), (sid, "assistant", reply)])
    return {"reply": reply}
