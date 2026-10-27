# إعداد IDC على GitHub Pages وSupabase

## 1. إعداد Supabase

1. أنشئي مشروعًا جديدًا في Supabase.
2. من Authentication → URL Configuration، ضعي رابط GitHub Pages الفعلي في Site URL وأضيفيه إلى Redirect URLs. فعّلي تأكيد البريد الإلكتروني، واضبطي الحد الأدنى لكلمة المرور على 12 حرفًا من إعدادات Password Security.
3. من Project Settings → API Keys، انسخي Project URL والمفتاح العام `publishable` أو `anon` إلى `supabase-config.js`. لا تضعي `service_role` أو أي secret key في ملفات الموقع.
4. ثبّتي Supabase CLI وسجّلي الدخول، ثم من مجلد المشروع شغّلي:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy secure-upload
supabase functions deploy secure-vault
```

إذا لم تتوفر `SUPABASE_ANON_KEY` تلقائيًا داخل Edge Functions، أضيفي المفتاح العام من إعدادات Edge Function Secrets. لا تستخدمي `service_role` في الواجهة.

## 2. نشر GitHub Pages

من إعدادات المستودع، اختاري النشر من فرع `main` ومجلد الجذر. الملفات الثابتة المطلوبة: `index.html` و`idc-plus.js` و`idc-supabase.js` و`supabase-config.js` و`manifest.json` و`sw.js` والأيقونتان. مجلد `supabase/` يُنشر إلى Supabase عبر CLI، وليس كصفحات GitHub.

## الحماية والملفات

- التسجيل وتأكيد البريد وتسجيل الدخول واستعادة كلمة المرور تتم عبر Supabase Auth.
- حفظ ciphertext يمر عبر `secure-vault`، التي تتطلب JWT وترفض الحقول الإضافية وتستخرج مالك الصف من جلسة المستخدم. الخادم لا يستطيع تنقية محتوى E2E؛ يتحقق فقط من البنية والحجم، وSupabase Auth وقيود SQL يفرضان قواعد الخادم.
- المحفظة تُشفّر على الجهاز بـAES-256-GCM قبل حفظ ciphertext فقط في قاعدة البيانات. كلمة مرور الدخول هي مفتاح اشتقاق التشفير؛ فقدانها يعني عدم إمكانية استرجاع بيانات E2E. مسار الاستعادة يرفض تغيير كلمة المرور إذا لم تستطع الجديدة فك المحفظة الحالية.
- المرفقات المسموحة PDF وJPG وPNG وWEBP، حتى 5MB. تُشفّر قبل الرفع إلى bucket خاص. Edge Function تتطلب JWT وتتحقق من الحجم والاسم ونوع الحاوية وترويسة IDC؛ وبسبب E2E لا يستطيع الخادم فحص محتوى الملف بعد التشفير.
- RLS تقصر صف المحفظة وملفات Storage على مالك الحساب. لا توجد مصادقة SMS أو 2FA مفعّلة في هذا الإصدار.
- بطاقة الطوارئ مستقلة: بيانات QR مشفرة، لكن المفتاح داخل الرابط بعد `#`؛ أي شخص يمسح QR الكامل يستطيع قراءة البيانات التي اخترتِ مشاركتها.
- لا تستخدمي بيانات حقيقية قبل إنشاء مشروع Supabase، تطبيق migration، نشر الوظيفة، وإضافة URL والمفتاح العام إلى إعدادات الموقع.
