(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");
  const modeButtons = document.querySelectorAll("[data-sb-mode]");
  const generalFields = document.getElementById("sb-general-fields");
  const cpaFields = document.getElementById("sb-cpa-fields");

  const beInput = document.getElementById("sb-be-input");
  const phInput = document.getElementById("sb-ph-input");
  const hco3Input = document.getElementById("sb-hco3-input");

  const cpaKInput = document.getElementById("sb-cpa-k-input");
  const cpaPhInput = document.getElementById("sb-cpa-ph-input");

  const resultEl = document.getElementById("sb-result");

  const fractionButtons = document.querySelectorAll("[data-sb-fraction]");

  const state = { mode: "general", fraction: "quarter" };

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function currentWeightKg() {
    const val = parseFloat(weightKgInput.value);
    return isNaN(val) || val <= 0 ? null : val;
  }

  function mlFromMeq(meq) {
    return meq / SODIUM_BICARB_MEQ_PER_ML;
  }

  function cautionListHtml(items) {
    return `<ul class="anemia-ddx-list">${items.map((c) => `<li>${c}</li>`).join("")}</ul>`;
  }

  function sideEffectListHtml(items) {
    return `<ul class="anemia-ddx-list">${items.map((s) =>
      `<li><strong>${s.name}</strong> — <span>${s.note}</span></li>`
    ).join("")}</ul>`;
  }

  function respAcidosisWarningHtml() {
    const w = SODIUM_BICARB_RESP_ACIDOSIS_WARNING;
    return `
      <div class="warning-text">
        <strong>${w.title}</strong><br>
        ${w.intro}<br><br>
        ${w.mechanism}<br><br>
        ${w.contraindications}<br><br>
        ${w.mixed}
      </div>
    `;
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.mode = btn.dataset.sbMode;
      generalFields.hidden = state.mode !== "general";
      cpaFields.hidden = state.mode !== "cpa";
      refresh();
    });
  });

  fractionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      fractionButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.fraction = btn.dataset.sbFraction;
      refresh();
    });
  });

  function refresh() {
    const weightKg = currentWeightKg();
    if (weightKg === null) {
      resultEl.hidden = true;
      return;
    }

    let mainHtml = "";

    if (state.mode === "general") {
      const be = parseFloat(beInput.value);
      if (isNaN(be)) {
        resultEl.hidden = true;
        return;
      }
      const deficit = weightKg * Math.abs(be) * SODIUM_BICARB_DEFICIT_FACTOR;
      const fraction = state.fraction === "third"
        ? SODIUM_BICARB_STARTING_FRACTION.high
        : SODIUM_BICARB_STARTING_FRACTION.low;
      const fractionLabel = state.fraction === "third" ? "1/3" : "1/4";
      const startDose = deficit * fraction;
      const startVol = mlFromMeq(startDose);

      // ส่วนที่เหลือของ deficit หลังให้ขนาดเริ่มต้นไปแล้ว — ไม่ได้ให้ต่อทันที แต่ไว้เป็นแนวทาง
      // คร่าวๆ ว่าเหลืออีกเท่าไรหากประเมินซ้ำแล้วยังต้องแก้ไขภาวะกรดต่อ
      const remaining = deficit - startDose;
      const remainingVol = mlFromMeq(remaining);

      const ph = parseFloat(phInput.value);
      const hco3 = parseFloat(hco3Input.value);
      let thresholdHtml = "";
      if (!isNaN(ph) || !isNaN(hco3)) {
        const meetsThreshold =
          (!isNaN(ph) && ph <= SODIUM_BICARB_CONSIDER_THRESHOLD.ph) ||
          (!isNaN(hco3) && hco3 <= SODIUM_BICARB_CONSIDER_THRESHOLD.hco3);
        thresholdHtml = `
          <div class="result-note">
            ${meetsThreshold
              ? `เข้าเกณฑ์ที่การศึกษานี้ระบุว่าอาจพิจารณาให้ SB ได้ (pH ≤ ${SODIUM_BICARB_CONSIDER_THRESHOLD.ph} และ/หรือ HCO3 ≤ ${SODIUM_BICARB_CONSIDER_THRESHOLD.hco3} mmol/L) — หากได้รักษาสาเหตุและให้สารน้ำ crystalloid ที่เหมาะสมแล้วภาวะกรดยังคงรุนแรงต่อเนื่อง`
              : `ยังไม่เข้าเกณฑ์ที่การศึกษานี้ระบุไว้ (pH ≤ ${SODIUM_BICARB_CONSIDER_THRESHOLD.ph} และ/หรือ HCO3 ≤ ${SODIUM_BICARB_CONSIDER_THRESHOLD.hco3} mmol/L) — ควรพิจารณาการรักษาสาเหตุและให้สารน้ำที่เหมาะสมก่อน`}
          </div>
        `;
      }

      mainHtml = `
        <div class="result-grid">
          <div class="result-item">
            <span class="label">Bicarbonate Deficit ทั้งหมด</span>
            <span class="value">${round(deficit, 2)} mEq</span>
          </div>
          <div class="result-item">
            <span class="label">ขนาดเริ่มต้นที่จะให้ (${fractionLabel} ของ deficit) จากขวด ${SODIUM_BICARB_STOCK.totalMeq} mEq/${SODIUM_BICARB_STOCK.totalMl} mL</span>
            <span class="value">${round(startVol, 2)} mL
              <span style="font-size:0.7em; font-weight:400;">(${round(startDose, 2)} mEq)</span>
            </span>
          </div>
          <div class="result-item">
            <span class="label">ปริมาณ SB ที่เหลือ (หากประเมินซ้ำแล้วยังต้องแก้ไข deficit ส่วนที่เหลือต่อ)</span>
            <span class="value">${round(remainingVol, 2)} mL
              <span style="font-size:0.7em; font-weight:400;">(${round(remaining, 2)} mEq)</span>
            </span>
          </div>
        </div>
        ${thresholdHtml}
        <div class="result-note">
          แนะนำเจือจาง SB ก่อนให้เสมอ (เช่น เจือจาง 1:6 กับน้ำกลั่น/สารน้ำที่เหมาะสม เพื่อให้ความเข้มข้นโซเดียมใกล้เคียงผู้ป่วย)
          แล้วให้ทางหลอดเลือดดำนาน ${SODIUM_BICARB_INFUSION_HOURS.low}-${SODIUM_BICARB_INFUSION_HOURS.high} ชั่วโมง จากนั้นประเมินซ้ำ (blood gas)
          ก่อนพิจารณาให้เพิ่มเติม — แหล่งข้อมูล [1]
        </div>
      `;
    } else {
      const dose = weightKg * SODIUM_BICARB_CPA_DOSE_MEQ_PER_KG;
      const vol = mlFromMeq(dose);

      const k = parseFloat(cpaKInput.value);
      const ph = parseFloat(cpaPhInput.value);
      let eligibilityHtml = "";
      if (!isNaN(k) || !isNaN(ph)) {
        const meetsK = !isNaN(k) && k > SODIUM_BICARB_CPA_K_THRESHOLD;
        const meetsPh = !isNaN(ph) && ph < SODIUM_BICARB_CPA_PH_THRESHOLD;
        const eligible = meetsK && meetsPh;
        eligibilityHtml = `
          <div class="result-note">
            ${eligible
              ? `เข้าเกณฑ์ตามแนวทาง RECOVER 2024 (K+ > ${SODIUM_BICARB_CPA_K_THRESHOLD} mmol/L และ pH < ${SODIUM_BICARB_CPA_PH_THRESHOLD} ที่วัดได้ก่อน/ระหว่าง CPA)`
              : `RECOVER 2024 แนะนำให้ SB ระหว่าง CPA เฉพาะกรณีมี hyperkalemia (K+ > ${SODIUM_BICARB_CPA_K_THRESHOLD} mmol/L) ร่วมกับ pH < ${SODIUM_BICARB_CPA_PH_THRESHOLD} ที่วัดได้ก่อน/ระหว่าง CPA เท่านั้น — จากข้อมูลที่กรอก ยังไม่เข้าเกณฑ์นี้`}
          </div>
        `;
      } else {
        eligibilityHtml = `
          <div class="result-note">
            RECOVER 2024 แนะนำให้ SB ระหว่าง CPA เฉพาะกรณีมี hyperkalemia (K+ > ${SODIUM_BICARB_CPA_K_THRESHOLD} mmol/L)
            ร่วมกับ pH < ${SODIUM_BICARB_CPA_PH_THRESHOLD} ที่วัดได้ก่อน/ระหว่าง CPA — กรอก K+ และ/หรือ pH เพื่อตรวจสอบเกณฑ์
          </div>
        `;
      }

      mainHtml = `
        <div class="result-grid">
          <div class="result-item">
            <span class="label">ขนาดยา CPA (${SODIUM_BICARB_CPA_DOSE_MEQ_PER_KG} mEq/kg)</span>
            <span class="value">${round(dose, 2)} mEq</span>
          </div>
          <div class="result-item">
            <span class="label">ปริมาณที่ต้องดึง (จากขวด ${SODIUM_BICARB_STOCK.totalMeq} mEq/${SODIUM_BICARB_STOCK.totalMl} mL)</span>
            <span class="value">${round(vol, 2)} mL</span>
          </div>
        </div>
        ${eligibilityHtml}
        <div class="result-note">ให้ทาง IV หรือ IO ระหว่าง CPA — แหล่งข้อมูล [1] (อ้างอิง RECOVER 2024, Fletcher et al.)</div>
      `;
    }

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <h3>ผลการคำนวณ Sodium Bicarbonate</h3>
      ${mainHtml}
      ${respAcidosisWarningHtml()}
      <h4>ผลข้างเคียงที่ควรเฝ้าระวัง</h4>
      ${sideEffectListHtml(SODIUM_BICARB_SIDE_EFFECTS)}
      <h4>ข้อควรระวัง</h4>
      ${cautionListHtml(SODIUM_BICARB_CAUTIONS)}
      <div class="result-source">
        ที่มา: [1] Hoover L, Oyama MA, Reineke EL. "Clinical use of sodium bicarbonate in small animals:
        indications, electrolyte changes and survival outcome." Journal of Small Animal Practice (2026),
        DOI: 10.1111/jsap.70174 (เอกสารที่ผู้ใช้แนบมา) | ความเข้มข้นยาที่ใช้ในคลินิก (ผู้ใช้ระบุ):
        ${SODIUM_BICARB_STOCK.totalMeq} mEq/${SODIUM_BICARB_STOCK.totalMl} mL — ใช้เป็นตัวช่วยประเมินเบื้องต้นเท่านั้น
        ไม่ทดแทนดุลยพินิจทางคลินิก
      </div>
    `;
  }

  weightKgInput.addEventListener("input", refresh);
  [beInput, phInput, hco3Input, cpaKInput, cpaPhInput].forEach((el) => {
    el.addEventListener("input", refresh);
  });
  document.addEventListener("species-change", refresh);

  refresh();
})();
