/* ============================================================================
 * IDC — Card Bank (الكارد بانك)
 * Features:
 *  - 3D Flippable Bank Cards (Meeza, Visa Debit, Visa Prepaid, Mastercard)
 *  - Spending Limit (Daily/Monthly) with linear progress bar, 80% warning & hard block
 *  - Hide Balance (dots ••••••) + Biometric/Face ID reveal with 10s auto-rehide
 *  - 5 Transaction Categories (food, transport, bills, shop, other) + "By category" breakdown
 *  - Card Expiry Alert when <= 30 days remaining
 * ========================================================================== */
(function () {
  "use strict";

  var css = [
    ".idc-bk{color:var(--tx);padding-bottom:24px}",
    ".bk-fcw{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 4px 14px;direction:ltr;scrollbar-width:none}",
    ".bk-fcw::-webkit-scrollbar{display:none}",
    ".bk-fc{perspective:1100px;width:min(82vw,330px);aspect-ratio:1.586;flex:none;scroll-snap-align:center;cursor:pointer;direction:ltr}",
    ".bk-fi{position:relative;width:100%;height:100%;transition:transform .6s cubic-bezier(.3,.7,.2,1);transform-style:preserve-3d}",
    ".bk-fc.flip .bk-fi{transform:rotateY(180deg)}",
    ".bk-face{position:absolute;inset:0;border-radius:18px;backface-visibility:hidden;-webkit-backface-visibility:hidden;padding:16px 18px;color:#F4F6FF;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.12)}",
    ".bk-face.bk{transform:rotateY(180deg);padding:0;justify-content:flex-start}",
    ".bk-c-meeza{background:linear-gradient(135deg,#0E5A5A,#173A56)}",
    ".bk-c-visa{background:linear-gradient(135deg,#2B3A8C,#141C4A)}",
    ".bk-c-pre{background:linear-gradient(135deg,#3A3F52,#1A1D2B)}",
    ".bk-r1{display:flex;justify-content:space-between;align-items:center;font-weight:600}",
    ".bk-net{font-style:italic;font-weight:700;letter-spacing:.02em}",
    ".bk-chip{width:40px;height:28px;border-radius:6px;background:linear-gradient(135deg,#D9C27A,#A98F45)}",
    ".bk-cn{font-size:1.08rem;letter-spacing:.14em;font-variant-numeric:tabular-nums}",
    ".bk-r3{display:flex;justify-content:space-between;font-size:.82rem}",
    ".bk-r3 small{display:block;font-size:.58rem;opacity:.68;letter-spacing:.08em}",
    ".bk-stripe{height:36px;background:#0A0C14;margin-top:18px}",
    ".bk-sig{display:flex;margin:14px 16px 0;height:32px;background:repeating-linear-gradient(135deg,#E9EAF2 0 6px,#DCDEEA 6px 12px);color:#222;align-items:center;justify-content:space-between;padding:0 10px;font-size:.76rem}",
    ".bk-sig i{font-style:normal;background:#fff;padding:2px 8px;border-radius:4px;letter-spacing:.2em}",
    ".bk-frz{position:absolute;inset:0;background:rgba(10,12,20,.65);display:grid;place-items:center;font-weight:700;letter-spacing:.14em;text-transform:uppercase}",
    ".bk-dots{display:flex;justify-content:center;gap:6px;margin-bottom:8px}",
    ".bk-dots i{width:6px;height:6px;border-radius:50%;background:var(--ln);display:block}",
    ".bk-dots i.on{background:var(--bl);width:18px;border-radius:3px}",
    ".bk-sum{display:grid;grid-template-columns:repeat(3,1fr);text-align:center}",
    ".bk-sum div{padding:10px 4px}",
    ".bk-sum small{color:var(--mu);display:block;font-size:.8rem}",
    ".bk-sum b{font-size:1rem;font-variant-numeric:tabular-nums}",
    ".bk-in{color:var(--gn)}.bk-out{color:var(--rd)}",
    ".bk-pg{display:block;height:7px;border-radius:4px;background:var(--sf);overflow:hidden;margin:8px 0 4px}",
    ".bk-pg i{display:block;height:100%;background:var(--bl);border-radius:4px;transition:width .25s}",
    ".bk-pg.w i{background:var(--rd)}",
    ".bk-warn{color:var(--rd);font-weight:600}",
    ".bk-chips{display:flex;gap:8px;overflow-x:auto;margin:10px 0;padding-bottom:2px}",
    ".bk-chips button{white-space:nowrap;padding:6px 14px;border-radius:99px;border:1px solid var(--ln);background:var(--cd);color:var(--mu);font:inherit;font-size:.86rem;cursor:pointer}",
    ".bk-chips button[aria-pressed=true]{background:var(--bl);border-color:var(--bl);color:var(--btx);font-weight:600}",
    "@media (prefers-reduced-motion:reduce){.bk-fi,.bk-pg i{transition:none!important}}"
  ].join("\n");

  function injectCss() {
    if (typeof document === "undefined" || document.getElementById("idc-bk-css")) return;
    var s = document.createElement("style");
    s.id = "idc-bk-css";
    s.textContent = css;
    document.head.appendChild(s);
  }
  injectCss();

  var CATS = {
    food: ["أكل", "Food"],
    transport: ["مواصلات", "Transport"],
    bills: ["فواتير", "Bills"],
    shop: ["مشتريات", "Shopping"],
    other: ["أخرى", "Other"]
  };
  var CARD_TYPES = [
    { cls: "bk-c-meeza", net: "meeza", ar: "ميزة", en: "Meeza" },
    { cls: "bk-c-visa", net: "VISA", ar: "فيزا (حساب)", en: "Visa Debit" },
    { cls: "bk-c-pre", net: "VISA", ar: "فيزا مشتريات (مدفوعة مسبقًا)", en: "Visa Prepaid" },
    { cls: "bk-c-pre", net: "Mastercard", ar: "ماستركارد", en: "Mastercard" }
  ];

  var revTimer = null;
  var revSeconds = 0;
  var revTick = null;

  function L(ar, en) { return typeof S !== "undefined" && S.lang === "en" ? en : ar; }
  function catLabel(k) { var c = CATS[k] || CATS.other; return L(c[0], c[1]); }
  function fmt(n) {
    return Math.abs(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function ensureBankState() {
    if (typeof S === "undefined") return null;
    if (!S.bk || !Array.isArray(S.bk.cards)) {
      var holder = ((S.p && S.p.n) || "NOUR").toUpperCase().slice(0, 18);
      S.bk = {
        sel: 0,
        f: 0,
        hide: true,
        rev: false,
        iban: "EG12 0001 0002 0003 0004 0005 0006",
        cards: [
          {
            cls: "bk-c-meeza", net: "meeza", lim: { p: "month", a: 6000 },
            name: "ميزة · الحساب الرئيسي", bank: "Nile Bank", holder: holder, last4: "4821", exp: "09/28",
            open: 12500, frozen: false,
            tx: [
              { t: "d", a: 8500, n: "إيداع مرتب", d: "1 نوفمبر" },
              { t: "d", a: 2000, n: "إيداع نقدي", d: "10 نوفمبر" },
              { t: "t", a: -500, n: "تحويل بنكي", d: "15 نوفمبر", c: "other" },
              { t: "p", a: -645.5, n: "سوبر ماركت", d: "19 نوفمبر", c: "food" },
              { t: "w", a: -1000, n: "سحب من ATM", d: "21 نوفمبر", c: "other" }
            ]
          },
          {
            cls: "bk-c-visa", net: "VISA", lim: null,
            name: "فيزا · حساب", bank: "Nile Bank", holder: holder, last4: "7390", exp: "03/29",
            open: 4200, frozen: false,
            tx: [
              { t: "d", a: 1500, n: "إيداع", d: "3 نوفمبر" },
              { t: "p", a: -212, n: "مواصلات", d: "12 نوفمبر", c: "transport" },
              { t: "w", a: -500, n: "سحب من ATM", d: "16 نوفمبر", c: "other" },
              { t: "p", a: -899, n: "متجر أونلاين", d: "20 نوفمبر", c: "shop" }
            ]
          },
          {
            cls: "bk-c-pre", net: "VISA", lim: null,
            name: "فيزا · مشتريات (مدفوعة مسبقًا)", bank: "Nile Bank", holder: holder, last4: "1156", exp: "12/27",
            open: 0, frozen: false,
            tx: [
              { t: "d", a: 1000, n: "شحن الكارد", d: "2 نوفمبر" },
              { t: "p", a: -149, n: "فاتورة اشتراك", d: "8 نوفمبر", c: "bills" },
              { t: "p", a: -320, n: "توصيل أكل", d: "18 نوفمبر", c: "food" }
            ]
          }
        ]
      };
    }
    return S.bk;
  }

  function bal(c) {
    return (Number(c.open) || 0) + (c.tx || []).reduce(function (s, x) { return s + (Number(x.a) || 0); }, 0);
  }

  function spent(c) {
    if (!c.lim) return 0;
    return (c.tx || []).filter(function (x) {
      return x.a < 0 && (c.lim.p === "month" || String(x.d).indexOf("Today") === 0 || String(x.d).indexOf("اليوم") === 0);
    }).reduce(function (q, x) { return q - x.a; }, 0);
  }

  function expDays(c) {
    var m = /^(\d\d)\/(\d\d)$/.exec(String(c.exp || "").trim());
    if (!m) return 999;
    return Math.ceil((new Date(2000 + Number(m[2]), Number(m[1]), 1) - new Date()) / 86400000);
  }

  function clearRevTimers() {
    if (revTimer) { clearTimeout(revTimer); revTimer = null; }
    if (revTick) { clearInterval(revTick); revTick = null; }
    revSeconds = 0;
  }

  async function confirmBiometricReveal() {
    if (window.PublicKeyCredential && navigator.credentials) {
      try {
        var avail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (avail) {
          var ch = crypto.getRandomValues(new Uint8Array(32));
          await navigator.credentials.create({
            publicKey: {
              challenge: ch,
              rp: { name: "IDC", id: location.hostname || "localhost" },
              user: { id: new Uint8Array([1, 2, 3, 4]), name: "idc-bal", displayName: "IDC" },
              pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
              authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
              timeout: 45000
            }
          });
          return true;
        }
      } catch (e) {
        return false;
      }
    }
    return confirm(L("تأكيد بالبصمة / Face ID لإظهار الرصيد لمدة 10 ثوانٍ؟", "Confirm with Fingerprint / Face ID to reveal balance for 10 seconds?"));
  }

  function openModal(html) {
    var old = document.getElementById("idc-bk-ov");
    if (old) old.remove();
    var ov = document.createElement("div");
    ov.id = "idc-bk-ov";
    ov.className = "ov";
    ov.style.zIndex = "65";
    ov.innerHTML = "<div>" + html + "</div>";
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
    return ov;
  }

  function renderBankPage() {
    var bk = ensureBankState();
    var cs = bk.cards;
    var header = '<div class="bar" style="padding-top:0"><button class="ib" aria-label="رجوع" onclick="pg=null;R()">' + mi("arrow_forward") + '</button><h2 style="font-size:22px;flex:1">' + L("الكارد بانك", "Card Bank") + '</h2><button class="bt o" style="height:36px;padding:0 14px" onclick="pg={k:\'bank-add\'};R()">' + mi("add") + " " + L("إضافة كارد", "Add Card") + "</button></div>";

    var ibanCard = '<div class="cd"><div class="rw" style="padding:4px 0"><div class="g"><b style="display:block">IBAN</b><span class="mu" dir="ltr" style="font-size:12px">' + esc(bk.iban || "EG•• •••• •••• •••• 4821") + '</span></div><button class="bt t" onclick="window.IDCBank.copyIban()">' + L("نسخ", "Copy") + "</button></div></div>";

    if (!cs.length) {
      return '<div class="idc-bk">' + header + ibanCard +
        '<div class="cd mu" style="text-align:center;padding:24px">' + L("لا توجد كروت مضافة بعد.", "No cards added yet.") + '</div>' +
        '<button class="bt w" onclick="pg={k:\'bank-add\'};R()">' + L("إضافة أول كارد", "Add First Card") + "</button></div>";
    }

    if (bk.sel >= cs.length) bk.sel = 0;
    var c = cs[bk.sel];
    var inn = (c.tx || []).filter(function (x) { return x.a > 0; }).reduce(function (s, x) { return s + x.a; }, 0);
    var out = (c.tx || []).filter(function (x) { return x.a < 0; }).reduce(function (s, x) { return s - x.a; }, 0);

    var cardsHtml = '<div class="bk-fcw">' + cs.map(function (cardObj, idx) {
      var activeBorder = idx === bk.sel ? ' style="outline:2px solid var(--bl);outline-offset:3px;border-radius:20px"' : "";
      return '<div class="bk-fc"' + activeBorder + ' role="button" tabindex="0" aria-label="' + L("قلب الكارد", "Flip card") + '" onclick="if(S.bk.sel!==' + idx + '){S.bk.sel=' + idx + ';R();}else{this.classList.toggle(\'flip\')}">' +
        '<div class="bk-fi">' +
          '<div class="bk-face ' + esc(cardObj.cls || "bk-c-visa") + '">' +
            '<div class="bk-r1"><span>' + esc(cardObj.bank) + '</span><span class="bk-net">' + esc(cardObj.net) + "</span></div>" +
            '<div class="bk-chip"></div>' +
            '<div class="bk-cn">•••• •••• •••• ' + esc(cardObj.last4) + "</div>" +
            '<div class="bk-r3"><span><small>CARD HOLDER</small>' + esc(cardObj.holder) + '</span><span><small>EXPIRES</small>' + esc(cardObj.exp) + "</span></div>" +
            (cardObj.frozen ? '<div class="bk-frz">' + L("متجمّد", "FROZEN") + "</div>" : "") +
          "</div>" +
          '<div class="bk-face bk ' + esc(cardObj.cls || "bk-c-visa") + '">' +
            '<div class="bk-stripe"></div>' +
            '<div class="bk-sig"><span>' + L("التوقيع المعتمد", "Authorized signature") + '</span><i>•••</i></div>' +
            '<div style="font-size:11px;opacity:.75;margin:12px 16px 0">' + L("خدمة العملاء", "Customer service") + ' · +20 15 58540330<br>' + esc(cardObj.name) + "</div>" +
          "</div>" +
        "</div></div>";
    }).join("") + "</div>";

    var dots = '<div class="bk-dots">' + cs.map(function (_, i) { return '<i class="' + (i === bk.sel ? "on" : "") + '"></i>'; }).join("") + "</div>" +
      '<div class="mu" style="text-align:center;font-size:12px;margin-bottom:10px">' + L("اضغط على الكارد لقلبه أو اختر كاردًا آخر", "Tap the active card to flip or tap another card to switch") + "</div>";

    var balDisplay = (bk.hide && !bk.rev) ? "••••••" : fmt(bal(c));
    var revBadge = bk.rev && revSeconds > 0 ? '<div class="mu" style="font-size:11px;color:var(--bl)">' + L("يُخفى خلال " + revSeconds + "ث", "Hides in " + revSeconds + "s") + "</div>" : "";
    var summaryCard = '<div class="cd"><div class="bk-sum">' +
      '<div><small>' + L("الرصيد", "Balance") + '</small><b>' + balDisplay + "</b>" + revBadge + "</div>" +
      '<div><small>' + L("داخل", "Money in") + '</small><b class="bk-in">' + fmt(inn) + "</b></div>" +
      '<div><small>' + L("خارج", "Money out") + '</small><b class="bk-out">' + fmt(out) + "</b></div>" +
    "</div></div>";

    // Card expiry alert (<= 30 days)
    var daysLeft = expDays(c);
    var expiryAlert = daysLeft <= 30
      ? '<div class="nt" style="margin:0 0 10px;border:1.5px solid var(--rd);color:var(--rd);font-weight:600">' +
        (daysLeft < 0 ? L("تنبيه: هذا الكارد منتهي الصلاحية.", "Warning: This card has expired.") : L("تنبيه: هذا الكارد ينتهي خلال " + daysLeft + " يومًا.", "Warning: This card expires in " + daysLeft + " days.")) +
        "</div>"
      : "";

    // Spending limit linear progress bar (warn at >= 80%)
    var sp = spent(c);
    var lim = c.lim;
    var nearLimit = Boolean(lim && sp >= lim.a * 0.8);
    var pct = lim ? Math.min(100, Math.round((sp / lim.a) * 100)) : 0;
    var limRow = '<div class="rw" style="cursor:pointer" onclick="window.IDCBank.openLimitModal()"><div class="g">' +
      '<b style="font-weight:600">' + L("حد الصرف", "Spending limit") + "</b>" +
      (lim
        ? '<span class="bk-pg' + (nearLimit ? " w" : "") + '"><i style="width:' + pct + '%"></i></span>' +
          '<div class="mu' + (nearLimit ? " bk-warn" : "") + '" style="font-size:12px">' + fmt(sp) + " / " + fmt(lim.a) + " · " + (lim.p === "day" ? L("يومي", "Daily") : L("شهري", "Monthly")) + (nearLimit ? " · " + L("تحذير: وصلت إلى " + pct + "% من الحد", "Warning: " + pct + "% of limit reached") : "") + "</div>"
        : '<div class="mu" style="font-size:12px">' + L("غير محدد — اضغط للضبط", "Not set — tap to configure") + "</div>") +
      '</div><button class="bt t">' + L("ضبط", "Set") + "</button></div>";

    // Controls card (Show Balance with biometric 10s, Hide Balance toggle, Spending Limit, Freeze, Remove)
    var revealRow = (bk.hide && !bk.rev)
      ? '<div class="rw"><span>' + L("إظهار الرصيد (بالبصمة / Face ID لمدة 10 ثوانٍ)", "Show balance (Biometrics · 10s)") + '</span><button class="bt o" style="height:34px;padding:0 12px" onclick="window.IDCBank.revealBalance()">' + mi("fingerprint", 18) + " " + L("إظهار", "Show") + "</button></div>"
      : "";
    var hideRow = '<div class="rw"><span>' + L("إخفاء الرصيد تلقائيًا", "Hide balance") + '</span><button class="sw ' + (bk.hide ? "on" : "") + '" aria-label="Hide balance" onclick="window.IDCBank.toggleHide()"></button></div>';
    var freezeRow = '<div class="rw"><span>' + L("تجميد الكارد", "Freeze card") + '</span><button class="sw ' + (c.frozen ? "on" : "") + '" aria-label="Freeze card" onclick="window.IDCBank.toggleFreeze()"></button></div>';
    var removeRow = '<div class="rw"><span style="color:var(--rd)">' + L("إزالة الكارد", "Remove card") + '</span><button class="bt t" style="color:var(--rd)" onclick="window.IDCBank.removeCard()">' + L("إزالة", "Remove") + "</button></div>";

    var controlsCard = '<div class="cd">' + revealRow + hideRow + limRow + freezeRow + removeRow + "</div>";

    // Category Breakdown ("حسب التصنيف")
    var catTotals = {};
    (c.tx || []).filter(function (x) { return x.a < 0; }).forEach(function (x) {
      var k = x.c || "other";
      catTotals[k] = (catTotals[k] || 0) - x.a;
    });
    var catKeys = Object.keys(catTotals);
    var catCard = "";
    if (catKeys.length) {
      var maxCat = Math.max.apply(null, [1].concat(catKeys.map(function (k) { return catTotals[k]; })));
      catCard = '<div class="cd"><b style="display:block;margin-bottom:6px">' + L("حسب التصنيف", "By category") + "</b>" +
        catKeys.sort(function (a, b) { return catTotals[b] - catTotals[a]; }).map(function (k) {
          var v = catTotals[k];
          return '<div style="padding:6px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>' + catLabel(k) + '</span><b style="font-variant-numeric:tabular-nums">' + fmt(v) + '</b></div><span class="bk-pg"><i style="width:' + Math.round((v / maxCat) * 100) + '%"></i></span></div>';
        }).join("") + "</div>";
    }

    // Transactions list with filter chips
    var filters = [
      [null, L("الكل", "All")],
      ["w", L("السحب", "Withdrawals")],
      ["d", L("الإيداع", "Deposits")],
      ["pt", L("المدفوعات", "Payments")]
    ];
    var chipsHtml = '<div class="bk-chips">' + filters.map(function (f, i) {
      return '<button aria-pressed="' + (bk.f === i) + '" onclick="S.bk.f=' + i + ';R()">' + f[1] + "</button>";
    }).join("") + "</div>";

    var activeF = filters[bk.f] ? filters[bk.f][0] : null;
    var txList = (c.tx || []).filter(function (x) { return activeF === null || activeF.indexOf(x.t) > -1; }).slice().reverse();
    var txHtml = '<div class="cd">' + (txList.length ? txList.map(function (x) {
      var icName = x.t === "d" ? "south_west" : x.t === "w" ? "north_east" : x.t === "t" ? "swap_horiz" : "shopping_bag";
      return '<div class="rw"><div class="it" style="gap:10px"><div class="ic" style="--c:' + (x.a > 0 ? "var(--gn)" : "var(--bl)") + '">' + mi(icName, 18) + '</div><div class="g"><b style="font-weight:600">' + esc(x.n) + '</b><div class="mu" style="font-size:12px">' + esc(x.d) + (x.c ? " · " + catLabel(x.c) : "") + '</div></div></div><b class="' + (x.a > 0 ? "bk-in" : "bk-out") + '" dir="ltr">' + (x.a > 0 ? "+" : "−") + fmt(x.a) + "</b></div>";
    }).join("") : '<div class="mu" style="text-align:center;padding:12px">' + L("لا توجد معاملات في هذا التصنيف", "No transactions in this filter") + "</div>") + "</div>";

    return '<div class="idc-bk">' + header + ibanCard + cardsHtml + dots + expiryAlert + summaryCard + catCard + controlsCard +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:12px 2px 4px"><b>' + L("المعاملات", "Transactions") + '</b><button class="bt o" style="height:34px;padding:0 14px" onclick="window.IDCBank.openTxModal()">' + mi("add", 18) + " " + L("إضافة معاملة", "Add Transaction") + "</button></div>" +
      chipsHtml + txHtml + "</div>";
  }

  function renderBankAddPage() {
    var header = '<div class="bar" style="padding-top:0"><button class="ib" aria-label="رجوع" onclick="pg={k:\'bank\'};R()">' + mi("arrow_forward") + '</button><h2 style="font-size:22px">' + L("إضافة كارد بنكي", "Add Bank Card") + "</h2></div>";
    var typeOpts = CARD_TYPES.map(function (t, i) { return '<option value="' + i + '">' + (S.lang === "en" ? t.en : t.ar) + "</option>"; }).join("");
    return '<div class="idc-bk">' + header +
      '<div class="nt" style="margin:0 0 12px">' + L("يتم الاحتفاظ بآخر 4 أرقام فقط، ولا يتم تخزين رمز CVV أبدًا.", "Only the last 4 digits are kept. CVV is never stored.") + "</div>" +
      '<div class="cd">' +
        '<div class="mu" style="font-size:12px">' + L("نوع الكارد", "Card type") + '</div><select id="bkType" style="margin-top:4px">' + typeOpts + "</select>" +
        fld("bkBank", L("اسم البنك", "Bank name"), { v: "Nile Bank" }) +
        fld("bkHolder", L("الاسم على الكارد", "Cardholder name"), { v: ((S.p && S.p.n) || "NOUR").toUpperCase() }) +
        fld("bkNum", L("رقم الكارد (16 رقم)", "Card number (16 digits)"), { d: "ltr", m: 19 }) +
        fld("bkExp", L("تاريخ الانتهاء (MM/YY)", "Expiry (MM/YY)"), { d: "ltr", m: 5 }) +
        fld("bkOpen", L("الرصيد الحالي (جنيه)", "Opening balance (EGP)"), { d: "ltr", v: "0" }) +
        '<div class="err" id="bkAddErr"></div>' +
        '<button class="bt w" style="margin-top:12px" onclick="window.IDCBank.saveNewCard()">' + L("حفظ الكارد", "Save Card") + "</button>" +
      "</div></div>";
  }

  window.IDCBank = {
    copyIban: function () {
      var bk = ensureBankState();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(bk.iban || "").catch(function () {});
      }
      tst(L("تم نسخ رقم الـ IBAN", "IBAN copied"));
    },
    toggleHide: function () {
      var bk = ensureBankState();
      bk.hide = !bk.hide;
      bk.rev = false;
      clearRevTimers();
      sv(); R();
    },
    revealBalance: async function () {
      var bk = ensureBankState();
      var ok = await confirmBiometricReveal();
      if (!ok) return tst(L("لم يتم التحقق من البصمة", "Biometric verification cancelled"));
      bk.rev = true;
      clearRevTimers();
      revSeconds = 10;
      R();
      revTick = setInterval(function () {
        revSeconds = Math.max(0, revSeconds - 1);
        if (pg && pg.k === "bank") R();
      }, 1000);
      revTimer = setTimeout(function () {
        bk.rev = false;
        clearRevTimers();
        if (pg && pg.k === "bank") R();
      }, 10000);
    },
    toggleFreeze: function () {
      var bk = ensureBankState();
      var c = bk.cards[bk.sel];
      if (!c) return;
      c.frozen = !c.frozen;
      sv(); R();
    },
    removeCard: function () {
      var bk = ensureBankState();
      if (!confirm(L("هل تريد إزالة هذا الكارد؟", "Remove this card?"))) return;
      bk.cards.splice(bk.sel, 1);
      bk.sel = 0;
      sv(); R();
    },
    openLimitModal: function () {
      var bk = ensureBankState();
      var c = bk.cards[bk.sel];
      if (!c) return;
      var curP = (c.lim && c.lim.p) || "month";
      var curA = c.lim ? String(c.lim.a) : "";
      var ov = openModal(
        '<h3 style="margin:0 0 12px">' + L("حد الصرف للكارد", "Card Spending Limit") + "</h3>" +
        '<div class="mu" style="font-size:12px">' + L("الفترة", "Period") + '</div>' +
        '<select id="bkLimP" style="margin-top:4px"><option value="day"' + (curP === "day" ? " selected" : "") + '>' + L("يومي", "Daily") + '</option><option value="month"' + (curP === "month" ? " selected" : "") + '>' + L("شهري", "Monthly") + "</option></select>" +
        fld("bkLimA", L("الحد الأقصى (جنيه)", "Limit amount (EGP)"), { d: "ltr", v: curA }) +
        '<div class="err" id="bkLimErr"></div>' +
        '<div class="ar" style="margin-top:14px;gap:8px"><button class="bt o" id="bkLimRm">' + L("إزالة الحد", "Remove") + '</button><button class="bt" id="bkLimSv">' + L("حفظ الحد", "Save Limit") + "</button></div>"
      );
      ov.querySelector("#bkLimRm").onclick = function () { c.lim = null; ov.remove(); sv(); R(); };
      ov.querySelector("#bkLimSv").onclick = function () {
        var val = parseFloat(String(ov.querySelector("#bkLimA").value || "").replace(/,/g, ""));
        if (!(val > 0)) { ov.querySelector("#bkLimErr").textContent = L("أدخل مبلغًا صحيحًا أكبر من صفر.", "Enter a valid amount."); return; }
        c.lim = { p: ov.querySelector("#bkLimP").value === "day" ? "day" : "month", a: val };
        ov.remove();
        sv(); R();
        tst(L("تم حفظ حد الصرف", "Spending limit saved"));
      };
    },
    openTxModal: function () {
      var bk = ensureBankState();
      var c = bk.cards[bk.sel];
      if (!c) return;
      if (c.frozen) return tst(L("الكارد متجمّد حاليًا؛ قم بإلغاء التجميد أولًا.", "Card is frozen; unfreeze it first."));
      var catOpts = Object.keys(CATS).map(function (k) { return '<option value="' + k + '">' + catLabel(k) + "</option>"; }).join("");
      var ov = openModal(
        '<h3 style="margin:0 0 12px">' + L("إضافة معاملة", "Add Transaction") + "</h3>" +
        '<div class="mu" style="font-size:12px">' + L("نوع المعاملة", "Transaction type") + '</div>' +
        '<select id="bkTxT" style="margin-top:4px"><option value="p">' + L("دفع / مشتريات", "Payment") + '</option><option value="w">' + L("سحب نقدي", "Withdrawal") + '</option><option value="d">' + L("إيداع", "Deposit") + "</option></select>" +
        fld("bkTxA", L("المبلغ (جنيه)", "Amount (EGP)"), { d: "ltr" }) +
        '<div class="mu" style="font-size:12px;margin-top:12px">' + L("التصنيف", "Category") + '</div>' +
        '<select id="bkTxC" style="margin-top:4px">' + catOpts + "</select>" +
        fld("bkTxN", L("ملاحظة", "Note")) +
        '<div class="err" id="bkTxErr"></div>' +
        '<div class="ar" style="margin-top:14px;gap:8px"><button class="bt t" id="bkTxX">' + L("إلغاء", "Cancel") + '</button><button class="bt" id="bkTxOk">' + L("حفظ المعاملة", "Save Transaction") + "</button></div>"
      );
      ov.querySelector("#bkTxX").onclick = function () { ov.remove(); };
      ov.querySelector("#bkTxOk").onclick = function () {
        var ty = ov.querySelector("#bkTxT").value;
        var a = parseFloat(String(ov.querySelector("#bkTxA").value || "").replace(/,/g, ""));
        var er = ov.querySelector("#bkTxErr");
        if (!(a > 0)) { er.textContent = L("أدخل مبلغًا صحيحًا.", "Enter a valid amount."); return; }
        if (ty !== "d" && a > bal(c)) { er.textContent = L("الرصيد غير كافٍ لإتمام المعاملة.", "Insufficient balance."); return; }
        if (ty !== "d" && c.lim && spent(c) + a > c.lim.a) {
          er.textContent = L("تم رفض المعاملة: المبلغ يتجاوز حد الصرف المحدد (" + fmt(c.lim.a) + ").", "Declined: exceeds spending limit (" + fmt(c.lim.a) + ").");
          return;
        }
        var note = String(ov.querySelector("#bkTxN").value || "").trim() || (ty === "d" ? L("إيداع", "Deposit") : ty === "w" ? L("سحب", "Withdrawal") : L("دفع", "Payment"));
        c.tx.push({ t: ty, a: ty === "d" ? a : -a, n: note, d: L("اليوم", "Today"), c: ty === "d" ? undefined : ov.querySelector("#bkTxC").value });
        ov.remove();
        sv(); R();
        tst(L("تمت إضافة المعاملة بنجاح", "Transaction added"));
      };
    },
    saveNewCard: function () {
      var bk = ensureBankState();
      var idx = Number(v("bkType") || 0);
      var ct = CARD_TYPES[idx] || CARD_TYPES[0];
      var bank = v("bkBank");
      var holder = v("bkHolder");
      var num = v("bkNum").replace(/\s+/g, "");
      var exp = v("bkExp");
      var openBal = parseFloat(v("bkOpen") || "0") || 0;
      var er = document.getElementById("bkAddErr");
      if (!bank || !holder || !/^\d{16}$/.test(num)) {
        if (er) er.textContent = L("أدخل اسم البنك والاسم ورقم كارد مكون من 16 رقمًا.", "Enter bank name, holder name, and a 16-digit card number.");
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) {
        if (er) er.textContent = L("أدخل تاريخ الانتهاء بصيغة MM/YY.", "Use MM/YY expiry format.");
        return;
      }
      bk.cards.push({
        cls: ct.cls, net: ct.net, name: bank + " · " + ct.ar, bank: bank,
        holder: holder.toUpperCase(), last4: num.slice(-4), exp: exp, open: openBal, frozen: false, lim: null, tx: []
      });
      bk.sel = bk.cards.length - 1;
      pg = { k: "bank" };
      sv(); R();
      tst(L("تمت إضافة الكارد بنجاح", "Card added"));
    }
  };

  var _basePage = window.page;
  window.page = function () {
    if (pg && pg.k === "bank") return renderBankPage();
    if (pg && pg.k === "bank-add") return renderBankAddPage();
    return _basePage();
  };
})();
