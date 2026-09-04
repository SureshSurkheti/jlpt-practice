# -*- coding: utf-8 -*-
"""Write guide/*.html.

Straight to the output directory, not through _src: _src holds the templates
that build_static.py runs the twelve-language pass over, and these pages do
not take that pass.

English only. The papers themselves are disallowed in robots.txt because the
questions are not ours to republish, which leaves the site with almost nothing
a search engine may read. These are written to be the indexable half: real
answers to questions people actually type, using facts the site already holds
so the two can never disagree.

No language picker in the header. Every other page has one because every other
page exists in twelve languages; these do not, and a picker here would send a
reader to /ja/guide/... and a 404. A machine translation of two thousand words
of exam advice is worse than no translation, so the honest thing is one
language, said once.
"""
import io, os

SITE = "https://jlpt.sureshsurkheti.com"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "guide")

HEAD = """<!DOCTYPE html>
<html lang="en">
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
    <link rel="alternate" hreflang="en" href="{url}" />
    <link rel="alternate" hreflang="x-default" href="{url}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="JLPT Practice" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:url" content="{url}" />
    <meta property="og:image" content="{site}/icon-512.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{desc}" />
    <meta name="twitter:image" content="{site}/icon-512.png" />
    <script type="application/ld+json">{ld}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/css/styles.css" />
  </head>
  <body class="guide-page">
    <header class="site-header">
      <div class="container nav-wrap">
        <a class="brand-wrap" href="../index.html" id="brandLink">
          <span class="brand-mark">JL</span>
          <span class="brand-text">
            <span class="brand-name">JLPT Practice</span>
            <span class="brand-tag">Guides</span>
          </span>
        </a>

        <nav class="main-nav" aria-label="Main navigation">
          <a href="../index.html" data-i18n="nav.home">Home</a>
          <a href="../levels.html" data-i18n="nav.levels">Levels</a>
          <a href="../exams.html" data-i18n="nav.exams">Exams</a>
          <a href="../study.html" data-i18n="nav.study">Study</a>
          <a href="../about.html" data-i18n="nav.about">About</a>
          <a class="nav-guides active" href="/guide/">Guides</a>
        </nav>
      </div>
    </header>

    <main class="container page-shell">
      <article class="guide">
        <p class="guide-kicker">JLPT guide</p>
        <h1>{h1}</h1>
        <p class="guide-standfirst">{standfirst}</p>
{body}
        <aside class="guide-cta">
          <h2>Try it on a real paper</h2>
          <p>Every practice paper on this site is marked section by section,
             so you can see the rule above applied to your own answers.</p>
          <div class="guide-cta-actions">
            <a class="btn btn-primary" href="../exams.html">Browse practice papers</a>
            <a class="btn btn-ghost" href="../levels.html">Compare the levels</a>
          </div>
        </aside>
        <nav class="guide-more" aria-label="More guides">
          <h2>More guides</h2>
          <ul>{more}</ul>
        </nav>
      </article>
    </main>

    <footer class="site-footer">
      <div class="container footer-inner">
        <div>© 2026 JLPT Practice</div>
        <div data-i18n="footer.tagline">Study smarter. Live better in Japan.</div>
      </div>
    </footer>

    <script src="/assets/js/i18n.js"></script>
    <script src="/assets/i18n/en.js"></script>
    <script src="/assets/js/site.js"></script>
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
       desc="Every JLPT level is marked out of 180, but the total is not what fails most people. How scaled scoring works, and the section minimum that fails candidates who beat the pass mark.",
       standfirst="Every level is out of 180 — and the total is not the rule that fails people.",
       body=SCORING),
  dict(slug="n4-to-n3.html",
       h1="N4 to N3: the biggest jump in the JLPT",
       title="JLPT N4 to N3 — Why It Is the Hardest Step, and What Changes",
       desc="N3 doubles the kanji and vocabulary of N4, but the change that catches people out is structural: reading becomes its own scored section with its own minimum.",
       standfirst="The kanji doubles. The thing that actually fails people is that reading becomes its own section.",
       body=N4N3),
  dict(slug="which-jlpt-level.html",
       h1="Which JLPT level should you take?",
       title="Which JLPT Level Should You Take? N5 to N1 Compared",
       desc="Choose a JLPT level by what the certificate is for, then check it against a real paper. What N2 is worth, when to skip a level, and the deadline that matters more than the exam date.",
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

def write_index():
    cards = '<ul class="guide-index">' + "".join(
        '<li><a href="%s"><b>%s</b><span>%s</span></a></li>' % (p["slug"], p["h1"], p["standfirst"])
        for p in PAGES) + "</ul>"
    html = HEAD.format(
        title="JLPT Guides — How the Exam Works",
        desc="How the JLPT is scored, why N4 to N3 is the hardest step, and which level to take. Written out in full, free to read.",
        url="%s/guide/" % SITE, site=SITE,
        h1="JLPT guides",
        standfirst="How the exam works, written out in full.",
        body=INDEX.format(cards=cards),
        more="".join('<li><a href="%s">%s</a></li>' % (q["slug"], q["h1"]) for q in PAGES),
        ld=json.dumps({"@context":"https://schema.org","@type":"CollectionPage",
                       "name":"JLPT Guides","inLanguage":"en",
                       "url":"%s/guide/" % SITE}, ensure_ascii=False, separators=(",",":")))
    # the index does not need a "more guides" list under a list of the same
    # three, nor a call to action it already is
    html = html.replace('<nav class="guide-more" aria-label="More guides">', '<nav hidden>')
    io.open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
    print("%-24s  index" % "index.html")

os.makedirs(OUT, exist_ok=True)
write_index()
for p in PAGES:
    others = [q for q in PAGES if q["slug"] != p["slug"]]
    more = "".join('<li><a href="%s">%s</a></li>' % (q["slug"], q["h1"]) for q in others)
    html = HEAD.format(
        title=p["title"], desc=p["desc"], url="%s/guide/%s" % (SITE, p["slug"]),
        site=SITE, h1=p["h1"], standfirst=p["standfirst"], body=p["body"],
        more=more, ld=ld_for(p))
    io.open(os.path.join(OUT, p["slug"]), "w", encoding="utf-8").write(html)
    words = len(" ".join(p["body"].split()).split())
    print("%-24s %4d words" % (p["slug"], words))
