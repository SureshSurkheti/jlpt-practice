#!/usr/bin/env python3
"""Compose original practice papers from the item banks.

The questions in data/practice-bank/ are written by hand - that is the part
no script can do. This deals them into papers of the right shape, so adding
items to a bank is all that adding a paper costs.

Shape follows the published format for the level: 問題1 kanji reading,
問題2 orthography, 問題3 contextual choice, 問題4 paraphrase. Every item is
used once and once only, so no two papers share a question, and the deal is
seeded so a rebuild produces the same papers rather than reshuffling the
library under anyone mid-study.

    python3 tools/build_practice_papers.py
"""

import io
import json
import os
import random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, "data", "practice-bank")
OUT = os.path.join(ROOT, "data", "exams-manual")

# How many of each type one paper holds, in paper order.
SHAPE = [("reading", 7), ("orthography", 5), ("context", 6), ("paraphrase", 3)]

INSTRUCTION = {
    "reading": "問題1　＿＿＿の ことばは どう よみますか。"
               "1・2・3・4から いちばん いい ものを 一つ えらんで ください。",
    "orthography": "問題2　＿＿＿の ことばは どう かきますか。"
                   "1・2・3・4から いちばん いい ものを 一つ えらんで ください。",
    "context": "問題3　（　　）に なにを いれますか。"
               "1・2・3・4から いちばん いい ものを 一つ えらんで ください。",
    "paraphrase": "問題4　＿＿＿の ぶんと だいたい おなじ いみの ぶんが あります。"
                  "1・2・3・4から いちばん いい ものを 一つ えらんで ください。",
}


def load(level, kind):
    path = os.path.join(BANK, "%s-%s.json" % (level, kind))
    if not os.path.exists(path):
        return []
    return json.load(io.open(path, encoding="utf-8"))


def to_question(item, rng):
    """One bank item as a question, with its options shuffled.

    The bank stores the right answer first because that is far easier to
    write and to check by eye. Shipping them that way would make every
    answer 1, so they are shuffled here - seeded, so the shuffle is the same
    on every build.
    """
    kind = item["t"]
    if kind == "reading":
        prompt = item["s"].format(item["w"])
        options = [item["c"]] + list(item["d"])
    elif kind == "orthography":
        prompt = item["s"].format(item["k"])
        options = [item["c"]] + list(item["d"])
    else:
        prompt = item["s"]
        options = list(item["ch"])

    correct = options[0]
    rng.shuffle(options)
    return {
        "prompt": prompt,
        "choices": options,
        "answer": options.index(correct) + 1,
        "category": "vocabulary",
        "explanation": item["n"],
        "instruction": INSTRUCTION[kind],
    }


def build(level, start_number):
    banks = {k: load(level, k) for k, _ in SHAPE}
    missing = [k for k, n in SHAPE if len(banks[k]) < n]
    if missing:
        print("%s: not enough items for one paper (%s)"
              % (level.upper(), ", ".join(missing)))
        return 0

    papers = min(len(banks[k]) // n for k, n in SHAPE)
    rng = random.Random("%s-practice" % level)
    for k in banks:
        rng.shuffle(banks[k])

    written = 0
    for i in range(papers):
        questions = []
        for kind, n in SHAPE:
            for item in banks[kind][i * n:(i + 1) * n]:
                questions.append(to_question(item, rng))

        number = start_number + i
        paper = {
            "id": "%s-practice-%d" % (level, number),
            "level": level.upper(),
            "periodLabel": "Practice Test %d" % number,
            "parts": [{
                "id": "vocabulary",
                "label": "Vocabulary (文字・語彙)",
                "questions": questions,
            }],
        }
        io.open(os.path.join(OUT, "%s-practice-%d.json" % (level, number)),
                "w", encoding="utf-8").write(
            json.dumps(paper, ensure_ascii=False, indent=1))
        written += 1

    left = {k: len(banks[k]) - papers * n for k, n in SHAPE}
    print("%s: %d papers of %d questions. Items left over: %s"
          % (level.upper(), written, sum(n for _, n in SHAPE),
             ", ".join("%s %d" % (k, v) for k, v in left.items())))
    return written


def main():
    total = 0
    # Practice Tests 1 and 2 are hand-written and stay where they are.
    for level in ("n5", "n4"):
        total += build(level, start_number=3)
    print("wrote %d papers" % total)


if __name__ == "__main__":
    main()
