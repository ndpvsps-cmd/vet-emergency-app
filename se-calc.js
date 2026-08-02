(function () {
  "use strict";

  const weightKgInput = document.getElementById("weight-kg");

  const stageTableBody = document.getElementById("se-stage-table-body");
  const gradeLegendEl = document.getElementById("se-grade-legend");

  const doseMidazolamIv = document.getElementById("se-dose-midazolam-iv");
  const doseDiazepamIv = document.getElementById("se-dose-diazepam-iv");
  const doseMidazolamIm = document.getElementById("se-dose-midazolam-im");
  const doseDiazepamR = document.getElementById("se-dose-diazepam-r");
  const doseKetamine = document.getElementById("se-dose-ketamine");
  const dosePropofol = document.getElementById("se-dose-propofol");

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

  function formatRange(low, high, decimals) {
    const l = round(low, decimals);
    const h = round(high, decimals);
    return l === h ? String(l) : `${l} - ${h}`;
  }

  // Renders a weight-based dose line for a drug already in this app's Plumb's-sourced
  // database (data/drugs.js) — the ACVIM document itself gives no mg/kg numbers, only the
  // step order/route/recommendation grade, so any numeric dose shown here is from Plumb's, not ACVIM.
  function drugDoseHtml(name) {
    const weightKg = currentWeightKg();
    const drug = DRUGS.find((d) => d.name === name);
    if (!drug) return `<span class="hint-text">ไม่มีข้อมูลยานี้ในฐานข้อมูล</span>`;
    if (weightKg === null) return `<span class="hint-text">กรอกน้ำหนักตัวเพื่อคำนวณขนาดยา (อ้างอิง Plumb's 10th)</span>`;
    const species = currentSpecies();
    const spec = drug.species[species];
    if (!spec) {
      return `<span class="hint-text">ไม่มีข้อมูลขนาดยานี้สำหรับ${species === "dog" ? "สุนัข" : "แมว"}ในฐานข้อมูล (Plumb's) — โปรดตรวจสอบเพิ่มเติม</span>`;
    }
    const doseLowMg = spec.doseLow * weightKg;
    const doseHighMg = spec.doseHigh * weightKg;
    const conc = drug.concentrations[0];
    const volLow = doseLowMg / conc;
    const volHigh = doseHighMg / conc;
    return `${formatRange(doseLowMg, doseHighMg, 3)} mg (${formatRange(volLow, volHigh, 3)} mL ที่ ${conc} mg/mL) — Plumb's 10th, ${spec.route}`;
  }

  function midazolamImInHtml() {
    const base = drugDoseHtml("Midazolam");
    const weightKg = currentWeightKg();
    const drug = DRUGS.find((d) => d.name === "Midazolam");
    if (weightKg === null || !drug) return base;
    const inDoseMg = round(0.2 * weightKg, 3);
    const conc = drug.concentrations[0];
    const inVolMl = round(inDoseMg / conc, 3);
    return `${base}<br><span class="hint-text">ทางเลือก IN (ขนาดคงที่ตาม Plumb's): ${inDoseMg} mg (${inVolMl} mL ที่ ${conc} mg/mL)</span>`;
  }

  function refresh() {
    doseMidazolamIv.innerHTML = drugDoseHtml("Midazolam");
    doseDiazepamIv.innerHTML = drugDoseHtml("Diazepam");
    doseMidazolamIm.innerHTML = midazolamImInHtml();
    doseDiazepamR.innerHTML = `<span class="hint-text">ไม่มีขนาดยาทางทวารหนักในฐานข้อมูลนี้ — โปรดใช้ตามขนาดยาที่คลินิกกำหนด</span>`;
    doseKetamine.innerHTML = drugDoseHtml("Ketamine");
    dosePropofol.innerHTML = drugDoseHtml("Propofol");
  }

  weightKgInput.addEventListener("input", refresh);
  document.addEventListener("species-change", refresh);

  // ---- static reference tables (grade legend + SE stage pyramid) ----
  stageTableBody.innerHTML = SE_STAGE_TABLE.map((s) => `
    <tr><td>${s.stage}</td><td>${s.duration}</td><td>${s.response}</td></tr>
  `).join("");

  gradeLegendEl.innerHTML = SE_GRADE_LEGEND.map((g) => `
    <span class="grade-badge grade-${g.grade}">${g.grade}</span> ${g.label}<br>
  `).join("");

  refresh();
})();
