// التطبيق يفتح موقعك المنشور (HTTPS) داخل غلاف أصلي. غيّر الرابط بعد النشر.
const config = {
  appId: "com.studymate.app",
  appName: "StudyMate",
  webDir: "www",
  server: { url: process.env.APP_URL ?? "https://YOUR-DEPLOYED-APP.com", cleartext: false },
};
export default config;
