/* ==========================================================================
   Your scores.

   This page used to read a localStorage store that nothing ever wrote to, so
   it showed "0 answered, 0% accuracy, 0 / 5 levels" and an empty state to
   every visitor forever - see the note above readBests() in site.js.

   It reads jlpt.best instead: the record the exam player files each time a
   section is marked. Nothing is invented here. A section you have not sat
   has no row, a level you have not touched has no card, and an empty page
   says so plainly rather than printing zeros that look like a bad result.
   ========================================================================== */

function statsRows() {
  const all = readBests();
  const rows = [];

  Object.keys(all).forEach((id) => {
    const level = (id.split('-')[0] || '').toUpperCase();
    if (LEVEL_ORDER.indexOf(level) === -1) return;
    SECTION_KEYS.forEach((key) => {
      const rec = all[id][key];
      if (!rec) return;
      rows.push({ id, level, key, ...rec });
    });
  });

  return rows;
}

/* Best-of-each-section, not every result added together. Adding them made a
   total out of more than the exam is marked out of, and one that grew each
   time you practised - see the note above levelBest() in site.js. Keyed by
   level and section so two attempts at the same section count once. */
function bestPerSection(rows) {
  const best = {};
  rows.forEach((r) => {
    const key = r.level + ':' + r.key;
    if (!best[key] || r.best > best[key].best) best[key] = r;
  });
  return Object.keys(best).map((k) => best[k]);
}

function renderStatsPage() {
  const rows = statsRows();

  const set = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  const papers = new Set(rows.map((r) => r.id));
  const levels = new Set(rows.map((r) => r.level));
  const top = bestPerSection(rows);
  const scored = top.reduce((n, r) => n + r.best, 0);
  const cap = top.reduce((n, r) => n + r.cap, 0);

  set('totalAnswered', papers.size);
  set('overallAccuracy', cap ? Math.round((scored / cap) * 100) + '%' : '—');
  set('levelsProgressed', levels.size + ' / 5');

  renderLevelProgress(rows);
  renderSectionPerformance(rows);
  renderMistakes();
  renderKnow();
}

/* The ✓ / ✗ marks from the word lists (jlpt.know, see site.js): a total
   line, then one line per level that has any, each half linking to that
   filtered list. */
function renderKnow() {
  const summary = document.getElementById('knowSummary');
  const list = document.getElementById('knowList');
  if (!summary || !list) return;
  const all = knowCounts();
  if (!all.k && !all.d) {
    summary.textContent = t('stats.knowNone');
    list.hidden = true;
    return;
  }
  summary.textContent = tf('stats.knowLine', all);
  list.innerHTML = LEVEL_ORDER.map((lv) => {
    const n = knowCounts(lv);
    if (!n.k && !n.d) return '';
    const base = `study/${lv.toLowerCase()}-words.html?show=`;
    return `<li><b>${lv}</b>` +
      `<a href="${base}k">${n.k} ✓</a> · <a href="${base}d">${n.d} ✗</a></li>`;
  }).join('');
  list.hidden = false;
}

/* The notebook the exam player keeps (jlpt.mistakes): how many wrong
   answers are waiting, and the way to them. */
function renderMistakes() {
  let n = 0;
  try {
    const d = JSON.parse(localStorage.getItem('jlpt.mistakes') || 'null');
    n = d && d.items ? Object.keys(d.items).length : 0;
  } catch (e) { n = 0; }
  const count = document.getElementById('mistakesCount');
  const open = document.getElementById('mistakesOpen');
  if (count) count.textContent = n ? tf('stats.mistakesCount', { n }) : t('stats.mistakesNone');
  if (open) open.hidden = !n;
}

function renderLevelProgress(rows) {
  const container = document.getElementById('levelProgressSection');
  if (!container) return;

  const studied = LEVEL_ORDER.filter((lv) => rows.some((r) => r.level === lv));

  if (!studied.length) {
    container.innerHTML = `<p class="stats-empty">${t('stats.empty')}</p>`;
    return;
  }

  container.innerHTML = studied.map((lv) => {
    const mine = bestPerSection(rows.filter((r) => r.level === lv));
    const scored = mine.reduce((n, r) => n + r.best, 0);
    const cap = mine.reduce((n, r) => n + r.cap, 0);
    const pct = cap ? Math.round((scored / cap) * 100) : 0;
    const papers = new Set(rows.filter((r) => r.level === lv)
      .map((r) => r.id)).size;
    const last = Math.max(...mine.map((r) => r.lastAt || 0));

    return `
      <div class="level-progress-card level-${lv.toLowerCase()}">
        <div class="lp-head">
          <h3>${lv}</h3>
          <strong><em>${t('levels.bestLabel')}</em>${scored} / ${cap}</strong>
        </div>
        <div class="lp-bar"><div class="lp-fill" style="width:${pct}%"></div></div>
        <div class="lp-meta">
          ${papers} ${t(papers === 1 ? 'exams.paper' : 'exams.papers')}
          &nbsp;·&nbsp; ${t('exam.lastSat')} ${statsDate(last)}
        </div>
        <div class="lp-actions">
          <a href="levels.html?lv=${lv}" class="btn btn-ghost">${t('stats.practise')} ${lv}</a>
          <a href="${mockExamUrl(lv) || 'exams.html'}" class="btn btn-primary">${t('stats.takeMock')}</a>
        </div>
      </div>`;
  }).join('');
}

function statsDate(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleDateString(
      document.documentElement.lang || undefined,
      { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return new Date(ms).toDateString();
  }
}

/* The three scored parts of the exam, each out of its own cap - which is 120
   rather than 60 where N4 and N5 mark language knowledge and reading
   together, so the totals are summed rather than averaged. */
function renderSectionPerformance(rows) {
  const container = document.getElementById('sectionPerformanceGrid');
  if (!container) return;

  if (!rows.length) {
    container.innerHTML = `<p class="stats-empty">${t('stats.empty')}</p>`;
    return;
  }

  const LABEL = {
    language: 'exam.sectionLanguage',
    reading: 'exam.sectionReading',
    listening: 'exam.sectionListening'
  };
  const COLOR = { language: '#2d6eb4', reading: '#2f7d57', listening: '#c84a52' };

  container.innerHTML = SECTION_KEYS.map((key) => {
    const mine = bestPerSection(rows).filter((r) => r.key === key);
    if (!mine.length) return '';
    const scored = mine.reduce((n, r) => n + r.best, 0);
    const cap = mine.reduce((n, r) => n + r.cap, 0);
    const pct = cap ? Math.round((scored / cap) * 100) : 0;
    return `
      <div class="section-score" style="--accent: ${COLOR[key]}">
        <div class="score">${pct}%</div>
        <div class="label">${t(LABEL[key])}</div>
        <div class="meta">${scored} / ${cap}</div>
      </div>`;
  }).join('');
}

/* ========================================================== moving scores

   There is no account and no server, so a score belongs to a browser rather
   than to a person. That is what keeps the site free and private, and it has
   two consequences worth handling rather than hiding: your results do not
   follow you from a phone to a laptop, and a browser two people share shows
   one set of numbers to both.

   A file solves both without a login. Save it on one device, load it on the
   other; clear it when the machine is not yours. Loading merges rather than
   replaces, keeping whichever score is higher, so carrying a phone's results
   to a laptop never costs you what the laptop already had. */

function statsMessage(text) {
  const node = document.getElementById('statsDataMsg');
  if (node) node.textContent = text || '';
}

function exportScores() {
  const all = readBests();
  if (!Object.keys(all).length) {
    statsMessage(t('stats.nothingToSave'));
    return;
  }
  const payload = {
    site: 'jlpt.sureshsurkheti.com',
    kind: 'jlpt-scores',
    version: 1,
    savedAt: new Date().toISOString(),
    best: all
  };
  const blob = new Blob([JSON.stringify(payload, null, 1)],
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jlpt-scores.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Revoked on the next tick: revoking immediately can cancel the download
     in some browsers before it has read the blob. */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  statsMessage('');
}

/* Keep the higher of each section, and the later of the two "last attempt"
   records, so merging two devices reads as one history rather than whichever
   file was loaded second. */
function mergeScores(incoming) {
  const all = readBests();
  Object.keys(incoming).forEach((id) => {
    const from = incoming[id];
    if (!from || typeof from !== 'object') return;
    const into = all[id] || (all[id] = {});
    SECTION_KEYS.forEach((k) => {
      const rec = from[k];
      if (!rec || typeof rec.best !== 'number' || typeof rec.cap !== 'number') return;
      const have = into[k];
      if (!have) { into[k] = rec; return; }
      into[k] = {
        best: Math.max(have.best, rec.best),
        bestRight: have.best >= rec.best ? have.bestRight : rec.bestRight,
        bestTotal: have.best >= rec.best ? have.bestTotal : rec.bestTotal,
        bestAt: have.best >= rec.best ? have.bestAt : rec.bestAt,
        cap: have.cap || rec.cap,
        last: (have.lastAt || 0) >= (rec.lastAt || 0) ? have.last : rec.last,
        lastRight: (have.lastAt || 0) >= (rec.lastAt || 0) ? have.lastRight : rec.lastRight,
        lastTotal: (have.lastAt || 0) >= (rec.lastAt || 0) ? have.lastTotal : rec.lastTotal,
        lastAt: Math.max(have.lastAt || 0, rec.lastAt || 0),
        attempts: (have.attempts || 0) + (rec.attempts || 0)
      };
    });
  });
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    return false;
  }
}

function importScores(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data = null;
    try { data = JSON.parse(reader.result); } catch (e) { data = null; }
    if (!data || data.kind !== 'jlpt-scores' || !data.best ||
        typeof data.best !== 'object') {
      statsMessage(t('stats.importBad'));
      return;
    }
    statsMessage(mergeScores(data.best) ? t('stats.imported') : t('stats.importBad'));
    renderStatsPage();
  };
  reader.onerror = () => statsMessage(t('stats.importBad'));
  reader.readAsText(file);
}

function clearScores() {
  if (!window.confirm(t('stats.clearConfirm'))) return;
  try { localStorage.removeItem(BEST_KEY); } catch (e) { /* nothing to do */ }
  renderStatsPage();
  statsMessage(t('stats.cleared'));
}

function wireStatsData() {
  const out = document.getElementById('exportScores');
  if (out) out.addEventListener('click', exportScores);

  const inp = document.getElementById('importScores');
  if (inp) {
    inp.addEventListener('change', () => {
      if (inp.files && inp.files[0]) importScores(inp.files[0]);
      /* Cleared so loading the same file twice still fires a change event. */
      inp.value = '';
    });
  }

  const wipe = document.getElementById('clearScores');
  if (wipe) wipe.addEventListener('click', clearScores);
}

document.addEventListener('DOMContentLoaded', () => {
  renderStatsPage();
  wireStatsData();
});
document.addEventListener('languagechange', renderStatsPage);
