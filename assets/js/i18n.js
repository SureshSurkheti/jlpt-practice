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

  /* Pages are pre-rendered at several depths - /index.html, /ne/index.html,
     /study/n5-words.html, /ne/study/n5-words.html - so a data file cannot be
     fetched by a path relative to the page. Work out how far down we are once
     and let every script prefix its fetches with it. */
  var ROOT = (function () {
    var dir = location.pathname.replace(/\/[^/]*$/, "/");
    var depth = dir.split("/").length - 2;
    return depth > 0 ? new Array(depth + 1).join("../") : "";
  })();

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

  /* Every language has its own address now (English at the root, the rest
     under /<lang>/), so the picker navigates instead of just re-rendering.
     Without this the translated pages would exist for crawlers but be
     unreachable by clicking. */
  function urlFor(lang) {
    var path = location.pathname;
    var known = LANGUAGES.filter(function (l) { return l !== DEFAULT; });

    for (var i = 0; i < known.length; i++) {
      var pre = "/" + known[i];
      if (path === pre || path.indexOf(pre + "/") === 0) {
        path = path.slice(pre.length) || "/";
        break;
      }
    }
    if (lang !== DEFAULT) path = "/" + lang + (path === "/" ? "/" : path);
    return path + location.search + location.hash;
  }

  function setLanguage(lang) {
    if (LANGUAGES.indexOf(lang) === -1) lang = DEFAULT;
    try { localStorage.setItem(STORE, lang); } catch (e) { /* ignore */ }

    /* Only move if there is somewhere to move to: the pre-rendered pages sit
       at fixed paths, so a page opened from the file system or a path this
       build does not produce just re-renders in place as before. */
    var target = urlFor(lang);
    if (location.protocol.indexOf("http") === 0 &&
        target !== location.pathname + location.search + location.hash) {
      location.assign(target);
      return;
    }

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
    /* The address decides the language, not the saved preference. Each page
       is pre-rendered in one language and says so in <html lang>; if someone
       arrives on the English URL from a search while their last choice was
       Nepali, honouring the preference would repaint half the page into a
       language the URL and the canonical tag both disagree with. Sync the
       preference to the page instead. */
    var marked = (document.documentElement.getAttribute("lang") || "").trim();
    var lang = LANGUAGES.indexOf(marked) !== -1 ? marked : current();
    if (lang !== current()) {
      try { localStorage.setItem(STORE, lang); } catch (e) { /* ignore */ }
    }

    document.documentElement.setAttribute("lang", lang);
    applyTo(document);

    document.querySelectorAll("#languageSelect").forEach(function (sel) {
      sel.value = lang;
      sel.addEventListener("change", function () {
        setLanguage(sel.value);
      });
    });
  }

  global.SITE_ROOT = ROOT;

  global.I18N = {
    root: ROOT,
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
