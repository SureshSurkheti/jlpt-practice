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

function renderStatsPage() {
  const rows = statsRows();

  const set = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  const papers = new Set(rows.map((r) => r.id));
  const levels = new Set(rows.map((r) => r.level));
  const scored = rows.reduce((n, r) => n + r.best, 0);
  const cap = rows.reduce((n, r) => n + r.cap, 0);

  set('totalAnswered', papers.size);
  set('overallAccuracy', cap ? Math.round((scored / cap) * 100) + '%' : '—');
  set('levelsProgressed', levels.size + ' / 5');

  renderLevelProgress(rows);
  renderSectionPerformance(rows);
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
    const mine = rows.filter((r) => r.level === lv);
    const scored = mine.reduce((n, r) => n + r.best, 0);
    const cap = mine.reduce((n, r) => n + r.cap, 0);
    const pct = cap ? Math.round((scored / cap) * 100) : 0;
    const papers = new Set(mine.map((r) => r.id)).size;
    const last = Math.max(...mine.map((r) => r.lastAt || 0));

    return `
      <div class="level-progress-card level-${lv.toLowerCase()}">
        <div class="lp-head">
          <h3>${lv}</h3>
          <strong>${scored} / ${cap}</strong>
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
    const mine = rows.filter((r) => r.key === key);
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

document.addEventListener('DOMContentLoaded', renderStatsPage);
document.addEventListener('languagechange', renderStatsPage);
