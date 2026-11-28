/* ============================================================================
 * IDC — Complete 8-Section Settings Center (Integrated from IDC – Settings.html)
 * ========================================================================== */
(function () {
  "use strict";

  var css = [
    ".idc-st{--bg:#0E1322;--card:#151B30;--tile:#1E2745;--ink:#E9ECF7;--muted:#8F98BD;--brand:#8C98E8;--line:#232B49;--ok:#6FC9AB;--bad:#F0868F;--on:#0E1322;color:var(--ink);font-family:'Titillium Web','Cairo',system-ui,-apple-system,sans-serif;line-height:1.55;padding-bottom:36px}",
    "@media (prefers-color-scheme:light){:root:not([data-theme=\"dark\"]) .idc-st{--bg:#F3F4FA;--card:#fff;--tile:#E8EBF9;--ink:#1B2150;--muted:#666C95;--brand:#34409B;--line:#E3E5F2;--ok:#2B8466;--bad:#B03E4A;--on:#fff}}",
    ":root[data-theme=\"light\"] .idc-st{--bg:#F3F4FA;--card:#fff;--tile:#E8EBF9;--ink:#1B2150;--muted:#666C95;--brand:#34409B;--line:#E3E5F2;--ok:#2B8466;--bad:#B03E4A;--on:#fff}",
    ":root[data-theme=\"dark\"] .idc-st{--bg:#0E1322;--card:#151B30;--tile:#1E2745;--ink:#E9ECF7;--muted:#8F98BD;--brand:#8C98E8;--line:#232B49;--ok:#6FC9AB;--bad:#F0868F;--on:#0E1322}",
    ".idc-st *{box-sizing:border-box}",
    ".idc-st h1,.idc-st h2,.idc-st b{color:var(--ink)}",
    ".idc-st button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:start;padding:0}",
    ".idc-st svg.i{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}",
    "[dir=rtl] .idc-st .flip{transform:scaleX(-1)}",
    ".idc-st .top{display:flex;align-items:center;justify-content:space-between;height:60px;gap:10px}",
    ".idc-st .top h1{font-size:1.45rem;font-weight:700;margin:0;flex:1;color:var(--ink)}",
    ".idc-st .lg{height:34px;min-width:34px;padding:0 10px;border:1px solid var(--line);border-radius:8px;color:var(--muted);display:grid;place-items:center;font-size:.92rem}",
    ".idc-st .me{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--card);border:1px solid var(--line);border-radius:14px;margin-bottom:6px}",
    ".idc-st .av{width:46px;height:46px;border-radius:10px;background:var(--brand);color:var(--on);display:grid;place-items:center;font-weight:700;font-size:1.2rem;background-size:cover;background-position:center}",
    ".idc-st .me b{display:block;font-weight:600;font-size:1.08rem;line-height:1.3;color:var(--ink)}.idc-st .me small{color:var(--muted)}",
    ".idc-st .tile{width:38px;height:38px;border-radius:10px;background:var(--tile);color:var(--brand);display:grid;place-items:center;flex:none}",
    ".idc-st .note{margin:0 2px 10px;color:var(--muted);font-size:.92rem;line-height:1.7}",
    ".idc-st .gt{margin:14px 4px 6px;color:var(--muted);font-size:.88rem;font-weight:600}",
    ".idc-st .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:0 16px;margin-bottom:10px;color:var(--ink)}",
    ".idc-st .row{display:flex;align-items:center;gap:12px;width:100%;padding:12px 0;min-height:52px;color:var(--ink)}",
    ".idc-st .row+.row{border-top:1px solid var(--line)}",
    ".idc-st .row .l{flex:1;min-width:0;color:var(--ink)}.idc-st .row .v{color:var(--muted);font-size:.92rem;text-align:end}",
    ".idc-st .row.bad .l{color:var(--bad)}",
    ".idc-st .chev{width:16px;height:16px;color:var(--muted)}",
    ".idc-st .sw{width:42px;height:24px;border-radius:99px;background:var(--tile);border:1px solid var(--line);position:relative;flex:none;transition:background .2s}",
    ".idc-st .sw::after{content:\"\";position:absolute;top:2px;inset-inline-start:2px;width:18px;height:18px;border-radius:50%;background:var(--muted);transition:.2s}",
    ".idc-st .sw[aria-checked=true]{background:var(--brand);border-color:var(--brand)}",
    ".idc-st .sw[aria-checked=true]::after{inset-inline-start:20px;background:var(--on)}",
    ".idc-st .seg{display:flex;background:var(--tile);border-radius:9px;padding:2px;flex:none}",
    ".idc-st .seg button{padding:3px 12px;border-radius:7px;font-size:.88rem;color:var(--muted);text-align:center}",
    ".idc-st .seg button[aria-pressed=true]{background:var(--brand);color:var(--on);font-weight:600}",
    ".idc-st .st{display:inline-flex;align-items:center;gap:7px;font-size:.92rem;color:var(--ok)}.idc-st .st::before{content:\"\";width:7px;height:7px;border-radius:50%;background:currentColor}.idc-st .st.off{color:var(--muted)}",
    ".idc-st .cta{margin-top:14px;width:100%;text-align:center;background:var(--brand);color:var(--on);padding:10px;border-radius:10px;font-weight:600;display:block;text-decoration:none}",
    ".idc-st .cta.sec{background:var(--tile);color:var(--brand)}.idc-st .cta.danger{background:transparent;border:1px solid var(--bad);color:var(--bad)}.idc-st .cta[disabled]{opacity:.4;cursor:default}",
    ".idc-st .st-f{margin:0 0 12px;position:static}.idc-st .st-f label{display:block;position:static;background:transparent;padding:0;color:var(--muted);font-size:.88rem;margin:0 2px 5px;pointer-events:auto}",
    ".idc-st .st-f input,.idc-st .st-f textarea{width:100%;height:auto;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:11px 12px;font:inherit}",
    ".idc-st .st-f textarea{min-height:110px;resize:vertical}.idc-st .st-f input:focus,.idc-st .st-f textarea:focus{outline:0;border-color:var(--brand)}",
    ".idc-st .err{color:var(--bad);font-size:.88rem;margin:-4px 2px 10px;min-height:0}",
    ".idc-st .acts{display:flex;gap:10px}.idc-st .acts .cta{margin-top:16px}",
    ".idc-st .hd{display:flex;align-items:center;gap:10px;height:60px}.idc-st .hd h1{font-size:1.3rem;margin:0;font-weight:700;color:var(--ink)}",
    ".idc-st .back{width:38px;height:38px;border-radius:10px;background:var(--tile);display:grid;place-items:center;color:var(--brand);flex:none}",
    ".idc-st .big{width:88px;height:88px;border-radius:18px;background:var(--brand);color:var(--on);display:grid;place-items:center;font-size:2.4rem;font-weight:700;margin:6px auto 16px;background-size:cover;background-position:center}",
    ".idc-st .dot{width:8px;height:8px;border-radius:50%;background:var(--ok);flex:none}.idc-st .dot.b{background:var(--bad)}",
    ".idc-st .sub{color:var(--muted);font-size:.88rem;display:block}",
    ".idc-st .mini{color:var(--brand);font-size:.92rem;padding:4px 0}.idc-st .mini.d{color:var(--bad)}",
    ".idc-st .radio{width:20px;height:20px;border-radius:50%;border:2px solid var(--muted);flex:none;display:grid;place-items:center}.idc-st .radio[aria-checked=true]{border-color:var(--brand)}.idc-st .radio[aria-checked=true]::after{content:\"\";width:10px;height:10px;border-radius:50%;background:var(--brand)}",
    ".idc-st details{border-top:1px solid var(--line);padding:12px 0}.idc-st details:first-child{border-top:0}.idc-st summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:10px}.idc-st summary::-webkit-details-marker{display:none}.idc-st details p{margin:8px 0 0;color:var(--muted);font-size:.94rem;line-height:1.7}",
    ".idc-st .num{width:26px;height:26px;border-radius:8px;background:var(--tile);color:var(--brand);display:grid;place-items:center;font-size:.85rem;font-weight:600;flex:none}",
    ".idc-st .tp{padding:14px 0}.idc-st .tp .l b{display:block;font-weight:600;font-size:1.05rem;line-height:1.3}.idc-st .tp .tile{width:40px;height:40px}",
    ".idc-st :focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:8px}",
    "@media (prefers-reduced-motion:reduce){.idc-st *{transition:none!important}}"
  ].join("\n");

  function injectStyles() {
    if (typeof document === "undefined" || document.getElementById("idc-st-css")) return;
    var s = document.createElement("style");
    s.id = "idc-st-css";
    s.textContent = css;
    document.head.appendChild(s);
  }
  injectStyles();

  var P = {
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    nfc: '<rect x="3" y="6" width="14" height="11" rx="2"/><path d="M20 9c1.2 1.5 1.2 4.5 0 6"/>',
    emergency: '<path d="M12 4v16M4 12h16"/>',
    notif: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>',
    prefs: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 3.5M12 17h.01"/>'
  };
  var ic = function (k, c) { return '<svg class="i ' + (c || "") + '" viewBox="0 0 24 24">' + P[k] + "</svg>"; };
  var T = function (a, v, x) { return ["tog", a, v, x]; };
  var L = function (a, v, x) { return ["link", a, v, x]; };
  var D = function (a, x) { return ["bad", a, "", x]; };
  var I = function (a, v) { return ["info", a, v]; };
  var SG = function (a, o, i) { return ["seg", a, { o: o, i: i }]; };

  var navRoute = ""; // '', 't-<topic>', 's-<detail>'
  var st = {
    font: 1,
    frozen: false,
    twofa: true,
    alerts: true,
    bio: true,
    auto: true,
    ch: {},
    lists: {
      sessions: [
        { a: "Current Device · IDC Web App|الجهاز الحالي · تطبيق IDC", b: "Egypt · Active now|مصر · نشط دلوقتي", cur: 1 },
        { a: "Windows · Chrome|ويندوز · Chrome", b: "Cairo, Egypt · 2 hours ago|القاهرة، مصر · من ساعتين" }
      ],
      devices: [
        { a: "Primary Phone · IDC|الموبايل الأساسي · IDC", b: "Verified Owner Device|جهاز المالك الموثق" }
      ],
      contacts: [
        { a: "Salma · Sister|سلمى · أختي", b: "010 •••• 4821" },
        { a: "Ahmed · Father|أحمد · والدي", b: "011 •••• 7392" }
      ],
      accts: [
        { a: "LinkedIn", b: "Connected|مربوط", c: 1 },
        { a: "Google", b: "Connected|مربوط", c: 1 },
        { a: "Microsoft", b: "Not connected|مش مربوط" }
      ],
      history: [
        { a: "Successful sign-in · IDC|تسجيل دخول ناجح · IDC", b: "Today|النهارده" }
      ],
      access: [
        { a: "Card scanned · Emergency view|Scan للكارد · عرض الطوارئ", b: "Today · Cairo|النهارده · القاهرة" },
        { a: "Card scanned · Public profile|Scan للكارد · الملف العام", b: "Cairo|القاهرة" }
      ]
    }
  };

  function isAr() {
    return !(typeof S !== "undefined" && S.lang === "en");
  }
  function B(s) {
    var a = String(s == null ? "" : s).split("|");
    return isAr() && a[1] ? a[1] : a[0];
  }
  function V(v) {
    return B(typeof v === "function" ? v() : v);
  }
  function toast(m) {
    if (typeof window.tst === "function") window.tst(m);
  }
  function randId() {
    var u = new Uint32Array(1);
    crypto.getRandomValues(u);
    return "f" + (u[0] % 1000000);
  }

  function syncFromAppState() {
    if (typeof S === "undefined") return;
    if (st.lists.accts && st.lists.accts[0] && st.lists.accts[0].a === "LinkedIn") {
      var hasLi = Boolean(S.p && S.p.linkedin && String(S.p.linkedin).trim());
      st.lists.accts[0].c = hasLi ? 1 : 0;
      st.lists.accts[0].b = hasLi ? "Connected · Tap to open/edit|مربوط · اضغط للفتح أو التعديل" : "Not connected|مش مربوط";
    }
    if (S.em && S.em.c1 && S.em.c2) {
      var exists = st.lists.contacts.some(function (c) { return c.b === S.em.c2; });
      if (!exists) {
        st.lists.contacts.unshift({ a: S.em.c1, b: S.em.c2 });
      }
    }
    if (Array.isArray(S.log) && S.log.length) {
      st.lists.history = S.log.slice(0, 10).map(function (entry) {
        return {
          a: (entry.s ? "Successful access · Private/Account|دخول ناجح · الحساب/القسم الخاص" : "Failed attempt|محاولة غير ناجحة") + (entry.how ? " (" + entry.how + ")" : ""),
          b: (entry.t || "") + (entry.where ? " · " + entry.where : ""),
          bad: !entry.s
        };
      });
    }
  }

  var S_ = [
    {
      id: "account", ic: "account", t: "Account Settings|إعدادات الحساب", d: "Manage your personal information|إدارة بياناتك الشخصية",
      g: [{
        items: [
          L("Edit personal information|تعديل البيانات الشخصية", "", "edit"),
          L("Bank accounts (IBAN / InstaPay)|حسابات البنك و InstaPay", function () {
            var bks = (typeof S !== "undefined" && Array.isArray(S.items)) ? S.items.filter(function (i) { return i.type === "bank"; }).length : 0;
            return String(bks);
          }, "banks"),
          L("Change email|تغيير الإيميل", function () { return (typeof S !== "undefined" && S.userEmail) || "user@idc.app"; }, "email"),
          L("Change password|تغيير كلمة المرور", "", "password"),
          L("Profile picture|الصورة الشخصية", "", "photo"),
          L("My documents & licenses|وثائقي وتراخيصي", function () { return typeof S !== "undefined" && Array.isArray(S.items) ? String(S.items.length) : "0"; }, "docs"),
          L("Manage connected accounts|إدارة الحسابات المربوطة", function () { return st.lists.accts.filter(function (a) { return a.c; }).map(function (a) { return a.a; }).join(", ") || "—"; }, "accounts"),
          D("Delete account|حذف الحساب", "delete")
        ]
      }]
    },
    {
      id: "privacy", ic: "eye", t: "Privacy Settings|الخصوصية", d: "Control who can see your information|تحكّم في اللي يقدر يشوف بياناتك",
      g: [{
        items: [
          T("Public profile|ملف شخصي عام", true),
          T("Show phone number|إظهار رقم الموبايل", false),
          T("Show email|إظهار الإيميل", false),
          T("Emergency information visible|إتاحة بيانات الطوارئ", true),
          T("LinkedIn visible|إظهار LinkedIn", true),
          L("Profile sharing permissions|صلاحيات مشاركة الملف", "", "share")
        ]
      }]
    },
    {
      id: "security", ic: "shield", t: "Security Settings|الأمان", d: "Protect your account and vault|حماية حسابك والخزنة",
      note: "Vault content is encrypted on this device before storage (AES-256-GCM). Your Emergency partition is accessible when needed, while your Private partition is sealed with 3 passwords + Fingerprint / Face ID and auto-locks on exit.|محتوى الخزنة بيتشفّر على الجهاز قبل التخزين (AES-256-GCM). قسم الطوارئ متاح وقت الحاجة، والقسم الخاص مقفول بـ 3 باسوردات + بصمة / Face ID وبيتقفل تلقائي لما تخرج.",
      g: [
        {
          items: [
            T("Two-factor authentication (2FA)|التحقق بخطوتين (2FA)", true, "twofa"),
            L("Outer App Fingerprint / Face ID|بصمة / Face ID للدخول من برا", function () {
              return window.idcHasOuterBio && window.idcHasOuterBio() ? "Registered|مفعّلة ✓" : "Set up|تفعيل";
            }, "outerbio"),
            L("Change encryption key|تغيير مفتاح التشفير", "", "key"),
            L("Active sessions|الجلسات النشطة", function () { return "" + st.lists.sessions.length; }, "sessions"),
            L("Login history|سجل الدخول", "", "history"),
            L("Trusted devices|الأجهزة الموثوقة", function () { return "" + st.lists.devices.length; }, "devices"),
            T("Security alerts|تنبيهات الأمان", true, "alerts"),
            D("Sign out all devices|تسجيل الخروج من كل الأجهزة", "signout")
          ]
        },
        {
          t: "Vault|الخزنة",
          items: [
            I("Encryption|التشفير", "AES-256-GCM"),
            ["part", "Emergency partition|قسم الطوارئ", "Open to responders|متاح للمسعفين", 0, "emerg_open"],
            ["part", "Private partition|القسم الخاص", "Sealed|مقفول", 1, "priv_open"],
            T("Fingerprint / Face ID|بصمة / Face ID", true, "bio"),
            T("Auto-lock on exit|قفل تلقائي عند الخروج", true, "auto")
          ]
        }
      ]
    },
    {
      id: "nfc", ic: "nfc", t: "NFC Card Settings|إعدادات الكارد", d: "Manage your smart card|إدارة الكارد الذكي",
      g: [{
        items: [
          ["status", "Card status|حالة الكارد"],
          L("Link card to account|ربط الكارد بالحساب", "", "linkcard"),
          L("Change card association|تغيير الحساب المرتبط", "", "assoc"),
          L("Card information|معلومات الكارد", "NTAG213", "cardinfo"),
          L("Last card access|آخر استخدام للكارد", "Today|النهارده", "access"),
          D("Report lost card|الإبلاغ عن فقدان الكارد", "lost"),
          T("Temporarily disable card|إيقاف الكارد مؤقتًا", false, "frozen")
        ]
      }]
    },
    {
      id: "emergency", ic: "emergency", t: "Emergency Settings|الطوارئ", d: "Information available to responders|البيانات المتاحة للمسعفين",
      note: "This information can be seen when your card is scanned in an emergency.|البيانات دي بتظهر لما حد يعمل scan للكارد وقت الطوارئ.",
      g: [{
        items: [
          L("Emergency contact management|إدارة جهات اتصال الطوارئ", function () { return "" + st.lists.contacts.length; }, "contacts"),
          T("Medical information visibility|إظهار المعلومات الطبية", true),
          T("Blood type visibility (optional)|إظهار فصيلة الدم (اختياري)", true),
          L("Emergency instructions|تعليمات الطوارئ", "", "instr"),
          L("Emergency profile preview|معاينة ملف الطوارئ", "", "epreview"),
          L("Update emergency information|تحديث بيانات الطوارئ", "", "epupdate")
        ]
      }]
    },
    {
      id: "notifications", ic: "notif", t: "Notifications|الإشعارات", d: "Alerts and updates|التنبيهات والتحديثات",
      g: [{
        items: [
          T("New login alert|تنبيه تسجيل دخول جديد", true),
          T("Card scanned notification|إشعار عند عمل scan للكارد", true),
          T("Profile access alert|تنبيه عند فتح الملف", true),
          T("Security warnings|تحذيرات الأمان", true),
          T("Card status changes|تغيّر حالة الكارد", true),
          T("Important updates|التحديثات المهمة", false)
        ]
      }]
    },
    {
      id: "prefs", ic: "prefs", t: "App Preferences|تفضيلات التطبيق", d: "Language and appearance|اللغة والمظهر",
      g: [{
        items: [
          ["lang", "Language|اللغة"],
          ["theme", "Appearance|المظهر"],
          ["font", "Font size|حجم الخط"],
          L("Accessibility|سهولة الاستخدام", "", "a11y"),
          SG("Date format|شكل التاريخ", ["DD/MM/YYYY", "MM/DD/YYYY"], 0),
          SG("Default profile view|العرض الافتراضي للملف", ["Card|كارد", "Full|كامل"], 0)
        ]
      }]
    },
    {
      id: "help", ic: "help", t: "Help & Support|المساعدة", d: "Guides, support and legal|الدعم والمعلومات القانونية",
      g: [{
        items: [
          L("Frequently asked questions|الأسئلة الشائعة", "", "faq"),
          L("Contact support|تواصل مع الدعم", "+20 15 58540330", "support"),
          L("Report a problem|الإبلاغ عن مشكلة", "", "report"),
          L("How to use NFC|إزاي تستخدم NFC", "", "howto"),
          L("Privacy policy|سياسة الخصوصية", "", "privacy"),
          L("Terms & conditions|الشروط والأحكام", "", "terms"),
          L("About IDC|عن IDC", "1.0", "about")
        ]
      }]
    }
  ];

  var F = function (r, btn, done, chk, then) { return { k: "fields", r: r, btn: btn, done: done, chk: chk, then: then }; };
  var P_ = function (s) { return { k: "p", s: s }; };
  var H = function (s) { return { k: "h", s: s }; };
  var KV = function (r) { return { k: "kv", r: r }; };
  var BT = function (s, kind, fn) { return { k: "btn", s: s, kind: kind, fn: fn }; };
  var reqd = function (v, m) { return v.some(function (x) { return !x.trim(); }) ? m : ""; };

  function buildSC() {
    var p = (typeof S !== "undefined" && S.p) || { n: "Maria", ph: "+20 10 0000 0000", nid: "", bd: "", ct: "القاهرة", role: "student" };
    var em = (typeof S !== "undefined" && S.em) || { n: p.n || "", bt: "O+", al: "", ch: "", md: "", c1: "", c2: p.ph || "", nt: "" };
    var emailAddr = (typeof S !== "undefined" && S.userEmail) || "user@idc.app";
    return {
      edit: {
        t: "Edit personal information|تعديل البيانات الشخصية",
        b: [F([
          ["Full name|الاسم الكامل", p.n || ""],
          ["Phone number|رقم الموبايل", p.ph || ""],
          ["National ID|الرقم القومي", p.nid || ""],
          ["Birth date|تاريخ الميلاد", p.bd || ""],
          ["Governorate / City|المحافظة / المدينة", p.ct || ""],
          ["LinkedIn & Personal Links|رابط LinkedIn والروابط الشخصية", p.linkedin || ""],
          ["Personal Route ID (/IDC/...)|معرّف الرابط الشخصي (/IDC/...)", (typeof S !== "undefined" && S.routeId) || (window.IDCAuthMiddleware ? window.IDCAuthMiddleware.getOwnerRouteId() : "1111")]
        ], "Save changes|حفظ التغييرات", "Changes saved|تم حفظ التغييرات", function (vals) {
          return reqd(vals.slice(0, 2), "Name and phone are required|الاسم والموبايل مطلوبين");
        }, function (vals) {
          if (typeof S !== "undefined" && S.p) {
            S.p.n = vals[0].trim() || S.p.n;
            S.p.ph = vals[1].trim() || S.p.ph;
            S.p.nid = vals[2].trim() || S.p.nid;
            S.p.bd = vals[3].trim() || S.p.bd;
            S.p.ct = vals[4].trim() || S.p.ct;
            S.p.linkedin = vals[5].trim();
            if (vals[6] && /^[a-z0-9_-]{3,24}$/i.test(vals[6].trim())) {
              S.routeId = vals[6].trim().toLowerCase();
              S.p.routeId = S.routeId;
            }
            if (typeof sv === "function") sv();
          }
          render();
        })]
      },
      banks: {
        t: "Bank accounts (IBAN / InstaPay)|حسابات البنك و InstaPay",
        b: [
          P_("Add your bank account, IBAN, or InstaPay address. Saved inside your encrypted Private Vault by default.|أضف حسابك البنكي أو رقم IBAN أو عنوان InstaPay. يُحفظ افتراضيًا داخل القسم الخاص المشفر."),
          F([
            ["Bank Name (e.g. CIB, NBE, InstaPay)|اسم البنك (مثل CIB أو الأهلي أو InstaPay)", ""],
            ["Account Number / IBAN / InstaPay|رقم الحساب أو IBAN أو عنوان InstaPay", ""]
          ], "Add Bank Account to Vault|إضافة الحساب البنكي للخزنة", "Bank account saved|تم حفظ الحساب البنكي", function (vals) {
            return reqd(vals, "Enter bank name and account/IBAN|أدخل اسم البنك ورقم الحساب أو IBAN");
          }, function (vals) {
            if (typeof S !== "undefined" && Array.isArray(S.items) && typeof window.mk === "function") {
              S.items.unshift(window.mk("on", "private", "bank", "حساب بنكي · " + vals[0].trim(), vals[1].trim(), vals[0].trim()));
              if (typeof sv === "function") sv();
            }
            render();
          })
        ]
      },
      email: {
        t: "Change email|تغيير الإيميل",
        b: [
          KV([["Current email|الإيميل الحالي", emailAddr]]),
          P_("A verification link will be sent to the new address.|هنبعت رابط تحقق على الإيميل الجديد."),
          F([
            ["New email|الإيميل الجديد", "", "email"],
            ["Current password|كلمة المرور الحالية", "", "pw"]
          ], "Send verification code|ابعت كود التحقق", "Verification link sent|اتبعت رابط التحقق", function (v) {
            return !/^\S+@\S+\.\S+$/.test(v[0]) ? "Enter a valid email|اكتب إيميل صحيح" : reqd(v, "Password is required|كلمة المرور مطلوبة");
          })
        ]
      },
      password: {
        t: "Change password|تغيير كلمة المرور",
        b: [
          P_("Use at least 12 characters with a mix of letters and numbers.|استخدم 12 حرف على الأقل بين حروف وأرقام."),
          F([
            ["Current password|كلمة المرور الحالية", "", "pw"],
            ["New password|كلمة المرور الجديدة", "", "pw"],
            ["Confirm new password|تأكيد كلمة المرور", "", "pw"]
          ], "Update password|تحديث كلمة المرور", "Password updated|تم تحديث كلمة المرور", function (v) {
            return reqd(v, "Fill in all fields|املى كل الخانات") ||
              (v[1].length < 8 ? "Password must be at least 8 characters|كلمة المرور لازم تكون 8 حروف على الأقل" : "") ||
              (v[1] !== v[2] ? "Passwords do not match|كلمتين المرور مش متطابقين" : "");
          })
        ]
      },
      photo: {
        t: "Profile picture|الصورة الشخصية",
        b: [
          { k: "av" },
          BT("Choose from gallery|اختار من المعرض", "primary", function () {
            var inp = document.createElement("input");
            inp.type = "file";
            inp.accept = "image/*";
            inp.onchange = function () {
              if (typeof window.pickPhoto === "function") window.pickPhoto(inp);
              setTimeout(render, 350);
            };
            inp.click();
          }),
          BT("Remove photo|احذف الصورة", "danger", function () {
            if (typeof S !== "undefined" && S.p) {
              delete S.p.photo;
              if (typeof sv === "function") sv();
              toast(B("Photo removed|اتحذفت الصورة"));
              render();
            }
          })
        ]
      },
      docs: {
        t: "My documents & licenses|وثائقي وتراخيصي",
        b: [
          P_("Manage your public, private, and secret documents.|إدارة وثائقك وتراخيصك العامة والخاصة والسرية."),
          { k: "docs_list" },
          BT("+ Add new document|+ إضافة وثيقة جديدة", "primary", function () {
            var o = typeof window.on === "function" ? window.on() : true;
            window.pg = { k: "add", m: o ? "on" : "off", l: "public" };
            if (typeof window.R === "function") window.R();
          })
        ]
      },
      accounts: {
        t: "Connected accounts|الحسابات المربوطة",
        b: [
          P_("Connected accounts can be used to sign in and to import profile details.|الحسابات المربوطة بتستخدم لتسجيل الدخول واستيراد بيانات الملف."),
          { k: "list", key: "accts", mode: "toggle" }
        ]
      },
      delete: {
        t: "Delete account|حذف الحساب",
        b: [
          P_("This permanently deletes your profile, vault content and card association. This action cannot be undone.|ده بيحذف الملف ومحتوى الخزنة وربط الكارد نهائيًا، ومينفعش يتراجع عنه."),
          { k: "del" }
        ]
      },
      share: {
        t: "Profile sharing permissions|صلاحيات مشاركة الملف",
        b: [
          P_("Create an external link for your CV, public profile, or both that expires automatically after 4, 7, 24, or custom hours.|أنشئ رابطًا خارجيًا للسيرة الذاتية أو البروفايل العام أو الاثنين معًا ينتهي تلقائيًا بعد 4 أو 7 أو 24 ساعة أو عدد ساعات مخصص."),
          BT("Create temporary link (4 / 7 / 24 hours)|إنشاء رابط مؤقت (4 / 7 / 24 ساعة)", "primary", function () {
            if (window.IDCTempShare) window.IDCTempShare.openModal("both");
          }),
          H("Who can view my profile|مين يقدر يشوف ملفي"),
          { k: "choice", key: "share", o: ["Everyone|الكل", "Verified members only|الأعضاء الموثّقين بس", "People I share with|اللي بشاركهم بس", "Only me|أنا بس"] },
          H("Sharing methods|طرق المشاركة"),
          { k: "tog", r: [["Share by QR code|المشاركة بـ QR", "s_qr", true], ["Share by NFC card tap|المشاركة بالكارد", "s_nfc", true], ["Profile link|رابط الملف", "s_link", true], ["Allow CV download|السماح بتحميل السيرة", "s_cv", false]] }
        ]
      },
      key: {
        t: "Change encryption key|تغيير مفتاح التشفير",
        b: [
          KV([["Algorithm|الخوارزمية", "AES-256-GCM"], ["Key derivation|اشتقاق المفتاح", "PBKDF2-SHA256 (310,000)"], ["Status|الحالة", "Active & Sealed|نشط ومؤمّن"]]),
          P_("Generating a new key re-encrypts your vault on this device. Keep the app open until it finishes.|إنشاء مفتاح جديد بيعيد تشفير الخزنة على الجهاز. سيب التطبيق مفتوح لحد ما يخلص."),
          F([["Confirm password|أكّد كلمة المرور", "", "pw"]], "Generate new key|إنشاء مفتاح جديد", "New key generated|اتعمل مفتاح جديد", function (v) { return reqd(v, "Password is required|كلمة المرور مطلوبة"); })
        ]
      },
      sessions: {
        t: "Active sessions|الجلسات النشطة",
        b: [
          P_("Devices currently signed in to your account.|الأجهزة المسجّل دخولها على حسابك دلوقتي."),
          { k: "list", key: "sessions", mode: "remove", act: "Revoke|إنهاء" }
        ]
      },
      history: {
        t: "Login history|سجل الدخول",
        b: [{ k: "list", key: "history", mode: "none" }]
      },
      devices: {
        t: "Trusted devices|الأجهزة الموثوقة",
        b: [
          P_("Trusted devices skip the extra verification step.|الأجهزة الموثوقة بتتخطى خطوة التحقق الإضافية."),
          { k: "list", key: "devices", mode: "remove", act: "Remove|إزالة" }
        ]
      },
      linkcard: {
        t: "Link card to account|ربط الكارد بالحساب",
        b: [
          P_("Hold the card against the back of your phone. Keep it still until it is detected.|حط الكارد ورا الموبايل وسيبه ثابت لحد ما يتعرف عليه."),
          { k: "scan" },
          BT("Open Full NFC & QR Card Studio|فتح استوديو برمجة الكارت و QR", "sec", function () {
            window.pg = { k: "emerg" };
            if (typeof window.R === "function") window.R();
          })
        ]
      },
      assoc: {
        t: "Change card association|تغيير الحساب المرتبط",
        b: [
          KV([["Card|الكارد", "NTAG213 · •••• 4F2A"], ["Linked to|مربوط بـ", p.n || "IDC User"], ["Status|الحالة", function () { return st.frozen ? "Frozen|متجمّد" : "Active|شغّال"; }]]),
          P_("Unlinking removes this card from your account. Anyone scanning it will no longer see your profile.|فك الربط بيشيل الكارد من حسابك، وأي حد يعمل له scan مش هيشوف ملفك."),
          BT("Unlink this card|فك ربط الكارد", "danger", function () {
            if (confirm(B("Unlink this card?|تفك ربط الكارد؟"))) toast(B("Card unlinked|اتفك ربط الكارد"));
          }),
          BT("Link a different card|اربط كارد تاني", "sec", function () { openScreen("linkcard"); })
        ]
      },
      cardinfo: {
        t: "Card information|معلومات الكارد",
        b: [KV([
          ["Chip type|نوع الشريحة", "NTAG213"],
          ["Card ID|رقم الكارد", "•••• •••• 4F2A"],
          ["Memory|الذاكرة", "144 bytes"],
          ["Protocol|البروتوكول", "ISO 14443-3A"],
          ["Owner ID|معرّف المالك", (typeof S !== "undefined" && S.user) ? String(S.user).slice(0, 14) + "…" : "IDC-Verified"],
          ["Status|الحالة", function () { return st.frozen ? "Frozen|متجمّد" : "Active|شغّال"; }],
          ["Last access|آخر استخدام", "Today|النهارده"]
        ])]
      },
      access: {
        t: "Last card access|آخر استخدام للكارد",
        b: [{ k: "list", key: "access", mode: "none" }]
      },
      lost: {
        t: "Report lost card|الإبلاغ عن فقدان الكارد",
        b: [
          P_("Reporting a card freezes it so it can no longer open your profile. You can link a replacement afterwards.|الإبلاغ بيجمّد الكارد فمبقاش يفتح ملفك، ويمكنك ربط كارد بديل بعدها."),
          H("What happened|إيه اللي حصل"),
          { k: "choice", key: "lost", o: ["Lost|اتفقد", "Stolen|اتسرق", "Damaged|اتلف"] },
          BT("Report card|بلّغ عن الكارد", "danger", function () {
            if (confirm(B("Report this card as lost?|الإبلاغ عن الكارد كمفقود؟"))) {
              st.frozen = true;
              toast(B("Card reported and frozen|االإبلاغ عن الكارد واتجمّد"));
              goRoute("t-nfc");
            }
          })
        ]
      },
      contacts: {
        t: "Emergency contacts|جهات اتصال الطوارئ",
        b: [
          { k: "list", key: "contacts", mode: "remove", act: "Remove|إزالة" },
          H("Add a contact|إضافة جهة اتصال"),
          F([
            ["Name|الاسم", ""],
            ["Relationship|صلة القرابة", ""],
            ["Phone|الموبايل", ""]
          ], "Add contact|إضافة", "Contact added|اتضافت جهة الاتصال", function (v) {
            return reqd(v, "Fill in all fields|املى كل الخانات");
          }, function (v) {
            st.lists.contacts.push({ a: v[0] + " · " + v[1], b: v[2] });
            if (typeof S !== "undefined") {
              S.em = S.em || { n: p.n || "", bt: "O+", al: "", ch: "", md: "", nt: "" };
              S.em.c1 = v[0] + " (" + v[1] + ")";
              S.em.c2 = v[2];
              if (typeof sv === "function") sv();
            }
            render();
          })
        ]
      },
      instr: {
        t: "Emergency instructions|تعليمات الطوارئ",
        b: [
          P_("Short guidance shown to responders. Keep it clear and brief.|إرشادات قصيرة بتظهر للمسعف. خليها واضحة ومختصرة."),
          F([
            ["Instructions|التعليمات", em.nt || "Allergic to penicillin. Please call my emergency contacts first.|حساسية بنسلين. يرجى الاتصال بجهة الطوارئ فورًا.", "area"]
          ], "Save instructions|حفظ التعليمات", "Instructions saved|اتحفظت التعليمات", null, function (vals) {
            if (typeof S !== "undefined") {
              S.em = S.em || { n: p.n || "", bt: "O+", al: "", ch: "", md: "", c1: "", c2: p.ph || "" };
              S.em.nt = vals[0].trim();
              if (typeof sv === "function") sv();
            }
          })
        ]
      },
      epreview: {
        t: "Emergency profile preview|معاينة ملف الطوارئ",
        b: [
          P_("This is what a responder sees after scanning your card.|ده اللي بيشوفه المسعف بعد ما يعمل scan للكارد."),
          KV([
            ["Name|الاسم", em.n || p.n || "—"],
            ["Blood type|فصيلة الدم", em.bt || "O+"],
            ["Allergies|حساسية", em.al || "None|مفيش"],
            ["Chronic conditions|أمراض مزمنة", em.ch || "None|مفيش"],
            ["Current medications|أدوية حالية", em.md || "None|مفيش"],
            ["Emergency contact|جهة الاتصال", (em.c1 ? em.c1 + " · " : "") + (em.c2 || p.ph || "—")],
            ["Instructions|التعليمات", em.nt || "Call my contacts first|كلموا جهات الاتصال الأول"]
          ])
        ]
      },
      epupdate: {
        t: "Update emergency information|تحديث بيانات الطوارئ",
        b: [
          F([
            ["Blood type|فصيلة الدم", em.bt || "O+"],
            ["Allergies|حساسية", em.al || ""],
            ["Chronic conditions|أمراض مزمنة", em.ch || ""],
            ["Current medications|أدوية حالية", em.md || ""],
            ["Emergency contact name|اسم شخص للطوارئ", em.c1 || ""],
            ["Emergency contact phone|موبايل الطوارئ", em.c2 || p.ph || ""]
          ], "Save information|حفظ البيانات", "Emergency information updated|اتحدّثت بيانات الطوارئ", null, function (vals) {
            if (typeof S !== "undefined") {
              S.em = Object.assign({}, S.em || {}, {
                n: p.n || "",
                bt: vals[0].trim(),
                al: vals[1].trim(),
                ch: vals[2].trim(),
                md: vals[3].trim(),
                c1: vals[4].trim(),
                c2: vals[5].trim()
              });
              if (typeof sv === "function") sv();
            }
            render();
          })
        ]
      },
      a11y: {
        t: "Accessibility|سهولة الاستخدام",
        b: [{
          k: "tog",
          r: [
            ["High contrast|تباين عالي", "a_hc", false],
            ["Reduce motion|تقليل الحركة", "motion", false],
            ["Larger touch targets|أزرار أكبر", "a_big", false],
            ["Screen reader descriptions|وصف لقارئ الشاشة", "a_sr", true]
          ]
        }]
      },
      faq: {
        t: "Frequently asked questions|الأسئلة الشائعة",
        b: [{
          k: "faq",
          r: [
            ["What is IDC?|يعني إيه IDC؟", "A digital identity platform with an NFC card that opens your verified profile.|منصة هوية رقمية بكارد NFC بيفتح ملفك الموثّق."],
            ["What if I lose my card?|لو ضيّعت الكارد؟", "Report it from NFC Card Settings. It is frozen immediately and you can link a replacement.|بلّغ من إعدادات الكارد، بيتجمّد فورًا ويمكنك ربط كارد بديل."],
            ["Who can see my emergency information?|مين يشوف بيانات الطوارئ؟", "Only what you allow, and only when your card is scanned.|ما تسمح به فقط، ولما الكارد يتعمل له scan."],
            ["Is my data encrypted?|بياناتي متشفّرة؟", "Yes. Vault content is encrypted on your device with AES-256-GCM before storage.|أيوه، محتوى الخزنة بيتشفّر على جهازك بـ AES-256-GCM قبل التخزين."],
            ["How do I change my password?|إزاي أغيّر كلمة المرور؟", "Go to Account Settings, then Change password.|من إعدادات الحساب، اختر تغيير كلمة المرور."]
          ]
        }]
      },
      support: {
        t: "Contact support|تواصل مع الدعم",
        b: [
          KV([
            ["Customer Support Phone|رقم خدمة العملاء", "+20 15 58540330"],
            ["Email|الإيميل", "support@idc.example"],
            ["Response time|وقت الرد", "Within 24 hours|خلال 24 ساعة"]
          ]),
          BT("Call +20 15 58540330 Now|اتصل الآن +20 15 58540330", "primary", function () {
            window.location.href = "tel:+201558540330";
          }),
          F([
            ["Subject|الموضوع", ""],
            ["Message|الرسالة", "", "area"]
          ], "Send message|ابعت الرسالة", "Message sent|اتبعتت الرسالة", function (v) {
            return reqd(v, "Fill in all fields|املى كل الخانات");
          })
        ]
      },
      report: {
        t: "Report a problem|الإبلاغ عن مشكلة",
        b: [
          H("Category|النوع"),
          { k: "choice", key: "cat", o: ["App problem|مشكلة في التطبيق", "Card problem|مشكلة في الكارد", "Security concern|مشكلة أمان", "Other|أخرى"] },
          F([["Describe the problem|وصف المشكلة", "", "area"]], "Send report|ابعت البلاغ", "Report sent|اتبعت البلاغ", function (v) {
            return reqd(v, "Please describe the problem|يرجى كتابة وصف للمشكلة");
          }),
          { k: "tog", r: [["Include diagnostic information|إرفاق معلومات تشخيصية", "r_diag", true]] }
        ]
      },
      howto: {
        t: "How to use NFC|إزاي تستخدم NFC",
        b: [{
          k: "steps",
          r: [
            "Make sure NFC is turned on in your phone settings.|تأكد أن NFC شغّال في إعدادات الموبايل.",
            "Hold the card against the back of the phone, near the top.|ضع الكارد ورا الموبايل ناحية فوق.",
            "Keep it still for a second until you feel a vibration.|اتركه ثابتًا ثانية لحد ما تشعر باهتزاز.",
            "The profile opens automatically.|الملف هيفتح لوحده.",
            "If nothing happens, remove the phone case and try again.|لو مفيش حاجة حصلت، أزل الغطاء وجرّب مرة أخرى."
          ]
        }]
      },
      privacy: {
        t: "Privacy policy|سياسة الخصوصية",
        b: [
          H("Data we collect|البيانات اللي بنجمعها"),
          P_("Profile details you provide, card scan events, and device information needed to secure your account.|بيانات الملف اللي التي تدخلها، وأحداث scan للكارد، ومعلومات الجهاز اللازمة لتأمين حسابك."),
          H("How we use it|بنستخدمها إزاي"),
          P_("To operate your profile, protect your account, and show information you choose to share.|لتشغيل ملفك وحماية حسابك وعرض ما اخترت مشاركته."),
          H("Your controls|تحكّمك"),
          P_("You decide who sees your profile and can delete your account at any time.|أنت من يحدد من يرى ملفك ويمكنك حذف حسابك في أي وقت.")
        ]
      },
      terms: {
        t: "Terms & conditions|الشروط والأحكام",
        b: [
          H("Using IDC|استخدام IDC"),
          P_("You are responsible for the accuracy of the information in your profile and for keeping your card and credentials secure.|أنت مسؤول عن دقة بيانات ملفك وعن الحفاظ على الكارد وبيانات الدخول."),
          H("Cards|الكروت"),
          P_("Report a lost or stolen card promptly so it can be frozen.|بلّغ فورًا عن الكارد لو ضاع أو اتسرق عشان يتجمّد."),
          H("Changes|التعديلات"),
          P_("These terms may be updated. Continued use means you accept the changes.|ممكن الشروط دي تتحدّث، واستمرارك في الاستخدام معناه موافقتك.")
        ]
      },
      about: {
        t: "About IDC|عن IDC",
        b: [
          KV([
            ["App|التطبيق", "IDC"],
            ["Version|الإصدار", "2.0.0 (12)"],
            ["Encryption|التشفير", "AES-256-GCM + PBKDF2 (310,000)"],
            ["Card chip|شريحة الكارد", "NTAG213"],
            ["Support|الدعم الفني", "+20 15 58540330"]
          ]),
          BT("Licenses & Policies|التراخيص والسياسات", "sec", function () {
            window.pg = { k: "licenses" };
            if (typeof window.R === "function") window.R();
          })
        ]
      }
    };
  }

  var ACT = {
    signout: function () {
      if (confirm(B("Sign out of all devices?|تسجيل الخروج من كل الأجهزة؟"))) {
        if (typeof window.idcSignOut === "function") window.idcSignOut();
      }
    },
    outerbio: function () {
      if (typeof window.idcOuterBioRegister === "function") {
        window.idcOuterBioRegister(false);
      } else {
        toast(B("Biometrics not available on this device|البصمة غير مدعومة على هذا الجهاز"));
      }
    },
    emerg_open: function () {
      window.pg = { k: "emerg" };
      if (typeof window.R === "function") window.R();
    },
    priv_open: function () {
      window.pg = null;
      if (window.IDCPrivate) window.IDCPrivate.open();
      else if (typeof window.go === "function") window.go({ nav: "wallet", tab: "private" });
    }
  };

  var FS = {};
  S_.forEach(function (s) {
    s.g.forEach(function (g) {
      g.items.forEach(function (i) {
        if (i[0] === "link" || i[0] === "bad") FS[i[3]] = s.id;
      });
    });
  });

  function goRoute(r) {
    navRoute = r || "";
    render();
  }
  function openScreen(id) {
    goRoute("s-" + id);
  }
  function backFrom(id) {
    goRoute(FS[id] ? "t-" + FS[id] : "");
  }

  function seg(opts, idx, cb) {
    var d = document.createElement("div");
    d.className = "seg";
    opts.forEach(function (o, n) {
      var b = document.createElement("button");
      b.textContent = o;
      b.setAttribute("aria-pressed", String(n === idx));
      b.onclick = function () { cb(n); };
      d.appendChild(b);
    });
    return d;
  }

  function card() {
    var c = document.createElement("div");
    c.className = "card";
    return c;
  }

  function row(it, SC) {
    var ty = it[0], a = it[1], v = it[2], x = it[3];
    var clickable = ty === "tog" || ty === "link" || ty === "bad" || (ty === "part" && it[4]);
    var r = document.createElement(clickable ? "button" : "div");
    r.className = "row" + (ty === "bad" ? " bad" : "");
    var l = document.createElement("span");
    l.className = "l";
    l.textContent = B(a);
    r.appendChild(l);

    if (ty === "tog") {
      if (x && st[x] === undefined) st[x] = v;
      var s = document.createElement("span");
      s.className = "sw";
      s.setAttribute("role", "switch");
      s.setAttribute("aria-checked", String(x ? st[x] : v));
      r.appendChild(s);
      r.setAttribute("aria-label", l.textContent);
      r.onclick = function () {
        if (x) st[x] = !st[x];
        else it[2] = !it[2];
        render();
      };
    } else if (ty === "link" || ty === "bad") {
      var vv = v && V(v);
      if (vv) {
        var e = document.createElement("span");
        e.className = "v";
        e.textContent = vv;
        r.appendChild(e);
      }
      if (ty === "link") r.insertAdjacentHTML("beforeend", ic("chev", "chev flip"));
      r.onclick = function () {
        if (SC[x]) openScreen(x);
        else if (ACT[x]) ACT[x]();
      };
    } else if (ty === "info") {
      r.insertAdjacentHTML("beforeend", '<span class="v">' + V(v) + "</span>");
    } else if (ty === "part") {
      r.insertAdjacentHTML("beforeend", '<span class="st' + (it[3] ? " off" : "") + '">' + B(v) + "</span>");
      if (it[4] && ACT[it[4]]) {
        r.onclick = ACT[it[4]];
      }
    } else if (ty === "status") {
      r.insertAdjacentHTML("beforeend", '<span class="st' + (st.frozen ? " off" : "") + '">' + B(st.frozen ? "Frozen|متجمّد" : "Active|شغّال") + "</span>");
    } else if (ty === "seg") {
      r.appendChild(seg(v.o.map(B), v.i, function (n) { v.i = n; render(); }));
    } else if (ty === "lang") {
      var curLangIdx = isAr() ? 1 : 0;
      r.appendChild(seg(["English", "العربية"], curLangIdx, function (n) {
        if (typeof window.setLang === "function") {
          window.setLang(n === 0 ? "en" : "ar");
        } else if (typeof S !== "undefined") {
          S.lang = n === 0 ? "en" : "ar";
          render();
        }
      }));
    } else if (ty === "theme") {
      var isLight = document.documentElement.getAttribute("data-theme") === "light";
      r.appendChild(seg([B("Light|فاتح"), B("Dark|داكن")], isLight ? 0 : 1, function (n) {
        if (typeof window.th === "function") window.th(n === 0 ? "light" : "dark");
        render();
      }));
    } else if (ty === "font") {
      r.appendChild(seg(["S|ص", "M|م", "L|ك"].map(B), st.font, function (n) {
        st.font = n;
        document.documentElement.style.fontSize = [15, 16, 18][st.font] + "px";
        render();
      }));
    }
    return r;
  }

  function blk(b, SC) {
    var w = document.createElement("div");
    var p = (typeof S !== "undefined" && S.p) || { n: "IDC" };
    if (b.k === "p") {
      w.innerHTML = '<p class="note">' + B(b.s) + "</p>";
    } else if (b.k === "h") {
      w.innerHTML = '<div class="gt">' + B(b.s) + "</div>";
    } else if (b.k === "kv") {
      var c = card();
      b.r.forEach(function (pair) {
        c.insertAdjacentHTML("beforeend", '<div class="row"><span class="l">' + B(pair[0]) + '</span><span class="v" dir="auto">' + V(pair[1]) + "</span></div>");
      });
      w.appendChild(c);
    } else if (b.k === "tog") {
      var c2 = card();
      b.r.forEach(function (item) {
        c2.appendChild(row(["tog", item[0], item[2], item[1]], SC));
      });
      w.appendChild(c2);
    } else if (b.k === "choice") {
      var c3 = card(), cur = st.ch[b.key] || 0;
      b.o.forEach(function (o, n) {
        var r = document.createElement("button");
        r.className = "row";
        r.innerHTML = '<span class="l">' + B(o) + '</span><span class="radio" aria-checked="' + (n === cur) + '"></span>';
        r.onclick = function () { st.ch[b.key] = n; render(); };
        c3.appendChild(r);
      });
      w.appendChild(c3);
    } else if (b.k === "list") {
      var c4 = card(), ls = st.lists[b.key] || [];
      if (!ls.length) {
        c4.innerHTML = '<div class="row"><span class="l v">' + B("Nothing here|مفيش حاجة هنا") + "</span></div>";
      }
      ls.forEach(function (it) {
        var r = document.createElement("div");
        r.className = "row";
        r.innerHTML = (b.mode === "none" ? '<span class="dot' + (it.bad ? " b" : "") + '"></span>' : "") +
          '<span class="l">' + B(it.a) + '<span class="sub">' + B(it.b) + "</span></span>";
        if (b.mode === "remove" && !it.cur) {
          var x = document.createElement("button");
          x.className = "mini d";
          x.textContent = B(b.act);
          x.onclick = function () {
            ls.splice(ls.indexOf(it), 1);
            render();
          };
          r.appendChild(x);
        }
        if (b.mode === "remove" && it.cur) {
          r.insertAdjacentHTML("beforeend", '<span class="st">' + B("This device|الجهاز ده") + "</span>");
        }
        if (b.mode === "toggle") {
          if (it.a === "LinkedIn" && it.c) {
            var openLi = document.createElement("button");
            openLi.className = "mini";
            openLi.style.marginInlineEnd = "10px";
            openLi.textContent = B("Open|فتح ↗");
            openLi.onclick = function () {
              if (window.idcOpenLinkedIn) window.idcOpenLinkedIn(false);
            };
            r.appendChild(openLi);
          }
          var x2 = document.createElement("button");
          x2.className = "mini" + (it.c && it.a !== "LinkedIn" ? " d" : "");
          x2.textContent = it.a === "LinkedIn" ? B(it.c ? "Edit|تعديل" : "Add link|ربط الرابط") : B(it.c ? "Disconnect|فصل" : "Connect|ربط");
          x2.onclick = function () {
            if (it.a === "LinkedIn" && window.idcOpenLinkedIn) {
              window.idcOpenLinkedIn(true);
              return;
            }
            it.c = !it.c;
            it.b = it.c ? "Connected|مربوط" : "Not connected|مش مربوط";
            render();
          };
          r.appendChild(x2);
        }
        c4.appendChild(r);
      });
      w.appendChild(c4);
    } else if (b.k === "docs_list") {
      var cDocs = card();
      var items = (typeof S !== "undefined" && Array.isArray(S.items)) ? S.items : [];
      var dLim = st.docsLimit || 20;
      if (!items.length) {
        cDocs.innerHTML = '<div class="row"><span class="l v">' + B("No documents yet|مفيش وثائق لسه") + "</span></div>";
      } else {
        items.slice(0, dLim).forEach(function (doc) {
          var rDoc = document.createElement("div");
          rDoc.className = "row";
          rDoc.innerHTML = '<span class="l">' + esc(doc.title) + '<span class="sub">' + esc((window.TN && window.TN[doc.type]) || doc.type) + "</span></span>";
          var editBtn = document.createElement("button");
          editBtn.className = "mini";
          editBtn.textContent = B("Edit|تعديل");
          editBtn.onclick = function () {
            if (typeof window.ed === "function") window.ed(doc.id);
          };
          rDoc.appendChild(editBtn);
          cDocs.appendChild(rDoc);
        });
      }
      w.appendChild(cDocs);
      if (items.length > dLim) {
        var moreB = document.createElement("button");
        moreB.className = "cta sec";
        moreB.textContent = B("Show more (" + (items.length - dLim) + ")|عرض المزيد (" + (items.length - dLim) + ")");
        moreB.onclick = function () { st.docsLimit = dLim + 20; render(); };
        w.appendChild(moreB);
      }
    } else if (b.k === "steps") {
      var c5 = card();
      b.r.forEach(function (s, n) {
        c5.insertAdjacentHTML("beforeend", '<div class="row"><span class="num">' + (n + 1) + '</span><span class="l">' + B(s) + "</span></div>");
      });
      w.appendChild(c5);
    } else if (b.k === "faq") {
      var c6 = card();
      c6.style.padding = "0 16px";
      b.r.forEach(function (qa) {
        c6.insertAdjacentHTML("beforeend", "<details><summary><span>" + B(qa[0]) + "</span>" + ic("chev", "chev") + "</summary><p>" + B(qa[1]) + "</p></details>");
      });
      w.appendChild(c6);
    } else if (b.k === "btn") {
      var btnEl = document.createElement("button");
      btnEl.className = "cta " + (b.kind === "primary" ? "" : b.kind);
      btnEl.textContent = B(b.s);
      btnEl.style.marginBottom = "10px";
      btnEl.onclick = b.fn;
      w.appendChild(btnEl);
    } else if (b.k === "av") {
      var avDiv = document.createElement("div");
      avDiv.className = "big";
      if (p.photo) {
        avDiv.style.backgroundImage = "url('" + p.photo + "')";
      } else {
        avDiv.textContent = (p.n && p.n[0]) || "M";
      }
      w.appendChild(avDiv);
    } else if (b.k === "scan") {
      w.innerHTML = '<div class="card"><div class="row"><span class="l" id="idc-st-sc">' + B("Ready to scan|جاهز للمسح") + "</span></div></div>";
      var scanBtn = document.createElement("button");
      scanBtn.className = "cta";
      scanBtn.textContent = B("Start scanning / Program NFC|ابدأ المسح وبرمجة الكارد");
      scanBtn.onclick = function () {
        var scEl = document.getElementById("idc-st-sc");
        if (scEl) scEl.textContent = B("Scanning…|بيمسح…");
        if (typeof window.emWriteNfc === "function") window.emWriteNfc();
        setTimeout(function () {
          if (scEl) scEl.innerHTML = '<span class="st">' + B("Card detected · NTAG213 · •••• 4F2A|اتعرف على الكارد · NTAG213 · •••• 4F2A") + "</span>";
          toast(B("Card linked to your account|اتربط الكارد بحسابك"));
        }, 1200);
      };
      w.appendChild(scanBtn);
    } else if (b.k === "del") {
      var f = document.createElement("div");
      f.className = "st-f";
      f.innerHTML = "<label>" + B("Type DELETE to confirm|اكتب DELETE للتأكيد") + '</label><input autocomplete="off">';
      var delBtn = document.createElement("button");
      delBtn.className = "cta danger";
      delBtn.disabled = true;
      delBtn.textContent = B("Delete my account|احذف حسابي");
      var inp = f.querySelector("input");
      inp.oninput = function () { delBtn.disabled = inp.value.trim() !== "DELETE"; };
      delBtn.onclick = function () {
        if (confirm(B("Delete your account permanently?|حذف الحساب نهائيًا؟"))) {
          if (typeof window.idcSignOut === "function") window.idcSignOut();
        }
      };
      w.appendChild(f);
      w.appendChild(delBtn);
    } else if (b.k === "fields") {
      var ins = [];
      b.r.forEach(function (fldDef) {
        var label = fldDef[0], val = fldDef[1], ty = fldDef[2];
        var fDiv = document.createElement("div");
        fDiv.className = "st-f";
        var id = randId();
        fDiv.innerHTML = '<label for="' + id + '">' + B(label) + "</label>" +
          (ty === "area" ? '<textarea id="' + id + '"></textarea>' : '<input id="' + id + '" type="' + (ty === "pw" ? "password" : ty === "email" ? "email" : "text") + '" autocomplete="off">');
        var inputEl = fDiv.lastChild;
        inputEl.value = B(val);
        ins.push(inputEl);
        w.appendChild(fDiv);
      });
      var er = document.createElement("div");
      er.className = "err";
      var subBtn = document.createElement("button");
      subBtn.className = "cta";
      subBtn.textContent = B(b.btn);
      subBtn.onclick = function () {
        var vals = ins.map(function (i) { return i.value; });
        var m = b.chk ? b.chk(vals) : "";
        if (m) {
          er.textContent = B(m);
          return;
        }
        er.textContent = "";
        toast(B(b.done));
        if (b.then) b.then(vals);
        else ins.forEach(function (i) { if (i.type === "password") i.value = ""; });
      };
      w.appendChild(er);
      w.appendChild(subBtn);
    }
    return w;
  }

  function renderMainList(el) {
    var p = (typeof S !== "undefined" && S.p) || { n: "Maria", role: "student" };
    var avStyle = p.photo ? "background-image:url('" + p.photo + "')" : "";
    var avText = p.photo ? "" : esc((p.n && p.n[0]) || "M");
    el.innerHTML =
      '<header class="top">' +
        '<button class="back" aria-label="Back" id="idc-st-exit">' + ic("back", "flip") + "</button>" +
        "<h1>" + B("Settings|الإعدادات") + "</h1>" +
        '<button class="lg" aria-label="Language" id="idc-st-lang">' + (isAr() ? "EN" : "ع") + "</button>" +
      "</header>" +
      '<div class="me" id="idc-st-me" style="cursor:pointer">' +
        '<span class="av" style="' + avStyle + '">' + avText + "</span>" +
        "<div><b>" + esc(p.n || B("Nour|نور")) + "</b><small>" + B("IDC Member · Verified|عضو IDC · موثّق") + "</small></div>" +
      "</div>" +
      '<div style="height:12px"></div>';

    var exitBtn = el.querySelector("#idc-st-exit");
    if (exitBtn) exitBtn.onclick = function () { window.pg = null; if (typeof window.R === "function") window.R(); };
    var langBtn = el.querySelector("#idc-st-lang");
    if (langBtn) langBtn.onclick = function () {
      if (typeof window.setLang === "function") window.setLang(isAr() ? "en" : "ar");
    };
    var meCard = el.querySelector("#idc-st-me");
    if (meCard) meCard.onclick = function () { openScreen("edit"); };

    var c = card();
    S_.forEach(function (s) {
      var b = document.createElement("button");
      b.className = "row tp";
      b.innerHTML = '<span class="tile">' + ic(s.ic) + '</span><span class="l"><b>' + B(s.t) + '</b><span class="sub">' + B(s.d) + "</span></span>" + ic("chev", "chev flip");
      b.onclick = function () { goRoute("t-" + s.id); };
      c.appendChild(b);
    });
    el.appendChild(c);
  }

  function renderTopic(el, s, SC) {
    el.innerHTML =
      '<header class="hd">' +
        '<button class="back" aria-label="Back" id="idc-st-back-root">' + ic("back", "flip") + "</button>" +
        "<h1>" + B(s.t) + "</h1>" +
      "</header>" +
      (s.note ? '<p class="note">' + B(s.note) + "</p>" : "");
    var bBtn = el.querySelector("#idc-st-back-root");
    if (bBtn) bBtn.onclick = function () { goRoute(""); };

    s.g.forEach(function (g) {
      if (g.t) el.insertAdjacentHTML("beforeend", '<div class="gt">' + B(g.t) + "</div>");
      var c = card();
      g.items.forEach(function (i) { c.appendChild(row(i, SC)); });
      el.appendChild(c);
    });
  }

  function renderDetail(el, id, SC) {
    var s = SC[id];
    el.innerHTML =
      '<header class="hd">' +
        '<button class="back" aria-label="Back" id="idc-st-back-detail">' + ic("back", "flip") + "</button>" +
        "<h1>" + B(s.t) + "</h1>" +
      "</header>";
    var bBtn = el.querySelector("#idc-st-back-detail");
    if (bBtn) bBtn.onclick = function () { backFrom(id); };
    s.b.forEach(function (b) { el.appendChild(blk(b, SC)); });
  }

  function render() {
    var el = typeof document !== "undefined" ? document.getElementById("idc-settings-root") : null;
    if (!el) return;
    syncFromAppState();
    var SC = buildSC();
    var k = navRoute;
    var id = k.slice(2);
    var tp = k.indexOf("t-") === 0 ? S_.filter(function (x) { return x.id === id; })[0] : null;
    if (k.indexOf("s-") === 0 && SC[id]) renderDetail(el, id, SC);
    else if (tp) renderTopic(el, tp, SC);
    else renderMainList(el);
  }

  window.pset = function () {
    setTimeout(render, 0);
    return '<div id="idc-settings-root" class="idc-st"></div>';
  };

  window.IDCSettings = {
    open: function (route) {
      navRoute = route || "";
      window.pg = { k: "settings" };
      if (typeof window.R === "function") window.R();
      render();
    },
    render: render
  };
})();
