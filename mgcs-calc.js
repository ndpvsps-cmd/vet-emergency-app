(function () {
  "use strict";

  const fieldsEl = document.getElementById("mgcs-fields");
  const resultEl = document.getElementById("mgcs-result");

  const state = { selections: {} };

  function findBand(score) {
    return MGCS_PROGNOSIS_BANDS.find((b) => score >= b.low && score <= b.high) || null;
  }

  function renderFields() {
    fieldsEl.innerHTML = MGCS_CATEGORIES.map((cat) => {
      const options = cat.options.map((o) =>
        `<option value="${o.score}">${o.score} — ${o.label}</option>`
      ).join("");
      return `
        <div class="field-row">
          <label for="mgcs-field-${cat.key}">${cat.label}</label>
          <select id="mgcs-field-${cat.key}" data-key="${cat.key}">
            <option value="">— เลือก —</option>
            ${options}
          </select>
        </div>
      `;
    }).join("");

    fieldsEl.querySelectorAll("select").forEach((sel) => {
      sel.addEventListener("change", () => {
        const key = sel.dataset.key;
        if (sel.value === "") {
          delete state.selections[key];
        } else {
          state.selections[key] = parseInt(sel.value, 10);
        }
        refresh();
      });
    });
  }

  function refresh() {
    const answeredCount = Object.keys(state.selections).length;
    if (answeredCount === 0) {
      resultEl.hidden = true;
      return;
    }

    const total = MGCS_CATEGORIES.reduce((sum, cat) => sum + (state.selections[cat.key] || 0), 0);
    const incomplete = answeredCount < MGCS_CATEGORIES.length;
    const band = incomplete ? null : findBand(total);

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <h3>Modified Glasgow Coma Scale</h3>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">คะแนนรวม</span>
          <span class="value">${total} / 18</span>
        </div>
        <div class="result-item">
          <span class="label">การพยากรณ์โรค (Prognosis)</span>
          <span class="value" style="font-size:1.05rem;">${band ? band.label : "-"}</span>
        </div>
      </div>
      ${incomplete ? `<div class="warning-text">กรอกแล้ว ${answeredCount}/${MGCS_CATEGORIES.length} หมวด — เลือกให้ครบทั้ง 3 หมวดเพื่อดูคะแนนรวมและการพยากรณ์โรคที่ถูกต้อง</div>` : ""}
      <div class="result-note">
        ช่วงคะแนน-พยากรณ์โรค: 3-7 = Grave &nbsp;|&nbsp; 8-13 = Poor to Guarded &nbsp;|&nbsp; 14-18 = Fair to Good
      </div>
      <div class="result-source">
        คำอธิบายแต่ละระดับคะแนน: Table 1. Modified Glasgow Coma Scale, © 2025 Veterinary Committee on Trauma, ACVECC and Colorado State University
        (อ้างอิงงานวิจัยต้นฉบับ Platt SR, et al. J Vet Intern Med. 2001) — ช่วงคะแนน-พยากรณ์โรคอ้างอิงจากภาพประกอบที่ผู้ใช้ให้มา
        ซึ่งเป็นช่วงที่เผยแพร่ทั่วไปจากแหล่งข้อมูลเดียวกัน
      </div>
    `;
  }

  renderFields();
})();
