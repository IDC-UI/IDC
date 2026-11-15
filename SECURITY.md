# خطوات الأمان اللي لازم تتعمل من لوحة التحكم (مش من الكود)

الكود اتأمّن واتختبر (`node --experimental-strip-types tests/security.test.mjs` = 44 فحص). الخطوات دي بتتنفّذ على GitHub وSupabase:

1. **GitHub → Settings → Pages → Enforce HTTPS** (فعّليها). الكود كمان بيحوّل http إلى https وبيرفض أي اتصال مش مشفّر عبر CSP.
2. **تطبيق الـ migration الجديدة والإعدادات:**
   ```powershell
   supabase db push
   supabase config push        # بعد ما تحطي site_url الحقيقي في supabase/config.toml
   supabase secrets set ALLOWED_ORIGINS=https://YOUR_USER.github.io
   supabase functions deploy secure-vault
   supabase functions deploy secure-upload
   ```
   من غير `ALLOWED_ORIGINS` الـ Edge Functions بترفض طلبات المتصفح (ده مقصود، fail-closed).
3. **Supabase Dashboard → Authentication → Rate Limits / Attack Protection:** راجعي الأرقام، وفعّلي CAPTCHA (Turnstile) لو عايزة حماية أقوى للّوجن.
4. **SRI للمكتبات الخارجية:** شغّلي `node scripts/generate-sri.mjs` (محتاج إنترنت) وحطي قيم `integrity` في وسمي `<script>` في `index.html`.
5. **بعد النشر:** اعملي تسجيل حساب جديد بإيميل حقيقي وتأكدي إن رابط التأكيد بيفتح على رابط GitHub Pages الصح.
