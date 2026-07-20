(function () {
  "use strict";

  const pages = {
    patient: document.getElementById("page-patient"),
    drugs: document.getElementById("page-drugs"),
    nutrition: document.getElementById("page-nutrition"),
    potassium: document.getElementById("page-potassium"),
    sodium: document.getElementById("page-sodium"),
    cri: document.getElementById("page-cri")
  };
  const navButtons = document.querySelectorAll(".nav-btn");
  const nextButtons = document.querySelectorAll(".next-page-btn");
  const patientChips = [
    document.getElementById("patient-chip-drugs"),
    document.getElementById("patient-chip-nutrition"),
    document.getElementById("patient-chip-potassium"),
    document.getElementById("patient-chip-sodium"),
    document.getElementById("patient-chip-cri")
  ];

  const weightKgInput = document.getElementById("weight-kg");
  const speciesButtons = document.querySelectorAll(".species-btn");

  function goToPage(pageKey) {
    Object.keys(pages).forEach((key) => {
      pages[key].hidden = key !== pageKey;
    });
    navButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === pageKey);
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.page));
  });

  nextButtons.forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.goto));
  });

  function currentSpeciesLabel() {
    const activeBtn = document.querySelector(".species-btn.active");
    if (!activeBtn) return "";
    return activeBtn.textContent.trim();
  }

  function updatePatientChip() {
    const weightVal = parseFloat(weightKgInput.value);
    const speciesLabel = currentSpeciesLabel();
    const hasWeight = !isNaN(weightVal) && weightVal > 0;

    const html = `
      <span>${speciesLabel}${hasWeight ? " · " + weightVal + " กก." : " · ยังไม่ได้กรอกน้ำหนัก"}</span>
      <button type="button" class="patient-chip-edit" data-goto="patient">แก้ไข</button>
    `;
    patientChips.forEach((chip) => {
      if (chip) chip.innerHTML = html;
    });
    document.querySelectorAll(".patient-chip-edit").forEach((btn) => {
      btn.addEventListener("click", () => goToPage(btn.dataset.goto));
    });
  }

  weightKgInput.addEventListener("input", updatePatientChip);
  speciesButtons.forEach((btn) => btn.addEventListener("click", updatePatientChip));

  updatePatientChip();
  goToPage("patient");
})();
