// ข้อมูล Feline Diabetes Mellitus (DM) — โหมด Healthy DM (happy diabetic) และ DKA/eDKA
// แหล่งข้อมูล: Taylor S, Cannon M, Church D, et al. "2025 iCatCare consensus guidelines on the
// diagnosis and management of diabetes mellitus in cats." Journal of Feline Medicine and Surgery
// 2025;27:1-37. DOI: 10.1177/1098612X251399103 (เอกสารที่ผู้ใช้แนบมาโดยตรง)
// — Box 6 (ALIVE diagnosis), Box 8/Box 10 (insulin & SGLT2i), Table 3 (insulin formulations),
//   Table 6 (ALIVE Diabetic Clinical Score), Table 8 (เกณฑ์วินิจฉัย DKA/eDKA),
//   Figure 7 (happy vs unhappy diabetic), Figure 17/18 (โปรโตคอล DKA/eDKA)

// ---- Box 6: ALIVE criteria สำหรับวินิจฉัย feline DM ----
const DM_DIAGNOSIS_CRITERIA = [
  "BG (สุ่ม fasted/unfasted) ≥ 270 mg/dl ร่วมกับอาการทางคลินิกของ hyperglycaemia (โดยไม่มีสาเหตุอื่น) หรือมีภาวะวิกฤตจาก hyperglycaemia และมีอย่างน้อย 1 ข้อต่อไปนี้: glycated proteins สูง (เช่น fructosamine); หรือ glucosuria มากกว่า 1 ครั้งจากปัสสาวะที่เก็บเองที่บ้าน ≥ 2 วันหลังเหตุการณ์ที่ทำให้เครียด",
  "หรือ BG > 126 mg/dl และ < 270 mg/dl ร่วมกับอย่างน้อย 2 ข้อต่อไปนี้: อาการทางคลินิกของ hyperglycaemia (โดยไม่มีสาเหตุอื่น) หรือภาวะวิกฤต; glycated proteins สูง; glucosuria มากกว่า 1 ครั้งจากปัสสาวะที่เก็บเองที่บ้าน ≥ 2 วันหลังเหตุการณ์ที่ทำให้เครียด"
];

// ---- Figure 7: การแยก happy vs unhappy diabetic ----
const DM_HAPPY_DIABETIC = "Happy diabetic: กินอาหารปกติหรือมากขึ้น มีอาการทางคลินิกของ DM แต่ไม่มีปัญหาทางคลินิกอื่น → รักษาด้วย insulin SC หรือ SGLT2i";
const DM_UNHAPPY_DIABETIC = "Unhappy diabetic: เบื่ออาหาร ขาดน้ำ มีอาการป่วย (เช่น อาเจียน ท้องเสีย ซึม) → ตรวจ ketones (serum/blood) และมักต้องใช้โปรโตคอล DKA";

// ---- SGLT2i therapy (Box 10) ----
const DM_SGLT2I_DRUGS = [
  { drug: "Velagliflozin", dose: "1 mg/kg PO q24h", perKg: true },
  { drug: "Bexagliflozin", dose: "15 mg/ตัว PO q24h", perKg: false }
];
const DM_SGLT2I_NOTES = [
  "ให้ครั้งเดียวต่อวัน กินพร้อมหรือไม่พร้อมอาหารก็ได้ ไม่ต้อง titrate ขนาดยา",
  "ต้องคัดกรองความเหมาะสมก่อนเริ่มยาเสมอ — เหมาะกับ happy diabetic ที่ไม่มีภาวะเสี่ยงต่อ eDKA",
  "ควรใช้ในแมวที่เพิ่งได้รับการวินิจฉัยเป็นหลัก (พิจารณาในรายที่เคยได้ insulin มาก่อนได้)",
  "ยังไม่มีรายงานภาวะน้ำตาลในเลือดต่ำทางคลินิกในแมวที่ได้ SGLT2i",
  "เฝ้าระวังภาวะแทรกซ้อน (DKA และท้องเสีย) สำคัญที่สุดในช่วง 2 สัปดาห์แรก",
  "eDKA (euglycaemic DKA) เป็นผลข้างเคียงที่ร้ายแรงที่สุด (พบไม่บ่อย) — แจ้งเจ้าของให้รีบติดต่อคลินิกทันทีหากพบอาการซึม เบื่ออาหาร หรืออาเจียน/ท้องเสีย"
];
const DM_SGLT2I_SCREEN = [
  { key: "dehydration", label: "มีภาวะขาดน้ำ" },
  { key: "poorBcs", label: "Body condition ผอม / น้ำหนักลด" },
  { key: "giSigns", label: "มีอาการทางระบบทางเดินอาหาร (อาเจียน/ท้องเสีย/เบื่ออาหาร)" },
  { key: "pancreatitis", label: "มีตับอ่อนอักเสบทางคลินิก (clinical pancreatitis)" },
  { key: "ketosis", label: "ตรวจพบ ketosis / ketonuria" }
];
const DM_SGLT2I_SCREEN_NOTE = "การคัดกรองควรทำ: ซักประวัติ + ตรวจร่างกาย (บันทึกน้ำหนัก, BCS) + CBC/chemistry + urinalysis (ตรวจ ketonuria) — บางผู้เชี่ยวชาญเพิ่มการวัด serum beta-hydroxybutyrate (BHB)";

// ---- Insulin therapy (Box 8, Table 3, ส่วน dose adjustments) ----
const DM_INSULIN_PRINCIPLES = [
  "ไม่มี insulin ชนิดใดที่ \"ดีที่สุด\" — เลือกตามสถานการณ์ทางคลินิกและปัจจัยของเจ้าของ",
  "ไม่จำเป็นต้องให้ insulin พร้อมหรือหลังอาหารทันที",
  "เริ่มด้วยขนาดต่ำ แล้วปรับเพิ่มทีละขั้น (เช่น ครั้งละ 1 U ของขนาดยาต่อวัน) ทุก 2-4 สัปดาห์ พร้อมติดตามอาการทางคลินิกอย่างใกล้ชิด",
  "เป้าหมาย interstitial glucose หรือ BG ที่ 90-360 mg/dl มักสัมพันธ์กับการควบคุม DM ที่ดี",
  "หาก BG < 180 mg/dl ต่อเนื่องหลายวัน หรือไม่พบ glucosuria = ควบคุมได้ดีมาก แต่เสี่ยงต่อภาวะน้ำตาลต่ำ → ให้ลดขนาด insulin ทีละขั้น เพื่อช่วยให้ตรวจพบ diabetic remission และลดความเสี่ยง hypoglycaemia",
  "เมื่อเพิ่มขนาดยาแล้วไม่ทำให้ polydipsia ดีขึ้นอีก ให้ลดขนาด insulin ลงประมาณ 20-25%"
];
const DM_INSULIN_FORMULATIONS = [
  { name: "Porcine lente (Vetsulin/Caninsulin)", conc: "40 U/ml", action: "Intermediate-acting", freq: "q12h" },
  { name: "PZI — Protamine zinc (ProZinc)", conc: "40 U/ml", action: "Intermediate-acting", freq: "q12h (บางครั้ง q24h)" },
  { name: "Glargine U100 (Lantus)", conc: "100 U/ml", action: "Intermediate-acting", freq: "q12h (บางครั้ง q24h)" },
  { name: "Glargine U300 (Toujeo)", conc: "300 U/ml", action: "Long-acting (time-action profile แบนที่สุด — ใกล้เคียง basal insulin ที่สุด)", freq: "q12h (บางรายได้ q24h)" },
  { name: "Degludec", conc: "100 U/ml", action: "Intermediate-acting (มี peak, ~12 h)", freq: "q12h" }
];

// ---- Table 6: ALIVE Diabetic Clinical Score (DCS) — 4 ปัจจัย รวม 0-12 คะแนน คะแนนต่ำ = ควบคุมดีกว่า ----
const DM_DCS_FACTORS = [
  {
    key: "weightLoss", label: "น้ำหนักลดโดยไม่ตั้งใจ",
    options: [
      { score: 0, label: "ไม่มี หรือน้ำหนักขึ้นตั้งแต่ครั้งก่อน" },
      { score: 1, label: "เล็กน้อย (ลด < 5%)" },
      { score: 2, label: "ปานกลาง (ลด 5-10%)" },
      { score: 3, label: "รุนแรง (ลด > 10%)" }
    ]
  },
  {
    key: "pupd", label: "Polyuria และ Polydipsia (PU/PD)",
    options: [
      { score: 0, label: "ปกติ" },
      { score: 1, label: "เล็กน้อย (เจ้าของสังเกตว่าเพิ่มขึ้นบ้าง)" },
      { score: 2, label: "ปานกลาง (ต้องเติมน้ำในชามบ่อยขึ้น)" },
      { score: 3, label: "รุนแรง (อยู่ที่ชามน้ำตลอดเวลา)" }
    ]
  },
  {
    key: "appetite", label: "ความอยากอาหาร",
    options: [
      { score: 0, label: "ปกติ หรือลดลง (ถ้าลดลง ต้องแยก DKA/โรคร่วมออกก่อน)" },
      { score: 1, label: "Polyphagia เล็กน้อย (กินหมดอย่างกระตือรือร้น)" },
      { score: 2, label: "Polyphagia ปานกลาง (กินหมดและร้องขอเพิ่ม)" },
      { score: 3, label: "Polyphagia รุนแรง (หมกมุ่นกับอาหาร)" }
    ]
  },
  {
    key: "attitude", label: "ท่าทาง / ความกระฉับกระเฉง (Attitude/activity)",
    options: [
      { score: 0, label: "ปกติ" },
      { score: 1, label: "ลดลงเล็กน้อย (วิ่งเล่น/กระโดดน้อยลงบ้าง)" },
      { score: 2, label: "ลดลงปานกลาง (วิ่งเล่น/กระโดดน้อยลงมาก)" },
      { score: 3, label: "ลดลงรุนแรง (นอนทั้งวัน — ให้นึกถึง DKA ในแมวที่ป่วย)" }
    ]
  }
];
const DM_DCS_NOTE = "ช่วงคะแนนรวม 0-12 — คะแนนยิ่งต่ำ = ควบคุม DM ได้ดียิ่งขึ้น เป้าหมายคือได้คะแนนต่ำที่สุดโดยไม่เพิ่มความเสี่ยง hypoglycaemia มากเกินไป ใช้ประเมินทุกครั้งที่ recheck";

// ---- Table 8: เกณฑ์วินิจฉัย DKA และ eDKA ----
const DM_KETO_CRITERIA = {
  bgMgdlThreshold: 250,       // DKA: > 250 mg/dl (14 mmol/l); eDKA: < 250
  bhbThreshold: 2.4,          // mmol/l — ทั้ง DKA และ eDKA: > 2.4
  urineKetoneThreshold: 15,   // mg/dl — ทั้งสอง: > 15
  phThreshold: 7.35,          // ทั้งสอง: < 7.35
  hco3Threshold: 15           // mmol/l — ทั้งสอง: < 15
};

// ---- โปรโตคอล DKA (Figure 17) ----
const DM_DKA_FLUIDS = [
  "เริ่มสารน้ำโดยเร็วที่สุดหลังผู้ป่วยมาถึง: 0.9% NaCl หรือ buffered isotonic (เช่น LRS) เหมาะสมทั้งคู่",
  "ติดตามและเสริม K+ (มักต้องเสริมเสมอ)",
  "รวม maintenance (~2 mL/kg/h) + สารน้ำทดแทนการสูญเสียจากอาเจียน/osmotic diuresis",
  "ประเมิน % dehydration และความเรื้อรัง — แก้ dehydration 60-80% ใน 10-12 ชั่วโมงแรก และที่เหลือ 20-40% ใน 12-14 ชั่วโมงถัดไป",
  "โดยทั่วไปให้ประเมินความต้องการสารน้ำเกินเล็กน้อย ดีกว่าประเมินต่ำไป",
  "ระมัดระวังมากในรายที่มี CKD, congestive heart failure หรือ chronic hyperosmolarity"
];
const DM_DKA_INSULIN_IV = {
  prep: "เติม regular/soluble หรือ lispro insulin 1.1 U/kg ลงใน 0.9% NaCl 48 mL",
  saturate: "ทำให้ insulin จับกับสาย IV อิ่มตัวโดยตั้งสารละลายไว้ในสาย 30 นาที แล้ว run ผ่านสาย (บางผู้เขียนข้ามขั้นนี้ ยอมรับว่า CRI ช่วงแรกอาจได้ insulin น้อยกว่าที่คำนวณ)",
  restart: "เตรียมสารละลายใหม่ แล้วเริ่ม CRI ตามอัตราในตารางด้านล่าง (เลือกตาม BG) ปรับ CRI ทุก 1-2 ชั่วโมงตามค่า BG",
  line: "ใช้ IV catheter เฉพาะและสายแยกจากสารน้ำหลักสำหรับ insulin infusion"
};
// ตาราง CRI: อัตราสารละลาย insulin (mL/h) และชนิดสารน้ำ ตามระดับ BG
const DM_DKA_CRI_TABLE = [
  { bgLabel: "> 250 mg/dl", fluid: "0.9% NaCl หรือ LRS", rate: "2 mL/h" },
  { bgLabel: "200-250 mg/dl", fluid: "2.5% dextrose", rate: "1.5 mL/h" },
  { bgLabel: "150-199 mg/dl", fluid: "2.5% dextrose", rate: "1.5 mL/h" },
  { bgLabel: "100-149 mg/dl", fluid: "5% dextrose", rate: "1 mL/h" },
  { bgLabel: "< 100 mg/dl", fluid: "5% dextrose", rate: "หยุด insulin infusion" }
];
const DM_DKA_DEXTROSE_PREP = [
  "2.5% dextrose = dextrose 50% 25 mL เติมลงใน 0.9% NaCl หรือ LRS 475 mL",
  "5% dextrose = dextrose 50% 50 mL เติมลงใน 0.9% NaCl หรือ LRS 450 mL"
];
const DM_DKA_INSULIN_IM = {
  dose: "regular/soluble insulin 0.1-0.2 U/kg IM q1-2h",
  dextrose: "เมื่อ BG < 250 mg/dl ให้เติม dextrose 2.5-5%"
};
const DM_DKA_INSULIN_GLARGINE = "Glargine U100: 2 U/ตัว SC q12h ตามด้วย glargine IM สูงสุด 3 ครั้ง ครั้งละ 0.5-1 U/ตัว ห่างกันอย่างน้อย 4 ชั่วโมง";
const DM_DKA_MONITORING = [
  "Blood pH ทุก 8 ชั่วโมง",
  "Blood glucose ทุกชั่วโมงใน 24 ชั่วโมงแรก จากนั้นทุก 2-3 ชั่วโมง",
  "Ketones — ตามอุดมคติวัด blood BHB ทุก 4 ชั่วโมง",
  "Electrolytes (K, Na, Mg, P) ทุก 8-12 ชั่วโมง เสริมเมื่อจำเป็น",
  "Urine output, สถานะทางระบบประสาท",
  "Respiratory rate (เฝ้าระวัง fluid overload)",
  "น้ำหนักตัวทุก 12 ชั่วโมง (เฝ้าระวัง fluid overload)"
];
const DM_DKA_ANTIEMETICS = "Antiemetics: Maropitant, Ondansetron | Nutritional support: ให้อาหารทาง feeding tube (nasoesophageal/oesophagostomy), 4-6 มื้อเล็กต่อวัน, อาหารโปรตีนสูง/ไขมันปานกลาง";
const DM_DKA_RESOLUTION = [
  "ไม่อาเจียน กินอาหารได้ปานกลางถึงดี",
  "BHB ≤ 1.0 mmol/l (10.4 mg/dl) สองครั้งติดกันห่างกัน 1 ชั่วโมง หรือไม่พบ ketonuria",
  "Blood pH ≥ 7.3 และ/หรือ bicarbonate ≥ 15 mmol/l",
  "→ เริ่ม intermediate/long-acting insulin (เช่น PZI, glargine U100/U300) 1-1.5 U/ตัว SC q12h แล้วค่อยลดและหยุดสารน้ำ"
];
const DM_EDKA_ACTIONS = [
  "หยุดยา SGLT2i ทันที",
  "เริ่มสารน้ำ + แก้ไข electrolytes",
  "เริ่ม insulin (ตาม Figure 17) — จำเป็นเสมอแม้แมวจะ euglycaemic เพราะหากไม่ให้ insulin ketoacidosis จะไม่หาย",
  "ให้ IV dextrose (มัก 5% หรือมากกว่า) พร้อมกับเริ่ม insulin เพื่อรักษา BG > 100 mg/dl ติดตาม glucose ใกล้ชิดและบ่อย",
  "การทำงานของไต/ตับที่ลดลงอาจทำให้ SGLT2i ถูกกำจัดช้า → euglycaemia นานกว่า 24 ชั่วโมงและต้องให้ dextrose ต่อเนื่อง",
  "แมวที่เกิด DKA/eDKA ระหว่างได้ SGLT2i ควรเปลี่ยนมาใช้ insulin และโดยทั่วไปไม่ใช่ผู้ป่วยที่เหมาะจะรักษาด้วย SGLT2i ต่อ"
];

// ---- ภาวะน้ำตาลในเลือดต่ำ (Hypoglycaemia) ----
const DM_HYPOGLYCAEMIA = {
  signs: "อาการมักเป็นทางระบบประสาท: เดินเซ (ataxia), ตัวสั่น, ซึม, อาเจียน, ชัก",
  emergency: "IV bolus dextrose 0.5 g/kg (เช่น 25% dextrose 2 mL/kg IV ช้าๆ 5-10 นาที) ตามด้วย CRI 2.5% dextrose ปรับให้ได้ระดับน้ำตาลปกติ — แมวที่ได้ insulin เกินขนาดอาจได้ประโยชน์จาก glucagon",
  home: "เจ้าของควรเตรียม glucose syrup หรือน้ำผึ้งไว้ทาเหงือกในกรณีฉุกเฉิน — hypoglycaemia มักหายได้เอง และหากไม่รุนแรงแทบไม่เป็นอันตรายถึงชีวิต เหตุการณ์นี้เป็นสัญญาณว่าถึงเวลาลดขนาด insulin"
};
