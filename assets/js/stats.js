/* ==========================================================================
   Statistics page - plain numbers, no badges or decorative icons.
   ========================================================================== */

function renderStatsPage() {
  const overall = progress.getOverallStats();

  const set = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  set('totalAnswered', overall.totalAnswered);
  set('overallAccuracy', overall.overallAccuracy + '%');
  set('levelsProgressed', overall.levelsCompleted + ' / 5');

  renderLevelProgress();
  renderSectionPerformance();
}

function renderLevelProgress() {
  const container = document.getElementById('levelProgressSection');
  if (!container) return;

  const studied = ['N5', 'N4', 'N3', 'N2', 'N1'].filter(
    (lv) => progress.getStats(lv).total > 0);

  if (!studied.length) {
    container.innerHTML = `<p class="stats-empty">${t('stats.empty')}</p>`;
    return;
  }

  container.innerHTML = studied.map((lv) => {
    const stats = progress.getStats(lv);
    return `
      <div class="level-progress-card level-${lv.toLowerCase()}">
        <div class="lp-head">
          <h3>${lv}</h3>
          <strong>${stats.accuracy}%</strong>
        </div>
        <div class="lp-bar"><div class="lp-fill" style="width:${stats.accuracy}%"></div></div>
        <div class="lp-meta">
          ${stats.correct} / ${stats.total} ${t('levels.correct')}
          &nbsp;·&nbsp; ${t('levels.lastStudied')}: ${stats.lastStudied || t('levels.never')}
        </div>
        <div class="lp-actions">
          <a href="practice.html?lv=${lv}" class="btn btn-ghost">${t('stats.practise')} ${lv}</a>
          <a href="${mockExamUrl(lv) || 'exams.html'}" class="btn btn-gold">${t('stats.takeMock')}</a>
        </div>
      </div>`;
  }).join('');
}

function renderSectionPerformance() {
  const container = document.getElementById('sectionPerformanceGrid');
  if (!container) return;

  const totals = {};
  Object.keys(SECTIONS).forEach((key) => { totals[key] = { correct: 0, total: 0 }; });

  /* Answers are recorded per question id; the section is part of that id. */
  Object.entries(progress.data.answeredQuestions).forEach(([id, entry]) => {
    Object.keys(SECTIONS).forEach((key) => {
      if (id.indexOf(key) !== -1 || (entry && entry.section === key)) {
        totals[key].total++;
        if (entry && entry.correct) totals[key].correct++;
      }
    });
  });

  const any = Object.values(totals).some((s) => s.total > 0);
  if (!any) {
    container.innerHTML = `<p class="stats-empty">${t('stats.empty')}</p>`;
    return;
  }

  container.innerHTML = Object.entries(SECTIONS).map(([key, section]) => {
    const s = totals[key];
    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    return `
      <div class="section-score" style="--accent: ${section.color}">
        <div class="score">${pct}%</div>
        <div class="label">${t(section.key)}</div>
        <div class="meta">${s.correct} / ${s.total}</div>
      </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', renderStatsPage);
document.addEventListener('languagechange', renderStatsPage);
