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

  var OFFER_STORE = STORE + ".offer";   /* shown once, then never again */
  var DEFAULT = "en";
  var SWITCH_MARK = "jlpt.langswitch";

  /* Changing language is a navigation - each language is a real address - so
     a page that had built something on screen comes back from scratch at the
     new one. A paper in progress was the case that showed it: switching
     language mid-paper reloaded /ja/exam.html?id=... and the player, seeing
     an ordinary arrival, opened the setup screen instead of the paper. The
     address was right and the reader's place was gone.

     setLanguage() leaves this mark and the flag is read once, here, as the
     next page starts - not by whoever happens to want it. Reading it lazily
     would leave it set on any page that did not ask, and the next arrival at
     a paper, by whatever route, would resume unasked. sessionStorage keeps it
     to this tab. */
  var CAME_FROM_SWITCH = (function () {
    try {
      if (sessionStorage.getItem(SWITCH_MARK)) {
        sessionStorage.removeItem(SWITCH_MARK);
        return true;
      }
    } catch (e) { /* private mode: the language still switches */ }
    return false;
  })();

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

  /* The contact address is written into every page by the build, so it is
     defined in exactly one place (CONTACT_EMAIL in tools/build_static.py)
     and the translation tables carry a token instead of twelve copies of an
     email address that would drift the day it changed. */
  function contact() {
    return global.SITE_CONTACT || "";
  }

  /* Substituted on the way out of the table rather than at each call site:
     the rights paragraph is the one string that carries it, and it is the
     one string that must never render wrong. */
  function fillTokens(value) {
    if (typeof value !== "string") return value;

    /* How many papers there are, from the count the generator writes into
       every page. It used to be typed into the sentence in each of the
       twelve languages, so adding a paper silently made all twelve wrong -
       and it did: the home page still read "86 practice papers" with 87 of
       them in the library. A number that describes the data belongs to the
       data. */
    if (value.indexOf("%%PAPERS%%") !== -1) {
      var counts = global.SITE_COUNTS || {};
      value = value.replace(/%%PAPERS%%/g,
        counts.papers != null ? String(counts.papers) : "");
    }

    /* Same reasoning for the split: how many papers are ours and how many
       came from the archive is a fact about the data, and the About page
       says it in twelve languages. */
    if (value.indexOf("%%OWN%%") !== -1 || value.indexOf("%%ARCHIVED%%") !== -1) {
      var c = global.SITE_COUNTS || {};
      value = value.replace(/%%OWN%%/g, c.own != null ? String(c.own) : "")
                   .replace(/%%ARCHIVED%%/g,
                            c.archived != null ? String(c.archived) : "");
    }

    if (value.indexOf("%%CONTACT%%") === -1) return value;
    var email = contact();
    /* With no address to put in, leave the sentence intact and drop the
       broken mailto rather than printing a placeholder at a rights holder. */
    if (!email) {
      return value.replace(/<a[^>]*>%%CONTACT%%<\/a>/g, "")
                  .replace(/%%CONTACT%%/g, "");
    }
    return value.replace(/%%CONTACT%%/g, email);
  }

  /* Look a key up in the active language, falling back to English so a
     missing translation shows real text rather than the raw key. */
  function t(key, lang) {
    lang = lang || current();
    var table = STRINGS[lang];
    if (table && table[key] != null) return fillTokens(table[key]);
    var en = STRINGS[DEFAULT];
    if (en && en[key] != null) return fillTokens(en[key]);
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

  /* A paper's period, in the reader's language: "July 2011", "Practice Test
     3". The label in the JSON is written once, in English, because the file
     names and the search index are built from it; this is the only place it
     is turned into something to read. Anything that does not match either
     shape is passed through, so an unrecognised label degrades to the
     English it already was rather than to a raw key. */
  function paperPeriod(exam) {
    var label = (exam && exam.periodLabel) || "";
    var m = /^(July|December)\s+(\d{4})$/.exec(label);
    if (m) return tf("paper." + m[1].toLowerCase(), { y: m[2] });
    m = /^Practice Test\s+(\d+)$/.exec(label);
    if (m) return tf("paper.practiceTest", { n: m[1] });
    return label;
  }

  /* The paper's full name: "JLPT N2 — Practice Test 3". */
  function paperName(exam) {
    if (!exam) return "";
    return tf("paper.name", { lv: exam.level, period: paperPeriod(exam) });
  }

  /* Grouped for the page's language, not the browser's. Without the argument
     toLocaleString() asks the browser, so the English page rendered "20.346
     practice questions" to anyone whose phone was set to Vietnamese - a
     number an English reader reads as twenty-point-three. The page says what
     language it is in; that is the one to format for. */
  function groupNum(n) {
    var lang = (document.documentElement.getAttribute("lang") || "").trim();
    try { return Number(n).toLocaleString(lang || undefined); }
    catch (e) { return String(n); }
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
      try { sessionStorage.setItem(SWITCH_MARK, "1"); } catch (e) { /* ignore */ }
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

  /* ----------------------------------------------------------------------
     Offering the reader their own language.

     Every page exists in twelve languages and the reader had to find that
     out. The picker is in the header and the names are in the footer, but
     somebody who cannot read the English around them is exactly the person
     least likely to go looking - and a good share of the people this site
     is for are living in Japan reading Nepali, Vietnamese or Indonesian.

     An offer, not a redirect. Sending people to another URL on the strength
     of Accept-Language is the one thing Google asks sites not to do - it
     traps a crawler in whichever language it happened to look like, and it
     takes the choice away from anyone who wanted the English. So the page
     stays where it is and a bar appears at the foot of the screen with a
     link to the same page in their language, once, dismissible.

     The bar is fixed rather than inserted into the flow: pushing the page
     down after load is a layout shift, and this site measures 0.

     The strings live here rather than in the language tables because the
     whole point is to say it in a language whose table is NOT loaded - the
     page ships its own and English, and nothing else. Twelve short lines
     is a much smaller price than fetching a whole table to ask a question.
     ---------------------------------------------------------------------- */

  var OFFER = {
    en:      ["Read this site in English", "Dismiss", "English"],
    ja:      ["このサイトを日本語で読む", "閉じる", "日本語"],
    ne:      ["यो साइट नेपालीमा पढ्नुहोस्", "बन्द गर्नुहोस्", "नेपाली"],
    vi:      ["Đọc trang này bằng Tiếng Việt", "Đóng", "Tiếng Việt"],
    id:      ["Baca situs ini dalam Bahasa Indonesia", "Tutup", "Bahasa Indonesia"],
    fil:     ["Basahin ang site na ito sa Filipino", "Isara", "Filipino"],
    si:      ["මෙම වෙබ් අඩවිය සිංහලෙන් කියවන්න", "වසන්න", "සිංහල"],
    hi:      ["इस साइट को हिन्दी में पढ़ें", "बंद करें", "हिन्दी"],
    "pt-BR": ["Leia este site em Português", "Fechar", "Português (Brasil)"],
    zh:      ["用中文阅读本站", "关闭", "中文"],
    ko:      ["이 사이트를 한국어로 보기", "닫기", "한국어"],
    bn:      ["এই সাইটটি বাংলায় পড়ুন", "বন্ধ করুন", "বাংলা"]
  };

  /* What the browser asks for, in the tags this site actually has. Region
     is dropped (ne-NP is Nepali), and the three that do not map by prefix
     are named: Portuguese is only published as pt-BR, Chinese only as one
     table, and Filipino answers to Tagalog's old code as well. */
  var LANG_ALIAS = { pt: "pt-BR", tl: "fil", in: "id" };

  function preferredLanguage() {
    var asked = (global.navigator && (navigator.languages ||
                 [navigator.language || navigator.userLanguage])) || [];
    for (var i = 0; i < asked.length; i++) {
      var tag = String(asked[i] || "").toLowerCase();
      var base = tag.split("-")[0];
      /* Both sides lowered: the alias table answers "pt" with "pt-BR", and
         comparing that to a lowered tag list is how a Portuguese reader
         from Portugal was offered nothing at all. */
      var candidates = [tag, String(LANG_ALIAS[base] || base).toLowerCase()];
      for (var j = 0; j < candidates.length; j++) {
        for (var k = 0; k < LANGUAGES.length; k++) {
          if (LANGUAGES[k].toLowerCase() === candidates[j]) return LANGUAGES[k];
        }
      }
    }
    return null;
  }

  function offerLanguage(pageLang) {
    /* Not on the player. It is a timed, single-page task with its own
       controls pinned to the bottom of the screen, and every route into it
       passes through a page where this bar has already had its say. */
    if (/\/exam\.html$/.test(location.pathname)) return;
    try { if (localStorage.getItem(OFFER_STORE)) return; } catch (e) { return; }

    /* Their own choice first, and the browser's only if they have not made
       one. Somebody who picked Nepali last week and arrives on an English
       page from a search is being offered Nepali, which is right. */
    var saved = null;
    try { saved = localStorage.getItem(STORE); } catch (e) { /* ignore */ }
    var want = (LANGUAGES.indexOf(saved) !== -1 && saved !== pageLang)
      ? saved : preferredLanguage();
    if (!want || want === pageLang || !OFFER[want]) return;

    var words = OFFER[want];
    var bar = document.createElement("div");
    bar.className = "lang-offer";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", words[0]);
    bar.lang = want;

    var link = document.createElement("a");
    link.className = "lang-offer-go";
    link.href = urlFor(want);
    link.textContent = words[0];
    /* Following it is a choice, so record it: the picker in the header
       should agree with the page they land on. */
    link.addEventListener("click", function () {
      try {
        localStorage.setItem(STORE, want);
        localStorage.setItem(OFFER_STORE, "taken");
      } catch (e) { /* ignore */ }
    });

    var close = document.createElement("button");
    close.type = "button";
    close.className = "lang-offer-close";
    close.setAttribute("aria-label", words[1]);
    close.textContent = "\u2715";
    close.addEventListener("click", function () {
      try { localStorage.setItem(OFFER_STORE, "dismissed"); } catch (e) { /* ignore */ }
      bar.remove();
    });

    bar.appendChild(link);
    bar.appendChild(close);
    document.body.appendChild(bar);
    /* One frame later, so the transition has a start to run from. */
    requestAnimationFrame(function () { bar.classList.add("is-in"); });
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

    /* Not on the way back from the picker: they have just chosen, and being
       asked again on arrival would read as the choice not having taken. */
    if (!CAME_FROM_SWITCH) offerLanguage(lang);
  }

  global.SITE_ROOT = ROOT;

  global.I18N = {
    root: ROOT,
    t: t,
    tf: tf,
    groupNum: groupNum,
    paperPeriod: paperPeriod,
    paperName: paperName,
    current: current,
    setLanguage: setLanguage,
    apply: applyTo,
    init: init,
    languages: LANGUAGES,
    /* True when this page load is the far side of a language switch. */
    switched: function () { return CAME_FROM_SWITCH; },
    register: function (lang, table) { STRINGS[lang] = table; }
  };

  /* Short global aliases - the page scripts use t('key') directly. */
  global.t = t;
  global.tf = tf;
  global.groupNum = groupNum;
  global.paperPeriod = paperPeriod;
  global.paperName = paperName;
})(window);
