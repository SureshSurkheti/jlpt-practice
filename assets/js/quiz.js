/* Quiz: ten questions built on the spot from the word, kanji and grammar
   lists - the site's own data, so the supply is unlimited and nothing here
   is anyone else's copyright.

   ?level=N3&kind=words picks the list; the tabs change it. A round is ten
   items drawn at random, each asked one of a few ways (word to meaning,
   meaning to word, word to reading; kanji to meaning or reading; pattern to
   meaning or meaning to pattern), with three distractors drawn from the same
   list so they are the right level and the right kind of thing. Marked as
   you answer, one line of feedback, the example sentence where there is one.
   The best score per list is kept in this browser only. */
(function () {
  "use strict";

  var root = document.getElementById("quizRoot");
  if (!root) return;

  var TOTAL = 10;
  var BEST_KEY = "jlpt.quiz";
  var LEVELS = ["N5", "N4", "N3", "N2", "N1"];
  var KINDS = ["words", "kanji", "grammar"];

  /* only: "d" restricts a words round to the words you marked ✗ (still
     learning) on the study lists; ?only=learning arrives from those lists
     and from the progress page. Distractors still come from the whole
     list, so they stay the right level. */
  var state = { level: "N5", kind: "words", items: null, round: null, i: 0,
                right: 0, missed: [], answered: false, only: "" };

  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }
  function lang() {
    return (window.I18N && I18N.current && I18N.current()) || "en";
  }
  /* The meaning shown is the list's own: English, or the Nepali gloss where
     the list has one and the page is in Nepali. */
  function meaningOf(it) {
    if (lang() === "ne" && it.ne) return it.ne;
    if (Array.isArray(it.en)) return it.en.slice(0, 2).join(", ");
    return it.en || "";
  }

  var lv = (qs("level") || "").toUpperCase();
  if (LEVELS.indexOf(lv) !== -1) state.level = lv;
  var kd = (qs("kind") || "").toLowerCase();
  if (KINDS.indexOf(kd) !== -1) state.kind = kd;
  if (qs("only") === "learning") state.only = "d";

  function learningWords() {
    if (state.kind !== "words" || typeof readKnow !== "function") return [];
    var items = readKnow().items, pre = state.level + "|";
    return (state.items || []).filter(function (it) {
      var rec = items[pre + it.w];
      return rec && rec.s === "d";
    });
  }
  function pool() {
    if (state.only === "d") {
      var few = learningWords();
      if (few.length >= 4) return few;
      state.only = "";
    }
    return state.items;
  }

  function bests() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function bestFor() { return bests()[state.level + ":" + state.kind] || 0; }
  function keepBest(n) {
    var all = bests();
    var k = state.level + ":" + state.kind;
    if (n > (all[k] || 0)) {
      all[k] = n;
      try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch (e) {}
    }
  }

  function listUrl() {
    return SITE_ROOT + "study/" + state.level.toLowerCase() + "-" + state.kind + ".html";
  }

  function syncUrl() {
    var u = location.pathname + "?level=" + state.level + "&kind=" + state.kind;
    if (history.replaceState) history.replaceState(null, "", u);
    document.querySelectorAll(".study-tab").forEach(function (tab) {
      var on = tab.dataset.level ? tab.dataset.level === state.level
                                 : tab.dataset.kind === state.kind;
      tab.classList.toggle("is-on", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function load() {
    state.items = null;
    return fetch(SITE_ROOT + "data/" + state.kind + "/" + state.level.toLowerCase() + ".json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var list = d ? (d.words || d.kanji || d.patterns || []) : [];
        state.items = list.filter(function (it) {
          if (state.kind === "words") return it.w && it.r && it.en;
          if (state.kind === "kanji") return it.k && it.en && it.en.length;
          return it.p && it.en;
        });
      })
      .catch(function () { state.items = []; });
  }

  /* ------------------------------------------------------------ questions */

  function textOf(it, field) {
    if (field === "meaning") return meaningOf(it);
    if (field === "word") return it.w;
    if (field === "reading") return it.r;
    if (field === "kanji") return it.k;
    if (field === "kreading") {
      var rs = (it.on || []).concat(it.kun || []);
      return rs.length ? rs[0] : "";
    }
    if (field === "pattern") return it.p;
    return "";
  }

  /* Three wrong options of the same field, all different from the answer
     and from each other. */
  function distractors(answer, field, exclude) {
    var pool = shuffle(state.items.slice()).filter(function (it) {
      return it !== exclude;
    });
    var out = [], seen = {};
    seen[answer] = true;
    for (var i = 0; i < pool.length && out.length < 3; i++) {
      var v = textOf(pool[i], field);
      if (v && !seen[v]) { seen[v] = true; out.push(v); }
    }
    return out;
  }

  function makeQuestion(it) {
    var type, promptKey, shown, sub = "", field;
    if (state.kind === "words") {
      type = ["meaning", "word", "reading"][Math.floor(Math.random() * 3)];
      if (type === "meaning") { promptKey = "quiz.pickMeaning"; shown = it.w; sub = it.r; field = "meaning"; }
      else if (type === "word") { promptKey = "quiz.pickWord"; shown = meaningOf(it); field = "word"; }
      else { promptKey = "quiz.pickReading"; shown = it.w; field = "reading"; }
    } else if (state.kind === "kanji") {
      var canRead = ((it.on || []).length + (it.kun || []).length) > 0;
      type = canRead && Math.random() < 0.4 ? "kreading" : "meaning";
      promptKey = type === "kreading" ? "quiz.pickKanjiReading" : "quiz.pickKanjiMeaning";
      shown = it.k; field = type;
    } else {
      type = Math.random() < 0.5 ? "meaning" : "pattern";
      if (type === "meaning") { promptKey = "quiz.pickPatternMeaning"; shown = it.p; field = "meaning"; }
      else { promptKey = "quiz.pickPattern"; shown = meaningOf(it); field = "pattern"; }
    }
    var answer = textOf(it, field);
    var wrong = distractors(answer, field, it);
    if (!answer || wrong.length < 3) return null;
    var options = shuffle(wrong.concat([answer]));
    return { item: it, promptKey: promptKey, shown: shown, sub: sub,
             field: field, options: options, answer: options.indexOf(answer) + 1 };
  }

  function buildRound() {
    var picked = shuffle(pool().slice()).slice(0, TOTAL * 2);
    var round = [];
    for (var i = 0; i < picked.length && round.length < TOTAL; i++) {
      var q = makeQuestion(picked[i]);
      if (q) round.push(q);
    }
    return round;
  }

  /* ------------------------------------------------------------ rendering */

  function renderIntro(message) {
    root.innerHTML = "";
    var card = el("div", "quiz-card quiz-intro");
    var best = bestFor();
    card.appendChild(el("p", "quiz-kicker", esc(state.level) + " · " +
      esc(t("study." + state.kind))));
    if (message) card.appendChild(el("p", "quiz-note", esc(message)));
    if (best) card.appendChild(el("p", "quiz-note",
      esc(tf("quiz.best", { n: best, total: TOTAL }))));
    var few = learningWords();
    if (few.length >= 4) {
      var lab = el("label", "quiz-only");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = state.only === "d";
      box.addEventListener("change", function () { state.only = box.checked ? "d" : ""; });
      lab.appendChild(box);
      lab.appendChild(document.createTextNode(" " + tf("quiz.onlyLearning", { n: few.length })));
      card.appendChild(lab);
    } else {
      state.only = "";
    }
    var btn = el("button", "btn btn-primary btn-lg", esc(t("quiz.start")));
    btn.type = "button";
    btn.disabled = !!message;
    btn.addEventListener("click", startRound);
    card.appendChild(btn);
    var link = el("a", "quiz-list-link", esc(t("quiz.openList")) + " →");
    link.href = listUrl();
    card.appendChild(link);
    root.appendChild(card);
  }

  function startRound() {
    state.round = buildRound();
    state.i = 0; state.right = 0; state.missed = [];
    if (state.round.length < 4) { renderIntro(t("quiz.tooFew")); return; }
    renderQuestion();
  }

  function renderQuestion() {
    var q = state.round[state.i];
    state.answered = false;
    root.innerHTML = "";
    var card = el("div", "quiz-card");
    card.appendChild(el("p", "quiz-kicker",
      esc(tf("quiz.qOf", { n: state.i + 1, total: state.round.length })) +
      ' <span class="quiz-right">' + state.right + " ✓</span>"));
    card.appendChild(el("h2", "quiz-ask", esc(t(q.promptKey))));
    var shown = el("p", "quiz-shown" + (q.field === "meaning" || q.field === "kreading" ? " is-ja" : ""),
      esc(q.shown) + (q.sub ? '<small>' + esc(q.sub) + "</small>" : ""));
    if (q.field === "word" || q.field === "pattern") shown.classList.remove("is-ja");
    if (/^[　-鿿＀-￯]/.test(q.shown)) shown.classList.add("is-ja");
    card.appendChild(shown);

    var list = el("div", "quiz-options");
    q.options.forEach(function (opt, i) {
      var b = el("button", "quiz-choice",
        '<span class="quiz-num">' + (i + 1) + "</span><span>" + esc(opt) + "</span>");
      b.type = "button";
      b.dataset.value = i + 1;
      b.addEventListener("click", function () { answer(i + 1); });
      list.appendChild(b);
    });
    card.appendChild(list);
    card.appendChild(el("div", "quiz-feedback"));
    root.appendChild(card);
  }

  function answer(v) {
    if (state.answered) return;
    state.answered = true;
    var q = state.round[state.i];
    var ok = v === q.answer;
    if (ok) state.right++; else state.missed.push(q.item);

    root.querySelectorAll(".quiz-choice").forEach(function (b) {
      var n = parseInt(b.dataset.value, 10);
      b.disabled = true;
      if (n === q.answer) b.classList.add("is-correct");
      if (n === v && !ok) b.classList.add("is-wrong");
    });

    var fb = root.querySelector(".quiz-feedback");
    fb.className = "quiz-feedback " + (ok ? "is-ok" : "is-bad");
    var it = q.item;
    var html = "<strong>" + esc(ok ? t("quiz.correct") : t("quiz.wrong")) + "</strong>";
    /* The whole entry, so a wrong answer teaches the item rather than just
       marking it. */
    if (state.kind === "words") html += "<p><b>" + esc(it.w) + "</b> " + esc(it.r) + " · " + esc(meaningOf(it)) + "</p>";
    if (state.kind === "kanji") {
      var rs = (it.on || []).concat(it.kun || []).slice(0, 4).join("　");
      html += "<p><b>" + esc(it.k) + "</b> " + esc(rs) + " · " + esc(meaningOf(it)) + "</p>";
      if (it.ex && it.ex[0]) html += '<p class="quiz-ex">' + esc(t("quiz.example")) + ": " +
        esc(it.ex[0].w) + " (" + esc(it.ex[0].r) + ") — " + esc(it.ex[0].en) + "</p>";
    }
    if (state.kind === "grammar") {
      html += "<p><b>" + esc(it.p) + "</b> · " + esc(meaningOf(it)) + "</p>";
      if (it.ja) html += '<p class="quiz-ex">' + esc(t("quiz.example")) + ": " + esc(it.ja) +
        (it.ex ? " — " + esc(it.ex) : "") + "</p>";
    }
    fb.innerHTML = html;
    var last = state.i === state.round.length - 1;
    var next = el("button", "btn btn-primary", esc(t(last ? "quiz.finish" : "quiz.next")));
    next.type = "button";
    next.addEventListener("click", function () {
      if (last) renderEnd(); else { state.i++; renderQuestion(); }
    });
    fb.appendChild(next);
    next.focus();
  }

  function renderEnd() {
    keepBest(state.right);
    root.innerHTML = "";
    var card = el("div", "quiz-card quiz-end");
    card.appendChild(el("p", "quiz-kicker", esc(state.level) + " · " + esc(t("study." + state.kind))));
    card.appendChild(el("h2", "quiz-score", esc(tf("quiz.score", { right: state.right, total: state.round.length }))));
    card.appendChild(el("p", "quiz-note", esc(tf("quiz.best", { n: bestFor(), total: TOTAL }))));
    if (state.missed.length) {
      var box = el("div", "quiz-missed");
      box.appendChild(el("h3", "", esc(t("quiz.missed"))));
      var ul = el("ul", "");
      state.missed.forEach(function (it) {
        var main = it.w || it.k || it.p;
        var sub = it.r || ((it.on || []).concat(it.kun || []).slice(0, 3).join("　")) || "";
        ul.appendChild(el("li", "", "<b>" + esc(main) + "</b> " +
          (sub ? "<span>" + esc(sub) + "</span> " : "") + "· " + esc(meaningOf(it))));
      });
      box.appendChild(ul);
      /* The missed words can go straight onto the study list's ✗ pile. */
      if (state.kind === "words" && typeof setKnow === "function") {
        var mark = el("button", "btn btn-ghost quiz-mark-missed", esc(t("quiz.markMissed")));
        mark.type = "button";
        mark.addEventListener("click", function () {
          state.missed.forEach(function (it) { setKnow(state.level, it.w, "d"); });
          mark.replaceWith(el("p", "quiz-note", esc(t("quiz.markedMissed"))));
        });
        box.appendChild(mark);
      }
      card.appendChild(box);
    }
    var actions = el("div", "quiz-actions");
    var again = el("button", "btn btn-primary btn-lg", esc(t("quiz.again")));
    again.type = "button";
    again.addEventListener("click", startRound);
    actions.appendChild(again);
    var link = el("a", "btn btn-ghost", esc(t("quiz.openList")));
    link.href = listUrl();
    actions.appendChild(link);
    card.appendChild(actions);
    root.appendChild(card);
  }

  /* ---------------------------------------------------------------- tabs */

  document.querySelectorAll(".study-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      if (tab.dataset.level) state.level = tab.dataset.level;
      if (tab.dataset.kind) state.kind = tab.dataset.kind;
      syncUrl();
      root.innerHTML = '<p class="quiz-note">' + esc(t("quiz.loading")) + "</p>";
      load().then(function () { renderIntro(state.items.length < 8 ? t("quiz.tooFew") : ""); });
    });
  });

  document.addEventListener("languagechange", function () {
    if (state.round && state.i < state.round.length && !state.answered) renderQuestion();
    else if (!state.round) renderIntro("");
  });

  syncUrl();
  root.innerHTML = '<p class="quiz-note">' + esc(t("quiz.loading")) + "</p>";
  load().then(function () { renderIntro(state.items.length < 8 ? t("quiz.tooFew") : ""); });
})();
