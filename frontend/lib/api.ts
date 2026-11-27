// Serverless mode: lessons come from /api/lesson (Gemini) and are stored in this browser (localStorage).
export const API = "";
type Study = { id: string; lang: string; question: string; lesson: any; video_status: string; video_url: string | null; messages: { role: string; content: string }[]; created: string };
const KEY = "studymate.studies";
const load = (): Study[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const save = (a: Study[]) => localStorage.setItem(KEY, JSON.stringify(a.slice(0, 50)));

export const getStudy = async (id: string) => load().find(s => s.id === id) ?? { id, lang: "ar", question: "", video_status: "unavailable", video_url: null, messages: [],
  lesson: { title: "—", steps: [], example: "", summary: [], quiz: [] } };
export const startVideo = async (_id: string) => ({ status: "unavailable" });
export const listStudies = async () => load().map(({ id, question, video_status, created }) => ({ id, question, video_status, created }));

export async function sendChat(id: string, message: string) {
  const all = load(); const s = all.find(x => x.id === id);
  if (!s) throw new Error("study not found");
  const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lesson: s.lesson, history: s.messages, message, lang: s.lang }) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || "failed");
  s.messages.push({ role: "user", content: message }, { role: "assistant", content: d.reply }); save(all);
  return { reply: d.reply as string };
}

export async function createStudy(f: { text: string; lang: string; image?: File | null; pdf?: File | null; audio?: Blob | null }) {
  const fd = new FormData();
  fd.append("text", f.text); fd.append("lang", f.lang);
  if (f.image) fd.append("image", f.image);
  if (f.pdf) fd.append("pdf", f.pdf);
  if (f.audio) fd.append("audio", f.audio, "question.webm");
  const r = await fetch("/api/lesson", { method: "POST", body: fd });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || "failed");
  const id = crypto.randomUUID().slice(0, 10);
  const all = load(); all.unshift({ id, lang: f.lang, question: f.text.slice(0, 200) || d.lesson.title, lesson: d.lesson, video_status: "unavailable", video_url: null, messages: [], created: new Date().toISOString() });
  save(all); return id;
}
