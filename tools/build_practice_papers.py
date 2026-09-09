#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compose original practice papers from the item banks.

The items in data/practice-bank/ are written by hand - the sentences, the
passages, the listening scripts. That is the part no script can do. This
deals them into papers of the shape the real exam has, and derives the parts
that are mechanical rather than meaningful:

  * the wrong readings in 問題1, from the right one (see vocab_gen.py)
  * the wrong spellings in 問題2, likewise
  * which fragment lands on the star in 文の組み立て
  * the order the four choices are printed in

That last one matters more than it sounds. The banks store the correct
answer first, because a bank you can check by eye is a bank that gets
checked; shipping them in that order would have made every answer 1, which
is exactly what the first hand-written paper did before this existed.

Every item is used once and once only, so no two papers share a question,
and the deal is seeded, so a rebuild produces the same papers rather than
reshuffling the library under somebody halfway through it.

    python3 tools/build_practice_papers.py
"""

import io
import json
import os
import random
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vocab_gen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, "data", "practice-bank")
OUT = os.path.join(ROOT, "data", "exams-manual")
WORDS = os.path.join(ROOT, "data", "words")

# Practice Tests 1 and 2 at each level are hand-written; the composed ones
# start after them. Their hand-written questions live in practice-bank/seed/
# and are topped up rather than replaced - see top_up().
FIRST = 3
# How many composed papers each level gets, and it is per level on purpose.
#
# A single number looked simpler and was wrong. Raising it to 23 let N5 take
# a seventeenth paper out of the same banks that top_up() draws on, and the
# two hand-written N5 papers lost the questions it had already given them -
# Practice Test 1 went from 67 questions back to 52. The composed papers are
# dealt first and the seeds get the remainder, so growing a level quietly
# shrinks its own oldest papers unless it is asked for deliberately.
#
# A level still stops at whatever its banks support; build() takes the
# smaller of the two.
PAPERS = {"n5": 16, "n4": 23, "n3": 16, "n2": 16, "n1": 16}
DEFAULT_PAPERS = 16
SEED = os.path.join(ROOT, "data", "practice-bank", "seed")
DEAL = os.path.join(ROOT, "data", "practice-bank", "deal.json")

# --------------------------------------------------------------------------
# the shape of a paper
#
# Counts are the published ones. A number here is questions for the plain
# kinds and passages for the ones that carry their own questions, because a
# reading passage is what gets dealt - you cannot give somebody question 2 of
# a passage without question 1.

SHAPE = {
    "n5": [
        ("vocabulary", [("reading", 7), ("orthography", 5),
                        ("context", 6), ("paraphrase", 3)]),
        ("grammar-reading", [("grammar", 9), ("order", 4), ("cloze", 1),
                             ("short", 2), ("mid", 1), ("info", 1)]),
        ("listening", [("listen1", 7), ("listen2", 6),
                       ("listen3", 5), ("listen4", 6)]),
    ],
    "n4": [
        ("vocabulary", [("reading", 9), ("orthography", 6),
                        ("context", 10), ("paraphrase", 5)]),
        ("grammar-reading", [("grammar", 15), ("order", 5), ("cloze", 1),
                             ("short", 4), ("mid", 2), ("info", 1)]),
        ("listening", [("listen1", 8), ("listen2", 7),
                       ("listen3", 5), ("listen4", 8)]),
    ],
    # N3 upwards the paper stops spacing its words and starts asking about
    # 用法 - which of four sentences uses this word properly - and about the
    # gist of a talk nothing is printed for. Both are new kinds of item, not
    # harder versions of an old one, so both get their own bank.
    "n3": [
        ("vocabulary", [("reading", 8), ("orthography", 6), ("context", 11),
                        ("paraphrase", 5), ("usage", 5)]),
        ("grammar-reading", [("grammar", 13), ("order", 5), ("cloze", 1),
                             ("short", 4), ("mid", 3), ("long", 1),
                             ("info", 1)]),
        ("listening", [("listen1", 6), ("listen2", 6), ("gist", 3),
                       ("listen3", 4), ("listen4", 9)]),
    ],
    "n2": [
        ("vocabulary", [("reading", 5), ("orthography", 5), ("formation", 5),
                        ("context", 7), ("paraphrase", 5), ("usage", 5)]),
        ("grammar-reading", [("grammar", 12), ("order", 5), ("cloze", 1),
                             ("short", 5), ("mid", 3), ("compare", 1),
                             ("essay", 1), ("info", 1)]),
        ("listening", [("listen1", 5), ("listen2", 6), ("gist", 5),
                       ("listen4", 12), ("listen5a", 2), ("listen5b", 1)]),
    ],
    "n1": [
        ("vocabulary", [("reading", 6), ("context", 7),
                        ("paraphrase", 6), ("usage", 6)]),
        ("grammar-reading", [("grammar", 10), ("order", 5), ("cloze", 1),
                             ("short", 4), ("mid", 3), ("long", 1),
                             ("compare", 1), ("essay", 1), ("info", 1)]),
        ("listening", [("listen1", 6), ("listen2", 7), ("gist", 6),
                       ("listen4", 14), ("listen5a", 2), ("listen5b", 1)]),
    ],
}

CATEGORY = {
    "reading": "vocabulary", "orthography": "vocabulary",
    "formation": "vocabulary", "context": "vocabulary",
    "paraphrase": "vocabulary", "usage": "vocabulary",
    "grammar": "grammar", "order": "grammar", "cloze": "grammar",
    "short": "reading", "mid": "reading", "long": "reading",
    "compare": "reading", "essay": "reading", "info": "reading",
    "listen1": "listening", "listen2": "listening", "gist": "listening",
    "listen3": "listening", "listen4": "listening",
    "listen5a": "listening", "listen5b": "listening",
}

# 問題 numbers restart in each part of the booklet, so they are held here
# rather than counted, and the instruction is written out in full the way the
# paper prints it - the player groups questions into sections by the
# instruction string, so two 問題 sharing one would merge into one section.
MONDAI = {
    "n5": {
        "reading": (1, "もんだい1　＿＿＿の　ことばは　ひらがなで　どう　かきますか。"
                       "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "orthography": (2, "もんだい2　＿＿＿の　ことばは　どう　かきますか。"
                           "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "context": (3, "もんだい3　（　　）に　なにを　いれますか。"
                       "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "paraphrase": (4, "もんだい4　＿＿＿の　ぶんと　だいたい　おなじ　いみの　ぶんが　あります。"
                          "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "grammar": (1, "もんだい1　（　　）に　なにを　いれますか。"
                       "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "order": (2, "もんだい2　★　に　はいる　ものは　どれですか。"
                     "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "cloze": (3, "もんだい3　1から4に　なにを　いれますか。ぶんしょうの　いみを　かんがえて、"
                     "1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "short": (4, "もんだい4　つぎの　ぶんしょうを　よんで、しつもんに　こたえて　ください。"
                     "こたえは、1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "mid": (5, "もんだい5　つぎの　ぶんしょうを　よんで、しつもんに　こたえて　ください。"
                   "こたえは、1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "info": (6, "もんだい6　つぎの　ページを　みて、したの　しつもんに　こたえて　ください。"
                    "こたえは、1・2・3・4から　いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "listen1": (1, "もんだい1　もんだい1では、はじめに　しつもんを　きいて　ください。"
                       "それから　はなしを　きいて、1から4の　なかから、"
                       "いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "listen2": (2, "もんだい2　もんだい2では、はじめに　しつもんを　きいて　ください。"
                       "それから　はなしを　きいて、1から4の　なかから、"
                       "いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "listen3": (3, "もんだい3　もんだい3では、ばめんの　せつめいを　よんでから、"
                       "はなしを　きいて　ください。やじるし（→）の　ひとは　なんと　いいますか。"
                       "1から3の　なかから、いちばん　いい　ものを　ひとつ　えらんで　ください。"),
        "listen4": (4, "もんだい4　もんだい4では、えなどが　ありません。ぶんを　きいて、"
                       "1から3の　なかから、いちばん　いい　ものを　ひとつ　えらんで　ください。"),
    },
    "n4": {
        "reading": (1, "問題1　＿＿＿の　ことばは　ひらがなで　どう　書きますか。"
                       "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "orthography": (2, "問題2　＿＿＿の　ことばは　どう　書きますか。"
                           "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "context": (3, "問題3　（　　）に　何を　入れますか。"
                       "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "paraphrase": (4, "問題4　＿＿＿の　文と　だいたい　同じ　意味の　文が　あります。"
                          "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "grammar": (1, "問題1　（　　）に　何を　入れますか。"
                       "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "order": (2, "問題2　★　に　入る　ものは　どれですか。"
                     "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "cloze": (3, "問題3　1から5に　何を　入れますか。文章の　意味を　考えて、"
                     "1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "short": (4, "問題4　つぎの　文章を　読んで、質問に　答えて　ください。"
                     "答えは、1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "mid": (5, "問題5　つぎの　文章を　読んで、質問に　答えて　ください。"
                   "答えは、1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "info": (6, "問題6　右の　ページを　見て、下の　質問に　答えて　ください。"
                    "答えは、1・2・3・4から　いちばん　いい　ものを　一つ　えらんで　ください。"),
        "listen1": (1, "問題1　問題1では、はじめに　質問を　聞いて　ください。"
                       "それから　話を　聞いて、1から4の　中から、"
                       "いちばん　いい　ものを　一つ　えらんで　ください。"),
        "listen2": (2, "問題2　問題2では、はじめに　質問を　聞いて　ください。"
                       "それから　話を　聞いて、1から4の　中から、"
                       "いちばん　いい　ものを　一つ　えらんで　ください。"),
        "listen3": (3, "問題3　問題3では、場面の　説明を　読んでから、話を　聞いて　ください。"
                       "やじるし（→）の　人は　何と　言いますか。"
                       "1から3の　中から、いちばん　いい　ものを　一つ　えらんで　ください。"),
        "listen4": (4, "問題4　問題4では、絵などが　ありません。文を　聞いて、"
                       "1から3の　中から、いちばん　いい　ものを　一つ　えらんで　ください。"),
    },
    "n3": {
        "reading": (1, "問題1　＿＿＿のことばの読み方として最もよいものを、"
                       "1・2・3・4から一つえらびなさい。"),
        "orthography": (2, "問題2　＿＿＿のことばを漢字で書くとき、最もよいものを、"
                           "1・2・3・4から一つえらびなさい。"),
        "context": (3, "問題3　（）に入れるのに最もよいものを、"
                       "1・2・3・4から一つえらびなさい。"),
        "paraphrase": (4, "問題4　＿＿＿のことばに意味が最も近いものを、"
                          "1・2・3・4から一つえらびなさい。"),
        "usage": (5, "問題5　つぎのことばの使い方として最もよいものを、"
                     "1・2・3・4から一つえらびなさい。"),
        "grammar": (1, "問題1　つぎの文の（）に入れるのに最もよいものを、"
                       "1・2・3・4から一つえらびなさい。"),
        "order": (2, "問題2　つぎの文の＿★＿に入る最もよいものを、"
                     "1・2・3・4から一つえらびなさい。"),
        "cloze": (3, "問題3　つぎの文章を読んで、文章全体の内容を考えて、"
                     "【1】から【5】の中に入る最もよいものを、"
                     "1・2・3・4から一つえらびなさい。"),
        "short": (4, "問題4　つぎの文章を読んで、質問に答えなさい。"
                     "答えは、1・2・3・4から最もよいものを一つえらびなさい。"),
        "mid": (5, "問題5　つぎの文章を読んで、質問に答えなさい。"
                   "答えは、1・2・3・4から最もよいものを一つえらびなさい。"),
        "long": (6, "問題6　つぎの文章を読んで、質問に答えなさい。"
                    "答えは、1・2・3・4から最もよいものを一つえらびなさい。"),
        "info": (7, "問題7　右のページを見て、下の質問に答えなさい。"
                    "答えは、1・2・3・4から最もよいものを一つえらびなさい。"),
        "listen1": (1, "問題1　問題1では、まず質問を聞いてください。"
                       "それから話を聞いて、問題用紙の1から4の中から、"
                       "最もよいものを一つえらんでください。"),
        "listen2": (2, "問題2　問題2では、まず質問を聞いてください。"
                       "そのあと、問題用紙のせんたくしを読んでください。"
                       "読む時間があります。それから話を聞いて、"
                       "問題用紙の1から4の中から、最もよいものを一つえらんでください。"),
        "gist": (3, "問題3　問題3では、問題用紙に何もいんさつされていません。"
                    "この問題は、全体としてどんな内容かを聞く問題です。"
                    "話の前に質問はありません。まず話を聞いてください。"
                    "それから、質問とせんたくしを聞いて、1から4の中から、"
                    "最もよいものを一つえらんでください。"),
        "listen3": (4, "問題4　問題4では、場面の説明を読んでから、話を聞いてください。"
                       "やじるし（→）の人は何と言いますか。"
                       "1から3の中から、最もよいものを一つえらんでください。"),
        "listen4": (5, "問題5　問題5では、問題用紙に何もいんさつされていません。"
                       "まず文を聞いてください。それから、それに対する返事を聞いて、"
                       "1から3の中から、最もよいものを一つえらんでください。"),
    },
    "n2": {
        "reading": (1, "問題1　＿＿＿の言葉の読み方として最もよいものを、"
                       "1・2・3・4から一つ選びなさい。"),
        "orthography": (2, "問題2　＿＿＿の言葉を漢字で書くとき、最もよいものを、"
                           "1・2・3・4から一つ選びなさい。"),
        "formation": (3, "問題3　（　　）に入れるのに最もよいものを、"
                         "1・2・3・4から一つ選びなさい。"),
        "context": (4, "問題4　（　　）に入れるのに最もよいものを、"
                       "1・2・3・4から一つ選びなさい。"),
        "paraphrase": (5, "問題5　＿＿＿の言葉に意味が最も近いものを、"
                          "1・2・3・4から一つ選びなさい。"),
        "usage": (6, "問題6　次の言葉の使い方として最もよいものを、"
                     "1・2・3・4から一つ選びなさい。"),
        "grammar": (7, "問題7　次の文の（　　）に入れるのに最もよいものを、"
                       "1・2・3・4から一つ選びなさい。"),
        "order": (8, "問題8　次の文の＿★＿に入る最もよいものを、"
                     "1・2・3・4から一つ選びなさい。"),
        "cloze": (9, "問題9　次の文章を読んで、文章全体の内容を考えて、"
                     "【1】から【5】の中に入る最もよいものを、"
                     "1・2・3・4から一つ選びなさい。"),
        "short": (10, "問題10　次の文章を読んで、後の問いに対する答えとして"
                      "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "mid": (11, "問題11　次の文章を読んで、後の問いに対する答えとして"
                    "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "compare": (12, "問題12　次のAとBの文章を読んで、後の問いに対する答えとして"
                        "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "essay": (13, "問題13　次の文章を読んで、後の問いに対する答えとして"
                      "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "info": (14, "問題14　右のページを見て、下の問いに対する答えとして"
                     "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "listen1": (1, "問題1　問題1では、まず質問を聞いてください。"
                       "それから話を聞いて、問題用紙の1から4の中から、"
                       "最もよいものを一つ選んでください。"),
        "listen2": (2, "問題2　問題2では、まず質問を聞いてください。"
                       "そのあと、問題用紙のせんたくしを読んでください。読む時間があります。"
                       "それから話を聞いて、問題用紙の1から4の中から、"
                       "最もよいものを一つ選んでください。"),
        "gist": (3, "問題3　問題3では、問題用紙に何も印刷されていません。"
                    "この問題は、全体としてどんな内容かを聞く問題です。"
                    "話の前に質問はありません。まず話を聞いてください。"
                    "それから、質問とせんたくしを聞いて、1から4の中から、"
                    "最もよいものを一つ選んでください。"),
        "listen4": (4, "問題4　問題4では、問題用紙に何も印刷されていません。"
                       "まず文を聞いてください。それから、それに対する返事を聞いて、"
                       "1から3の中から、最もよいものを一つ選んでください。"),
        "listen5a": (5, "問題5　問題5では、長めの話を聞きます。"
                        "問題用紙にメモをとってもかまいません。"),
        "listen5b": (5, "問題5　問題5では、長めの話を聞きます。"
                        "問題用紙にメモをとってもかまいません。"),
    },
    "n1": {
        "reading": (1, "問題1　＿＿＿の言葉の読み方として最もよいものを、"
                       "1・2・3・4から一つ選びなさい。"),
        "context": (2, "問題2　（　　）に入れるのに最もよいものを、"
                       "1・2・3・4から一つ選びなさい。"),
        "paraphrase": (3, "問題3　＿＿＿の言葉に意味が最も近いものを、"
                          "1・2・3・4から一つ選びなさい。"),
        "usage": (4, "問題4　次の言葉の使い方として最もよいものを、"
                     "1・2・3・4から一つ選びなさい。"),
        "grammar": (5, "問題5　次の文の（　　）に入れるのに最もよいものを、"
                       "1・2・3・4から一つ選びなさい。"),
        "order": (6, "問題6　次の文の＿★＿に入る最もよいものを、"
                     "1・2・3・4から一つ選びなさい。"),
        "cloze": (7, "問題7　次の文章を読んで、文章全体の趣旨を踏まえて、"
                     "【1】から【5】の中に入る最もよいものを、"
                     "1・2・3・4から一つ選びなさい。"),
        "short": (8, "問題8　次の文章を読んで、後の問いに対する答えとして"
                     "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "mid": (9, "問題9　次の文章を読んで、後の問いに対する答えとして"
                   "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "long": (10, "問題10　次の文章を読んで、後の問いに対する答えとして"
                     "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "compare": (11, "問題11　次のAとBの文章を読んで、後の問いに対する答えとして"
                        "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "essay": (12, "問題12　次の文章を読んで、後の問いに対する答えとして"
                      "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "info": (13, "問題13　右のページを見て、下の問いに対する答えとして"
                     "最もよいものを、1・2・3・4から一つ選びなさい。"),
        "listen1": (1, "問題1　問題1では、まず質問を聞いてください。"
                       "それから話を聞いて、問題用紙の1から4の中から、"
                       "最もよいものを一つ選んでください。"),
        "listen2": (2, "問題2　問題2では、まず質問を聞いてください。"
                       "そのあと、問題用紙のせんたくしを読んでください。読む時間があります。"
                       "それから話を聞いて、問題用紙の1から4の中から、"
                       "最もよいものを一つ選んでください。"),
        "gist": (3, "問題3　問題3では、問題用紙に何も印刷されていません。"
                    "この問題は、全体としてどんな内容かを聞く問題です。"
                    "話の前に質問はありません。まず話を聞いてください。"
                    "それから、質問とせんたくしを聞いて、1から4の中から、"
                    "最もよいものを一つ選んでください。"),
        "listen4": (4, "問題4　問題4では、問題用紙に何も印刷されていません。"
                       "まず文を聞いてください。それから、それに対する返事を聞いて、"
                       "1から3の中から、最もよいものを一つ選んでください。"),
        "listen5a": (5, "問題5　問題5では、長めの話を聞きます。"
                        "問題用紙にメモをとってもかまいません。"),
        "listen5b": (5, "問題5　問題5では、長めの話を聞きます。"
                        "問題用紙にメモをとってもかまいません。"),
    },
}

PASSAGE_KINDS = ("cloze", "short", "mid", "long", "compare",
                 "essay", "info")


# --------------------------------------------------------------------------
# bank -> questions

def load(level, kind):
    path = os.path.join(BANK, "%s-%s.json" % (level, kind))
    if not os.path.exists(path):
        return []
    return json.load(io.open(path, encoding="utf-8"))


def item_key(kind, item):
    """What identifies a bank item, independent of where it is in the file."""
    if kind in ("reading", "orthography"):
        return item["w"] + "|" + item["s"]
    if kind in ("context", "paraphrase", "grammar", "formation"):
        return item["s"]
    if kind == "usage":
        return item["w"]
    if kind == "order":
        return "".join(item["parts"])
    if kind == "gist" or kind.startswith("listen"):
        return (item.get("say") or item.get("scene")
                or json.dumps(item.get("script"), ensure_ascii=False))
    return item["passage"]


# --------------------------------------------------------------------------
# the deal, and why it is written down
#
# Shuffling a bank with a fixed seed makes a rebuild reproducible, but only
# while the bank does not change. Add one item and every later item moves,
# which quietly deals different questions into papers that already exist -
# so somebody's "Practice Test 7, question 12" becomes a different question
# because an unrelated item was written months later.
#
# So the order is recorded. Items already in the deal keep the position they
# had; anything new is shuffled among itself and appended. Adding to a bank
# can then only add, never disturb.

def read_deal():
    if os.path.exists(DEAL):
        return json.load(io.open(DEAL, encoding="utf-8"))
    return {}


def ordered(deal, level, kind, items, rng):
    order_was = deal.get(level, {}).get(kind, [])
    pos = dict((k, i) for i, k in enumerate(order_was))
    known = sorted((x for x in items if item_key(kind, x) in pos),
                   key=lambda x: pos[item_key(kind, x)])
    fresh = [x for x in items if item_key(kind, x) not in pos]
    rng.shuffle(fresh)
    out = known + fresh
    deal.setdefault(level, {})[kind] = [item_key(kind, x) for x in out]
    return out


_READINGS = {}
_GLOSS = {}


def _load_words():
    if _READINGS:
        return
    for lv in ("n5", "n4", "n3", "n2", "n1"):
        path = os.path.join(WORDS, "%s.json" % lv)
        if not os.path.exists(path):
            continue
        for w in json.load(io.open(path, encoding="utf-8"))["words"]:
            _READINGS.setdefault(w["w"], []).append(w["r"])
            if w.get("en"):
                _GLOSS.setdefault(w["w"], w["en"])


def word_reading(level, word):
    _load_words()
    got = _READINGS.get(word) or []
    return got[0] if got else None


def gloss_note(word, reading):
    """The answer, and what the word means, for the review that follows.

    Written out here rather than in every bank entry. "毎朝 (まいあさ)" alone
    tells somebody who got it wrong only that they got it wrong; the gloss
    is the part that stops it happening again, and it is already recorded in
    data/words, so asking for it by hand 300 times would be asking for the
    same sentence to be typed twice.
    """
    _load_words()
    en = _GLOSS.get(word)
    base = "%s = %s" % (word, reading)
    return "%s - %s" % (base, en) if en else base


KANA = re.compile(r"[\u3041-\u3096]")


def check_okurigana(word, reading):
    """The word goes into the sentence, so it has to be the inflected form.

    問題1 prints the sentence with the word underlined, and the sentence is
    written round a hole the word drops into. A bank entry that stores the
    dictionary form for a sentence that needs a た or a って produces
    「税を含むんでいます」 - and nothing downstream notices, because both
    halves are valid Japanese on their own.

    The tell is cheap and exact: if the word ends in okurigana, its reading
    ends in the same kana. 含む/ふく fails it, 断る/ことわる passes.
    Twenty-eight entries across three levels were wrong this way.
    """
    if not reading or not KANA.match(word[-1]):
        return
    if not reading.endswith(word[-1]):
        raise ValueError(
            "%s is read %s: the okurigana disagree, so the bank is storing "
            "a different form of the word than the sentence needs"
            % (word, reading))


def _mcq(prompt, choices, note, passage=None):
    """A question with its choices still in bank order - answer first."""
    return {
        "prompt": prompt,
        "choices": list(choices),
        "_correct": choices[0],
        "explanation": note,
        "passage": passage,
    }


def expand(level, kind, item, rng):
    """One bank item as one or more questions, answer still first."""
    if kind == "reading":
        right = item.get("r") or word_reading(level, item["w"])
        if not right:
            raise ValueError("no reading known for %s" % item["w"])
        check_okurigana(item["w"], right)
        wrong = item.get("d") or vocab_gen.reading_distractors(
            right, avoid=[r for r in _READINGS.get(item["w"], []) if r != right])
        if not wrong:
            raise ValueError("no distractors for %s (%s)" % (item["w"], right))
        prompt = item["s"].format("<u>%s</u>" % item["w"])
        return [_mcq(prompt, [right] + list(wrong),
                     item.get("n") or gloss_note(item["w"], right))]

    if kind == "orthography":
        right = item["w"]
        read = item.get("r") or word_reading(level, right)
        check_okurigana(right, read)
        wrong = item.get("d") or vocab_gen.written_distractors(right)
        if not wrong:
            raise ValueError("no written distractors for %s" % right)
        prompt = item["s"].format("<u>%s</u>" % read)
        return [_mcq(prompt, [right] + list(wrong),
                     item.get("n") or gloss_note(right, read))]

    if kind in ("context", "paraphrase", "grammar", "formation"):
        return [_mcq(item["s"], item["ch"], item.get("n"))]

    if kind == "usage":
        # 用法. The word is the prompt and the four choices are whole
        # sentences, only one of which uses it the way Japanese uses it.
        # The other three are the point of the question: each is a sentence
        # somebody learning the word from a glossary would happily write.
        return [_mcq(item["w"], item["ch"], item.get("n"))]

    if kind == "order":
        # The four fragments in the order they belong, and which of the four
        # blanks carries the star. The paper prints the fragments shuffled
        # and asks which one goes there, so the answer is a fragment, not a
        # position - and it is only findable by assembling the sentence.
        parts = item["parts"]
        star = item["star"] - 1
        shown = list(parts)
        rng.shuffle(shown)
        blanks = []
        for i in range(len(parts)):
            blanks.append("＿★＿" if i == star else "＿＿＿")
        pre, post = item.get("pre", ""), item.get("post", "")
        # No space in front of the full stop: the blanks are a run of boxes
        # in the printed paper and the punctuation sits against the last one.
        joiner = "" if post[:1] in "。、？！" else "　"
        prompt = "%s　%s%s%s" % (pre, "　".join(blanks), joiner, post)
        # The answer to a 組み立て question is a fragment, which on its own
        # says nothing. The sentence it belongs to is the explanation.
        note = item.get("n") or ("ただしい じゅんばん： %s%s%s"
                                 % (pre, "".join(parts), post))
        return [_mcq(prompt.strip(), [parts[star]] +
                     [p for p in shown if p != parts[star]], note)]

    if kind == "cloze":
        # The blanks are numbered, and the player prints the questions in
        # the order they are listed. If the passage carries 【5】 before
        # 【4】, the paper asks them out of order and the reader has to hunt
        # back up the page for each one.
        order = re.findall(r"\u3010(\d+)\u3011", item["passage"])
        want = [str(i) for i in range(1, len(item["qs"]) + 1)]
        if order != want:
            raise ValueError(
                "cloze blanks appear as %s but the questions are %s"
                % (",".join(order), ",".join(want)))
        out = []
        for i, q in enumerate(item["qs"], 1):
            out.append(_mcq("【%d】" % i, q["ch"], q.get("n"),
                            passage=item["passage"]))
        return out

    if kind in PASSAGE_KINDS:
        return [_mcq(q["s"], q["ch"], q.get("n"), passage=item["passage"])
                for q in item["qs"]]

    if kind in ("listen1", "listen2"):
        # 課題理解 and ポイント理解: the question is asked, the conversation
        # plays, the question is asked again. All three are script lines, so
        # the player has nothing to assemble - see speechLines().
        q = item["q"]
        script = [["", q]] + [list(r) for r in item["script"]] + [["", q]]
        node = _mcq(q, item["ch"], item.get("n"))
        node["script"] = script
        return [node]

    if kind in ("gist", "listen5a"):
        # 概要理解 and the single-question half of 統合理解. Nothing at all is
        # printed: not the question, not the choices. You hear the talk, then
        # you hear what is being asked, then you hear the four answers once.
        # So the whole thing is script, and the prompt is empty on purpose -
        # printing the question here would hand over the answer.
        node = _mcq("", item["ch"], item.get("n"))
        node["_spoken_pre"] = [list(r) for r in item["script"]]
        node["_spoken_choices"] = item["q"]
        return [node]

    if kind == "listen5b":
        # The other half of 統合理解: one long talk, then two questions whose
        # choices are printed. Both carry the talk, so either can replay it.
        script = [list(r) for r in item["script"]]
        out = []
        for q in item["qs"]:
            node = _mcq(q["q"], q["ch"], q.get("n"))
            node["script"] = [list(r) for r in script]
            out.append(node)
        return out

    if kind == "listen3":
        # 発話表現. The real paper shows a picture and an arrow at the person
        # who has to speak; there are no pictures here, so the situation is
        # written out instead and the three things they might say are spoken.
        node = _mcq(item["scene"], item["ch"], item.get("n"))
        node["_spoken_choices"] = item["scene"]
        return [node]

    if kind == "listen4":
        # 即時応答. Nothing is printed in the real paper and nothing is
        # printed here either: the prompt is empty, and the line you are
        # answering exists only in the audio and in the transcript. That is
        # the question. Printing it would answer it.
        node = _mcq("", item["ch"], item.get("n"))
        node["_spoken_choices"] = item["say"]
        return [node]

    raise ValueError("unknown kind %s" % kind)


# --------------------------------------------------------------------------
# assembly

MONDAI_NUM = re.compile(r"(?:\u554f\u984c|\u3082\u3093\u3060\u3044)\s*(\d+)")


def renumber(instruction, was, now):
    """問題3 -> 問題13, wherever the number appears in the instruction."""
    for head in ("\u554f\u984c", "\u3082\u3093\u3060\u3044"):
        instruction = instruction.replace("%s%d" % (head, was),
                                          "%s%d" % (head, now))
    return instruction


def make_questions(level, kind, items, rng):
    """Bank items as finished questions of one 問題."""
    _mondai, instruction = MONDAI[level][kind]
    out = []
    for item in items:
        for q in expand(level, kind, item, rng):
            right = q.pop("_correct")
            rng.shuffle(q["choices"])
            q["answer"] = q["choices"].index(right) + 1
            # 問題3 and 問題4 read the choices aloud, numbered. The numbers
            # have to match the order they are printed in, so this waits
            # for the shuffle.
            pre = q.pop("_spoken_pre", None)
            opener = q.pop("_spoken_choices", None)
            if pre or opener is not None:
                lines = [list(r) for r in (pre or [])]
                if opener is not None:
                    lines.append(["", opener])
                q["script"] = lines + [
                    [str(j + 1), c] for j, c in enumerate(q["choices"])]
            q["category"] = CATEGORY[kind]
            q["instruction"] = instruction
            out.append(q)
    return out


# --------------------------------------------------------------------------
# topping up the hand-written papers
#
# Practice Tests 1 and 2 were written by hand, before any of this existed.
# Test 2 is a whole paper bar its 聴解; Test 1 is three questions and was
# never anything more. Neither is deleted and neither is rewritten: the
# hand-written questions live in practice-bank/seed/, and what is missing is
# dealt from the same banks and appended.
#
# A seed question may carry a "kind" saying which 問題 it belongs to. Where
# it does, that 問題 is filled up to its published count around it. Where a
# part carries no kinds at all it is taken as finished and left alone, and a
# part that is absent is dealt whole.

def top_up(level, banks, used, rng):
    if not os.path.isdir(SEED):
        return 0
    done = 0
    for fn in sorted(os.listdir(SEED)):
        if not fn.startswith(level) or not fn.endswith(".json"):
            continue
        seed = json.load(io.open(os.path.join(SEED, fn), encoding="utf-8"))

        # Practice Test 2 numbers its 問題 straight through the paper - 1 to 4
        # in 文字・語彙 and 5 to 10 in 文法・読解 - rather than restarting in
        # each booklet the way the printed paper does. A 聴解 section appended
        # to it as 問題1 would read as though the paper started again. So a
        # booklet dealt whole into a seed paper continues that paper's own
        # numbering instead of using its own.
        offset = 0
        for part_id, kinds in SHAPE[level]:
            was = next((p for p in seed["parts"] if p["id"] == part_id), None)
            if was and not any(q.get("kind") for q in was["questions"]):
                for q in was["questions"]:
                    m = MONDAI_NUM.search(q.get("instruction") or "")
                    if m:
                        offset = max(offset, int(m.group(1)))

        parts = []
        added = 0
        for part_id, kinds in SHAPE[level]:
            was = next((p for p in seed["parts"] if p["id"] == part_id), None)
            kept = list(was["questions"]) if was else []
            questions = []
            for kind, n in kinds:
                mine = [q for q in kept if q.get("kind") == kind]
                if was and not any(q.get("kind") for q in kept):
                    continue                    # the part is finished as it is
                for q in mine:
                    q = dict(q)
                    q.pop("kind", None)
                    q["instruction"] = MONDAI[level][kind][1]
                    q.setdefault("category", CATEGORY[kind])
                    questions.append(q)
                short = n - len(mine)
                if short > 0:
                    take = banks[kind][used[kind]:used[kind] + short]
                    used[kind] += short
                    got = make_questions(level, kind, take, rng)
                    if offset and not mine:
                        num = MONDAI[level][kind][0]
                        for q in got:
                            q["instruction"] = renumber(
                                q["instruction"], num, num + offset)
                    questions.extend(got)
                    added += len(got)
            if was and not any(q.get("kind") for q in kept):
                parts.append({"id": part_id, "questions": kept})
            elif questions:
                parts.append({"id": part_id, "questions": questions})
        if not added:
            continue
        paper = dict(seed)
        paper["parts"] = parts
        io.open(os.path.join(OUT, "%s.json" % seed["id"]), "w",
                encoding="utf-8").write(
            json.dumps(paper, ensure_ascii=False, indent=1))
        print("%s: topped up with %d questions (now %d)"
              % (seed["id"], added,
                 sum(len(p["questions"]) for p in paper["parts"])))
        done += 1
    return done


def sweep(level, papers):
    """Delete composed papers this level no longer makes.

    The builder writes Practice Test 3 upwards and never removed anything,
    so a level that shrank left its last paper on disk - still in the index,
    still sat by anybody who had the link, and holding the questions that
    had gone back into circulation. That is how n5-practice-19 came to carry
    the same twelve questions as n5-practice-1.

    A seed paper is never swept: it is hand-written, and top_up() rewrites
    it in place rather than dealing it.
    """
    seeds = set()
    if os.path.isdir(SEED):
        seeds = set(fn[:-5] for fn in os.listdir(SEED) if fn.endswith(".json"))
    last = FIRST + papers - 1
    gone = 0
    for fn in sorted(os.listdir(OUT)):
        name = fn[:-5]
        if not fn.endswith(".json") or not name.startswith(level + "-practice-"):
            continue
        if name in seeds:
            continue
        try:
            number = int(name.rsplit("-", 1)[1])
        except ValueError:
            continue
        if number > last:
            os.remove(os.path.join(OUT, fn))
            print("%s: removed %s (no longer composed)" % (level.upper(), name))
            gone += 1
    return gone


def build(level):
    banks = {}
    for _, kinds in SHAPE[level]:
        for kind, _n in kinds:
            banks[kind] = load(level, kind)

    short = [(k, n, len(banks[k])) for _, kinds in SHAPE[level]
             for k, n in kinds if len(banks[k]) < n]
    if short:
        print("%s: cannot fill a paper - %s" % (level.upper(), ", ".join(
            "%s has %d, needs %d" % (k, have, n) for k, n, have in short)))
        return 0

    papers = min(PAPERS.get(level, DEFAULT_PAPERS),
                 min(len(banks[k]) // n for _, kinds in SHAPE[level]
                     for k, n in kinds))

    rng = random.Random("%s-practice" % level)
    for k in sorted(banks):
        banks[k] = ordered(DEAL_STATE, level, k, banks[k], rng)

    for i in range(papers):
        number = FIRST + i
        parts = []
        for part_id, kinds in SHAPE[level]:
            questions = []
            for kind, n in kinds:
                questions.extend(make_questions(
                    level, kind, banks[kind][i * n:(i + 1) * n], rng))
            parts.append({"id": part_id, "questions": questions})

        paper = {
            "id": "%s-practice-%d" % (level, number),
            "level": level.upper(),
            "periodLabel": "Practice Test %d" % number,
            "parts": parts,
        }
        io.open(os.path.join(OUT, "%s-practice-%d.json" % (level, number)),
                "w", encoding="utf-8").write(
            json.dumps(paper, ensure_ascii=False, indent=1))

    sweep(level, papers)

    used = {}
    for _, kinds in SHAPE[level]:
        for k, n in kinds:
            used[k] = papers * n
    per = sum(n for _, kinds in SHAPE[level] for _, n in kinds)
    left = min(len(banks[k]) - used[k] for k in used)
    print("%s: %d papers (%d spare items in the tightest bank)"
          % (level.upper(), papers, left))
    top_up(level, banks, used, rng)
    return papers


# Latin and Cyrillic letters do appear in a real paper - ABC in a diagram,
# a company name, 5,300円 - but they appear in the passage, never in the
# stem of a vocabulary item or in one of its four choices. Where they turn
# up there it is a note-to-self that never got written over, and it is
# invisible in review because the eye reads past a word it understands.
# Three Latin letters or more, because one or two are how a real paper writes
# the A and B of a comparison, 30GB and 98cm; an all-capital run is let
# through as an acronym. A single Cyrillic or Hangul letter is enough, because no paper
# here has any business containing one - and one letter is exactly how it
# hides, in the middle of a word the eye reads straight past.
STRAY = re.compile(r"[A-Za-z]{3,}|[\u0400-\u04ff\uac00-\ud7af]")


def stray_letters():
    """Any composed question whose stem or choices are not Japanese."""
    out = []
    for fn in sorted(os.listdir(OUT)):
        if not fn.endswith(".json"):
            continue
        exam = json.load(io.open(os.path.join(OUT, fn), encoding="utf-8"))
        for part in exam["parts"]:
            for q in part["questions"]:
                # <u>, <br> and the table in an information-search question
                # are ours; what is left of the text has to be Japanese.
                strip = lambda t: re.sub(r"</?[a-z]+[^>]*>", "", t or "")
                texts = [strip(q.get("prompt")), strip(q.get("passage"))]
                for text in texts + list(q["choices"]):
                    for run in STRAY.findall(text):
                        if not run.isupper():
                            out.append((exam["id"], text[:50]))
    return out


def duplicates():
    """Any question that ended up in more than one paper.

    Each bank item is dealt once, so a repeat means the same question was
    written into two different banks - a sentence that is both a 文脈規定
    item and a 文法 item, say. That is a mistake in the bank, not in the
    deal, and it is invisible until somebody sits both papers. The passage
    is part of the key: two cloze blanks both printed as 【1】 with the same
    four choices are different questions when they sit under different
    passages.
    """
    seen = {}
    repeats = []
    for fn in sorted(os.listdir(OUT)):
        if not fn.endswith(".json"):
            continue
        exam = json.load(io.open(os.path.join(OUT, fn), encoding="utf-8"))
        for part in exam["parts"]:
            for q in part["questions"]:
                # 即時応答 prints nothing but its three choices, so two
                # of them look identical on the page while being different
                # questions - what is being asked is in the recording. The
                # script is part of what makes the question.
                key = (q.get("passage") or "",
                       json.dumps(q.get("script") or "", ensure_ascii=False),
                       q["prompt"], tuple(sorted(q["choices"])))
                if key in seen:
                    repeats.append((seen[key], exam["id"], q["prompt"][:40]))
                else:
                    seen[key] = exam["id"]
    return repeats


DEAL_STATE = {}


def main():
    global DEAL_STATE
    DEAL_STATE = read_deal()
    total = 0
    for level in ("n5", "n4", "n3", "n2", "n1"):
        total += build(level)
    io.open(DEAL, "w", encoding="utf-8").write(
        json.dumps(DEAL_STATE, ensure_ascii=False, indent=1))
    print("wrote %d papers" % total)
    stray = stray_letters()
    if stray:
        print("!! %d question(s) carry non-Japanese text:" % len(stray))
        for exam_id, text in stray:
            print("   %s: %s" % (exam_id, text))
    repeats = duplicates()
    if repeats:
        print("!! %d question(s) appear in more than one paper:" % len(repeats))
        for a, b, prompt in repeats:
            print("   %s and %s: %s" % (a, b, prompt))
    else:
        print("no question appears in more than one paper")


if __name__ == "__main__":
    main()
