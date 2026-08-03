// ตารางเสริมโพแทสเซียม (KCl) แบบ CRI ตามระดับโพแทสเซียมในเลือด
//
// แหล่งอ้างอิง: Table 11 "Guidelines for Potassium Supplementation in Fluids"
// 2024 AAHA Fluid Therapy Guidelines for Dogs and Cats, p.148 (ผู้ใช้ให้ภาพตารางมาโดยตรง)
//
// โครงสร้างตารางนี้ให้ "Suggested Potassium Dose" เป็นอัตรา mEq/kg/hr โดยตรง (ไม่ใช่ปริมาณ KCl
// ต่อลิตรสารน้ำแบบตายตัว) จึงต้องคำนวณความเข้มข้นที่ต้องผสมจาก fluid rate (mL/hr) ที่จะให้จริง
const POTASSIUM_SUPPLEMENTATION_TABLE = [
  { maxK: 2.0, label: "< 2.0 mEq/L", doseLow: 0.5, doseHigh: 0.5 },
  { maxK: 2.5, label: "2.0 - 2.5 mEq/L", doseLow: 0.3, doseHigh: 0.4 },
  { maxK: 3.0, label: "2.6 - 3.0 mEq/L", doseLow: 0.2, doseHigh: 0.25 },
  { maxK: 3.5, label: "3.1 - 3.5 mEq/L", doseLow: 0.1, doseHigh: 0.15 },
  { maxK: 5.0, label: "> 3.5 mEq/L", doseLow: 0.05, doseHigh: 0.05 }
];

// ขีดจำกัดความปลอดภัยทั่วไป (ไม่ใช่ค่าที่ AAHA ระบุเฉพาะ แต่เป็นค่าสูงสุดของตาราง Table 11 เอง)
const KCL_SAFETY_LIMIT_MEQ_PER_KG_HR = 0.5;

// ความเข้มข้นมาตรฐานของ KCl concentrate สำหรับผสมในสารน้ำ ตามที่คลินิกใช้จริง (2 mEq/mL)
const KCL_CONCENTRATE_MEQ_PER_ML = 2;

// ตารางแก้ไขภาวะฟอสฟอรัสต่ำ (Hypophosphatemia) แบบ CRI ตามระดับฟอสฟอรัสในเลือด — แยกตามชนิดสัตว์
// ผู้ใช้ (สัตวแพทย์ผู้ดูแลโปรเจกต์) ให้ข้อมูลนี้โดยตรงจากความรู้ทางคลินิก ไม่ได้มาจากเอกสารอ้างอิงภายนอก
// (ช่วง "1.5 - 2.9 mg/dL" ในสุนัขปรับขอบเขตล่างจาก "1.6" เป็น "1.5" เพื่อไม่ให้มีช่วงว่างระหว่างสองระดับ
// ที่ผู้ใช้ให้มา — ตัวเลขขนาดยายังคงตามที่ผู้ใช้ระบุทุกประการ)
const PHOSPHORUS_SUPPLEMENTATION_TABLE = {
  dog: [
    { maxP: 1.5, label: "< 1.5 mg/dL", doseLow: 0.03, doseHigh: 0.12 },
    { maxP: 2.9, label: "1.5 - 2.9 mg/dL", doseLow: 0.01, doseHigh: 0.03 }
  ],
  cat: [
    { maxP: 2.0, label: "< 2.0 mg/dL", doseLow: 0.12, doseHigh: 0.12 },
    { maxP: 2.9, label: "2.0 - 2.9 mg/dL", doseLow: 0.06, doseHigh: 0.06 }
  ]
};

// ยาที่ใช้แก้ไขฟอสฟอรัส: Dipotassium Phosphate (K2HPO4) 1.74g/20mL — ประกอบด้วย
// Potassium 1 mEq/mL และ Phosphorus 0.5 mmol/mL (ให้ทั้งสองอย่างพร้อมกันทุกครั้งที่ใช้ยานี้)
// ผู้ใช้ให้ข้อมูลโดยตรง
const DIPOTASSIUM_PHOSPHATE = { phosphorusMmolPerMl: 0.5, potassiumMeqPerMl: 1 };
