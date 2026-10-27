(function () {
  "use strict";

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
  var idleLockTimer = null;
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
      var message = S.lang === "en"
        ? "Vault content is encrypted on this device before storage. Authenticated access depends on deploying the SQL migration and both Edge Functions. SMS and two-factor authentication are not enabled."
        : "محتوى المحفظة يُشفّر على هذا الجهاز قبل التخزين. حماية الخادم تتطلب تطبيق migration ونشر وظيفتي Edge. SMS والتحقق بخطوتين غير مفعّلين.";
      return '<h2 style="font-size:24px;font-weight:700;margin-bottom:12px">' + (S.lang === "en" ? "Security status" : "حالة الأمان") + '</h2><div class="nt" style="line-height:1.9">' + esc(message) + '</div>';
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
    var base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return Uint8Array.from(atob(base64), function (character) { return character.charCodeAt(0); });
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
    if (/password should be at least/i.test(message)) return "كلمة المرور أقصر من الحد المطلوب في إعدادات Supabase.";
    return "تعذر إكمال الطلب. راجعي إعداد Supabase وحاولي مرة أخرى.";
  }

  function isSafeVault(value) {
    if (!value || typeof value !== "object" || (value.p !== null && typeof value.p !== "object") || !Array.isArray(value.items)) return false;
    if (value.items.length > 1000) return false;
    return value.items.every(function (item) {
      return item && typeof item === "object" &&
        typeof item.title === "string" && item.title.length <= 200 &&
        typeof item.value === "string" && item.value.length <= 10000;
    });
  }

  function vaultSnapshot() {
    return {
      p: S.p,
      items: S.items,
      sec: S.sec,
      log: S.log,
      em: S.em || null,
      tab: S.tab,
      nav: S.nav,
      otab: S.otab
    };
  }

  function persistVault() {
    if (!client || !currentUser || !vaultKey || !S.p || S.preview) return Promise.resolve();
    var snapshot = vaultSnapshot();
    if (!isSafeVault(snapshot)) return Promise.reject(new Error("Invalid vault data"));
    var serialized = JSON.stringify(snapshot);
    if (serialized.length > 5900000) return Promise.reject(new Error("Vault data is too large"));

    saveQueue = saveQueue.catch(function () {}).then(async function () {
      var ciphertext = await window.IDCrypto.enc(snapshot, vaultKey);
      var result = await client.functions.invoke("secure-vault", {
        body: { salt: base64Url(vaultSalt), ciphertext: ciphertext }
      });
      if (result.error || !result.data || result.data.saved !== true) throw result.error || new Error("Vault save failed");
    });
    return saveQueue;
  }

  window.sv = function () {
    if (!S.preview) {
      if (!client) return;
      if (currentUser && vaultKey) persistVault().catch(function () {
        tst("تعذر حفظ البيانات المشفرة؛ تحققي من الاتصال ثم أعيدي المحاولة.");
      });
      return;
    }
    localSave();
  };

  async function loadVault(password, user) {
    var result = await client.from("idc_vaults")
      .select("salt,ciphertext")
      .eq("user_id", user.id)
      .maybeSingle();
    if (result.error) throw result.error;

    var vault;
    if (result.data) {
      vaultSalt = fromBase64Url(result.data.salt);
      vaultKey = await window.IDCrypto.fromPass(password, vaultSalt);
      vault = await window.IDCrypto.dec(result.data.ciphertext, vaultKey);
      if (!isSafeVault(vault)) throw new Error("Encrypted vault format is invalid");
    } else {
      vaultSalt = crypto.getRandomValues(new Uint8Array(16));
      vaultKey = await window.IDCrypto.fromPass(password, vaultSalt);
      vault = { p: null, items: [], sec: S.sec, log: [], em: null, tab: "public", nav: "home", otab: "data" };
    }

    currentUser = user;
    S.preview = 0;
    S.user = user.id;
    S.userEmail = user.email;
    S.uname = user.user_metadata && user.user_metadata.display_name || user.email;
    S.pOwner = user.id;
    S.p = vault.p;
    S.items = vault.items;
    S.sec = vault.sec || S.sec;
    S.log = vault.log || [];
    S.em = vault.em || null;
    S.tab = vault.tab || "public";
    S.nav = vault.nav || "home";
    S.otab = vault.otab || "data";
    S.pin = null;
    S.vpw = null;
    un = true;
    pk = true;

    if (!result.data) await persistVault();
    go({ screen: S.p ? "home" : "profile", nav: "home" });
    resetIdleLock();
  }

  window.doSu = async function () {
    if (!backendRequired()) return;
    var name = v("nm");
    var email = v("em").toLowerCase();
    var password = v("pw");
    if (!name || name.length > 100 || !emailValid(email)) return setError("اكتبي اسمًا وبريدًا إلكترونيًا صحيحًا.");
    if (password.length < 12) return setError("اختاري كلمة مرور من 12 حرفًا على الأقل لحماية التشفير.");
    if (password !== v("pw2")) return setError("كلمتا المرور غير متطابقتين.");

    err = "";
    var result = await client.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { display_name: name },
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    if (result.error) return setError(appError(result.error));
    au.d = { em: email, nm: name };
    A("su2");
  };

  window.doLogin = async function () {
    if (!backendRequired()) return;
    var email = v("lg").toLowerCase();
    var password = v("lp");
    if (!emailValid(email) || !password) return setError("اكتبي بريدًا صحيحًا وكلمة المرور.");

    var result = await client.auth.signInWithPassword({ email: email, password: password });
    if (result.error) return setError(appError(result.error));
    if (!result.data.user || !result.data.user.email_confirmed_at) {
      await client.auth.signOut();
      return setError("أكدي بريدك الإلكتروني من الرابط المرسل قبل تسجيل الدخول.");
    }

    try {
      await loadVault(password, result.data.user);
    } catch (error) {
      vaultKey = null;
      currentUser = null;
      await client.auth.signOut();
      setError(appError(error));
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
    if (password.length < 12) return setError("اختاري كلمة مرور من 12 حرفًا على الأقل.");
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
    await loadVault(password, update.data.user || userResult.data.user);
    tst("تم تحديث كلمة المرور وفتح المحفظة المشفرة.");
  };

  window.resend = async function () {
    if (!backendRequired() || !au.d.em) return;
    var result = await client.auth.resend({ type: "signup", email: au.d.em });
    if (result.error) return setError(appError(result.error));
    tst("تم طلب إعادة إرسال رابط التأكيد.");
  };

  window.idcSignOut = async function () {
    if (client) await client.auth.signOut();
    clearTimeout(idleLockTimer);
    currentUser = null;
    vaultKey = null;
    vaultSalt = null;
    S.user = null;
    S.userEmail = null;
    S.p = null;
    S.items = [];
    S.em = null;
    S.pOwner = null;
    S.pin = null;
    S.vpw = null;
    S.preview = 0;
    un = false;
    pk = false;
    au = { m: "login", d: {} };
    go({ screen: "auth" });
  };

  function dataUrlBytes(dataUrl) {
    var parts = dataUrl.split(",");
    var binary = atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

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

    var id = crypto.randomUUID();
    var form = new FormData();
    form.append("file", new Blob([envelope], { type: "application/octet-stream" }), id + ".enc");
    var response = await client.functions.invoke("secure-upload", { body: form });
    if (response.error || !response.data || typeof response.data.path !== "string") {
      throw new Error("تعذر رفع الملف المشفر. تأكدي من نشر secure-upload.");
    }
    return {
      n: file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180),
      t: file.type === "application/pdf" ? "pdf" : "img",
      path: response.data.path,
      mime: file.type,
      size: file.size,
      encrypted: true
    };
  }

  window.pickAtt = async function (input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (S.preview) return localPickAtt(input);
    if (!client) {
      input.value = "";
      return tst("أضيفي إعداد Supabase قبل حفظ أي ملفات حقيقية.");
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

  function lockMarkup() {
    return '<div class="ac"><div class="wm">IDC</div><h2 style="text-align:center;font-size:22px;margin:14px 0">المحفظة مقفولة</h2><div class="mu" style="text-align:center">أعيدي تسجيل الدخول لفك تشفير بياناتك على هذا الجهاز.</div>' +
      '<div class="f"><input id="unlockEmail" type="email" dir="ltr" value="' + esc(currentUser && currentUser.email || "") + '" placeholder=" "><label>البريد الإلكتروني</label></div>' +
      '<div class="f"><input id="unlockPassword" type="password" dir="ltr" placeholder=" "><label>كلمة المرور</label></div>' +
      '<div class="err">' + esc(err) + '</div><button class="bt w" onclick="window.idcUnlockVault()">فتح المحفظة المشفرة</button>' +
      '<button class="bt t w" style="margin-top:8px" onclick="window.idcSignOut()">تسجيل الخروج</button></div>';
  }

  async function unlockWith(email, password) {
    if (!backendRequired()) return;
    if (!emailValid(email) || password.length < 12) return setError("أدخلي البريد وكلمة المرور الصحيحة.");
    var result = await client.auth.signInWithPassword({ email: email, password: password });
    if (result.error) return setError(appError(result.error));
    try {
      await loadVault(password, result.data.user);
      err = "";
      resetIdleLock();
    } catch (error) {
      vaultKey = null;
      currentUser = null;
      await client.auth.signOut();
      setError("تعذر فك المحفظة. تأكدي من كلمة المرور القديمة؛ لا يمكن استعادة مفتاح E2E بدونها.");
    }
  }

  window.idcUnlockVault = function () {
    return unlockWith(String(document.getElementById("unlockEmail").value || "").trim().toLowerCase(), document.getElementById("unlockPassword").value || "");
  };

  window.idcUnlockPrivate = function () {
    return unlockWith(String(document.getElementById("privateEmail").value || "").trim().toLowerCase(), document.getElementById("privatePassword").value || "");
  };

  window.gate = function () {
    if (!currentUser) return '<div class="nt">سجّلي الدخول لفتح البيانات الخاصة.</div>';
    return '<div class="cd" style="text-align:center"><div style="color:var(--bl)">' + mi("lock", 40) + '</div><h3 style="font-size:20px;margin:6px 0">المحفظة الخاصة مقفولة</h3><div class="mu">أعيدي إدخال كلمة مرور حسابك لفك تشفير بياناتك.</div><div class="f"><input id="privateEmail" type="email" dir="ltr" value="' + esc(currentUser.email || "") + '" placeholder=" "><label>البريد الإلكتروني</label></div><div class="f"><input id="privatePassword" type="password" dir="ltr" placeholder=" "><label>كلمة المرور</label></div><div class="err">' + esc(err) + '</div><button class="bt w" onclick="window.idcUnlockPrivate()">فتح القسم الخاص</button></div>';
  };

  function resetIdleLock() {
    clearTimeout(idleLockTimer);
    if (!currentUser || !vaultKey) return;
    idleLockTimer = setTimeout(function () {
      vaultKey = null;
      vaultSalt = null;
      pk = false;
      S.p = null;
      S.items = [];
      S.em = null;
      R();
    }, 120000);
  }

  document.addEventListener("click", resetIdleLock);
  if (client) client.auth.onAuthStateChange(function (event) {
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

  if (!client && typeof window.lnd === "function") {
    var renderLanding = window.lnd;
    window.lnd = function () {
      var notice = S.lang === "en"
        ? "Supabase is not configured yet. Sign-up and login stay disabled until a project URL and public key are added."
        : "Supabase غير مُعدّ بعد. التسجيل والدخول متوقفان حتى إضافة رابط المشروع والمفتاح العام.";
      var html = renderLanding();
      if (S.lang !== "en") {
        [
          ["بحساب Supabase ورابط تأكيد البريد الإلكتروني.", "التسجيل يتوقف حتى إعداد مشروع Supabase."],
          ["تأكيد البريد الإلكتروني بواسطة Supabase", "لا يوجد تسجيل دخول فعلي قبل إعداد Supabase"],
          ["تشفير بيانات المحفظة على جهازك قبل التخزين", "لا تحفظي بيانات حقيقية قبل إعداد Supabase"],
          ["تُحفظ بياناتك مشفرة، والوصول إليها يتطلب تسجيل الدخول.", "لا تضيفي بيانات حساسة قبل إعداد Backend"],
          ["المحفظة مشفرة قبل التخزين، وصلاحيات كل حساب يفرضها Supabase.", "Backend غير متصل؛ بيانات المعاينة فقط متاحة."],
          ["استعادة كلمة المرور تتم برابط يُرسل إلى البريد المسجل.", "استعادة الحساب غير متاحة قبل إعداد Supabase."]
        ].forEach(function (pair) { html = html.replace(pair[0], pair[1]); });
      } else {
        html = html.replace("Your data is encrypted on your device before storage", "Data storage is disabled until Supabase is configured");
      }
      return html.replace('<div class="sx">', '<div class="sx"><div class="nt" style="color:var(--rd)">' + esc(notice) + '</div>');
    };
  }

  R();
})();
