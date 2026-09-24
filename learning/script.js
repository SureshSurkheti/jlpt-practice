(() => {
  /* ---------- Personal link: index.html?to=Name&p=line&r1=…&r2=…&r3=…&lang=ne ---------- */
  // make.html builds these links for you
  const params = new URLSearchParams(location.search);
  const clean = (value, max) => (value || "").trim().slice(0, max);
  const who = clean(params.get("to"), 40);
  const personalLine = clean(params.get("p"), 160);
  const customReasons = ["r1", "r2", "r3"].map((key) => clean(params.get(key), 140));
  const linkLang = params.get("lang");

  /* ---------- Languages: English / नेपाली ---------- */
  const TEXT = {
    en: {
      title: "A Little Question",
      tired: "out of breath… 😮‍💨",
      taunts: [
        "Nope! 😜", "Too slow 🏃", "Can't catch me 😝", "Missed 🙈",
        "Try the other one 💖", "Almost! 😅", "Hehe 🤭", "Wrong button 👉 Yes",
        "Not today 🙅", "Whoosh 💨"
      ],
      stepOf: "Step {n} of 4",
      greetingNamed: "Dear {name},",
      toNamed: "for {name}",
      reasonsKickerNamed: "Before I ask you something, {name}…",
      kickerNamed: "It's a date, {name}!",
      eventTitle: "💖 Date with Suresh",
      today: "Today",
      tomorrow: "Tomorrow",
      anyDay: "Whenever you're free",
      anyPlace: "Somewhere lovely — I'll plan it"
      // Everything else in English is read straight from index.html
    },
    ne: {
      title: "एउटा सानो प्रश्न",
      tired: "थाकें… 😮‍💨",
      taunts: [
        "अहँ! 😜", "धेरै ढिलो 🏃", "समात्न सक्दैनौ 😝", "छुट्यो 🙈",
        "अर्को बटन थिच न 💖", "झन्डै! 😅", "हेहे 🤭", "गलत बटन 👉 हुन्छ",
        "आज होइन 🙅", "स्वाँ 💨"
      ],
      badge: "१ नयाँ चिठी",
      introTitle: "कसैसँग तिम्रो लागि <em>एउटा सानो प्रश्न</em> छ…",
      to: "कोही खास मान्छेलाई",
      hint: "खोल्न छापमा थिच",
      greeting: "प्रिय तिमी,",
      body: "धेरै दिनदेखि तिमीलाई केही सोध्न मन थियो, तर म्यासेजले मात्र पुग्दैन जस्तो लाग्यो। त्यसैले यो चिठी लेखेँ।",
      question: "के तिमी मसँग <em>डेटमा जान्छौ?</em>",
      yes: "हुन्छ",
      no1: "अहँ",
      no2: "पक्का हो?",
      no3: "साँच्चै, साँच्चै पक्का?",
      no4: "प्लिज् न…?",
      plea1: "ओहो! गल्तीले थिचियो होला, हैन? 🥺",
      plea2: "म मिठो खाजा ल्याउँछु। एकदम मिठो वाला। 🍫🍿",
      plea3: "अब त पानी पर्न थाल्यो। हेर त के गर्‍यौ! 🌧️",
      plea4: "'अहँ' बटन त झोला बोकेर भाग्यो! 🧳💨",
      sign: "आशा गर्दै, तिम्रो",
      name: "सुरेश",
      kicker: "डेट पक्का भयो!",
      yesTitle: "तिमीले मेरो <em>पूरै हप्ता</em> बनाइदियौ।",
      whenLabel: "कहिले",
      when: "शुक्रबार, बेलुका ७ बजे",
      whereLabel: "कहाँ",
      where: "मैनबत्ती बलेको कुनै राम्रो ठाउँमा",
      dressLabel: "पहिरन",
      dress: "जुन लगाउँदा तिमी मुस्कुराउँछौ",
      note: "सुरेशलाई तिम्रो योजना पुग्यो 💌 यसको स्क्रिनसट लेऊ — अब यो पक्का भयो!",
      greetingNamed: "प्रिय {name},",
      toNamed: "{name}को लागि",
      reasonsKicker: "केही सोध्नु अघि…",
      reasonsKickerNamed: "{name}, केही सोध्नु अघि…",
      kickerNamed: "{name}, डेट पक्का भयो!",
      reasonsTitle: "तिम्रो बारेमा <em>३ वटा सानो कुरा</em>",
      reason1: "तिम्रो हरेक फोटो हेर्दा म बिनाकारण मुस्कुराउँछु।",
      reason2: "तिमी साधारण दिनलाई पनि खास बनाइदिने मान्छे जस्तो लाग्छ।",
      reason3: "र यदि मैले यो कहिल्यै सोधिनँ भने, म जीवनभर पछुताउनेछु…",
      continue: "अब, मेरो प्रश्न",
      addCalendar: "क्यालेन्डरमा राख",
      googleCalendar: "गुगल क्यालेन्डर",
      replay: "चिठी फेरि पढ",
      eventTitle: "💖 सुरेशसँग डेट",
      plannerKicker: "याय! डेट पक्का 💖",
      plannerTitle: "तिमीले मलाई <em>सबैभन्दा खुसी</em> बनायौ",
      plannerSub: "अब सँगै केही जादुमय योजना बनाऔँ। चार वटा सानो कदम मात्र, र सबै ऐच्छिक।",
      startPlan: "योजना बनाऔँ",
      stepOf: "कदम {n} / ४",
      back: "पछाडि",
      skip: "छोड",
      next: "अर्को",
      dayTitle: "तिमीलाई कुन दिन <em>चोरेर लैजाऊँ?</em>",
      daySub: "मन पर्ने दिन छान।",
      dayReaction: "म त अहिलेदेखि नै घण्टा गन्न थालेँ ⏳💕",
      timeTitle: "<em>सबैभन्दा राम्रो पल</em> छान",
      timeSub: "बिहानी, साँझ कि ताराको उज्यालो?",
      timeReaction: "एकदम राम्रो। म अलि चाँडै आइपुग्छु 😌",
      placeTitle: "<em>हाम्रो कहानी</em> कहाँबाट सुरु गरौँ?",
      placeSub: "एउटा छान, वा तिम्रो मन पर्ने ठाउँ लेख।",
      placeReaction: "वाह, राम्रो रोजाइ! 🌹",
      noteTitle: "केही <em>मिठो कुरा</em> भन",
      noteSub: "सुरेशलाई सानो सन्देश। उसले सधैँ सम्झेर राख्नेछ।",
      noteReaction: "यो पढेर सुरेश धेरै मुस्कुराउनेछ 😊",
      today: "आज",
      tomorrow: "भोलि",
      otherDate: "अर्को दिन",
      morning: "बिहान",
      afternoon: "दिउँसो",
      evening: "साँझ",
      night: "राति",
      exactTime: "ठ्याक्कै समय",
      coffee: "कफी",
      dinner: "डिनर",
      walk: "घुम्न",
      movie: "सिनेमा",
      surprise: "सरप्राइज",
      placePlaceholder: "वा ठाउँको नाम लेख…",
      notePlaceholder: "यहाँ लेख… (ऐच्छिक)",
      send: "मेरो योजना पठाऊ",
      plannerHint: "केही पनि अनिवार्य छैन। सिधै पठाए पनि हुन्छ 💕",
      noteLabel: "तिम्रो सन्देश",
      anyDay: "तिमीलाई फुर्सद हुँदा",
      anyPlace: "राम्रो ठाउँ — म मिलाउँछु"
    }
  };

  // Save the English wording from the page so switching back restores it
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    TEXT.en[el.dataset.i18n] = el.textContent.trim().replace(/\s+/g, " ");
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    TEXT.en[el.dataset.i18nHtml] = el.innerHTML.trim();
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    TEXT.en[el.dataset.i18nPlaceholder] = el.placeholder;
  });

  let lang = "en";
  const langHooks = []; // parts further down re-render themselves here

  // Text for one key: her name where the link has one, your own reasons if you wrote them
  function textFor(key, t) {
    const reasonNo = /^reason([123])$/.exec(key);
    if (reasonNo && customReasons[reasonNo[1] - 1]) return customReasons[reasonNo[1] - 1];
    const named = who && t[key + "Named"];
    return named ? named.replace("{name}", who) : t[key];
  }

  function applyLang(next) {
    lang = TEXT[next] ? next : "en";
    const t = TEXT[lang];
    document.documentElement.lang = lang;
    document.title = t.title;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = textFor(el.dataset.i18n, t);
      if (value != null) el.textContent = value;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const value = t[el.dataset.i18nHtml];
      if (value != null) el.innerHTML = value;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const value = t[el.dataset.i18nPlaceholder];
      if (value != null) el.placeholder = value;
    });
    document.querySelectorAll(".btn--no").forEach((btn) => { btn.dataset.tired = t.tired; });
    langHooks.forEach((hook) => hook());
    document.querySelectorAll(".lang button").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });
    try { localStorage.setItem("date-invite-lang", lang); } catch {}
  }

  let savedLang = null;
  try { savedLang = localStorage.getItem("date-invite-lang"); } catch {}
  const phoneIsNepali = (navigator.language || "").toLowerCase().startsWith("ne");
  applyLang(savedLang || (TEXT[linkLang] ? linkLang : phoneIsNepali ? "ne" : "en"));

  document.querySelectorAll(".lang button").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.dataset.lang));
  });

  /* ---------- Email alerts (Web3Forms) ---------- */
  const KEY = (window.WEB3FORMS_KEY || "").trim();
  const keyReady = KEY !== "" && !KEY.startsWith("PASTE_");

  const steps = {
    open: { subject: "💌 They opened your letter!",        text: "Your date invite was just opened." },
    no1:  { subject: "🙁 They caught the No button (1 of 4)", text: "They chased down the No button and pressed it. It now asks: \"Are you sure?\"" },
    no2:  { subject: "🥺 No again (2 of 4)",                text: "Second No. It now asks: \"Really, really sure?\"" },
    no3:  { subject: "😢 Third No (3 of 4)",                text: "Third No. It's raining on the page now." },
    no4:  { subject: "😭 Fourth No: the No button is gone", text: "They pressed No four times. Only the Yes button is left." },
    yes:  { subject: "💖 THEY SAID YES!",                    text: "They said YES to the date! 🎉" }
  };

  // "They" becomes her name when the link has one
  const withName = (text) => (who
    ? text.replace(/\bTHEY\b/g, who.toUpperCase()).replace(/\bThey\b/g, who)
    : text);

  function notify(step) {
    const info = steps[step];
    if (info) sendEmail(withName(info.subject), withName(info.text));
  }

  function sendEmail(subject, text) {
    if (!keyReady) {
      console.warn("Email not sent: paste your Web3Forms key into config.js.");
      return;
    }
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: KEY,
        subject: subject,
        from_name: "Date Invite",
        message: text +
          "\n\nSent to: " + (who || "(no name in the link)") +
          "\nLanguage: " + (lang === "ne" ? "Nepali" : "English") +
          "\nTime: " + new Date().toLocaleString() +
          "\nDevice: " + navigator.userAgent
      }),
      keepalive: true
    })
      .then((res) => res.json())
      .then((data) => { if (!data.success) console.warn("Web3Forms:", data.message); })
      .catch((err) => console.warn("Email failed:", err));
  }

  function buzz(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function viewport() {
    const v = window.visualViewport;
    return v ? { w: v.width, h: v.height } : { w: innerWidth, h: innerHeight };
  }

  /* ---------- Emoji storms ---------- */
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Two layers: one behind the letter, one in front of it
  const backLayer = document.createElement("div");
  const frontLayer = document.createElement("div");
  backLayer.className = "fx-layer fx-layer--back";
  frontLayer.className = "fx-layer fx-layer--front";
  document.body.prepend(backLayer);
  document.body.append(frontLayer);

  const CRY = ["😢", "😭", "🥺", "💧", "💔", "😿", "💧", "😭"];
  const LOVE = ["💖", "💕", "😍", "💘", "💗", "🥰", "🌹", "💞", "✨", "❤️", "💝", "😘"];
  const MAX_PARTICLES = 170;

  const rand = (min, max) => min + Math.random() * (max - min);

  function particle(emoji, { x, y, dx, dy, size, duration, delay = 0, spin = rand(-120, 120), layer }) {
    if (backLayer.childElementCount + frontLayer.childElementCount > MAX_PARTICLES) return;
    const el = document.createElement("span");
    el.className = "fx";
    el.textContent = emoji;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.fontSize = size + "px";
    (layer || (Math.random() < 0.4 ? frontLayer : backLayer)).appendChild(el);

    el.animate([
      { transform: "translate(-50%, -50%) scale(0.3) rotate(0deg)", opacity: 0 },
      { transform: `translate(-50%, -50%) scale(1) rotate(${spin * 0.2}deg)`, opacity: 1, offset: 0.12 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.85) rotate(${spin}deg)`, opacity: 0 }
    ], { duration, delay, easing: "cubic-bezier(.25,.6,.35,1)", fill: "both" })
      .onfinish = () => el.remove();
  }

  let sadTimer = 0;

  // Tears pour down the whole screen and the background turns gloomy
  function cryStorm(count = 18) {
    document.body.classList.add("fx-sad");
    clearTimeout(sadTimer);
    sadTimer = setTimeout(() => document.body.classList.remove("fx-sad"), 1800);
    if (calm) return;

    const { w, h } = viewport();
    for (let i = 0; i < count; i++) {
      particle(pick(CRY), {
        x: rand(0, w),
        y: rand(-40, h * 0.5),
        dx: rand(-60, 60),
        dy: rand(h * 0.5, h * 1.05),
        size: rand(18, 46),
        duration: rand(1500, 2600),
        delay: rand(0, 350),
        spin: rand(-40, 40)
      });
    }
  }

  // Hearts explode out of the Yes button, then keep floating up forever
  function loveStorm() {
    document.body.classList.remove("fx-sad");
    document.body.classList.add("fx-love");
    if (calm) return;

    const { w, h } = viewport();
    const r = yesBtn.getBoundingClientRect();
    const cx = r.width ? r.left + r.width / 2 : w / 2;
    const cy = r.height ? r.top + r.height / 2 : h / 2;

    for (let i = 0; i < 70; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(120, Math.max(w, h) * 0.75);
      particle(pick(LOVE), {
        x: cx,
        y: cy,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: rand(20, 52),
        duration: rand(1400, 2600),
        delay: rand(0, 250)
      });
    }

    setInterval(() => {
      const { w, h } = viewport();
      for (let i = 0; i < 2; i++) {
        particle(pick(LOVE), {
          x: rand(0, w),
          y: h + 30,
          dx: rand(-90, 90),
          dy: -(h + 120),
          size: rand(16, 44),
          duration: rand(4200, 7000),
          layer: backLayer
        });
      }
    }, 200);
  }

  /* ---------- Reasons: typed out one line at a time ---------- */
  const reasonsCard = document.querySelector(".reasons");
  const reasonItems = [...reasonsCard.querySelectorAll(".reasons__list li")];
  const personalEl = document.getElementById("personalLine");
  let typingRun = 0;
  let reasonsStarted = false;

  if (personalLine) personalEl.textContent = `“${personalLine}”`;

  // Split into whole letters so Devanagari never shows half-joined characters
  const letters = (text) => (window.Intl && Intl.Segmenter
    ? [...new Intl.Segmenter().segment(text)].map((part) => part.segment)
    : [...text]);

  async function typeReasons() {
    const run = ++typingRun;
    reasonsStarted = true;
    const wait = (ms) => new Promise((done) => setTimeout(done, ms));
    await wait(1400); // let the envelope finish opening
    for (const li of reasonItems) {
      const textEl = li.querySelector(".reasons__text");
      const chars = letters(textEl.textContent);
      li.classList.add("is-shown");
      if (!calm) {
        textEl.classList.add("is-typing");
        for (let i = 1; i <= chars.length; i++) {
          if (run !== typingRun) return;
          textEl.textContent = chars.slice(0, i).join("");
          await wait(30);
        }
        textEl.classList.remove("is-typing");
      }
      if (run !== typingRun) return;
      await wait(380);
    }
    finishReasons();
  }

  // Show everything at once (after typing, on a tap, or when the language changes)
  function finishReasons() {
    typingRun++;
    reasonItems.forEach((li, i) => {
      const textEl = li.querySelector(".reasons__text");
      textEl.textContent = textFor("reason" + (i + 1), TEXT[lang]);
      textEl.classList.remove("is-typing");
      li.classList.add("is-shown");
    });
    personalEl.hidden = !personalLine;
    reasonsCard.classList.add("is-done");
  }

  reasonsCard.addEventListener("click", () => {
    if (reasonsStarted && !reasonsCard.classList.contains("is-done")) finishReasons();
  });
  langHooks.push(() => { if (reasonsStarted) finishReasons(); });

  /* ---------- Soft music box, made in the browser (no audio file) ---------- */
  const soundBtn = document.getElementById("soundBtn");
  const music = { ctx: null, master: null, bus: null, timer: 0, on: false, nextBar: 0, bar: 0 };
  const CHORDS = [
    [261.63, 329.63, 392.0, 523.25], // C
    [220.0, 261.63, 329.63, 440.0],  // Am
    [174.61, 220.0, 261.63, 349.23], // F
    [196.0, 246.94, 293.66, 392.0]   // G
  ];
  const PATTERN = [0, 1, 2, 3, 2, 1, 2, 3];
  const EIGHTH = 0.42; // seconds

  const musicMuted = () => {
    try { return localStorage.getItem("date-invite-muted") === "1"; } catch { return false; }
  };

  function playNote(freq, time, volume, length, type = "triangle") {
    const osc = music.ctx.createOscillator();
    const gain = music.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    osc.connect(gain).connect(music.bus);
    osc.start(time);
    osc.stop(time + length + 0.05);
  }

  function scheduleMusic() {
    while (music.nextBar < music.ctx.currentTime + 4) {
      const chord = CHORDS[music.bar % CHORDS.length];
      playNote(chord[0] / 2, music.nextBar, 0.16, 3.2, "sine"); // soft bass
      PATTERN.forEach((n, i) => playNote(chord[n] * 2, music.nextBar + i * EIGHTH, 0.06, 1.4));
      music.nextBar += EIGHTH * PATTERN.length;
      music.bar++;
    }
  }

  function startMusic() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!music.ctx) {
      music.ctx = new AudioCtx();
      music.master = music.ctx.createGain();
      music.master.gain.value = 0;
      music.bus = music.ctx.createGain();
      // A gentle echo for a dreamy sound
      const echo = music.ctx.createDelay();
      const feedback = music.ctx.createGain();
      echo.delayTime.value = 0.32;
      feedback.gain.value = 0.28;
      music.bus.connect(music.master);
      music.bus.connect(echo);
      echo.connect(feedback).connect(echo);
      echo.connect(music.master);
      music.master.connect(music.ctx.destination);
    }
    music.ctx.resume();
    const now = music.ctx.currentTime;
    music.nextBar = Math.max(music.nextBar, now + 0.1);
    music.master.gain.cancelScheduledValues(now);
    music.master.gain.setValueAtTime(music.master.gain.value, now);
    music.master.gain.linearRampToValueAtTime(0.9, now + 1.5);
    scheduleMusic();
    clearInterval(music.timer);
    music.timer = setInterval(scheduleMusic, 1000);
    music.on = true;
    updateSoundBtn();
  }

  function stopMusic() {
    music.on = false;
    updateSoundBtn();
    if (!music.ctx) return;
    const now = music.ctx.currentTime;
    music.master.gain.cancelScheduledValues(now);
    music.master.gain.setValueAtTime(music.master.gain.value, now);
    music.master.gain.linearRampToValueAtTime(0, now + 0.6);
    clearInterval(music.timer);
    setTimeout(() => { if (!music.on) music.ctx.suspend(); }, 700);
  }

  function updateSoundBtn() {
    soundBtn.textContent = music.on ? "🔊" : "🔇";
    soundBtn.setAttribute("aria-pressed", String(music.on));
  }

  soundBtn.addEventListener("click", () => {
    if (music.on) stopMusic(); else startMusic();
    try { localStorage.setItem("date-invite-muted", music.on ? "0" : "1"); } catch {}
  });

  /* ---------- Page elements ---------- */
  const openInput = document.getElementById("open");
  const yesInput = document.getElementById("yes");
  const letter = document.querySelector(".letter");
  const yesBtn = document.querySelector(".answers .btn--yes");
  const noButtons = [...document.querySelectorAll(".btn--no")];

  const unsealedInput = document.getElementById("unsealed");
  unsealedInput.addEventListener("change", () => {
    if (!unsealedInput.checked) return;
    notify("open");
    if (!musicMuted()) startMusic();
    typeReasons();
  });

  yesInput.addEventListener("change", () => {
    if (!yesInput.checked) return;
    notify("yes");
    buzz([60, 40, 60, 40, 160]);
    loveStorm();
    if (runner) runner.remove();
  });

  /* ---------- The runaway No button ---------- */
  // How many times each No escapes before it gets tired (one per stage)
  const DODGES_NEEDED = [5, 7, 9, 11];
  // How long a tired button can be caught, in ms (shorter each stage)
  const TIRED_MS = [1300, 1100, 900, 700];

  const cryFaces = ["😢", "😭", "🥺", "😿"];

  let stage = 0;       // 0 → the first "No", 3 → the last one
  let dodges = 0;
  let tired = false;
  let tiredTimer = 0;
  let lastDodge = 0;
  let runner = null;   // the No button once it's loose on the page

  const active = () => openInput.checked && !yesInput.checked && stage < noButtons.length;
  const current = () => noButtons[stage];

  function setFace(face, ms = 700) {
    letter.style.setProperty("--face", `"${face}"`);
    clearTimeout(setFace.timer);
    setFace.timer = setTimeout(() => letter.style.removeProperty("--face"), ms);
  }

  function showTaunt(x, y) {
    const bubble = document.createElement("div");
    bubble.className = "taunt";
    bubble.textContent = pick(TEXT[lang].taunts);
    bubble.style.left = Math.min(Math.max(x, 70), innerWidth - 70) + "px";
    bubble.style.top = Math.max(y, 40) + "px";
    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), 900);
  }

  // Lift the button out of the letter so it can run anywhere on screen
  function release(btn) {
    if (runner === btn) return;
    const r = btn.getBoundingClientRect();
    document.body.appendChild(btn);
    btn.classList.add("is-loose");
    btn.style.display = "inline-flex";
    btn.style.left = r.left + "px";
    btn.style.top = r.top + "px";
    btn.getBoundingClientRect(); // lock in the start position before it moves
    runner = btn;
  }

  // Everything the runaway button must never cover
  const TEXT_SELECTOR = ".letter__greeting, .letter__body, .letter__question, .plea, .letter__sign";
  const BOX_SELECTOR = ".answers .btn--yes, .mood, .topbar";

  function obstacles() {
    const rects = [];
    // Tight boxes around each line of text, not the whole paragraph
    document.querySelectorAll(TEXT_SELECTOR).forEach((el) => {
      if (!el.offsetParent) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      rects.push(...range.getClientRects());
    });
    document.querySelectorAll(BOX_SELECTOR).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width) rects.push(r);
    });
    return rects;
  }

  function overlapArea(x, y, w, h, r, pad) {
    const dx = Math.min(x + w, r.right + pad) - Math.max(x, r.left - pad);
    const dy = Math.min(y + h, r.bottom + pad) - Math.max(y, r.top - pad);
    return dx > 0 && dy > 0 ? dx * dy : 0;
  }

  // Try lots of random spots; keep the best one that covers nothing
  function findSpot(bw, bh, px, py) {
    const { w, h } = viewport();
    const margin = 12;
    const blocked = obstacles();
    const farEnough = Math.min(w, h) * 0.35;
    let best = null;

    for (let i = 0; i < 160; i++) {
      const x = margin + Math.random() * Math.max(0, w - bw - margin * 2);
      const y = margin + Math.random() * Math.max(0, h - bh - margin * 2);
      const covered = blocked.reduce((sum, r) => sum + overlapArea(x, y, bw, bh, r, 10), 0);
      const distance = Math.hypot(x + bw / 2 - px, y + bh / 2 - py);
      // Covering nothing matters most, then being far from the finger/cursor
      const score = covered * 1000 - Math.min(distance, farEnough * 1.5);
      if (!best || score < best.score) best = { x, y, score };
      if (covered === 0 && distance >= farEnough) break;
    }
    return best;
  }

  function dodge(px, py) {
    const btn = current();
    if (!btn || tired || !active()) return;

    const now = performance.now();
    if (now - lastDodge < 200) return;
    lastDodge = now;

    const from = btn.getBoundingClientRect();
    release(btn);

    const spot = findSpot(btn.offsetWidth, btn.offsetHeight, px, py);
    btn.style.left = spot.x + "px";
    btn.style.top = spot.y + "px";

    showTaunt(from.left + from.width / 2, from.top);
    setFace(pick(cryFaces), 1600);
    cryStorm();
    buzz(15);

    dodges++;
    if (dodges >= DODGES_NEEDED[stage]) getTired(btn);
  }

  function getTired(btn) {
    tired = true;
    btn.classList.add("is-tired");
    setFace("😮‍💨", TIRED_MS[stage]);
    clearTimeout(tiredTimer);
    tiredTimer = setTimeout(() => {
      // Too slow: it gets its energy back and needs two more escapes
      tired = false;
      btn.classList.remove("is-tired");
      dodges = DODGES_NEEDED[stage] - 2;
    }, TIRED_MS[stage]);
  }

  function catchNo(btn) {
    clearTimeout(tiredTimer);
    tired = false;
    dodges = 0;
    btn.remove();
    if (runner === btn) runner = null;

    const step = "no" + (stage + 1);
    document.getElementById(step).checked = true;
    notify(step);
    buzz(80);
    cryStorm(40);
    stage++;
  }

  noButtons.forEach((btn) => {
    // Mouse: runs the moment the cursor touches it
    btn.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") dodge(e.clientX, e.clientY);
    });

    // Touch: jumps away before the tap can land
    btn.addEventListener("touchstart", (e) => {
      if (tired) return;
      e.preventDefault();
      const t = e.touches[0];
      dodge(t.clientX, t.clientY);
    }, { passive: false });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (tired && btn === current()) {
        catchNo(btn);
      } else {
        const r = btn.getBoundingClientRect();
        dodge(r.left + r.width / 2, r.top + r.height / 2);
      }
    });
  });

  // Mouse: it also runs when the cursor just gets close
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || tired || !active()) return;
    const r = current().getBoundingClientRect();
    if (!r.width) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (Math.hypot(e.clientX - cx, e.clientY - cy) < Math.max(r.width, r.height) / 2 + 50) {
      dodge(e.clientX, e.clientY);
    }
  });

  // Keep a loose button on screen if the window changes size
  addEventListener("resize", () => {
    if (!runner) return;
    const { w, h } = viewport();
    runner.style.left = Math.min(parseFloat(runner.style.left), w - runner.offsetWidth - 12) + "px";
    runner.style.top = Math.min(parseFloat(runner.style.top), h - runner.offsetHeight - 12) + "px";
  });

  /* ---------- Planner: choose your free time ---------- */
  const planner = document.getElementById("planner");
  const plannedInput = document.getElementById("planned");
  const dayChips = document.getElementById("dayChips");
  const otherDate = document.getElementById("otherDate");
  const otherDateChip = document.getElementById("otherDateChip");
  const otherDateText = document.getElementById("otherDateText");
  const exactTime = document.getElementById("exactTime");
  const exactTimeChip = document.getElementById("exactTimeChip");
  const exactTimeText = document.getElementById("exactTimeText");
  const placeText = document.getElementById("placeText");
  const noteText = document.getElementById("noteText");
  let plan = null;

  const pad2 = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromISO = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // Browsers often lack Nepali date data, so Nepali is formatted by hand
  const NE = {
    digits: "०१२३४५६७८९",
    days: ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"],
    daysShort: ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"],
    months: ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"],
    monthsShort: ["जन", "फेब", "मार्च", "अप्रि", "मे", "जुन", "जुला", "अग", "सेप", "अक्टो", "नोभे", "डिसे"]
  };
  const neDigits = (value) => String(value).replace(/[0-9]/g, (d) => NE.digits[d]);
  const toLang = (n, lg) => (lg === "ne" ? neDigits(n) : String(n));

  function formatDate(iso, lg, style = "long") {
    const date = fromISO(iso);
    if (lg === "ne") {
      const day = neDigits(date.getDate());
      return style === "long"
        ? `${NE.days[date.getDay()]}, ${NE.months[date.getMonth()]} ${day}`
        : `${day} ${NE.monthsShort[date.getMonth()]}`;
    }
    return date.toLocaleDateString("en-US", style === "long"
      ? { weekday: "long", day: "numeric", month: "long" }
      : { day: "numeric", month: "short" });
  }

  function weekdayShort(date, lg) {
    return lg === "ne" ? NE.daysShort[date.getDay()] : date.toLocaleDateString("en-US", { weekday: "short" });
  }

  function formatTime(hhmm, lg) {
    const [h, m] = hhmm.split(":").map(Number);
    if (lg === "ne") {
      const part = h < 4 ? "राति" : h < 12 ? "बिहान" : h < 17 ? "दिउँसो" : h < 20 ? "साँझ" : "राति";
      return `${part} ${neDigits(h % 12 || 12)}:${neDigits(pad2(m))} बजे`;
    }
    return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const uncheck = (name) => {
    planner.querySelectorAll(`input[name=${name}]`).forEach((input) => { input.checked = false; });
  };

  // Chips for today + the next 6 days, rebuilt when the language changes
  function buildDayChips() {
    const checked = planner.querySelector("input[name=day]:checked")?.value;
    dayChips.querySelectorAll(".chip--generated").forEach((chip) => chip.remove());
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const iso = toISO(date);
      const label = document.createElement("label");
      label.className = "chip chip--day chip--generated";
      label.innerHTML = `<input type="radio" name="day" value="${iso}"><span class="chip__face"><small></small><strong></strong></span>`;
      label.querySelector("small").textContent =
        i === 0 ? TEXT[lang].today :
        i === 1 ? TEXT[lang].tomorrow :
        weekdayShort(date, lang);
      label.querySelector("strong").textContent = formatDate(iso, lang, "short");
      label.querySelector("input").checked = iso === checked;
      dayChips.insertBefore(label, otherDateChip);
    }
    otherDate.min = toISO(now);
  }

  // The "Other date" and "Exact time" chips show what was picked
  function refreshPickers() {
    otherDateChip.classList.toggle("is-set", !!otherDate.value);
    otherDateText.textContent = otherDate.value ? formatDate(otherDate.value, lang, "short") : "📅";
    exactTimeChip.classList.toggle("is-set", !!exactTime.value);
    exactTimeText.textContent = exactTime.value ? formatTime(exactTime.value, lang) : TEXT[lang].exactTime;
  }

  function onPick(e) {
    const input = e.target;
    if (input.name === "day") otherDate.value = "";
    if (input.name === "time") exactTime.value = "";
    if (input.name === "place") placeText.value = "";
    if (input === otherDate && otherDate.value) uncheck("day");
    if (input === exactTime && exactTime.value) uncheck("time");
    if (input === placeText && placeText.value.trim()) uncheck("place");
    refreshPickers();
  }

  planner.addEventListener("change", onPick);
  planner.addEventListener("input", onPick);

  // Laptops: clicking the chip opens the calendar / clock straight away
  [otherDate, exactTime].forEach((input) => {
    input.addEventListener("click", () => {
      try { input.showPicker(); } catch {}
    });
  });

  // The keyboard's Enter/Go key shouldn't send the plan halfway through typing
  [placeText, noteText].forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      }
    });
  });

  /* Steps: intro → day → time → place → note */
  const stepEls = [...planner.querySelectorAll(".step")];
  const progressHearts = [...planner.querySelectorAll(".progress span")];
  const stepLabel = document.getElementById("stepLabel");
  let stepIndex = 0;
  let autoNext = 0;

  function stepHasChoice(step) {
    switch (step.dataset.kind) {
      case "day":   return !!(planner.querySelector("input[name=day]:checked") || otherDate.value);
      case "time":  return !!(planner.querySelector("input[name=time]:checked") || exactTime.value);
      case "place": return !!(planner.querySelector("input[name=place]:checked") || placeText.value.trim());
      case "note":  return !!noteText.value.trim();
      default:      return false;
    }
  }

  function updateChoices() {
    stepEls.forEach((step) => step.classList.toggle("has-choice", stepHasChoice(step)));
  }

  function showStep(i) {
    clearTimeout(autoNext);
    stepIndex = Math.max(0, Math.min(stepEls.length - 1, i));
    stepEls.forEach((step, n) => {
      step.classList.toggle("is-active", n === stepIndex);
      step.classList.toggle("is-past", n < stepIndex);
      step.inert = n !== stepIndex;
    });
    progressHearts.forEach((heart, n) => heart.classList.toggle("is-on", n < stepIndex));
    planner.classList.toggle("is-intro", stepIndex === 0);
    stepLabel.textContent = stepIndex
      ? TEXT[lang].stepOf.replace("{n}", toLang(stepIndex, lang))
      : "";
    planner.scrollTop = 0;
  }

  // A little puff of hearts from a button
  function heartPuff(el) {
    if (calm) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 12; i++) {
      particle(pick(LOVE), {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        dx: rand(-120, 120),
        dy: rand(-160, -60),
        size: rand(16, 30),
        duration: rand(900, 1500),
        layer: frontLayer
      });
    }
  }

  planner.addEventListener("click", (e) => {
    const next = e.target.closest("[data-next]");
    const back = e.target.closest("[data-back]");
    if (next) {
      if (stepIndex === 0 || stepEls[stepIndex].classList.contains("has-choice")) heartPuff(next);
      buzz(15);
      showStep(stepIndex + 1);
    }
    if (back) showStep(stepIndex - 1);
  });

  // Tapping a chip shows the sweet reaction, then moves on by itself
  planner.addEventListener("change", (e) => {
    updateChoices();
    if (e.target.type === "radio") {
      buzz(10);
      const from = stepIndex;
      clearTimeout(autoNext);
      autoNext = setTimeout(() => { if (stepIndex === from) showStep(from + 1); }, 1100);
    }
  });
  planner.addEventListener("input", updateChoices);

  function readPlan() {
    return {
      day: planner.querySelector("input[name=day]:checked")?.value || otherDate.value,
      time: planner.querySelector("input[name=time]:checked")?.value || "",
      exact: exactTime.value,
      place: planner.querySelector("input[name=place]:checked")?.value || "",
      placeText: placeText.value.trim(),
      note: noteText.value.trim()
    };
  }

  // Turn the raw choices into words, in either language
  function describe(p, lg) {
    const t = TEXT[lg];
    const when = [
      p.day && formatDate(p.day, lg),
      p.exact ? formatTime(p.exact, lg) : p.time && t[p.time]
    ].filter(Boolean).join(" · ");
    const where = p.placeText || (p.place && t[p.place]) || "";
    return { when, where };
  }

  function renderTicket() {
    if (!plan) return;
    const words = describe(plan, lang);
    document.getElementById("whenValue").textContent = words.when || TEXT[lang].anyDay;
    document.getElementById("whereValue").textContent = words.where || TEXT[lang].anyPlace;
    document.getElementById("noteRow").hidden = !plan.note;
    document.getElementById("noteValue").textContent = plan.note;
    renderCalendar();
    renderCountdown();
  }

  /* Calendar + countdown (only when she picked a day) */
  const TIME_HOURS = { morning: [10, 0], afternoon: [14, 0], evening: [18, 0], night: [20, 0] };
  const calendarActions = document.getElementById("calendarActions");
  const icsLink = document.getElementById("icsLink");
  const gcalLink = document.getElementById("gcalLink");
  const countdownEl = document.getElementById("countdown");
  let countdownTimer = 0;

  function planStart(p) {
    if (!p || !p.day) return null;
    const date = fromISO(p.day);
    const hm = p.exact ? p.exact.split(":").map(Number) : TIME_HOURS[p.time];
    date.setHours(hm ? hm[0] : 10, hm ? hm[1] : 0, 0, 0);
    return { date, allDay: !hm };
  }

  const icsDay = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  const icsTime = (d) => `${icsDay(d)}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
  const icsEscape = (text) => text.replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");

  function renderCalendar() {
    const start = planStart(plan);
    calendarActions.hidden = !start;
    if (!start) return;
    const title = TEXT[lang].eventTitle;
    const where = describe(plan, lang).where;
    const details = plan.note ? `💌 ${plan.note}` : "";
    let dates, icsDates;
    if (start.allDay) {
      const next = new Date(start.date);
      next.setDate(next.getDate() + 1);
      dates = `${icsDay(start.date)}/${icsDay(next)}`;
      icsDates = [`DTSTART;VALUE=DATE:${icsDay(start.date)}`, `DTEND;VALUE=DATE:${icsDay(next)}`];
    } else {
      const end = new Date(start.date.getTime() + 2 * 3600e3);
      dates = `${icsTime(start.date)}/${icsTime(end)}`;
      icsDates = [`DTSTART:${icsTime(start.date)}`, `DTEND:${icsTime(end)}`];
    }
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//A Little Question//EN", "BEGIN:VEVENT",
      `UID:${plan.day}-${Date.now()}@a-little-question`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      ...icsDates,
      `SUMMARY:${icsEscape(title)}`,
      where && `LOCATION:${icsEscape(where)}`,
      details && `DESCRIPTION:${icsEscape(details)}`,
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(title)}`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");
    icsLink.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    gcalLink.href = "https://calendar.google.com/calendar/render?" +
      new URLSearchParams({ action: "TEMPLATE", text: title, dates, details, location: where });
  }

  function countdownText(ms) {
    const ne = lang === "ne";
    if (ms <= 0) return ne ? "💖 आज नै हो! म आउँदैछु।" : "💖 It's today! I'm on my way.";
    const mins = Math.floor(ms / 60000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    if (ne) {
      const parts = [d && `${neDigits(d)} दिन`, h && `${neDigits(h)} घण्टा`, !d && `${neDigits(m)} मिनेट`];
      return `⏳ अझै ${parts.filter(Boolean).join(" ")} बाँकी 💕`;
    }
    const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    const parts = [d && count(d, "day"), h && count(h, "hour"), !d && count(m, "minute")];
    return `⏳ ${parts.filter(Boolean).join(", ")} to go 💕`;
  }

  function renderCountdown() {
    clearInterval(countdownTimer);
    const start = planStart(plan);
    const tick = () => {
      const ms = start.date - Date.now();
      countdownEl.hidden = ms < -12 * 3600e3; // hide once the date has passed
      countdownEl.textContent = countdownText(ms);
    };
    countdownEl.hidden = !start;
    if (!start) return;
    tick();
    countdownTimer = setInterval(tick, 30000);
  }

  /* Remember her answer, so reopening the link goes straight to the ticket */
  const SAVE_KEY = "date-invite:" + (who || "_");
  const savePlan = () => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(plan)); } catch {}
  };
  const loadPlan = () => {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
  };

  function emailPlan(p) {
    const en = describe(p, "en");
    const summary = [en.when, en.where].filter(Boolean).join(" · ");
    sendEmail(
      (who ? `📅 ${who}'s date plan: ` : "📅 Date plan: ") + (summary || "leaving it to you"),
      withName("They chose their free time! 💖") + "\n\n" +
      "Day & time: " + (en.when || "Not chosen (whenever works)") + "\n" +
      "Place: " + (en.where || "Not chosen (you plan it)") + "\n" +
      "Note: " + (p.note || "—")
    );
  }

  function celebrate() {
    if (calm) return;
    const { w, h } = viewport();
    for (let i = 0; i < 45; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(100, Math.max(w, h) * 0.6);
      particle(pick(LOVE), {
        x: w / 2,
        y: h * 0.55,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: rand(20, 48),
        duration: rand(1300, 2300),
        delay: rand(0, 200),
        layer: frontLayer
      });
    }
  }

  planner.addEventListener("submit", (e) => {
    e.preventDefault();
    plan = readPlan();
    renderTicket();
    emailPlan(plan);
    savePlan();
    plannedInput.checked = true;
    buzz([40, 30, 40]);
    celebrate();
  });

  const refreshPlanner = () => {
    buildDayChips();
    refreshPickers();
    renderTicket();
    showStep(stepIndex);
  };
  langHooks.push(refreshPlanner);
  refreshPlanner();

  // Coming back later: skip straight to the ticket (no emails, no replay of effects)
  const savedPlan = loadPlan();
  if (savedPlan) {
    plan = savedPlan;
    document.body.classList.add("is-restoring", "fx-love");
    ["unsealed", "open", "yes", "planned"].forEach((id) => { document.getElementById(id).checked = true; });
    renderTicket();
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("is-restoring")));
  }

  document.getElementById("replayBtn").addEventListener("click", () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    location.reload();
  });

  // Lets :active (press-and-hold effects) work on iPhone
  document.addEventListener("touchstart", () => {}, { passive: true });
})();
