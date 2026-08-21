(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");

  const drugSearchInput = document.getElementById("cri-drug-search");
  const drugListEl = document.getElementById("cri-drug-list");
  const drugInfoEl = document.getElementById("cri-drug-info");

  const doseRow = document.getElementById("cri-dose-row");
  const doseLabel = document.getElementById("cri-dose-label");
  const doseInput = document.getElementById("cri-dose-input");

  const concRow = document.getElementById("cri-conc-row");
  const concSelect = document.getElementById("cri-conc-select");
  const concCustomRow = document.getElementById("cri-conc-custom-row");
  const concCustomLabel = document.querySelector("#cri-conc-custom-row label");
  const concCustomInput = document.getElementById("cri-conc-custom-input");

  const bagSelect = document.getElementById("cri-bag-select");
  const rateInput = document.getElementById("cri-rate-input");

  const hintEl = document.getElementById("cri-hint");
  const resultEl = document.getElementById("cri-result");

  const state = {
    selectedDrug: null,
    selectedConcentration: null
  };

  // mass units relative to 1 mg (mcg/mg/g family). U, IU, mEq are self-contained families (factor 1)
  // since a drug's rateUnit and concUnit mass always come from the same family in this database.
  const MASS_TO_MG = { mcg: 0.001, mg: 1, g: 1000 };
  const TIME_TO_HOUR = { min: 60, h: 1, day: 1 / 24 };

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

  function massUnitOf(unit) {
    return unit.split("/")[0];
  }

  function massFactor(unit) {
    return MASS_TO_MG[unit] !== undefined ? MASS_TO_MG[unit] : 1;
  }

  // range in rateUnit for the current species (some drugs differ between dog/cat)
  function getDoseRange(drug, species) {
    if (drug.species) {
      return drug.species[species] || drug.species.dog;
    }
    return { doseLow: drug.doseLow, doseHigh: drug.doseHigh };
  }

  function getLoadingDose(drug, species) {
    if (!drug.loadingDose) return null;
    if (drug.loadingDose.dog || drug.loadingDose.cat) {
      return drug.loadingDose[species];
    }
    return drug.loadingDose;
  }

  // ---- drug search ----
  function renderDrugList(query) {
    drugListEl.innerHTML = "";
    if (!query) return;
    const q = query.trim().toLowerCase();
    const matches = CRI_DRUGS.filter((d) => d.name.toLowerCase().includes(q));
    matches.forEach((drug) => {
      const item = document.createElement("div");
      item.className = "drug-option";
      item.innerHTML = `${drug.name}<div class="drug-cat">${drug.category}</div>`;
      item.addEventListener("click", () => {
        selectDrug(drug);
        drugSearchInput.value = drug.name;
        drugListEl.innerHTML = "";
      });
      drugListEl.appendChild(item);
    });
  }

  drugSearchInput.addEventListener("input", () => {
    state.selectedDrug = null;
    doseRow.hidden = true;
    concRow.hidden = true;
    drugInfoEl.hidden = true;
    renderDrugList(drugSearchInput.value);
    refresh();
  });

  document.addEventListener("click", (e) => {
    if (!drugListEl.contains(e.target) && e.target !== drugSearchInput) {
      drugListEl.innerHTML = "";
    }
  });

  function selectDrug(drug) {
    state.selectedDrug = drug;
    doseInput.value = "";
    concCustomInput.value = "";
    concCustomRow.hidden = true;

    concRow.hidden = false;
    concSelect.innerHTML = "";
    const concMassUnit = massUnitOf(drug.concUnit);
    drug.concentrations.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = `${c} ${concMassUnit}/mL`;
      concSelect.appendChild(opt);
    });
    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "อื่นๆ (กรอกเอง)";
    concSelect.appendChild(customOpt);

    concCustomLabel.textContent = `ความเข้มข้นยา (${concMassUnit}/mL) — กรอกเอง`;
    state.selectedConcentration = drug.concentrations[0] || null;

    doseRow.hidden = false;
    doseLabel.textContent = `ขนาดยาที่ต้องการ (${drug.rateUnit})`;

    renderDrugInfo();
    refresh();
  }

  function renderDrugInfo() {
    const drug = state.selectedDrug;
    if (!drug) {
      drugInfoEl.hidden = true;
      return;
    }
    const species = currentSpecies();
    const speciesLabel = species === "dog" ? "สุนัข" : "แมว";
    const range = getDoseRange(drug, species);
    const loading = getLoadingDose(drug, species);

    drugInfoEl.hidden = false;
    drugInfoEl.innerHTML = `
      <strong>${drug.name}</strong> — ${drug.category}<br>
      ${drug.notes ? drug.notes + "<br>" : ""}
      <strong>ช่วงยาอ้างอิง (${speciesLabel}):</strong> ${round(range.doseLow, 5)} - ${round(range.doseHigh, 5)} ${drug.rateUnit}
      ${loading ? `<br><strong>ขนาดยาเริ่มต้น (Loading dose):</strong> ${round(loading.low, 5)}${loading.low === loading.high ? "" : " - " + round(loading.high, 5)} ${loading.unit} ${loading.route}` : ""}
    `;
  }

  concSelect.addEventListener("change", () => {
    if (concSelect.value === "custom") {
      concCustomRow.hidden = false;
      state.selectedConcentration = parseFloat(concCustomInput.value) || null;
    } else {
      concCustomRow.hidden = true;
      state.selectedConcentration = parseFloat(concSelect.value);
    }
    refresh();
  });

  concCustomInput.addEventListener("input", () => {
    state.selectedConcentration = parseFloat(concCustomInput.value) || null;
    refresh();
  });

  doseInput.addEventListener("input", refresh);
  bagSelect.addEventListener("change", refresh);
  rateInput.addEventListener("input", refresh);
  document.addEventListener("species-change", () => {
    renderDrugInfo();
    refresh();
  });
  weightKgInput.addEventListener("input", refresh);

  function refresh() {
    const drug = state.selectedDrug;
    const weightKg = currentWeightKg();
    const doseValue = parseFloat(doseInput.value);
    const bagVolumeMl = parseFloat(bagSelect.value);
    const fluidRateMlHr = parseFloat(rateInput.value);
    const concentration = state.selectedConcentration;

    if (!drug || weightKg === null || isNaN(doseValue) || doseValue <= 0 ||
        !concentration || isNaN(fluidRateMlHr) || fluidRateMlHr <= 0) {
      resultEl.hidden = true;
      hintEl.hidden = false;
      return;
    }

    hintEl.hidden = true;
    resultEl.hidden = false;

    const species = currentSpecies();
    const range = getDoseRange(drug, species);
    const outOfRange = doseValue < range.doseLow || doseValue > range.doseHigh;

    const [doseMassUnit, , doseTimeUnit] = drug.rateUnit.split("/");
    const concMassUnit = massUnitOf(drug.concUnit);
    const conversionFactor = massFactor(doseMassUnit) / massFactor(concMassUnit);

    // amount (in concMassUnit) needed per kg per hour
    const perKgPerHour = doseValue * TIME_TO_HOUR[doseTimeUnit] * conversionFactor;
    const totalPerHour = perKgPerHour * weightKg; // concMassUnit / hour delivered to patient
    const concNeededPerMl = totalPerHour / fluidRateMlHr; // concMassUnit / mL needed in the bag
    const totalAmountInBag = concNeededPerMl * bagVolumeMl; // total concMassUnit needed in the bag
    const drugVolumeMl = totalAmountInBag / concentration; // mL of stock drug to draw up

    const exceedsBag = drugVolumeMl > bagVolumeMl;

    resultEl.innerHTML = `
      <h3>${drug.name}</h3>
      <div class="result-rate">
        <strong>ขนาดยาที่ใช้คำนวณ:</strong> ${round(doseValue, 5)} ${drug.rateUnit} &nbsp;|&nbsp;
        <strong>ความเข้มข้นที่ใช้คำนวณ:</strong> ${concentration} ${concMassUnit}/mL
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">ยาที่ต้องได้รับ</span>
          <span class="value">${round(totalPerHour, 4)} ${concMassUnit}/hr</span>
        </div>
        <div class="result-item">
          <span class="label">ที่อัตราสารน้ำ ${fluidRateMlHr} mL/hr</span>
          <span class="value">${round(concNeededPerMl * 1000, 4)} ${concMassUnit}/L</span>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">ปริมาณยาเข้มข้น (${concentration} ${concMassUnit}/mL) ที่ต้องเติมในถุง/ไซริงค์ ${bagVolumeMl} mL</span>
          <span class="value">${round(drugVolumeMl, 3)} mL</span>
        </div>
        <div class="result-item">
          <span class="label">รวมยาที่ต้องเติม</span>
          <span class="value">${round(totalAmountInBag, 4)} ${concMassUnit}</span>
        </div>
      </div>
      ${exceedsBag ? `<div class="result-out-of-range">ปริมาณยาเข้มข้นที่ต้องเติม (${round(drugVolumeMl, 2)} mL) มากกว่าขนาดถุง/ไซริงค์ที่เลือก — กรุณาเลือกถุงที่ใหญ่ขึ้นหรือความเข้มข้นยาที่สูงขึ้น</div>` : ""}
      ${outOfRange ? `<div class="result-out-of-range">ขนาดยาที่กรอก (${round(doseValue, 5)} ${drug.rateUnit}) อยู่นอกช่วงอ้างอิงของ${species === "dog" ? "สุนัข" : "แมว"} (${round(range.doseLow, 5)} - ${round(range.doseHigh, 5)} ${drug.rateUnit}) กรุณาตรวจสอบซ้ำ</div>` : ""}
      <div class="result-note">
        <strong>ข้อควรระวัง:</strong> ก่อนผสม ให้ดึงสารน้ำเดิมออกจากถุง/ไซริงค์ในปริมาตรเท่ากับยาที่จะเติม (ถ้าใช้ถุงสำเร็จรูป) กลับถุงคว่ำ-หงายผสมให้เข้ากันดี
        ติดฉลากระบุชื่อยา ความเข้มข้นหลังผสม และอัตราการให้ให้ชัดเจน ใช้ fluid/syringe pump ควบคุมอัตราอย่างเคร่งครัด และคำนวณใหม่ทุกครั้งที่เปลี่ยนอัตราสารน้ำ
      </div>
      <div class="result-source">
        ขนาดยาอ้างอิงจาก ${drug.source}, Manual of Small Animal Emergency and Critical Care Medicine, 2nd Edition (Macintire, Drobatz, Haskins, Saxon, eds.), 2012
      </div>
    `;
  }

  refresh();
})();
