/* ==========================================================================
   One kanji, on its own page.

   Stroke order used to open in a panel below the list. On a phone that put
   the animation off-screen under 700 rows, and on a laptop it left the
   character you were studying sharing the screen with the hundred you were
   not. A character being studied deserves the page.

   Everything comes from ?k=<character>&lv=<level>: the row out of
   data/kanji/<level>.json and the stroke paths out of
   data/kanji/strokes/<level>.json, which is a separate file because N1 alone
   is 1.2MB of curves and the list page has no use for it.
   ========================================================================== */
(function () {
  "use strict";

  var host = document.getElementById("kanjiView");
  if (!host) return;

  var params = new URLSearchParams(window.location.search);
  var level = (params.get("lv") || "n5").toLowerCase();
  var char = params.get("k") || "";

  if (!/^n[1-5]$/.test(level)) level = "n5";

  var rows = null;
  var strokes = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* A dot in a kun reading is where the character stops and the okurigana
     starts. Shown dimmed rather than stripped: a learner who cannot see the
     boundary writes the wrong word. */
  function reading(text) {
    var dot = text.indexOf(".");
    if (dot === -1) return esc(text);
    return esc(text.slice(0, dot)) +
      '<i class="kanji-okuri">' + esc(text.slice(dot + 1)) + "</i>";
  }

  function fail() {
    host.innerHTML = '<p class="stats-empty">' + esc(t("study.unavailable")) +
      "</p>";
  }

  /* Not the same thing as a failed fetch, and it used to be treated as one.
     Arriving with no ?k= at all - a bookmark, a truncated link - or with a
     character that is not in this level's list printed "These lists could not
     be loaded", which is untrue: they loaded, the character just is not in
     them. It also left the page with no heading and not one link on it, so
     there was nothing to do but go back. */
  function notFound() {
    var lv = level.toUpperCase();
    host.innerHTML =
      '<div class="kanji-topbar">' +
        '<a class="chip-back" href="study/' + level + '-kanji.html">' +
          '<span aria-hidden="true">\u2190</span> ' + esc(lv) + " " +
          esc(t("study.kanji")) + "</a>" +
      "</div>" +
      '<h1 class="kanji-missing">' + esc(t("study.kanjiMissing")) + "</h1>" +
      '<p class="stats-empty">' + esc(t("study.kanjiMissingBody")) + "</p>";
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

    /* Each stroke waits for the ones before it, and its duration comes from
       its own measured length - a long sweep and a short tick should not take
       the same time. */
    var delay = 0;
    Array.prototype.forEach.call(box.querySelectorAll(".kanji-ink path"),
      function (path) {
        var len = path.getTotalLength();
        var secs = Math.max(0.24, Math.min(0.95, len / 170));
        path.style.strokeDasharray = len + " " + len;
        path.style.strokeDashoffset = len;
        path.style.animation =
          "kanji-draw " + secs + "s linear " + delay + "s forwards";
        delay += secs + 0.1;
      });
  }

  /* Each stroke again on its own, small, in order - the sequence at a glance
     once the animation has finished, the way a textbook prints it. */
  function steps(paths) {
    return paths.map(function (_d, n) {
      var upto = paths.slice(0, n + 1).map(function (d, i) {
        return '<path d="' + d + '"' +
          (i === n ? ' class="is-new"' : "") + " />";
      }).join("");
      return '<li><svg viewBox="0 0 109 109" aria-hidden="true">' +
        '<g class="kanji-ink is-static">' + upto + "</g></svg>" +
        "<b>" + (n + 1) + "</b></li>";
    }).join("");
  }

  function neighbour(index, step) {
    var next = rows[index + step];
    if (!next) return "";
    return '<a class="kanji-nav ' + (step < 0 ? "is-prev" : "is-next") +
      '" href="kanji.html?k=' + encodeURIComponent(next.k) +
      "&lv=" + level + '" title="' + esc(next.en.join(", ")) + '">' +
      '<span aria-hidden="true">' + (step < 0 ? "←" : "→") +
      "</span>" + esc(next.k) + "</a>";
  }

  function render() {
    var index = -1;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].k === char) { index = i; break; }
    }
    if (index === -1) { notFound(); return; }

    var row = rows[index];
    var lv = level.toUpperCase();
    var listUrl = "study/" + level + "-kanji.html";

    var on = row.on.length
      ? '<div class="kr"><dt>音</dt><dd>' +
          row.on.map(esc).join("・") + "</dd></div>" : "";
    var kun = row.kun.length
      ? '<div class="kr"><dt>訓</dt><dd>' +
          row.kun.map(reading).join("・") + "</dd></div>" : "";

    var ex = row.ex.map(function (e) {
      var ne = (I18N.current() === "ne" && e.ne)
        ? '<em class="study-ne">' + esc(e.ne) + "</em>" : "";
      return '<li><b>' + esc(e.w) + "</b><i>" + esc(e.r) + "</i>" +
        "<span>" + esc(e.en) + ne + "</span></li>";
    }).join("");

    host.innerHTML =
      '<div class="kanji-topbar">' +
        '<a class="chip-back" href="' + listUrl + '">' +
          '<span aria-hidden="true">←</span> ' + esc(lv) + " " +
          esc(t("study.kanji")) + "</a>" +
        '<div class="kanji-steps-nav">' +
          neighbour(index, -1) +
          '<span class="kanji-pos">' + (index + 1) + " / " + rows.length +
          "</span>" +
          neighbour(index, 1) +
        "</div>" +
      "</div>" +

      '<div class="kanji-hero">' +
        '<div class="kanji-draw-box" id="kanjiDraw">' +
          '<div class="spinner"></div></div>' +
        '<div class="kanji-facts">' +
          '<h1>' + esc(row.k) + "</h1>" +
          '<p class="kanji-facts-en">' + esc(row.en.join(", ")) + "</p>" +
          '<dl class="kanji-readings-list">' + on + kun +
            '<div class="kr"><dt>' + esc(t("study.colStrokes")) + "</dt>" +
            "<dd>" + row.s + "</dd></div>" +
          "</dl>" +
          '<button type="button" class="btn btn-primary" id="kanjiReplay">' +
            esc(t("study.replay")) + "</button>" +
        "</div>" +
      "</div>" +

      '<section class="kanji-steps">' +
        "<h2>" + esc(t("study.strokeOrder")) + "</h2>" +
        '<ol id="kanjiSteps"></ol>' +
      "</section>" +

      (ex ? '<section class="kanji-words">' +
              "<h2>" + esc(t("study.colExample")) + "</h2>" +
              "<ul>" + ex + "</ul></section>" : "");

    document.title = row.k + " · " + lv + " " + t("study.kanji") +
      " — JLPT Practice";

    var box = document.getElementById("kanjiDraw");
    var paths = strokes[char];
    if (!paths) { box.innerHTML = ""; return; }

    draw(box, paths);
    document.getElementById("kanjiSteps").innerHTML = steps(paths);
    document.getElementById("kanjiReplay").addEventListener("click",
      function () { draw(box, paths); });
  }

  host.innerHTML = '<div class="exam-loading"><div class="spinner"></div></div>';

  Promise.all([
    fetch(SITE_ROOT + "data/kanji/" + level + ".json", { cache: "no-cache" })
      .then(function (r) { return r.json(); }),
    fetch(SITE_ROOT + "data/kanji/strokes/" + level + ".json",
          { cache: "no-cache" }).then(function (r) { return r.json(); })
  ]).then(function (both) {
    rows = both[0].kanji;
    strokes = both[1];
    render();
  }).catch(fail);

  /* Column labels and the Nepali gloss both follow the picker. */
  document.addEventListener("languagechange", function () {
    if (rows) render();
  });

  /* Left and right step through the level, which is how you work along a
     list of characters without reaching for the mouse. */
  document.addEventListener("keydown", function (ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var sel = ev.key === "ArrowLeft" ? ".kanji-nav.is-prev"
            : ev.key === "ArrowRight" ? ".kanji-nav.is-next" : null;
    if (!sel) return;
    var link = document.querySelector(sel);
    if (link) window.location.href = link.getAttribute("href");
  });
})();
