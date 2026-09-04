# -*- coding: utf-8 -*-
"""Write guide/*.html.

Straight to the output directory, not through _src: _src holds the templates
that build_static.py runs the twelve-language pass over, and these pages do
not take that pass.

Written in English, then in every language that has a file in _src/guides/.
The papers themselves are disallowed in robots.txt because the questions are
not ours to republish, which leaves the site with almost nothing a search
engine may read. These are written to be the indexable half: real answers to
questions people actually type, using facts the site already holds so the two
can never disagree.

The header picker lists only these languages. The translations are
machine-made and say so on the page, with the English
original one click away, until a native speaker has read them. They exist
because the site's stated readers are learners in Japan from Nepal, Vietnam
and China, and an English-only guide reaches none of them in search.
"""
import io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_static import finish_html, breadcrumbs, load_translations, t, esc, OG_LOCALE, clip_desc
import re
import glob

SITE = "https://jlpt.sureshsurkheti.com"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "guide")

HEAD = """<!DOCTYPE html>
<html lang="{lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#112d4e" />
    <title>{title}</title>
    <meta name="description" content="{desc}" />
    <link rel="canonical" href="{url}" />
{hreflang}
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="JLPT Practice" />
    <meta property="og:locale" content="{oglocale}" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:url" content="{url}" />
    <meta property="og:image" content="{site}/icon-512.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{desc}" />
    <meta name="twitter:image" content="{site}/icon-512.png" />
    <script type="application/ld+json">{ld}</script>
{crumbs}
    <link rel="preload" href="/assets/fonts/inter-v20-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/assets/fonts/cormorant-v21-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/assets/css/styles.css" />
  </head>
  <body class="guide-page"{back}>
    <header class="site-header">
      <div class="container nav-wrap">
        <a class="brand-wrap" href="../index.html" id="brandLink">
          <span class="brand-mark">JL</span>
          <span class="brand-text">
            <span class="brand-name">JLPT Practice</span>
            <span class="brand-tag">{brandtag}</span>
          </span>
        </a>

        <nav class="main-nav" aria-label="Main navigation">
          <a href="../index.html" data-i18n="nav.home">{navhome}</a>
          <a href="../levels.html" data-i18n="nav.levels">{navlevels}</a>
          <a href="../exams.html" data-i18n="nav.exams">{navexams}</a>
          <a href="../study.html" data-i18n="nav.study">{navstudy}</a>
          <a href="../about.html" data-i18n="nav.about">{navabout}</a>
          <a class="nav-guides active" href="{guideshref}" data-i18n="nav.guides">{navguides}</a>
        </nav>

        <div class="nav-tools">
          <label class="language-select">
            <span data-i18n="lang.label">{langlabel}</span>
            <select id="languageSelect" aria-label="{langlabel}" data-i18n-attr="aria-label:lang.label">
{langoptions}
            </select>
          </label>
        </div>
      </div>
    </header>

    <main class="container page-shell">
      <article class="guide">
        <p class="guide-kicker">{kicker}</p>
        <h1>{h1}</h1>
        <p class="guide-standfirst">{standfirst}</p>
{note}{body}
        <aside class="guide-cta">
          <h2>{ctatitle}</h2>
          <p>{ctabody}</p>
          <div class="guide-cta-actions">
            <a class="btn btn-primary" href="../exams.html">{ctabrowse}</a>
            <a class="btn btn-ghost" href="../levels.html">{ctalevels}</a>
          </div>
        </aside>
        <nav class="guide-more" aria-label="{moreh}">
          <h2>{moreh}</h2>
          <ul>{more}</ul>
        </nav>
      </article>
    </main>

    <footer class="site-footer">
      <div class="container footer-inner">
        <div>© 2026 JLPT Practice</div>
        <div data-i18n="footer.tagline">{tagline}</div>
      </div>
{langlinks}    </footer>

    <script src="/assets/js/i18n.js"></script>
    <script src="/assets/i18n/en.js"></script>
{langscript}    <script src="/assets/js/site.js"></script>
  </body>
</html>
"""

SCORING = """
        <p>Almost everything confusing about the JLPT result slip comes from
           one fact: <strong>your score is not a percentage of the questions you
           got right.</strong> Two people can answer the same number of
           questions correctly in two different sittings and get different
           scores, and neither slip is wrong.</p>

        <h2>Every level is marked out of 180</h2>
        <p>N5 and N1 both total 180 points. What changes is how those points
           are divided, and that division is the part that decides whether you
           pass.</p>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>Level</th><th>Scored sections</th><th>Pass mark</th></tr></thead>
            <tbody>
              <tr><td>N5</td><td>Language knowledge &amp; Reading (0–120) · Listening (0–60)</td><td>80 / 180</td></tr>
              <tr><td>N4</td><td>Language knowledge &amp; Reading (0–120) · Listening (0–60)</td><td>90 / 180</td></tr>
              <tr><td>N3</td><td>Language knowledge (0–60) · Reading (0–60) · Listening (0–60)</td><td>95 / 180</td></tr>
              <tr><td>N2</td><td>Language knowledge (0–60) · Reading (0–60) · Listening (0–60)</td><td>90 / 180</td></tr>
              <tr><td>N1</td><td>Language knowledge (0–60) · Reading (0–60) · Listening (0–60)</td><td>100 / 180</td></tr>
            </tbody>
          </table>
        </div>
        <p>Read that table twice, because it contains something people assume
           is a misprint: <strong>N3 has a higher pass mark than N2.</strong>
           95 against 90. N2 is unquestionably the harder exam — it just does
           not need as high a score, because the scale is set per level and the
           two numbers are not measuring the same thing.</p>

        <h2>The rule that fails people who passed</h2>
        <p>Clearing the total is not enough. Every scored section also carries
           a minimum, and missing any one of them fails the whole exam no
           matter how high the total is.</p>
        <ul class="guide-list">
          <li><strong>N1, N2, N3</strong> — at least 19 out of 60 in each of
              the three sections.</li>
          <li><strong>N4, N5</strong> — at least 38 out of 120 in Language
              knowledge &amp; Reading, and 19 out of 60 in Listening.</li>
        </ul>
        <p>So an N2 candidate scoring 55, 55 and 18 has 128 points against a
           pass mark of 90 — comfortably over, and a fail. The 18 in listening
           ends it. This is the single most common way people are surprised by
           a result slip, and it is why practising only your strongest section
           is a bad strategy: a section you have written off can sink an exam
           you would otherwise pass easily.</p>
        <p>It also means the useful question is never "what is my total?" but
           "what is my weakest section?" Every paper on this site is marked
           section by section for exactly that reason.</p>

        <h2>Why the scores are scaled</h2>
        <p>The JLPT uses <em>scaled scoring</em> — 尺度得点. Raw answers are
           converted onto a common scale using item response theory, so a mark
           means the same thing whatever else was in your booklet.</p>
        <p>The reason is fairness across sittings. No two papers are exactly
           equal in difficulty, and the test runs twice a year worldwide. If
           results were raw percentages, an easy December would hand out more
           passes than a hard July for no reason connected to the candidates.
           Scaling removes that.</p>
        <p>The practical consequences are worth knowing:</p>
        <ul class="guide-list">
          <li>You cannot calculate your score from a count of correct answers,
              and nobody can tell you exactly how many you needed.</li>
          <li>Questions are not all worth the same in the final scale, and the
              weighting is not published.</li>
          <li>Any site promising you an exact JLPT score, including this one,
              is estimating. A practice result tells you where your weak
              section is. It does not tell you what the real slip will say.</li>
        </ul>

        <h2>How long each level takes</h2>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>Level</th><th>Total test time</th><th>Kanji</th><th>Vocabulary</th></tr></thead>
            <tbody>
              <tr><td>N5</td><td>90 minutes</td><td>~100</td><td>~800</td></tr>
              <tr><td>N4</td><td>115 minutes</td><td>~300</td><td>~1,500</td></tr>
              <tr><td>N3</td><td>140 minutes</td><td>~600</td><td>~3,500</td></tr>
              <tr><td>N2</td><td>155 minutes</td><td>~1,000</td><td>~6,000</td></tr>
              <tr><td>N1</td><td>165 minutes</td><td>~2,000</td><td>~10,000</td></tr>
            </tbody>
          </table>
        </div>
        <p>The kanji and vocabulary figures are the commonly used estimates.
           The JLPT has published no official word list since 2010, so treat
           them as a sense of scale, not a syllabus.</p>

        <h2>What to check on results day</h2>
        <p>Look at the section scores before the total. If you failed, the
           section under its minimum tells you what the next six months are
           for. If you passed, the lowest section is still the one to work on:
           the next level up assumes it.</p>
"""

N4N3 = """
        <p>Most people describe N4 to N3 as the hardest step in the JLPT, and
           the numbers agree. It is the only jump where the exam changes shape
           as well as difficulty.</p>

        <h2>The exam is structured differently</h2>
        <p>This is the part that catches people out, and it is not about
           vocabulary at all.</p>
        <p>At N5 and N4, language knowledge and reading are marked
           <strong>together</strong>, as one section out of 120. A weak reader
           who is strong on vocabulary and grammar can be carried by the
           combined mark.</p>
        <p>At N3 they are marked <strong>separately</strong> — 60 for language
           knowledge, 60 for reading — and each carries its own minimum of 19.
           The reading score now has to stand on its own. Candidates who passed
           N4 on the strength of their vocabulary often fail N3 on reading
           alone, having never had to find out that reading was their weak
           side.</p>
        <p>If you take one thing from this page: <strong>sit a full N3 reading
           section early</strong>, before you have decided how prepared you
           are.</p>

        <h2>The volume roughly doubles</h2>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th></th><th>N4</th><th>N3</th><th>Change</th></tr></thead>
            <tbody>
              <tr><td>Kanji</td><td>~300</td><td>~600</td><td>×2</td></tr>
              <tr><td>Vocabulary</td><td>~1,500</td><td>~3,500</td><td>×2.3</td></tr>
              <tr><td>Test time</td><td>115 min</td><td>140 min</td><td>+25 min</td></tr>
              <tr><td>Pass mark</td><td>90 / 180</td><td>95 / 180</td><td>+5</td></tr>
              <tr><td>Scored sections</td><td>2</td><td>3</td><td>+1</td></tr>
            </tbody>
          </table>
        </div>

        <h2>The Japanese stops being written for learners</h2>
        <p>N4 reading is written to be read by a learner: short passages, wide
           spacing, and a lot of hiragana. N3 reading is closer to Japanese
           written for Japanese people — notices, emails, short newspaper-style
           articles. Spacing between words disappears. Furigana becomes rare.</p>
        <p>Two habits carry more weight than any word list here:</p>
        <ul class="guide-list">
          <li><strong>Reading speed.</strong> N3 gives you 70 minutes for
              reading alone. Candidates who fail reading at N3 usually
              understood the passages and ran out of time.</li>
          <li><strong>Reading whole sentences.</strong> At N4 you can often
              answer by recognising one word. At N3 the distractors are built
              from words that are in the passage, so recognition alone leads
              you to a wrong answer that feels right.</li>
        </ul>

        <h2>Listening changes too</h2>
        <p>N4 listening is slow and repeats the important part. N3 speaks at
           closer to natural speed, and 概要理解 — questions where nothing on
           the page tells you what to listen for — appear properly for the
           first time. You hear the passage, then the question. Taking notes
           while listening stops being optional.</p>

        <h2>A realistic order to work in</h2>
        <ol class="guide-list">
          <li>Sit one full N3 paper cold, before studying, to find which of the
              three sections is weakest. The result will not be flattering and
              is not meant to be.</li>
          <li>Work on that section first. The sectional minimum means your
              weakest section decides the outcome, not your average.</li>
          <li>Learn the ~300 new kanji steadily rather than in blocks. They
              appear in reading and listening answer choices too, so this is
              not only a vocabulary task.</li>
          <li>Re-sit a full timed paper about a month out, in exam mode, in one
              sitting. N3 is 140 minutes; concentration at the end of it is a
              skill of its own.</li>
        </ol>
"""

WHICH = """
        <p>There is no entry requirement and no order you have to follow. You
           may sit any level, and you may skip levels. That freedom is exactly
           what makes the question hard, so here is a way to decide that does
           not rely on guessing.</p>

        <h2>Start from why you are taking it</h2>
        <p>The right level depends far more on what the certificate is for than
           on how much Japanese you know.</p>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>If you need it for…</th><th>Aim at</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td>A visa points application</td><td>N2 or N1</td><td>N2 and above is where most points tables begin.</td></tr>
              <tr><td>Work in a Japanese company</td><td>N2</td><td>The level most job listings name.</td></tr>
              <tr><td>Study at a Japanese university</td><td>N1</td><td>Usually required outright.</td></tr>
              <tr><td>Care and service work in Japan</td><td>N3 or N4</td><td>Commonly the stated minimum.</td></tr>
              <tr><td>Proof of progress for yourself</td><td>The next one up</td><td>A near-term target beats a distant one.</td></tr>
            </tbody>
          </table>
        </div>
        <p>If the certificate has a job to do, aim at the level that does it.
           If it does not, aim one level above where you are now.</p>

        <h2>Then check it against a real paper</h2>
        <p>Self-assessment is unreliable in both directions, and there is a
           faster test: sit a paper.</p>
        <ul class="guide-list">
          <li><strong>Under about 40%</strong> — this level is too far off for
              the next sitting. Drop one.</li>
          <li><strong>Around 50–65%</strong> — the right level to work towards.
              Close enough that study moves the needle, far enough that it
              still needs doing.</li>
          <li><strong>Over about 80%</strong> — you are likely revising rather
              than learning. Consider the level above.</li>
        </ul>
        <p>Check the <em>sections</em>, not the total. A pass needs a minimum in
           every section, so a score of 70% built from a strong reading mark and
           a poor listening mark is not the pass it looks like.</p>

        <h2>Should you skip a level?</h2>
        <p>Skipping is allowed and often sensible. Two considerations:</p>
        <ul class="guide-list">
          <li><strong>N5 and N4 are worth little on paper.</strong> Almost no
              employer or visa scheme asks for them. Their value is as a
              deadline that makes you study, which is a real value — but if you
              need a certificate for something, aim higher.</li>
          <li><strong>N3 to N1 is the jump to be careful about.</strong> The
              vocabulary roughly triples and N1 reading is dense, fast and
              long. Going N3 → N2 → N1 costs one extra sitting and is the more
              reliable route for most people.</li>
        </ul>

        <h2>Both sittings, and the deadline that actually matters</h2>
        <p>The JLPT is held twice a year, on the first Sunday of July and the
           first Sunday of December. July is not offered in every country;
           December is held everywhere the test runs.</p>
        <p>The date that decides your year is not the exam — it is the
           application deadline, which falls months earlier and is set
           country by country. Missing it means waiting six months. Check with
           your own test centre rather than assuming, and put that date in a
           calendar now: the countdown on the home page of this site shows the
           next sitting, but it cannot know your country's deadline.</p>

        <h2>Still not sure?</h2>
        <p>Take the level you think is slightly too hard. The JLPT is not
           cumulative — failing costs you the fee and nothing else, and the
           result slip tells you exactly which section to work on. That is far
           more useful than passing something you already knew you could pass.</p>
"""

import json

PAGES = [
  dict(slug="jlpt-scoring.html",
       h1="How the JLPT is scored",
       title="How the JLPT is Scored — Pass Marks and Section Minimums Explained",
       desc="Every level is marked out of 180, but the total is not what fails most people. How scaled scoring works, and the section minimum that fails people who passed.",
       standfirst="Every level is out of 180 — and the total is not the rule that fails people.",
       body=SCORING),
  dict(slug="n4-to-n3.html",
       h1="N4 to N3: the biggest jump in the JLPT",
       title="JLPT N4 to N3 — Why It Is the Hardest Step, and What Changes",
       desc="N3 doubles N4's kanji and vocabulary, but the change that catches people out is structural: reading becomes its own scored section, with its own minimum.",
       standfirst="The kanji doubles. The thing that actually fails people is that reading becomes its own section.",
       body=N4N3),
  dict(slug="which-jlpt-level.html",
       h1="Which JLPT level should you take?",
       title="Which JLPT Level Should You Take? N5 to N1 Compared",
       desc="Choose a level by what the certificate is for, then check it against a paper. What N2 is worth, when to skip a level, and the deadline that beats the exam date.",
       standfirst="Start from what the certificate is for — then check your guess against a real paper.",
       body=WHICH),
]

def ld_for(p):
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": p["h1"],
        "description": p["desc"],
        "inLanguage": "en",
        "isAccessibleForFree": True,
        "mainEntityOfPage": {"@type": "WebPage",
                             "@id": "%s/guide/%s" % (SITE, p["slug"])},
        "author": {"@type": "Person", "name": "Suresh Surkheti"},
        "publisher": {"@type": "Organization", "name": "JLPT Practice"},
    }, ensure_ascii=False, separators=(",", ":"))

INDEX = """
        <p>Three pages on how the exam itself works - the scoring, the step
           people find hardest, and how to choose a level. Everything here is
           about the JLPT as an exam rather than about Japanese.</p>
{cards}
"""


# --------------------------------------------------------------------------
# Languages. English is the master copy, written from the constants above.
# Each file in _src/guides/<lang>.json is the same three articles and the
# handful of interface strings in another language, machine-translated and
# marked as such on the page until a native speaker has read it. They are
# written to /<lang>/guide/ with hreflang links between every version, so a
# search engine treats them as one article in five languages rather than
# five competitors, and a Nepali or Vietnamese reader finds the guide in the
# language they chose for the rest of the site.
# --------------------------------------------------------------------------

EN_UI = dict(
    kicker="JLPT guide", brandTag="Guides",
    ctaTitle="Try it on a real paper",
    ctaBody="Every practice paper on this site is marked section by section, "
            "so you can see the rule above applied to your own answers.",
    ctaBrowse="Browse practice papers", ctaLevels="Compare the levels",
    more="More guides", note="", noteLink="",
    indexTitle="JLPT Guides — How the Exam Works", indexH1="JLPT guides",
    indexStandfirst="How the exam works, written out in full.",
    indexIntro="Three pages on how the exam itself works - the scoring, the step "
               "people find hardest, and how to choose a level. Everything here is "
               "about the JLPT as an exam rather than about Japanese.")

SRC = os.path.join(os.path.dirname(OUT), "_src", "guides")
TRANSLATED = {}
for _f in sorted(glob.glob(os.path.join(SRC, "*.json"))):
    TRANSLATED[os.path.basename(_f)[:-5]] = json.load(io.open(_f, encoding="utf-8"))
LANGS = ["en"] + sorted(TRANSLATED)
NAMES = {"en": "English", "ja": "日本語", "ne": "नेपाली", "vi": "Tiếng Việt",
         "zh": "中文", "ko": "한국어", "id": "Bahasa Indonesia", "fil": "Filipino",
         "pt-BR": "Português (Brasil)", "hi": "हिन्दी", "bn": "বাংলা", "si": "සිංහල"}
TABLES = load_translations()
EN_TABLE = TABLES["en"]


def guide_url(lang, slug):
    return "%s%s/guide/%s" % (SITE, "" if lang == "en" else "/" + lang, slug)


def out_dir(lang):
    return OUT if lang == "en" else os.path.join(os.path.dirname(OUT), lang, "guide")


def hreflang(slug):
    rows = ['    <link rel="alternate" hreflang="%s" href="%s" />' % (l, guide_url(l, slug))
            for l in LANGS]
    rows.append('    <link rel="alternate" hreflang="x-default" href="%s" />' % guide_url("en", slug))
    return "\n".join(rows)


def lang_links(lang, slug, table):
    label = esc(t(table, "lang.label", EN_TABLE))
    items = "".join('<li><a href="%s" hreflang="%s" lang="%s">%s</a></li>'
                    % (guide_url(l, slug), l, l, esc(NAMES[l])) for l in LANGS if l != lang)
    return ('      <nav class="container lang-links" aria-label="%s">\n'
            '        <span>%s</span>\n        <ul>%s</ul>\n      </nav>\n' % (label, label, items))


def common(lang, slug, ui, table):
    """The template fields that are the same on every page of a language."""
    return dict(
        lang=lang, site=SITE, hreflang=hreflang(slug),
        oglocale=OG_LOCALE.get(lang, lang),
        brandtag=esc(ui["brandTag"]), kicker=esc(ui["kicker"]),
        navhome=esc(t(table, "nav.home", EN_TABLE)),
        navlevels=esc(t(table, "nav.levels", EN_TABLE)),
        navexams=esc(t(table, "nav.exams", EN_TABLE)),
        navstudy=esc(t(table, "nav.study", EN_TABLE)),
        navabout=esc(t(table, "nav.about", EN_TABLE)),
        navguides=esc(t(table, "nav.guides", EN_TABLE)),
        guideshref="/guide/" if lang == "en" else "/%s/guide/" % lang,
        ctatitle=esc(ui["ctaTitle"]), ctabody=esc(ui["ctaBody"]),
        ctabrowse=esc(ui["ctaBrowse"]), ctalevels=esc(ui["ctaLevels"]),
        moreh=esc(ui["more"]),
        tagline=esc(t(table, "footer.tagline", EN_TABLE)),
        langlinks=lang_links(lang, slug, table),
        # The picker lists only the languages the guides exist in. The
        # picker's own code maps /ko/guide/x.html to /ne/guide/x.html, so
        # a language without a guide would be a link to a 404.
        langlabel=esc(t(table, "lang.label", EN_TABLE)),
        langoptions="\n".join('              <option value="%s"%s>%s</option>'
                               % (l, ' selected' if l == lang else '', esc(NAMES[l]))
                               for l in LANGS),
        langscript="" if lang == "en" else
                   '    <script src="/assets/i18n/%s.js"></script>\n' % lang,
        note="" if lang == "en" else
             '        <p class="guide-note">%s <a href="%s" hreflang="en" lang="en">%s</a></p>\n'
             % (esc(ui["note"]), guide_url("en", slug), esc(ui["noteLink"])))


def ld_for_lang(p, lang, slug):
    d = json.loads(ld_for(dict(p, slug=slug)))
    d["inLanguage"] = lang
    d["mainEntityOfPage"]["@id"] = guide_url(lang, slug)
    if lang != "en":
        d["translationOfWork"] = {"@type": "Article", "@id": guide_url("en", slug)}
    return json.dumps(d, ensure_ascii=False, separators=(",", ":"))


def write_language(lang):
    ui = EN_UI if lang == "en" else TRANSLATED[lang]["ui"]
    table = TABLES.get(lang, EN_TABLE)
    pages = []
    for p in PAGES:
        if lang == "en":
            pages.append(dict(p))
        else:
            tr = TRANSLATED[lang]["pages"][p["slug"]]
            pages.append(dict(slug=p["slug"], h1=tr["h1"], title=tr["title"],
                              desc=clip_desc(tr["desc"]), standfirst=tr["standfirst"],
                              body=tr["body"]))
    home = t(table, "nav.home", EN_TABLE)
    d = out_dir(lang)
    os.makedirs(d, exist_ok=True)

    # index
    cards = '<ul class="guide-index">' + "".join(
        '<li><a href="%s"><b>%s</b><span>%s</span></a></li>' % (p["slug"], esc(p["h1"]), esc(p["standfirst"]))
        for p in pages) + "</ul>"
    fields = common(lang, "", ui, table)
    fields["note"] = ""
    html = HEAD.format(
        title=esc(ui["indexTitle"]), desc=esc(clip_desc(ui["indexIntro"])),
        url=guide_url(lang, ""), h1=esc(ui["indexH1"]), standfirst=esc(ui["indexStandfirst"]),
        body=INDEX.format(cards=cards), back="",
        more="".join('<li><a href="%s">%s</a></li>' % (q["slug"], esc(q["h1"])) for q in pages),
        crumbs=breadcrumbs([(home, SITE + ("/" if lang == "en" else "/%s/" % lang)),
                            (ui["indexH1"], guide_url(lang, ""))]),
        ld=json.dumps({"@context": "https://schema.org", "@type": "CollectionPage",
                       "name": ui["indexH1"], "inLanguage": lang,
                       "url": guide_url(lang, "")}, ensure_ascii=False, separators=(",", ":")),
        **fields)
    # the index does not need a "more guides" list under a list of the same
    # three, nor a call to action it already is
    html = re.sub(r'<nav class="guide-more" aria-label="[^"]*">', '<nav hidden>', html)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(finish_html(html, table, EN_TABLE))
    print("%-6s %-24s  index" % (lang, "index.html"))

    for p in pages:
        others = [q for q in pages if q["slug"] != p["slug"]]
        more = "".join('<li><a href="%s">%s</a></li>' % (q["slug"], esc(q["h1"])) for q in others)
        html = HEAD.format(
            title=esc(p["title"]), desc=esc(p["desc"]), url=guide_url(lang, p["slug"]),
            h1=esc(p["h1"]), standfirst=esc(p["standfirst"]), body=p["body"],
            more=more, ld=ld_for_lang(p, lang, p["slug"]),
            crumbs=breadcrumbs([(home, SITE + ("/" if lang == "en" else "/%s/" % lang)),
                                (ui["indexH1"], guide_url(lang, "")),
                                (p["h1"], guide_url(lang, p["slug"]))]),
            # An article's parent is the index, and the only route to it was
            # the "Guides" item in the nav - which on an article is marked
            # active, so it reads as "you are here" rather than as a way up.
            # So the chip returns here, and here only.
            back=' data-back-to="index.html"',
            **common(lang, p["slug"], ui, table))
        io.open(os.path.join(d, p["slug"]), "w", encoding="utf-8").write(finish_html(html, table, EN_TABLE))
        words = len(" ".join(re.sub(r"<[^>]+>", " ", p["body"]).split()).split())
        print("%-6s %-24s %5d words" % (lang, p["slug"], words))


import re
for _lang in LANGS:
    write_language(_lang)
