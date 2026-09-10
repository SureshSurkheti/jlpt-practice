# -*- coding: utf-8 -*-
"""Strip comments and slack whitespace from the CSS and JS before shipping.

The source files here are heavily commented on purpose - the comments are
where the reasoning lives, and they are worth more than the bytes. But they
are worth nothing to a browser: half of styles.css and half of
exam-player.js is prose, and every reader downloads it.

So the sources stay as they are and a stripped copy is written beside each
one, which is what the pages link to. 38 KB of gzipped CSS becomes 15, and
105 KB of gzipped JS becomes 55: a little over half the bytes on the wire,
from taking out the half of the file that is English.

Nothing here rewrites code. No renaming, no reordering, no collapsing of
`if` bodies, no dropping of semicolons or last-property braces - the output
is the input with the comments taken out and the runs of whitespace cut
down. That is where the whole saving is, and it is the part that cannot go
wrong for a reason nobody thought of.

Two things can go wrong, and both are about mistaking one kind of text for
another, so the scanners walk the file a character at a time and keep track
of what they are inside rather than pattern-matching for comments:

  - `"http://x"` contains a line comment and /[/*]/ contains a block one.
  - Whitespace inside a literal is part of the literal. A first draft of
    this squeezed the whole file at the end, which turned the indentation
    inside site.js's template literals into single newlines - invisible in
    the rendered HTML, and a changed string all the same.

So both scanners return a list of pieces, each marked as literal or not,
and only the pieces that are not literals are squeezed.
"""


def css(text):
    return _join(_scan_css(text))


def js(text):
    return _join(_scan_js(text))


def literals(text, is_js=True):
    """The literals the scanner found, in order. Used by the build to check
    its own work: minifying must not change a single one of them."""
    pieces = _scan_js(text) if is_js else _scan_css(text)
    return [t for lit, t in pieces if lit]


# --------------------------------------------------------------------------


def _scan_css(text):
    """(is_literal, text) pieces. A comment becomes a single space rather
    than nothing: `.a/*x*/.b` is two classes on one element and `.a.b` is a
    different selector, and `margin:0/*x*/auto` would become `0auto`."""
    out = []
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if c == "/" and text.startswith("/*", i):
            end = text.find("*/", i + 2)
            i = n if end == -1 else end + 2
            out.append((False, " "))
        elif c in "\"'":
            j = _end_of_quote(text, i, c)
            out.append((True, text[i:j]))
            i = j
        else:
            out.append((False, c))
            i += 1
    return out


# What can legally precede a regular expression literal. After a name, a
# number, or a closing bracket a `/` is division; after an operator, a comma
# or an opening brace it starts a regex.
_RE_OK_CHARS = set("(,=:[!&|?{};+-*%^~<>")
_RE_OK_WORDS = {"return", "typeof", "case", "in", "of", "new", "delete",
                "void", "instanceof", "do", "else", "yield", "await"}


def _scan_js(text):
    out = []
    i, n = 0, len(text)
    word = ""     # the identifier just passed, for the regex/division call
    last = ""     # the last non-space character
    while i < n:
        c = text[i]

        if c == "/" and i + 1 < n and text[i + 1] == "/":
            j = text.find("\n", i)
            out.append((False, "\n"))
            i = n if j == -1 else j + 1
            continue

        if c == "/" and i + 1 < n and text[i + 1] == "*":
            j = text.find("*/", i + 2)
            body = text[i:(n if j == -1 else j)]
            # A comment that spanned lines was a line break in the source,
            # and automatic semicolon insertion may have relied on it.
            out.append((False, "\n" if "\n" in body else " "))
            i = n if j == -1 else j + 2
            continue

        if c == "/" and (last in _RE_OK_CHARS or word in _RE_OK_WORDS):
            j = _end_of_regex(text, i)
            if j is not None:
                out.append((True, text[i:j]))
                last, word = "/", ""
                i = j
                continue

        if c in "\"'`":
            j = (_end_of_template(text, i) if c == "`"
                 else _end_of_quote(text, i, c))
            out.append((True, text[i:j]))
            last, word = c, ""
            i = j
            continue

        out.append((False, c))
        if not c.isspace():
            last = c
            word = (word + c) if (c.isalnum() or c in "_$") else ""
        i += 1
    return out


def _end_of_quote(text, i, q):
    n = len(text)
    j = i + 1
    while j < n:
        if text[j] == "\\":
            j += 2
            continue
        if text[j] == q:
            return j + 1
        j += 1
    return n


def _end_of_template(text, i):
    """A template literal, ${...} and all. The substitutions may contain
    nested templates and strings, so this counts braces rather than
    stopping at the first `}`."""
    n = len(text)
    j = i + 1
    while j < n:
        c = text[j]
        if c == "\\":
            j += 2
            continue
        if c == "`":
            return j + 1
        if c == "$" and j + 1 < n and text[j + 1] == "{":
            depth = 1
            j += 2
            while j < n and depth:
                d = text[j]
                if d == "\\":
                    j += 2
                    continue
                if d in "\"'":
                    j = _end_of_quote(text, j, d)
                    continue
                if d == "`":
                    j = _end_of_template(text, j)
                    continue
                depth += (d == "{") - (d == "}")
                j += 1
            continue
        j += 1
    return n


def _end_of_regex(text, i):
    """The end of a regex literal starting at `i`, or None if what is there
    turns out not to be one - an unterminated `/` before a line break is
    division, however the token before it looked."""
    n = len(text)
    j = i + 1
    klass = False
    while j < n:
        c = text[j]
        if c == "\\":
            j += 2
            continue
        if c == "\n":
            return None
        if c == "[":
            klass = True
        elif c == "]":
            klass = False
        elif c == "/" and not klass:
            j += 1
            while j < n and text[j].isalpha():   # flags
                j += 1
            return j
        j += 1
    return None


def _join(pieces):
    """The pieces back into a file, with runs of whitespace between them cut
    to one character - a newline where there was one, because JavaScript
    inserts semicolons at line ends and joining two lines can change what a
    program means. Literals are copied through untouched."""
    out = []
    pending = ""          # whitespace seen since the last real character
    for lit, text in pieces:
        if lit:
            if pending and out:
                out.append(pending)
            pending = ""
            out.append(text)
            continue
        for c in text:
            if c.isspace():
                pending = "\n" if (pending == "\n" or c == "\n") else " "
            else:
                if pending and out:
                    out.append(pending)
                pending = ""
                out.append(c)
    return "".join(out).strip()
