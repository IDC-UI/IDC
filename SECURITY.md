# خطوات الأمان المطلوبة من لوحة التحكم (خارج الكود)

الكود مؤمّن وتم اختباره بالكامل (`node --experimental-strip-types tests/security.test.mjs` = 62 فحص). الخطوات التالية تُنفّذ على GitHub وSupabase:

1. **GitHub → Settings → Pages → Enforce HTTPS** (تفعيل الخيار). الكود يحوّل أيضًا `http` إلى `https` ويرفض أي اتصال غير مشفّر عبر `CSP`.
2. **تطبيق ملفات الـ migrations الجديدة ونشر الـ Edge Functions:**
   ```powershell
   supabase db push
   supabase config push        # بعد وضع site_url الحقيقي في supabase/config.toml
   supabase secrets set ALLOWED_ORIGINS=https://idc-ui.github.io
   supabase functions deploy secure-vault
   supabase functions deploy secure-upload
   supabase functions deploy authorize-route
   ```
   بدون `ALLOWED_ORIGINS` ترفض الـ Edge Functions طلبات المتصفح تلقائيًا (`fail-closed`).
3. **Supabase Dashboard → Authentication → Rate Limits / Attack Protection:** مراجعة حدود الطلبات وتفعيل الحماية الإضافية عند الحاجة.
4. **SRI للمكتبات الخارجية:** تشغيل `node scripts/generate-sri.mjs` ووضع قيم `integrity` في وسمي `<script>` داخل `index.html`.
5. **بعد النشر:** تجربة إنشاء حساب جديد ببريد حقيقي والتأكد من أن رابط التفعيل يفتح على رابط GitHub Pages الصحيح.
