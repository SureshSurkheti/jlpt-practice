/* ==========================================================================
   Exam library browser - lists every rebuilt past paper from
   data/exams/index.json with level filtering and search.
   ========================================================================== */
(function () {
  "use strict";

  var list = document.getElementById("examsList");
  if (!list) return;

  /* N5 first. The site reads bottom-up everywhere - the levels page, the
     study tabs, the home cards, the coverage table - because that is the
     order a learner meets them in. This list is the one definition. */
  var LEVELS_EASIEST_FIRST = ["N5", "N4", "N3", "N2", "N1"];

  var LEVEL_COLOR = {
    N1: "#d9a63a", N2: "#2d6eb4", N3: "#2f7d57", N4: "#7c3ac8", N5: "#5c697a"
  };
  /* The four skills a JLPT paper tests, in the order the paper presents
     them: 文字・語彙, 文法, 読解, 聴解.

     These were grouped for a while into the three parts the exam is *scored*
     in - 語彙 and 文法 summed into one "Language Knowledge" figure, because
     that is how the marks are reported. It is how the marks are reported,
     and it was still the wrong thing to show here: grammar then appeared
     nowhere on the page at all, folded invisibly into another number, while
     "No Grammar" could still turn up on a paper missing it. A skill the
     library is willing to call missing has to be visible when it is there.
     That grouping still governs the scorecard, where it belongs.

     Every paper prints all four, in this order, and each is either its own
     count or - in the same place, in red - the note that this paper does not
     have it. Appended at the end instead, "No Reading" landed after the
     listening count: neither where the reading would be nor where the eye is
     looking for it. */
  var SKILLS = ["vocabulary", "grammar", "reading", "listening"];
  var SKILL_KEY = {
    vocabulary: "section.vocabulary",
    grammar: "section.grammar",
    reading: "section.reading",
    listening: "section.listening"
  };

  var exams = [];
  var withWords = {};   // exam id -> word count, for the papers that have one
  var query = "";

  /* What the player filed away after each marked section (see the personal
     bests block in exam-player.js). Read here so the library can say which
     papers you have already sat and how you did, which is the one thing that
     genuinely distinguishes one December sitting from another. */
  var bests = (function () {
    try {
      var raw = localStorage.getItem("jlpt.best");
      var all = raw ? JSON.parse(raw) : null;
      return (all && typeof all === "object") ? all : {};
    } catch (e) { return {}; }
  })();

  /* Summed over the sections that have been sat, not over the whole paper:
     "32 / 60" after one section is true, "32 / 180" would not be. */
  function bestOf(id) {
    var rec = bests[id];
    if (!rec) return null;
    var scored = 0, cap = 0, parts = 0;
    ["language", "reading", "listening"].forEach(function (k) {
      if (!rec[k]) return;
      scored += rec[k].best;
      cap += rec[k].cap;
      parts++;
    });
    return parts ? { scored: scored, cap: cap, parts: parts } : null;
  }

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
  fetch(SITE_ROOT + "data/glossary/index.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (idx) {
      (idx && idx.exams ? idx.exams : []).forEach(function (e) {
        withWords[e.id] = e.words;
      });
      if (exams.length) { renderStats(); render(); }
    })
    .catch(function () { /* tags simply do not appear */ });

  fetch(SITE_ROOT + "data/exams/index.json", { cache: "no-cache" })
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
    /* The fourth used to be the word "Automatically" under the label
       "Marked" - which is not a count, so it broke the row it sat in, and
       which the sentence directly above it already says ("timed and marked
       automatically"). Replaced with a real number, and one that is a
       genuine difference from other free JLPT sites rather than a claim. */
    var glossed = exams.filter(function (e) { return withWords[e.id]; }).length;

    host.innerHTML =
      stat(exams.length, t("exams.statPapers")) +
      stat(questions.toLocaleString(), t("exams.statQuestions")) +
      stat(Object.keys(levels).length, t("exams.statLevels")) +
      (glossed ? stat(glossed, t("exams.statWordMeanings")) : "");
  }

  function stat(value, label) {
    return '<div class="exams-stat"><strong>' +
      esc(value) + "</strong><span>" + esc(label) + "</span></div>";
  }

  /* Eighty-six cards on arrival is not a library, it is a wall. Choose a
     level first; the papers for it come after. A search jumps straight to
     matching papers across every level, because someone typing a year knows
     what they are looking for. */
  function render() {
    if (filterLevel === "all" && !query) { renderLevels(); return; }
    renderPapers();
  }

  /* Which chrome belongs to which view. On the level picker there is nothing
     to filter and nothing to search: a year search there competes with the
     one choice the screen is asking for, and matches would arrive from five
     levels at once. Both appear once a level is open. */
  function setChrome(showing) {
    var filters = document.getElementById("examsFilters");
    var search = document.getElementById("examsSearch");
    var back = document.getElementById("examsBack");
    if (filters) filters.hidden = !showing;
    if (search) search.hidden = !showing;
    if (back) back.hidden = !showing;
  }

  function renderLevels() {
    setChrome(false);

    var byLevel = {};
    exams.forEach(function (e) {
      var g = byLevel[e.level] || (byLevel[e.level] = {
        papers: 0, questions: 0, listening: 0, words: 0
      });
      g.papers++;
      g.questions += e.totalQuestions;
      if (e.parts.some(function (p) {
        return p.id === "listening" && p.audio;
      })) g.listening++;
      if (withWords[e.id]) g.words++;
    });

    var html = '<div class="level-picker">';
    LEVELS_EASIEST_FIRST.forEach(function (lv) {
      var g = byLevel[lv];
      if (!g) return;
      html +=
        '<button type="button" class="lvcard" data-level="' + lv + '" ' +
          'style="--level-color:' + (LEVEL_COLOR[lv] || "#2d6eb4") + '">' +
          '<span class="lvcard-code">' + lv + "</span>" +
          '<span class="lvcard-desc">' + esc(t("level." + lv)) + "</span>" +
          /* Each fact is one unbreakable phrase. Loose text nodes with a
             separator between them let the line break wherever it liked, so
             a card read "2,760" on one line and "questions" on the next. */
          '<span class="lvcard-facts">' +
            "<span><b>" + g.papers + "</b> " +
              esc(t(g.papers === 1 ? "exams.paper" : "exams.papers")) + "</span>" +
            "<span><b>" + g.questions.toLocaleString() + "</b> " +
              esc(t("exams.questionsShort")) + "</span>" +
          "</span>" +
          /* A bare arrow said "something happens" without saying what.
             The words are the button; the arrow is punctuation. */
          '<span class="lvcard-go">' + esc(t("exams.seePapers")) +
            '<i aria-hidden="true">&rarr;</i></span>' +
        "</button>";
    });
    html += "</div>";
    list.innerHTML = html;
  }

  function renderPapers() {
    setChrome(true);

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
    /* Easiest first, like every other list of levels on the site. A plain
       sort() put N1 at the top, which is the order the levels are numbered
       in but the reverse of the order anybody learns them in. */
    order.sort(function (a, b) {
      return LEVELS_EASIEST_FIRST.indexOf(a) - LEVELS_EASIEST_FIRST.indexOf(b);
    });

    /* A tag every row carries is not information, it is wallpaper. Nearly
       every N2 and N3 paper has word meanings, so inside those levels the
       chip appeared 28 times and distinguished nothing; in a search across
       levels it distinguishes a great deal. Show it only where it varies. */
    var wordsVaries = shown.some(function (e) { return withWords[e.id]; }) &&
                      shown.some(function (e) { return !withWords[e.id]; });

    /* The best column is held open so the scores line up down the page -
       but only when there is something to line up. Reserving it for a level
       you have never sat left an empty stripe between every row and its
       buttons. */
    var anyBest = shown.some(function (e) { return !!bestOf(e.id); });

    var html = "";
    order.forEach(function (lv) {
      var papers = groups[lv];
      html += '<h2 class="exam-group-title">' +
        '<span class="exam-level-chip" style="background:' +
        (LEVEL_COLOR[lv] || "#2d6eb4") + '">' + esc(lv) + "</span>" +
        "<span>" + papers.length + " " +
        esc(t(papers.length === 1 ? "exams.paper" : "exams.papers")) +
        "</span></h2>";
      html += '<div class="exam-rows' + (anyBest ? " has-bests" : "") + '">';
      papers.forEach(function (e) { html += card(e, wordsVaries); });
      html += "</div>";
    });
    list.innerHTML = html;
  }

  /* One paper, one row.

     This used to be a card in a three-across grid, and twenty-eight of them
     was the problem: every card carried the same three tags with the same
     three counts, so nine tenths of the page was the part that never varied,
     and the part that did - the date - was one line inside it. Twenty-eight
     cards is a wall; twenty-eight rows is a list of dates you can run your
     eye down, which is what choosing a sitting actually is.

     What differs now does the work: the date leads, anything unusual about
     the paper is flagged, and your own best score sits in its own column
     where it lines up from row to row. */
  function card(e, wordsVaries) {
    var color = LEVEL_COLOR[e.level] || "#2d6eb4";

    var counts = e.categoryCounts || {};
    var have = {};
    e.parts.forEach(function (p) { have[p.id] = p; });

    /* All four skills, in paper order, each either its count or its absence.
       "Has a listening booklet" is not the same as "has the recordings", so
       the one paper carrying 28 silent listening questions says so beside
       its count rather than passing as complete. */
    var makeup = SKILLS.map(function (c) {
      if (!counts[c]) {
        return '<span class="exam-row-missing">' +
          esc(tf("exams.noPart", { part: t(SKILL_KEY[c]) })) + "</span>";
      }
      var cell = "<span>" + esc(t(SKILL_KEY[c])) +
        " <b>" + counts[c] + "</b></span>";
      /* One recording covers a whole 問題, so the honest unit is the section.
         Counting questions said "has listening audio" for a paper holding one
         file out of five - 33 of the 71 listening papers are in that state,
         and you only found out when you reached a silent section 40 minutes
         into a mock. Say which it is up front. */
      if (c === "listening" && have.listening) {
        var secs = have.listening.sections || 0;
        var withAudio = have.listening.audioSections || 0;
        if (!withAudio) {
          cell += '<span class="exam-row-missing">' +
            esc(t("exams.noAudio")) + "</span>";
        } else if (secs && withAudio < secs) {
          cell += '<span class="exam-row-missing">' +
            esc(tf("exams.audioPartial", { have: withAudio, all: secs })) +
            "</span>";
        }
      }
      return cell;
    }).join("");

    var flags = "";
    if (wordsVaries && withWords[e.id]) {
      flags += '<span class="exam-part-tag is-words">' +
        esc(t("exams.hasWords")) + "</span>";
    }

    /* Say plainly what this is - kept on every row, not lifted to a heading:
       it is the line that stops the library reading as a set of official
       past papers, and it should be beside each paper it describes. */
    var origin = e.origin === "practice"
      ? t("exams.originPractice") : t("exams.originArchive");

    var b = bestOf(e.id);
    var bestCell = b
      ? '<div class="exam-row-best" title="' + esc(t("exam.yourBest")) + '">' +
          '<span aria-hidden="true">★</span>' +
          "<b>" + b.scored + "<i>/" + b.cap + "</i></b>" +
        "</div>"
      : '<div class="exam-row-best is-empty" aria-hidden="true"></div>';


    return '<article class="exam-row' + (b ? " is-sat" : "") +
        '" style="--level-color:' + color + '">' +
      '<div class="exam-row-when">' +
        '<span class="exam-level-chip" style="background:' + color + '">' +
          esc(e.level) + "</span>" +
        '<span class="exam-row-title">' + esc(e.periodLabel) + "</span>" +
      "</div>" +
      /* The flags belong on the end of the make-up line, not in a column of
         their own. Parked out on the right, "No listening section" floated
         in dead space with nothing beside it and read as a label for the
         whole row; sitting after "Vocabulary 35 · Grammar & Reading 38" it
         reads as what it is - the rest of that sentence. */
      '<div class="exam-row-makeup">' +
        '<span class="exam-row-origin' +
          (e.origin === "practice" ? " is-practice" : "") + '">' +
          esc(origin) + "</span>" +
        '<span class="exam-row-count">' + e.totalQuestions + " " +
          esc(t("exams.questionsShort")) + "</span>" +
        /* The make-up and any flags are one span, and CSS gives it a line of
           its own. Before, the cell wrapped only when it happened to run out
           of room, so the same page showed some rows on one line and some on
           two - which ones depended on the language and the window width.
           Now every row is the same shape: what the paper is, then what is
           in it. The flags belong inside this span rather than beside it,
           both because they are part of that sentence and because a sibling
           would have been pushed onto a third line. */
        '<span class="exam-row-parts">' + makeup + flags + "</span>" +
      "</div>" +
      bestCell +
      '<div class="exam-row-go">' +
        '<a class="btn btn-primary" href="exam.html?id=' + esc(e.id) +
          '">' + esc(t("exams.start")) + '</a>' +
        '<a class="btn btn-ghost" href="exam.html?id=' + esc(e.id) +
          '&mode=study">' + esc(t("exams.study")) + '</a>' +
      "</div>" +
    "</article>";
  }

  /* The chips are toggles, not a radio group. There used to be an "All
     levels" chip sitting permanently on beside them, which is the state you
     are already in before you touch anything - so it was a button whose whole
     job was to undo the other buttons. Pressing a lit chip clears it instead,
     and the listing goes back to every level. */
  list.addEventListener("click", function (ev) {
    var card = ev.target.closest(".lvcard");
    if (!card) return;
    filterLevel = card.dataset.level;
    syncChips();
    render();
    window.scrollTo(0, 0);
  });

  document.getElementById("examsFilters")
    .addEventListener("click", function (ev) {
      var chip = ev.target.closest(".chip");
      if (!chip) return;

      filterLevel = chip.classList.contains("is-on") ? "all" : chip.dataset.level;
      syncChips();
      render();
    });

  var back = document.getElementById("examsBack");
  if (back) {
    back.addEventListener("click", function () {
      filterLevel = "all";
      if (search) { search.value = ""; query = ""; }
      syncChips();
      render();
      window.scrollTo(0, 0);
    });
  }

  var search = document.getElementById("examsSearch");
  if (search) {
    search.addEventListener("input", function () {
      query = search.value.trim().toLowerCase();
      render();
    });
  }
})();
