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
})();
