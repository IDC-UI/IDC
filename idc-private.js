/* IDC private partition
   - Home shows two partitions: Emergency (open to anyone) and Private (locked)
   - Private data is sealed in its own AES-256-GCM blob; the key is derived from
     account password + second-email password + extra password (+ device fingerprint/Face ID gate)
   - Every open / failed attempt / lock is logged: when, how, where, device
   - Auto-lock: leaving the section, 60s idle, app in background
   Additive module: loads after idc-supabase.js and wraps existing functions. */
(function () {
  "use strict";

  var pvKey = null;          // Uint8Array while the private partition is open, else null
  var openedAt = 0, lastAct = Date.now();
  var busy = false, mode = "unlock", hideTimer = null, bioCache = null;
  var FAIL_KEY = "idc_pv_fail";
  var idleInterval = null;
  function startIdleWatch() {
    if (idleInterval) return;
    idleInterval = setInterval(function () {
      if (!pvKey) { clearInterval(idleInterval); idleInterval = null; return; }
      if (Date.now() - lastAct > 60000) lockNow("idle");
    }, 5000);
  }
  function stopIdleWatch() {
    if (idleInterval) { clearInterval(idleInterval); idleInterval = null; }
  }

  function L(ar, en) { return window.S && S.lang === "en" ? en : ar; }
  function b64(bytes) {
    var s = ""; bytes.forEach(function (x) { s += String.fromCharCode(x); });
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function ub64(s) {
    s = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); });
  }
  function raw(id) { var e = document.getElementById(id); return e ? e.value : ""; }
  function isPriv(i) { return i && i.level === "private"; }
  function real() {
    return Boolean(S.p && (S.preview || (S.user && (!window.IDCUnlockVault || window.IDCUnlockVault()))));
  }
  function maskEmail(e) { return String(e || "").replace(/^(.).*?(@.*)$/, "$1•••$2"); }
  function material(acc, e2, p2, p3) { return [acc, String(e2 || "").toLowerCase(), p2, p3].join("\u0001"); }

  /* ---------- failed-attempt lockout (per device) ---------- */
  function fails() { try { return JSON.parse(localStorage.getItem(FAIL_KEY)) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } }
  function setFails(o) { try { localStorage.setItem(FAIL_KEY, JSON.stringify(o)); } catch (e) {} }
  function lockLeft() { var f = fails(); return f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0; }
  function noteFail() {
    var f = fails(); f.n = (f.n || 0) + 1;
    var remaining = 5 - f.n;
    if (f.n >= 5) { f.until = Date.now() + 5 * 60 * 1000; f.n = 0; remaining = 0; }
    setFails(f); return remaining;
  }
  function fmtSec(s) { var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }

  /* ---------- access log: when / how / where / device ---------- */
  function devInfo() {
    var u = navigator.userAgent;
    var os = /Android/.test(u) ? "Android" : /iPhone|iPad|iPod/.test(u) ? "iOS" : /Windows/.test(u) ? "Windows" : /Mac/.test(u) ? "macOS" : /Linux/.test(u) ? "Linux" : "?";
    var br = /Edg\//.test(u) ? "Edge" : /OPR\//.test(u) ? "Opera" : /Chrome\//.test(u) ? "Chrome" : /Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : "?";
    var app = window.matchMedia && matchMedia("(display-mode: standalone)").matches;
    return os + " · " + br + " · " + (app ? L("تطبيق", "app") : L("متصفح", "browser"));
  }
  function getWhere() {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) return resolve(null);
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 4500);
      navigator.geolocation.getCurrentPosition(function (p) {
        if (done) return; done = true; clearTimeout(timer);
        resolve({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), acc: Math.round(p.coords.accuracy) });
      }, function () {
        if (done) return; done = true; clearTimeout(timer); resolve(null);
      }, { timeout: 4000, maximumAge: 60000 });
    });
  }
  function addLog(o) {
    var d = new Date();
    o.ts = d.toISOString();
    o.t = d.toLocaleString("ar-EG");
    o.dev = devInfo();
    S.log = [o].concat(Array.isArray(S.log) ? S.log : []).slice(0, 200);
    if (typeof sv === "function") sv();
  }

  /* ---------- fingerprint / Face ID (WebAuthn platform authenticator) ---------- */
  function rand(n) { return crypto.getRandomValues(new Uint8Array(n)); }
  async function bioAvail() {
    if (bioCache !== null) return bioCache;
    try {
      bioCache = !!(window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
    } catch (e) { bioCache = false; }
    return bioCache;
  }
  async function bioRegister() {
    var cred = await navigator.credentials.create({
      publicKey: {
        challenge: rand(32),
        rp: { name: "IDC", id: location.hostname || "localhost" },
        user: { id: new TextEncoder().encode(String(S.user || "idc").slice(0, 64)), name: S.userEmail || "idc", displayName: S.uname || "IDC" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60000, attestation: "none"
      }
    });
    return b64(new Uint8Array(cred.rawId));
  }
  async function bioGet(ids) {
    var challenge = rand(32);
    var cred = await navigator.credentials.get({
      publicKey: {
        challenge: challenge, rpId: location.hostname || "localhost",
        allowCredentials: ids.map(function (id) { return { type: "public-key", id: ub64(id), transports: ["internal"] }; }),
        userVerification: "required", timeout: 60000
      }
    });
    var data = new Uint8Array(cred.response.authenticatorData);
    var client = JSON.parse(new TextDecoder().decode(cred.response.clientDataJSON));
    if (!(data[32] & 4)) throw new Error("user verification missing");
    if (client.type !== "webauthn.get" || client.challenge !== b64(challenge)) throw new Error("challenge mismatch");
  }

  /* ---------- sealing / locking ---------- */
  async function seal() {
    if (!pvKey || !S.pv) return;
    var items = S.items.filter(isPriv);
    S.pv.ct = await window.IDCrypto.enc({ v: 1, items: items, at: Date.now() }, pvKey);
    S.pv.at = Date.now();
  }
  function publicItems(items) {
    if (!S.pv) return items;
    return items.filter(function (i) { return !isPriv(i); });
  }
  function reset() { pvKey = null; if (window.pk) pk = false; openedAt = 0; stopIdleWatch(); }
  function hardWipe() { S.items = S.items.filter(function (i) { return !isPriv(i); }); reset(); }

  function lockNow(reason) {
    if (!pvKey) return Promise.resolve();
    var key = pvKey, secs = Math.round((Date.now() - openedAt) / 1000);
    var items = S.items.filter(isPriv);
    var canSave = Boolean(S.p && S.pv && real());
    S.items = S.items.filter(function (i) { return !isPriv(i); });   // wipe plaintext immediately
    pvKey = null; pk = false; openedAt = 0; stopIdleWatch();
    var labels = {
      leave: L("خرجتِ من القسم الخاص", "Left the private section"),
      idle: L("قفل تلقائي بعد 60 ثانية خمول", "Auto-locked after 60s idle"),
      bg: L("التطبيق راح للخلفية", "App went to background"),
      manual: L("قفل يدوي", "Locked manually")
    };
    var p = Promise.resolve();
    if (canSave) {
      p = window.IDCrypto.enc({ v: 1, items: items, at: Date.now() }, key).then(function (ct) {
        S.pv.ct = ct;
        S.pv.at = Date.now();
      });
    }
    return p.catch(function () {
      tst(L("تم قفل القسم، لكن تعذّر حفظ آخر تعديل مشفّر.", "The section was locked, but the latest encrypted changes could not be saved."));
    }).then(function () {
      if (canSave) addLog({ ev: "lock", s: 1, how: labels[reason] || labels.leave, dur: secs });
      if (reason !== "leave") R();
    });
  }

  function inPrivate() {
    if (S.screen !== "home") return false;
    if (pg) {
      if (pg.k === "add") return pg.l === "private";
      if (pg.k === "edit") {
        var it = S.items.filter(function (x) { return x.id == pg.id; })[0];
        return Boolean(it && isPriv(it));
      }
      return false;
    }
    if (md && md.l === "private") return true;
    return S.nav === "wallet" && S.tab === "private";
  }

  /* ---------- UI helpers ---------- */
  function css() {
    if (document.getElementById("pv-css")) return;
    var s = document.createElement("style");
    s.id = "pv-css";
    s.textContent =
      ".pvg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 14px}" +
      ".pvc{border:1px solid var(--ln);background:var(--cd,var(--bg));border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:3px;cursor:pointer;min-height:136px;transition:transform .15s,border-color .15s;-webkit-tap-highlight-color:transparent}" +
      ".pvc:active{transform:scale(.98)}" +
      ".pvc:hover{border-color:var(--c)}" +
      ".pvc .pvi{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--c) 15%,transparent);color:var(--c);margin-bottom:8px}" +
      ".pvc b{font-weight:700;font-size:15px}" +
      ".pvc span{font-size:12px;color:var(--mu);line-height:1.55}" +
      ".pvc .pvs{margin-top:auto;padding-top:8px;font-style:normal;font-size:11.5px;font-weight:700;color:var(--c)}" +
      ".pvc.em{--c:#d4506a}.pvc.pr{--c:var(--bl)}.pvc.pr.open{--c:var(--gn)}" +
      ".pvbox{text-align:center;padding:22px 18px}" +
      ".pvbox h3{font-size:20px;font-weight:700;margin:8px 0 4px}" +
      ".pvbox .f{text-align:start}" +
      ".pvbox .pvhd{width:64px;height:64px;border-radius:20px;margin:0 auto;display:grid;place-items:center;background:color-mix(in srgb,var(--bl) 14%,transparent);color:var(--bl)}" +
      ".pvbox .pvm{font-size:13px;line-height:1.8;margin-top:4px}" +
      ".pvhint{font-size:12px;color:var(--mu);text-align:start;line-height:1.8;margin:10px 0 0;background:var(--sf);border-radius:12px;padding:10px 12px}" +
      ".pvbio{display:flex;align-items:center;gap:8px;justify-content:center;font-size:12.5px;margin-top:14px;color:var(--mu)}" +
      ".pvbio i{color:var(--gn)}" +
      ".pvban{display:flex;align-items:center;gap:12px;border:1px solid color-mix(in srgb,var(--gn) 40%,var(--ln));background:color-mix(in srgb,var(--gn) 8%,transparent);border-radius:16px;padding:12px 14px;margin-bottom:12px}" +
      ".pvban .g b{font-weight:700}.pvban .g div{font-size:12px;color:var(--mu)}" +
      ".pvlog{margin-top:6px}" +
      ".pvlog h4{margin:6px 0 4px;font-size:15px;font-weight:700}" +
      ".pvl{display:flex;gap:12px;padding:12px 0;border-top:1px solid var(--ln)}" +
      ".pvl:first-of-type{border-top:0}" +
      ".pvl .pvd{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;flex:none;background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c)}" +
      ".pvl .pvt{font-weight:700;font-size:13.5px}" +
      ".pvl .pvx{font-size:12px;color:var(--mu);line-height:1.75}" +
      ".pvl a{color:var(--bl);text-decoration:none}" +
      ".pvbtn2{background:none;border:0;color:var(--bl);font:inherit;font-size:13px;cursor:pointer;margin-top:12px;padding:6px}" +
      "#pvGo[disabled]{opacity:.55;cursor:wait}";
    document.head.appendChild(s);
  }

  function partitions() {
    var emReady = Boolean(S.em && Object.keys(S.em).some(function (k) { return S.em[k]; }));
    var status = !S.pv ? L("غير مفعّل · اضغطي للإعداد", "Not set up · tap to set up")
      : pvKey ? L("مفتوح الآن", "Open now") : L("مقفول · 3 باسوردات + بصمة / Face ID", "Locked · 3 passwords + biometrics");
    return '<div class="pvg">' +
      '<div class="pvc em" role="button" tabindex="0" onclick="IDCPrivate.openEmergency()"><div class="pvi">' + mi("emergency", 26) + '</div><b>' + L("الطوارئ", "Emergency") + '</b><span>' + L("بيانات تتفتح لأي حد حواليكِ لو حصل لكِ حاجة", "Opens for anyone nearby if something happens to you") + '</span><i class="pvs">' + (emReady ? L("بياناتك جاهزة ✓", "Your details are ready ✓") : L("أضيفي بيانات الطوارئ", "Add emergency details")) + '</i></div>' +
      '<div class="pvc pr' + (pvKey ? " open" : "") + '" role="button" tabindex="0" onclick="IDCPrivate.open()"><div class="pvi">' + mi(pvKey ? "lock_open" : "fingerprint", 26) + '</div><b>' + L("القسم الخاص", "Private Data") + '</b><span>' + L("بياناتك الخاصة، مقفولة بـ 3 باسوردات + البصمة / Face ID", "Your private data, behind 3 passwords + Fingerprint / Face ID") + '</span><i class="pvs">' + status + '</i></div>' +
      '</div>';
  }

  function showErr(msg) { var e = document.getElementById("pvErr"); if (e) e.textContent = msg || ""; }
  function setBusy(on_) {
    busy = on_;
    var b = document.getElementById("pvGo");
    if (b) { b.disabled = on_; b.textContent = on_ ? L("بيتم التحقق…", "Verifying…") : b.getAttribute("data-label"); }
  }
  function eyeBtn() {
    return '<button class="pvbtn2" type="button" onclick="IDCPrivate.eye()">' + L("إظهار / إخفاء الباسوردات", "Show / hide passwords") + "</button>";
  }
  function pw(id, label) { return fld(id, label, { t: "password", d: "ltr" }); }

  function setupView() {
    var bioLine = '<div class="pvbio" id="pvBio">' + mi("fingerprint", 20) + '<span>' + L("التحقق بالبصمة / Face ID مفعّل لحماية القسم الخاص", "Fingerprint / Face ID verification enabled for private data") + "</span></div>";
    return '<div class="cd pvbox"><div class="pvhd">' + mi("fingerprint", 34) + "</div>" +
      "<h3>" + L("فعّلي القسم الخاص", "Set up your private section") + "</h3>" +
      '<div class="mu pvm">' + L("القسم ده بيتقفل بـ 3 باسوردات (باسورد الجيميل اللي سجلتِ بيه + باسورد جيميل مختلف + باسورد إضافي) + بصمتك / Face ID. كل فتح بيتسجل (إمتى، فين، إزاي) وبيتقفل لوحده أول ما تخرجي منه.", "Locked with 3 passwords (your registered Gmail password + a different Gmail password + an extra password) + your Fingerprint / Face ID. Every unlock is logged (when, where, how) and it auto-locks when you leave.") + "</div>" +
      pw("pvA", L("باسورد الجيميل المسجل بيه في التطبيق", "Your registered account password")) +
      fld("pvE", L("جيميل مختلف (Second Gmail)", "Different Gmail address"), { t: "email", d: "ltr" }) +
      pw("pvB", L("باسورد الجيميل المختلف (6 حروف أو أرقام على الأقل)", "Second-Gmail password (at least 6 chars)")) + pw("pvB2", L("تأكيد باسورد الجيميل المختلف", "Confirm second-Gmail password")) +
      pw("pvC", L("الباسورد التاني الإضافي (6 حروف أو أرقام على الأقل)", "Extra password (at least 6 chars)")) + pw("pvC2", L("تأكيد الباسورد الإضافي", "Confirm extra password")) +
      eyeBtn() +
      '<div class="pvhint">' + L("• الثلاث باسوردات لازم يكونوا مختلفين عن بعض لتأمين الداتا.<br>• عند فتح القسم هيظهر سجل كامل (إمتى وفين وإزاي اتفتح)، وبمجرد خروجك من البارتيشن هيتقفل تاني تلقائيًا.", "• All three passwords must be distinct to secure your data.<br>• Opening the section records when, where, and how it was accessed, and leaving the partition locks it automatically.") + "</div>" +
      bioLine + '<div class="err" id="pvErr"></div>' +
      '<button class="bt w" id="pvGo" data-label="' + L("تسجيل البصمة وتفعيل القسم الخاص", "Register Fingerprint & Enable Private Section") + '" onclick="IDCPrivate.setup()">' + L("تسجيل البصمة وتفعيل القسم الخاص", "Register Fingerprint & Enable Private Section") + "</button></div>";
  }

  function unlockView() {
    var left = lockLeft(), nd = mode === "newdev";
    var label = nd ? L("تسجيل بصمة الجهاز ده وفتح", "Register this device & open") : L("تحقق بالبصمة وفتح القسم الخاص", "Verify Fingerprint & Open");
    var bioLine = '<div class="pvbio" id="pvBio">' + mi("fingerprint", 20) + "<span>" +
      (nd ? L("هيطلب بصمتك / Face ID عشان يسجّل الجهاز ده.", "Will ask for fingerprint / Face ID to register this device.")
        : L("يتطلب إدخال الـ 3 باسوردات + البصمة / Face ID لفتح البيانات المؤمّنة.", "Requires the 3 passwords + Fingerprint / Face ID to unlock.")) + "</span></div>";
    var lockMsg = left ? '<div class="nt" style="color:var(--rd)">' + L("محاولات غلط كتير. القسم مقفول مؤقتًا، جرّبي بعد ", "Too many wrong attempts. Locked for ") + "<b dir=\"ltr\">" + fmtSec(left) + "</b></div>" : "";
    return '<div class="cd pvbox"><div class="pvhd">' + mi("lock", 34) + "</div>" +
      "<h3>" + L("القسم الخاص مقفول", "Private section is locked") + "</h3>" +
      '<div class="mu pvm">' + L("اكتبي الباسوردات التلاتة + البصمة. الجيميل المختلف المسجّل: ", "Enter the three passwords + Fingerprint. Second Gmail: ") + '<span dir="ltr">' + esc(maskEmail(S.pv.e2)) + "</span></div>" +
      lockMsg +
      pw("pvA", L("باسورد الجيميل اللي سجلتِ بيه", "Registered account password")) +
      pw("pvB", L("باسورد الجيميل المختلف", "Different Gmail password")) +
      pw("pvC", L("الباسورد التاني الإضافي", "Extra password")) +
      eyeBtn() + bioLine + '<div class="err" id="pvErr"></div>' +
      '<button class="bt w" id="pvGo" data-label="' + label + '" onclick="IDCPrivate.unlock(' + (nd ? "true" : "false") + ')"' + (left ? " disabled" : "") + ">" + label + "</button>" +
      '<button class="pvbtn2" onclick="IDCPrivate.setMode(\'' + (nd ? "unlock" : "newdev") + '\')">' + (nd ? L("رجوع", "Back") : L("أول مرة على الجهاز ده؟ سجّلي بصمته", "First time on this device? Register its fingerprint")) + "</button></div>";
  }

  function whenText(ts) {
    try { return new Date(ts).toLocaleString(S.lang === "en" ? "en-GB" : "ar-EG", { dateStyle: "medium", timeStyle: "short" }); }
    catch (e) { return ts; }
  }
  function logHTML() {
    var rows = (S.log || []).filter(function (l) { return l && l.ev; }).slice(0, 15);
    if (!rows.length) return '<div class="cd pvlog"><h4>' + L("سجل الدخول (إمتى · فين · إزاي)", "Access log (When · Where · How)") + '</h4><div class="mu">' + L("لسه مفيش عمليات مسجلة", "No entries yet") + "</div></div>";
    return '<div class="cd pvlog"><h4>' + L("سجل الدخول (إمتى · فين · إزاي)", "Access log (When · Where · How)") + "</h4>" + rows.map(function (l) {
      var icon = l.ev === "open" ? "lock_open" : l.ev === "lock" ? "lock" : "gpp_maybe";
      var color = l.ev === "open" ? "var(--gn)" : l.ev === "lock" ? "var(--bl)" : "#d4506a";
      var title = l.ev === "open" ? L("فتح القسم الخاص", "Opened Private Section") : l.ev === "lock" ? L("تم قفل القسم تلقائيًا", "Section Locked") : L("محاولة فتح فاشلة", "Failed attempt");
      var where = l.where ? '<a dir="ltr" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + encodeURIComponent(l.where.lat + "," + l.where.lon) + '">' + l.where.lat + ", " + l.where.lon + (l.where.acc ? " (±" + l.where.acc + L(" م", " m") + ")" : "") + "</a>"
        : L("على هذا الجهاز (إحداثيات GPS غير متاحة)", "On this device (GPS coordinates not granted)");
      return '<div class="pvl" style="--c:' + color + '"><div class="pvd">' + mi(icon, 20) + '</div><div class="g"><div class="pvt">' + title + "</div><div class=\"pvx\">" +
        "<b>" + L("إمتى: ", "When: ") + "</b>" + esc(whenText(l.ts)) + (l.dur != null ? L(" (فضل مفتوح ", " (stayed open ") + l.dur + L(" ثانية)", "s)") : "") + "<br>" +
        "<b>" + L("فين: ", "Where: ") + "</b>" + where + "<br>" +
        "<b>" + L("إزاي: ", "How: ") + "</b>" + esc(l.how || "") + " · " + esc(l.dev || "") + "</div></div></div>";
    }).join("") + "</div>";
  }

  function openView() {
    return '<div class="pvban"><div style="color:var(--gn)">' + mi("verified_user", 30) + '</div><div class="g"><b>' + L("القسم الخاص مفتوح الآن", "Private section is open") + "</b><div>" + L("أول ما تطلعي من البارتيشن ده هيتقفل تاني تلقائيًا لتأمين بياناتك.", "As soon as you leave this partition, it locks again automatically.") + '</div></div><button class="bt o" style="height:36px;padding:0 14px" onclick="IDCPrivate.lock()">' + L("قفل الآن", "Lock now") + "</button></div>" +
      addb("on", "private") + list("on", "private") + logHTML();
  }

  /* ---------- flows ---------- */
  async function verifyAccountPw(a) {
    if (S.preview) return a.length >= 4;
    if (typeof window.IDCVerifyAccountPassword === "function") {
      var ok = await window.IDCVerifyAccountPassword(a);
      if (ok) return true;
    }
    if (window.IDCSupabase && S.userEmail) {
      try {
        var signin = await window.IDCSupabase.auth.signInWithPassword({ email: S.userEmail, password: a });
        if (!signin.error) return true;
      } catch (e) {}
    }
    return false;
  }

  async function doSetup() {
    if (busy) return;
    var a = raw("pvA"), e2 = raw("pvE").trim().toLowerCase(), b = raw("pvB"), b2 = raw("pvB2"), c = raw("pvC"), c2 = raw("pvC2");
    if (!a || !e2 || !b || !c) return showErr(L("املي كل الخانات المطلوبة.", "Fill in every field."));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e2) || e2 === String(S.userEmail || "").toLowerCase()) {
      return showErr(L("اكتبي جيميل تاني مختلف عن الجيميل اللي سجلتِ بيه.", "Enter a second email address different from your account email."));
    }
    if (b.length < 6 || c.length < 6) return showErr(L("كل باسورد لازم يكون 6 حروف أو أرقام على الأقل.", "Each password needs at least 6 characters."));
    if (b !== b2 || c !== c2) return showErr(L("تأكيد الباسورد غير متطابق.", "Confirmation does not match."));
    if (a === b || a === c || b === c) return showErr(L("التلات باسوردات لازم يكونوا مختلفين عن بعض.", "The three passwords must be different."));

    setBusy(true); showErr("");
    var ids = [];
    try {
      var accOk = await verifyAccountPw(a);
      if (!accOk) {
        setBusy(false);
        return showErr(L("باسورد الحساب (الجيميل الأساسي) غير صحيح.", "Account password is wrong."));
      }

      if (await bioAvail()) {
        try { ids = [await bioRegister()]; }
        catch (e) {
          setBusy(false);
          return showErr(L("تم إلغاء البصمة / Face ID. كمّلي التحقق بالبصمة لتفعيل القسم الخاص.", "Fingerprint / Face ID was cancelled. Please complete it to enable the private section."));
        }
      }

      var salt = crypto.getRandomValues(new Uint8Array(16));
      var key = await window.IDCrypto.fromPass(material(a, e2, b, c), salt);
      var existing = S.items.filter(isPriv);
      var ct = await window.IDCrypto.enc({ v: 1, items: existing, at: Date.now() }, key);
      S.pv = { v: 1, salt: b64(salt), ct: ct, e2: e2, bio: ids, at: Date.now() };
      pvKey = key; pk = true; openedAt = Date.now(); lastAct = Date.now(); startIdleWatch();
      if (window.IDCPersist) {
        try { await window.IDCPersist(); } catch (e) {}
      } else if (typeof sv === "function") {
        sv();
      }
      var where = await getWhere();
      addLog({
        ev: "open",
        s: 1,
        how: L("تفعيل وفتح القسم الخاص (3 باسوردات + بصمة/Face ID)", "Private section set up & opened (3 passwords + Fingerprint/Face ID)"),
        where: where
      });
      setBusy(false); R();
      tst(L("تم تفعيل القسم الخاص وتأمينه بنجاح", "Private section enabled & secured"));
    } catch (e) {
      pvKey = null; pk = false; setBusy(false);
      showErr(L("حصلت مشكلة أثناء التفعيل. حاولي تاني.", "Something went wrong. Try again."));
    }
  }

  async function core(addDev, a, b, c) {
    var key, blob;
    try {
      key = await window.IDCrypto.fromPass(material(a, S.pv.e2, b, c), ub64(S.pv.salt));
      blob = await window.IDCrypto.dec(S.pv.ct, key);
      if (!blob || !Array.isArray(blob.items)) return { ok: false, reason: "pw" };
    } catch (e) {
      return { ok: false, reason: "pw" };
    }

    var ids = S.pv.bio || [], newId = null, usedBio = false;
    if (await bioAvail()) {
      try {
        if (addDev || !ids.length) {
          newId = await bioRegister();
        } else {
          try {
            await bioGet(ids);
          } catch (getErr) {
            newId = await bioRegister();
          }
        }
        usedBio = true;
      } catch (e) {
        return { ok: false, reason: "bio" };
      }
    }
    return { ok: true, key: key, blob: blob, newId: newId, usedBio: usedBio };
  }

  async function doUnlock(addDev) {
    if (busy) return;
    var left = lockLeft();
    if (left) return showErr(L("القسم مقفول مؤقتًا، جرّبي بعد ", "Temporarily locked, try in ") + fmtSec(left));
    var a = raw("pvA"), b = raw("pvB"), c = raw("pvC");
    if (!a || !b || !c) return showErr(L("اكتبي الباسوردات التلاتة.", "Enter all three passwords."));
    setBusy(true); showErr("");
    var wherePromise = getWhere();           // starts the location prompt in parallel
    var res = await core(addDev, a, b, c);
    var where = await wherePromise;
    if (!res.ok) {
      var msg, remaining = null;
      if (res.reason === "pw") remaining = noteFail();
      if (res.reason === "bio") msg = L("البصمة / Face ID اتلغت. لازم تأكدي البصمة عشان يفتح.", "Fingerprint / Face ID was cancelled. Biometric verification is required.");
      else msg = L("واحد من الباسوردات التلاتة غلط.", "One of the three passwords is wrong.") + (remaining > 0 ? L(" فاضل " + remaining + " محاولات.", " " + remaining + " attempts left.") : "");
      addLog({ ev: "fail", s: 0, how: res.reason === "pw" ? L("فشل: كلمة مرور غير صحيحة", "Failed: wrong password") : L("فشل: لم تكتمل البصمة / Face ID", "Failed: biometrics cancelled"), where: where });
      setBusy(false);
      if (res.reason === "pw" && remaining === 0) return R();   // lockout started
      return showErr(msg);
    }
    S.items = S.items.filter(function (i) { return !isPriv(i); }).concat(res.blob.items.map(function (i) { i.level = "private"; return i; }));
    if (res.newId) S.pv.bio = (S.pv.bio || []).concat([res.newId]);
    pvKey = res.key; pk = true; openedAt = Date.now(); lastAct = Date.now(); mode = "unlock"; setFails({ n: 0, until: 0 }); startIdleWatch();
    var how = L("3 باسوردات + بصمة/Face ID", "3 passwords + Fingerprint/Face ID");
    if (res.newId) how += L(" · تسجيل بصمة الجهاز", " · device biometric registered");
    addLog({ ev: "open", s: 1, how: how, where: where });
    setBusy(false); R();
  }

  /* ---------- wiring ---------- */
  var baseGo = window.go;
  window.go = function (o) {
    if (pvKey && o) {
      var nextNav = o.nav !== undefined ? o.nav : S.nav;
      var nextTab = o.tab !== undefined ? o.tab : S.tab;
      var nextScreen = o.screen !== undefined ? o.screen : S.screen;
      if (nextScreen !== "home" || nextNav !== "wallet" || nextTab !== "private") {
        lockNow("leave");
      }
    }
    return baseGo(o);
  };

  var baseHome = window.hHome;
  window.hHome = function () {
    var html = baseHome();
    if (!real()) return html;
    var marker = '<div class="cd it" style="cursor:pointer;margin-top:12px;--c:var(--rd)"';   // old standalone emergency card
    var at = html.indexOf(marker);
    if (at > -1) { var end = html.indexOf("</div></div></div>", at); if (end > -1) html = html.slice(0, at) + html.slice(end + 18); }
    var cut = html.indexOf("</div></div>");
    return cut > -1 ? html.slice(0, cut + 12) + partitions() + html.slice(cut + 12) : partitions() + html;
  };

  var baseWallet = window.hWallet;
  window.hWallet = function () {
    if (!real() || !on() || S.tab !== "private") return baseWallet();
    var tabs = '<div class="tabs">' + [["public", "عامة"], ["private", "خاصة"], ["secret", "سرية"]].map(function (x) {
      return '<button class="' + (S.tab === x[0] ? "on" : "") + '" onclick="go({tab:\'' + x[0] + '\'})">' + x[1] + "</button>";
    }).join("") + "</div>";
    return '<h2 style="font-size:24px;font-weight:700;margin-bottom:12px">محفظتي</h2>' + tabs + (pvKey ? openView() : (S.pv ? unlockView() : setupView()));
  };

  var baseRender = window.R;
  window.R = function () {
    if (pvKey) {
      if (!real()) hardWipe();
      else if (!inPrivate()) lockNow("leave");
    }
    baseRender();
    if (document.getElementById("pvBio")) bioAvail().then(function (ok) {
      var e = document.getElementById("pvBio");
      if (!e || S.pv) return;
      e.innerHTML = mi("fingerprint", 20) + "<span>" + (ok ? L("هيتسجّل بصمتك / Face ID لما تدوسي تفعيل.", "Your fingerprint / Face ID will be registered when you tap Turn on.")
        : L("التحقق بالبصمة / Face ID + الـ 3 باسوردات مفعّل لحماية القسم الخاص.", "Biometric + 3-password protection enabled for Private section.")) + "</span>";
    });
  };

  document.addEventListener("visibilitychange", function () {
    clearTimeout(hideTimer);
    if (document.visibilityState === "hidden" && pvKey) hideTimer = setTimeout(function () { lockNow("bg"); }, 15000);
  });
  window.addEventListener("pagehide", function () { if (pvKey) { hardWipe(); } });
  ["pointerdown", "keydown", "touchstart", "scroll"].forEach(function (ev) {
    document.addEventListener(ev, function () { if (pvKey) lastAct = Date.now(); }, { passive: true, capture: true });
  });

  window.IDCPrivate = {
    publicItems: publicItems,
    seal: seal,
    reset: reset,
    setup: doSetup,
    unlock: doUnlock,
    lock: function () { lockNow("manual"); },
    open: function () { pg = null; dr = false; go({ nav: "wallet", tab: "private" }); },
    openEmergency: function () { pg = { k: "emerg" }; R(); },
    setMode: function (m) { mode = m; R(); },
    eye: function () {
      ["pvA", "pvB", "pvB2", "pvC", "pvC2"].forEach(function (id) {
        var e = document.getElementById(id); if (e) e.type = e.type === "password" ? "text" : "password";
      });
    },
    isOpen: function () { return Boolean(pvKey); }
  };

  css();
  R();
})();

