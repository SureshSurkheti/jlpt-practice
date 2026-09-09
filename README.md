# JLPT Practice

A JLPT study site for learners in Japan, built around **123 papers
(11,609 questions)** from N1–N5 that are played as timed, auto-scored exams:
89 archived sittings, and 34 written for this site in the same format.

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
| `exams.html` | Library of all 123 papers, filter by level, search by year |
| `exam.html?id=n2-2023-12` | The exam player |
| `stats.html` | Progress and accuracy per level |
| `about.html` | About the project |

## Layout

```
assets/css/styles.css        shared design tokens and site chrome
assets/css/exam.css          exam player + exam library
assets/js/i18n.js            translation engine (data-i18n, t(), no reload)
assets/js/i18n-strings.js    419 UI strings x 12 languages
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

## The papers written for this site

N4 and N5 had two papers each. They now have **18 each**, because the archive
holds hardly any at those levels and they are where most learners start.
Thirty-two of them are composed rather than typed out: the questions live in
item banks under `data/practice-bank/`, and `tools/build_practice_papers.py`
deals them into papers of the published shape — 67 questions at N5, 93 at N4,
across all three booklets.

```bash
python3 tools/build_practice_papers.py   # then the usual build chain
```

Two things the assembler does that a hand-written paper does not:

- **It shuffles the choices.** The banks store the right answer first, because
  a bank you can check by eye is a bank that gets checked. The first
  hand-written paper shipped with all 21 answers in position 1 — you could
  score 100% by always picking the first choice. Answers now land 289/287/
  260/236 across the four positions at N5 and 403/383/398/304 at N4.
- **It refuses to repeat itself.** Every item is dealt once, and the build
  checks afterwards that no question — passage, script, prompt and choices —
  appears in two papers anywhere in the library.

The wrong readings in 問題1 and the wrong spellings in 問題2 are derived rather
than typed; see the note at the top of `tools/vocab_gen.py` for how, and why
there are only five rules.

**Practice Tests 1 and 2 are topped up, not replaced.** They were written by
hand before any of this existed — Test 2 was a whole paper bar its 聴解, and
Test 1 was three questions and never more. The hand-written questions live in
`data/practice-bank/seed/` and what was missing is dealt in around them, so
Test 1 is now a full 67-question paper that still opens with the two 漢字読み
questions it was written with. A seed question says which 問題 it belongs to;
a booklet that is absent is dealt whole, and continues the paper's own 問題
numbering rather than starting again at 1.

**The deal is written down** (`data/practice-bank/deal.json`). A seeded
shuffle makes a rebuild reproducible only while the bank does not change:
append one item and everything after it moves, quietly dealing different
questions into papers that already exist. The file records the order, so
items already dealt keep their place and anything new is appended. Adding to
a bank can add a paper; it can no longer disturb one.

## What is still missing, and why

Nine papers have a gap that will not be filled:

| Papers | Gap | Why it stays |
|---|---|---|
| 6 N1 sittings, 1 N3 | no 聴解 booklet | The booklet was never archived. Writing one would put invented questions inside a paper labelled as a real sitting, which is the one thing this must not do. |
| n1-2018-12 | 3 of 4 聴解 sections silent | Archived with neither a recording nor a transcript, so there is nothing to play and nothing to speak. |
| n4-practice-1 | no 読解, no 聴解 | Scraped from someone else's practice set. Adding questions to it would make a hybrid that is honest about neither half. |

Checked rather than assumed: the six N1 and one N3 source pages carry no
questions and no answer key at all — 0 bytes of either — and n1-2025-07 has no
source page. The other six questions the parser reports losing are five
worked examples, which are not questions, and three whose options the source
mis-split or lost, where the answer index would point at the wrong text.
One of those has no answer, no options and no transcript.

Each of those papers now says which sitting at the same level has the booklet
it is missing, and links straight into it.

The library says so on each of them rather than leaving a reader to find out
by sitting a section in silence.

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

Every paper has one. To rebuild, or to
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

**115 of the 123 papers can be listened to end to end**, and 540 of the 543
listening sections in them, by two different routes.

The archived sittings that kept their recordings embed them from Google
Drive, which needs a connection. Everything else is spoken by the voice
already installed on the device reading the page — the 32 papers written for
this site, which have no recording and never will, and the 799 archived
questions across 34 papers whose sound file was never archived or has since
died. Those carry a transcript, the site already prints it, and reading text
that is already on the page aloud in the reader's own browser is what a
screen reader does: no copy is made and nothing is hosted.

Nothing is downloaded and it works with the tab offline. Two speakers get two
different voices where the device has them. A section whose own recording
plays gets no play button — the recording is the real thing and a control
under every question below it would be clutter.

It is a synthetic voice and the page says so under every play button: this is
not a recording of the real exam. Where the device has no Japanese voice at
all — which happens on Android without TTS data installed — the play button is
not drawn and the transcript opens by default, so the question is still
answerable by reading.

### The archived recordings

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
listening section, and its 32 questions are now spoken from their transcripts
instead. A cross-origin
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


## Advertising copy

Figures below are current as of the last build. Rebuild and re-check before
posting: tools/build_static.py prints the paper and question counts.

### For a Facebook or community group

Free JLPT practice — full mock papers, N5 to N1

No sign-up. No ads. Nothing to pay. Open it and start.

📝 123 practice papers, 11,609 questions — N5 through N1, in the real JLPT format
🆕 N5 and N4 now have 18 papers each — vocabulary, grammar, reading and listening, all three booklets
🔤 Every word of every question, with its reading and meaning — 125,767 of them
⏱️ Timed and marked automatically, section by section — so you can see which section is weakest, which is what actually decides a pass
🎧 115 papers you can listen to end to end
🌏 12 languages — English, नेपाली, Tiếng Việt, Filipino, Bahasa Indonesia, 中文, 한국어, हिन्दी, বাংলা, සිංහල, Português, 日本語
🇳🇵 N5 and N4 word meanings in Nepali — 1,753 words
📚 9,639 vocabulary items, 2,211 kanji with stroke order, 280 grammar points
🙈 Cover the answers on any list and test yourself, tap a row to check
📱 Phone or computer. Installs like an app and works offline
🔒 Your scores stay on your own device. Nothing is uploaded

👉 https://nihongomock.com

### Shorter — for a comment or reply

Free JLPT practice site — 123 full mock papers N5–N1, timed and auto-marked, 115 of them with listening. N5 and N4 have 18 papers each, all three booklets. Every word of every question comes with its reading and meaning. 12 languages including Nepali. No sign-up, no ads, nothing to pay.
https://nihongomock.com

### One line — for X, Threads, a chat group

123 free JLPT mock papers, N5 to N1 — 18 each at N5 and N4, listening included. Timed, auto-marked, every word glossed. No sign-up, no ads.
https://nihongomock.com

### If the group has seen it before

A repost with no news reads as spam, so lead with what changed:

New on the free JLPT practice site: N5 and N4 now have 18 full papers each, up from 2. Every one has all three booklets — 文字・語彙, 文法・読解 and 聴解 — and the listening is spoken aloud in the page, so you can actually sit it. 11,609 questions across 123 papers now.
https://nihongomock.com

### Nepali

नि:शुल्क JLPT अभ्यास — N5 देखि N1 सम्म

दर्ता गर्नु पर्दैन। विज्ञापन छैन। पैसा तिर्नु पर्दैन।

📝 १२३ अभ्यास प्रश्नपत्र, ११,६०९ प्रश्न — वास्तविक JLPT ढाँचामा
🆕 N5 र N4 मा अब १८-१८ वटा प्रश्नपत्र — शब्द, व्याकरण, पठन र श्रवण सबै
🔤 हरेक प्रश्नको हरेक शब्दको उच्चारण र अर्थ
⏱️ समय गणना र स्वतः अङ्क — कुन सेक्सन कमजोर छ देखाउँछ
🎧 ११५ प्रश्नपत्रको सुनाइ पूरै सुन्न मिल्ने
🇳🇵 N5 र N4 का १,७५३ शब्दको अर्थ नेपालीमा
📚 ९,६३९ शब्द, २,२११ कान्जी (लेख्ने क्रम सहित), २८० व्याकरण
📱 मोबाइल र कम्प्युटर दुवैमा; इन्टरनेट बिना पनि चल्छ
🔒 तपाईंको अङ्क तपाईंकै यन्त्रमा रहन्छ

👉 https://nihongomock.com
