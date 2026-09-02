/* ==========================================================================
   JLPT mock exam player
   Renders exams from data/exams/*.json as a real, timed, scored test.

   The exam is presented the way the printed booklet is: one continuous page,
   questions grouped under their 問題 instruction, each reading passage kept
   beside the questions that use it. There is no next/previous stepping - the
   question map on the right is the navigation, and submitting annotates the
   same page in place rather than moving to a separate results view.

   URL parameters
     ?id=n1-2024-12        load a specific exam
     ?level=N1             load that level's newest exam
     ?cat=reading          preselect one skill to drill (comma-separate for
                           several); the skills are vocabulary, grammar,
                           reading and listening
     ?part=listening       older form, naming a booklet rather than a skill;
                           resolves to whichever skills that booklet holds
     ?mode=study           start in study mode (instant feedback)
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("examRoot");
  if (!root) return;

  var DATA_DIR = (window.SITE_ROOT || "") + "data/exams/";
  var GLOSSARY_DIR = (window.SITE_ROOT || "") + "data/glossary/";

  /* Where to send people when a paper's listening audio will not play.
     Change these three lines to point somewhere else. */
  var LISTENING_APP = {
    name: "Japanese Listening JSempai",
    android: "https://play.google.com/store/apps/details?id=dpt.com.nihongo_jsempai",
    ios: "https://apps.apple.com/us/app/japanese-listening-jsempai/id1469694693"
  };

  /* pass, sectionMin and minutes are the official figures:
       https://www.jlpt.jp/e/guideline/results.html
       https://www.jlpt.jp/e/guideline/testsections.html
     sectionMin is the 19 that each 60-point section needs. N4 and N5 combine
     language knowledge and reading into one 120-point section needing 38,
     which buildSkillTable() applies where the cap is 120. */
  var LEVELS = {
    N1: { color: "#d9a63a", name: "N1 Professional", pass: 100, sectionMin: 19, minutes: 165 },
    N2: { color: "#2d6eb4", name: "N2 Upper-Intermediate", pass: 90, sectionMin: 19, minutes: 155 },
    N3: { color: "#2f7d57", name: "N3 Intermediate", pass: 95, sectionMin: 19, minutes: 140 },
    N4: { color: "#7c3ac8", name: "N4 Lower-Intermediate", pass: 90, sectionMin: 19, minutes: 115 },
    N5: { color: "#5c697a", name: "N5 Basic", pass: 80, sectionMin: 19, minutes: 90 }
  };

  /* Labels come from the translation table; the Japanese subtitle is the
     section's real name on the paper, so it stays as-is. */
  /* A paper covers more than one question type - the N2 vocabulary booklet
     also carries the grammar questions, for instance. Every question records
     its own type, and those types run in contiguous blocks, so headings and
     the question map follow the type rather than the source booklet. */
  var CATEGORY_META = {
    vocabulary: { key: "section.vocabulary", sub: "文字・語彙" },
    grammar: { key: "section.grammar", sub: "文法" },
    reading: { key: "section.reading", sub: "読解" },
    listening: { key: "section.listening", sub: "聴解" }
  };

  /* Same four colours the practice page uses for its skill buttons. */
  var CATEGORY_COLOR = {
    vocabulary: "#2d6eb4",
    grammar: "#d9a63a",
    reading: "#2f7d57",
    listening: "#c84a52"
  };

  var SECTION_LABEL = {
    language: "exam.sectionLanguage",
    reading: "exam.sectionReading",
    listening: "exam.sectionListening"
  };

  /* The three papers a JLPT sitting is actually split into, which are also
     the three blocks it is scored in: 言語知識 (vocabulary + grammar), 読解
     and 聴解. N4 and N5 are scored with reading inside the language block, so
     they come back as two. Built from whatever the learner chose, so a single
     skill drill produces one and no switcher is drawn. */
  function examPapers() {
    var order = [], seen = {};
    state.questions.forEach(function (item, i) {
      var key = sectionOf(item.q, state.exam.level);
      if (!seen[key]) {
        seen[key] = { key: key, label: t(SECTION_LABEL[key] || key), items: [] };
        order.push(seen[key]);
      }
      seen[key].items.push(i);
    });
    return order;
  }

  function paperOfCategory(category) {
    return sectionOf({ category: category }, state.exam.level);
  }

  var state = {
    exam: null,
    questions: [],      // flat, in paper order
    sections: [],        // grouped for rendering
    papers: [],          // the scored blocks: language / reading / listening
    paper: null,         // which of those is on screen
    answers: {},
    flags: {},
    current: 0,          // question nearest the top of the viewport
    mode: "exam",
    timed: true,
    minutes: 0,
    deadline: null,
    startedAt: 0,       // study mode counts up from here
    categories: null,   // which skills the attempt was started with
    ticker: null,
    reviewed: false,
    score: null,
    filter: "all",
    glossary: null,     // word meanings for this paper, if the level has them
    wordsOpen: false,   // whether every word panel is showing at once
    saveFailed: false   // true only if localStorage refused the answers
  };

  /* Sticky offsets: the site header and the exam command bar both stick, and
     their heights change with the viewport (the nav wraps on small screens).
     Measure them instead of hardcoding, so nothing ever overlaps. */
  function syncStickyOffsets() {
    var header = document.querySelector(".site-header");
    var bar = document.querySelector(".exam-bar");
    var css = document.documentElement.style;
    css.setProperty("--header-h", (header ? header.offsetHeight : 0) + "px");
    css.setProperty("--bar-h", (bar ? bar.offsetHeight : 0) + "px");
  }

  window.addEventListener("resize", syncStickyOffsets);
  window.addEventListener("orientationchange", syncStickyOffsets);

  /* ---------------------------------------------------------------- utils */

  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function clock(sec) {
    if (sec < 0) sec = 0;
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return (h ? h + ":" + pad(m) : m) + ":" + pad(s);
  }

  /* Listening used to render an empty grey box. The archived pages embed each
     recording as a *Wayback-wrapped* Google Drive preview page, and that
     archived copy contains no media element at all - there was never a player
     in it to press.

     The recordings themselves are still shared. Pointing the iframe at the
     live Drive preview instead of the archived copy brings the player back:
     the live page has a media element, the archived one has none.

     A native <audio> element would be nicer, but Drive will not allow it:
     the file is served with `content-disposition: attachment` and
     `x-content-type-options: nosniff`, so Chrome blocks it with
     ERR_BLOCKED_BY_ORB, and asking for it in CORS mode fails outright.
     Google's supported way to embed a Drive file is this iframe. */
  function driveId(url) {
    var m = /\/file\/d\/([A-Za-z0-9_-]+)/.exec(url || "");
    return m ? m[1] : null;
  }

  function audioURL(url) {
    var id = driveId(url);
    return id ? "https://drive.google.com/file/d/" + id + "/preview" : url;
  }

  /* Checked on 2026-09-01 by requesting all 235 distinct recordings: every
     one still serves audio except this, which returns 404. There is no way to
     detect a failed cross-origin iframe from here, so the one known-dead file
     is named rather than left as a silent dead player. */
  var DEAD_AUDIO_IDS = ["11By1tRFPR2xu3sAqdCC6gCG-uMWmRtzx"];

  function appLinksHTML() {
    return '<a href="' + esc(LISTENING_APP.android) + '" target="_blank" ' +
      'rel="noopener noreferrer">' + esc(LISTENING_APP.name) + " (Android)</a>" +
      " \u00b7 " +
      '<a href="' + esc(LISTENING_APP.ios) + '" target="_blank" ' +
      'rel="noopener noreferrer">iOS</a>';
  }

  function deadAudioHTML() {
    return "<strong>" + esc(t("exam.audioFailed")) + "</strong> " +
      esc(t("exam.audioHelp")) + " " + appLinksHTML();
  }

  function audioHelpHTML() {
    return esc(t("exam.audioHelp")) + " " + appLinksHTML();
  }

  function sectionOf(question, level) {
    var cat = question.category;
    var combined = level === "N4" || level === "N5";
    if (cat === "listening") return "listening";
    if (cat === "reading") return combined ? "language" : "reading";
    return "language";
  }

  /* The paper is stored as the booklets the exam is actually sat in, but a
     booklet is not a skill: at N1/N2 the 文字・語彙 booklet also carries the
     grammar questions, so "grammar-reading" there holds nothing but reading.
     Every question records the skill it tests, and the paper, its headings and
     the question map have always been grouped by that. Read the skills off the
     questions so the chooser agrees with everything else. */
  function examCategories(exam) {
    var order = [], seen = {};
    exam.parts.forEach(function (part) {
      part.questions.forEach(function (q) {
        var id = q.category || "vocabulary";
        if (!seen[id]) { seen[id] = { id: id, count: 0 }; order.push(seen[id]); }
        seen[id].count++;
      });
    });
    return order;
  }

  /* Which skills start ticked. ?cat=reading drills one skill; ?part=<booklet>
     is the older link shape and still works, resolving to whichever skills
     that booklet turns out to hold. Anything unrecognised opens the full
     paper, which is the safe default. */
  function presetCategories(exam, cats) {
    var have = cats.map(function (c) { return c.id; });
    var all = have.slice();

    var wanted = (qs("cat") || "").toLowerCase().split(",")
      .map(function (c) { return c.trim(); })
      .filter(function (c) { return have.indexOf(c) !== -1; });
    if (wanted.length) return wanted;

    /* No ?cat= in the address, but an attempt already under way: show the
       sections it was started with. Pressing Back from a reading-only drill
       used to come back with every section ticked. */
    var saved = loadProgress();
    if (saved && saved.categories && saved.categories.length) {
      var kept = saved.categories.filter(function (c) {
        return have.indexOf(c) !== -1;
      });
      if (kept.length) return kept;
    }

    var part = (qs("part") || "").toLowerCase();
    if (part) {
      var found = [];
      exam.parts.forEach(function (bk) {
        if (bk.id !== part) return;
        bk.questions.forEach(function (q) {
          if (found.indexOf(q.category) === -1) found.push(q.category);
        });
      });
      if (found.length) return found;
    }

    return all;
  }

  /* Meta tables store keys; resolve to the active language. */
  function metaLabel(table, id) {
    var m = table[id];
    return m ? t(m.key) : "";
  }

  function isBlankChoices(q) {
    return q.choices.every(function (c) {
      return !c.replace(/<[^>]*>/g, "").trim();
    });
  }

  /* "問題8 次の文章を読んで…" -> "問題8" for the section chip */
  function sectionTag(instruction) {
    var m = /問題\s*([0-9０-９]+)/.exec(
      (instruction || "").replace(/<[^>]*>/g, " "));
    return m ? "問題" + m[1] : null;
  }

  function storeKey() {
    return "jlpt.exam." + (state.exam ? state.exam.id : "none");
  }

  function saveProgress() {
    if (!state.exam) return;
    try {
      localStorage.setItem(storeKey(), JSON.stringify({
        answers: state.answers,
        flags: state.flags,
        mode: state.mode,
        /* The whole setup, not just the answers. Leaving a paper and coming
           back should find the screen exactly as it was left - the mode, the
           clock, the sections - rather than reset to the defaults. */
        timed: state.timed,
        minutes: state.minutes,
        categories: state.categories,
        deadline: state.deadline,
        startedAt: state.startedAt,
        reviewed: state.reviewed,
        savedAt: Date.now()
      }));
      state.saveFailed = false;
    } catch (e) {
      /* Private browsing, or the quota is full. The exam still works, but a
         reload really would lose the answers - which is what decides whether
         leaving the page is worth warning about. */
      state.saveFailed = true;
    }
  }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(storeKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearProgress() {
    try { localStorage.removeItem(storeKey()); } catch (e) {}
  }

  /* ------------------------------------------------------------- loading */

  function fail(message, detail) {
    root.innerHTML = "";
    var box = el("div", "container");
    var card = el("div", "exam-error");
    card.appendChild(el("h2", null, t("exam.errorTitle")));
    card.appendChild(el("p", null, esc(message)));
    if (detail) card.appendChild(el("p", "exam-error-detail", esc(detail)));
    card.appendChild(el("div", "exam-error-links",
      '<a class="btn btn-primary" href="exams.html">' + esc(t("exam.browseAll")) + '</a>' +
      '<a class="btn btn-ghost" href="levels.html">' + esc(t("exam.backToPractice")) + '</a>'));
    box.appendChild(card);
    root.appendChild(box);
  }

  function fetchJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
      return r.json();
    });
  }

  /* Word meanings live in a separate file per paper, built by
     tools/build_glossary.py for the N2 and N3 levels. A paper without one is
     the normal case, not an error: the word buttons simply do not appear. */
  function loadGlossary(id) {
    return fetch(GLOSSARY_DIR + id + ".json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (g) { state.glossary = g && g.words ? g : null; })
      .catch(function () { state.glossary = null; });
  }

  function boot() {
    var id = qs("id");
    var level = (qs("level") || "").toUpperCase();

    fetchJSON(DATA_DIR + "index.json").then(function (idx) {
      var exams = idx.exams || [];
      if (!id) {
        var pool = level
          ? exams.filter(function (e) { return e.level === level; })
          : exams;
        if (!pool.length) {
          fail(level ? t("exam.errorNoneLevel") : t("exam.errorNone"));
          return null;
        }
        id = pool[0].id;
      }
      return fetchJSON(DATA_DIR + id + ".json");
    }).then(function (exam) {
      if (!exam) return;
      state.exam = exam;
      return loadGlossary(exam.id).then(renderSetup);
    }).catch(function (err) {
      fail(t("exam.errorBody"),
        String(err && err.message ? err.message : err)
      );
    });
  }

  /* --------------------------------------------------------- setup screen */

  function renderSetup() {
    var exam = state.exam;
    var lv = LEVELS[exam.level] || LEVELS.N3;
    var saved = loadProgress();

    root.innerHTML = "";
    root.style.setProperty("--level-color", lv.color);
    var wrap = el("div", "container");

    /* Which mode to show selected. The URL wins - somebody who clicked
       "Study mode" on a level card means it - then the attempt already in
       progress, then the default.

       That middle case is the one that was missing. Pressing Back from
       inside a paper goes to exam.html?id=..., which carries no ?mode=, so
       a study session came back with Exam mode selected: the setting looked
       as though it had reset itself. The saved attempt knew all along. */
    var modeParam = (qs("mode") || "").toLowerCase();
    var wantStudy = modeParam
      ? modeParam === "study"
      : !!(saved && saved.mode === "study");

    var heroCats = examCategories(exam);
    /* The setup screen had no way back to the library: the back control lives
       in the sticky bar, and the bar only exists once a paper is open. Same
       link, same place, so it does not move when the paper starts. */
    var setupBack = t("exam.backToExams");
    wrap.appendChild(el("div", "exam-setup-back",
      '<a class="exam-back" href="exams.html?lv=' + esc(exam.level) + '">' +
        '<span class="exam-back-arrow" aria-hidden="true">\u2190</span>' +
        '<span>' + esc(setupBack) + "</span>" +
      "</a>"));

    var hero = el("div", "exam-hero");
    hero.innerHTML =
      '<div class="exam-hero-top">' +
        '<span class="exam-level-chip">' + esc(exam.level) + "</span>" +
        '<span class="exam-hero-sub">' + esc(lv.name) +
          " · " + esc(t("exam.pastPaper")) + "</span>" +
      "</div>" +
      "<h1>" + esc(exam.title) + "</h1>" +
      '<p class="exam-hero-meta">' + exam.totalQuestions +
        " " + esc(t("exam.questionsAcross")) + " " + heroCats.length + " " +
        esc(t(heroCats.length === 1 ? "exam.sectionWord" : "exam.sectionsWord")) +
        "</p>";
    wrap.appendChild(hero);

    var card = el("div", "exam-setup");

    /* -- skill selection -- */
    var cats = examCategories(exam);
    var preset = presetCategories(exam, cats);

    var partsBox = el("div", "setup-block");
    partsBox.appendChild(el("h2", "setup-title", "1 · " + t("exam.chooseSections")));
    partsBox.appendChild(el("p", "setup-hint", t("exam.chooseSectionsHint")));

    var grid = el("div", "part-grid");
    cats.forEach(function (c) {
      var meta = CATEGORY_META[c.id] || { key: null, sub: "" };
      var on = preset.indexOf(c.id) !== -1;
      var lab = el("label", "part-card" + (on ? " is-on" : ""));
      lab.innerHTML =
        '<input type="checkbox" name="part" value="' + esc(c.id) + '"' +
          (on ? " checked" : "") + " />" +
        '<span class="part-text">' +
          '<span class="part-label">' + esc(metaLabel(CATEGORY_META, c.id)) + "</span>" +
          '<span class="part-sub">' + esc(meta.sub) + " · " +
            c.count + " " + esc(t("exams.questionsShort")) + "</span>" +
        "</span>" +
        '<span class="part-check" aria-hidden="true">✓</span>';
      grid.appendChild(lab);
    });
    partsBox.appendChild(grid);
    card.appendChild(partsBox);

    /* -- mode -- */
    var modeBox = el("div", "setup-block");
    modeBox.appendChild(el("h2", "setup-title", "2 · " + t("exam.chooseMode")));
    modeBox.appendChild(el("div", "mode-grid",
      '<label class="mode-card' + (wantStudy ? "" : " is-on") + '">' +
        '<input type="radio" name="mode" value="exam"' +
          (wantStudy ? "" : " checked") + " />" +
        "<strong>" + esc(t("exam.examMode")) + "</strong>" +
        "<span>" + esc(t("exam.examModeBody")) + "</span>" +
      "</label>" +
      '<label class="mode-card' + (wantStudy ? " is-on" : "") + '">' +
        '<input type="radio" name="mode" value="study"' +
          (wantStudy ? " checked" : "") + " />" +
        "<strong>" + esc(t("exam.studyMode")) + "</strong>" +
        "<span>" + esc(t("exam.studyModeBody")) + "</span>" +
      "</label>"));
    card.appendChild(modeBox);

    /* -- timer -- */
    var timeBox = el("div", "setup-block");
    timeBox.appendChild(el("h2", "setup-title", "3 · " + t("exam.timer")));
    /* Exam mode is timed by default because that is what an exam is. Study
       mode is not: a countdown that ends the session is the opposite of
       working through a paper at your own pace with the answers showing.
       An attempt already under way keeps whatever it was started with. */
    var wantTimed = saved && typeof saved.timed === "boolean"
      ? saved.timed : !wantStudy;
    timeBox.appendChild(el("div", "timer-row",
      '<label class="switch">' +
        '<input type="checkbox" id="timerOn"' +
          (wantTimed ? " checked" : "") + " />" +
        '<span class="switch-track"><span class="switch-dot"></span></span>' +
        "<span>" + esc(t("exam.timed")) + "</span>" +
      "</label>" +
      '<label class="minutes-field">' +
        "<span>" + esc(t("exam.minutes")) + "</span>" +
        '<input type="number" id="timerMinutes" min="1" max="300"' +
          (wantTimed ? "" : " disabled") + ' value="' +
          ((saved && saved.minutes) || lv.minutes) + '" />' +
      "</label>" +
      '<span class="setup-hint" id="timeHint"></span>'));
    card.appendChild(timeBox);

    /* -- actions -- */
    var actions = el("div", "setup-actions");
    var startBtn = el("button", "btn btn-primary btn-lg", t("exam.start"));
    startBtn.type = "button";
    actions.appendChild(startBtn);

    if (saved && saved.answers && Object.keys(saved.answers).length) {
      var resume = el("button", "btn btn-gold",
        t(saved.reviewed ? "exam.seeResult" : "exam.resume"));
      resume.type = "button";
      resume.addEventListener("click", function () {
        startExam(collectSetup(), saved);
      });
      actions.appendChild(resume);
    }

    var browse = el("a", "btn btn-ghost", t("exam.browseOthers"));
    browse.setAttribute("href", "exams.html");
    actions.appendChild(browse);
    card.appendChild(actions);

    card.appendChild(el("p", "setup-note", t("exam.setupNote")));

    wrap.appendChild(card);
    root.appendChild(wrap);

    /* -- interactions -- */
    var minutesEdited = false;   // stop suggesting a duration once set by hand
    var timerTouched = false;    // ...and stop moving the clock with the mode

    function refreshHint() {
      var n = pickedCount(pickedCategories());
      var hint = document.getElementById("timeHint");
      if (hint) {
        hint.textContent = n
          ? n + " " + t("exam.selected")
          : t("exam.selectOne");
      }
      startBtn.disabled = !n;
      var mins = document.getElementById("timerMinutes");
      if (mins && n && !minutesEdited &&
          document.getElementById("timerOn").checked) {
        mins.value = Math.max(1,
          Math.round(lv.minutes * n / exam.totalQuestions));
      }
    }

    card.addEventListener("change", function (ev) {
      var t = ev.target;
      if (t.name === "part") {
        t.closest(".part-card").classList.toggle("is-on", t.checked);
        refreshHint();
      }
      if (t.name === "mode") {
        Array.prototype.forEach.call(card.querySelectorAll(".mode-card"),
          function (m) {
            m.classList.toggle("is-on", m.contains(t) && t.checked);
          });
        /* Follow the mode unless the visitor has already made up their own
           mind about the clock. */
        if (!timerTouched) {
          var on = document.getElementById("timerOn");
          var mins = document.getElementById("timerMinutes");
          on.checked = t.value === "exam";
          mins.disabled = !on.checked;
        }
        refreshHint();
      }
      if (t.id === "timerOn") {
        timerTouched = true;
        document.getElementById("timerMinutes").disabled = !t.checked;
        refreshHint();
      }
      if (t.id === "timerMinutes") minutesEdited = true;
    });

    card.addEventListener("input", function (ev) {
      if (ev.target.id === "timerMinutes") minutesEdited = true;
    });

    startBtn.addEventListener("click", function () {
      clearProgress();
      startExam(collectSetup(), null);
    });

    refreshHint();
  }

  /* The checkboxes carry skill ids (see renderSetup). */
  function pickedCategories() {
    var chosen = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="part"]:checked'),
      function (i) { chosen.push(i.value); });
    return chosen;
  }

  /* How many questions the current tick-boxes add up to. */
  function pickedCount(categories) {
    var n = 0;
    state.exam.parts.forEach(function (part) {
      part.questions.forEach(function (q) {
        if (categories.indexOf(q.category) !== -1) n++;
      });
    });
    return n;
  }

  function collectSetup() {
    var modeInput = document.querySelector('input[name="mode"]:checked');
    var timerOn = document.getElementById("timerOn");
    var minutes = document.getElementById("timerMinutes");
    return {
      categories: pickedCategories(),
      mode: modeInput ? modeInput.value : "exam",
      timed: timerOn ? timerOn.checked : true,
      minutes: minutes ? Math.max(1, parseInt(minutes.value, 10) || 60) : 60
    };
  }

  /* ------------------------------------------------------------ grouping */

  /* Group the flat question list the way the booklet lays it out:
     section (one 問題 instruction, one audio track) -> block (one reading
     passage) -> questions. */
  function buildSections(items) {
    var sections = [];

    items.forEach(function (item, i) {
      item.index = i;
      var q = item.q;
      var last = sections[sections.length - 1];

      if (!last ||
          last.instruction !== (q.instruction || null) ||
          last.category !== item.category) {
        last = {
          instruction: q.instruction || null,
          audio: q.audio || null,
          category: item.category,
          tag: sectionTag(q.instruction),
          blocks: []
        };
        sections.push(last);
      }

      var block = last.blocks[last.blocks.length - 1];
      if (!block || block.passage !== (q.passage || null)) {
        block = { passage: q.passage || null, questions: [] };
        last.blocks.push(block);
      }
      block.questions.push(item);
    });

    return sections;
  }

  /* ---------------------------------------------------------- exam screen */

  function startExam(setup, saved) {
    state.mode = (saved && saved.mode) || setup.mode;
    state.timed = setup.timed;
    state.minutes = setup.minutes;
    state.categories = setup.categories;
    state.answers = (saved && saved.answers) || {};
    state.flags = (saved && saved.flags) || {};
    state.reviewed = false;
    state.filter = "all";
    state.current = 0;

    /* Walk every booklet and keep the questions whose skill was chosen. The
       key keeps the booklet in it so a saved attempt still lines up. */
    var wanted = (setup.categories && setup.categories.length)
      ? setup.categories : null;
    var list = [];
    state.exam.parts.forEach(function (p) {
      p.questions.forEach(function (q) {
        if (wanted && wanted.indexOf(q.category) === -1) return;
        list.push({
          key: p.id + "-" + q.n,
          part: p.id,
          partLabel: p.label,
          category: q.category,
          q: q
        });
      });
    });
    state.questions = list;
    state.sections = buildSections(list);
    state.papers = examPapers();
    state.paper = state.papers.length ? state.papers[0].key : null;

    state.startedAt = (saved && saved.startedAt) || Date.now();
    if (state.timed) {
      state.deadline = (saved && saved.deadline) ||
        (Date.now() + state.minutes * 60000);
    } else {
      state.deadline = null;
    }

    /* Write the attempt out as soon as it starts, not on the first answer.
       Progress used to be saved only when something was answered or flagged,
       so opening a paper and pressing Back before answering anything left
       nothing on disk - and the setup screen, having no attempt to read,
       fell back to its defaults. That is what made a study session come
       back as an exam. */
    saveProgress();

    /* a saved attempt that was already submitted reopens as the marked paper */
    if (saved && saved.reviewed) {
      score();
      state.reviewed = true;
      renderPaper();
      return;
    }

    renderPaper();
    if (state.timed) startTicker();
    window.scrollTo(0, 0);
  }

  /* Two different clocks wearing the same face.

     In exam mode it counts down to a deadline and submits the paper when it
     reaches zero, because that is what sitting an exam means.

     In study mode it counts up. A study session has no deadline - the whole
     point is to read the explanation, go back, try again - and a countdown
     that force-submits your paper mid-question is the opposite of that. It
     used to do exactly that: the timer was on by default in both modes and
     `submitExam(true)` fired regardless, so anyone working slowly through an
     N2 reading section was ejected to a score screen they never asked for.
     Now it is a stopwatch: useful for pacing, harmless if ignored. */
  function startTicker() {
    stopTicker();
    var studying = state.mode === "study";
    state.ticker = setInterval(function () {
      var out = document.getElementById("examClock");
      if (studying) {
        if (out) out.textContent = clock(Math.round(
          (Date.now() - state.startedAt) / 1000));
        return;
      }
      var left = Math.round((state.deadline - Date.now()) / 1000);
      if (out) {
        out.textContent = clock(left);
        out.parentNode.classList.toggle("is-urgent", left <= 300);
      }
      if (left <= 0) {
        stopTicker();
        submitExam(true);
      }
    }, 1000);
  }

  function stopTicker() {
    if (state.ticker) clearInterval(state.ticker);
    state.ticker = null;
  }

  function answeredCount() {
    var n = 0;
    state.questions.forEach(function (item) {
      if (state.answers[item.key]) n++;
    });
    return n;
  }

  /* --------------------------------------------------------- the paper */

  function renderPaper() {
    var lv = LEVELS[state.exam.level] || LEVELS.N3;
    root.innerHTML = "";
    root.style.setProperty("--level-color", lv.color);
    root.classList.toggle("is-reviewed", state.reviewed);

    root.appendChild(buildBar());

    var wrap = el("div", "container exam-body");

    var main = el("div", "exam-paper");
    main.id = "examPaper";

    if (state.reviewed) main.appendChild(buildScorecard());

    /* One paper at a time, the way the real sitting works. */
    if (state.papers.length > 1) main.appendChild(buildPaperTabs());

    state.sections.forEach(function (section) {
      if (state.paper && paperOfCategory(section.category) !== state.paper) return;
      main.appendChild(buildSection(section));
    });

    main.appendChild(buildFinish());
    wrap.appendChild(main);

    var side = el("aside", "exam-side");
    side.innerHTML =
      '<div class="palette-card">' +
        "<h3>" + esc(t("exam.questionMap")) + "</h3>" +
        '<div id="palette"></div>' +
        '<div class="palette-legend">' +
          (state.reviewed
            ? '<span><i class="dot dot-done"></i>' + esc(t("exam.legendCorrect")) + '</span>' +
              '<span><i class="dot dot-bad"></i>' + esc(t("exam.legendIncorrect")) + '</span>' +
              '<span><i class="dot dot-todo"></i>' + esc(t("exam.legendBlank")) + '</span>'
            : '<span><i class="dot dot-done"></i>' + esc(t("exam.legendAnswered")) + '</span>' +
              '<span><i class="dot dot-flag"></i>' + esc(t("exam.legendFlagged")) + '</span>' +
              '<span><i class="dot dot-todo"></i>' + esc(t("exam.legendBlank")) + '</span>') +
        "</div>" +
      "</div>";
    wrap.appendChild(side);

    root.appendChild(wrap);

    buildPalette();
    wirePaper();
    syncStickyOffsets();
    refreshProgress();
    updateSpy();
  }

  function buildBar() {
    var bar = el("div", "exam-bar");
    /* Two labels: the sentence on a wide screen, and just 語 on a phone, where
       a third row in the sticky bar would cost a fifth of the viewport. */
    var wordsLabel = t(state.wordsOpen ? "exam.wordsHideAll" : "exam.wordsShowAll");
    var wordsAll = state.glossary
      ? '<button type="button" class="btn btn-ghost words-all' +
        (state.wordsOpen ? " is-on" : "") + '" id="wordsAllBtn" aria-label="' +
        esc(wordsLabel) + '">' +
        '<span class="words-all-full">' + esc(wordsLabel) + "</span>" +
        '<span class="words-all-short" aria-hidden="true">\u8a9e</span>' +
        "</button>"
      : "";
    /* Leaving is safe at any point: answers, flags and the deadline are all
       written to storage as you go, and reopening the paper offers Resume. */
    /* Back steps out one level, to this paper's own setup screen - the place
       to change which sections you are sitting, switch between exam and study
       mode, or reset the timer. It used to jump straight to the library,
       which meant the only way to change your mind about the mode was to
       find the same paper again and reopen it. The setup screen's own back
       button carries on to the library, so the way out is two presses and
       each one is reversible. Dropping the query string is what returns the
       page to setup: with no ?cat= or ?mode= it renders the chooser, and the
       saved attempt shows up there as Resume. */
    var backLabel = t("exam.backToSetup");
    var left =
      '<div class="exam-bar-id">' +
        '<a class="exam-back" href="exam.html?id=' + esc(state.exam.id) +
          '" aria-label="' + esc(backLabel) +
          '" title="' + esc(backLabel) + '">' +
          '<span class="exam-back-arrow" aria-hidden="true">\u2190</span>' +
          '<span class="exam-back-text">' + esc(backLabel) + "</span>" +
        "</a>" +
        '<span class="exam-level-chip">' + esc(state.exam.level) + "</span>" +
        '<span class="exam-bar-period">' + esc(state.exam.periodLabel) + "</span>" +
      "</div>";

    if (state.reviewed) {
      var s = state.score;
      bar.innerHTML =
        '<div class="container exam-bar-inner">' + left +
          '<div class="exam-bar-progress">' +
            '<span class="bar-section" id="barSection">' + esc(t("exam.reviewing")) + '</span>' +
          "</div>" +
          '<div class="exam-bar-tools">' + wordsAll +
            '<div class="exam-timer is-off">' + s.rightTotal + " / " +
              s.qTotal + " " + esc(t("exam.correctOf")) + "</div>" +
            '<button type="button" class="btn btn-primary" id="retryBtn">' +
              esc(t("exam.retake")) + "</button>" +
          "</div>" +
        "</div>";
      return bar;
    }

    bar.innerHTML =
      '<div class="container exam-bar-inner">' + left +
        '<div class="exam-bar-progress">' +
          '<div class="progress-track">' +
            '<div class="progress-fill" id="examProgress"></div></div>' +
          '<span id="examCount"></span>' +
        "</div>" +
        '<div class="exam-bar-tools">' +
          '<span class="bar-section" id="barSection"></span>' + wordsAll +
          (state.timed
            ? '<div class="exam-timer' +
              /* A stopwatch is not a deadline: no urgency colour, no ticking
                 down towards anything. */
              (state.mode === "study" ? " is-stopwatch" : "") +
              '"><span aria-hidden="true">⏱</span>' +
              '<strong id="examClock">' +
              clock(state.mode === "study"
                ? Math.round((Date.now() - state.startedAt) / 1000)
                : Math.round((state.deadline - Date.now()) / 1000)) +
              "</strong></div>"
            : '<div class="exam-timer is-off">' + esc(t("exam.untimed")) + '</div>') +
          '<button type="button" class="btn btn-primary" id="submitBtn">' +
            esc(t("exam.submit")) + "</button>" +
        "</div>" +
      "</div>";
    return bar;
  }

  function buildSection(section) {
    var node = el("section", "paper-section");
    var meta = CATEGORY_META[section.category] || { label: "", sub: "" };

    var head = el("div", "section-head");
    head.innerHTML =
      '<div class="section-head-top">' +
        (section.tag ? '<span class="section-tag">' + esc(section.tag) +
          "</span>" : "") +
        '<span class="section-kind">' + esc(metaLabel(CATEGORY_META, section.category)) +
          ' <em>' + esc(meta.sub) + "</em></span>" +
      "</div>" +
      (section.instruction
        ? '<div class="section-instruction">' + section.instruction + "</div>"
        : "");

    if (section.audio) {
      var dead = DEAD_AUDIO_IDS.indexOf(driveId(section.audio)) !== -1;
      head.appendChild(el("div", "q-audio" + (dead ? " is-failed" : ""),
        '<div class="q-audio-head"><strong>' + esc(t("exam.audio")) +
          "</strong></div>" +
        (dead
          ? '<p class="q-audio-note">' + deadAudioHTML() + "</p>"
          : '<iframe src="' + esc(audioURL(section.audio)) + '" width="100%" ' +
            'height="80" allow="autoplay" title="' + esc(t("exam.audio")) +
            '" loading="lazy"></iframe>' +
            '<p class="q-audio-note">' + esc(t("exam.audioNote")) + "</p>" +
            /* No error event fires for a cross-origin iframe, so the way out
               is offered up front rather than after a failure we cannot see. */
            '<details class="q-audio-help"><summary>' +
              esc(t("exam.audioTrouble")) + "</summary><p>" +
              audioHelpHTML() + "</p></details>")));
    }
    node.appendChild(head);

    section.blocks.forEach(function (block) {
      node.appendChild(buildBlock(block));
    });
    return node;
  }

  function buildBlock(block) {
    var node = el("div", "paper-block" + (block.passage ? " has-passage" : ""));

    if (block.passage) {
      var pnode = el("div", "q-passage",
        '<div class="q-passage-label">' + esc(t("exam.passage")) + '</div>' +
        '<div class="q-passage-body">' + block.passage + "</div>");
      /* The passage words are collected once, against the first question
         under it, rather than repeated beneath all four. The button goes
         directly under the label: a passage can be taller than the screen,
         and this box is sticky, so a control at the bottom of it may never
         come into reach. */
      var pwords = buildWords(block.questions[0].key, "passage");
      if (pwords) pnode.insertBefore(pwords, pnode.querySelector(".q-passage-body"));
      node.appendChild(pnode);
    }

    var col = el("div", "block-questions");
    block.questions.forEach(function (item) {
      col.appendChild(buildQuestion(item));
    });
    node.appendChild(col);
    return node;
  }

  function buildQuestion(item) {
    var q = item.q;
    var node = el("article", "paper-question");
    node.id = "q-" + item.index;
    node.dataset.index = String(item.index);

    var blank = isBlankChoices(q);
    var picked = state.answers[item.key] || null;

    /* running number | (the paper's own number + prompt) | flag.
       The paper number is only worth showing when it differs from the running
       count - otherwise it just repeats the badge next to it. */
    var showNumber = q.number && String(q.number) !== String(item.index + 1);
    var head = el("div", "pq-head");
    head.innerHTML =
      '<span class="pq-num">' + (item.index + 1) + "</span>" +
      '<div class="pq-prompt' + (q.prompt ? "" : " is-bare") + '">' +
        (showNumber ? '<span class="q-number">' + esc(q.number) + "</span>" : "") +
        (q.prompt || "") +
      "</div>";

    if (!state.reviewed) {
      var flag = el("button", "flag-btn" +
        (state.flags[item.key] ? " is-on" : ""), '<span aria-hidden="true">⚑</span>');
      flag.type = "button";
      flag.dataset.flag = String(item.index);
      flag.title = t("exam.flag");
      flag.setAttribute("aria-label", t("exam.flag") + " " + (item.index + 1));
      flag.setAttribute("aria-pressed", state.flags[item.key] ? "true" : "false");
      head.appendChild(flag);
    }
    node.appendChild(head);

    var choices = el("div", "q-choices" + (blank ? " is-numeric" : ""));
    q.choices.forEach(function (text, ci) {
      var value = ci + 1;
      var cls = "choice";
      if (state.reviewed) {
        if (q.answer === value) cls += " is-correct";
        if (picked === value && q.answer !== value) cls += " is-wrong";
        if (picked === value) cls += " is-picked";
      } else if (picked === value) {
        cls += " is-chosen";
      }
      var b = el("button", cls);
      b.type = "button";
      b.dataset.value = String(value);
      b.dataset.index = String(item.index);
      b.setAttribute("aria-pressed", picked === value ? "true" : "false");
      if (state.reviewed) b.disabled = true;
      b.innerHTML =
        '<span class="choice-num">' + value + "</span>" +
        (blank ? "" : '<span class="choice-text">' + text + "</span>") +
        (state.reviewed && q.answer === value
          ? '<span class="choice-mark">' + esc(t("exam.legendCorrect")) + '</span>' : "") +
        (state.reviewed && picked === value && q.answer !== value
          ? '<span class="choice-mark">' + esc(t("exam.legendIncorrect")) + '</span>' : "");
      choices.appendChild(b);
    });
    node.appendChild(choices);

    if (blank) {
      node.appendChild(el("p", "q-blank-note", t("exam.spokenOnly")));
    }

    var words = buildWords(item.key, "question");
    if (words) node.appendChild(words);

    var fb = el("div", "q-feedback");
    fb.dataset.feedback = String(item.index);
    node.appendChild(fb);

    if (state.reviewed) {
      annotate(item, node);
    } else if (state.mode === "study" && picked) {
      reveal(item, node);
    }

    return node;
  }

  /* ------------------------------------------------------- word meanings */

  /* The keys for one question or one reading passage, or null when this
     paper has no glossary or nothing in it was hard enough to gloss. */
  function wordKeys(id, scope) {
    var g = state.glossary;
    if (!g) return null;
    var table = scope === "passage" ? g.passages : g.questions;
    var keys = table && table[id];
    return keys && keys.length ? keys : null;
  }

  /* Furigana over the kanji only: 割る is built as 割(わ)る, not 割る(わる),
     because a reading stretched over the okurigana is harder to read, not
     easier. Words with no alignment fall back to a whole-word ruby. */
  function rubyHTML(w) {
    if (w.ruby) {
      return w.ruby.map(function (seg) {
        return seg[1]
          ? "<ruby>" + esc(seg[0]) + "<rt>" + esc(seg[1]) + "</rt></ruby>"
          : esc(seg[0]);
      }).join("");
    }
    if (w.r) return "<ruby>" + esc(w.w) + "<rt>" + esc(w.r) + "</rt></ruby>";
    return esc(w.w);
  }

  function buildWords(id, scope) {
    var keys = wordKeys(id, scope);
    if (!keys) return null;
    var g = state.glossary;

    var rows = keys.map(function (k) {
      var w = g.words[k];
      if (!w) return "";
      return '<li class="gw">' +
        '<span class="gw-w">' + rubyHTML(w) + "</span>" +
        '<span class="gw-meta">' +
          (w.lv ? '<span class="gw-lv">' + esc(w.lv) + "</span>" : "") +
          (w.p ? '<span class="gw-p">' + esc(w.p) + "</span>" : "") +
        "</span>" +
        '<span class="gw-g">' + esc(w.g.join("; ")) + "</span>" +
      "</li>";
    }).join("");

    var group = el("div", "q-words");
    group.innerHTML =
      '<button type="button" class="words-btn" data-words="1" ' +
        'aria-expanded="false">' +
        '<span class="words-icon" aria-hidden="true">\u8a9e</span>' +
        "<span>" + esc(t("exam.words")) + "</span>" +
        '<span class="words-n">' + keys.length + "</span>" +
      "</button>" +
      '<div class="wordbox">' +
        '<p class="wordbox-head">' +
          esc(t(scope === "passage" ? "exam.wordsPassage" : "exam.wordsHere")) +
        "</p>" +
        '<ul class="wordlist">' + rows + "</ul>" +
      "</div>";
    if (state.wordsOpen) group.classList.add("is-open");
    return group;
  }

  function toggleWords(group) {
    var open = !group.classList.contains("is-open");
    group.classList.toggle("is-open", open);
    var btn = group.querySelector(".words-btn");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function setAllWords(open) {
    state.wordsOpen = open;
    Array.prototype.forEach.call(document.querySelectorAll(".q-words"),
      function (group) {
        group.classList.toggle("is-open", open);
        var btn = group.querySelector(".words-btn");
        if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    var all = document.getElementById("wordsAllBtn");
    if (all) {
      var label = t(open ? "exam.wordsHideAll" : "exam.wordsShowAll");
      all.classList.toggle("is-on", open);
      all.setAttribute("aria-label", label);
      var full = all.querySelector(".words-all-full");
      if (full) full.textContent = label;
    }
  }

  /* Accuracy per skill. Deliberately not dressed up as a score out of 60:
     the exam does not award one for vocabulary or grammar on their own, and
     inventing one would read as an official mark. */
  function buildSkillTable(s) {
    var box = el("div", "result-skills");
    box.appendChild(el("h2", null, t("exam.skillBreakdown")));

    var grid = el("div", "skill-rows");
    s.skills.forEach(function (sk) {
      var row = el("div", "skill-row");
      row.style.setProperty("--accent", CATEGORY_COLOR[sk.key] || "var(--blue)");
      row.innerHTML =
        '<div class="skill-name">' + esc(sk.label) + "</div>" +
        '<div class="skill-bar"><div class="skill-bar-fill" style="width:' +
          sk.percent + '%"></div></div>' +
        '<div class="skill-val"><strong>' + sk.percent + "%</strong>" +
          "<span>" + sk.right + " / " + sk.total + "</span></div>";
      grid.appendChild(row);
    });
    box.appendChild(grid);
    return box;
  }

  function buildScorecard() {
    var s = state.score;
    var box = el("div", "scorecard");

    if (s.timeUp) {
      box.appendChild(el("div", "result-flash",
        "⏱ " + t("exam.timeUp")));
    }

    var head = el("div", "result-head" + (s.passed ? " is-pass" : " is-fail"));
    head.innerHTML =
      '<div class="result-verdict">' +
        '<span class="result-badge">' + (s.passed ? t("exam.pass") : t("exam.notYet")) +
          "</span>" +
        "<h1>" + esc(state.exam.title) + "</h1>" +
        "<p>" + s.rightTotal + " " + esc(t("exam.of")) + " " + s.qTotal + " " +
          esc(t("exam.correctLower")) + " · " + s.percent + "%</p>" +
      "</div>" +
      '<div class="result-score">' +
        '<div class="result-score-num">' + s.scaledTotal +
          "<span>/ " + s.capTotal + "</span></div>" +
        '<div class="result-score-label">' + esc(t("exam.scaledScore")) + '</div>' +
        '<div class="result-score-pass">' + esc(t("exam.passMark")) + ' ' + s.passMark +
          (s.partial ? " (" + t("exam.thisSelection") + ")" : "") + "</div>" +
      "</div>";
    box.appendChild(head);

    if (!s.allMins) {
      box.appendChild(el("p", "result-warn", t("exam.minWarn")));
    }
    if (s.partial) {
      box.appendChild(el("p", "result-note", t("exam.partialNote")));
    }

    var table = el("div", "result-sections");
    table.appendChild(el("h2", null, t("exam.breakdown")));
    var rows = el("div", "section-rows");
    s.sections.forEach(function (sec) {
      var pct = sec.cap ? (sec.scaled / sec.cap) * 100 : 0;
      rows.appendChild(el("div",
        "section-row" + (sec.clearedMin ? "" : " is-below"),
        '<div class="section-name">' + esc(sec.label) +
          "<span>" + sec.right + "/" + sec.total + " " + esc(t("exam.correctLower")) + "</span></div>" +
        '<div class="section-bar"><div class="section-bar-fill" style="width:' +
          pct + '%"></div><div class="section-bar-min" style="left:' +
          (sec.cap ? (sec.minimum / sec.cap) * 100 : 0) + '%"></div></div>' +
        '<div class="section-val">' + sec.scaled +
          "<span>/" + sec.cap + "</span></div>"));
    });
    table.appendChild(rows);
    table.appendChild(el("p", "section-legend",
      t("exam.minMarker") + " (" +
      s.sections.map(function (x) { return x.label + " " + x.minimum; })
        .join(" · ") + ")."));
    box.appendChild(table);

    if (s.skills && s.skills.length > 1) box.appendChild(buildSkillTable(s));

    var acts = el("div", "review-bar");
    acts.innerHTML =
      '<div class="review-filters">' +
        '<button type="button" class="chip is-on" data-filter="all">' +
          esc(t("exam.wholePaper")) + "</button>" +
        '<button type="button" class="chip" data-filter="wrong">' +
          esc(t("exam.legendIncorrect")) + " " + s.wrongTotal + "</button>" +
        '<button type="button" class="chip" data-filter="blank">' +
          esc(t("exam.legendBlank")) + " " + s.blankTotal + "</button>" +
        '<button type="button" class="chip" data-filter="right">' +
          esc(t("exam.legendCorrect")) + " " + s.rightTotal + "</button>" +
      "</div>" +
      '<div class="review-actions">' +
        '<a class="btn btn-gold" href="exams.html">' + esc(t("exam.anotherExam")) + '</a>' +
        '<a class="btn btn-ghost" href="levels.html?lv=' +
          esc(state.exam.level) + '">' + esc(t("exam.backToPractice")) + '</a>' +
      "</div>";
    box.appendChild(acts);

    return box;
  }

  /* The switcher. Each tab carries how much of that paper is done, which is
     the one number worth showing here - the bar above already has the total. */
  function buildPaperTabs() {
    var nav = el("div", "paper-tabs");
    nav.setAttribute("role", "tablist");

    state.papers.forEach(function (paper) {
      var done = 0;
      paper.items.forEach(function (i) {
        if (state.answers[state.questions[i].key]) done++;
      });
      var on = paper.key === state.paper;
      var b = el("button", "paper-tab" + (on ? " is-on" : ""));
      b.type = "button";
      b.dataset.paper = paper.key;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.innerHTML =
        '<span class="paper-tab-name">' + esc(paper.label) + "</span>" +
        '<span class="paper-tab-count">' + done + " / " + paper.items.length + "</span>";
      nav.appendChild(b);
    });

    nav.addEventListener("click", function (ev) {
      var tab = ev.target.closest(".paper-tab");
      if (!tab || tab.dataset.paper === state.paper) return;
      showPaper(tab.dataset.paper);
    });

    return nav;
  }

  function showPaper(key) {
    state.paper = key;
    var first = null;
    state.papers.forEach(function (p) {
      if (p.key === key && p.items.length) first = p.items[0];
    });
    if (first !== null) state.current = first;
    renderPaper();
    window.scrollTo(0, 0);
  }

  function buildFinish() {
    var box = el("div", "paper-finish");
    if (state.reviewed) {
      box.innerHTML =
        "<h2>" + esc(t("exam.endOfPaper")) + "</h2>" +
        "<p>" + esc(t("exam.reviewHint")) + "</p>";
      var again = el("button", "btn btn-primary btn-lg", t("exam.retakeExam"));
      again.type = "button";
      again.id = "retryBtn2";
      box.appendChild(again);
      return box;
    }

    box.innerHTML =
      "<h2>" + esc(t("exam.endOfPaper")) + "</h2>" +
      '<p id="finishSummary"></p>';
    var submit = el("button", "btn btn-primary btn-lg", t("exam.submitExam"));
    submit.type = "button";
    submit.id = "submitBtn2";
    box.appendChild(submit);
    return box;
  }

  /* ------------------------------------------------------------- palette */

  function buildPalette() {
    var host = document.getElementById("palette");
    if (!host) return;
    host.innerHTML = "";

    var lastCategory = null;
    var group = null;
    state.questions.forEach(function (item, i) {
      /* Only the paper on screen: a map of questions you cannot see from here
         would jump the reader somewhere else without saying so. */
      if (state.paper && paperOfCategory(item.category) !== state.paper) return;
      if (item.category !== lastCategory) {
        lastCategory = item.category;
        var meta = CATEGORY_META[item.category] || { label: item.partLabel };
        host.appendChild(el("div", "palette-part",
          esc(metaLabel(CATEGORY_META, item.category))));
        group = el("div", "palette-grid");
        host.appendChild(group);
      }
      var b = el("button", "palette-cell", String(i + 1));
      b.type = "button";
      b.dataset.index = String(i);
      group.appendChild(b);
    });

    host.addEventListener("click", function (ev) {
      var cell = ev.target.closest(".palette-cell");
      if (cell) jumpTo(parseInt(cell.dataset.index, 10));
    });

    refreshPalette();
  }

  function statusOf(item) {
    var picked = state.answers[item.key];
    if (!state.reviewed) return picked ? "done" : "todo";
    if (!picked) return "blank";
    if (!item.q.answer) return "unknown";
    return picked === item.q.answer ? "right" : "wrong";
  }

  function refreshPalette() {
    Array.prototype.forEach.call(document.querySelectorAll(".palette-cell"),
      function (cell) {
        var item = state.questions[parseInt(cell.dataset.index, 10)];
        var st = statusOf(item);
        cell.classList.toggle("is-done", st === "done" || st === "right");
        cell.classList.toggle("is-bad", st === "wrong");
        cell.classList.toggle("is-flagged",
          !state.reviewed && !!state.flags[item.key]);
        cell.classList.toggle("is-current", item.index === state.current);
      });
  }

  function refreshProgress() {
    var total = state.questions.length;
    var done = answeredCount();

    var fill = document.getElementById("examProgress");
    if (fill) fill.style.width = (total ? (done / total) * 100 : 0) + "%";
    var count = document.getElementById("examCount");
    if (count) count.textContent = done + " / " + total + " " + t("exam.answered");

    var summary = document.getElementById("finishSummary");
    if (summary) {
      var blanks = total - done;
      summary.textContent = blanks === 0
        ? t("exam.allAnswered")
        : blanks + " " + t(blanks === 1 ? "exam.blankRemains" : "exam.blanksRemain");
    }
    refreshPalette();
  }

  function jumpTo(index) {
    /* A question on another paper: switch to it first, then jump. */
    var item = state.questions[index];
    if (item && state.paper && paperOfCategory(item.category) !== state.paper) {
      state.paper = paperOfCategory(item.category);
      renderPaper();
    }
    var node = document.getElementById("q-" + index);
    if (!node) return;
    state.current = index;
    /* A full paper is tens of thousands of pixels tall, so smooth scrolling
       between distant questions would crawl. Jump instantly and flash the
       target instead. */
    node.scrollIntoView({ block: "start", behavior: "instant" });
    node.classList.add("is-target");
    setTimeout(function () { node.classList.remove("is-target"); }, 1200);
    refreshPalette();
    setBarSection(index);   /* don't wait for a scroll event to catch up */
  }

  function setBarSection(index) {
    var label = document.getElementById("barSection");
    if (!label || state.reviewed) return;
    var item = state.questions[index];
    if (!item) return;
    var tag = sectionTag(item.q.instruction);
    var meta = CATEGORY_META[item.category] || {};
    label.textContent = (tag ? tag + " · " : "") +
      metaLabel(CATEGORY_META, item.category);
  }

  /* Which question is at the top of the viewport, so the question map and the
     section label in the command bar follow the reader.

     The listener is attached once, at module level: attaching it inside the
     render path stacked a new one on every re-render, and a closure-local
     handler can never be removed again. Throttled with a timer rather than
     requestAnimationFrame so it also runs in headless browsers. */
  var spyTimer = null;

  function updateSpy() {
    spyTimer = null;
    if (!state.questions.length) return;

    var bar = document.querySelector(".exam-bar");
    /* Sits a little below where a jumped-to question lands (its
       scroll-margin-top), so the map agrees with the jump. */
    var ref = (bar ? bar.getBoundingClientRect().bottom : 0) + 28;
    var nodes = document.querySelectorAll(".paper-question");

    /* The current question is the last one whose top has passed the reference
       line just under the command bar; before any has, it is the first. */
    var chosen = null;
    var first = null;
    Array.prototype.forEach.call(nodes, function (n) {
      if (n.hidden) return;
      if (first === null) first = n;
      if (n.getBoundingClientRect().top <= ref) chosen = n;
    });
    chosen = chosen || first;
    if (!chosen) return;

    var idx = parseInt(chosen.dataset.index, 10);
    if (idx !== state.current) {
      state.current = idx;
      refreshPalette();
    }
    setBarSection(idx);
  }

  function scheduleSpy() {
    if (spyTimer) return;
    spyTimer = setTimeout(updateSpy, 80);
  }

  window.addEventListener("scroll", scheduleSpy, { passive: true });

  /* ------------------------------------------------------------- wiring */

  function wirePaper() {
    var paper = document.getElementById("examPaper");

    paper.addEventListener("click", function (ev) {
      var choice = ev.target.closest(".choice");
      if (choice && !state.reviewed) {
        select(parseInt(choice.dataset.index, 10),
               parseInt(choice.dataset.value, 10));
        return;
      }

      var wordsBtn = ev.target.closest("[data-words]");
      if (wordsBtn) {
        toggleWords(wordsBtn.parentNode);
        return;
      }

      var flag = ev.target.closest("[data-flag]");
      if (flag) {
        var i = parseInt(flag.dataset.flag, 10);
        var item = state.questions[i];
        state.flags[item.key] = !state.flags[item.key];
        flag.classList.toggle("is-on", !!state.flags[item.key]);
        flag.setAttribute("aria-pressed",
          state.flags[item.key] ? "true" : "false");
        saveProgress();
        refreshPalette();
        return;
      }

      if (ev.target.closest("#submitBtn2")) confirmSubmit();
      if (ev.target.closest("#retryBtn2")) retake();

      var chip = ev.target.closest(".chip[data-filter]");
      if (chip) applyFilter(chip);
    });

    var wordsAll = document.getElementById("wordsAllBtn");
    if (wordsAll) {
      wordsAll.addEventListener("click", function () {
        setAllWords(!state.wordsOpen);
      });
    }

    var submit = document.getElementById("submitBtn");
    if (submit) submit.addEventListener("click", confirmSubmit);
    var retry = document.getElementById("retryBtn");
    if (retry) retry.addEventListener("click", retake);
  }

  function select(index, value) {
    var item = state.questions[index];
    var node = document.getElementById("q-" + index);
    if (!item || !node) return;
    if (state.mode === "study" && state.answers[item.key]) return;

    state.answers[item.key] = value;
    saveProgress();

    Array.prototype.forEach.call(node.querySelectorAll(".choice"),
      function (b) {
        var on = parseInt(b.dataset.value, 10) === value;
        b.classList.toggle("is-chosen", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });

    if (state.mode === "study") reveal(item, node);
    refreshProgress();
  }

  function reveal(item, node) {
    var q = item.q;
    var picked = state.answers[item.key];
    var host = node.querySelector(".q-feedback");
    if (!host) return;

    Array.prototype.forEach.call(node.querySelectorAll(".choice"),
      function (b) {
        var v = parseInt(b.dataset.value, 10);
        if (q.answer && v === q.answer) b.classList.add("is-correct");
        if (v === picked && q.answer && v !== q.answer) b.classList.add("is-wrong");
        b.disabled = true;
      });

    if (!q.answer) {
      host.className = "q-feedback is-neutral";
      host.innerHTML = "<strong>" + esc(t("exam.fbNoKey")) + "</strong>" +
        "<p>" + esc(t("exam.fbNoKeyBody")) + "</p>";
      return;
    }

    var ok = picked === q.answer;
    host.className = "q-feedback " + (ok ? "is-right" : "is-wrong");
    host.innerHTML =
      "<strong>" +
      (ok ? "✓ " + esc(t("exam.fbCorrect"))
          : "✗ " + esc(t("exam.fbIncorrectIs")) + " " + q.answer) +
      "</strong>" + explainHTML(item);
  }

  function annotate(item, node) {
    var q = item.q;
    var picked = state.answers[item.key];
    var host = node.querySelector(".q-feedback");
    var st = statusOf(item);
    node.classList.add("is-" + st);

    if (!host) return;
    if (st === "unknown") {
      host.className = "q-feedback is-neutral";
      host.innerHTML = "<strong>" + esc(t("exam.fbNoKey")) + "</strong>";
      return;
    }
    if (st === "blank") {
      host.className = "q-feedback is-neutral";
      host.innerHTML = "<strong>" + esc(t("exam.fbNotAnsweredIs")) + " " +
        q.answer + "</strong>" + explainHTML(item);
      return;
    }
    var ok = picked === q.answer;
    host.className = "q-feedback " + (ok ? "is-right" : "is-wrong");
    host.innerHTML = "<strong>" +
      (ok ? "✓ " + esc(t("exam.fbCorrect"))
          : "✗ " + esc(t("exam.fbIncorrectIs")) + " " + q.answer) +
      "</strong>" + explainHTML(item);
  }

  function explainHTML(item) {
    if (!item.q.explanation) return "";
    return '<div class="q-explain"><span class="q-explain-label">' +
      esc(t(item.category === "listening" ? "exam.transcript" : "exam.explanation")) +
      "</span>" + item.q.explanation + "</div>";
  }

  /* ------------------------------------------------------------ filtering */

  function applyFilter(chip) {
    state.filter = chip.dataset.filter;
    Array.prototype.forEach.call(
      document.querySelectorAll(".chip[data-filter]"),
      function (c) { c.classList.toggle("is-on", c === chip); });

    Array.prototype.forEach.call(document.querySelectorAll(".paper-question"),
      function (n) {
        var item = state.questions[parseInt(n.dataset.index, 10)];
        n.hidden = state.filter !== "all" && statusOf(item) !== state.filter;
      });

    /* collapse blocks and sections that have nothing left to show */
    Array.prototype.forEach.call(document.querySelectorAll(".paper-block"),
      function (b) {
        b.hidden = !b.querySelector(".paper-question:not([hidden])");
      });
    Array.prototype.forEach.call(document.querySelectorAll(".paper-section"),
      function (s) {
        s.hidden = !s.querySelector(".paper-block:not([hidden])");
      });
  }

  /* ------------------------------------------------------------- scoring */

  function confirmSubmit() {
    var total = state.questions.length;
    var blanks = total - answeredCount();
    if (blanks > 0 && !window.confirm(blanks + " " + t("exam.confirmBlanks"))) return;
    submitExam(false);
  }

  function retake() {
    clearProgress();
    stopTicker();
    state.answers = {};
    state.flags = {};
    state.reviewed = false;
    state.score = null;
    renderSetup();
    window.scrollTo(0, 0);
  }

  function score(timeUp) {
    var buckets = {};
    /* The official result only has three parts, because that is how the exam
       is scored. Vocabulary and grammar are marked together inside 言語知識,
       so a weak half hides behind a strong one. Tally each skill separately
       as well - as plain accuracy, since only the three official parts have a
       scaled score to report. */
    var skills = {};
    var rightTotal = 0, wrongTotal = 0, blankTotal = 0;

    state.questions.forEach(function (item) {
      var q = item.q;
      var sec = sectionOf(q, state.exam.level);
      var sk = skills[item.category] ||
        (skills[item.category] = { right: 0, total: 0 });
      sk.total++;
      if (state.answers[item.key] && q.answer &&
          state.answers[item.key] === q.answer) sk.right++;
      var b = buckets[sec] || (buckets[sec] = {
        earned: 0, max: 0, right: 0, wrong: 0, blank: 0, total: 0
      });
      var picked = state.answers[item.key] || null;
      var points = q.points || 1;

      b.total++;
      if (q.answer) b.max += points;

      if (!picked) { b.blank++; blankTotal++; }
      else if (!q.answer) { /* no key - cannot be marked */ }
      else if (picked === q.answer) {
        b.right++; b.earned += points; rightTotal++;
      } else { b.wrong++; wrongTotal++; }
    });

    var combined = state.exam.level === "N4" || state.exam.level === "N5";
    var sections = Object.keys(buckets).map(function (key) {
      var b = buckets[key];
      var cap = (key === "language" && combined) ? 120 : 60;
      var scaled = b.max ? Math.round((b.earned / b.max) * cap) : 0;
      var minimum = cap === 120
        ? 38
        : (LEVELS[state.exam.level] || LEVELS.N3).sectionMin;
      return {
        key: key,
        label: t(SECTION_LABEL[key] || key),
        right: b.right, wrong: b.wrong, blank: b.blank, total: b.total,
        earned: b.earned, maxRaw: b.max,
        scaled: scaled, cap: cap, minimum: minimum,
        clearedMin: scaled >= minimum
      };
    }).sort(function (a, b) {
      var order = { language: 0, reading: 1, listening: 2 };
      return order[a.key] - order[b.key];
    });

    var scaledTotal = sections.reduce(function (s, x) { return s + x.scaled; }, 0);
    var capTotal = sections.reduce(function (s, x) { return s + x.cap; }, 0);
    var qTotal = sections.reduce(function (s, x) { return s + x.total; }, 0);

    var lv = LEVELS[state.exam.level] || LEVELS.N3;
    var passMark = Math.round(lv.pass * (capTotal / 180));
    var allMins = sections.every(function (s) { return s.clearedMin; });

    /* Kept in the paper's own order - vocabulary, grammar, reading, listening
       - rather than sorted by score, so the row you look for is always in the
       same place. */
    var skillOrder = ["vocabulary", "grammar", "reading", "listening"];
    var skillRows = skillOrder.filter(function (k) { return skills[k]; })
      .map(function (k) {
        var b = skills[k];
        return {
          key: k,
          label: metaLabel(CATEGORY_META, k),
          right: b.right,
          total: b.total,
          percent: b.total ? Math.round((b.right / b.total) * 100) : 0
        };
      });

    state.score = {
      skills: skillRows,
      sections: sections,
      scaledTotal: scaledTotal,
      capTotal: capTotal,
      passMark: passMark,
      officialPass: lv.pass,
      passed: scaledTotal >= passMark && allMins,
      allMins: allMins,
      rightTotal: rightTotal,
      wrongTotal: wrongTotal,
      blankTotal: blankTotal,
      qTotal: qTotal,
      percent: qTotal ? Math.round((rightTotal / qTotal) * 100) : 0,
      partial: capTotal < 180,
      timeUp: !!timeUp
    };
  }

  function submitExam(timeUp) {
    stopTicker();
    score(timeUp);
    state.reviewed = true;
    state.filter = "all";
    saveProgress();
    renderPaper();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /* ---------------------------------------------------- keyboard controls */

  document.addEventListener("keydown", function (ev) {
    if (!state.questions.length || state.reviewed) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;

    var item = state.questions[state.current];
    if (!item) return;

    if (ev.key >= "1" && ev.key <= "9") {
      var v = parseInt(ev.key, 10);
      if (v <= item.q.choices.length) {
        select(state.current, v);
        ev.preventDefault();
      }
    } else if (ev.key === "ArrowDown" || ev.key === "ArrowRight") {
      jumpTo(state.current + 1);
      ev.preventDefault();
    } else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") {
      jumpTo(state.current - 1);
      ev.preventDefault();
    } else if (ev.key.toLowerCase() === "f") {
      var node = document.getElementById("q-" + state.current);
      var btn = node && node.querySelector("[data-flag]");
      if (btn) btn.click();
    }
  });

  /* Only warn about leaving when the answers genuinely are at risk.

     Every choice is written to localStorage as it is made, and reloading
     brings back a Resume button that restores the answers, the flags and the
     original deadline - so the browser's "changes you made may not be saved"
     was a false alarm on every reload. It is left in place for the one case
     where it is true: storage that refused the write, in private browsing or
     with a full quota. */
  window.addEventListener("beforeunload", function (ev) {
    if (state.saveFailed && state.questions.length && !state.reviewed &&
        answeredCount() > 0) {
      ev.preventDefault();
      ev.returnValue = "";
    }
  });

  /* Language switch: rebuild whatever screen is showing, keeping answers. */
  document.addEventListener("languagechange", function () {
    if (!state.exam) return;
    if (state.questions.length) {
      renderPaper();
    } else {
      renderSetup();
    }
  });

  boot();
})();
