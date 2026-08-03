(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");
  const weightLbInput = document.getElementById("weight-lb");

  const serumKInput = document.getElementById("serum-k-input");
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
    const fluidRateMlHr = parseFloat(rateInput.value);

    if (weightKg === null || isNaN(k) || k <= 0 || isNaN(fluidRateMlHr) || fluidRateMlHr <= 0) {
      resultEl.hidden = true;
      hintEl.hidden = false;
      return;
    }

    const tier = findTier(k);
    if (!tier) {
      hintEl.hidden = true;
      resultEl.hidden = false;
      resultEl.innerHTML = `
        <div class="result-note">ระดับโพแทสเซียม ${k} mEq/L อยู่ในหรือเกินช่วงปกติ (ไม่เข้าเกณฑ์ hypokalemia ในตาราง Table 11 ซึ่งครอบคลุมถึง 5.0 mEq/L) โปรดประเมินสาเหตุอื่นหากมีอาการทางคลินิก</div>
      `;
      return;
    }

    hintEl.hidden = true;
    resultEl.hidden = false;

    const bagSizeMl = parseFloat(bagSizeSelect.value);

    // Table 11 gives the KCl dose directly as mEq/kg/hr (a CRI rate). Given the actual fluid rate
    // the CRI will run at, back-calculate the concentration (mEq/mL) the fluid bag needs to be
    // mixed to, then how much 2 mEq/mL KCl concentrate to draw up into the chosen bag size.
    const totalMeqPerHrLow = tier.doseLow * weightKg;
    const totalMeqPerHrHigh = tier.doseHigh * weightKg;

    const concMeqPerMlLow = totalMeqPerHrLow / fluidRateMlHr;
    const concMeqPerMlHigh = totalMeqPerHrHigh / fluidRateMlHr;

    const kclVolumeLow = (concMeqPerMlLow * bagSizeMl) / KCL_CONCENTRATE_MEQ_PER_ML;
    const kclVolumeHigh = (concMeqPerMlHigh * bagSizeMl) / KCL_CONCENTRATE_MEQ_PER_ML;

    function fmtRange(low, high, decimals) {
      const l = round(low, decimals);
      const h = round(high, decimals);
      return l === h ? String(l) : `${l} - ${h}`;
    }

    resultEl.innerHTML = `
      <div class="result-rate">
        <strong>ระดับ K+:</strong> ${k} mEq/L (${tier.label}) &nbsp;|&nbsp;
        <strong>ขนาด KCl ตาม Table 11:</strong> ${fmtRange(tier.doseLow, tier.doseHigh, 2)} mEq/kg/hr
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">KCl ที่ผู้ป่วยต้องได้รับ</span>
          <span class="value">${fmtRange(totalMeqPerHrLow, totalMeqPerHrHigh, 3)} mEq/hr</span>
        </div>
        <div class="result-item">
          <span class="label">ที่อัตราสารน้ำ ${fluidRateMlHr} mL/hr</span>
          <span class="value">${fmtRange(concMeqPerMlLow * 1000, concMeqPerMlHigh * 1000, 1)} mEq/L</span>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">ปริมาณ KCl เข้มข้น (2 mEq/mL) ที่ต้องเติมในถุง ${bagSizeMl} mL</span>
          <span class="value">${fmtRange(kclVolumeLow, kclVolumeHigh, 2)} mL</span>
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
  bagSizeSelect.addEventListener("change", refresh);
  rateInput.addEventListener("input", refresh);

  refresh();

  // ---- Phosphorus (Dipotassium Phosphate) correction ----
  const serumPInput = document.getElementById("serum-p-input");
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

  function fmtRange(low, high, decimals) {
    const l = round(low, decimals);
    const h = round(high, decimals);
    return l === h ? String(l) : `${l} - ${h}`;
  }

  function refreshPhosphorus() {
    const weightKg = currentWeightKg();
    const p = parseFloat(serumPInput.value);
    const fluidRateMlHr = parseFloat(pRateInput.value);

    if (weightKg === null || isNaN(p) || p <= 0 || isNaN(fluidRateMlHr) || fluidRateMlHr <= 0) {
      pResultEl.hidden = true;
      pHintEl.hidden = false;
      return;
    }

    const species = currentSpecies();
    const tier = findPhosphorusTier(species, p);
    if (!tier) {
      pHintEl.hidden = true;
      pResultEl.hidden = false;
      pResultEl.innerHTML = `
        <div class="result-note">ระดับฟอสฟอรัส ${p} mg/dL อยู่ในหรือเกินช่วงที่ตารางนี้ครอบคลุม (${species === "dog" ? "สุนัข ≤ 2.9" : "แมว ≤ 2.9"} mg/dL) โปรดประเมินสาเหตุอื่นหากมีอาการทางคลินิก</div>
      `;
      return;
    }

    pHintEl.hidden = true;
    pResultEl.hidden = false;

    const bagSizeMl = parseFloat(pBagSizeSelect.value);

    const totalMmolPerHrLow = tier.doseLow * weightKg;
    const totalMmolPerHrHigh = tier.doseHigh * weightKg;

    const concMmolPerMlLow = totalMmolPerHrLow / fluidRateMlHr;
    const concMmolPerMlHigh = totalMmolPerHrHigh / fluidRateMlHr;

    const volumeLow = (concMmolPerMlLow * bagSizeMl) / DIPOTASSIUM_PHOSPHATE.phosphorusMmolPerMl;
    const volumeHigh = (concMmolPerMlHigh * bagSizeMl) / DIPOTASSIUM_PHOSPHATE.phosphorusMmolPerMl;

    // Dipotassium Phosphate delivers 1 mEq K+ per mL alongside the phosphorus — the same
    // volume drawn up for phosphorus correction also determines how much extra potassium
    // the patient receives, which must be checked against the same KCl safety ceiling.
    const kFromVolumeLow = volumeLow * DIPOTASSIUM_PHOSPHATE.potassiumMeqPerMl;
    const kFromVolumeHigh = volumeHigh * DIPOTASSIUM_PHOSPHATE.potassiumMeqPerMl;
    const kMeqPerHrLow = kFromVolumeLow;
    const kMeqPerHrHigh = kFromVolumeHigh;
    const kMeqPerKgHrLow = kMeqPerHrLow / weightKg;
    const kMeqPerKgHrHigh = kMeqPerHrHigh / weightKg;
    const exceedsKSafety = kMeqPerKgHrHigh > KCL_SAFETY_LIMIT_MEQ_PER_KG_HR;

    pResultEl.innerHTML = `
      <div class="result-rate">
        <strong>ระดับ P:</strong> ${p} mg/dL (${tier.label}, ${species === "dog" ? "สุนัข" : "แมว"}) &nbsp;|&nbsp;
        <strong>ขนาด Phosphorus:</strong> ${fmtRange(tier.doseLow, tier.doseHigh, 3)} mmol/kg/hr
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Phosphorus ที่ผู้ป่วยต้องได้รับ</span>
          <span class="value">${fmtRange(totalMmolPerHrLow, totalMmolPerHrHigh, 3)} mmol/hr</span>
        </div>
        <div class="result-item">
          <span class="label">ปริมาณ Dipotassium Phosphate ที่ต้องเติมในถุง ${bagSizeMl} mL</span>
          <span class="value">${fmtRange(volumeLow, volumeHigh, 2)} mL</span>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Potassium ที่ได้รับร่วมด้วยจากยานี้</span>
          <span class="value">${fmtRange(kMeqPerHrLow, kMeqPerHrHigh, 3)} mEq/hr
            (${fmtRange(kMeqPerKgHrLow, kMeqPerKgHrHigh, 3)} mEq/kg/hr)</span>
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
  pBagSizeSelect.addEventListener("change", refreshPhosphorus);
  pRateInput.addEventListener("input", refreshPhosphorus);
  weightKgInput.addEventListener("input", refreshPhosphorus);
  weightLbInput.addEventListener("input", refreshPhosphorus);
  document.addEventListener("species-change", refreshPhosphorus);

  refreshPhosphorus();

  // ---- Combined correction: line 1 = KCl, line 2 = Dipotassium Phosphate ----
  const combinedKInput = document.getElementById("combined-k-input");
  const combinedPInput = document.getElementById("combined-p-input");
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
    const kclRate = parseFloat(combinedKclRateInput.value);
    const phosRate = parseFloat(combinedPhosRateInput.value);

    if (
      weightKg === null || isNaN(k) || k <= 0 || isNaN(p) || p <= 0 ||
      isNaN(kclRate) || kclRate <= 0 || isNaN(phosRate) || phosRate <= 0
    ) {
      combinedResultEl.hidden = true;
      combinedHintEl.hidden = false;
      return;
    }

    combinedHintEl.hidden = true;
    combinedResultEl.hidden = false;

    const species = currentSpecies();
    const kTier = findTier(k);
    const pTier = findPhosphorusTier(species, p);

    if (!pTier) {
      combinedResultEl.innerHTML = `
        <div class="result-note">ระดับฟอสฟอรัส ${p} mg/dL อยู่ในหรือเกินช่วงที่ตารางนี้ครอบคลุม ไม่จำเป็นต้องให้สายที่ 2 (Dipotassium Phosphate) —
        หากยังต้องการแก้ไข Potassium เพียงอย่างเดียว ให้ใช้เครื่องคำนวณ "แก้ไขภาวะโพแทสเซียมต่ำ" ด้านบนแทน</div>
      `;
      return;
    }

    const kclBagMl = parseFloat(combinedKclBagSelect.value);
    const phosBagMl = parseFloat(combinedPhosBagSelect.value);

    // สายที่ 2: Dipotassium Phosphate — ให้ Phosphorus ตามระดับที่วัดได้ โดย Potassium ติดมาด้วยเสมอ
    const totalMmolLow = pTier.doseLow * weightKg;
    const totalMmolHigh = pTier.doseHigh * weightKg;
    const concMmolLow = totalMmolLow / phosRate;
    const concMmolHigh = totalMmolHigh / phosRate;
    const phosVolumeLow = (concMmolLow * phosBagMl) / DIPOTASSIUM_PHOSPHATE.phosphorusMmolPerMl;
    const phosVolumeHigh = (concMmolHigh * phosBagMl) / DIPOTASSIUM_PHOSPHATE.phosphorusMmolPerMl;
    const kFromPhosLow = phosVolumeLow * DIPOTASSIUM_PHOSPHATE.potassiumMeqPerMl;
    const kFromPhosHigh = phosVolumeHigh * DIPOTASSIUM_PHOSPHATE.potassiumMeqPerMl;

    // สายที่ 1: KCl — เติมเฉพาะส่วนของ Potassium ที่ยังขาดหลังหักจากที่ได้รับทางสายที่ 2 แล้ว
    // เพื่อไม่ให้ผู้ป่วยได้รับ Potassium รวมเกินความจำเป็น
    const totalKNeededLow = kTier ? kTier.doseLow * weightKg : 0;
    const totalKNeededHigh = kTier ? kTier.doseHigh * weightKg : 0;

    // Pair the lowest "still needed" case with the highest phosphate-K estimate (and vice versa)
    // so the displayed range stays ascending — the phosphate line's own dose range means its K+
    // contribution isn't monotonic with the potassium tier's range.
    const remainingKLow = Math.max(0, totalKNeededLow - kFromPhosHigh);
    const remainingKHigh = Math.max(0, totalKNeededHigh - kFromPhosLow);

    const concKclLow = remainingKLow / kclRate;
    const concKclHigh = remainingKHigh / kclRate;
    const kclVolumeLow = (concKclLow * kclBagMl) / KCL_CONCENTRATE_MEQ_PER_ML;
    const kclVolumeHigh = (concKclHigh * kclBagMl) / KCL_CONCENTRATE_MEQ_PER_ML;

    const combinedKLow = remainingKLow + kFromPhosLow;
    const combinedKHigh = remainingKHigh + kFromPhosHigh;
    const combinedKPerKgLow = combinedKLow / weightKg;
    const combinedKPerKgHigh = combinedKHigh / weightKg;
    const exceedsSafety = combinedKPerKgHigh > KCL_SAFETY_LIMIT_MEQ_PER_KG_HR;

    let line1Html;
    if (!kTier) {
      line1Html = `
        <div class="result-note">ระดับ K+ อยู่ในช่วงปกติ/สูง ไม่มีข้อบ่งชี้ให้ KCl เพิ่มเติมในสายที่ 1 แต่ผู้ป่วยจะยังได้รับ Potassium
        จากสายที่ 2 ด้วย (${fmtRange(kFromPhosLow, kFromPhosHigh, 3)} mEq/hr) ควรติดตามระดับ K+ ระหว่างให้ยา</div>
      `;
    } else if (remainingKHigh <= 0) {
      line1Html = `
        <div class="result-note">Potassium ที่ได้รับจากสายที่ 2 เพียงพอหรือเกินความต้องการ Potassium ที่ขาด
        (${fmtRange(totalKNeededLow, totalKNeededHigh, 3)} mEq/hr) แล้ว จึง<strong>ไม่จำเป็นต้องเติม KCl ในสายที่ 1 เพิ่ม</strong> —
        อาจให้สายที่ 1 เป็นสารน้ำเปล่า หรือปรับลดอัตรา/เพิ่มขนาดถุงของสายที่ 2 หากต้องการลดปริมาณ Potassium ที่ได้รับ</div>
      `;
    } else {
      line1Html = `
        <div class="result-grid">
          <div class="result-item">
            <span class="label">Potassium ที่ยังขาด (หลังหักจากสายที่ 2 แล้ว)</span>
            <span class="value">${fmtRange(remainingKLow, remainingKHigh, 3)} mEq/hr</span>
          </div>
          <div class="result-item">
            <span class="label">ปริมาณ KCl เข้มข้น (2 mEq/mL) ที่ต้องเติมในถุง ${kclBagMl} mL (อัตรา ${kclRate} mL/hr)</span>
            <span class="value">${fmtRange(kclVolumeLow, kclVolumeHigh, 2)} mL</span>
          </div>
        </div>
      `;
    }

    combinedResultEl.innerHTML = `
      <div class="result-rate">
        <strong>ระดับ K+:</strong> ${k} mEq/L ${kTier ? `(${kTier.label})` : "(ปกติ/สูง — ไม่เข้าเกณฑ์ hypokalemia)"} &nbsp;|&nbsp;
        <strong>ระดับ P:</strong> ${p} mg/dL (${pTier.label}, ${species === "dog" ? "สุนัข" : "แมว"})
      </div>

      <h4>สายที่ 2: Dipotassium Phosphate</h4>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Phosphorus ที่ต้องได้รับ</span>
          <span class="value">${fmtRange(totalMmolLow, totalMmolHigh, 3)} mmol/hr</span>
        </div>
        <div class="result-item">
          <span class="label">ปริมาณที่ต้องเติมในถุง ${phosBagMl} mL (อัตรา ${phosRate} mL/hr)</span>
          <span class="value">${fmtRange(phosVolumeLow, phosVolumeHigh, 2)} mL</span>
        </div>
        <div class="result-item">
          <span class="label">Potassium ที่ติดมาจากสายนี้</span>
          <span class="value">${fmtRange(kFromPhosLow, kFromPhosHigh, 3)} mEq/hr</span>
        </div>
      </div>

      <h4>สายที่ 1: KCl</h4>
      ${line1Html}

      <h4>สรุปรวมทั้งสองสาย</h4>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Potassium รวมที่ได้รับจริง (สายที่ 1 + สายที่ 2)</span>
          <span class="value">${fmtRange(combinedKLow, combinedKHigh, 3)} mEq/hr
            (${fmtRange(combinedKPerKgLow, combinedKPerKgHigh, 3)} mEq/kg/hr)</span>
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
  combinedKclRateInput.addEventListener("input", refreshCombined);
  combinedKclBagSelect.addEventListener("change", refreshCombined);
  combinedPhosRateInput.addEventListener("input", refreshCombined);
  combinedPhosBagSelect.addEventListener("change", refreshCombined);
  weightKgInput.addEventListener("input", refreshCombined);
  weightLbInput.addEventListener("input", refreshCombined);
  document.addEventListener("species-change", refreshCombined);

  refreshCombined();
})();
