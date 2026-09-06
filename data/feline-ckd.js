// ข้อมูล Feline Chronic Kidney Disease (CKD) — การประเมิน IRIS Stage/Substage และแนวทางการรักษา
// แหล่งข้อมูล: Taylor S, et al. "2026 iCatCare Consensus Guidelines on the Diagnosis and
// Management of Chronic Kidney Disease in Cats." Journal of Feline Medicine and Surgery 2026.
// (เอกสารที่ผู้ใช้แนบมาโดยตรง) — Table 1 (IRIS staging), Table 2 (IRIS substaging), Table 3
// (เป้าหมาย phosphate), Table 4 (antiemetics/appetite stimulants/antacids), Table 5 (การติดตาม
// ARB/ACEi), Table 6 (การรักษาความดันโลหิตสูง), Figure 17 (แนวทางจัดการโดยรวม), Figure 19/20
// (อัลกอริทึม phosphate/FGF23), และเนื้อหาส่วน Management of proteinuria/hypokalaemia/anaemia/
// constipation

// Table 1: IRIS staging ตาม creatinine (mg/dl) และ SDMA (µg/dl) — ใช้ค่าที่รุนแรงกว่าถ้าไม่ตรงกัน
// (ตามคำแนะนำของ IRIS ในเอกสาร: "assigning the more advanced stage would be an appropriate response")
const CKD_CREATININE_STAGES = [
  { stage: 1, max: 1.6, label: "< 1.6 mg/dl" },
  { stage: 2, max: 2.8, label: "1.6 - 2.8 mg/dl" },
  { stage: 3, max: 5.0, label: "2.9 - 5.0 mg/dl" },
  { stage: 4, max: Infinity, label: "> 5.0 mg/dl" }
];

const CKD_SDMA_STAGES = [
  { stage: 1, max: 17.9, label: "< 18 µg/dl" },
  { stage: 2, max: 25, label: "18 - 25 µg/dl" },
  { stage: 3, max: 38, label: "26 - 38 µg/dl" },
  { stage: 4, max: Infinity, label: "> 38 µg/dl" }
];

// Table 2: IRIS substaging ตาม UPC (urine protein:creatinine ratio) และ SBP (systolic blood pressure)
const CKD_PROTEINURIA_SUBSTAGES = [
  { key: "non", max: 0.19, label: "Non-proteinuric (UPC < 0.2)" },
  { key: "borderline", max: 0.4, label: "Borderline proteinuric (UPC 0.2 - 0.4)" },
  { key: "proteinuric", max: Infinity, label: "Proteinuric (UPC > 0.4)" }
];

const CKD_SBP_SUBSTAGES = [
  { key: "normotensive", max: 139, label: "Normotensive (< 140 mmHg)" },
  { key: "prehypertensive", max: 159, label: "Pre-hypertensive (140 - 159 mmHg)" },
  { key: "hypertensive", max: 179, label: "Hypertensive (160 - 179 mmHg)" },
  { key: "severe", max: Infinity, label: "Severely hypertensive (≥ 180 mmHg)" }
];

// Table 3: เป้าหมายระดับ phosphate ในเลือดตาม IRIS stage (mg/dl)
const CKD_PHOSPHATE_TARGETS = {
  1: null, // N/A — ยังไม่มีเป้าหมายเฉพาะใน stage 1
  2: { low: 2.5, high: 4.5 },
  3: { low: 2.5, high: 5.0 },
  4: { low: 2.5, high: 6.0 }
};

// Table 6: ทางเลือกการรักษาความดันโลหิตสูงในแมวที่เป็น CKD
const CKD_HYPERTENSION_DRUGS = [
  {
    class: "Calcium channel blocker",
    drug: "Amlodipine",
    dose: "0.125-0.25 mg/kg PO q24h (โดยทั่วไป 0.625 หรือ 1.25 mg/ตัว q24h) — รายที่ความดันสูงมากอาจต้องใช้ถึง 0.5 mg/kg",
    note: "มักได้ผลดีเมื่อใช้เดี่ยว ผลข้างเคียง: ความดันต่ำ, เหงือกโต — amlodipine แบบทาผิวหนังได้ผลด้อยกว่าแบบกิน"
  },
  {
    class: "ARB",
    drug: "Telmisartan",
    dose: "2 mg/kg PO q24h (เมื่อใช้เดี่ยว) — ถ้าใช้ร่วมกับ amlodipine เริ่มที่ 1 mg/kg q24h",
    note: "ลด SBP ได้ประมาณ 20-25 mmHg"
  },
  {
    class: "ACE inhibitor",
    drug: "Benazepril",
    dose: "0.5-1.0 mg/kg PO q24h",
    note: "ไม่แนะนำให้ใช้เดี่ยวสำหรับความดันสูงมาก (SBP > 180 mmHg) — ใช้ร่วมกับ amlodipine ได้"
  },
  {
    class: "ACE inhibitor",
    drug: "Enalapril",
    dose: "0.25-0.5 mg/kg PO q24h",
    note: ""
  },
  {
    class: "ACE inhibitor",
    drug: "Ramipril",
    dose: "0.125-0.25 mg/kg PO q24h",
    note: ""
  }
];
const CKD_HYPERTENSION_TARGET = "เป้าหมาย SBP: ให้ปกติ (< 140 mmHg) ถ้าเป็นไปได้ หรืออย่างน้อย < 160 mmHg — ประเมินซ้ำหลังเริ่ม/ปรับยา 1-2 สัปดาห์";

// ยาลดโปรตีนรั่วในปัสสาวะ (Proteinuria, UPC > 0.4)
const CKD_PROTEINURIA_DRUGS = [
  { drug: "Telmisartan (ARB)", dose: "1 mg/kg PO q24h" },
  { drug: "Benazepril (ACE inhibitor)", dose: "0.25-0.5 mg/kg PO q12h" }
];
const CKD_PROTEINURIA_NOTE = "ควรเริ่มการรักษาด้วยอาหารไตร่วมกับยายับยั้ง RAAS เมื่อ UPC > 0.4 ถือว่า proteinuric ตาม Table 2 " +
  "(ในรายที่ UPC 0.2-0.4 คือ borderline proteinuric — ยังไม่มีหลักฐานชัดเจนว่าการรักษาได้ประโยชน์ แต่บางคลินิกอาจพิจารณาให้ยา) " +
  "ควรให้ RAAS inhibitor เฉพาะในแมวที่ไม่ขาดน้ำและ CKD คงที่เท่านั้น ผลข้างเคียงที่อาจพบ: ความดันต่ำ, โพแทสเซียมสูง, azotaemia แย่ลง";

// Table 5: ตารางติดตามแมวที่ได้รับ ARB/ACE inhibitor สำหรับ proteinuria
const CKD_PROTEINURIA_MONITORING = [
  { time: "1-2 สัปดาห์แรก", check: "อาการทางคลินิก, SBP, creatinine, potassium", aim: "ประเมินการทนต่อยา — หาก creatinine เพิ่มขึ้น >25-30% ควรพิจารณาปรับขนาดยา" },
  { time: "4 สัปดาห์หลังเริ่ม/ปรับยา", check: "อาการทางคลินิก, SBP, UPC", aim: "ประเมินประสิทธิภาพในการลด UPC" },
  { time: "ทุก 3 เดือน", check: "อาการทางคลินิก, SBP, UPC", aim: "ติดตามระยะยาว" }
];

// การเสริมโพแทสเซียม (Management of hypokalaemia)
const CKD_POTASSIUM_INFO = {
  mild: "ภาวะโพแทสเซียมต่ำเล็กน้อยและอาการคงที่: เปลี่ยนเป็นอาหารไตที่มีโพแทสเซียมสูงขึ้นอาจเพียงพอ",
  moderateSevere: "ภาวะโพแทสเซียมต่ำปานกลางถึงมาก (แต่อาการยังคงที่): เสริม potassium gluconate หรือ potassium citrate ทางปาก " +
    "1-4 mEq/ตัว q12h ปรับตามการตอบสนอง — หากมี acidosis ร่วมด้วย potassium citrate อาจดีกว่าเพราะมีฤทธิ์ปรับ pH ด้วย",
  decompensated: "ภาวะโพแทสเซียมต่ำรุนแรงจนอาการทรุด: ต้องรับไว้รักษาในโรงพยาบาลและให้ IV potassium chloride แล้วตามด้วยการเสริมทางปากที่บ้าน"
};

// การจัดการภาวะเลือดเป็นกรด (Management of acidosis) — เป้าหมาย serum bicarbonate > 16 mmol/l
const CKD_ACIDOSIS_INFO = "เสริม potassium citrate 40-75 mg/kg PO q12h หรือ sodium bicarbonate 10-12 mg/kg PO q8-12h " +
  "เพื่อรักษาระดับ serum bicarbonate ให้ > 16 mmol/l";

// การรักษาภาวะซีดจาก CKD (Anaemia) ด้วย darbepoetin — เริ่มเมื่อ PCV < 25% หรือ PCV 25-28% ต่อเนื่องนานกว่า 1 เดือน
const CKD_ANAEMIA_INFO = {
  threshold: "เริ่มพิจารณาการรักษาเมื่อ PCV < 25% หรือ PCV อยู่ในช่วง 25-28% ต่อเนื่องนานกว่า 1 เดือน",
  starting: "Darbepoetin alpha 0.75-1 µg/kg SC สัปดาห์ละครั้ง พร้อมเสริมธาตุเหล็ก (iron dextran 50 mg/ตัว IM หรืออื่นๆ) — " +
    "วัด PCV และ SBP ทุกสัปดาห์ระหว่างปรับขนาดยา",
  titration: [
    "PCV < 30%: ให้ขนาดเดิมต่อ, ตรวจซ้ำใน 1 สัปดาห์",
    "PCV 30-40% (เป้าหมาย): ให้ขนาดเดิมแต่ลดความถี่เป็นทุก 2 สัปดาห์, ตรวจซ้ำใน 2 สัปดาห์",
    "PCV > 40%: งดยาไปก่อน แล้วเริ่มใหม่ที่ขนาดต่ำลง (ลดประมาณ 25%) และ/หรือความถี่น้อยลง (ทุก 2 สัปดาห์)"
  ],
  maintenance: "เมื่อคงที่ที่ PCV 30-40% ด้วยความถี่ทุก 2 สัปดาห์แล้ว ตรวจ SBP และ PCV ทุก 1-3 เดือน",
  iron: "ทางเลือกเสริมธาตุเหล็ก: Iron dextran 50 mg/ตัว IM ทุก 3-4 สัปดาห์ | Ferrous sulphate 50-100 mg/ตัว PO q24h | " +
    "Ferrous fumarate 30-60 mg/ตัว PO q24h (ประมาณ 1/5 ของแคปซูล 305 mg)"
};

// Table 4: ยาแก้คลื่นไส้อาเจียน กระตุ้นความอยากอาหาร และลดกรดในกระเพาะที่ใช้บ่อยในแมว CKD
const CKD_GI_DRUGS = [
  { drug: "Maropitant", dose: "1 mg/kg SC, IV หรือ PO q24h", indication: "ป้องกัน/รักษาคลื่นไส้อาเจียน", adverse: "เจ็บเมื่อฉีดใต้ผิวหนัง" },
  { drug: "Mirtazapine", dose: "2 mg/ตัว PO หรือทาผิวหนัง q24h (ปรับเป็น q48h ในรายที่ CKD ระยะสูง เนื่องจากขับออกทางไตลดลง)", indication: "ป้องกัน/รักษาคลื่นไส้อาเจียน, กระตุ้นความอยากอาหาร", adverse: "ร้อง/กระวนกระวาย, ผิวหนังแดงบริเวณที่ทา (แบบทา)" },
  { drug: "Ondansetron", dose: "0.1-1 mg/kg IV (ช้าๆ), IM, SC หรือ PO q6-12h", indication: "ป้องกัน/รักษาคลื่นไส้อาเจียน", adverse: "ระบบทางเดินอาหาร, ท้องผูก, แพ้ (พบน้อย)" },
  { drug: "Omeprazole", dose: "1 mg/kg PO q12h", indication: "สงสัย/ยืนยันแผลในกระเพาะ/ลำไส้", adverse: "เบื่ออาหาร, อาเจียน, ท้องเสีย" },
  { drug: "Capromorelin", dose: "2 mg/kg PO q24h", indication: "กระตุ้นความอยากอาหาร", adverse: "น้ำตาลในเลือดสูง, อาเจียน, น้ำลายไหล, ซึม, หัวใจเต้นช้า, ความดันต่ำ" }
];

// การจัดการท้องผูก (Management of constipation)
const CKD_CONSTIPATION_INFO = "แก้ไขภาวะขาดน้ำและโพแทสเซียมต่ำก่อนเสมอ จากนั้นพิจารณา: PEG 3350 (1/8-1/4 ช้อนชา q12-24h) " +
  "หรือ Psyllium (เริ่ม 1/4 ช้อนชา q24h หรือแบ่งให้ q12h)";

// สารน้ำใต้ผิวหนังที่บ้าน (Subcutaneous fluids)
const CKD_SC_FLUIDS_INFO = "75-100 mL/ตัว ทุก 1-3 วัน — แนะนำใช้สารน้ำ hypotonic (เช่น half-strength LRS, 0.45% saline, Normosol-M) " +
  "เพื่อลดปริมาณโซเดียม สามารถเติม KCl ได้ในรายที่โพแทสเซียมต่ำ (20-30 mEq KCl ต่อสารน้ำ 1000 mL)";

// Figure 17: ประเด็นสำคัญในการดูแลแมว CKD โดยรวม (ใช้เป็น checklist อ้างอิง)
const CKD_KEY_CONSIDERATIONS = [
  "อาหาร: ประเมินภาวะโภชนาการ และเปลี่ยนอาหารอย่างค่อยเป็นค่อยไป",
  "รักษาความชุ่มชื้น: เพิ่มการดื่มน้ำ / ให้สารน้ำใต้ผิวหนังที่บ้านหากจำเป็น",
  "ป้องกัน/รักษาท้องผูก: ปรับความชุ่มชื้น, แก้โพแทสเซียมต่ำ, เพิ่มไฟเบอร์, PEG 3350, จัดกระบะทรายให้เหมาะสม",
  "จัดการอาการเบื่ออาหาร/คลื่นไส้อาเจียน: mirtazapine, maropitant หรือ ondansetron",
  "รักษาการติดเชื้อทางเดินปัสสาวะเฉพาะเมื่อมีอาการทางคลินิก (ไม่ใช่ subclinical bacteriuria)",
  "ปรับสภาพแวดล้อมและการดูแลทางสังคมให้เหมาะสม",
  "พิจารณาโรคร่วม: ข้อเสื่อม, โรคช่องปาก, ไทรอยด์เป็นพิษ ฯลฯ",
  "รักษาภาวะซีด: darbepoetin หรือ molidustat",
  "รักษาความดันโลหิตสูง: amlodipine หรือ telmisartan",
  "รักษาโปรตีนรั่วในปัสสาวะ: ARB หรือ ACE inhibitor เมื่อ UPC > 0.4 (พิจารณาตั้งแต่ > 0.2)",
  "จัดการภาวะฟอสฟอรัสสูง: อาหารไต ± phosphate binder",
  "จัดการภาวะแคลเซียมสูง: ทบทวนสัดส่วน Ca:P ในอาหาร, chia seeds"
];
