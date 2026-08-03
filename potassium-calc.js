(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");
  const weightLbInput = document.getElementById("weight-lb");

  const serumKInput = document.getElementById("serum-k-input");
  const potassiumDoseInput = document.getElementById("potassium-dose-input");
  const potassiumDoseRangeHint = document.getElementById("potassium-dose-range-hint");
  const bagSizeSelect = document.getElementById("fluid-bag-size-select");
  const rateInput = document.getElementById("planned-rate-input");
  const resultEl = document.getElementById("potassium-result");
  const hintEl = document.getElementById("potassium-hint");

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function currentWeightKg() {
    const val = parseFloat(weightKgInput.value);
    return isNaN(val) || val <= 0 ? null : val;
  }

  function findTier(k) {
    if (k > 5.0) return null;
    for (const entry of POTASSIUM_SUPPLEMENTATION_TABLE) {
      if (k <= entry.maxK) return entry;
    }
    return null;
  }

  function refresh() {
    const weightKg = currentWeightKg();
    const k = parseFloat(serumKInput.value);

    if (weightKg === null || isNaN(k) || k <= 0) {
      resultEl.hidden = true;
      hintEl.hidden = false;
      potassiumDoseRangeHint.textContent = "";
      return;
    }

    const tier = findTier(k);

    // แสดงช่วงขนาดที่แนะนำทันทีที่ทราบระดับ K+ — ไม่ต้องรอกรอกอัตราสารน้ำก่อน
    potassiumDoseRangeHint.textContent = tier
      ? `ช่วงที่แนะนำตาม Table 11 (${tier.label}): ${tier.doseLow} - ${tier.doseHigh} mEq/kg/hr`
      : "";

    if (!tier) {
      hintEl.hidden = true;
      resultEl.hidden = false;
      resultEl.innerHTML = `
        <div class="result-note">ระดับโพแทสเซียม ${k} mEq/L อยู่ในหรือเกินช่วงปกติ (ไม่เข้าเกณฑ์ hypokalemia ในตาราง Table 11 ซึ่งครอบคลุมถึง 5.0 mEq/L) โปรดประเมินสาเหตุอื่นหากมีอาการทางคลินิก</div>
      `;
      return;
    }

    const doseInput = parseFloat(potassiumDoseInput.value);
    const fluidRateMlHr = parseFloat(rateInput.value);

    if (isNaN(doseInput) || doseInput <= 0 || isNaN(fluidRateMlHr) || fluidRateMlHr <= 0) {
      resultEl.hidden = true;
      hintEl.hidden = false;
      return;
    }

    hintEl.hidden = true;
    resultEl.hidden = false;

    const bagSizeMl = parseFloat(bagSizeSelect.value);
    const outOfRange = doseInput < tier.doseLow || doseInput > tier.doseHigh;

    // ขนาดที่กรอก (mEq/kg/hr) เป็นอัตรา CRI ที่ต้องการ ให้ back-calculate ความเข้มข้น (mEq/mL)
    // ที่ต้องผสมในถุงตามอัตราสารน้ำจริง แล้วแปลงเป็นปริมาณ KCl เข้มข้น (2 mEq/mL) ที่ต้องเติม
    const totalMeqPerHr = doseInput * weightKg;
    const concMeqPerMl = totalMeqPerHr / fluidRateMlHr;
    const kclVolume = (concMeqPerMl * bagSizeMl) / KCL_CONCENTRATE_MEQ_PER_ML;

    resultEl.innerHTML = `
      <div class="result-rate">
        <strong>ระดับ K+:</strong> ${k} mEq/L (${tier.label}) &nbsp;|&nbsp;
        <strong>ขนาด KCl ที่กรอก:</strong> ${doseInput} mEq/kg/hr
      </div>
      ${outOfRange ? `<div class="result-note">ขนาดที่กรอก (${doseInput} mEq/kg/hr) อยู่นอกช่วงที่ Table 11 แนะนำ (${tier.doseLow} - ${tier.doseHigh} mEq/kg/hr) สำหรับระดับ K+ นี้</div>` : ""}
      <div class="result-grid">
        <div class="result-item">
          <span class="label">KCl ที่ผู้ป่วยต้องได้รับ</span>
          <span class="value">${round(totalMeqPerHr, 3)} mEq/hr</span>
        </div>
        <div class="result-item">
          <span class="label">ที่อัตราสารน้ำ ${fluidRateMlHr} mL/hr</span>
          <span class="value">${round(concMeqPerMl * 1000, 1)} mEq/L</span>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">ปริมาณ KCl เข้มข้น (2 mEq/mL) ที่ต้องเติมในถุง ${bagSizeMl} mL</span>
          <span class="value">${round(kclVolume, 2)} mL</span>
        </div>
      </div>
      <div class="result-note">
        <strong>ข้อควรระวัง:</strong> ห้ามให้สารน้ำที่ผสม KCl แบบ bolus เด็ดขาด ต้องกลับถุงคว่ำ-หงายผสมให้เข้ากันดีก่อนให้เสมอ
        ใช้ fluid pump/syringe pump ควบคุมอัตราอย่างเคร่งครัด และหากเปลี่ยนอัตราสารน้ำ (mL/hr) ต้องคำนวณใหม่ทุกครั้ง
        เพราะความเข้มข้นที่ผสมไว้จะให้ปริมาณ KCl ตามอัตรานี้เท่านั้น
      </div>
      <div class="result-source">
        ขนาด KCl (mEq/kg/hr) จาก Table 11 "Guidelines for Potassium Supplementation in Fluids" —
        2024 AAHA Fluid Therapy Guidelines for Dogs and Cats, p.148
      </div>
    `;
  }

  weightKgInput.addEventListener("input", refresh);
  weightLbInput.addEventListener("input", refresh);
  serumKInput.addEventListener("input", refresh);
  potassiumDoseInput.addEventListener("input", refresh);
  bagSizeSelect.addEventListener("change", refresh);
  rateInput.addEventListener("input", refresh);

  refresh();

  // ---- Phosphorus (Dipotassium Phosphate) correction ----
  const serumPInput = document.getElementById("serum-p-input");
  const phosphorusDoseInput = document.getElementById("phosphorus-dose-input");
  const phosphorusDoseRangeHint = document.getElementById("phosphorus-dose-range-hint");
  const pBagSizeSelect = document.getElementById("phosphorus-bag-size-select");
  const pRateInput = document.getElementById("phosphorus-rate-input");
  const pResultEl = document.getElementById("phosphorus-result");
  const pHintEl = document.getElementById("phosphorus-hint");

  function currentSpecies() {
    const activeBtn = document.querySelector(".species-btn.active");
    return activeBtn ? activeBtn.dataset.species : "dog";
  }

  function findPhosphorusTier(species, p) {
    const table = PHOSPHORUS_SUPPLEMENTATION_TABLE[species];
    for (const entry of table) {
      if (p <= entry.maxP) return entry;
    }
    return null;
  }

  function refreshPhosphorus() {
    const weightKg = currentWeightKg();
    const p = parseFloat(serumPInput.value);

    if (weightKg === null || isNaN(p) || p <= 0) {
      pResultEl.hidden = true;
      pHintEl.hidden = false;
      phosphorusDoseRangeHint.textContent = "";
      return;
    }

    const species = currentSpecies();
    const tier = findPhosphorusTier(species, p);

    // แสดงช่วงขนาดที่แนะนำทันทีที่ทราบระดับ P — ไม่ต้องรอกรอกอัตราสารน้ำก่อน
    phosphorusDoseRangeHint.textContent = tier
      ? `ช่วงที่แนะนำ (${tier.label}, ${species === "dog" ? "สุนัข" : "แมว"}): ${tier.doseLow} - ${tier.doseHigh} mmol/kg/hr`
      : "";

    if (!tier) {
      pHintEl.hidden = true;
      pResultEl.hidden = false;
      pResultEl.innerHTML = `
        <div class="result-note">ระดับฟอสฟอรัส ${p} mg/dL อยู่ในหรือเกินช่วงที่ตารางนี้ครอบคลุม (${species === "dog" ? "สุนัข ≤ 2.9" : "แมว ≤ 2.9"} mg/dL) โปรดประเมินสาเหตุอื่นหากมีอาการทางคลินิก</div>
      `;
      return;
    }

    const doseInput = parseFloat(phosphorusDoseInput.value);
    const fluidRateMlHr = parseFloat(pRateInput.value);

    if (isNaN(doseInput) || doseInput <= 0 || isNaN(fluidRateMlHr) || fluidRateMlHr <= 0) {
      pResultEl.hidden = true;
      pHintEl.hidden = false;
      return;
    }

    pHintEl.hidden = true;
    pResultEl.hidden = false;

    const bagSizeMl = parseFloat(pBagSizeSelect.value);
    const outOfRange = doseInput < tier.doseLow || doseInput > tier.doseHigh;

    const totalMmolPerHr = doseInput * weightKg;
    const concMmolPerMl = totalMmolPerHr / fluidRateMlHr;
    const volume = (concMmolPerMl * bagSizeMl) / DIPOTASSIUM_PHOSPHATE.phosphorusMmolPerMl;

    // Dipotassium Phosphate has a fixed K:P ratio (1 mEq K+ per 0.5 mmol P = 2 mEq K+ per mmol P).
    // The actual K+ DELIVERY RATE therefore only depends on the phosphorus delivery rate — it is
    // NOT the mEq content of the volume mixed into the bag (that total also depends on the chosen
    // fluid rate/bag size, which only sets the mixing concentration, not the dose delivered per hour).
    const K_PER_P_RATIO = DIPOTASSIUM_PHOSPHATE.potassiumMeqPerMl / DIPOTASSIUM_PHOSPHATE.phosphorusMmolPerMl;
    const kMeqPerHr = totalMmolPerHr * K_PER_P_RATIO;
    const kMeqPerKgHr = kMeqPerHr / weightKg;
    const exceedsKSafety = kMeqPerKgHr > KCL_SAFETY_LIMIT_MEQ_PER_KG_HR;

    pResultEl.innerHTML = `
      <div class="result-rate">
        <strong>ระดับ P:</strong> ${p} mg/dL (${tier.label}, ${species === "dog" ? "สุนัข" : "แมว"}) &nbsp;|&nbsp;
        <strong>ขนาด Phosphorus ที่กรอก:</strong> ${doseInput} mmol/kg/hr
      </div>
      ${outOfRange ? `<div class="result-note">ขนาดที่กรอก (${doseInput} mmol/kg/hr) อยู่นอกช่วงที่แนะนำ (${tier.doseLow} - ${tier.doseHigh} mmol/kg/hr) สำหรับระดับ P นี้</div>` : ""}
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Phosphorus ที่ผู้ป่วยต้องได้รับ</span>
          <span class="value">${round(totalMmolPerHr, 3)} mmol/hr</span>
        </div>
        <div class="result-item">
          <span class="label">ปริมาณ Dipotassium Phosphate ที่ต้องเติมในถุง ${bagSizeMl} mL</span>
          <span class="value">${round(volume, 2)} mL</span>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Potassium ที่ได้รับร่วมด้วยจากยานี้</span>
          <span class="value">${round(kMeqPerHr, 3)} mEq/hr
            (${round(kMeqPerKgHr, 3)} mEq/kg/hr)</span>
        </div>
      </div>
      ${exceedsKSafety
        ? `<div class="result-out-of-range">คำเตือน: Potassium ที่ได้รับจาก Dipotassium Phosphate ในอัตรานี้เกินขีดจำกัดความปลอดภัยทั่วไป (${KCL_SAFETY_LIMIT_MEQ_PER_KG_HR} mEq/kg/hr) — พิจารณาเพิ่มอัตราสารน้ำหรือขนาดถุง เพื่อลดความเข้มข้น</div>`
        : ""}
      <div class="result-note">
        <strong>ข้อควรระวัง:</strong> ผสมในสารละลายที่ไม่มีแคลเซียมเท่านั้น (ห้ามผสมกับสารน้ำที่มีแคลเซียม เช่น LRS เพราะอาจตกตะกอน)
        ห้ามให้แบบ bolus ต้องกลับถุงคว่ำ-หงายผสมให้เข้ากันดีก่อนให้เสมอ ใช้ fluid pump/syringe pump ควบคุมอัตราอย่างเคร่งครัด
        และตรวจระดับฟอสฟอรัสซ้ำทุก 8-12 ชั่วโมง หากเปลี่ยนอัตราสารน้ำต้องคำนวณใหม่ทุกครั้ง
      </div>
      <div class="result-source">
        ขนาดยา Phosphorus (mmol/kg/hr) และยาที่ใช้ (Dipotassium Phosphate 1.74g/20mL) — ผู้ใช้ให้ข้อมูลโดยตรงจากความรู้ทางคลินิก
      </div>
    `;
  }

  serumPInput.addEventListener("input", refreshPhosphorus);
  phosphorusDoseInput.addEventListener("input", refreshPhosphorus);
  pBagSizeSelect.addEventListener("change", refreshPhosphorus);
  pRateInput.addEventListener("input", refreshPhosphorus);
  weightKgInput.addEventListener("input", refreshPhosphorus);
  weightLbInput.addEventListener("input", refreshPhosphorus);
  document.addEventListener("species-change", refreshPhosphorus);

  refreshPhosphorus();

  // ---- Combined correction: line 1 = KCl, line 2 = Dipotassium Phosphate ----
  const combinedKInput = document.getElementById("combined-k-input");
  const combinedPInput = document.getElementById("combined-p-input");
  const combinedKDoseInput = document.getElementById("combined-k-dose-input");
  const combinedPDoseInput = document.getElementById("combined-p-dose-input");
  const combinedKDoseRangeHint = document.getElementById("combined-k-dose-range-hint");
  const combinedPDoseRangeHint = document.getElementById("combined-p-dose-range-hint");
  const combinedKclRateInput = document.getElementById("combined-kcl-rate-input");
  const combinedKclBagSelect = document.getElementById("combined-kcl-bag-select");
  const combinedPhosRateInput = document.getElementById("combined-phos-rate-input");
  const combinedPhosBagSelect = document.getElementById("combined-phos-bag-select");
  const combinedResultEl = document.getElementById("combined-result");
  const combinedHintEl = document.getElementById("combined-hint");

  function refreshCombined() {
    const weightKg = currentWeightKg();
    const k = parseFloat(combinedKInput.value);
    const p = parseFloat(combinedPInput.value);

    if (weightKg === null || isNaN(k) || k <= 0 || isNaN(p) || p <= 0) {
      combinedResultEl.hidden = true;
      combinedHintEl.hidden = false;
      combinedKDoseRangeHint.textContent = "";
      combinedPDoseRangeHint.textContent = "";
      return;
    }

    const species = currentSpecies();
    const kTier = findTier(k);
    const pTier = findPhosphorusTier(species, p);

    // แสดงช่วงขนาดยาที่แนะนำทันทีที่ทราบระดับ K+/P — ไม่ต้องรอให้กรอกอัตราสารน้ำก่อน
    combinedKDoseRangeHint.textContent = kTier
      ? `ช่วงที่แนะนำตาม Table 11 (${kTier.label}): ${kTier.doseLow} - ${kTier.doseHigh} mEq/kg/hr`
      : "ระดับ K+ อยู่ในช่วงปกติ/สูง — Table 11 ไม่มีข้อบ่งชี้ให้ KCl (ยังกรอกขนาดเองได้หากต้องการ)";
    combinedPDoseRangeHint.textContent = pTier
      ? `ช่วงที่แนะนำ (${pTier.label}, ${species === "dog" ? "สุนัข" : "แมว"}): ${pTier.doseLow} - ${pTier.doseHigh} mmol/kg/hr`
      : "";

    if (!pTier) {
      combinedHintEl.hidden = true;
      combinedResultEl.hidden = false;
      combinedResultEl.innerHTML = `
        <div class="result-note">ระดับฟอสฟอรัส ${p} mg/dL อยู่ในหรือเกินช่วงที่ตารางนี้ครอบคลุม ไม่จำเป็นต้องให้สายที่ 2 (Dipotassium Phosphate) —
        หากยังต้องการแก้ไข Potassium เพียงอย่างเดียว ให้ใช้เครื่องคำนวณ "แก้ไขภาวะโพแทสเซียมต่ำ" ด้านบนแทน</div>
      `;
      return;
    }

    const kclRate = parseFloat(combinedKclRateInput.value);
    const phosRate = parseFloat(combinedPhosRateInput.value);
    const kDoseInput = parseFloat(combinedKDoseInput.value);
    const pDoseInput = parseFloat(combinedPDoseInput.value);

    if (
      isNaN(kclRate) || kclRate <= 0 || isNaN(phosRate) || phosRate <= 0 ||
      isNaN(pDoseInput) || pDoseInput <= 0
    ) {
      combinedResultEl.hidden = true;
      combinedHintEl.hidden = false;
      return;
    }

    combinedHintEl.hidden = true;
    combinedResultEl.hidden = false;

    const kclBagMl = parseFloat(combinedKclBagSelect.value);
    const phosBagMl = parseFloat(combinedPhosBagSelect.value);

    // สายที่ 2: Dipotassium Phosphate — ให้ Phosphorus ตามขนาดที่กรอก โดย Potassium ติดมาด้วยเสมอ
    const totalMmol = pDoseInput * weightKg;
    const concMmol = totalMmol / phosRate;
    const phosVolume = (concMmol * phosBagMl) / DIPOTASSIUM_PHOSPHATE.phosphorusMmolPerMl;
    const pOutOfRange = pDoseInput < pTier.doseLow || pDoseInput > pTier.doseHigh;

    // K+ delivery RATE from this line depends only on the fixed K:P ratio of the drug (1 mEq
    // K+ per 0.5 mmol P = 2 mEq K+ per mmol P) applied to the phosphorus delivery rate — not on
    // the mEq content of the volume mixed into the bag, which also depends on rate/bag size and
    // does not by itself represent an hourly rate.
    const K_PER_P_RATIO = DIPOTASSIUM_PHOSPHATE.potassiumMeqPerMl / DIPOTASSIUM_PHOSPHATE.phosphorusMmolPerMl;
    const kFromPhos = totalMmol * K_PER_P_RATIO;

    let line1Html;
    let combinedK;
    if (isNaN(kDoseInput) || kDoseInput <= 0) {
      // ยังไม่ได้กรอกขนาด KCl ที่ต้องการ — แสดงเฉพาะสิ่งที่ได้จากสายที่ 2 ไปก่อน
      combinedK = kFromPhos;
      line1Html = `<div class="result-note">กรอกขนาด KCl ที่ต้องการให้ (mEq/kg/hr) ด้านบน เพื่อคำนวณปริมาณที่ต้องเติมในสายที่ 1</div>`;
    } else {
      const kOutOfRangeNote = kTier
        ? (kDoseInput < kTier.doseLow || kDoseInput > kTier.doseHigh
            ? `<div class="result-note">ขนาด KCl ที่กรอก (${kDoseInput} mEq/kg/hr) อยู่นอกช่วงที่ Table 11 แนะนำ (${kTier.doseLow} - ${kTier.doseHigh} mEq/kg/hr) สำหรับระดับ K+ นี้</div>`
            : "")
        : `<div class="result-note">ระดับ K+ อยู่ในช่วงปกติ/สูง ไม่เข้าเกณฑ์ hypokalemia ตาม Table 11 แต่จะคำนวณตามขนาดที่กรอกเอง</div>`;

      const totalKNeeded = kDoseInput * weightKg;
      const remainingK = Math.max(0, totalKNeeded - kFromPhos);
      combinedK = remainingK + kFromPhos;

      if (remainingK <= 0) {
        line1Html = `
          ${kOutOfRangeNote}
          <div class="result-note">Potassium ที่ได้รับจากสายที่ 2 (${round(kFromPhos, 3)} mEq/hr) เพียงพอหรือเกินขนาด KCl ที่กรอกไว้
          (${round(totalKNeeded, 3)} mEq/hr) แล้ว จึง<strong>ไม่จำเป็นต้องเติม KCl ในสายที่ 1 เพิ่ม</strong> —
          อาจให้สายที่ 1 เป็นสารน้ำเปล่า หรือปรับลดขนาด Phosphorus ที่กรอก (หากยังอยู่ในช่วงที่ยอมรับได้) เพื่อลดปริมาณ Potassium ที่ได้รับ</div>
        `;
      } else {
        const concKcl = remainingK / kclRate;
        const kclVolume = (concKcl * kclBagMl) / KCL_CONCENTRATE_MEQ_PER_ML;
        line1Html = `
          ${kOutOfRangeNote}
          <div class="result-grid">
            <div class="result-item">
              <span class="label">Potassium ที่ยังขาด (หลังหักจากสายที่ 2 แล้ว)</span>
              <span class="value">${round(remainingK, 3)} mEq/hr</span>
            </div>
            <div class="result-item">
              <span class="label">ปริมาณ KCl เข้มข้น (2 mEq/mL) ที่ต้องเติมในถุง ${kclBagMl} mL (อัตรา ${kclRate} mL/hr)</span>
              <span class="value">${round(kclVolume, 2)} mL</span>
            </div>
          </div>
        `;
      }
    }

    const combinedKPerKg = combinedK / weightKg;
    const exceedsSafety = combinedKPerKg > KCL_SAFETY_LIMIT_MEQ_PER_KG_HR;

    combinedResultEl.innerHTML = `
      <div class="result-rate">
        <strong>ระดับ K+:</strong> ${k} mEq/L ${kTier ? `(${kTier.label})` : "(ปกติ/สูง — ไม่เข้าเกณฑ์ hypokalemia)"} &nbsp;|&nbsp;
        <strong>ระดับ P:</strong> ${p} mg/dL (${pTier.label}, ${species === "dog" ? "สุนัข" : "แมว"})
      </div>

      <h4>สายที่ 2: Dipotassium Phosphate</h4>
      ${pOutOfRange ? `<div class="result-note">ขนาด Phosphorus ที่กรอก (${pDoseInput} mmol/kg/hr) อยู่นอกช่วงที่แนะนำ (${pTier.doseLow} - ${pTier.doseHigh} mmol/kg/hr) สำหรับระดับ P นี้</div>` : ""}
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Phosphorus ที่ต้องได้รับ (${round(pDoseInput, 3)} mmol/kg/hr)</span>
          <span class="value">${round(totalMmol, 3)} mmol/hr</span>
        </div>
        <div class="result-item">
          <span class="label">ปริมาณที่ต้องเติมในถุง ${phosBagMl} mL (อัตรา ${phosRate} mL/hr)</span>
          <span class="value">${round(phosVolume, 2)} mL</span>
        </div>
        <div class="result-item">
          <span class="label">Potassium ที่ติดมาจากสายนี้</span>
          <span class="value">${round(kFromPhos, 3)} mEq/hr</span>
        </div>
      </div>

      <h4>สายที่ 1: KCl</h4>
      ${line1Html}

      <h4>สรุปรวมทั้งสองสาย</h4>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Potassium รวมที่ได้รับจริง (สายที่ 1 + สายที่ 2)</span>
          <span class="value">${round(combinedK, 3)} mEq/hr
            (${round(combinedKPerKg, 3)} mEq/kg/hr)</span>
        </div>
      </div>
      ${exceedsSafety
        ? `<div class="result-out-of-range">คำเตือน: Potassium รวมที่ได้รับจากทั้งสองสายเกินขีดจำกัดความปลอดภัยทั่วไป (${KCL_SAFETY_LIMIT_MEQ_PER_KG_HR} mEq/kg/hr) —
          พิจารณาเพิ่มอัตราสารน้ำหรือขนาดถุงของสายใดสายหนึ่งเพื่อลดความเข้มข้น</div>`
        : ""}

      <div class="result-note">
        <strong>ข้อควรระวัง:</strong> สายที่ 2 ต้องผสมในสารละลายที่ไม่มีแคลเซียมเท่านั้น (ห้ามผสมกับสารน้ำที่มีแคลเซียม เช่น LRS เพราะอาจตกตะกอน)
        ห้ามให้ทั้งสองสายแบบ bolus ต้องกลับถุงคว่ำ-หงายผสมให้เข้ากันดีก่อนให้เสมอ ใช้ fluid pump/syringe pump ควบคุมอัตราของทั้งสองสายอย่างเคร่งครัด
        ตรวจระดับ K+ และ Phosphorus ซ้ำทุก 8-12 ชั่วโมง และคำนวณใหม่ทุกครั้งหากเปลี่ยนอัตราสารน้ำของสายใดสายหนึ่ง
      </div>
      <div class="result-source">
        ขนาด KCl จาก Table 11 "Guidelines for Potassium Supplementation in Fluids" — 2024 AAHA Fluid Therapy Guidelines for Dogs and Cats, p.148 |
        ขนาด Phosphorus และยาที่ใช้ (Dipotassium Phosphate 1.74g/20mL) — ผู้ใช้ให้ข้อมูลโดยตรงจากความรู้ทางคลินิก
      </div>
    `;
  }

  combinedKInput.addEventListener("input", refreshCombined);
  combinedPInput.addEventListener("input", refreshCombined);
  combinedKDoseInput.addEventListener("input", refreshCombined);
  combinedPDoseInput.addEventListener("input", refreshCombined);
  combinedKclRateInput.addEventListener("input", refreshCombined);
  combinedKclBagSelect.addEventListener("change", refreshCombined);
  combinedPhosRateInput.addEventListener("input", refreshCombined);
  combinedPhosBagSelect.addEventListener("change", refreshCombined);
  weightKgInput.addEventListener("input", refreshCombined);
  weightLbInput.addEventListener("input", refreshCombined);
  document.addEventListener("species-change", refreshCombined);

  refreshCombined();
})();
