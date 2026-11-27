# StudyMate — AI study tutor with video explanations

## التشغيل
```bash
cp .env.example .env          # ضع المفاتيح (OpenAI + ElevenLabs) ومسار خط عربي
# Backend (يتطلب ffmpeg)
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
# Frontend
cd frontend && npm install && npm run dev      # http://localhost:3000
```
## خط الإنتاج
مدخل (نص/صورة/PDF/صوت) → GPT-4o (شرح JSON + اختبار) → سيناريو مشاهد → ElevenLabs (تعليق صوتي) → شرائح Pillow → FFmpeg (mp4) → /media/{id}.mp4
لاستبدال الشرائح بأفاتار معلم: استدعِ HeyGen/D-ID داخل `render_video` بدل `slide()` + ffmpeg.

## تحويله لتطبيق موبايل
1. انشر الـ Backend (Render/Railway/VPS) والـ Frontend (Vercel) على HTTPS، وحدّث `NEXT_PUBLIC_API_URL` و`CORS_ORIGIN`.
2. `cd frontend && npm install && APP_URL=https://رابطك npx cap add android && npx cap add ios`
3. صلاحية المايك — أندرويد: أضف `<uses-permission android:name="android.permission.RECORD_AUDIO"/>` في AndroidManifest.xml.
   iOS: أضف `NSMicrophoneUsageDescription` في Info.plist.
4. `npm run app:android` (Android Studio) أو `npm run app:ios` (Xcode، يتطلب Mac) ثم Build/Run.
بدون أي من ذلك: افتح الموقع من الموبايل واختر "إضافة إلى الشاشة الرئيسية" (PWA جاهز).
