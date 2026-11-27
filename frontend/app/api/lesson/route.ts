import { gemini, LANG } from "@/lib/gemini";
export const maxDuration = 60;
const b64 = async (f: File) => Buffer.from(await f.arrayBuffer()).toString("base64");

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const text = String(fd.get("text") ?? ""); const lang = String(fd.get("lang") ?? "ar");
    const parts: any[] = [];
    for (const k of ["image", "pdf", "audio"]) {
      const f = fd.get(k);
      if (f instanceof File && f.size > 0) {
        if (f.size > 3_500_000) return Response.json({ error: "file too large (max ~3.5MB)" }, { status: 413 });
        parts.push({ inline_data: { mime_type: (f.type || "application/octet-stream").split(";")[0], data: await b64(f) } });
      }
    }
    if (!text.trim() && !parts.length) return Response.json({ error: "empty input" }, { status: 400 });
    parts.push({ text: text.trim() || "Explain the attached material." });
    const system = `You are an expert, patient tutor. Answer in ${LANG[lang] ?? LANG.ar}.
Return JSON only: {"title": str, "steps": [{"heading": str, "body": str}], "example": str,
"summary": [str] (3-6 key points), "quiz": [{"q": str, "options": [str x4], "answer": int (0-3), "why": str}] (3 questions)}.
Explain step by step, simply, with a practical example. If audio is attached, treat what is said as the question.`;
    const out = await gemini({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json" },
    });
    return Response.json({ lesson: JSON.parse(out) });
  } catch (e: any) {
    return Response.json({ error: String(e.message ?? e) }, { status: 500 });
  }
}
