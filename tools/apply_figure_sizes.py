#!/usr/bin/env python3
"""Write the measured width and height onto every exam figure's <img> tag.

The sizes come from tools/fetch_figure_sizes.py. Giving the browser the shape
of a picture before it arrives is the whole point: these figures are fetched
from the Internet Archive and take ten to twenty seconds, so without the
attributes the question reflows under the reader long after they began, and
with them nothing moves at all.

Run after fetch_figure_sizes.py, then rebuild. Safe to run repeatedly: an
existing width/height on a tag is replaced, not doubled.
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAMS = os.path.join(ROOT, "data", "exams")
SIZES = os.path.join(ROOT, "data", "figures.json")

IMG = re.compile(r"<img\b[^>]*>", re.I)
SRC = re.compile(r'src="([^"]+)"', re.I)
DIM = re.compile(r'\s(?:width|height)="[^"]*"', re.I)


def retag(tag, sizes):
    m = SRC.search(tag)
    if not m:
        return tag, False
    wh = sizes.get(m.group(1))
    if not wh:
        return tag, False
    tag = DIM.sub("", tag)                       # drop any previous pair
    close = "/>" if tag.rstrip().endswith("/>") else ">"
    body = tag.rstrip()[:-len(close)].rstrip()
    return '%s width="%d" height="%d" %s' % (body, wh[0], wh[1], close), True


def walk(node, sizes, tally):
    if isinstance(node, str):
        if "<img" not in node:
            return node

        def one(m):
            tag, hit = retag(m.group(0), sizes)
            tally[0 if hit else 1] += 1
            return tag

        return IMG.sub(one, node)
    if isinstance(node, list):
        return [walk(v, sizes, tally) for v in node]
    if isinstance(node, dict):
        return {k: walk(v, sizes, tally) for k, v in node.items()}
    return node


def main():
    with open(SIZES, encoding="utf-8") as fh:
        sizes = json.load(fh)
    print("known figure sizes: %d" % len(sizes))

    tally = [0, 0]          # tagged, left alone
    changed = 0
    for name in sorted(os.listdir(EXAMS)):
        if not name.endswith(".json") or name == "index.json":
            continue
        path = os.path.join(EXAMS, name)
        with open(path, encoding="utf-8") as fh:
            before = fh.read()
        if "<img" not in before:
            continue
        exam = walk(json.loads(before), sizes, tally)
        after = json.dumps(exam, ensure_ascii=False, separators=(",", ":"))
        if after != before:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(after)
            changed += 1

    total = tally[0] + tally[1]
    print("figures given a size: %d of %d (%.0f%%) across %d papers"
          % (tally[0], total, 100.0 * tally[0] / total if total else 0, changed))
    if tally[1]:
        print("%d could not be measured; those fall back to the failure box "
              "in exam.css if they never arrive." % tally[1])


if __name__ == "__main__":
    main()
