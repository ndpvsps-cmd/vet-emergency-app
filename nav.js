(function () {
  "use strict";

  const pages = {
    patient: document.getElementById("page-patient"),
    menu: document.getElementById("page-menu"),
    drugs: document.getElementById("page-drugs"),
    nutrition: document.getElementById("page-nutrition"),
    potassium: document.getElementById("page-potassium"),
    sodium: document.getElementById("page-sodium"),
    cri: document.getElementById("page-cri"),
    se: document.getElementById("page-se"),
    apple: document.getElementById("page-apple"),
    mgcs: document.getElementById("page-mgcs"),
    att: document.getElementById("page-att"),
    rehydration: document.getElementById("page-rehydration"),
    anemia: document.getElementById("page-anemia"),
    bicarb: document.getElementById("page-bicarb")
  };
  // Pages reachable directly from the bottom nav. Any other page (opened via the
  // menu grid) keeps the "เมนูทั้งหมด" tab highlighted instead of leaving nothing active.
  const PRIMARY_NAV_PAGES = ["patient", "drugs", "nutrition"];
  const navButtons = document.querySelectorAll(".nav-btn");
  const menuCards = document.querySelectorAll(".menu-card");
  const nextButtons = document.querySelectorAll(".next-page-btn");
  const patientChips = [
    document.getElementById("patient-chip-drugs"),
    document.getElementById("patient-chip-nutrition"),
    document.getElementById("patient-chip-potassium"),
    document.getElementById("patient-chip-sodium"),
    document.getElementById("patient-chip-cri"),
    document.getElementById("patient-chip-se"),
    document.getElementById("patient-chip-apple"),
    document.getElementById("patient-chip-mgcs"),
    document.getElementById("patient-chip-att"),
    document.getElementById("patient-chip-rehydration"),
    document.getElementById("patient-chip-anemia"),
    document.getElementById("patient-chip-bicarb")
  ];

  const weightKgInput = document.getElementById("weight-kg");

  function goToPage(pageKey) {
    Object.keys(pages).forEach((key) => {
      pages[key].hidden = key !== pageKey;
    });
    const highlightKey = PRIMARY_NAV_PAGES.includes(pageKey) ? pageKey : "menu";
    navButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === highlightKey);
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.page));
  });

  menuCards.forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.page));
  });

  nextButtons.forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.goto));
  });

  function currentSpecies() {
    const activeBtn = document.querySelector(".species-btn.active");
    return activeBtn ? activeBtn.dataset.species : "dog";
  }

  // Chip markup (including the inline weight input and species toggle) is built once per
  // chip and then only has its values updated afterwards — rebuilding the innerHTML on
  // every keystroke would destroy and recreate the input the user is actively typing
  // into, kicking focus out. Species clicks on these buttons are handled by app.js's
  // document-level delegated listener (they carry the shared .species-btn class), so no
  // click listener is wired up here.
  function buildPatientChips() {
    const html = `
      <div class="patient-chip-info">
        <div class="patient-chip-species-toggle" role="group" aria-label="เลือกชนิดสัตว์">
          <button type="button" class="species-btn chip-species-btn" data-species="dog">🐕</button>
          <button type="button" class="species-btn chip-species-btn" data-species="cat">🐈</button>
        </div>
        <input type="number" class="patient-chip-weight-input" min="0" step="0.1" placeholder="น้ำหนัก (กก.)">
        <span>กก.</span>
      </div>
      <div class="patient-chip-actions">
        <button type="button" class="patient-chip-menu" data-goto="menu">🗂️ เมนู</button>
        <button type="button" class="patient-chip-edit" data-goto="patient">แก้ไข</button>
      </div>
    `;
    patientChips.forEach((chip) => {
      if (chip) chip.innerHTML = html;
    });
    document.querySelectorAll(".patient-chip-edit, .patient-chip-menu").forEach((btn) => {
      btn.addEventListener("click", () => goToPage(btn.dataset.goto));
    });
    document.querySelectorAll(".patient-chip-weight-input").forEach((input) => {
      input.addEventListener("input", () => {
        weightKgInput.value = input.value;
        weightKgInput.dispatchEvent(new Event("input"));
      });
    });
  }

  function updatePatientChip() {
    const species = currentSpecies();
    document.querySelectorAll(".chip-species-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.species === species);
    });
    document.querySelectorAll(".patient-chip-weight-input").forEach((input) => {
      if (document.activeElement !== input) {
        input.value = weightKgInput.value;
      }
    });
  }

  weightKgInput.addEventListener("input", updatePatientChip);
  document.addEventListener("species-change", updatePatientChip);

  buildPatientChips();
  updatePatientChip();
  goToPage("patient");
})();
