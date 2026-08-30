(function () {
  "use strict";

  const fieldsEl = document.getElementById("mgcs-fields");
  const resultEl = document.getElementById("mgcs-result");

  const state = { selections: {}, editingKey: null };

  function findBand(score) {
    return MGCS_PROGNOSIS_BANDS.find((b) => score >= b.low && score <= b.high) || null;
  }

  // The next category with no answer yet — drives the step-by-step flow forward.
  function nextUnansweredKey() {
    const cat = MGCS_CATEGORIES.find((c) => state.selections[c.key] === undefined);
    return cat ? cat.key : null;
  }

  // Renders each category as either: a compact answered summary row (tap to re-open and
  // change it), or — for the single category currently being answered — its full list of
  // tappable option cards. Categories not yet reached simply don't render yet, so the form
  // reveals itself one step at a time instead of showing three long dropdowns at once.
  function renderFields() {
    const activeKey = state.editingKey || nextUnansweredKey();

    fieldsEl.innerHTML = MGCS_CATEGORIES.map((cat, idx) => {
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
            <h3>${idx + 1}. ${cat.label}</h3>
            <span class="step-counter">หมวดที่ ${idx + 1}/${MGCS_CATEGORIES.length}</span>
          </div>
          ${optionsHtml}
        `;
      }

      if (selected !== undefined) {
        const opt = cat.options.find((o) => o.score === selected);
        return `
          <button type="button" class="step-summary-row" data-edit-key="${cat.key}">
            <span>
              <span class="step-summary-label">${idx + 1}. ${cat.label}</span>
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
