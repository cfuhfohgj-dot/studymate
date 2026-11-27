import "./globals.css";
import { Cairo } from "next/font/google";
import Providers from "@/components/Providers";
import Header from "@/components/Header";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });
export const metadata = { title: "StudyMate", description: "AI study tutor with video explanations",
  manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "StudyMate" }, icons: { apple: "/icon-192.png" } };
export const viewport = { themeColor: "#0F1B3D", viewportFit: "cover" as const };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-sans min-h-screen">
        <Providers><Header /><main className="mx-auto max-w-5xl px-5 pb-16">{children}</main></Providers>
      </body>
    </html>
  );
}
