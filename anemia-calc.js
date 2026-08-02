(function () {
  "use strict";

  const rbcInput = document.getElementById("anemia-rbc-input");
  const reticInput = document.getElementById("anemia-retic-input");
  const hctInput = document.getElementById("anemia-hct-input");
  const indicesSelect = document.getElementById("anemia-indices-select");
  const resultEl = document.getElementById("anemia-result");

  function currentSpecies() {
    const activeBtn = document.querySelector(".species-btn.active");
    return activeBtn ? activeBtn.dataset.species : "dog";
  }

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function findGradeBand(species, arcThouPerUl) {
    const bands = ARC_GRADE_BANDS[species];
    return bands.find((b) => arcThouPerUl <= b.max);
  }

  // เลือกแถวในตาราง maturation ที่ Hct ของผู้ป่วยใกล้เคียงที่สุด — ตามตัวอย่างคำนวณจริงใน [1]
  function nearestMaturationRow(species, patientHct) {
    const table = ANEMIA_MATURATION_TABLE[species];
    return table.reduce((closest, row) =>
      Math.abs(row.hct - patientHct) < Math.abs(closest.hct - patientHct) ? row : closest
    );
  }

  function computeArc(retic, rbcMillPerUl) {
    // ARC (thou/uL) = retic% x RBC(mill/uL) x 10 — แหล่งข้อมูล [2]
    return retic * rbcMillPerUl * 10;
  }

  function computeRpi(species, retic, patientHct) {
    const normalHct = ANEMIA_NORMAL_HCT[species];
    const correctedRetic = retic * (patientHct / normalHct);
    const row = nearestMaturationRow(species, patientHct);
    const rpi = correctedRetic / row.daysPeripheral;
    return { rpi, row, correctedRetic, normalHct };
  }

  function ddxListHtml(items) {
    return `<ul class="anemia-ddx-list">${items.map((d) =>
      `<li><strong>${d.name}</strong>${d.note ? ` — <span>${d.note}</span>` : ""}</li>`
    ).join("")}</ul>`;
  }

  function refresh() {
    const species = currentSpecies();
    const rbc = parseFloat(rbcInput.value);
    const retic = parseFloat(reticInput.value);
    const hct = parseFloat(hctInput.value);

    if (isNaN(rbc) || rbc <= 0 || isNaN(retic) || retic < 0) {
      resultEl.hidden = true;
      return;
    }

    const arc = computeArc(retic, rbc);
    const band = findGradeBand(species, arc);
    const isRegenerative = band.key === "mild" || band.key === "moderate" || band.key === "marked";
    const isEquivocal = band.key === "equivocal";

    let rpiHtml = "";
    if (!isNaN(hct) && hct > 0) {
      const { rpi, row, normalHct } = computeRpi(species, retic, hct);
      const rpiResponsive = rpi > ANEMIA_RPI_CUTOFF;
      rpiHtml = `
        <div class="result-item">
          <span class="label">RPI (Reticulocyte Production Index) — เสริม</span>
          <span class="value">${round(rpi, 2)} (${rpiResponsive ? "Responsive" : "Nonresponsive"})</span>
        </div>
        <div class="result-note">
          คำนวณจาก Hct ผู้ป่วย ${hct}% เทียบ Hct ปกติ ${normalHct}% หารด้วยตัวคูณ maturation
          (${row.daysPeripheral} วัน ที่ Hct อ้างอิง ${row.hct}% ใกล้เคียงที่สุด) — เกณฑ์ RPI &gt; ${ANEMIA_RPI_CUTOFF} = Responsive,
          RPI &lt; ${ANEMIA_RPI_CUTOFF} = Nonresponsive (แหล่งข้อมูล [1])
        </div>
      `;
    }

    let ddxHtml = "";
    if (isRegenerative) {
      ddxHtml = `
        <h4>Differential Diagnosis ที่เป็นไปได้ (Regenerative Anemia)</h4>
        ${ddxListHtml(ANEMIA_REGENERATIVE_DDX)}
        <div class="result-note">การตอบสนองของไขกระดูก (regeneration) ใช้เวลา 3-5 วันหลังเริ่มมีภาวะเลือดออก/เม็ดเลือดแดงแตก
          หากเพิ่งเริ่มมีอาการอาจยังตรวจไม่พบการตอบสนองแม้สาเหตุจะเป็นกลุ่มนี้จริง</div>
      `;
    } else if (isEquivocal) {
      ddxHtml = `
        <h4>ผลไม่ชัดเจน (Equivocal)</h4>
        <div class="result-note">อาจเป็นภาวะเลือดออก/เม็ดเลือดแดงแตกในระยะแรก (&lt; 3-5 วัน) ที่ไขกระดูกยังตอบสนองไม่เต็มที่
          หรือเป็น anemia ที่ไม่ตอบสนองในระดับเล็กน้อย แนะนำตรวจซ้ำใน 3-5 วัน</div>
        ${ddxListHtml(ANEMIA_NONREGENERATIVE_DDX)}
      `;
    } else {
      ddxHtml = `
        <h4>Differential Diagnosis ที่เป็นไปได้ (Nonregenerative Anemia)</h4>
        ${ddxListHtml(ANEMIA_NONREGENERATIVE_DDX)}
      `;
    }

    let indicesHtml = "";
    const indicesKey = indicesSelect.value;
    if (indicesKey && ANEMIA_INDICES_HINTS[indicesKey]) {
      const hint = ANEMIA_INDICES_HINTS[indicesKey];
      indicesHtml = `
        <div class="result-note"><strong>${hint.label}:</strong> ${hint.note}</div>
      `;
    }

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <h3>ผลการประเมิน Regenerative Anemia</h3>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">Absolute Reticulocyte Count (ARC)</span>
          <span class="value">${round(arc, 1)} พัน/µL <span class="grade-badge grade-${band.grade}">${band.label}</span></span>
        </div>
        ${rpiHtml}
      </div>
      ${indicesHtml}
      ${ddxHtml}
      <div class="result-source">
        ที่มา: [1] "Nonregenerative Anemia Clinical Approach in the Dog and Cat — Mathematical Gamesmanship",
        Bernard F. Feldman, DVM, PhD — WSAVA 2003 World Congress Proceedings (เอกสารที่ผู้ใช้แนบมา) |
        [2] eClinPath, Cornell University College of Veterinary Medicine —
        eclinpath.com/hematology/tests/absolute-reticulocyte-count — ใช้เป็นตัวช่วยประเมินเบื้องต้นเท่านั้น
        ไม่ทดแทนดุลยพินิจทางคลินิก
      </div>
    `;
  }

  [rbcInput, reticInput, hctInput, indicesSelect].forEach((el) => {
    el.addEventListener("input", refresh);
    el.addEventListener("change", refresh);
  });
  document.addEventListener("species-change", refresh);

  refresh();
})();
