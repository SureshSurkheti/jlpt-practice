/* ==========================================================================
   N5 / N4 study lists - vocabulary and grammar.

   Two levels, two kinds of list, one search box. Everything is read from
   data/words/<level>.json and data/grammar/<level>.json, which the build
   scripts generate, so nothing here needs touching when the lists grow.

   Rows are rendered in one pass into a document fragment: N5 alone is 757
   words, and appending them one at a time visibly janks on a phone.
   ========================================================================== */
(function () {
  "use strict";

  var host = document.getElementById("studyContent");
  if (!host) return;

  /* Read the starting list off the markup rather than assuming N5. Each of
     the ten pre-rendered pages (/study/n1-grammar.html and friends) ships
     with its own level and kind already marked on the tabs, and hard-coding
     N5 here meant every one of them painted its real content, then replaced
     it with N5 vocabulary the moment this script ran. */
  function tabOn(attr, fallback) {
    var on = document.querySelector(".study-tab.is-on[data-" + attr + "]");
    return on ? on.getAttribute("data-" + attr) : fallback;
  }

  var state = {
    level: tabOn("level", "N5"),
    kind: tabOn("kind", "words"),
    query: ""
  };
  var cache = {};          // "words:N5" -> rows

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function key() { return state.kind + ":" + state.level; }

  function load() {
    if (cache[key()]) { render(); return; }

    /* The generator already wrote this list into the page. Search and the
       language picker both need the parsed rows, so the fetch still happens,
       but blanking real content to a spinner for the length of one request
       is a flash of nothing for no gain. Leave what is there. */
    if (!host.querySelector(".study-row")) {
      host.innerHTML =
        '<div class="exam-loading"><div class="spinner"></div></div>';
    }

    var FIELD = { words: "words", grammar: "patterns", kanji: "kanji" };
    fetch(SITE_ROOT + "data/" + state.kind + "/" +
          state.level.toLowerCase() + ".json",
          { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (d) {
        cache[key()] = d[FIELD[state.kind]];
        render();
      })
      .catch(function () {
        host.innerHTML = '<p class="stats-empty">' + esc(t("study.unavailable")) +
          "</p>";
      });
  }

  function matches(row) {
    if (!state.query) return true;
    var hay;
    if (state.kind === "words") {
      hay = [row.w, row.r, row.romaji, row.en];
    } else if (state.kind === "kanji") {
      hay = [row.k, row.en.join(" "), row.on.join(" "), row.kun.join(" "),
             row.ex.map(function (e) { return e.w + " " + e.en; }).join(" ")];
    } else {
      hay = [row.p, row.en, row.ne, row.ja, row.ex];
    }
    return hay.join(" ").toLowerCase().indexOf(state.query) !== -1;
  }

  function render() {
    var rows = (cache[key()] || []).filter(matches);

    if (!rows.length) {
      host.innerHTML = '<p class="stats-empty">' + esc(t("exams.noMatch")) + "</p>";
      return;
    }

    var HEAD = {
      words: ["study.colWord", "study.colReading", "study.colMeaning"],
      grammar: ["study.colPattern", "study.colMeaning", "study.colExample"],
      kanji: ["study.kanji", "study.colReading", "study.colMeaning"]
    };
    var cls = { words: "", grammar: " is-grammar", kanji: " is-kanji" };
    var head = '<div class="study-row is-head' + cls[state.kind] + '">' +
      HEAD[state.kind].map(function (k) {
        return "<span>" + esc(t(k)) + "</span>";
      }).join("") + "</div>";

    var ROW = { words: wordRow, grammar: grammarRow, kanji: kanjiRow };
    var COUNT = {
      words: "study.wordsCount", grammar: "study.patternsCount",
      kanji: "study.kanjiCount"
    };
    var body = rows.map(ROW[state.kind]).join("");

    host.innerHTML =
      '<p class="study-count">' + rows.length + " " +
        esc(t(COUNT[state.kind])) +
      "</p>" +
      '<div class="study-list">' + head + body + "</div>";
  }

  function wordRow(row) {
    /* Same rule as the grammar rows: the Nepali gloss appears only while the
       page is being read in Nepali, and only for the levels translated so far.
       Everywhere else the English gloss stands on its own. */
    var ne = (I18N.current() === "ne" && row.ne)
      ? '<em class="study-ne">' + esc(row.ne) + "</em>" : "";
    var affix = row.affix
      ? '<b class="study-affix">' + esc(t("study.affix")) + "</b>" : "";
    return '<div class="study-row">' +
      '<span class="study-jp">' + esc(row.w) + affix + "</span>" +
      '<span class="study-reading">' + esc(row.r || "") +
        (row.romaji ? '<em>' + esc(row.romaji) + "</em>" : "") + "</span>" +
      '<span class="study-en">' + esc(row.en) + ne + "</span>" +
    "</div>";
  }

  /* ------------------------------------------------------------- kanji --
     One row per character. The readings carry KANJIDIC's own notation: a dot
     in a kun reading marks where the character stops and the okurigana
     begins (おお.きい), and a hyphen marks a reading only used as a prefix or
     suffix (-び). Both are shown, dimmed, rather than stripped - a learner
     who does not know where 大 ends and きい begins will write it wrong.
     -------------------------------------------------------------------- */

  function reading(text) {
    var dot = text.indexOf(".");
    if (dot === -1) return esc(text);
    return esc(text.slice(0, dot)) +
      '<i class="kanji-okuri">' + esc(text.slice(dot + 1)) + "</i>";
  }

  function kanjiRow(row) {
    var on = row.on.length
      ? '<b>\u97f3</b> ' + row.on.map(esc).join("\u30fb") : "";
    var kun = row.kun.length
      ? '<b>\u8a13</b> ' + row.kun.map(reading).join("\u30fb") : "";

    var ex = row.ex.map(function (e) {
      var ne = (I18N.current() === "ne" && e.ne)
        ? ' <em class="study-ne">' + esc(e.ne) + "</em>" : "";
      return '<span class="kanji-ex"><b>' + esc(e.w) + "</b> " +
        '<i>' + esc(e.r) + "</i> " + esc(e.en) + ne + "</span>";
    }).join("");

    return '<div class="study-row is-kanji" data-kanji="' + esc(row.k) + '">' +
      '<span class="kanji-cell">' +
        '<button type="button" class="kanji-char" data-kanji="' + esc(row.k) +
          '" title="' + esc(t("study.strokeOrder")) + '">' + esc(row.k) +
        "</button>" +
        '<span class="kanji-strokes">' + row.s + " " +
          esc(t("study.colStrokes")) + "</span>" +
      "</span>" +
      '<span class="kanji-readings">' + on +
        (on && kun ? "<br />" : "") + kun + "</span>" +
      '<span class="study-en">' + esc(row.en.join(", ")) +
        (ex ? '<span class="kanji-exs">' + ex + "</span>" : "") + "</span>" +
    "</div>";
  }

  /* ------------------------------------------------- how it is written --
     Stroke order is drawn rather than shown as a grid of numbered stamps:
     the thing a learner needs is the direction and the sequence, which a
     still image cannot carry. Each KanjiVG path is drawn by animating its
     own dash offset, one after another, and the finished character stays on
     screen with every stroke numbered at its start point.

     The path data is a separate file per level - N1 alone is 1.2MB of
     curves - so it is fetched the first time somebody opens a character and
     kept for the rest of the session.
     -------------------------------------------------------------------- */

  var strokeCache = {};

  function strokesFor(level) {
    if (strokeCache[level]) return Promise.resolve(strokeCache[level]);
    return fetch(SITE_ROOT + "data/kanji/strokes/" + level.toLowerCase() +
                 ".json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (d) { strokeCache[level] = d; return d; });
  }

  function drawKanji(box, paths) {
    /* KanjiVG draws on a 109x109 grid. The guide lines are the same quarters
       a squared practice sheet has, which is what people learn to write on. */
    var svg =
      '<svg viewBox="0 0 109 109" class="kanji-svg" aria-hidden="true">' +
        '<g class="kanji-guide">' +
          '<line x1="54.5" y1="0" x2="54.5" y2="109" />' +
          '<line x1="0" y1="54.5" x2="109" y2="54.5" />' +
        "</g>" +
        '<g class="kanji-ink">' +
          paths.map(function (d, n) {
            return '<path d="' + d + '" style="--i:' + n + '" />';
          }).join("") +
        "</g>" +
      "</svg>";
    box.innerHTML = svg;

    /* Each stroke waits for the ones before it. Measuring the real length
       means a long sweep and a short tick take the time each deserves. */
    var delay = 0;
    Array.prototype.forEach.call(box.querySelectorAll(".kanji-ink path"),
      function (path) {
        var len = path.getTotalLength();
        var secs = Math.max(0.22, Math.min(0.85, len / 190));
        path.style.strokeDasharray = len + " " + len;
        path.style.strokeDashoffset = len;
        path.style.animation =
          "kanji-draw " + secs + "s linear " + delay + "s forwards";
        delay += secs + 0.09;
      });
    return delay;
  }

  function openKanji(char) {
    var panel = document.getElementById("kanjiPanel");
    if (!panel) return;

    var row = (cache[key()] || []).filter(function (r) {
      return r.k === char;
    })[0];
    if (!row) return;

    panel.hidden = false;
    panel.innerHTML =
      '<div class="kanji-panel-inner">' +
        '<div class="kanji-draw-box" id="kanjiDraw"></div>' +
        '<div class="kanji-panel-side">' +
          '<h3>' + esc(char) + "</h3>" +
          '<p class="kanji-panel-en">' + esc(row.en.join(", ")) + "</p>" +
          '<p class="kanji-panel-count">' + row.s + " " +
            esc(t("study.colStrokes")) + "</p>" +
          '<button type="button" class="btn btn-ghost" id="kanjiReplay">' +
            esc(t("study.replay")) + "</button>" +
        "</div>" +
        '<button type="button" class="kanji-close" aria-label="&times;">' +
          "&times;</button>" +
      "</div>";

    var box = document.getElementById("kanjiDraw");
    box.innerHTML = '<div class="spinner"></div>';

    strokesFor(state.level).then(function (all) {
      var paths = all[char];
      if (!paths) {
        box.innerHTML = '<p class="stats-empty">' +
          esc(t("study.unavailable")) + "</p>";
        return;
      }
      drawKanji(box, paths);
      var replay = document.getElementById("kanjiReplay");
      if (replay) {
        replay.onclick = function () { drawKanji(box, paths); };
      }
    }).catch(function () {
      box.innerHTML = '<p class="stats-empty">' +
        esc(t("study.unavailable")) + "</p>";
    });

    panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  host.addEventListener("click", function (ev) {
    var hit = ev.target.closest(".kanji-char");
    if (hit) { openKanji(hit.dataset.kanji); return; }
  });

  document.addEventListener("click", function (ev) {
    if (ev.target.closest(".kanji-close")) {
      var panel = document.getElementById("kanjiPanel");
      if (panel) { panel.hidden = true; panel.innerHTML = ""; }
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    var panel = document.getElementById("kanjiPanel");
    if (panel && !panel.hidden) { panel.hidden = true; panel.innerHTML = ""; }
  });

  function grammarRow(row) {
    /* The Nepali gloss only shows when the reader is actually reading in
       Nepali; in every other language it would be a column of noise. */
    var ne = (I18N.current() === "ne" && row.ne)
      ? '<em class="study-ne">' + esc(row.ne) + "</em>" : "";
    return '<div class="study-row is-grammar">' +
      '<span class="study-jp">' + esc(row.p) + "</span>" +
      '<span class="study-en">' + esc(row.en) + ne + "</span>" +
      '<span class="study-example"><b>' + esc(row.ja) + "</b>" +
        "<em>" + esc(row.ex) + "</em></span>" +
    "</div>";
  }

  /* The site header is sticky, so the list's own heading row has to stop
     below it rather than slide underneath. Measured rather than hard-coded:
     the header is two rows tall on a phone and one on a desktop. */
  function syncHeaderOffset() {
    var head = document.querySelector(".site-header");
    if (!head) return;
    document.documentElement.style.setProperty(
      "--header-h", Math.round(head.getBoundingClientRect().height) + "px");
  }
  syncHeaderOffset();
  window.addEventListener("resize", syncHeaderOffset);
  document.addEventListener("languagechange", syncHeaderOffset);

  document.querySelectorAll(".study-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var group = tab.parentNode;
      if (tab.classList.contains("is-on")) return;
      group.querySelectorAll(".study-tab").forEach(function (t2) {
        t2.classList.toggle("is-on", t2 === tab);
      });
      if (tab.dataset.level) state.level = tab.dataset.level;
      if (tab.dataset.kind) state.kind = tab.dataset.kind;
      load();
    });
  });

  var search = document.getElementById("studySearch");
  if (search) {
    search.addEventListener("input", function () {
      state.query = search.value.trim().toLowerCase();
      render();
    });
  }

  /* Column headings and the Nepali gloss both follow the picker. */
  document.addEventListener("languagechange", function () {
    if (cache[key()]) render();
  });

  load();
})();
