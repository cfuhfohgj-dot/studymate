"use client";
import { createContext, useContext, useEffect, useState } from "react";

const D = {
  ar: { ask: "ما الجزء الذي يصعب عليك فهمه اليوم؟", ph: "اكتب الفقرة أو السؤال هنا…", image: "صورة", file: "ملف PDF", mic: "تسجيل صوتي",
    stop: "إيقاف التسجيل", go: "اشرح لي بالفيديو", working: "نجهّز الشرح…", recent: "مذاكراتك السابقة", err: "تعذّر إنشاء الشرح. تأكد من تشغيل الخادم ومفاتيح الـ API.",
    video: "الفيديو", rendering: "نصنع الفيديو الآن، يستغرق دقيقة تقريبًا…", failed: "فشل توليد الفيديو.", retry: "أعد المحاولة", download: "تحميل الفيديو",
    summary: "النقاط الرئيسية", steps: "الشرح خطوة بخطوة", example: "مثال تطبيقي", quiz: "اختبر فهمك", correct: "إجابة صحيحة", wrong: "راجع الشرح",
    chat: "اسأل المساعد عن أي نقطة", send: "إرسال", chatPh: "ما الذي لم يتضح لك في الفيديو؟", home: "الرئيسية", other: "EN" },
  en: { ask: "What's the hardest part to understand today?", ph: "Type the paragraph or question here…", image: "Image", file: "PDF", mic: "Voice",
    stop: "Stop recording", go: "Explain with video", working: "Preparing your lesson…", recent: "Recent sessions", err: "Couldn't create the lesson. Check the server and API keys.",
    video: "Video", rendering: "Rendering your video, about a minute…", failed: "Video generation failed.", retry: "Try again", download: "Download video",
    summary: "Key points", steps: "Step by step", example: "Worked example", quiz: "Check your understanding", correct: "Correct", wrong: "Review the steps",
    chat: "Ask about any point", send: "Send", chatPh: "What wasn't clear in the video?", home: "Home", other: "عربي" },
};
type Lang = "ar" | "en";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; dark: boolean; setDark: (d: boolean) => void; t: typeof D.ar }>(null!);
export const useUI = () => useContext(Ctx);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setLang((localStorage.getItem("lang") as Lang) || "ar");
    setDark(localStorage.getItem("dark") === "1");
  }, []);
  useEffect(() => {
    const h = document.documentElement;
    h.lang = lang; h.dir = lang === "ar" ? "rtl" : "ltr"; h.classList.toggle("dark", dark);
    try { localStorage.setItem("lang", lang); localStorage.setItem("dark", dark ? "1" : "0"); } catch {}
  }, [lang, dark]);
  return <Ctx.Provider value={{ lang, setLang, dark, setDark, t: D[lang] }}>{children}</Ctx.Provider>;
}
