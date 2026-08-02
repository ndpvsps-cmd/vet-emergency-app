(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");
  const patientNameInput = document.getElementById("patient-name-input");
  const dehydrationSlider = document.getElementById("dehydration-percent-slider");
  const dehydrationDisplay = document.getElementById("dehydration-percent-display");
  const hoursRow = document.getElementById("rehydrate-hours-row");
  const hoursButtons = document.querySelectorAll("[data-rehydrate-hours]");
  const maintModeButtons = document.querySelectorAll("[data-maint-mode]");
  const standardFields = document.getElementById("maint-standard-fields");
  const ageButtons = document.querySelectorAll("[data-age-group]");
  const maintRow = document.getElementById("maintenance-rate-row");
  const maintButtons = document.querySelectorAll("[data-maint-rate]");
  const uopRow = document.getElementById("uop-row");
  const uopInput = document.getElementById("uop-input");
  const uopClassifyEl = document.getElementById("uop-classify");
  const hintEl = document.getElementById("rehydration-hint");
  const resultEl = document.getElementById("rehydration-result");

  const startTimeInput = document.getElementById("fluid-start-time-input");
  const printFluidCardBtn = document.getElementById("print-fluid-card-btn");
  const fluidCardHintEl = document.getElementById("fluid-card-hint");
  const fluidCardEl = document.getElementById("fluid-card");

  const DEHYDRATION_OPTIONS = [0, 5, 6, 7, 8, 9, 10, 12];
  const INSENSIBLE_ML_PER_KG_H = 0.7;

  const state = {
    hours: 8,
    maintMode: "standard",
    ageGroup: "adult",
    maintRate: 2.5
  };

  // default the start time to right now
  (function initStartTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    startTimeInput.value = `${hh}:${mm}`;
  })();

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function currentDehydrationPercent() {
    return DEHYDRATION_OPTIONS[parseInt(dehydrationSlider.value, 10)];
  }

  function updateDehydrationDisplay() {
    const percent = currentDehydrationPercent();
    dehydrationDisplay.textContent = percent === 0 ? "ไม่มีภาวะขาดน้ำ" : `${percent}%`;
    hoursRow.classList.toggle("field-row-muted", percent === 0);
  }

  function currentWeightKg() {
    const val = parseFloat(weightKgInput.value);
    return isNaN(val) || val <= 0 ? null : val;
  }

  function currentSpecies() {
    const activeBtn = document.querySelector(".species-btn.active");
    return activeBtn ? activeBtn.dataset.species : "dog";
  }

  function classifyUop(uop) {
    if (uop < 0.5) return "Anuria / Oliguria รุนแรง (ปัสสาวะออกน้อยมากหรือไม่ออก)";
    if (uop < 1) return "Oliguria (ปัสสาวะออกน้อยกว่าปกติ)";
    if (uop <= 2) return "ปกติ (Normal)";
    return "Polyuria (ปัสสาวะออกมากกว่าปกติ)";
  }

  function formatTime(date) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  hoursButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      hoursButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.hours = parseFloat(btn.dataset.rehydrateHours);
      refreshAll();
    });
  });

  maintModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      maintModeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.maintMode = btn.dataset.maintMode;
      standardFields.hidden = state.maintMode !== "standard";
      uopRow.hidden = state.maintMode !== "uop";
      refreshAll();
    });
  });

  ageButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      ageButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.ageGroup = btn.dataset.ageGroup;
      maintRow.hidden = state.ageGroup === "juvenile";
      refreshAll();
    });
  });

  maintButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      maintButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.maintRate = parseFloat(btn.dataset.maintRate);
      refreshAll();
    });
  });

  uopInput.addEventListener("input", refreshAll);
  dehydrationSlider.addEventListener("input", () => {
    updateDehydrationDisplay();
    refreshAll();
  });
  weightKgInput.addEventListener("input", refreshAll);
  startTimeInput.addEventListener("input", refreshFluidCard);
  patientNameInput.addEventListener("input", refreshFluidCard);
  document.querySelectorAll(".species-btn").forEach((btn) => {
    btn.addEventListener("click", refreshFluidCard);
  });

  function refreshAll() {
    refresh();
    refreshFluidCard();
  }

  // Returns { maintenanceMlPerHour, breakdownHtml } or null if the current mode's
  // required inputs (eg UOP) aren't filled in yet.
  function computeMaintenance(weightKg) {
    if (state.maintMode === "uop") {
      const uop = parseFloat(uopInput.value);
      if (isNaN(uop) || uop < 0) {
        uopClassifyEl.textContent = "";
        return null;
      }
      uopClassifyEl.textContent = `การแปลผล UOP: ${classifyUop(uop)}`;

      const insensibleMlPerHour = weightKg * INSENSIBLE_ML_PER_KG_H;
      const sensibleMlPerHour = weightKg * uop;
      const maintenanceMlPerHour = insensibleMlPerHour + sensibleMlPerHour;

      return {
        maintenanceMlPerHour,
        breakdownHtml: `
          <strong>Maintenance (ตาม UOP):</strong>
          Insensible loss ${round(insensibleMlPerHour, 2)} mL/h (${INSENSIBLE_ML_PER_KG_H} mL/kg/h) +
          Sensible loss ${round(sensibleMlPerHour, 2)} mL/h (UOP ${uop} mL/kg/h) =
          ${round(maintenanceMlPerHour, 2)} mL/h
        `
      };
    }

    const maintRatePerKg = state.ageGroup === "juvenile" ? 6 : state.maintRate;
    const maintenanceMlPerHour = weightKg * maintRatePerKg;
    return {
      maintenanceMlPerHour,
      breakdownHtml: `<strong>Maintenance:</strong> ${maintRatePerKg} mL/kg/h (${round(maintenanceMlPerHour, 2)} mL/h)`
    };
  }

  // Shared by the main result box and the printable card — returns null if inputs are incomplete.
  function computeRates() {
    const weightKg = currentWeightKg();
    if (weightKg === null) return null;

    const maint = computeMaintenance(weightKg);
    if (!maint) return null;

    const dehydrationPercent = currentDehydrationPercent();
    // 1% dehydration ≈ 10 mL/kg deficit
    const deficitMl = (dehydrationPercent / 100) * weightKg * 1000;

    const phase1RateMlPerHour = (deficitMl / state.hours) + maint.maintenanceMlPerHour;
    const phase2RateMlPerHour = maint.maintenanceMlPerHour;

    return { weightKg, maint, dehydrationPercent, deficitMl, phase1RateMlPerHour, phase2RateMlPerHour };
  }

  function refresh() {
    const rates = computeRates();
    if (!rates) {
      resultEl.hidden = true;
      hintEl.hidden = false;
      hintEl.textContent = state.maintMode === "uop" && currentWeightKg() !== null
        ? "กรอกปริมาณปัสสาวะ (UOP) เพื่อคำนวณ"
        : "กรอกน้ำหนักตัว และเปอร์เซ็นต์ภาวะขาดน้ำ เพื่อคำนวณ";
      return;
    }
    hintEl.hidden = true;
    resultEl.hidden = false;

    resultEl.innerHTML = `
      <div class="result-rate">
        <strong>ภาวะขาดน้ำ:</strong> ${rates.dehydrationPercent}% &nbsp;|&nbsp;
        <strong>ปริมาณที่ขาด (Deficit):</strong> ${round(rates.deficitMl, 1)} mL
        <br>${rates.maint.breakdownHtml}
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">ช่วงที่ 1: แก้ไขภาวะขาดน้ำ (${state.hours} ชม.แรก)</span>
          <span class="value">${round(rates.phase1RateMlPerHour, 1)} mL/h</span>
        </div>
        <div class="result-item">
          <span class="label">ช่วงที่ 2: หลังจากนั้น (Maintenance เท่านั้น)</span>
          <span class="value">${round(rates.phase2RateMlPerHour, 1)} mL/h</span>
        </div>
      </div>
      <div class="result-note">
        <strong>สูตรที่ใช้:</strong> Deficit (mL) = %ขาดน้ำ × น้ำหนัก (กก.) × 10 &nbsp;|&nbsp;
        อัตราช่วงที่ 1 = (Deficit ÷ ชั่วโมงที่เลือก) + Maintenance rate &nbsp;|&nbsp;
        อัตราช่วงที่ 2 = Maintenance rate เท่านั้น
      </div>
      <div class="result-source">
        สูตรมาตรฐานการคำนวณสารน้ำ (rehydration deficit + maintenance) — Maintenance มาตรฐาน 2-3 mL/kg/h สำหรับสัตว์โตเต็มวัย,
        6 mL/kg/h สำหรับลูกสัตว์อายุน้อยกว่า 2 เดือน; Maintenance ตามปริมาณปัสสาวะ = Insensible loss (0.7 mL/kg/h) +
        Sensible loss (UOP mL/kg/h) — ใช้ปรับอัตราสารน้ำในกรณี polyuria/oliguria/anuria (ตามที่ผู้ใช้ระบุ)
      </div>
    `;
  }

  function refreshFluidCard() {
    const rates = computeRates();
    if (!rates || !startTimeInput.value) {
      fluidCardEl.hidden = true;
      fluidCardHintEl.hidden = false;
      return;
    }
    fluidCardHintEl.hidden = true;
    fluidCardEl.hidden = false;

    const [hh, mm] = startTimeInput.value.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hh, mm, 0, 0);
    const endDate = new Date(startDate.getTime() + state.hours * 60 * 60 * 1000);

    const speciesLabel = currentSpecies() === "dog" ? "สุนัข" : "แมว";
    const name = patientNameInput.value.trim();

    const phase1Html = `
      <div class="feeding-card-highlight">
        <div class="feeding-card-highlight-label">ช่วงที่ 1: ${formatTime(startDate)} - ${formatTime(endDate)} (${state.hours} ชม.)</div>
        <div class="feeding-card-highlight-value">${round(rates.phase1RateMlPerHour, 1)} mL/h</div>
      </div>
    `;
    const phase2Html = `
      <div class="feeding-card-highlight">
        <div class="feeding-card-highlight-label">ช่วงที่ 2: ตั้งแต่ ${formatTime(endDate)} เป็นต้นไป</div>
        <div class="feeding-card-highlight-value">${round(rates.phase2RateMlPerHour, 1)} mL/h</div>
      </div>
    `;

    fluidCardEl.innerHTML = `
      <div class="feeding-card-title">🐾 การ์ดแผนให้สารน้ำ</div>
      <div class="feeding-card-name">${name ? name : "(ไม่ได้ระบุชื่อสัตว์)"}</div>
      <div class="feeding-card-row"><span>ชนิดสัตว์</span><span>${speciesLabel}</span></div>
      <div class="feeding-card-row"><span>น้ำหนักตัว</span><span>${rates.weightKg} กก.</span></div>
      <div class="feeding-card-row"><span>ภาวะขาดน้ำ</span><span>${rates.dehydrationPercent}%</span></div>
      ${phase1Html}
      ${phase2Html}
      <div class="feeding-card-footer">พิมพ์เมื่อ ${formatTime(new Date())} — ปรับอัตราตามเวลาที่กำหนดไว้ด้านบน</div>
    `;
  }

  printFluidCardBtn.addEventListener("click", () => {
    document.body.classList.add("print-fluid-card");
    window.print();
  });
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-fluid-card");
  });

  updateDehydrationDisplay();
  refreshAll();
})();
