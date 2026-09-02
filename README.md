# JLPT Practice

A JLPT study site for learners in Japan, built around **86 past papers
(8,127 questions)** from N1–N5 that are played as timed, auto-scored exams.

## Run it

Exam data is fetched over HTTP, so serve the folder — opening the files
directly will not work:

```bash
python3 -m http.server 5500
# then open http://localhost:5500
```

## Pages

| File | What it is |
|---|---|
| `index.html` | Home — progress overview and entry points |
| `levels.html` | The five JLPT levels, with a mock-test button each |
| `practice.html?lv=N2` | Per-level page: sections, modes, mock test |
| `exams.html` | Library of all 86 past papers, filter by level, search by year |
| `exam.html?id=n2-2023-12` | The exam player |
| `stats.html` | Progress and accuracy per level |
| `about.html` | About the project |

## Layout

```
assets/css/styles.css        shared design tokens and site chrome
assets/css/exam.css          exam player + exam library
assets/js/i18n.js            translation engine (data-i18n, t(), no reload)
assets/js/i18n-strings.js    171 UI strings x 12 languages
assets/js/site.js            levels, practice page, progress store
assets/js/exam-player.js     the exam: setup, one-page paper, marking
assets/js/exams-browser.js   exam library listing
assets/js/stats.js           statistics page

data/exams/index.json        catalogue of every built exam
data/exams/<id>.json         one exam (questions, keys, explanations)
data/glossary/<id>.json      word meanings for one paper (N1, N2, N3)
data/dict/                   dictionary build inputs, never served
tools/build_exams.py         rebuilds data/exams from the archived sources
tools/fetch_dicts.py         downloads JMdict and the JLPT level lists
tools/build_glossary.py      rebuilds data/glossary

jlpt_n1_pages/ … jlpt_n4_pages/
    258 archived source pages, named <exam-id>-<paper>.html. Input to the
    build script only — never served to users.
```

## The exams

Each paper opens as **one continuous page**, like the printed booklet:
questions grouped under their 問題 instruction, reading passages pinned
beside the questions that use them, one audio player per listening section,
and a question map for navigation. Submitting marks the same page in place
and gives an estimated JLPT scaled score with a section breakdown.

You can add your own papers in `data/exams-manual/` — they are validated on
build and labelled "Practice paper" so they are never confused with the
archived sittings.

## The home page notice

The home page opens with a panel built from the data itself, not written by
hand, so it cannot drift: how many papers exist at each level, how many of
them include a listening section, and which have word meanings. A level with
nothing says so, rather than showing a row of zeroes.

Below it: how the listening audio works, the one paper whose recording has
been lost upstream, how many papers were archived with no listening paper at
all, and where to practise listening if audio will not play for you.

## Word meanings

The **N1, N2 and N3** papers carry a built-in glossary. Every question, reading
passage and listening transcript has a **Word meanings** button, and one button
in the command bar opens them all at once. Each entry gives the word with
furigana over the kanji, its JLPT level, its part of speech, and a short
English meaning:

```
割る   N3  verb   to divide; to cut; to break
資料   N2  noun   material; materials; data
```

Every word is covered on both halves of a question — the prompt **and** the
options. Words written in kanji get furigana; words already written in kana get
a meaning but no furigana, being already their own reading.

**Anything written with kanji is explained, whatever its level.** The kanji is
itself the difficulty: someone who cannot read 横 cannot look it up either, so
filtering those by level would leave exactly the words that stop a reader
mid-sentence unexplained.

For words written only in kana, where nothing has to be deciphered before the
word can be recognised, the level decides — and by the **word's** level, not
the paper's:

| Word | Glossed? |
|---|---|
| contains kanji | **always** |
| kana, N1/N2/N3 | always — an N2 candidate still wants a half-forgotten N3 word |
| kana, in no level list | yes — absent from 8,900 study words means rare, not trivial |
| kana, N4 | only the hard ones the dictionary does not mark as common |
| kana, N5 | never |

Meanings are always English — they are the help, not the thing being tested —
while the buttons and headings follow the language picker.

83 of the 86 papers have one — every N1, N2 and N3 sitting. To rebuild, or to
extend it to the remaining N4 and N5 papers (edit `LEVELS` in the script):

```bash
pip3 install janome            # tokenizer, needed once
python3 tools/fetch_dicts.py   # ~59 MB of dictionary data into data/dict/
python3 tools/build_glossary.py
```

See **[EXAMS.md](EXAMS.md)** for how the data is extracted, how to rebuild it,
the scoring model, why some exams have no listening section, and why newer
sittings cannot simply be downloaded.

## Listening

Listening plays in the page. The recordings are embedded from Google Drive,
which needs a connection.

This was broken until now, and the cause was not obvious: the archived pages
embed each recording as a **Wayback-wrapped copy of the Drive preview page**,
and that archived copy contains no media element at all — there was never a
player in the box to press. Pointing the frame at the live Drive preview
brings the player back.

A native `<audio>` element would be better — real seeking, playback speed —
but Drive will not allow it. The file is served with
`content-disposition: attachment` and `x-content-type-options: nosniff`, so
Chrome blocks it with `ERR_BLOCKED_BY_ORB`, and requesting it in CORS mode
fails outright. The iframe is Google's supported way to embed a Drive file.

Of the 235 distinct recordings, 234 still serve audio. The one exception is
**N2 December 2013**, whose file now returns 404; that is the paper's whole
listening section, so the player is replaced with a note. A cross-origin
iframe fires no error event, so every other listening section carries a
"Not playing?" link instead of waiting for a failure it cannot detect.

## Languages

The picker translates the whole interface in place, with no page reload, and
remembers the choice. 12 languages are covered: English, 日本語, नेपाली,
Tiếng Việt, Bahasa Indonesia, Filipino, සිංහල, हिन्दी, Português (BR), 中文,
한국어, বাংলা.

To change or add wording, edit `assets/js/i18n-strings.js`. English is the
master table; any key missing from another language falls back to English, so
a gap shows real text rather than a raw key. Mark new markup with
`data-i18n="key"` and call `t('key')` from scripts.

**The non-English tables were machine-translated.** They are consistent and
complete, but a native speaker should review them before you promote the site
publicly.

Exam questions themselves are always in Japanese — that is the language being
tested.

## Notes

- Exam diagrams stream from `web.archive.org` and listening audio from Google
  Drive, so those need an internet connection. Everything else works offline.
- Progress and in-progress exam answers are stored in `localStorage`, per
  browser. There is no backend.


gokakumichi.com — 合格道, "the road to passing". Distinctive, brandable, meaningful to learners, no trademark exposure. This is the one I'd register.
shikenhall.com — 試験場, and it already matches your existing tagline "Examination hall", so your branding needs no change.
nihongomock.com — least clever, clearest: says "mock tests" immediately, which helps a stranger who lands on it.



Main post (recommended)

Free JLPT mock exams — N5 to N1.

86 full-length practice papers. Timed, marked instantly, with listening audio and answer explanations.

You also get a score for vocabulary, grammar, reading and listening separately — so you know which one is actually holding you back.

No signup. No app. Nothing saved anywhere but your own browser.

👉 jlpt.sureshsurkheti.com

If your audience is Nepali speakers in Japan — this is your real edge, and nothing else has it. Lead with it:

जापानमा हुनुहुन्छ? JLPT को तयारी गर्दै?

N5 र N4 का ७५७ + ७१६ शब्द नेपाली अर्थसहित। सबै लेभलका व्याकरण ढाँचा पनि नेपालीमा।

८६ वटा पूरा मक टेस्ट — समयसहित, तुरुन्तै नतिजा। पूरै निःशुल्क, दर्ता चाहिँदैन।

👉 jlpt.sureshsurkheti.com

A shorter one for reposting later:

2,211 kanji with stroke-order animation. 9,639 words. 86 mock exams. All free, no signup.

jlpt.sureshsurkheti.com

Three things that will matter more than the wording:

Post it where your people already are. Nepali-in-Japan groups, 技能実習生 groups, JLPT study groups, university international-student pages. One post in the right group beats ten on your own timeline.

Lead with the differentiator, not the category. "Free JLPT practice" is a crowded phrase. "Nepali meanings" and "separate score per skill" are things the big sites genuinely don't offer.

Don't say "past papers" or "real JLPT questions." We deliberately took that wording off the site — repeating it in an ad puts it right back in front of the people most likely to object.

One practical check before you post: paste your URL into Facebook's Sharing Debugger and hit "Scrape Again". Facebook caches link previews aggressively, and if it looked at your site before the OG card existed, it'll keep showing the old empty preview until you force a refresh.

1,753 Nepali meanings. 9,639 words, 2,211 kanji with stroke-order animation, 86 full mock exams — N5 to N1, free, no signup.
jlpt.sureshsurkheti.com


tod o things tomorrow
make the app icon very good when installing in mobile
remove the questions map
and also make the numbering method make in the format of jlpt exam for all remove the custom numbering and question map
and when in study mode select once canot edit so what is the good method for that do accordingly.
for the listening part can we keep the listening part in above every questions above part instead of listening one audio for many questions??
if there is already finished parts like any vocab grammer reading or listening make to show the total mark of last time and if second time is practiced same and if it second time got more than last time update the score and if less donot update the score... 