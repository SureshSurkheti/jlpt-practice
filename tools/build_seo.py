#!/usr/bin/env python3
"""
Write the search-engine and social block into every page, and generate
robots.txt and sitemap.xml.

Everything hangs off SITE_URL below - change that one line if the site moves
and re-run, rather than editing seven <head>s by hand.

Two pages are deliberately kept out of the index:
  stats.html  is one person's own progress, read from their browser storage.
  exam.html   renders a different paper for every ?id=, but every one of them
              is served from this same empty shell, so a crawler sees 84
              identical documents. The library page carries those links
              instead, and it is the one that should rank.

Run:  python3 tools/build_seo.py
"""

import io
import os
import re
from datetime import date

SITE_URL = "https://jlpt.sureshsurkheti.com"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_NAME = "JLPT Practice"
OG_IMAGE = SITE_URL + "/icon-512.png"

# page -> (title, description, indexable, sitemap priority)
PAGES = {
    "index.html": (
        "JLPT Practice — Free Mock Exams for N1, N2, N3, N4 and N5",
        "Free JLPT mock exams with a timer, automatic marking, answer "
        "explanations and listening scripts. Practise vocabulary, grammar, "
        "reading and listening from N5 up to N1.",
        True, "1.0",
    ),
    "exams.html": (
        "JLPT Mock Exam Library — 84 Full-Length Practice Papers",
        "Browse 84 full-length JLPT practice papers from N1 to N4. Every "
        "paper is timed, marked automatically, and comes with answer "
        "explanations and listening scripts.",
        True, "0.9",
    ),
    "study.html": (
        "JLPT N5 and N4 Vocabulary and Grammar Lists",
        "Every JLPT N5 and N4 word with its reading, romaji and English "
        "meaning, plus the core grammar patterns with example sentences. "
        "Searchable in Japanese, romaji or English.",
        True, "0.9",
    ),
    "levels.html": (
        "JLPT Levels Explained — N1, N2, N3, N4 and N5 Requirements",
        "What each JLPT level asks for: kanji and vocabulary counts, pass "
        "marks and the minimum score you need in every section, from N5 "
        "through to N1.",
        True, "0.8",
    ),
    "practice.html": (
        "JLPT Practice by Section — Vocabulary, Grammar, Reading, Listening",
        "Drill one JLPT section at a time or sit a full timed mock exam. "
        "Your accuracy is tracked for every level from N5 to N1.",
        True, "0.8",
    ),
    "about.html": (
        "About JLPT Practice — Free and Private JLPT Study",
        "A free JLPT study site for people living in Japan. Nothing is "
        "uploaded anywhere: your answers and your progress stay in your "
        "own browser.",
        True, "0.5",
    ),
    "stats.html": (
        "Your JLPT Progress — JLPT Practice",
        "Your accuracy and activity for each JLPT level you have studied.",
        False, None,
    ),
    "exam.html": (
        "JLPT Mock Exam — JLPT Practice",
        "Sit a full-length JLPT practice paper with a timer, a question map "
        "and automatic marking.",
        False, None,
    ),
}

# Structured data. Only on the home page, and only claims that are true of it.
JSON_LD = """    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "%(name)s",
      "url": "%(site)s/",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Any",
      "description": "%(desc)s",
      "inLanguage": ["en", "ja", "vi", "ne", "id", "fil", "si", "hi", "pt-BR", "zh", "ko", "bn"],
      "isAccessibleForFree": true,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "JPY" }
    }
    </script>
"""


def esc(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))


def head_block(page, title, desc, indexable):
    url = SITE_URL + ("/" if page == "index.html" else "/" + page)
    out = ["<title>%s</title>" % esc(title)]
    add = out.append
    add('    <meta name="description" content="%s" />' % esc(desc))
    if indexable:
        add('    <link rel="canonical" href="%s" />' % url)
        add('    <meta name="robots" content="index, follow, max-image-preview:large" />')
    else:
        add('    <meta name="robots" content="noindex, follow" />')
    add('    <meta property="og:type" content="website" />')
    add('    <meta property="og:site_name" content="%s" />' % SITE_NAME)
    add('    <meta property="og:title" content="%s" />' % esc(title))
    add('    <meta property="og:description" content="%s" />' % esc(desc))
    add('    <meta property="og:url" content="%s" />' % url)
    add('    <meta property="og:image" content="%s" />' % OG_IMAGE)
    add('    <meta name="twitter:card" content="summary_large_image" />')
    add('    <meta name="twitter:title" content="%s" />' % esc(title))
    add('    <meta name="twitter:description" content="%s" />' % esc(desc))
    add('    <meta name="twitter:image" content="%s" />' % OG_IMAGE)
    if page == "index.html":
        add(JSON_LD.rstrip("\n") % {"name": SITE_NAME, "site": SITE_URL,
                                    "desc": esc(desc)})
    return "\n".join(out) + "\n    "


def main():
    for page, (title, desc, indexable, _) in PAGES.items():
        path = os.path.join(ROOT, page)
        s = io.open(path, encoding="utf-8").read()
        start = s.index("<title>")
        end = s.index('<link rel="preconnect"')
        s = s[:start] + head_block(page, title, desc, indexable) + s[end:]
        io.open(path, "w", encoding="utf-8").write(s)
        print("head  %-14s %s" % (page, "index" if indexable else "noindex"))

    io.open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8").write(
        "User-agent: *\n"
        "Allow: /\n"
        "\n"
        "# One paper per ?id=, all served from the same empty shell.\n"
        "Disallow: /exam.html\n"
        "Disallow: /stats.html\n"
        "\n"
        "Sitemap: %s/sitemap.xml\n" % SITE_URL)
    print("wrote robots.txt")

    today = date.today().isoformat()
    rows = []
    for page, (_, _, indexable, priority) in PAGES.items():
        if not indexable:
            continue
        url = SITE_URL + ("/" if page == "index.html" else "/" + page)
        rows.append(
            "  <url>\n"
            "    <loc>%s</loc>\n"
            "    <lastmod>%s</lastmod>\n"
            "    <priority>%s</priority>\n"
            "  </url>" % (url, today, priority))
    io.open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(rows) + "\n</urlset>\n")
    print("wrote sitemap.xml (%d urls)" % len(rows))


if __name__ == "__main__":
    main()
