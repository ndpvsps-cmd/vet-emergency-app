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
