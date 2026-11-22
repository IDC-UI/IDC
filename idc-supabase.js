(function () {
  "use strict";

  var SESSION_KEY = "idc_active_session_v2";
  var LOCAL_VAULTS_KEY = "idc_local_vaults_v2";

  var config = window.IDC_SUPABASE_CONFIG || {};
  var validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || "");
  var validKey = /^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)$/.test(config.publishableKey || "");
  var client = validUrl && validKey && window.supabase
    ? window.supabase.createClient(config.url, config.publishableKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    })
    : null;
  var currentUser = null;
  var vaultKey = null;
  var vaultSalt = null;
  var saveQueue = Promise.resolve();
  var recoveryPending = false;
  var localSave = window.sv;
  var localPickAtt = window.pickAtt;
  var localAttRow = window.attRow;
  var localViewer = window.vw;
  var localDownload = window.dla;

  window.IDCSupabase = client;
  window.IDCSupabaseConfigured = Boolean(client);
  window.IDCSupabaseStatus = client ? "ready" : "missing-config";

  if (client) {
    window.onSec = function () {
      var en = S.lang === "en";
      var layers = [
        [en ? "End-to-End Vault Encryption (AES-256-GCM)" : "تشفير المحفظة طرف لطرف (AES-256-GCM)", en ? "Key derived via PBKDF2 (250,000 iterations) in memory only; never saved in localStorage." : "يُشتق المفتاح عبر PBKDF2 بـ 250,000 دورة في الذاكرة فقط ولا يُحفظ في المتصفح."],
        [en ? "Outer App Biometric Unlock (Fingerprint / Face ID)" : "فتح التطبيق من الخارج بالبصمة / Face ID", en ? "Hardware-backed WebAuthn + unextractable IndexedDB CryptoKey for instant outer sign-in." : "دخول سريع للتطبيق من الشاشة الخارجية عبر بصمة الجهاز / Face ID ومفتاح غير قابل للاستخراج."],
        [en ? "3-Password + Biometric Private Partition" : "حماية القسم الخاص (3 باسوردات + بصمة / Face ID)", en ? "Sealed with your account password + second Gmail password + extra password + WebAuthn platform biometrics." : "معزول بباسورد حسابك + باسورد جيميل مختلف + باسورد إضافي + بصمة الجهاز / Face ID."],
        [en ? "Instant Auto-Lock & Memory Wipe" : "قفل تلقائي فوري ومسح النص الصريح", en ? "Locks immediately when you leave the Private tab, after 60s idle, or when backgrounded." : "يُقفل فور الخروج من القسم الخاص أو بعد 60 ثانية خمول أو عند تصغير التطبيق."],
        [en ? "Access Audit Log (When · Where · How)" : "سجل مراقبة الدخول (إمتى · فين · إزاي)", en ? "Records every unlock and failed attempt with timestamp, GPS coordinates, and device info." : "يسجل كل فتح أو محاولة فاشلة بالتاريخ والوقت والموقع الجغرافي (GPS) ونوع الجهاز."],
        [en ? "Smart NFC Card & Emergency Partition" : "حماية كارت الـ NFC ووضع الطوارئ", en ? "Emergency details open without a password to save lives; public card requires External Password while Private data stays locked." : "وضع الطوارئ يفتح فورًا للإنقاذ بدون باسورد، وبيانات الكارت محمية بالباسورد الخارجي بينما تظل البيانات الخاصة مقفولة."],
        [en ? "Database Isolation (RLS & Rate Limiting)" : "عزل قواعد البيانات (Supabase RLS & Rate Limiting)", en ? "Row-Level Security, encrypted file envelopes, strict CORS allow-list, and brute-force rate limiting." : "صلاحيات صف بصف (RLS)، تشفير المرفقات قبل الرفع، وحماية ضد المحاولات المتكررة."]
      ];
      var bioCard = '<div class="cd it" style="margin-bottom:12px;--c:var(--bl)"><div class="ic">' + mi("fingerprint") + '</div><div class="g"><b style="font-weight:700">' + (en ? "Outer App Fingerprint / Face ID" : "البصمة / Face ID للدخول من برا") + '</b><div class="mu" style="font-size:12px">' + (en ? "Register your device fingerprint or Face ID to unlock the app directly from the outer screen." : "سجّلي بصمة موبايلك أو Face ID لفتح التطبيق مباشرة من الشاشة الخارجية بدون كتابة الباسورد كل مرة.") + '</div></div><button class="bt" style="height:36px;padding:0 14px" onclick="window.idcOuterBioRegister()">' + (en ? "Register Biometrics" : "تسجيل البصمة") + "</button></div>";
      var rows = layers.map(function (l) {
        return '<div class="rw" style="align-items:flex-start;gap:10px"><div><b style="font-weight:600;display:block">' + esc(l[0]) + '</b><div class="mu" style="font-size:12px;margin-top:2px">' + esc(l[1]) + '</div></div><span class="ch ok" style="margin:0;flex:none">' + (en ? "✓ Active" : "✓ فعّال") + "</span></div>";
      }).join("");
      return sec(bioCard + rows, layers.length, layers.length);
    };
    window.offSec = window.onSec;
  }

  function setError(message) {
    err = message;
    R();
  }

  function emailValid(value) {
    var email = String(value || "").trim();
    var at = email.lastIndexOf("@");
    if (email.length > 254 || at < 1 || email.indexOf("..") >= 0) return false;
    var local = email.slice(0, at);
    var domain = email.slice(at + 1);
    return local.length <= 64 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) &&
      domain.length <= 253 && domain.includes(".") &&
      domain.split(".").every(function (part) {
        return part.length > 0 && part.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(part);
      });
  }

  function base64Url(bytes) {
    var binary = "";
    bytes.forEach(function (byte) { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(value) {
    var base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return Uint8Array.from(atob(base64), function (character) { return character.charCodeAt(0); });
  }

  function getLocalVaults() {
    try { return JSON.parse(localStorage.getItem(LOCAL_VAULTS_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function setLocalVault(email, record) {
    try {
      var all = getLocalVaults();
      all[String(email || "").toLowerCase()] = record;
      localStorage.setItem(LOCAL_VAULTS_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function getLocalVault(email) {
    var all = getLocalVaults();
    return all[String(email || "").toLowerCase()] || null;
  }

  // SECURITY: the derived vault key and salt are never written to storage. They live only in
  // memory, so a reload, a stolen device or an XSS read of localStorage cannot recover them.
  // This function now only wipes any key that older versions of the app left behind.
  function saveActiveSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function clearActiveSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function backendRequired() {
    if (!client) {
      setError("إعداد Supabase غير مكتمل. أضيفي Project URL والمفتاح العام في supabase-config.js.");
      return false;
    }
    return true;
  }

  function appError(error) {
    var message = String(error && (error.message || error.code) || "");
    if (/email not confirmed/i.test(message)) return "أكدي بريدك الإلكتروني من الرابط المرسل ثم سجّلي الدخول.";
    if (/invalid login credentials/i.test(message)) return "البريد أو كلمة المرور غير صحيحة.";
    if (/already registered|user already registered/i.test(message)) return "هذا البريد مسجل بالفعل. سجّلي الدخول.";
    if (/password should be at least/i.test(message)) return "كلمة المرور أقصر من الحد المطلوب.";
    return "تعذر إكمال الطلب. تحققي من البيانات وحاولي مرة أخرى.";
  }

  function isSafeVault(value) {
    if (!value || typeof value !== "object" || (value.p !== null && typeof value.p !== "object") || !Array.isArray(value.items)) return false;
    if (value.items.length > 1000) return false;
    return value.items.every(function (item) {
      if (!item || typeof item !== "object" || typeof item.title !== "string" || item.title.length > 200 ||
        typeof item.value !== "string" || item.value.length > 10000) return false;
      if (item.id != null && !/^[A-Za-z0-9_-]{1,64}$/.test(String(item.id))) return false;
      if (item.att != null) {
        var att = item.att;
        if (typeof att !== "object") return false;
        if (att.path != null && !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.enc$/i.test(String(att.path))) return false;
        if (att.t != null && att.t !== "pdf" && att.t !== "img") return false;
        if (att.mime != null && !/^(application\/pdf|image\/(jpeg|png|webp))$/.test(String(att.mime))) return false;
      }
      return true;
    }) && (value.pv == null || (typeof value.pv === "object" && typeof value.pv.ct === "string" && typeof value.pv.salt === "string"));
  }

  function vaultSnapshot() {
    return {
      p: S.p,
      items: window.IDCPrivate ? window.IDCPrivate.publicItems(S.items) : S.items,
      pv: S.pv || null,
      sec: S.sec,
      log: S.log,
      em: S.em || null,
      tab: S.tab === "private" ? "public" : (S.tab || "public"),
      nav: S.nav || "home",
      otab: S.otab || "data"
    };
  }

  var PUBLIC_EM_KEY = "idc_public_em_v1";
  var outerLockTab = "unlock";
  var memEmergencyCache = undefined;

  function syncPublicEmergencyCache(emObj, pObj) {
    try {
      var em = emObj || (typeof S !== "undefined" && S.em);
      var p = pObj || (typeof S !== "undefined" && S.p);
      if (!em && (!p || !p.ph)) return;
      var safeEm = {
        n: String((em && em.n) || (p && p.n) || "").slice(0, 120),
        bt: String((em && em.bt) || "").slice(0, 20),
        al: String((em && em.al) || "").slice(0, 300),
        ch: String((em && em.ch) || "").slice(0, 300),
        md: String((em && em.md) || "").slice(0, 300),
        c1: String((em && em.c1) || "").slice(0, 120),
        c2: String((em && em.c2) || (p && p.ph) || "").slice(0, 40),
        nt: String((em && em.nt) || "").slice(0, 500)
      };
      if (safeEm.bt || safeEm.al || safeEm.ch || safeEm.md || safeEm.c1 || safeEm.c2 || safeEm.nt) {
        memEmergencyCache = safeEm;
        localStorage.setItem(PUBLIC_EM_KEY, JSON.stringify(safeEm));
      }
    } catch (e) {}
  }

  function loadPublicEmergencyCache() {
    if (memEmergencyCache !== undefined && memEmergencyCache !== null) return memEmergencyCache;
    try {
      var raw = localStorage.getItem(PUBLIC_EM_KEY);
      if (raw) {
        memEmergencyCache = JSON.parse(raw);
        return memEmergencyCache;
      }
    } catch (e) {}
    if (typeof S !== "undefined" && S.em) return S.em;
    return null;
  }

  window.idcSetOuterTab = function (tab) {
    outerLockTab = tab === "emerg" ? "emerg" : "unlock";
    err = "";
    R();
  };

  window.idcGetOuterTab = function () {
    return outerLockTab;
  };

  window.idcOuterEmergencyCardHtml = function () {
    var d = loadPublicEmergencyCache();
    var isEn = typeof S !== "undefined" && S.lang === "en";
    if (!d || (!d.bt && !d.al && !d.ch && !d.md && !d.c1 && !d.c2 && !d.nt)) {
      return '<div class="cd" style="border:1.5px solid rgba(212,80,106,.45);margin-top:12px;text-align:center;padding:18px 14px">' +
        '<div class="ic" style="--c:#b42318;margin:0 auto 10px">' + mi("emergency", 28) + '</div>' +
        '<b style="font-size:16px;display:block">' + (isEn ? "Emergency Mode (No Password Required)" : "وضع الطوارئ (بدون باسورد)") + '</b>' +
        '<div class="mu" style="font-size:13px;margin-top:6px;line-height:1.7">' +
          (isEn
            ? "Once the account owner fills their emergency details inside the app, they appear here automatically for responders without needing a password."
            : "بمجرد ما صاحب الحساب يسجّل بيانات الطوارئ من جوه التطبيق، بتظهر هنا تلقائيًا لأي مسعف بدون باسورد.") +
        '</div>' +
        '<a class="bt w" style="margin-top:12px;background:#b42318;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;line-height:44px" href="tel:123">' +
          mi("call") + " " + (isEn ? "Call Ambulance (123)" : "اتصال بالإسعاف (123)") +
        '</a></div>';
    }
    var fields = [
      ["n", isEn ? "Name" : "الاسم", "person"],
      ["bt", isEn ? "Blood Type" : "فصيلة الدم", "bloodtype"],
      ["al", isEn ? "Allergies" : "حساسية خطيرة", "warning"],
      ["ch", isEn ? "Chronic Conditions" : "أمراض مزمنة", "medical_information"],
      ["md", isEn ? "Current Medications" : "أدوية حالية", "medication"],
      ["c1", isEn ? "Emergency Contact" : "شخص للاتصال في الطوارئ", "contact_phone"],
      ["c2", isEn ? "Emergency Phone" : "موبايل الطوارئ", "call"],
      ["nt", isEn ? "Notes for Responder" : "ملاحظات للمسعف", "notes"]
    ];
    var rows = fields.map(function (f) {
      var val = d[f[0]];
      if (!val) return "";
      return '<div class="rw" style="gap:10px"><div style="display:flex;align-items:center;gap:8px"><div class="ic" style="--c:#b42318;width:32px;height:32px">' + mi(f[2], 18) + '</div><span class="mu">' + f[1] + '</span></div><b dir="auto" style="font-weight:700;text-align:end">' + esc(val) + '</b></div>';
    }).join("");
    var callBtn = d.c2
      ? '<a class="bt w" style="margin-top:12px;background:#b42318;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;line-height:44px" href="tel:' + esc(d.c2) + '">' +
          mi("call") + " " + (isEn ? "Call Emergency Contact: " : "اتصال فوري بـ ") + esc(d.c1 || (isEn ? "Emergency Contact" : "جهة الطوارئ")) + " (" + esc(d.c2) + ")</a>"
      : "";
    return '<div class="cd" style="border:1.5px solid rgba(212,80,106,.5);margin-top:12px;text-align:start">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div class="ic" style="--c:#b42318">' + mi("emergency") + '</div><div class="g"><b style="font-size:16px;font-weight:700">' + (isEn ? "Emergency Responder Data" : "بيانات الطوارئ للمسعفين") + '</b><div class="mu" style="font-size:11.5px">' + (isEn ? "Open without password to assist the user" : "مفتوحة من برا بدون باسورد لمساعدة صاحب الحساب فورًا") + '</div></div></div>' +
      rows + callBtn + '</div>';
  };

  window.idcOuterPartitionsBarHtml = function () {
    var isEn = typeof S !== "undefined" && S.lang === "en";
    var isEm = outerLockTab === "emerg";
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 12px">' +
      '<div class="cd" role="button" tabindex="0" onclick="window.idcSetOuterTab(\'unlock\')" style="margin:0;padding:12px;cursor:pointer;border:2px solid ' + (!isEm ? "var(--bl)" : "var(--ln)") + ';background:' + (!isEm ? "color-mix(in srgb,var(--bl) 12%,var(--cd))" : "var(--cd)") + '">' +
        '<div class="ic" style="--c:var(--bl);margin-bottom:6px">' + mi("fingerprint", 24) + '</div>' +
        '<b style="font-size:14px;display:block">' + (isEn ? "Biometrics & Sign In" : "البصمة / Face ID") + '</b>' +
        '<div class="mu" style="font-size:11.5px;margin-top:3px">' + (isEn ? "Unlock your account with Fingerprint, Face ID, or password" : "للدخول لحسابك بالبصمة أو Face ID أو الباسورد") + '</div>' +
      '</div>' +
      '<div class="cd" role="button" tabindex="0" onclick="window.idcSetOuterTab(\'emerg\')" style="margin:0;padding:12px;cursor:pointer;border:2px solid ' + (isEm ? "#b42318" : "rgba(212,80,106,.38)") + ';background:' + (isEm ? "color-mix(in srgb,#b42318 12%,var(--cd))" : "var(--cd)") + '">' +
        '<div class="ic" style="--c:#b42318;margin-bottom:6px">' + mi("emergency", 24) + '</div>' +
        '<b style="font-size:14px;display:block">' + (isEn ? "Emergency (No Password)" : "الطوارئ (بدون باسورد)") + '</b>' +
        '<div class="mu" style="font-size:11.5px;margin-top:3px">' + (isEn ? "Instant access for anyone helping the user in an emergency" : "يفتح فورًا بدون باسورد لو حصل أي حاجة لليوزر") + '</div>' +
      '</div>' +
    '</div>';
  };

  function persistVault() {
    if (!currentUser || !vaultKey || !vaultSalt || S.preview) return Promise.resolve();
    syncPublicEmergencyCache(S.em, S.p);

    saveQueue = saveQueue.catch(function () {}).then(async function () {
      if (!vaultKey || !currentUser) return;
      if (window.IDCPrivate) await window.IDCPrivate.seal();
      var snapshot = vaultSnapshot();
      if (!isSafeVault(snapshot)) throw new Error("Invalid vault data");
      if (JSON.stringify(snapshot).length > 5900000) throw new Error("Vault data is too large");
      var ciphertext = await window.IDCrypto.enc(snapshot, vaultKey);
      var saltStr = base64Url(vaultSalt);

      setLocalVault(currentUser.email, {
        user_id: currentUser.id,
        email: currentUser.email,
        name: currentUser.user_metadata && currentUser.user_metadata.display_name || S.uname || "",
        salt: saltStr,
        ciphertext: ciphertext,
        updated_at: new Date().toISOString()
      });

      if (client && !String(currentUser.id).startsWith("local_")) {
        try {
          var sessionRes = await client.auth.getSession();
          if (sessionRes && sessionRes.data && sessionRes.data.session) {
            var result = await client.functions.invoke("secure-vault", {
              body: { salt: saltStr, ciphertext: ciphertext }
            });
            // All writes go through the validating Edge Function; there is no direct-table fallback.
            if (result.error || !result.data || result.data.saved !== true) throw new Error("vault-save-failed");
          }
        } catch (remoteErr) {
          // The encrypted local copy is already saved above; tell the caller the cloud copy is stale.
          throw remoteErr;
        }
      }
    });
    return saveQueue;
  }

  window.IDCPersist = persistVault;

  window.IDCVerifyAccountPassword = async function (candidatePassword) {
    if (!vaultKey || !vaultSalt || !candidatePassword) return false;
    try {
      var candidateKey = await window.IDCrypto.fromPass(candidatePassword, vaultSalt);
      if (candidateKey.length !== vaultKey.length) return false;
      var diff = 0;
      for (var i = 0; i < vaultKey.length; i++) diff |= (candidateKey[i] ^ vaultKey[i]);
      return diff === 0;
    } catch (e) {
      return false;
    }
  };

  window.sv = function () {
    if (!S.preview) {
      if (currentUser && vaultKey) {
        persistVault().catch(function () {
          tst("تعذر حفظ البيانات المشفرة؛ تحققي من الاتصال ثم أعيدي المحاولة.");
        });
      }
      return;
    }
    localSave();
  };

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function applyVaultToState(vault, user) {
    if (!user || !UUID_RE.test(String(user.id))) throw new Error("Invalid user");
    var defaultName = (user.user_metadata && user.user_metadata.display_name) || (user.email ? user.email.split("@")[0] : "مستخدم");
    currentUser = user;
    S.preview = 0;
    S.user = user.id;
    S.userEmail = user.email;
    S.uname = defaultName;
    S.pOwner = user.id;
    S.p = vault.p || { n: defaultName, nid: "", bd: "", ph: "", ct: "", role: "student" };
    S.items = Array.isArray(vault.items) ? vault.items : [];
    S.sec = vault.sec || S.sec;
    S.log = Array.isArray(vault.log) ? vault.log : [];
    S.em = vault.em || null;
    syncPublicEmergencyCache(S.em, S.p);
    outerLockTab = "unlock";
    S.tab = vault.tab === "private" ? "public" : (vault.tab || "public");
    S.nav = vault.nav || "home";
    S.otab = vault.otab || "data";
    S.pv = vault.pv || null;
    if (window.IDCPrivate) window.IDCPrivate.reset();
    S.pin = null;
    S.vpw = null;
    un = true;
    pk = false;
    land = false;
  }

  async function loadVault(password, user, isNewSignup) {
    var canFetchRemote = Boolean(client && !String(user.id).startsWith("local_"));
    var remotePromise = canFetchRemote
      ? client.from("idc_vaults").select("salt,ciphertext").eq("user_id", user.id).maybeSingle().catch(function () { return null; })
      : Promise.resolve(null);
    var localPromise = Promise.resolve().then(function () {
      var row = getLocalVault(user.email);
      return row && row.user_id === user.id ? row : null;
    });
    var pair = await Promise.all([remotePromise, localPromise]);
    var remoteResult = pair[0];
    var remoteRow = remoteResult && !remoteResult.error && remoteResult.data ? remoteResult.data : null;
    var localRow = pair[1];
    var sourceRow = remoteRow || localRow;
    var vault = null;

    if (sourceRow) {
      try {
        vaultSalt = fromBase64Url(sourceRow.salt);
        vaultKey = await window.IDCrypto.fromPass(password, vaultSalt);
        vault = await window.IDCrypto.dec(sourceRow.ciphertext, vaultKey);
        if (!isSafeVault(vault)) throw new Error("Encrypted vault format is invalid");
      } catch (decErr) {
        if (remoteRow && localRow && sourceRow === remoteRow) {
          vaultSalt = fromBase64Url(localRow.salt);
          vaultKey = await window.IDCrypto.fromPass(password, vaultSalt);
          vault = await window.IDCrypto.dec(localRow.ciphertext, vaultKey);
          if (!isSafeVault(vault)) throw new Error("Encrypted vault format is invalid");
        } else {
          throw decErr;
        }
      }
    } else {
      var defaultName = (user.user_metadata && user.user_metadata.display_name) || (user.email ? user.email.split("@")[0] : "مستخدم");
      vaultSalt = crypto.getRandomValues(new Uint8Array(16));
      vaultKey = await window.IDCrypto.fromPass(password, vaultSalt);
      vault = {
        p: isNewSignup ? null : { n: defaultName, nid: "", bd: "", ph: "", ct: "", role: "student" },
        items: [],
        pv: null,
        sec: S.sec,
        log: [],
        em: null,
        tab: "public",
        nav: "home",
        otab: "data"
      };
    }

    var needsProfileSetup = isNewSignup && (!vault.p || !vault.p.nid);
    applyVaultToState(vault, user);
    saveActiveSession();
    try { await persistVault(); } catch (e) { tst("تعذر حفظ نسخة المحفظة المشفرة دلوقتي؛ هنحاول تاني مع أول تعديل."); }
    go({ screen: needsProfileSetup ? "profile" : "home", nav: "home" });
  }

  async function restorePersistedSession() {
    // Reloads always land on the lock screen: the vault key is not stored anywhere.
    saveActiveSession();
    return false;
  }

  var MIN_PASSWORD = 12;
  var COMMON_PASSWORDS = ["password1234", "123456789012", "qwertyuiop12", "iloveyou1234", "administrator", "welcome12345"];
  function passwordProblem(password, email) {
    password = String(password || "");
    if (password.length < MIN_PASSWORD) return "اختاري كلمة مرور من 12 حرفًا على الأقل.";
    if (password.length > 128) return "كلمة المرور طويلة جدًا (الحد الأقصى 128 حرفًا).";
    if (!(/[A-Za-z\u0600-\u06FF]/.test(password) && /\d/.test(password))) return "كلمة المرور لازم تحتوي على حروف وأرقام.";
    if (/^(.)\1+$/.test(password) || COMMON_PASSWORDS.indexOf(password.toLowerCase()) >= 0) return "كلمة المرور دي سهلة التخمين. اختاري غيرها.";
    var local = String(email || "").split("@")[0].toLowerCase();
    if (local.length >= 4 && password.toLowerCase().indexOf(local) >= 0) return "كلمة المرور ما ينفعش تحتوي على جزء من بريدك.";
    return "";
  }
  window.IDCPasswordProblem = passwordProblem;

  // Client-side login back-off. This is only a UX layer; the real rate limit is enforced by
  // Supabase Auth (see supabase/config.toml [auth.rate_limit]) because the browser can be bypassed.
  var THROTTLE_KEY = "idc_login_throttle";
  function throttleState() {
    try { return JSON.parse(localStorage.getItem(THROTTLE_KEY)) || { n: 0, until: 0 }; }
    catch (e) { return { n: 0, until: 0 }; }
  }
  function throttleLeft() {
    var st = throttleState();
    return st.until > Date.now() ? Math.ceil((st.until - Date.now()) / 1000) : 0;
  }
  function throttleFail() {
    var st = throttleState();
    st.n = (st.n || 0) + 1;
    if (st.n >= 5) st.until = Date.now() + 30000 * Math.pow(2, Math.min(st.n - 5, 5));
    try { localStorage.setItem(THROTTLE_KEY, JSON.stringify(st)); } catch (e) {}
  }
  function throttleReset() {
    try { localStorage.removeItem(THROTTLE_KEY); } catch (e) {}
  }

  window.doSu = async function () {
    if (!backendRequired()) return;
    var name = v("nm");
    var email = v("em").toLowerCase();
    var password = v("pw");
    if (!name || name.length > 100 || !emailValid(email)) return setError("اكتبي اسمًا وبريدًا إلكترونيًا صحيحًا.");
    var problem = passwordProblem(password, email);
    if (problem) return setError(problem);
    if (password !== v("pw2")) return setError("كلمتا المرور غير متطابقتين.");

    err = "";
    var result;
    try {
      result = await client.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { display_name: name },
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });
    } catch (e) {
      return setError("تعذر الاتصال. تحققي من الإنترنت وحاولي مرة أخرى.");
    }
    if (result.error) return setError(appError(result.error));
    var supaUser = result.data && result.data.user;
    if (!supaUser) return setError("تعذر إكمال الطلب. حاولي مرة أخرى.");

    // Email confirmation is mandatory: no session means the address is not confirmed yet,
    // so no vault is opened and no account exists only on this device.
    if (!result.data.session) {
      au = { m: "login", d: { lg: email } };
      err = "";
      R();
      tst("بعتنالك رابط تأكيد على بريدك. أكديه وبعدين سجّلي الدخول.");
      return;
    }

    supaUser.user_metadata = Object.assign({ display_name: name }, supaUser.user_metadata || {});
    try {
      await loadVault(password, supaUser, true);
      tst("تم إنشاء الحساب وفتح المحفظة المشفرة بنجاح");
    } catch (e) {
      setError("تعذر إنشاء المحفظة المشفرة. حاولي مرة أخرى.");
    }
  };

  window.doLogin = async function () {
    if (!backendRequired()) return;
    var email = v("lg").toLowerCase();
    var password = v("lp");
    if (!emailValid(email) || !password) return setError("اكتبي بريدًا صحيحًا وكلمة المرور.");
    var wait = throttleLeft();
    if (wait) return setError("محاولات كتير. جرّبي بعد " + wait + " ثانية.");

    err = "";
    var result;
    try {
      result = await client.auth.signInWithPassword({ email: email, password: password });
    } catch (e) {
      return setError("تعذر الاتصال. تحققي من الإنترنت وحاولي مرة أخرى.");
    }
    if (result.error || !result.data || !result.data.user) {
      throttleFail();
      return setError(appError(result.error));
    }
    try {
      var wantBio = typeof document !== "undefined" && document.getElementById("regLoginBio") && document.getElementById("regLoginBio").checked;
      await loadVault(password, result.data.user, false);
      throttleReset();
      if (wantBio && window.idcOuterBioRegister) {
        await window.idcOuterBioRegister(true);
      }
    } catch (error) {
      vaultKey = null;
      vaultSalt = null;
      currentUser = null;
      try { await client.auth.signOut(); } catch (e) {}
      throttleFail();
      setError("كلمة المرور لا تطابق المحفظة المشفرة لهذا الحساب.");
    }
  };

  window.doF1 = async function () {
    if (!backendRequired()) return;
    var email = v("fp").toLowerCase();
    if (!emailValid(email)) return setError("اكتبي بريدًا إلكترونيًا صحيحًا.");
    var result = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (result.error) return setError(appError(result.error));
    au.d = { em: email };
    A("f2");
  };

  window.doF2 = function () {
    A("login");
    tst("لو البريد مسجل، هيوصلك رابط استعادة من Supabase.");
  };

  window.doF3 = async function () {
    if (!backendRequired() || !recoveryPending) return setError("ابدئي الاستعادة من رابط البريد المرسل بواسطة Supabase.");
    var password = v("np");
    var newProblem = passwordProblem(password, "");
    if (newProblem) return setError(newProblem);
    if (password !== v("np2")) return setError("كلمتا المرور غير متطابقتين.");

    var userResult = await client.auth.getUser();
    if (userResult.error || !userResult.data.user) return setError("انتهت صلاحية رابط الاستعادة. اطلبي رابطًا جديدًا.");
    var saved = await client.from("idc_vaults")
      .select("salt,ciphertext")
      .eq("user_id", userResult.data.user.id)
      .maybeSingle();
    if (saved.error) return setError("تعذر التحقق من المحفظة المشفرة قبل تغيير كلمة المرور.");

    if (saved.data) {
      try {
        var oldSalt = fromBase64Url(saved.data.salt);
        var candidateKey = await window.IDCrypto.fromPass(password, oldSalt);
        await window.IDCrypto.dec(saved.data.ciphertext, candidateKey);
      } catch (error) {
        return setError("كلمة المرور الجديدة لا تفتح المحفظة الحالية. بيانات E2E لا يمكن استعادتها بدون كلمة المرور القديمة.");
      }
    }

    var update = await client.auth.updateUser({ password: password });
    if (update.error) return setError(appError(update.error));
    recoveryPending = false;
    await loadVault(password, update.data.user || userResult.data.user, false);
    tst("تم تحديث كلمة المرور وفتح المحفظة المشفرة.");
  };

  window.resend = async function () {
    if (!backendRequired() || !au.d.em) return;
    var result = await client.auth.resend({ type: "signup", email: au.d.em });
    if (result.error) return setError(appError(result.error));
    tst("تم طلب إعادة إرسال رابط التأكيد.");
  };

  window.idcSignOut = async function () {
    clearActiveSession();
    try { localStorage.removeItem(LOCAL_VAULTS_KEY); } catch (e) {}
    if (window.IDCPrivate) window.IDCPrivate.reset();
    if (client) {
      try { await client.auth.signOut(); } catch (e) {}
    }
    currentUser = null;
    vaultKey = null;
    vaultSalt = null;
    S.user = null;
    S.userEmail = null;
    S.p = null;
    S.items = [];
    S.em = null;
    S.pv = null;
    S.pOwner = null;
    S.pin = null;
    S.vpw = null;
    S.preview = 0;
    un = false;
    pk = false;
    land = true;
    au = { m: "login", d: {} };
    go({ screen: "auth" });
  };

  async function encryptFile(file) {
    if (!currentUser || !vaultKey) throw new Error("Sign in before uploading");
    if (!(file.type === "application/pdf" || /^image\/(jpeg|png|webp)$/.test(file.type))) {
      throw new Error("اختاري PDF أو صورة JPG/PNG/WEBP فقط.");
    }
    if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error("حجم الملف يجب ألا يتجاوز 5MB.");

    var plain = new Uint8Array(await file.arrayBuffer());
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var cryptoKey = await window.IDCrypto._k(vaultKey);
    var encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, cryptoKey, plain));
    var envelope = new Uint8Array(5 + iv.length + encrypted.length);
    envelope.set([73, 68, 67, 70, 1], 0);
    envelope.set(iv, 5);
    envelope.set(encrypted, 17);

    if (client && !String(currentUser.id).startsWith("local_")) {
      try {
        var id = crypto.randomUUID();
        var form = new FormData();
        form.append("file", new Blob([envelope], { type: "application/octet-stream" }), id + ".enc");
        var response = await client.functions.invoke("secure-upload", { body: form });
        if (!response.error && response.data && typeof response.data.path === "string") {
          return {
            n: file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180),
            t: file.type === "application/pdf" ? "pdf" : "img",
            path: response.data.path,
            mime: file.type,
            size: file.size,
            encrypted: true
          };
        }
      } catch (e) {}
    }

    // Fallback: inline base64 data URL inside the encrypted vault
    var dataUrl = await new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error("تعذر قراءة الملف")); };
      r.readAsDataURL(file);
    });
    return {
      n: file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180),
      t: file.type === "application/pdf" ? "pdf" : "img",
      d: dataUrl,
      mime: file.type,
      size: file.size,
      encrypted: true
    };
  }

  window.pickAtt = async function (input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (S.preview) return localPickAtt(input);
    if (!currentUser || !vaultKey) {
      input.value = "";
      return tst("سجّلي الدخول أولًا قبل رفع المرفقات.");
    }
    try {
      var attachment = await encryptFile(file);
      pa = attachment;
      var label = document.getElementById("atn");
      if (label) label.textContent = attachment.n + " · مشفر";
    } catch (error) {
      tst(error.message || "تعذر تشفير الملف ورفعه.");
      input.value = "";
    }
  };

  async function downloadEncrypted(path) {
    if (!client || !currentUser || !vaultKey) throw new Error("سجّلي الدخول أولًا");
    if (typeof path !== "string" || !path.startsWith(currentUser.id + "/")) throw new Error("مسار ملف غير صالح");
    var response = await client.storage.from("idc-vault").download(path);
    if (response.error || !response.data) throw new Error("تعذر تنزيل الملف المشفر");
    var envelope = new Uint8Array(await response.data.arrayBuffer());
    if (envelope.length < 33 || envelope[0] !== 73 || envelope[1] !== 68 || envelope[2] !== 67 || envelope[3] !== 70 || envelope[4] !== 1) {
      throw new Error("صيغة الملف المشفر غير صحيحة");
    }
    var cryptoKey = await window.IDCrypto._k(vaultKey);
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: envelope.slice(5, 17) }, cryptoKey, envelope.slice(17));
    return new Blob([plain]);
  }

  window.attRow = function (item) {
    if (!item.att || !item.att.path) return localAttRow(item);
    var attachment = item.att;
    var preview = attachment.t === "img"
      ? '<button class="ib" aria-label="معاينة الصورة" onclick="vw(\'' + esc(item.id) + '\')">' + mi("zoom_in") + '</button>'
      : '<div class="ic" style="--c:var(--rd)">' + mi("picture_as_pdf") + '</div>';
    return '<div class="att">' + preview + '<div class="g mu" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" dir="ltr">' + esc(attachment.n) + ' · مشفر</div><button class="ib" aria-label="تنزيل المرفق" onclick="dla(\'' + esc(item.id) + '\')">' + mi("download") + '</button></div>';
  };

  window.vw = async function (id) {
    var item = S.items.find(function (entry) { return entry.id === id; });
    if (!item || !item.att || !item.att.path) return localViewer(id);
    try {
      var blob = await downloadEncrypted(item.att.path);
      blob = new Blob([blob], { type: item.att.mime || "application/octet-stream" });
      var dataUrl = await new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { reject(new Error("تعذر فتح الملف")); };
        reader.readAsDataURL(blob);
      });
      item.att.d = dataUrl;
      localViewer(id);
      var overlay = document.querySelector("body > .ov[style*='z-index: 80']");
      if (overlay) overlay.addEventListener("click", function (event) {
        if (event.target === overlay || event.target.id === "vwx") delete item.att.d;
      }, { once: true });
    } catch (error) {
      tst(error.message || "تعذر فك تشفير الملف.");
    }
  };

  window.dla = async function (id) {
    var item = S.items.find(function (entry) { return entry.id === id; });
    if (!item || !item.att || !item.att.path) return localDownload(id);
    try {
      var blob = await downloadEncrypted(item.att.path);
      var url = URL.createObjectURL(new Blob([blob], { type: item.att.mime || "application/octet-stream" }));
      var anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.att.n;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      tst(error.message || "تعذر تنزيل الملف.");
    }
  };

  async function removeAttachment(path) {
    if (!client || !currentUser || typeof path !== "string" || !path.startsWith(currentUser.id + "/")) return;
    var result = await client.storage.from("idc-vault").remove([path]);
    if (result.error) tst("حُذف السجل، لكن تعذر حذف الملف المشفر من التخزين.");
  }

  var localDeleteItem = window.del;
  window.del = function (id) {
    var item = S.items.find(function (entry) { return entry.id === id; });
    var path = item && item.att && item.att.path;
    var deleted = localDeleteItem(id);
    if (path && !S.items.some(function (entry) { return entry.id === id; })) removeAttachment(path);
    return deleted;
  };

  var localDeleteFormItem = window.fdel;
  window.fdel = function () {
    var id = pg && pg.id;
    var item = S.items.find(function (entry) { return entry.id === id; });
    var path = item && item.att && item.att.path;
    localDeleteFormItem();
    if (path && !S.items.some(function (entry) { return entry.id === id; })) removeAttachment(path);
  };

  window.IDCUnlockVault = function () { return Boolean(currentUser && vaultKey); };

  /* ---- Outer App WebAuthn Fingerprint / Face ID (IndexedDB unextractable CryptoKey) ---- */
  function openBioDb() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") return reject(new Error("no_idb"));
      var req = indexedDB.open("idc_outer_bio_v1", 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("bio")) db.createObjectStore("bio", { keyPath: "id" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function saveOuterBioRecord(rec) {
    var db = await openBioDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("bio", "readwrite");
      tx.objectStore("bio").put(rec);
      tx.oncomplete = function () { db.close(); resolve(true); };
      tx.onerror = function () { db.close(); reject(tx.error); };
    });
  }

  async function loadOuterBioRecord(id) {
    var db = await openBioDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("bio", "readonly");
      var req = tx.objectStore("bio").get(id || "default");
      req.onsuccess = function () { db.close(); resolve(req.result || null); };
      req.onerror = function () { db.close(); reject(req.error); };
    });
  }

  window.idcOuterBioRegister = async function (silent) {
    if (!currentUser || !vaultKey || !vaultSalt) {
      if (!silent) tst(S.lang === "en" ? "Sign in with your password first to register biometrics." : "سجّلي الدخول بكلمة المرور أولًا لتفعيل البصمة.");
      return false;
    }
    if (!window.PublicKeyCredential || !navigator.credentials) {
      if (!silent) tst(S.lang === "en" ? "Biometrics not supported on this browser." : "هذا المتصفح لا يدعم البصمة / Face ID.");
      return false;
    }
    try {
      var challenge = crypto.getRandomValues(new Uint8Array(32));
      var cred = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { name: "IDC", id: location.hostname || "localhost" },
          user: {
            id: new TextEncoder().encode(String(currentUser.id).slice(0, 64)),
            name: currentUser.email || "idc-user",
            displayName: S.uname || currentUser.email || "IDC"
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
          timeout: 60000,
          attestation: "none"
        }
      });
      var wrapKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var payloadBytes = new TextEncoder().encode(JSON.stringify({
        v: Array.from(vaultKey),
        z: Array.from(vaultSalt),
        u: { id: currentUser.id, email: currentUser.email, user_metadata: currentUser.user_metadata || {} }
      }));
      var ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, wrapKey, payloadBytes));
      await saveOuterBioRecord({
        id: "default",
        credId: base64Url(new Uint8Array(cred.rawId)),
        wrapKey: wrapKey,
        iv: iv,
        ct: ct,
        email: currentUser.email
      });
      if (!silent) tst(S.lang === "en" ? "Outer Fingerprint / Face ID registered ✓" : "تم تسجيل البصمة / Face ID للدخول الخارجي بنجاح ✓");
      return true;
    } catch (e) {
      if (!silent) tst(S.lang === "en" ? "Biometric registration was cancelled." : "تم إلغاء تسجيل البصمة / Face ID.");
      return false;
    }
  };

  window.idcOuterBioUnlock = async function () {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      return setError(S.lang === "en" ? "Biometrics not supported on this browser." : "البصمة / Face ID غير مدعومة على هذا المتصفح.");
    }
    try {
      var rec = await loadOuterBioRecord("default");
      if (!rec || !rec.credId || !rec.wrapKey) {
        return setError(S.lang === "en" ? "Sign in once with your password (with 'Enable Biometrics' checked) to register your Fingerprint / Face ID first." : "ادخلي أول مرة بكلمة المرور (مع تفعيل خيار البصمة) عشان تتسجل بصمتك / Face ID على الجهاز ده.");
      }
      var challenge = crypto.getRandomValues(new Uint8Array(32));
      var assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          rpId: location.hostname || "localhost",
          allowCredentials: [{ type: "public-key", id: fromBase64Url(rec.credId), transports: ["internal"] }],
          userVerification: "required",
          timeout: 60000
        }
      });
      var authData = new Uint8Array(assertion.response.authenticatorData);
      if (!(authData[32] & 4)) throw new Error("uv_missing");
      var plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: rec.iv }, rec.wrapKey, rec.ct);
      var unwrapped = JSON.parse(new TextDecoder().decode(plainBuf));
      var restoredKey = new Uint8Array(unwrapped.v);
      var restoredSalt = new Uint8Array(unwrapped.z);
      var userObj = currentUser || unwrapped.u;

      var remoteRow = null;
      if (client && userObj && userObj.id) {
        try {
          var res = await client.from("idc_vaults").select("salt,ciphertext").eq("user_id", userObj.id).maybeSingle();
          if (!res.error && res.data) remoteRow = res.data;
        } catch (e) {}
      }
      var localRow = getLocalVault(userObj.email);
      var sourceRow = remoteRow || localRow;
      if (!sourceRow || !sourceRow.ciphertext) {
        return setError(S.lang === "en" ? "Please sign in with your email and password first." : "سجّلي الدخول بالبريد وكلمة المرور أول مرة.");
      }
      var vault = await window.IDCrypto.dec(sourceRow.ciphertext, restoredKey);
      if (!isSafeVault(vault)) throw new Error("invalid_vault");
      vaultKey = restoredKey;
      vaultSalt = restoredSalt;
      applyVaultToState(vault, userObj);
      err = "";
      go({ screen: "home", nav: "home" });
      tst(S.lang === "en" ? "Unlocked with Fingerprint / Face ID ✓" : "تم فتح التطبيق بالبصمة / Face ID ✓");
    } catch (e) {
      setError(S.lang === "en" ? "Biometric verification was cancelled or failed. Use your password or try again." : "لم تكتمل البصمة / Face ID. حاولي تاني أو ادخلي بكلمة المرور.");
    }
  };

  function lockMarkup() {
    var isEm = outerLockTab === "emerg";
    var body = isEm
      ? window.idcOuterEmergencyCardHtml()
      : ('<button class="bt o w" type="button" style="margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;border-color:var(--bl);color:var(--bl)" onclick="window.idcOuterBioUnlock()">' + mi("fingerprint") + ' فتح بالبصمة / Face ID</button>' +
        '<div class="f"><input id="unlockEmail" type="email" dir="ltr" value="' + esc(currentUser && currentUser.email || "") + '" placeholder=" "><label>البريد الإلكتروني</label></div>' +
        '<div class="f"><input id="unlockPassword" type="password" dir="ltr" placeholder=" "><label>كلمة المرور</label></div>' +
        '<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:12.5px;color:var(--mu)"><input type="checkbox" id="regOuterBio" checked> تسجيل / تحديث البصمة أو Face ID عند الفتح</label>' +
        '<div class="err">' + esc(err) + '</div><button class="bt w" onclick="window.idcUnlockVault()">فتح المحفظة المشفرة</button>' +
        '<button class="bt t w" style="margin-top:8px" onclick="window.idcSignOut()">تسجيل الخروج</button>');
    return '<div class="ac"><div class="wm">IDC</div><h2 style="text-align:center;font-size:22px;margin:14px 0">المحفظة مقفولة</h2><div class="mu" style="text-align:center">جلسة الدخول محفوظة. افتحي بالبصمة / Face ID أو استخدمي وضع الطوارئ.</div>' +
      window.idcOuterPartitionsBarHtml() +
      body +
      '</div>';
  }

  async function unlockWith(email, password) {
    if (!backendRequired()) return;
    if (!emailValid(email) || password.length < 6) return setError("أدخلي البريد وكلمة المرور الصحيحة.");
    var wantBio = Boolean(document.getElementById("regOuterBio") && document.getElementById("regOuterBio").checked);
    await window.doLoginWithValues(email, password);
    if (wantBio && currentUser && vaultKey) {
      window.idcOuterBioRegister(true);
    }
  }

  window.doLoginWithValues = async function (email, password) {
    var wait = throttleLeft();
    if (wait) return setError("محاولات كتير. جرّبي بعد " + wait + " ثانية.");
    var result;
    try {
      result = await client.auth.signInWithPassword({ email: email, password: password });
    } catch (e) {
      return setError("تعذر الاتصال. تحققي من الإنترنت وحاولي مرة أخرى.");
    }
    if (result.error || !result.data || !result.data.user) {
      throttleFail();
      return setError("تعذر فك المحفظة. تأكدي من البريد وكلمة المرور.");
    }
    try {
      await loadVault(password, result.data.user, false);
      err = "";
      throttleReset();
    } catch (e) {
      vaultKey = null;
      vaultSalt = null;
      throttleFail();
      setError("تعذر فك المحفظة. تأكدي من كلمة المرور الصحيحة.");
    }
  };

  window.idcUnlockVault = function () {
    return unlockWith(String(document.getElementById("unlockEmail").value || "").trim().toLowerCase(), document.getElementById("unlockPassword").value || "");
  };

  window.idcUnlockPrivate = function () {
    return unlockWith(String(document.getElementById("privateEmail").value || "").trim().toLowerCase(), document.getElementById("privatePassword").value || "");
  };

  window.psave = async function () {
    if (!currentUser || !vaultKey) return setError("سجّلي الدخول لفتح المحفظة قبل حفظ بياناتك.");
    var profile = {
      n: v("n"),
      nid: v("nid"),
      bd: v("bd"),
      ph: v("ph"),
      ct: v("ct"),
      role: v("rl") || "student"
    };
    if (!profile.n || profile.n.length > 100) {
      err = "اكتبي اسمًا صحيحًا لا يتجاوز 100 حرف.";
      var nameError = document.querySelector("#app .err");
      if (nameError) nameError.textContent = err;
      return;
    }

    S.p = profile;
    S.pOwner = currentUser.id;
    if (profile.nid && !S.items.some(function (item) { return item.type === "id"; })) {
      S.items = S.items.concat([mk("off", "public", "id", "بطاقة الهوية", profile.nid, "")]);
    }
    err = "";

    try {
      await persistVault();
    } catch (error) {
      // Local encrypted vault is already saved
    }

    S.screen = "home";
    S.nav = "home";
    err = "";
    R();
  };

  if (client) client.auth.onAuthStateChange(function (event, session) {
    if (event === "INITIAL_SESSION" && session && session.user && !currentUser) {
      restorePersistedSession().then(function (restored) {
        if (!restored) {
          currentUser = session.user;
          S.user = session.user.id;
          S.userEmail = session.user.email;
          S.uname = session.user.user_metadata && session.user.user_metadata.display_name || session.user.email;
          S.pOwner = session.user.id;
          S.preview = 0;
          un = false;
          pk = false;
          R();
        }
      });
    }
    if (event === "SIGNED_OUT" && currentUser) {
      vaultKey = null;
      vaultSalt = null;
      currentUser = null;
      S.user = null;
      S.userEmail = null;
      S.p = null;
      S.items = [];
      S.pv = null;
      S.em = null;
      un = false;
      pk = false;
      au = { m: "login", d: {} };
      S.screen = "auth";
      R();
    }
    if (event === "PASSWORD_RECOVERY") {
      recoveryPending = true;
      au = { m: "f3", d: {} };
      land = false;
      err = "";
      R();
    }
  });

  var renderApp = window.R;
  window.R = function () {
    if (client && currentUser && !vaultKey && !S.preview) {
      document.getElementById("app").innerHTML = lockMarkup();
      return;
    }
    renderApp();
  };

  restorePersistedSession().then(function () {
    R();
  });
})();
