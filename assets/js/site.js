/* Only language-neutral facts live here now. The one-line description per
   level is a translated string (level.N5 … level.N1), so the page changes
   language with everything else. */
const LEVEL_CONFIG = {
  N5: { kanji: '~100',  vocab: '~800',  pass: '80 / 180' },
  N4: { kanji: '~300',  vocab: '~1500', pass: '90 / 180' },
  N3: { kanji: '~600',  vocab: '~3500', pass: '95 / 180' },
  N2: { kanji: '~1000', vocab: '~6000', pass: '90 / 180' },
  N1: { kanji: '~2000', vocab: '~10000', pass: '100 / 180' }
};

const MOCK_EXAMS = {
  N1: { id: 'n1-2024-07', label: 'July 2024' },
  N2: { id: 'n2-2023-12', label: 'December 2023' },
  N3: { id: 'n3-2024-07', label: 'July 2024' },
  N4: { id: 'n4-practice-2', label: 'Practice Test 2' },
  N5: null
};

/* A section button drills one skill. It used to name the booklet the real
   exam is sat in instead, which meant Grammar and Reading both opened the
   whole 文法・読解 booklet - and at N1/N2, where the grammar questions are
   printed in the 文字・語彙 booklet, both of them opened reading only. The
   player filters on the skill recorded against each question. */
function mockExamUrl(level, section) {
  const exam = MOCK_EXAMS[level];
  if (!exam) return null;
  let url = `exam.html?id=${encodeURIComponent(exam.id)}`;
  if (section) url += `&cat=${encodeURIComponent(section)}`;
  return url;
}

/* Colour distinguishes the sections; decorative icons added noise. */
const SECTIONS = {
  vocabulary: { key: 'section.vocabulary', color: '#2d6eb4' },
  grammar:    { key: 'section.grammar',    color: '#d9a63a' },
  reading:    { key: 'section.reading',    color: '#2f7d57' },
  listening:  { key: 'section.listening',  color: '#c84a52' }
};

const SAMPLE_QUESTIONS = {
  N5: [
    {
      id: 'n5_v1',
      section: 'vocabulary',
      difficulty: 1,
      type: 'multiple-choice',
      question: '「学生です」の下線部の意味は？',
      japanese: '「学生です」',
      furigana: '「がくせいです」',
      options: ['Student', 'Teacher', 'School', 'Study'],
      correct: 0,
      explanation: '「学生」（がくせい）means student. It refers to someone who is currently studying at a school or university.',
      kanji: '学生',
      kanjiBreakdown: '学＝studying; 生＝person',
      exampleSentence: '私は大学生です。(I am a university student.)',
      synonyms: ['学習者', '学ぶ人'],
      context: 'Introduction and self-description',
      tags: ['self-intro', 'occupation', 'noun'],
      audio: true
    },
    {
      id: 'n5_v2',
      section: 'vocabulary',
      difficulty: 1,
      type: 'multiple-choice',
      question: '「毎日」の意味は？',
      japanese: '「毎日」',
      furigana: '「まいにち」',
      options: ['Every day', 'Monday', 'Daily newspaper', 'Tomorrow'],
      correct: 0,
      explanation: '「毎日」（まいにち）means "every day" or "daily". Use it with activities done on a routine basis.',
      kanji: '毎日',
      kanjiBreakdown: '毎＝every; 日＝day',
      exampleSentence: '毎日日本語を勉強します。(I study Japanese every day.)',
      synonyms: ['日ごと', '毎'],
      context: 'Frequency and routine activities',
      tags: ['time', 'frequency', 'adverb'],
      audio: true
    }
  ],
  N4: [
    {
      id: 'n4_g1',
      section: 'grammar',
      difficulty: 2,
      type: 'multiple-choice',
      question: '「昨日は雨だったから、家にいました」この文の「から」の意味は？',
      japanese: '「昨日は雨だったから、家にいました」',
      furigana: '「きのうはあめだったから、いえにいました」',
      options: ['Time', 'Reason/Cause', 'Direction', 'Comparison'],
      correct: 1,
      explanation: '「から」is used to indicate reason or cause. "Because it rained yesterday, I stayed home."',
      grammarPattern: 'V/Adj/N + から + Result',
      exampleSentence: '風が強いから、散歩に行きませんでした。(I didn\'t go for a walk because the wind was strong.)',
      relatedGrammar: ['ので', 'ために'],
      context: 'Expressing reasons and causes',
      tags: ['grammar', 'cause-effect', 'particle'],
      audio: true
    }
  ],
  N3: [
    {
      id: 'n3_r1',
      section: 'reading',
      difficulty: 3,
      type: 'multiple-choice',
      question: '「今後の経済成長を踏まえて」の「踏まえて」の意味は？',
      japanese: '「踏まえて」',
      furigana: '「ふまえて」',
      options: ['Despite', 'Based on', 'In addition to', 'Prior to'],
      correct: 1,
      explanation: '「踏まえて」（ふまえて）means "based on" or "taking into account". It indicates considering previous information.',
      kanji: '踏まえて',
      kanjiBreakdown: '踏＝step/tread; まえ＝before',
      exampleSentence: '去年の売上を踏まえて、来年の目標を決めます。(Taking last year\'s sales into account, we set next year\'s targets.)',
      formalityLevel: 'Business/Formal',
      context: 'Business communication and formal writing',
      tags: ['advanced-vocabulary', 'formal-expression', 'business'],
      audio: true
    }
  ],
  N2: [
    {
      id: 'n2_l1',
      section: 'listening',
      difficulty: 4,
      type: 'multiple-choice',
      question: 'この女性は荷物について何と言っていますか？',
      japanese: 'この女性は荷物について何と言っていますか？',
      furigana: 'このじょせいはにもつについてなんといっていますか？',
      options: [
        'The package arrived quickly',
        'She will pick up the package tomorrow',
        'The package is too heavy to carry',
        'She needs help to deliver the package'
      ],
      correct: 1,
      explanation: 'In the audio, the woman states: "明日荷物を受け取りに行きます" (I will go pick up the package tomorrow)',
      audioScript: '明日荷物を受け取りに行きます',
      difficulty: 'Intermediate',
      context: 'Daily life conversation about packages and delivery',
      tags: ['listening', 'everyday-conversation', 'logistics'],
      audio: true,
      audioDuration: '8 seconds'
    }
  ],
  N1: [
    {
      id: 'n1_a1',
      section: 'reading',
      difficulty: 5,
      type: 'multiple-choice',
      question: '「社会的インパクト」という観点から論じるとは？',
      japanese: '「社会的インパクト」',
      furigana: '「しゃかいてきいんぱくと」',
      options: [
        'A sudden economic shock',
        'The effect or influence on society',
        'A political controversy',
        'An environmental disaster'
      ],
      correct: 1,
      explanation: '「社会的インパクト」（しゃかいてきいんぱくと）refers to the impact or effect that something has on society. This is a key concept in modern business and policy discussions.',
      formalityLevel: 'Academic/Business',
      context: 'Advanced business and policy analysis',
      tags: ['advanced-vocabulary', 'business-jargon', 'academic'],
      relatedTerms: ['CSR (Corporate Social Responsibility)', '持続可能性 (sustainability)'],
      audio: true
    }
  ]
};

class StudentProgress {
  constructor() {
    this.data = JSON.parse(localStorage.getItem('jlpt-progress')) || {
      answeredQuestions: {},
      stats: {
        N5: { correct: 0, total: 0, streak: 0, lastStudied: null },
        N4: { correct: 0, total: 0, streak: 0, lastStudied: null },
        N3: { correct: 0, total: 0, streak: 0, lastStudied: null },
        N2: { correct: 0, total: 0, streak: 0, lastStudied: null },
        N1: { correct: 0, total: 0, streak: 0, lastStudied: null }
      }
    };
  }

  recordAnswer(questionId, isCorrect, level) {
    this.data.answeredQuestions[questionId] = { isCorrect, timestamp: Date.now(), level };
    this.data.stats[level].total++;
    if (isCorrect) {
      this.data.stats[level].correct++;
      this.data.stats[level].streak++;
    } else {
      this.data.stats[level].streak = 0;
    }
    this.data.stats[level].lastStudied = new Date().toLocaleDateString();
    this.save();
  }

  getStats(level) {
    const stats = this.data.stats[level];
    return {
      ...stats,
      accuracy: stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : 0
    };
  }

  save() {
    localStorage.setItem('jlpt-progress', JSON.stringify(this.data));
  }


  getOverallStats() {
    const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
    let totalCorrect = 0, totalAnswered = 0;
    levels.forEach(lv => {
      totalCorrect += this.data.stats[lv].correct;
      totalAnswered += this.data.stats[lv].total;
    });
    return {
      totalAnswered,
      totalCorrect,
      overallAccuracy: totalAnswered > 0 ? ((totalCorrect / totalAnswered) * 100).toFixed(1) : 0,
      levelsCompleted: levels.filter(lv => this.data.stats[lv].total > 0).length
    };
  }
}

const progress = new StudentProgress();

function updateHomePageStats() {
  const stats = progress.getOverallStats();

  const answeredEl = document.getElementById('stat-answered');
  const accuracyEl = document.getElementById('stat-accuracy');
  const levelsEl = document.getElementById('stat-levels');
  const streakEl = document.getElementById('stat-streak');

  if (answeredEl) answeredEl.textContent = stats.totalAnswered;
  if (accuracyEl) accuracyEl.textContent = stats.totalAnswered > 0 ? stats.overallAccuracy + '%' : '0%';
  if (levelsEl) levelsEl.textContent = stats.levelsCompleted + ' / 5';
  if (streakEl) {
    const maxStreak = Math.max(
      progress.data.stats.N5?.streak || 0,
      progress.data.stats.N4?.streak || 0,
      progress.data.stats.N3?.streak || 0,
      progress.data.stats.N2?.streak || 0,
      progress.data.stats.N1?.streak || 0
    );
    streakEl.textContent = maxStreak > 0 ? String(maxStreak) : t('home.statStreakEmpty');
  }

  // Update mini-panel
  const progressValueEl = document.getElementById('progressValue');
  const miniLevelsEl = document.getElementById('miniLevels');
  const miniAccuracyEl = document.getElementById('miniAccuracy');

  if (progressValueEl) progressValueEl.textContent = stats.totalAnswered;
  if (miniLevelsEl) miniLevelsEl.textContent = stats.levelsCompleted + ' / 5';
  if (miniAccuracyEl) miniAccuracyEl.textContent = stats.totalAnswered > 0 ? stats.overallAccuracy + '%' : '0%';
}

function levelDesc(key) {
  return t('level.' + key);
}

function factGrid(cfg) {
  return `
    <div class="fact-grid">
      <div class="fact"><span>${t('level.kanji')}</span><strong>${cfg.kanji}</strong></div>
      <div class="fact"><span>${t('level.vocab')}</span><strong>${cfg.vocab}</strong></div>
      <div class="fact"><span>${t('level.pass')}</span><strong>${cfg.pass}</strong></div>
    </div>`;
}

function renderLevels() {
  const container = document.getElementById('levelsContent');
  if (!container) return;

  container.innerHTML = Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
    const stats = progress.getStats(key);
    const examUrl = mockExamUrl(key);

    return `
      <article class="level-detail-card level-${key.toLowerCase()}">
        <div class="level-card-head">
          <h3>${key}</h3>
          ${stats.total > 0
            ? `<div class="level-accuracy">
                 <strong>${stats.accuracy}%</strong>
                 <span>${stats.correct} / ${stats.total} ${t('levels.correct')}</span>
               </div>`
            : ''}
        </div>

        <p class="level-desc-line">${levelDesc(key)}</p>
        ${factGrid(cfg)}

        <div class="level-card-foot">
          ${examUrl
            ? `<a href="${examUrl}" class="btn btn-gold">${t('levels.mockTest')}</a>`
            : ''}
          <a href="practice.html?lv=${key}" class="btn btn-ghost">${t('levels.open')} ${key}</a>
        </div>
      </article>`;
  }).join('');
}

function renderPractice() {
  const container = document.getElementById('practiceContent');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const lv = params.get('lv') || 'N5';
  const cfg = LEVEL_CONFIG[lv] || LEVEL_CONFIG.N5;
  const stats = progress.getStats(lv);
  const examLabel = MOCK_EXAMS[lv] ? MOCK_EXAMS[lv].label : '';

  container.innerHTML = `
    <section class="practice-panel">
      <div class="practice-header">
        <div>
          <h1>${lv}</h1>
          <p>${levelDesc(lv)}</p>
        </div>
        <a href="levels.html" class="btn btn-ghost">${t('home.viewAllLevels')}</a>
      </div>

      <div class="progress-grid">
        <div class="progress-card accent-blue">
          <span class="card-label">${t('home.progressAccuracy')}</span>
          <div class="card-value">${stats.accuracy}<span class="card-unit">%</span></div>
          <div class="card-meta">${stats.correct} / ${stats.total} ${t('levels.correct')}</div>
        </div>
        <div class="progress-card accent-gold">
          <span class="card-label">${t('home.statStreak')}</span>
          <div class="card-value">${stats.streak}</div>
          <div class="card-meta">${t('levels.lastStudied')}: ${stats.lastStudied || t('levels.never')}</div>
        </div>
        <div class="progress-card accent-purple">
          <span class="card-label">${t('level.vocab')}</span>
          <div class="card-value card-large">${cfg.vocab}</div>
          <div class="card-meta">${lv}</div>
        </div>
        <div class="progress-card accent-teal">
          <span class="card-label">${t('level.kanji')}</span>
          <div class="card-value card-large">${cfg.kanji}</div>
          <div class="card-meta">${lv}</div>
        </div>
      </div>

      <div class="section-grid">
        ${Object.entries(SECTIONS).map(([key, section]) => {
          const examUrl = mockExamUrl(lv, key);
          return `
            <div class="section-card" style="--accent: ${section.color}">
              <h4>${t(section.key)}</h4>
              ${examUrl
                ? `<a href="${examUrl}" class="btn btn-gold section-exam">${t('practice.mockTest')}</a>
                   <p class="section-note">${t('practice.officialPaper')} · ${examLabel}</p>`
                : `<button class="section-btn" data-section="${key}" data-level="${lv}">${t('practice.practise')}</button>`}
            </div>`;
        }).join('')}
      </div>

      <div class="mode-grid">
        <button class="mode-card" data-mode="study" data-level="${lv}">
          <span>${t('practice.studyMode')}</span>
          <strong>${t('practice.studyModeTitle')}</strong>
          <div class="mode-note">${t('practice.studyModeBody')}</div>
        </button>
        <button class="mode-card" data-mode="mock" data-level="${lv}">
          <span>${t('practice.mockMode')}</span>
          <strong>${t('practice.mockModeTitle')}</strong>
          <div class="mode-note">${t('practice.mockModeBody')}</div>
        </button>
      </div>
    </section>
  `;

  /* Both mode cards and section buttons open the real exam player. */
  document.querySelectorAll('.mode-card').forEach((button) => {
    button.addEventListener('click', () => {
      const url = mockExamUrl(button.dataset.level);
      if (!url) { window.location.href = 'exams.html'; return; }
      window.location.href = button.dataset.mode === 'study' ? `${url}&mode=study` : url;
    });
  });

  document.querySelectorAll('.section-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const url = mockExamUrl(button.dataset.level, button.dataset.section);
      window.location.href = url ? `${url}&mode=study` : 'exams.html';
    });
  });
}

/* The one paper whose recording has gone from Google Drive upstream. Checked
   by requesting all 235 distinct audio files: 234 still serve audio, this one
   returns 404. */
const DEAD_AUDIO = { id: 'n2-2013-12', label: 'N2 — December 2013' };

const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];

let noticeData = null;

/* The home page notice: how many papers exist per level, which of them have a
   listening section, and which have word meanings. Read from the built data
   rather than written by hand, so it cannot drift out of date. */
function renderNotice() {
  const table = document.getElementById('noticeTable');
  if (!table) return;

  if (!noticeData) {
    Promise.all([
      fetch('data/exams/index.json', { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : null)),
      fetch('data/glossary/index.json', { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]).then(([exams, glossary]) => {
      if (!exams) return;
      noticeData = { exams: exams.exams || [], glossary: glossary };
      renderNotice();
    }).catch(() => { /* the panel just stays empty */ });
    return;
  }

  const { exams, glossary } = noticeData;
  const withWords = new Set((glossary && glossary.exams ? glossary.exams : [])
    .map((e) => e.id));

  const stats = {};
  LEVEL_ORDER.forEach((lv) => { stats[lv] = { papers: 0, listening: 0, words: 0 }; });
  exams.forEach((e) => {
    const s = stats[e.level];
    if (!s) return;
    s.papers += 1;
    if (e.parts.some((p) => p.id === 'listening')) s.listening += 1;
    if (withWords.has(e.id)) s.words += 1;
  });

  let html = '<thead><tr>' +
    `<th>${t('notice.colLevel')}</th>` +
    `<th>${t('notice.colPapers')}</th>` +
    `<th>${t('notice.colListening')}</th>` +
    `<th>${t('notice.colWords')}</th>` +
    '</tr></thead><tbody>';

  LEVEL_ORDER.forEach((lv) => {
    const s = stats[lv];
    /* A level with nothing says so plainly instead of showing a row of
       zeroes that reads like a loading failure. */
    if (!s.papers) {
      html += `<tr class="is-empty"><th>${lv}</th>` +
        `<td colspan="3">${t('notice.none')}</td></tr>`;
      return;
    }
    let listening;
    if (!s.listening) listening = `<span class="notice-bad">${t('notice.listeningNone')}</span>`;
    else if (s.listening === s.papers) listening = tf('notice.listeningAll', { n: s.papers });
    else listening = `<span class="notice-part">${tf('notice.listeningSome', { n: s.listening, m: s.papers })}</span>`;

    html += `<tr><th>${lv}</th>` +
      `<td>${s.papers === 1 ? t('notice.paperOne') : tf('notice.papers', { n: s.papers })}</td>` +
      `<td>${listening}</td>` +
      `<td>${s.words ? t('notice.yes') : '<span class="notice-dim">—</span>'}</td>` +
      '</tr>';
  });
  html += '</tbody>';
  table.innerHTML = html;

  const noListening = exams.filter(
    (e) => !e.parts.some((p) => p.id === 'listening')).length;

  const foot = document.getElementById('noticeFoot');
  if (foot) {
    foot.innerHTML =
      `<div class="notice-item"><h3>${t('notice.audioTitle')}</h3>` +
        `<p>${t('notice.audioBody')}</p>` +
        `<p>${tf('notice.audioDead', { paper: DEAD_AUDIO.label })}</p>` +
        `<p>${tf('notice.noListeningBody', { n: noListening })}</p></div>` +
      `<div class="notice-item"><h3>${t('notice.colWords')}</h3>` +
        `<p>${t('notice.wordsBody')}</p></div>` +
      `<div class="notice-item notice-help"><h3>${t('notice.helpTitle')}</h3>` +
        `<p>${t('notice.helpBody')}</p>` +
        '<p><a href="https://play.google.com/store/apps/details?id=dpt.com.nihongo_jsempai"' +
          ' target="_blank" rel="noopener noreferrer">Japanese Listening JSempai (Android)</a>' +
        ' &middot; <a href="https://apps.apple.com/us/app/japanese-listening-jsempai/id1469694693"' +
          ' target="_blank" rel="noopener noreferrer">iOS</a></p></div>';
  }
}

/* Pressing the wordmark or the JL badge plays a short transition before the
   page changes. On the home page there is nowhere to go, so it returns to the
   top instead of reloading. */
function wireBrand() {
  const brand = document.getElementById('brandLink');
  if (!brand) return;

  brand.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (brand.classList.contains('is-pressed')) return;

    brand.classList.add('is-pressed');
    const done = () => brand.classList.remove('is-pressed');

    const onHome = document.body.classList.contains('home-page');
    if (onHome) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(done, 620);
      return;
    }
    /* Leaving: fade the page out, then navigate. The timeout is the backstop
       for a browser that never fires transitionend. */
    document.body.classList.add('is-leaving');
    setTimeout(() => { window.location.href = 'index.html'; }, 260);
  });
}

function renderAll() {
  updateHomePageStats();
  renderLevels();
  renderPractice();
  renderNotice();
}

document.addEventListener('DOMContentLoaded', () => {
  I18N.init();
  renderAll();
  wireBrand();
});

/* Switching language re-renders the JS-built pages so nothing stays behind. */
document.addEventListener('languagechange', renderAll);
