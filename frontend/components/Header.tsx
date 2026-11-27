"use client";
import Link from "next/link";
import { useUI } from "./Providers";

export default function Header() {
  const { lang, setLang, dark, setDark, t } = useUI();
  const btn = "rounded-full px-4 py-2 text-sm font-semibold border border-ink/15 dark:border-white/20 hover:bg-ink/5 dark:hover:bg-white/10";
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
      <Link href="/" className="text-xl font-extrabold tracking-tight">StudyMate</Link>
      <nav className="flex gap-2" aria-label="settings">
        <button className={btn} onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{t.other}</button>
        <button className={btn} onClick={() => setDark(!dark)} aria-label="theme">{dark ? "☀" : "☾"}</button>
      </nav>
    </header>
  );
}
