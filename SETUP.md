# إعداد IDC على GitHub Pages وSupabase

## 1. إعداد Supabase

1. إنشاء مشروع جديد في Supabase.
2. من Authentication → URL Configuration، وضع رابط GitHub Pages الفعلي في Site URL وإضافته إلى Redirect URLs، مع تفعيل تأكيد البريد الإلكتروني وضبط الحد الأدنى لكلمة المرور على 12 حرفًا من إعدادات Password Security.
3. من Project Settings → API Keys، نسخ Project URL والمفتاح العام `publishable` أو `anon` إلى `supabase-config.js`. يُمنع وضع `service_role` أو أي مفتاح سري في ملفات الموقع.
4. تثبيت Supabase CLI وتسجيل الدخول، ثم من مجلد المشروع تشغيل:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy secure-upload
supabase functions deploy secure-vault
supabase functions deploy authorize-route
```

إذا لم تتوفر `SUPABASE_ANON_KEY` تلقائيًا داخل Edge Functions، يُضاف المفتاح العام من إعدادات Edge Function Secrets. لا يُستخدم مفتاح `service_role` في الواجهة أبدًا.

## 2. نشر GitHub Pages

من إعدادات المستودع، يتم اختيار النشر من فرع `main` ومجلد الجذر. الملفات الثابتة المطلوبة: `index.html` و`404.html` و`idc-plus.js` و`idc-intro.js` و`idc-intro.css` و`idc-supabase.js` و`idc-private.js` و`idc-settings.js` و`supabase-config.js` و`manifest.json` و`sw.js` وأيقونات PNG. مجلد `supabase/` يُنشر إلى Supabase عبر CLI، وليس كصفحات GitHub.

## الحماية والملفات

- التسجيل وتأكيد البريد وتسجيل الدخول واستعادة كلمة المرور تتم عبر Supabase Auth.
- حفظ `ciphertext` يمر عبر `secure-vault`، التي تتطلب JWT وترفض الحقول الإضافية وتستخرج مالك الصف من جلسة المستخدم.
- توجيه الروابط الشخصية (`/IDC/<id>`) محمي عبر `authorize-route` لمنع ثغرات الـ IDOR (`403 Forbidden`) عند محاولة تغيير الـ ID في الرابط.
- المحفظة تُشفّر على الجهاز بـ `AES-256-GCM` قبل حفظ `ciphertext` فقط في قاعدة البيانات.
- المرفقات المسموحة PDF وJPG وPNG وWEBP، حتى 5MB، وتُضغط الصور بصيغة WebP قبل التشفير والرفع إلى bucket خاص.
- سياسات RLS تقصر صف المحفظة، الروابط الشخصية، وملفات Storage على مالك الحساب فقط.

## الأمان بعد التحديث

يرجى مراجعة [`SECURITY.md`](SECURITY.md) لخطوات `ALLOWED_ORIGINS` وتطبيق ملفات الـ migrations ونشر `authorize-route` وإجبار HTTPS من إعدادات GitHub Pages.
