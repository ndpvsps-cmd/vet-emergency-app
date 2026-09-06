(function () {
  "use strict";

  const creatinineInput = document.getElementById("ckd-creatinine-input");
  const sdmaInput = document.getElementById("ckd-sdma-input");
  const upcInput = document.getElementById("ckd-upc-input");
  const sbpInput = document.getElementById("ckd-sbp-input");
  const resultEl = document.getElementById("ckd-result");

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function findStage(table, value) {
    return table.find((entry) => value <= entry.max);
  }

  function findSubstage(table, value) {
    return table.find((entry) => value <= entry.max);
  }

  function refresh() {
    const creatinine = parseFloat(creatinineInput.value);
    if (isNaN(creatinine) || creatinine <= 0) {
      resultEl.hidden = true;
      return;
    }

    const creStage = findStage(CKD_CREATININE_STAGES, creatinine);
    const sdma = parseFloat(sdmaInput.value);
    let sdmaStage = null;
    if (!isNaN(sdma) && sdma > 0) {
      sdmaStage = findStage(CKD_SDMA_STAGES, sdma);
    }

    // ตามคำแนะนำของ IRIS: ถ้า stage จาก creatinine กับ SDMA ไม่ตรงกัน ให้ใช้ stage ที่รุนแรงกว่า
    const stage = sdmaStage ? Math.max(creStage.stage, sdmaStage.stage) : creStage.stage;

    const upc = parseFloat(upcInput.value);
    const proteinuriaSubstage = !isNaN(upc) && upc >= 0 ? findSubstage(CKD_PROTEINURIA_SUBSTAGES, upc) : null;

    const sbp = parseFloat(sbpInput.value);
    const sbpSubstage = !isNaN(sbp) && sbp > 0 ? findSubstage(CKD_SBP_SUBSTAGES, sbp) : null;

    const isProteinuric = proteinuriaSubstage && proteinuriaSubstage.key === "proteinuric";
    const isHypertensive = sbpSubstage && (sbpSubstage.key === "hypertensive" || sbpSubstage.key === "severe");

    const phosphateTarget = CKD_PHOSPHATE_TARGETS[stage];

    let html = `
      <h3>ผล IRIS Staging</h3>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">IRIS Stage (จาก Creatinine ${creStage.label}${sdmaStage ? `, SDMA ${sdmaStage.label}` : ""})</span>
          <span class="value">Stage ${stage}</span>
        </div>
        ${proteinuriaSubstage ? `
        <div class="result-item">
          <span class="label">Substage — Proteinuria (UPC ${upc})</span>
          <span class="value" style="font-size:0.95rem;">${proteinuriaSubstage.label}</span>
        </div>` : ""}
        ${sbpSubstage ? `
        <div class="result-item">
          <span class="label">Substage — Blood Pressure (SBP ${sbp} mmHg)</span>
          <span class="value" style="font-size:0.95rem;">${sbpSubstage.label}</span>
        </div>` : ""}
      </div>
    `;

    html += `<h4>เป้าหมาย Serum Phosphate (Table 3)</h4>`;
    if (phosphateTarget) {
      html += `<div class="result-note">เป้าหมาย: ${phosphateTarget.low} - ${phosphateTarget.high} mg/dl — หากสูงกว่าเป้าหมาย ให้จำกัดฟอสฟอรัสในอาหาร (อาหารไต) ก่อน แล้วพิจารณาเพิ่ม phosphate binder หากยังไม่ถึงเป้าหมาย</div>`;
    } else {
      html += `<div class="result-note">Stage 1 ยังไม่มีเป้าหมาย phosphate เฉพาะตามตาราง — ให้ติดตามค่า FGF23 หากทำได้ (ดู Figure 19 ในเอกสารต้นฉบับ)</div>`;
    }

    if (isProteinuric) {
      html += `
        <h4>แนวทางรักษาโปรตีนรั่วในปัสสาวะ (Proteinuric)</h4>
        <div class="result-note">${CKD_PROTEINURIA_NOTE}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>ยา</th><th>ขนาด</th></tr></thead>
          <tbody>
            ${CKD_PROTEINURIA_DRUGS.map((d) => `<tr><td>${d.drug}</td><td>${d.dose}</td></tr>`).join("")}
          </tbody>
        </table></div>
        <div class="result-note"><strong>การติดตามหลังเริ่มยา (Table 5):</strong></div>
        <div class="table-wrap"><table>
          <thead><tr><th>ช่วงเวลา</th><th>ตรวจอะไร</th><th>เป้าหมาย</th></tr></thead>
          <tbody>
            ${CKD_PROTEINURIA_MONITORING.map((m) => `<tr><td>${m.time}</td><td>${m.check}</td><td>${m.aim}</td></tr>`).join("")}
          </tbody>
        </table></div>
      `;
    } else if (proteinuriaSubstage && proteinuriaSubstage.key === "borderline") {
      html += `<h4>โปรตีนรั่วในปัสสาวะ</h4><div class="result-note">UPC อยู่ในช่วง borderline proteinuric — ยังไม่มีหลักฐานชัดเจนว่าการรักษาด้วยยาลดโปรตีนได้ประโยชน์ แต่บางคลินิกอาจพิจารณา ให้ติดตาม UPC ซ้ำ</div>`;
    }

    if (isHypertensive) {
      html += `
        <h4>แนวทางรักษาความดันโลหิตสูง (${sbpSubstage.label})</h4>
        <div class="result-note">${CKD_HYPERTENSION_TARGET}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>กลุ่มยา</th><th>ยาและขนาด</th><th>หมายเหตุ</th></tr></thead>
          <tbody>
            ${CKD_HYPERTENSION_DRUGS.map((d) => `<tr><td>${d.class}</td><td><strong>${d.drug}</strong><br>${d.dose}</td><td>${d.note}</td></tr>`).join("")}
          </tbody>
        </table></div>
      `;
    } else if (sbpSubstage && sbpSubstage.key === "prehypertensive") {
      html += `<h4>ความดันโลหิต</h4><div class="result-note">อยู่ในช่วง pre-hypertensive — ยังไม่ถึงเกณฑ์เริ่มยาลดความดันตามปกติ แนะนำติดตาม SBP ซ้ำ และประเมินความเสี่ยงต่ออวัยวะเป้าหมาย (ตา ฯลฯ)</div>`;
    }

    html += `
      <div class="result-source">
        ที่มา: Taylor S, et al. "2026 iCatCare Consensus Guidelines on the Diagnosis and Management of Chronic Kidney
        Disease in Cats." Journal of Feline Medicine and Surgery 2026 (เอกสารที่ผู้ใช้แนบมา) — Table 1-6, Figure 17/19/20
        ใช้เป็นตัวช่วยประเมินเบื้องต้นเท่านั้น ไม่ทดแทนดุลยพินิจทางคลินิก
      </div>
    `;

    resultEl.hidden = false;
    resultEl.innerHTML = html;
  }

  [creatinineInput, sdmaInput, upcInput, sbpInput].forEach((el) => {
    el.addEventListener("input", refresh);
  });

  // ---- static reference sections ----
  function renderGiDrugsTable() {
    const el = document.getElementById("ckd-gi-drugs-table");
    el.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>ยา</th><th>ขนาด</th><th>ข้อบ่งชี้ใน CKD</th><th>ผลข้างเคียง</th></tr></thead>
        <tbody>
          ${CKD_GI_DRUGS.map((d) => `<tr><td>${d.drug}</td><td>${d.dose}</td><td>${d.indication}</td><td>${d.adverse}</td></tr>`).join("")}
        </tbody>
      </table></div>
    `;
  }

  function renderPotassiumInfo() {
    const el = document.getElementById("ckd-potassium-info");
    el.innerHTML = `
      <ul class="anemia-ddx-list">
        <li><strong>โพแทสเซียมต่ำเล็กน้อย:</strong> <span>${CKD_POTASSIUM_INFO.mild}</span></li>
        <li><strong>โพแทสเซียมต่ำปานกลาง-มาก (คงที่):</strong> <span>${CKD_POTASSIUM_INFO.moderateSevere}</span></li>
        <li><strong>โพแทสเซียมต่ำรุนแรง (อาการทรุด):</strong> <span>${CKD_POTASSIUM_INFO.decompensated}</span></li>
      </ul>
    `;
  }

  function renderAnaemiaInfo() {
    const el = document.getElementById("ckd-anaemia-info");
    el.innerHTML = `
      <div class="result-note"><strong>เกณฑ์เริ่มรักษา:</strong> ${CKD_ANAEMIA_INFO.threshold}</div>
      <div class="result-note"><strong>ขนาดเริ่มต้น:</strong> ${CKD_ANAEMIA_INFO.starting}</div>
      <ul class="anemia-ddx-list">
        ${CKD_ANAEMIA_INFO.titration.map((t) => `<li>${t}</li>`).join("")}
      </ul>
      <div class="result-note"><strong>เมื่อคงที่แล้ว:</strong> ${CKD_ANAEMIA_INFO.maintenance}</div>
      <div class="result-note"><strong>ธาตุเหล็กเสริม:</strong> ${CKD_ANAEMIA_INFO.iron}</div>
    `;
  }

  function renderSimpleNote(id, text) {
    document.getElementById(id).innerHTML = `<div class="result-note">${text}</div>`;
  }

  function renderKeyConsiderations() {
    const el = document.getElementById("ckd-key-considerations");
    el.innerHTML = CKD_KEY_CONSIDERATIONS.map((c) => `<li>${c}</li>`).join("");
  }

  renderGiDrugsTable();
  renderPotassiumInfo();
  renderSimpleNote("ckd-acidosis-info", CKD_ACIDOSIS_INFO);
  renderAnaemiaInfo();
  renderSimpleNote("ckd-constipation-info", CKD_CONSTIPATION_INFO);
  renderSimpleNote("ckd-scfluids-info", CKD_SC_FLUIDS_INFO);
  renderKeyConsiderations();

  refresh();
})();
