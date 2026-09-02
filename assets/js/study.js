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

    openRow = null;
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
        '<a class="kanji-char" href="kanji.html?k=' +
          encodeURIComponent(row.k) + "&lv=" + state.level.toLowerCase() +
          '" aria-expanded="false" title="' + esc(t("study.strokeOrder")) +
          '">' + esc(row.k) + "</a>" +
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
     The character opens in place, in its own row.

     This started as a panel pinned under the whole list, which was the worst
     of both: on a phone the animation was off-screen beneath seven hundred
     rows, and on a laptop the one character being studied shared the screen
     with the hundred that were not. Expanding the row itself keeps the
     answer next to the question and keeps your place in the list.

     The <a> is real and points at the character's own page, so this is an
     enhancement rather than a requirement: without JavaScript the link
     simply navigates, and the full page is still one click away from inside
     the open row for anyone who wants the large version, the example words
     and the walk to the next character.

     One row open at a time. Two half-drawn characters in a list is not a
     comparison, it is clutter, and the second one pushes the first off the
     screen anyway.
     -------------------------------------------------------------------- */

  var strokeCache = {};
  var openRow = null;

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

  function draw(box, paths) {
    box.innerHTML =
      '<svg viewBox="0 0 109 109" class="kanji-svg" aria-hidden="true">' +
        '<g class="kanji-guide">' +
          '<line x1="54.5" y1="0" x2="54.5" y2="109" />' +
          '<line x1="0" y1="54.5" x2="109" y2="54.5" />' +
        "</g>" +
        '<g class="kanji-ink">' +
          paths.map(function (d) { return '<path d="' + d + '" />'; }).join("") +
        "</g>" +
      "</svg>";

    /* Each stroke waits for the ones before it, and takes time in proportion
       to its own measured length: a long sweep and a short tick should not
       be given the same quarter second. */
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
  }

  /* Every stroke again, small and in order - the sequence at a glance once
     the animation has finished, the way a textbook prints it. */
  function steps(paths) {
    return paths.map(function (_d, n) {
      var upto = paths.slice(0, n + 1).map(function (d, i) {
        return '<path d="' + d + '"' + (i === n ? ' class="is-new"' : "") + " />";
      }).join("");
      return '<li><svg viewBox="0 0 109 109" aria-hidden="true">' +
        '<g class="kanji-ink is-static">' + upto + "</g></svg>" +
        "<b>" + (n + 1) + "</b></li>";
    }).join("");
  }

  function closeKanji() {
    if (!openRow) return;
    var link = openRow.querySelector(".kanji-char");
    if (link) link.setAttribute("aria-expanded", "false");
    openRow.classList.remove("is-open");
    var panel = openRow.nextElementSibling;
    if (panel && panel.classList.contains("kanji-open")) panel.remove();
    openRow = null;
  }

  function openKanji(rowEl) {
    var char = rowEl.dataset.kanji;
    var href = rowEl.querySelector(".kanji-char").getAttribute("href");
    var wasOpen = rowEl === openRow;
    closeKanji();
    if (wasOpen) return;               // a second press closes it

    var panel = document.createElement("div");
    panel.className = "kanji-open";
    panel.innerHTML =
      '<div class="kanji-open-inner">' +
        '<div class="kanji-open-draw"><div class="spinner"></div></div>' +
        '<div class="kanji-open-body">' +
          '<h3>' + esc(t("study.strokeOrder")) + "</h3>" +
          '<ol class="kanji-open-steps"></ol>' +
          '<div class="kanji-open-actions">' +
            '<button type="button" class="btn btn-ghost kanji-replay">' +
              esc(t("study.replay")) + "</button>" +
            '<a class="btn btn-primary" href="' + href + '">' +
              esc(char) + ' <span aria-hidden="true">\u2197</span></a>' +
          "</div>" +
        "</div>" +
        '<button type="button" class="kanji-open-close" ' +
          'aria-label="&times;">&times;</button>' +
      "</div>";

    rowEl.parentNode.insertBefore(panel, rowEl.nextSibling);
    rowEl.classList.add("is-open");
    rowEl.querySelector(".kanji-char").setAttribute("aria-expanded", "true");
    openRow = rowEl;

    var box = panel.querySelector(".kanji-open-draw");
    strokesFor(state.level).then(function (all) {
      var paths = all[char];
      if (!paths) {
        box.innerHTML = '<p class="stats-empty">' +
          esc(t("study.unavailable")) + "</p>";
        return;
      }
      draw(box, paths);
      panel.querySelector(".kanji-open-steps").innerHTML = steps(paths);
      panel.querySelector(".kanji-replay").addEventListener("click",
        function () { draw(box, paths); });
    }).catch(function () {
      box.innerHTML = '<p class="stats-empty">' +
        esc(t("study.unavailable")) + "</p>";
    });
  }

  host.addEventListener("click", function (ev) {
    if (ev.target.closest(".kanji-open-close")) { closeKanji(); return; }

    var link = ev.target.closest(".kanji-char");
    if (!link) return;
    /* Leave the modified clicks alone: someone holding Cmd wants the page in
       a new tab, not an accordion in this one. */
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
    ev.preventDefault();
    openKanji(link.closest(".study-row"));
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeKanji();
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
