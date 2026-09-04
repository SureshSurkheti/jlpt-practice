/* ==========================================================================
   JLPT mock exam player
   Renders exams from data/exams/*.json as a real, timed, scored test.

   The exam is presented the way the printed booklet is: one continuous page,
   questions grouped under their 問題 instruction, each reading passage kept
   beside the questions that use it, and every question carrying the number
   the booklet prints beside it. There is no next/previous stepping and no
   question map: the paper is the navigation, and submitting annotates the
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

  /* The organisers publish complete practice workbooks - questions, answers,
     transcripts and listening audio for every level from N5 to N1 - on the
     official site. 46 recordings, all of them reachable.

     A link, and only a link. jlpt.jp welcomes links without prior contact,
     and asks in the same breath that the site not be embedded in another
     one. Its sample page also states that every listening recording for N1
     through N5 contains third-party works whose reproduction is prohibited
     without permission, so rehosting or hotlinking them here would be no
     better than what is already missing. Sending people to the source is
     the whole of what can honestly be done. */
  var OFFICIAL_SAMPLES = "https://www.jlpt.jp/e/samples/sampleindex.html";

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
    N1: { color: "#976b0b", name: "N1 Professional", pass: 100, sectionMin: 19, minutes: 165 },
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
    grammar: "#976b0b",
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

  /* Is the paper currently on screen already marked?

     A sitting is three separate papers - language knowledge, reading,
     listening - and people practise one at a time. Making them submit the
     whole thing to find out how the vocabulary went meant either sitting all
     101 questions or submitting a paper three-quarters blank and reading a
     score that was mostly zeroes.

     So each paper can be marked on its own. Only one paper renders at a
     time, so everything that used to ask "is the attempt submitted?" can ask
     this instead, and gets the right answer for the questions in front of
     it. state.reviewed still means the whole sitting is done.

     Do not use this for anything that spans papers - the scorecard totals,
     the pass verdict - because those are only meaningful once every section
     has been marked. */
  function currentMarked() {
    return state.reviewed || !!(state.paper && state.marked[state.paper]);
  }

  function allMarked() {
    return state.papers.length > 0 && state.papers.every(function (p) {
      return state.marked[p.key];
    });
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
    marked: {},         // paper key -> marked on its own, before the rest
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

  /* Measuring once was not enough.

     The command bar wraps to two or three rows on a phone, and it settled
     into its final height *after* the first measurement - when the webfont
     arrived, or when the progress row wrapped. So --bar-h stayed seven
     pixels short for the rest of the session and everything pinned beneath
     it sat seven pixels too high: the reading passage, the scroll-margin
     that decides where a jumped-to question lands, and the listening player,
     which overlapped the bar it is docked to.

     Watch the two elements instead of waiting for a resize event that never
     comes. Observing fires the callback once by itself, which is the
     re-measure we want; nothing in the callback changes either element's
     height, so it settles immediately rather than looping. */
  var stickyRO = null;
  var watchedBar = null;

  function watchSticky() {
    if (typeof ResizeObserver !== "function") return;
    if (!stickyRO) stickyRO = new ResizeObserver(syncStickyOffsets);
    var header = document.querySelector(".site-header");
    if (header && !watchSticky.header) {
      stickyRO.observe(header);
      watchSticky.header = header;
    }
    /* The bar is rebuilt on every render, so swap the subscription rather
       than stacking one per render. */
    var bar = document.querySelector(".exam-bar");
    if (bar && bar !== watchedBar) {
      if (watchedBar) stickyRO.unobserve(watchedBar);
      stickyRO.observe(bar);
      watchedBar = bar;
    }
  }

  window.addEventListener("resize", syncStickyOffsets);
  window.addEventListener("orientationchange", syncStickyOffsets);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncStickyOffsets);
  }

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

  function officialLinkHTML() {
    return '<a class="text-link" href="' + OFFICIAL_SAMPLES + '" ' +
      'target="_blank" rel="noopener noreferrer">' +
      esc(t("exam.audioOfficial")) + "</a>";
  }

  function appLinksHTML() {
    return '<a href="' + esc(LISTENING_APP.android) + '" target="_blank" ' +
      'rel="noopener noreferrer">' + esc(LISTENING_APP.name) + " (Android)</a>" +
      " \u00b7 " +
      '<a href="' + esc(LISTENING_APP.ios) + '" target="_blank" ' +
      'rel="noopener noreferrer">iOS</a>';
  }

  /* The official workbook first, the app second: one is the exam's own
     material and the other is somebody else's practice. */
  function deadAudioHTML() {
    return "<strong>" + esc(t("exam.audioFailed")) + "</strong> " +
      officialLinkHTML() + " \u00b7 " +
      esc(t("exam.audioHelp")) + " " + appLinksHTML();
  }

  function audioHelpHTML() {
    return officialLinkHTML() + " \u00b7 " +
      esc(t("exam.audioHelp")) + " " + appLinksHTML();
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
     that booklet turns out to hold.

     With none of those, nothing starts ticked. Every box used to be ticked on
     arrival, which quietly made "sit all 101 questions, timed" the thing that
     happened if you pressed the big button without reading the screen - and
     it is the most demanding thing on the page, not the most likely. Starting
     empty makes the choice a choice. Whole paper, one press away, is beside
     the boxes for anyone who did mean all of it. */
  function presetCategories(exam, cats) {
    var have = cats.map(function (c) { return c.id; });

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

    return [];
  }

  /* Meta tables store keys; resolve to the active language. */
  function metaLabel(table, id) {
    var m = table[id];
    return m ? t(m.key) : "";
  }

  /* The longest answer on offer, in characters, with any markup stripped.

     It decides how the four options are laid out. On a printed JLPT paper
     short answers are set across the line - 1 ちょうさつ 2 ちょうさ 3 かんさ
     4 かんさつ - and only full sentences get a line each. Here every option
     was a full-width slab whatever was in it, so a reading like ちょうさつ
     sat in a 787px box with 60px of text in it, and four of those made a
     vocabulary question three screens tall in a timed exam.

     Roughly half the questions on the site are in that short bracket. */
  function longestChoice(q) {
    var longest = 0;
    q.choices.forEach(function (c) {
      var n = c.replace(/<[^>]*>/g, "").trim().length;
      if (n > longest) longest = n;
    });
    return longest;
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

  /* ------------------------------------------------------ personal bests

     One record per paper per section, kept across attempts so that sitting
     the N3 vocabulary a second time has something to beat. Only a higher
     scaled score replaces the stored one - practising a section when you are
     tired should not cost you the result you earned when you were not - but
     the most recent attempt is kept alongside it, because "you scored 24
     this time, your best is 32" is the sentence that makes the rule visible
     instead of looking like the score failed to save.

     Separate from the in-progress attempt (storeKey) on purpose: clearing an
     attempt to retake it must not clear the history of what you have done. */
  var BEST_KEY = "jlpt.best";

  function readBests() {
    try {
      var raw = localStorage.getItem(BEST_KEY);
      var all = raw ? JSON.parse(raw) : null;
      return (all && typeof all === "object") ? all : {};
    } catch (e) { return {}; }
  }

  function writeBests(all) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); }
    catch (e) { /* private browsing: the history simply is not kept */ }
  }

  function bestsFor(examId) {
    var all = readBests();
    return all[examId] || null;
  }

  /* Returns true when this attempt set a new best, so the caller can say so. */
  function recordBest(examId, sec) {
    var all = readBests();
    var paper = all[examId] || (all[examId] = {});
    var prev = paper[sec.key] || null;
    var improved = !prev || sec.scaled > prev.best;

    paper[sec.key] = {
      best: improved ? sec.scaled : prev.best,
      bestRight: improved ? sec.right : prev.bestRight,
      bestTotal: improved ? sec.total : prev.bestTotal,
      bestAt: improved ? Date.now() : prev.bestAt,
      cap: sec.cap,
      last: sec.scaled,
      lastRight: sec.right,
      lastTotal: sec.total,
      lastAt: Date.now(),
      attempts: (prev && prev.attempts ? prev.attempts : 0) + 1
    };
    writeBests(all);
    return improved;
  }

  /* Dates are shown in whichever language the page is in, so the panel does
     not switch to English halfway down. */
  function whenText(ms) {
    if (!ms) return "";
    try {
      return new Date(ms).toLocaleDateString(document.documentElement.lang ||
        undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (e) { return new Date(ms).toDateString(); }
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
        marked: state.marked,
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
      '<a class="btn btn-ghost" href="levels.html">' + esc(t("nav.levels")) + '</a>'));
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
    partsBox.appendChild(el("div", "setup-title-row",
      '<h2 class="setup-title">1 · ' + esc(t("exam.chooseSections")) + "</h2>" +
      /* Built on the real .btn tier rather than styled to look like a chip:
         it was read as a label, not a control. The tick is part of the
         label so the shape says "press me" before the words do. */
      '<button type="button" class="btn btn-ghost setup-all" id="pickAllBtn">' +
        '<span class="setup-all-icon" aria-hidden="true">\u2713</span>' +
        '<span class="setup-all-text">' + esc(t("exam.allSections")) +
        "</span></button>"));
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
    /* How much you have chosen, under the thing you choose it with. This
       used to sit in the timer row three steps down, where it read as a
       remark about the clock. */
    partsBox.appendChild(el("p", "setup-count", ""));
    partsBox.lastChild.id = "timeHint";
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
      "</label>"));
    card.appendChild(timeBox);

    /* -- actions -- */
    /* Said where the mistake is, not in a browser alert: the boxes are two
       inches above this button and the message points straight at them. */
    var errBox = el("p", "setup-error");
    errBox.id = "setupError";
    errBox.hidden = true;
    errBox.setAttribute("role", "alert");
    errBox.textContent = t("exam.errorPickSection");
    card.appendChild(errBox);

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

    var bests = buildBestPanel(exam);
    if (bests) wrap.appendChild(bests);

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
      /* Start stays live with nothing ticked. A disabled button gives no
         reason for being disabled, and on a phone the boxes it refers to are
         off the top of the screen by the time you reach it. Pressing it says
         what is missing instead. */
      if (n) {
        var err = document.getElementById("setupError");
        if (err) err.hidden = true;
      }
      syncPickAll();
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

    /* One control, both directions.

       It only ever selected everything, so once all four were ticked - which
       is what it had just done - it sat there doing nothing, and getting back
       to a single section meant unticking three boxes one at a time. It now
       says what it will do next and does that. */
    function boxes() {
      return Array.prototype.slice.call(
        card.querySelectorAll('input[name="part"]'));
    }

    function allPicked() {
      var all = boxes();
      return all.length > 0 && all.every(function (i) { return i.checked; });
    }

    function syncPickAll() {
      var btn = document.getElementById("pickAllBtn");
      if (!btn) return;
      var full = allPicked();
      var text = btn.querySelector(".setup-all-text");
      var icon = btn.querySelector(".setup-all-icon");
      if (text) text.textContent = t(full ? "exam.clearSections" : "exam.allSections");
      /* A tick to add them all, a cross to take them all away. */
      if (icon) icon.textContent = full ? "\u2715" : "\u2713";
      btn.classList.toggle("is-clear", full);
    }

    var pickAll = document.getElementById("pickAllBtn");
    if (pickAll) {
      pickAll.addEventListener("click", function () {
        var want = !allPicked();
        boxes().forEach(function (i) {
          i.checked = want;
          i.closest(".part-card").classList.toggle("is-on", want);
        });
        refreshHint();
      });
    }

    startBtn.addEventListener("click", function () {
      if (!pickedCategories().length) {
        var err = document.getElementById("setupError");
        if (err) {
          err.hidden = false;
          err.classList.remove("is-shake");
          void err.offsetWidth;          /* restart the animation */
          err.classList.add("is-shake");
        }
        grid.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      clearProgress();
      startExam(collectSetup(), null);
    });

    refreshHint();

    /* A reload should not cost you your place.

       Reloading mid-paper used to land on this setup screen. Nothing was
       lost - the answers were in storage and the Resume button was right
       there - but the paper vanished and you had to ask for it back, which
       reads as the browser having gone back a page. Phones reload on their
       own when a backgrounded tab is evicted, so this was not always a
       deliberate keypress.

       Only on a reload. Arriving here any other way - from the library, from
       a level card - still shows the setup, because then you may well want a
       fresh attempt or a different set of sections; the Resume button covers
       that case and is unchanged. Either way "Back to setup" in the command
       bar is the way out of the paper.

       Once per page load: renderSetup() also runs on a language switch, and
       without the latch that re-entry would inherit this load's reload flag
       and pull you into the paper unasked.

       Nothing here touches the scroll position. A first attempt at this
       scrolled to the first unanswered question, which never worked - the
       browser restores the scroll of a reloaded page after the script has
       run, so it silently won - and once measured, its restore turned out to
       be the better answer anyway: it puts you back on the exact question
       you were reading, not on the next blank one. */
    if (!state.resumeChecked) {
      state.resumeChecked = true;
      /* An attempt counts as open from the moment the paper is built, not
         from the first answer. saveProgress() writes the record in
         startExam(), so startedAt existing IS the paper having been opened.

         Requiring an answer here was wrong and is what shipped: open a paper,
         read question one, reload before choosing anything, and the count of
         answers is zero, so the guard failed and the setup screen came back -
         exactly the bug this was meant to fix, still there for the first
         minute of every paper. It was missed because every test answered
         something first. */
      if ((wasReload() || languageJustSwitched()) && saved && saved.startedAt) {
        startExam(collectSetup(), saved);
        /* The browser restores the scroll of a reloaded page on its own, but
           only if the page is that tall when it tries - and this paper is
           built by script after the JSON arrives, so on anything slower than
           localhost the restore runs against an empty document, finds
           nothing to scroll, and leaves you at the top. Locally it worked
           and this looked unnecessary; against the live site it did not. So
           the position is carried in the saved attempt and reapplied here,
           once the questions actually exist. */
        if (saved.scrollY > 0) {
          window.scrollTo({ top: saved.scrollY, behavior: "instant" });
        }
        return;
      }
    }
  }

  /* Each language is its own address, so changing it navigates and the paper
     is rebuilt at the new one - an ordinary arrival as far as this page can
     tell, which is why it used to land on the setup screen with the reader's
     answers still in storage and no sign of them on screen. I18N sets a mark
     before it goes and reads it once as the next page starts. */
  function languageJustSwitched() {
    return !!(window.I18N && I18N.switched && I18N.switched());
  }

  /* performance.navigation is deprecated but is the only signal older Safari
     gives; the Level 2 entry is tried first. */
  function wasReload() {
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      if (nav && nav.type) return nav.type === "reload";
      return !!(performance.navigation && performance.navigation.type === 1);
    } catch (e) { return false; }
  }


  /* What you have already scored on this paper, section by section, shown on
     the way in rather than only on the way out. Two numbers per section, and
     the difference between them is the whole rule: the best is what is kept,
     the last is what you did most recently. Without the second number a lower
     re-sit looks like the site forgot to save it. */
  function buildBestPanel(exam) {
    var saved = bestsFor(exam.id);
    if (!saved) return null;

    var order = ["language", "reading", "listening"];
    var rows = order.filter(function (k) { return saved[k]; });
    if (!rows.length) return null;

    var box = el("div", "best-panel");
    var latest = 0;
    rows.forEach(function (k) {
      if (saved[k].lastAt > latest) latest = saved[k].lastAt;
    });

    box.innerHTML =
      '<div class="best-panel-head">' +
        "<h2>" + esc(t("exam.yourBest")) + "</h2>" +
        '<span class="best-panel-when">' + esc(t("exam.lastSat")) + " " +
          esc(whenText(latest)) + "</span>" +
      "</div>" +
      '<div class="best-rows">' +
        rows.map(function (k) {
          var b = saved[k];
          var pct = b.cap ? Math.min(100, (b.best / b.cap) * 100) : 0;
          var moved = b.last - b.best;
          return '<div class="best-row">' +
            '<div class="best-name">' + esc(t(SECTION_LABEL[k] || k)) +
              "<span>" + b.attempts + " " +
              esc(t(b.attempts === 1 ? "exam.attempt" : "exam.attempts")) +
              "</span></div>" +
            '<div class="best-bar"><div class="best-bar-fill" style="width:' +
              pct + '%"></div></div>' +
            '<div class="best-val"><strong>' + b.best +
              "<i>/" + b.cap + "</i></strong>" +
              '<span class="best-last">' + esc(t("exam.lastTime")) + " " +
                b.last +
                (moved === 0 ? ""
                  : ' <em class="' + (moved > 0 ? "is-up" : "is-down") + '">' +
                    (moved > 0 ? "+" : "") + moved + "</em>") +
              "</span>" +
            "</div>" +
          "</div>";
        }).join("") +
      "</div>" +
      '<p class="best-note">' + esc(t("exam.bestNote")) + "</p>";

    return box;
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
          seen: 0,
          blocks: []
        };
        sections.push(last);
      }

      item.number = paperNumber(item, last.seen);
      last.seen++;

      var block = last.blocks[last.blocks.length - 1];
      if (!block || block.passage !== (q.passage || null)) {
        block = { passage: q.passage || null, questions: [] };
        last.blocks.push(block);
      }
      block.questions.push(item);
    });

    return sections;
  }

  /* The number the booklet itself prints beside the question: 23 in the
     written papers, where numbering runs straight through the booklet, and
     3番 in listening, where it restarts inside every 問題.

     There used to be a second, invented number as well - a running 1..101
     count of whatever the learner had chosen to sit - shown in the badge,
     with the paper's real number demoted to a small chip beside the prompt
     when the two disagreed. Sitting reading on its own therefore labelled
     question 23 as "1", while the 問題 instruction above it still said 23.
     Two numbering systems on one page, one of them ours and wrong.

     The archive lost the printed number on about a tenth of the questions.
     Rebuild it the way the booklet does rather than leaving a gap: position
     in the booklet for the written papers (q.n is exactly that), position
     within this 問題 for listening. */
  function paperNumber(item, seenInSection) {
    var q = item.q;
    if (q.number) return String(q.number);
    if (item.category === "listening") return (seenInSection + 1) + "\u756a";
    return String(q.n || (item.index + 1));
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
    state.marked = (saved && saved.marked) || {};
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

    /* The full scorecard - verdict, three official sections, pass mark -
       only once the whole sitting has been marked, because a pass verdict
       computed over one section is not a verdict. Mark a single section and
       you get that section's own result instead. */
    if (state.reviewed) main.appendChild(buildScorecard());
    else if (currentMarked()) main.appendChild(buildSectionCard());

    /* One paper at a time, the way the real sitting works. */
    if (state.papers.length > 1) main.appendChild(buildPaperTabs());

    state.sections.forEach(function (section) {
      if (state.paper && paperOfCategory(section.category) !== state.paper) return;
      main.appendChild(buildSection(section));
    });

    main.appendChild(buildFinish());
    wrap.appendChild(main);
    root.appendChild(wrap);

    wirePaper();
    syncStickyOffsets();
    watchSticky();
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
    /* A section holding a reading passage lays out in two columns and uses
       the whole card; everything else is one centred column. The heading and
       the instruction have to follow whichever it is, or their left edge
       stops agreeing with the questions underneath them. */
    var hasPassage = section.blocks.some(function (b) { return !!b.passage; });
    var node = el("section", "paper-section" +
      (hasPassage ? " has-passage" : ""));
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

    /* One recording per 問題, not per question: the sitting plays a single
       track that runs through all six items in turn, and there is no way to
       cut it into six from here - the files are hosted read-only and served
       through an iframe we cannot script.

       What we can do is stop it scrolling away. The player is pinned to the
       top of the reading area for as long as any question in this 問題 is on
       screen, so it really is above every question rather than only above the
       first. Rewinding to catch 4番 again no longer means scrolling back up
       past three questions to find the play button.

       It sits outside .section-head for that reason: sticky boxes are bound
       by their own parent, and the head is only as tall as the instruction.
       As a direct child of the section it can travel the whole 問題. */
    var deadAudio = section.audio &&
      DEAD_AUDIO_IDS.indexOf(driveId(section.audio)) !== -1;

    if (section.audio && deadAudio) {
      head.appendChild(el("div", "q-audio-aside is-failed",
        '<p class="q-audio-note">' + deadAudioHTML() + "</p>"));
    } else if (section.audio) {
      /* No error event fires for a cross-origin iframe, so the way out is
         offered up front rather than after a failure we cannot see. Kept out
         of the pinned bar: it is help, not a control. */
      head.appendChild(el("div", "q-audio-aside",
        '<p class="q-audio-note">' + esc(t("exam.audioNote")) + "</p>" +
        '<details class="q-audio-help"><summary>' +
          esc(t("exam.audioTrouble")) + "</summary><p>" +
          audioHelpHTML() + "</p></details>"));
    }

    /* A listening section whose recording was never archived. Without this
       the questions simply appeared with no player and no explanation, and
       the only way to find out was to sit twenty-eight of them in silence. */
    if (!section.audio && section.category === "listening") {
      head.appendChild(el("div", "q-audio-aside is-failed",
        "<p class=\"q-audio-note\"><strong>" + esc(t("exams.noAudio")) +
        "</strong> \u00b7 " + audioHelpHTML() + "</p>"));
    }

    node.appendChild(head);

    if (section.audio && !deadAudio) {
      node.appendChild(el("div", "q-audio",
        '<span class="q-audio-label"><span aria-hidden="true">\u266a</span>' +
          "<b>" + esc(t("exam.audio")) + "</b>" +
          (section.tag ? "<i>" + esc(section.tag) + "</i>" : "") +
        "</span>" +
        /* The iframe is 76px because that is the height Drive's preview page
           lays its player out for - below about 68 it clips its own controls.
           But it only draws in the top 48 of that: measured on three
           different recordings at 348, 560 and 700px wide, the play button,
           scrubber and volume sit at 24-36px from the top every time, so the
           bottom quarter of the frame is empty field. That is why the
           controls looked to be riding high in the black box.

           The wrapper crops the dead part away. Drive still gets its 76px
           and lays out exactly as it wants; the 60px window is centred on
           what it actually draws. */
        '<div class="q-audio-frame">' +
          '<iframe src="' + esc(audioURL(section.audio)) + '" width="100%" ' +
            'height="76" allow="autoplay" title="' + esc(t("exam.audio")) +
            '" loading="lazy"></iframe>' +
        "</div>"));
    }

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

    /* The paper's own number, and only that - see paperNumber(). */
    /* A listening stem is a label and a picture - "1ばん" and the four
       drawings. The tint the written stems carry turns that into a wide grey
       band with three characters in the corner of it, so those are marked and
       left alone. Decided here rather than with :has(img) in CSS: the class
       works in every browser and the failure mode of the selector is the
       exact band this avoids. */
    var media = /<img/i.test(q.prompt || "");
    var head = el("div", "pq-head" + (media ? " has-media" : ""));
    head.innerHTML =
      '<span class="pq-num">' + esc(item.number) + "</span>" +
      '<div class="pq-prompt' + (q.prompt ? "" : " is-bare") +
        (media ? " has-media" : "") + '">' +
        (q.prompt || "") +
      "</div>";

    if (!currentMarked()) {
      var flag = el("button", "flag-btn" +
        (state.flags[item.key] ? " is-on" : ""), '<span aria-hidden="true">⚑</span>');
      flag.type = "button";
      flag.dataset.flag = String(item.index);
      flag.title = t("exam.flag");
      flag.setAttribute("aria-label", t("exam.flag") + " " + item.number);
      flag.setAttribute("aria-pressed", state.flags[item.key] ? "true" : "false");
      head.appendChild(flag);
    }
    node.appendChild(head);

    var width = blank ? " is-numeric"
      : longestChoice(q) <= 8 ? " is-short"
      : longestChoice(q) <= 16 ? " is-medium" : "";
    var choices = el("div", "q-choices" + width);
    q.choices.forEach(function (text, ci) {
      var value = ci + 1;
      var cls = "choice";
      if (currentMarked()) {
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
      if (currentMarked()) b.disabled = true;
      b.innerHTML =
        '<span class="choice-num">' + value + "</span>" +
        (blank ? "" : '<span class="choice-text">' + text + "</span>") +
        (currentMarked() && q.answer === value
          ? '<span class="choice-mark">' + esc(t("exam.legendCorrect")) + '</span>' : "") +
        (currentMarked() && picked === value && q.answer !== value
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

    if (currentMarked()) {
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

  /* One section's result, for when that is all that has been marked. Its
     own accuracy and the skills inside it - vocabulary and grammar are
     marked together in 言語知識, so a weak half hides behind a strong one
     unless they are shown apart. No pass or fail: that needs every section.
     -------------------------------------------------------------------- */
  /* How this attempt sits against the record for the same section. Shown
     under the score rather than beside it: it is context, not the result. */
  function bestLineHTML(key) {
    var saved = bestsFor(state.exam.id);
    var b = saved && saved[key];
    if (!b) return "";

    if (justBeaten[key]) {
      return '<p class="section-card-best is-new"><b aria-hidden="true">\u2605</b> ' +
        (b.attempts < 2
          ? esc(t("exam.firstResult"))
          : esc(t("exam.newBest")) + " " + b.best + " / " + b.cap) + "</p>";
    }
    return '<p class="section-card-best">' + esc(t("exam.bestKept")) + " " +
      b.best + " / " + b.cap + " \u00b7 " + esc(t("exam.attemptsCount")) +
      " " + b.attempts + "</p>";
  }

  function buildSectionCard() {
    var s = state.score;
    if (!s) return el("div", "");

    var sec = null;
    (s.sections || []).forEach(function (x) { if (x.key === state.paper) sec = x; });
    if (!sec) return el("div", "");

    var box = el("div", "section-card");
    var pct = sec.total ? Math.round((sec.right / sec.total) * 100) : 0;

    var skills = (s.skills || []).filter(function (sk) {
      return paperOfCategory(sk.key) === state.paper;
    });

    /* The JLPT's own unit for this section - out of 60, or out of 120 where
       N4 and N5 combine language knowledge and reading - alongside plain
       accuracy. The sectional minimum belongs here too: it is the one
       pass-related fact that IS answerable from a single section, and it is
       the fact that decides a paper. Miss 19 in one section and the sitting
       fails however high the total, so somebody who has just marked their
       vocabulary deserves to know they are under it. */
    box.innerHTML =
      '<div class="section-card-head">' +
        '<div><h2>' + esc(sec.label) + "</h2>" +
          '<p class="section-card-raw">' + sec.right + " / " + sec.total + " " +
          esc(t("exam.correctLower")) + " &middot; " + pct + "%</p></div>" +
        '<div class="section-card-score"><strong>' + sec.scaled +
          '<i>/' + sec.cap + "</i></strong>" +
          "<span>" + esc(t("exam.scaledScore")) + "</span></div>" +
      "</div>" +
      '<p class="section-card-min' + (sec.clearedMin ? " is-ok" : " is-below") +
        '"><b aria-hidden="true">' + (sec.clearedMin ? "\u2713" : "\u2715") +
        "</b> " + esc(t("exam.sectionMinLabel")) + " " + sec.minimum +
        " / " + sec.cap + "</p>" +
      bestLineHTML(state.paper) +
      (skills.length > 1
        ? '<div class="section-card-skills">' + skills.map(function (sk) {
            return '<div class="section-card-skill" style="--accent:' +
              (CATEGORY_COLOR[sk.key] || "var(--blue)") + '">' +
              "<span>" + esc(sk.label) + "</span>" +
              "<b>" + sk.percent + "%</b>" +
              "<i>" + sk.right + " / " + sk.total + "</i></div>";
          }).join("") + "</div>"
        : "") +
      '<p class="section-card-note">' + esc(t("exam.sectionMarkedNote")) + "</p>";

    /* Beside the result, not at the foot of the paper: this is where you
       decide you want another go, and a 51-question section is a long way
       to scroll back down to a button. */
    var again = el("button", "btn btn-ghost", t("exam.retakeSection"));
    again.type = "button";
    again.id = "retrySectionBtn";
    box.appendChild(again);

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
          esc(state.exam.level) + '">' + esc(t("nav.levels")) + '</a>' +
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
      /* The count's colour says how far through this section you are, so it
         has to know. Started, finished, or neither. */
      var full = paper.items.length > 0 && done === paper.items.length;
      var b = el("button", "paper-tab" + (on ? " is-on" : "") +
        (full ? " is-done" : done > 0 ? " is-started" : ""));
      b.type = "button";
      b.dataset.paper = paper.key;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", on ? "true" : "false");
      var saved = bestsFor(state.exam.id);
      var pb = saved && saved[paper.key];
      b.innerHTML =
        '<span class="paper-tab-name">' + esc(paper.label) + "</span>" +
        '<span class="paper-tab-count">' +
          (full ? '<b aria-hidden="true">\u2713</b> ' : "") +
          done + " / " + paper.items.length +
          (pb ? ' <i class="paper-tab-best" title="' + esc(t("exam.yourBest")) +
            '">\u2605 ' + pb.best + "</i>" : "") +
        "</span>";
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

  /* Which questions on this paper are flagged.

     The flag used to feed the question map, whose cells turned gold - so
     flagging a question and finding it again were the same feature. Removing
     the map removed the second half and left a button that did nothing but
     turn itself gold, on the question you were already looking at. Marking
     something to come back to is only worth doing if something brings you
     back. */
  function flaggedItems() {
    return state.questions.filter(function (item) {
      if (state.paper && paperOfCategory(item.category) !== state.paper) return false;
      return !!state.flags[item.key];
    });
  }

  /* The next flagged question after the one on screen, wrapping round, so
     the button walks the list rather than sticking on the first. */
  function jumpToNextFlagged() {
    var list = flaggedItems();
    if (!list.length) return;
    var next = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].index > state.current) { next = list[i]; break; }
    }
    jumpTo((next || list[0]).index);
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

    /* This paper is already marked but others are not: nothing to submit
       here, just the way on to the next one. */
    if (currentMarked()) {
      box.innerHTML = "<h2>" + esc(t("exam.endOfPaper")) + "</h2>" +
        "<p>" + esc(t("exam.reviewHint")) + "</p>";
      return box;
    }

    box.innerHTML =
      "<h2>" + esc(t("exam.endOfPaper")) + "</h2>" +
      '<p id="finishSummary"></p>' +
      '<p class="finish-flagged" id="finishFlagged" hidden>' +
        '<span id="finishFlaggedText"></span>' +
        '<button type="button" class="btn btn-ghost" id="goFlaggedBtn">' +
          esc(t("exam.goToFlagged")) + "</button></p>";

    /* Mark this paper on its own. It is the primary action because it is the
       one that matches how people actually practise - a section at a time -
       and because submitting the whole sitting after doing one section
       produces a score that is mostly zeroes. */
    var here = el("button", "btn btn-primary btn-lg", t("exam.markSection"));
    here.type = "button";
    here.id = "markSectionBtn";
    box.appendChild(here);

    /* The whole sitting, still available, but secondary once there is more
       than one paper to lose. */
    if (state.papers.length > 1) {
      var all = el("button", "btn btn-ghost btn-lg", t("exam.submitExam"));
      all.type = "button";
      all.id = "submitBtn2";
      box.appendChild(all);
    } else {
      here.textContent = t("exam.submitExam");
    }
    return box;
  }

  /* ------------------------------------------------------------ question state

     There used to be a question map here - a grid of 101 numbered cells in a
     sticky column beside the paper. It was dropped rather than fixed. Below
     960px it fell to the foot of the page, so on a phone it was a hundred
     buttons you reached only after scrolling past every question they linked
     to; and on a desktop it was a second, competing set of numbers next to a
     paper that now prints its own. The paper is the map. What the map was
     genuinely good for - "how much is left?" - the progress bar in the
     command bar already answers, on every screen size. */

  function statusOf(item) {
    var picked = state.answers[item.key];
    if (!currentMarked()) return picked ? "done" : "todo";
    if (!picked) return "blank";
    if (!item.q.answer) return "unknown";
    return picked === item.q.answer ? "right" : "wrong";
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

    /* The switcher carries a per-section count, so it has to move as the
       section fills - otherwise the tick that says "this one is finished"
       only appears after you navigate away and come back. */
    var tabs = document.querySelector(".paper-tabs");
    if (tabs) tabs.parentNode.replaceChild(buildPaperTabs(), tabs);

    /* What the flag is for: a count of what you marked to come back to, and
       a way back to it, at the point where you are deciding to submit. */
    var box = document.getElementById("finishFlagged");
    if (box) {
      var n = flaggedItems().length;
      box.hidden = n === 0;
      var text = document.getElementById("finishFlaggedText");
      if (text) text.textContent = tf("exam.flaggedCount", { n: n });
    }
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
    setBarSection(index);   /* don't wait for a scroll event to catch up */
  }

  function setBarSection(index) {
    var label = document.getElementById("barSection");
    if (!label || currentMarked()) return;
    var item = state.questions[index];
    if (!item) return;
    var tag = sectionTag(item.q.instruction);
    var meta = CATEGORY_META[item.category] || {};
    /* Two parts, because on a laptop the bar cannot hold both. The 問題 number
       is the half worth keeping - it changes as you scroll and the section
       head it comes from has usually scrolled away - while the category is
       already the name of the selected paper tab. CSS drops the category
       below 1200px; nothing is lost that is not on screen anyway. */
    label.innerHTML =
      (tag ? '<b class="bar-section-tag">' + esc(tag) + "</b>" : "") +
      '<span class="bar-section-cat">' + (tag ? " · " : "") +
        esc(metaLabel(CATEGORY_META, item.category)) + "</span>";
  }

  /* Which question is at the top of the viewport, so the section label in the
     command bar follows the reader and the number keys answer the right one.

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
    if (idx !== state.current) state.current = idx;
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
      if (choice && !currentMarked()) {
        select(parseInt(choice.dataset.index, 10),
               parseInt(choice.dataset.value, 10));
        return;
      }

      var wordsBtn = ev.target.closest("[data-words]");
      if (wordsBtn) {
        toggleWords(wordsBtn.parentNode);
        return;
      }

      var again = ev.target.closest("[data-again]");
      if (again) {
        clearAnswer(parseInt(again.dataset.again, 10));
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
        /* The count at the foot of the paper is the only thing that makes a
           flag worth setting, so it has to move when one is set. This used
           to refresh the question map; when the map went, the refresh went
           with it and nothing was left listening. */
        refreshProgress();
        return;
      }

      if (ev.target.closest("#goFlaggedBtn")) { jumpToNextFlagged(); return; }
      if (ev.target.closest("#markSectionBtn")) confirmSection();
      if (ev.target.closest("#retrySectionBtn")) retakeSection(state.paper);
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

  /* Study mode locks a question the moment it is answered, because the point
     of the mode is that the answer appears - and once you have seen it, being
     able to quietly change your pick to the right one turns the exercise into
     a colouring-in. The lock was the correct behaviour; having no way out of
     it was not, and a mistyped 3 for a 4 left the question dead for the rest
     of the session.

     So the way out is explicit rather than silent: Try again clears that one
     question back to blank and hides the answer with it. You cannot correct a
     wrong pick, only sit the question again from the start, which is the
     honest version of a second go. Nothing else is touched. */
  function clearAnswer(index) {
    var item = state.questions[index];
    var node = document.getElementById("q-" + index);
    if (!item || !node || currentMarked()) return;
    delete state.answers[item.key];
    saveProgress();
    var fresh = buildQuestion(item);
    node.parentNode.replaceChild(fresh, node);
    fresh.classList.add("is-target");
    setTimeout(function () { fresh.classList.remove("is-target"); }, 900);
    refreshProgress();
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

    var againHTML = '<button type="button" class="q-again" data-again="' +
      item.index + '"><span aria-hidden="true">↺</span>' +
      esc(t("exam.tryAgain")) + "</button>";

    if (!q.answer) {
      host.className = "q-feedback is-neutral";
      host.innerHTML = "<strong>" + esc(t("exam.fbNoKey")) + "</strong>" +
        "<p>" + esc(t("exam.fbNoKeyBody")) + "</p>" + againHTML;
      return;
    }

    var ok = picked === q.answer;
    host.className = "q-feedback " + (ok ? "is-right" : "is-wrong");
    host.innerHTML =
      "<strong>" +
      (ok ? "✓ " + esc(t("exam.fbCorrect"))
          : "✗ " + esc(t("exam.fbIncorrectIs")) + " " + q.answer) +
      "</strong>" + explainHTML(item) + againHTML;
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

  /* Same warning as the whole-paper submit, but counted over this section
     only - "48 unanswered" when 44 of them are in a section you have not
     opened yet is not a warning, it is noise. */
  function confirmSection() {
    var here = state.questions.filter(function (item) {
      return paperOfCategory(item.category) === state.paper;
    });
    var blanks = here.filter(function (item) {
      return !state.answers[item.key];
    }).length;
    if (blanks > 0 && !window.confirm(blanks + " " + t("exam.confirmBlanks"))) return;
    submitSection(state.paper);
  }

  function confirmSubmit() {
    var total = state.questions.length;
    var blanks = total - answeredCount();
    if (blanks > 0 && !window.confirm(blanks + " " + t("exam.confirmBlanks"))) return;
    submitExam(false);
  }

  /* Undo one section. Marking a section can only be undone for the whole
     sitting otherwise, which is a poor trade: getting 40% on the vocabulary
     and wanting another go should not cost you the reading you already did.

     Only that section's answers and flags go. The clock is left alone - in
     exam mode it is still the same sitting, and in study mode it is a
     stopwatch that should keep counting. */
  function retakeSection(key) {
    if (!key) return;
    state.questions.forEach(function (item) {
      if (paperOfCategory(item.category) !== key) return;
      delete state.answers[item.key];
      delete state.flags[item.key];
    });
    delete state.marked[key];
    state.reviewed = false;
    state.filter = "all";
    score();
    saveProgress();
    renderPaper();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /* Sit the same paper again, from the top.

     This used to drop you back on the setup screen - which meant pressing
     "Retake" at the end of a sitting made you re-pick the sections, the mode
     and the timer you had just finished using, and it read as being thrown
     out of the paper rather than restarting it. Retake means sit this again;
     changing what you are sitting is the Back link in the bar, one press
     away, which says what it does.

     Everything the attempt was started with is kept. Only the answers, the
     flags and the clock go. */
  function retake() {
    clearProgress();
    stopTicker();
    justBeaten = {};
    state.score = null;
    startExam({
      categories: state.categories,
      mode: state.mode,
      timed: state.timed,
      minutes: state.minutes
    }, null);
    window.scrollTo({ top: 0, behavior: "instant" });
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
      /* Accuracy is out of what could be marked. One question in the whole
         corpus - n1-2022-12 listening 6番 - reached us without an answer key,
         and counting it in the denominator meant a perfect paper read as 105
         of 106. The scaled score already excluded it; this is the headline
         catching up. */
      if (q.answer) {
        sk.total++;
        if (state.answers[item.key] === q.answer) sk.right++;
      }
      var b = buckets[sec] || (buckets[sec] = {
        earned: 0, max: 0, right: 0, wrong: 0, blank: 0, total: 0, markable: 0
      });
      var picked = state.answers[item.key] || null;
      var points = q.points || 1;

      b.total++;
      if (q.answer) { b.max += points; b.markable++; }

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
        markable: b.markable,
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
    var qMarkable = sections.reduce(function (s, x) { return s + x.markable; }, 0);

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
      qTotal: qMarkable,
      qAll: qTotal,
      percent: qMarkable ? Math.round((rightTotal / qMarkable) * 100) : 0,
      partial: capTotal < 180,
      timeUp: !!timeUp
    };
  }

  /* File one section's result away, and remember whether it beat what was
     there. Only sections that were actually sat are filed: marking the whole
     sitting after answering the vocabulary alone would otherwise write a
     zero over a good listening score. A section with nothing answered in it
     is not an attempt. */
  var justBeaten = {};

  function keepBest(key) {
    var sec = null;
    (state.score.sections || []).forEach(function (x) {
      if (x.key === key) sec = x;
    });
    if (!sec || sec.blank === sec.total) return;
    justBeaten[key] = recordBest(state.exam.id, sec);
  }

  /* Mark the paper on screen and nothing else. The score is recomputed over
     everything - it is cheap and the totals have to stay consistent - but
     only the sections that have been marked are shown. */
  function submitSection(key) {
    if (!key) return;
    state.marked[key] = true;
    score();
    keepBest(key);
    if (allMarked()) {
      state.reviewed = true;
      stopTicker();
    }
    saveProgress();
    renderPaper();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function submitExam(timeUp) {
    stopTicker();
    score(timeUp);
    state.papers.forEach(function (p) {
      if (!state.marked[p.key]) keepBest(p.key);
      state.marked[p.key] = true;
    });
    state.reviewed = true;
    state.filter = "all";
    saveProgress();
    renderPaper();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /* ---------------------------------------------------- keyboard controls */

  document.addEventListener("keydown", function (ev) {
    if (!state.questions.length || currentMarked()) return;
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
  /* Where you were reading, written at the last possible moment. saveProgress
     runs when an answer or a flag changes, which is nowhere near often enough
     to keep a scroll position current, and pagehide is the one event that
     fires for a reload, a Back and a phone discarding the tab alike. */
  window.addEventListener("pagehide", function () {
    if (!state.exam || !state.questions.length) return;
    try {
      var raw = localStorage.getItem(storeKey());
      if (!raw) return;
      var rec = JSON.parse(raw);
      rec.scrollY = Math.round(window.scrollY || window.pageYOffset || 0);
      localStorage.setItem(storeKey(), JSON.stringify(rec));
    } catch (e) { /* storage refused the write; the paper still resumes */ }
  });

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
