// ข้อมูล Modified Glasgow Coma Scale (MGCS) สำหรับสุนัข/แมว
// แหล่งข้อมูล: "Table 1. Modified Glasgow Coma Scale" — เอกสารที่ผู้ใช้แนบมาโดยตรง
// © 2025 Veterinary Committee on Trauma, American College of Veterinary Emergency and Critical Care,
// and Colorado State University. อ้างอิงงานวิจัยต้นฉบับ: Platt SR, et al. J Vet Intern Med. 2001.
// (คำอธิบายแต่ละระดับคะแนนใช้ถ้อยคำตามเอกสาร PDF ที่แนบมาทุกประการ)
//
// ตารางช่วงคะแนน-การพยากรณ์โรค (prognosis bands) ไม่ได้อยู่ในเอกสาร PDF ที่แนบมาโดยตรง — นำมาจาก
// ภาพอ้างอิง "Small Animal Coma Scale" ที่ผู้ใช้ส่งมาประกอบกัน ซึ่งเป็นช่วงคะแนนที่เผยแพร่ทั่วไปในตำรา
// สัตวแพทย์ฉุกเฉิน (ที่มาเดียวกันคือ Platt et al 2001) ระบุแยกจากตารางคะแนนหลักไว้อย่างชัดเจน

const MGCS_CATEGORIES = [
  {
    key: "motorActivity", label: "Motor Activity",
    options: [
      { score: 6, label: "Normal gait, normal spinal reflexes" },
      { score: 5, label: "Hemiparesis, tetraparesis, or decerebrate activity" },
      { score: 4, label: "Recumbent, intermittent extensor rigidity" },
      { score: 3, label: "Recumbent, constant extensor rigidity" },
      { score: 2, label: "Recumbent, constant extensor rigidity with opisthotonus" },
      { score: 1, label: "Recumbent, hypotonia of muscles, depressed or absent spinal reflexes" }
    ]
  },
  {
    key: "brainstemReflexes", label: "Brain Stem Reflexes",
    options: [
      { score: 6, label: "Normal pupillary light reflexes (PLR) and oculocephalic reflexes (OCR)" },
      { score: 5, label: "Slow PLR and normal to reduced OCR" },
      { score: 4, label: "Bilateral unresponsive miosis with normal to reduced OCR" },
      { score: 3, label: "Pinpoint pupils with reduced to absent OCR" },
      { score: 2, label: "Unilateral, unresponsive mydriasis with reduced to absent OCR" },
      { score: 1, label: "Bilateral, unresponsive mydriasis with reduced to absent OCR" }
    ]
  },
  {
    key: "consciousness", label: "Level of Consciousness",
    options: [
      { score: 6, label: "Occasional periods of alertness and responsive to environment" },
      { score: 5, label: "Depression or delirium, capable of responding but response may be inappropriate" },
      { score: 4, label: "Semicomatose, responsive to visual stimuli" },
      { score: 3, label: "Semicomatose, responsive to auditory stimuli" },
      { score: 2, label: "Semicomatose, responsive only to repeated noxious stimuli" },
      { score: 1, label: "Comatose, unresponsive to repeated noxious stimuli" }
    ]
  }
];

const MGCS_PROGNOSIS_BANDS = [
  { low: 3, high: 7, label: "Grave (พยากรณ์โรคเลวร้าย)" },
  { low: 8, high: 13, label: "Poor to Guarded (พยากรณ์โรคไม่ดีถึงระมัดระวัง)" },
  { low: 14, high: 18, label: "Fair to Good (พยากรณ์โรคพอใช้ถึงดี)" }
];
