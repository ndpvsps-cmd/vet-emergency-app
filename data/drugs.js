// ฐานข้อมูลยาฉุกเฉินทางสัตวแพทย์ (สุนัข/แมว)
//
// แหล่งอ้างอิงหลัก:
// [RECOVER 2024] Burkitt-Creedon JM, et al. 2024 RECOVER Guidelines: Updated treatment
//   recommendations for CPR in dogs and cats. J Vet Emerg Crit Care. 2024;34(Suppl 1):104-123.
//   ค่าที่ใช้มาจาก Table 2 "CPR dosage chart for dogs and cats" (หน้า 116) และเนื้อหาในบทความ
// [Plumb's 10th] Budde JA, McCluskey DM. Plumb's Veterinary Drug Handbook, 10th Edition.
//   เลขหน้าระบุไว้ในแต่ละรายการ
//
// *** ข้อมูลนี้สกัดมาจากตำราที่ผู้ใช้ให้มาโดยตรง แต่ยังไม่ได้ให้สัตวแพทย์ของคลินิกตรวจทานขั้นสุดท้าย ***
// *** โปรดตรวจสอบซ้ำกับตำราฉบับเต็มและความเข้มข้นยาที่คลินิกมีจริงก่อนใช้กับผู้ป่วยจริงทุกครั้ง ***
//
// หมายเหตุโครงสร้างข้อมูล:
// - unit เป็นหน่วยต่อน้ำหนักตัว (เช่น "mg/kg", "U/kg", "mEq/kg", "mcg/kg") หน่วยของขนาดยาและ
//   ความเข้มข้น (concentrations) จะสอดคล้องกันเสมอ (เช่น unit "U/kg" ใช้คู่กับความเข้มข้น U/mL)
// - ถ้า doseLow = doseHigh คือยาที่มีขนาดตายตัว
// - ถ้าสปีชีส์ใดไม่มีข้อมูลใน species ให้เว้นว่างไว้ (ไม่เดาค่า)
// - contraindicated: ใช้เมื่อมีข้อห้ามใช้ชัดเจนในสปีชีส์นั้น (ไม่ใช่แค่ไม่มีข้อมูล)

const DRUGS = [
  // ---------- CPR (RECOVER 2024, Table 2, p.116) ----------
  {
    name: "Epinephrine",
    category: "CPR",
    species: {
      dog: { doseLow: 0.01, doseHigh: 0.01, unit: "mg/kg", route: "IV/IO", notes: "ยากระตุ้นหลอดเลือดสำหรับ nonshockable rhythm; ให้ซ้ำได้ทุก 3-5 นาที; ไม่แนะนำ high-dose epinephrine (0.1 mg/kg) อีกต่อไป" },
      cat: { doseLow: 0.01, doseHigh: 0.01, unit: "mg/kg", route: "IV/IO", notes: "ยากระตุ้นหลอดเลือดสำหรับ nonshockable rhythm; ให้ซ้ำได้ทุก 3-5 นาที; ไม่แนะนำ high-dose epinephrine (0.1 mg/kg) อีกต่อไป" }
    },
    concentrations: [1, 0.1],
    source: "RECOVER 2024, Table 2, p.116"
  },
  {
    name: "Vasopressin",
    category: "CPR",
    species: {
      dog: { doseLow: 0.8, doseHigh: 0.8, unit: "U/kg", route: "IV/IO", notes: "ทางเลือกแทน epinephrine ใน shockable rhythm ที่ยังคงอยู่หลัง shock ครั้งแรก" },
      cat: { doseLow: 0.8, doseHigh: 0.8, unit: "U/kg", route: "IV/IO", notes: "ทางเลือกแทน epinephrine ใน shockable rhythm ที่ยังคงอยู่หลัง shock ครั้งแรก" }
    },
    concentrations: [20],
    source: "RECOVER 2024, Table 2, p.116; ความเข้มข้นมาตรฐาน Vasopressin Injection 20 pressor units/mL (Plumb's 10th, p.1295)"
  },
  {
    name: "Atropine",
    category: "CPR",
    species: {
      dog: { doseLow: 0.04, doseHigh: 0.054, unit: "mg/kg", route: "IV/IO", notes: "ให้ครั้งเดียวช่วงต้นของการทำ CPR เท่านั้น ห้ามให้ซ้ำ" },
      cat: { doseLow: 0.04, doseHigh: 0.054, unit: "mg/kg", route: "IV/IO", notes: "ให้ครั้งเดียวช่วงต้นของการทำ CPR เท่านั้น ห้ามให้ซ้ำ" }
    },
    concentrations: [1, 0.54],
    source: "RECOVER 2024, Table 2, p.116; ความเข้มข้น 1 mg/mL ตามที่คลินิกใช้จริง (Plumb's 10th ยังระบุ Atropine Sulfate Injection 0.54 mg/mL, p.116, ไว้เป็นทางเลือกด้วย)"
  },
  {
    name: "Lidocaine",
    category: "CPR",
    species: {
      dog: { doseLow: 2, doseHigh: 2, unit: "mg/kg", route: "IV", notes: "ให้ช้าๆ นาน 2-4 นาที สำหรับ refractory PVT/VF ในสุนัขหลัง shock ครั้งแรกไม่สำเร็จ" }
    },
    contraindicated: {
      cat: "RECOVER 2024 แนะนำว่า ไม่ควรให้ lidocaine ทาง IV ในแมวที่มี refractory VT/VF หลัง shock ครั้งแรก ให้ใช้ Amiodarone แทน"
    },
    concentrations: [20],
    source: "RECOVER 2024, Table 2, p.116; ความเข้มข้นมาตรฐาน Lidocaine HCl for Injection 2% = 20 mg/mL (Plumb's 10th, p.755)"
  },
  {
    name: "Amiodarone",
    category: "CPR",
    species: {
      dog: { doseLow: 5, doseHigh: 5, unit: "mg/kg", route: "IV", notes: "ให้ช้าๆ นาน 2-4 นาที ใช้เมื่อไม่มี lidocaine; หลีกเลี่ยงสูตรที่มี polysorbate-80 ในสุนัข (เสี่ยง hemodynamic side effect)" },
      cat: { doseLow: 5, doseHigh: 5, unit: "mg/kg", route: "IV", notes: "ให้ช้าๆ นาน 2-4 นาที สำหรับ refractory PVT/VF" }
    },
    concentrations: [50],
    source: "RECOVER 2024, Table 2, p.116; ความเข้มข้นมาตรฐาน Amiodarone Injection Solution 50 mg/mL (Plumb's 10th, p.58)"
  },
  {
    name: "Esmolol",
    category: "CPR",
    species: {
      dog: { doseLow: 0.5, doseHigh: 0.5, unit: "mg/kg", route: "IV/IO", notes: "ขนาด loading dose ให้นาน 3-5 นาที ตามด้วย CRI 50 mcg/kg/min (คำนวณ CRI แยกต่างหาก ไม่ใช่ในเครื่องคำนวณนี้)" },
      cat: { doseLow: 0.5, doseHigh: 0.5, unit: "mg/kg", route: "IV/IO", notes: "ขนาด loading dose ให้นาน 3-5 นาที ตามด้วย CRI 50 mcg/kg/min (คำนวณ CRI แยกต่างหาก ไม่ใช่ในเครื่องคำนวณนี้)" }
    },
    concentrations: [10],
    source: "RECOVER 2024, Table 2, p.116; ความเข้มข้นมาตรฐาน Esmolol HCl Injection 10 mg/mL (Plumb's 10th, p.478)"
  },
  {
    name: "Naloxone",
    category: "CPR / Reversal",
    species: {
      dog: { doseLow: 0.04, doseHigh: 0.04, unit: "mg/kg", route: "IV/IO", notes: "ใช้เมื่อสงสัยภาวะหัวใจหยุดเต้นหรือ bradycardia ที่สัมพันธ์กับการได้รับ opioid" },
      cat: { doseLow: 0.04, doseHigh: 0.04, unit: "mg/kg", route: "IV/IO", notes: "ใช้เมื่อสงสัยภาวะหัวใจหยุดเต้นหรือ bradycardia ที่สัมพันธ์กับการได้รับ opioid" }
    },
    concentrations: [0.4, 1],
    source: "RECOVER 2024, Table 2, p.116; ความเข้มข้นมาตรฐาน Naloxone HCl Injection 0.4 mg/mL หรือ 1 mg/mL (Plumb's 10th, p.926)"
  },
  {
    name: "Atipamezole",
    category: "CPR / Reversal",
    species: {
      dog: { doseLow: 0.1, doseHigh: 0.1, unit: "mg/kg", route: "IM", notes: "ยา reversal สำหรับ alpha-2 agonist (เช่น dexmedetomidine); ในทางปฏิบัติมักคำนวณตามปริมาณ alpha-2 agonist ที่ให้ไป ค่านี้เป็นขนาดฉุกเฉินทั่วไปจาก RECOVER" },
      cat: { doseLow: 0.1, doseHigh: 0.1, unit: "mg/kg", route: "IM", notes: "ยา reversal สำหรับ alpha-2 agonist (เช่น dexmedetomidine); ในทางปฏิบัติมักคำนวณตามปริมาณ alpha-2 agonist ที่ให้ไป ค่านี้เป็นขนาดฉุกเฉินทั่วไปจาก RECOVER" }
    },
    concentrations: [5],
    source: "RECOVER 2024, Table 2, p.116 (ระบุ 100 mcg/kg); ความเข้มข้นมาตรฐาน Atipamezole HCl for Injection 5 mg/mL (Plumb's 10th, p.107)"
  },
  {
    name: "Flumazenil",
    category: "CPR / Reversal",
    species: {
      dog: { doseLow: 0.01, doseHigh: 0.01, unit: "mg/kg", route: "IV/IO", notes: "ยา reversal สำหรับ benzodiazepine (เช่น diazepam, midazolam)" },
      cat: { doseLow: 0.01, doseHigh: 0.01, unit: "mg/kg", route: "IV/IO", notes: "ยา reversal สำหรับ benzodiazepine (เช่น diazepam, midazolam)" }
    },
    concentrations: [0.1],
    source: "RECOVER 2024, Table 2, p.116; ความเข้มข้นมาตรฐาน Flumazenil Injection 0.1 mg/mL (Plumb's 10th, p.539)"
  },
  {
    name: "Sodium Bicarbonate",
    category: "CPR",
    species: {
      dog: { doseLow: 1, doseHigh: 1, unit: "mEq/kg", route: "IV/IO", notes: "พิจารณาให้เมื่อ CPA นานเกิน 10-15 นาที (alkalinization therapy)" },
      cat: { doseLow: 1, doseHigh: 1, unit: "mEq/kg", route: "IV/IO", notes: "พิจารณาให้เมื่อ CPA นานเกิน 10-15 นาที (alkalinization therapy)" }
    },
    concentrations: [1],
    source: "RECOVER 2024, Table 2, p.116; ความเข้มข้นมาตรฐาน Sodium Bicarbonate Injection 8.4% = 1 mEq/mL (Plumb's 10th, p.1164)"
  },
  {
    name: "Calcium Gluconate 10%",
    category: "CPR",
    species: {
      dog: { doseLow: 50, doseHigh: 50, unit: "mg/kg", route: "IV/IO ช้าๆ นาน 2-5 นาที", notes: "สำหรับ hypocalcemia ที่ยืนยันแล้ว หรือสงสัย hyperkalemia ที่เกี่ยวข้องกับภาวะหัวใจหยุดเต้น" },
      cat: { doseLow: 50, doseHigh: 50, unit: "mg/kg", route: "IV/IO ช้าๆ นาน 2-5 นาที", notes: "สำหรับ hypocalcemia ที่ยืนยันแล้ว หรือสงสัย hyperkalemia ที่เกี่ยวข้องกับภาวะหัวใจหยุดเต้น" }
    },
    concentrations: [100],
    source: "RECOVER 2024, Table 2 และเนื้อหาบทความ p.111-112; ความเข้มข้นมาตรฐาน Calcium Gluconate Injection 10% = 100 mg/mL (Plumb's 10th, p.16393 ref.)"
  },
  {
    name: "Calcium Chloride 10%",
    category: "CPR",
    species: {
      dog: { doseLow: 15, doseHigh: 15, unit: "mg/kg", route: "IV/IO ช้าๆ นาน 2-5 นาที", notes: "สำหรับ hypocalcemia ที่ยืนยันแล้ว หรือสงสัย hyperkalemia ที่เกี่ยวข้องกับภาวะหัวใจหยุดเต้น; ระคายเคืองหลอดเลือดมากกว่า calcium gluconate หากรั่วนอกหลอดเลือด" },
      cat: { doseLow: 15, doseHigh: 15, unit: "mg/kg", route: "IV/IO ช้าๆ นาน 2-5 นาที", notes: "สำหรับ hypocalcemia ที่ยืนยันแล้ว หรือสงสัย hyperkalemia ที่เกี่ยวข้องกับภาวะหัวใจหยุดเต้น; ระคายเคืองหลอดเลือดมากกว่า calcium gluconate หากรั่วนอกหลอดเลือด" }
    },
    concentrations: [100],
    source: "RECOVER 2024, เนื้อหาบทความ p.111-112 (10% calcium chloride 15 mg/kg IV/IO); ความเข้มข้นมาตรฐาน 10% = 100 mg/mL"
  },

  // ---------- Seizure control (Plumb's 10th) ----------
  {
    name: "Diazepam",
    category: "Seizure",
    species: {
      dog: { doseLow: 0.5, doseHigh: 1, unit: "mg/kg", route: "IV bolus (ช้าๆ)", notes: "สำหรับ cluster seizure / status epilepticus ให้ซ้ำได้ทุก 10 นาที สูงสุด 3 ครั้ง หลีกเลี่ยงในแมวที่กินยาทางปาก (เสี่ยง idiosyncratic hepatic necrosis)" }
    },
    concentrations: [5],
    source: "Plumb's 10th, Diazepam, p.380-381; ความเข้มข้นมาตรฐาน Diazepam Injection 5 mg/mL (p.382). ไม่พบขนาดยาเฉพาะสำหรับอาการชักในแมวในส่วนที่ตรวจสอบ — โปรดตรวจสอบเพิ่มเติมก่อนใช้ในแมว"
  },
  {
    name: "Midazolam",
    category: "Seizure",
    species: {
      dog: { doseLow: 0.1, doseHigh: 0.3, unit: "mg/kg", route: "IV/IM", notes: "สำหรับ status epilepticus ช่วง IV/IM 0.07-0.5 mg/kg; ให้ซ้ำได้ถึง 2 ครั้งหากไม่ตอบสนอง; ทางเลือกอื่น: intranasal 0.2 mg/kg หรือ CRI 0.25-0.4 mg/kg/hour" }
    },
    concentrations: [1, 5],
    source: "Plumb's 10th, Midazolam, p.881-883; ความเข้มข้นมาตรฐาน Midazolam HCl Injection 1 mg/mL หรือ 5 mg/mL (p.885). ไม่พบขนาดยาเฉพาะสำหรับอาการชักในแมวในส่วนที่ตรวจสอบ — โปรดตรวจสอบเพิ่มเติมก่อนใช้ในแมว"
  },

  // ---------- Pulmonary edema / CHF (Plumb's 10th) ----------
  {
    name: "Furosemide",
    category: "Pulmonary Edema",
    species: {
      dog: { doseLow: 1, doseHigh: 4, unit: "mg/kg", route: "IV/IM/SC", notes: "Acute cardiogenic/pulmonary edema: ให้ซ้ำได้ทุก 1-2 ชั่วโมงจนอาการหายใจดีขึ้น; ทางเลือก: initial 2 mg/kg IV/IM แล้วตามด้วย 2 mg/kg ทุกชั่วโมง สูงสุด 8 mg/kg ใน 4 ชั่วโมง" },
      cat: { doseLow: 1, doseHigh: 3, unit: "mg/kg", route: "IV/IM/SC", notes: "Acute cardiogenic/pulmonary edema: ขนาดยาในแมวมักต่ำกว่าสุนัขเล็กน้อย ให้ซ้ำได้ภายใน 1-2 ชั่วโมง" }
    },
    concentrations: [10],
    source: "Plumb's 10th, Furosemide, p.565-566; ความเข้มข้นมาตรฐาน Furosemide Injection 10 mg/mL (p.567)"
  },

  // ---------- Adrenal crisis (Plumb's 10th) ----------
  {
    name: "Dexamethasone SP (Adrenal Crisis)",
    category: "Adrenal Crisis",
    species: {
      dog: { doseLow: 0.1, doseHigh: 0.2, unit: "mg/kg", route: "IV/IM", notes: "ขนาดเริ่มต้นสำหรับภาวะ adrenal insufficiency / Addisonian crisis; ไม่รบกวนผล cortisol assay จึงทำ ACTH stimulation test ต่อได้เลย" },
      cat: { doseLow: 0.1, doseHigh: 0.2, unit: "mg/kg", route: "IV/IM", notes: "ขนาดเริ่มต้นสำหรับภาวะ adrenal insufficiency / Addisonian crisis" }
    },
    concentrations: [4, 2],
    source: "Plumb's 10th, Dexamethasone, p.364-366; ความเข้มข้นมาตรฐาน Dexamethasone Sodium Phosphate Injection 4 mg/mL หรือ Dexamethasone Injection 2 mg/mL (p.365)"
  },

  // ---------- Anaphylaxis / allergic reaction (Plumb's 10th) ----------
  {
    name: "Diphenhydramine",
    category: "Anaphylaxis",
    species: {
      dog: { doseLow: 0.5, doseHigh: 2, unit: "mg/kg", route: "IM/IV ช้าๆ (หลีกเลี่ยง SC)", notes: "สำหรับ anaphylaxis, urticaria, angioedema, ปฏิกิริยาจากการถ่ายเลือด/วัคซีน; ทาง IV ควรเจือจางและให้ช้า" },
      cat: { doseLow: 0.5, doseHigh: 2, unit: "mg/kg", route: "IM/IV ช้าๆ (หลีกเลี่ยง SC)", notes: "สำหรับ anaphylaxis, urticaria, angioedema, ปฏิกิริยาจากการถ่ายเลือด/วัคซีน; ทาง IV ควรเจือจางและให้ช้า" }
    },
    concentrations: [50],
    source: "Plumb's 10th, Diphenhydramine, p.409-411; ความเข้มข้นมาตรฐาน Diphenhydramine Injection 50 mg/mL (p.411)"
  },

  // ---------- Hypoglycemia (Plumb's 10th) ----------
  {
    name: "Dextrose 50%",
    category: "Hypoglycemia",
    species: {
      dog: { doseLow: 0.25, doseHigh: 0.5, unit: "g/kg", route: "IV ช้าๆ (เจือจาง 1:2 ถึง 1:4 ก่อนให้)", notes: "Emergency treatment of hypoglycemia: ให้ bolus ช้าๆ นาน ~5 นาที ตามด้วย dextrose 2.5-5% IV CRI; ควรเจือจางเสมอเพื่อลดความเสี่ยง phlebitis" },
      cat: { doseLow: 0.25, doseHigh: 0.5, unit: "g/kg", route: "IV ช้าๆ (เจือจาง 1:2 ถึง 1:4 ก่อนให้)", notes: "Emergency treatment of hypoglycemia: ให้ bolus ช้าๆ นาน ~5 นาที ตามด้วย dextrose 2.5-5% IV CRI; ควรเจือจางเสมอเพื่อลดความเสี่ยง phlebitis" }
    },
    concentrations: [0.5],
    source: "Plumb's 10th, Dextrose 50% Injection, p.376-377; ความเข้มข้น 50% = 0.5 g/mL (500 mg/mL)"
  },

  // ---------- Increased ICP / head trauma (Plumb's 10th) ----------
  {
    name: "Mannitol",
    category: "Increased ICP",
    species: {
      dog: { doseLow: 0.5, doseHigh: 1, unit: "g/kg", route: "IV/IO ช้าๆ นาน 15-20 นาที", notes: "สำหรับ cerebral edema / increased intracranial pressure; ห้ามใช้ CRI สำหรับข้อบ่งชี้นี้ ให้ bolus ซ้ำได้ทุก 6-8 ชม.หากจำเป็น; ห้ามใช้ในผู้ป่วย hypovolemia/anuria ที่ยังไม่แก้ไข" },
      cat: { doseLow: 0.5, doseHigh: 1, unit: "g/kg", route: "IV/IO ช้าๆ นาน 15-20 นาที", notes: "สำหรับ cerebral edema / increased intracranial pressure; ห้ามใช้ CRI สำหรับข้อบ่งชี้นี้ ให้ bolus ซ้ำได้ทุก 6-8 ชม.หากจำเป็น; ห้ามใช้ในผู้ป่วย hypovolemia/anuria ที่ยังไม่แก้ไข" }
    },
    concentrations: [0.2],
    source: "Plumb's 10th, Mannitol, p.793-795; ความเข้มข้นมาตรฐาน Mannitol Injection 20% = 0.2 g/mL (200 mg/mL, ผลิตภัณฑ์สัตวแพทย์)"
  },

  // ---------- Vasopressor CRI (Plumb's 10th) ----------
  {
    name: "Norepinephrine",
    category: "Vasopressor (CRI)",
    perMinute: true,
    species: {
      dog: { doseLow: 0.05, doseHigh: 0.1, unit: "mcg/kg", route: "IV CRI เท่านั้น ห้ามฉีด bolus", notes: "ขนาดเริ่มต้นสำหรับ persistent hypotension หลังแก้ไขปริมาตรน้ำเพียงพอแล้ว ไตเตรทขึ้นได้ถึงสูงสุด 1-2 mcg/kg/min; ต้องเจือจางก่อนให้เสมอ (ตัวเลข mL/นาที ที่คำนวณได้เป็นอัตราสารเข้มข้นก่อนเจือจาง ใช้ประกอบการเตรียมสารละลายเจือจางจริง ไม่ใช่ให้ตรงๆ)" },
      cat: { doseLow: 0.05, doseHigh: 0.1, unit: "mcg/kg", route: "IV CRI เท่านั้น ห้ามฉีด bolus", notes: "ขนาดเริ่มต้นสำหรับ persistent hypotension หลังแก้ไขปริมาตรน้ำเพียงพอแล้ว ไตเตรทขึ้นได้ถึงสูงสุด 1-2 mcg/kg/min; ต้องเจือจางก่อนให้เสมอ (ตัวเลข mL/นาที ที่คำนวณได้เป็นอัตราสารเข้มข้นก่อนเจือจาง ใช้ประกอบการเตรียมสารละลายเจือจางจริง ไม่ใช่ให้ตรงๆ)" }
    },
    concentrations: [1000],
    source: "Plumb's 10th, Norepinephrine, p.943-945 (0.05-1 mcg/kg/min, dose อ้างอิงเป็น norepinephrine base); ความเข้มข้นมาตรฐานผลิตภัณฑ์ human-labeled (Levophed) 1 mg/mL = 1000 mcg/mL — โปรดตรวจสอบกับสต๊อกจริงของคลินิก"
  },

  // ---------- Seizure / Anesthesia induction (Plumb's 10th) ----------
  {
    name: "Ketamine",
    category: "Seizure",
    species: {
      dog: { doseLow: 5, doseHigh: 5, unit: "mg/kg", route: "IV bolus", notes: "Refractory status epilepticus: อาจใช้ร่วมกับ anticonvulsant อื่น (diazepam, levetiracetam)" }
    },
    concentrations: [100, 50, 10],
    source: "Plumb's 10th, Ketamine, p.717-724 (refractory status epilepticus 5 mg/kg IV); ความเข้มข้นมาตรฐาน Ketamine HCl for Injection 100 mg/mL (ยังมี 50 และ 10 mg/mL). ไม่พบขนาดยาเฉพาะสำหรับอาการชักในแมวในส่วนที่ตรวจสอบ — โปรดตรวจสอบเพิ่มเติมก่อนใช้ในแมว"
  },
  {
    name: "Propofol",
    category: "Seizure",
    species: {
      dog: { doseLow: 2, doseHigh: 8, unit: "mg/kg", route: "IV bolus ช้าๆ (นาน ~60 วินาที)", notes: "Refractory status epilepticus หรือ induction of anesthesia: ตามด้วย CRI 0.1-0.25 mg/kg/min ถ้าใช้รักษาอาการชักต่อเนื่อง (สูงสุด 48 ชม.) ให้ขนาดต่ำที่สุดเท่าที่ควบคุมอาการได้" },
      cat: { doseLow: 2, doseHigh: 8, unit: "mg/kg", route: "IV bolus ช้าๆ (นาน ~60 วินาที)", notes: "Refractory status epilepticus หรือ induction of anesthesia: ตามด้วย CRI 0.1-0.25 mg/kg/min ถ้าใช้รักษาอาการชักต่อเนื่อง (สูงสุด 48 ชม.) ให้ขนาดต่ำที่สุดเท่าที่ควบคุมอาการได้; แมวฟื้นตัวช้ากว่าสุนัขถ้าให้ CRI นาน" }
    },
    concentrations: [10],
    source: "Plumb's 10th, Propofol, p.1080-1086 (refractory status epilepticus 2-8 mg/kg IV bolus); ความเข้มข้นมาตรฐาน Propofol Injection 10 mg/mL (1%)"
  },

  // ---------- Analgesia (Plumb's 10th) ----------
  {
    name: "Fentanyl",
    category: "Analgesia",
    species: {
      dog: { doseLow: 3, doseHigh: 5, unit: "mcg/kg", route: "IV titrate to effect", notes: "ขนาดเริ่มต้น (loading dose) ให้ IV ช้าๆ จนได้ผล แล้วใช้ effective dose เป็นอัตรา IV CRI ต่อชั่วโมง; ในรายปวดรุนแรงมาก (severe pain in the emergent patient) อาจต้องไตเตรทเพิ่มได้ถึง 10-50 mcg/kg; ควรเตรียม naloxone ให้พร้อมใช้เสมอ" },
      cat: { doseLow: 3, doseHigh: 5, unit: "mcg/kg", route: "IV titrate to effect", notes: "ขนาดเริ่มต้น (loading dose) ให้ IV ช้าๆ จนได้ผล แล้วใช้ effective dose เป็นอัตรา IV CRI ต่อชั่วโมง; ในรายปวดรุนแรงมาก (severe pain in the emergent patient) อาจต้องไตเตรทเพิ่มได้ถึง 10-50 mcg/kg; ควรเตรียม naloxone ให้พร้อมใช้เสมอ" }
    },
    concentrations: [50],
    source: "ขนาดเริ่มต้น 3-5 mcg/kg ตามที่คลินิกใช้จริง (อยู่ในช่วง loading dose 2-10 mcg/kg ที่ Plumb's 10th, Fentanyl, p.512-514 ระบุไว้); ขนาดสูงสุด 10-50 mcg/kg สำหรับ severe pain ก็จาก Plumb's หน้าเดียวกัน; ความเข้มข้นมาตรฐาน Fentanyl Injectable 0.05 mg/mL = 50 mcg/mL"
  },
  {
    name: "Morphine",
    category: "Analgesia",
    species: {
      dog: { doseLow: 0.5, doseHigh: 1, unit: "mg/kg", route: "IM/SC/IV ช้าๆ", notes: "Analgesia: ให้ IV ช้าๆ เท่านั้น (เสี่ยง hypotension และ histamine release ถ้าให้เร็ว); ลดขนาดในผู้ป่วยที่อ่อนแอมาก" }
    },
    concentrations: [1, 2, 4, 5, 8, 10],
    source: "Plumb's 10th, Morphine, p.908-912. ไม่พบหัวข้อขนาดยาแยกสำหรับแมวในส่วนที่ตรวจสอบ (แมวมีการเมแทบอลิซึมยาต่างจากสุนัข — ครึ่งชีวิตยาวกว่า) โปรดตรวจสอบเพิ่มเติมก่อนใช้ในแมว — ความเข้มข้นมาตรฐาน Morphine Sulfate Injection มีหลายขนาด (1-50 mg/mL)"
  }
];
