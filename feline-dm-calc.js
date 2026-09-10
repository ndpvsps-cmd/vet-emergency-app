(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");
  const modeButtons = document.querySelectorAll("[data-dm-mode]");
  const healthyFields = document.getElementById("dm-healthy-fields");
  const dkaFields = document.getElementById("dm-dka-fields");

  const sglt2iDosesEl = document.getElementById("dm-sglt2i-doses");
  const screenEl = document.getElementById("dm-sglt2i-screen");
  const screenResultEl = document.getElementById("dm-sglt2i-screen-result");
  const dcsFieldsEl = document.getElementById("dm-dcs-fields");
  const dcsResultEl = document.getElementById("dm-dcs-result");

  const bgInput = document.getElementById("dm-bg-input");
  const bhbInput = document.getElementById("dm-bhb-input");
  const phInput = document.getElementById("dm-ph-input");
  const ketoResultEl = document.getElementById("dm-keto-result");
  const dkaDosesEl = document.getElementById("dm-dka-doses");

  const referenceEl = document.getElementById("dm-reference-content");
  const planCardPanel = document.getElementById("dm-plan-card-panel");
  const planCardEl = document.getElementById("dm-dka-plan-card");
  const printPlanBtn = document.getElementById("dm-print-plan-btn");
  const patientNameInput = document.getElementById("patient-name-input");

  const state = { mode: "healthy", dcs: {}, dcsEditingKey: null };

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function currentWeightKg() {
    const val = parseFloat(weightKgInput.value);
    return isNaN(val) || val <= 0 ? null : val;
  }

  function listHtml(items) {
    return `<ul class="anemia-ddx-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  }

  // ---- SGLT2i weight-based dosing ----
  function renderSglt2iDoses() {
    const weightKg = currentWeightKg();
    sglt2iDosesEl.innerHTML = `
      <div class="result-grid">
        ${DM_SGLT2I_DRUGS.map((d) => {
          let value = d.dose;
          if (d.perKg && weightKg !== null) {
            const mg = round(1 * weightKg, 2);
            value = `${d.dose} → ${mg} mg/วัน`;
          } else if (d.perKg && weightKg === null) {
            value = `${d.dose} (กรอกน้ำหนักเพื่อคำนวณ)`;
          }
          return `<div class="result-item"><span class="label">${d.drug}</span><span class="value" style="font-size:0.95rem;">${value}</span></div>`;
        }).join("")}
      </div>
      ${listHtml(DM_SGLT2I_NOTES)}
    `;
  }

  // ---- SGLT2i screening checklist ----
  function renderScreen() {
    screenEl.innerHTML = DM_SGLT2I_SCREEN.map((s) => `
      <label class="checkbox-row" style="margin:6px 0;">
        <input type="checkbox" id="dm-screen-${s.key}"> ${s.label}
      </label>
    `).join("") + `<div class="result-note" style="margin-top:6px;">${DM_SGLT2I_SCREEN_NOTE}</div>`;
    screenEl.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", updateScreenResult);
    });
    updateScreenResult();
  }

  function updateScreenResult() {
    const flagged = DM_SGLT2I_SCREEN.filter((s) => {
      const cb = document.getElementById(`dm-screen-${s.key}`);
      return cb && cb.checked;
    });
    if (flagged.length === 0) {
      screenResultEl.className = "result-note";
      screenResultEl.innerHTML = "✅ ไม่พบภาวะเสี่ยง — เป็น happy diabetic ที่เหมาะกับ SGLT2i (พิจารณาร่วมกับประวัติและการตรวจร่างกายเสมอ)";
    } else {
      screenResultEl.className = "result-out-of-range";
      screenResultEl.innerHTML = `พบภาวะเสี่ยงต่อ eDKA: ${flagged.map((f) => f.label).join(", ")} — <strong>ไม่แนะนำ SGLT2i</strong> ควรรักษาด้วย insulin และแก้ไขภาวะเหล่านี้ก่อน`;
    }
  }

  // ---- DCS step-by-step scorer ----
  function dcsNextKey() {
    const f = DM_DCS_FACTORS.find((factor) => state.dcs[factor.key] === undefined);
    return f ? f.key : null;
  }

  function renderDcs() {
    const activeKey = state.dcsEditingKey || dcsNextKey();
    dcsFieldsEl.innerHTML = DM_DCS_FACTORS.map((factor, idx) => {
      const selected = state.dcs[factor.key];
      if (factor.key === activeKey) {
        const opts = factor.options.map((o) => {
          const isActive = selected === o.score;
          return `<button type="button" class="step-option-btn ${isActive ? "active" : ""}" data-dcs-key="${factor.key}" data-dcs-score="${o.score}"><span class="step-option-score">${o.score}</span>${o.label}</button>`;
        }).join("");
        return `<div class="step-header"><h3>${factor.label}</h3><span class="step-counter">หัวข้อ ${idx + 1}/${DM_DCS_FACTORS.length}</span></div>${opts}`;
      }
      if (selected !== undefined) {
        const opt = factor.options.find((o) => o.score === selected);
        return `<button type="button" class="step-summary-row" data-dcs-edit="${factor.key}"><span><span class="step-summary-label">${factor.label}</span><span class="step-summary-value">${selected} — ${opt.label}</span></span><span class="step-summary-edit">แก้ไข</span></button>`;
      }
      return "";
    }).join("");

    dcsFieldsEl.querySelectorAll(".step-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.dcs[btn.dataset.dcsKey] = parseInt(btn.dataset.dcsScore, 10);
        state.dcsEditingKey = null;
        renderDcs();
        renderDcsResult();
      });
    });
    dcsFieldsEl.querySelectorAll("[data-dcs-edit]").forEach((row) => {
      row.addEventListener("click", () => {
        state.dcsEditingKey = row.dataset.dcsEdit;
        renderDcs();
      });
    });
  }

  function renderDcsResult() {
    const answered = Object.keys(state.dcs).length;
    if (answered === 0) {
      dcsResultEl.hidden = true;
      return;
    }
    const total = DM_DCS_FACTORS.reduce((s, f) => s + (state.dcs[f.key] || 0), 0);
    const incomplete = answered < DM_DCS_FACTORS.length;
    dcsResultEl.hidden = false;
    dcsResultEl.innerHTML = `
      <div class="result-grid">
        <div class="result-item"><span class="label">คะแนน DCS รวม</span><span class="value">${total} / 12</span></div>
      </div>
      ${incomplete ? `<div class="warning-text">ตอบแล้ว ${answered}/${DM_DCS_FACTORS.length} หัวข้อ — เลือกให้ครบเพื่อดูคะแนนที่ถูกต้อง</div>` : ""}
      <div class="result-note">${DM_DCS_NOTE}</div>
      <div class="result-source">ที่มา: Table 6 "ALIVE Diabetic Clinical Score system" — 2025 iCatCare Consensus Guidelines on DM in Cats</div>
    `;
  }

  // ---- DKA / eDKA classifier ----
  function renderKetoResult() {
    const bgMgdl = parseFloat(bgInput.value);
    const bhb = parseFloat(bhbInput.value);
    const ph = parseFloat(phInput.value);

    if (isNaN(bgMgdl) || bgMgdl <= 0) {
      ketoResultEl.hidden = true;
      return;
    }

    const ketonaemia = !isNaN(bhb) && bhb > DM_KETO_CRITERIA.bhbThreshold;
    const acidosis = !isNaN(ph) && ph < DM_KETO_CRITERIA.phThreshold;
    const bhbMonitor = !isNaN(bhb) && bhb >= 1 && bhb <= DM_KETO_CRITERIA.bhbThreshold;

    let classification;
    if (ketonaemia && (acidosis || isNaN(ph))) {
      classification = bgMgdl >= DM_KETO_CRITERIA.bgMgdlThreshold
        ? `<div class="result-out-of-range"><strong>เข้าเกณฑ์ DKA</strong> (BG ${bgMgdl} mg/dl > 250 mg/dl, BHB > 2.4 mmol/l${acidosis ? ", pH < 7.35" : ""}) — ใช้โปรโตคอล DKA</div>`
        : `<div class="result-out-of-range"><strong>เข้าเกณฑ์ eDKA (euglycaemic DKA)</strong> (BG ${bgMgdl} mg/dl < 250 mg/dl, BHB > 2.4 mmol/l${acidosis ? ", pH < 7.35" : ""}) — มักพบในแมวที่ได้ SGLT2i → หยุด SGLT2i และใช้โปรโตคอล DKA + ให้ IV dextrose</div>`;
    } else {
      classification = `<div class="result-note">ยังไม่เข้าเกณฑ์ DKA/eDKA ชัดเจนจากข้อมูลที่กรอก${bhbMonitor ? " — BHB 1-2.4 mmol/l: ควรติดตามใกล้ชิดและบ่อยขึ้นสำหรับการดำเนินไปสู่ DKA/eDKA" : ""} — หากแมวป่วย (unhappy) และเข้าเกณฑ์ข้ออื่น (ketonuria, ป่วย) ให้สงสัย DKA ไว้ก่อน</div>`;
    }

    ketoResultEl.hidden = false;
    ketoResultEl.innerHTML = `
      ${classification}
      <div class="result-note">เกณฑ์ Table 8 — DKA: BG > 250 mg/dl, BHB > 2.4 mmol/l, urine ketones > 15 mg/dl, pH < 7.35, HCO3 < 15 mmol/l | eDKA: เหมือนกันแต่ BG < 250 mg/dl</div>
    `;
  }

  // ---- DKA weight-based doses ----
  function renderDkaDoses() {
    const weightKg = currentWeightKg();
    if (weightKg === null) {
      dkaDosesEl.innerHTML = `<div class="hint-text">กรอกน้ำหนักตัวเพื่อคำนวณ</div>`;
      return;
    }
    const ivInsulinU = round(1.1 * weightKg, 2);
    const imLow = round(0.1 * weightKg, 2);
    const imHigh = round(0.2 * weightKg, 2);
    const maintFluid = round(2 * weightKg, 1);
    const dextroseBolusG = round(0.5 * weightKg, 2);
    const dextrose25Ml = round(2 * weightKg, 1);

    dkaDosesEl.innerHTML = `
      <div class="result-grid">
        <div class="result-item">
          <span class="label">IV CRI — เตรียม insulin เข้มข้น</span>
          <span class="value" style="font-size:0.95rem;">regular/lispro insulin ${ivInsulinU} U (= 1.1 U/kg) ใน 0.9% NaCl 48 mL</span>
        </div>
        <div class="result-item">
          <span class="label">IM protocol</span>
          <span class="value" style="font-size:0.95rem;">regular insulin ${imLow} - ${imHigh} U (0.1-0.2 U/kg) IM q1-2h</span>
        </div>
        <div class="result-item">
          <span class="label">Maintenance fluid (~2 mL/kg/h)</span>
          <span class="value">${maintFluid} mL/h</span>
        </div>
        <div class="result-item">
          <span class="label">Hypoglycaemia rescue</span>
          <span class="value" style="font-size:0.95rem;">dextrose ${dextroseBolusG} g (0.5 g/kg) เช่น 25% dextrose ${dextrose25Ml} mL IV ช้าๆ 5-10 นาที</span>
        </div>
      </div>
      <div class="result-note"><strong>ขั้นตอน IV CRI:</strong> ${DM_DKA_INSULIN_IV.saturate} จากนั้น ${DM_DKA_INSULIN_IV.restart}</div>
      <div class="result-note">${DM_DKA_INSULIN_IV.line}</div>
      <div class="result-note"><strong>IM:</strong> ${DM_DKA_INSULIN_IM.dextrose}</div>
      <div class="result-note"><strong>Glargine protocol:</strong> ${DM_DKA_INSULIN_GLARGINE}</div>
      <h4>ตารางอัตรา insulin CRI ตามระดับ BG (Figure 17)</h4>
      <div class="table-wrap"><table>
        <thead><tr><th>Blood glucose</th><th>สารน้ำ</th><th>อัตรา insulin solution</th></tr></thead>
        <tbody>${DM_DKA_CRI_TABLE.map((r) => `<tr><td>${r.bgLabel}</td><td>${r.fluid}</td><td>${r.rate}</td></tr>`).join("")}</tbody>
      </table></div>
      <div class="result-note">ปรับ CRI ทุก 1-2 ชั่วโมงตาม BG</div>
      ${listHtml(DM_DKA_DEXTROSE_PREP)}
    `;
  }

  // ---- reference content per mode ----
  function renderReference() {
    if (state.mode === "healthy") {
      referenceEl.innerHTML = `
        <h3>เกณฑ์วินิจฉัย DM (ALIVE — Box 6)</h3>
        ${listHtml(DM_DIAGNOSIS_CRITERIA)}
        <h3>Happy vs Unhappy diabetic (Figure 7)</h3>
        <div class="result-note">${DM_HAPPY_DIABETIC}</div>
        <div class="result-note">${DM_UNHAPPY_DIABETIC}</div>
        <h3>หลักการให้ insulin (Box 8)</h3>
        ${listHtml(DM_INSULIN_PRINCIPLES)}
        <h3>ชนิด insulin ที่ใช้บ่อย (Table 3)</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>ชนิด</th><th>ความเข้มข้น</th><th>ระยะออกฤทธิ์</th><th>ความถี่</th></tr></thead>
          <tbody>${DM_INSULIN_FORMULATIONS.map((f) => `<tr><td>${f.name}</td><td>${f.conc}</td><td>${f.action}</td><td>${f.freq}</td></tr>`).join("")}</tbody>
        </table></div>
        <h3>ภาวะน้ำตาลในเลือดต่ำ (Hypoglycaemia)</h3>
        <div class="result-note"><strong>อาการ:</strong> ${DM_HYPOGLYCAEMIA.signs}</div>
        <div class="result-note"><strong>การรักษาฉุกเฉิน:</strong> ${DM_HYPOGLYCAEMIA.emergency}</div>
        <div class="result-note"><strong>ที่บ้าน:</strong> ${DM_HYPOGLYCAEMIA.home}</div>
        <div class="result-source">ที่มา: 2025 iCatCare Consensus Guidelines on the Diagnosis and Management of DM in Cats (Taylor S, et al. J Feline Med Surg 2025;27:1-37) — ใช้เป็นตัวช่วยประเมินเบื้องต้นเท่านั้น ไม่ทดแทนดุลยพินิจทางคลินิก</div>
      `;
    } else {
      referenceEl.innerHTML = `
        <h3>สารน้ำใน DKA (Figure 17)</h3>
        ${listHtml(DM_DKA_FLUIDS)}
        <h3>การติดตามระหว่างรักษา DKA</h3>
        ${listHtml(DM_DKA_MONITORING)}
        <h3>ยาแก้อาเจียน / โภชนาการ</h3>
        <div class="result-note">${DM_DKA_ANTIEMETICS}</div>
        <h3>เกณฑ์ว่า DKA หายแล้ว (Resolution)</h3>
        ${listHtml(DM_DKA_RESOLUTION)}
        <h3>eDKA (แมวที่ได้ SGLT2i) — Figure 18</h3>
        ${listHtml(DM_EDKA_ACTIONS)}
        <div class="result-source">ที่มา: 2025 iCatCare Consensus Guidelines on the Diagnosis and Management of DM in Cats (Taylor S, et al. J Feline Med Surg 2025;27:1-37) — ใช้เป็นตัวช่วยประเมินเบื้องต้นเท่านั้น ไม่ทดแทนดุลยพินิจทางคลินิก</div>
      `;
    }
  }

  // ---- printable DKA plan card (insulin CRI table + initial plan) ----
  function renderPlanCard() {
    const weightKg = currentWeightKg();
    if (state.mode !== "dka" || weightKg === null) {
      planCardPanel.hidden = true;
      return;
    }
    planCardPanel.hidden = false;

    const name = patientNameInput.value.trim();
    const ivInsulinU = round(1.1 * weightKg, 2);
    const imLow = round(0.1 * weightKg, 2);
    const imHigh = round(0.2 * weightKg, 2);
    const maintFluid = round(2 * weightKg, 1);
    const dextroseBolusG = round(0.5 * weightKg, 2);
    const dextrose25Ml = round(2 * weightKg, 1);
    const today = new Date().toLocaleDateString("th-TH");

    planCardEl.innerHTML = `
      <div class="feeding-card-title">แผนเบื้องต้น Feline Diabetic Ketoacidosis (DKA)</div>
      <div class="feeding-card-name">${name || "แมว"}</div>
      <div class="result-note" style="text-align:center;">น้ำหนัก ${weightKg} กก. &nbsp;|&nbsp; วันที่ ${today}</div>

      <h4>1. สารน้ำ</h4>
      <ul class="anemia-ddx-list">
        <li>เริ่มโดยเร็ว: 0.9% NaCl หรือ LRS + เสริม K+ (มักต้องเสริม)</li>
        <li>Maintenance ~2 mL/kg/h = <strong>${maintFluid} mL/h</strong> + สารน้ำทดแทนการสูญเสีย</li>
        <li>แก้ dehydration 60-80% ใน 10-12 ชม.แรก, ที่เหลือ 20-40% ใน 12-14 ชม.ถัดไป</li>
      </ul>

      <h4>2. Insulin</h4>
      <ul class="anemia-ddx-list">
        <li><strong>IV CRI (แนะนำ):</strong> regular/lispro insulin ${ivInsulinU} U (1.1 U/kg) ใน 0.9% NaCl 48 mL — ตั้งในสาย 30 นาที run ทิ้ง แล้วเตรียมใหม่ ใช้สาย/catheter แยกจากสารน้ำหลัก ปรับ CRI ทุก 1-2 ชม.ตาม BG</li>
        <li><strong>IM:</strong> regular insulin ${imLow} - ${imHigh} U (0.1-0.2 U/kg) IM q1-2h — เมื่อ BG < 250 mg/dl เติม dextrose 2.5-5%</li>
        <li><strong>Glargine:</strong> 2 U/ตัว SC q12h + glargine IM สูงสุด 3 ครั้ง ครั้งละ 0.5-1 U/ตัว ห่างกัน ≥ 4 ชม.</li>
      </ul>

      <h4>3. ตารางอัตรา insulin CRI ตาม Blood Glucose (Figure 17)</h4>
      <div class="table-wrap"><table>
        <thead><tr><th>Blood glucose</th><th>สารน้ำ</th><th>อัตรา insulin solution</th></tr></thead>
        <tbody>${DM_DKA_CRI_TABLE.map((r) => `<tr><td>${r.bgLabel}</td><td>${r.fluid}</td><td>${r.rate}</td></tr>`).join("")}</tbody>
      </table></div>
      <ul class="anemia-ddx-list">
        <li>2.5% dextrose = dextrose 50% 25 mL + 0.9% NaCl/LRS 475 mL</li>
        <li>5% dextrose = dextrose 50% 50 mL + 0.9% NaCl/LRS 450 mL</li>
      </ul>

      <h4>4. การติดตาม</h4>
      <ul class="anemia-ddx-list">
        <li>BG: ทุกชม. ใน 24 ชม.แรก จากนั้นทุก 2-3 ชม. | blood pH ทุก 8 ชม. | BHB ทุก 4 ชม.</li>
        <li>Electrolytes (K, Na, Mg, P) ทุก 8-12 ชม. | urine output | RR / น้ำหนัก q12h (fluid overload)</li>
        <li>Hypoglycaemia rescue: dextrose ${dextroseBolusG} g (0.5 g/kg) เช่น 25% dextrose ${dextrose25Ml} mL IV ช้าๆ 5-10 นาที</li>
      </ul>

      <h4>5. เกณฑ์ DKA หาย → เปลี่ยนเป็น insulin SC</h4>
      <ul class="anemia-ddx-list">
        <li>ไม่อาเจียน กินได้ปานกลาง-ดี | BHB ≤ 1.0 mmol/l สองครั้งห่าง 1 ชม. หรือไม่มี ketonuria | pH ≥ 7.3 และ/หรือ HCO3 ≥ 15 mmol/l</li>
        <li>→ เริ่ม intermediate/long-acting insulin (PZI, glargine U100/U300) 1-1.5 U/ตัว SC q12h แล้วลด/หยุดสารน้ำ</li>
      </ul>

      <div class="result-source">ที่มา: 2025 iCatCare Consensus Guidelines on the Diagnosis and Management of DM in Cats (Taylor S, et al. J Feline Med Surg 2025;27:1-37), Figure 17 — ตัวช่วยเบื้องต้น ไม่ทดแทนดุลยพินิจทางคลินิก</div>
    `;
  }

  function refreshAll() {
    renderSglt2iDoses();
    renderDkaDoses();
    renderPlanCard();
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.mode = btn.dataset.dmMode;
      healthyFields.hidden = state.mode !== "healthy";
      dkaFields.hidden = state.mode !== "dka";
      renderReference();
      renderPlanCard();
    });
  });

  printPlanBtn.addEventListener("click", () => {
    if (currentWeightKg() === null) {
      alert("กรุณากรอกน้ำหนักตัวก่อนพิมพ์แผน");
      return;
    }
    renderPlanCard();
    document.body.classList.add("print-dm-plan");
    window.print();
    document.body.classList.remove("print-dm-plan");
  });

  weightKgInput.addEventListener("input", refreshAll);
  document.addEventListener("species-change", refreshAll);
  patientNameInput.addEventListener("input", renderPlanCard);
  [bgInput, bhbInput, phInput].forEach((el) => el.addEventListener("input", renderKetoResult));

  renderScreen();
  renderDcs();
  renderDcsResult();
  renderReference();
  refreshAll();
})();
