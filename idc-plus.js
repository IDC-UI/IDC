/* IDC plus:
   - Dynamic per-user NFC / QR Card link (?id=<userId>&c=<bundle>)
   - Owner phone recognition: if opened on the cardholder's own signed-in phone, opens Home directly without password
   - Other phone Card Gate: shows two side-by-side options:
       1) External Card Password (الباسورد الخارجي) to unlock public card / sign in (Private data stays locked)
       2) Emergency Mode (وضع الطوارئ) right next to it, open to anyone with zero password
   - Full Arabic & English (EN) support */
(function () {
  "use strict";

  var CARD_STORE_KEY = "idc_card_bundles_v1";
  var b64 = function (u) {
    var s = "";
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  var ub64 = function (s) {
    s = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); });
  };
  var enc = new TextEncoder(), dec = new TextDecoder();
  function b64Json(obj) { return b64(enc.encode(JSON.stringify(obj))); }
  function ub64Json(str) { return JSON.parse(dec.decode(ub64(str))); }
  function L(ar, en) { return window.S && S.lang === "en" ? en : ar; }

  /* ---- AES-256-GCM & PBKDF2 WebCrypto ---- */
  window.IDCrypto = {
    async newKey() { return crypto.getRandomValues(new Uint8Array(32)); },
    async _k(raw) { return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]); },
    async enc(obj, raw) {
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, await this._k(raw), enc.encode(JSON.stringify(obj))));
      var o = new Uint8Array(12 + ct.length);
      o.set(iv);
      o.set(ct, 12);
      return b64(o);
    },
    async dec(s, raw) {
      var o = ub64(s);
      return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: o.slice(0, 12) }, await this._k(raw), o.slice(12))));
    },
    async fromPass(p, salt) {
      var m = await crypto.subtle.importKey("raw", enc.encode(p), "PBKDF2", false, ["deriveBits"]);
      return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt, iterations: 250000, hash: "SHA-256" }, m, 256));
    }
  };

  var F = [
    ["n", "الاسم", "Name"],
    ["nid", "الرقم القومي", "National ID"],
    ["bt", "فصيلة الدم", "Blood Type"],
    ["al", "الحساسية", "Allergies"],
    ["dz", "أمراض / أدوية مزمنة", "Chronic Conditions / Meds"],
    ["c1", "اسم شخص للتواصل", "Emergency Contact Name"],
    ["c2", "رقم تليفونه", "Emergency Contact Phone"]
  ];
  var SAMPLE = {
    n: "ماريا إبراهيم",
    nid: "29901011234567",
    bt: "O+",
    al: "البنسلين",
    dz: "لا يوجد",
    c1: "ميكوش",
    c2: "01000000000"
  };

  function getStoredBundles() {
    try { return JSON.parse(localStorage.getItem(CARD_STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveStoredBundle(id, bundle) {
    if (!id || !bundle) return;
    try {
      var all = getStoredBundles();
      all[String(id).toLowerCase()] = bundle;
      localStorage.setItem(CARD_STORE_KEY, JSON.stringify(all));
    } catch (e) {}
  }
  function getStoredBundle(id) {
    if (!id) return null;
    var all = getStoredBundles();
    return all[String(id).toLowerCase()] || null;
  }

  /* ---- Dynamic URL & Legacy Hash Parsing ---- */
  function hashP() {
    var m = location.hash.match(/^#e=([^&]+)&k=(.+)$/);
    return m && { c: m[1], k: m[2] };
  }
  function cardParams() {
    var params = new URLSearchParams(window.location.search);
    var userId = params.get("id");
    var c = params.get("c");
    if (!c) {
      var hm = location.hash.match(/(?:^|[&#])c=([^&]+)/);
      if (hm) c = hm[1];
    }
    if (!userId && !c) return null;
    return { id: userId ? userId.trim() : "", c: c || "" };
  }

  var EM = null;
  var cardState = {
    dismissed: false,
    tab: "gate",          // "gate" (shows both side-by-side + external password) or "emerg" (full emergency view)
    unlockedCard: null,   // decrypted public card { p, items } when unlocked on another phone
    err: "",
    busy: false
  };

  function currentUserId() {
    if (S.userEmail) return String(S.userEmail).toLowerCase();
    if (S.user) return String(S.user).toLowerCase();
    if (!S.sid) { S.sid = 1000 + Math.floor(Math.random() * 9000); }
    return "idc-" + S.sid;
  }

  function isCardOwnerLoggedIn(targetId) {
    if (!targetId) return false;
    var hasSession = Boolean(S.p && !S.preview && S.user && (!window.IDCUnlockVault || window.IDCUnlockVault()));
    if (!hasSession) return false;
    var t = String(targetId).toLowerCase();
    return (
      (S.userEmail && String(S.userEmail).toLowerCase() === t) ||
      (S.user && String(S.user).toLowerCase() === t) ||
      (S.sid && ("idc-" + S.sid).toLowerCase() === t) ||
      (S.sid && String(S.sid) === t)
    );
  }

  function parseCardBundle(cp) {
    if (!cp) return null;
    if (cp.c) {
      try {
        var parsed = ub64Json(cp.c);
        if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.e)) {
            var emObj = {};
            F.forEach(function (f, idx) { if (parsed.e[idx]) emObj[f[0]] = parsed.e[idx]; });
            parsed.em = emObj;
            if (!parsed.name && emObj.n) parsed.name = emObj.n;
          }
          if (cp.id && !parsed.id) parsed.id = cp.id;
          if (parsed.id) saveStoredBundle(parsed.id, parsed);
          return parsed;
        }
      } catch (e) {}
    }
    if (cp.id) {
      var cached = getStoredBundle(cp.id);
      if (cached) return cached;
      return { id: cp.id, em: null, pub: null };
    }
    return null;
  }

  async function loadEm() {
    var p = hashP();
    if (!p) return;
    try { EM = await window.IDCrypto.dec(p.c, ub64(p.k)); }
    catch (e) { EM = false; }
    R();
  }

  function renderEmergencyDetailsBlock(d) {
    var hasAny = F.some(function (f) { return d && d[f[0]] && String(d[f[0]]).trim(); });
    if (!hasAny) {
      return '<div class="cd mu" style="text-align:center;padding:20px">' +
        L("صاحب الكارت لم يسجّل تفاصيل الطوارئ بعد، أو افتحي الكارت بالباسورد الخارجي لتحميل البيانات.", "The cardholder has not added emergency details yet, or unlock the card with the external password to load data.") +
        "</div>";
    }
    var rows = F.map(function (f) {
      return d[f[0]]
        ? '<div class="rw"><span class="mu">' + (S.lang === "en" ? f[2] : f[1]) + '</span><b dir="auto" style="font-weight:600">' + esc(d[f[0]]) + "</b></div>"
        : "";
    }).join("");
    var call = d.c2
      ? '<a class="bt w" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;margin-top:16px;height:48px;background:#b42318;color:#fff" href="tel:' + esc(d.c2) + '">' +
        mi("call") + " " + L("اتصال فوري بـ ", "Call ") + esc(d.c1 || L("جهة الطوارئ", "Emergency Contact")) + " (" + esc(d.c2) + ")</a>"
      : "";
    return '<div class="cd" style="border:1.5px solid rgba(212,80,106,.4);margin-top:8px">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div class="ic" style="--c:#b42318">' + mi("emergency") + '</div><div class="g"><b style="font-size:17px;font-weight:700">' + L("بيانات الطوارئ السريعة", "Quick Emergency Info") + '</b><div class="mu" style="font-size:12px">' + L("مفتوحة بدون باسورد لمساعدة صاحب الكارت في الطوارئ", "Open without a password to assist the cardholder in emergencies") + "</div></div></div>" +
      rows + call + "</div>";
  }

  /* ---- Legacy #e=... Emergency View ---- */
  function emView() {
    if (EM === false) {
      return '<div class="ac"><h2 style="text-align:center">' + L("الرابط ده مش سليم", "Invalid emergency link") + '</h2><div class="mu" style="text-align:center">' + L("اتأكدي إن الكارت أو الـ QR اتمسح كامل.", "Make sure the NFC card or QR code was scanned completely.") + "</div></div>";
    }
    if (!EM) {
      return '<div class="mu" style="text-align:center;padding:40px">' + L("جاري الفتح…", "Opening…") + "</div>";
    }
    return '<div class="ac" style="margin-top:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' + wm() + '<button class="bt t" onclick="setLang(S.lang===\'en\'?\'ar\':\'en\')">' + (S.lang === "en" ? "العربية" : "EN") + "</button></div>" +
      renderEmergencyDetailsBlock(EM) +
      '</div><div class="mu" style="text-align:center;font-size:12px;margin-top:12px">' + L("البيانات دي معروضة من غير تسجيل دخول لأن صاحبها اختار كده.", "This emergency information is shown without sign-in as configured by the cardholder.") + "</div>";
  }

  /* ---- Per-User Card Gate View (?id=<userId>&c=<bundle>) for Other Phones ---- */
  function cardGateView(cp) {
    var bundle = parseCardBundle(cp) || { id: cp.id || "" };
    var em = bundle.em || {};
    var ownerName = em.n || bundle.name || cp.id || L("مستخدم IDC", "IDC User");
    var ownerSub = bundle.role ? (RL && RL[bundle.role] ? (S.lang === "en" ? T(RL[bundle.role][0]) : RL[bundle.role][0]) : "") : "";
    if (bundle.ct) ownerSub += (ownerSub ? " · " : "") + (S.lang === "en" ? T(bundle.ct) : bundle.ct);

    var topBar = '<div class="bar" style="padding-top:4px">' +
      wm().replace('class="wm"', 'class="wm" style="font-size:24px;text-align:start"') +
      '<span style="flex:1"></span>' +
      '<button class="bt t" style="font-weight:700" onclick="setLang(S.lang===\'en\'?\'ar\':\'en\')">' + (S.lang === "en" ? "العربية" : "EN") + "</button>" +
      "</div>";

    var headerCard = '<div class="fc fr" style="position:relative;height:auto;min-height:130px;margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><b dir="ltr" style="letter-spacing:1px;font-size:17px">IDC CARD</b><span style="font-size:11px;background:rgba(255,255,255,.22);padding:3px 10px;border-radius:99px">' + L("✓ كارت هوية موثق", "✓ Verified ID Card") + "</span></div>" +
      '<div style="margin-top:12px;font-size:21px;font-weight:700">' + esc(ownerName) + "</div>" +
      (ownerSub ? '<div style="opacity:.9;font-size:13px">' + esc(ownerSub) + "</div>" : "") +
      (bundle.id ? '<div dir="ltr" style="font-size:11.5px;opacity:.8;margin-top:6px">ID: ' + esc(bundle.id) + "</div>" : "") +
      "</div>";

    // Two side-by-side partitions on the external card screen:
    // 1) Emergency Mode (وضع الطوارئ) - no password
    // 2) External Password (الباسورد الخارجي) - unlocks cardholder's public card / account
    var twoPartitions = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">' +
      '<div class="cd" role="button" tabindex="0" onclick="window.IDCCardGate.setTab(\'emerg\')" style="margin:0;cursor:pointer;border:2px solid ' + (cardState.tab === "emerg" ? "#b42318" : "rgba(212,80,106,.35)") + ';background:' + (cardState.tab === "emerg" ? "color-mix(in srgb,#b42318 10%,var(--cd))" : "var(--cd)") + '">' +
        '<div class="ic" style="--c:#b42318;margin-bottom:8px">' + mi("emergency", 26) + "</div>" +
        '<b style="font-size:15px;display:block">' + L("وضع الطوارئ", "Emergency Mode") + "</b>" +
        '<div class="mu" style="font-size:12px;margin-top:4px">' + L("يفتح فورًا بدون أي باسورد لمساعدة صاحب الكارت", "Opens instantly without any password") + "</div>" +
        '<div style="margin-top:8px;font-size:11.5px;font-weight:700;color:#b42318">' + L("مفتوح للجميع ✓", "Open to anyone ✓") + "</div>" +
      "</div>" +
      '<div class="cd" role="button" tabindex="0" onclick="window.IDCCardGate.setTab(\'gate\')" style="margin:0;cursor:pointer;border:2px solid ' + (cardState.tab === "gate" ? "var(--bl)" : "var(--ln)") + ';background:' + (cardState.tab === "gate" ? "color-mix(in srgb,var(--bl) 10%,var(--cd))" : "var(--cd)") + '">' +
        '<div class="ic" style="--c:var(--bl);margin-bottom:8px">' + mi(cardState.unlockedCard ? "lock_open" : "vpn_key", 26) + "</div>" +
        '<b style="font-size:15px;display:block">' + L("الباسورد الخارجي", "External Password") + "</b>" +
        '<div class="mu" style="font-size:12px;margin-top:4px">' + L("لفتح بيانات الكارت العامة (البيانات الخاصة تظل مقفولة)", "Unlock public card details (Private data stays locked)") + "</div>" +
        '<div style="margin-top:8px;font-size:11.5px;font-weight:700;color:var(--bl)">' + (cardState.unlockedCard ? L("مفتوح الآن ✓", "Unlocked ✓") : L("أدخلي الباسورد الخارجي", "Enter external password")) + "</div>" +
      "</div>" +
    "</div>";

    var bodyContent = "";
    if (cardState.tab === "emerg") {
      bodyContent = renderEmergencyDetailsBlock(em);
    } else if (cardState.unlockedCard) {
      var up = cardState.unlockedCard.p || { n: ownerName, nid: em.nid || "", bd: "", ph: em.c2 || "", ct: bundle.ct || "", role: bundle.role || "student" };
      var uItems = Array.isArray(cardState.unlockedCard.items) ? cardState.unlockedCard.items : [];
      var rw = function (l, val) { return val ? '<div class="rw"><span class="mu">' + l + '</span><b dir="auto" style="font-weight:600">' + esc(val) + "</b></div>" : ""; };
      bodyContent = '<div class="cd" style="border:1.5px solid var(--gn)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<div style="display:flex;align-items:center;gap:8px"><div class="ic" style="--c:var(--gn)">' + mi("verified_user") + '</div><b>' + L("بيانات الكارت العامة", "Public Card Data") + "</b></div>" +
          '<button class="bt o" style="height:32px;padding:0 12px;font-size:12px" onclick="window.IDCCardGate.lockCard()">' + L("قفل الكارت", "Lock Card") + "</button>" +
        "</div>" +
        rw(L("الاسم الكامل", "Full Name"), up.n) +
        rw(L("الرقم القومي", "National ID"), up.nid) +
        rw(L("تاريخ الميلاد", "Date of Birth"), up.bd) +
        rw(L("رقم الموبايل", "Mobile Number"), up.ph) +
        rw(L("المحافظة", "Governorate"), up.ct) +
        "</div>" +
        (uItems.length ? '<div class="cd"><b>' + L("الوثائق والشهادات العامة", "Public Documents & Certificates") + "</b>" + uItems.map(function (it) {
          return '<div class="rw"><span>' + esc(it.title) + '</span><b dir="auto">' + esc(it.value) + "</b></div>";
        }).join("") + "</div>" : "") +
        '<div class="nt">' + L("البيانات الخاصة (Private Data) محمية ولا تظهر هنا؛ تتطلب فتح التطبيق على جهاز صاحب الحساب بـ 3 باسوردات + البصمة.", "Private Data is strictly protected and never shown here; it requires the owner's 3 passwords + Fingerprint inside the app.") + "</div>";
    } else {
      bodyContent = '<div class="cd" style="padding:18px">' +
        '<h3 style="font-size:18px;font-weight:700;margin:0 0 6px;text-align:center">' + L("فتح الكارت بالباسورد الخارجي", "Unlock Card with External Password") + "</h3>" +
        '<div class="mu" style="font-size:12.5px;text-align:center;margin-bottom:10px">' + L("لو أنتِ صاحبة الكارت وبتفتحيه من موبايل تاني، اكتبي الباسورد الخارجي للكارت (أو باسورد حسابك). ولو في حالة طوارئ، دوسي على «وضع الطوارئ» فوق هيفتح من غير باسورد.", "If this is your card on another phone, enter your External Card Password (or account password). For emergencies, tap 'Emergency Mode' above — no password needed.") + "</div>" +
        ( (!bundle.em && bundle.id && bundle.id.indexOf("@") > -1) ? '' : fld("cgEmail", L("البريد الإلكتروني لصاحب الكارت (اختياري للدخول الكامل)", "Cardholder Email (optional for full sign-in)"), { t: "email", d: "ltr", v: bundle.email || (bundle.id && bundle.id.indexOf("@") > -1 ? bundle.id : "") }) ) +
        fld("cgPass", L("الباسورد الخارجي للكارت / كلمة المرور", "External Card Password / Account Password"), { t: "password", d: "ltr" }) +
        '<div class="err" id="cgErr">' + esc(cardState.err) + "</div>" +
        '<div class="ar" style="margin-top:12px;gap:8px">' +
          '<button class="bt w" id="cgBtn" onclick="window.IDCCardGate.unlock()"' + (cardState.busy ? " disabled" : "") + ">" + (cardState.busy ? L("جاري الفتح…", "Unlocking…") : L("فتح الكارت", "Unlock Card")) + "</button>" +
        "</div>" +
      "</div>" +
      renderEmergencyDetailsBlock(em);
    }

    var footerSwitch = '<div style="text-align:center;margin-top:16px">' +
      '<button class="bt t" style="font-size:12.5px;color:var(--mu)" onclick="window.IDCCardGate.exitToAuth()">' +
      L("فتح حساب مختلف أو إنشاء حساب جديد في IDC", "Sign in with a different account or create a new IDC account") +
      "</button></div>";

    return '<div class="sx">' + topBar + headerCard + twoPartitions + bodyContent + footerSwitch + "</div>";
  }

  window.IDCCardGate = {
    setTab: function (t) {
      cardState.tab = t;
      cardState.err = "";
      R();
    },
    lockCard: function () {
      cardState.unlockedCard = null;
      R();
    },
    exitToAuth: function () {
      cardState.dismissed = true;
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
      land = false;
      au = { m: "login", d: {} };
      R();
    },
    unlock: async function () {
      var cp = cardParams();
      var bundle = parseCardBundle(cp) || {};
      var pwEl = document.getElementById("cgPass");
      var emEl = document.getElementById("cgEmail");
      var pw = pwEl ? pwEl.value : "";
      var emailInput = emEl ? emEl.value.trim().toLowerCase() : (bundle.email || (bundle.id && bundle.id.indexOf("@") > -1 ? bundle.id.toLowerCase() : ""));
      if (!pw) {
        cardState.err = L("اكتبي الباسورد الخارجي الأول.", "Please enter the external password.");
        return R();
      }
      cardState.busy = true;
      cardState.err = "";
      R();

      // 1) Try decrypting the embedded public card bundle (works on any phone, online or offline!)
      if (bundle.pub && bundle.s) {
        try {
          var key = await window.IDCrypto.fromPass(pw, ub64(bundle.s));
          var decCard = await window.IDCrypto.dec(bundle.pub, key);
          if (decCard) {
            if (Array.isArray(decCard.d)) {
              var em = bundle.em || {};
              decCard = {
                p: {
                  n: decCard.d[0] || em.n || "",
                  nid: decCard.d[1] || em.nid || "",
                  bd: decCard.d[2] || "",
                  ph: decCard.d[3] || em.c2 || "",
                  ct: decCard.d[4] || bundle.ct || "",
                  role: decCard.d[5] || bundle.role || "student"
                },
                items: (decCard.i || []).map(function (x) { return { title: x[0], value: x[1] }; })
              };
            }
            if (decCard.p) {
              cardState.unlockedCard = decCard;
              cardState.busy = false;
              cardState.err = "";
              R();
              tst(L("تم فتح الكارت بنجاح", "Card unlocked successfully"));
              return;
            }
          }
        } catch (e) {}
      }

      // 2) Also try signing into the full account via Supabase / Local Vault if email is available
      if (emailInput && window.doLoginWithValues) {
        try {
          await window.doLoginWithValues(emailInput, pw);
          if (S.screen === "home" && S.user) {
            cardState.busy = false;
            cardState.dismissed = true;
            R();
            return;
          }
        } catch (e) {}
      }

      cardState.busy = false;
      cardState.err = L("الباسورد الخارجي غير صحيح.", "Incorrect external password.");
      R();
    }
  };

  var _R = R;
  R = function () {
    if (hashP()) {
      document.getElementById("app").innerHTML = emView();
      if (typeof applyLang === "function") applyLang();
      return;
    }
    var cp = cardParams();
    if (cp && !cardState.dismissed) {
      if (isCardOwnerLoggedIn(cp.id)) {
        // Owner's own phone! Recognizes that the owner is already signed in -> goes straight to Home without password!
        cardState.dismissed = true;
      } else {
        document.getElementById("app").innerHTML = cardGateView(cp);
        if (typeof applyLang === "function") applyLang();
        return;
      }
    }
    _R();
  };
  window.addEventListener("hashchange", function () { EM = null; loadEm(); });

  /* ---- Inside the App: Emergency & NFC Card Setup Page (emPage) ---- */
  var emSample = false, emLink = "", emEdit = false, emGenerating = false;
  var _hH = hHome;
  hHome = function () {
    return _hH() + '<div class="cd it" style="cursor:pointer;margin-top:12px;--c:var(--rd)" onclick="pg={k:\'emerg\'};emLink=\'\';R()"><div class="ic">' + mi("emergency") + '</div><div class="g"><b style="font-weight:600">' + L("بطاقة الطوارئ", "Emergency Card") + '</b><div class="mu" style="font-size:12px">' + L("بيانات تتفتح من غير باسورد لو حصل طارئ", "Opens without a password in case of emergency") + "</div></div></div>";
  };
  var _pg = page;
  page = function () { return pg.k == "emerg" ? emPage() : _pg(); };

  function hasEmData(d) {
    return Boolean(d && F.some(function (f) { return d[f[0]] && String(d[f[0]]).trim(); }));
  }

  function defaultEmValues() {
    var base = S.em || {};
    var p = S.p || {};
    return {
      n: base.n || p.n || "",
      nid: base.nid || p.nid || "",
      bt: base.bt || "",
      al: base.al || "",
      dz: base.dz || "",
      c1: base.c1 || "",
      c2: base.c2 || p.ph || "",
      xpw: base.xpw || ""
    };
  }

  async function buildUserCardLink(emObj, xpw) {
    var uid = currentUserId();
    var emArr = F.map(function (f) { return emObj[f[0]] ? String(emObj[f[0]]).trim() : ""; });
    var bundle = {
      e: emArr,
      role: (S.p && S.p.role) || "student",
      ct: (S.p && S.p.ct) || ""
    };
    var passToUse = xpw || (S.em && S.em.xpw) || "";
    if (passToUse && S.p) {
      var salt = crypto.getRandomValues(new Uint8Array(8));
      var key = await window.IDCrypto.fromPass(passToUse, salt);
      var pubItems = (S.items || []).filter(function (i) { return lv(i) === "public"; }).slice(0, 4).map(function (i) {
        return [i.title, i.value];
      });
      bundle.s = b64(salt);
      bundle.pub = await window.IDCrypto.enc({
        d: [S.p.n || "", S.p.nid || "", S.p.bd || "", S.p.ph || "", S.p.ct || "", S.p.role || "student"],
        i: pubItems
      }, key);
    }
    var fullBundle = Object.assign({ id: uid, em: emObj }, bundle);
    saveStoredBundle(uid, fullBundle);
    var cParam = b64Json(bundle);
    return location.origin + location.pathname + "?id=" + encodeURIComponent(uid) + "&c=" + cParam;
  }

  function renderQrAndLinkBox() {
    if (!emLink) return "";
    var hasNfc = Boolean("NDEFReader" in window);
    return '<div class="cd" style="margin-top:16px;text-align:center;border:1.5px solid var(--bl)">' +
      '<b style="display:block;font-size:15px;margin-bottom:8px">' + L("رابط الكارت الشخصي و QR (لبرمجة كارت الـ NFC)", "Personal NFC Card Link & QR Code") + "</b>" +
      '<div id="emqr" style="display:inline-block;background:#fff;padding:10px;border-radius:12px"></div>' +
      '<div class="mu" dir="ltr" style="font-size:11px;word-break:break-all;margin:10px 0;background:var(--sf);padding:8px;border-radius:10px">' + esc(emLink) + "</div>" +
      '<div class="ar" style="justify-content:center;gap:8px;flex-wrap:wrap">' +
        '<button class="bt" onclick="emCopy()">' + mi("content_copy") + " " + L("نسخ رابط الكارت", "Copy Card Link") + "</button>" +
        (hasNfc ? '<button class="bt o" onclick="emWriteNfc()">' + mi("nfc") + " " + L("برمجة كارت NFC مباشرة", "Write to NFC Card") + "</button>" : "") +
      "</div>" +
      '<div class="mu" style="font-size:12px;margin-top:10px;line-height:1.7">' +
      L("• لما الكارت ده يتفتح على موبايلك أنتِ، بيدخل على حسابك علطول من غير باسورد.<br>• ولما يتفتح على أي موبايل تاني (زي موبايل مامتك أو في الطوارئ)، بيفتح شاشة كارتك وفيها «وضع الطوارئ» مفتوح فورًا جنب «الباسورد الخارجي».",
        "• When scanned on your own signed-in phone, it opens your account directly without a password.<br>• When scanned on any other phone, it shows your Card Screen with 'Emergency Mode' (open without password) right next to 'External Password'.") +
      "</div></div>";
  }

  function emPage() {
    var d = emSample ? SAMPLE : defaultEmValues();
    var ready = hasEmData(S.em);
    if (ready && !emEdit && !emSample) {
      if (!emLink && !emGenerating) {
        emGenerating = true;
        setTimeout(function () {
          window.emMakeFromSaved().finally(function () { emGenerating = false; });
        }, 10);
      }
      var rows = F.map(function (f) {
        return d[f[0]]
          ? '<div class="rw"><span class="mu">' + (S.lang === "en" ? f[2] : f[1]) + '</span><b dir="auto" style="font-weight:600">' + esc(d[f[0]]) + "</b></div>"
          : "";
      }).join("");
      var call = d.c2
        ? '<a class="bt w" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;margin-top:16px;height:48px;background:#b42318;color:#fff" href="tel:' + esc(d.c2) + '">' +
          mi("call") + " " + L("اتصال فوري بـ ", "Call ") + esc(d.c1 || L("جهة الطوارئ", "Emergency Contact")) + " (" + esc(d.c2) + ")</a>"
        : "";
      return pgh(L("بطاقة الطوارئ وكارت الـ NFC", "Emergency & NFC Card")) +
        '<div class="cd" style="border:1.5px solid rgba(212,80,106,.35);margin-top:4px">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div class="ic" style="--c:#b42318">' + mi("emergency") + '</div><div class="g"><b style="font-size:17px;font-weight:700">' + L("بيانات الطوارئ السريعة", "Quick Emergency Info") + '</b><div class="mu" style="font-size:12px">' + L("متاحة بدون كلمة مرور لمساعدتك في الحالات الطارئة", "Available without a password to help you in emergencies") + "</div></div></div>" +
        rows +
        '<div class="rw"><span class="mu">' + L("الباسورد الخارجي للكارت", "External Card Password") + '</span><b style="color:var(--gn)">' + (d.xpw ? L("مفعّل ✓", "Enabled ✓") : L("نفس باسورد الحساب", "Uses Account Password")) + "</b></div>" +
        call + "</div>" +
        '<div class="ar" style="margin-top:14px;gap:8px"><button class="bt o" style="flex:1" onclick="emEdit=true;R()">' + mi("edit") + " " + L("تعديل البيانات", "Edit Details") + '</button><button class="bt" style="flex:1" onclick="emMakeFromSaved()">' + mi("qr_code_2") + " " + L("رابط الكارت و QR", "Card Link & QR") + "</button></div>" +
        renderQrAndLinkBox();
    }
    var fs = F.map(function (f) {
      return fld("em_" + f[0], S.lang === "en" ? f[2] : f[1], { v: d[f[0]] || "" });
    }).join("");
    var xpwField = fld("em_xpw", L("باسورد خارجي للكارت (لفتح الكارت على موبايل تاني جنب وضع الطوارئ)", "External Card Password (to unlock card on another phone alongside Emergency Mode)"), { t: "password", d: "ltr", v: d.xpw || "" });
    return pgh(L("بطاقة الطوارئ وكارت الـ NFC", "Emergency & NFC Card")) +
      '<div class="nt" style="margin-top:0">' + L("اكتبي البيانات اللي عايزاها تظهر لأي حد يفتح «وضع الطوارئ» لو حصل لكِ حاجة، وحددي الباسورد الخارجي للكارت عشان لما يتفتح على موبايل تاني يظهر الباسورد الخارجي وجنبه وضع الطوارئ.", "Enter the details to show in 'Emergency Mode' without a password, and set an External Card Password so scanning your card on another phone shows External Password right next to Emergency Mode.") + "</div>" +
      (emSample ? '<div class="nt" style="color:var(--bl)">' + L("ده نموذج ببيانات تجريبية للمعاينة. دوسي «بياناتي أنا» وادخلي بياناتك الحقيقية.", "This is sample preview data. Tap 'My Data' to enter your real details.") + "</div>" : "") +
      fs + xpwField +
      '<div class="ar" style="gap:8px;flex-wrap:wrap"><button class="bt o" onclick="emSample=!emSample;R()">' + (emSample ? L("بياناتي أنا", "My Data") : L("معاينة بنموذج", "Sample Preview")) + "</button>" +
      (ready ? '<button class="bt t" onclick="emEdit=false;emSample=false;R()">' + L("إلغاء", "Cancel") + "</button>" : "") +
      '<button class="bt" onclick="emSaveOnly()">' + L("حفظ بيانات الطوارئ", "Save Emergency Info") + '</button><button class="bt o" onclick="emMake()">' + L("حفظ + رابط الكارت و QR", "Save + Card Link & QR") + "</button></div>" +
      renderQrAndLinkBox();
  }

  function renderQrSvg() {
    setTimeout(function () {
      var e = document.getElementById("emqr");
      if (e && window.qrcode) {
        var q = qrcode(0, "M");
        q.addData(emLink);
        q.make();
        e.innerHTML = q.createSvgTag(4);
      } else if (e) {
        e.innerHTML = qr(emLink);
      }
    }, 50);
  }

  window.emSaveOnly = async function () {
    var o = {};
    F.forEach(function (f) { o[f[0]] = v("em_" + f[0]); });
    var xpwEl = document.getElementById("em_xpw");
    o.xpw = xpwEl ? xpwEl.value : (S.em && S.em.xpw) || "";
    S.em = o;
    emSample = false;
    emEdit = false;
    emLink = await buildUserCardLink(o, o.xpw);
    sv();
    R();
    renderQrSvg();
    tst(L("تم حفظ بيانات الطوارئ وتجهيز رابط الكارت", "Emergency info saved & Card Link ready"));
  };

  window.emMakeFromSaved = async function () {
    var o = defaultEmValues();
    emLink = await buildUserCardLink(o, o.xpw);
    R();
    renderQrSvg();
  };

  window.emMake = async function () {
    var o = {};
    F.forEach(function (f) { o[f[0]] = v("em_" + f[0]); });
    var xpwEl = document.getElementById("em_xpw");
    o.xpw = xpwEl ? xpwEl.value : (S.em && S.em.xpw) || "";
    if (!emSample) {
      S.em = o;
      emEdit = false;
      sv();
    }
    emLink = await buildUserCardLink(o, o.xpw);
    R();
    renderQrSvg();
  };

  window.emCopy = function () {
    if (!emLink) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emLink).then(function () {
        tst(L("تم نسخ رابط الكارت لبرمجة الـ NFC", "Card link copied for NFC programming"));
      });
    } else {
      tst(emLink);
    }
  };

  window.emWriteNfc = async function () {
    if (!emLink) await window.emMakeFromSaved();
    if (!("NDEFReader" in window)) {
      return tst(L("موبايلك أو المتصفح مش بيدعم برمجة NFC المباشرة؛ انسخي الرابط واستخدمي NFC Tools.", "Direct NFC writing is not supported on this browser; copy the link and use NFC Tools."));
    }
    try {
      var ndef = new window.NDEFReader();
      tst(L("قرّبي كارت الـ NFC من ظهر الموبايل الآن…", "Hold your NFC card against the back of your phone now…"));
      await ndef.write({ records: [{ recordType: "url", data: emLink }] });
      tst(L("تمت برمجة كارت الـ NFC بنجاح ✓", "NFC Card programmed successfully ✓"));
    } catch (e) {
      tst(L("تعذّر الكتابة على الكارت. تأكدي من تفعيل NFC أو انسخي الرابط.", "Could not write to NFC card. Make sure NFC is enabled or copy the link."));
    }
  };

  /* ---- Image Viewer with Local Analysis ---- */
  window.vw = function (id) {
    var i = S.items.filter(function (x) { return x.id == id; })[0];
    if (!i || !i.att) return;
    var a = i.att, blob = d2b(a.d), url = URL.createObjectURL(blob), im = new Image();
    var o = document.createElement("div");
    o.className = "ov";
    o.style.zIndex = 80;
    o.style.alignItems = "center";
    o.innerHTML = '<div style="border-radius:24px;padding:14px;text-align:center;width:auto;max-width:94%"><img id="vwi" style="max-width:100%;max-height:52vh;border-radius:14px"><div id="vws" class="cd mu" style="text-align:start;margin:12px 0 0;font-size:13px;line-height:1.9">' + L("جاري التحليل…", "Analyzing…") + '</div><div class="ar" style="margin-top:12px"><button class="bt t" id="vwx">' + L("إغلاق", "Close") + '</button><button class="bt" id="vwd">' + L("تحميل", "Download") + "</button></div></div>";
    document.body.appendChild(o);
    var close = function () { URL.revokeObjectURL(url); o.remove(); };
    o.onclick = function (e) { if (e.target == o) close(); };
    o.querySelector("#vwx").onclick = close;
    o.querySelector("#vwd").onclick = function () { dla(id); };
    im.onload = function () {
      o.querySelector("#vwi").src = url;
      var c = document.createElement("canvas");
      c.width = c.height = 16;
      var x = c.getContext("2d");
      x.drawImage(im, 0, 0, 16, 16);
      var p = x.getImageData(0, 0, 16, 16).data, r = 0, g = 0, bl = 0, n = 256;
      for (var j = 0; j < p.length; j += 4) { r += p[j]; g += p[j + 1]; bl += p[j + 2]; }
      r = r / n | 0; g = g / n | 0; bl = bl / n | 0;
      var br = (r * 299 + g * 587 + bl * 114) / 1000;
      var hue = r > g && r > bl ? L("مايلة للأحمر/الدفا", "warm/reddish") : g > r && g > bl ? L("مايلة للأخضر", "greenish") : L("مايلة للأزرق/البرودة", "cool/bluish");
      var kind = im.width >= im.height ? L("أفقية", "landscape") : L("رأسية", "portrait");
      o.querySelector("#vws").innerHTML = '<b style="color:var(--tx)">' + esc(i.title || a.n) + "</b><br>" +
        L("صورة ", "Image: ") + kind + " · " + (br > 150 ? L("فاتحة", "bright") : br < 80 ? L("غامقة", "dark") : L("متوسطة الإضاءة", "medium brightness")) + " · " + hue +
        "<br>" + L("الأبعاد: ", "Dimensions: ") + im.width + "×" + im.height + " px · " + L("الحجم: ", "Size: ") + (blob.size / 1024 | 0) + " KB · " + esc(blob.type) +
        "<br><span style=\"font-size:12px\">" + L("الملخص ده بيتحسب على جهازك وماحدش بيشوف صورتك.", "Computed locally on your device.") + "</span>";
    };
    im.onerror = function () { o.querySelector("#vws").textContent = L("الصورة دي مش قادر أفتحها، جربي ترفعيها تاني.", "Could not load this image."); };
    im.src = url;
  };

  /* ---- PWA Install Banner ---- */
  var dip = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); dip = e; ib(); });
  function ib() {
    if (document.getElementById("inb") || (window.matchMedia && matchMedia("(display-mode: standalone)").matches)) return;
    var ios = /iphone|ipad/i.test(navigator.userAgent);
    if (!dip && !ios) return;
    if (sessionStorage.getItem("idc_ib")) return;
    var d = document.createElement("div");
    d.id = "inb";
    d.style.cssText = "position:fixed;inset-inline:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:40;background:var(--bg);border:1px solid var(--ln);border-radius:16px;padding:12px 14px;display:flex;gap:10px;align-items:center;box-shadow:0 6px 24px rgba(0,0,0,.15)";
    d.innerHTML = '<div class="g" style="font-size:13px"><b>' + L("نزّلي IDC كتطبيق", "Install IDC App") + '</b><div class="mu" style="font-size:12px">' + (dip ? L("يفتح أسرع ويشتغل أوفلاين", "Opens faster and works offline") : L("دوسي زرار المشاركة ثم «إضافة إلى الشاشة الرئيسية»", "Tap Share then 'Add to Home Screen'")) + "</div></div>" + (dip ? '<button class="bt" id="inbi" style="height:36px">' + L("تنزيل", "Install") + "</button>" : "") + '<button class="ib" id="inbx">' + mi("close") + "</button>";
    document.body.appendChild(d);
    d.querySelector("#inbx").onclick = function () { sessionStorage.setItem("idc_ib", "1"); d.remove(); };
    var bi = d.querySelector("#inbi");
    if (bi) bi.onclick = function () { dip.prompt(); dip.userChoice.then(function () { d.remove(); }); };
  }
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
  setTimeout(ib, 2500);
  loadEm();
  if (!hashP()) R();
})();
