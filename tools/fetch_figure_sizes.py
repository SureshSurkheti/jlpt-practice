#!/usr/bin/env python3
"""Record the pixel size of every exam figure, so pages can reserve its space.

The figures are not ours and are not copied here: they are linked from
web.archive.org, exactly as the pages already link them. What this tool keeps
is two integers per image. That is enough for the browser to hold the right
sized hole open while the picture is on its way, which matters more here than
it usually would - the archive answers in ten to twenty seconds, and often
never - so without it a question reflows under the reader's eyes long after
they started reading, or leaves a silent gap where a picture should be.

Writes data/figures.json: { "<url>": [width, height], ... }. Runs again
happily; URLs already measured are skipped unless --all is given.
"""

import json
import os
import re
import struct
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAMS = os.path.join(ROOT, "data", "exams")
OUT = os.path.join(ROOT, "data", "figures.json")
from site_config import SITE  # noqa: E402

UA = "jlpt-practice figure-size probe (+%s)" % SITE


def urls():
    """Every <img src> in every paper, in a stable order."""
    found = []
    seen = set()
    for name in sorted(os.listdir(EXAMS)):
        if not name.endswith(".json") or name == "index.json":
            continue
        with open(os.path.join(EXAMS, name), encoding="utf-8") as fh:
            raw = fh.read()
        for u in re.findall(r'src=\\?"([^"\\]+)\\?"', raw):
            if u not in seen:
                seen.add(u)
                found.append(u)
    return found


def size_of(blob):
    """Width and height from the header bytes of a PNG, GIF or JPEG."""
    if blob[:8] == b"\x89PNG\r\n\x1a\n" and blob[12:16] == b"IHDR":
        return struct.unpack(">II", blob[16:24])
    if blob[:6] in (b"GIF87a", b"GIF89a"):
        return struct.unpack("<HH", blob[6:10])
    if blob[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(blob):
            if blob[i] != 0xFF:
                i += 1
                continue
            marker = blob[i + 1]
            if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                i += 2
                continue
            seg = struct.unpack(">H", blob[i + 2:i + 4])[0]
            # SOF0..SOF15, minus the four that are not frame headers
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", blob[i + 5:i + 9])
                return w, h
            i += 2 + seg
    return None


BACKOFF = [4, 12, 30, 60]


def probe(url, tries=5):
    """Fetch enough of the file to read its header. 64KB covers every case
       here; a JPEG's frame header can sit past the EXIF block.

       The archive rate-limits, and hard: six workers at once got 503 for
       nine requests in ten. So this waits, and waits longer each time, and
       the caller keeps the concurrency low. Slow is the only speed on offer.
    """
    for attempt in range(tries):
        try:
            req = Request(url, headers={"User-Agent": UA, "Range": "bytes=0-65535"})
            with urlopen(req, timeout=60) as res:
                blob = res.read(65536)
            wh = size_of(blob)
            if wh:
                return wh
        except Exception:
            pass
        if attempt + 1 < tries:
            time.sleep(BACKOFF[min(attempt, len(BACKOFF) - 1)])
    return None


def main():
    every = "--all" in sys.argv
    have = {}
    if os.path.exists(OUT) and not every:
        with open(OUT, encoding="utf-8") as fh:
            have = json.load(fh)

    todo = [u for u in urls() if u not in have]
    print("figures: %d total, %d already known, %d to fetch"
          % (len(urls()), len(have), len(todo)), flush=True)
    if not todo:
        return

    done = [0]

    def one(u):
        wh = probe(u)
        done[0] += 1
        if done[0] % 5 == 0:
            print("  %d/%d" % (done[0], len(todo)), flush=True)
        return u, wh

    with ThreadPoolExecutor(max_workers=2) as pool:
        for u, wh in pool.map(one, todo):
            if wh:
                have[u] = [wh[0], wh[1]]

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(have, fh, indent=0, sort_keys=True)
    total = len(urls())
    print("measured %d of %d (%.0f%%); wrote %s"
          % (len(have), total, 100.0 * len(have) / total, os.path.relpath(OUT, ROOT)))


if __name__ == "__main__":
    main()
