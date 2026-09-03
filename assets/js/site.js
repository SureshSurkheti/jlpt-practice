/* Only language-neutral facts live here now. The one-line description per
   level is a translated string (level.N5 … level.N1), so the page changes
   language with everything else. */
/* Pass marks are official, from
   https://www.jlpt.jp/e/guideline/results.html - and a pass needs both the
   total and every scoring section on its own.

   The kanji and vocabulary figures are NOT official and cannot be. The JLPT
   has published no list since the 2010 revision, and says so plainly in its
   own FAQ: the goal is communication, not memorising a set. These are the
   widely-used community estimates, carried here because a learner asking
   "roughly how much is this?" deserves an answer - which is why they are
   written with a ~ and footnoted on the levels page. */
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

/* ==========================================================================
   Your scores

   There was a StudentProgress class here - a localStorage store with per
   level totals, accuracy, streaks and a "last studied" date, feeding a
   panel in the home hero, a strip of four cards under it, a summary row on
   the levels page and the whole statistics page.

   Nothing ever wrote to it. recordAnswer() existed and was never called from
   the exam player or the study lists, so every one of those numbers was a
   hard-coded zero shown to every visitor on every visit: "0 answered, 0%
   accuracy, 0 / 5 levels, streak 0". The furniture of a progress feature
   with no progress feature behind it.

   The store that does hold real results is jlpt.best, written by the exam
   player when a section is marked. This reads that, and the places that used
   to print zeros either show a real score or show nothing at all.
   ========================================================================== */

const BEST_KEY = 'jlpt.best';
const SECTION_KEYS = ['language', 'reading', 'listening'];

function readBests() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const all = raw ? JSON.parse(raw) : null;
    return (all && typeof all === 'object') ? all : {};
  } catch (e) {
    return {};
  }
}

/* Your best at one level: the best score for each scored section, added up.

   This used to add every result from every paper together, so sitting the
   same N4 section on two papers reported "34 / 240" - a total out of twice
   what the exam is even marked out of, which grew every time you practised
   and so made a diligent learner's percentage fall. It was also comparable
   to nothing: the JLPT gives you a mark out of 180, and the pass mark for
   the level is a number on that scale.

   Best-of-each-section keeps it on that scale. The cap follows the sections
   you have actually sat, so it reads "32 / 60" after one section rather than
   claiming the other two were failed. */
function levelBest(level) {
  const all = readBests();
  const best = {};
  const papers = new Set();
  let last = 0;

  Object.keys(all).forEach((id) => {
    if (id.toUpperCase().indexOf(level.toUpperCase() + '-') !== 0) return;
    const rec = all[id];
    SECTION_KEYS.forEach((k) => {
      if (!rec[k]) return;
      papers.add(id);
      if (rec[k].lastAt > last) last = rec[k].lastAt;
      if (!best[k] || rec[k].best > best[k].best) {
        best[k] = { best: rec[k].best, cap: rec[k].cap };
      }
    });
  });

  const keys = Object.keys(best);
  if (!keys.length) return null;

  const scored = keys.reduce((n, k) => n + best[k].best, 0);
  const cap = keys.reduce((n, k) => n + best[k].cap, 0);
  return {
    scored, cap, last,
    papers: papers.size,
    sections: keys.length,
    percent: cap ? Math.round((scored / cap) * 100) : 0
  };
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

/* The levels page answers one question: which level am I, and what does it
   ask of me? That is a comparison, so it is a table - five rows you can read
   down a single column of - rather than five cards you have to hold in your
   head. Practising happens on the practice page; this one links there. */
/* ==========================================================================
   Levels

   This page used to be two. "Levels" was a comparison table whose every row
   held a description, a kanji count, a vocabulary count, a pass mark and
   your accuracy, and whose only action was a button to "Practice"; the
   Practice page then showed you the same five descriptions, the same three
   counts and the same accuracy again, this time with the buttons that
   actually did something. One of them was a table of contents for the other.

   They are one page now. Everything the table carried that the cards did not
   - the sitting time for each level - moved into the cards, and the table
   went. Five cards also survive a phone without the table-to-card fallback
   the old markup needed, which is where the last layout bug came from.
   ========================================================================== */

/* Total sitting time for each level, from the JLPT's published timetable. */
/* Total sitting time per level, from the official timetable at
   https://www.jlpt.jp/e/guideline/testsections.html

     N5  20 + 40 + 30           =  90
     N4  25 + 55 + 35           = 115
     N3  30 + 70 + 40           = 140
     N2  105 + 50               = 155   (N2 and N1 combine vocabulary,
     N1  110 + 55               = 165    grammar and reading into one paper)

   These were wrong for two levels. The JLPT shortened its test times from
   2022 and this table held a mix of both: N4, N3 and N2 had the current
   figures while N5 (105) and N1 (170) were still the pre-2022 ones. A mix is
   worse than being uniformly out of date, because nothing looks wrong. */
const LEVEL_MINUTES = { N5: 90, N4: 115, N3: 140, N2: 155, N1: 165 };

function renderLevels() {
  const container = document.getElementById('levelsContent');
  if (!container) return;

  const wanted = (new URLSearchParams(window.location.search).get('lv') || '')
    .toUpperCase();

  /* The row of three summary numbers that used to open this page is gone -
     see the note above readBests(). It read "0 answered, 0% accuracy, 0 / 5
     levels" for everybody, always. */
  container.innerHTML = `
    <div class="practice-levels">
      ${LEVEL_ORDER.map(levelBlock).join('')}
    </div>

    <p class="levels-note">${t('levels.scoringNote')}</p>
    <p class="levels-source">${t('levels.sourceNote')}
      <a href="https://www.jlpt.jp/e/guideline/testsections.html"
         target="_blank" rel="noopener">jlpt.jp</a></p>
  `;

  wirePracticeButtons();

  /* Deep link from the home page, the stats page or a finished paper:
     bring that level into view rather than dropping you at N5. */
  if (LEVEL_ORDER.indexOf(wanted) !== -1) {
    const node = document.getElementById('lv-' + wanted);
    if (node) {
      node.classList.add('is-target');
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }
}

function levelBlock(lv) {
  const best = levelBest(lv);
  const cfg = LEVEL_CONFIG[lv] || LEVEL_CONFIG.N5;
  const exam = MOCK_EXAMS[lv];
  const examUrl = mockExamUrl(lv);
  /* Every level has its own vocabulary page now, so this points at that one
     rather than at the shared list page with the wrong level selected. The
     relative path keeps it inside whichever language directory we are in. */
  const listUrl = `study/${lv.toLowerCase()}-words.html`;

  /* Your own best on this level, or nothing. It used to say "Never" in a
     grey box on every level for every visitor, which is a label for an
     absence - and an absence does not need a label on a page you are
     reading to decide where to start. */
  const bar = best
    ? `<div class="plevel-bar"><div class="plevel-bar-fill"
         style="width:${best.percent}%"></div></div>`
    : '';

  /* Labelled, because a bare "93/180" in the corner of a card that also
     shows a kanji count, a vocabulary count and a pass mark is one more
     number with nothing saying whose it is. */
  const score = best
    ? `<div class="plevel-score">
         <em>${t('levels.bestLabel')}</em>
         <strong>${best.scored}<i>/${best.cap}</i></strong>
         <span>${best.papers} ${t(best.papers === 1 ? 'exams.paper' : 'exams.papers')}</span></div>`
    : '';

  /* Buttons stay live even when the level has no paper. Disabling them left
     four grey rectangles and no explanation; pressing one now says what is
     missing and points at what does exist. */
  const skills = Object.entries(SECTIONS).map(([key, section]) => `
    <button type="button" class="skill-btn" style="--accent: ${section.color}"
            data-section="${key}" data-level="${lv}">
      ${t(section.key)}
    </button>`).join('');

  return `
    <article class="plevel level-${lv.toLowerCase()}" id="lv-${lv}">
      <div class="plevel-head">
        <span class="plevel-code">${lv}</span>
        ${score}
      </div>
      <p class="plevel-desc">${levelDesc(lv)}</p>
      ${bar}
      <dl class="plevel-facts">
        <div><dt>${t('level.kanji')}</dt><dd>${cfg.kanji}</dd></div>
        <div><dt>${t('level.vocab')}</dt><dd>${cfg.vocab}</dd></div>
        <div><dt>${t('level.pass')}</dt><dd>${cfg.pass}</dd></div>
        <div><dt>${t('levels.colTime')}</dt>
          <dd>${LEVEL_MINUTES[lv]} ${t('levels.minutes')}</dd></div>
      </dl>
      <div class="plevel-skills">${skills}</div>
      <div class="plevel-foot">
        <button type="button" class="btn btn-primary plevel-mock" data-level="${lv}">
          ${t('practice.mockTest')}
        </button>
        <a href="${listUrl}" class="btn btn-ghost">${t('practice.studyLists')}</a>
      </div>
      <p class="plevel-note">${examUrl
        ? `${t('practice.officialPaper')} · ${exam.label}`
        : ''}</p>
      <p class="plevel-msg" hidden></p>
    </article>`;
}

/* Nothing on this page is disabled. A level with no paper says so when you
   press it, in the card you pressed, rather than looking broken on arrival. */
function announceNoPaper(card) {
  const msg = card.querySelector('.plevel-msg');
  if (!msg) return;
  msg.innerHTML = `${t('practice.noneYet')}
    <a href="study.html">${t('practice.studyLists')}</a>`;
  msg.hidden = false;
  msg.classList.remove('is-flash');
  void msg.offsetWidth;               // restart the highlight on a repeat press
  msg.classList.add('is-flash');
}

function wirePracticeButtons() {
  document.querySelectorAll('.skill-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const url = mockExamUrl(button.dataset.level, button.dataset.section);
      if (url) { window.location.href = `${url}&mode=study`; return; }
      announceNoPaper(button.closest('.plevel'));
    });
  });

  document.querySelectorAll('.plevel-mock').forEach((button) => {
    button.addEventListener('click', () => {
      const url = mockExamUrl(button.dataset.level);
      if (url) { window.location.href = url; return; }
      announceNoPaper(button.closest('.plevel'));
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
/* ==========================================================================
   What the site holds

   Six figures, read from the data files rather than typed, so the panel
   cannot claim something the site no longer has. Numbers lead because a
   number is the same sentence in twelve languages, and because "2,211 kanji"
   argues better than "kanji lists" ever will.
   ========================================================================== */
function renderFeatures() {
  const host = document.getElementById('featureGrid');
  if (!host) return;

  const counts = window.SITE_COUNTS;
  if (!counts) return;

  const card = (n, label, sub, accent) => `
    <div class="feature-stat" style="--accent:${accent}">
      <strong>${n}</strong>
      <span class="feature-stat-label">${label}</span>
      <span class="feature-stat-sub">${sub}</span>
    </div>`;

  const nf = (v) => v.toLocaleString();
  const levels = 'N5 &rarr; N1';

  host.innerHTML =
    card(nf(counts.words), t('study.words'), levels, '#2d6eb4') +
    card(nf(counts.kanji), t('study.kanji'), t('study.strokeOrder'), '#7c3ac8') +
    card(nf(counts.grammar), t('study.grammar'), levels, '#2f7d57') +
    /* The sub-line under this one used to read "Automatically" - the value
       of a stat that was deleted from the exams page, left behind under a
       count of papers where it means nothing. */
    card(nf(counts.papers), t('exams.statPapers'), levels, '#d9a63a') +
    /* The Nepali card names itself in Nepali whatever language the page is
       in - somebody looking for it is looking for that word. */
    card(nf(counts.nepali), '\u0928\u0947\u092a\u093e\u0932\u0940',
         t('home.inNepali'), '#c84a52') +
    /* And this one was labelled with the language picker's own caption -
       "12 Language" - over a sub-line that repeated the section's heading
       verbatim. */
    card('12', t('home.featLanguages'), t('home.featLanguagesSub'), '#5c697a');
}

function renderNotice() {
  const table = document.getElementById('noticeTable');
  if (!table) return;

  if (!noticeData) {
    Promise.all([
      fetch(SITE_ROOT + 'data/exams/index.json', { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : null)),
      fetch(SITE_ROOT + 'data/glossary/index.json', { cache: 'no-cache' })
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
    /* Counted by whether the recordings are there, not by whether the
       booklet is. One N4 paper has a 28-question listening section and no
       audio behind any of it; this table used to count it as listening. */
    if (e.parts.some((p) => p.id === 'listening' && p.audio)) s.listening += 1;
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
    (e) => !e.parts.some((p) => p.id === 'listening' && p.audio)).length;

  /* Word meanings are the thing this site has that the others do not - 95,000
     of them, on a button under every question of 83 papers - and until now
     the only place that was explained was inside a collapsed <details>. The
     table above says "Yes" in a column; that is not an explanation. Say what
     it means, in the open, with the number. */
  const lead = document.getElementById('noticeWords');
  if (lead) {
    const glossed = (glossary && glossary.exams ? glossary.exams : [])
      .reduce((n, e) => n + e.words, 0);
    lead.innerHTML =
      `<strong>${glossed.toLocaleString()}</strong> ` +
      `${t('notice.colWords').toLowerCase()} &middot; ${t('notice.wordsBody')}`;
    lead.hidden = false;
  }

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

/* The six nav links do not fit a phone in any language - English needs 434px
   of a 358px row, Japanese 478 - so the row scrolls sideways. On its own that
   just looks like a word cut in half at the edge, so fade whichever side has
   more to see. */
function wireNavScroll() {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  const sync = () => {
    const over = nav.scrollWidth - nav.clientWidth;
    nav.classList.toggle('can-scroll', over > 1);
    nav.classList.toggle('at-start', nav.scrollLeft <= 1);
    nav.classList.toggle('at-end', nav.scrollLeft >= over - 1);
  };

  sync();
  nav.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  document.addEventListener('languagechange', () => setTimeout(sync, 0));

  /* Open the row on the link you are actually on. */
  const active = nav.querySelector('.active');
  if (active) {
    const off = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollLeft = Math.max(0, off);
    sync();
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

/* The fade above sets body{opacity:0} and then leaves the page. Press Back
   and the browser restores that page from the back/forward cache exactly as
   it was frozen - class still on, body still transparent - so the visitor
   lands on a blank white screen with working, invisible content. Nothing in
   the normal load path clears it, because a bfcache restore does not re-parse
   the document.

   pageshow fires on both a fresh load and a restore, so clearing it here
   covers both. Note that getComputedStyle reported opacity "1" throughout
   while the page was demonstrably blank in a screenshot - the screenshot is
   what this was found with. */
function clearLeavingOnRestore() {
  window.addEventListener('pageshow', function () {
    document.body.classList.remove('is-leaving');
  });
}

/* ==========================================================================
   Back

   Returns you to the page you actually came from, not to a fixed parent.
   /study/n1-words.html is reached from the study hub, from the coverage
   table on any of the other nine list pages, from a level card, and from a
   search result - a hard-coded "up" link would be wrong for three of those.

   So: history.back() when the previous page was this site, and a real href
   otherwise. The href matters in three cases the history cannot cover -
   arriving from Google, opening the page in a new tab, and having no
   JavaScript at all - and it is what the link does before this script runs.
   ========================================================================== */
/* Tell the header whether the page has moved, so it can carry a shadow over
   content and none at the top. Cheaper and steadier than a scroll handler:
   a zero-height sentinel at the very top of the page, watched by an
   IntersectionObserver - the browser reports when it leaves the viewport and
   nothing runs in between. */
function wireStickyHeader() {
  var header = document.querySelector(".site-header");
  if (!header || !window.IntersectionObserver) return;

  var mark = document.createElement("div");
  mark.setAttribute("aria-hidden", "true");
  mark.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
  document.body.insertBefore(mark, document.body.firstChild);

  new IntersectionObserver(function (entries) {
    header.classList.toggle("is-stuck", !entries[0].isIntersecting);
  }).observe(mark);
}

/* A back link, on the pages that have somewhere to go back to.

   Not on Levels or Study. Those two are items in the main navigation, three
   inches above, so a "Back" on them answers a question nobody asked - and
   when you have arrived from inside the site it calls history.back(), which
   is precisely what the browser's own back button does, permanently, in
   every window. Two controls for one job, one of them taking the first line
   of the page.

   It stays where there is a real parent and no nav item: the fifteen study
   list pages under /study/, the kanji viewer, the statistics page. You reach
   those from a tab or a card, and nothing in the header will take you back. */
function mountPageBack() {
  var target = document.body.dataset.backTo;
  if (!target) return;

  var main = document.querySelector("main");
  if (!main || document.getElementById("pageBack")) return;

  var a = document.createElement("a");
  a.id = "pageBack";
  a.className = "chip-back page-back";
  a.href = target;

  function label() {
    a.innerHTML = '<span aria-hidden="true">\u2190</span> ' + t("nav.back");
  }
  label();
  document.addEventListener("languagechange", label);

  /* Same-origin referrer means the visitor arrived from somewhere on this
     site, so there is a real previous page to return to. Anything else -
     a search engine, a pasted link, a fresh tab - leaves the href alone. */
  var fromHere = false;
  try {
    fromHere = !!document.referrer &&
      new URL(document.referrer).origin === window.location.origin &&
      document.referrer !== window.location.href;
  } catch (e) { fromHere = false; }

  if (fromHere) {
    a.addEventListener("click", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
      ev.preventDefault();
      history.back();
    });
  }

  main.insertBefore(a, main.firstChild);
}

/* ==========================================================================
   Back to top

   The study lists run to 3,759 rows and a finished paper to 180 questions;
   on a phone that is a long way back to the nav. The button is created here
   rather than written into eight templates, so it exists on every page
   including the ones the generator produces.

   It appears only once there is something to go back to - two screens of
   scrolling - and it is a real <button>, so it is reachable by keyboard and
   announces itself.
   ========================================================================== */
function mountBackToTop() {
  if (document.getElementById("toTop")) return;

  var btn = document.createElement("button");
  btn.id = "toTop";
  btn.type = "button";
  btn.className = "to-top";
  btn.innerHTML = '<span aria-hidden="true">\u2303</span>';
  document.body.appendChild(btn);

  function label() {
    var text = t("nav.top");
    btn.setAttribute("aria-label", text);
    btn.title = text;
  }
  label();
  document.addEventListener("languagechange", label);

  btn.addEventListener("click", function () {
    /* Respect a reduced-motion preference: jump rather than sweep. */
    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    /* Send focus back to the top of the document, or a keyboard user is
       returned to the top of the page with their focus still at the bottom. */
    var first = document.querySelector(".brand-wrap");
    if (first) first.focus({ preventScroll: true });
  });

  var shown = false;
  var ticking = false;
  function check() {
    ticking = false;
    var want = window.scrollY > window.innerHeight * 2;
    if (want === shown) return;
    shown = want;
    btn.classList.toggle("is-on", want);
  }
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(check);
  }, { passive: true });

  check();
  /* A browser restores the scroll position on reload and on Back, and it
     does that after this runs - so the first check can read 0 on a page that
     is already halfway down, and no scroll event follows to correct it.
     Check again once the restore has happened. */
  window.addEventListener("load", check);
  window.addEventListener("pageshow", check);
}

/* ================================================================= next JLPT

   The test is sat on the first Sunday of July and the first Sunday of
   December. That rule was checked against every sitting on record -
   2023-07-02, 2023-12-03, 2024-07-07, 2024-12-01, 2025-07-06, 2025-12-07 -
   and it holds for all six, so the date is computed rather than kept in a
   table. A table is the obvious way to do this and the wrong one: it needs
   editing every year, and the year nobody remembers to edit it, the page
   does not go blank - it confidently shows a date in the past.

   Two things this deliberately does not claim. It does not tell you when
   applications open or close, because that window is set per country and
   this site has no idea which one you are sitting in. And it does not
   promise a July sitting: December runs in every host country, July does
   not, so a July date carries a line saying to check. Being useful here is
   worth less than being right. */
function firstSundayUTC(year, monthIndex) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  return new Date(Date.UTC(year, monthIndex, 1 + ((7 - first.getUTCDay()) % 7)));
}

function nextSitting(fromUTC) {
  const y = fromUTC.getUTCFullYear();
  return [
    firstSundayUTC(y, 6), firstSundayUTC(y, 11),
    firstSundayUTC(y + 1, 6), firstSundayUTC(y + 1, 11)
  ].find((d) => d >= fromUTC);
}

/* The viewer's own calendar date, then treated as UTC for the subtraction.
   Reading it in UTC instead would put someone in Kathmandu a day out for
   most of their evening. */
function todayUTC() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

/* Chrome carries no ICU date data for Nepali or Sinhala. It does not throw
   on those tags - it quietly hands back an English date, so the Nepali home
   page said "Sunday, December 6, 2026" under a Nepali headline and nothing
   looked broken enough to notice. Two tables are cheaper than the confusion.
   They are consulted only when Intl says it cannot do the locale, so both
   languages start using real Intl formatting the day Chrome ships the data.
   Machine-written, like the rest of the non-English tables in
   i18n-strings.js, and worth a native-speaker read. */
const DATE_WORDS = {
  ne: {
    days: ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'],
    months: ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन',
             'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर']
  },
  si: {
    days: ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'],
    months: ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි',
             'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්']
  }
};

function formatSitting(date, lang) {
  const opts = { weekday: 'long', year: 'numeric', month: 'long',
                 day: 'numeric', timeZone: 'UTC' };
  const base = String(lang).split('-')[0];

  let known = false;
  try {
    known = Intl.DateTimeFormat.supportedLocalesOf([lang]).length > 0;
  } catch (e) { known = false; }

  if (!known && DATE_WORDS[base]) {
    const w = DATE_WORDS[base];
    return w.days[date.getUTCDay()] + ', ' + date.getUTCDate() + ' ' +
           w.months[date.getUTCMonth()] + ' ' + date.getUTCFullYear();
  }

  try {
    return date.toLocaleDateString(lang, opts);
  } catch (e) {
    /* A tag Intl will not parse at all. */
    return date.toLocaleDateString('en', opts);
  }
}

/* jlpt.jp splits applications into /e/application/domestic_index.html and
   /e/application/overseas_list.html, and there is no index above them - the
   /e/application/index.html this used to point at does not exist and served
   a 404. Since the page cannot know which of the two applies to the reader,
   it links the English home, which carries both and is stable. Every jlpt.jp
   URL on this site was re-checked for a 200 when that was fixed. */
function renderExamCountdown() {
  const mount = document.getElementById('examCountdown');
  if (!mount) return;

  const today = todayUTC();
  const sitting = nextSitting(today);
  const days = Math.round((sitting - today) / 86400000);
  const isJuly = sitting.getUTCMonth() === 6;
  const lang = (window.I18N && I18N.current && I18N.current()) || 'en';

  /* Three cases, not two: the day itself, the last day before it, and
     everything else. Without the middle one the strip reads "1 days to go"
     on exactly the day a reader is most likely to be looking at it. */
  const countdown = days === 0
    ? `<b>${t('cal.today')}</b>`
    : `<b>${tf(days === 1 ? 'cal.dayLeft' : 'cal.daysLeft', { days: days })}</b>`;

  mount.innerHTML = `
    <p class="cal-head">${t('cal.next')}</p>
    <p class="cal-date">
      <time datetime="${sitting.toISOString().slice(0, 10)}">${formatSitting(sitting, lang)}</time>
    </p>
    <p class="cal-count">${countdown}</p>
    <p class="cal-note">${isJuly ? t('cal.julyNote') : t('cal.checkNote')}
      <a class="cal-link" href="https://www.jlpt.jp/e/index.html"
         target="_blank" rel="noopener">${t('cal.official')}</a></p>
  `;
}

function renderAll() {
  renderFeatures();
  renderLevels();
  renderNotice();
  renderExamCountdown();
}

document.addEventListener('DOMContentLoaded', () => {
  wireNavScroll();
  wireStickyHeader();
  I18N.init();
  mountPageBack();
  mountBackToTop();
  clearLeavingOnRestore();
  renderAll();
  wireBrand();
});

/* Switching language re-renders the JS-built pages so nothing stays behind. */
document.addEventListener('languagechange', renderAll);
