// ข้อมูลสำหรับคำนวณการแก้ไข Hyponatremia / Hypernatremia
// แหล่งอ้างอิงหลัก: 2024 AAHA Fluid Therapy Guidelines for Dogs and Cats, Table 12A (Approach to
// Fluid Therapy in Hyponatremic Patients, p.149) และ Table 13A (Approach to Fluid Therapy in
// Hypernatremic Patients, p.150-151) — ตารางเหล่านี้เป็นข้อความในไฟล์ PDF (ต่างจาก Table 11 ที่เป็นรูปภาพ)
// จึงแกะสูตร/แนวทางออกมาได้ครบ

// ขีดจำกัดความปลอดภัยในการแก้ไขโซเดียม (ทั้ง hypo และ hypernatremia กรณีเรื้อรัง)
// "no more than 0.5 mEq/L/hr for a maximum total correction of 10-12 mEq/L/day" — Table 12A/13A
const SODIUM_MAX_RATE_MEQ_PER_L_HR = 0.5;
const SODIUM_MAX_DAILY_MEQ_PER_L = 12; // ใช้ค่าบนของช่วง 10-12 เป็นเพดาน ใช้ 10 เป็นค่าระมัดระวังกว่าในคำอธิบาย

// ความเข้มข้นโซเดียมของสารน้ำมาตรฐาน (mEq/L) — เป็นความรู้ทั่วไปทางเภสัชวิทยา ไม่ได้มาจาก Table 12C
// ของ AAHA โดยตรง (Table 12C เป็นรูปภาพในไฟล์ PDF แกะข้อความไม่ได้)
const FLUID_SODIUM_CONTENT = [
  { key: "d5w", label: "5% Dextrose in Water (D5W)", naMeqPerL: 0 },
  { key: "half_ns", label: "0.45% NaCl", naMeqPerL: 77 },
  { key: "lrs", label: "Lactated Ringer's Solution", naMeqPerL: 130 },
  { key: "plasmalyte", label: "Plasma-Lyte 148 / Normosol-R", naMeqPerL: 140 },
  { key: "ns", label: "0.9% NaCl (Normal Saline)", naMeqPerL: 154 },
  { key: "hts3", label: "3% NaCl (Hypertonic)", naMeqPerL: 513 },
  { key: "hts5", label: "5% NaCl (Hypertonic)", naMeqPerL: 855 },
  { key: "hts75", label: "7.5% NaCl (Hypertonic)", naMeqPerL: 1283 }
];

// ปริมาณ hypertonic saline สำหรับ symptomatic hyponatremia (2-6 mL/kg ให้นาน 10-15 นาที)
// Table 12A, p.149: "treat with 3, 5, or 7.5% hypertonic saline at a recommended dose of 2-6 mL/kg given over 10-15 min"
const HYPERTONIC_SALINE_DOSE_ML_PER_KG = { low: 2, high: 6 };

// ปริมาณ bolus isotonic crystalloid สำหรับ hypovolemia ร่วมด้วย (Table 13A / Table 9)
const HYPOVOLEMIC_BOLUS_ML_PER_KG = { dog: { low: 15, high: 20 }, cat: { low: 5, high: 10 } };
