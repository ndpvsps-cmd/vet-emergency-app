(function () {
  "use strict";

  const LB_TO_KG = 0.45359237;

  const WEIGHT_BOUNDS = {
    dog: { min: 0.5, max: 90 },
    cat: { min: 0.5, max: 15 }
  };

  const state = {
    species: "dog",
    weightKg: null,
    selectedDrug: null,
    selectedConcentration: null,
    // per-drug concentration overrides for the crash cart table (keyed by drug name)
    crashcartConcentrations: {}
  };

  // ---- element refs ----
  const disclaimerEl = document.getElementById("disclaimer");
  const disclaimerToggle = document.getElementById("disclaimer-toggle");

  const speciesButtons = document.querySelectorAll(".species-btn");
  const weightKgInput = document.getElementById("weight-kg");
  const weightLbInput = document.getElementById("weight-lb");
  const weightWarning = document.getElementById("weight-warning");

  const drugSearchInput = document.getElementById("drug-search");
  const drugListEl = document.getElementById("drug-list");
  const concentrationRow = document.getElementById("concentration-row");
  const concentrationSelect = document.getElementById("concentration-select");
  const calcResultEl = document.getElementById("calc-result");

  const crashcartHint = document.getElementById("crashcart-hint");
  const crashcartTable = document.getElementById("crashcart-table");
  const crashcartBody = crashcartTable.querySelector("tbody");
  const printBtn = document.getElementById("print-btn");

  // ---- helpers ----
  function round(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function formatRange(low, high, decimals) {
    const l = round(low, decimals);
    const h = round(high, decimals);
    return l === h ? String(l) : `${l} - ${h}`;
  }

  function isWeightOutOfRange(species, weightKg) {
    const bounds = WEIGHT_BOUNDS[species];
    return weightKg < bounds.min || weightKg > bounds.max;
  }

  // "mg/kg" -> "mg", "U/kg" -> "U", "mEq/kg" -> "mEq" (concentration is always this unit per mL)
  function doseUnitOf(spec) {
    return spec.unit.split("/")[0];
  }

  // drugs marked perMinute are dosed as a continuous rate (eg mcg/kg/min), not a one-time bolus
  function isPerMinute(drug) {
    return !!drug.perMinute;
  }

  function computeDose(drug, species, weightKg, concentration) {
    const spec = drug.species[species];
    const doseLowMg = spec.doseLow * weightKg;
    const doseHighMg = spec.doseHigh * weightKg;
    const volumeLowMl = concentration ? doseLowMg / concentration : null;
    const volumeHighMl = concentration ? doseHighMg / concentration : null;
    return { spec, doseLowMg, doseHighMg, volumeLowMl, volumeHighMl };
  }

  // ---- disclaimer ----
  disclaimerToggle.addEventListener("click", () => {
    const collapsed = disclaimerEl.classList.toggle("collapsed");
    disclaimerToggle.textContent = collapsed ? "ขยาย" : "ย่อ";
  });

  // ---- species toggle ----
  speciesButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      speciesButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.species = btn.dataset.species;
      refreshWeightWarning();
      refreshCalculator();
      refreshCrashcart();
    });
  });

  // ---- weight inputs ----
  function refreshWeightWarning() {
    if (state.weightKg === null || isNaN(state.weightKg)) {
      weightWarning.hidden = true;
      return;
    }
    if (isWeightOutOfRange(state.species, state.weightKg)) {
      weightWarning.hidden = false;
      weightWarning.textContent =
        `น้ำหนัก ${state.weightKg} กก. อยู่นอกช่วงปกติของ${state.species === "dog" ? "สุนัข" : "แมว"} กรุณาตรวจสอบค่าน้ำหนักอีกครั้งก่อนคำนวณ`;
    } else {
      weightWarning.hidden = true;
    }
  }

  weightKgInput.addEventListener("input", () => {
    const val = parseFloat(weightKgInput.value);
    state.weightKg = weightKgInput.value === "" ? null : val;
    weightLbInput.value = state.weightKg !== null && !isNaN(state.weightKg)
      ? round(state.weightKg / LB_TO_KG, 2)
      : "";
    refreshWeightWarning();
    refreshCalculator();
    refreshCrashcart();
  });

  weightLbInput.addEventListener("input", () => {
    const val = parseFloat(weightLbInput.value);
    const kg = weightLbInput.value === "" ? null : val * LB_TO_KG;
    state.weightKg = kg !== null ? round(kg, 2) : null;
    weightKgInput.value = state.weightKg !== null && !isNaN(state.weightKg) ? state.weightKg : "";
    refreshWeightWarning();
    refreshCalculator();
    refreshCrashcart();
  });

  // ---- drug search ----
  function renderDrugList(query) {
    drugListEl.innerHTML = "";
    if (!query) return;
    const q = query.trim().toLowerCase();
    const matches = DRUGS.filter((d) => d.name.toLowerCase().includes(q));
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
    renderDrugList(drugSearchInput.value);
  });

  document.addEventListener("click", (e) => {
    if (!drugListEl.contains(e.target) && e.target !== drugSearchInput) {
      drugListEl.innerHTML = "";
    }
  });

  function selectDrug(drug) {
    state.selectedDrug = drug;
    concentrationRow.hidden = false;
    concentrationSelect.innerHTML = "";
    const anySpec = drug.species.dog || drug.species.cat;
    const concUnit = anySpec ? doseUnitOf(anySpec) : "mg";
    drug.concentrations.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = `${c} ${concUnit}/mL`;
      concentrationSelect.appendChild(opt);
    });
    state.selectedConcentration = drug.concentrations[0] || null;
    refreshCalculator();
  }

  concentrationSelect.addEventListener("change", () => {
    state.selectedConcentration = parseFloat(concentrationSelect.value);
    refreshCalculator();
  });

  function refreshCalculator() {
    if (!state.selectedDrug || state.weightKg === null || isNaN(state.weightKg) || state.weightKg <= 0) {
      calcResultEl.hidden = true;
      return;
    }
    const drug = state.selectedDrug;
    const spec = drug.species[state.species];
    const speciesLabel = state.species === "dog" ? "สุนัข" : "แมว";

    if (drug.contraindicated && drug.contraindicated[state.species]) {
      calcResultEl.hidden = false;
      calcResultEl.innerHTML = `<div class="result-out-of-range"><strong>ข้อห้ามใช้ใน${speciesLabel}:</strong> ${drug.contraindicated[state.species]}</div>`;
      return;
    }
    if (!spec) {
      calcResultEl.hidden = false;
      calcResultEl.innerHTML = `<p>ไม่มีข้อมูลขนาดยานี้สำหรับ${speciesLabel}</p>`;
      return;
    }

    const { doseLowMg, doseHighMg, volumeLowMl, volumeHighMl } = computeDose(
      drug, state.species, state.weightKg, state.selectedConcentration
    );

    const outOfRange = isWeightOutOfRange(state.species, state.weightKg);
    const doseUnit = doseUnitOf(spec);
    const perMinute = isPerMinute(drug);
    const rateSuffix = perMinute ? "/นาที" : "";
    const doseRateLabel = formatRange(spec.doseLow, spec.doseHigh, 4) + " " + spec.unit;
    const concLabel = state.selectedConcentration ? `${state.selectedConcentration} ${doseUnit}/mL` : "-";

    calcResultEl.hidden = false;
    calcResultEl.innerHTML = `
      <h3>${drug.name}</h3>
      <div class="result-rate">
        <strong>อัตราที่ใช้คำนวณ:</strong> ${doseRateLabel} &nbsp;|&nbsp;
        <strong>ความเข้มข้นที่ใช้คำนวณ:</strong> ${concLabel}
      </div>
      <div class="result-grid">
        <div class="result-item">
          <span class="label">ขนาดยา${perMinute ? " (ต่อนาที)" : ""} (${doseUnit}${rateSuffix})</span>
          <span class="value">${formatRange(doseLowMg, doseHighMg, 3)}</span>
        </div>
        <div class="result-item">
          <span class="label">${perMinute ? "อัตราการให้ (mL/นาที)" : "ปริมาณที่ดึง (mL)"}</span>
          <span class="value">${state.selectedConcentration ? formatRange(volumeLowMl, volumeHighMl, 4) : "-"}</span>
        </div>
      </div>
      <div class="result-note"><strong>เส้นทางให้ยา:</strong> ${spec.route}${spec.notes ? " — " + spec.notes : ""}</div>
      <div class="result-source"><strong>แหล่งอ้างอิง:</strong> ${drug.source}</div>
      ${outOfRange ? `<div class="result-out-of-range">น้ำหนักผู้ป่วยอยู่นอกช่วงปกติ กรุณาตรวจสอบซ้ำก่อนใช้ยาจริง</div>` : ""}
    `;
  }

  // ---- crash cart table ----
  function refreshCrashcart() {
    if (state.weightKg === null || isNaN(state.weightKg) || state.weightKg <= 0) {
      crashcartTable.hidden = true;
      crashcartHint.hidden = false;
      return;
    }
    crashcartHint.hidden = true;
    crashcartTable.hidden = false;
    crashcartBody.innerHTML = "";

    const outOfRange = isWeightOutOfRange(state.species, state.weightKg);

    DRUGS.forEach((drug) => {
      const contraindicatedReason = drug.contraindicated && drug.contraindicated[state.species];
      const spec = drug.species[state.species];
      if (!spec && !contraindicatedReason) return;

      const row = document.createElement("tr");
      if (outOfRange) row.classList.add("out-of-range");

      if (contraindicatedReason) {
        row.innerHTML = `
          <td>${drug.name}</td>
          <td>${drug.category}</td>
          <td colspan="4">ข้อห้ามใช้ใน${state.species === "dog" ? "สุนัข" : "แมว"}: ${contraindicatedReason}</td>
        `;
        crashcartBody.appendChild(row);
        return;
      }

      const doseUnit = doseUnitOf(spec);
      const perMinute = isPerMinute(drug);
      const rateSuffix = perMinute ? "/นาที" : "";
      const concentration = state.crashcartConcentrations[drug.name] !== undefined
        ? state.crashcartConcentrations[drug.name]
        : drug.concentrations[0];

      const { doseLowMg, doseHighMg, volumeLowMl, volumeHighMl } = computeDose(
        drug, state.species, state.weightKg, concentration
      );

      const concSelectId = `conc-${drug.name.replace(/[^a-zA-Z0-9]/g, "")}`;
      const concOptions = drug.concentrations
        .map((c) => `<option value="${c}"${c === concentration ? " selected" : ""}>${c} ${doseUnit}/mL</option>`)
        .join("");

      row.innerHTML = `
        <td>${drug.name}</td>
        <td>${drug.category}</td>
        <td>${formatRange(spec.doseLow, spec.doseHigh, 4)} ${spec.unit}</td>
        <td><select class="conc-picker" id="${concSelectId}" data-drug="${drug.name}">${concOptions}</select></td>
        <td>${formatRange(doseLowMg, doseHighMg, 3)} ${doseUnit}${rateSuffix}</td>
        <td>${concentration ? formatRange(volumeLowMl, volumeHighMl, 4) : "-"}${perMinute ? "/นาที" : ""}</td>
        <td>${spec.route}</td>
      `;
      crashcartBody.appendChild(row);
    });

    crashcartBody.querySelectorAll(".conc-picker").forEach((select) => {
      select.addEventListener("change", () => {
        state.crashcartConcentrations[select.dataset.drug] = parseFloat(select.value);
        refreshCrashcart();
      });
    });
  }

  printBtn.addEventListener("click", () => window.print());

  // ---- init ----
  refreshCalculator();
  refreshCrashcart();
})();
