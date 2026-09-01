#!/usr/bin/env python3
"""
Download the dictionary data that tools/build_glossary.py needs.

These are build inputs only - they are never served to the browser. Only the
small per-exam files in data/glossary/ are.

  data/dict/jmdict-eng.json    readings, English glosses, part of speech
                               JMdict via jmdict-simplified, CC BY-SA 4.0
                               https://github.com/scriptin/jmdict-simplified
  data/dict/jlpt-levels.json   word -> JLPT level, 8385 words
                               https://github.com/wkei/jlpt-vocab-api

JMdict is pruned as it is written: the release file is ~118 MB, most of which
is per-sense arrays that are empty for the vast majority of entries. Only the
fields the glossary builder reads are kept, and entries with no English gloss
are dropped entirely.

    python3 tools/fetch_dicts.py
"""

import csv
import gzip
import io
import json
import os
import sys
import tarfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICT_DIR = os.path.join(ROOT, "data", "dict")

JLPT_URL = ("https://raw.githubusercontent.com/wkei/jlpt-vocab-api/main/"
            "data-source/db/all.json")
# A second, independently compiled set of level lists. Merging them matters:
# the first source files 見る at N3 only, so on its own it would have the
# glossary explaining "to see" on an N3 paper.
ANKI_URL = ("https://raw.githubusercontent.com/jamsinclair/"
            "open-anki-jlpt-decks/main/src/%s.csv")
RELEASE_API = ("https://api.github.com/repos/scriptin/jmdict-simplified/"
               "releases/latest")


def get(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "jlpt-practice/1.0",
        "Accept-Encoding": "gzip",
    })
    with urllib.request.urlopen(req, timeout=300) as resp:
        raw = resp.read()
        encoded = resp.headers.get("Content-Encoding", "") == "gzip"
    # Only the transfer encoding is unwrapped here. Sniffing magic bytes would
    # also unwrap a .tgz that arrived intact, which the caller still needs.
    if encoded and raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    return raw


def fetch_jlpt():
    """Merge every level source, keeping the easiest level claimed for a word.

    If any list says a word is N5, a learner sitting N3 already knows it and
    it should not be glossed.
    """
    out = os.path.join(DICT_DIR, "jlpt-levels.json")
    rows = json.loads(get(JLPT_URL).decode("utf-8"))
    n_first = len(rows)

    added = 0
    for level in (5, 4, 3, 2, 1):
        text = get(ANKI_URL % ("n%d" % level)).decode("utf-8")
        for row in csv.DictReader(io.StringIO(text)):
            word = (row.get("expression") or "").strip()
            if not word:
                continue
            rows.append({"word": word,
                         "furigana": (row.get("reading") or "").strip(),
                         "level": level})
            added += 1

    with open(out, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, ensure_ascii=False, separators=(",", ":"))
    print("jlpt-levels.json  %d + %d rows  %.0f KB"
          % (n_first, added, os.path.getsize(out) / 1024.0))


def prune(word):
    """Keep only the fields build_glossary.py reads."""
    senses = []
    for sense in word["sense"]:
        gloss = [{"lang": g["lang"], "text": g["text"]}
                 for g in sense["gloss"] if g["lang"] == "eng"]
        if not gloss:
            continue
        senses.append({
            "partOfSpeech": sense["partOfSpeech"],
            "misc": sense.get("misc", []),
            "gloss": gloss,
        })
    if not senses:
        return None
    return {
        "kanji": [{"text": k["text"], "common": k.get("common", False)}
                  for k in word["kanji"]],
        "kana": [{"text": k["text"], "common": k.get("common", False)}
                 for k in word["kana"]],
        "sense": senses,
    }


def fetch_jmdict():
    meta = json.loads(get(RELEASE_API).decode("utf-8"))
    url = None
    for asset in meta["assets"]:
        name = asset["name"]
        if (name.startswith("jmdict-eng-") and name.endswith(".json.tgz")
                and "examples" not in name):
            url = asset["browser_download_url"]
            break
    if not url:
        sys.exit("no jmdict-eng asset in the latest release")
    print("jmdict release   %s" % meta["tag_name"])

    blob = get(url)
    with tarfile.open(fileobj=io.BytesIO(blob), mode="r:*") as tar:
        member = next(m for m in tar.getmembers() if m.name.endswith(".json"))
        data = json.load(tar.extractfile(member))

    words = [w for w in (prune(w) for w in data["words"]) if w]
    out = os.path.join(DICT_DIR, "jmdict-eng.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"version": data["version"], "dictDate": data["dictDate"],
                   "words": words}, fh, ensure_ascii=False,
                  separators=(",", ":"))
    print("jmdict-eng.json   %d of %d entries kept  %.1f MB"
          % (len(words), len(data["words"]), os.path.getsize(out) / 1e6))


if __name__ == "__main__":
    if not os.path.isdir(DICT_DIR):
        os.makedirs(DICT_DIR)
    fetch_jlpt()
    fetch_jmdict()
