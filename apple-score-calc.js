(function () {
  "use strict";

  const modeButtons = document.querySelectorAll("[data-apple-mode]");
  const fieldsEl = document.getElementById("apple-fields");
  const resultEl = document.getElementById("apple-result");

  const state = {
    mode: "full",
    selections: {}
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

  function renderFields() {
    const params = currentParams();
    state.selections = {};
    fieldsEl.innerHTML = params.map((p) => {
      const options = p.options.map((o, i) =>
        `<option value="${i}">${o.label} (${o.points})</option>`
      ).join("");
      return `
        <div class="field-row">
          <label for="apple-field-${p.key}">${p.label}</label>
          <select id="apple-field-${p.key}" data-key="${p.key}">
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

    resultEl.hidden = true;
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.mode = btn.dataset.appleMode;
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
