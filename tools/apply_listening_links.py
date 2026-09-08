#!/usr/bin/env python3
"""Attach the full-recording link to the papers whose own audio is incomplete.

Some papers reached us with one recording where the sitting had five: the
source published 問題1 and nothing else, which is why the library shows
"Audio 1/5". Those recordings are not lost, they were simply never put up
there, so no amount of re-parsing brings them back.

data/listening-links.json names, for each such paper, a video that carries
the whole listening section. Nothing is copied here and nothing is embedded:
the page offers a link, which is the one use of somebody else's upload that
asks nothing of them - they keep the views, and their analytics show them
which site sent the viewer, so they can object if they want to.

Run after build_exams.py, which would otherwise write the field away.
"""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAMS = os.path.join(ROOT, "data", "exams")
LINKS = os.path.join(ROOT, "data", "listening-links.json")


def main():
    with open(LINKS, encoding="utf-8") as fh:
        papers = json.load(fh)["papers"]

    wrote = 0
    missing = []
    for eid, rec in sorted(papers.items()):
        path = os.path.join(EXAMS, eid + ".json")
        if not os.path.exists(path):
            missing.append(eid)
            continue
        with open(path, encoding="utf-8") as fh:
            exam = json.load(fh)
        exam["listeningFull"] = {"host": rec["host"], "url": rec["url"]}
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(exam, fh, ensure_ascii=False, separators=(",", ":"))
        wrote += 1

    # The library lists papers from index.json and never opens the papers
    # themselves, so it needs telling too - otherwise a paper whose whole
    # recording is one click away still shows a bare red "Audio 1/5".
    index_path = os.path.join(EXAMS, "index.json")
    with open(index_path, encoding="utf-8") as fh:
        index = json.load(fh)
    tagged = 0
    for row in index["exams"]:
        if row["id"] in papers:
            row["listeningFull"] = True
            tagged += 1
        else:
            row.pop("listeningFull", None)
    with open(index_path, "w", encoding="utf-8") as fh:
        json.dump(index, fh, ensure_ascii=False, indent=1)

    print("linked %d papers to a full recording (%d tagged in the index)"
          % (wrote, tagged))
    if missing:
        print("no such paper (check data/listening-links.json): %s"
              % ", ".join(missing))


if __name__ == "__main__":
    main()
