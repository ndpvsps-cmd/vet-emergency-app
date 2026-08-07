import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager,
  collection, addDoc, deleteDoc, doc, query, where,
  onSnapshot, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// FIREBASE_CONFIG / TEAM_PASSCODE come from firebase-config.js (plain <script> before this module).
const fbApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(fbApp);
// Persistent (IndexedDB-backed) local cache: writes are queued durably on-device and
// retried automatically once the network is available, instead of only living in memory.
// Without this, a save made on a slow/flaky connection can be lost entirely if the page
// is refreshed before the write finishes reaching Firestore's servers.
const db = initializeFirestore(fbApp, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
});

let todayRecords = [];
let unsubscribeToday = null;

// ===================== small helpers =====================
function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function val(id) {
  const el = $(id);
  if (!el) return null;
  const v = el.value;
  return v === "" ? null : v;
}

function num(id) {
  const v = val(id);
  return v === null ? null : parseFloat(v);
}

function fmtList(arr) {
  return Array.isArray(arr) && arr.length ? arr.join("/") : null;
}

function round(n, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function computeUop(volumeMl, weightKg, hours) {
  if (volumeMl == null || !weightKg || !hours) return null;
  return volumeMl / (weightKg * hours);
}

function classifyUop(uop) {
  if (uop < 0.5) return "Anuria/Oliguria รุนแรง";
  if (uop < 1) return "Oliguria";
  if (uop <= 2) return "ปกติ";
  return "Polyuria";
}

function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function todayLabel() {
  return new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function nowTimeLabel() {
  return new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function speciesLabel(species) {
  if (species === "dog") return "สุนัข";
  if (species === "cat") return "แมว";
  return species || "-";
}

let toastTimer = null;
function showToast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2500);
}

function showSyncBanner(msg) {
  const el = $("sync-banner");
  if (msg) { el.textContent = msg; el.hidden = false; } else { el.hidden = true; }
}

// ===================== chip / field-group engine =====================
// Every chip-based input lives inside a container with [data-field] + [data-multi].
// A single .chips div holds .chip buttons; the active class marks selection.
// Optional reveal-blocks show/hide based on another field's current value(s).

function getFieldValue(fieldId) {
  const group = document.querySelector(`[data-field="${fieldId}"]`);
  if (!group) return null;
  const multi = group.dataset.multi === "true";
  const chipsContainer = group.querySelector(".chips") || group;
  const active = [...chipsContainer.querySelectorAll(".chip.active")];
  const values = active.map((c) => {
    if (c.dataset.value === "__other__") {
      const input = group.querySelector(".chip-other-input");
      return input && input.value.trim() ? input.value.trim() : null;
    }
    return c.dataset.value;
  }).filter(Boolean);
  return multi ? values : (values[0] || null);
}

function chipClickHandler(e) {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const group = chip.closest("[data-field]");
  if (!group) return;
  // most groups wrap their chips in a nested .chips div, but small inline
  // toggles like .unit-toggle put the .chip buttons directly inside the group
  const chipsContainer = group.querySelector(".chips") || group;
  const multi = group.dataset.multi === "true";
  if (multi) {
    chip.classList.toggle("active");
  } else {
    const wasActive = chip.classList.contains("active");
    chipsContainer.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    if (!wasActive) chip.classList.add("active");
  }
  const otherChip = group.querySelector('.chip[data-value="__other__"]');
  const otherInput = group.querySelector(".chip-other-input");
  if (otherChip && otherInput) {
    otherInput.hidden = !otherChip.classList.contains("active");
  }
  onFormChange();
}

function updateReveals() {
  document.querySelectorAll(".reveal-block[data-show-field]").forEach((block) => {
    const fieldId = block.dataset.showField;
    const wantValues = block.dataset.showValues.split(",");
    const value = getFieldValue(fieldId);
    const arr = Array.isArray(value) ? value : (value ? [value] : []);
    block.hidden = !arr.some((v) => wantValues.includes(v));
  });
}

// ===================== dynamic vocab rendering =====================
function chipsHtml(options) {
  return options.map((opt) => {
    const value = typeof opt === "string" ? opt : opt.value;
    const label = typeof opt === "string" ? opt : opt.label;
    return `<button type="button" class="chip" data-value="${value}">${label}</button>`;
  }).join("");
}

// Compact chip-grid + on-demand detail input, shared by Labs and Supply: chips wrap
// freely (space-efficient) and a detail/quantity row only appears for chips the user
// has actually toggled on, instead of reserving a full row per item up front.
function renderCompactToggleGroup(bodyId, chipsId, listId, items, { idPrefix, inputSuffix, inputType, placeholder }) {
  const body = $(bodyId);
  body.innerHTML = `
    <div class="chips" id="${chipsId}"></div>
    <div id="${listId}" class="detail-row-list"></div>
  `;
  $(chipsId).innerHTML = items.map((item) => `<button type="button" class="chip" data-item-id="${item.id}">${item.label}</button>`).join("");

  function syncRows() {
    const activeIds = [...document.querySelectorAll(`#${chipsId} .chip.active`)].map((c) => c.dataset.itemId);
    const list = $(listId);
    const existing = {};
    list.querySelectorAll(".detail-row").forEach((row) => {
      existing[row.dataset.itemId] = row.querySelector("input").value;
    });
    list.innerHTML = activeIds.map((id) => {
      const item = items.find((i) => i.id === id);
      const val = existing[id] || "";
      const numAttrs = inputType === "number" ? 'min="1" step="1"' : "";
      return `<div class="detail-row" data-item-id="${id}"><span>${item.label}</span><input type="${inputType}" ${numAttrs} id="${idPrefix}-${id}-${inputSuffix}" placeholder="${placeholder}" value="${val}"></div>`;
    }).join("");
    list.querySelectorAll("input").forEach((input) => input.addEventListener("input", onFormChange));
  }

  document.querySelectorAll(`#${chipsId} .chip`).forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      syncRows();
      onFormChange();
    });
  });
}

// Labs are repeatable rows (not a single toggle per item) so the same test — e.g. blood
// glucose — can be logged multiple times at different points in the shift.
function renderLabsContainer() {
  $("labs-body").innerHTML = `
    <div id="labs-list" class="fluids-list"></div>
    <button type="button" class="add-row-btn" id="labs-add-btn">+ เพิ่มผล Lab</button>
  `;
  $("labs-add-btn").addEventListener("click", addLabsRow);
}

function addLabsRow() {
  const list = $("labs-list");
  const row = document.createElement("div");
  row.className = "labs-row";
  const options = LABS_ITEMS.map((item) => `<option value="${item.id}">${item.label}</option>`).join("");
  const nowTime = new Date().toTimeString().slice(0, 5);
  row.innerHTML = `
    <select class="labs-type-select"><option value="">เลือกรายการ</option>${options}</select>
    <div class="labs-row-detail">
      <input type="time" class="labs-time-input" value="${nowTime}">
      <input type="text" class="labs-value-input" placeholder="ค่า/ผล">
      <button type="button" class="labs-remove-btn" aria-label="ลบ">✕</button>
    </div>
  `;
  row.querySelector(".labs-remove-btn").addEventListener("click", () => { row.remove(); onFormChange(); });
  row.querySelectorAll("select, input").forEach((el) => {
    el.addEventListener("input", onFormChange);
    el.addEventListener("change", onFormChange);
  });
  list.appendChild(row);
}

function collectLabs() {
  return [...document.querySelectorAll("#labs-list .labs-row")].map((row) => {
    const type = row.querySelector(".labs-type-select").value;
    const time = row.querySelector(".labs-time-input").value;
    const value = row.querySelector(".labs-value-input").value.trim();
    return { type, time, value };
  }).filter((l) => l.type);
}

function buildLabsLine(labs) {
  return labs.map((l) => {
    const item = LABS_ITEMS.find((i) => i.id === l.type);
    const label = item ? item.label : l.type;
    const bits = [];
    if (l.time) bits.push(l.time);
    if (l.value) bits.push(l.value);
    return bits.length ? `${label} (${bits.join(", ")})` : label;
  });
}

// ===================== fluids (repeatable rows) =====================
let fluidRowSeq = 0;
function addFluidRow() {
  const list = $("v-fluids-list");
  const row = document.createElement("div");
  row.className = "fluid-row";
  row.dataset.rowId = String(fluidRowSeq++);
  const options = FLUID_TYPES.map((f) => `<option value="${f}">${f}</option>`).join("");
  row.innerHTML = `
    <select class="fluid-type-select"><option value="">เลือกชนิดสารน้ำ</option>${options}<option value="__other__">อื่นๆ (พิมพ์เอง)</option></select>
    <input type="number" class="fluid-rate-input" placeholder="mL/h">
    <button type="button" class="fluid-remove-btn" aria-label="ลบ">✕</button>
  `;
  const otherInput = document.createElement("input");
  otherInput.type = "text";
  otherInput.className = "chip-other-input";
  otherInput.placeholder = "ระบุชนิดสารน้ำ";
  otherInput.hidden = true;
  row.appendChild(otherInput);

  const select = row.querySelector(".fluid-type-select");
  select.addEventListener("change", () => {
    otherInput.hidden = select.value !== "__other__";
    onFormChange();
  });
  otherInput.addEventListener("input", onFormChange);
  row.querySelector(".fluid-remove-btn").addEventListener("click", () => { row.remove(); onFormChange(); });
  row.querySelector(".fluid-rate-input").addEventListener("input", onFormChange);
  list.appendChild(row);
}

function collectFluids() {
  return [...document.querySelectorAll("#v-fluids-list .fluid-row")].map((row) => {
    const select = row.querySelector(".fluid-type-select");
    let type = select.value;
    if (type === "__other__") {
      const otherInput = row.querySelector(".chip-other-input");
      type = otherInput && otherInput.value.trim() ? otherInput.value.trim() : "";
    }
    const rateRaw = row.querySelector(".fluid-rate-input").value;
    const rate = rateRaw === "" ? null : parseFloat(rateRaw);
    return { type, rate };
  }).filter((f) => f.type || f.rate != null);
}

// ===================== form collection =====================
function collectForm() {
  const weightKg = num("p-weight");
  const urineAmount = num("v-urine-amount");
  const uopHours = parseFloat(getFieldValue("v-urine-uop-hours") || "4");
  const uop = computeUop(urineAmount, weightKg, uopHours);

  return {
    name: val("p-name"),
    species: getFieldValue("p-species") || "dog",
    weightKg,
    vitals: {
      temp: num("v-temp"),
      tempUnit: getFieldValue("v-temp-unit") || "F",
      fecesPresence: getFieldValue("v-feces-presence"),
      fecesScore: getFieldValue("v-feces-score"),
      fecesColor: getFieldValue("v-feces-color"),
      vomitType: getFieldValue("v-vomit-type"),
      vomitCharacter: getFieldValue("v-vomit-character"),
      urinePresence: getFieldValue("v-urine-presence"),
      urineColor: getFieldValue("v-urine-color"),
      urineAmount,
      uop,
      uopClass: uop != null ? classifyUop(uop) : null,
      spo2: num("v-spo2"),
      fluids: collectFluids(),
      bp: val("v-bp"),
      feedState: getFieldValue("v-feed-state"),
      feedDiet: getFieldValue("v-feed-diet"),
      feedAmount: num("v-feed-amount"),
      feedUnit: getFieldValue("v-feed-unit") || "mL",
      feedScore: getFieldValue("v-feed-score")
    },
    exam: {
      mentation: getFieldValue("e-mentation"),
      mmColor: getFieldValue("e-mm-color"),
      mmTexture: getFieldValue("e-mm-texture"),
      crt: getFieldValue("e-crt"),
      hydration: getFieldValue("e-hydration"),
      heartSound: getFieldValue("e-heart-sound"),
      murmurGrade: getFieldValue("e-murmur-grade"),
      hr: num("e-hr"),
      hrRhythm: getFieldValue("e-hr-rhythm") || "regular",
      rr: num("e-rr"),
      pulse: getFieldValue("e-pulse"),
      lungSound: getFieldValue("e-lung-sound"),
      lungLocation: getFieldValue("e-lung-location"),
      breathPattern: getFieldValue("e-breath-pattern"),
      breathSound: getFieldValue("e-breath-sound"),
      cough: getFieldValue("e-cough"),
      coughType: getFieldValue("e-cough-type"),
      abdominal: getFieldValue("e-abd"),
      eyeOd: {
        menace: getFieldValue("e-eye-od-menace"),
        plr: getFieldValue("e-eye-od-plr"),
        pupil: getFieldValue("e-eye-od-pupil"),
        findings: getFieldValue("e-eye-od-findings"),
        fls: getFieldValue("e-eye-od-fls"),
        stt: num("e-eye-od-stt")
      },
      eyeOs: {
        menace: getFieldValue("e-eye-os-menace"),
        plr: getFieldValue("e-eye-os-plr"),
        pupil: getFieldValue("e-eye-os-pupil"),
        findings: getFieldValue("e-eye-os-findings"),
        fls: getFieldValue("e-eye-os-fls"),
        stt: num("e-eye-os-stt")
      },
      lame: getFieldValue("e-lame"),
      lameLimb: getFieldValue("e-lame-limb"),
      crepitus: getFieldValue("e-crepitus"),
      crepitusLimb: getFieldValue("e-crepitus-limb"),
      splint: getFieldValue("e-splint"),
      splintStatus: getFieldValue("e-splint-status"),
      proprioception: getFieldValue("e-proprioception"),
      proprioceptionLimb: getFieldValue("e-proprioception-limb"),
      patella: getFieldValue("e-patella"),
      patellaLimb: getFieldValue("e-patella-limb"),
      flexor: getFieldValue("e-flexor"),
      flexorLimb: getFieldValue("e-flexor-limb"),
      tailTone: getFieldValue("e-tail-tone"),
      perineal: getFieldValue("e-perineal"),
      bladder: getFieldValue("e-bladder"),
      panniculusStop: val("e-panniculus-stop"),
      superficialPain: getFieldValue("e-superficial-pain"),
      superficialPainLimb: getFieldValue("e-superficial-pain-limb"),
      deepPain: getFieldValue("e-deep-pain"),
      deepPainLimb: getFieldValue("e-deep-pain-limb"),
      headTurn: getFieldValue("e-head-turn"),
      headTilt: getFieldValue("e-head-tilt"),
      circling: getFieldValue("e-circling"),
      ataxia: getFieldValue("e-ataxia"),
      nystagmus: getFieldValue("e-nystagmus"),
      seizure: getFieldValue("e-seizure"),
      seizureType: getFieldValue("e-seizure-type"),
      seizureTime: val("e-seizure-time"),
      seizureDuration: num("e-seizure-duration"),
      occlusion: getFieldValue("e-occlusion"),
      maxillofacialFindings: getFieldValue("e-maxillofacial-findings"),
      woundLocation: val("e-wound-location"),
      woundChar: getFieldValue("e-wound-char"),
      woundDischarge: getFieldValue("e-wound-discharge"),
      surgicalSite: getFieldValue("e-surgical-site"),
      mgcs: num("e-mgcs"),
      painScore: getFieldValue("e-pain-score"),
      other: val("e-other")
    },
    labs: collectLabs(),
    tx: {
      rehydrationStart: val("t-rehydration-start"),
      rehydrationHours: num("t-rehydration-hours"),
      rehydrationRate: num("t-rehydration-rate"),
      resuscitationRate: num("t-resuscitation-rate"),
      resuscitationBolus: getFieldValue("t-resuscitation-bolus"),
      woundDressing: getFieldValue("t-wound-dressing"),
      checklist: getFieldValue("t-checklist"),
      icd: getFieldValue("t-icd"),
      icdSide: getFieldValue("t-icd-side"),
      icdFluid: getFieldValue("t-icd-fluid"),
      icdVolume: num("t-icd-volume"),
      thoraco: getFieldValue("t-thoraco"),
      thoracoSide: getFieldValue("t-thoraco-side"),
      thoracoFluid: getFieldValue("t-thoraco-fluid"),
      thoracoVolume: num("t-thoraco-volume"),
      abdomino: getFieldValue("t-abdomino"),
      abdominoFluid: getFieldValue("t-abdomino-fluid"),
      abdominoVolume: num("t-abdomino-volume"),
      cysto: getFieldValue("t-cysto"),
      cystoVolume: num("t-cysto-volume"),
      ga: getFieldValue("t-ga"),
      gaDrug: val("t-ga-drug"),
      otherProcedure: val("t-other-procedure")
    },
    supply: collectSupply(),
    dietOut: getFieldValue("s-diet-out")
  };
}

// ===================== concise clinical note builder =====================
function buildVitalsParts(v) {
  const parts = [];
  if (v.temp != null) parts.push(`T ${v.temp}°${v.tempUnit || "C"}`);

  if (v.fecesPresence === "yes") {
    let f = "Feces";
    if (v.fecesScore) f += ` ${v.fecesScore}/7`;
    if (fmtList(v.fecesColor)) f += ` (${fmtList(v.fecesColor)})`;
    parts.push(f);
  }

  if (v.vomitType && v.vomitType !== "none") {
    const label = v.vomitType === "both" ? "Vomit+Regurgitation"
      : v.vomitType === "vomit" ? "Vomit" : "Regurgitation";
    parts.push(fmtList(v.vomitCharacter) ? `${label} (${fmtList(v.vomitCharacter)})` : label);
  }

  if (v.urinePresence === "yes") {
    const bits = [];
    if (v.urineColor) bits.push(v.urineColor);
    if (v.urineAmount != null) bits.push(`${v.urineAmount} mL`);
    if (v.uop != null) bits.push(`UOP ${round(v.uop, 2)} mL/kg/h (${v.uopClass})`);
    parts.push(bits.length ? `Urine (${bits.join(", ")})` : "Urine");
  }

  if (v.spo2 != null) parts.push(`SpO2 ${v.spo2}%`);

  if (v.fluids && v.fluids.length) {
    parts.push(v.fluids.map((f) => `${f.type || "?"}${f.rate != null ? " @ " + f.rate + " mL/h" : ""}`).join(", "));
  }

  if (v.bp) parts.push(`BP ${v.bp}`);

  if (v.feedState && v.feedState !== "normal") {
    const labels = { "not eating": "ไม่กินอาหาร", npo: "NPO", "held for vomit": "งดป้อน (vomit)" };
    parts.push(`Feed: ${labels[v.feedState] || v.feedState}`);
  } else if (v.feedDiet || v.feedAmount != null || v.feedScore) {
    const bits = [];
    if (v.feedDiet) bits.push(v.feedDiet);
    if (v.feedAmount != null) bits.push(`${v.feedAmount} ${v.feedUnit}`);
    if (v.feedScore) bits.push(`${v.feedScore}/4 (self-eating)`);
    parts.push(`Feed ${bits.join(" ")}`);
  }

  return parts;
}

function buildPeParts(e) {
  const parts = [];
  if (e.mentation) parts.push(e.mentation);

  const mm = [];
  if (fmtList(e.mmColor)) mm.push(fmtList(e.mmColor));
  if (e.mmTexture) mm.push(e.mmTexture);
  if (mm.length) parts.push(`MM ${mm.join("/")}`);

  if (e.crt) parts.push(`CRT ${e.crt}`);
  if (e.hydration) parts.push(e.hydration === "normal" ? "Hydration normal" : `Hydration ${e.hydration}`);

  if (fmtList(e.heartSound)) {
    const hs = e.heartSound.map((s) => (s === "murmur" && e.murmurGrade) ? `murmur gr.${e.murmurGrade}/6` : s).join("/");
    parts.push(`Heart ${hs}`);
  }
  if (e.hr != null) parts.push(`HR ${e.hr} bpm ${e.hrRhythm}`);
  if (fmtList(e.pulse)) parts.push(`Pulse ${fmtList(e.pulse)}`);
  if (e.rr != null) parts.push(`RR ${e.rr} tpm`);

  if (fmtList(e.lungSound)) {
    let ls = fmtList(e.lungSound);
    if (e.lungLocation) ls += ` (${e.lungLocation})`;
    parts.push(`Lung ${ls}`);
  }
  if (fmtList(e.breathPattern)) parts.push(`Breathing ${fmtList(e.breathPattern)}`);
  if (e.breathSound && e.breathSound !== "no") parts.push(`Breath sound: ${e.breathSound}`);
  if (e.cough === "positive") parts.push(`Induced cough +${e.coughType ? " (" + e.coughType + ")" : ""}`);
  if (e.cough === "negative") parts.push("Induced cough -");
  if (fmtList(e.abdominal)) parts.push(`Abd: ${fmtList(e.abdominal)}`);
  if (e.mgcs != null) parts.push(`MGCS ${e.mgcs}/18`);
  if (e.painScore) parts.push(`Pain score ${e.painScore}/4`);

  return parts;
}

function fmtEye(eye) {
  const bits = [];
  if (eye.menace) bits.push(`menace ${eye.menace === "positive" ? "+" : "-"}`);
  if (fmtList(eye.plr)) bits.push(`PLR ${fmtList(eye.plr)}`);
  if (eye.pupil && eye.pupil !== "normal") bits.push(eye.pupil);
  if (fmtList(eye.findings)) bits.push(fmtList(eye.findings));
  if (eye.fls) bits.push(`FLS ${eye.fls === "positive" ? "+" : "-"}`);
  if (eye.stt != null) bits.push(`STT ${eye.stt} mm/min`);
  return bits.length ? bits.join(", ") : null;
}

function buildMaxillofacialParts(e) {
  const parts = [];
  if (e.occlusion) parts.push(e.occlusion === "normal" ? "Occlusion normal" : "Malocclusion");
  if (fmtList(e.maxillofacialFindings)) parts.push(fmtList(e.maxillofacialFindings));
  return parts;
}

function buildMskParts(e) {
  const parts = [];
  if (e.lame === "yes") parts.push(`Lame${fmtList(e.lameLimb) ? " " + fmtList(e.lameLimb) : ""}`);
  if (e.crepitus === "yes") parts.push(`Crepitus${fmtList(e.crepitusLimb) ? " " + fmtList(e.crepitusLimb) : ""}`);
  if (e.splint === "yes") parts.push(`Splint${fmtList(e.splintStatus) ? " (" + fmtList(e.splintStatus) + ")" : ""}`);
  return parts;
}

function buildNeuroParts(e) {
  const parts = [];
  if (e.proprioception) {
    parts.push(`Proprioception ${e.proprioception}${e.proprioception === "deficit" && fmtList(e.proprioceptionLimb) ? " " + fmtList(e.proprioceptionLimb) : ""}`);
  }
  if (e.patella && e.patella !== "normal") parts.push(`Patella ${e.patella}${fmtList(e.patellaLimb) ? " " + fmtList(e.patellaLimb) : ""}`);
  if (e.flexor && e.flexor !== "normal") parts.push(`Flexor ${e.flexor}${fmtList(e.flexorLimb) ? " " + fmtList(e.flexorLimb) : ""}`);
  if (e.tailTone) parts.push(`Tail tone ${e.tailTone === "positive" ? "+" : "-"}`);
  if (e.perineal) parts.push(`Perineal ${e.perineal === "positive" ? "+" : "-"}`);
  if (fmtList(e.bladder)) parts.push(fmtList(e.bladder));
  if (e.panniculusStop) parts.push(`Panniculus stop at ${e.panniculusStop}`);
  if (e.superficialPain) {
    const sign = e.superficialPain === "positive" ? "+" : "-";
    parts.push(`Superficial pain ${sign}${fmtList(e.superficialPainLimb) ? " " + fmtList(e.superficialPainLimb) : ""}`);
  }
  if (e.deepPain) {
    const sign = e.deepPain === "positive" ? "+" : "-";
    parts.push(`Deep pain ${sign}${fmtList(e.deepPainLimb) ? " " + fmtList(e.deepPainLimb) : ""}`);
  }
  if (e.headTurn) parts.push(`Head turn ${e.headTurn}`);
  if (e.headTilt) parts.push(`Head tilt ${e.headTilt}`);
  if (e.circling) parts.push(`Circling ${e.circling}`);
  if (e.ataxia === "positive") parts.push("Ataxia +");
  if (fmtList(e.nystagmus)) parts.push(`Nystagmus ${fmtList(e.nystagmus)}`);
  if (e.seizure === "yes") {
    const bits = [];
    if (e.seizureType) bits.push(e.seizureType);
    if (e.seizureTime) bits.push(`at ${e.seizureTime}`);
    if (e.seizureDuration != null) bits.push(`${e.seizureDuration} min`);
    parts.push(`Seizure${bits.length ? " (" + bits.join(", ") + ")" : ""}`);
  }
  return parts;
}

function buildWoundParts(e) {
  if (!fmtList(e.woundChar) && !e.woundLocation && !fmtList(e.surgicalSite)) return [];
  const bits = [];
  if (e.woundLocation) bits.push(e.woundLocation);
  if (fmtList(e.woundChar)) {
    let w = fmtList(e.woundChar);
    if (fmtList(e.woundDischarge)) w += ` (${fmtList(e.woundDischarge)})`;
    bits.push(w);
  }
  if (fmtList(e.surgicalSite)) bits.push(`Surgical site: ${fmtList(e.surgicalSite)}`);
  return bits.length ? [bits.join(" - ")] : [];
}

function buildTxParts(tx) {
  const parts = [];
  if (tx.rehydrationRate != null) {
    let s = `Rehydration ${tx.rehydrationRate} mL/h`;
    const bits = [];
    if (tx.rehydrationHours != null) bits.push(`${tx.rehydrationHours} h`);
    if (tx.rehydrationStart) bits.push(`from ${tx.rehydrationStart}`);
    if (bits.length) s += ` (${bits.join(", ")})`;
    parts.push(s);
  }
  if (tx.resuscitationRate != null) {
    let s = `Fluid resuscitation ${tx.resuscitationRate} mL/kg/15min`;
    if (tx.resuscitationBolus) s += ` (bolus ${tx.resuscitationBolus}/4)`;
    parts.push(s);
  }
  if (tx.woundDressing) parts.push(`Wound dressing: ${tx.woundDressing}`);
  if (fmtList(tx.checklist)) parts.push(fmtList(tx.checklist));

  if (tx.icd === "yes") {
    const bits = [];
    if (fmtList(tx.icdSide)) bits.push(fmtList(tx.icdSide));
    if (tx.icdFluid) bits.push(tx.icdFluid);
    if (tx.icdVolume != null) bits.push(`${tx.icdVolume} mL`);
    parts.push(`ICD suction${bits.length ? " (" + bits.join(", ") + ")" : ""}`);
  }
  if (tx.thoraco === "yes") {
    const bits = [];
    if (fmtList(tx.thoracoSide)) bits.push(fmtList(tx.thoracoSide));
    if (tx.thoracoFluid) bits.push(tx.thoracoFluid);
    if (tx.thoracoVolume != null) bits.push(`${tx.thoracoVolume} mL`);
    parts.push(`Thoracocentesis${bits.length ? " (" + bits.join(", ") + ")" : ""}`);
  }
  if (tx.abdomino === "yes") {
    const bits = [];
    if (tx.abdominoFluid) bits.push(tx.abdominoFluid);
    if (tx.abdominoVolume != null) bits.push(`${tx.abdominoVolume} mL`);
    parts.push(`Abdominocentesis${bits.length ? " (" + bits.join(", ") + ")" : ""}`);
  }
  if (tx.cysto === "yes") {
    parts.push(`Cystocentesis${tx.cystoVolume != null ? " (" + tx.cystoVolume + " mL)" : ""}`);
  }
  if (tx.ga === "yes") parts.push(`GA${tx.gaDrug ? " (" + tx.gaDrug + ")" : ""}`);
  if (tx.otherProcedure) parts.push(tx.otherProcedure);

  return parts;
}

// ===================== supply requisition =====================
function renderSupply() {
  renderCompactToggleGroup("supply-body", "supply-chips", "supply-detail-list", SUPPLY_ITEMS, {
    idPrefix: "s", inputSuffix: "qty", inputType: "number", placeholder: "จำนวน"
  });
}

function collectSupply() {
  const supply = {};
  SUPPLY_ITEMS.forEach((item) => {
    const chip = document.querySelector(`#supply-chips .chip[data-item-id="${item.id}"]`);
    supply[item.id + "Included"] = !!(chip && chip.classList.contains("active"));
    const input = $(`s-${item.id}-qty`);
    supply[item.id + "Qty"] = input && input.value !== "" ? parseFloat(input.value) : null;
  });
  return supply;
}

function buildSupplyParts(supply) {
  const parts = [];
  SUPPLY_ITEMS.forEach((item) => {
    if (supply[item.id + "Included"]) {
      const qty = supply[item.id + "Qty"];
      parts.push(qty != null ? `${item.label} x${qty}` : item.label);
    }
  });
  return parts;
}

function buildNoteText(record) {
  const lines = [];
  const headerBits = [];
  headerBits.push(record.name || "(ไม่ระบุชื่อ)");
  headerBits.push(speciesLabel(record.species));
  lines.push(`[${record.createdAtLocal || nowTimeLabel()}] ${headerBits.join(" - ")}`);

  const vitalsParts = buildVitalsParts(record.vitals);
  if (vitalsParts.length) lines.push(vitalsParts.join(" | "));

  const peParts = buildPeParts(record.exam);
  if (peParts.length) lines.push("PE: " + peParts.join(", "));

  const eyeOd = fmtEye(record.exam.eyeOd);
  const eyeOs = fmtEye(record.exam.eyeOs);
  if (eyeOd || eyeOs) {
    const bits = [];
    if (eyeOd) bits.push(`OD ${eyeOd}`);
    if (eyeOs) bits.push(`OS ${eyeOs}`);
    lines.push("Eye: " + bits.join("; "));
  }

  const maxillofacialParts = buildMaxillofacialParts(record.exam);
  if (maxillofacialParts.length) lines.push("Maxillofacial: " + maxillofacialParts.join(", "));

  const mskParts = buildMskParts(record.exam);
  if (mskParts.length) lines.push("MSK: " + mskParts.join(", "));

  const neuroParts = buildNeuroParts(record.exam);
  if (neuroParts.length) lines.push("Neuro: " + neuroParts.join(", "));

  const woundParts = buildWoundParts(record.exam);
  if (woundParts.length) lines.push("Wound: " + woundParts.join(", "));

  if (record.exam.other) lines.push("Other: " + record.exam.other);

  const labsParts = buildLabsLine(record.labs);
  if (labsParts.length) lines.push("Labs: " + labsParts.join(", "));

  const txParts = buildTxParts(record.tx);
  if (txParts.length) lines.push("Tx: " + txParts.join(", "));

  const supplyParts = buildSupplyParts(record.supply);
  if (supplyParts.length) lines.push("เบิกเวชภัณฑ์: " + supplyParts.join(", "));

  if (fmtList(record.dietOut)) lines.push("แจ้งอาหารหมด: " + fmtList(record.dietOut));

  return lines.join("\n");
}

function onFormChange() {
  updateReveals();
  updateUopDisplay();
  updateNotePreview();
}

function updateUopDisplay() {
  const el = $("v-urine-uop-display");
  const volumeMl = num("v-urine-amount");
  const weightKg = num("p-weight");
  const hours = parseFloat(getFieldValue("v-urine-uop-hours") || "4");
  const uop = computeUop(volumeMl, weightKg, hours);
  if (uop == null) {
    el.textContent = (volumeMl != null && !weightKg) ? "กรอกน้ำหนักตัวเพื่อคำนวณ UOP" : "";
    return;
  }
  el.textContent = `UOP = ${round(uop, 3)} mL/kg/h (${classifyUop(uop)})`;
}

function updateNotePreview() {
  const record = collectForm();
  record.createdAtLocal = nowTimeLabel();
  $("note-preview").textContent = buildNoteText(record);
}

// ===================== form reset =====================
function activateDefault(fieldId, value) {
  const group = document.querySelector(`[data-field="${fieldId}"]`);
  const chip = group && group.querySelector(`.chip[data-value="${value}"]`);
  if (chip) chip.classList.add("active");
}

function resetForm() {
  document.querySelectorAll("#screen-entry .chip.active").forEach((c) => c.classList.remove("active"));
  document.querySelectorAll("#screen-entry input[type=text], #screen-entry input[type=number], #screen-entry input[type=time], #screen-entry textarea")
    .forEach((i) => { i.value = ""; });
  document.querySelectorAll("#screen-entry .chip-other-input").forEach((i) => { i.hidden = true; });
  $("v-fluids-list").innerHTML = "";
  $("labs-list").innerHTML = "";
  $("supply-detail-list").innerHTML = "";
  $("v-urine-uop-display").textContent = "";

  activateDefault("p-species", "dog");
  activateDefault("v-temp-unit", "F");
  activateDefault("v-feces-presence", "none");
  activateDefault("v-vomit-type", "none");
  activateDefault("v-urine-presence", "none");
  activateDefault("v-urine-uop-hours", "4");
  activateDefault("v-feed-unit", "mL");
  activateDefault("e-hr-rhythm", "regular");
  activateDefault("e-lame", "none");
  activateDefault("e-crepitus", "none");
  activateDefault("e-splint", "none");
  activateDefault("e-seizure", "none");
  activateDefault("t-icd", "none");
  activateDefault("t-thoraco", "none");
  activateDefault("t-abdomino", "none");
  activateDefault("t-cysto", "none");
  activateDefault("t-ga", "none");

  document.querySelectorAll(".accordion").forEach((a, idx) => a.classList.toggle("open", idx === 0));
  updateReveals();
  updateNotePreview();
}

// ===================== record card list =====================
function renderList() {
  const listEl = $("card-list");
  const emptyEl = $("empty-state");
  const search = $("list-search-input").value.trim().toLowerCase();
  const filtered = todayRecords.filter((r) => {
    if (!search) return true;
    return (r.name || "").toLowerCase().includes(search);
  });
  $("list-count").textContent = `${filtered.length} รายการ`;
  listEl.querySelectorAll(".record-card").forEach((c) => c.remove());
  emptyEl.hidden = filtered.length > 0;

  filtered.forEach((r) => {
    const card = document.createElement("div");
    card.className = "record-card";
    card.innerHTML = `
      <div class="record-card-top">
        <div>
          <span class="record-card-id">${escapeHtml(r.name || "(ไม่ระบุชื่อ)")}</span>
        </div>
        <span class="record-card-time">${escapeHtml(r.createdAtLocal || "")}</span>
      </div>
      <div class="record-card-note">${escapeHtml(r.noteText || "")}</div>
      <div class="record-card-actions">
        <button type="button" class="danger-btn card-delete-btn">ลบรายการนี้</button>
      </div>
    `;
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-delete-btn")) return;
      card.classList.toggle("expanded");
    });
    card.querySelector(".card-delete-btn").addEventListener("click", () => {
      confirmAction(
        "ลบบันทึกนี้?",
        `ลบบันทึกของ "${r.name || "สัตว์ตัวนี้"}" เวลา ${r.createdAtLocal || ""} — กู้คืนไม่ได้`,
        () => deleteRecord(r.id)
      );
    });
    listEl.appendChild(card);
  });
}

// ===================== confirm modal =====================
function confirmAction(title, message, onConfirm) {
  const modal = $("confirm-modal");
  $("confirm-title").textContent = title;
  $("confirm-message").textContent = message;
  modal.hidden = false;
  const okBtn = $("confirm-ok-btn");
  const cancelBtn = $("confirm-cancel-btn");
  function cleanup() {
    modal.hidden = true;
    okBtn.removeEventListener("click", onOk);
    cancelBtn.removeEventListener("click", onCancel);
  }
  function onOk() { cleanup(); onConfirm(); }
  function onCancel() { cleanup(); }
  okBtn.addEventListener("click", onOk);
  cancelBtn.addEventListener("click", onCancel);
}

function showSaveSuccess(record, title, leadText, tailText) {
  const who = record.name || "สัตว์ตัวนี้";
  document.querySelector("#save-success-modal h2").textContent = title;
  $("save-success-message").textContent = `${leadText} "${who}" ${tailText}`;
  $("save-success-modal").hidden = false;
}

// ===================== Firestore adapter =====================
function subscribeToday() {
  $("today-date-label").textContent = todayLabel();
  const key = todayKey();
  // Equality-only query (no orderBy) so this never needs a Firestore composite index to
  // be created manually in the console — sort newest-first client-side instead, using the
  // human-readable time we already store (safe here since todayRecords is always one date).
  const q = query(
    collection(db, "vetjod_records"),
    where("dateKey", "==", key)
  );
  if (unsubscribeToday) unsubscribeToday();
  unsubscribeToday = onSnapshot(q, (snap) => {
    todayRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    todayRecords.sort((a, b) => (b.createdAtLocal || "").localeCompare(a.createdAtLocal || ""));
    renderList();
    showSyncBanner(null);
  }, (err) => {
    console.error("VETJOD snapshot error", err);
    showSyncBanner("เชื่อมต่อฐานข้อมูลไม่สำเร็จ — ตรวจสอบการตั้งค่า Firebase (ดู README.md)");
  });
}

async function saveRecord(record) {
  record.dateKey = todayKey();
  record.createdAt = serverTimestamp();
  await addDoc(collection(db, "vetjod_records"), record);
}

async function deleteRecord(id) {
  try {
    await deleteDoc(doc(db, "vetjod_records", id));
    showToast("ลบแล้ว");
  } catch (err) {
    console.error("VETJOD delete error", err);
    showToast("ลบไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ");
  }
}

async function deleteAllToday() {
  try {
    const batch = writeBatch(db);
    todayRecords.forEach((r) => batch.delete(doc(db, "vetjod_records", r.id)));
    await batch.commit();
    showToast("เริ่มบันทึกวันใหม่แล้ว");
  } catch (err) {
    console.error("VETJOD clear-day error", err);
    showToast("ลบไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ");
  }
}

// ===================== export =====================
function buildExportText() {
  const lines = [`VETJOD — สรุปบันทึกวันที่ ${todayLabel()}`, `จำนวน ${todayRecords.length} รายการ`, ""];
  [...todayRecords].reverse().forEach((r) => {
    lines.push(r.noteText || "");
    lines.push("");
  });
  return lines.join("\n").trim();
}

// ===================== navigation =====================
function goToList() {
  $("screen-entry").hidden = true;
  $("screen-list").hidden = false;
}

function goToNewEntry() {
  resetForm();
  $("entry-title").textContent = "บันทึกใหม่";
  $("screen-list").hidden = true;
  $("screen-entry").hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function unlockAndEnter() {
  $("screen-gate").hidden = true;
  $("screen-list").hidden = false;
  subscribeToday();
}

// ===================== passcode gate =====================
async function attemptUnlock() {
  const input = $("gate-passcode-input");
  const errorEl = $("gate-error");
  const statusEl = $("gate-status");
  errorEl.hidden = true;
  if (input.value !== TEAM_PASSCODE) {
    errorEl.textContent = "รหัสผ่านไม่ถูกต้อง";
    errorEl.hidden = false;
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = "กำลังเชื่อมต่อ...";
  try {
    await signInAnonymously(auth);
    // onAuthStateChanged fires next and calls unlockAndEnter()
  } catch (err) {
    console.error("VETJOD auth error", err);
    statusEl.hidden = true;
    errorEl.textContent = "เชื่อมต่อฐานข้อมูลไม่สำเร็จ — ตรวจสอบการตั้งค่า Firebase (ดู README.md)";
    errorEl.hidden = false;
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) unlockAndEnter();
});

// ===================== init =====================
function init() {
  renderLabsContainer();
  renderSupply();
  $("v-feed-diet-chips").innerHTML = chipsHtml(DIET_TYPES) + '<button type="button" class="chip" data-value="__other__">อื่นๆ</button>';
  $("e-lame-limb-chips").innerHTML = chipsHtml(LIMBS);
  $("e-crepitus-limb-chips").innerHTML = chipsHtml(LIMBS);
  $("e-deep-pain-limb-chips").innerHTML = chipsHtml(LIMBS);
  $("e-proprioception-limb-chips").innerHTML = chipsHtml(LIMBS);
  $("e-patella-limb-chips").innerHTML = chipsHtml(LIMBS);
  $("e-flexor-limb-chips").innerHTML = chipsHtml(LIMBS);
  $("e-superficial-pain-limb-chips").innerHTML = chipsHtml(LIMBS);
  $("e-eye-od-findings-chips").innerHTML = chipsHtml(EYE_FINDINGS);
  $("e-eye-os-findings-chips").innerHTML = chipsHtml(EYE_FINDINGS);
  $("e-splint-status-chips").innerHTML = chipsHtml(SPLINT_STATUS);
  $("t-wound-dressing-chips").innerHTML = chipsHtml(WOUND_DRESSING_PROTOCOLS);
  $("t-checklist-chips").innerHTML = chipsHtml(TX_CHECKLIST);
  $("t-icd-fluid-chips").innerHTML = chipsHtml(ICD_FLUID_TYPES);
  $("t-thoraco-fluid-chips").innerHTML = chipsHtml(CAVITY_FLUID_TYPES);
  $("t-abdomino-fluid-chips").innerHTML = chipsHtml(CAVITY_FLUID_TYPES);
  $("s-diet-out-chips").innerHTML = chipsHtml(DIET_TYPES);

  document.addEventListener("click", chipClickHandler);

  document.querySelectorAll('[data-field="v-temp-unit"] .chip').forEach((chip) => {
    chip.addEventListener("click", () => {
      const group = chip.closest('[data-field="v-temp-unit"]');
      const currentActive = group.querySelector(".chip.active");
      const oldUnit = currentActive ? currentActive.dataset.value : null;
      const newUnit = chip.dataset.value;
      if (oldUnit === newUnit) return;
      const tempInput = $("v-temp");
      if (tempInput.value === "") return;
      const n = parseFloat(tempInput.value);
      if (isNaN(n)) return;
      tempInput.value = round(newUnit === "F" ? (n * 9 / 5 + 32) : ((n - 32) * 5 / 9), 1);
    });
  });

  document.querySelectorAll("#screen-entry input, #screen-entry textarea").forEach((el) => {
    el.addEventListener("input", onFormChange);
  });

  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => header.closest(".accordion").classList.toggle("open"));
  });

  $("v-fluids-add-btn").addEventListener("click", addFluidRow);

  document.querySelectorAll(".jump-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.jumpTo);
      if (!target) return;
      if (target.classList.contains("accordion")) target.classList.add("open");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll(".jump-nav-btn").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  $("gate-submit-btn").addEventListener("click", attemptUnlock);
  $("gate-passcode-input").addEventListener("keydown", (e) => { if (e.key === "Enter") attemptUnlock(); });

  $("new-entry-fab").addEventListener("click", goToNewEntry);
  $("entry-back-btn").addEventListener("click", goToList);
  $("entry-cancel-btn").addEventListener("click", goToList);
  $("save-success-ok-btn").addEventListener("click", () => {
    $("save-success-modal").hidden = true;
    goToList();
  });

  $("entry-save-btn").addEventListener("click", async () => {
    const record = collectForm();
    if (!record.name) {
      showToast("กรุณากรอกชื่อสัตว์");
      return;
    }
    record.createdAtLocal = nowTimeLabel();
    record.noteText = buildNoteText(record);
    const saveBtn = $("entry-save-btn");
    saveBtn.disabled = true;
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000));
    try {
      await Promise.race([saveRecord(record), timeout]);
      showSaveSuccess(record, "✓ บันทึกสำเร็จ", "บันทึกข้อมูลของ", "เรียบร้อยแล้ว");
    } catch (err) {
      console.error("VETJOD save error", err);
      if (err.message === "timeout") {
        showSaveSuccess(record, "⏳ เชื่อมต่อช้า", "ข้อมูลของ", "ถูกบันทึกลงเครื่องแล้ว และจะขึ้น sync ขึ้นระบบกลางอัตโนมัติทันทีที่เชื่อมต่อได้ — ตรวจสอบรายการได้ที่หน้าแรก");
      } else {
        showToast("บันทึกไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วลองใหม่");
      }
    } finally {
      saveBtn.disabled = false;
    }
  });

  $("list-search-input").addEventListener("input", renderList);

  $("export-btn").addEventListener("click", () => {
    $("export-textarea").value = buildExportText();
    $("export-modal").hidden = false;
  });
  $("export-close-btn").addEventListener("click", () => { $("export-modal").hidden = true; });
  $("export-copy-btn").addEventListener("click", async () => {
    const text = $("export-textarea").value;
    try {
      await navigator.clipboard.writeText(text);
      showToast("คัดลอกแล้ว");
    } catch {
      const ta = $("export-textarea");
      ta.select();
      document.execCommand("copy");
      showToast("คัดลอกแล้ว");
    }
  });
  $("export-download-btn").addEventListener("click", () => {
    const blob = new Blob([$("export-textarea").value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vetjod_${todayKey()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $("new-day-btn").addEventListener("click", () => {
    confirmAction(
      "เริ่มบันทึกวันใหม่?",
      `ลบบันทึกทั้งหมดของวันนี้ (${todayRecords.length} รายการ) — กู้คืนไม่ได้`,
      deleteAllToday
    );
  });

  resetForm();
}

init();
