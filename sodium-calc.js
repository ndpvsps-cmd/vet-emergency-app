(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");
  const weightLbInput = document.getElementById("weight-lb");

  const directionButtons = document.querySelectorAll(".toggle-btn[data-sodium-direction]");
  const chronicityButtons = document.querySelectorAll(".toggle-btn[data-chronicity]");
  const symptomaticButtons = document.querySelectorAll(".toggle-btn[data-symptomatic]");
  const symptomaticRow = document.getElementById("symptomatic-row");
  const fluidSelectRow = document.getElementById("fluid-select-row");
  const fluidSelect = document.getElementById("sodium-fluid-select");
  const hypovolemicCheckbox = document.getElementById("hypovolemic-checkbox");

  const currentNaInput = document.getElementById("current-na-input");
  const targetNaInput = document.getElementById("target-na-input");
  const resultEl = document.getElementById("sodium-result");
  const hintEl = document.getElementById("sodium-hint");

  const naState = {
    direction: "hypo", // hypo | hyper
    chronicity: "acute", // acute | chronic
    symptomatic: false
  };

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function currentWeightKg() {
    const val = parseFloat(weightKgInput.value);
    return isNaN(val) || val <= 0 ? null : val;
  }

  function currentSpecies() {
    const active = document.querySelector(".species-btn.active[data-species]");
    return active ? active.dataset.species : "dog";
  }

  // ---- populate fluid select ----
  FLUID_SODIUM_CONTENT.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.key;
    opt.textContent = `${f.label} (${f.naMeqPerL} mEq/L)`;
    fluidSelect.appendChild(opt);
  });
  fluidSelect.value = "ns";

  // ---- toggles ----
  directionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      directionButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      naState.direction = btn.dataset.sodiumDirection;
      symptomaticRow.hidden = naState.direction !== "hypo";
      fluidSelectRow.hidden = naState.direction !== "hypo";
      refresh();
    });
  });

  chronicityButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      chronicityButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      naState.chronicity = btn.dataset.chronicity;
      refresh();
    });
  });

  symptomaticButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      symptomaticButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      naState.symptomatic = btn.dataset.symptomatic === "yes";
      refresh();
    });
  });

  weightKgInput.addEventListener("input", refresh);
  weightLbInput.addEventListener("input", refresh);
  document.addEventListener("species-change", refresh);
  currentNaInput.addEventListener("input", refresh);
  targetNaInput.addEventListener("input", refresh);
  fluidSelect.addEventListener("change", refresh);
  hypovolemicCheckbox.addEventListener("change", refresh);

  function hypovolemicNote() {
    if (!hypovolemicCheckbox.checked) return "";
    const species = currentSpecies();
    const dose = species === "cat" ? HYPOVOLEMIC_BOLUS_ML_PER_KG.cat : HYPOVOLEMIC_BOLUS_ML_PER_KG.dog;
    const weightKg = currentWeightKg();
    const volText = weightKg ? ` (${round(dose.low * weightKg, 1)} - ${round(dose.high * weightKg, 1)} mL)` : "";
    return `
      <div class="result-out-of-range">
        <strong>มี hypovolemia ร่วมด้วย:</strong> ให้ isotonic crystalloid ที่มีโซเดียมใกล้เคียงกับผู้ป่วยก่อน
        (ไม่ใช้สารน้ำ hypotonic เช่น 0.45% NaCl หรือ D5W เพื่อแก้ hypovolemia)
        bolus ${dose.low}-${dose.high} mL/kg${volText} ให้นาน 15-30 นาที ให้ซ้ำได้จนกว่า perfusion parameters จะกลับมาปกติ
      </div>
    `;
  }

  function refreshHypo(weightKg, currentNa, targetNa) {
    const deltaNa = targetNa - currentNa;
    const parts = [];

    // Adrogue-Madias: expected change in Na per 1 L of the chosen fluid. Computed up front so the
    // chronic branch below can also derive the maximum safe fluid RATE from it (not just liters/time).
    const fluid = FLUID_SODIUM_CONTENT.find((f) => f.key === fluidSelect.value);
    const tbw = 0.6 * weightKg;
    const expectedDeltaPerL = (fluid.naMeqPerL - currentNa) / (tbw + 1);
    const wrongDirection = (deltaNa > 0 && expectedDeltaPerL <= 0) || (deltaNa < 0 && expectedDeltaPerL >= 0);

    if (naState.symptomatic) {
      const doseLow = HYPERTONIC_SALINE_DOSE_ML_PER_KG.low * weightKg;
      const doseHigh = HYPERTONIC_SALINE_DOSE_ML_PER_KG.high * weightKg;
      parts.push(`
        <div class="result-out-of-range">
          <strong>มีอาการทางระบบประสาท (symptomatic):</strong> ให้ hypertonic saline (3%, 5%, หรือ 7.5% NaCl)
          ${HYPERTONIC_SALINE_DOSE_ML_PER_KG.low}-${HYPERTONIC_SALINE_DOSE_ML_PER_KG.high} mL/kg
          (${round(doseLow, 1)} - ${round(doseHigh, 1)} mL) ให้นาน 10-15 นาที —
          ข้อมูลในคนพบว่าโซเดียมเพิ่มขึ้น 4-6 mEq/L มักเพียงพอที่จะบรรเทาอาการ
        </div>
      `);
    }

    if (naState.chronicity === "acute") {
      parts.push(`
        <div class="result-note">
          <strong>เฉียบพลัน (&lt; 24-48 ชม.):</strong> เพิ่มโซเดียมให้เร็วที่สุดเท่าที่จะทำได้ ด้วย isotonic crystalloid
          ที่มีความเข้มข้นโซเดียมสูงกว่าของผู้ป่วย ตรวจโซเดียมซ้ำ 2-4 ชม. หลังเริ่มการรักษา แล้วตรวจซ้ำทุก 6-8 ชม.
        </div>
      `);
    } else {
      const maxHours = Math.abs(deltaNa) / SODIUM_MAX_RATE_MEQ_PER_L_HR;

      let maxRateHtml = "";
      if (!wrongDirection && expectedDeltaPerL !== 0) {
        // Max fluid rate such that (expectedDeltaPerL x rate in L/hr) never exceeds the 0.5 mEq/L/hr cap.
        const maxRateMlPerHr = (SODIUM_MAX_RATE_MEQ_PER_L_HR / Math.abs(expectedDeltaPerL)) * 1000;
        maxRateHtml = `
          <div class="result-item">
            <span class="label">อัตราสารน้ำสูงสุดที่ไม่ควรเกิน (${fluid.label})</span>
            <span class="value">${round(maxRateMlPerHr, 1)} mL/hr</span>
          </div>
          <div class="result-item">
            <span class="label">(${round(maxRateMlPerHr / weightKg, 2)} mL/kg/hr)</span>
          </div>
        `;
      }

      parts.push(`
        <div class="result-grid">
          <div class="result-item">
            <span class="label">อัตราแก้ไขสูงสุด</span>
            <span class="value">${SODIUM_MAX_RATE_MEQ_PER_L_HR} mEq/L/hr</span>
          </div>
          <div class="result-item">
            <span class="label">ระยะเวลาขั้นต่ำที่ควรใช้ (จาก ${currentNa} → ${targetNa})</span>
            <span class="value">${round(maxHours, 1)} ชม.</span>
          </div>
          ${maxRateHtml}
        </div>
        <div class="result-note">
          <strong>เรื้อรัง (&gt; 24-48 ชม.):</strong> แก้ไขช้าๆ ไม่เกิน ${SODIUM_MAX_RATE_MEQ_PER_L_HR} mEq/L/hr
          หรือไม่เกิน ${SODIUM_MAX_DAILY_MEQ_PER_L} mEq/L ต่อ 24 ชม. เพื่อป้องกัน osmotic demyelination syndrome
          ถ้าไม่มีอาการทางระบบประสาท พิจารณาจำกัดน้ำดื่มเล็กน้อยร่วมด้วยและติดตามโซเดียม —
          "อัตราสารน้ำสูงสุด" ด้านบนคืออัตราของ${fluid.label}ที่จะไม่ทำให้โซเดียมเปลี่ยนเร็วกว่า ${SODIUM_MAX_RATE_MEQ_PER_L_HR} mEq/L/hr
        </div>
      `);
    }

    let litersHtml = "";
    if (!wrongDirection && expectedDeltaPerL !== 0) {
      const litersNeeded = deltaNa / expectedDeltaPerL;
      litersHtml = `
        <div class="result-item">
          <span class="label">ปริมาณโดยประมาณที่ต้องให้เพื่อถึงเป้าหมาย</span>
          <span class="value">${round(litersNeeded, 2)} L</span>
        </div>
      `;
    }

    parts.push(`
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Adrogue-Madias: ΔNa คาดหวังต่อสารน้ำ 1 L (${fluid.label})</span>
          <span class="value">${round(expectedDeltaPerL, 2)} mEq/L</span>
        </div>
        ${litersHtml}
      </div>
      ${wrongDirection
        ? `<div class="result-out-of-range">สารน้ำที่เลือก (${fluid.label}, Na ${fluid.naMeqPerL} mEq/L) มีโซเดียม<strong>ไม่สูงกว่า</strong>เลือดผู้ป่วย (${currentNa} mEq/L) — ต้องเลือกสารน้ำที่มีความเข้มข้นโซเดียม<strong>สูงกว่า</strong>เลือดผู้ป่วยเสมอ มิฉะนั้นโซเดียมจะเปลี่ยนไปผิดทิศทาง</div>`
        : `<div class="result-note">สารน้ำที่เลือกมีโซเดียม (${fluid.naMeqPerL} mEq/L) สูงกว่าเลือดผู้ป่วย (${currentNa} mEq/L) ตามที่แนวทาง AAHA กำหนด</div>`}
      <div class="result-note">สูตร Adrogue-Madias เป็นการประมาณเบื้องต้นเท่านั้น ${naState.chronicity === "chronic" ? `ให้ปริมาณนี้ในระยะเวลาไม่น้อยกว่าที่คำนวณไว้ด้านบนเพื่อไม่ให้เกินอัตราปลอดภัย` : ""} ต้องตรวจโซเดียมซ้ำเป็นระยะเสมอ ไม่ใช้แทนการติดตามผู้ป่วยจริง</div>
    `);

    return parts.join("");
  }

  function refreshHyper(weightKg, currentNa, targetNa) {
    const deltaNa = currentNa - targetNa; // positive when correcting hypernatremia downward
    const fwdLiters = ((currentNa / targetNa) - 1) * (0.6 * weightKg);
    const replacementHours = naState.chronicity === "acute" ? Math.abs(deltaNa) * 1 : Math.abs(deltaNa) * 2;
    const rateMlPerHr = fwdLiters !== 0 ? (fwdLiters * 1000) / replacementHours : 0;

    const chronicityNote = naState.chronicity === "acute"
      ? `<div class="result-note"><strong>เฉียบพลัน (&lt; 24-48 ชม.):</strong> ใช้ hypotonic IV fluid แก้ไขได้ค่อนข้างเร็วโดยความเสี่ยง cerebral edema ต่ำ ติดตามโซเดียมทุก 4-6 ชม.</div>`
      : `<div class="result-note"><strong>เรื้อรัง (&gt; 24-48 ชม.):</strong> แก้ไขช้าๆ ลดโซเดียมไม่เกิน ${SODIUM_MAX_RATE_MEQ_PER_L_HR} mEq/L/hr หรือไม่เกิน ${SODIUM_MAX_DAILY_MEQ_PER_L} mEq/L ต่อ 24 ชม. เพื่อป้องกัน cerebral edema</div>`;

    return `
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Free Water Deficit (FWD)</span>
          <span class="value">${round(fwdLiters, 3)} L</span>
        </div>
        <div class="result-item">
          <span class="label">ระยะเวลาที่ควรให้ครบ</span>
          <span class="value">${round(replacementHours, 1)} ชม.</span>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">อัตราสารน้ำโดยประมาณ (5% Dextrose in Water)</span>
          <span class="value">${round(rateMlPerHr, 1)} mL/hr</span>
        </div>
      </div>
      ${chronicityNote}
      <div class="result-note">โดยทั่วไปให้ FWD ด้วย 5% Dextrose in Water ตรวจโซเดียมซ้ำเป็นระยะ และหากมีภาวะขาดน้ำร่วมด้วย ให้แก้ไข dehydration แยกต่างหากในช่วง 12-24 ชม. เพื่อลดการเปลี่ยนแปลงโซเดียมอย่างรวดเร็ว</div>
    `;
  }

  function refresh() {
    const weightKg = currentWeightKg();
    const currentNa = parseFloat(currentNaInput.value);
    const targetNa = parseFloat(targetNaInput.value);

    if (weightKg === null || isNaN(currentNa) || isNaN(targetNa) || currentNa <= 0 || targetNa <= 0) {
      resultEl.hidden = true;
      hintEl.hidden = false;
      return;
    }
    hintEl.hidden = true;
    resultEl.hidden = false;

    const body = naState.direction === "hypo"
      ? refreshHypo(weightKg, currentNa, targetNa)
      : refreshHyper(weightKg, currentNa, targetNa);

    resultEl.innerHTML = `
      <div class="result-rate">
        <strong>โซเดียมปัจจุบัน:</strong> ${currentNa} mEq/L &nbsp;|&nbsp;
        <strong>เป้าหมาย:</strong> ${targetNa} mEq/L &nbsp;|&nbsp;
        <strong>ภาวะ:</strong> ${naState.direction === "hypo" ? "โซเดียมต่ำ" : "โซเดียมสูง"}
      </div>
      ${hypovolemicNote()}
      ${body}
      <div class="result-source">
        แนวทางและสูตรคำนวณจาก 2024 AAHA Fluid Therapy Guidelines for Dogs and Cats —
        Table 12A (Approach to Fluid Therapy in Hyponatremic Patients, p.149) และ
        Table 13A (Approach to Fluid Therapy in Hypernatremic Patients, p.150-151)
        ความเข้มข้นโซเดียมของสารน้ำแต่ละชนิดเป็นค่าอ้างอิงทั่วไปทางเภสัชวิทยา ไม่ได้มาจาก Table 12C ของ AAHA โดยตรง (เป็นรูปภาพในไฟล์ ไม่สามารถแกะข้อความได้)
      </div>
    `;
  }

  refresh();
})();
