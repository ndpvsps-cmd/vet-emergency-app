import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager,
  collection, addDoc, updateDoc, deleteDoc, doc, query, where,
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
let editingRecordId = null;
let editingRecordCreatedAtLocal = null;
let editingSnapshot = null;

// ===================== small helpers =====================
function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Renders the plain-text note (unchanged — still exactly what gets saved/exported/copied)
// as HTML for on-screen display only, so each section's label (Vitals:, PE:, Tx:, ...)
// stands out from its values, and the [time] name - species line reads as the card title.
function noteTextToHtml(noteText) {
  return (noteText || "").split("\n").map((line, idx) => {
    if (idx === 0) return `<span class="note-header-line">${escapeHtml(line)}</span>`;
    if (line.startsWith("- ")) return `<span class="note-item">${escapeHtml(line)}</span>`;
    // label-only ("Tx:") or "label: content" — content half is optional so a bare
    // section header (followed by its own "- item" lines) still gets bolded
    const m = line.match(/^([^:]{1,24}):(\s(.*))?$/s);
    if (m) return `<span class="note-label">${escapeHtml(m[1])}:</span>${m[3] ? " " + escapeHtml(m[3]) : ""}`;
    return escapeHtml(line);
  }).join("<br>");
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

// Same deficit/maintenance formula as the main app's rehydration-calc.js, but with a
// maintenance rate fixed at weightKg * 2 mL/kg/h (not the selectable 2/2.5/3 there).
function computeRehydration(weightKg, dehydrationPercent, hours, ongoingLoss) {
  if (!weightKg || dehydrationPercent == null || isNaN(dehydrationPercent) || !hours) return null;
  const deficitMl = (dehydrationPercent / 100) * weightKg * 1000;
  const maintenanceMlPerHour = weightKg * 2;
  const ongoing = ongoingLoss || 0;
  // ongoing loss (eg from vomiting/diarrhea/drainage) keeps draining fluid whether or not
  // the dehydration deficit has been corrected yet, so it's added to both phases
  const phase1Rate = deficitMl / hours + maintenanceMlPerHour + ongoing;
  const phase2Rate = maintenanceMlPerHour + ongoing;
  return { deficitMl, maintenanceMlPerHour, ongoing, phase1Rate, phase2Rate };
}

// Fluid in (current IV rate) vs fluid out (insensible + sensible/UOP loss). "Balanced" is
// a judgment call, not an exact match — treat anything within 20% of fluid-out as roughly
// equal, per the same insensible-loss constant (0.7 mL/kg/h) the main app's maintenance
// calculator uses.
const INSENSIBLE_ML_PER_KG_H = 0.7;
const FLUID_BALANCE_TOLERANCE_PERCENT = 20;
function computeFluidBalance(weightKg, fluidInMlPerHour, uop) {
  if (!weightKg || fluidInMlPerHour == null || uop == null) return null;
  const insensible = weightKg * INSENSIBLE_ML_PER_KG_H;
  const sensible = weightKg * uop;
  const fluidOutMlPerHour = insensible + sensible;
  const diff = fluidInMlPerHour - fluidOutMlPerHour;
  const diffPercent = fluidOutMlPerHour ? (diff / fluidOutMlPerHour) * 100 : null;
  let status;
  let balanced = false;
  if (diffPercent == null) {
    status = "-";
  } else if (Math.abs(diffPercent) <= FLUID_BALANCE_TOLERANCE_PERCENT) {
    status = "Balanced (In ≈ Out)";
    balanced = true;
  } else if (diff > 0) {
    status = "Positive balance (In > Out)";
  } else {
    status = "Negative balance (In < Out)";
  }
  // suggested total rate to bring In back in line with Out — a starting point for the vet
  // to judge, not a replacement for clinical decision-making
  return { insensible, sensible, fluidOutMlPerHour, diff, status, balanced, suggestedRate: fluidOutMlPerHour };
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

// ===================== draft autosave (new entries only) =====================
// Protects against losing a half-filled form to an accidental close, a dropped
// connection, or getting called away mid-exam — never used while editing an existing
// record, since that data is already safely in Firestore regardless.
const DRAFT_STORAGE_KEY = "vetjod_draft_v1";

function saveDraft(record) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(record));
  } catch (e) { /* storage unavailable/full — losing the autosave safety net silently beats crashing */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch (e) { /* nothing to do */ }
}

// A name alone counts, but so does having filled in real clinical data without a name
// yet — checked via whether the generated note has more than just its header line.
function hasMeaningfulContent(record) {
  if (record.name && record.name.trim()) return true;
  return buildNoteText(record).split("\n").length > 1;
}

function autosaveDraftIfNeeded() {
  if (editingRecordId) return;
  const record = collectForm();
  if (hasMeaningfulContent(record)) saveDraft(record);
}

// ===================== collapsed-section "has data" badges =====================
function updateAccordionBadges() {
  document.querySelectorAll("#screen-entry .accordion-body .accordion").forEach((acc) => {
    const hasData = !!acc.querySelector(".chip.active")
      || [...acc.querySelectorAll("input, textarea")].some((el) => el.value !== "");
    acc.classList.toggle("has-data", hasData);
  });
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
// syncRows closures are registered here so code outside this function (e.g. populating
// the form when editing a saved record) can refresh the detail rows after programmatically
// activating chips, without duplicating the row-rebuild logic.
const compactToggleSync = {};

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
    if (inputType === "number") {
      list.querySelectorAll("input").forEach((input) => attachValueSlider(input, 1, 20));
    }
  }
  compactToggleSync[chipsId] = syncRows;

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

// Only Glucose gets a time stamp per entry (it's the one commonly checked several times
// a shift) — other lab types just get a single value, no time clutter.
function updateLabsRowTimeVisibility(row) {
  const isGlucose = row.querySelector(".labs-type-select").value === "glucose";
  const timeInput = row.querySelector(".labs-time-input");
  timeInput.hidden = !isGlucose;
  if (!isGlucose) {
    timeInput.value = "";
  } else if (!timeInput.value) {
    timeInput.value = new Date().toTimeString().slice(0, 5);
  }
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
      <input type="time" class="labs-time-input" value="${nowTime}" hidden>
      <input type="text" class="labs-value-input" placeholder="ค่า/ผล">
      <button type="button" class="labs-remove-btn" aria-label="ลบ">✕</button>
    </div>
  `;
  row.querySelector(".labs-type-select").addEventListener("change", () => updateLabsRowTimeVisibility(row));
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

// ===================== fluids (compact chips + per-item rate) =====================
function renderFluidsContainer() {
  $("v-fluids-body").innerHTML = `
    <div class="chips" id="fluids-chips"></div>
    <div id="fluids-detail-list" class="detail-row-list"></div>
  `;
  $("fluids-chips").innerHTML = FLUID_TYPES.map((f) => `<button type="button" class="chip" data-item-id="${f}">${f}</button>`).join("")
    + `<button type="button" class="chip" data-item-id="__other__">อื่นๆ (พิมพ์เอง)</button>`;

  document.querySelectorAll("#fluids-chips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      syncFluidsRows();
      onFormChange();
    });
  });
}

function syncFluidsRows() {
  const activeIds = [...document.querySelectorAll("#fluids-chips .chip.active")].map((c) => c.dataset.itemId);
  const list = $("fluids-detail-list");
  const existing = {};
  list.querySelectorAll(".detail-row").forEach((row) => {
    existing[row.dataset.itemId] = {
      rate: row.querySelector(".fluid-rate-input").value,
      other: row.querySelector(".fluid-other-name") ? row.querySelector(".fluid-other-name").value : ""
    };
  });
  list.innerHTML = activeIds.map((id) => {
    const prev = existing[id] || { rate: "", other: "" };
    if (id === "__other__") {
      return `<div class="detail-row" data-item-id="__other__">
        <input type="text" class="fluid-other-name" placeholder="ระบุชนิดสารน้ำ" value="${escapeHtml(prev.other)}">
        <input type="number" class="fluid-rate-input" placeholder="mL/h" value="${escapeHtml(prev.rate)}">
      </div>`;
    }
    return `<div class="detail-row" data-item-id="${id}">
      <span>${id}</span>
      <input type="number" class="fluid-rate-input" placeholder="mL/h" value="${escapeHtml(prev.rate)}">
    </div>`;
  }).join("");
  list.querySelectorAll("input").forEach((input) => input.addEventListener("input", onFormChange));
  list.querySelectorAll(".fluid-rate-input").forEach((input) => attachValueSlider(input, 0, 200));
}

function collectFluids() {
  return [...document.querySelectorAll("#fluids-detail-list .detail-row")].map((row) => {
    let type = row.dataset.itemId;
    if (type === "__other__") {
      const otherInput = row.querySelector(".fluid-other-name");
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
  const fluidsList = collectFluids();
  const fluidInRate = fluidsList.reduce((sum, f) => sum + (f.rate || 0), 0) || null;
  const fluidBalance = computeFluidBalance(weightKg, fluidInRate, uop);
  const dehydrationPercent = num("t-dehydration-percent");
  const rehydrationHoursVal = getFieldValue("t-rehydration-hours");
  const ongoingLoss = num("t-ongoing-loss");
  const rehydrationCalc = computeRehydration(weightKg, dehydrationPercent, parseFloat(rehydrationHoursVal || ""), ongoingLoss);

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
      uopHours: getFieldValue("v-urine-uop-hours") || "4",
      uop,
      uopClass: uop != null ? classifyUop(uop) : null,
      spo2: num("v-spo2"),
      fluids: fluidsList,
      fluidInRate,
      fluidBalance,
      bp: val("v-bp"),
      feedState: getFieldValue("v-feed-state"),
      feedDiet: getFieldValue("v-feed-diet"),
      feedAmount: num("v-feed-amount"),
      feedUnit: getFieldValue("v-feed-unit") || "mL",
      feedScore: getFieldValue("v-feed-score")
    },
    exam: {
      mentation: getFieldValue("e-mentation"),
      behavior: getFieldValue("e-behavior"),
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
      integument: getFieldValue("e-integument"),
      alopeciaSite: val("e-alopecia-site"),
      otitisSide: getFieldValue("e-otitis-side"),
      woundLocation: val("e-wound-location"),
      woundChar: getFieldValue("e-wound-char"),
      woundDischarge: getFieldValue("e-wound-discharge"),
      surgicalSite: getFieldValue("e-surgical-site"),
      otherFindings: getFieldValue("e-other-findings"),
      mgcs: num("e-mgcs"),
      painScore: getFieldValue("e-pain-score"),
      other: val("e-other")
    },
    labs: collectLabs(),
    tx: {
      rehydrationStart: val("t-rehydration-start"),
      dehydrationPercent,
      rehydrationHours: rehydrationHoursVal,
      ongoingLoss,
      rehydrationRate: num("t-rehydration-rate"),
      maintenanceRate: rehydrationCalc ? round(rehydrationCalc.phase2Rate, 1) : null,
      resuscitationRate: num("t-resuscitation-rate"),
      resuscitationBolus: getFieldValue("t-resuscitation-bolus"),
      o2: getFieldValue("t-o2"),
      o2Detail: val("t-o2-detail"),
      woundDressing: getFieldValue("t-wound-dressing"),
      checklist: getFieldValue("t-checklist"),
      other: val("t-other"),
      icd: getFieldValue("t-icd"),
      icdLeftFluid: getFieldValue("t-icd-left-fluid"),
      icdLeftVolume: num("t-icd-left-volume"),
      icdRightFluid: getFieldValue("t-icd-right-fluid"),
      icdRightVolume: num("t-icd-right-volume"),
      thoraco: getFieldValue("t-thoraco"),
      thoracoLeftFluid: getFieldValue("t-thoraco-left-fluid"),
      thoracoLeftVolume: num("t-thoraco-left-volume"),
      thoracoRightFluid: getFieldValue("t-thoraco-right-fluid"),
      thoracoRightVolume: num("t-thoraco-right-volume"),
      abdomino: getFieldValue("t-abdomino"),
      abdominoFluid: getFieldValue("t-abdomino-fluid"),
      abdominoVolume: num("t-abdomino-volume"),
      cysto: getFieldValue("t-cysto"),
      cystoVolume: num("t-cysto-volume"),
      ga: getFieldValue("t-ga"),
      gaDrug: val("t-ga-drug"),
      otherProcedure: val("t-other-procedure")
    },
    caseStatus: getFieldValue("t-case-status"),
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

  if (v.fluidBalance) {
    let s = `Fluid In ${round(v.fluidInRate, 1)} vs Out ${round(v.fluidBalance.fluidOutMlPerHour, 1)} mL/h (${v.fluidBalance.status})`;
    if (!v.fluidBalance.balanced) s += ` — suggest adjusting total rate to ~${round(v.fluidBalance.suggestedRate, 1)} mL/h`;
    parts.push(s);
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
  if (fmtList(e.behavior)) parts.push(fmtList(e.behavior));

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
  if (fmtList(e.otherFindings)) parts.push(`Other: ${fmtList(e.otherFindings)}`);
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

function buildIntegumentParts(e) {
  const parts = [];
  if (fmtList(e.integument)) {
    let s = fmtList(e.integument);
    const bits = [];
    if (e.alopeciaSite) bits.push(`alopecia site: ${e.alopeciaSite}`);
    if (fmtList(e.otitisSide)) bits.push(`otitis ${fmtList(e.otitisSide)}`);
    if (bits.length) s += ` (${bits.join(", ")})`;
    parts.push(s);
  }
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

function fmtProcedureSide(label, fluid, volume) {
  const bits = [];
  if (fluid) bits.push(fluid);
  if (volume != null) bits.push(`${volume} mL`);
  return bits.length ? `${label}: ${bits.join(", ")}` : null;
}

function buildTxParts(tx) {
  const parts = [];
  if (tx.rehydrationRate != null) {
    let s = `Rehydration ${tx.rehydrationRate} mL/h`;
    const bits = [];
    if (tx.dehydrationPercent != null) bits.push(`${tx.dehydrationPercent}% dehydration`);
    if (tx.rehydrationHours) bits.push(`${tx.rehydrationHours} h`);
    if (tx.rehydrationStart) bits.push(`from ${tx.rehydrationStart}`);
    if (tx.ongoingLoss) bits.push(`ongoing loss ${tx.ongoingLoss} mL/h`);
    if (bits.length) s += ` (${bits.join(", ")})`;
    parts.push(s);
    if (tx.maintenanceRate != null) parts.push(`Maintenance after rehydration ${tx.maintenanceRate} mL/h`);
  }
  if (tx.resuscitationRate != null) {
    let s = `Fluid resuscitation ${tx.resuscitationRate} mL/kg/15min`;
    if (tx.resuscitationBolus) s += ` (bolus ${tx.resuscitationBolus}/4)`;
    parts.push(s);
  }
  if (tx.o2 === "yes") parts.push(`O2${tx.o2Detail ? " (" + tx.o2Detail + ")" : ""}`);
  if (tx.woundDressing) parts.push(`Wound dressing: ${tx.woundDressing}`);
  if (fmtList(tx.checklist)) parts.push(fmtList(tx.checklist));
  if (tx.other) parts.push(tx.other);

  if (tx.icd === "yes") {
    const sides = [
      fmtProcedureSide("Left", tx.icdLeftFluid, tx.icdLeftVolume),
      fmtProcedureSide("Right", tx.icdRightFluid, tx.icdRightVolume)
    ].filter(Boolean);
    parts.push(`ICD suction${sides.length ? " (" + sides.join("; ") + ")" : ""}`);
  }
  if (tx.thoraco === "yes") {
    const sides = [
      fmtProcedureSide("Left", tx.thoracoLeftFluid, tx.thoracoLeftVolume),
      fmtProcedureSide("Right", tx.thoracoRightFluid, tx.thoracoRightVolume)
    ].filter(Boolean);
    parts.push(`Thoracocentesis${sides.length ? " (" + sides.join("; ") + ")" : ""}`);
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
  if (vitalsParts.length) lines.push("Vitals: " + vitalsParts.join(" | "));

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

  const integumentParts = buildIntegumentParts(record.exam);
  if (integumentParts.length) lines.push("Integument: " + integumentParts.join(", "));

  const mskParts = buildMskParts(record.exam);
  if (mskParts.length) lines.push("MSK: " + mskParts.join(", "));

  const neuroParts = buildNeuroParts(record.exam);
  if (neuroParts.length) lines.push("Neuro: " + neuroParts.join(", "));

  const woundParts = buildWoundParts(record.exam);
  if (woundParts.length) lines.push("Wound: " + woundParts.join(", "));

  if (record.exam.other) lines.push("Other: " + record.exam.other);

  const labsParts = buildLabsLine(record.labs);
  if (labsParts.length) {
    lines.push("Labs:");
    labsParts.forEach((p) => lines.push("- " + p));
  }

  const txParts = buildTxParts(record.tx);
  if (txParts.length) {
    lines.push("Tx:");
    txParts.forEach((p) => lines.push("- " + p));
  }

  if (fmtList(record.caseStatus)) lines.push("Note: " + fmtList(record.caseStatus));

  const supplyParts = buildSupplyParts(record.supply);
  if (supplyParts.length) lines.push("เบิกเวชภัณฑ์: " + supplyParts.join(", "));

  if (fmtList(record.dietOut)) lines.push("แจ้งอาหารหมด: " + fmtList(record.dietOut));

  return lines.join("\n");
}

function onFormChange() {
  updateReveals();
  updateUopDisplay();
  updateFluidBalanceDisplay();
  updateRehydrationCalc();
  updateAccordionBadges();
  updateNotePreview();
  autosaveDraftIfNeeded();
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

// Value sliders (weight, temp) are a second input bound to the same underlying number
// field — either one can drive the value, so both directions need to stay in sync.
function syncInputFromSlider(sliderId, inputId) {
  const slider = $(sliderId);
  const input = $(inputId);
  input.value = round(parseFloat(slider.value), 1);
}

function syncSliderFromInput(sliderId, inputId) {
  const slider = $(sliderId);
  const input = $(inputId);
  const val = parseFloat(input.value);
  if (isNaN(val)) return;
  const clamped = Math.min(Math.max(val, parseFloat(slider.min)), parseFloat(slider.max));
  slider.value = clamped;
}

function updateTempSliderRange(unit) {
  const slider = $("v-temp-slider");
  if (unit === "F") {
    slider.min = 90;
    slider.max = 107;
  } else {
    slider.min = 32;
    slider.max = 42;
  }
}

// Generic version of the weight/temp slider pairing, for every other plain integer
// numeric field. Works by element reference (not id) so it also covers inputs inside
// repeatable rows (fluids, supply) that get recreated on every add/remove. Each attached
// slider registers a "resync from its input" function so populateForm()/resetForm() can
// bring every slider in the form back in line with its field in one call, even ones set
// programmatically (which don't fire an "input" event on their own).
const sliderSyncFns = [];
function attachValueSlider(numberInput, min, max) {
  if (!numberInput || numberInput.dataset.sliderAttached) return;
  numberInput.dataset.sliderAttached = "1";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "value-slider";
  slider.min = min;
  slider.max = max;
  slider.step = 1;
  slider.value = numberInput.value !== "" ? numberInput.value : min;

  const syncFromInput = () => {
    const val = parseFloat(numberInput.value);
    if (!isNaN(val)) slider.value = Math.min(Math.max(val, min), max);
  };
  slider.addEventListener("input", () => {
    numberInput.value = Math.round(parseFloat(slider.value));
    numberInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  numberInput.addEventListener("input", syncFromInput);
  sliderSyncFns.push(syncFromInput);

  const container = numberInput.closest(".number-input-row") || numberInput.closest(".detail-row")
    || numberInput.closest(".field-row") || numberInput.parentElement;
  container.insertAdjacentElement("afterend", slider);
}

function syncAllValueSliders() {
  sliderSyncFns.forEach((fn) => fn());
}

// Static numeric fields that get a slider added once at init(); ranges are a clinically
// reasonable span for each, not hard limits — typing a value outside the slider's range
// still works, the slider just won't reflect it exactly.
const STATIC_SLIDER_FIELDS = [
  ["v-urine-amount", 0, 300],
  ["v-spo2", 0, 100],
  ["v-feed-amount", 0, 500],
  ["e-hr", 40, 300],
  ["e-rr", 0, 100],
  ["e-eye-od-stt", 0, 30],
  ["e-eye-os-stt", 0, 30],
  ["e-mgcs", 1, 18],
  ["e-seizure-duration", 0, 60],
  ["t-dehydration-percent", 0, 15],
  ["t-ongoing-loss", 0, 100],
  ["t-rehydration-rate", 0, 200],
  ["t-resuscitation-rate", 0, 30],
  ["t-icd-left-volume", 0, 500],
  ["t-icd-right-volume", 0, 500],
  ["t-thoraco-left-volume", 0, 500],
  ["t-thoraco-right-volume", 0, 500],
  ["t-abdomino-volume", 0, 1000],
  ["t-cysto-volume", 0, 50]
];

function updateFluidBalanceDisplay() {
  const el = $("v-fluid-balance-display");
  const weightKg = num("p-weight");
  const volumeMl = num("v-urine-amount");
  const hours = parseFloat(getFieldValue("v-urine-uop-hours") || "4");
  const uop = computeUop(volumeMl, weightKg, hours);
  const fluidInRate = collectFluids().reduce((sum, f) => sum + (f.rate || 0), 0) || null;
  const balance = computeFluidBalance(weightKg, fluidInRate, uop);
  if (!balance) {
    el.textContent = "";
    return;
  }
  let text = `Fluid In ${round(fluidInRate, 1)} vs Out ${round(balance.fluidOutMlPerHour, 1)} mL/h (${balance.status})`;
  if (!balance.balanced) {
    text += ` — แนะนำปรับอัตรารวมเป็นประมาณ ${round(balance.suggestedRate, 1)} mL/h`;
  }
  el.textContent = text;
}

// Tracks the last value we auto-filled so a manual edit to the rate field (which also
// flows through onFormChange) doesn't get silently clobbered on the next recompute —
// only overwrite while the field still matches what we last computed (or is empty).
let lastAutoRehydrationRate = null;
function updateRehydrationCalc() {
  const el = $("t-rehydration-calc-display");
  const weightKg = num("p-weight");
  const percent = num("t-dehydration-percent");
  const hours = parseFloat(getFieldValue("t-rehydration-hours") || "");
  const ongoingLoss = num("t-ongoing-loss");
  const calc = computeRehydration(weightKg, percent, hours, ongoingLoss);
  if (!calc) {
    el.textContent = !weightKg ? "กรอกน้ำหนักตัวในหน้าแรก เพื่อคำนวณ" : (percent == null ? "กรอก % ขาดน้ำ เพื่อคำนวณ" : "");
    return;
  }
  const ongoingNote = calc.ongoing ? ` (รวม ongoing loss ${calc.ongoing} mL/h)` : "";
  el.textContent = `Deficit ${round(calc.deficitMl, 1)} mL → ช่วงแก้ไข (${hours} ชม.) ${round(calc.phase1Rate, 1)} mL/h → หลังจากนั้น (Maintenance) ${round(calc.phase2Rate, 1)} mL/h${ongoingNote}`;
  const rateInput = $("t-rehydration-rate");
  const computed = round(calc.phase1Rate, 1);
  const currentVal = rateInput.value === "" ? null : parseFloat(rateInput.value);
  if (currentVal === null || currentVal === lastAutoRehydrationRate) {
    rateInput.value = computed;
  }
  lastAutoRehydrationRate = computed;
}

function updateNotePreview() {
  const record = collectForm();
  record.createdAtLocal = nowTimeLabel();
  $("note-preview").innerHTML = noteTextToHtml(buildNoteText(record));
}

// ===================== form reset =====================
function activateDefault(fieldId, value) {
  const group = document.querySelector(`[data-field="${fieldId}"]`);
  const chip = group && group.querySelector(`.chip[data-value="${value}"]`);
  if (chip) chip.classList.add("active");
}

function resetForm() {
  closeJumpNav();
  document.querySelectorAll("#screen-entry .chip.active").forEach((c) => c.classList.remove("active"));
  document.querySelectorAll("#screen-entry input[type=text], #screen-entry input[type=number], #screen-entry input[type=time], #screen-entry textarea")
    .forEach((i) => { i.value = ""; });
  document.querySelectorAll("#screen-entry .chip-other-input").forEach((i) => { i.hidden = true; });
  $("fluids-detail-list").innerHTML = "";
  $("labs-list").innerHTML = "";
  $("supply-detail-list").innerHTML = "";
  $("v-urine-uop-display").textContent = "";
  $("v-fluid-balance-display").textContent = "";
  $("t-rehydration-calc-display").textContent = "";
  lastAutoRehydrationRate = null;

  document.querySelectorAll("#screen-entry .value-slider").forEach((s) => { s.value = s.min; });

  activateDefault("p-species", "dog");
  activateDefault("v-temp-unit", "F");
  updateTempSliderRange("F");
  $("p-weight-slider").value = 0;
  $("v-temp-slider").value = 101.5;
  activateDefault("v-feces-presence", "none");
  activateDefault("v-vomit-type", "none");
  activateDefault("v-urine-presence", "none");
  activateDefault("v-urine-uop-hours", "4");
  activateDefault("t-rehydration-hours", "8");
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
  activateDefault("t-o2", "none");

  document.querySelectorAll(".accordion").forEach((a, idx) => a.classList.toggle("open", idx === 0));
  updateReveals();
  updateAccordionBadges();
  updateNotePreview();
}

// ===================== form populate (editing a saved record) =====================
// Mirrors collectForm() field-for-field, in reverse: given a stored record, drive the
// same chip/input elements collectForm() reads from, so editing reuses every existing
// input handler, reveal-block, and calculation instead of a parallel rendering path.
function setChipFieldValue(fieldId, value) {
  const group = document.querySelector(`[data-field="${fieldId}"]`);
  if (!group) return;
  const chipsContainer = group.querySelector(".chips") || group;
  const values = Array.isArray(value) ? value.filter(Boolean) : (value != null && value !== "" ? [value] : []);
  const otherChip = group.querySelector('.chip[data-value="__other__"]');
  const otherInput = group.querySelector(".chip-other-input");
  chipsContainer.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  let usedOther = false;
  values.forEach((v) => {
    const chip = [...chipsContainer.querySelectorAll(".chip")].find((c) => c.dataset.value === String(v));
    if (chip) {
      chip.classList.add("active");
    } else if (otherChip) {
      otherChip.classList.add("active");
      if (otherInput) otherInput.value = v;
      usedOther = true;
    }
  });
  if (otherInput) otherInput.hidden = !usedOther;
}

function setInputValue(id, value) {
  const el = $(id);
  if (el) el.value = value != null ? value : "";
}

function populateFluids(fluids) {
  document.querySelectorAll("#fluids-chips .chip").forEach((c) => c.classList.remove("active"));
  (fluids || []).forEach((f) => {
    const predefined = [...document.querySelectorAll("#fluids-chips .chip")].find((c) => c.dataset.itemId === f.type);
    const target = predefined || document.querySelector('#fluids-chips .chip[data-item-id="__other__"]');
    if (target) target.classList.add("active");
  });
  syncFluidsRows();
  (fluids || []).forEach((f) => {
    const predefined = [...document.querySelectorAll("#fluids-chips .chip")].find((c) => c.dataset.itemId === f.type);
    const rowId = predefined ? f.type : "__other__";
    const row = document.querySelector(`#fluids-detail-list .detail-row[data-item-id="${CSS.escape(rowId)}"]`);
    if (!row) return;
    const rateInput = row.querySelector(".fluid-rate-input");
    if (rateInput && f.rate != null) rateInput.value = f.rate;
    const otherInput = row.querySelector(".fluid-other-name");
    if (otherInput && !predefined) otherInput.value = f.type;
  });
}

function populateLabs(labs) {
  $("labs-list").innerHTML = "";
  (labs || []).forEach((l) => {
    addLabsRow();
    const row = $("labs-list").lastElementChild;
    row.querySelector(".labs-type-select").value = l.type;
    updateLabsRowTimeVisibility(row);
    row.querySelector(".labs-time-input").value = l.time || "";
    row.querySelector(".labs-value-input").value = l.value || "";
  });
}

function populateSupply(supply) {
  supply = supply || {};
  document.querySelectorAll("#supply-chips .chip").forEach((c) => c.classList.remove("active"));
  SUPPLY_ITEMS.forEach((item) => {
    if (supply[item.id + "Included"]) {
      const chip = document.querySelector(`#supply-chips .chip[data-item-id="${item.id}"]`);
      if (chip) chip.classList.add("active");
    }
  });
  if (compactToggleSync["supply-chips"]) compactToggleSync["supply-chips"]();
  SUPPLY_ITEMS.forEach((item) => {
    if (supply[item.id + "Included"] && supply[item.id + "Qty"] != null) {
      const input = $(`s-${item.id}-qty`);
      if (input) input.value = supply[item.id + "Qty"];
    }
  });
}

function populateForm(record) {
  const v = record.vitals || {};
  const e = record.exam || {};
  const od = e.eyeOd || {};
  const os = e.eyeOs || {};
  const tx = record.tx || {};

  setInputValue("p-name", record.name);
  setChipFieldValue("p-species", record.species);
  setInputValue("p-weight", record.weightKg);
  syncSliderFromInput("p-weight-slider", "p-weight");

  setInputValue("v-temp", v.temp);
  setChipFieldValue("v-temp-unit", v.tempUnit || "F");
  updateTempSliderRange(v.tempUnit || "F");
  syncSliderFromInput("v-temp-slider", "v-temp");
  setChipFieldValue("v-feces-presence", v.fecesPresence);
  setChipFieldValue("v-feces-score", v.fecesScore);
  setChipFieldValue("v-feces-color", v.fecesColor);
  setChipFieldValue("v-vomit-type", v.vomitType);
  setChipFieldValue("v-vomit-character", v.vomitCharacter);
  setChipFieldValue("v-urine-presence", v.urinePresence);
  setChipFieldValue("v-urine-color", v.urineColor);
  setInputValue("v-urine-amount", v.urineAmount);
  setChipFieldValue("v-urine-uop-hours", v.uopHours || "4");
  setInputValue("v-spo2", v.spo2);
  populateFluids(v.fluids);
  setInputValue("v-bp", v.bp);
  setChipFieldValue("v-feed-state", v.feedState);
  setChipFieldValue("v-feed-diet", v.feedDiet);
  setInputValue("v-feed-amount", v.feedAmount);
  setChipFieldValue("v-feed-unit", v.feedUnit || "mL");
  setChipFieldValue("v-feed-score", v.feedScore);

  setChipFieldValue("e-mentation", e.mentation);
  setChipFieldValue("e-behavior", e.behavior);
  setChipFieldValue("e-mm-color", e.mmColor);
  setChipFieldValue("e-mm-texture", e.mmTexture);
  setChipFieldValue("e-crt", e.crt);
  setChipFieldValue("e-hydration", e.hydration);
  setChipFieldValue("e-heart-sound", e.heartSound);
  setChipFieldValue("e-murmur-grade", e.murmurGrade);
  setInputValue("e-hr", e.hr);
  setChipFieldValue("e-hr-rhythm", e.hrRhythm || "regular");
  setInputValue("e-rr", e.rr);
  setChipFieldValue("e-pulse", e.pulse);
  setChipFieldValue("e-lung-sound", e.lungSound);
  setChipFieldValue("e-lung-location", e.lungLocation);
  setChipFieldValue("e-breath-pattern", e.breathPattern);
  setChipFieldValue("e-breath-sound", e.breathSound);
  setChipFieldValue("e-cough", e.cough);
  setChipFieldValue("e-cough-type", e.coughType);
  setChipFieldValue("e-abd", e.abdominal);

  setChipFieldValue("e-eye-od-menace", od.menace);
  setChipFieldValue("e-eye-od-plr", od.plr);
  setChipFieldValue("e-eye-od-pupil", od.pupil);
  setChipFieldValue("e-eye-od-findings", od.findings);
  setChipFieldValue("e-eye-od-fls", od.fls);
  setInputValue("e-eye-od-stt", od.stt);
  setChipFieldValue("e-eye-os-menace", os.menace);
  setChipFieldValue("e-eye-os-plr", os.plr);
  setChipFieldValue("e-eye-os-pupil", os.pupil);
  setChipFieldValue("e-eye-os-findings", os.findings);
  setChipFieldValue("e-eye-os-fls", os.fls);
  setInputValue("e-eye-os-stt", os.stt);

  setChipFieldValue("e-lame", e.lame);
  setChipFieldValue("e-lame-limb", e.lameLimb);
  setChipFieldValue("e-crepitus", e.crepitus);
  setChipFieldValue("e-crepitus-limb", e.crepitusLimb);
  setChipFieldValue("e-splint", e.splint);
  setChipFieldValue("e-splint-status", e.splintStatus);

  setChipFieldValue("e-proprioception", e.proprioception);
  setChipFieldValue("e-proprioception-limb", e.proprioceptionLimb);
  setChipFieldValue("e-patella", e.patella);
  setChipFieldValue("e-patella-limb", e.patellaLimb);
  setChipFieldValue("e-flexor", e.flexor);
  setChipFieldValue("e-flexor-limb", e.flexorLimb);
  setChipFieldValue("e-tail-tone", e.tailTone);
  setChipFieldValue("e-perineal", e.perineal);
  setChipFieldValue("e-bladder", e.bladder);
  setInputValue("e-panniculus-stop", e.panniculusStop);
  setChipFieldValue("e-superficial-pain", e.superficialPain);
  setChipFieldValue("e-superficial-pain-limb", e.superficialPainLimb);
  setChipFieldValue("e-deep-pain", e.deepPain);
  setChipFieldValue("e-deep-pain-limb", e.deepPainLimb);

  setChipFieldValue("e-head-turn", e.headTurn);
  setChipFieldValue("e-head-tilt", e.headTilt);
  setChipFieldValue("e-circling", e.circling);
  setChipFieldValue("e-ataxia", e.ataxia);
  setChipFieldValue("e-nystagmus", e.nystagmus);
  setChipFieldValue("e-seizure", e.seizure);
  setChipFieldValue("e-seizure-type", e.seizureType);
  setInputValue("e-seizure-time", e.seizureTime);
  setInputValue("e-seizure-duration", e.seizureDuration);

  setChipFieldValue("e-occlusion", e.occlusion);
  setChipFieldValue("e-maxillofacial-findings", e.maxillofacialFindings);
  setChipFieldValue("e-integument", e.integument);
  setInputValue("e-alopecia-site", e.alopeciaSite);
  setChipFieldValue("e-otitis-side", e.otitisSide);

  setInputValue("e-wound-location", e.woundLocation);
  setChipFieldValue("e-wound-char", e.woundChar);
  setChipFieldValue("e-wound-discharge", e.woundDischarge);
  setChipFieldValue("e-surgical-site", e.surgicalSite);
  setChipFieldValue("e-other-findings", e.otherFindings);

  setInputValue("e-mgcs", e.mgcs);
  setChipFieldValue("e-pain-score", e.painScore);
  setInputValue("e-other", e.other);

  populateLabs(record.labs);

  setInputValue("t-rehydration-start", tx.rehydrationStart);
  setInputValue("t-dehydration-percent", tx.dehydrationPercent);
  setInputValue("t-ongoing-loss", tx.ongoingLoss);
  setChipFieldValue("t-rehydration-hours", tx.rehydrationHours || "8");
  setInputValue("t-rehydration-rate", tx.rehydrationRate);
  setInputValue("t-resuscitation-rate", tx.resuscitationRate);
  setChipFieldValue("t-resuscitation-bolus", tx.resuscitationBolus);
  setChipFieldValue("t-o2", tx.o2);
  setInputValue("t-o2-detail", tx.o2Detail);
  setChipFieldValue("t-wound-dressing", tx.woundDressing);
  setChipFieldValue("t-checklist", tx.checklist);
  setChipFieldValue("t-case-status", record.caseStatus);
  setInputValue("t-other", tx.other);
  setChipFieldValue("t-icd", tx.icd);
  setChipFieldValue("t-icd-left-fluid", tx.icdLeftFluid);
  setInputValue("t-icd-left-volume", tx.icdLeftVolume);
  setChipFieldValue("t-icd-right-fluid", tx.icdRightFluid);
  setInputValue("t-icd-right-volume", tx.icdRightVolume);
  setChipFieldValue("t-thoraco", tx.thoraco);
  setChipFieldValue("t-thoraco-left-fluid", tx.thoracoLeftFluid);
  setInputValue("t-thoraco-left-volume", tx.thoracoLeftVolume);
  setChipFieldValue("t-thoraco-right-fluid", tx.thoracoRightFluid);
  setInputValue("t-thoraco-right-volume", tx.thoracoRightVolume);
  setChipFieldValue("t-abdomino", tx.abdomino);
  setChipFieldValue("t-abdomino-fluid", tx.abdominoFluid);
  setInputValue("t-abdomino-volume", tx.abdominoVolume);
  setChipFieldValue("t-cysto", tx.cysto);
  setInputValue("t-cysto-volume", tx.cystoVolume);
  setChipFieldValue("t-ga", tx.ga);
  setInputValue("t-ga-drug", tx.gaDrug);
  setInputValue("t-other-procedure", tx.otherProcedure);

  populateSupply(record.supply);
  setChipFieldValue("s-diet-out", record.dietOut);

  // show every section so the vet can see (and adjust) everything already recorded,
  // rather than having to hunt through collapsed sub-accordions one by one
  document.querySelectorAll(".accordion").forEach((a) => a.classList.add("open"));
  lastAutoRehydrationRate = null;
  updateReveals();
  updateUopDisplay();
  updateFluidBalanceDisplay();
  updateRehydrationCalc();
  syncAllValueSliders();
  updateAccordionBadges();
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
      <div class="record-card-note">${noteTextToHtml(r.noteText)}</div>
      <div class="record-card-actions">
        <button type="button" class="secondary-btn card-duplicate-btn">ทำซ้ำ</button>
        <button type="button" class="secondary-btn card-edit-btn">แก้ไข</button>
        <button type="button" class="danger-btn card-delete-btn">ลบรายการนี้</button>
      </div>
    `;
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-delete-btn") || e.target.closest(".card-edit-btn") || e.target.closest(".card-duplicate-btn")) return;
      card.classList.toggle("expanded");
    });
    card.querySelector(".card-edit-btn").addEventListener("click", () => goToEditEntry(r));
    card.querySelector(".card-duplicate-btn").addEventListener("click", () => goToDuplicateEntry(r));
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
function confirmAction(title, message, onConfirm, opts) {
  opts = opts || {};
  const modal = $("confirm-modal");
  $("confirm-title").textContent = title;
  $("confirm-message").textContent = message;
  const okBtn = $("confirm-ok-btn");
  const cancelBtn = $("confirm-cancel-btn");
  okBtn.textContent = opts.confirmLabel || "ยืนยัน";
  cancelBtn.textContent = opts.cancelLabel || "ยกเลิก";
  modal.hidden = false;
  function cleanup() {
    modal.hidden = true;
    okBtn.removeEventListener("click", onOk);
    cancelBtn.removeEventListener("click", onCancelClick);
    okBtn.textContent = "ยืนยัน";
    cancelBtn.textContent = "ยกเลิก";
  }
  function onOk() { cleanup(); onConfirm(); }
  function onCancelClick() { cleanup(); if (opts.onCancel) opts.onCancel(); }
  okBtn.addEventListener("click", onOk);
  cancelBtn.addEventListener("click", onCancelClick);
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

async function updateRecord(id, record) {
  await updateDoc(doc(db, "vetjod_records", id), record);
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
function openJumpNav() {
  $("jump-nav").classList.add("open");
  $("jump-nav-backdrop").hidden = false;
}

function closeJumpNav() {
  $("jump-nav").classList.remove("open");
  $("jump-nav-backdrop").hidden = true;
}

function goToList() {
  $("screen-entry").hidden = true;
  $("screen-list").hidden = false;
  closeJumpNav();
}

function showEntryScreen(title) {
  $("entry-title").textContent = title;
  $("screen-list").hidden = true;
  $("screen-entry").hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function openFreshNewEntry() {
  editingRecordId = null;
  editingRecordCreatedAtLocal = null;
  editingSnapshot = null;
  resetForm();
  showEntryScreen("บันทึกใหม่");
}

// FAB entry point: offers to restore an autosaved draft first, if one exists — protects
// against losing a half-filled long form to an accidental close, a dropped connection, or
// getting called away mid-exam.
function goToNewEntry() {
  const draft = loadDraft();
  if (draft && hasMeaningfulContent(draft)) {
    confirmAction(
      "พบร่างที่ยังไม่ได้บันทึก",
      `มีข้อมูลของ "${draft.name || "สัตว์ตัวหนึ่ง"}" กรอกค้างไว้จากครั้งก่อน ต้องการกู้คืนหรือเริ่มบันทึกใหม่?`,
      () => {
        editingRecordId = null;
        editingRecordCreatedAtLocal = null;
        editingSnapshot = null;
        resetForm();
        populateForm(draft);
        showEntryScreen("บันทึกใหม่ (กู้คืนร่าง)");
      },
      { confirmLabel: "กู้คืนร่าง", cancelLabel: "เริ่มใหม่", onCancel: () => { clearDraft(); openFreshNewEntry(); } }
    );
    return;
  }
  openFreshNewEntry();
}

function goToEditEntry(record) {
  editingRecordId = record.id;
  editingRecordCreatedAtLocal = record.createdAtLocal || null;
  resetForm();
  populateForm(record);
  editingSnapshot = JSON.stringify(collectForm());
  showEntryScreen("แก้ไขบันทึก");
}

// Same as edit, but never touches the original doc — for a repeat check on the same
// animal, start from its last recorded values and only change what's different this time.
function goToDuplicateEntry(record) {
  editingRecordId = null;
  editingRecordCreatedAtLocal = null;
  editingSnapshot = null;
  resetForm();
  populateForm(record);
  showEntryScreen("บันทึกใหม่ (ทำซ้ำจากรายการก่อน)");
}

function handleExitEntry() {
  if (editingRecordId) {
    if (JSON.stringify(collectForm()) !== editingSnapshot) {
      confirmAction(
        "ออกจากการแก้ไขโดยไม่บันทึก?",
        "การเปลี่ยนแปลงที่แก้ไขไว้จะไม่ถูกบันทึก ข้อมูลเดิมจะคงอยู่ตามเดิม",
        goToList,
        { confirmLabel: "ออกโดยไม่บันทึก", cancelLabel: "กรอกต่อ" }
      );
      return;
    }
    goToList();
    return;
  }
  if (hasMeaningfulContent(collectForm())) {
    confirmAction(
      "ออกจากหน้านี้โดยไม่บันทึก?",
      "ข้อมูลที่กรอกไว้จะถูกเก็บเป็นร่างในเครื่องนี้ชั่วคราว แตะ “+” ครั้งถัดไปจะถามว่าจะกู้คืนไหม",
      goToList,
      { confirmLabel: "ออกจากหน้านี้", cancelLabel: "กรอกต่อ" }
    );
    return;
  }
  goToList();
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
  renderFluidsContainer();
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
  $("t-icd-left-fluid-chips").innerHTML = chipsHtml(ICD_FLUID_TYPES);
  $("t-icd-right-fluid-chips").innerHTML = chipsHtml(ICD_FLUID_TYPES);
  $("t-thoraco-left-fluid-chips").innerHTML = chipsHtml(THORACO_FLUID_TYPES);
  $("t-thoraco-right-fluid-chips").innerHTML = chipsHtml(THORACO_FLUID_TYPES);
  $("t-abdomino-fluid-chips").innerHTML = chipsHtml(CAVITY_FLUID_TYPES);
  $("s-diet-out-chips").innerHTML = chipsHtml(DIET_TYPES) + '<button type="button" class="chip" data-value="__other__">อื่นๆ</button>';

  document.addEventListener("click", chipClickHandler);

  document.querySelectorAll('[data-field="v-temp-unit"] .chip').forEach((chip) => {
    chip.addEventListener("click", () => {
      const group = chip.closest('[data-field="v-temp-unit"]');
      const currentActive = group.querySelector(".chip.active");
      const oldUnit = currentActive ? currentActive.dataset.value : null;
      const newUnit = chip.dataset.value;
      if (oldUnit === newUnit) return;
      updateTempSliderRange(newUnit);
      const tempInput = $("v-temp");
      if (tempInput.value === "") return;
      const n = parseFloat(tempInput.value);
      if (isNaN(n)) return;
      tempInput.value = round(newUnit === "F" ? (n * 9 / 5 + 32) : ((n - 32) * 5 / 9), 1);
      syncSliderFromInput("v-temp-slider", "v-temp");
    });
  });

  $("p-weight-slider").addEventListener("input", () => {
    syncInputFromSlider("p-weight-slider", "p-weight");
    onFormChange();
  });
  $("p-weight").addEventListener("input", () => syncSliderFromInput("p-weight-slider", "p-weight"));
  $("v-temp-slider").addEventListener("input", () => {
    syncInputFromSlider("v-temp-slider", "v-temp");
    onFormChange();
  });
  $("v-temp").addEventListener("input", () => syncSliderFromInput("v-temp-slider", "v-temp"));

  document.querySelectorAll("#screen-entry input, #screen-entry textarea").forEach((el) => {
    el.addEventListener("input", onFormChange);
  });

  STATIC_SLIDER_FIELDS.forEach(([id, min, max]) => attachValueSlider($(id), min, max));

  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => header.closest(".accordion").classList.toggle("open"));
  });


  document.querySelectorAll(".jump-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.jumpTo);
      if (!target) return;
      if (target.classList.contains("accordion")) target.classList.add("open");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll(".jump-nav-btn").forEach((b) => b.classList.toggle("active", b === btn));
      closeJumpNav();
    });
  });

  $("jump-nav-handle").addEventListener("click", () => {
    if ($("jump-nav").classList.contains("open")) closeJumpNav(); else openJumpNav();
  });
  $("jump-nav-backdrop").addEventListener("click", closeJumpNav);

  // edge-swipe: start near the right edge and drag left to open, drag right to close
  let jumpNavTouchStartX = null;
  document.addEventListener("touchstart", (e) => {
    jumpNavTouchStartX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (jumpNavTouchStartX === null) return;
    const dx = e.changedTouches[0].clientX - jumpNavTouchStartX;
    const startedNearRightEdge = jumpNavTouchStartX > window.innerWidth - 40;
    const isOpen = $("jump-nav").classList.contains("open");
    if (!isOpen && startedNearRightEdge && dx < -40) {
      openJumpNav();
    } else if (isOpen && dx > 40) {
      closeJumpNav();
    }
    jumpNavTouchStartX = null;
  }, { passive: true });

  $("gate-submit-btn").addEventListener("click", attemptUnlock);
  $("gate-passcode-input").addEventListener("keydown", (e) => { if (e.key === "Enter") attemptUnlock(); });

  $("new-entry-fab").addEventListener("click", goToNewEntry);
  $("entry-back-btn").addEventListener("click", handleExitEntry);
  $("entry-cancel-btn").addEventListener("click", handleExitEntry);
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
    const isEditing = !!editingRecordId;
    record.createdAtLocal = isEditing ? (editingRecordCreatedAtLocal || nowTimeLabel()) : nowTimeLabel();
    record.noteText = buildNoteText(record);
    const saveBtn = $("entry-save-btn");
    saveBtn.disabled = true;
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000));
    try {
      if (isEditing) {
        await Promise.race([updateRecord(editingRecordId, record), timeout]);
      } else {
        await Promise.race([saveRecord(record), timeout]);
      }
      clearDraft();
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
