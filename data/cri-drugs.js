// ฐานข้อมูลยา Constant Rate Infusion (CRI) — ยาหยดต่อเนื่องทางหลอดเลือดดำ
// แหล่งข้อมูล: TABLE E.1 "Drugs Commonly Administered by Constant Rate Infusion",
// Appendix E (pp.507-508), Manual of Small Animal Emergency and Critical Care Medicine,
// 2nd Edition (Macintire DK, Drobatz KJ, Haskins SC, Saxon WD, eds.), 2012, John Wiley & Sons.
// (ผู้ใช้แนบไฟล์นี้มาโดยตรง — ใช้เฉพาะตัวเลขขนาดยา/ความเข้มข้นจากตารางนี้เท่านั้น ไม่เติมค่าที่ไม่มีในตาราง)
//
// โครงสร้างข้อมูล:
//   rateUnit   = หน่วยอัตราการให้ยาต่อเนื่อง เช่น "mcg/kg/min", "mg/kg/h", "mg/kg/day", "U/kg/h", "mEq/kg/day"
//                (ตัวอักษร micro (μ) ในต้นฉบับหายไปตอนแปลงไฟล์ PDF เป็นข้อความ — ตรวจสอบแล้วว่าคือหน่วย "mcg"
//                 ทุกจุดที่ตารางต้นฉบับพิมพ์สัญลักษณ์ไมโครแล้วตามด้วย "g/kg/...")
//   doseLow/doseHigh = ช่วงอัตราการให้ต่อเนื่อง (ในหน่วย rateUnit) — ถ้ามีค่าต่างกันระหว่างสุนัข/แมว จะอยู่ใน species{}
//   concUnit / concentrations = ความเข้มข้นของยาที่มีขายจริงตามตาราง (mg/mL, U/mL, หรือ mEq/mL)
//   loadingDose = ขนาดยาเริ่มต้นแบบ bolus/IV ก่อนเริ่มหยดต่อเนื่อง (ถ้าตารางระบุไว้)
const CRI_DRUGS = [
  {
    name: "Atracurium besylate",
    category: "ยาคลายกล้ามเนื้อ (Neuromuscular Blocker)",
    notes: "ใช้ร่วมกับเครื่องช่วยหายใจ (mechanical ventilation)",
    rateUnit: "mcg/kg/min", doseLow: 4, doseHigh: 9,
    concUnit: "mg/mL", concentrations: [10],
    loadingDose: { low: 0.3, high: 0.5, unit: "mg/kg", route: "IV" },
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Butorphanol",
    category: "ยาระงับปวด (Analgesic/Sedation)",
    notes: "ระงับปวดระดับเล็กน้อยถึงปานกลาง",
    rateUnit: "mg/kg/h", doseLow: 0.1, doseHigh: 0.2,
    concUnit: "mg/mL", concentrations: [10],
    loadingDose: { low: 0.2, high: 0.4, unit: "mg/kg", route: "IV" },
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Diazepam",
    category: "ยากันชัก (Anticonvulsant)",
    notes: "ควบคุมอาการชัก",
    rateUnit: "mcg/kg/min", doseLow: 4, doseHigh: 16,
    concUnit: "mg/mL", concentrations: [5],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Diltiazem",
    category: "ยาต้านหัวใจเต้นผิดจังหวะ (Antiarrhythmic)",
    notes: "Calcium channel blocker สำหรับ supraventricular tachyarrhythmia",
    rateUnit: "mcg/kg/min", doseLow: 1, doseHigh: 8,
    concUnit: "mg/mL", concentrations: [5],
    loadingDose: { low: 0.15, high: 0.25, unit: "mg/kg", route: "IV ช้าๆ นาน 2 นาที" },
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Dobutamine",
    category: "ยากระตุ้นหัวใจ/ความดัน (Inotrope/Pressor)",
    notes: "Positive inotrope สำหรับ cardiogenic หรือ septic shock",
    rateUnit: "mcg/kg/min",
    species: { dog: { doseLow: 5, doseHigh: 20 }, cat: { doseLow: 2, doseHigh: 5 } },
    concUnit: "mg/mL", concentrations: [12.5],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Dopamine (low-dose)",
    category: "ยากระตุ้นหัวใจ/ความดัน (Inotrope/Pressor)",
    notes: "ขยายหลอดเลือดไต เพิ่มเลือดไปเลี้ยงไต (renal dose)",
    rateUnit: "mcg/kg/min", doseLow: 1, doseHigh: 3,
    concUnit: "mg/mL", concentrations: [40, 80, 160],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Dopamine (middle dose)",
    category: "ยากระตุ้นหัวใจ/ความดัน (Inotrope/Pressor)",
    notes: "Positive inotrope สำหรับ cardiogenic หรือ septic shock",
    rateUnit: "mcg/kg/min", doseLow: 4, doseHigh: 6,
    concUnit: "mg/mL", concentrations: [40, 80, 160],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Dopamine (high dose)",
    category: "ยากระตุ้นหัวใจ/ความดัน (Inotrope/Pressor)",
    notes: "Pressor agent เพิ่มการหดตัวของหลอดเลือดส่วนปลาย เพิ่มความดันโลหิต",
    rateUnit: "mcg/kg/min", doseLow: 7, doseHigh: 20,
    concUnit: "mg/mL", concentrations: [40, 80, 160],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Epinephrine (CRI)",
    category: "ยากระตุ้นหัวใจ/ความดัน (Inotrope/Pressor)",
    notes: "Anaphylaxis, ประคับประคองหัวใจและความดันโลหิต",
    rateUnit: "mcg/kg/min", doseLow: 0.025, doseHigh: 0.3,
    concUnit: "mg/mL", concentrations: [1, 0.1],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Esmolol",
    category: "ยาต้านหัวใจเต้นผิดจังหวะ (Antiarrhythmic)",
    notes: "Short-acting beta-blocker ลด HR และความดัน (supraventricular tachycardia)",
    rateUnit: "mcg/kg/min", doseLow: 50, doseHigh: 200,
    concUnit: "mg/mL", concentrations: [10],
    loadingDose: { low: 0.05, high: 0.1, unit: "mg/kg", route: "IV" },
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Fentanyl (CRI)",
    category: "ยาระงับปวด (Analgesic/Sedation)",
    notes: "ระงับปวดระดับปานกลางถึงรุนแรง",
    rateUnit: "mg/kg/h",
    species: { dog: { doseLow: 0.002, doseHigh: 0.005 }, cat: { doseLow: 0.001, doseHigh: 0.0025 } },
    concUnit: "mg/mL", concentrations: [0.05],
    loadingDose: { low: 0.003, high: 0.003, unit: "mg/kg", route: "IV" },
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Furosemide (CRI)",
    category: "ยาขับปัสสาวะ (Diuretic)",
    notes: "เพิ่มการขับปัสสาวะในภาวะ acute oliguric renal failure",
    rateUnit: "mcg/kg/min", doseLow: 3, doseHigh: 8,
    concUnit: "mg/mL", concentrations: [10],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Heparin",
    category: "ยาต้านการแข็งตัวของเลือด (Anticoagulant)",
    notes: "ป้องกันภาวะลิ่มเลือดอุดตัน/DIC — ต้องเจาะ PTT ทุก 6 ชม. ปรับให้ได้ 1.5-2.0 เท่าของค่าพื้นฐาน",
    rateUnit: "U/kg/h", doseLow: 18, doseHigh: 18,
    concUnit: "U/mL", concentrations: [1000],
    loadingDose: { low: 80, high: 80, unit: "IU/kg", route: "IV bolus" },
    source: "Table E.1, Appendix E, p.507"
  },
  {
    name: "Insulin (regular)",
    category: "ต่อมไร้ท่อ (Endocrine)",
    notes: "Diabetic ketoacidosis",
    rateUnit: "U/kg/h", doseLow: 0.1, doseHigh: 0.1,
    concUnit: "U/mL", concentrations: [100],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Isoproterenol",
    category: "ยากระตุ้นหัวใจ/ความดัน (Inotrope/Pressor)",
    notes: "Vasodilator, positive inotrope, ขยายหลอดลม (bronchodilator)",
    rateUnit: "mcg/kg/min", doseLow: 0.1, doseHigh: 2.0,
    concUnit: "mg/mL", concentrations: [0.2],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Ketamine (CRI)",
    category: "ยาระงับความรู้สึก/ยาเสริมระงับปวด",
    notes: "ยาเสริม (adjunctive agent) เพิ่มฤทธิ์ระงับปวดเมื่อใช้ร่วมกับ opioid",
    rateUnit: "mg/kg/h", doseLow: 0.3, doseHigh: 1.2,
    concUnit: "mg/mL", concentrations: [100],
    loadingDose: { low: 0.3, high: 0.5, unit: "mg/kg", route: "IV" },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Lidocaine (CRI)",
    category: "ยาต้านหัวใจเต้นผิดจังหวะ/ยาเสริมระงับปวด",
    notes: "Ventricular antiarrhythmic และยาเสริมเพิ่มฤทธิ์ระงับปวด — ระวังพิษในแมว ใช้ขนาดต่ำกว่าสุนัขมาก",
    rateUnit: "mcg/kg/min",
    species: { dog: { doseLow: 25, doseHigh: 80 }, cat: { doseLow: 10, doseHigh: 40 } },
    concUnit: "mg/mL", concentrations: [20],
    loadingDose: {
      dog: { low: 2, high: 4, unit: "mg/kg", route: "IV bolus" },
      cat: { low: 0.25, high: 0.75, unit: "mg/kg", route: "IV ช้าๆ (slow IV)" }
    },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Magnesium sulfate 12.5%",
    category: "ยาต้านหัวใจเต้นผิดจังหวะ (Antiarrhythmic)",
    notes: "Refractory ventricular arrhythmia ในผู้ป่วยวิกฤต",
    rateUnit: "mEq/kg/day", doseLow: 0.75, doseHigh: 1,
    concUnit: "mEq/mL", concentrations: [1],
    loadingDose: { low: 0.15, high: 0.3, unit: "mEq/kg", route: "IV นาน 5-15 นาที" },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Medetomidine",
    category: "ยาเสริมระงับปวด/ยาสงบประสาท",
    notes: "ยาเสริม (adjunctive agent) เพิ่มฤทธิ์ระงับปวดและสงบประสาทเมื่อใช้ร่วมกับ opioid",
    rateUnit: "mg/kg/h", doseLow: 0.0015, doseHigh: 0.0015,
    concUnit: "mg/mL", concentrations: [1.0],
    loadingDose: { low: 0.001, high: 0.001, unit: "mg/kg", route: "IV (ให้เฉพาะเมื่อต้องการสงบประสาททันที)" },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Metoclopramide",
    category: "ยาแก้อาเจียน (Antiemetic)",
    notes: "ป้องกัน/ควบคุมอาการอาเจียน",
    rateUnit: "mg/kg/day", doseLow: 1, doseHigh: 2,
    concUnit: "mg/mL", concentrations: [5],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Morphine sulfate (CRI)",
    category: "ยาระงับปวด (Analgesic/Sedation)",
    notes: "ระงับปวดระดับปานกลางถึงรุนแรง",
    rateUnit: "mg/kg/h",
    species: { dog: { doseLow: 0.1, doseHigh: 0.5 }, cat: { doseLow: 0.05, doseHigh: 0.1 } },
    concUnit: "mg/mL", concentrations: [15],
    loadingDose: { low: 0.2, high: 0.2, unit: "mg/kg", route: "IM" },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Nitroprusside",
    category: "ยาขยายหลอดเลือด (Vasodilator)",
    notes: "Acute congestive heart failure — เริ่มที่ 2 mcg/kg/min แล้วปรับเพิ่มทีละ 1 mcg/kg/min ทุก 20 นาทีจนได้ผล",
    rateUnit: "mcg/kg/min", doseLow: 1, doseHigh: 10,
    concUnit: "mg/mL", concentrations: [10, 25],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Norepinephrine (CRI)",
    category: "ยากระตุ้นหัวใจ/ความดัน (Inotrope/Pressor)",
    notes: "Pressor agent สำหรับประคับประคองความดันโลหิตระยะสั้น",
    rateUnit: "mcg/kg/min", doseLow: 0.5, doseHigh: 2,
    concUnit: "mg/mL", concentrations: [1],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Pancuronium",
    category: "ยาคลายกล้ามเนื้อ (Neuromuscular Blocker)",
    notes: "ใช้ร่วมกับเครื่องช่วยหายใจ (mechanical ventilation)",
    rateUnit: "mcg/kg/min", doseLow: 0.2, doseHigh: 2.5,
    concUnit: "mg/mL", concentrations: [1, 2],
    loadingDose: { low: 0.06, high: 0.15, unit: "mg/kg", route: "IV" },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Pentobarbital",
    category: "ยาระงับความรู้สึก/ยากันชัก",
    notes: "ทำให้สลบลึก (coma) สำหรับอาการชักที่คุมไม่ได้ หรือใช้ร่วมเครื่องช่วยหายใจ",
    rateUnit: "mg/kg/h", doseLow: 0.2, doseHigh: 2.5,
    concUnit: "mg/mL", concentrations: [50],
    loadingDose: { low: 2, high: 15, unit: "mg/kg", route: "IV ให้จนได้ผล (to effect)" },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Phenylephrine",
    category: "ยากระตุ้นหัวใจ/ความดัน (Inotrope/Pressor)",
    notes: "Vasopressor สำหรับภาวะความดันต่ำที่ดื้อต่อการรักษา (refractory hypotension)",
    rateUnit: "mcg/kg/min", doseLow: 0.1, doseHigh: 0.5,
    concUnit: "mg/mL", concentrations: [10],
    loadingDose: { low: 5, high: 20, unit: "mcg/kg", route: "IV ซ้ำได้ทุก 10-15 นาทีตามต้องการ (PRN)" },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Procainamide",
    category: "ยาต้านหัวใจเต้นผิดจังหวะ (Antiarrhythmic)",
    notes: "Ventricular antiarrhythmic",
    rateUnit: "mcg/kg/min", doseLow: 10, doseHigh: 40,
    concUnit: "mg/mL", concentrations: [100],
    loadingDose: { low: 6, high: 8, unit: "mg/kg", route: "IV นาน 5 นาที" },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Propofol (CRI)",
    category: "ยาระงับความรู้สึก (Anesthetic)",
    notes: "ยาสลบออกฤทธิ์สั้น สำหรับเครื่องช่วยหายใจหรือควบคุมอาการชัก",
    rateUnit: "mcg/kg/min", doseLow: 100, doseHigh: 400,
    concUnit: "mg/mL", concentrations: [10],
    loadingDose: { low: 4, high: 6, unit: "mg/kg", route: "IV ช้าๆ (slow IV)" },
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Vasopressin",
    category: "ยากระตุ้นหัวใจ/ความดัน (Inotrope/Pressor)",
    notes: "ภาวะความดันต่ำที่ดื้อต่อการรักษา (refractory hypotension)",
    rateUnit: "U/kg/min", doseLow: 0.001, doseHigh: 0.004,
    concUnit: "U/mL", concentrations: [20],
    loadingDose: null,
    source: "Table E.1, Appendix E, p.508"
  },
  {
    name: "Verapamil",
    category: "ยาต้านหัวใจเต้นผิดจังหวะ (Antiarrhythmic)",
    notes: "Supraventricular arrhythmia/tachycardia",
    rateUnit: "mcg/kg/min", doseLow: 2, doseHigh: 10,
    concUnit: "mg/mL", concentrations: [2.5],
    loadingDose: { low: 0.05, high: 0.15, unit: "mg/kg", route: "IV ช้าๆ (slow IV)" },
    source: "Table E.1, Appendix E, p.508"
  }
];
