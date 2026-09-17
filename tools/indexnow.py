#!/usr/bin/env python3
"""Tell Bing and Yandex that pages have changed, by URL.

Google does not take IndexNow, and Google is most of the traffic - so this is
not the answer to "is the site indexed". It is the half of the answer that
does not need anybody's account: the key is a file on the domain, which is the
whole of the authentication, and the submission is one POST.

    python3 tools/indexnow.py            # everything in sitemap.xml
    python3 tools/indexnow.py <url> ...  # just these

The key file must be live on the site before submitting - the API fetches
https://<host>/<key>.txt and compares it - so deploy first, then run this.
"""
import io
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from site_config import SITE  # noqa: E402

ENDPOINT = "https://api.indexnow.org/indexnow"
BATCH = 10000   # the API's own ceiling per request


def key():
    path = os.path.join(ROOT, "tools", "indexnow_key.txt")
    return io.open(path, encoding="utf-8").read().strip()


def sitemap_urls():
    path = os.path.join(ROOT, "sitemap.xml")
    return re.findall(r"<loc>([^<]+)</loc>",
                      io.open(path, encoding="utf-8").read())


def submit(urls, k):
    host = SITE.split("//", 1)[1]
    body = json.dumps({
        "host": host,
        "key": k,
        "keyLocation": "%s/%s.txt" % (SITE, k),
        "urlList": urls,
    }).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT, data=body,
        headers={"Content-Type": "application/json; charset=utf-8"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode("utf-8", "replace")[:200]


def main():
    k = key()
    urls = sys.argv[1:] or sitemap_urls()
    if not urls:
        sys.exit("nothing to submit")
    for i in range(0, len(urls), BATCH):
        chunk = urls[i:i + BATCH]
        status, body = submit(chunk, k)
        print("%d urls -> HTTP %s %s" % (len(chunk), status, body.strip()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
