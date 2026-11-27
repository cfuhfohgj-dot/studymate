export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const getStudy = (id: string) => fetch(`${API}/api/study/${id}`, { cache: "no-store" }).then(r => r.json());
export const startVideo = (id: string) => fetch(`${API}/api/study/${id}/video`, { method: "POST" });
export const sendChat = (id: string, message: string) =>
  fetch(`${API}/api/study/${id}/chat`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }) }).then(r => r.json());
export const listStudies = () => fetch(`${API}/api/study`).then(r => r.json());
export async function createStudy(f: { text: string; lang: string; image?: File | null; pdf?: File | null; audio?: Blob | null }) {
  const fd = new FormData();
  fd.append("text", f.text); fd.append("lang", f.lang);
  if (f.image) fd.append("image", f.image);
  if (f.pdf) fd.append("pdf", f.pdf);
  if (f.audio) fd.append("audio", f.audio, "question.webm");
  const r = await fetch(`${API}/api/study`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("failed");
  return (await r.json()).id as string;
}
