(function () {
  "use strict";

  const modeButtons = document.querySelectorAll("[data-apple-mode]");
  const fieldsEl = document.getElementById("apple-fields");
  const resultEl = document.getElementById("apple-result");

  const state = {
    mode: "full",
    selections: {},
    editingKey: null
  };

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function currentSpecies() {
    const activeBtn = document.querySelector(".species-btn.active");
    return activeBtn ? activeBtn.dataset.species : "dog";
  }

  function currentParams() {
    return state.mode === "full" ? APPLE_FULL_PARAMS : APPLE_FAST_PARAMS;
  }

  function nextUnansweredKey() {
    const params = currentParams();
    const p = params.find((param) => state.selections[param.key] === undefined);
    return p ? p.key : null;
  }

  // One parameter shown at a time as tappable option cards (labelled with each option's
  // point value); answered parameters collapse into a compact summary row.
  function renderFields() {
    const params = currentParams();
    const activeKey = state.editingKey || nextUnansweredKey();

    fieldsEl.innerHTML = params.map((param, idx) => {
      const selectedIdx = state.selections[param.key];

      if (param.key === activeKey) {
        const optionsHtml = param.options.map((o, i) => {
          const isActive = selectedIdx === i;
          return `
            <button type="button" class="step-option-btn ${isActive ? "active" : ""}" data-key="${param.key}" data-index="${i}">
              <span class="step-option-score">${o.points}</span>${o.label}
            </button>
          `;
        }).join("");
        return `
          <div class="step-header">
            <h3>${param.label}</h3>
            <span class="step-counter">พารามิเตอร์ ${idx + 1}/${params.length}</span>
          </div>
          ${optionsHtml}
        `;
      }

      if (selectedIdx !== undefined) {
        const opt = param.options[selectedIdx];
        return `
          <button type="button" class="step-summary-row" data-edit-key="${param.key}">
            <span>
              <span class="step-summary-label">${param.label}</span>
              <span class="step-summary-value">${opt.points} — ${opt.label}</span>
            </span>
            <span class="step-summary-edit">แก้ไข</span>
          </button>
        `;
      }

      return "";
    }).join("");

    fieldsEl.querySelectorAll(".step-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selections[btn.dataset.key] = parseInt(btn.dataset.index, 10);
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

    resultEl.hidden = true;
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.mode = btn.dataset.appleMode;
      state.selections = {};
      state.editingKey = null;
      renderFields();
    });
  });

  function refresh() {
    const params = currentParams();
    const answeredCount = Object.keys(state.selections).length;

    if (answeredCount === 0) {
      resultEl.hidden = true;
      return;
    }

    let total = 0;
    params.forEach((p) => {
      const idx = state.selections[p.key];
      if (idx !== undefined) total += p.options[idx].points;
    });

    const maxScore = state.mode === "full" ? APPLE_FULL_MAX : APPLE_FAST_MAX;
    const formula = state.mode === "full" ? APPLE_FULL_FORMULA : APPLE_FAST_FORMULA;
    const modeLabel = state.mode === "full" ? "APPLE (Full)" : "APPLE (Fast)";

    const R = formula.a * total + formula.b;
    const p = Math.exp(R) / (1 + Math.exp(R));

    const incomplete = answeredCount < params.length;
    const speciesWarning = currentSpecies() === "cat"
      ? `<div class="result-out-of-range">APPLE Score พัฒนาและตรวจสอบความแม่นยำเฉพาะในสุนัขเท่านั้น ไม่ควรใช้ตีความในแมว</div>`
      : "";

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <h3>${modeLabel}</h3>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">คะแนนรวม</span>
          <span class="value">${total} / ${maxScore}</span>
        </div>
        <div class="result-item">
          <span class="label">โอกาสเสียชีวิต (probability of non-survival)</span>
          <span class="value">${round(p * 100, 1)}%</span>
        </div>
      </div>
      ${incomplete ? `<div class="warning-text">กรอกแล้ว ${answeredCount}/${params.length} พารามิเตอร์ — พารามิเตอร์ที่ยังไม่เลือกจะไม่ถูกนับคะแนน (ถือเป็น 0) ผลลัพธ์นี้เป็นเพียงค่าประมาณระหว่างกรอกข้อมูลยังไม่ครบ</div>` : ""}
      ${speciesWarning}
      <div class="result-note">
        สูตร: R = (${formula.a} × คะแนน) ${formula.b >= 0 ? "+" : "−"} ${Math.abs(formula.b)}; p = e^R / (1 + e^R)
        — p คือความน่าจะเป็นของการไม่รอดชีวิต (non-survival) จากการเจ็บป่วยนี้ ช่วง 0-1 (แสดงเป็น %)
      </div>
      <div class="result-source">
        ที่มา: "The Canine Acute Physiologic and Laboratory Evaluation Score (APPLE Score)" © Vet Education Pty Ltd 2023, Dr. Philip R Judge —
        อ้างอิงงานวิจัยต้นฉบับ Hayes G, et al. J Vet Intern Med. 2010;24(5):1034-47. ใช้เป็นตัวช่วยประเมินเบื้องต้นเท่านั้น ไม่ทดแทนดุลยพินิจทางคลินิก
      </div>
    `;
  }

  document.addEventListener("species-change", refresh);

  renderFields();
})();
