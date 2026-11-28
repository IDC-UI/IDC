/* ============================================================================
 * IDC — Card Bank (الكارد بانك)
 * Features:
 *  - Unified Realistic Bank Card Template (EMV Chip, Contactless NFC, Inline SVG Logos)
 *  - 16 Egyptian Banks & Fintech Providers (NBE, Banque Misr, CIB, QNB, BdC, AlexBank,
 *    ADIB, Faisal, HSBC, Egypt Post, Telda, Klivvr, Nexta, myFawry, InstaPay, Custom)
 *  - Real accounts start empty (zero fake cards) + Remove single card / Clear all / Edit IBAN & InstaPay
 *  - Spending Limit (Daily/Monthly) with linear progress bar (.bk-pg), 80% warning & hard block
 *  - Hide Balance (dots ••••••) + Biometric/Face ID reveal with 10s auto-rehide (10000ms)
 *  - 5 Transaction Categories (food, transport, bills, shop, other) + "By category" breakdown
 *  - Card Expiry Alert when <= 30 days remaining (expDays)
 * ========================================================================== */
(function () {
  "use strict";

  var css = [
    ".idc-bk{color:var(--tx);padding-bottom:24px}",
    ".bk-fcw{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:8px 4px 16px;direction:ltr;scrollbar-width:none}",
    ".bk-fcw::-webkit-scrollbar{display:none}",
    ".bk-fc{perspective:1200px;width:min(86vw,346px);aspect-ratio:1.586;flex:none;scroll-snap-align:center;cursor:pointer;direction:ltr;position:relative}",
    ".bk-fi{position:relative;width:100%;height:100%;transition:transform .65s cubic-bezier(.25,.8,.25,1);transform-style:preserve-3d}",
    ".bk-fc.flip .bk-fi{transform:rotateY(180deg)}",
    ".bk-face{position:absolute;inset:0;border-radius:18px;backface-visibility:hidden;-webkit-backface-visibility:hidden;padding:16px 18px;color:#F6F8FF;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;box-shadow:0 14px 30px rgba(6,10,24,.36),inset 0 1px 0 rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.14)}",
    ".bk-face.bk{transform:rotateY(180deg);padding:0;justify-content:flex-start}",
    ".bk-face.bk-ink-dark{color:#1B1608;border-color:rgba(0,0,0,.14);box-shadow:0 14px 30px rgba(6,10,24,.26),inset 0 1px 0 rgba(255,255,255,.55)}",
    ".bk-art{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}",
    ".bk-fg{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:space-between;height:100%}",
    /* Bank & Fintech Skins */
    ".bk-skin-nbe-meeza{background:linear-gradient(125deg,#B86B19 0%,#6E6424 38%,#0D563A 72%,#063322 100%)}",
    ".bk-skin-nbe-credit{background:repeating-linear-gradient(152deg,rgba(255,255,255,.03) 0 2px,transparent 2px 7px),linear-gradient(135deg,#072B1C 0%,#0D5235 58%,#136B44 100%)}",
    ".bk-skin-bm-navy{background:linear-gradient(160deg,#0C1C4D 0%,#132B6E 62%,#1B3B88 100%)}",
    ".bk-skin-bm-gold{background:linear-gradient(135deg,#D8AE52 0%,#B9892B 45%,#E4C26B 78%,#A97A20 100%)}",
    ".bk-skin-cib{background:linear-gradient(135deg,#09245A 0%,#124296 65%,#1A58BD 100%)}",
    ".bk-skin-qnb{background:linear-gradient(135deg,#0B1B42 0%,#173369 68%,#6B1530 100%)}",
    ".bk-skin-bdc{background:linear-gradient(135deg,#56132B 0%,#842740 64%,#B04A3A 100%)}",
    ".bk-skin-alex{background:linear-gradient(135deg,#1B1F27 0%,#2B313E 62%,#D96400 100%)}",
    ".bk-skin-adib{background:linear-gradient(135deg,#08435C 0%,#116E8E 65%,#1B8FB0 100%)}",
    ".bk-skin-faisal{background:linear-gradient(135deg,#112036 0%,#1E395C 65%,#8C6D2E 100%)}",
    ".bk-skin-hsbc{background:linear-gradient(135deg,#1E2229 0%,#343A46 65%,#181B20 100%)}",
    ".bk-skin-post{background:linear-gradient(135deg,#0B4F2F 0%,#157547 68%,#1D8E58 100%)}",
    ".bk-skin-telda{background:radial-gradient(circle at 88% 18%,rgba(0,229,255,.18),transparent 48%),linear-gradient(135deg,#0A0C10 0%,#151922 60%,#0D1017 100%)}",
    ".bk-skin-klivvr{background:radial-gradient(circle at 85% 82%,rgba(198,255,0,.22),transparent 45%),linear-gradient(135deg,#0F141D 0%,#1B2536 100%)}",
    ".bk-skin-nexta{background:radial-gradient(circle at 82% 22%,rgba(148,98,255,.32),transparent 50%),linear-gradient(135deg,#160E30 0%,#2E1B63 65%,#1C1240 100%)}",
    ".bk-skin-fawry{background:linear-gradient(135deg,#F5BE0B 0%,#DFA100 62%,#C98B00 100%)}",
    ".bk-skin-instapay{background:linear-gradient(135deg,#3B1254 0%,#253B6E 55%,#0F6973 100%)}",
    ".bk-skin-other{background:linear-gradient(135deg,#1D2742 0%,#101628 100%)}",
    /* Anatomy */
    ".bk-r1{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}",
    ".bk-brand{display:flex;align-items:center;gap:8px}",
    ".bk-btxt b{display:block;font-size:.86rem;font-weight:800;line-height:1.15;letter-spacing:.01em}",
    ".bk-btxt small{display:block;font-size:.54rem;opacity:.82;letter-spacing:.07em;text-transform:uppercase}",
    ".bk-tier{font-size:.66rem;font-weight:600;opacity:.85;letter-spacing:.04em;padding:2px 8px;border-radius:99px;background:rgba(255,255,255,.14)}",
    ".bk-ink-dark .bk-tier{background:rgba(0,0,0,.1)}",
    ".bk-mid{display:flex;align-items:center;justify-content:space-between;margin:4px 0 2px}",
    ".bk-chip-wrap{display:flex;align-items:center;gap:6px}",
    ".bk-cn{font-size:1.08rem;font-weight:700;letter-spacing:.15em;font-variant-numeric:tabular-nums;text-shadow:0 1px 2px rgba(0,0,0,.35)}",
    ".bk-ink-dark .bk-cn{text-shadow:none}",
    ".bk-r3{display:flex;justify-content:space-between;align-items:flex-end;gap:8px}",
    ".bk-meta{display:flex;flex-direction:column;gap:3px;min-width:0}",
    ".bk-exp{font-size:.72rem;font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:5px}",
    ".bk-exp small{font-size:.48rem;line-height:1.05;opacity:.75;letter-spacing:.06em}",
    ".bk-holder{font-size:.78rem;font-weight:700;letter-spacing:.08em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}",
    ".bk-net-box{flex:none;display:flex;align-items:center;justify-content:flex-end}",
    ".bk-stripe{height:36px;background:#0A0C14;margin-top:18px}",
    ".bk-sig{display:flex;margin:14px 16px 0;height:32px;background:repeating-linear-gradient(135deg,#E9EAF2 0 6px,#DCDEEA 6px 12px);color:#222;align-items:center;justify-content:space-between;padding:0 10px;font-size:.76rem}",
    ".bk-sig i{font-style:normal;background:#fff;padding:2px 8px;border-radius:4px;letter-spacing:.2em}",
    ".bk-frz{position:absolute;inset:0;z-index:3;background:rgba(10,12,20,.68);display:grid;place-items:center;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff}",
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
    ".bk-pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:8px 0 12px;max-height:220px;overflow-y:auto;padding:2px}",
    ".bk-pbtn{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:12px;border:1.5px solid var(--ln);background:var(--cd);color:var(--tx);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;text-align:start}",
    ".bk-pbtn.on{border-color:var(--bl);background:color-mix(in srgb,var(--bl) 12%,var(--cd))}",
    ".bk-pdot{width:12px;height:12px;border-radius:50%;flex:none}",
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
    { net: "meeza", tier: "ميزة", tierEn: "Meeza", ar: "ميزة (Meeza)", en: "Meeza" },
    { net: "VISA", tier: "Debit", tierEn: "Debit", ar: "فيزا خصم مباشر (Visa Debit)", en: "Visa Debit" },
    { net: "VISA", tier: "Prepaid", tierEn: "Prepaid", ar: "فيزا مسبقة الدفع / مشتريات", en: "Visa Prepaid" },
    { net: "Mastercard", tier: "Credit / Debit", tierEn: "Mastercard", ar: "ماستركارد (Mastercard)", en: "Mastercard" }
  ];

  /* 16 Authentic Egyptian Banks & Payment Providers */
  var PROVIDERS = [
    { id: "nbe", kind: "bank", ar: "البنك الأهلي المصري", en: "National Bank of Egypt", sub: "NATIONAL BANK OF EGYPT", dot: "#0D563A" },
    { id: "bm", kind: "bank", ar: "بنك مصر", en: "Banque Misr", sub: "BANQUE MISR", dot: "#132B6E" },
    { id: "cib", kind: "bank", ar: "البنك التجاري الدولي CIB", en: "CIB Egypt", sub: "COMMERCIAL INTERNATIONAL BANK", dot: "#124296" },
    { id: "qnb", kind: "bank", ar: "بنك QNB الأهلي", en: "QNB Alahli", sub: "QNB ALAHLI", dot: "#173369" },
    { id: "bdc", kind: "bank", ar: "بنك القاهرة", en: "Banque du Caire", sub: "BANQUE DU CAIRE", dot: "#842740" },
    { id: "alex", kind: "bank", ar: "بنك الإسكندرية", en: "AlexBank", sub: "ALEXBANK · INTESA SANPAOLO", dot: "#D96400" },
    { id: "adib", kind: "bank", ar: "مصرف أبوظبي الإسلامي", en: "ADIB Egypt", sub: "ABU DHABI ISLAMIC BANK", dot: "#116E8E" },
    { id: "faisal", kind: "bank", ar: "بنك فيصل الإسلامي", en: "Faisal Islamic Bank", sub: "FAISAL ISLAMIC BANK", dot: "#1E395C" },
    { id: "hsbc", kind: "bank", ar: "بنك HSBC مصر", en: "HSBC Egypt", sub: "HSBC BANK EGYPT", dot: "#DB0011" },
    { id: "post", kind: "bank", ar: "البريد المصري EasyPay", en: "Egypt Post · EasyPay", sub: "EGYPT POST", dot: "#157547" },
    { id: "telda", kind: "fintech", ar: "تيلدا (Telda)", en: "Telda", sub: "TELDA PREPAID", dot: "#00E5FF" },
    { id: "klivvr", kind: "fintech", ar: "كليفر (Klivvr)", en: "Klivvr", sub: "KLIVVR SMART CARD", dot: "#C6FF00" },
    { id: "nexta", kind: "fintech", ar: "نكستا (Nexta)", en: "Nexta", sub: "NEXTA FINTECH", dot: "#8B5CF6" },
    { id: "fawry", kind: "fintech", ar: "كارت فوري الأصفر (myFawry)", en: "myFawry Yellow Card", sub: "MYFAWRY PREPAID", dot: "#F5BE0B" },
    { id: "instapay", kind: "fintech", ar: "إنستاباي / محفظة إلكترونية", en: "InstaPay / Digital Wallet", sub: "INSTAPAY EGYPT", dot: "#7E22CE" },
    { id: "other", kind: "other", ar: "بنك أو شركة دفع أخرى", en: "Other Bank / Payment App", sub: "BANK CARD", dot: "#64748B" }
  ];

  function findProvider(idOrName) {
    var s = String(idOrName || "").toLowerCase();
    for (var i = 0; i < PROVIDERS.length; i++) {
      var p = PROVIDERS[i];
      if (p.id === s || p.ar === idOrName || p.en.toLowerCase() === s) return p;
    }
    if (/أهلي|اهلي|nbe|national bank/i.test(s)) return PROVIDERS[0];
    if (/مصر|banque misr/i.test(s)) return PROVIDERS[1];
    if (/cib|تجاري/i.test(s)) return PROVIDERS[2];
    if (/qnb/i.test(s)) return PROVIDERS[3];
    if (/قاهرة|caire/i.test(s)) return PROVIDERS[4];
    if (/إسكندرية|اسكندرية|alex/i.test(s)) return PROVIDERS[5];
    if (/أبوظبي|ابوظبي|adib/i.test(s)) return PROVIDERS[6];
    if (/فيصل|faisal/i.test(s)) return PROVIDERS[7];
    if (/hsbc/i.test(s)) return PROVIDERS[8];
    if (/بريد|post|easypay/i.test(s)) return PROVIDERS[9];
    if (/telda|تيلدا/i.test(s)) return PROVIDERS[10];
    if (/klivvr|كليفر/i.test(s)) return PROVIDERS[11];
    if (/nexta|نكستا/i.test(s)) return PROVIDERS[12];
    if (/fawry|فوري/i.test(s)) return PROVIDERS[13];
    if (/insta|انستا|إنستا/i.test(s)) return PROVIDERS[14];
    return PROVIDERS[15];
  }

  function resolveSkin(provId, net) {
    if (provId === "nbe") return { cls: net === "meeza" ? "bk-skin-nbe-meeza" : "bk-skin-nbe-credit", darkInk: false };
    if (provId === "bm") return net === "VISA" ? { cls: "bk-skin-bm-gold", darkInk: true } : { cls: "bk-skin-bm-navy", darkInk: false };
    if (provId === "fawry") return { cls: "bk-skin-fawry", darkInk: true };
    var map = {
      cib: "bk-skin-cib", qnb: "bk-skin-qnb", bdc: "bk-skin-bdc", alex: "bk-skin-alex",
      adib: "bk-skin-adib", faisal: "bk-skin-faisal", hsbc: "bk-skin-hsbc", post: "bk-skin-post",
      telda: "bk-skin-telda", klivvr: "bk-skin-klivvr", nexta: "bk-skin-nexta", instapay: "bk-skin-instapay"
    };
    return { cls: map[provId] || "bk-skin-other", darkInk: false };
  }

  /* Crisp Inline SVG Hardware & Logos */
  function chipSvg(darkInk) {
    var stroke = darkInk ? "#5C4510" : "#6E561B";
    return '<svg width="42" height="30" viewBox="0 0 42 30" aria-hidden="true">' +
      '<defs><linearGradient id="bkChipG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F2DFA0"/><stop offset="50%" stop-color="#CFA954"/><stop offset="100%" stop-color="#9E7929"/></linearGradient></defs>' +
      '<rect x=".5" y=".5" width="41" height="29" rx="5.5" fill="url(#bkChipG)" stroke="' + stroke + '" stroke-width=".9"/>' +
      '<path d="M14 1v28M28 1v28M1 10h13M28 10h13M1 20h13M28 20h13M14 15h14" stroke="' + stroke + '" stroke-width=".85" fill="none" opacity=".75"/>' +
      '</svg>';
  }

  function nfcSvg(darkInk) {
    var col = darkInk ? "#1B1608" : "#F6F8FF";
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + col + '" stroke-width="2.1" stroke-linecap="round" aria-hidden="true" style="opacity:.88">' +
      '<path d="M8.5 14.5a4 4 0 0 0 0-5"/><path d="M11.8 17a7.5 7.5 0 0 0 0-10"/><path d="M15.2 19.5a11 11 0 0 0 0-15"/>' +
      '</svg>';
  }

  function networkBadgeSvg(net, isGold) {
    if (net === "meeza") {
      return '<svg width="68" height="32" viewBox="0 0 96 44" aria-label="Meeza">' +
        '<rect width="96" height="44" rx="8" fill="#FFFFFF"/>' +
        '<circle cx="38" cy="11" r="3.4" fill="#F37021"/>' +
        '<text x="45" y="14" font-family="Arial,sans-serif" font-size="11" font-weight="800" fill="#4B1E78">meeza</text>' +
        '<text x="48" y="34" text-anchor="middle" font-family="Cairo,Arial,sans-serif" font-size="20" font-weight="800" fill="#4B1E78">ميزة</text>' +
        '<rect x="60" y="36" width="22" height="4" rx="2" fill="#F37021"/>' +
        '</svg>';
    }
    if (net === "Mastercard") {
      return '<svg width="54" height="34" viewBox="0 0 64 40" aria-label="Mastercard">' +
        '<circle cx="24" cy="20" r="14" fill="#EB001B"/>' +
        '<circle cx="40" cy="20" r="14" fill="#F79E1B" fill-opacity=".92"/>' +
        '</svg>';
    }
    // VISA
    return '<div style="text-align:right;line-height:1">' +
      '<svg width="64" height="26" viewBox="0 0 84 32" aria-label="VISA">' +
        '<rect width="84" height="32" rx="6" fill="#FFFFFF"/>' +
        '<text x="42" y="23" text-anchor="middle" font-family="Arial,sans-serif" font-style="italic" font-weight="900" font-size="21" letter-spacing="1" fill="#1434CB">VISA</text>' +
      '</svg>' +
      (isGold ? '<div style="font-size:9px;font-weight:700;margin-top:2px;opacity:.9">Gold</div>' : '') +
      '</div>';
  }

  function bankLogoSvg(provId, darkInk) {
    var fg = darkInk ? "#1B1608" : "#FFFFFF";
    if (provId === "nbe") {
      return '<svg width="32" height="32" viewBox="0 0 36 36" aria-hidden="true">' +
        '<rect x="3" y="3" width="30" height="30" rx="7" fill="none" stroke="#E5C158" stroke-width="2.6"/>' +
        '<path d="M10 13a8 8 0 0 0 16 0z" fill="#E5C158"/>' +
        '<rect x="11" y="19" width="3.5" height="10" rx="1" fill="' + fg + '"/>' +
        '<rect x="16.25" y="19" width="3.5" height="10" rx="1" fill="' + fg + '"/>' +
        '<rect x="21.5" y="19" width="3.5" height="10" rx="1" fill="' + fg + '"/>' +
        '</svg>';
    }
    if (provId === "bm") {
      var crestCol = darkInk ? "#231B07" : "#F0C75E";
      return '<svg width="32" height="32" viewBox="0 0 36 36" aria-hidden="true">' +
        '<circle cx="18" cy="19" r="12" fill="none" stroke="' + crestCol + '" stroke-width="2"/>' +
        '<path d="M12 10l6-5 6 5M14 23l4-9 4 9M11 24h14" stroke="' + crestCol + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '</svg>';
    }
    if (provId === "cib") {
      return '<svg width="30" height="30" viewBox="0 0 36 36" aria-hidden="true">' +
        '<polygon points="18,4 32,18 18,32 4,18" fill="none" stroke="#F59E0B" stroke-width="2.6"/>' +
        '<circle cx="18" cy="18" r="5" fill="#FFFFFF"/>' +
        '</svg>';
    }
    if (provId === "hsbc") {
      return '<svg width="34" height="24" viewBox="0 0 48 32" aria-hidden="true">' +
        '<rect x="12" y="4" width="24" height="24" fill="#FFFFFF"/>' +
        '<polygon points="12,4 24,16 12,28" fill="#DB0011"/>' +
        '<polygon points="36,4 24,16 36,28" fill="#DB0011"/>' +
        '<polygon points="12,4 2,16 12,28" fill="#DB0011"/>' +
        '<polygon points="36,4 46,16 36,28" fill="#DB0011"/>' +
        '</svg>';
    }
    if (provId === "telda") {
      return '<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">' +
        '<rect width="32" height="32" rx="8" fill="#FFFFFF"/>' +
        '<path d="M10 10h12M16 10v13M21 21l2 2" stroke="#0A0C10" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="23" cy="9" r="2.5" fill="#00BCD4"/>' +
        '</svg>';
    }
    if (provId === "klivvr") {
      return '<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">' +
        '<rect width="32" height="32" rx="8" fill="#C6FF00"/>' +
        '<path d="M10 8v16M21 9l-8 7 8 7" stroke="#0F141D" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
        '</svg>';
    }
    if (provId === "nexta") {
      return '<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">' +
        '<rect width="32" height="32" rx="8" fill="#8B5CF6"/>' +
        '<path d="M9 23V9l14 14V9" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
        '</svg>';
    }
    if (provId === "fawry") {
      return '<svg width="32" height="28" viewBox="0 0 36 32" aria-hidden="true">' +
        '<rect width="36" height="32" rx="8" fill="#003B70"/>' +
        '<path d="M11 23V12a4 4 0 0 1 4-4h6M10 16h9" stroke="#F5BE0B" stroke-width="2.8" stroke-linecap="round" fill="none"/>' +
        '<circle cx="26" cy="19" r="3" fill="#00B4D8"/>' +
        '</svg>';
    }
    if (provId === "instapay") {
      return '<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">' +
        '<rect width="32" height="32" rx="8" fill="rgba(255,255,255,.16)"/>' +
        '<path d="M8 13h13l-4-4M24 19H11l4 4" stroke="#2DD4BF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
        '</svg>';
    }
    return '<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">' +
      '<rect x="3" y="6" width="26" height="20" rx="5" fill="none" stroke="' + fg + '" stroke-width="2.2"/>' +
      '<path d="M3 12h26M8 20h6" stroke="' + fg + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '</svg>';
  }

  function cardWatermarkSvg(provId, net) {
    if (provId === "nbe") {
      return '<svg viewBox="0 0 340 215" width="100%" height="100%" preserveAspectRatio="none">' +
        '<g opacity=".18" transform="translate(112,32)">' +
          '<rect x="0" y="0" width="110" height="145" rx="18" fill="none" stroke="#6EE7B7" stroke-width="12"/>' +
          '<path d="M24 44a31 31 0 0 0 62 0z" fill="#FBBF24"/>' +
          '<rect x="26" y="74" width="14" height="62" rx="3" fill="#FBBF24"/>' +
          '<rect x="48" y="74" width="14" height="62" rx="3" fill="#FBBF24"/>' +
          '<rect x="70" y="74" width="14" height="62" rx="3" fill="#FBBF24"/>' +
        '</g></svg>';
    }
    if (provId === "bm" && net !== "VISA") {
      // Cairo Skyline geometric silhouette inspired by Banque Misr Meeza card
      return '<svg viewBox="0 0 340 215" width="100%" height="100%" preserveAspectRatio="none">' +
        '<g opacity=".28">' +
          '<polygon points="10,215 55,148 100,215" fill="#F59E0B"/>' +
          '<polygon points="68,215 105,162 142,215" fill="#EF4444"/>' +
          '<rect x="148" y="88" width="14" height="127" fill="#EC4899"/>' +
          '<rect x="172" y="72" width="32" height="143" fill="#8B5CF6"/>' +
          '<path d="M214 215v-55a22 22 0 0 1 44 0v55z" fill="#F59E0B"/>' +
          '<path d="M268 215v-70a28 28 0 0 1 56 0v70z" fill="#10B981"/>' +
        '</g></svg>';
    }
    if (provId === "bm" && net === "VISA") {
      // Faceted low-poly gold triangles inspired by Banque Misr Visa Gold
      return '<svg viewBox="0 0 340 215" width="100%" height="100%" preserveAspectRatio="none">' +
        '<g opacity=".22">' +
          '<polygon points="0,0 140,0 70,95" fill="#FFFbeb"/>' +
          '<polygon points="140,0 290,0 210,110" fill="#78350F"/>' +
          '<polygon points="70,95 210,110 130,215" fill="#FEF3C7"/>' +
          '<polygon points="210,110 340,40 340,215" fill="#92400E"/>' +
        '</g></svg>';
    }
    return '<svg viewBox="0 0 340 215" width="100%" height="100%" preserveAspectRatio="none">' +
      '<circle cx="295" cy="35" r="95" fill="rgba(255,255,255,.06)"/>' +
      '<circle cx="45" cy="195" r="85" fill="rgba(255,255,255,.04)"/>' +
      '</svg>';
  }

  function renderSingleCardVisual(cardObj, idx, isSelected, interactive) {
    var prov = findProvider(cardObj.bankId || cardObj.bank);
    var net = cardObj.net || "VISA";
    var skin = resolveSkin(prov.id, net);
    var bankTitle = prov.id === "other" ? (cardObj.bank || L("بطاقة بنكية", "Bank Card")) : L(prov.ar, prov.en);
    var bankSub = prov.id === "other" ? "BANK CARD" : prov.sub;
    var activeBorder = (interactive && isSelected) ? ' style="outline:2.5px solid var(--bl);outline-offset:3px;border-radius:20px"' : "";
    var clickAttr = interactive
      ? ' role="button" tabindex="0" aria-label="' + L("قلب الكارد", "Flip card") + '" onclick="if(S.bk.sel!==' + idx + '){S.bk.sel=' + idx + ';R();}else{this.classList.toggle(\'flip\')}"'
      : ' style="margin:0 auto"';
    var isGold = prov.id === "bm" && net === "VISA";

    return '<div class="bk-fc"' + activeBorder + clickAttr + '>' +
      '<div class="bk-fi">' +
        '<div class="bk-face ' + skin.cls + (skin.darkInk ? " bk-ink-dark" : "") + '">' +
          '<div class="bk-art">' + cardWatermarkSvg(prov.id, net) + '</div>' +
          '<div class="bk-fg">' +
            '<div class="bk-r1">' +
              '<div class="bk-brand">' + bankLogoSvg(prov.id, skin.darkInk) +
                '<div class="bk-btxt"><b>' + esc(bankTitle) + '</b><small>' + esc(bankSub) + '</small></div>' +
              '</div>' +
              '<span class="bk-tier">' + esc(cardObj.tier || net) + '</span>' +
            '</div>' +
            '<div class="bk-mid">' +
              '<div class="bk-chip-wrap"><span style="font-size:10px;opacity:.7">◂</span>' + chipSvg(skin.darkInk) + '</div>' +
              nfcSvg(skin.darkInk) +
            '</div>' +
            '<div class="bk-cn">•••• &nbsp;•••• &nbsp;•••• &nbsp;' + esc(cardObj.last4 || "0000") + '</div>' +
            '<div class="bk-r3">' +
              '<div class="bk-meta">' +
                '<div class="bk-exp"><small>VALID<br>THRU</small><span>' + esc(cardObj.exp || "MM/YY") + '</span></div>' +
                '<div class="bk-holder">' + esc(cardObj.holder || "CARDHOLDER NAME") + '</div>' +
              '</div>' +
              '<div class="bk-net-box">' + networkBadgeSvg(net, isGold) + '</div>' +
            '</div>' +
          '</div>' +
          (cardObj.frozen ? '<div class="bk-frz">' + L("متجمّد", "FROZEN") + "</div>" : "") +
        '</div>' +
        '<div class="bk-face bk ' + skin.cls + '">' +
          '<div class="bk-stripe"></div>' +
          '<div class="bk-sig"><span>' + L("التوقيع المعتمد", "Authorized signature") + '</span><i>•••</i></div>' +
          '<div style="font-size:11px;opacity:.85;margin:12px 16px 0;color:#fff">' + esc(bankTitle) + ' · ' + esc(net) + '<br>' + L("آخر 4 أرقام فقط محفوظة ومشفّرة داخل محفظة IDC", "Only last 4 digits stored & encrypted in IDC Vault") + '</div>' +
        '</div>' +
      '</div></div>';
  }

  var revTimer = null;
  var revSeconds = 0;
  var revTick = null;
  var addDraftProvider = "nbe";
  var addDraftType = 0;

  function L(ar, en) { return typeof S !== "undefined" && S.lang === "en" ? en : ar; }
  function catLabel(k) { var c = CATS[k] || CATS.other; return L(c[0], c[1]); }
  function fmt(n) {
    return Math.abs(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function ensureBankState() {
    if (typeof S === "undefined") return null;
    if (!S.bk || !Array.isArray(S.bk.cards)) {
      var holder = ((S.p && S.p.n) || "IDC USER").toUpperCase().slice(0, 22);
      var isPreview = Boolean(S.preview);
      S.bk = {
        sel: 0,
        f: 0,
        hide: true,
        rev: false,
        iban: "",
        instapay: "",
        cards: isPreview ? [
          {
            bankId: "nbe", cls: "bk-skin-nbe-meeza", net: "meeza", tier: "ميزة", lim: { p: "month", a: 6000 },
            name: "البنك الأهلي المصري · ميزة", bank: "البنك الأهلي المصري", holder: holder, last4: "9100", exp: "09/28",
            open: 12500, frozen: false,
            tx: [
              { t: "d", a: 8500, n: "إيداع مرتب", d: "1 نوفمبر" },
              { t: "p", a: -645.5, n: "سوبر ماركت", d: "19 نوفمبر", c: "food" },
              { t: "w", a: -1000, n: "سحب من ATM", d: "21 نوفمبر", c: "other" }
            ]
          },
          {
            bankId: "bm", cls: "bk-skin-bm-gold", net: "VISA", tier: "Debit", lim: null,
            name: "بنك مصر · فيزا", bank: "بنك مصر", holder: holder, last4: "7390", exp: "03/29",
            open: 4200, frozen: false,
            tx: [
              { t: "p", a: -212, n: "مواصلات", d: "12 نوفمبر", c: "transport" },
              { t: "p", a: -899, n: "متجر أونلاين", d: "20 نوفمبر", c: "shop" }
            ]
          },
          {
            bankId: "telda", cls: "bk-skin-telda", net: "Mastercard", tier: "Prepaid", lim: null,
            name: "تيلدا (Telda) · ماستركارد", bank: "تيلدا (Telda)", holder: holder, last4: "1156", exp: "12/28",
            open: 1500, frozen: false,
            tx: [
              { t: "p", a: -149, n: "فاتورة اشتراك", d: "8 نوفمبر", c: "bills" }
            ]
          }
        ] : []
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

  function renderIbanCard(bk) {
    var hasIban = Boolean(bk.iban && String(bk.iban).trim());
    var hasIp = Boolean(bk.instapay && String(bk.instapay).trim());
    return '<div class="cd">' +
      '<div class="rw" style="padding:4px 0">' +
        '<div class="g">' +
          '<b style="display:block">IBAN / InstaPay</b>' +
          '<span class="mu" dir="ltr" style="font-size:12px;display:block">' + (hasIban ? esc(bk.iban) : L("لم يتم تسجيل رقم IBAN بعد", "No IBAN added yet")) + '</span>' +
          (hasIp ? '<span style="font-size:12px;color:var(--bl);font-weight:600" dir="ltr">InstaPay: ' + esc(bk.instapay) + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;gap:4px">' +
          (hasIban || hasIp ? '<button class="bt t" style="padding:0 8px" onclick="window.IDCBank.copyIban()">' + L("نسخ", "Copy") + '</button>' : '') +
          '<button class="bt o" style="height:34px;padding:0 12px" onclick="window.IDCBank.openIbanModal()">' + L("تعديل", "Edit") + '</button>' +
        '</div>' +
      '</div></div>';
  }

  function renderBankPage() {
    var bk = ensureBankState();
    var cs = bk.cards;
    var hasLegacyNile = cs.some(function (x) { return x && x.bank === "Nile Bank"; });

    var header = '<div class="bar" style="padding-top:0">' +
      '<button class="ib" aria-label="رجوع" onclick="pg=null;R()">' + mi("arrow_forward") + '</button>' +
      '<h2 style="font-size:21px;flex:1">' + L("الكارد بانك", "Card Bank") + '</h2>' +
      (cs.length ? '<button class="bt t" style="color:var(--rd);font-size:12.5px" onclick="window.IDCBank.clearAllCards(false)">' + L("مسح الكل", "Clear All") + '</button>' : '') +
      '<button class="bt" style="height:36px;padding:0 14px" onclick="pg={k:\'bank-add\'};R()">' + mi("add", 18) + " " + L("إضافة كارد", "Add Card") + "</button>" +
    "</div>";

    var legacyBanner = hasLegacyNile
      ? '<div class="cd" style="border:1.5px solid var(--yl);display:flex;align-items:center;gap:10px">' +
          '<div class="g"><b style="font-size:13.5px">' + L("توجد كروت تجريبية محفوظة سابقًا (Nile Bank)", "Sample Nile Bank cards detected") + '</b>' +
          '<div class="mu" style="font-size:12px">' + L("يمكنك مسحها بضغطة واحدة وإضافة كروتك البنكية أو كرت Telda الخاص بك.", "Clear them in one tap and add your own bank or Telda cards.") + '</div></div>' +
          '<button class="bt o" style="height:36px;padding:0 12px;color:var(--rd);border-color:var(--rd)" onclick="window.IDCBank.clearAllCards(false)">' + L("مسحها الآن", "Clear Now") + '</button>' +
        '</div>'
      : "";

    var ibanCard = renderIbanCard(bk);

    if (!cs.length) {
      return '<div class="idc-bk">' + header + ibanCard +
        '<div class="cd" style="text-align:center;padding:26px 18px">' +
          '<div class="ic" style="--c:var(--bl);width:52px;height:52px;margin:0 auto 10px">' + mi("credit_card", 28) + '</div>' +
          '<b style="font-size:17px;display:block;margin-bottom:6px">' + L("أضف كروتك البنكية وشركات الدفع", "Add Your Bank & Payment Cards") + '</b>' +
          '<div class="mu" style="font-size:13px;line-height:1.7;margin-bottom:16px">' +
            L("يدعم البنك الأهلي المصري، بنك مصر، CIB، QNB، بنك القاهرة، Telda، Klivvr، myFawry، InstaPay وغيرها — بتصميم كل بنك وشعاره، مع حفظ آخر 4 أرقام فقط بدون CVV.",
              "Supports NBE, Banque Misr, CIB, QNB, Telda, Klivvr, myFawry, InstaPay & more — with each bank's authentic look & logo, keeping only the last 4 digits.") +
          '</div>' +
          '<button class="bt w" onclick="pg={k:\'bank-add\'};R()">' + mi("add", 18) + " " + L("إضافة كارد جديد", "Add New Card") + "</button>" +
        '</div></div>';
    }

    if (bk.sel >= cs.length) bk.sel = 0;
    var c = cs[bk.sel];
    var inn = (c.tx || []).filter(function (x) { return x.a > 0; }).reduce(function (s, x) { return s + x.a; }, 0);
    var out = (c.tx || []).filter(function (x) { return x.a < 0; }).reduce(function (s, x) { return s - x.a; }, 0);

    var cardsHtml = '<div class="bk-fcw">' + cs.map(function (cardObj, idx) {
      return renderSingleCardVisual(cardObj, idx, idx === bk.sel, true);
    }).join("") + "</div>";

    var dots = '<div class="bk-dots">' + cs.map(function (_, i) { return '<i class="' + (i === bk.sel ? "on" : "") + '"></i>'; }).join("") + "</div>" +
      '<div class="mu" style="text-align:center;font-size:12px;margin-bottom:10px">' + L("اضغط على الكارد لقلبه أو اسحب لاختيار كارد آخر", "Tap the active card to flip or swipe to switch cards") + "</div>";

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

    var revealRow = (bk.hide && !bk.rev)
      ? '<div class="rw"><span>' + L("إظهار الرصيد (بالبصمة / Face ID لمدة 10 ثوانٍ)", "Show balance (Biometrics · 10s)") + '</span><button class="bt o" style="height:34px;padding:0 12px" onclick="window.IDCBank.revealBalance()">' + mi("fingerprint", 18) + " " + L("إظهار", "Show") + "</button></div>"
      : "";
    var hideRow = '<div class="rw"><span>' + L("إخفاء الرصيد تلقائيًا", "Hide balance") + '</span><button class="sw ' + (bk.hide ? "on" : "") + '" aria-label="Hide balance" onclick="window.IDCBank.toggleHide()"></button></div>';
    var freezeRow = '<div class="rw"><span>' + L("تجميد الكارد", "Freeze card") + '</span><button class="sw ' + (c.frozen ? "on" : "") + '" aria-label="Freeze card" onclick="window.IDCBank.toggleFreeze()"></button></div>';
    var removeRow = '<div class="rw"><span style="color:var(--rd)">' + L("حذف هذا الكارد من الحساب", "Remove this card") + '</span><button class="bt t" style="color:var(--rd)" onclick="window.IDCBank.removeCard()">' + L("إزالة الكارد", "Remove") + "</button></div>";

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
    }).join("") : '<div class="mu" style="text-align:center;padding:12px">' + L("لا توجد معاملات مسجلة لهذا الكارد بعد", "No transactions recorded yet") + "</div>") + "</div>";

    return '<div class="idc-bk">' + header + legacyBanner + ibanCard + cardsHtml + dots + expiryAlert + summaryCard + catCard + controlsCard +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:12px 2px 4px"><b>' + L("المعاملات", "Transactions") + '</b><button class="bt o" style="height:34px;padding:0 14px" onclick="window.IDCBank.openTxModal()">' + mi("add", 18) + " " + L("إضافة معاملة", "Add Transaction") + "</button></div>" +
      chipsHtml + txHtml + "</div>";
  }

  function renderBankAddPage() {
    var header = '<div class="bar" style="padding-top:0"><button class="ib" aria-label="رجوع" onclick="pg={k:\'bank\'};R()">' + mi("arrow_forward") + '</button><h2 style="font-size:21px">' + L("إضافة كارد بنك أو شركة دفع", "Add Bank / Payment Card") + "</h2></div>";
    var prov = findProvider(addDraftProvider);
    var ct = CARD_TYPES[addDraftType] || CARD_TYPES[0];
    var holderDefault = ((S.p && S.p.n) || "CARDHOLDER NAME").toUpperCase();

    var previewCard = renderSingleCardVisual({
      bankId: prov.id,
      bank: prov.id === "other" ? L("اسم البنك", "BANK NAME") : prov.ar,
      net: ct.net,
      tier: S.lang === "en" ? ct.tierEn : ct.tier,
      holder: holderDefault,
      last4: "0000",
      exp: "08/29"
    }, 0, false, false);

    var providerChips = '<div class="bk-pgrid">' + PROVIDERS.map(function (p) {
      var isOn = p.id === prov.id;
      return '<button type="button" class="bk-pbtn' + (isOn ? " on" : "") + '" onclick="window.IDCBank.setDraftProvider(\'' + p.id + '\')">' +
        '<span class="bk-pdot" style="background:' + p.dot + '"></span>' +
        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(L(p.ar, p.en)) + '</span>' +
      '</button>';
    }).join("") + '</div>';

    var provSelectOpts = PROVIDERS.map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === prov.id ? " selected" : "") + '>' + esc(L(p.ar, p.en)) + '</option>';
    }).join("");

    var typeOpts = CARD_TYPES.map(function (t, i) {
      return '<option value="' + i + '"' + (i === addDraftType ? " selected" : "") + '>' + (S.lang === "en" ? t.en : t.ar) + "</option>";
    }).join("");

    return '<div class="idc-bk">' + header +
      '<div style="margin:4px 0 14px;display:flex;justify-content:center">' + previewCard + '</div>' +
      '<div class="nt" style="margin:0 0 12px">' + L("يتم الاحتفاظ بآخر 4 أرقام فقط لعرض شكل الكارد، ولا يتم حفظ الرقم الكامل أو رمز CVV أبدًا.", "Only the last 4 digits are kept to display your card. Full card number and CVV are never stored.") + "</div>" +
      '<div class="cd">' +
        '<div class="mu" style="font-size:12px;font-weight:700">' + L("اختر البنك أو شركة الدفع (يتغيّر التصميم والشعار تلقائيًا)", "Choose Bank or Payment App (Card design & logo adapt automatically)") + '</div>' +
        providerChips +
        '<select id="bkProvider" style="margin-top:2px" onchange="window.IDCBank.setDraftProvider(this.value)">' + provSelectOpts + '</select>' +
        (prov.id === "other" ? fld("bkBank", L("اسم البنك أو شركة الدفع", "Custom Bank / Provider Name"), { v: "" }) : "") +
        '<div class="mu" style="font-size:12px;margin-top:12px">' + L("شبكة ونوع الكارد", "Card network & type") + '</div>' +
        '<select id="bkType" style="margin-top:4px" onchange="window.IDCBank.setDraftType(this.value)">' + typeOpts + "</select>" +
        fld("bkHolder", L("الاسم المطبوع على الكارد", "Cardholder name"), { v: holderDefault, d: "ltr" }) +
        fld("bkNum", L("رقم الكارد (16 رقمًا — يُحفظ آخر 4 فقط)", "Card number (16 digits — only last 4 kept)"), { d: "ltr", m: 19 }) +
        fld("bkExp", L("تاريخ الانتهاء (MM/YY)", "Expiry (MM/YY)"), { d: "ltr", m: 5 }) +
        fld("bkOpen", L("الرصيد الافتتاحي لتتبّع المصاريف (اختياري)", "Opening balance for expense tracking (optional)"), { d: "ltr", v: "0" }) +
        '<div class="err" id="bkAddErr"></div>' +
        '<button class="bt w" style="margin-top:12px" onclick="window.IDCBank.saveNewCard()">' + L("حفظ وإضافة الكارد", "Save & Add Card") + "</button>" +
      "</div></div>";
  }

  window.IDCBank = {
    getProviders: function () {
      return PROVIDERS.slice();
    },
    getCards: function () {
      var bk = ensureBankState();
      return bk ? bk.cards : [];
    },
    setDraftProvider: function (id) {
      addDraftProvider = id || "nbe";
      R();
    },
    setDraftType: function (idx) {
      addDraftType = Number(idx) || 0;
      R();
    },
    copyIban: function () {
      var bk = ensureBankState();
      var txt = bk.iban || bk.instapay || "";
      if (txt && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).catch(function () {});
      }
      tst(L("تم النسخ بنجاح ✓", "Copied ✓"));
    },
    saveIbanValues: function (ibanVal, instapayVal) {
      var bk = ensureBankState();
      bk.iban = String(ibanVal == null ? "" : ibanVal).trim().slice(0, 64);
      bk.instapay = String(instapayVal == null ? "" : instapayVal).trim().slice(0, 80);
      sv();
      R();
    },
    openIbanModal: function () {
      var bk = ensureBankState();
      var ov = openModal(
        '<h3 style="margin:0 0 10px">' + L("تعديل الـ IBAN وعنوان InstaPay", "Edit IBAN & InstaPay Address") + '</h3>' +
        fld("bkIbanInp", L("رقم الحساب الدولي (IBAN)", "IBAN"), { d: "ltr", v: bk.iban || "" }) +
        fld("bkIpInp", L("عنوان InstaPay (مثل name@instapay)", "InstaPay Address (e.g. name@instapay)"), { d: "ltr", v: bk.instapay || "" }) +
        '<div class="ar" style="margin-top:14px;gap:8px">' +
          '<button class="bt t" id="bkIbCancel">' + L("إلغاء", "Cancel") + '</button>' +
          '<button class="bt" id="bkIbSave">' + L("حفظ", "Save") + '</button>' +
        '</div>'
      );
      ov.querySelector("#bkIbCancel").onclick = function () { ov.remove(); };
      ov.querySelector("#bkIbSave").onclick = function () {
        var ib = ov.querySelector("#bkIbanInp").value;
        var ip = ov.querySelector("#bkIpInp").value;
        ov.remove();
        window.IDCBank.saveIbanValues(ib, ip);
        tst(L("تم حفظ بيانات IBAN و InstaPay ✓", "IBAN & InstaPay saved ✓"));
      };
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
    removeCardAt: function (idx, skipConfirm) {
      var bk = ensureBankState();
      if (idx < 0 || idx >= bk.cards.length) return;
      if (!skipConfirm && !confirm(L("هل تريد إزالة هذا الكارد من حسابك؟", "Remove this card from your account?"))) return;
      bk.cards.splice(idx, 1);
      if (bk.sel >= bk.cards.length) bk.sel = Math.max(0, bk.cards.length - 1);
      sv(); R();
      tst(L("تمت إزالة الكارد", "Card removed"));
    },
    removeCard: function () {
      var bk = ensureBankState();
      window.IDCBank.removeCardAt(bk.sel, false);
    },
    clearAllCards: function (skipConfirm) {
      var bk = ensureBankState();
      if (!bk.cards.length) return;
      if (!skipConfirm && !confirm(L("هل تريد مسح جميع الكروت المحفوظة والبدء من جديد؟", "Clear all saved cards and start fresh?"))) return;
      bk.cards = [];
      bk.sel = 0;
      clearRevTimers();
      sv(); R();
      tst(L("تم مسح جميع الكروت", "All cards cleared"));
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
      var provVal = v("bkProvider") || addDraftProvider || "nbe";
      var prov = findProvider(provVal);
      var idx = Number(v("bkType") || addDraftType || 0);
      var ct = CARD_TYPES[idx] || CARD_TYPES[0];
      var customBank = v("bkBank");
      var bankLabel = prov.id === "other" ? customBank : prov.ar;
      var holder = v("bkHolder");
      var num = v("bkNum").replace(/\s+/g, "");
      var exp = v("bkExp");
      var openBal = parseFloat(v("bkOpen") || "0") || 0;
      var er = document.getElementById("bkAddErr");
      if (!bankLabel || !holder || !/^\d{16}$/.test(num)) {
        if (er) er.textContent = L("يرجى اختيار البنك وإدخال الاسم ورقم كارد مكوّن من 16 رقمًا.", "Select a bank, enter holder name, and a 16-digit card number.");
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) {
        if (er) er.textContent = L("أدخل تاريخ الانتهاء بصيغة MM/YY.", "Use MM/YY expiry format.");
        return;
      }
      var skin = resolveSkin(prov.id, ct.net);
      bk.cards.push({
        bankId: prov.id,
        cls: skin.cls,
        net: ct.net,
        tier: ct.tier,
        name: bankLabel + " · " + ct.ar,
        bank: bankLabel,
        holder: holder.toUpperCase().slice(0, 24),
        last4: num.slice(-4),
        exp: exp,
        open: openBal,
        frozen: false,
        lim: null,
        tx: []
      });
      bk.sel = bk.cards.length - 1;
      pg = { k: "bank" };
      sv(); R();
      tst(L("تمت إضافة الكارد بنجاح ✓", "Card added ✓"));
    }
  };

  var _basePage = window.page;
  window.page = function () {
    if (pg && pg.k === "bank") return renderBankPage();
    if (pg && pg.k === "bank-add") return renderBankAddPage();
    return _basePage();
  };
})();
