(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");

  const stageTableBody = document.getElementById("se-stage-table-body");
  const gradeLegendEl = document.getElementById("se-grade-legend");
  const stepperEl = document.getElementById("se-stepper");

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function currentWeightKg() {
    const val = parseFloat(weightKgInput.value);
    return isNaN(val) || val <= 0 ? null : val;
  }

  function currentSpecies() {
    const activeBtn = document.querySelector(".species-btn.active");
    return activeBtn ? activeBtn.dataset.species : "dog";
  }

  function formatRange(low, high, decimals) {
    const l = round(low, decimals);
    const h = round(high, decimals);
    return l === h ? String(l) : `${l} - ${h}`;
  }

  // Renders a weight-based dose line for a drug already in this app's Plumb's-sourced
  // database (data/drugs.js) — the ACVIM document itself gives no mg/kg numbers, only the
  // step order/route/recommendation grade, so any numeric dose shown here is from Plumb's, not ACVIM.
  function drugDoseHtml(name) {
    const weightKg = currentWeightKg();
    const drug = DRUGS.find((d) => d.name === name);
    if (!drug) return `<span class="hint-text">ไม่มีข้อมูลยานี้ในฐานข้อมูล</span>`;
    if (weightKg === null) return `<span class="hint-text">กรอกน้ำหนักตัวเพื่อคำนวณขนาดยา (อ้างอิง Plumb's 10th)</span>`;
    const species = currentSpecies();
    const spec = drug.species[species];
    if (!spec) {
      return `<span class="hint-text">ไม่มีข้อมูลขนาดยานี้สำหรับ${species === "dog" ? "สุนัข" : "แมว"}ในฐานข้อมูล (Plumb's) — โปรดตรวจสอบเพิ่มเติม</span>`;
    }
    const doseLowMg = spec.doseLow * weightKg;
    const doseHighMg = spec.doseHigh * weightKg;
    const conc = drug.concentrations[0];
    const volLow = doseLowMg / conc;
    const volHigh = doseHighMg / conc;
    return `${formatRange(doseLowMg, doseHighMg, 3)} mg (${formatRange(volLow, volHigh, 3)} mL ที่ ${conc} mg/mL) — Plumb's 10th, ${spec.route}`;
  }

  function midazolamImInHtml() {
    const base = drugDoseHtml("Midazolam");
    const weightKg = currentWeightKg();
    const drug = DRUGS.find((d) => d.name === "Midazolam");
    if (weightKg === null || !drug) return base;
    const inDoseMg = round(0.2 * weightKg, 3);
    const conc = drug.concentrations[0];
    const inVolMl = round(inDoseMg / conc, 3);
    return `${base}<br><span class="hint-text">ทางเลือก IN (ขนาดคงที่ตาม Plumb's): ${inDoseMg} mg (${inVolMl} mL ที่ ${conc} mg/mL)</span>`;
  }

  // ---- treatment stepper: one actionable step at a time instead of one long scroll ----
  const STEPS = [
    {
      key: "bolus1",
      title: "ขั้นที่ 1 — First-line BZD: Bolus แรก",
      hint: "เกณฑ์ได้ผล: หยุดชักภายใน 5 นาที และไม่ชักซ้ำภายใน 10 นาทีถัดไป",
      body: () => `
        <div class="se-step">
          <div class="se-step-head">ในโรงพยาบาล (มี IV)</div>
          <div class="se-step-row"><span>Midazolam IV</span><span class="grade-badge grade-A">สุนัข A</span><span class="grade-badge grade-B">แมว B</span></div>
          <div class="se-step-dose">${drugDoseHtml("Midazolam")}</div>
          <div class="se-step-row"><span>Diazepam IV</span><span class="grade-badge grade-A">สุนัข A</span><span class="grade-badge grade-B">แมว B</span></div>
          <div class="se-step-dose">${drugDoseHtml("Diazepam")}</div>
        </div>
        <div class="se-step">
          <div class="se-step-head">นอกโรงพยาบาล / ยังไม่มี IV access</div>
          <div class="se-step-row"><span>Midazolam พ่นจมูก (IN)</span><span class="grade-badge grade-A">สุนัข A</span><span class="grade-badge grade-E">แมว E</span></div>
          <div class="se-step-row"><span>Midazolam ฉีดกล้ามเนื้อ (IM)</span><span class="grade-badge grade-B">สุนัข B</span><span class="grade-badge grade-E">แมว E</span></div>
          <div class="se-step-dose">${midazolamImInHtml()}</div>
          <div class="se-step-row"><span>Diazepam ทางทวารหนัก (R)</span><span class="grade-badge grade-C">สุนัข C</span><span class="grade-badge grade-E">แมว E</span></div>
          <div class="se-step-dose"><span class="hint-text">ไม่มีขนาดยาทางทวารหนักในฐานข้อมูลนี้ — โปรดใช้ตามขนาดยาที่คลินิกกำหนด</span></div>
        </div>
        <div class="result-source">ACVIM Consensus Statement 2023, ส่วน First-line treatment, p.25-28</div>
      `,
      cta: "ยังชักอยู่ (≥ 2 นาทีหลัง bolus แรก) → Bolus ที่ 2"
    },
    {
      key: "bolus2",
      title: "Bolus ที่ 2 — ใช้ยาชนิดเดิม ขนาดเดิม",
      hint: "ให้ห่างจาก bolus แรกอย่างน้อย 2 นาที",
      body: () => `
        <div class="se-step">
          <div class="result-note">ให้ Midazolam หรือ Diazepam ซ้ำ (ชนิดเดียวกับ bolus แรก) ในขนาดเท่าเดิม</div>
        </div>
        <div class="result-source">ACVIM Consensus Statement 2023, ส่วน First-line treatment, p.25-28</div>
      `,
      cta: "ยังชักซ้ำหลัง 2 bolus (recurrent SE) → Bolus ที่ 3 + เริ่ม CRI"
    },
    {
      key: "bolus3cri",
      title: "Bolus ที่ 3 ตามด้วย BZD IV CRI ทันที",
      hint: "",
      body: () => `
        <div class="se-step">
          <div class="se-step-row"><span>Midazolam IV CRI</span><span class="grade-badge grade-A">สุนัข A</span><span class="grade-badge grade-B">แมว B (แนะนำกว่า)</span></div>
          <div class="se-step-row"><span>Diazepam IV CRI</span><span class="grade-badge grade-B">สุนัข B</span><span class="grade-badge grade-D">แมว D (หลีกเลี่ยง)</span></div>
        </div>
        <div class="result-source">ACVIM Consensus Statement 2023, ส่วน First-line treatment, p.25-28</div>
      `,
      cta: "ยังคุมชักไม่ได้ → ขั้นที่ 2 (Second-line)"
    },
    {
      key: "secondline",
      title: "ขั้นที่ 2 — Second-line: Antiseizure Medication (ASM)",
      hint: "เริ่มได้เร็วขึ้นควบคู่กับ first-line ในผู้ป่วยที่มาโรงพยาบาล ไม่จำเป็นต้องรอให้ first-line ล้มเหลวก่อนเสมอไป",
      body: () => `
        <div class="se-step">
          <div class="se-step-row"><span>Levetiracetam IV</span><span class="grade-badge grade-B">สุนัข/แมว B</span></div>
          <div class="se-step-row"><span>Phenobarbital IV</span><span class="grade-badge grade-A">สุนัข A</span><span class="grade-badge grade-B">แมว B</span></div>
          <div class="se-step-row"><span>Fosphenytoin IV (เสริม หากตอบสนองไม่พอกับยาข้างต้น)</span><span class="grade-badge grade-B">สุนัข B</span></div>
          <div class="result-note">ขนาดยา (mg/kg) ของยากลุ่มนี้ไม่ได้ระบุไว้ในเนื้อหาหลักของเอกสาร ACVIM ที่แนบมา (อยู่ใน Supplementary file ที่ไม่ได้แนบ) — กรุณาใช้ตามขนาดยาที่คลินิกกำหนดหรือตำรายาอื่น</div>
        </div>
        <div class="result-source">ACVIM Consensus Statement 2023, ส่วน Second-line treatment, p.28-29</div>
      `,
      cta: "ยังคุมชักไม่ได้ → ขั้นที่ 3 (Third-line ยาสลบ)"
    },
    {
      key: "thirdline1",
      title: "ขั้นที่ 3 — Third-line ยาสลบ: ขั้นย่อยที่ 1",
      hint: "ใช้เมื่อ first- และ second-line ควบคุมชักไม่ได้",
      body: () => `
        <div class="se-step">
          <div class="se-step-row"><span>Ketamine IV bolus ± CRI</span><span class="grade-badge grade-A">สุนัข A</span><span class="grade-badge grade-E">แมว E</span></div>
          <div class="se-step-dose">${drugDoseHtml("Ketamine")}</div>
          <div class="se-step-row"><span>Dexmedetomidine IV bolus + CRI (ถ้าใช้ ketamine ไม่ได้ผล หรือสลับลำดับกันได้)</span><span class="grade-badge grade-B">สุนัข B</span><span class="grade-badge grade-E">แมว E</span></div>
        </div>
        <div class="result-source">ACVIM Consensus Statement 2023, ส่วน Third-line treatment, p.29-31</div>
      `,
      cta: "ยังคุมชักไม่ได้ → ขั้นย่อยที่ 2"
    },
    {
      key: "thirdline2",
      title: "ขั้นย่อยที่ 2 — Propofol",
      hint: "",
      body: () => `
        <div class="se-step">
          <div class="se-step-row"><span>Propofol IV bolus ± CRI</span><span class="grade-badge grade-A">สุนัข A</span></div>
          <div class="se-step-dose">${drugDoseHtml("Propofol")}</div>
          <div class="warning-text">ในแมว: ใช้ด้วยความระมัดระวัง (grade C) เฝ้าระวังใกล้ชิด เสี่ยง Heinz body anemia หากใช้ต่อเนื่องนาน/ปริมาณสะสมสูง</div>
        </div>
        <div class="result-source">ACVIM Consensus Statement 2023, ส่วน Third-line treatment, p.29-31</div>
      `,
      cta: "ยังคุมชักไม่ได้ → ขั้นย่อยที่ 3"
    },
    {
      key: "thirdline3",
      title: "ขั้นย่อยที่ 3 — Barbiturate",
      hint: "",
      body: () => `
        <div class="se-step">
          <div class="se-step-row"><span>Barbiturate (Pentobarbital หรือ Sodium thiopental) IV bolus + CRI</span><span class="grade-badge grade-B">สุนัข B</span><span class="grade-badge grade-C">แมว C</span></div>
        </div>
        <div class="result-source">ACVIM Consensus Statement 2023, ส่วน Third-line treatment, p.29-31</div>
      `,
      cta: "ยังคุมชักไม่ได้ → ขั้นย่อยที่ 4"
    },
    {
      key: "thirdline4",
      title: "ขั้นย่อยที่ 4 — ยาสลบชนิดสูดดม",
      hint: "",
      body: () => `
        <div class="se-step">
          <div class="se-step-row"><span>ยาสลบชนิดสูดดม (Inhalational anesthesia)</span><span class="grade-badge grade-B">สุนัข/แมว B</span></div>
          <div class="result-note">ต้องใส่ท่อช่วยหายใจและควบคุมการหายใจ (mechanical ventilation)</div>
        </div>
        <div class="result-source">ACVIM Consensus Statement 2023, ส่วน Third-line treatment, p.29-31</div>
      `,
      cta: "ยังคุมชักไม่ได้ทุกวิธี → Super-refractory SE"
    },
    {
      key: "superrefractory",
      title: "Super-refractory SE — คุมชักไม่ได้ทุกขั้นตอนข้างต้น",
      hint: "",
      body: () => `
        <ul style="margin:0; padding-left:20px;">
          <li>พิจารณา IV Magnesium หรือ Allopregnanolone <span class="grade-badge grade-E">E</span></li>
          <li>หากยังไม่ได้ผล พิจารณา Neurostimulation (non-pharmacological) <span class="grade-badge grade-E">E</span></li>
        </ul>
        <div class="result-source">ACVIM Consensus Statement 2023, ส่วน What if combined measures fail, p.30-31</div>
      `,
      cta: null
    }
  ];

  const STOP_GUIDANCE_HTML = `
    <ul style="margin:0; padding-left:20px;">
      <li>ถ้าไม่มีอาการชักอีกเลยเป็นเวลา 24-48 ชั่วโมง หลังปรับยา/เพิ่มยาครั้งล่าสุด → ไม่จำเป็นต้องเพิ่มยาสลบอีก</li>
      <li>คงขนาดยาที่ควบคุมชักได้ต่อไปอีก 24-48 ชั่วโมงหลังหยุดชัก (ระยะสั้นสุด ~12 ชั่วโมงพิจารณาได้เพื่อลดความเสี่ยงจากการนอนโรงพยาบาลนาน) ก่อนเริ่มลดยา</li>
      <li>ถ้ามี EEG ควรใช้ร่วมกับการประเมินทางคลินิกเพื่อยืนยันว่าหยุดชักจริง โดยเฉพาะกรณีสงสัย non-convulsive SE</li>
    </ul>
    <div class="result-source">ACVIM Consensus Statement 2023, ส่วน When to stop administering more antiseizure medications, p.31-32</div>
  `;

  const state = { currentIndex: 0, completedKeys: [], done: false };

  function historyHtml() {
    return state.completedKeys.map((key) => {
      const step = STEPS.find((s) => s.key === key);
      return `<div class="step-summary-row" style="cursor:default;"><span><span class="step-summary-label">${step.title}</span><span class="step-summary-value">ผ่านขั้นนี้แล้ว</span></span></div>`;
    }).join("");
  }

  function renderStepper() {
    if (state.done) {
      stepperEl.innerHTML = `
        ${historyHtml()}
        <div class="step-header"><h3>✅ ควบคุมชักได้แล้ว</h3></div>
        <div class="se-step">
          <div class="se-step-head">เมื่อไหร่จึงหยุด/ลดยากันชัก</div>
          ${STOP_GUIDANCE_HTML}
        </div>
        <button type="button" class="next-page-btn" id="se-restart-btn">↺ เริ่มประเมินใหม่ (ผู้ป่วยรายใหม่)</button>
      `;
      document.getElementById("se-restart-btn").addEventListener("click", () => {
        state.currentIndex = 0;
        state.completedKeys = [];
        state.done = false;
        renderStepper();
      });
      return;
    }

    const step = STEPS[state.currentIndex];
    let html = historyHtml();
    html += `
      <div class="step-header">
        <h3>${step.title}</h3>
        <span class="step-counter">ขั้นที่ ${state.currentIndex + 1}/${STEPS.length}</span>
      </div>
      ${step.hint ? `<div class="hint-text">${step.hint}</div>` : ""}
      ${step.body()}
      <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
        ${step.cta ? `<button type="button" class="next-page-btn" id="se-advance-btn" style="margin-top:0;">${step.cta}</button>` : ""}
        <button type="button" class="patient-chip-edit" id="se-controlled-btn" style="width:100%; padding:10px; text-align:center;">✅ ควบคุมชักได้แล้ว</button>
      </div>
    `;
    stepperEl.innerHTML = html;

    const advanceBtn = document.getElementById("se-advance-btn");
    if (advanceBtn) {
      advanceBtn.addEventListener("click", () => {
        state.completedKeys.push(step.key);
        state.currentIndex++;
        renderStepper();
      });
    }
    document.getElementById("se-controlled-btn").addEventListener("click", () => {
      state.completedKeys.push(step.key);
      state.done = true;
      renderStepper();
    });
  }

  weightKgInput.addEventListener("input", renderStepper);
  document.addEventListener("species-change", renderStepper);

  // ---- static reference tables (grade legend + SE stage pyramid) ----
  stageTableBody.innerHTML = SE_STAGE_TABLE.map((s) => `
    <tr><td>${s.stage}</td><td>${s.duration}</td><td>${s.response}</td></tr>
  `).join("");

  gradeLegendEl.innerHTML = SE_GRADE_LEGEND.map((g) => `
    <span class="grade-badge grade-${g.grade}">${g.grade}</span> ${g.label}<br>
  `).join("");

  renderStepper();
})();
