(function () {
  "use strict";

  const fieldsEl = document.getElementById("att-fields");
  const resultEl = document.getElementById("att-result");

  const state = { selections: {}, editingKey: null };

  function findBand(score) {
    return ATT_PROGNOSIS_BANDS.find((b) => score >= b.low && score <= b.high) || null;
  }

  function nextUnansweredKey() {
    const cat = ATT_CATEGORIES.find((c) => state.selections[c.key] === undefined);
    return cat ? cat.key : null;
  }

  // One category shown at a time as tappable option cards; answered categories collapse
  // into a compact summary row (tap "แก้ไข" to reopen and change it).
  function renderFields() {
    const activeKey = state.editingKey || nextUnansweredKey();

    fieldsEl.innerHTML = ATT_CATEGORIES.map((cat, idx) => {
      const selected = state.selections[cat.key];

      if (cat.key === activeKey) {
        const optionsHtml = cat.options.map((o) => {
          const isActive = selected === o.score;
          return `
            <button type="button" class="step-option-btn ${isActive ? "active" : ""}" data-key="${cat.key}" data-score="${o.score}">
              <span class="step-option-score">${o.score}</span>${o.label}
            </button>
          `;
        }).join("");
        return `
          <div class="step-header">
            <h3>${cat.label}</h3>
            <span class="step-counter">ระบบที่ ${idx + 1}/${ATT_CATEGORIES.length}</span>
          </div>
          ${optionsHtml}
        `;
      }

      if (selected !== undefined) {
        const opt = cat.options.find((o) => o.score === selected);
        return `
          <button type="button" class="step-summary-row" data-edit-key="${cat.key}">
            <span>
              <span class="step-summary-label">${cat.label}</span>
              <span class="step-summary-value">${selected} — ${opt.label}</span>
            </span>
            <span class="step-summary-edit">แก้ไข</span>
          </button>
        `;
      }

      return "";
    }).join("");

    fieldsEl.querySelectorAll(".step-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selections[btn.dataset.key] = parseInt(btn.dataset.score, 10);
        state.editingKey = null;
        renderFields();
        refresh();
      });
    });

    fieldsEl.querySelectorAll("[data-edit-key]").forEach((row) => {
      row.addEventListener("click", () => {
        state.editingKey = row.dataset.editKey;
        renderFields();
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
