import { gemini, LANG } from "@/lib/gemini";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { lesson, history = [], message, lang = "ar" } = await req.json();
    if (!message) return Response.json({ error: "empty" }, { status: 400 });
    const system = `You are a friendly tutor. Lesson context: ${JSON.stringify(lesson).slice(0, 12000)}. Reply in ${LANG[lang] ?? LANG.ar}, briefly and clearly.`;
    const contents = [...history.slice(-20).map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content) }] })),
      { role: "user", parts: [{ text: String(message) }] }];
    const reply = await gemini({ system_instruction: { parts: [{ text: system }] }, contents });
    return Response.json({ reply });
  } catch (e: any) {
    return Response.json({ error: String(e.message ?? e) }, { status: 500 });
  }
}
