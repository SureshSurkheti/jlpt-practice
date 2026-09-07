/* Daily review.

   The page that answers "what should I study today?".

   Everything you have got wrong lives in one queue (jlpt.srs, built in
   site.js): words you marked ✗ on a study list, and questions you missed on
   a paper. Each carries the date it should next be seen, and this page asks
   only what has come due. A right answer buys a longer gap before the next
   sighting - one day, then three, a week, a fortnight, a month - and the
   sixth right answer retires the item. A wrong answer brings it back today.

   Twenty items a sitting. A learner who has let 300 pile up needs a session
   that ends, not a wall; the rest are offered as another round.

   Nothing is stored here. Word questions are built from the same
   data/words/<level>.json the study lists use, and exam questions are read
   from data/exams/<id>.json when the page opens, so a corrected paper is
   reviewed in its corrected form. */
(function () {
  "use strict";

  var root = document.getElementById("reviewRoot");
  if (!root) return;

  var BATCH = 20;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function shuffle(a) {
    for (var i2 = a.length - 1; i2 > 0; i2--) {
      var j = Math.floor(Math.random() * (i2 + 1));
      var x = a[i2]; a[i2] = a[j]; a[j] = x;
    }
    return a;
  }
  function lang() {
    return (window.I18N && I18N.current && I18N.current()) || "en";
  }
  /* The meaning the study list itself shows: English, or the Nepali gloss
     where the list has one and the page is being read in Nepali. */
  function meaningOf(row) {
    if (lang() === "ne" && row.ne) return row.ne;
    return row.en || "";
  }

  var queue = [];                  // the round being asked
  var i = 0, reviewed = 0, learned = 0, answered = false;

  /* ---------------------------------------------------------- the sources
     One fetch per paper and one per level, however many items came from
     each. Both are cached for the life of the page. */

  var papers = {}, words = {};

  function paper(id) {
    if (papers[id]) return Promise.resolve(papers[id]);
    return fetch(SITE_ROOT + "data/exams/" + id + ".json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        if (d) {
          var index = {};
          d.parts.forEach(function (p) {
            p.questions.forEach(function (q) { index[p.id + "-" + q.n] = q; });
          });
          d.index = index;
        }
        papers[id] = d;
        return d;
      });
  }

  function wordList(lv) {
    if (words[lv]) return Promise.resolve(words[lv]);
    return fetch(SITE_ROOT + "data/words/" + String(lv).toLowerCase() + ".json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        var rows = (d && d.words) || [];
        var index = {};
        rows.forEach(function (row) { index[row.w] = row; });
        words[lv] = { rows: rows, index: index };
        return words[lv];
      });
  }

  /* ------------------------------------------------------- the questions */

  /* Three wrong options of the same kind, from the same level's list, so
     they are the right difficulty and the right shape. */
  function distractors(rows, answer, field, exclude) {
    var out = [], seen = {};
    seen[answer] = true;
    var pool = shuffle(rows.slice());
    for (var n = 0; n < pool.length && out.length < 3; n++) {
      if (pool[n] === exclude) continue;
      var v = field === "meaning" ? meaningOf(pool[n]) : pool[n][field];
      if (v && !seen[v]) { seen[v] = true; out.push(v); }
    }
    return out;
  }

  function wordItem(rec, list) {
    var row = list.index[rec.w];
    if (!row || !row.en) return null;

    var kinds = ["meaning", "word"];
    if (row.r) kinds.push("reading");
    var kind = kinds[Math.floor(Math.random() * kinds.length)];

    var ask, shown, sub = "", field, answer;
    if (kind === "meaning") {
      /* The reading only where it tells you something. A katakana word is
         its own reading, and printing ボールペン under ボールペン reads as a
         mistake. */
      ask = "quiz.pickMeaning"; shown = row.w;
      sub = (row.r && row.r !== row.w) ? row.r : "";
      field = "meaning"; answer = meaningOf(row);
    } else if (kind === "word") {
      ask = "quiz.pickWord"; shown = meaningOf(row);
      field = "w"; answer = row.w;
    } else {
      ask = "quiz.pickReading"; shown = row.w;
      field = "r"; answer = row.r;
    }
    var wrong = distractors(list.rows, answer, field, row);
    if (!answer || wrong.length < 3) return null;
    var options = shuffle(wrong.concat([answer]));

    return {
      id: rec.id, rec: rec,
      from: esc(rec.lv) + " · " + esc(t("study.words")),
      prompt: '<p class="quiz-ask">' + esc(t(ask)) + "</p>" +
              '<p class="quiz-shown' + (kind === "word" ? "" : " is-ja") + '">' +
                esc(shown) + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</p>",
      choices: options.map(esc),
      answer: options.indexOf(answer) + 1,
      detail: "<p><b>" + esc(row.w) + "</b> " + esc(row.r || "") + " · " +
              esc(meaningOf(row)) + "</p>"
    };
  }

  function examItem(rec, data) {
    var q = data.index[rec.k];
    if (!q || !q.answer || q.category === "listening") return null;
    return {
      id: rec.id, rec: rec,
      from: esc(data.title),
      instruction: q.instruction || "",
      passage: q.passage || "",
      prompt: q.prompt || "",
      choices: q.choices.slice(),   // the paper's own markup, already safe
      answer: q.answer,
      detail: q.explanation ? "<p>" + q.explanation + "</p>" : ""
    };
  }

  /* Build a round from a list of queue records. Anything whose source has
     gone - a word dropped from a list, a question renumbered in a corrected
     paper - is quietly removed from the queue rather than jamming it. */
  function build(recs) {
    var need = {};
    recs.forEach(function (rec) {
      if (rec.t === "w") need["w:" + rec.lv] = rec.lv;
      else if (rec.ex) need["q:" + rec.ex] = rec.ex;
    });
    var jobs = Object.keys(need).map(function (k) {
      return k.charAt(0) === "w" ? wordList(need[k]) : paper(need[k]);
    });
    return Promise.all(jobs).then(function () {
      var out = [];
      recs.forEach(function (rec) {
        var made = null;
        if (rec.t === "w") {
          var list = words[rec.lv];
          if (list && list.rows.length) made = wordItem(rec, list);
        } else {
          var data = papers[rec.ex];
          if (data) made = examItem(rec, data);
        }
        if (made) out.push(made);
        else srsDrop(rec.id);
      });
      return out;
    });
  }

  /* ------------------------------------------------------------ rendering */

  function counts() { return srsCounts(); }

  function start(recs) {
    root.innerHTML = '<p class="quiz-note">' + esc(t("quiz.loading")) + "</p>";
    build(recs).then(function (built) {
      queue = built;
      i = 0; reviewed = 0; learned = 0;
      if (queue.length) renderItem(); else renderIntro();
    });
  }

  function renderIntro() {
    root.innerHTML = "";
    var c = counts();
    var card = el("div", "quiz-card quiz-intro");

    if (!c.total) {
      card.appendChild(el("h2", "quiz-score", esc(t("review.empty"))));
      card.appendChild(el("p", "quiz-note", esc(t("review.emptyBody"))));
      var go = el("a", "btn btn-primary btn-lg", esc(t("nav.study")));
      go.href = "study.html";
      card.appendChild(go);
      root.appendChild(card);
      return;
    }

    card.appendChild(el("p", "quiz-kicker",
      esc(tf("review.breakdown", { w: c.words, q: c.questions }))));

    if (c.due) {
      card.appendChild(el("h2", "quiz-score", esc(tf("review.count", { n: c.due }))));
      card.appendChild(el("p", "quiz-note", esc(t("review.legend"))));
      var btn = el("button", "btn btn-primary btn-lg", esc(t("review.start")));
      btn.type = "button";
      btn.addEventListener("click", function () { start(srsDue().slice(0, BATCH)); });
      card.appendChild(btn);
    } else {
      card.appendChild(el("h2", "quiz-score", esc(t("review.dueNone"))));
      var when = srsWhen(c.next);
      card.appendChild(el("p", "quiz-note", esc(tf(when.key, { n: when.days }))));
      var ahead = el("button", "btn btn-primary btn-lg", esc(t("review.ahead")));
      ahead.type = "button";
      ahead.addEventListener("click", function () { start(srsAhead(BATCH)); });
      card.appendChild(ahead);
    }

    var clear = el("button", "quiz-list-link is-danger", esc(t("review.clearAll")));
    clear.type = "button";
    clear.addEventListener("click", function () {
      if (!window.confirm(t("review.clearConfirm"))) return;
      Object.keys(readSrs().items).forEach(function (id) { srsDrop(id); });
      renderIntro();
    });
    card.appendChild(clear);
    root.appendChild(card);
  }

  function renderItem() {
    var it = queue[i];
    answered = false;
    root.innerHTML = "";
    var card = el("div", "quiz-card");
    card.appendChild(el("p", "quiz-kicker",
      esc(tf("review.progress", { done: i + 1, total: queue.length })) +
      ' · <span class="quiz-from">' + it.from + "</span>"));

    if (it.instruction) card.appendChild(el("p", "review-instruction", esc(it.instruction)));
    if (it.passage) {
      var d = el("details", "review-passage");
      d.innerHTML = "<summary>" + esc(t("review.passage")) + "</summary><div>" +
        it.passage + "</div>";
      card.appendChild(d);
    }
    card.appendChild(el("div", "review-prompt", it.prompt));

    var list = el("div", "quiz-options");
    it.choices.forEach(function (c, k) {
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
    var ok = v === it.answer;
    var res = srsGrade(it.id, ok);
    reviewed++;
    if (res && res.done) learned++;

    root.querySelectorAll(".quiz-choice").forEach(function (b) {
      var n = parseInt(b.dataset.value, 10);
      b.disabled = true;
      if (n === it.answer) b.classList.add("is-correct");
      if (n === v && !ok) b.classList.add("is-wrong");
    });

    var fb = root.querySelector(".quiz-feedback");
    fb.className = "quiz-feedback " + (ok ? "is-ok" : "is-bad");
    /* Say when it comes back. The interval is the whole point of the queue,
       and a learner who cannot see it working has no reason to trust it. */
    var line;
    if (!ok) line = tf("review.wrong", { n: it.answer });
    else if (res && res.done) line = t("review.cleared");
    else if (res && res.days === 1) line = t("review.backTomorrow");
    else if (res) line = tf("review.backIn", { n: res.days });
    else line = t("review.correct");
    fb.innerHTML = "<strong>" + esc(line) + "</strong>" + (it.detail || "");

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
    var c = counts();
    var card = el("div", "quiz-card quiz-end");
    card.appendChild(el("h2", "quiz-score",
      esc(tf("review.done", { done: reviewed, left: c.total }))));
    if (learned) {
      card.appendChild(el("p", "quiz-note", esc(tf("review.learnedCount", { n: learned }))));
    } else if (!c.due) {
      var when = c.next ? srsWhen(c.next) : null;
      if (when) card.appendChild(el("p", "quiz-note", esc(tf(when.key, { n: when.days }))));
    }

    var actions = el("div", "quiz-actions");
    if (c.due) {
      var more = el("button", "btn btn-primary btn-lg",
        esc(tf("review.more", { n: Math.min(c.due, BATCH) })));
      more.type = "button";
      more.addEventListener("click", function () { start(srsDue().slice(0, BATCH)); });
      actions.appendChild(more);
    }
    var stats = el("a", "btn btn-ghost", esc(t("review.toStats")));
    stats.href = "stats.html";
    actions.appendChild(stats);
    card.appendChild(actions);
    root.appendChild(card);
  }

  /* Column labels and the Nepali gloss both follow the picker. */
  document.addEventListener("languagechange", function () {
    if (!queue.length) renderIntro();
  });

  /* Another tab changed the queue - a word marked known on a study page, a
     paper marked in a second window. Redraw the counts, but only between
     sessions: pulling the card out from under someone halfway through a
     review would lose the answer they were in the middle of giving. */
  document.addEventListener("jlpt:storechange", function () {
    if (!queue.length) renderIntro();
  });

  renderIntro();
})();
