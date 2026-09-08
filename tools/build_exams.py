#!/usr/bin/env python3
"""
Build clean, English-named exam data from the archived JLPT exam pages.

Reads:  .cache/source-pages/jlpt_n{1..4}_pages/*.html
Writes: data/exams/<id>.json        (one file per exam session)
        data/exams/index.json       (catalogue used by the site)

Each source session is made of up to three source files, named after the
exam id they belong to:
  "n1-2024-12-grammar-reading.html"
  "n1-2024-12-vocabulary.html"
  "n1-2024-12-listening.html"
and for the undated practice sets, "n4-practice-2-vocabulary.html".

Question metadata embedded in the source pages:
  div.question_list            -> question prompt
  div.answers#QS<n><c>         -> choice text
  div#AS<n>                    -> correct choice (1-4)
  div#diemso<n>                -> points
  div#GT<n>                    -> explanation / listening transcript
  div#type<n>                  -> 1 vocab, 2 grammar, 3 reading, 4 listening
"""

import json
import os
import re
import sys
import unicodedata
import collections
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "data", "exams")
# The scraped source pages live under .cache/, which is gitignored and is not
# part of the published site. They used to sit at the repository root, which
# meant 258 verbatim copies of someone else's pages were being served with a
# 200 - unlinked, but reachable by anyone who guessed a URL, and indexable.
# They are build input, so they belong with the other downloaded sources.
SRC_ROOT = os.path.join(".cache", "source-pages")
SRC_DIRS = [os.path.join(SRC_ROOT, "jlpt_n%d_pages" % n) for n in (1, 2, 3, 4)]

MONTHS = ["", "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]

TYPE_NAMES = {1: "vocabulary", 2: "grammar", 3: "reading", 4: "listening"}

# Tags kept inside question / passage HTML. Everything else is unwrapped.
ALLOWED_TAGS = {
    "br", "u", "b", "strong", "i", "em", "img", "table", "thead", "tbody",
    "tr", "td", "th", "ruby", "rt", "rb", "span", "sup", "sub", "p", "div",
    "ul", "ol", "li", "small",
}
ALLOWED_ATTRS = {
    "img": {"src", "alt", "width", "height", "loading", "decoding"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
    "table": {"border"},
}


# --------------------------------------------------------------------------
# source file naming
# --------------------------------------------------------------------------

KINDS = ("grammar-reading", "vocabulary", "listening")


def normalize(name):
    """NFC-normalize so accented names still compare on macOS."""
    return unicodedata.normalize("NFC", name)


def classify_source(filename):
    """Return (kind, level, period_key, period_label) or None.

    The files were once named in Vietnamese, after the site they were
    archived from ("Đề Từ Vựng N1 12_2024.html"). They now carry the exam id
    and the paper, which is the same shape the output files use.
    """
    name = normalize(filename)
    stem = name[:-5] if name.lower().endswith(".html") else name

    kind = next((k for k in KINDS if stem.endswith("-" + k)), None)
    if not kind:
        return None
    rest = stem[: -(len(kind) + 1)]

    # dated session: "n1-2024-12"
    m = re.match(r"^(n[1-5])-(\d{4})-(\d{2})$", rest)
    if m:
        level, year, month = m.group(1).upper(), int(m.group(2)), int(m.group(3))
        if not 1 <= month <= 12:
            return None
        return kind, level, f"{year:04d}-{month:02d}", f"{MONTHS[month]} {year}"

    # practice set: "n4-practice-2"
    m = re.match(r"^(n[1-5])-practice-(\d+)$", rest)
    if m:
        level, num = m.group(1).upper(), int(m.group(2))
        return kind, level, f"practice-{num}", f"Practice Test {num}"

    return None


# --------------------------------------------------------------------------
# HTML helpers
# --------------------------------------------------------------------------

# The source pages are generated from a template that delimits every block
# with one of these comments. Several pages contain unclosed <div> tags, so
# the comments - not tag depth alone - are the reliable block boundary.
SENTINEL_RE = re.compile(
    r"<!--\s*(?:bat dau mot ch|dong n|dong cau|dong c\xe1c|dong cho biet"
    r"|phan giai thich|dong cuoi cung)",
    re.I,
)


def block_boundary(html, after):
    """Index of the next template delimiter comment at/after `after`."""
    m = SENTINEL_RE.search(html, after)
    return m.start() if m else len(html)


def balanced_div(html, start, limit=None):
    """Given index of a '<div' opening tag, return (inner_html, end_index).

    Scanning never crosses `limit`; if the matching </div> is missing (the
    source HTML is not always well formed) the inner text is truncated at
    the last </div> before the boundary instead of swallowing later blocks.
    """
    open_end = html.find(">", start)
    if open_end == -1:
        return "", len(html)
    if limit is None or limit <= open_end:
        limit = len(html)

    depth = 1
    i = open_end + 1
    last_close = None
    token = re.compile(r"</?div\b", re.I)
    while True:
        m = token.search(html, i)
        if not m or m.start() >= limit:
            break
        if m.group(0).lower().startswith("</"):
            depth -= 1
            last_close = m.start()
            if depth == 0:
                close_end = html.find(">", m.end())
                return html[open_end + 1:m.start()], (
                    close_end + 1 if close_end != -1 else limit)
            i = m.end()
        else:
            depth += 1
            i = m.end()

    cut = last_close if last_close is not None else limit
    return html[open_end + 1:cut], limit


def absolutize(url):
    """Wayback-relative asset paths -> absolute archive URLs."""
    url = url.strip()
    if url.startswith("/web/"):
        return "https://web.archive.org" + url
    return url


# Characters that cannot occur in Japanese exam text and are clearly OCR or
# encoding damage in the source. Only applied to the Japanese fields - the
# explanations contain real Vietnamese, where these letters are legitimate.
JA_REPAIRS = {
    "ồ": "ー",   # ồ  -> ー   ("サồビス" => "サービス")
    "⺠": "民",   # ⺠  -> 民   (CJK radical form => the kanji)
}


def repair_japanese(text):
    for bad, good in JA_REPAIRS.items():
        text = text.replace(bad, good)
    return text


def clean_html(fragment, japanese=False):
    """Sanitize an exam fragment: drop chrome, keep formatting, fix asset URLs.

    `japanese=True` also repairs source encoding damage; leave it off for the
    explanation text, which is legitimately Vietnamese.
    """
    if not fragment:
        return ""

    s = fragment
    # remove elements that carry no exam content
    s = re.sub(r"<(script|style|noscript)\b.*?</\1\s*>", "", s, flags=re.I | re.S)
    # the source emits `</br>`, which is not a real tag
    s = re.sub(r"</br\s*>", "<br />", s, flags=re.I)
    s = re.sub(r"<input\b[^>]*>", "", s, flags=re.I)
    s = re.sub(r"</?(label|form|a)\b[^>]*>", "", s, flags=re.I)
    s = re.sub(r"<iframe\b.*?</iframe\s*>", "", s, flags=re.I | re.S)
    s = re.sub(r"<iframe\b[^>]*>", "", s, flags=re.I)

    def fix_tag(m):
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3) or ""
        if tag not in ALLOWED_TAGS:
            return ""
        if closing:
            return f"</{tag}>"
        keep = ALLOWED_ATTRS.get(tag, set())
        out = []
        for am in re.finditer(r'([a-zA-Z-]+)\s*=\s*"([^"]*)"', attrs):
            key, val = am.group(1).lower(), am.group(2)
            if key not in keep:
                continue
            if key == "src":
                val = absolutize(val)
            if key == "alt":
                # source alt text is the site's Vietnamese boilerplate
                val = "Exam figure"
            out.append(f'{key}="{val}"')
        if tag == "img":
            if not any(a.startswith("alt=") for a in out):
                out.append('alt="Exam figure"')
            # Every figure is a Wayback URL, and each one costs a 302 plus
            # 2-6 seconds and up to 375KB - measured, not guessed. A listening
            # 問題 carries up to ten of them, and the browser will only open
            # about six connections to a host, so they queue. Deferring the
            # ones below the fold means a section starts with the one or two
            # you can actually see instead of all ten.
            out.append('loading="lazy"')
            out.append('decoding="async"')
        selfclose = " /" if tag in ("br", "img") else ""
        return f"<{tag}{(' ' + ' '.join(out)) if out else ''}{selfclose}>"

    s = re.sub(r"<(/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)/?>", fix_tag, s)

    s = re.sub(r"&nbsp;", " ", s)
    s = re.sub(r"[ \t]*\n[ \t]*", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r"[ \t]{2,}", " ", s)
    if japanese:
        s = repair_japanese(s)
    return s.strip()


def text_of(fragment):
    s = re.sub(r"<[^>]+>", "", fragment or "")
    s = s.replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", s).strip()


def strip_choice_number(text):
    """'1) ...' / '1.' / '1、' -> bare choice text."""
    return re.sub(r"^\s*[1-4１-４]\s*[).、．,]\s*", "", text).strip()


PROMPT_NUM_RE = re.compile(
    r"^\s*(?:<br\s*/?>\s*)*"          # stray leading breaks
    r"\(?(\d{1,2})\s*(番|[).）、．.])\s*",
    re.I,
)


def split_prompt_number(prompt):
    """Separate the paper's own question number from the prompt text.

    Sources write prompts as '1) ...', '45. ...' or '1番' (listening). The
    player already shows its own counter, so the paper number is kept apart
    and rendered as a small badge instead of reading like a first option.
    """
    m = PROMPT_NUM_RE.match(prompt or "")
    if not m:
        return None, (prompt or "").strip()
    label = m.group(1) + ("番" if m.group(2) == "番" else "")
    return label, prompt[m.end():].strip()


# --------------------------------------------------------------------------
# parsing one source file
# --------------------------------------------------------------------------

BLOCK_RE = re.compile(
    r'<div\s+class="(big_item|question_content|question_list|answer_\d+row)"'
    r'|<div\s+class="answers"\s+id="QS(\d+)"'
    r'|<div\s+style="display:none[^"]*"\s+id="(AS|diemso|GT|type)(\d+)"',
    re.I,
)


# The booklet prints a worked example at the head of some 問題 - "(例)" with
# the answer already filled in - to show how the question type works. It is a
# demonstration, not a question.
EXAMPLE_ITEM = re.compile(r"^\s*[（(]\s*例\s*[)）]")


def parse_source(path):
    """Return (questions, note). questions is [] for placeholder pages."""
    raw = open(path, encoding="utf-8", errors="replace").read()

    total = re.search(r'id="totalQUestion">\s*(\d+)\s*<', raw)
    declared = int(total.group(1)) if total else 0

    start = raw.find('<form name="dttn"')
    if start == -1:
        return [], "no exam form found"
    end = raw.find('id="totalQUestion"', start)
    body = raw[start:end if end != -1 else len(raw)]

    # Some snapshots use a template with no totalQUestion marker, so treat the
    # presence of real question markup as the test for content, and use the
    # declared count only as a sanity check afterwards.
    if declared == 0 and 'class="question_list"' not in body:
        return [], "placeholder page (exam not archived)"

    # audio embeds live in big_item iframes (Google Drive players via Wayback)
    instruction = None
    audio = None
    passage = None
    questions = {}
    order = []

    cursor = 0
    for m in BLOCK_RE.finditer(body):
        if m.start() < cursor:
            continue

        cls = m.group(1)
        if cls:
            cls = cls.lower()
            if cls.startswith("answer_"):
                # container only - its choice divs are matched by the QS branch
                continue
            inner, cursor = balanced_div(
                body, m.start(), block_boundary(body, m.end()))

            if cls == "big_item":
                srcs = re.findall(r'<iframe[^>]+src="([^"]+)"', inner, re.I)
                audio = absolutize(srcs[0]) if srcs else None
                instruction = clean_html(inner, japanese=True)
                passage = None
            elif cls == "question_content":
                passage = clean_html(inner, japanese=True)
            elif cls == "question_list":
                pending = clean_html(inner, japanese=True)
                order.append(("prompt", pending))
            # answer_Nrow: choices are picked up by the QS branch below
            continue

        if m.group(2):  # a choice div
            ident = m.group(2)
            inner, cursor = balanced_div(
                body, m.start(), block_boundary(body, m.end()))
            # QS<n><c>: last digit is the choice index
            qn, cn = ident[:-1], ident[-1]
            if not qn:
                continue
            q = questions.setdefault(int(qn), {})
            q.setdefault("choices", {})[int(cn)] = strip_choice_number(
                clean_html(inner, japanese=True))
            if "instruction" not in q:
                q["instruction"] = instruction
                q["passage"] = passage
                q["audio"] = audio
                if order and order[-1][0] == "prompt":
                    q["prompt"] = order[-1][1]
            continue

        key, qn = m.group(3), int(m.group(4))
        inner, cursor = balanced_div(
            body, m.start(), block_boundary(body, m.end()))
        q = questions.setdefault(qn, {})
        if key == "AS":
            try:
                q["answer"] = int(text_of(inner))
            except ValueError:
                pass
        elif key == "diemso":
            try:
                q["points"] = int(text_of(inner))
            except ValueError:
                pass
        elif key == "type":
            try:
                q["type"] = int(text_of(inner))
            except ValueError:
                pass
        elif key == "GT":
            q["explanation"] = clean_html(inner)

    out = []
    for qn in sorted(questions):
        q = questions[qn]
        choices = q.get("choices") or {}
        if len(choices) < 2 or not q.get("prompt"):
            continue

        # Worked examples are not questions. Six were being served as though
        # they were - all in n4-practice-1 - which inflated that paper's total
        # by six and put three items in it with no answer key at all, so they
        # could never be right however you answered them.
        if EXAMPLE_ITEM.match(text_of(q["prompt"])):
            continue

        category = TYPE_NAMES.get(q.get("type"), "vocabulary")

        # Outside listening, every JLPT item has exactly four options. Three
        # questions in 8,172 came out of the parser with two, three or six,
        # and in each case the options had been mis-split: two of them had
        # several options merged into one string, which moves every option
        # after the merge and leaves the answer index pointing at the wrong
        # text; the third was unusable fragments. A question that marks a
        # right answer wrong is worse than a question that is not there.
        # Listening is exempt - 問題4 and 問題5 really do have three.
        if category != "listening" and len(choices) != 4:
            continue

        answer = q.get("answer")
        if not answer or answer not in choices:
            answer = None
        number, prompt = split_prompt_number(q["prompt"])
        out.append({
            "n": qn,
            "number": number,
            "prompt": prompt,
            "passage": q.get("passage") or None,
            "instruction": q.get("instruction") or None,
            "audio": q.get("audio") or None,
            "choices": [choices.get(i, "") for i in sorted(choices)],
            "answer": answer,
            "points": q.get("points") or 1,
            "category": category,
            "explanation": q.get("explanation") or None,
        })

    note = None
    if declared and len(out) != declared:
        note = f"parsed {len(out)} of {declared} declared questions"
    elif not declared and out:
        note = f"no declared count in source; parsed {len(out)} questions"
    return out, note


# --------------------------------------------------------------------------
# the pages the site used to serve
# --------------------------------------------------------------------------

# Two 読解 pages exist in the archive only as snapshots from 2018 and 2019,
# taken before the site was rebuilt. Everything since is the placeholder that
# says the year is being updated, so these are the only copies there are.
#
# The old page is a plain <table>: a bold row for each 問題 heading, a row per
# question whose <td> carries the printed number and the question, a hidden
# diemso/AS/type div beside it, and the four options as <label id="QS<n><c>">.
# The wrappers the modern parser looks for - big_item, question_list, answers
# - do not exist, which is why parse_source calls it a placeholder.
#
# Two things it does not have: explanations, and a usable type marker (every
# question on the page is tagged 2, grammar, whatever it actually is). So the
# 問題 heading decides, and the caller drops the groups the paper already has
# from another page.

LEGACY_ROW = re.compile(
    r'style="font-weight:bold[^"]*"[^>]*>(?P<head>.*?)</td>'
    # Not every full-width cell is prose: when the four options are set one
    # per row they are full-width too, and a plain .*? here swallowed 148 of
    # the 172 <label>s on the page. A cell holding an <input> is a choice row,
    # and belongs to the QS branch below.
    r'|<td colspan="2">(?P<cell>(?:(?!</td>|<input)[\s\S])*?)</td>'
    r'|id="diemso(?P<dq>\d+)"[^>]*>\s*(?P<pts>\d+)'
    r'|id="QS(?P<qn>\d+)(?P<cn>\d)"[^>]*>(?P<choice>.*?)</label>'
    r'|id="AS(?P<aq>\d+)"[^>]*>\s*(?P<ans>\d+)',
    re.I | re.S,
)

# A cell is the question itself when a hidden points div follows it inside the
# same row; anything else that long is the passage the questions hang off.
def parse_legacy(path):
    """Parse a pre-2020 page. Returns (questions, note) like parse_source."""
    raw = open(path, encoding="utf-8", errors="replace").read()
    start = raw.find('<form name="dttn"')
    if start == -1:
        return [], "no exam form found"
    body = raw[start:]

    instruction = None
    passage = None
    last_cell = None
    questions = {}

    for m in LEGACY_ROW.finditer(body):
        if m.group("head") is not None:
            head = clean_html(m.group("head"), japanese=True)
            if re.match(r"\s*問題", text_of(head)):
                instruction = head
                passage = None
                last_cell = None
            continue

        if m.group("cell") is not None:
            # Cells arrive in booklet order: the passage, then the question
            # that hangs off it. So a cell still unclaimed when the next one
            # turns up was the passage - the question rows claim theirs at
            # the hidden points div a moment later.
            cell = clean_html(m.group("cell"), japanese=True)
            if last_cell is not None:
                passage = last_cell
            last_cell = cell
            continue

        if m.group("dq"):
            # the cell just before it was this question, not a passage
            qn = int(m.group("dq"))
            q = questions.setdefault(qn, {})
            q["points"] = int(m.group("pts"))
            q["prompt"] = last_cell
            q["instruction"] = instruction
            q["passage"] = passage
            last_cell = None
            continue

        if m.group("qn"):
            qn, cn = int(m.group("qn")), int(m.group("cn"))
            q = questions.setdefault(qn, {})
            q.setdefault("choices", {})[cn] = strip_choice_number(
                clean_html(m.group("choice"), japanese=True))
            if last_cell is not None:
                passage = last_cell
                last_cell = None
            continue

        if m.group("aq"):
            questions.setdefault(int(m.group("aq")), {})["answer"] = \
                int(m.group("ans"))

    out = []
    for qn in sorted(questions):
        q = questions[qn]
        choices = q.get("choices") or {}
        if len(choices) != 4 or not q.get("prompt"):
            continue
        if EXAMPLE_ITEM.match(text_of(q["prompt"])):
            continue
        answer = q.get("answer")
        if not answer or answer not in choices:
            answer = None
        number, prompt = split_prompt_number(q["prompt"])
        out.append({
            "n": qn,
            "number": number,
            "prompt": prompt,
            "passage": q.get("passage") or None,
            "instruction": q.get("instruction") or None,
            "audio": None,
            "choices": [choices[i] for i in sorted(choices)],
            "answer": answer,
            "points": q.get("points") or 1,
            "category": "reading",
            "explanation": None,
        })

    # The old page prints the booklet number with no punctuation after it
    # ("55 冷水で顔を洗う...") about as often as with it ("57. 大手..."), and a
    # bare number followed by a space is not something split_prompt_number
    # will take on trust: a sentence may legitimately open with a numeral.
    # Here it can be checked rather than guessed. The printed numbers run
    # consecutively down the page, so one is only taken when it is the next
    # in that run - otherwise the number stayed in the prompt and read like a
    # first option beside the badge.
    expect = None
    for q in out:
        if q["number"] is None:
            m = re.match(r"\s*(?:<br\s*/?>\s*)*(\d{1,2})\s+(?=\S)", q["prompt"] or "")
            if m and (expect is None or int(m.group(1)) == expect):
                q["number"] = m.group(1)
                q["prompt"] = q["prompt"][m.end():].strip()
        if q["number"] and str(q["number"]).isdigit():
            expect = int(q["number"]) + 1

    if not out:
        return [], "legacy layout: nothing parsed"
    return out, "legacy layout: %d questions, and it carries no explanations" % len(out)


def is_legacy_page(path):
    """True for a snapshot taken before the source site was rebuilt."""
    raw = open(path, encoding="utf-8", errors="replace").read()
    return 'id="diemso' in raw and 'class="question_list"' not in raw


def group_tag(instruction):
    m = re.match(r"\s*(問題\s*[0-9０-９]+)", text_of(instruction or ""))
    return re.sub(r"\s+", "", m.group(1)) if m else None


# --------------------------------------------------------------------------
# hand-authored exams
# --------------------------------------------------------------------------

MANUAL_DIR = os.path.join(ROOT, "data", "exams-manual")

REQUIRED_Q = ("prompt", "choices", "answer")


def validate_manual(exam, path):
    """Check a hand-written exam. Returns a list of problem strings."""
    errs = []
    where = os.path.basename(path)

    for field in ("id", "level", "periodLabel", "parts"):
        if not exam.get(field):
            errs.append(f"{where}: missing top-level '{field}'")
    if errs:
        return errs

    if not re.match(r"^[a-z0-9][a-z0-9-]*$", str(exam["id"])):
        errs.append(f"{where}: id must be lowercase letters, digits, hyphens")
    if exam["level"] not in ("N1", "N2", "N3", "N4", "N5"):
        errs.append(f"{where}: level must be N1-N5, got {exam['level']!r}")
    if not isinstance(exam["parts"], list) or not exam["parts"]:
        errs.append(f"{where}: 'parts' must be a non-empty list")
        return errs

    for pi, part in enumerate(exam["parts"]):
        tag = f"{where} part[{pi}]"
        if part.get("id") not in PART_LABEL:
            errs.append(f"{tag}: id must be one of {sorted(PART_LABEL)}")
        questions = part.get("questions")
        if not isinstance(questions, list) or not questions:
            errs.append(f"{tag}: 'questions' must be a non-empty list")
            continue
        for qi, q in enumerate(questions):
            qtag = f"{tag} q[{qi}]"
            for field in REQUIRED_Q:
                if q.get(field) in (None, "", []):
                    errs.append(f"{qtag}: missing '{field}'")
            choices = q.get("choices")
            if isinstance(choices, list):
                if not 2 <= len(choices) <= 4:
                    errs.append(f"{qtag}: needs 2-4 choices, got {len(choices)}")
                ans = q.get("answer")
                if isinstance(ans, int) and not 1 <= ans <= len(choices):
                    errs.append(f"{qtag}: answer {ans} is outside 1-{len(choices)}")
                elif not isinstance(ans, int):
                    errs.append(f"{qtag}: answer must be an integer 1-4")
            cat = q.get("category", "vocabulary")
            if cat not in TYPE_NAMES.values():
                errs.append(f"{qtag}: category must be one of "
                            f"{sorted(set(TYPE_NAMES.values()))}")
    return errs


def audio_coverage(questions):
    """How many of a part's 問題 sections actually have a recording.

    The unit that matters is the section, not the question: one recording
    covers a whole 問題 - six questions in sequence - so counting questions
    made a paper with a single surviving file look almost complete. Sections
    are grouped exactly as buildSections() in exam-player.js groups them, on
    a change of instruction or category, so the two cannot disagree about
    what a section is.
    """
    sections = []
    last_key = object()
    for q in questions:
        key = (q.get("instruction") or None, q.get("category"))
        if key != last_key:
            sections.append([])
            last_key = key
        sections[-1].append(q)
    listening = [sec for sec in sections
                 if sec and sec[0].get("category") == "listening"]
    return (len(listening),
            sum(1 for sec in listening if any(q.get("audio") for q in sec)))


def load_manual():
    """Read data/exams-manual/*.json. Returns (exams, warnings)."""
    exams, warnings = [], []
    if not os.path.isdir(MANUAL_DIR):
        return exams, warnings

    for fn in sorted(os.listdir(MANUAL_DIR)):
        if not fn.endswith(".json"):
            continue
        path = os.path.join(MANUAL_DIR, fn)
        try:
            exam = json.load(open(path, encoding="utf-8"))
        except ValueError as e:
            warnings.append(f"{fn}: not valid JSON - {e}")
            continue

        errs = validate_manual(exam, path)
        if errs:
            warnings.extend(errs)
            continue

        # normalise: fill in what the player expects
        total = 0
        for part in exam["parts"]:
            part.setdefault("label", PART_LABEL[part["id"]])
            part.setdefault("source", "hand-authored")
            for n, q in enumerate(part["questions"], 1):
                q.setdefault("n", n)
                q.setdefault("number", None)
                q.setdefault("passage", None)
                q.setdefault("instruction", None)
                q.setdefault("audio", None)
                q.setdefault("points", 1)
                q.setdefault("category", "vocabulary")
                q.setdefault("explanation", None)
                total += 1

        exam["totalQuestions"] = total
        # The library lays a paper out by skill, and reads these to do it. The
        # scraped path built them and this one did not, so every hand-authored
        # paper arrived in the listing with an empty set and was drawn as
        # having no vocabulary, no grammar, no reading and no listening - all
        # four in red - however many questions it actually held.
        counts = collections.Counter(
            q["category"] for part in exam["parts"] for q in part["questions"]
        )
        exam["categoryCounts"] = dict(counts)
        exam.setdefault("period", exam["id"])
        exam.setdefault("title", f"JLPT {exam['level']} — {exam['periodLabel']}")
        # never claim official provenance for a hand-written paper
        exam["origin"] = "practice"
        exams.append(exam)

    return exams, warnings


# --------------------------------------------------------------------------
# build
# --------------------------------------------------------------------------

PART_ORDER = {"vocabulary": 0, "grammar-reading": 1, "listening": 2}
PART_LABEL = {
    "vocabulary": "Vocabulary (文字・語彙)",
    "grammar-reading": "Grammar & Reading (文法・読解)",
    "listening": "Listening (聴解)",
}


def main():
    sessions = defaultdict(dict)   # (level, period) -> {kind: path}
    labels = {}
    skipped = []

    for d in SRC_DIRS:
        folder = os.path.join(ROOT, d)
        if not os.path.isdir(folder):
            continue
        for fn in sorted(os.listdir(folder)):
            if not fn.lower().endswith(".html"):
                continue
            info = classify_source(fn)
            if not info:
                skipped.append(os.path.join(d, fn))
                continue
            kind, level, period, label = info
            sessions[(level, period)][kind] = os.path.join(folder, fn)
            labels[(level, period)] = label

    os.makedirs(OUT_DIR, exist_ok=True)
    index = []
    warnings = []

    for (level, period), files in sorted(sessions.items()):
        label = labels[(level, period)]
        exam_id = f"{level.lower()}-{period}"
        parts = []
        counts = defaultdict(int)

        seen_groups = set()

        for kind in sorted(files, key=lambda k: PART_ORDER.get(k, 9)):
            questions, note = parse_source(files[kind])
            rel = os.path.relpath(files[kind], ROOT)

            # The modern page for this part may be the "being updated"
            # placeholder while an old snapshot of it still has the questions.
            # Only 読解 is ever recovered this way, and only what the paper is
            # actually missing: the old page runs 問題7 to 問題14, and 問題7-9
            # have already arrived on the vocabulary page, so the 問題 headings
            # this paper has seen are dropped rather than duplicated.
            if not questions and is_legacy_page(files[kind]):
                questions, note = parse_legacy(files[kind])
                kept = []
                for q in questions:
                    if group_tag(q["instruction"]) in seen_groups:
                        continue
                    # 問題14 sets its questions against a page of listings that
                    # the old layout does not carry. Four options and nothing
                    # to read them against is not a question.
                    if not q.get("passage"):
                        continue
                    kept.append(q)
                dropped = len(questions) - len(kept)
                questions = kept
                if note:
                    note += f", kept {len(kept)}, dropped {dropped}"

            if note:
                warnings.append(f"{rel}: {note}")
            if not questions:
                continue
            for q in questions:
                counts[q["category"]] += 1
                tag = group_tag(q["instruction"])
                if tag:
                    seen_groups.add(tag)
            parts.append({
                "id": kind,
                "label": PART_LABEL[kind],
                "source": rel,
                "questions": questions,
            })

        total = sum(len(p["questions"]) for p in parts)
        if total == 0:
            warnings.append(f"{exam_id}: no questions in any part - exam skipped")
            continue

        if period.startswith("practice-"):
            title = f"JLPT {level} — {label}"
            sort_key = period
        else:
            title = f"JLPT {level} — {label}"
            sort_key = period

        exam = {
            "id": exam_id,
            "origin": "archive",
            "level": level,
            "title": title,
            "period": period,
            "periodLabel": label,
            "totalQuestions": total,
            "categoryCounts": dict(counts),
            "parts": parts,
        }

        with open(os.path.join(OUT_DIR, exam_id + ".json"), "w", encoding="utf-8") as f:
            json.dump(exam, f, ensure_ascii=False, separators=(",", ":"))

        index.append({
            "id": exam_id,
            "origin": "archive",
            "level": level,
            "title": title,
            "period": period,
            "periodLabel": label,
            "totalQuestions": total,
            # Per-skill counts in the index too, so the library can lay a
            # paper out the way the JLPT is actually sat - which is not how
            # the archive split the booklets. At N1 and N2 the "vocabulary"
            # booklet carries the grammar questions as well, and the real
            # sitting combines language knowledge and reading into one
            # paper; at N3 and below they are separate papers. Only the
            # categories know that.
            "categoryCounts": dict(counts),
            # How many of this part's questions actually have a recording.
            # A listening booklet with no audio in it is not a listening
            # section, and the library has to be able to say so: one paper
            # (n4-practice-2) carried 28 listening questions and not one
            # sound file, and the site advertised it as having listening
            # because the booklet existed.
            "parts": [dict(zip(
                ("id", "label", "count", "audio", "sections", "audioSections"),
                (p["id"], p["label"], len(p["questions"]),
                 sum(1 for q in p["questions"] if q.get("audio")))
                + audio_coverage(p["questions"]))) for p in parts],
            "sortKey": sort_key,
        })

    # ---- hand-authored exams --------------------------------------------
    manual, manual_warnings = load_manual()
    warnings.extend(manual_warnings)

    for exam in manual:
        with open(os.path.join(OUT_DIR, exam["id"] + ".json"), "w",
                  encoding="utf-8") as f:
            json.dump(exam, f, ensure_ascii=False, separators=(",", ":"))
        index.append({
            "id": exam["id"],
            "origin": "practice",
            "level": exam["level"],
            "title": exam["title"],
            "period": exam["period"],
            "periodLabel": exam["periodLabel"],
            "totalQuestions": exam["totalQuestions"],
            # Per-skill counts in the index too, so the library can lay a
            # paper out the way the JLPT is actually sat - which is not how
            # the archive split the booklets. At N1 and N2 the "vocabulary"
            # booklet carries the grammar questions as well, and the real
            # sitting combines language knowledge and reading into one
            # paper; at N3 and below they are separate papers. Only the
            # categories know that.
            "categoryCounts": exam.get("categoryCounts") or {},
            # How many of this part's questions actually have a recording.
            # A listening booklet with no audio in it is not a listening
            # section, and the library has to be able to say so: one paper
            # (n4-practice-2) carried 28 listening questions and not one
            # sound file, and the site advertised it as having listening
            # because the booklet existed.
            "parts": [dict(zip(
                ("id", "label", "count", "audio", "sections", "audioSections"),
                (p["id"], p["label"], len(p["questions"]),
                 sum(1 for q in p["questions"] if q.get("audio")))
                + audio_coverage(p["questions"]))) for p in exam["parts"]],
            "sortKey": exam["period"],
        })

    index.sort(key=lambda e: (e["level"], e["sortKey"]), reverse=True)
    with open(os.path.join(OUT_DIR, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"exams": index}, f, ensure_ascii=False, indent=1)

    # ---- report -------------------------------------------------------
    print(f"sessions found : {len(sessions)}")
    if manual:
        print(f"hand-authored  : {len(manual)}")
    print(f"exams written  : {len(index)}")
    print(f"questions total: {sum(e['totalQuestions'] for e in index)}")
    by_level = defaultdict(lambda: [0, 0])
    for e in index:
        by_level[e["level"]][0] += 1
        by_level[e["level"]][1] += e["totalQuestions"]
    for lv in sorted(by_level):
        print(f"  {lv}: {by_level[lv][0]:>3} exams, {by_level[lv][1]:>5} questions")
    if skipped:
        print(f"\nunrecognised filenames ({len(skipped)}):")
        for s in skipped[:10]:
            print("  ", s)
    if warnings:
        print(f"\nnotes ({len(warnings)}):")
        for w in warnings[:40]:
            print("  ", w)
        if len(warnings) > 40:
            print(f"   ... and {len(warnings) - 40} more")
    return 0


if __name__ == "__main__":
    sys.exit(main())
