// VETJOD — vocabulary lists that are rendered into chip groups at load time.
// Kept separate from app.js so the clinic can edit these lists without touching app logic,
// mirroring the ../data/*.js convention used by the calculator app.

const FLUID_TYPES = ["0.9% NSS", "ARI", "AR-5", "Fentanyl", "MLK", "D5W", "3% NSS", "D5 1/2 S"];

const DIET_TYPES = [
  "Smart Heart", "Me-O", "Recovery", "A/D", "Intestinal Low Fat",
  "Renal", "Diabetic", "Delisci", "S-mellow"
];

const WOUND_DRESSING_PROTOCOLS = [
  "Paint + PVD dilute + NSS + Amikacin gel",
  "Paint + NSS + gel",
  "Paint + PVD dilute + NSS + Prontosan soak + Amikacin gel"
];

const TX_CHECKLIST = [
  "New IV cath", "Wash", "Urine cauterization", "Splint",
  "Stitch off", "Ear cleaning", "Wash mouth", "Eye drop"
];

const LABS_ITEMS = [
  { id: "blood", label: "Blood test" },
  { id: "glucose", label: "Glucose" },
  { id: "abg", label: "ABG" },
  { id: "vbg", label: "VBG" },
  { id: "coag", label: "Coagulation test" },
  { id: "testkit", label: "Test kit" },
  { id: "cs", label: "C/S" },
  { id: "hc", label: "H/C" },
  { id: "bx", label: "B/x" },
  { id: "cxr", label: "CXR" },
  { id: "axr", label: "AXR" },
  { id: "us", label: "U/S" },
  { id: "pocus", label: "POCUS" },
  { id: "other", label: "อื่นๆ" }
];

const LIMBS = [
  { value: "RFL", label: "RFL" },
  { value: "LFL", label: "LFL" },
  { value: "RHL", label: "RHL" },
  { value: "LHL", label: "LHL" }
];

const SPLINT_STATUS = ["In position", "Dislocation", "Wet", "Dirty"];

const EYE_FINDINGS = ["Dry eye", "Purulent ocular discharge", "Ulcer"];

const CAVITY_FLUID_TYPES = [
  "Transudate", "Straw yellow exudate", "Serosanguinous exudate",
  "Bloody exudate", "Bile exudate", "Chylous"
];

const ICD_FLUID_TYPES = ["Serosanguinous fluid", "Purulent fluid", "Chylous fluid", "Bloody fluid", "Air"];

const SUPPLY_ITEMS = [
  { id: "ivcath", label: "IV Cath" },
  { id: "fluid100", label: "Fluid 100 mL" },
  { id: "fluid500", label: "Fluid 500 mL" },
  { id: "fluid1000", label: "Fluid 1000 mL" },
  { id: "extension", label: "Extension" },
  { id: "ivset", label: "IV Set" },
  { id: "collar", label: "Collar" },
  { id: "foley", label: "Foley" },
  { id: "feedingtube", label: "Feeding tube" },
  { id: "urinebag", label: "Urine bag" },
  { id: "pad", label: "แผ่นรองซับ" },
  { id: "catlitter", label: "ทรายแมว" }
];
