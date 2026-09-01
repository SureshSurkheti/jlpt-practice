# Official exams — how they work

The archived exam pages in `jlpt_n1_pages/` … `jlpt_n4_pages/` are Wayback
snapshots of a Vietnamese JLPT site. They are no longer shown to users.
Instead they are treated as a **data source**: a build script extracts the
questions and answer keys, and the platform renders them itself.

```
jlpt_n*_pages/*.html          tools/build_exams.py          data/exams/*.json
(archived source pages)  ───▶  extract + sanitize      ───▶  clean exam data
                                                                    │
                                          exam.html + exam-player.js ▼
                                          timed, auto-scored test in English
```

## What the user sees

| Page | Purpose |
|---|---|
| `exams.html` | Library of all 84 papers, filter by level, search by year |
| `exam.html?id=<exam-id>` | The exam itself: setup → one-page paper → marked paper |
| `practice.html?lv=N2` | "Start Mock Test" buttons deep-link into `exam.html` |

No Vietnamese interface, no iframes of external sites, no raw archive pages.

## Current data

Built from 258 source files → **86 exams, 8,127 questions**
(85 archived + 1 hand-authored example).

| Level | Exams | Questions |
|---|---|---|
| N1 | 29 | 2,742 |
| N2 | 26 | 2,449 |
| N3 | 28 | 2,760 |
| N4 | 2 | 173 |
| N5 | 1 | 3 |

25 of the 257 source files are placeholders — the original site never
archived those sittings ("Đề thi năm này đang được cập nhật"). Four whole
sittings were placeholder-only and are skipped; the rest contribute the
parts that do exist, which is why some papers have fewer than three
sections.

## Exam ids and file naming

Source names were Vietnamese and inconsistent. Built data uses English,
sortable ids:

| Source files (3 per sitting) | Built as |
|---|---|
| `N1 12_2024.html`, `Đề Từ Vựng N1 12_2024.html`, `Đề nghe N1 12_2024.html` | `data/exams/n1-2024-12.json` |
| `N4 2_2.html`, `Đề Từ Vựng N4 2_2.html`, `Đề nghe N4 2_2.html` | `data/exams/n4-practice-2.json` |

Each JSON holds the three papers as `parts`:
`vocabulary`, `grammar-reading`, `listening`.

The **source HTML files are left untouched** — they are the raw input, and
rebuilding is always possible. Renaming them is unnecessary because users
never see them.

## Rebuilding the data

```bash
python3 tools/build_exams.py
```

Idempotent, no dependencies, ~5 seconds. It prints a per-level summary plus
notes for any source file it could not fully parse. Commit the regenerated
`data/exams/`.

If you add more source pages, also refresh the default mock exam per level
in `assets/js/site.js` (`MOCK_EXAMS`) — those point at the newest paper that
has all three sections.

## What gets extracted

The source pages carry full question metadata in hidden divs, which is what
makes real scoring possible:

| Source | Meaning |
|---|---|
| `div.big_item` | Section instruction (問題N …), plus the listening audio embed |
| `div.question_content` | Reading passage |
| `div.question_list` | Question prompt |
| `div.answers#QS<n><c>` | Choice text |
| `div#AS<n>` | **Correct answer** (1–4) |
| `div#diemso<n>` | Points for the question |
| `div#GT<n>` | Explanation / listening transcript |
| `div#type<n>` | 1 vocab · 2 grammar · 3 reading · 4 listening |

Sanitizing keeps exam formatting (`<u>`, `<br>`, tables, ruby, images) and
drops all site chrome, scripts, and links. Image and audio URLs are
rewritten to absolute `web.archive.org` URLs, so **diagrams and listening
audio need an internet connection**; everything else works offline.

Two quirks handled deliberately:

- Several source pages contain unclosed `<div>` tags, so block boundaries
  come from the template's delimiter comments, not tag depth alone.
- 883 listening questions genuinely have 3 options (即時応答), and 1,989
  have no printed options at all (問題3 — "nothing is printed on the
  question sheet"). Those render as numbered buttons, which is authentic.

## The player

`exam.html` + `assets/js/exam-player.js` + `assets/css/exam.css`.

**Setup** — pick sections (full mock or one section), pick Exam mode (timed,
feedback withheld) or Study mode (answer and explanation as you go), set the
clock.

**The paper** — the whole exam is **one continuous page**, laid out like the
printed booklet:

- questions grouped under their 問題 instruction, one card per section;
- each **reading passage pinned beside the questions that use it**, so you
  read it once and answer 3–4 questions without scrolling back;
- **one audio player per listening section**, not per question — one
  recording covers the section, as in the real test;
- a sticky command bar with the countdown, progress and Submit;
- the **question map** on the right is the navigation: it colours answered /
  flagged / blank, follows you as you scroll, and jumps instantly on click;
- keyboard: `1`–`4` answer the question you are looking at, `↑`/`↓` move
  between questions, `f` flags one.

There is no next/previous stepping. Answers autosave to `localStorage`, so
closing the tab offers a resume.

**Submitting marks the same page** rather than replacing it with a separate
results view: a scorecard drops in at the top, every question gains a
correct/incorrect stripe with the right answer and its explanation, and
filter chips narrow the paper to just the incorrect, blank or correct
questions.

### Scoring

Raw points per section are scaled to the official ranges: Language
Knowledge / Reading / Listening at 0–60 each for N1–N3; for N4–N5, Language
Knowledge + Reading combined at 0–120 plus Listening at 0–60. Pass marks:
N1 100, N2 90, N3 95, N4 90, N5 80, with a minimum sectional score of 19
(38 for the combined N4/N5 section).

Scores are labelled an **estimate**: the real JLPT uses item response
theory, not a raw-point ratio. Sitting a single section scales the pass mark
to that section, and the results screen says so.

## Serving

Exam data is loaded with `fetch`, so the site must be served over HTTP —
opening `exam.html` from the filesystem will not work. Both pages show an
explicit message saying this if it happens.

```bash
python3 -m http.server 5500
# http://localhost:5500/exams.html
```

## Gaps in the data, and why

Two questions come up often, so here are the answers in one place.

**Why does N4 only have 2 exams?** Because `jlpt_n4_pages/` only contains 6
source files — two sittings' worth. The other levels have 80–87 files each.
These two are also not dated sittings but the site's numbered practice papers
(*đề thi thử* 1 and 2), which is why they are `n4-practice-1` and
`n4-practice-2` rather than a year and month. Adding more N4 exams means
adding more source pages; nothing in the build is limiting it.

**Why do 15 exams have no listening section?** Because the archived source
page for that sitting's listening paper is an empty placeholder — the original
site itself said *"Đề thi năm này đang được cập nhật"* ("this year's exam is
being updated") and declared `totalQUestion = 0`. Compare
`Đề nghe N4 1_1.html` (12 KB, empty) with `Đề nghe N4 2_2.html` (73 KB, 28
questions). The data was never there to extract. Those exams now say
"No listening section" on their card in the library, so nobody discovers it
mid-exam.

Listening coverage as built:

| Level | Exams | With listening |
|---|---|---|
| N1 | 28 | 22 |
| N2 | 26 | 23 |
| N3 | 28 | 25 |
| N4 | 2 | 1 |

## Where newer papers can and cannot come from

This was researched properly, including YouTube. The findings:

**The organisers publish nothing.** JEES and the Japan Foundation
[state](https://info.jees-jlpt.jp/faq/test_papers.html) that they offer only
sample questions and two *公式問題集* practice workbooks (2012, 2018) per
level. Papers are withheld so questions can be reused, and no official answer
key has ever been released for any sitting.

**Community sites publish answer keys, not questions.** After the 5 July 2026
sitting, several sites posted reconstructed keys from test-takers' memory
([Sakura Academy](https://sakuraacademy.net/en/blog/jlpt-july-2026-answer-key-n5-n1-unofficial),
[PassJapanese](https://passjapanese.com/en/blog/jlpt-n2-july-2026-answers)).
They give option numbers only — PassJapanese says outright, *"we publish only
the option number, no exam text or passages"* — and label them unofficial and
possibly inaccurate. A key without questions cannot build an exam.

**YouTube has practice material, not papers.** Channels such as 日本語の森 post
large amounts of JLPT content, and much of it is titled "2026" — but that means
*for* the 2026 exam, not the 2026 paper. It is original material written by the
channel, delivered as audio and video with no extractable question text, and
weighted heavily toward listening. Videos titled "Exam Review July 2026" are
discussions of the sitting, not reproductions of it.

**The source this site's exams came from has stopped.** dethitiengnhat.com,
the origin of everything in `jlpt_n*_pages/`, now carries a notice that it
will no longer post official exam papers, citing copyright compliance with the
Japan Foundation.

**A full Wayback sweep found exactly one recoverable paper.** Across all five
levels and every sitting after December 2024 (July 2025, December 2025, July
2026, December 2026), the Internet Archive holds only six pages — all July
2025 — and five of them are the "exam is being updated" placeholder. The one
exception was N1 July 2025 *Từ Vựng, Ngữ pháp*, which is now imported as
`n1-2025-07` (44 questions, full answer key, no reading or listening).
Nothing exists for December 2025 or either 2026 sitting.

Finding it required one fix to the build: that snapshot uses a template with
no `totalQUestion` marker, so the parser now decides a page has content by
looking for question markup rather than trusting that counter.

**YouTube cannot supply questions.** Two independent blockers, both tested:
YouTube returns HTTP 200 with a zero-byte body for unauthenticated caption
requests, so no transcript is obtainable; and even a perfect transcript would
only give the spoken listening script — not the printed multiple-choice
options, not the answer key, and nothing at all for the vocabulary, grammar
and reading sections, which are printed rather than spoken. The channels
posting "JLPT 2026" material are publishing their own practice questions, not
reproductions of the exam.

### What that means for publishing this site

The 84 archived exams are reconstructions of copyrighted JLPT papers, and the
site that originally hosted them took them down at the Japan Foundation's
request. Running this privately for your own study is one thing; putting it
online publicly invites the same copyright problem that closed the source.
Worth taking advice on before promoting it.

## Adding your own exams

`data/exams-manual/*.json` holds hand-authored papers. The build validates
them, merges them into the library, and labels them **"Practice paper"**
rather than "Official past paper", so provenance is never misrepresented.

Minimal example — see `data/exams-manual/n5-practice-1.json` for a working one:

```json
{
  "id": "n5-practice-1",
  "level": "N5",
  "periodLabel": "Practice Test 1",
  "parts": [
    {
      "id": "vocabulary",
      "questions": [
        {
          "instruction": "問題1　＿＿＿の言葉はどう読みますか。",
          "prompt": "きょうは <u>水</u> をたくさん のみました。",
          "choices": ["みず", "みせ", "むし", "みち"],
          "answer": 1,
          "category": "vocabulary",
          "explanation": "水 (みず) means water."
        }
      ]
    }
  ]
}
```

Required per exam: `id` (lowercase, hyphens), `level` (N1–N5),
`periodLabel`, `parts`. Required per question: `prompt`, `choices` (2–4),
`answer` (1-based). Optional: `instruction` (shown once per 問題 block),
`passage` (pins beside its questions), `audio` (embed URL), `category`
(`vocabulary` / `grammar` / `reading` / `listening`), `points`,
`explanation`, `number`.

Then rebuild:

```bash
python3 tools/build_exams.py
```

Anything malformed is reported and skipped rather than silently breaking the
site — bad ids, out-of-range answers, unknown categories and missing fields
are all caught, with the file and question index named.

## Word meanings (N1, N2 and N3)

`tools/build_glossary.py` writes one file per paper into `data/glossary/`,
which the player fetches only for papers that have one. 83 of the 86 papers
have one; the two N4 papers and the single N5 paper do not, and there the word
buttons simply do not appear.

### Sources

| Data | Used for | Licence |
|---|---|---|
| [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) | readings, English glosses, part of speech, common flag | CC BY-SA 4.0 |
| [jlpt-vocab-api](https://github.com/wkei/jlpt-vocab-api) | word → JLPT level (8,385 words) | see repo |
| [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) | second, independent set of level lists | see repo |

`tools/fetch_dicts.py` downloads all three into `data/dict/` (build inputs
only, never served) and prunes JMdict from ~118 MB to ~58 MB by dropping the
per-sense arrays that are empty for most entries.

Both level lists are merged, keeping the **easiest** level any of them claims
for a word. This matters: on its own the first source files 見る at N3 only,
which would have the glossary explaining "to see" on an N3 paper.

### Which words get a meaning

Segmentation is done by [janome](https://github.com/mocobeta/janome)
(`pip3 install janome`), which gives the dictionary form and the reading of
each token. A word is kept only if all of the following hold:

- it is a content word — noun, verb, adjective, adverb, conjunction; particles,
  auxiliaries, pronouns, numbers, proper nouns and suffixes are dropped;
- **it is written with kanji** — those are kept unconditionally, at every
  level. The kanji is itself the difficulty: a reader who cannot read 横
  cannot look it up either, so filtering by level would leave exactly the
  words that stop someone mid-sentence unexplained. This is why 横 (N5),
  仕事 (N5) and 最初 (N4) are glossed on an N3 paper.

- for a word written **only in kana**, where nothing has to be deciphered
  before it can be recognised, its own level decides — and not relative to the
  paper: an N2 candidate who meets a half-forgotten N3 word wants the meaning
  just as much as an N3 candidate does, so the same rule runs on both papers.

  | Kana word | Kept? |
  |---|---|
  | N1, N2, N3 | always |
  | in no level list | always: absent from 8,900 study words means rare, not trivial |
  | N4 | only when the dictionary does not mark it a common word |
  | N5 | never |

  The other candidate signal for a hard N4 word — the two level lists
  disagreeing, one filing it at N3 or above — was measured and **rejected**.
  The lists disagree so often that it let through 運動, 間, 途中, 上がる and
  怒る: exactly the everyday N4 vocabulary the rule exists to skip. Of the
  six variants tried, "not marked common" was the only one with no leaks;
- it is not in the small stop list of grammatical scaffolding (する, こと, よう,
  and the auxiliaries しまう, おく, みる, くれる … that a tokenizer sometimes
  tags as independent verbs).

Three filters exist purely to keep invented words out of the glossary, because
a wrong option on a vocabulary paper is often not a word at all:

- **Split compounds.** 申講 is not a word; the tokenizer breaks it into 申 and
  講, and JMdict will happily explain 申 as "the Monkey (ninth sign of the
  Chinese zodiac)" — a word that appears nowhere on the paper. A single kanji
  adjacent to another single kanji is therefore dropped. A lone kanji between
  kana (the 横 of 横において) is kept.
- **Kana fragments.** さいしゅう splits into いしゅう, "a different religion or
  sect". An all-kana token that has neither a JLPT level nor a common JMdict
  headword is dropped.
- **Spelling variants.** In 問題1 every option is a reading of one underlined
  word and in 問題2 every option is a kanji spelling of it. Those options are
  still read — a wrong answer is often a real word worth knowing — but under a
  stricter rule: the option must be **a single word, inflection included**, or
  nothing is taken from it. The tokenizer is what gives it away:

  ```
  けって     -> けっ(verb) + て(particle)      one word      -> ける
  さいしゅう  -> さ(adverb) + いしゅう(noun)     not a word    -> nothing
  申講       -> 申(noun) + 講(noun)           not a word    -> nothing
  ```

  いしゅう is a real entry ("a different religion or sect") and 申 is a real
  word ("the Monkey, ninth sign of the Chinese zodiac"), but neither is on the
  paper: they are debris from splitting a wrong answer that was never a word.
  Requiring the content word to start at the beginning and stand alone keeps
  the genuine distractors — けって → ける, ぼうちょう → 傍聴 — and drops the rest.
  Detected from the instruction (読み方 / 漢字で書く).

### Reading and meaning

The tokenizer's reading picks which dictionary entry applies, which is what
separates 文 as ぶん ("sentence", in 説明文) from 文 as ふみ ("letter"), the
entry JMdict ranks first. For an inflected word the tokenizer's reading is a
prefix of the dictionary reading (つづけ for つづける), so an exact match is
tried first, then a prefix match either way, and only then the highest-ranked
entry.

Furigana is aligned to the kanji rather than stretched over the whole word:
割る becomes 割(わ)る, not 割る(わる). Words whose reading cannot be aligned fall
back to a whole-word ruby, and kana-only words get no reading at all — they are
already their own reading.

Up to three meanings are shown: the first sense in full, then the leading gloss
of each later sense until full. Sense one alone is often too thin — JMdict lists
割る sense 1 as just "to divide", while the meaning on the N3 July 2024 paper
("broke it") is sense 3 — but every gloss of every sense buries the word in
near-synonyms.

### Known limits

- The level lists are third-party and imperfect. They put チーズ at N3, so
  "cheese" is glossed on an N3 paper. Nothing in the data distinguishes an easy
  loanword from a hard one; string similarity between katakana and English was
  tried and abandoned, because it kept チーズ and dropped エネルギー.
- Sense selection has no sentence context, only the reading. A word used in an
  uncommon sense may be glossed with its common one.
- Meanings are English only. Translating them would mean machine-translating
  20,000 glosses with no way to check them, which is worse than not offering it.

### Rebuilding

```bash
pip3 install janome
python3 tools/fetch_dicts.py       # once, ~59 MB into data/dict/
python3 tools/build_glossary.py    # ~45 seconds for 83 papers
```

Current output: 83 papers, **95,032 word entries**, 14.6 MB, split
N3 29,700 / N5 16,943 / unlisted 16,270 / N4 13,512 / N1 10,868 / N2 7,739.
The N5 and N4 entries are all kanji words; no kana word below N4 is included.

Opening every panel renders ~1,500 rows on an N3 paper, ~2,300 on an N2 and
~2,550 on an N1. That was measured rather than assumed: the open-all button
takes 1 ms and jumping to a question 5 ms, so the full glossary costs nothing
noticeable.

Change `LEVELS` at the top of `tools/build_glossary.py` to cover other levels.
Nothing else needs editing: the exam library reads
`data/glossary/index.json` to decide which papers to tag.

## Listening audio

Every recording is a Google Drive file. The archived pages embed it as an
iframe pointing at a **Wayback-wrapped copy of the Drive preview page**, and
that is why listening appeared broken for so long: the archived copy has no
media element in it at all. Compared side by side in a browser:

| iframe source | media elements inside |
|---|---|
| `web.archive.org/.../drive.google.com/file/d/<id>/preview` | 0 |
| `drive.google.com/file/d/<id>/preview` | 1 |

So the player is restored by rewriting the source to the live preview URL.
`audioURL()` in `assets/js/exam-player.js` does that, keeping the archived URL
in the data as provenance.

### Why not a native `<audio>` element

It would be better — real seeking, playback speed, no third-party frame — and
Drive does serve the bytes directly:

```
GET https://drive.google.com/uc?export=download&id=<id>
200  audio/mpeg  3,277,548 bytes  accept-ranges: bytes  access-control-allow-origin: *
```

But it cannot be used from a page. The response also carries:

```
content-disposition: attachment; filename="201212N1-3.mp3"
x-content-type-options: nosniff
```

which makes Chrome refuse it as an opaque response: `net::ERR_BLOCKED_BY_ORB`.
Setting `crossorigin="anonymous"` to switch to CORS mode does not help either
— that fails with `net::ERR_FAILED`. Both were tested against the mp3 and the
m4a files, with codec support confirmed (`canPlayType` returns "probably" for
both), so this is not a codec problem. The iframe is the only route Drive
supports.

### Availability

All 235 distinct recordings were requested on 2026-09-01:

| Result | Count |
|---|---|
| `206 audio/mp4` | 134 |
| `206 audio/mpeg` | 100 |
| `404` | 1 |

The single failure is `11By1tRFPR2xu3sAqdCC6gCG-uMWmRtzx`, which is the entire
listening section of **n2-2013-12**. It is listed in `DEAD_AUDIO_IDS` in the
player, which shows a note in place of the player. To re-check the whole set
later, request `https://drive.google.com/uc?export=download&id=<id>` for each
distinct audio id and look for a non-audio content type.

Because a cross-origin iframe fires no `error` event, a failure cannot be
detected from the page. Every working listening section therefore carries a
collapsed **"Not playing?"** line offering an alternative, rather than waiting
for a failure the page will never be told about.

## The home page notice

`renderNotice()` in `assets/js/site.js` builds the panel from
`data/exams/index.json` and `data/glossary/index.json` at load time. Nothing
about coverage is written by hand, so the panel cannot fall out of step with
the data: papers per level, how many include listening, and which levels have
word meanings. A level with no papers renders one row saying so instead of
zeroes.

The one hand-maintained fact is `DEAD_AUDIO` — the paper whose recording is
gone. If that ever changes, update it in `assets/js/site.js` and
`DEAD_AUDIO_IDS` in `assets/js/exam-player.js`.

### The listening-help link

`LISTENING_APP` at the top of `assets/js/exam-player.js`, and the same two
links in `renderNotice()`, point at an app for listening practice when a
recording will not play. **This is a placeholder chosen for you.** A search
for a JLPT listening app called "Jasper" found nothing under that name; the
link currently goes to Japanese Listening JSempai, which does exist on both
stores. Change it in those two places if you meant a different app.
