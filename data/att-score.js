// ข้อมูล ATT Score (Animal Trauma Triage Score) สำหรับสุนัข/แมว
// แหล่งข้อมูล: "แบบฟอร์มการประเมิน ATT Score (Animal Trauma Triage Score)" — เอกสารที่ผู้ใช้แนบมาโดยตรง
// (ATT and mGCS - Google ชีต.pdf) ใช้ประเมินความรุนแรงของสัตว์ป่วยที่ได้รับอุบัติเหตุ (Trauma)

const ATT_CATEGORIES = [
  {
    key: "perfusion", label: "1. ระบบไหลเวียน (Perfusion)",
    options: [
      { score: 0, label: "เยื่อเมือกชมพู, CRT < 2 วิ, ชีพจรปกติ" },
      { score: 1, label: "เยื่อเมือกชมพูซีด, CRT 2-3 วิ, ชีพจรแรง/เร็ว" },
      { score: 2, label: "เยื่อเมือกซีด, CRT > 3 วิ, ชีพจรเบา/เร็ว" },
      { score: 3, label: "เยื่อเมือกขาว/เทา, CRT ตรวจไม่ได้, ชีพจรคลำไม่ได้" }
    ]
  },
  {
    key: "cardiac", label: "2. ระบบหัวใจ (Cardiac)",
    options: [
      { score: 0, label: "อัตราเต้นหัวใจ (HR) ปกติ, จังหวะปกติ" },
      { score: 1, label: "HR เร็วหรือช้ากว่าปกติเล็กน้อย" },
      { score: 2, label: "HR เร็ว/ช้ามาก หรือมีหัวใจเต้นผิดจังหวะ (Arrhythmia)" },
      { score: 3, label: "HR วิกฤต หรือเกิดภาวะหัวใจหยุดเต้น" }
    ]
  },
  {
    key: "respiratory", label: "3. ระบบหายใจ (Respiratory)",
    options: [
      { score: 0, label: "อัตราและลักษณะการหายใจปกติ" },
      { score: 1, label: "หายใจเร็ว (Tachypnea) หรือรื้อดึงตัวเล็กน้อย" },
      { score: 2, label: "หายใจลำบาก (Dyspnea) หรือหายใจอ้าปาก (ในแมว)" },
      { score: 3, label: "หายใจลำบากขั้นรุนแรง, ลิ้นม่วง (Cyanosis) หรือหยุดหายใจ" }
    ]
  },
  {
    key: "skeletal", label: "4. ระบบโครงร่าง (Skeletal)",
    options: [
      { score: 0, label: "ไม่มีกระดูกหัก" },
      { score: 1, label: "มีกระดูกหัก 1 แห่ง (Simple fracture)" },
      { score: 2, label: "มีกระดูกหักหลายแห่ง หรือแผลเปิดเห็นกระดูก" },
      { score: 3, label: "กระดูกเชิงกรานหัก หรือกระดูกสันหลังหัก" }
    ]
  },
  {
    key: "neurological", label: "5. ระบบประสาท (Neurological)",
    options: [
      { score: 0, label: "ตื่นตัวดี (Alert/Normal)" },
      { score: 1, label: "ซึม (Depressed) แต่ยังตอบสนองต่อสิ่งเร้า" },
      { score: 2, label: "ตอบสนองเฉพาะต่อความเจ็บปวด (Stuporous)" },
      { score: 3, label: "หมดสติ/ไม่ตอบสนองต่อความเจ็บปวด (Comatose)" }
    ]
  },
  {
    key: "woundTissue", label: "6. บาดแผล/เนื้อเยื่อ (Wound/Tissue)",
    options: [
      { score: 0, label: "ไม่มีบาดแผล หรือแผลถลอกเล็กน้อย" },
      { score: 1, label: "แผลฉีกขาดตื้นๆ (Laceration) หรือรอยช้ำ" },
      { score: 2, label: "แผลฉีกขาดลึก หรือแผลวงกว้าง" },
      { score: 3, label: "แผลทะลุช่องอก/ช่องท้อง หรือแผลถลกหนังขนาดใหญ่ (Degloving)" }
    ]
  }
];

const ATT_MAX_SCORE = 18;

const ATT_PROGNOSIS_BANDS = [
  { low: 0, high: 3, label: "ความรุนแรงต่ำ โอกาสรอดชีวิตสูง" },
  { low: 4, high: 8, label: "ความรุนแรงปานกลาง ต้องเฝ้าระวังใกล้ชิด" },
  { low: 9, high: 18, label: "ความรุนแรงสูงมาก มีโอกาสเสียชีวิตสูง ต้องได้รับการกู้ชีพและดูแลแบบวิกฤตทันที" }
];
