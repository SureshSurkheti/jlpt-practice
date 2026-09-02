#!/usr/bin/env python3
"""
Build the N5 and N4 study word lists.

Reads:  data/dict/jlpt-levels.json   the JLPT level lists
        data/dict/jmdict-eng.json    JMdict, to fill in missing meanings
Writes: data/words/n5.json
        data/words/n4.json

The level list arrives as two merged sources: one carries meanings and romaji,
the other is a fuller alphabetical list with furigana only. Most words appear
in both, so merging on the written form fills nearly every gap; whatever is
still bare afterwards is looked up in JMdict.

Run:  python3 tools/build_wordlists.py
"""

import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEVELS = os.path.join(ROOT, "data", "dict", "jlpt-levels.json")
JMDICT = os.path.join(ROOT, "data", "dict", "jmdict-eng.json")
OUT_DIR = os.path.join(ROOT, "data", "words")

KATA = re.compile(r"[ァ-ヶ]")
# Senses that are archaic or vulgar are noise in a beginner list.
SKIP_MISC = {"arch", "obs", "obsc", "rare", "vulg"}


def to_hira(text):
    return "".join(
        chr(ord(c) - 0x60) if KATA.match(c) else c for c in (text or ""))


def clean(text):
    """The source writes some readings as 'こしょう・する'; keep the word."""
    return (text or "").replace("・", "").strip()


def load_jmdict():
    """word/reading -> a few English glosses, best sense first."""
    with io.open(JMDICT, encoding="utf-8") as fh:
        data = json.load(fh)

    out = {}
    for entry in data["words"]:
        glosses = []
        for sense in entry["sense"]:
            if set(sense.get("misc", [])) & SKIP_MISC:
                continue
            glosses += [g["text"] for g in sense["gloss"] if g["lang"] == "eng"]
            if len(glosses) >= 3:
                break
        if not glosses:
            continue
        glosses = glosses[:3]

        keys = [k["text"] for k in entry.get("kanji", [])]
        keys += [k["text"] for k in entry.get("kana", [])]
        for key in keys:
            # First entry wins: JMdict lists the commonest spellings first.
            out.setdefault(key, glosses)
    return out


def lookup_keys(rec):
    """Every spelling worth trying in JMdict for one record.

    The list writes counters and suffixes with a wave dash (～円, お～) and
    gives alternate forms separated by a semicolon (いい; よい). Neither is a
    JMdict headword, but the pieces are.
    """
    seen, keys = set(), []

    def add(text):
        text = (text or "").strip()
        if text and text not in seen:
            seen.add(text)
            keys.append(text)

    for field in (rec["w"], rec["r"]):
        for part in re.split(r"[;；、,]", field or ""):
            part = part.strip()
            add(part)
            add(part.replace("～", "").replace("~", "").strip())
    return keys


def merge(rows):
    """One record per written word, taking the fullest value for each field."""
    merged = {}
    order = []
    for row in rows:
        word = (row.get("word") or "").strip()
        if not word:
            continue
        rec = merged.get(word)
        if rec is None:
            rec = merged[word] = {"w": word, "r": "", "romaji": "", "en": ""}
            order.append(word)
        if not rec["r"]:
            rec["r"] = clean(row.get("furigana"))
        if not rec["romaji"]:
            rec["romaji"] = clean(row.get("romaji"))
        if not rec["en"]:
            rec["en"] = (row.get("meaning") or "").strip()
    return [merged[w] for w in order]


def main():
    with io.open(LEVELS, encoding="utf-8") as fh:
        levels = json.load(fh)

    print("loading JMdict ...", flush=True)
    jm = load_jmdict()
    print("  %d headwords" % len(jm))

    os.makedirs(OUT_DIR, exist_ok=True)

    for num, name in ((5, "n5"), (4, "n4")):
        rows = merge([r for r in levels if r.get("level") == num])

        filled = 0
        for rec in rows:
            if rec["en"]:
                continue
            hit = None
            for key in lookup_keys(rec):
                hit = jm.get(key)
                if hit:
                    break
            if hit:
                rec["en"] = "; ".join(hit)
                filled += 1

        # A word with no reading is already kana; say so rather than leave a hole.
        for rec in rows:
            if not rec["r"]:
                rec["r"] = to_hira(rec["w"]) if KATA.search(rec["w"]) else rec["w"]
            rec.pop("romaji") if not rec["romaji"] else None

        bare = [r for r in rows if not r["en"]]
        rows = [r for r in rows if r["en"]]

        path = os.path.join(OUT_DIR, name + ".json")
        with io.open(path, "w", encoding="utf-8") as fh:
            json.dump({"level": name.upper(), "count": len(rows), "words": rows},
                      fh, ensure_ascii=False, separators=(",", ":"))

        print("%s: %d words (%d filled from JMdict, %d dropped for having no "
              "meaning anywhere)" % (name.upper(), len(rows), filled, len(bare)))
        if bare[:5]:
            print("   dropped e.g.:", ", ".join(r["w"] for r in bare[:5]))


if __name__ == "__main__":
    main()
