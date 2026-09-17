# -*- coding: utf-8 -*-
"""Six more guides, kept out of build_guides.py so that file stays readable.

Same rule as the three there: a real answer to something people type, built
out of facts the site already holds, so the guide and the papers cannot
disagree. Each one links into the level pages and the lists, because a guide
that answers the question and then leaves the reader on the page is a guide
that was written for a crawler.
"""

KANJI_COUNTS = """
        <p>The honest answer first: <strong>nobody knows exactly.</strong> The
           JLPT published kanji and vocabulary lists until 2009 and stopped
           when the test was redesigned in 2010. Every figure you will see
           quoted since — including the ones below — is reverse-engineered
           from past papers.</p>

        <h2>The figures everyone quotes</h2>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>Level</th><th>Kanji</th><th>Vocabulary</th><th>Cumulative</th></tr></thead>
            <tbody>
              <tr><td>N5</td><td>~100</td><td>~800</td><td>~100 kanji</td></tr>
              <tr><td>N4</td><td>~300</td><td>~1,500</td><td>~300 kanji</td></tr>
              <tr><td>N3</td><td>~600</td><td>~3,500</td><td>~600 kanji</td></tr>
              <tr><td>N2</td><td>~1,000</td><td>~6,000</td><td>~1,000 kanji</td></tr>
              <tr><td>N1</td><td>~2,000</td><td>~10,000</td><td>~2,000 kanji</td></tr>
            </tbody>
          </table>
        </div>
        <p>Those are cumulative, not per level: N3's ~600 includes N5's and
           N4's. The step people feel most is N4 to N3, which roughly doubles
           both columns at once — that jump has
           <a href="n4-to-n3.html">a guide of its own</a>.</p>

        <h2>Counting kanji is the wrong measure anyway</h2>
        <p>A kanji is not a unit of knowledge. 生 is an N5 character and it is
           read せい, しょう, い, う, は, き and なま depending on the word it
           is in. Knowing that 生 means "life" will not get you through
           生ビール, 芝生, 生糸 or 一生懸命.</p>
        <p>What the exam tests is <em>words</em>. That is why the vocabulary
           column grows faster than the kanji column, and why a candidate who
           has drilled 2,000 characters in isolation can still fail N1
           reading.</p>

        <h2>What this site holds</h2>
        <p>The study lists here are built from the same JLPT level data the
           glossary uses:</p>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>Level</th><th>Words</th><th>Kanji</th><th>Grammar</th></tr></thead>
            <tbody>
              <tr><td><a href="/level/n5.html">N5</a></td><td>757</td><td>79</td><td>52</td></tr>
              <tr><td><a href="/level/n4.html">N4</a></td><td>716</td><td>166</td><td>56</td></tr>
              <tr><td><a href="/level/n3.html">N3</a></td><td>2,287</td><td>367</td><td>59</td></tr>
              <tr><td><a href="/level/n2.html">N2</a></td><td>2,119</td><td>367</td><td>54</td></tr>
              <tr><td><a href="/level/n1.html">N1</a></td><td>3,759</td><td>1,232</td><td>59</td></tr>
            </tbody>
          </table>
        </div>
        <p>Each list carries the reading, a meaning and the stroke order for
           the kanji, and you can cover the answers and test yourself down the
           page.</p>

        <h2>The measure that actually tells you something</h2>
        <p>Sit a paper. On this site every question carries the meaning of
           every word in it, so a paper you cannot yet pass still tells you
           what you are missing — which is more than a number of characters
           will ever tell you.</p>
"""

N3_OR_N2 = """
        <p>There is a line in the JLPT's own scoring table that people assume
           is a misprint: <strong>N3 needs 95 out of 180 to pass, and N2 needs
           90.</strong> The harder exam has the lower pass mark.</p>

        <h2>It is not a mistake, and it does not make N3 harder</h2>
        <p>JLPT scores are scaled, not counted. The pass mark is set against
           the scale for that level, so a raw percentage at N3 and a raw
           percentage at N2 are not the same thing. What the two numbers tell
           you is how the scale is drawn, not which paper is harder — and N2
           is unquestionably the harder paper.</p>
        <p>The rule that fails people at both levels is the same, and it is
           not the total. Every scored section has its own minimum, and one
           section below it fails the whole paper however high the total.
           <a href="jlpt-scoring.html">How the JLPT is scored</a> has the
           arithmetic.</p>

        <h2>What actually changes between them</h2>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th></th><th>N3</th><th>N2</th></tr></thead>
            <tbody>
              <tr><td>Sitting time</td><td>140 min</td><td>155 min</td></tr>
              <tr><td>Pass mark</td><td>95 / 180</td><td>90 / 180</td></tr>
              <tr><td>Booklets</td><td>Three</td><td>Two (vocabulary, grammar and reading are one paper)</td></tr>
              <tr><td>Kanji</td><td>~600</td><td>~1,000</td></tr>
              <tr><td>Vocabulary</td><td>~3,500</td><td>~6,000</td></tr>
            </tbody>
          </table>
        </div>
        <p>The structural change is the second row from the bottom of that
           table and it is easy to miss: at N2 the vocabulary, grammar and
           reading are <em>one timed paper</em>. You are given 105 minutes and
           you decide how much of it the reading gets. Candidates who have only
           ever sat N3, where the booklets are separate and the clock is
           handed to them, lose reading questions to the clock rather than to
           the language.</p>

        <h2>Which one to enter</h2>
        <p>Enter N2 if the certificate is for a job, a visa point score or a
           university. N3 is rarely asked for by name; N2 is the line most
           employers in Japan draw. Failing N2 costs the fee and tells you
           exactly which section to work on, which is worth more than passing
           an N3 nobody asked for.</p>
        <p>Enter N3 if you want a checkpoint, if reading long texts is still
           slow, or if you are more than a year from N2 and want something
           this year.</p>

        <h2>Then check the guess against a paper</h2>
        <p>Do not decide from a table. Sit one of each: there are
           <a href="/level/n3.html">53 N3 papers</a> and
           <a href="/level/n2.html">54 N2 papers</a> here, timed and marked
           section by section, free. The section breakdown after you submit
           answers the question better than any article can.</p>
"""

LISTENING = """
        <p>Listening is the section people lose on. It is 60 of the 180
           points at every level, it has its own minimum you have to clear,
           and it is the one part of the exam you cannot go back and check:
           the recording is played <strong>once</strong>.</p>

        <h2>Why it is harder to practise than the rest</h2>
        <p>Reading you can do anywhere with anything. Listening needs audio
           that is at exam speed, in exam format, with the answers — and the
           free material tends to be one of those three at a time. So people
           practise the sections they can practise, and walk into the exam
           having never sat a full 聴解 booklet under the clock.</p>

        <h2>The format, which is half the battle</h2>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>問題</th><th>What it asks</th><th>Options printed?</th></tr></thead>
            <tbody>
              <tr><td>課題理解</td><td>What must this person do next?</td><td>Yes</td></tr>
              <tr><td>ポイント理解</td><td>One specific fact, named before the clip</td><td>Yes</td></tr>
              <tr><td>概要理解</td><td>What is this talk about?</td><td>No — read out</td></tr>
              <tr><td>即時応答</td><td>One line; choose the natural reply</td><td>No — read out</td></tr>
              <tr><td>統合理解</td><td>Long clip, two questions, often two speakers</td><td>Sometimes</td></tr>
            </tbody>
          </table>
        </div>
        <p>Two of those print nothing at all on the question paper. If the
           first time you meet 即時応答 is in the exam hall, you will lose the
           question to the format rather than to your Japanese — the answers
           go past in four seconds and you were still waiting to read them.</p>

        <h2>A method that works</h2>
        <ol class="guide-steps">
          <li><strong>Sit the section cold, once, at full speed.</strong> No
              pausing, no rewinding. That is the exam.</li>
          <li><strong>Mark it before you look at anything.</strong> The score
              on a cold pass is the only honest measurement you get.</li>
          <li><strong>Now read the script</strong> — and find the exact word
              where you lost the thread. It is usually one connective or one
              piece of vocabulary, not the whole clip.</li>
          <li><strong>Listen again with the script in front of you</strong>,
              then once more without it.</li>
          <li><strong>Come back to the same section a week later.</strong> If
              it is now easy, the problem was vocabulary. If it is still hard,
              the problem is speed, and speed only comes from volume.</li>
        </ol>

        <h2>What this site gives you for it</h2>
        <p>Every listening question here carries its script, and the script
           sits behind a fold on the question itself — so step 3 is one click,
           not a hunt through a PDF. Where the original recording was lost,
           your own device reads the script aloud, so no listening section is
           a dead page. Every word in the script has its meaning and its
           reading a tap away, and furigana goes over the whole thing if you
           want it.</p>
        <p>On the questions whose options were only read out and never
           printed, the four choices are recovered from the recording and
           shown after you answer — so you can see what you were choosing
           between.</p>
        <p>Start with a full section at your level:
           <a href="/level/n5.html">N5</a> ·
           <a href="/level/n4.html">N4</a> ·
           <a href="/level/n3.html">N3</a> ·
           <a href="/level/n2.html">N2</a> ·
           <a href="/level/n1.html">N1</a>.</p>
"""

QUESTION_TYPES = """
        <p>The JLPT asks the same question types every sitting, in the same
           order, numbered 問題1 upward. Knowing the list is worth real marks:
           most of what people lose in the first ten minutes is lost to being
           surprised by a format, not by the Japanese in it.</p>
        <p>The lists below are counted from the papers on this site rather
           than copied from anywhere — a range means the papers differ.</p>

        <h2>文字・語彙 — writing and vocabulary</h2>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>問題</th><th>Name</th><th>What it asks</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>漢字読み</td><td>How is the underlined word read?</td></tr>
              <tr><td>2</td><td>表記</td><td>Which kanji spells the underlined word?</td></tr>
              <tr><td>3</td><td>語形成</td><td>Prefixes, suffixes, compound forms (N2, N1)</td></tr>
              <tr><td>4</td><td>文脈規定</td><td>Which word fits this sentence?</td></tr>
              <tr><td>5</td><td>言い換え類義</td><td>Which word means the same as the underlined one?</td></tr>
              <tr><td>6</td><td>用法</td><td>Which sentence uses this word correctly?</td></tr>
            </tbody>
          </table>
        </div>
        <p>問題6 is the one people find hardest to prepare: four sentences,
           all grammatical, and only one uses the word the way a Japanese
           speaker would. Knowing a dictionary definition is not enough — you
           need to have met the word in use.</p>

        <h2>文法 — grammar</h2>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>問題</th><th>Name</th><th>What it asks</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>文法形式の判断</td><td>Which form fits the blank?</td></tr>
              <tr><td>2</td><td>文の組み立て</td><td>Reorder four fragments; answer the starred slot</td></tr>
              <tr><td>3</td><td>文章の文法</td><td>A passage with blanks, tested for flow</td></tr>
            </tbody>
          </table>
        </div>
        <p>文の組み立て is worth practising separately. You build the whole
           sentence and then answer about one position in it, and a candidate
           who assembles it correctly can still mark the wrong box by
           miscounting the star.</p>

        <h2>読解 — reading</h2>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>Name</th><th>What it is</th></tr></thead>
            <tbody>
              <tr><td>内容理解（短文）</td><td>200 characters, one question</td></tr>
              <tr><td>内容理解（中文）</td><td>500 characters, three questions</td></tr>
              <tr><td>内容理解（長文）</td><td>1,000 characters, several questions</td></tr>
              <tr><td>統合理解</td><td>Two texts on one topic, compared</td></tr>
              <tr><td>主張理解</td><td>An argument — what does the writer claim?</td></tr>
              <tr><td>情報検索</td><td>A leaflet or timetable; find the one fact</td></tr>
            </tbody>
          </table>
        </div>
        <p>情報検索 is the cheapest section on the paper and it is last, which
           is why so many people never reach it. Do it first if you are slow
           at reading: it is a search task, not a comprehension task, and it
           carries the same marks as anything else.</p>

        <h2>聴解 — listening</h2>
        <p>Five types, two of which print nothing on the paper at all. They
           have <a href="jlpt-listening-practice.html">their own guide</a>,
           because the format is most of the difficulty.</p>

        <h2>See it on a real paper</h2>
        <p>Every level page here lists the 問題 that level actually contains,
           with how many questions each holds:
           <a href="/level/n5.html">N5</a> ·
           <a href="/level/n4.html">N4</a> ·
           <a href="/level/n3.html">N3</a> ·
           <a href="/level/n2.html">N2</a> ·
           <a href="/level/n1.html">N1</a>.</p>
"""

EXAM_DAY = """
        <p>The Japanese in the exam is the part you have prepared for. The
           day itself has a shape, and knowing it is worth a few marks to
           anybody who would otherwise spend the first section settling
           down.</p>

        <h2>Before the day</h2>
        <ul class="guide-list">
          <li><strong>The voucher.</strong> Your test voucher with the photo
              on it is what gets you into the room. Print it if your host
              sends it as a file, and check the venue on it — in big cities
              it is often not the building you registered at.</li>
          <li><strong>The venue, once, in advance.</strong> JLPT sittings are
              on Sunday mornings in university buildings that are otherwise
              closed. Signage is thin and staff are few.</li>
          <li><strong>Pencils, not pens.</strong> The answer sheet is read by
              a machine: HB or No.2 pencils and a clean eraser. Bring two of
              each.</li>
        </ul>

        <h2>How the sitting runs</h2>
        <p>You are seated by candidate number. The booklets are handed out
           face down and collected between sections — you cannot go back to
           a section once its booklet is gone, and you cannot start the next
           one early.</p>
        <p>The total sitting is longer than the sum of the papers, because
           there are breaks and instructions between them:</p>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>Level</th><th>Papers</th><th>Time on the clock</th></tr></thead>
            <tbody>
              <tr><td>N5</td><td>Three</td><td>90 min</td></tr>
              <tr><td>N4</td><td>Three</td><td>115 min</td></tr>
              <tr><td>N3</td><td>Three</td><td>140 min</td></tr>
              <tr><td>N2</td><td>Two</td><td>155 min</td></tr>
              <tr><td>N1</td><td>Two</td><td>165 min</td></tr>
            </tbody>
          </table>
        </div>
        <p>Listening is always last, it is played through the room's speakers,
           and it is played <strong>once</strong>. There is no pause between
           questions beyond what is on the recording.</p>

        <h2>The rules that catch people out</h2>
        <ul class="guide-list">
          <li>Phones off and away — not on silent, off and in your bag.</li>
          <li>No electronic dictionaries, no rulers, no correction tape.</li>
          <li>Watches: some venues allow a silent analogue watch and some ban
              watches entirely. There is a clock in the room either way.
              Check the instructions your host sent.</li>
          <li>Latecomers may be refused entry to the first section. The doors
              close before the stated start time, not at it.</li>
        </ul>
        <p>Rules vary a little by country and host, so the sheet that came
           with your voucher beats anything written here.</p>

        <h2>The rehearsal is the point</h2>
        <p>Almost everything above is about not being surprised. The cheapest
           way to buy that is to sit a full paper on the clock at least once
           before the day — same length, same order, listening last and played
           once. Every paper on this site runs that way:
           <a href="/level/n5.html">N5</a> ·
           <a href="/level/n4.html">N4</a> ·
           <a href="/level/n3.html">N3</a> ·
           <a href="/level/n2.html">N2</a> ·
           <a href="/level/n1.html">N1</a>.</p>
"""

STUDY_HOURS = """
        <p>The question everybody asks, and the only honest answer is a range
           — but the range is genuinely useful, because it tells you whether
           the level you are aiming at this December is a plan or a wish.</p>

        <h2>The commonly quoted hours</h2>
        <p>These come from surveys of people who passed, and they split on one
           thing: whether you already read Chinese characters. A Chinese
           speaker starts the kanji half of the exam most of the way home.</p>
        <div class="guide-table-wrap">
          <table class="guide-table">
            <thead><tr><th>Level</th><th>With a kanji background</th><th>Without</th></tr></thead>
            <tbody>
              <tr><td>N5</td><td>250–450 h</td><td>325–600 h</td></tr>
              <tr><td>N4</td><td>400–700 h</td><td>575–1,000 h</td></tr>
              <tr><td>N3</td><td>700–1,100 h</td><td>950–1,700 h</td></tr>
              <tr><td>N2</td><td>1,050–1,500 h</td><td>1,150–1,800 h</td></tr>
              <tr><td>N1</td><td>1,700–2,600 h</td><td>3,000–4,800 h</td></tr>
            </tbody>
          </table>
        </div>
        <p>They are cumulative — the N2 row is total hours from zero, not
           hours from N3. And the ranges are wide because they are measuring
           people, not curricula.</p>

        <h2>What that means in months</h2>
        <p>At <strong>one hour a day</strong>, N4 from zero is roughly two
           years. At <strong>three hours a day</strong> it is eight months. The
           JLPT runs twice a year, in July and December, so the arithmetic
           that matters is hours-per-week against the number of weeks left,
           and it is worth doing honestly once rather than optimistically
           every week.</p>

        <h2>Why N1 breaks the pattern</h2>
        <p>Look at the last row. Without kanji, N1 is not one step past N2 —
           it is most of another N2 again. The vocabulary roughly doubles, the
           reading turns to editorial and academic prose, and the listening
           assumes you are following an argument rather than a conversation.
           People who cleared N2 in a year routinely spend two more on N1.</p>

        <h2>Hours are an input, not a measure</h2>
        <p>Nobody has ever passed on hours. What decides it is whether you can
           finish the reading in the time given and clear the minimum in every
           section — and the only instrument for that is a timed paper.</p>
        <p>Sit one now, at the level you are aiming for, and again every few
           weeks. The section breakdown tells you where the hours should go
           next, which is the part a study plan cannot guess:
           <a href="/level/n5.html">N5</a> ·
           <a href="/level/n4.html">N4</a> ·
           <a href="/level/n3.html">N3</a> ·
           <a href="/level/n2.html">N2</a> ·
           <a href="/level/n1.html">N1</a>.</p>
"""

EXTRA = [
  dict(slug="jlpt-kanji-vocabulary-counts.html",
       h1="How many kanji does each JLPT level need?",
       title="JLPT Kanji and Vocabulary by Level — N5 to N1 Counts Explained",
       desc="~100 kanji at N5, ~2,000 at N1 — and why the counts are estimates, why the vocabulary column matters more, and what the lists on this site actually hold.",
       standfirst="The JLPT stopped publishing its lists in 2010. Every count you have read since is reverse-engineered.",
       body=KANJI_COUNTS),
  dict(slug="n3-or-n2.html",
       h1="N3 or N2? The pass mark that surprises people",
       title="JLPT N3 or N2 — Which to Take, and Why N3 Needs a Higher Score",
       desc="N3 needs 95 out of 180 and N2 needs 90, and N2 is still the harder exam. What scaled scoring means, what changes between the two, and which one to enter.",
       standfirst="N3 needs a higher score than N2. It is not a misprint, and it does not make N3 harder.",
       body=N3_OR_N2),
  dict(slug="jlpt-listening-practice.html",
       h1="How to practise JLPT listening",
       title="JLPT Listening Practice — The Format, the Method, and Why It Is Played Once",
       desc="Listening is 60 of 180 points at every level and has its own minimum. The five question types, two of which print nothing, and a five-step method for practising alone.",
       standfirst="Sixty points at every level, its own minimum to clear, and the recording is played once.",
       body=LISTENING),
  dict(slug="jlpt-question-types.html",
       h1="Every 問題 on the JLPT, explained",
       title="JLPT Question Types — Every 問題 from 文字・語彙 to 聴解",
       desc="漢字読み, 用法, 文の組み立て, 情報検索, 即時応答 — what each 問題 asks, which ones print nothing, and where candidates lose marks to the format.",
       standfirst="Most of what is lost in the first ten minutes is lost to a format, not to the Japanese.",
       body=QUESTION_TYPES),
  dict(slug="jlpt-exam-day.html",
       h1="JLPT exam day: how the sitting runs",
       title="JLPT Exam Day — What to Bring and How the Sitting Runs",
       desc="Booklets collected between sections, listening last and played once, pencils not pens. How the day is shaped, and the rules that catch people out.",
       standfirst="The Japanese is the part you prepared for. The day has a shape too.",
       body=EXAM_DAY),
  dict(slug="jlpt-study-hours.html",
       h1="How long does each JLPT level take?",
       title="JLPT Study Hours — How Long N5, N4, N3, N2 and N1 Really Take",
       desc="The commonly quoted hour ranges for every level, split by whether you already read kanji, what they mean in months, and why N1 is not one step past N2.",
       standfirst="The honest answer is a range — but the range tells you whether December is a plan or a wish.",
       body=STUDY_HOURS),
]
