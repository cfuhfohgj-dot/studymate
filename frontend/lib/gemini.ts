const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const LANG: Record<string, string> = {
  ar: "Arabic (simple, friendly, clear Modern Standard with a light colloquial tone)",
  en: "English",
};
export async function gemini(body: object): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const t = d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  if (!t) throw new Error("empty response");
  return t;
}
