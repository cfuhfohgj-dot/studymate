"use client";
import { use, useEffect, useRef, useState } from "react";
import { useUI } from "@/components/Providers";
import { API, getStudy, sendChat, startVideo } from "@/lib/api";

export default function Study({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { t } = useUI();
  const [s, setS] = useState<any>(null); const [msgs, setMsgs] = useState<{ role: string; content: string }[]>([]);
  const [q, setQ] = useState(""); const [sending, setSending] = useState(false); const [picked, setPicked] = useState<Record<number, number>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => { const d = await getStudy(id); if (!alive) return; setS(d); setMsgs(m => (m.length ? m : d.messages)); return d; };
    load(); const i = setInterval(async () => { const d = await load(); if (d && d.video_status !== "processing") clearInterval(i); }, 4000);
    return () => { alive = false; clearInterval(i); };
  }, [id]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  async function ask() {
    if (!q.trim() || sending) return; const m = q; setQ(""); setSending(true);
    setMsgs(x => [...x, { role: "user", content: m }]);
    try { const r = await sendChat(id, m); setMsgs(x => [...x, { role: "assistant", content: r.reply }]); } finally { setSending(false); }
  }
  async function retry() { await startVideo(id); setS({ ...s, video_status: "processing" }); }
  if (!s) return <p className="pt-10">…</p>;
  const L = s.lesson; const card = "rounded-3xl bg-white p-6 ring-1 ring-ink/10 dark:bg-white/5 dark:ring-white/15";

  return (
    <article className="space-y-8 pt-4">
      <h1 className="text-2xl font-extrabold sm:text-4xl">{L.title}</h1>

      <section aria-label={t.video} className="overflow-hidden rounded-3xl bg-ink ring-1 ring-ink/20">
        {s.video_status === "done" ? (
          <video controls playsInline className="aspect-video w-full" src={`${API}${s.video_url}`} />
        ) : (
          <div className="grid aspect-video place-items-center p-6 text-center text-white">
            {s.video_status === "failed" ? (
              <div><p className="mb-3 font-bold">{t.failed}</p><button onClick={retry} className="rounded-full bg-iris px-6 py-2 font-bold">{t.retry}</button></div>
            ) : (
              <div><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-mint border-t-transparent" />
                <p className="font-semibold">{t.rendering}</p></div>)}
          </div>)}
      </section>
      {s.video_status === "done" && <a className="inline-block font-bold text-iris underline" href={`${API}${s.video_url}`} download>{t.download}</a>}

      <section className={card}>
        <h2 className="mb-3 text-xl font-bold">{t.summary}</h2>
        <ul className="list-disc space-y-2 ps-5 leading-8 marker:text-mint">{L.summary.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
      </section>

      <section className={card}>
        <h2 className="mb-4 text-xl font-bold">{t.steps}</h2>
        <ol className="space-y-5">{L.steps.map((x: any, i: number) => (
          <li key={i}><h3 className="font-bold">{i + 1}. {x.heading}</h3><p className="mt-1 leading-8 opacity-90">{x.body}</p></li>))}</ol>
        <div className="mt-6 rounded-2xl bg-mint/20 p-4"><h3 className="mb-1 font-bold">{t.example}</h3><p className="leading-8">{L.example}</p></div>
      </section>

      <section className={card}>
        <h2 className="mb-4 text-xl font-bold">{t.quiz}</h2>
        <div className="space-y-6">{L.quiz.map((qz: any, qi: number) => (
          <div key={qi}><p className="mb-2 font-bold">{qz.q}</p>
            <div className="grid gap-2 sm:grid-cols-2">{qz.options.map((o: string, oi: number) => {
              const chosen = picked[qi] !== undefined; const right = oi === qz.answer;
              const cls = !chosen ? "border-ink/15 hover:bg-ink/5 dark:border-white/20 dark:hover:bg-white/10"
                : right ? "border-mint bg-mint/25" : picked[qi] === oi ? "border-red-400 bg-red-400/15" : "border-ink/10 opacity-60";
              return <button key={oi} disabled={chosen} onClick={() => setPicked(p => ({ ...p, [qi]: oi }))}
                className={`rounded-xl border px-4 py-3 text-start ${cls}`}>{o}</button>; })}</div>
            {picked[qi] !== undefined && <p className="mt-2 text-sm"><b>{picked[qi] === qz.answer ? t.correct : t.wrong}:</b> {qz.why}</p>}
          </div>))}</div>
      </section>

      <section className={card} aria-label={t.chat}>
        <h2 className="mb-4 text-xl font-bold">{t.chat}</h2>
        <div className="max-h-96 space-y-3 overflow-y-auto">{msgs.map((m, i) => (
          <p key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 leading-7 ${m.role === "user" ? "ms-auto bg-iris text-white" : "bg-ink/5 dark:bg-white/10"}`}>{m.content}</p>))}
          {sending && <p className="opacity-60">…</p>}<div ref={endRef} /></div>
        <div className="mt-4 flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && ask()} placeholder={t.chatPh}
            className="min-w-0 flex-1 rounded-full border border-ink/15 bg-transparent px-5 py-3 outline-none dark:border-white/20" />
          <button onClick={ask} disabled={sending} className="rounded-full bg-iris px-6 font-bold text-white disabled:opacity-60">{t.send}</button>
        </div>
      </section>
    </article>
  );
}
