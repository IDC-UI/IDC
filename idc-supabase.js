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
      var message = S.lang === "en"
        ? "Vault content is encrypted on this device before storage (AES-256-GCM). Your Emergency partition is accessible when needed, while your Private partition is sealed with 3 passwords + Fingerprint / Face ID and auto-locks on exit."
        : "محتوى المحفظة مشفّر على جهازك بمعيار AES-256-GCM. قسم الطوارئ متاح عند الحاجة بدون باسورد، بينما القسم الخاص محمي بـ 3 كلمات مرور + البصمة / Face ID ويُقفل تلقائيًا بمجرد الخروج منه.";
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

  function saveActiveSession(user, keyBytes, saltBytes) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata || {}
        },
        k: base64Url(keyBytes),
        s: base64Url(saltBytes),
        at: Date.now()
      }));
    } catch (e) {}
  }

  function clearActiveSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function getActiveSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
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
      return item && typeof item === "object" &&
        typeof item.title === "string" && item.title.length <= 200 &&
        typeof item.value === "string" && item.value.length <= 10000;
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

  function persistVault() {
    if (!currentUser || !vaultKey || !vaultSalt || S.preview) return Promise.resolve();

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
            if (result.error || !result.data || result.data.saved !== true) {
              await client.from("idc_vaults").upsert({
                user_id: currentUser.id,
                salt: saltStr,
                ciphertext: ciphertext,
                updated_at: new Date().toISOString()
              }, { onConflict: "user_id" });
            }
          }
        } catch (remoteErr) {
          // Local encrypted copy is already saved above
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

  function applyVaultToState(vault, user) {
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
    var remoteRow = null;
    if (client && !String(user.id).startsWith("local_")) {
      try {
        var result = await client.from("idc_vaults")
          .select("salt,ciphertext")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!result.error && result.data) remoteRow = result.data;
      } catch (e) {}
    }

    var localRow = getLocalVault(user.email);
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
    saveActiveSession(currentUser, vaultKey, vaultSalt);
    await persistVault();
    go({ screen: needsProfileSetup ? "profile" : "home", nav: "home" });
  }

  async function restorePersistedSession() {
    var saved = getActiveSession();
    if (!saved || !saved.user || !saved.k || !saved.s) return false;
    try {
      var keyBytes = fromBase64Url(saved.k);
      var saltBytes = fromBase64Url(saved.s);
      var user = saved.user;
      var localRow = getLocalVault(user.email);
      if (localRow && localRow.ciphertext) {
        var vault = await window.IDCrypto.dec(localRow.ciphertext, keyBytes);
        if (isSafeVault(vault)) {
          vaultKey = keyBytes;
          vaultSalt = saltBytes;
          applyVaultToState(vault, user);
          S.screen = "home";
          S.nav = "home";
          R();
        }
      }
      if (client && !String(user.id).startsWith("local_")) {
        var result = await client.from("idc_vaults")
          .select("salt,ciphertext")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!result.error && result.data) {
          var rSalt = fromBase64Url(result.data.salt);
          var rVault = await window.IDCrypto.dec(result.data.ciphertext, keyBytes);
          if (isSafeVault(rVault)) {
            vaultKey = keyBytes;
            vaultSalt = rSalt;
            var keepLocalPv = S.pv && (!rVault.pv || (S.pv.at && rVault.pv.at && S.pv.at > rVault.pv.at));
            if (keepLocalPv) rVault.pv = S.pv;
            applyVaultToState(rVault, user);
            saveActiveSession(currentUser, vaultKey, vaultSalt);
            setLocalVault(user.email, {
              user_id: user.id,
              email: user.email,
              name: S.uname,
              salt: result.data.salt,
              ciphertext: result.data.ciphertext,
              updated_at: new Date().toISOString()
            });
            S.screen = "home";
            R();
          }
        }
      }
      return Boolean(currentUser && vaultKey);
    } catch (e) {
      return false;
    }
  }

  window.doSu = async function () {
    var name = v("nm");
    var email = v("em").toLowerCase();
    var password = v("pw");
    if (!name || name.length > 100 || !emailValid(email)) return setError("اكتبي اسمًا وبريدًا إلكترونيًا صحيحًا.");
    if (password.length < 8) return setError("اختاري كلمة مرور من 8 حروف أو أرقام على الأقل.");
    if (password !== v("pw2")) return setError("كلمتا المرور غير متطابقتين.");

    var existingLocal = getLocalVault(email);
    if (existingLocal) {
      return setError("هذا البريد مسجل بالفعل. سجّلي الدخول.");
    }

    err = "";
    var supaUser = null;
    if (client) {
      try {
        var result = await client.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { display_name: name },
            emailRedirectTo: window.location.origin + window.location.pathname
          }
        });
        if (result.error) {
          var msg = String(result.error.message || "");
          if (/already registered|user already registered/i.test(msg)) {
            return setError("هذا البريد مسجل بالفعل. سجّلي الدخول.");
          }
          // If Supabase hits email rate limit or requires confirmation, still provision local E2E vault so user can enter immediately
        } else if (result.data && result.data.user) {
          supaUser = result.data.user;
        }
      } catch (e) {}
    }

    if (!supaUser) {
      supaUser = {
        id: "local_" + base64Url(crypto.getRandomValues(new Uint8Array(12))),
        email: email,
        user_metadata: { display_name: name }
      };
    } else {
      supaUser.user_metadata = Object.assign({ display_name: name }, supaUser.user_metadata || {});
    }

    try {
      await loadVault(password, supaUser, true);
      tst("تم إنشاء الحساب وفتح المحفظة المشفرة بنجاح");
    } catch (e) {
      setError("تعذر إنشاء المحفظة المشفرة. حاولي مرة أخرى.");
    }
  };

  window.doLogin = async function () {
    var email = v("lg").toLowerCase();
    var password = v("lp");
    if (!emailValid(email) || !password) return setError("اكتبي بريدًا صحيحًا وكلمة المرور.");

    err = "";
    var result = null;
    if (client) {
      try {
        result = await client.auth.signInWithPassword({ email: email, password: password });
        if (!result.error && result.data && result.data.user) {
          try {
            await loadVault(password, result.data.user, false);
            return;
          } catch (error) {
            vaultKey = null;
            currentUser = null;
            await client.auth.signOut();
            return setError("كلمة المرور لا تطابق المحفظة المشفرة لهذا الحساب.");
          }
        }
      } catch (e) {}
    }

    // Fallback to local encrypted vault on this device (e.g., created before email confirmation or while offline)
    var localRow = getLocalVault(email);
    if (localRow && localRow.ciphertext && localRow.salt) {
      try {
        var lSalt = fromBase64Url(localRow.salt);
        var lKey = await window.IDCrypto.fromPass(password, lSalt);
        var lVault = await window.IDCrypto.dec(localRow.ciphertext, lKey);
        if (!isSafeVault(lVault)) throw new Error("invalid");
        vaultSalt = lSalt;
        vaultKey = lKey;
        var lUser = {
          id: localRow.user_id || ("local_" + email),
          email: email,
          user_metadata: { display_name: localRow.name || (lVault.p && lVault.p.n) || email.split("@")[0] }
        };
        applyVaultToState(lVault, lUser);
        saveActiveSession(currentUser, vaultKey, vaultSalt);
        go({ screen: "home", nav: "home" });
        return;
      } catch (localErr) {
        return setError("البريد أو كلمة المرور غير صحيحة.");
      }
    }

    return setError(result && result.error ? appError(result.error) : "البريد أو كلمة المرور غير صحيحة.");
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
    if (password.length < 8) return setError("اختاري كلمة مرور من 8 حروف على الأقل.");
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

  function lockMarkup() {
    return '<div class="ac"><div class="wm">IDC</div><h2 style="text-align:center;font-size:22px;margin:14px 0">المحفظة مقفولة</h2><div class="mu" style="text-align:center">جلسة الدخول محفوظة. أدخلي كلمة مرور حسابك لفك تشفير بياناتك.</div>' +
      '<div class="f"><input id="unlockEmail" type="email" dir="ltr" value="' + esc(currentUser && currentUser.email || "") + '" placeholder=" "><label>البريد الإلكتروني</label></div>' +
      '<div class="f"><input id="unlockPassword" type="password" dir="ltr" placeholder=" "><label>كلمة المرور</label></div>' +
      '<div class="err">' + esc(err) + '</div><button class="bt w" onclick="window.idcUnlockVault()">فتح المحفظة المشفرة</button>' +
      '<button class="bt t w" style="margin-top:8px" onclick="window.idcSignOut()">تسجيل الخروج</button></div>';
  }

  async function unlockWith(email, password) {
    if (!backendRequired()) return;
    if (!emailValid(email) || password.length < 6) return setError("أدخلي البريد وكلمة المرور الصحيحة.");
    await window.doLoginWithValues(email, password);
  }

  window.doLoginWithValues = async function (email, password) {
    var result = await client.auth.signInWithPassword({ email: email, password: password });
    if (!result.error && result.data && result.data.user) {
      try {
        await loadVault(password, result.data.user, false);
        err = "";
        return;
      } catch (e) {}
    }
    var localRow = getLocalVault(email);
    if (localRow) {
      try {
        var lSalt = fromBase64Url(localRow.salt);
        var lKey = await window.IDCrypto.fromPass(password, lSalt);
        var lVault = await window.IDCrypto.dec(localRow.ciphertext, lKey);
        if (isSafeVault(lVault)) {
          vaultSalt = lSalt;
          vaultKey = lKey;
          applyVaultToState(lVault, {
            id: localRow.user_id || ("local_" + email),
            email: email,
            user_metadata: { display_name: localRow.name || email.split("@")[0] }
          });
          saveActiveSession(currentUser, vaultKey, vaultSalt);
          err = "";
          go({ screen: "home", nav: "home" });
          return;
        }
      } catch (e) {}
    }
    setError("تعذر فك المحفظة. تأكدي من كلمة المرور الصحيحة.");
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
