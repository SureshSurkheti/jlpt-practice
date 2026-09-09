#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Distractors for the vocabulary sections, derived rather than typed.

A 漢字読み question is a word, a sentence to put it in, and three readings
that are wrong. Only the first two carry any meaning; the third is
phonology, and phonology is exactly what a machine is good at. So the bank
stores the word and the sentence, and this derives the wrong readings from
the right one.

The mutations are the ones the real papers use, and only those:

    けいけん -> けいげん   voicing
    けいけん -> けけん     the long vowel dropped
    けいけん -> けげん     both at once

That is a real N4 item, and all three of its distractors fall out of two
rules. Adding rules that produce readings no learner would ever consider -
reversing the morae, say - would make the question easier, not harder, so
there are only four: long vowels, voicing, the small tsu, and the moraic n.

Nothing here invents a reading for a word. It mutates the reading it is
given, checks the result is not some other real reading of the same word,
and offers it as a plausible mistake.
"""

import io
import random

# ------------------------------------------------------------------ kana

VOICED = {
    "か": "が", "き": "ぎ", "く": "ぐ", "け": "げ", "こ": "ご",
    "さ": "ざ", "し": "じ", "す": "ず", "せ": "ぜ", "そ": "ぞ",
    "た": "だ", "ち": "ぢ", "つ": "づ", "て": "で", "と": "ど",
    "は": "ば", "ひ": "び", "ふ": "ぶ", "へ": "べ", "ほ": "ぼ",
}
UNVOICED = dict((v, k) for k, v in VOICED.items())
HANDAKU = {"は": "ぱ", "ひ": "ぴ", "ふ": "ぷ", "へ": "ぺ", "ほ": "ぽ"}
UNHANDAKU = dict((v, k) for k, v in HANDAKU.items())

# Rows by their vowel, used to decide which kana a long mark may follow.
O_ROW = "おこそとのほもよろをごぞどぼぽょ"
U_ROW = "うくすつぬふむゆるぐずづぶぷゅ"
E_ROW = "えけせてねへめれげぜでべぺ"
# The consonants a small tsu may sit in front of. It cannot double a voiced
# consonant or a nasal, so がっが and まっま are not near-misses, they are
# unpronounceable - and an unpronounceable distractor is a free elimination.
GEMINABLE = "かきくけこさしすせそたちつてとぱぴぷぺぽはひふへほ"

SMALL = "ゃゅょぁぃぅぇぉっ"

# ゃ, ゅ and ょ attach to the i-row and to nothing else. A rule that swaps a
# vowel can otherwise turn いんしょう into いんせょう, which is not a word
# somebody might write - it is a string Japanese has no way of pronouncing,
# and a wrong answer that can be ruled out without reading it is not a
# question. See _plausible().
YOON_BASE = "きしちにひみりぎじびぴ"


def _mora(r):
    """Split a reading into morae, keeping ゃゅょ attached to their kana."""
    out = []
    for ch in r:
        if ch in "ゃゅょぁぃぅぇぉ" and out:
            out[-1] += ch
        else:
            out.append(ch)
    return out


# ------------------------------------------------------------- mutations
#
# Each returns a list of whole readings, not edits, so they compose by
# simply running one over the output of another.

def long_drop_variants(r):
    """Take a long vowel away: こうこう -> ここう, せんせい -> せんせ."""
    out = []
    for i, ch in enumerate(r):
        nxt = r[i + 1] if i + 1 < len(r) else ""
        if (ch in O_ROW or ch in U_ROW) and nxt == "う":
            out.append(r[:i + 1] + r[i + 2:])
        elif ch in E_ROW and nxt == "い":
            out.append(r[:i + 1] + r[i + 2:])
    return out


def long_add_variants(r):
    """Put a long vowel where there is none: ここう -> こうこう.

    Ranked below every other rule, because it only rings true in a
    Sino-Japanese reading. Lengthening a native one gives くるうま, which no
    learner would pick, so it is a last resort rather than a first guess.

    A mark is only added where one could be heard: not before ん, another
    long mark or a small tsu, and not on the final mora.
    """
    out = []
    last = len(r) - 1
    for i, ch in enumerate(r):
        nxt = r[i + 1] if i + 1 < len(r) else ""
        if i == last or nxt in "ういんっ":
            continue
        if (ch in O_ROW or ch in U_ROW) and nxt != "う":
            out.append(r[:i + 1] + "う" + r[i + 1:])
        elif ch in E_ROW and nxt != "い":
            out.append(r[:i + 1] + "い" + r[i + 1:])
    return out


def voice_variants(r):
    """Turn a mora's voicing on or off: けん <-> げん, は <-> ば <-> ぱ."""
    out = []
    for i, ch in enumerate(r):
        for table in (VOICED, UNVOICED, HANDAKU, UNHANDAKU):
            if ch in table:
                out.append(r[:i] + table[ch] + r[i + 1:])
    return out


def gemination_variants(r):
    """Add or drop the small tsu: きて <-> きって."""
    out = []
    for i, ch in enumerate(r):
        if ch == "っ":
            out.append(r[:i] + r[i + 1:])
        elif i > 0 and ch in GEMINABLE and r[i - 1] not in "んっ":
            out.append(r[:i] + "っ" + r[i:])
    return out


# ん assimilates to what follows it, which is why かんがえる and しんぶん are
# easy to mishear and みんな is not: the classic slip is in front of a stop
# or a nasal. In front of な, ら, や or わ it is legal Japanese but not a
# mistake anyone makes, so those are left alone.
N_BEFORE = ("かきくけこがぎぐげごさしすせそざじずぜぞたちつてとだぢづでど"
            "ばびぶべぼぱぴぷぺぽまみむめも")


def moraic_n_variants(r):
    """Add or drop ん: かがく <-> かんがく, げんき <-> げき."""
    out = []
    for i, ch in enumerate(r):
        if ch == "ん":
            out.append(r[:i] + r[i + 1:])
        elif i > 0 and ch in N_BEFORE and r[i - 1] not in "んっうい":
            out.append(r[:i] + "ん" + r[i:])
    return out


# い <-> え and う <-> お inside one mora. This is the mistake a reader makes
# when they half-remember a reading rather than mis-hear it, and it is the
# only thing that works on a short kun reading: いし has no long vowel to
# lose and one voiceable mora, so without this there are not three wrong
# answers to be had.
VOWEL_SWAP = {}
for _a, _b in (("い", "え"), ("き", "け"), ("ぎ", "げ"), ("し", "せ"),
               ("じ", "ぜ"), ("ち", "て"), ("ぢ", "で"), ("に", "ね"),
               ("ひ", "へ"), ("び", "べ"), ("ぴ", "ぺ"), ("み", "め"),
               ("り", "れ"), ("う", "お"), ("く", "こ"), ("ぐ", "ご"),
               ("す", "そ"), ("ず", "ぞ"), ("つ", "と"), ("づ", "ど"),
               ("ぬ", "の"), ("ふ", "ほ"), ("ぶ", "ぼ"), ("ぷ", "ぽ"),
               ("む", "も"), ("ゆ", "よ"), ("る", "ろ")):
    VOWEL_SWAP[_a] = _b
    VOWEL_SWAP[_b] = _a


def vowel_swap_variants(r):
    out = []
    for i, ch in enumerate(r):
        if ch not in VOWEL_SWAP:
            continue
        # Leave the second half of a long vowel alone. The う in びょういん
        # is not a mora anyone could mishear as お - it is the mark that
        # makes びょう long, and swapping it writes the word wrong rather
        # than reading it wrong.
        prev = r[i - 1] if i else ""
        if ch == "う" and (prev in O_ROW or prev in U_ROW):
            continue
        if ch == "い" and prev in E_ROW:
            continue
        out.append(r[:i] + VOWEL_SWAP[ch] + r[i + 1:])
    return out


# Ordered by how often the real papers reach for them. Long vowels and
# voicing are the classic pair, so they are tried first and a distractor set
# is only padded out with the other two when those cannot fill it.
RULES = (long_drop_variants, voice_variants, gemination_variants,
         vowel_swap_variants, moraic_n_variants, long_add_variants)


def _plausible(cand, right):
    if cand == right or not cand:
        return False
    # A reading cannot open with a mora that has to lean on the one before.
    if cand[0] in SMALL:
        return False
    if "っっ" in cand or "んん" in cand or "んっ" in cand:
        return False
    if cand[0] == "ん":
        return False
    # ぢ and づ survive in a handful of compounds and nowhere else. As a
    # wrong answer they are a giveaway: nobody has to know the word to
    # know it is not spelt like that.
    for rare in "ぢづ":
        if rare in cand and rare not in right:
            return False
    for pair in ("うう", "おお", "いい", "ええ", "ああ"):
        if pair in cand and pair not in right:
            return False
    # っ at the end, or in front of a vowel, is not a possible Japanese word.
    if cand.endswith("っ"):
        return False
    for i, ch in enumerate(cand):
        if ch in "ゃゅょ" and (i == 0 or cand[i - 1] not in YOON_BASE):
            return False
    for i, ch in enumerate(cand[:-1]):
        if ch == "っ" and cand[i + 1] not in GEMINABLE:
            return False
    # Length is a tell. Four choices where one is two morae shorter than the
    # rest can be dismissed on shape alone, without reading them.
    if abs(len(cand) - len(right)) > 2:
        return False
    return True


def reading_distractors(right, n=3, seed=None, avoid=()):
    """Three wrong readings of `right`, nearest-miss first.

    `avoid` is every other real reading of the same written word, so 一日
    never offers ついたち as the wrong answer to いちにち.
    """
    banned = set(avoid) | {right}
    ranked = []
    seen = set()

    def add(cand, rank):
        if cand in seen or cand in banned or not _plausible(cand, right):
            return
        seen.add(cand)
        ranked.append((rank, cand))

    # One rule at a time, in order of how typical the mistake is.
    for depth, rule in enumerate(RULES):
        for cand in rule(right):
            add(cand, depth)

    # Then pairs of them - けいけん -> けげん is two rules deep, and is the
    # hardest of the four choices precisely because it is. Ranked below
    # every single mutation, and needed more often than that sounds: でんわ
    # has one voiceable mora and one ん, which is two wrong answers, and the
    # third has to come from doing both at once.
    pairable = RULES[:-1]
    for a in pairable:
        for mid in a(right):
            for b in pairable:
                for cand in b(mid):
                    add(cand, len(RULES))

    if len(ranked) < n:
        return None
    # Strongest rule first, always: a long-vowel slip is a better wrong
    # answer than a vowel swap, and shuffling the two together would throw
    # that away. The shuffle happens inside a rank instead, so a paper does
    # not end up applying the same rule at the same position every time.
    rng = random.Random(seed or right)
    pool = []
    for depth in range(len(RULES) + 1):
        tier = [c for d, c in ranked if d == depth]
        rng.shuffle(tier)
        pool.extend(tier)
    return pool[:n]


# ------------------------------------------------------- written form 表記
#
# 問題2 goes the other way: the sentence gives the reading, and the four
# choices are ways of writing it. A wrong choice has to be a kanji someone
# could actually pick by mistake, which means one that looks like the right
# one or sounds like it. Neither is derivable from a reading, so the pairs
# are listed - once, here, rather than in every question that needs them.

CONFUSABLE = [
    # Shapes a beginner mixes up. Grouped by what they share on the page -
    # a stroke, a component, an outline - not by meaning, because meaning is
    # what the question is testing and a distractor that means the right
    # thing is not wrong enough to be useful.
    "日目自白百旧",
    "月肉用同肉",
    "人入八九",
    "大犬太天夫失",
    "土士王玉圭",
    "木本休体末未林村",
    "水氷永求泳",
    "火灯畑炭災",
    "山出止",
    "川州順",
    "田由申甲町男界画",
    "口回四固国因",
    "力刀万方九",
    "上下卡止",
    "左右友有石",
    "中虫申串",
    "小少省砂沙",
    "年午牛先",
    "先失矢知短生",
    "名多夕外各",
    "手毛年才",
    "耳取最恥聞",
    "足是走起促定",
    "気汽紙",
    "花草茶苦荷若",
    "空穴究突窓",
    "雨雪電雲需震",
    "行往待街術",
    "来東束楽果",
    "見貝買具員負",
    "言計語話読訳",
    "話活舌乱",
    "読続説語調",
    "書昼画尽",
    "聞問間開閉閑",
    "食飲飯館飼餌",
    "駅馬験駐騎",
    "車軍運転庫連",
    "道通週遠速達",
    "近返辺述迎",
    "新親薪",
    "古苦居故固",
    "長張帳脹",
    "高稿橋",
    "安案宗完",
    "早草卓朝",
    "赤亦変赦",
    "青晴清静情精",
    "黒里墨野量",
    "何河荷可歌",
    "作昨咋酢",
    "住注柱主往",
    "所近折祈斤",
    "後復複腹",
    "毎海母梅侮",
    "朝潮嘲",
    "夜液亦",
    "分半券公",
    "時寺持特詩待",
    "待持特侍",
    "週過遇渦",
    "曜躍濯翼",
    "父交校効郊",
    "兄光克児",
    "姉妹始味",
    "弟第弟",
    "会合今全金",
    "同回向司",
    "学字子孝",
    "元完院冗",
    "私和利科秋",
    "地池他也",
    "夏憂複",
    "冬各終客",
    "春奉泰春",
    "秋私秒科",
    "妻婦毒",
    "町丁灯打",
    "市布巾希",
    "店占点古",
    "屋室屈局届",
    "家嫁豚象",
    "堂常党掌",
    "病痛疲疾",
    "医区匹巨",
    "者都著暑署",
    "業葉美善",
    "仕任住件他",
    "働動重種",
    "使便更史",
    "急息思意",
    "思恵息想",
    "考老孝者",
    "教数敬散",
    "研砂破石",
    "験検剣険",
    "試式弐武",
    "題顔頭願類",
    "答等竹符",
    "正止政証定",
    "違遠達運",
    "音暗意首",
    "楽薬草茶",
    "映英映央",
    "写与号号",
    "真直具置",
    "旅族施旋",
    "船般航舟",
    "飛非悲",
    "機械橋積",
    "運連軍輸",
    "転伝軽輪",
    "歩走止渉",
    "起記紀己",
    "立位泣粒",
    "終始経細",
    "貸賃資質貨",
    "借昔惜措",
    "送迷迎逆",
    "洗先流洋",
    "洋様羊注",
    "服報眼腹",
    "着差看羊",
    "習羽白百",
    "肉内因囚",
    "魚漁魯鮮",
    "鳥島烏鳴",
    "牛午年生",
    "漢漠嘆難",
    "勉免克兎",
    "風凪嵐凡",
    "紙氏低抵",
    "色危免免",
    "広店庁床",
    "別列助利",
    "品晶回昌",
    "銀根限銅",
    "去法却却",
    "味妹未末",
    "歌哥何河",
    "悪亜心恵",
    "図回国困",
    "室屋屈至",
    "堂常営掌",
    "発登廃",
    "理里埋量",
    "体休本件",
    "強弱張引",
    "持待寺特",
    "野理予野",
    "以似次",
    "世代世",
    "多夕移",
    "心必忘志",
    "界果田畑",
    "文父交又",
    "重動働里",
    "明朋郎照",
    "代化他付",
    "京highs",
    "京景涼亰",
    "通痛桶踊",
    "主注住往",
    "題頭顔",
    "意音章竟",
    "不否杯",
    "度席庭渡",
    "公松私払",
    "集雑進",
    "物特牧犬",
    "計計訂針",
    "死列残歹",
    "特持待牧",
    "始治姉冶",
    "真直値置",
    "終冬糸経",
    "台合始怠",
    "急息負",
    "止正走足",
    "究空穴突",
    "着差著看",
    "銀金根鉄",
    "英映央英",
    "仕任仁化",
    "字学宇守",
    "夜液夕亦",
    "注住主柱",
    "帰掃婦帚",
    "買売読貝",
    "図団困囲",
    "歩渉止走",
    "紙糸氏低",
    "春奏泰奉",
    "赤変亦赤",
    "館官管食",
    "屋室尾局",
    "色危色免",
    "走赴起徒",
    "秋秒科私",
    "夏憂夏麦",
    "習翌羽白",
    "駅訳釈駅",
    "洋羊様океан",
    "旅施族旅",
    "服眼報服",
    "夕多外名",
    "曜濯躍曜",
    "飲飯館食",
    "肉内肉因",
    "貸賃貨貧",
    "堂当営常",
    "鳥烏島鳥",
    "飯板阪坂",
    "勉勧勤動",
    "冬各条終",
    "昼書尽昼",
    "茶苦草若",
    "弟第梯弟",
    "牛半午年",
    "魚漁鯨魚",
    "兄兄児光",
    "犬太大天",
    "妹味未妹",
    "姉市姉肺",
    "漢漢難漠",
]
# Typed by hand, so checked by machine: a group is dropped whole if anything
# in it is not a kanji, and repeats inside a group are collapsed. A line with
# a slip in it can never reach a paper as a choice.
def _clean(groups):
    out = []
    for g in groups:
        g = "".join(dict.fromkeys(g))
        if len(g) >= 2 and all(0x4E00 <= ord(c) <= 0x9FFF for c in g):
            out.append(g)
    return out


CONFUSABLE = _clean(CONFUSABLE)

_NEAR = {}
for _group in CONFUSABLE:
    for _c in _group:
        _NEAR.setdefault(_c, set()).update(x for x in _group if x != _c)


# ------------------------------------------------------- sound-alike kanji
#
# The other half of a 表記 question. Where the visual table says which kanji
# look alike, this says which ones would be read the same, so 公園 can offer
# 校園 and 公円 - three choices that are all pronounced こうえん, and cannot
# be told apart by sounding them out. Read from the kanji files rather than
# listed here, because the readings are already recorded there.

_BY_ON = {}
_ALL = set()
_LOADED = [False]


def _load_readings():
    if _LOADED[0]:
        return
    _LOADED[0] = True
    import json
    import os
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for lv in ("n5", "n4", "n3", "n2", "n1"):
        path = os.path.join(here, "data", "kanji", "%s.json" % lv)
        if not os.path.exists(path):
            continue
        for entry in json.load(io.open(path, encoding="utf-8"))["kanji"]:
            _ALL.add(entry["k"])
            for on in entry.get("on") or []:
                on = on.strip("-.")
                if on:
                    _BY_ON.setdefault(on, []).append(entry["k"])


def _known(ch):
    """Is this a kanji the site teaches somewhere?

    The visual groups were typed from memory, and a few of them reached for
    a character that is a genuine lookalike but that nobody sitting N5 has
    ever seen - 餌 next to 館, say. Those make a choice that can be dismissed
    without reading it. Anything outside the 2,211 kanji in data/kanji is
    dropped rather than offered.
    """
    _load_readings()
    return ch in _ALL


def _sound_alikes(ch):
    _load_readings()
    out = set()
    for on, ks in _BY_ON.items():
        if ch in ks:
            out.update(k for k in ks if k != ch)
    return out


def written_distractors(word, n=3, seed=None, pool=()):
    """Three wrong ways to write `word`.

    One kanji of the word is swapped for one that looks like it. Where the
    word is a single kanji that is the whole question; where it is longer,
    the swap lands on whichever position has confusable neighbours, so
    公園 can offer 公遠 and 会園 but never a pair of unrelated kanji.
    """
    rng = random.Random(seed or word)
    ranked = []
    for depth, near_of in enumerate((_NEAR.get, _sound_alikes)):
        tier = []
        for i, ch in enumerate(word):
            for near in sorted(near_of(ch) or ()):
                cand = word[:i] + near + word[i + 1:]
                if cand != word and cand not in pool and _known(near):
                    tier.append(cand)
        rng.shuffle(tier)
        ranked.append(tier)

    cands = []
    for tier in ranked:
        for c in tier:
            if c not in cands:
                cands.append(c)
    if len(cands) < n:
        return None
    return cands[:n]
