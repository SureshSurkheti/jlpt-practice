#!/usr/bin/env python3
"""
Build the per-level kanji lists from KANJIDIC-derived data, plus the stroke
paths that drive the writing animation.

Two files come out per level, because they are wanted at different moments:

  data/kanji/<level>.json          the list - character, stroke count,
                                   readings, meanings and example words. Small
                                   enough to render into the page.
  data/kanji/strokes/<level>.json  one array of SVG path strings per kanji.
                                   Only fetched when somebody actually opens a
                                   character to see how it is written, because
                                   N1 alone is well over a megabyte of curves.

Example words are taken from this site's own vocabulary lists rather than from
a third source: a learner meeting 日 on the N5 page is shown N5 words that use
it, and the Nepali gloss comes along where we have one.

Sources (both CC BY-SA, credited on the about page):
  kanji.json  https://github.com/davidluzgouveia/kanji-data - KANJIDIC2 by the
              Electronic Dictionary Research and Development Group, with the
              modern N1-N5 level split.
  KanjiVG     http://kanjivg.tagaini.net - stroke order by Ulrich Apel.

Run:  python3 tools/build_kanji.py
"""

import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache")
LEVELS = {5: "n5", 4: "n4", 3: "n3", 2: "n2", 1: "n1"}
MAX_EXAMPLES = 3


def katakana(text):
    """On'yomi is conventionally written in katakana. The source stores it in
    hiragana, and the two scripts are one fixed offset apart."""
    out = []
    for ch in text:
        code = ord(ch)
        out.append(chr(code + 0x60) if 0x3041 <= code <= 0x3096 else ch)
    return "".join(out)


def load_words():
    """Every word we hold, indexed by the kanji it contains, so each character
    can show real vocabulary from this site's own lists."""
    by_kanji = {}
    for level in ("n5", "n4", "n3", "n2", "n1"):
        path = os.path.join(ROOT, "data", "words", level + ".json")
        if not os.path.exists(path):
            continue
        for rank, row in enumerate(
                json.load(io.open(path, encoding="utf-8"))["words"]):
            word = row.get("w") or ""
            for ch in set(word):
                if 0x4E00 <= ord(ch) <= 0x9FFF:
                    by_kanji.setdefault(ch, []).append((level, rank, row))
    return by_kanji


def examples_for(char, by_kanji, level):
    """Prefer a word from the level being studied, then anything easier, then
    the rest - a beginner should not meet 日 through an N1 compound."""
    order = ["n5", "n4", "n3", "n2", "n1"]
    here = order.index(level)
    ranked = sorted(
        by_kanji.get(char, []),
        key=lambda item: (0 if item[0] == level else 1,
                          abs(order.index(item[0]) - here), item[1]))
    out = []
    seen = set()
    for _lv, _rank, row in ranked:
        word = row.get("w")
        if not word or word in seen:
            continue
        seen.add(word)
        entry = {"w": word, "r": row.get("r", ""), "en": row.get("en", "")}
        if row.get("ne"):
            entry["ne"] = row["ne"]
        out.append(entry)
        if len(out) >= MAX_EXAMPLES:
            break
    return out


def stroke_paths(char):
    """KanjiVG names each file after the codepoint, and each stroke is one
    <path>. Only the d attribute is kept: the rest of the file is grouping and
    radical metadata this site does not draw."""
    name = "%05x.svg" % ord(char)
    path = os.path.join(CACHE, "kvg", "kanji", name)
    if not os.path.exists(path):
        return []
    svg = io.open(path, encoding="utf-8").read()
    return re.findall(r'<path[^>]*\sd="([^"]+)"', svg)


def main():
    src = os.path.join(CACHE, "kanji.json")
    if not os.path.exists(src):
        sys.exit("missing %s - see the header of this file for the source" % src)

    data = json.load(io.open(src, encoding="utf-8"))
    by_kanji = load_words()

    os.makedirs(os.path.join(ROOT, "data", "kanji", "strokes"), exist_ok=True)

    buckets = {name: [] for name in LEVELS.values()}
    for char, info in data.items():
        level_no = info.get("jlpt_new")
        if level_no not in LEVELS:
            continue
        buckets[LEVELS[level_no]].append((char, info))

    total, drawn = 0, 0
    for level, items in buckets.items():
        # Commonest first: frequency rank from newspaper counts, then the
        # simpler character where a rank is missing.
        items.sort(key=lambda pair: (pair[1].get("freq") or 99999,
                                     pair[1].get("strokes") or 99))

        rows, strokes = [], {}
        for char, info in items:
            paths = stroke_paths(char)
            if paths:
                strokes[char] = paths
                drawn += 1
            rows.append({
                "k": char,
                "s": info.get("strokes") or len(paths),
                "on": [katakana(r) for r in (info.get("readings_on") or [])][:4],
                "kun": (info.get("readings_kun") or [])[:4],
                "en": (info.get("meanings") or [])[:4],
                "ex": examples_for(char, by_kanji, level),
            })

        io.open(os.path.join(ROOT, "data", "kanji", level + ".json"),
                "w", encoding="utf-8").write(
            json.dumps({"level": level.upper(), "kanji": rows},
                       ensure_ascii=False, separators=(",", ":")))
        io.open(os.path.join(ROOT, "data", "kanji", "strokes", level + ".json"),
                "w", encoding="utf-8").write(
            json.dumps(strokes, ensure_ascii=False, separators=(",", ":")))

        total += len(rows)
        with_ex = sum(1 for r in rows if r["ex"])
        print("%s: %4d kanji, %4d with example words, %4d with stroke order"
              % (level.upper(), len(rows), with_ex,
                 sum(1 for r in rows if r["k"] in strokes)))

    print("total %d kanji, %d with stroke order" % (total, drawn))


if __name__ == "__main__":
    main()
