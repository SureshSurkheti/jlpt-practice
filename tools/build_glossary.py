#!/usr/bin/env python3
"""
Build per-exam English word glossaries for the JLPT papers.

For every question the paper shows in Japanese - prompt, reading passage,
answer choices and (for listening) the Japanese transcript - this finds the
words a learner at that level would not yet know, and writes the reading
(as furigana) plus a short English meaning.

Easy words are deliberately left out. "Easy" is not a guess: every word is
looked up in a JLPT level list, and a word is kept only when it is at the
paper's own level or harder. On an N3 paper that means N3/N2/N1 words are
glossed and N4/N5 words are skipped. Words in no list at all are kept, on the
grounds that an unlisted word is far more often rare than trivial.

Data sources (both downloaded once into data/dict/):
  jmdict-eng   readings, English glosses, part of speech, common flag
               https://github.com/scriptin/jmdict-simplified  (CC BY-SA 4.0)
  jlpt-vocab   word -> JLPT level, 8385 words
               https://github.com/wkei/jlpt-vocab-api

Requires the janome tokenizer for word segmentation and base forms:
    pip3 install janome

Run from the project root:
    python3 tools/build_glossary.py

Writes data/glossary/<exam-id>.json, one file per exam, fetched by the exam
player only when the reader asks for word meanings.
"""

import json
import os
import re
import sys
import unicodedata
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAM_DIR = os.path.join(ROOT, "data", "exams")
DICT_DIR = os.path.join(ROOT, "data", "dict")
OUT_DIR = os.path.join(ROOT, "data", "glossary")

# Levels to build.
LEVELS = ("N1", "N2", "N3")

# ---------------------------------------------------------------------------
# text helpers
# ---------------------------------------------------------------------------

TAG_RE = re.compile(r"<[^>]+>")
ENTITY_RE = re.compile(r"&(?:amp|lt|gt|quot|nbsp|#39);")
ENTITIES = {"&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
            "&nbsp;": " ", "&#39;": "'"}

# Runs of Japanese: kana, kanji, the iteration mark, prolonged sound mark.
JA_RUN_RE = re.compile(
    r"[぀-ゟ゠-ヿ々ー一-鿿ｦ-ﾟ]+")
KANJI_RE = re.compile(r"[々一-鿿]")
KATAKANA_RE = re.compile(r"^[゠-ヿー]+$")


def strip_html(text):
    if not text:
        return ""
    text = text.replace("<br />", "\n").replace("<br>", "\n")
    text = TAG_RE.sub(" ", text)
    text = ENTITY_RE.sub(lambda m: ENTITIES.get(m.group(0), " "), text)
    return text


def to_hiragana(text):
    """Katakana -> hiragana, leaving everything else alone."""
    out = []
    for ch in text:
        code = ord(ch)
        if 0x30a1 <= code <= 0x30f6:
            out.append(chr(code - 0x60))
        else:
            out.append(ch)
    return "".join(out)


def japanese_only(text):
    """The Japanese runs of a mixed-language string, space separated.

    Vietnamese explanation text is discarded this way while the Japanese it
    quotes is kept.
    """
    return " ".join(JA_RUN_RE.findall(strip_html(text)))


def has_kanji(text):
    return bool(KANJI_RE.search(text))


# ---------------------------------------------------------------------------
# furigana
# ---------------------------------------------------------------------------

def ruby_segments(surface, reading):
    """Split a word into [text, reading] pairs so furigana sits over kanji only.

    続ける + つづける -> [["続", "つづ"], ["ける", ""]]

    Returns None when the reading cannot be aligned (irregular readings,
    okurigana oddities); the caller then rubies the whole word instead.
    """
    if not surface or not reading:
        return None
    runs = []
    for ch in surface:
        kind = "kanji" if KANJI_RE.match(ch) else "kana"
        if runs and runs[-1][0] == kind:
            runs[-1][1] += ch
        else:
            runs.append([kind, ch])

    segments = []
    pos = 0
    i = 0
    while i < len(runs):
        kind, text = runs[i]
        if kind == "kana":
            hira = to_hiragana(text)
            if not reading.startswith(hira, pos):
                return None
            segments.append([text, ""])
            pos += len(hira)
            i += 1
            continue
        # A kanji run: its reading ends where the next kana run begins.
        if i + 1 < len(runs):
            nxt = to_hiragana(runs[i + 1][1])
            at = reading.find(nxt, pos + 1)
            if at < 0:
                return None
            segments.append([text, reading[pos:at]])
            pos = at
        else:
            segments.append([text, reading[pos:]])
            pos = len(reading)
        i += 1

    if pos != len(reading):
        return None
    return segments


# ---------------------------------------------------------------------------
# dictionaries
# ---------------------------------------------------------------------------

POS_LABEL = [
    ("adj-i", "adj"), ("adj-na", "adj"), ("adj-no", "adj"), ("adj-t", "adj"),
    ("adj-f", "adj"), ("adj-pn", "adj"),
    ("adv", "adv"), ("aux", "aux"), ("conj", "conj"), ("ctr", "counter"),
    ("exp", "expr"), ("int", "interj"), ("n", "noun"), ("num", "num"),
    ("pn", "pron"), ("pref", "prefix"), ("prt", "particle"),
    ("suf", "suffix"), ("v1", "verb"), ("v5", "verb"), ("vk", "verb"),
    ("vs", "verb"), ("vt", "verb"), ("vi", "verb"), ("vz", "verb"),
]


def pos_label(tags):
    for tag in tags:
        for prefix, label in POS_LABEL:
            if tag == prefix or tag.startswith(prefix + "-"):
                return label
    return ""


def load_jmdict(path):
    """surface -> candidate entries, best first.

    Several entries share a surface (文 is ふみ, ぶん and あや), so every
    candidate is kept and the reading decides which one applies. Ranking puts
    kanji headwords before kana ones - a kana spelling collides with
    homophones far more often - and common before rare.
    """
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)

    index = {}

    def offer(surface, entry, rank):
        index.setdefault(surface, []).append((rank, entry))

    for word in data["words"]:
        senses = []
        for sense in word["sense"]:
            glosses = [g["text"] for g in sense["gloss"] if g["lang"] == "eng"]
            if not glosses:
                continue
            senses.append((sense["partOfSpeech"], glosses,
                           sense.get("misc", [])))
        if not senses:
            continue
        # Archaic / obsolete-only entries are noise in a study glossary.
        if all(any(m in ("arch", "obs", "obsc", "rare") for m in s[2])
               for s in senses):
            continue

        pos = pos_label(senses[0][0])
        # Up to three meanings: the first sense in full, then the leading
        # gloss of each later sense until full. Sense one alone is often too
        # thin - JMdict lists 割る sense 1 as just "to divide", while the
        # meaning on this paper ("broke it") is sense 3 - but listing every
        # gloss of every sense buries the word in near-synonyms.
        glosses = []
        for g in senses[0][1]:
            if g not in glosses and len(glosses) < 3:
                glosses.append(g)
        for _, gl, _ in senses[1:]:
            if len(glosses) >= 3:
                break
            if gl and gl[0] not in glosses:
                glosses.append(gl[0])
        base = {"g": glosses, "p": pos}

        readings = [to_hiragana(k["text"]) for k in word["kana"]] or [""]
        for kanji in word["kanji"]:
            entry = dict(base, r=readings[0], c=bool(kanji.get("common")))
            offer(kanji["text"], entry, 0 if kanji.get("common") else 2)
        for kana in word["kana"]:
            entry = dict(base, r=to_hiragana(kana["text"]),
                         c=bool(kana.get("common")))
            offer(kana["text"], entry, 1 if kana.get("common") else 3)

    out = {}
    for surface, cands in index.items():
        cands.sort(key=lambda c: c[0])
        out[surface] = [c[1] for c in cands[:4]]
    return out


def load_jlpt(path):
    """word/reading -> level number (5 = easiest).

    The easiest level any list claims wins: if a word appears at N5 in one
    list and N2 in another, a learner who met it at N5 already knows it.
    """
    with open(path, encoding="utf-8") as fh:
        rows = json.load(fh)
    by_word = {}
    by_reading = {}

    def note(table, key, level):
        if key and level > table.get(key, 0):
            table[key] = level

    for row in rows:
        level = row.get("level")
        if not level:
            continue
        note(by_word, (row.get("word") or "").strip(), level)
        note(by_reading, to_hiragana((row.get("furigana") or "").strip()), level)
    return by_word, by_reading


# ---------------------------------------------------------------------------
# what counts as a word worth glossing
# ---------------------------------------------------------------------------

# Function words and bare grammatical scaffolding. Most are N5 in the level
# list and filtered anyway; these are the ones that slip through unlisted.
STOP = set("""
する ある いる なる いう おる くる ゆく できる される いたす ください
こと もの ところ ため よう そう はず わけ うち ほう つもり かた
これ それ あれ どれ ここ そこ あそこ どこ こちら そちら どちら
この その あの どの こんな そんな あんな どんな
わたし わたくし ぼく おれ あなた きみ かれ かのじょ みなさん
だれ なに なぜ いつ どう いかが
ない よい いい ほしい らしい みたい そうだ ようだ
さん さま くん ちゃん など まま ずつ ごと たち ら
しまう おく みる くれる もらう あげる いただく くださる なさる ござる
いらっしゃる おこなう つづける はじめる
一 二 三 四 五 六 七 八 九 十 百 千 万 億 番 個 人 名 回 度 円
""".split())

# Tokens janome tags as content words but which carry no lookup value.
DROP_POS2 = {"非自立", "接尾", "代名詞", "数", "固有名詞", "特殊", "副助詞",
             "接続助詞", "助詞類接続"}
KEEP_POS1 = {"名詞", "動詞", "形容詞", "副詞", "連体詞", "接続詞"}


def is_candidate(token):
    parts = token.part_of_speech.split(",")
    pos1 = parts[0]
    pos2 = parts[1] if len(parts) > 1 else ""
    if pos1 not in KEEP_POS1:
        return False
    if pos2 in DROP_POS2:
        return False
    if pos1 == "動詞" and pos2 != "自立":
        return False
    if pos1 == "形容詞" and pos2 != "自立":
        return False
    return True


# Tokens that may legitimately follow a content word inside one option:
# inflection and punctuation, nothing else.
TRAILING_POS = {"\u52a9\u8a5e", "\u52a9\u52d5\u8a5e", "\u8a18\u53f7"}


def is_one_word(tokens):
    """True when this option is a single word, inflection included.

    An option on a reading or kanji-spelling question is one word or it is not
    a word at all. The tokenizer is what gives it away:

        けって    -> けっ(verb) + て(particle)     one word  -> ける
        さいしゅう -> さ(adverb) + いしゅう(noun)     not a word
        申講      -> 申(noun) + 講(noun)          not a word

    いしゅう is a real dictionary entry ("a different religion or sect") and
    申 is a real word ("the Monkey, ninth sign of the Chinese zodiac"), but
    neither is on the paper: they are debris from splitting a wrong answer
    that was never a word. Requiring the content word to start at the
    beginning and stand alone keeps the genuine distractors and drops the rest.
    """
    content = [i for i, tk in enumerate(tokens) if is_candidate(tk)]
    if len(content) != 1 or content[0] != 0:
        return False
    return all(tk.part_of_speech.split(",")[0] in TRAILING_POS
               for tk in tokens[1:])


def single_kanji(token):
    return len(token.surface) == 1 and bool(KANJI_RE.match(token.surface))


def fragment_of_compound(tokens, i):
    """True when this token is one character of a kanji run that was split.

    Many wrong options on a vocabulary paper are invented compounds - 申講 is
    not a word - and the tokenizer breaks them into single characters. Left
    alone, the glossary then explains 申 as "the Monkey (ninth sign of the
    Chinese zodiac)", a word that appears nowhere on the paper. A lone kanji
    between kana (the 横 of 横において) is untouched.
    """
    if not single_kanji(tokens[i]):
        return False
    if i > 0 and single_kanji(tokens[i - 1]):
        return True
    return i + 1 < len(tokens) and single_kanji(tokens[i + 1])


def normalise(token):
    base = token.base_form
    if not base or base == "*":
        base = token.surface
    return unicodedata.normalize("NFKC", base)


# 問題1 asks for the reading of an underlined word and 問題2 for its kanji, so
# every option is a spelling variant of one word rather than vocabulary in its
# own right. The word worth learning is the underlined one in the prompt; the
# options are distractors that appear nowhere else on the paper.
VARIANT_INSTRUCTION_RE = re.compile(r"読み方|漢字で書く")


def options_are_variants(q):
    return bool(VARIANT_INSTRUCTION_RE.search(strip_html(q.get("instruction") or "")))


def keep_word(level, entry, key):
    """Whether a learner sitting N3 or N2 still needs this word explained.

    Anything written with kanji is explained, whatever its level. The kanji is
    itself the difficulty: a reader who cannot read 横 cannot look it up
    either, so filtering those by level would leave exactly the words that
    stop someone mid-sentence unexplained.

    For words written only in kana, where nothing has to be deciphered before
    the word can be recognised, the level decides. The cut is by the word's
    own level, not the paper's: an N2 candidate who meets a half-forgotten N3
    word wants the meaning as much as an N3 candidate does.

      any kanji   always kept
      N3/N2/N1    always kept
      unlisted    kept: absent from 8,900 study words means rare, not trivial
      N4 kana     only the hard ones - those the dictionary does not mark as
                  common words
      N5 kana     left out: everyone at this level knows it

    The other candidate signal for a hard N4 word - the two level lists
    disagreeing, one filing it at N3 or above - was measured and rejected:
    the lists disagree so often that it let through 運動, 間, 途中, 上がる and
    怒る, exactly the everyday N4 vocabulary this is meant to skip.
    """
    if has_kanji(key):
        return True
    if level is None:
        return True
    if level <= 3:
        return True
    if level >= 5:
        return False
    return not entry.get("c")


class Glosser(object):
    def __init__(self, jmdict, jlpt_word, jlpt_reading):
        from janome.tokenizer import Tokenizer
        self.tok = Tokenizer()
        self.jmdict = jmdict
        self.jlpt_word = jlpt_word
        self.jlpt_reading = jlpt_reading
        self.misses = 0
        self.hits = 0

    def lookup(self, surface, hint):
        """The dictionary entry that matches how the word is read here.

        `hint` is the tokenizer's reading of the surface form, so for an
        inflected word it is a prefix of the dictionary reading (つづけ for
        つづける). An exact match wins, then a prefix match either way, and
        only if neither exists do we fall back to the highest-ranked entry.
        """
        cands = self.jmdict.get(surface)
        if not cands:
            return None
        if hint:
            for entry in cands:
                if entry["r"] == hint:
                    return entry
            for entry in cands:
                r = entry["r"]
                if r and (r.startswith(hint) or hint.startswith(r)):
                    return entry
        return cands[0]

    def level_of(self, word, reading):
        level = self.jlpt_word.get(word)
        if level is None and reading:
            level = self.jlpt_reading.get(reading)
        return level

    def words_in(self, text, seen, strict=False):
        """Ordered list of (key, entry) worth glossing, skipping `seen` keys.

        `strict` is for the options of a reading or kanji-spelling question.
        Those options are deliberately near-misses of one word, so in strict
        mode the option has to be a single word to be read at all - see
        is_one_word().
        """
        out = []
        for chunk in JA_RUN_RE.findall(strip_html(text)):
            tokens = list(self.tok.tokenize(chunk))
            if strict and not is_one_word(tokens):
                continue
            for pos_i, token in enumerate(tokens):
                if not is_candidate(token):
                    continue
                if fragment_of_compound(tokens, pos_i):
                    continue
                key = normalise(token)
                if len(key) < 2 and not has_kanji(key):
                    continue
                if key in STOP or key in seen:
                    continue

                hint = to_hiragana(token.reading or "")
                if hint == "*":
                    hint = ""
                entry = self.lookup(key, hint)
                if entry is None:
                    self.misses += 1
                    seen.add(key)
                    continue

                reading = entry["r"]
                level = self.level_of(key, reading)
                if not keep_word(level, entry, key):
                    seen.add(key)
                    continue

                # Kana-only words get a meaning too - they simply have no
                # furigana, being already their own reading. But kana strings
                # also mis-segment (さいしゅう yields いしゅう, "a different
                # religion or sect"), and the wreckage is short: a one- or
                # two-character hiragana run with no JLPT level and no common
                # headword is far more often a fragment than a word. Katakana
                # tokenizes as whole loanwords, so it needs no such guard.
                if (not has_kanji(key) and level is None
                        and not entry.get("c")
                        and not KATAKANA_RE.match(key) and len(key) < 3):
                    seen.add(key)
                    continue

                # A lone kanji that is neither a study word nor a common
                # headword is nearly always a fragment of a longer word the
                # tokenizer split badly (試 out of 試す, 調 out of 調べる).
                if len(key) == 1 and level is None and not entry.get("c"):
                    seen.add(key)
                    continue

                # 割る and わる are one word to the reader. When a kanji form
                # is already listed for this question, drop the kana spelling
                # of the same entry rather than showing the meaning twice.
                sig = (reading, entry["g"][0] if entry["g"] else "")
                if sig in seen:
                    seen.add(key)
                    continue
                seen.add(sig)

                self.hits += 1
                seen.add(key)
                ruby = ruby_segments(key, reading) if has_kanji(key) else None
                item = {"w": key, "g": entry["g"]}
                # Furigana only means anything over kanji; a katakana or
                # hiragana word is already its own reading.
                if has_kanji(key):
                    item["r"] = reading
                if entry["p"]:
                    item["p"] = entry["p"]
                if ruby:
                    item["ruby"] = ruby
                if level:
                    item["lv"] = "N%d" % level
                out.append((key, item))
        return out


# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------

def build_exam(exam, glosser):
    words = OrderedDict()
    per_question = {}
    per_passage = {}

    def collect(text, seen, sink, strict=False):
        for key, item in glosser.words_in(text, seen, strict):
            words.setdefault(key, item)
            sink.append(key)

    for part in exam["parts"]:
        previous = None
        for q in part.get("questions", []):
            qid = "%s-%s" % (part["id"], q["n"])
            passage = q.get("passage") or None

            # A reading passage is shared by every question under it, so its
            # words are collected once against the first question of the run
            # and shown on the passage itself - not repeated under each of the
            # four questions that quote it.
            if passage and passage != previous:
                keys = []
                collect(passage, set(), keys)
                if keys:
                    per_passage[qid] = keys
            previous = passage

            seen = set()
            keys = []
            collect(q.get("prompt") or "", seen, keys)
            # Both halves of the question: the prompt and the options. On a
            # reading or kanji-spelling question the options are variants of
            # one word rather than vocabulary of their own, so they are read
            # under the stricter rule instead of being skipped.
            variants = options_are_variants(q)
            for choice in q.get("choices") or []:
                collect(choice, seen, keys, strict=variants)
            # The explanation field holds the Japanese listening transcript,
            # and for the other sections the Japanese quoted inside a
            # Vietnamese note. japanese_only() keeps just the Japanese.
            collect(japanese_only(q.get("explanation") or ""), seen, keys)
            if keys:
                per_question[qid] = keys

    return {
        "id": exam["id"],
        "level": exam["level"],
        "words": words,
        "questions": per_question,
        "passages": per_passage,
    }


def main():
    jmdict_path = os.path.join(DICT_DIR, "jmdict-eng.json")
    jlpt_path = os.path.join(DICT_DIR, "jlpt-levels.json")
    for path in (jmdict_path, jlpt_path):
        if not os.path.exists(path):
            sys.exit("missing %s - see the module docstring for the source" % path)

    sys.stderr.write("loading JMdict ...\n")
    jmdict = load_jmdict(jmdict_path)
    jlpt_word, jlpt_reading = load_jlpt(jlpt_path)
    sys.stderr.write("  %d headwords, %d JLPT-levelled words\n"
                     % (len(jmdict), len(jlpt_word)))

    glosser = Glosser(jmdict, jlpt_word, jlpt_reading)

    index = json.load(open(os.path.join(EXAM_DIR, "index.json"),
                           encoding="utf-8"))
    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)

    built = []
    total_words = 0
    for meta in index["exams"]:
        if meta["level"] not in LEVELS:
            continue
        exam = json.load(open(os.path.join(EXAM_DIR, meta["id"] + ".json"),
                              encoding="utf-8"))
        glossary = build_exam(exam, glosser)
        out = os.path.join(OUT_DIR, meta["id"] + ".json")
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(glossary, fh, ensure_ascii=False, separators=(",", ":"))
        n = len(glossary["words"])
        total_words += n
        built.append((meta["id"], meta["level"], n,
                      len(glossary["questions"]), os.path.getsize(out)))
        sys.stderr.write("  %-16s %s  %4d words  %3d questions\n"
                         % (meta["id"], meta["level"], n,
                            len(glossary["questions"])))

    with open(os.path.join(OUT_DIR, "index.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "levels": list(LEVELS),
            "exams": [{"id": i, "level": lv, "words": n} for i, lv, n, _, _ in built],
        }, fh, ensure_ascii=False, indent=1)

    kb = sum(b for _, _, _, _, b in built) / 1024.0
    print("\nglossaries : %d" % len(built))
    print("word entries: %d (sum over papers)" % total_words)
    print("lookup hits : %d   misses: %d" % (glosser.hits, glosser.misses))
    print("on disk     : %.1f KB" % kb)


if __name__ == "__main__":
    main()
