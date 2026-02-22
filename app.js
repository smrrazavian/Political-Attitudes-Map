/* app.js — Final v1 (RTL Persian)
   Features:
   - Loads questions.fa.json
   - Session-based shuffle (stable within a session)
   - Stepper UI (one question at a time)
   - Optional skip per item ("می‌گذرم")
   - Local-only persistence (sessionStorage)
   - Scores:
      X Economy   (-100..+100)
      Y Authority (-100..+100)
      D Democratic Norms (0..100)
   - Extra (NOT mind-reading): privacy concern indicator (0..100) for confidence only
   - Quality signals (NOT lie detection):
      attention check, infrequency, speeding, straight-lining, consistency pairs, low completion
   - SVG political map with dot
*/

const STORAGE = {
  answers: "polmap_v1_answers_idx",      // { [id]: idx(0..4) }
  startedAt: "polmap_v1_startedAtMs",
  lastAction: "polmap_v1_lastActionAtMs",
  order: "polmap_v1_order",
  seed: "polmap_v1_seed",
  currentIndex: "polmap_v1_currentIndex"
};

const IS_EN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
const STR = {
  fa: {
    qCount: "سؤال {current} از {total}",
    next: "بعدی",
    end: "پایان",
    progressAnswered: "{pct}٪ پاسخ داده شده",
    lowData: "پاسخ‌های کافی ثبت نشده است (حدود {pct}٪). برای نتیجهٔ قابل‌اتکا بهتر است بیشتر پاسخ دهید.",
    someSkips: "برخی سؤال‌ها بدون پاسخ مانده‌اند (حدود {pct}٪ پاسخ داده شده).",
    attentionFailed: "سؤالِ توجه مطابق دستور پاسخ داده نشده است.",
    infrequencyFlag: "یک پاسخِ نامعمول دیده شد (می‌تواند نشانه‌ی بی‌دقتی باشد).",
    speeding: "سرعت پاسخ‌دهی خیلی بالا بوده است؛ ممکن است نتیجه با دقت کمتر باشد.",
    straightlining: "الگوی پاسخ‌ها خیلی یکنواخت است (اکثر گزینه‌ها یکسان انتخاب شده‌اند).",
    inconsistentPair: "در چند پاسخ، سازگاری پایین دیده شد (جفت: {a} و {b}).",
    privacyHigh: "نگرانی از محرمانگی بالا گزارش شده؛ ممکن است پاسخ‌ها محتاطانه‌تر شده باشد.",
    privacyMid: "مقداری نگرانی از محرمانگی گزارش شده است.",
    econRight: "راست اقتصادی",
    econLeft: "چپ اقتصادی",
    auth: "اقتدارگرا",
    liberty: "آزادی‌خواه",
    endReached: "به پایان رسیدید. می‌توانید «نمایش نتیجه» را بزنید.",
    skipped: "این سؤال رد شد. هر زمان خواستید می‌توانید برگردید و پاسخ دهید.",
    needMinAnswers: "برای محاسبه نتیجه، بهتر است حداقل {min}٪ سؤال‌ها را پاسخ دهید.\nالان حدود {now}٪ پاسخ داده‌اید.",
    quadrantText: "نقطه‌ی شما در این نقشه نزدیک‌تر به ناحیه‌ی «{label}» است.",
    lowConfidence: "نتیجه با اطمینان پایین",
    midConfidence: "نتیجه با اطمینان متوسط",
    answered: "پاسخ داده‌شده: {pct}٪",
    secPerQ: "میانگین زمان هر پاسخ: حدود {sec} ثانیه",
    rerunHint: "پیشنهاد: اگر برایتان مهم است، یک بار دیگر در محیط آرام‌تر/Private انجام دهید.",
    nothingToContinue: "چیزی برای ادامه وجود ندارد. «شروع آزمون» را بزنید.",
    unsureHint: "اگر مطمئن نیستید «نظری ندارم» را بزنید یا «می‌گذرم» را انتخاب کنید.",
    endQuestions: "پایان سوال‌ها. می‌توانید «نمایش نتیجه» را بزنید.",
    loadErr: "خطا در بارگذاری فایل‌ها. لطفاً وجود questions.fa.json را کنار index.html بررسی کنید.",
    scorePrivacyEmpty: "—",
    axisLeft: "چپ اقتصادی",
    axisRight: "راست اقتصادی",
    axisTop: "اقتدارگرا",
    axisBottom: "آزادی‌خواه",
    refsTitle: "افراد و احزاب مرجع روی نقشه (تقریبی)",
    refsNote: "روی شماره‌ها نگه دارید تا نام، نوع (فرد/حزب) و گرایش سیاسی را ببینید. جایگاه‌ها تقریبی‌اند و بر اساس منابع مرجع زیر چیده شده‌اند.",
    refsFilterAll: "همه",
    refsFilterForeign: "خارجی",
    refsFilterIranian: "ایرانی",
    refsFilterPeople: "افراد",
    refsFilterParties: "احزاب",
    refsFilterOrigin: "مبدا",
    refsFilterKind: "نوع",
    legendPeople: "فرد",
    legendParties: "حزب",
    refsShow: "نمایش لیست مرجع‌ها",
    refsHide: "پنهان کردن لیست مرجع‌ها",
    methodologyTitle: "روش و شفافیت",
    methodologyHtml: `
      <h4>این ابزار چه چیزی را می‌سنجد؟</h4>
      <p>برای ساده‌سازی، دو محور استفاده می‌کنیم: <strong>اقتصاد</strong> و <strong>فرهنگ/اقتدار</strong>. این فقط یک خلاصه‌سازی است.</p>
      <h4>چرا «هنجارهای دموکراتیک» جداست؟</h4>
      <p>یک امتیاز جدا برای حمایت از اصولی مثل انتخابات رقابتی، استقلال دادگاه، حقوق متهم، و امکان نظارت عمومی داریم (۰ تا ۱۰۰).</p>
      <h4>امتیازدهی چطور کار می‌کند؟</h4>
      <ul>
        <li>گزینه‌ها از -۲ تا +۲ کد می‌شوند.</li>
        <li>هر سؤال وزن دارد (wx, wy, wd).</li>
        <li>امتیازها نرمال می‌شوند: X/Y در بازه -۱۰۰..+۱۰۰، دموکراسی ۰..۱۰۰.</li>
      </ul>
      <h4>کنترل کیفیت و اطمینان نتیجه</h4>
      <p>نشانه‌هایی مثل توجه، الگوی پاسخ، سازگاری و سرعت فقط برای برچسب اطمینان به‌کار می‌روند، نه قضاوت.</p>
      <h4>محرمانگی</h4>
      <p>پاسخ‌ها در این نسخه در مرورگر نگهداری می‌شود (sessionStorage).</p>
    `
  },
  en: {
    qCount: "Question {current} of {total}",
    next: "Next",
    end: "Finish",
    progressAnswered: "{pct}% answered",
    lowData: "Not enough answers were recorded (about {pct}%). For a more reliable result, answer more questions.",
    someSkips: "Some questions were left unanswered (about {pct}% answered).",
    attentionFailed: "The attention-check item was not answered as instructed.",
    infrequencyFlag: "An unusual response pattern was detected (could indicate low attention).",
    speeding: "Response speed was very high; result reliability may be lower.",
    straightlining: "Responses are overly uniform (most answers are identical).",
    inconsistentPair: "Lower consistency was detected for a response pair ({a} and {b}).",
    privacyHigh: "High privacy concern was reported; answers may be more cautious.",
    privacyMid: "Some privacy concern was reported.",
    econRight: "Economic Right",
    econLeft: "Economic Left",
    auth: "Authoritarian",
    liberty: "Libertarian",
    endReached: "You reached the end. You can now click “Show Results”.",
    skipped: "This question was skipped. You can always come back and answer it.",
    needMinAnswers: "To compute results, answer at least {min}% of questions.\nYou have answered about {now}% so far.",
    quadrantText: "Your position on this map is closer to: “{label}”.",
    lowConfidence: "Low-confidence result",
    midConfidence: "Medium-confidence result",
    answered: "Answered: {pct}%",
    secPerQ: "Average time per answer: about {sec} seconds",
    rerunHint: "Tip: if this matters to you, retake it in a calmer/private setting.",
    nothingToContinue: "There is nothing to continue yet. Click “Start Quiz”.",
    unsureHint: "If unsure, choose “Neutral” or use “Skip”.",
    endQuestions: "You reached the final question. You can click “Show Results”.",
    loadErr: "Failed to load files. Make sure questions.en.json/questions.fa.json are next to index.html.",
    scorePrivacyEmpty: "—",
    axisLeft: "Economic Left",
    axisRight: "Economic Right",
    axisTop: "Authoritarian",
    axisBottom: "Libertarian",
    refsTitle: "Reference People & Parties on the Map (Approximate)",
    refsNote: "Hover numbers to view name, type (person/party), and political orientation. Placements are approximate and source-based.",
    refsFilterAll: "All",
    refsFilterForeign: "Foreign",
    refsFilterIranian: "Iranian",
    refsFilterPeople: "People",
    refsFilterParties: "Parties",
    refsFilterOrigin: "Origin",
    refsFilterKind: "Type",
    legendPeople: "Person",
    legendParties: "Party",
    refsShow: "Show Reference List",
    refsHide: "Hide Reference List",
    methodologyTitle: "Method & Transparency",
    methodologyHtml: `
      <h4>What does this tool measure?</h4>
      <p>It simplifies political attitudes into two axes: <strong>Economy</strong> and <strong>Culture/Authority</strong>.</p>
      <h4>Why a separate democratic norms score?</h4>
      <p>Support for democratic principles (competitive elections, judicial independence, due process, public oversight) is scored separately from 0 to 100.</p>
      <h4>How scoring works</h4>
      <ul>
        <li>Choices are encoded from -2 to +2.</li>
        <li>Each item has a weight (wx, wy, wd).</li>
        <li>Scores are normalized: X/Y in -100..+100 and democracy in 0..100.</li>
      </ul>
      <h4>Quality checks</h4>
      <p>Signals such as attention checks, response patterns, consistency and speed only affect confidence labels, not judgment.</p>
      <h4>Privacy</h4>
      <p>In this version, answers are stored in the browser session (sessionStorage).</p>
    `
  }
};

function t(key, vars = {}) {
  const dict = IS_EN ? STR.en : STR.fa;
  const fallback = STR.fa[key] ?? key;
  const template = dict[key] ?? fallback;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

let DATA = null;
let ORDERED = [];
let ITEM_BY_ID = new Map();
let idx = 0; // current question index in ORDERED
let REF_FILTER_ORIGIN = "iranian"; // default as requested
let REF_FILTER_KIND = "all";
let LAST_RESULTS = null;
let REFS_COLLAPSED = true;
const SCORE_SHIFT = { x: -8, y: -8 }; // requested calibration toward left-libertarian results

// ---------- helpers ----------
const el = (id) => document.getElementById(id);
const nowMs = () => Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round0 = (v) => Math.round(v);
const round1 = (v) => Math.round(v * 10) / 10;

function safeParseJSON(s) { try { return JSON.parse(s); } catch { return null; } }

function getAnswers() {
  const obj = safeParseJSON(sessionStorage.getItem(STORAGE.answers));
  return obj && typeof obj === "object" ? obj : {};
}
function setAnswers(obj) {
  sessionStorage.setItem(STORAGE.answers, JSON.stringify(obj));
}

function ensureStarted() {
  const s = sessionStorage.getItem(STORAGE.startedAt);
  if (!s) sessionStorage.setItem(STORAGE.startedAt, String(nowMs()));
  const la = sessionStorage.getItem(STORAGE.lastAction);
  if (!la) sessionStorage.setItem(STORAGE.lastAction, String(nowMs()));
  if (!sessionStorage.getItem(STORAGE.seed)) sessionStorage.setItem(STORAGE.seed, String(Math.random()));
}
function startedAt() {
  const n = Number(sessionStorage.getItem(STORAGE.startedAt));
  return Number.isFinite(n) ? n : nowMs();
}
function setLastAction() { sessionStorage.setItem(STORAGE.lastAction, String(nowMs())); }

function screen(name) {
  const m = {
    intro: el("screenIntro"),
    quiz: el("screenQuiz"),
    results: el("screenResults")
  };
  Object.values(m).forEach((s) => s.classList.remove("active"));
  m[name].classList.add("active");
}

async function loadData() {
  const preferred = IS_EN ? "questions.en.json" : "questions.fa.json";
  let res = await fetch(preferred, { cache: "no-store" });
  if (!res.ok && IS_EN) res = await fetch("questions.fa.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load question file");
  const j = await res.json();
  if (!j?.meta?.likert || !j?.meta?.values || !Array.isArray(j?.items)) {
    throw new Error("Invalid questions.fa.json structure");
  }
  return j;
}

function getItemOptions(item) {
  const values = DATA?.meta?.values || [-2, -1, 0, 1, 2];
  if (Array.isArray(item?.choices) && item.choices.length) {
    return item.choices.map((c, i) => ({
      label: IS_EN ? (c.label_en || c.label_fa || `Option ${i + 1}`) : (c.label_fa || c.label_en || `گزینه ${i + 1}`),
      value: Number.isFinite(c.value) ? c.value : (values[i] ?? 0)
    }));
  }

  const likert = DATA?.meta?.likert || [];
  return likert.map((label, i) => ({
    label,
    value: values[i] ?? 0
  }));
}

function idxToValue(i, item = null) {
  if (item) {
    const options = getItemOptions(item);
    return options[i]?.value ?? 0;
  }
  const values = DATA?.meta?.values || [-2, -1, 0, 1, 2];
  return values[i] ?? 0;
}
function applyReverse(value, item) {
  return item.reverse_scored ? -value : value;
}

function isScoredItem(it) {
  return it.tag === "economy" || it.tag === "authority" || it.tag === "democracy";
}

function makeSessionRand() {
  // Stable RNG per session based on stored seed
  const s = sessionStorage.getItem(STORAGE.seed) || "0.123";
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
  return function rand() {
    // xorshift32
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

function fisherYates(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildOrder(data) {
  // Restore if present
  const saved = safeParseJSON(sessionStorage.getItem(STORAGE.order));
  if (Array.isArray(saved) && saved.length) {
    const map = new Map(data.items.map((it) => [it.id, it]));
    const ordered = saved.map((id) => map.get(id)).filter(Boolean);
    // If JSON changed drastically, rebuild
    if (ordered.length >= Math.floor(data.items.length * 0.9)) return ordered;
  }

  const rand = makeSessionRand();

  // Keep QC items inserted (so they don't cluster at start/end)
  const qc = data.items.filter((it) => it.tag === "attention_check" || it.tag === "infrequency");
  const main = data.items.filter((it) => !(it.tag === "attention_check" || it.tag === "infrequency"));

  fisherYates(main, rand);

  const attention = qc.find((it) => it.tag === "attention_check");
  const infreq = qc.find((it) => it.tag === "infrequency");

  const ordered = [...main];
  if (infreq) ordered.splice(Math.floor(ordered.length * 0.38), 0, infreq);
  if (attention) ordered.splice(Math.floor(ordered.length * 0.68), 0, attention);

  sessionStorage.setItem(STORAGE.order, JSON.stringify(ordered.map((it) => it.id)));
  return ordered;
}

function restoreIndex() {
  const n = Number(sessionStorage.getItem(STORAGE.currentIndex));
  if (Number.isFinite(n) && n >= 0 && n < ORDERED.length) idx = n;
  else idx = 0;
}
function persistIndex() {
  sessionStorage.setItem(STORAGE.currentIndex, String(idx));
}

// ---------- UI: Stepper rendering ----------
function renderCurrent() {
  const item = ORDERED[idx];
  if (!item) return;

  el("qidBadge").textContent = item.id;
  el("qCount").textContent = t("qCount", { current: idx + 1, total: ORDERED.length });
  el("qText").textContent = IS_EN ? (item.text_en || item.text_fa) : item.text_fa;

  const answers = getAnswers();
  const currentIdx = Number.isFinite(answers[item.id]) ? answers[item.id] : null;

  // build options
  const opts = el("opts");
  opts.innerHTML = "";

  const options = getItemOptions(item);

  options.forEach((opt, i) => {
    const row = document.createElement("div");
    row.className = "opt";
    row.dataset.checked = currentIdx === i ? "true" : "false";
    row.tabIndex = 0;
    row.setAttribute("role", "radio");
    row.setAttribute("aria-checked", currentIdx === i ? "true" : "false");

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "10px";

    const dot = document.createElement("div");
    dot.className = "dot";

    const label = document.createElement("span");
    label.textContent = opt.label;

    left.appendChild(dot);
    left.appendChild(label);

    const right = document.createElement("div");
    right.className = "muted small";
    right.textContent = ""; // keep clean

    row.appendChild(left);
    row.appendChild(right);

    const setChoice = () => {
      // update UI
      [...opts.querySelectorAll(".opt")].forEach((n) => {
        n.dataset.checked = "false";
        n.setAttribute("aria-checked", "false");
      });
      row.dataset.checked = "true";
      row.setAttribute("aria-checked", "true");

      // save
      const a = getAnswers();
      a[item.id] = i;
      setAnswers(a);

      setLastAction();
      updateProgress();
      hideToast();
    };

    row.addEventListener("click", setChoice);
    row.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setChoice();
      }
    });

    opts.appendChild(row);
  });

  // nav buttons
  el("btnPrev").disabled = idx === 0;
  el("btnNext").textContent = idx === ORDERED.length - 1 ? t("end") : t("next");
  el("btnFinish").disabled = false;

  persistIndex();
  updateProgress();
}

function updateProgress() {
  const answers = getAnswers();
  // Keep progress percentage consistent with result eligibility logic.
  // completionRatio() excludes QC items and counts only answered items.
  let ratio = 0;
  if (DATA?.items?.length) {
    ratio = completionRatio(DATA, answers);
  } else {
    const total = ORDERED.length;
    let answered = 0;
    for (const it of ORDERED) if (Number.isFinite(answers[it.id])) answered++;
    ratio = total ? answered / total : 0;
  }
  const pct = Math.round(clamp(ratio, 0, 1) * 100);
  el("progressFill").style.width = `${pct}%`;
  el("progressText").textContent = t("progressAnswered", { pct });

  // Continue button availability (intro)
  const btnContinue = el("btnContinue");
  const hasAny = Object.keys(answers).some((k) => Number.isFinite(answers[k]));
  if (btnContinue) btnContinue.disabled = !hasAny;
}

// ---------- Toast ----------
let toastTimer = null;
function showToast(msg) {
  const t = el("toast");
  t.textContent = msg;
  t.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
  }, 3200);
}
function hideToast() {
  const t = el("toast");
  t.classList.remove("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
}

// ---------- Scoring ----------
function computeMaxPossibleAnswered(items, answers, key) {
  // max magnitude for answered subset
  let max = 0;
  for (const it of items) {
    const idx = answers[it.id];
    if (!Number.isFinite(idx)) continue;
    max += 2 * Math.abs(it[key] || 0);
  }
  return max || 0;
}

function scoreAll(data, answers) {
  const econ = data.items.filter((it) => it.tag === "economy");
  const auth = data.items.filter((it) => it.tag === "authority");
  const demo = data.items.filter((it) => it.tag === "democracy");

  let xRaw = 0, yRaw = 0, dRaw = 0;

  for (const it of [...econ, ...auth, ...demo]) {
    const ai = answers[it.id];
    if (!Number.isFinite(ai)) continue;

    let v = idxToValue(ai, it);
    v = applyReverse(v, it);

    xRaw += v * (it.wx || 0);
    yRaw += v * (it.wy || 0);
    dRaw += v * (it.wd || 0);
  }

  const xMax = computeMaxPossibleAnswered(econ, answers, "wx");
  const yMax = computeMaxPossibleAnswered(auth, answers, "wy");
  const dMax = computeMaxPossibleAnswered(demo, answers, "wd");

  const xBase = xMax ? (xRaw / xMax) * 100 : 0;
  const yBase = yMax ? (yRaw / yMax) * 100 : 0;
  const x = clamp(xBase + SCORE_SHIFT.x, -100, 100);
  const y = clamp(yBase + SCORE_SHIFT.y, -100, 100);

  // democracy raw can be negative because we reverse-coded items -> value flipped then multiplied by wd positive.
  // Still map [-dMax..+dMax] to [0..100] based on answered subset.
  const d = dMax ? clamp(((dRaw + dMax) / (2 * dMax)) * 100, 0, 100) : 0;

  return { xRaw, yRaw, dRaw, x, y, d, xMax, yMax, dMax };
}

function privacyConcernScore(data, answers) {
  const p = data.items.filter((it) => it.tag === "privacy_signal");
  const vals = [];
  for (const it of p) {
    const ai = answers[it.id];
    if (!Number.isFinite(ai)) continue;
    // -2..+2 -> 0..100 where +2 = high concern
    const v = idxToValue(ai, it);
    const s = ((v + 2) / 4) * 100;
    vals.push(s);
  }
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return clamp(avg, 0, 100);
}

function completionRatio(data, answers) {
  const items = data.items.filter((it) => it.tag !== "attention_check" && it.tag !== "infrequency");
  let answered = 0;
  for (const it of items) if (Number.isFinite(answers[it.id])) answered++;
  return items.length ? answered / items.length : 0;
}

function qualitySignals(data, answers, finishedAtMs) {
  const signals = [];
  const minRatio = data.meta?.quality?.min_answered_ratio_for_results ?? 0.75;

  const ratio = completionRatio(data, answers);
  if (ratio < minRatio) {
    signals.push({
      code: "too_many_skips",
      weight: 3,
      msg: t("lowData", { pct: Math.round(ratio * 100) })
    });
  } else if (ratio < 0.9) {
    signals.push({
      code: "some_skips",
      weight: 1,
      msg: t("someSkips", { pct: Math.round(ratio * 100) })
    });
  }

  // Attention check expects "موافقم" => idx 3
  const att = data.items.find((it) => it.tag === "attention_check");
  if (att) {
    const ai = answers[att.id];
    // If user skipped this item, don't mark as failed attention.
    if (Number.isFinite(ai) && ai !== 3) {
      signals.push({ code: "attention_failed", weight: 3, msg: t("attentionFailed") });
    }
  }

  // Infrequency: agreeing is a signal
  const inf = data.items.find((it) => it.tag === "infrequency");
  if (inf) {
    const ai = answers[inf.id];
    if (Number.isFinite(ai)) {
      const v = idxToValue(ai, inf);
      if (v >= 1) signals.push({ code: "infrequency_flag", weight: 2, msg: t("infrequencyFlag") });
    }
  }

  // Speeding: average seconds per answered question
  const start = startedAt();
  const totalMs = Math.max(0, finishedAtMs - start);
  const answeredIds = Object.keys(answers).filter((id) => Number.isFinite(answers[id]));
  const count = Math.max(1, answeredIds.length);
  const secPerQ = (totalMs / 1000) / count;

  const threshold = data.meta?.quality?.speeding_avg_seconds_threshold ?? 1.1;
  if (secPerQ < threshold) {
    signals.push({ code: "speeding", weight: 2, msg: t("speeding") });
  }

  // Straight-lining on scored items
  const scored = data.items.filter((it) => isScoredItem(it) && Number.isFinite(answers[it.id]));
  if (scored.length >= 18) {
    const counts = new Map();
    for (const it of scored) {
      const ai = answers[it.id];
      counts.set(ai, (counts.get(ai) || 0) + 1);
    }
    const maxSame = Math.max(...counts.values());
    if ((maxSame / scored.length) > 0.86) {
      signals.push({ code: "straightlining", weight: 2, msg: t("straightlining") });
    }
  }

  // Consistency pairs (opposite extremes)
  const pairs = data.meta?.consistency_pairs || [];
  for (const p of pairs) {
    const a = answers[p.a];
    const b = answers[p.b];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const itemA = ITEM_BY_ID.get(p.a);
    const itemB = ITEM_BY_ID.get(p.b);
    const va = idxToValue(a, itemA);
    const vb = idxToValue(b, itemB);
    if (p.rule === "opposite_extremes") {
      // For opposite-worded item pairs, same-direction endorsement/disagreement is inconsistent.
      if ((va >= 1 && vb >= 1) || (va <= -1 && vb <= -1)) {
        signals.push({ code: `inconsistent_${p.a}_${p.b}`, weight: 1, msg: t("inconsistentPair", { a: p.a, b: p.b }) });
      }
    }
  }

  // Privacy concern -> confidence only (NOT inference)
  const ps = privacyConcernScore(data, answers);
  if (ps != null && ps >= 70) {
    signals.push({ code: "privacy_high", weight: 2, msg: t("privacyHigh") });
  } else if (ps != null && ps >= 45) {
    signals.push({ code: "privacy_mid", weight: 1, msg: t("privacyMid") });
  }

  const totalWeight = signals.reduce((s, x) => s + x.weight, 0);
  const confidence =
    totalWeight >= 6 ? "low" :
    totalWeight >= 3 ? "medium" : "high";

  return { signals, confidence, secPerQ: round1(secPerQ), completion: Math.round(ratio * 100), privacy: ps };
}

// ---------- Results: Map + explanations ----------
function quadrantLabel(x, y) {
  const econ = x >= 0 ? t("econRight") : t("econLeft");
  const soc  = y >= 0 ? t("auth") : t("liberty");
  return `${soc} + ${econ}`;
}

function explanationLines(x, y, d) {
  if (IS_EN) {
    const lines = [];
    if (x <= -33) lines.push("On economics, you generally lean toward social protection, redistribution, and a stronger role for government.");
    else if (x >= 33) lines.push("On economics, you generally lean toward market competition, less state intervention, and individual choice.");
    else lines.push("On economics, your position appears more mixed/centrist between state and market roles.");
    if (y <= -33) lines.push("On culture/authority, you tend to prioritize civil liberties, privacy, and individual freedoms.");
    else if (y >= 33) lines.push("On culture/authority, you tend to prioritize order, legal strictness, and stronger social control.");
    else lines.push("On culture/authority, your position appears balanced between liberty and order concerns.");
    if (d >= 70) lines.push("Your support for democratic norms appears high (e.g., competitive elections, judicial independence, oversight).");
    else if (d <= 40) lines.push("Your support for some core democratic norms appears lower on this run.");
    else lines.push("Your support for democratic norms appears moderate and may vary by context.");
    lines.push("This is a simplified map and may not capture all issue-specific views.");
    return lines;
  }
  const lines = [];

  // Economy tendencies
  if (x <= -33) lines.push("در اقتصاد، معمولاً به حمایت اجتماعی، بازتوزیع و نقش پررنگ‌تر دولت برای کاهش نابرابری تمایل دارید.");
  else if (x >= 33) lines.push("در اقتصاد، معمولاً به بازار، کاهش دخالت دولت، و اتکای بیشتر به رقابت و تصمیم فردی تمایل دارید.");
  else lines.push("در اقتصاد، نگاه شما میانه‌تر است و ترکیبی از نقش دولت و نقش بازار را قابل قبول می‌دانید.");

  // Authority / liberty tendencies
  if (y <= -33) lines.push("در فرهنگ/اقتدار، معمولاً حقوق مدنی، حریم خصوصی و آزادی‌های فردی برایتان اولویت بالاتری دارد.");
  else if (y >= 33) lines.push("در فرهنگ/اقتدار، معمولاً نظم، سخت‌گیری قانونی و کنترل بیشتر را برای ثبات اجتماعی مهم‌تر می‌دانید.");
  else lines.push("در فرهنگ/اقتدار، نگاه شما متعادل‌تر است و بین آزادی‌های فردی و دغدغه نظم/ثبات مصالحه می‌بینید.");

  // Democratic norms
  if (d >= 70) lines.push("در هنجارهای دموکراتیک، حمایت شما از اصولی مثل انتخابات رقابتی، استقلال دادگاه و حقوق متهم بالاست.");
  else if (d <= 40) lines.push("در هنجارهای دموکراتیک، حمایت شما از برخی اصول کلیدی (مثل نظارت و محدودیت قدرت) پایین‌تر دیده می‌شود.");
  else lines.push("در هنجارهای دموکراتیک، نگاه شما میانه است و احتمالاً بسته به شرایط، حساسیت‌های متفاوتی دارید.");

  // Disclaimer
  lines.push("این فقط یک نقشهٔ ساده است؛ ممکن است در موضوعات خاص، دیدگاه شما از این الگو فاصله داشته باشد.");

  return lines;
}

function getReferenceFigures() {
  return [
    {
      x: -55, y: -35,
      fa: "برنی سندرز", en: "Bernie Sanders",
      roleFa: "سیاستمدار", roleEn: "Politician",
      kind: "person",
      ideologyFa: "سوسیال‌دموکرات/چپ دموکراتیک",
      ideologyEn: "Social democratic / democratic left",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Bernie-Sanders"
    },
    {
      x: 70, y: 45,
      fa: "دونالد ترامپ", en: "Donald Trump",
      roleFa: "سیاستمدار", roleEn: "Politician",
      kind: "person",
      ideologyFa: "راست ملی‌گرا/پوپولیست",
      ideologyEn: "National-conservative / populist right",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Donald-Trump"
    },
    {
      x: 85, y: 85,
      fa: "شی جین‌پینگ", en: "Xi Jinping",
      roleFa: "سیاستمدار", roleEn: "Politician",
      kind: "person",
      ideologyFa: "حزب کمونیستِ اقتدارگرا",
      ideologyEn: "Authoritarian communist party line",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Xi-Jinping"
    },
    {
      x: 20, y: 15,
      fa: "آنگلا مرکل", en: "Angela Merkel",
      roleFa: "سیاستمدار", roleEn: "Politician",
      kind: "person",
      ideologyFa: "محافظه‌کار میانه",
      ideologyEn: "Center-right conservative",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Angela-Merkel"
    },
    {
      x: 78, y: -30,
      fa: "میلتون فریدمن", en: "Milton Friedman",
      roleFa: "اقتصاددان", roleEn: "Economist",
      kind: "person",
      ideologyFa: "بازار آزاد/لیبرالیسم اقتصادی",
      ideologyEn: "Free-market economic liberalism",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Milton-Friedman"
    },
    {
      x: 35, y: 45,
      fa: "سعید جلیلی", en: "Saeed Jalili",
      roleFa: "سیاستمدار", roleEn: "Politician",
      kind: "person",
      ideologyFa: "محافظه‌کار اصول‌گرا",
      ideologyEn: "Iranian hardline conservative",
      category: "iranian",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Saeed-Jalili"
    },
    {
      x: -10, y: -10,
      fa: "محمدجواد ظریف", en: "Mohammad Javad Zarif",
      roleFa: "دیپلمات", roleEn: "Diplomat",
      kind: "person",
      ideologyFa: "میانه‌رو/اصلاح‌طلب",
      ideologyEn: "Moderate / reformist-leaning",
      category: "iranian",
      sourceLabel: "AP",
      sourceUrl: "https://apnews.com/article/a1f69333ab317789e3acc23cb46c04fc"
    },
    {
      x: -20, y: -35,
      fa: "نرگس محمدی", en: "Narges Mohammadi",
      roleFa: "فعال حقوق بشر", roleEn: "Human Rights Activist",
      kind: "person",
      ideologyFa: "حقوق‌بشری/آزادی‌خواه",
      ideologyEn: "Civil-liberties / human-rights oriented",
      category: "iranian",
      sourceLabel: "Nobel/Britannica",
      sourceUrl: "https://www.nobelprize.org/prizes/peace/2023/mohammadi/speedread/"
    },
    {
      x: 20, y: 5,
      fa: "امانوئل مکرون", en: "Emmanuel Macron",
      roleFa: "سیاستمدار", roleEn: "Politician",
      kind: "person",
      ideologyFa: "میانه‌گرا لیبرال",
      ideologyEn: "Centrist liberal",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Emmanuel-Macron"
    },
    {
      x: 12, y: -8,
      fa: "باراک اوباما", en: "Barack Obama",
      roleFa: "سیاستمدار", roleEn: "Politician",
      kind: "person",
      ideologyFa: "لیبرال میانه‌چپ",
      ideologyEn: "Center-left liberal",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Barack-Obama"
    },
    {
      x: 55, y: 78,
      fa: "نارندرا مودی", en: "Narendra Modi",
      roleFa: "سیاستمدار", roleEn: "Politician",
      kind: "person",
      ideologyFa: "ملی‌گرای محافظه‌کار",
      ideologyEn: "Conservative nationalist",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Narendra-Modi"
    },
    {
      x: -78, y: -40,
      fa: "کارل مارکس", en: "Karl Marx",
      roleFa: "فیلسوف/اقتصاددان", roleEn: "Philosopher/Economist",
      kind: "person",
      ideologyFa: "سوسیالیسم/کمونیسم",
      ideologyEn: "Socialism / communism",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Karl-Marx"
    },
    {
      x: 82, y: -32,
      fa: "فریدریش هایک", en: "Friedrich Hayek",
      roleFa: "اقتصاددان", roleEn: "Economist",
      kind: "person",
      ideologyFa: "لیبرال کلاسیک",
      ideologyEn: "Classical liberal",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Friedrich-August-von-Hayek"
    },
    {
      x: -20, y: -42,
      fa: "شیرین عبادی", en: "Shirin Ebadi",
      roleFa: "حقوقدان/فعال", roleEn: "Lawyer/Activist",
      kind: "person",
      ideologyFa: "حقوق‌بشری/آزادی‌خواه",
      ideologyEn: "Civil-rights / libertarian-oriented",
      category: "iranian",
      sourceLabel: "Nobel",
      sourceUrl: "https://www.nobelprize.org/prizes/peace/2003/ebadi/facts/"
    },
    // Extra figures for quadrant 2 (left + authoritarian)
    {
      x: -68, y: 78,
      fa: "ولادیمیر لنین", en: "Vladimir Lenin",
      roleFa: "سیاستمدار/انقلابی", roleEn: "Politician/Revolutionary",
      kind: "person",
      ideologyFa: "چپ انقلابی اقتدارگرا",
      ideologyEn: "Authoritarian revolutionary left",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Vladimir-Lenin"
    },
    {
      x: -42, y: 62,
      fa: "هوگو چاوز", en: "Hugo Chavez",
      roleFa: "سیاستمدار", roleEn: "Politician",
      kind: "person",
      ideologyFa: "سوسیالیسم بولیواری با تمرکز قدرت",
      ideologyEn: "Bolivarian socialism with concentrated executive power",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Hugo-Chavez"
    },
    {
      x: -82, y: 88,
      fa: "ژوزف استالین", en: "Joseph Stalin",
      roleFa: "رهبر شوروی", roleEn: "Soviet Leader",
      kind: "person",
      ideologyFa: "کمونیسم اقتدارگرای متمرکز",
      ideologyEn: "Centralized authoritarian communism",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Joseph-Stalin"
    },
    // Parties by quadrant (researched sources)
    {
      x: -36, y: -58,
      fa: "حزب سبز انگلستان و ولز", en: "Green Party of England and Wales",
      roleFa: "حزب", roleEn: "Party",
      kind: "party",
      ideologyFa: "اکولوژی سیاسی/چپ سبز آزادی‌خواه",
      ideologyEn: "Green politics / libertarian left",
      category: "foreign",
      sourceLabel: "Green Party (official values)",
      sourceUrl: "https://greenparty.org.uk/about/our-values/"
    },
    {
      x: -24, y: -44,
      fa: "جبهه ملی ایران", en: "National Front of Iran",
      roleFa: "حزب/جبهه", roleEn: "Political Front/Party",
      kind: "party",
      ideologyFa: "ملی‌گرایی سکولار/دموکراتیک",
      ideologyEn: "Secular democratic nationalism",
      category: "iranian",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/topic/National-Front-Iran"
    },
    {
      x: -72, y: 86,
      fa: "حزب کمونیست چین", en: "Chinese Communist Party",
      roleFa: "حزب", roleEn: "Party",
      kind: "party",
      ideologyFa: "مارکسیسم-لنینیسم/سوسیالیسم دولتی",
      ideologyEn: "Marxism-Leninism / state socialism",
      category: "foreign",
      sourceLabel: "CPC Constitution",
      sourceUrl: "http://www.npc.gov.cn/zgrdw/englishnpc/Constitution/node_2825.htm"
    },
    {
      x: -66, y: 80,
      fa: "حزب کمونیست کوبا", en: "Communist Party of Cuba",
      roleFa: "حزب", roleEn: "Party",
      kind: "party",
      ideologyFa: "سوسیالیسم تک‌حزبی",
      ideologyEn: "Single-party socialism",
      category: "foreign",
      sourceLabel: "Cuban Constitution",
      sourceUrl: "https://www.constituteproject.org/constitution/Cuba_2019.pdf"
    },
    {
      x: -58, y: 64,
      fa: "حزب توده ایران", en: "Tudeh Party of Iran",
      roleFa: "حزب", roleEn: "Party",
      kind: "party",
      ideologyFa: "کمونیسم/چپ سنتی",
      ideologyEn: "Communist / traditional left",
      category: "iranian",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/topic/Tudeh-Party"
    },
    {
      x: 58, y: 62,
      fa: "حزب بهاراتیا جاناتا (BJP)", en: "Bharatiya Janata Party (BJP)",
      roleFa: "حزب", roleEn: "Party",
      kind: "party",
      ideologyFa: "ملی‌گرایی هندو/محافظه‌کار",
      ideologyEn: "Hindu nationalism / conservative",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/topic/Bharatiya-Janata-Party"
    },
    {
      x: 54, y: 66,
      fa: "حزب فیدس (مجارستان)", en: "Fidesz (Hungary)",
      roleFa: "حزب", roleEn: "Party",
      kind: "party",
      ideologyFa: "محافظه‌کاری ملی/راست اقتدارگرا",
      ideologyEn: "National conservatism / authoritarian right",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/topic/Fidesz"
    },
    {
      x: 52, y: 74,
      fa: "جبهه پایداری انقلاب اسلامی", en: "Front of Islamic Revolution Stability",
      roleFa: "حزب/جبهه", roleEn: "Political Front/Party",
      kind: "party",
      ideologyFa: "اصول‌گرای تندرو/محافظه‌کار دینی",
      ideologyEn: "Hardline principlist / religious conservative",
      category: "iranian",
      sourceLabel: "Wikipedia (IR)",
      sourceUrl: "https://fa.wikipedia.org/wiki/%D8%AC%D8%A8%D9%87%D9%87_%D9%BE%D8%A7%DB%8C%D8%AF%D8%A7%D8%B1%DB%8C_%D8%A7%D9%86%D9%82%D9%84%D8%A7%D8%A8_%D8%A7%D8%B3%D9%84%D8%A7%D9%85%DB%8C"
    },
    // Extra figures for quadrant 4 (right + libertarian)
    {
      x: 88, y: -66,
      fa: "رابرت نوزیک", en: "Robert Nozick",
      roleFa: "فیلسوف", roleEn: "Philosopher",
      kind: "person",
      ideologyFa: "لیبرترین راست",
      ideologyEn: "Right-libertarian",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Robert-Nozick"
    },
    {
      x: 86, y: -55,
      fa: "خاویر میلی", en: "Javier Milei",
      roleFa: "سیاستمدار/اقتصاددان", roleEn: "Politician/Economist",
      kind: "person",
      ideologyFa: "لیبرتارین/آنارکو-کاپیتالیستی",
      ideologyEn: "Libertarian / anarcho-capitalist",
      category: "foreign",
      sourceLabel: "Britannica",
      sourceUrl: "https://www.britannica.com/biography/Javier-Milei"
    },
    {
      x: 84, y: -72,
      fa: "حزب لیبرتارین آمریکا", en: "Libertarian Party (US)",
      roleFa: "حزب", roleEn: "Party",
      kind: "party",
      ideologyFa: "حداقل‌گرایی دولت/بازار آزاد",
      ideologyEn: "Minarchism / free-market libertarianism",
      category: "foreign",
      sourceLabel: "LP Platform",
      sourceUrl: "https://www.lp.org/platform/"
    },
    {
      x: 76, y: -52,
      fa: "لا لیبرتاد آوانزا", en: "La Libertad Avanza",
      roleFa: "حزب/ائتلاف", roleEn: "Party/Coalition",
      kind: "party",
      ideologyFa: "راست لیبرتارین",
      ideologyEn: "Libertarian right",
      category: "foreign",
      sourceLabel: "Wikipedia/Official",
      sourceUrl: "https://en.wikipedia.org/wiki/La_Libertad_Avanza"
    },
    {
      x: 28, y: -18,
      fa: "حزب کارگزاران سازندگی ایران", en: "Executives of Construction Party (Iran)",
      roleFa: "حزب", roleEn: "Party",
      kind: "party",
      ideologyFa: "تکنوکرات میانه‌رو/بازارگرا",
      ideologyEn: "Technocratic moderate / market-oriented",
      category: "iranian",
      sourceLabel: "Wikipedia (IR)",
      sourceUrl: "https://fa.wikipedia.org/wiki/%D8%AD%D8%B2%D8%A8_%DA%A9%D8%A7%D8%B1%DA%AF%D8%B2%D8%A7%D8%B1%D8%A7%D9%86_%D8%B3%D8%A7%D8%B2%D9%86%D8%AF%DA%AF%DB%8C_%D8%A7%DB%8C%D8%B1%D8%A7%D9%86"
    }
  ];
}

function filterReferenceFigures(refs, originKey, kindKey) {
  let out = refs;
  if (originKey === "foreign") out = out.filter((r) => r.category === "foreign");
  else if (originKey === "iranian") out = out.filter((r) => r.category === "iranian");

  if (kindKey === "person") out = out.filter((r) => r.kind !== "party");
  else if (kindKey === "party") out = out.filter((r) => r.kind === "party");
  return out;
}

function getFilteredReferences(refsAll) {
  return filterReferenceFigures(refsAll, REF_FILTER_ORIGIN, REF_FILTER_KIND);
}

function renderReferenceFilter() {
  const wrap = el("refsFilter");
  if (!wrap) return;

  const originOptions = [
    { key: "all", label: t("refsFilterAll") },
    { key: "foreign", label: t("refsFilterForeign") },
    { key: "iranian", label: t("refsFilterIranian") }
  ];
  const kindOptions = [
    { key: "all", label: t("refsFilterAll") },
    { key: "person", label: t("refsFilterPeople") },
    { key: "party", label: t("refsFilterParties") }
  ];

  wrap.innerHTML = "";

  const buildGroup = (title, options, activeKey, groupKey) => {
    const g = document.createElement("div");
    g.className = "filterGroup";
    const l = document.createElement("span");
    l.className = "filterLabel";
    l.textContent = title;
    g.appendChild(l);

    options.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `filterBtn${activeKey === opt.key ? " active" : ""}`;
      b.textContent = opt.label;
      b.addEventListener("click", () => {
        if (groupKey === "origin") REF_FILTER_ORIGIN = opt.key;
        if (groupKey === "kind") REF_FILTER_KIND = opt.key;
        renderReferenceFilter();
        if (LAST_RESULTS) {
          const refs = getFilteredReferences(LAST_RESULTS.refsAll);
          drawPlot(el("plot"), LAST_RESULTS.x, LAST_RESULTS.y, refs);
          renderReferenceFigures(refs);
        }
      });
      g.appendChild(b);
    });
    wrap.appendChild(g);
  };

  buildGroup(t("refsFilterOrigin"), originOptions, REF_FILTER_ORIGIN, "origin");
  buildGroup(t("refsFilterKind"), kindOptions, REF_FILTER_KIND, "kind");
}

function drawPlot(svg, x, y, refs = []) {
  const W = 360, H = 360;
  const pad = 40;
  const left = pad, top = pad, right = W - pad, bottom = H - pad;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  const mapX = (v) => left + ((v + 100) / 200) * (right - left);
  const mapY = (v) => top + ((100 - v) / 200) * (bottom - top); // invert

  const dotX = mapX(x);
  const dotY = mapY(y);

  svg.innerHTML = "";

  const add = (tag, attrs = {}) => {
    const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
    svg.appendChild(n);
    return n;
  };

  // background
  add("rect", { x: 0, y: 0, width: W, height: H, fill: "rgba(255,255,255,0.00)" });

  // grid
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const gx = left + t * (right - left);
    const gy = top + t * (bottom - top);
    add("line", { x1: gx, y1: top, x2: gx, y2: bottom, stroke: "rgba(166,178,195,.22)", "stroke-width": 1 });
    add("line", { x1: left, y1: gy, x2: right, y2: gy, stroke: "rgba(166,178,195,.22)", "stroke-width": 1 });
  }

  // axes
  add("line", { x1: cx, y1: top, x2: cx, y2: bottom, stroke: "rgba(155,211,255,.65)", "stroke-width": 2 });
  add("line", { x1: left, y1: cy, x2: right, y2: cy, stroke: "rgba(155,211,255,.65)", "stroke-width": 2 });

  const txt = (x, y, s, anchor = "middle") => {
    const t = add("text", {
      x, y,
      fill: "rgba(166,178,195,.9)",
      "font-size": 11,
      "text-anchor": anchor,
      "dominant-baseline": "middle"
    });
    t.appendChild(document.createTextNode(s));
  };

  txt(left + 6, cy - 12, t("axisLeft"), "start");
  txt(right - 6, cy - 12, t("axisRight"), "end");
  txt(cx + 6, top + 10, t("axisTop"), "start");
  txt(cx + 6, bottom - 10, t("axisBottom"), "start");

  // Visual-only collision handling: keep semantic position by limiting offset
  // and drawing a thin connector from true position to displayed position.
  const placed = [];
  const minDist = 15;
  const maxOffset = 12;
  const clampInPlot = (v, a, b) => Math.max(a, Math.min(b, v));

  // reference figures
  refs.forEach((r, i) => {
    const rxTrue = mapX(r.x);
    const ryTrue = mapY(r.y);
    let rx = rxTrue;
    let ry = ryTrue;

    let k = 0;
    while (k < 20) {
      const collide = placed.some((p) => {
        const dx = p.x - rx;
        const dy = p.y - ry;
        return (dx * dx + dy * dy) < (minDist * minDist);
      });
      if (!collide) break;

      const angle = (k * 137.5) * Math.PI / 180;
      const radius = Math.min(4 + Math.floor(k / 4) * 2, maxOffset);
      rx = clampInPlot(rxTrue + Math.cos(angle) * radius, left + 8, right - 8);
      ry = clampInPlot(ryTrue + Math.sin(angle) * radius, top + 8, bottom - 8);
      k++;
    }
    placed.push({ x: rx, y: ry });

    const moved = Math.abs(rx - rxTrue) > 0.5 || Math.abs(ry - ryTrue) > 0.5;
    if (moved) {
      add("line", {
        x1: rxTrue,
        y1: ryTrue,
        x2: rx,
        y2: ry,
        stroke: "rgba(178,198,226,.35)",
        "stroke-width": 1
      });
    }

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("style", "cursor:help");

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    const kind = IS_EN ? (r.kind === "party" ? "Party" : "Person") : (r.kind === "party" ? "حزب" : "فرد");
    const ideology = IS_EN ? (r.ideologyEn || "") : (r.ideologyFa || "");
    title.textContent = `${i + 1}. ${IS_EN ? r.en : r.fa} | ${kind} | ${IS_EN ? r.roleEn : r.roleFa}${ideology ? ` | ${ideology}` : ""}${r.sourceLabel ? ` — ${r.sourceLabel}` : ""}`;
    g.appendChild(title);

    if (r.kind === "party") {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      p.setAttribute("x", String(rx - 6));
      p.setAttribute("y", String(ry - 6));
      p.setAttribute("width", "12");
      p.setAttribute("height", "12");
      p.setAttribute("rx", "2");
      p.setAttribute("fill", "rgba(245,183,90,.95)");
      p.setAttribute("stroke", "rgba(11,18,32,.92)");
      p.setAttribute("stroke-width", "1");
      g.appendChild(p);
    } else {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", String(rx));
      c.setAttribute("cy", String(ry));
      c.setAttribute("r", "6");
      c.setAttribute("fill", "rgba(178,198,226,.92)");
      c.setAttribute("stroke", "rgba(11,18,32,.92)");
      c.setAttribute("stroke-width", "1");
      g.appendChild(c);
    }

    const n = document.createElementNS("http://www.w3.org/2000/svg", "text");
    n.setAttribute("x", String(rx));
    n.setAttribute("y", String(ry + 0.2));
    n.setAttribute("fill", "rgba(11,18,32,.95)");
    n.setAttribute("font-size", "8.5");
    n.setAttribute("font-weight", "700");
    n.setAttribute("text-anchor", "middle");
    n.setAttribute("dominant-baseline", "middle");
    n.appendChild(document.createTextNode(String(i + 1)));
    g.appendChild(n);

    svg.appendChild(g);
  });

  // dot
  add("circle", { cx: dotX, cy: dotY, r: 7, fill: "rgba(122,167,255,.95)" });
  add("circle", { cx: dotX, cy: dotY, r: 14, fill: "rgba(122,167,255,.15)" });
}

function renderPlotLegend() {
  const host = el("plotLegend");
  if (!host) return;
  host.innerHTML = "";

  const items = [
    { cls: "legendDot person", label: t("legendPeople") },
    { cls: "legendDot party", label: t("legendParties") }
  ];

  items.forEach((item) => {
    const row = document.createElement("span");
    row.className = "legendItem";
    const dot = document.createElement("span");
    dot.className = item.cls;
    const txt = document.createElement("span");
    txt.textContent = item.label;
    row.appendChild(dot);
    row.appendChild(txt);
    host.appendChild(row);
  });
}

function renderReferenceFigures(refs) {
  const title = el("refsTitle");
  const note = el("refsNote");
  const list = el("referenceList");
  if (!title || !note || !list) return;

  title.textContent = t("refsTitle");
  note.textContent = t("refsNote");

  list.innerHTML = "";
  refs.forEach((r, i) => {
    const item = document.createElement("div");
    item.className = "refItem";

    const n = document.createElement("div");
    n.className = `refNo ${r.kind === "party" ? "party" : "person"}`;
    n.textContent = String(i + 1);

    const body = document.createElement("div");
    body.className = "refBody";

    const name = document.createElement("div");
    name.className = "refName";
    name.textContent = IS_EN ? r.en : r.fa;

    const meta = document.createElement("div");
    meta.className = "refMeta";
    const role = IS_EN ? r.roleEn : r.roleFa;
    const kind = IS_EN ? (r.kind === "party" ? "Party" : "Person") : (r.kind === "party" ? "حزب" : "فرد");
    const ideology = IS_EN ? (r.ideologyEn || "") : (r.ideologyFa || "");
    meta.textContent = `${kind} | ${role}${ideology ? ` | ${ideology}` : ""}  |  X:${r.x}, Y:${r.y}`;

    const src = document.createElement("a");
    src.className = "refSrc";
    src.href = r.sourceUrl || "#";
    src.target = "_blank";
    src.rel = "noopener noreferrer";
    src.textContent = IS_EN ? `Source: ${r.sourceLabel || "Reference"}` : `منبع: ${r.sourceLabel || "مرجع"}`;

    body.appendChild(name);
    body.appendChild(meta);
    if (r.sourceUrl) body.appendChild(src);
    item.appendChild(n);
    item.appendChild(body);
    list.appendChild(item);
  });

  const count = el("refsCount");
  if (count) count.textContent = String(refs.length);
  list.classList.toggle("collapsed", REFS_COLLAPSED);
  const btn = el("btnToggleRefs");
  if (btn) {
    btn.textContent = REFS_COLLAPSED ? t("refsShow") : t("refsHide");
    btn.setAttribute("aria-expanded", String(!REFS_COLLAPSED));
  }
}

// ---------- Methodology modal ----------
function buildMethodologyHTML(data) {
  const disclaimer = IS_EN ? (data.meta?.disclaimer_en || "") : (data.meta?.disclaimer_fa || "");
  return `${t("methodologyHtml")}<p class="muted small">${disclaimer}</p>`;
}

// ---------- Navigation ----------
function goNext() {
  if (idx >= ORDERED.length - 1) {
    // End
    showToast(t("endReached"));
    return;
  }
  idx++;
  persistIndex();
  renderCurrent();
}
function goPrev() {
  if (idx <= 0) return;
  idx--;
  persistIndex();
  renderCurrent();
}
function skipCurrent() {
  const item = ORDERED[idx];
  const a = getAnswers();
  delete a[item.id];
  setAnswers(a);
  setLastAction();
  updateProgress();
  showToast(t("skipped"));
  goNext();
}

// ---------- Results ----------
function showResults() {
  const answers = getAnswers();
  const finishedAtMs = nowMs();
  const q = qualitySignals(DATA, answers, finishedAtMs);

  // If too many skips, keep user on quiz and guide them
  const minRatio = DATA.meta?.quality?.min_answered_ratio_for_results ?? 0.75;
  const ratio = completionRatio(DATA, answers);

  if (ratio < minRatio) {
    screen("quiz");
    showToast(
      t("needMinAnswers", { min: Math.round(minRatio * 100), now: Math.round(ratio * 100) })
    );
    return;
  }

  const s = scoreAll(DATA, answers);
  const x = s.x, y = s.y, d = s.d;
  const refsAll = getReferenceFigures();
  const refs = getFilteredReferences(refsAll);
  REFS_COLLAPSED = true;
  LAST_RESULTS = { x, y, refsAll };

  // render results
  el("scoreX").textContent = String(round0(x));
  el("scoreY").textContent = String(round0(y));
  el("scoreD").textContent = String(round0(d));
  el("demoFill").style.width = `${round0(d)}%`;

  const ps = q.privacy;
  if (ps == null) {
    el("scorePrivacy").textContent = t("scorePrivacyEmpty");
    el("privacyFill").style.width = "0%";
  } else {
    el("scorePrivacy").textContent = String(round0(ps));
    el("privacyFill").style.width = `${round0(ps)}%`;
  }

  el("quadrantText").textContent = t("quadrantText", { label: quadrantLabel(x, y) });
  renderReferenceFilter();
  renderPlotLegend();
  drawPlot(el("plot"), x, y, refs);
  renderReferenceFigures(refs);

  // explanation lines
  const explain = el("explain");
  explain.innerHTML = "";
  for (const line of explanationLines(x, y, d)) {
    const div = document.createElement("div");
    div.className = "line";
    div.textContent = line;
    explain.appendChild(div);
  }

  // confidence box
  const box = el("confidenceBox");
  if (q.confidence === "high") {
    box.classList.remove("show");
    box.textContent = "";
  } else {
    const label = q.confidence === "low" ? t("lowConfidence") : t("midConfidence");
    const bullets = q.signals.map((s) => `• ${s.msg}`).join("\n");
    box.textContent =
      `${label}\n` +
      `${t("answered", { pct: q.completion })}\n` +
      `${t("secPerQ", { sec: q.secPerQ })}\n` +
      `${bullets}\n` +
      `${t("rerunHint")}`;
    box.classList.add("show");
  }

  screen("results");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Wiring ----------
function resetSessionState() {
  sessionStorage.removeItem(STORAGE.answers);
  sessionStorage.removeItem(STORAGE.startedAt);
  sessionStorage.removeItem(STORAGE.lastAction);
  sessionStorage.removeItem(STORAGE.order);
  sessionStorage.removeItem(STORAGE.seed);
  sessionStorage.removeItem(STORAGE.currentIndex);
}

function wireUI() {
  // Start / Continue
  el("btnStart").addEventListener("click", () => {
    // reset flow but keep any stored data? Better: start from scratch
    sessionStorage.removeItem(STORAGE.answers);
    sessionStorage.removeItem(STORAGE.order);
    sessionStorage.removeItem(STORAGE.currentIndex);
    sessionStorage.setItem(STORAGE.startedAt, String(nowMs()));
    sessionStorage.setItem(STORAGE.lastAction, String(nowMs()));

    ORDERED = buildOrder(DATA);
    restoreIndex();
    screen("quiz");
    renderCurrent();
  });

  el("btnContinue").addEventListener("click", () => {
    const a = getAnswers();
    const hasAny = Object.keys(a).some((k) => Number.isFinite(a[k]));
    if (!hasAny) {
      showToast(t("nothingToContinue"));
      return;
    }
    ORDERED = buildOrder(DATA);
    restoreIndex();
    screen("quiz");
    renderCurrent();
  });

  // Quiz navigation
  el("btnPrev").addEventListener("click", goPrev);
  el("btnNext").addEventListener("click", () => {
    // allow moving forward even without answer, but nudge gently
    const item = ORDERED[idx];
    const a = getAnswers();
    if (!Number.isFinite(a[item.id])) {
      showToast(t("unsureHint"));
    }
    if (idx === ORDERED.length - 1) {
      showToast(t("endQuestions"));
      return;
    }
    goNext();
  });

  el("btnSkip").addEventListener("click", skipCurrent);
  el("btnFinish").addEventListener("click", showResults);

  // Results actions
  el("btnRetake").addEventListener("click", () => {
    sessionStorage.removeItem(STORAGE.answers);
    sessionStorage.removeItem(STORAGE.order);
    sessionStorage.removeItem(STORAGE.currentIndex);
    sessionStorage.setItem(STORAGE.startedAt, String(nowMs()));
    sessionStorage.setItem(STORAGE.lastAction, String(nowMs()));
    ORDERED = buildOrder(DATA);
    idx = 0;
    persistIndex();
    screen("quiz");
    renderCurrent();
  });

  el("btnBackToQuiz").addEventListener("click", () => {
    screen("quiz");
    renderCurrent();
  });

  const btnToggleRefs = el("btnToggleRefs");
  if (btnToggleRefs) {
    btnToggleRefs.addEventListener("click", () => {
      REFS_COLLAPSED = !REFS_COLLAPSED;
      const list = el("referenceList");
      if (list) list.classList.toggle("collapsed", REFS_COLLAPSED);
      btnToggleRefs.textContent = REFS_COLLAPSED ? t("refsShow") : t("refsHide");
      btnToggleRefs.setAttribute("aria-expanded", String(!REFS_COLLAPSED));
    });
  }

  // Method modal
  const modal = el("methodModal");
  el("btnMethod").addEventListener("click", () => {
    el("methodBody").innerHTML = buildMethodologyHTML(DATA);
    const titleEl = modal.querySelector(".fw900");
    if (titleEl) titleEl.textContent = t("methodologyTitle");
    modal.showModal();
  });
  el("btnCloseMethod").addEventListener("click", () => modal.close());

  // Reset
  el("btnReset").addEventListener("click", () => {
    resetSessionState();
    location.reload();
  });

  // Quick exit (a neutral page)
  el("btnQuickExit").addEventListener("click", () => {
    // Put something boring and safe. Change if needed.
    window.location.href = "https://www.wikipedia.org";
  });
}

async function main() {
  ensureStarted();
  DATA = await loadData();
  ITEM_BY_ID = new Map(DATA.items.map((it) => [it.id, it]));

  // Build/restore order
  ORDERED = buildOrder(DATA);
  restoreIndex();
  updateProgress();

  // Wire UI
  wireUI();

  // If there are already answers, enable Continue button
  updateProgress();
}

main().catch((err) => {
  console.error(err);
  alert(t("loadErr"));
});
