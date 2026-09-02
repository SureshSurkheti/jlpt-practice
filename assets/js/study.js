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

  var state = { level: "N5", kind: "words", query: "" };
  var cache = {};          // "words:N5" -> rows

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function key() { return state.kind + ":" + state.level; }

  function load() {
    if (cache[key()]) { render(); return; }

    host.innerHTML = '<div class="exam-loading"><div class="spinner"></div></div>';

    var dir = state.kind === "words" ? "words" : "grammar";
    fetch("data/" + dir + "/" + state.level.toLowerCase() + ".json",
          { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (d) {
        cache[key()] = state.kind === "words" ? d.words : d.patterns;
        render();
      })
      .catch(function () {
        host.innerHTML = '<p class="stats-empty">' + esc(t("study.unavailable")) +
          "</p>";
      });
  }

  function matches(row) {
    if (!state.query) return true;
    var hay = state.kind === "words"
      ? [row.w, row.r, row.romaji, row.en]
      : [row.p, row.en, row.ne, row.ja, row.ex];
    return hay.join(" ").toLowerCase().indexOf(state.query) !== -1;
  }

  function render() {
    var rows = (cache[key()] || []).filter(matches);

    if (!rows.length) {
      host.innerHTML = '<p class="stats-empty">' + esc(t("exams.noMatch")) + "</p>";
      return;
    }

    var head = state.kind === "words"
      ? '<div class="study-row is-head">' +
          "<span>" + esc(t("study.colWord")) + "</span>" +
          "<span>" + esc(t("study.colReading")) + "</span>" +
          "<span>" + esc(t("study.colMeaning")) + "</span>" +
        "</div>"
      : '<div class="study-row is-head is-grammar">' +
          "<span>" + esc(t("study.colPattern")) + "</span>" +
          "<span>" + esc(t("study.colMeaning")) + "</span>" +
          "<span>" + esc(t("study.colExample")) + "</span>" +
        "</div>";

    var body = rows.map(state.kind === "words" ? wordRow : grammarRow).join("");

    host.innerHTML =
      '<p class="study-count">' + rows.length + " " +
        esc(t(state.kind === "words" ? "study.wordsCount" : "study.patternsCount")) +
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
