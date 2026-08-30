// ข้อมูล Acute Allergy and Anaphylaxis (สุนัข/แมว)
// แหล่งข้อมูล: Burkitt-Creedon JM, Mandell DC, Thawley VJ, et al. "RECOVER Guidelines: First Aid.
// Evidence, Treatment Recommendations, Knowledge Gap Analysis, and Clinical Guidelines for Acute
// Allergy and Anaphylaxis in Dogs and Cats." Journal of Veterinary Emergency and Critical Care
// 2026;36:S63-S89. DOI: 10.1111/vec.70137 — เอกสารที่ผู้ใช้แนบมาโดยตรง
// (Table 1 "Acute hypersensitivity reactions in dogs and cats: A treatment-based grading system",
// Table 2 "RECOVER 2026 First Aid treatment recommendations", Section 4.1 RECOVER First Aid Acute
// Hypersensitivity Reaction Algorithm, และเนื้อหาข้อความประกอบ)

// รายการอาการระบบทางเดินหายใจ — Table 1, Grade 2/3
const ANAPHYLAXIS_RESP_SIGNS = [
  { key: "increasedEffort", label: "หายใจเหนื่อยมากขึ้น (Increased respiratory effort)" },
  { key: "stridor", label: "Stridor" },
  { key: "wheezing", label: "Wheezing" },
  { key: "severeDistress", label: "หายใจลำบากรุนแรง (Severe respiratory distress)" }
];

// รายการอาการระบบหัวใจและหลอดเลือด — Table 1, Grade 2/3
// collapseHypotension แยกต่างหากเพราะเป็นตัวกำหนด Severe anaphylaxis (Grade 3) โดยไม่ขึ้นกับระบบอื่น
const ANAPHYLAXIS_CV_SIGNS = [
  { key: "bradycardia", label: "หัวใจเต้นช้า (Bradycardia)" },
  { key: "tachycardia", label: "หัวใจเต้นเร็ว (Tachycardia)" },
  { key: "pallor", label: "เยื่อเมือกซีด (Pallor)" }
];

// อาการสนับสนุนการวินิจฉัย ใช้เมื่อคะแนน 1-3 แต่ไม่มีอาการทางผิวหนัง — Section 4.1
const ANAPHYLAXIS_SUPPORTING_FINDINGS = [
  { key: "priorReaction", label: "มีประวัติเคยเกิดปฏิกิริยาภูมิแพ้เฉียบพลันมาก่อน" },
  { key: "knownExposure", label: "ทราบ/สงสัยว่าเพิ่งสัมผัสสารก่อภูมิแพ้ที่มีโอกาสสูง (เช่น แมลงต่อย วัคซีน ยา)" },
  { key: "stinger", label: "ตรวจพบเหล็กใน (stinger) จากแมลงต่อย" },
  { key: "pocusFindings", label: "POCUS พบ gallbladder wall edema หรือ peritoneal effusion ที่อธิบายไม่ได้" },
  { key: "hemoabdomen", label: "พบ Hemoabdomen ที่อธิบายไม่ได้" }
];

// ขนาดยาที่พบในเอกสาร — ระบุแหล่งที่มาของแต่ละค่าให้ชัดเจน เพราะบางค่าเป็นข้อสรุปของ RECOVER
// โดยตรง แต่บางค่าเป็นเพียงตัวเลขที่รายงานไว้ในงานวิจัยที่เอกสารนี้อ้างอิงถึง (ไม่ใช่ข้อแนะนำ
// อย่างเป็นทางการของ RECOVER)
const ANAPHYLAXIS_DOSING = {
  h1rAntagonist: {
    label: "H1R Antagonist (เช่น Diphenhydramine, Cetirizine)",
    note: "RECOVER ไม่ได้ระบุขนาดยาที่แน่นอน มีเพียงข้อแนะนำให้ \"ให้ H1R antagonist\" เท่านั้น",
    reportedDose: "ขนาดที่มีรายงานในงานวิจัยที่เอกสารนี้อ้างอิง (Krager & Pigott, แมว 73 ตัว): Diphenhydramine IM ขนาดกลาง 2.0 mg/kg (ช่วง 0.2-2.8 mg/kg)"
  },
  glucocorticoidUncomplicated: {
    label: "Glucocorticoid เสริม (เฉพาะกรณี Uncomplicated allergic reaction ที่ไม่ตอบสนองต่อ H1R antagonist)",
    dose: "Prednisolone equivalent 0.5 mg/kg/day นาน 5 วัน ร่วมกับ H1R antagonist ต่อเนื่อง",
    strength: "Weak recommendation, Expert opinion"
  },
  epinephrineIM: {
    label: "Epinephrine IM",
    dose: "0.01 mg/kg IM",
    note: "ตัวเลขนี้อ้างอิงตามแนวทางในคน ที่ RECOVER ใช้เทียบเคียง (extrapolated) — เช่น autoinjector เด็ก 0.15mg เหมาะกับสัตว์ ~15kg (=0.01mg/kg) — ไม่ใช่ dose-finding study ในสุนัข/แมวโดยตรง",
    caution: "การให้ epinephrine IM/bolus ครั้งเดียว (0.01 mg/kg) พบว่าไม่ได้ผลในสุนัขที่มี severe anaphylaxis (มี hypotension) จากการศึกษาทดลอง — กรณีนี้ควรให้เป็น CRI แทน"
  },
  epinephrineCRI: {
    label: "Epinephrine CRI (สำหรับ Severe anaphylaxis)",
    target: "ปรับอัตราเพื่อให้ได้ MAP (Mean Arterial Pressure) 70 mmHg — เป็นเป้าหมายที่ RECOVER แนะนำโดยตรง",
    reportedStartingRate: "อัตราเริ่มต้นที่มีรายงานในงานวิจัยที่เอกสารนี้อ้างอิง (Smith et al.): 0.05-0.1 mcg/kg/min — ไม่ใช่ขนาดเริ่มต้นที่ RECOVER แนะนำอย่างเป็นทางการ เป็นเพียงตัวเลขจากการปฏิบัติของสถาบันหนึ่งเท่านั้น",
    caution: "หลีกเลี่ยงการให้ epinephrine แบบ IV bolus ในภาวะ anaphylaxis เนื่องจากสัมพันธ์กับผลข้างเคียงทางหัวใจและหลอดเลือดและการให้ยาเกินขนาดมากกว่าการให้ IM หรือ CRI อย่างมีนัยสำคัญ"
  },
  glucocorticoidAnaphylaxis: {
    label: "Glucocorticoid ในภาวะ Anaphylaxis",
    recommendation: "RECOVER แนะนำ (Strong recommendation) ให้งดใช้ glucocorticoid แบบ systemic เป็นประจำในการรักษา anaphylaxis เนื่องจากไม่พบประโยชน์ชัดเจน และบางการศึกษาพบว่าสัมพันธ์กับอาการรุนแรงขึ้น"
  }
};
