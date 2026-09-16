# JLPT Practice

A JLPT study site for learners in Japan, built around **207 papers
(20,346 questions)** from N1–N5 that are played as timed, auto-scored exams:
89 archived sittings, and 118 written for this site in the same format.

Every paper carries furigana on a toggle, a meaning for every word in it, and
a script for every listening question — 199 of the 207 can be sat end to end,
sound and all. See **Advertising copy** at the foot of this file for the short
version.

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
| `exams.html` | Library of all 207 papers, filter by level, search by year |
| `exam.html?id=n2-2023-12` | The exam player |
| `stats.html` | Progress and accuracy per level |
| `about.html` | About the project |

## Layout

```
assets/css/styles.css        shared design tokens and site chrome
assets/css/exam.css          exam player + exam library
assets/js/i18n.js            translation engine (data-i18n, t(), no reload)
assets/js/i18n-strings.js    449 UI strings x 12 languages
assets/js/site.js            levels, practice page, progress store
assets/js/exam-player.js     the exam: setup, one-page paper, marking
assets/js/exams-browser.js   exam library listing
assets/js/stats.js           statistics page

data/exams/index.json        catalogue of every built exam
data/exams/<id>.json         one exam (questions, keys, explanations)
data/glossary/<id>.json      word meanings for one paper (N1, N2, N3)
data/furigana/<id>.json      the reading of every kanji word in one paper
data/dict/                   dictionary build inputs, never served
tools/build_exams.py         rebuilds data/exams from the archived sources
tools/fetch_dicts.py         downloads JMdict and the JLPT level lists
tools/build_glossary.py      rebuilds data/glossary
tools/build_furigana.py      rebuilds data/furigana

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

N4 and N5 had two papers each. N5 has **18** now and N4 has **27**, and N1,
N2 and N3 have **25 original papers apiece** on top of what the archive holds.
**118 papers in all** are composed rather than typed out: the questions live in
item banks under `data/practice-bank/`, and `tools/build_practice_papers.py`
deals them into papers of the published shape — 67 questions at N5, 93 at N4,
102 at N3, 107 at N2 and 107 at N1, across all three booklets.

Every listening question on a composed paper carries its own script, so all of
it is spoken by the device. That is the point of writing them: the archive lost
eight 聴解 booklets and no amount of searching brings them back, but a paper we
write ourselves is never missing its audio.

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

Eight papers have a gap that will not be filled:

| Papers | Gap | Why it stays |
|---|---|---|
| 6 N1 sittings, 1 N3 | no 聴解 booklet | The booklet was never archived. Writing one would put invented questions inside a paper labelled as a real sitting, which is the one thing this must not do. |
| n1-2018-12 | 3 of 4 聴解 sections silent | Archived with neither a recording nor a transcript, so there is nothing to play and nothing to speak. |
| n4-practice-1 | no 聴解 | Scraped from someone else's practice set, and its listening page was never archived either. |

The answer to those seven silent booklets is not to invent them. It is that
N1, N2 and N3 each now have 25 papers of our own, every question of which is
spoken — see **The papers written for this site** above.

n4-practice-1 used to be listed here as missing its 読解 as well. It was not:
the source page declares every question in its second booklet as 文法,
including 問題4, 5 and 6, which are 短文, 中文 and 情報検索. The paper read
correctly, because the player groups by instruction, but the index counts
categories, so the library said there was no reading section and choosing
Reading in the setup screen skipped ten questions that were sitting right
there. `split_grammar_reading()` in `tools/build_exams.py` now catches that
one case, and only that case.

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

**Every paper carries a glossary**, N1 to N5 — 18,201 different words. Every
question, reading passage and listening transcript has a **Word meanings**
button, and one button
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

**On a listening question that is all of it**, with every filter off: the four
options, the options recovered from the transcript on the questions whose paper
printed none, and the whole transcript. A reading passage is on the page to be
read again and keeps the level filter below, or the list buries the one word
that stopped you; a transcript is the only place the spoken words can be seen
at all, and the ones worth naming there are exactly the ordinary words that
went past too fast. It costs about 7% more words on a paper and buys ten more
of them on every listening question.

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

## Furigana

The papers print none — not one `<ruby>` in 20,346 questions — because the
real N1, N2 and N3 papers print none either. Reading 遂行 unaided is part of
what is being tested.

That is the right call for sitting a paper and the wrong one for learning from
it: a word you cannot read is a word you cannot look up, because you do not
know how it sounds. So **Furigana** in the command bar draws the readings over
the paper's own text, and remembers the choice. Off by default — a paper with
furigana is an easier paper, and that has to be the reader's decision.

Two things it deliberately will not do:

- **問題1 and 問題2 of the vocabulary booklet keep their readings back** until
  the question is marked. Those ask how a word is read and how it is written;
  furigana over the stem is the answer printed above the question. In study
  mode the hold lifts on that question the moment it is answered.
- **A word read two ways is still left bare, where nothing says which.** 人 is
  ひと alone and にん after a number, 中 is なか and ちゅう. The browser matches
  a word list against the text with no tokenizer of its own, so it would get
  those wrong — and wrong furigana is worse than none, because the reader
  cannot tell it is a guess and will learn it.

**The list holds the word with its kana neighbours** where the word alone
cannot be decided: 人が is ひとが, 中で is なかで, 来ます is きます and 来なく
is こなく. Longer keys are matched first, so the context wins wherever it is
listed — which is what a table keyed by surface could not do before, and is
most of the kanji on an N5 paper.

Only kana neighbours, never a second kanji word: gluing two kanji words
together and concatenating what the tokenizer said reads 二人 as ににん (the
word is ふたり) and 三百 as さんひゃく (さんびゃく). Rendaku and 熟字訓 happen
at exactly that seam, so nothing is joined across it. And a key carrying kana
only matches where its kanji edge stands alone — inside 三人が or 4人は it is
a fragment of a longer count, and is skipped.

Measured against the tokenizer, per-kanji, over 77,000 annotations on twenty
papers: **the readings shown are the tokenizer's in 99.69% of cases**, and the
contextual keys added 406 correct readings against 9 wrong ones. Ruby drawn on
a paper: N5 170 → 193, N4 614 → 659.

```bash
pip3 install janome              # the same tokenizer the glossary uses
python3 tools/build_furigana.py  # ~95s, writes data/furigana/<exam-id>.json
```

6.2 MB in all, one file per paper, fetched only when a reader turns furigana
on.

## Listening

**199 of the 207 papers can be listened to end to end**, and every one of the
954 listening sections in them, by two different routes. The other eight have
no 聴解 booklet in the archive at all.

The archived sittings that kept their recordings embed them from Google
Drive, which needs a connection. Everything else is spoken by the voice
already installed on the device reading the page — the 118 papers written for
this site, which have no recording and never will, and the 28 questions on the
one archived paper whose sound file has since died. Those carry a transcript, the site already prints it, and reading text
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

### The script, and the questions that were never printed

**Every listening question carries its script**, on every paper, behind a fold
that stays shut until it is asked for. It used to appear only where the
recording would not play, on the reasoning that a script beside an unanswered
question is an invitation to read instead of listen — which is true, and is
the reader's decision rather than the page's. Reading along with a recording is
how a great deal of listening is learned, and a script that only unlocks after
marking cannot be used that way at all.

The script is printed as a script: one line per turn, the speaker held out to
the left, and without the source site's own Vietnamese label (*Tham khảo:*)
that used to head every one of them.

**1,468 listening questions print no options at all.** That is not damage —
問題3 and 問題4 print nothing on the question sheet by design, and the four
choices are read out at the end of the recording. Marked, the paper therefore
said "the answer was 3" against four blank buttons, with no way to find out
what 3 had been without scrubbing back through the audio.

They are in the transcript, because the transcript is of a recording that reads
them out. `tools/build_exams.py` lifts them back out of it — **1,368 of the
1,436 that have a transcript**, with the question that was asked — and the
player shows them once the question is marked, the right one marked and the one
that was picked beside it. Before marking the buttons stay blank, because blank
is the exercise.

### Which player follows you down the paper

One recording covers a whole 問題 — six questions in sequence — and on 28
papers a single file covers the entire sitting, so the player has to stay in
reach while you work through it. Once you scroll past it, it leaves the page
and **docks under the command bar**, at the same width as the questions, and
drops back into place when you scroll up to it. It is the same element
throughout, never a copy: moving the iframe or rebuilding it reloads the player
and restarts the recording from zero.

Where it docks is **measured from the command bar**, not added up from the
heights of the things above it. The stylesheet used to place it at the site
header's height plus the command bar's, which is the same number only while the
header is sticky — and on a phone it is not: it scrolls away and the command
bar sticks to the top of the window on its own. So on a phone the player was
docking 109px too low, floating in the middle of the questions. `floatSync()`
now publishes the bar's own bottom edge as `--dock-h` on every scroll.

It follows you from the start, with nothing pressed. It used to wait until it
was playing — a Play button that trails you down the page is clutter — but on a
listening paper the Play button is the thing you are reaching for, and scrolling
back to the head of the 問題 to find it is the greater clutter.

Only ever one at a time, and it is **the paper's own recording**. A whole-test
file follows you the length of the listening paper; a per-問題 file follows you
through its own 問題 and then hands over. Which 問題 you are on is decided at
the middle of the screen rather than at its top edge, so 問題1's recording lets
go as 問題2 arrives instead of hanging on until the last pixel of its section
has gone.

The YouTube upload is a stand-in for the sittings whose audio the archive never
got, so it floats **only on the papers where it is the only audio there is** —
there it is the listening section's player and is pinned like one. Where the
paper has a recording of its own, the upload stays where it is drawn, at the
head of the listening test, as a single row with a Play button.

**The site is allowed to frame its own pages.** `frame-src` in `vercel.json`
names the Drive and YouTube hosts the player needs — and naming it at all
replaces what `default-src 'self'` had been providing, so for a while an
`<iframe>` pointing at one of the site's own pages was refused by the site's
own policy, with Chrome's "This content is blocked" in place of the page. It
lists `'self'` first now.

### Why the recording is an iframe and not an `<audio>` element

Because Google will not allow anything else. The file is real audio and can be
addressed directly —

```
https://drive.usercontent.google.com/download?id=<id>&export=download
→ 200, content-type: audio/mp4, accept-ranges: bytes,
  access-control-allow-origin: *
```

— and a browser still refuses it, because the same response carries
**`cross-origin-resource-policy: same-site`**. CORP is checked before CORS
helps: the bytes may not be embedded by another site at all, and a native
player reports it as `MEDIA_ELEMENT_ERROR: Format error`. The iframe is
Google's supported way to embed a Drive file, so it is the only way to play
one of these recordings on this page, and playback speed and keyboard seeking
are Drive's to offer rather than ours.

When a recording stalls, nothing is reported back to the page — the frame is
Google's. So "Not playing?" now also names the full recording at the top of
the section on the 33 papers that have one.

**The window onto Drive's player does not crop it.** It used to be 60px onto a
76px frame, cutting away what had been measured as an empty bottom quarter —
and a player drawn to fit 76px does not survive being shown through 60 of them,
which is why the round play button arrived with its top sliced off.

There is one box now, and the iframe fills it, so nothing can be cropped by
the thing it was drawn to fit.

**Which player Drive draws is not ours to know.** Signed out it is a compact
control strip — round play button, scrubber, time, volume. Signed in to a
Google account it is a waveform display. The frame is cross-origin; nothing on
this side can ask which one arrived, and both want about the same room: 76px.

Which is more room than a strip of chrome should take on a bar that docks at
the top of the screen. So the frame is laid out at the 76px a whole player
needs, and then scaled down to **68px** — smaller bar, nothing cut off. A
shorter frame would have cropped: 76px of player through a 68px window is 8px
of missing controls, which is the bug this section opens with. Scaling takes
nothing away, and there is no size button any more: one height, always the
small one.

The player is then **pushed down 8px**, because Drive does not centre its own
controls: it keeps about 17px of empty page below them, so the play button, the
scrubber and the time sit 8px above the middle of whatever box they are given.
Measured at 68, 76 and 140px — it is a fixed strip, not a proportion. The 8px
of frame that uncovers at the top is painted `#1e1e1e`, sampled from Drive's own
page, so the join cannot be seen.

**Nothing of Google's is fetched until the recording is asked for.** Drawn at
render time, one frame per 問題 meant five Google pages loading at once on a
paper with a recording each, and what a reader saw while they arrived was five
black rectangles — the black being Drive's own player, seen through a window
into someone else's page. So the frame is created by the click that asks for
it, which is also a user gesture, so pressing it plays rather than loading a
second play button. Until the frame reports itself loaded, the box says
"Starting the player…" rather than sitting there black.

What stands in the frame's place is **the same box the player arrives in** —
68px, `#1e1e1e`, a white play arrow and "Play the recording". It was a white
panel with a small button in it, which read as an empty gap in the bar and then
swapped itself for something black: two things to look at where there is only
one control.

Pressing it still costs a wait, and most of that wait is Google's page loading,
which is not ours to shorten. The part that is: a cold press also pays for a
DNS lookup, a TCP connection and a TLS handshake to a host the browser has
never spoken to. `warmDrive()` opens those with `rel="preconnect"` as the
listening section is drawn, so they are paid while the reader is still on the
instructions — about 100–150ms on a desktop connection, and more on a phone,
where a handshake is round trips rather than milliseconds.

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
posting: `tools/build_static.py` prints the paper and question counts,
`build_glossary.py` and `build_furigana.py` print theirs.

### For a Facebook or community group

Free JLPT practice — full mock papers, N5 to N1

No sign-up. No ads. Nothing to pay. Open it and start.

📝 207 mock papers, 20,346 questions — N5 through N1, in the real JLPT format
🎧 199 of them can be listened to end to end — the original recording where it survives, read aloud by your device where it does not
📖 Every listening question has its script on the page, to read after you have tried to hear it — 6,002 of them
🔤 Furigana over the whole paper at one tap — every question, every option, every passage, every script. Off until you want it
📚 Word meanings on every paper: 18,201 words with the reading, the JLPT level and a short meaning — the question, the options, and every word of the listening
⏱️ Timed and marked automatically, section by section — so you can see which section is weakest, which is what actually decides a pass
🌏 12 languages — English, नेपाली, Tiếng Việt, Filipino, Bahasa Indonesia, 中文, 한국어, हिन्दी, বাংলা, සිංහල, Português, 日本語
🇳🇵 N5 and N4 word meanings in Nepali — 1,473 words
🗂️ 9,638 vocabulary items, 2,211 kanji with stroke order, 280 grammar points
🙈 Cover the answers on any list and test yourself, tap a row to check
📱 Phone or computer. Installs like an app and works offline
🔒 Your scores stay on your own device. Nothing is uploaded

👉 https://nihongomock.com

### Shorter — for a comment or reply

Free JLPT practice site — 207 full mock papers N5–N1, timed and auto-marked, 199 of them with listening you can hear end to end and read the script of afterwards. Furigana over the whole paper at one tap, and every word comes with its reading and meaning. 12 languages including Nepali. No sign-up, no ads, nothing to pay.
https://nihongomock.com

### One line — for X, Threads, a chat group

207 free JLPT mock papers, N5 to N1 — timed, auto-marked, listening included with the script. Furigana and word meanings on every line. No sign-up, no ads.
https://nihongomock.com

### If the group has seen it before

A repost with no news reads as spam, so lead with what changed:

New on the free JLPT practice site: **furigana over the whole paper**, on a button — every question, every option, every reading passage, every listening script, 205,686 readings built word by word. **Every listening question now shows its script**, so you can hear it, guess, and then read exactly what was said. The word meanings cover the listening too, including the 1,368 questions whose four options were never printed on the paper — they are recovered from the recording and shown. And the audio player follows you down the page instead of being left at the top of the section.
https://nihongomock.com

### For a listening-focused post

Listening is the section most people lose the pass on, and the hardest to practise alone.

🎧 199 papers you can sit end to end — 954 listening sections
📖 Every question's script on the page: hear it, answer it, then read what was actually said
🗣️ Where the recording is lost, your device reads the script aloud — works offline
🔤 Furigana over the script, and a meaning for every word in it
🖼️ 1,368 questions whose options were only read out, never printed, recovered from the recording and shown
▶️ The player stays with you as you scroll, and hands over from 問題 to 問題

👉 https://nihongomock.com

### Nepali

नि:शुल्क JLPT अभ्यास — N5 देखि N1 सम्म

दर्ता गर्नु पर्दैन। विज्ञापन छैन। पैसा तिर्नु पर्दैन।

📝 २०७ अभ्यास प्रश्नपत्र, २०,३४६ प्रश्न — वास्तविक JLPT ढाँचामा
🎧 १९९ प्रश्नपत्रको सुनाइ पूरै सुन्न मिल्ने — रेकर्डिङ नभएको ठाउँमा तपाईंकै यन्त्रले पढेर सुनाउँछ
📖 हरेक श्रवण प्रश्नको स्क्रिप्ट पृष्ठमै — सुनेपछि के भनिएको थियो पढ्न सकिन्छ
🔤 एक थिचाइमै पूरै प्रश्नपत्रमा फुरिगाना — प्रश्न, विकल्प, पठन र स्क्रिप्ट सबैमा
📚 हरेक प्रश्नको हरेक शब्दको उच्चारण र अर्थ — १८,२०१ शब्द
⏱️ समय गणना र स्वतः अङ्क — कुन सेक्सन कमजोर छ देखाउँछ
🇳🇵 N5 र N4 का १,४७३ शब्दको अर्थ नेपालीमा
🗂️ ९,६३८ शब्द, २,२११ कान्जी (लेख्ने क्रम सहित), २८० व्याकरण
📱 मोबाइल र कम्प्युटर दुवैमा; इन्टरनेट बिना पनि चल्छ
🔒 तपाईंको अङ्क तपाईंकै यन्त्रमा रहन्छ

👉 https://nihongomock.com
