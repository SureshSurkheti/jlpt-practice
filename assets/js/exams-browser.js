/* ==========================================================================
   Exam library browser - lists every rebuilt past paper from
   data/exams/index.json with level filtering and search.
   ========================================================================== */
(function () {
  "use strict";

  var list = document.getElementById("examsList");
  if (!list) return;

  var LEVEL_COLOR = {
    N1: "#d9a63a", N2: "#2d6eb4", N3: "#2f7d57", N4: "#7c3ac8", N5: "#5c697a"
  };
  var PART_KEY = {
    vocabulary: "section.vocabulary",
    "grammar-reading": "section.grammarReading",
    listening: "section.listening"
  };

  var exams = [];
  var withWords = {};   // exam id -> word count, for the papers that have one
  var query = "";

  /* ?lv=N3 opens the library already narrowed to that level. The back button
     inside a paper carries its own level here, so leaving an N3 paper puts you
     back among the N3 papers rather than at the top of the whole library. */
  var filterLevel = (function () {
    var m = /[?&]lv=(N[1-5])/i.exec(window.location.search);
    return m ? m[1].toUpperCase() : "all";
  })();

  function syncChips() {
    Array.prototype.forEach.call(
      document.querySelectorAll("#examsFilters .chip"),
      function (c) {
        var on = filterLevel !== "all" && c.dataset.level === filterLevel;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Re-render on language change so the whole listing follows the picker. */
  document.addEventListener("languagechange", function () {
    if (exams.length) { renderStats(); render(); }
  });

  /* Which papers carry word meanings is read from the glossary index rather
     than assumed from the level, so extending the build to another level
     needs no change here. Absent file just means no papers are tagged. */
  fetch("data/glossary/index.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (idx) {
      (idx && idx.exams ? idx.exams : []).forEach(function (e) {
        withWords[e.id] = e.words;
      });
      if (exams.length) render();
    })
    .catch(function () { /* tags simply do not appear */ });

  fetch("data/exams/index.json", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      exams = data.exams || [];
      renderStats();
      syncChips();
      render();
    })
    .catch(function (err) {
      list.innerHTML =
        '<div class="exam-error">' +
        "<h2>" + esc(t("exams.unavailable")) + "</h2>" +
        "<p>" + esc(t("exam.errorBody")) + "</p>" +
        '<p class="exam-error-detail">' + esc(err.message) + "</p>" +
        "</div>";
    });

  function renderStats() {
    var host = document.getElementById("examsStats");
    if (!host) return;
    var questions = exams.reduce(function (s, e) { return s + e.totalQuestions; }, 0);
    var levels = {};
    exams.forEach(function (e) { levels[e.level] = 1; });
    host.innerHTML =
      stat(exams.length, t("exams.statPapers")) +
      stat(questions.toLocaleString(), t("exams.statQuestions")) +
      stat(Object.keys(levels).length, t("exams.statLevels")) +
      /* This one is a word ("Automatically"), not a count - see .is-word. */
      stat(t("exams.statScoredValue"), t("exams.statScored"), "is-word");
  }

  function stat(value, label, kind) {
    return '<div class="exams-stat' + (kind ? " " + kind : "") + '"><strong>' +
      esc(value) + "</strong><span>" + esc(label) + "</span></div>";
  }

  function render() {
    var shown = exams.filter(function (e) {
      if (filterLevel !== "all" && e.level !== filterLevel) return false;
      if (!query) return true;
      var hay = (e.level + " " + e.title + " " + e.periodLabel + " " + e.period)
        .toLowerCase();
      return hay.indexOf(query) !== -1;
    });

    if (!shown.length) {
      list.innerHTML = '<p class="exams-empty">' + esc(t("exams.noMatch")) + '</p>';
      return;
    }

    var groups = {};
    var order = [];
    shown.forEach(function (e) {
      if (!groups[e.level]) { groups[e.level] = []; order.push(e.level); }
      groups[e.level].push(e);
    });
    order.sort();

    var html = "";
    order.forEach(function (lv) {
      var papers = groups[lv];
      html += '<h2 class="exam-group-title">' +
        '<span class="exam-level-chip" style="background:' +
        (LEVEL_COLOR[lv] || "#2d6eb4") + '">' + esc(lv) + "</span>" +
        "<span>" + papers.length + " " +
        esc(t(papers.length === 1 ? "exams.paper" : "exams.papers")) +
        "</span></h2>";
      html += '<div class="exam-card-grid">';
      papers.forEach(function (e) { html += card(e); });
      html += "</div>";
    });
    list.innerHTML = html;
  }

  function card(e) {
    var color = LEVEL_COLOR[e.level] || "#2d6eb4";
    var tags = e.parts.map(function (p) {
      return '<span class="exam-part-tag">' +
        esc(t(PART_KEY[p.id] || p.label)) + " · " + p.count + "</span>";
    }).join("");

    /* Some sittings were never archived with their listening paper. Say so
       up front instead of letting people discover it mid-exam. */
    var hasListening = e.parts.some(function (p) { return p.id === "listening"; });
    if (!hasListening) {
      tags += '<span class="exam-part-tag is-missing">' +
        esc(t("exams.noListening")) + "</span>";
    }

    if (withWords[e.id]) {
      tags += '<span class="exam-part-tag is-words">' +
        esc(t("exams.hasWords")) + "</span>";
    }

    /* Say plainly where a paper came from: a reconstruction of a real sitting,
       or a practice paper written for this site. */
    var origin = e.origin === "practice"
      ? t("exams.originPractice") : t("exams.originArchive");

    return '<article class="exam-card" style="--level-color:' + color + '">' +
      '<div class="exam-card-top">' +
        '<span class="exam-level-chip" style="background:' + color + '">' +
          esc(e.level) + "</span>" +
        '<span class="exam-card-title">' + esc(e.periodLabel) + "</span>" +
      "</div>" +
      '<div class="exam-card-origin' +
        (e.origin === "practice" ? " is-practice" : "") + '">' +
        esc(origin) + "</div>" +
      '<div class="exam-card-parts">' + tags + "</div>" +
      '<div class="exam-card-foot">' +
        '<a class="btn btn-primary" href="exam.html?id=' + esc(e.id) +
          '">' + esc(t("exams.start")) + '</a>' +
        '<a class="btn btn-ghost" href="exam.html?id=' + esc(e.id) +
          '&mode=study">' + esc(t("exams.study")) + '</a>' +
        '<span class="exam-card-count">' + e.totalQuestions + "</span>" +
      "</div>" +
    "</article>";
  }

  /* The chips are toggles, not a radio group. There used to be an "All
     levels" chip sitting permanently on beside them, which is the state you
     are already in before you touch anything - so it was a button whose whole
     job was to undo the other buttons. Pressing a lit chip clears it instead,
     and the listing goes back to every level. */
  document.getElementById("examsFilters")
    .addEventListener("click", function (ev) {
      var chip = ev.target.closest(".chip");
      if (!chip) return;

      filterLevel = chip.classList.contains("is-on") ? "all" : chip.dataset.level;
      syncChips();
      render();
    });

  var search = document.getElementById("examsSearch");
  if (search) {
    search.addEventListener("input", function () {
      query = search.value.trim().toLowerCase();
      render();
    });
  }
})();
