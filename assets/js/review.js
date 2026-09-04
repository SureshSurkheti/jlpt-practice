/* Mistake notebook.

   exam-player.js files every wrong answer here (jlpt.mistakes in
   localStorage) as a paper is marked, or as an answer is revealed in study
   mode. This page asks them again, one at a time, and drops an item once it
   has been answered right twice in a row. Listening questions are never
   filed: without the recording there is nothing to re-ask.

   The record holds only the exam id and the question key; the question
   itself is read from data/exams/<id>.json when the page opens, so a
   corrected paper is reviewed in its corrected form. */
(function () {
  "use strict";

  var root = document.getElementById("reviewRoot");
  if (!root) return;

  var KEY = "jlpt.mistakes";
  var NEEDED = 2;

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
  function read() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || "null");
      return d && d.items ? d : { v: 1, items: {} };
    } catch (e) { return { v: 1, items: {} }; }
  }
  function write(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
  }

  var store = read();
  var queue = [];      // [{id, rec, exam, q}]
  var i = 0, cleared = 0, answered = false;

  function count() { return Object.keys(store.items).length; }

  function setCount() {
    var n = count();
    var node = document.getElementById("reviewCount");
    if (node) node.textContent = n ? tf("review.count", { n: n }) : "";
  }

  /* One fetch per paper, then every item of that paper resolved from it. */
  function loadQueue() {
    var byExam = {};
    Object.keys(store.items).forEach(function (id) {
      var rec = store.items[id];
      (byExam[rec.exam] = byExam[rec.exam] || []).push({ id: id, rec: rec });
    });
    var exams = Object.keys(byExam);
    return Promise.all(exams.map(function (ex) {
      return fetch(SITE_ROOT + "data/exams/" + ex + ".json")
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (data) {
          if (!data) return;
          var index = {};
          data.parts.forEach(function (p) {
            p.questions.forEach(function (q) { index[p.id + "-" + q.n] = q; });
          });
          byExam[ex].forEach(function (it) {
            var q = index[it.rec.key];
            if (q && q.answer && q.category !== "listening") {
              queue.push({ id: it.id, rec: it.rec, exam: data, q: q });
            }
          });
        });
    })).then(function () {
      /* Oldest mistakes first, so nothing sits forgotten at the back. */
      queue.sort(function (a, b) { return (a.rec.at || 0) - (b.rec.at || 0); });
    });
  }

  function renderIntro() {
    root.innerHTML = "";
    setCount();
    var card = el("div", "quiz-card quiz-intro");
    if (!queue.length) {
      card.appendChild(el("p", "quiz-note", esc(t("review.empty"))));
      var go = el("a", "btn btn-primary", esc(t("nav.exams")));
      go.href = "exams.html";
      card.appendChild(go);
      root.appendChild(card);
      return;
    }
    var byLevel = {};
    queue.forEach(function (it) { byLevel[it.exam.level] = (byLevel[it.exam.level] || 0) + 1; });
    card.appendChild(el("p", "quiz-kicker", ["N5", "N4", "N3", "N2", "N1"].filter(function (l) {
      return byLevel[l];
    }).map(function (l) { return l + " · " + byLevel[l]; }).join(" ")));
    card.appendChild(el("h2", "quiz-score", esc(tf("review.count", { n: queue.length }))));
    var btn = el("button", "btn btn-primary btn-lg", esc(t("review.start")));
    btn.type = "button";
    btn.addEventListener("click", function () { i = 0; cleared = 0; renderItem(); });
    card.appendChild(btn);
    var clear = el("button", "quiz-list-link is-danger", esc(t("review.clearAll")));
    clear.type = "button";
    clear.addEventListener("click", function () {
      if (!window.confirm(t("review.clearConfirm"))) return;
      store = { v: 1, items: {} }; write(store); queue = []; renderIntro();
    });
    card.appendChild(clear);
    root.appendChild(card);
  }

  function renderItem() {
    var it = queue[i];
    var q = it.q;
    answered = false;
    root.innerHTML = "";
    var card = el("div", "quiz-card");
    card.appendChild(el("p", "quiz-kicker",
      esc(tf("review.progress", { done: i + 1, total: queue.length })) +
      ' · <span class="quiz-from">' + esc(it.exam.title) + "</span>"));
    if (q.instruction) card.appendChild(el("p", "review-instruction", esc(q.instruction)));
    if (q.passage) {
      var d = el("details", "review-passage");
      d.innerHTML = "<summary>" + esc(t("review.passage")) + "</summary><div>" + q.passage + "</div>";
      card.appendChild(d);
    }
    /* The prompt is the paper's own markup (underlines, figures). */
    card.appendChild(el("div", "review-prompt", q.prompt || ""));
    var list = el("div", "quiz-options");
    q.choices.forEach(function (c, k) {
      var b = el("button", "quiz-choice",
        '<span class="quiz-num">' + (k + 1) + "</span><span>" + c + "</span>");
      b.type = "button";
      b.dataset.value = k + 1;
      b.addEventListener("click", function () { answer(k + 1); });
      list.appendChild(b);
    });
    card.appendChild(list);
    card.appendChild(el("div", "quiz-feedback"));
    root.appendChild(card);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function answer(v) {
    if (answered) return;
    answered = true;
    var it = queue[i];
    var q = it.q;
    var ok = v === q.answer;
    var rec = store.items[it.id];
    var gone = false;
    if (rec) {
      if (ok) {
        rec.right = (rec.right || 0) + 1;
        if (rec.right >= NEEDED) { delete store.items[it.id]; gone = true; cleared++; }
      } else {
        rec.right = 0;
        rec.wrong = (rec.wrong || 0) + 1;
      }
      write(store);
    }
    root.querySelectorAll(".quiz-choice").forEach(function (b) {
      var n = parseInt(b.dataset.value, 10);
      b.disabled = true;
      if (n === q.answer) b.classList.add("is-correct");
      if (n === v && !ok) b.classList.add("is-wrong");
    });
    var fb = root.querySelector(".quiz-feedback");
    fb.className = "quiz-feedback " + (ok ? "is-ok" : "is-bad");
    var html = "<strong>" + esc(ok ? t(gone ? "review.cleared" : "review.correct")
                                   : tf("review.wrong", { n: q.answer })) + "</strong>";
    if (q.explanation) html += "<p>" + q.explanation + "</p>";
    fb.innerHTML = html;
    var last = i === queue.length - 1;
    var next = el("button", "btn btn-primary", esc(t(last ? "quiz.finish" : "review.next")));
    next.type = "button";
    next.addEventListener("click", function () {
      if (last) renderEnd(); else { i++; renderItem(); }
    });
    fb.appendChild(next);
    next.focus();
  }

  function renderEnd() {
    root.innerHTML = "";
    setCount();
    var card = el("div", "quiz-card quiz-end");
    card.appendChild(el("h2", "quiz-score",
      esc(tf("review.done", { cleared: cleared, left: count() }))));
    var actions = el("div", "quiz-actions");
    if (count()) {
      var again = el("button", "btn btn-primary btn-lg", esc(t("review.again")));
      again.type = "button";
      again.addEventListener("click", function () {
        queue = []; loadQueue().then(function () { i = 0; cleared = 0; if (queue.length) renderItem(); else renderIntro(); });
      });
      actions.appendChild(again);
    }
    var stats = el("a", "btn btn-ghost", esc(t("review.toStats")));
    stats.href = "stats.html";
    actions.appendChild(stats);
    card.appendChild(actions);
    root.appendChild(card);
  }

  root.innerHTML = '<p class="quiz-note">…</p>';
  loadQueue().then(renderIntro);
})();
