// ข้อมูล Regenerative Anemia Calculator (ARC + RPI) สำหรับสุนัข/แมว
// แหล่งข้อมูล:
//  [1] "Nonregenerative Anemia Clinical Approach in the Dog and Cat — Mathematical
//       Gamesmanship", Bernard F. Feldman, DVM, PhD — WSAVA 2003 World Congress
//       Proceedings (เอกสารที่ผู้ใช้แนบมา) — สูตร RPI, ตาราง maturation days,
//       รายการ "Causes of Anemia — A Summary", และแนวทางอ่าน red cell indices
//  [2] eClinPath (Cornell University College of Veterinary Medicine, Section of
//       Clinical Pathology) — https://eclinpath.com/hematology/tests/absolute-reticulocyte-count/
//       — สูตรและตารางเกรด Absolute Reticulocyte Count (ARC), ค่า Hct ปกติที่ใช้เป็นตัวหาร
//       สำหรับสูตร correction (สุนัข 45%, แมว 35%)

// ARC (Absolute Reticulocyte Count) = (%retic / 100) x RBC count(/uL)
// แสดงผลเป็นหน่วยพัน/uL (thou/uL) ตามธรรมเนียมของแหล่งข้อมูล [2]
// เกณฑ์การแบ่งระดับ (grade) อ้างอิงจาก [2] โดยตรง
const ARC_GRADE_BANDS = {
  dog: [
    { max: 92, key: "none", label: "ไม่มีการตอบสนอง (Nonregenerative)", grade: "E" },
    { max: 153, key: "equivocal", label: "ไม่ชัดเจน (Equivocal)", grade: "D" },
    { max: 200, key: "mild", label: "ตอบสนองเล็กน้อย (Mild)", grade: "C" },
    { max: 300, key: "moderate", label: "ตอบสนองปานกลาง (Moderate)", grade: "B" },
    { max: Infinity, key: "marked", label: "ตอบสนองมาก (Marked)", grade: "A" }
  ],
  // ใช้เฉพาะ % Aggregate reticulocyte เท่านั้น (ไม่รวม punctate) ตามธรรมเนียมมาตรฐานในแมว — แหล่งข้อมูล [2]
  cat: [
    { max: 61, key: "none", label: "ไม่มีการตอบสนอง (Nonregenerative)", grade: "E" },
    { max: 85, key: "equivocal", label: "ไม่ชัดเจน (Equivocal)", grade: "D" },
    { max: 100, key: "mild", label: "ตอบสนองเล็กน้อย (Mild)", grade: "C" },
    { max: 200, key: "moderate", label: "ตอบสนองปานกลาง (Moderate)", grade: "B" },
    { max: Infinity, key: "marked", label: "ตอบสนองมาก (Marked)", grade: "A" }
  ]
};

// ค่า Hct เฉลี่ยปกติที่ใช้เป็นตัวหารในสูตร correction ของ RPI — แหล่งข้อมูล [2]
// (สุนัข 45% ตรงกับตัวอย่างคำนวณใน [1] ด้วย)
const ANEMIA_NORMAL_HCT = { dog: 45, cat: 35 };

// ตาราง maturation days ของ reticulocyte ตาม Hct ของผู้ป่วย — คัดลอกจาก [1] ตรงตัว
// คอลัมน์ "Days in Peripheral Blood" คือตัวหารที่ใช้ในสูตร RPI ขั้นที่ 3
// ใช้วิธีเลือก "แถวที่ Hct ใกล้เคียงที่สุด" (nearest bracket) ตามตัวอย่างการคำนวณจริงใน [1]
// (ตัวอย่างของ [1]: สุนัข Hct 22% ใช้ตัวหาร 2.0 ซึ่งตรงกับแถว Hct 25% ที่ใกล้ที่สุด ไม่ใช่การ interpolate)
const ANEMIA_MATURATION_TABLE = {
  dog: [
    { hct: 45, daysMarrow: 3.5, daysPeripheral: 0.5 },
    { hct: 35, daysMarrow: 3.0, daysPeripheral: 1.5 },
    { hct: 25, daysMarrow: 2.5, daysPeripheral: 2.0 },
    { hct: 15, daysMarrow: 1.5, daysPeripheral: 2.5 }
  ],
  cat: [
    { hct: 32, daysMarrow: 3.5, daysPeripheral: 1.0 },
    { hct: 24, daysMarrow: 3.0, daysPeripheral: 1.5 },
    { hct: 16, daysMarrow: 2.5, daysPeripheral: 2.0 },
    { hct: 10, daysMarrow: 1.5, daysPeripheral: 2.5 }
  ]
};

const ANEMIA_RPI_CUTOFF = 2.0; // RPI > 2.0 = responsive, < 2.0 = nonresponsive — แหล่งข้อมูล [1]

// "CAUSES OF ANEMIA — A SUMMARY" — คัดลอกจาก [1] ตรงตัว (7 กลุ่มสาเหตุ)
const ANEMIA_NONREGENERATIVE_DDX = [
  { name: "Iron deficiency (ภาวะขาดธาตุเหล็ก)", note: "Nonresponsive เสมอ" },
  { name: "Inflammation (การอักเสบ)", note: "Nonresponsive เสมอ" },
  { name: "Marrow damage (ไขกระดูกถูกทำลาย/กดการทำงาน)", note: "Nonresponsive เสมอ" },
  { name: "Decreased erythropoietin (เช่น โรคไตเรื้อรัง)", note: "Nonresponsive เสมอ" },
  { name: "Maturation abnormality (เช่น ขาด Vitamin B12/Folate หรือโรคไขกระดูกโดยตรง)", note: "ส่วนใหญ่ nonresponsive แต่ผลไม่แน่นอน (unpredictable)" },
  { name: "Hemorrhage ระยะแรก (< 3-5 วันแรก)", note: "ยังไม่ทันตอบสนอง แม้สาเหตุจริงจะเป็น responsive anemia" },
  { name: "Hemolysis ระยะแรก (< 3-5 วันแรก)", note: "ยังไม่ทันตอบสนอง แม้สาเหตุจริงจะเป็น responsive anemia" }
];

const ANEMIA_REGENERATIVE_DDX = [
  {
    name: "Hemorrhage (ภาวะเสียเลือด)",
    note: "เลือดออกภายใน/ภายนอก เช่น อุบัติเหตุ, เนื้องอกที่ม้าม/ตับ, ความผิดปกติของการแข็งตัวของเลือด"
  },
  {
    name: "Hemolysis (เม็ดเลือดแดงแตก)",
    note: "ที่พบบ่อยที่สุดในสุนัขคือ IMHA (Immune-Mediated Hemolytic Anemia) — แอนติบอดีชนิด warm-reacting (IgG/IgM ที่ 37°C) หรือ cold-reacting (< 35°C) จับกับผิวเม็ดเลือดแดง กระตุ้น complement ทำให้เกิด spherocytosis (เม็ดเลือดแดงบวมกลม) หรือ hemoglobinemia (เม็ดเลือดแดงแตกในหลอดเลือด)"
  }
];

// แนวทางอ่าน red cell indices (MCV/MCHC) เพื่อช่วยจำกัดกลุ่มสาเหตุ — แหล่งข้อมูล [1]
const ANEMIA_INDICES_HINTS = {
  macrocytic_normochromic: {
    label: "Macrocytic, Normochromic (MCV สูง, MCHC ปกติ)",
    note: "บ่งชี้ maturation abnormality — ขาด Vitamin B12, ขาด Folate หรือ myeloproliferative disease"
  },
  microcytic_hypochromic: {
    label: "Microcytic, Hypochromic (MCV ต่ำ, MCHC ต่ำ)",
    note: "บ่งชี้ภาวะขาดธาตุเหล็ก (Iron deficiency)"
  },
  macrocytic_hypochromic: {
    label: "Macrocytic, Hypochromic (MCV สูง, MCHC ต่ำ)",
    note: "พบร่วมกับการสร้างเม็ดเลือดแดงใหม่อย่างรวดเร็ว/มาก (intense regeneration)"
  }
};
