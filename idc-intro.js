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
    return '<img class="idc-intro-logo" src="icon-512.png" alt="IDC">';
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
