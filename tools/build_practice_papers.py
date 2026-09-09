#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compose original practice papers from the item banks.

The items in data/practice-bank/ are written by hand - the sentences, the
passages, the listening scripts. That is the part no script can do. This
deals them into papers of the shape the real exam has, and derives the parts
that are mechanical rather than meaningful:

  * the wrong readings in 問題1, from the right one (see vocab_gen.py)
  * the wrong spellings in 問題2, likewise
  * which fragment lands on the star in 文の組み立て
  * the order the four choices are printed in

That last one matters more than it sounds. The banks store the correct
answer first, because a bank you can check by eye is a bank that gets
checked; shipping them in that order would have made every answer 1, which
is exactly what the first hand-written paper did before this existed.

Every item is used once and once only, so no two papers share a question,
and the deal is seeded, so a rebuild produces the same papers rather than
reshuffling the library under somebody halfway through it.

    python3 tools/build_practice_papers.py
"""

import io
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vocab_gen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, "data", "practice-bank")
OUT = os.path.join(ROOT, "data", "exams-manual")
WORDS = os.path.join(ROOT, "data", "words")

# Practice Tests 1 and 2 at each level are hand-written whole and stay where
# they are; the composed ones start after them.
FIRST = 3

# --------------------------------------------------------------------------
# the shape of a paper
#
# Counts are the published ones. A number here is questions for the plain
# kinds and passages for the ones that carry their own questions, because a
# reading passage is what gets dealt - you cannot give somebody question 2 of
# a passage without question 1.

SHAPE = {
    "n5": [
        ("vocabulary", [("reading", 7), ("orthography", 5),
                        ("context", 6), ("paraphrase", 3)]),
        ("grammar-reading", [("grammar", 9), ("order", 4), ("cloze", 1),
                             ("short", 2), ("mid", 1), ("info", 1)]),
        ("listening", [("listen1", 7), ("listen2", 6),
                       ("listen3", 5), ("listen4", 6)]),
    ],
    "n4": [
        ("vocabulary", [("reading", 9), ("orthography", 6),
                        ("context", 10), ("paraphrase", 5)]),
        ("grammar-reading", [("grammar", 15), ("order", 5), ("cloze", 1),
                             ("short", 4), ("mid", 2), ("info", 1)]),
        ("listening", [("listen1", 8), ("listen2", 7),
                       ("listen3", 5), ("listen4", 8)]),
    ],
}

CATEGORY = {
    "reading": "vocabulary", "orthography": "vocabulary",
    "context": "vocabulary", "paraphrase": "vocabulary",
    "grammar": "grammar", "order": "grammar", "cloze": "grammar",
    "short": "reading", "mid": "reading", "info": "reading",
    "listen1": "listening", "listen2": "listening",
    "listen3": "listening", "listen4": "listening",
}

# 問題 numbers restart in each part of the booklet, so they are held here
# rather than counted, and the instruction is written out in full the way the
# paper prints it - the player groups questions into sections by the
# instruction string, so two 問題 sharing one would merge into one section.
MONDAI = {
    "n5": {
        "reading": (1, "もんだい1　＿＿＿の　ことばは　ひらがなで　どう　かきますか。"
                       "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "orthography": (2, "もんだい2　＿＿＿の　ことばは　どう　かきますか。"
                           "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "context": (3, "もんだい3　（　　）に　なにを　いれますか。"
                       "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "paraphrase": (4, "もんだい4　＿＿＿の　ぶんと　だいたい　おなじ　いみの　ぶんが　あります。"
                          "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "grammar": (1, "もんだい1　（　　）に　なにを　いれますか。"
                       "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "order": (2, "もんだい2　★　に　はいる　ものは　どれですか。"
                     "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "cloze": (3, "もんだい3　1から4に　なにを　いれますか。ぶんしょうの　いみを　かんがえて、"
                     "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "short": (4, "もんだい4　つぎの　ぶんしょうを　よんで、しつもんに　こたえて　ください。"
                     "こたえは、1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "mid": (5, "もんだい5　つぎの　ぶんしょうを　よんで、しつもんに　こたえて　ください。"
                   "こたえは、1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "info": (6, "もんだい6　つぎの　ページを　みて、したの　しつもんに　こたえて　ください。"
                    "こたえは、1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "listen1": (1, "もんだい1　もんだい1では、はじめに　しつもんを　きいて　ください。"
                       "それから　はなしを　きいて、1から4の　なかから、"
                       "いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "listen2": (2, "もんだい2　もんだい2では、はじめに　しつもんを　きいて　ください。"
                       "それから　はなしを　きいて、1から4の　なかから、"
                       "いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "listen3": (3, "もんだい3　もんだい3では、ばめんの　せつめいを　よんでから、"
                       "はなしを　きいて　ください。やじるし（→）の　ひとは　なんと　いいますか。"
                       "1から3の　なかから、いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "listen4": (4, "もんだい4　もんだい4では、えなどが　ありません。ぶんを　きいて、"
                       "1から3の　なかから、いちばん　いい　ものを　ひとつ　えらんで　ください。"),
    },
    "n4": {
        "reading": (1, "問題1　＿＿＿の　ことばは　ひらがなで　どう　書きますか。"
                       "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "orthography": (2, "問題2　＿＿＿の　ことばは　どう　書きますか。"
                           "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "context": (3, "問題3　（　　）に　何を　入れますか。"
                       "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "paraphrase": (4, "問題4　＿＿＿の　文と　だいたい　同じ　意味の　文が　あります。"
                          "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "grammar": (1, "問題1　（　　）に　何を　入れますか。"
                       "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "order": (2, "問題2　★　に　入る　ものは　どれですか。"
                     "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "cloze": (3, "問題3　1から5に　何を　入れますか。文章の　意味を　考えて、"
                     "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "short": (4, "問題4　つぎの　文章を　読んで、質問に　答えて　ください。"
                     "答えは、1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "mid": (5, "問題5　つぎの　文章を　読んで、質問に　答えて　ください。"
                   "答えは、1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "info": (6, "問題6　右の　ページを　見て、下の　質問に　答えて　ください。"
                    "答えは、1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "listen1": (1, "問題1　問題1では、はじめに　質問を　聞いて　ください。"
                       "それから　話を　聞いて、1から4の　中から、"
                       "いちばん　いい　ものを　一つ　えらんで　ください。"),
        "listen2": (2, "問題2　問題2では、はじめに　質問を　聞いて　ください。"
                       "それから　話を　聞いて、1から4の　中から、"
                       "いちばん　いい　ものを　一つ　えらんで　ください。"),
        "listen3": (3, "問題3　問題3では、場面の　説明を　読んでから、話を　聞いて　ください。"
                       "やじるし（→）の　人は　何と　言いますか。"
                       "1から3の　中から、いちばん　いい　ものを　一つ　えらんで　ください。"),
        "listen4": (4, "問題4　問題4では、絵などが　ありません。文を　聞いて、"
                       "1から3の　中から、いちばん　いい　ものを　一つ　えらんで　ください。"),
    },
}

PASSAGE_KINDS = ("cloze", "short", "mid", "info")


# --------------------------------------------------------------------------
# bank -> questions

def load(level, kind):
    path = os.path.join(BANK, "%s-%s.json" % (level, kind))
    if not os.path.exists(path):
        return []
    return json.load(io.open(path, encoding="utf-8"))


_READINGS = {}


def word_reading(level, word):
    if not _READINGS:
        for lv in ("n5", "n4", "n3", "n2", "n1"):
            path = os.path.join(WORDS, "%s.json" % lv)
            if os.path.exists(path):
                for w in json.load(io.open(path, encoding="utf-8"))["words"]:
                    _READINGS.setdefault(w["w"], []).append(w["r"])
    got = _READINGS.get(word) or []
    return got[0] if got else None


def _mcq(prompt, choices, note, passage=None):
    """A question with its choices still in bank order - answer first."""
    return {
        "prompt": prompt,
        "choices": list(choices),
        "_correct": choices[0],
        "explanation": note,
        "passage": passage,
    }


def expand(level, kind, item, rng):
    """One bank item as one or more questions, answer still first."""
    if kind == "reading":
        right = item.get("r") or word_reading(level, item["w"])
        if not right:
            raise ValueError("no reading known for %s" % item["w"])
        wrong = item.get("d") or vocab_gen.reading_distractors(
            right, avoid=[r for r in _READINGS.get(item["w"], []) if r != right])
        if not wrong:
            raise ValueError("no distractors for %s (%s)" % (item["w"], right))
        prompt = item["s"].format("<u>%s</u>" % item["w"])
        return [_mcq(prompt, [right] + list(wrong),
                     item.get("n") or "%s = %s" % (item["w"], right))]

    if kind == "orthography":
        right = item["w"]
        read = item.get("r") or word_reading(level, right)
        wrong = item.get("d") or vocab_gen.written_distractors(right)
        if not wrong:
            raise ValueError("no written distractors for %s" % right)
        prompt = item["s"].format("<u>%s</u>" % read)
        return [_mcq(prompt, [right] + list(wrong),
                     item.get("n") or "%s = %s" % (read, right))]

    if kind in ("context", "paraphrase", "grammar"):
        return [_mcq(item["s"], item["ch"], item.get("n"))]

    if kind == "order":
        # The four fragments in the order they belong, and which of the four
        # blanks carries the star. The paper prints the fragments shuffled
        # and asks which one goes there, so the answer is a fragment, not a
        # position - and it is only findable by assembling the sentence.
        parts = item["parts"]
        star = item["star"] - 1
        shown = list(parts)
        rng.shuffle(shown)
        blanks = []
        for i in range(len(parts)):
            blanks.append("＿★＿" if i == star else "＿＿＿")
        prompt = "%s　%s　%s" % (item.get("pre", ""), "　".join(blanks),
                                item.get("post", ""))
        note = item.get("n") or ("ただしい じゅんばん： %s"
                                 % "".join(parts))
        return [_mcq(prompt.strip(), [parts[star]] +
                     [p for p in shown if p != parts[star]], note)]

    if kind == "cloze":
        out = []
        for i, q in enumerate(item["qs"], 1):
            out.append(_mcq("【%d】" % i, q["ch"], q.get("n"),
                            passage=item["passage"]))
        return out

    if kind in ("short", "mid", "info"):
        return [_mcq(q["s"], q["ch"], q.get("n"), passage=item["passage"])
                for q in item["qs"]]

    if kind.startswith("listen"):
        out = []
        for q in ([item] if "ch" in item else item["qs"]):
            node = _mcq(q.get("q", ""), q["ch"], q.get("n"))
            node["script"] = q.get("script") or item.get("script")
            node["scene"] = q.get("scene") or item.get("scene")
            out.append(node)
        return out

    raise ValueError("unknown kind %s" % kind)


# --------------------------------------------------------------------------
# assembly

def build(level):
    banks = {}
    for _, kinds in SHAPE[level]:
        for kind, _n in kinds:
            banks[kind] = load(level, kind)

    short = [(k, n, len(banks[k])) for _, kinds in SHAPE[level]
             for k, n in kinds if len(banks[k]) < n]
    if short:
        print("%s: cannot fill a paper - %s" % (level.upper(), ", ".join(
            "%s has %d, needs %d" % (k, have, n) for k, n, have in short)))
        return 0

    papers = min(len(banks[k]) // n for _, kinds in SHAPE[level]
                 for k, n in kinds)

    rng = random.Random("%s-practice" % level)
    for k in banks:
        rng.shuffle(banks[k])

    for i in range(papers):
        number = FIRST + i
        parts = []
        for part_id, kinds in SHAPE[level]:
            questions = []
            for kind, n in kinds:
                mondai, instruction = MONDAI[level][kind]
                for item in banks[kind][i * n:(i + 1) * n]:
                    for q in expand(level, kind, item, rng):
                        right = q.pop("_correct")
                        rng.shuffle(q["choices"])
                        q["answer"] = q["choices"].index(right) + 1
                        q["category"] = CATEGORY[kind]
                        q["instruction"] = instruction
                        questions.append(q)
            parts.append({"id": part_id, "questions": questions})

        paper = {
            "id": "%s-practice-%d" % (level, number),
            "level": level.upper(),
            "periodLabel": "Practice Test %d" % number,
            "parts": parts,
        }
        io.open(os.path.join(OUT, "%s-practice-%d.json" % (level, number)),
                "w", encoding="utf-8").write(
            json.dumps(paper, ensure_ascii=False, indent=1))

    per = sum(len(p["questions"]) for p in parts)
    left = min(len(banks[k]) - papers * n for _, kinds in SHAPE[level]
               for k, n in kinds)
    print("%s: %d papers of %d questions (%d spare items in the tightest bank)"
          % (level.upper(), papers, per, left))
    return papers


def main():
    total = 0
    for level in ("n5", "n4"):
        total += build(level)
    print("wrote %d papers" % total)


if __name__ == "__main__":
    main()
