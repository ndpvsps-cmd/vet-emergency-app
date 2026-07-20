(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");
  const weightLbInput = document.getElementById("weight-lb");
  const speciesButtons = document.querySelectorAll(".species-btn");
  const patientNameInput = document.getElementById("patient-name-input");

  const factorSelect = document.getElementById("rer-factor-select");
  const dietSelect = document.getElementById("diet-select");
  const refeedingSelect = document.getElementById("refeeding-select");
  const mealsSelect = document.getElementById("meals-select");
  const resultEl = document.getElementById("nutrition-result");
  const hintEl = document.getElementById("nutrition-hint");

  const startDateInput = document.getElementById("feeding-start-date");
  const printFeedingBtn = document.getElementById("print-feeding-btn");
  const feedingHintEl = document.getElementById("feeding-plan-hint");
  const feedingMetaEl = document.getElementById("feeding-plan-meta");
  const feedingTable = document.getElementById("feeding-plan-table");
  const feedingTableBody = feedingTable.querySelector("tbody");

  const printFeedingCardBtn = document.getElementById("print-feeding-card-btn");
  const feedingCardHintEl = document.getElementById("feeding-card-hint");
  const feedingCardEl = document.getElementById("feeding-card");

  const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  const state = {
    species: "dog"
  };

  // default the plan's start date to today
  (function initStartDate() {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    startDateInput.value = iso;
  })();

  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function currentWeightKg() {
    const val = parseFloat(weightKgInput.value);
    return isNaN(val) || val <= 0 ? null : val;
  }

  // Rounds a can/pouch count to the nearest eighth and renders it as a mixed-number fraction
  // (eg "1¾") — easier for clinic staff to measure out by eye than a decimal like "1.76".
  function formatFraction(decimalValue) {
    if (decimalValue <= 0) return "0";
    const EIGHTHS_UNICODE = ["", "⅛", "¼", "⅜", "½", "⅝", "¾", "⅞"];
    const eighths = Math.round(decimalValue * 8);
    const whole = Math.floor(eighths / 8);
    const remainder = eighths % 8;
    if (remainder === 0) return `${whole}`;
    return whole > 0 ? `${whole}${EIGHTHS_UNICODE[remainder]}` : EIGHTHS_UNICODE[remainder];
  }

  // Shows grams alongside a can/pouch-count estimate when the diet has a known unit size,
  // so clinic staff can measure out whole/partial cans instead of weighing food.
  function formatAmount(grams, diet) {
    const gramsText = `${round(grams, 1)} g`;
    if (!diet.unitSizeG) return gramsText;
    const units = grams / diet.unitSizeG;
    return `${gramsText} (~${formatFraction(units)} ${diet.unitLabel})`;
  }

  // ---- populate selects ----
  RER_FACTORS.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.key;
    opt.textContent = `${f.label} (x${f.factor})`;
    factorSelect.appendChild(opt);
  });

  function populateDietSelect() {
    dietSelect.innerHTML = "";
    const filtered = DIETS.filter((d) => {
      if (d.species === "Dog/Cat") return true;
      return (state.species === "dog" && d.species === "Dog") ||
             (state.species === "cat" && d.species === "Cat");
    });
    filtered.forEach((d, idx) => {
      const opt = document.createElement("option");
      opt.value = DIETS.indexOf(d);
      const unitHint = d.unitSizeG ? `, ${d.unitSizeG} g/${d.unitLabel}` : "";
      opt.textContent = `${d.brand} ${d.line} (${d.energyKcalPerKg} kcal/kg, ${d.form === "wet" ? "เปียก" : "แห้ง"}${unitHint})`;
      dietSelect.appendChild(opt);
    });
  }

  REFEEDING_SCHEDULE.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.key;
    opt.textContent = r.label;
    refeedingSelect.appendChild(opt);
  });
  refeedingSelect.value = "full";

  populateDietSelect();

  // ---- keep species in sync with the shared species toggle ----
  speciesButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.species = btn.dataset.species;
      populateDietSelect();
      refreshAll();
    });
  });

  function refreshAll() {
    refresh();
    refreshFeedingPlan();
    refreshFeedingCard();
  }

  weightKgInput.addEventListener("input", refreshAll);
  weightLbInput.addEventListener("input", refreshAll);
  factorSelect.addEventListener("change", refreshAll);
  dietSelect.addEventListener("change", refreshAll);
  refeedingSelect.addEventListener("change", refresh);
  mealsSelect.addEventListener("change", refreshAll);
  startDateInput.addEventListener("input", refreshFeedingPlan);
  patientNameInput.addEventListener("input", refreshFeedingCard);

  function refresh() {
    const weightKg = currentWeightKg();
    if (weightKg === null || dietSelect.value === "") {
      resultEl.hidden = true;
      hintEl.hidden = false;
      return;
    }
    hintEl.hidden = true;

    const factorEntry = RER_FACTORS.find((f) => f.key === factorSelect.value) || RER_FACTORS[0];
    const diet = DIETS[parseInt(dietSelect.value, 10)];
    const refeedEntry = REFEEDING_SCHEDULE.find((r) => r.key === refeedingSelect.value) || REFEEDING_SCHEDULE[REFEEDING_SCHEDULE.length - 1];
    const mealsPerDay = parseInt(mealsSelect.value, 10);

    const rer = 70 * Math.pow(weightKg, 0.75);
    const der = rer * factorEntry.factor;
    const targetKcalToday = der * refeedEntry.fraction;

    const amountGramsPerDay = (targetKcalToday / diet.energyKcalPerKg) * 1000;
    const amountGramsPerMeal = amountGramsPerDay / mealsPerDay;

    const capLowMl = weightKg * GASTRIC_CAPACITY_ML_PER_KG.low;
    const capHighMl = weightKg * GASTRIC_CAPACITY_ML_PER_KG.high;

    let capacityHtml;
    if (diet.form === "wet") {
      // Approximation: for liquid/wet/blenderized diets, 1 g is treated as ~1 mL.
      const overCapacity = amountGramsPerMeal > capHighMl;
      capacityHtml = `
        <div class="result-note"><strong>ความจุกระเพาะโดยประมาณ:</strong> ${round(capLowMl, 1)} - ${round(capHighMl, 1)} mL (10-20 mL/kg)</div>
        <div class="${overCapacity ? "result-out-of-range" : "result-note"}">
          ปริมาณต่อมื้อ (~${round(amountGramsPerMeal, 1)} mL โดยประมาณ 1 g ≈ 1 mL)
          ${overCapacity ? "เกินความจุกระเพาะโดยประมาณ — พิจารณาเพิ่มจำนวนมื้อ" : "อยู่ในช่วงความจุกระเพาะโดยประมาณ"}
        </div>
      `;
    } else {
      capacityHtml = `
        <div class="result-note"><strong>ความจุกระเพาะโดยประมาณ:</strong> ${round(capLowMl, 1)} - ${round(capHighMl, 1)} mL (10-20 mL/kg) —
        ไม่สามารถประมาณปริมาตรของอาหารเม็ดแห้งได้แม่นยำ (ปริมาตรต่อกรัมแตกต่างกันตามยี่ห้อ) ใช้เป็นข้อมูลอ้างอิงเท่านั้น</div>
      `;
    }

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <div class="result-rate">
        <strong>RER:</strong> ${round(rer, 1)} kcal/day &nbsp;|&nbsp;
        <strong>DER (x${factorEntry.factor}):</strong> ${round(der, 1)} kcal/day
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">พลังงานเป้าหมายวันนี้ (kcal)</span>
          <span class="value">${round(targetKcalToday, 1)}</span>
        </div>
        <div class="result-item">
          <span class="label">ปริมาณอาหารต่อวัน</span>
          <span class="value" style="font-size:1.05rem;">${formatAmount(amountGramsPerDay, diet)}</span>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">ปริมาณต่อมื้อ (${mealsPerDay} มื้อ/วัน)</span>
          <span class="value" style="font-size:1.05rem;">${formatAmount(amountGramsPerMeal, diet)}</span>
        </div>
        <div class="result-item">
          <span class="label">อาหารที่เลือก</span>
          <span class="value" style="font-size:0.95rem;">${diet.brand} ${diet.line}</span>
        </div>
      </div>
      ${capacityHtml}
      <div class="result-source">
        RER = 70 x BW(kg)^0.75; ปัจจัย DER มาตรฐานจาก WSAVA Global Nutrition Guidelines/ตำราโภชนศาสตร์สัตวแพทย์ทั่วไป —
        ความจุกระเพาะ (10-20 mL/kg ตามที่ผู้ใช้ยืนยัน) และแนวคิดค่อยเป็นค่อยไป (เริ่ม 1/3 RER) จาก 2024 AAHA Fluid Therapy Guidelines for Dogs and Cats, p.145
      </div>
    `;
  }

  function formatThaiDate(date) {
    const day = date.getDate();
    const month = THAI_MONTHS[date.getMonth()];
    const buddhistYear = date.getFullYear() + 543;
    const yy = String(buddhistYear).slice(-2);
    return `${day} ${month} ${yy}`;
  }

  function refreshFeedingPlan() {
    const weightKg = currentWeightKg();
    if (weightKg === null || dietSelect.value === "" || !startDateInput.value) {
      feedingTable.hidden = true;
      feedingMetaEl.hidden = true;
      feedingHintEl.hidden = false;
      return;
    }
    feedingHintEl.hidden = true;

    const factorEntry = RER_FACTORS.find((f) => f.key === factorSelect.value) || RER_FACTORS[0];
    const diet = DIETS[parseInt(dietSelect.value, 10)];
    const mealsPerDay = parseInt(mealsSelect.value, 10);

    const rer = 70 * Math.pow(weightKg, 0.75);
    const der = rer * factorEntry.factor;

    // The printable plan always shows the 3-day refeeding ramp (1/3 -> 2/3 -> full),
    // independent of the "refeeding-select" dropdown used for the single-day result above.
    const rampDays = REFEEDING_SCHEDULE.filter((r) => r.key === "day1" || r.key === "day2" || r.key === "day3");

    const startDate = new Date(startDateInput.value + "T00:00:00");

    feedingTableBody.innerHTML = "";
    rampDays.forEach((entry, i) => {
      const rowDate = new Date(startDate);
      rowDate.setDate(rowDate.getDate() + i);

      const targetKcal = der * entry.fraction;
      const gramsPerDay = (targetKcal / diet.energyKcalPerKg) * 1000;
      const gramsPerMeal = gramsPerDay / mealsPerDay;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatThaiDate(rowDate)}</td>
        <td>${round(entry.fraction * 100, 0)}% (${entry.key === "day1" ? "1/3" : entry.key === "day2" ? "2/3" : "3/3"} RER)</td>
        <td>${round(targetKcal, 1)}</td>
        <td>${formatAmount(gramsPerDay, diet)}</td>
        <td>${formatAmount(gramsPerMeal, diet)}</td>
      `;
      feedingTableBody.appendChild(row);
    });

    feedingTable.hidden = false;
    feedingMetaEl.hidden = false;
    const speciesLabel = state.species === "dog" ? "สุนัข" : "แมว";
    feedingMetaEl.innerHTML = `
      ผู้ป่วย: ${speciesLabel} ${weightKg} กก. &nbsp;|&nbsp; RER: ${round(rer, 1)} kcal/day &nbsp;|&nbsp;
      DER (x${factorEntry.factor}): ${round(der, 1)} kcal/day &nbsp;|&nbsp; อาหาร: ${diet.brand} ${diet.line} &nbsp;|&nbsp;
      ${mealsPerDay} มื้อ/วัน
      <br>อ้างอิง: เริ่มให้อาหารทางลำไส้ที่ 1/3 RER เพื่อป้องกัน refeeding syndrome — 2024 AAHA Fluid Therapy Guidelines for Dogs and Cats, p.145
    `;
  }

  function refreshFeedingCard() {
    const weightKg = currentWeightKg();
    if (weightKg === null || dietSelect.value === "") {
      feedingCardEl.hidden = true;
      feedingCardHintEl.hidden = false;
      return;
    }
    feedingCardHintEl.hidden = true;

    const factorEntry = RER_FACTORS.find((f) => f.key === factorSelect.value) || RER_FACTORS[0];
    const diet = DIETS[parseInt(dietSelect.value, 10)];
    const mealsPerDay = parseInt(mealsSelect.value, 10);

    // The card always shows the normal steady-state plan (fraction = 1, no refeeding ramp),
    // regardless of the "refeeding-select" dropdown used for the single-day result above.
    const rer = 70 * Math.pow(weightKg, 0.75);
    const der = rer * factorEntry.factor;

    const gramsPerDay = (der / diet.energyKcalPerKg) * 1000;
    const gramsPerMeal = gramsPerDay / mealsPerDay;

    const speciesLabel = state.species === "dog" ? "สุนัข" : "แมว";
    const name = patientNameInput.value.trim();

    feedingCardEl.hidden = false;
    feedingCardEl.innerHTML = `
      <div class="feeding-card-title">🐾 การ์ดให้อาหาร</div>
      <div class="feeding-card-name">${name ? name : "(ไม่ได้ระบุชื่อสัตว์)"}</div>
      <div class="feeding-card-row"><span>ชนิดสัตว์</span><span>${speciesLabel}</span></div>
      <div class="feeding-card-row"><span>น้ำหนักตัว</span><span>${weightKg} กก.</span></div>
      <div class="feeding-card-row"><span>ชนิดอาหาร</span><span>${diet.brand} ${diet.line}</span></div>
      <div class="feeding-card-highlight">
        <div class="feeding-card-highlight-label">ให้ต่อมื้อ (${mealsPerDay} มื้อ/วัน)</div>
        <div class="feeding-card-highlight-value">${formatAmount(gramsPerMeal, diet)}</div>
      </div>
      <div class="feeding-card-row"><span>รวมต่อวัน</span><span>${formatAmount(gramsPerDay, diet)}</span></div>
      <div class="feeding-card-row"><span>พลังงานต่อวัน</span><span>${round(der, 1)} kcal</span></div>
      <div class="feeding-card-footer">พิมพ์เมื่อ ${formatThaiDate(new Date())}</div>
    `;
  }

  printFeedingBtn.addEventListener("click", () => {
    document.body.classList.add("print-feeding-plan");
    window.print();
  });
  printFeedingCardBtn.addEventListener("click", () => {
    document.body.classList.add("print-feeding-card");
    window.print();
  });
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-feeding-plan");
    document.body.classList.remove("print-feeding-card");
  });

  refreshAll();
})();
