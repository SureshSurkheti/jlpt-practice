#!/usr/bin/env python3
"""
Build per-exam furigana tables for the JLPT papers.

Not one of the 8,127 questions in `data/exams/` carries a single <ruby> tag.
That is not an oversight in the extraction - the archived pages have no ruby
either, because the real N1, N2 and N3 papers print none. A candidate at those
levels is expected to read 遂行 unaided, and the exam is partly a test of
whether they can.

Which is exactly the problem when the paper is being used to *learn* from. A
reader who cannot read 遂行 cannot look it up either - they do not know how it
sounds - and the question stops being a question about Japanese and becomes a
wall. The glossary answers this for the words it lists, but it lists words, in
a panel, in dictionary form: it does not tell you how to read the sentence in
front of you, and it cannot, because 見て is not 見る.

So every Japanese word in every paper is read here, once, and stored as the
reading it has in that paper. The player then draws furigana over the text
itself, on a toggle, and the reader decides.

    見て          ->  見[み]て
    食べ物        ->  食[た]べ物[もの]
    今日          ->  今日[きょう]

One line per word, kanji only. The bracket form is what the alignment came to
at build time - see ruby_segments() in build_glossary.py, which this borrows -
so the browser parses rather than aligns, and the two never disagree.

Why a word list and not ready-made <ruby> markup: the markup would have to be
stored per field of per question, it would carry the tags of the question with
it, and it would triple the size of the exam data. The words of a paper repeat
- 4,000 tokens across a paper are around 1,500 distinct ones - so the table is
about a quarter the size, and the player already fetches a per-paper file of
this kind for the glossary.

Ambiguity is the price. 今日 is きょう here and こんにち somewhere else, and a
table keyed by surface can hold only one of them. Where a paper reads the same
surface two different ways, the more common reading wins and the other is
counted in the build report; on the whole corpus that is 0.3% of entries.

Requires the janome tokenizer:
    pip3 install janome

Run from the project root, after build_exams.py:
    python3 tools/build_furigana.py [exam-id ...]

Writes data/furigana/<exam-id>.json, one file per paper, fetched by the exam
player only when the reader turns furigana on.
"""

import collections
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

from build_glossary import (  # noqa: E402  - same directory, same data
    ruby_segments,
    strip_html,
    to_hiragana,
    has_kanji,
)

EXAM_DIR = os.path.join(ROOT, "data", "exams")
OUT_DIR = os.path.join(ROOT, "data", "furigana")

KANJI_ONLY = re.compile(r"^[一-鿿々]+$")


def annotate(surface, reading):
    """The stored form: text with its reading in brackets over the kanji.

    Returns None when there is nothing to draw - no kanji, no reading, or a
    reading that is simply the word again (katakana words come back from the
    tokenizer as their own reading).
    """
    if not surface or not reading or not has_kanji(surface):
        return None
    reading = to_hiragana(reading)
    if reading == to_hiragana(surface):
        return None

    segments = ruby_segments(surface, reading)
    if segments is None:
        # Irregular: 今日 -> きょう cannot be split, so the whole word takes
        # one reading. 大人, 明日, 一人 and the rest of the 熟字訓 land here.
        #
        # Only if the word is kanji all through, though. The browser finds
        # the base of a reading by taking the kanji run in front of the
        # bracket, which is what keeps the stored form free of separators -
        # お金[かね] is unambiguous because お is not kanji and 金 is. A word
        # that mixes the two and could not be aligned has no such landmark,
        # so it is left bare rather than annotated in a way that can be read
        # two ways.
        if not KANJI_ONLY.match(surface):
            return None
        return "%s[%s]" % (surface, reading)

    out = []
    for text, read in segments:
        out.append("%s[%s]" % (text, read) if read else text)
    return "".join(out)


def texts_of(exam):
    """Every string in a paper that is read rather than looked at.

    Instructions included: 問題4では、問題用紙に何も印刷されていません is the
    first Japanese on a listening paper and no easier than the questions.
    """
    for part in exam.get("parts", []):
        for q in part.get("questions", []):
            for field in ("prompt", "passage", "instruction", "explanation"):
                if q.get(field):
                    yield q[field]
            for choice in q.get("choices") or []:
                if choice:
                    yield choice
            for line in q.get("script") or []:
                # [speaker, text]
                if isinstance(line, (list, tuple)) and len(line) > 1 and line[1]:
                    yield line[1]


def read_exam(exam, tokenizer):
    """surface -> Counter of the readings it is given in this paper."""
    readings = collections.defaultdict(collections.Counter)
    seen_text = set()

    for raw in texts_of(exam):
        text = strip_html(raw)
        if not has_kanji(text) or text in seen_text:
            continue
        seen_text.add(text)
        for token in tokenizer.tokenize(text):
            surface = token.surface
            if not has_kanji(surface):
                continue
            reading = token.reading
            if not reading or reading == "*":
                continue
            readings[surface][to_hiragana(reading)] += 1
    return readings


# How one-sided a word's readings have to be before one of them is printed
# over it.
#
# The browser matches this table against the text longest word first, with no
# tokenizer of its own, so a word that is read two ways is a word it will
# sometimes get wrong - and it is nearly always a single kanji. 人 is ひと on
# its own and にん after a number; 中 is なか and ちゅう; 何 is なに and なん.
# Checked against the tokenizer over 73,000 annotations, guessing put a wrong
# reading over 1.7% of them, and the fifteen worst offenders were all single
# characters of exactly this kind.
#
# A wrong reading is worse than none. Somebody reading furigana cannot tell
# that this one is the guess, and they will learn it. So a word whose commonest
# reading does not account for at least this much of its use in the corpus is
# left bare, and the reader is no worse off than with the paper as printed.
DOMINANT = 0.9


def usable(corpus):
    """The surfaces worth annotating, and the reading to use for each."""
    keep = {}
    dropped = []
    for surface, counts in corpus.items():
        total = sum(counts.values())
        reading, n = counts.most_common(1)[0]
        if len(counts) > 1 and n < DOMINANT * total:
            dropped.append(surface)
            continue
        keep[surface] = reading
    return keep, dropped


def main():
    try:
        from janome.tokenizer import Tokenizer
    except ImportError:
        sys.stderr.write("janome is needed: pip3 install janome\n")
        return 1

    wanted = set(sys.argv[1:])
    os.makedirs(OUT_DIR, exist_ok=True)
    tokenizer = Tokenizer(mmap=True)

    names = sorted(n for n in os.listdir(EXAM_DIR)
                   if n.endswith(".json") and n != "index.json")
    if wanted:
        names = [n for n in names if n[:-5] in wanted]

    # Read every paper first, then decide. Whether a word is safe to print a
    # reading over is a question about the language, not about one paper: 中
    # is read two ways whether or not both of them happen to occur in the
    # paper being written out, and a per-paper decision would annotate it in
    # the papers that use it once and leave it bare in the papers that use it
    # twice.
    papers = []
    corpus = collections.defaultdict(collections.Counter)
    for i, name in enumerate(names, 1):
        path = os.path.join(EXAM_DIR, name)
        exam = json.load(io.open(path, encoding="utf-8"))
        readings = read_exam(exam, tokenizer)
        papers.append((name, exam, readings))
        for surface, counts in readings.items():
            corpus[surface].update(counts)
        if i % 20 == 0 or i == len(names):
            sys.stdout.write("\r  reading %d/%d" % (i, len(names)))
            sys.stdout.flush()

    keep, dropped = usable(corpus)

    per_level = collections.Counter()
    total_words = 0
    for name, exam, readings in papers:
        table = {}
        for surface in readings:
            reading = keep.get(surface)
            if not reading:
                continue
            form = annotate(surface, reading)
            if form:
                table[surface] = form
        out = {"id": exam["id"], "level": exam.get("level"), "words": table}
        with io.open(os.path.join(OUT_DIR, name), "w", encoding="utf-8") as fh:
            json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
        per_level[exam.get("level")] += 1
        total_words += len(table)

    sys.stdout.write("\r%s\r" % (" " * 40))
    print("wrote %d furigana tables, %d word readings in all"
          % (len(papers), total_words))
    print("  by level: " + "  ".join("%s %d" % (lv, n)
                                     for lv, n in sorted(per_level.items())))
    print("  %d distinct words; %d left bare as ambiguous (%s%s)"
          % (len(corpus), len(dropped),
             ", ".join(sorted(dropped, key=len)[:8]),
             ", ..." if len(dropped) > 8 else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
