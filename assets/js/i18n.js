/* ==========================================================================
   Interface translation.

   The language picker used to only save a choice and reload, which changed
   nothing. This applies real translations in place, with no reload.

   Mark up markup with:
     data-i18n="key"              -> replaces textContent
     data-i18n-html="key"         -> replaces innerHTML (for text with links)
     data-i18n-attr="placeholder:key,aria-label:key"

   Strings with counts in them use tf('key', { n: 5 }) and {n} in the table.

   Scripts that render their own markup should call t('key') and listen for
   the 'languagechange' event to re-render.

   Exam questions stay in Japanese - that is the language being tested.
   ========================================================================== */
(function (global) {
  "use strict";

  var STORE = "jlpt-language";
  var DEFAULT = "en";

  /* Right-to-left languages would need dir="rtl"; none of ours are. */
  var LANGUAGES = ["en", "ja", "ne", "vi", "id", "fil", "si", "hi",
                   "pt-BR", "zh", "ko", "bn"];

  var STRINGS = {};   // filled by i18n-strings.js

  function current() {
    var saved = null;
    try { saved = localStorage.getItem(STORE); } catch (e) { /* private mode */ }
    return LANGUAGES.indexOf(saved) === -1 ? DEFAULT : saved;
  }

  /* Look a key up in the active language, falling back to English so a
     missing translation shows real text rather than the raw key. */
  function t(key, lang) {
    lang = lang || current();
    var table = STRINGS[lang];
    if (table && table[key] != null) return table[key];
    var en = STRINGS[DEFAULT];
    if (en && en[key] != null) return en[key];
    return key;
  }

  /* t() with {placeholders} filled in, so a translator can move the number
     to wherever it belongs in their sentence. */
  function tf(key, vars) {
    var text = t(key);
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, function (whole, name) {
      return vars[name] != null ? String(vars[name]) : whole;
    });
  }

  function applyTo(scope) {
    scope = scope || document;

    scope.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });

    scope.querySelectorAll("[data-i18n-html]").forEach(function (node) {
      node.innerHTML = t(node.getAttribute("data-i18n-html"));
    });

    scope.querySelectorAll("[data-i18n-attr]").forEach(function (node) {
      node.getAttribute("data-i18n-attr").split(",").forEach(function (pair) {
        var bits = pair.split(":");
        if (bits.length === 2) {
          node.setAttribute(bits[0].trim(), t(bits[1].trim()));
        }
      });
    });
  }

  function setLanguage(lang) {
    if (LANGUAGES.indexOf(lang) === -1) lang = DEFAULT;
    try { localStorage.setItem(STORE, lang); } catch (e) { /* ignore */ }

    document.documentElement.setAttribute("lang", lang);
    applyTo(document);

    document.querySelectorAll("#languageSelect").forEach(function (sel) {
      sel.value = lang;
    });

    /* Pages that build their markup in JS listen for this and re-render. */
    document.dispatchEvent(new CustomEvent("languagechange", {
      detail: { lang: lang }
    }));
  }

  function init() {
    var lang = current();
    document.documentElement.setAttribute("lang", lang);
    applyTo(document);

    document.querySelectorAll("#languageSelect").forEach(function (sel) {
      sel.value = lang;
      sel.addEventListener("change", function () {
        setLanguage(sel.value);
      });
    });
  }

  global.I18N = {
    t: t,
    tf: tf,
    current: current,
    setLanguage: setLanguage,
    apply: applyTo,
    init: init,
    languages: LANGUAGES,
    register: function (lang, table) { STRINGS[lang] = table; }
  };

  /* Short global aliases - the page scripts use t('key') directly. */
  global.t = t;
  global.tf = tf;
})(window);
