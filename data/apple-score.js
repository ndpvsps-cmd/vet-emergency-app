// ข้อมูล APPLE Score (Acute Patient Physiologic and Laboratory Evaluation Score) สำหรับสุนัข
// แหล่งข้อมูล: "The Canine Acute Physiologic and Laboratory Evaluation Score (APPLE Score)"
// © Vet Education Pty Ltd 2023 - Dr. Philip R Judge (ผู้ใช้แนบไฟล์มาโดยตรง)
// อ้างอิงงานวิจัยต้นฉบับ: Hayes G, et al. J Vet Intern Med. 2010 Sep;24(5):1034-47.
//
// แต่ละพารามิเตอร์มีบางช่วงที่ "ไม่ได้พิมพ์ไว้ในตารางต้นฉบับ" เพราะเป็นช่วงค่าปกติที่เอกสารระบุว่า
// "Values in the normal range attract a score of '0' points" — ช่วงเหล่านี้ (label มีคำว่า "ปกติ")
// เป็นช่วงที่คำนวณต่อจากช่วงอื่นๆ ที่พิมพ์ไว้ ไม่ใช่ตัวเลขที่พิมพ์ตรงๆ ในตาราง แต่เป็นไปตามกฎที่เอกสารระบุไว้เอง
//
// หมายเหตุ: คะแนนในแต่ละช่วงเป็นไปตามที่พิมพ์ในเอกสารต้นฉบับทุกประการ แม้บางแถว (เช่น Bilirubin, Age,
// Body cavity fluid score) คะแนนจะไม่เรียงตามลำดับความรุนแรงอย่างสม่ำเสมอ (มาจาก logistic regression
// coefficient ของงานวิจัยต้นฉบับ) ไม่ได้แก้ไขให้ "ดูสมเหตุสมผล" เอง เพื่อความถูกต้องตรงตามเอกสาร
// ตรวจทานความถูกต้องแล้วโดยรวมคะแนนสูงสุดของแต่ละช่วง: full = 80, fast = 50 ตรงกับที่เอกสารระบุ
//
// หน่วย Creatinine, Albumin, Bilirubin ในเอกสารต้นฉบับเป็นหน่วย SI (μmol/L, g/L) ปรับเป็นหน่วยที่ใช้จริง
// ในโรงพยาบาลสัตว์ (mg%, g%) ตามที่ผู้ใช้ระบุ โดยแปลงหน่วยด้วยตัวคูณมาตรฐาน:
// Creatinine mg/dL = μmol/L ÷ 88.4, Albumin g/dL = g/L ÷ 10, Bilirubin mg/dL = μmol/L ÷ 17.1
// (ช่วงตัวเลขจึงเป็นค่าที่แปลงหน่วยแล้ว ไม่ใช่ตัวเลขที่พิมพ์ตรงในเอกสารต้นฉบับ แต่คะแนนในแต่ละช่วงยังคงเดิมทุกประการ)

const APPLE_FULL_PARAMS = [
  {
    key: "creatinine", label: "Creatinine (mg%)",
    options: [
      { label: "< 0.6 (ปกติ)", points: 0 },
      { label: "0.6 - 1.4", points: 1 },
      { label: "1.4 - 2.3", points: 8 },
      { label: "> 2.3", points: 9 }
    ]
  },
  {
    key: "wbc", label: "WBC (×10⁹/L)",
    options: [
      { label: "< 5.1", points: 9 },
      { label: "5.1 - 8.6 (ปกติ)", points: 0 },
      { label: "8.6 - 18", points: 2 },
      { label: "> 18", points: 3 }
    ]
  },
  {
    key: "albumin", label: "Albumin (g%)",
    options: [
      { label: "< 2.6", points: 6 },
      { label: "2.6 - 3.0", points: 7 },
      { label: "3.1 - 3.2", points: 9 },
      { label: "3.2 - 3.5 (ปกติ)", points: 0 },
      { label: "> 3.5", points: 2 }
    ]
  },
  {
    key: "lactate", label: "Lactate (mmol/L)",
    options: [
      { label: "< 2.0 (ปกติ)", points: 0 },
      { label: "2.0 - 7.8", points: 2 },
      { label: "7.9 - 10.0", points: 3 },
      { label: "> 10.0", points: 6 }
    ]
  },
  {
    key: "spo2", label: "SpO₂ (%)",
    options: [
      { label: "< 90", points: 10 },
      { label: "90 - 94", points: 4 },
      { label: "95 - 97", points: 1 },
      { label: "> 97 (ปกติ)", points: 0 }
    ]
  },
  {
    key: "bilirubin", label: "Bilirubin (mg%)",
    options: [
      { label: "< 0.24 (ปกติ)", points: 0 },
      { label: "0.24 - 0.46", points: 6 },
      { label: "0.47 - 0.93", points: 4 },
      { label: "> 0.93", points: 3 }
    ]
  },
  {
    key: "mentation", label: "Mentation Score",
    options: [
      { label: "0 = ปกติ (Normal)", points: 0 },
      { label: "1 = ยืนได้เอง ตอบสนองต่อสิ่งเร้าแต่ซึม (Able to stand unassisted, responsive but dull)", points: 5 },
      { label: "2 = ยืนได้เมื่อช่วยพยุง ตอบสนองแต่ซึม (Can stand only when assisted, responsive but dull)", points: 7 },
      { label: "3 = ไม่สามารถยืนได้ ยังตอบสนอง (Unable to stand, responsive)", points: 8 },
      { label: "4 = ไม่สามารถยืนได้ ไม่ตอบสนอง (Unable to stand, unresponsive)", points: 13 }
    ]
  },
  {
    key: "fluidScore", label: "Body cavity fluid score",
    options: [
      { label: "0 = ไม่พบสารน้ำอิสระในช่องท้อง/ทรวงอก/เยื่อหุ้มหัวใจ", points: 0 },
      { label: "1 = พบสารน้ำอิสระ 1 ตำแหน่ง (ท้อง หรือ ทรวงอก หรือ เยื่อหุ้มหัวใจ)", points: 4 },
      { label: "2 = พบสารน้ำอิสระตั้งแต่ 2 ตำแหน่งขึ้นไป", points: 3 }
    ]
  },
  {
    key: "age", label: "Age (years)",
    options: [
      { label: "< 3 (ปกติ)", points: 0 },
      { label: "3 - 5", points: 6 },
      { label: "6 - 8", points: 8 },
      { label: "> 8", points: 7 }
    ]
  },
  {
    key: "rr", label: "Respiratory Rate (/min)",
    options: [
      { label: "< 25 (ปกติ)", points: 0 },
      { label: "25 - 36", points: 3 },
      { label: "37 - 48", points: 5 },
      { label: "49 - 60", points: 6 },
      { label: "> 60", points: 5 }
    ]
  }
];
const APPLE_FULL_MAX = 80;
// p = exp(R) / (1 + exp(R)); R = (0.237 x APPLE_full) - 8.294
const APPLE_FULL_FORMULA = { a: 0.237, b: -8.294 };

const APPLE_FAST_PARAMS = [
  {
    // แปลงหน่วยจาก mmol/L เป็น mg% (mg/dL) ตัวคูณ mg/dL = mmol/L x 18.0182 ตามที่ผู้ใช้ระบุ
    key: "glucose", label: "Glucose (mg%)",
    options: [
      { label: "< 85", points: 7 },
      { label: "85 - 103", points: 8 },
      { label: "105 - 164", points: 9 },
      { label: "166 - 272", points: 10 },
      { label: "> 272", points: 0 }
    ]
  },
  {
    key: "platelet", label: "Platelet Count (×10⁹/L)",
    options: [
      { label: "< 151", points: 5 },
      { label: "151 - 200", points: 6 },
      { label: "201 - 260", points: 3 },
      { label: "261 - 420", points: 0 },
      { label: "> 420", points: 1 }
    ]
  },
  {
    key: "albumin", label: "Albumin (g%)",
    options: [
      { label: "< 2.6", points: 8 },
      { label: "2.6 - 3.0", points: 7 },
      { label: "3.1 - 3.2", points: 6 },
      { label: "3.3 - 3.5", points: 0 },
      { label: "> 3.5", points: 3 }
    ]
  },
  {
    key: "lactate", label: "Lactate (mmol/L)",
    options: [
      { label: "< 2", points: 0 },
      { label: "2.0 - 8.0", points: 4 },
      { label: "8.1 - 10.0", points: 8 },
      { label: "> 10.0", points: 12 }
    ]
  },
  {
    key: "mentation", label: "Mentation Score",
    options: [
      { label: "0 = ปกติ (Normal)", points: 0 },
      { label: "1 = ยืนได้เอง ตอบสนองต่อสิ่งเร้าแต่ซึม (Able to stand unassisted, responsive but dull)", points: 4 },
      { label: "2 = ยืนได้เมื่อช่วยพยุง ตอบสนองแต่ซึม (Can stand only when assisted, responsive but dull)", points: 6 },
      { label: "3 = ไม่สามารถยืนได้ ยังตอบสนอง (Unable to stand, responsive)", points: 7 },
      { label: "4 = ไม่สามารถยืนได้ ไม่ตอบสนอง (Unable to stand, unresponsive)", points: 14 }
    ]
  }
];
const APPLE_FAST_MAX = 50;
// p = exp(R) / (1 + exp(R)); R = (0.249 x APPLE_fast) - 7.020
const APPLE_FAST_FORMULA = { a: 0.249, b: -7.020 };
