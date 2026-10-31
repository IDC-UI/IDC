(function () {
  "use strict";

  var SEEN_KEY = "idc_intro_seen_v1";
  var LANGUAGE_KEY = "idc_intro_language";
  var authReturn = new URLSearchParams(location.search).has("code") ||
    /access_token=|type=recovery|error_description=/.test(location.hash);
  var emergencyCard = /^#e=/.test(location.hash);
  var seen = false;

  try {
    seen = localStorage.getItem(SEEN_KEY) === "1";
  } catch (error) {
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch (ignored) {}
  }
  if (seen || authReturn || emergencyCard) return;

  function language() {
    var preferred = "";
    try { preferred = localStorage.getItem(LANGUAGE_KEY) || ""; } catch (error) {}
    preferred = preferred || (window.S && S.lang) ||
      (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    return String(preferred).toLowerCase().indexOf("ar") === 0 ? "ar" : "en";
  }

  var currentLanguage = language();
  var originalRender = window.R;

  function iconMarkup() {
    return '<svg viewBox="0 0 512 512" role="img" aria-label="IDC digital identity card">' +
      '<defs><filter id="idc-intro-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#34409b" flood-opacity=".22"/></filter></defs>' +
      '<g transform="rotate(4 255 165)"><g class="idc-intro-card"><g class="idc-intro-float"><rect x="120" y="85" width="272" height="160" rx="14" fill="var(--intro-navy)" filter="url(#idc-intro-shadow)"/><g class="idc-intro-pop" style="animation-delay:.9s"><circle cx="176" cy="127" r="15" fill="none" stroke="var(--intro-soft)" stroke-width="9"/></g><path class="idc-intro-pop" style="animation-delay:1s" d="M143 180a33 33 0 0 1 66 0z" fill="var(--intro-soft)"/><rect class="idc-intro-bar" style="animation-delay:1.1s" x="246" y="117" width="122" height="20" rx="10" fill="#fff"/><rect class="idc-intro-bar" style="animation-delay:1.25s" x="240" y="148" width="82" height="14" rx="7" fill="var(--intro-soft)"/><rect class="idc-intro-bar" style="animation-delay:1.4s" x="133" y="195" width="222" height="14" rx="7" fill="var(--intro-soft)"/></g></g></g>' +
      '<g><path class="idc-intro-arc" style="animation-delay:1.8s" d="M416.9 222.2A24 24 0 0 1 416.9 251.8"/><path class="idc-intro-arc" style="animation-delay:2s" d="M434.2 208.7A46 46 0 0 1 434.2 265.3"/><path class="idc-intro-arc" style="animation-delay:2.2s" d="M451.6 195.1A68 68 0 0 1 451.6 278.9"/></g>' +
      '<g fill="var(--intro-navy)" font-size="104" font-weight="800" text-anchor="middle" font-family="Cairo,system-ui,sans-serif"><text class="idc-intro-letter" style="animation-delay:1.5s" x="178" y="438">I</text><text class="idc-intro-letter" style="animation-delay:1.65s" x="256" y="438">D</text><text class="idc-intro-letter" style="animation-delay:1.8s" x="338" y="438">C</text></g></svg>';
  }

  function markup() {
    var english = '<p class="idc-intro-en">Made to know you, built to protect you.</p><p class="idc-intro-en">Your identity, ready when you need it.</p>';
    var arabic = '<p class="idc-intro-ar" dir="rtl">اتعمل عشان يعرفك، واتبنى عشان يحميك</p><p class="idc-intro-ar" dir="rtl">هويتك ووثائقك جاهزة وقت ما تحتاجيها</p>';
    return '<section class="idc-intro" id="idc-first-intro" data-ui="' + currentLanguage + '" lang="' + currentLanguage + '" dir="' + (currentLanguage === "ar" ? "rtl" : "ltr") + '" aria-label="IDC welcome">' +
      '<div class="language" role="group" aria-label="Language"><button type="button" data-language="ar" aria-pressed="' + (currentLanguage === "ar") + '" onclick="window.idcIntroSetLanguage(\'ar\')">عربي</button><button type="button" data-language="en" aria-pressed="' + (currentLanguage === "en") + '" onclick="window.idcIntroSetLanguage(\'en\')">EN</button></div>' +
      '<div class="idc-intro-stage" id="idc-intro-stage">' + iconMarkup() + '</div>' +
      '<div class="idc-intro-tag">' + english + arabic + '</div>' +
      '<div class="idc-intro-actions"><button type="button" onclick="window.idcIntroChoose(\'signup\')">' + (currentLanguage === "ar" ? "ابدئي الآن" : "Get started") + '</button><button type="button" class="secondary" onclick="window.idcIntroChoose(\'login\')">' + (currentLanguage === "ar" ? "لديّ حساب" : "I have an account") + '</button><button type="button" class="preview" onclick="window.idcIntroChoose(\'preview\')">' + (currentLanguage === "ar" ? "معاينة بدون تسجيل" : "Preview without signing in") + '</button></div>' +
      '<button class="replay" type="button" aria-label="Replay intro" onclick="window.idcIntroReplay()">' + (currentLanguage === "ar" ? "إعادة" : "Replay") + '</button></section>';
  }

  function rememberIntro() {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (error) {
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (ignored) {}
    }
  }

  function showIntro() {
    if (!document.getElementById("idc-first-intro")) {
      document.getElementById("app").insertAdjacentHTML("beforeend", markup());
    }
  }

  window.idcIntroSetLanguage = function (nextLanguage) {
    currentLanguage = nextLanguage === "ar" ? "ar" : "en";
    try { localStorage.setItem(LANGUAGE_KEY, currentLanguage); } catch (error) {}
    var intro = document.getElementById("idc-first-intro");
    if (intro) {
      intro.dataset.ui = currentLanguage;
      intro.lang = currentLanguage;
      intro.dir = currentLanguage === "ar" ? "rtl" : "ltr";
      intro.querySelectorAll("[data-language]").forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
      });
      var actions = intro.querySelector(".idc-intro-actions");
      actions.children[0].textContent = currentLanguage === "ar" ? "ابدئي الآن" : "Get started";
      actions.children[1].textContent = currentLanguage === "ar" ? "لديّ حساب" : "I have an account";
      actions.children[2].textContent = currentLanguage === "ar" ? "معاينة بدون تسجيل" : "Preview without signing in";
      intro.querySelector(".replay").textContent = currentLanguage === "ar" ? "إعادة" : "Replay";
    }
  };

  window.idcIntroChoose = function (choice) {
    rememberIntro();
    seen = true;
    if (window.S) S.lang = currentLanguage;
    var intro = document.getElementById("idc-first-intro");
    if (intro) intro.remove();
    if (choice === "preview") {
      window.loadSample();
      return;
    }
    window.land = false;
    window.au = { m: choice === "login" ? "login" : "su", d: {} };
    window.err = "";
    window.R();
  };

  window.idcIntroReplay = function () {
    var stage = document.getElementById("idc-intro-stage");
    var tag = document.querySelector("#idc-first-intro .idc-intro-tag");
    var actions = document.querySelector("#idc-first-intro .idc-intro-actions");
    if (!stage || !tag || !actions) return;
    [stage, tag, actions].forEach(function (element) {
      var content = element.innerHTML;
      element.innerHTML = "";
      void element.offsetWidth;
      element.innerHTML = content;
    });
  };

  window.R = function () {
    if (document.getElementById("idc-first-intro")) return;
    originalRender();
    if (!seen) showIntro();
  };
  window.R();
})();
