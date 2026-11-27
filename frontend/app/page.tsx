"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUI } from "@/components/Providers";
import { createStudy, startVideo, listStudies } from "@/lib/api";

export default function Home() {
  const { t, lang } = useUI(); const router = useRouter();
  const [text, setText] = useState(""); const [image, setImage] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null); const [audio, setAudio] = useState<Blob | null>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [hist, setHist] = useState<any[]>([]);
  const imgRef = useRef<HTMLInputElement>(null); const pdfRef = useRef<HTMLInputElement>(null);
  useEffect(() => { listStudies().then(setHist).catch(() => {}); }, []);

  async function toggleMic() {
    if (rec) { rec.stop(); setRec(null); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream); const chunks: Blob[] = [];
    mr.ondataavailable = e => chunks.push(e.data);
    mr.onstop = () => { setAudio(new Blob(chunks, { type: "audio/webm" })); stream.getTracks().forEach(x => x.stop()); };
    mr.start(); setRec(mr);
  }
  async function submit() {
    if (!text.trim() && !image && !pdf && !audio) return;
    setBusy(true); setErr("");
    try { const id = await createStudy({ text, lang, image, pdf, audio }); await startVideo(id); router.push(`/study/${id}`); }
    catch { setErr(t.err); setBusy(false); }
  }
  const chip = "inline-flex items-center gap-2 rounded-full border border-ink/15 dark:border-white/20 px-4 py-2 text-sm font-semibold hover:bg-ink/5 dark:hover:bg-white/10";
  return (
    <section className="pt-8 sm:pt-16">
      <h1 className="max-w-2xl text-3xl font-extrabold leading-snug sm:text-5xl sm:leading-tight">{t.ask}</h1>
      <div className="mt-8 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ink/10 dark:bg-white/5 dark:ring-white/15">
        <textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder={t.ph}
          className="w-full resize-none bg-transparent p-2 text-lg outline-none placeholder:text-ink/40 dark:placeholder:text-white/40" />
        <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3 dark:border-white/10">
          <input ref={imgRef} type="file" accept="image/*" hidden onChange={e => setImage(e.target.files?.[0] ?? null)} />
          <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={e => setPdf(e.target.files?.[0] ?? null)} />
          <button className={chip} onClick={() => imgRef.current?.click()}>🖼 {image ? image.name.slice(0, 14) : t.image}</button>
          <button className={chip} onClick={() => pdfRef.current?.click()}>📄 {pdf ? pdf.name.slice(0, 14) : t.file}</button>
          <button className={chip} onClick={toggleMic} aria-pressed={!!rec}>{rec ? `⏹ ${t.stop}` : `🎙 ${audio ? "✓" : t.mic}`}</button>
        </div>
      </div>
      <button onClick={submit} disabled={busy}
        className="mt-5 w-full rounded-2xl bg-iris px-8 py-4 text-lg font-extrabold text-white shadow-lg shadow-iris/30 transition hover:brightness-110 disabled:opacity-60 sm:w-auto">
        {busy ? t.working : `▶ ${t.go}`}
      </button>
      {err && <p role="alert" className="mt-3 font-semibold text-red-600 dark:text-red-400">{err}</p>}
      {hist.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-3 text-lg font-bold">{t.recent}</h2>
          <ul className="divide-y divide-ink/10 dark:divide-white/10">
            {hist.slice(0, 6).map(h => (
              <li key={h.id}><Link href={`/study/${h.id}`} className="block truncate py-3 hover:text-iris">{h.question || h.id}</Link></li>
            ))}
          </ul>
        </div>)}
    </section>
  );
}
