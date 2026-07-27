(function () {
  "use strict";

  const fieldsEl = document.getElementById("att-fields");
  const resultEl = document.getElementById("att-result");

  const state = { selections: {} };

  function findBand(score) {
    return ATT_PROGNOSIS_BANDS.find((b) => score >= b.low && score <= b.high) || null;
  }

  function renderFields() {
    fieldsEl.innerHTML = ATT_CATEGORIES.map((cat) => {
      const options = cat.options.map((o) =>
        `<option value="${o.score}">${o.score} — ${o.label}</option>`
      ).join("");
      return `
        <div class="field-row">
          <label for="att-field-${cat.key}">${cat.label}</label>
          <select id="att-field-${cat.key}" data-key="${cat.key}">
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

    const total = ATT_CATEGORIES.reduce((sum, cat) => sum + (state.selections[cat.key] || 0), 0);
    const incomplete = answeredCount < ATT_CATEGORIES.length;
    const band = incomplete ? null : findBand(total);

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <h3>ATT Score</h3>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">คะแนนรวม</span>
          <span class="value">${total} / ${ATT_MAX_SCORE}</span>
        </div>
        <div class="result-item">
          <span class="label">การแปลผล</span>
          <span class="value" style="font-size:1rem;">${band ? band.label : "-"}</span>
        </div>
      </div>
      ${incomplete ? `<div class="warning-text">ประเมินแล้ว ${answeredCount}/${ATT_CATEGORIES.length} ระบบ — เลือกให้ครบทั้ง 6 ระบบเพื่อดูคะแนนรวมและการแปลผลที่ถูกต้อง</div>` : ""}
      <div class="result-note">
        ช่วงคะแนน-การแปลผล: 0-3 = ความรุนแรงต่ำ โอกาสรอดชีวิตสูง &nbsp;|&nbsp; 4-8 = ความรุนแรงปานกลาง ต้องเฝ้าระวังใกล้ชิด &nbsp;|&nbsp;
        9-18 = ความรุนแรงสูงมาก มีโอกาสเสียชีวิตสูง ต้องได้รับการกู้ชีพและดูแลแบบวิกฤตทันที
      </div>
      <div class="result-source">
        ที่มา: "แบบฟอร์มการประเมิน ATT Score (Animal Trauma Triage Score)" — เอกสารที่ผู้ใช้แนบมา ใช้เป็นตัวช่วยประเมินเบื้องต้นเท่านั้น ไม่ทดแทนดุลยพินิจทางคลินิก
      </div>
    `;
  }

  renderFields();
})();
