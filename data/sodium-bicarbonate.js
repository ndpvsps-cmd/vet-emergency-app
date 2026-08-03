// ข้อมูล Sodium Bicarbonate (SB) Correction Calculator สำหรับสุนัข/แมว
// แหล่งข้อมูล:
//  [1] Hoover L, Oyama MA, Reineke EL. "Clinical use of sodium bicarbonate in small
//      animals: indications, electrolyte changes and survival outcome."
//      Journal of Small Animal Practice (2026), DOI: 10.1111/jsap.70174
//      (เอกสารที่ผู้ใช้แนบมาโดยตรง) — ใช้เป็นแหล่งข้อมูลสูตรคำนวณ deficit, ขนาดเริ่มต้น,
//      ระยะเวลา/วิธีเจือจาง, เกณฑ์พิจารณาให้ยา, ผลข้างเคียงที่พบบ่อยจากการศึกษา และขนาดยา
//      สำหรับ CPA ตามแนวทาง RECOVER 2024 (Fletcher et al.) ที่บทความนี้อ้างอิงไว้
//  [2] ความเข้มข้นของ Sodium Bicarbonate ที่ใช้จริงในคลินิก — ผู้ใช้ระบุ: 44.6 mEq / 50 mL
//      (เทียบเท่า NaHCO3 7.5% โดยประมาณ) — ต่างจากสูตร 8.4% ที่ใช้ในการศึกษา [1]
//  [3] ยืนยันสูตรคำนวณ bicarbonate deficit (BW x BE x 0.3) ด้วยแหล่งข้อมูลอิสระ:
//      DiBartola SP, "Fluid, Electrolyte, and Acid-Base Disorders in Small Animal
//      Practice" — ตามที่สรุปไว้ใน veterinary-help.com/670-doses-sodium-bicarbonate.htm

const SODIUM_BICARB_STOCK = { totalMeq: 44.6, totalMl: 50 }; // [2]
const SODIUM_BICARB_MEQ_PER_ML = SODIUM_BICARB_STOCK.totalMeq / SODIUM_BICARB_STOCK.totalMl;

// Bicarbonate deficit (mEq) = น้ำหนักตัว (kg) x |Base Excess| x 0.3 — [1], ยืนยันด้วย [3]
const SODIUM_BICARB_DEFICIT_FACTOR = 0.3;

// ให้ขนาดเริ่มต้น 1/4 ถึง 1/3 ของ deficit ที่คำนวณได้ — [1]
const SODIUM_BICARB_STARTING_FRACTION = { low: 0.25, high: 1 / 3 };

// ระยะเวลาให้ที่แนะนำในสัตว์อาการคงที่ (ไม่ใช่ CPA) — [1]
const SODIUM_BICARB_INFUSION_HOURS = { low: 4, high: 6 };

// เกณฑ์ที่อาจพิจารณาให้ SB ตามผลการศึกษานี้ (ยังไม่ใช่ threshold ที่ตายตัว) — [1]
const SODIUM_BICARB_CONSIDER_THRESHOLD = { ph: 7.0, hco3: 10 };

// ขนาดยาสำหรับ CPA ตามแนวทาง RECOVER 2024 (Fletcher et al., อ้างอิงใน [1]):
// พิจารณาเฉพาะกรณีมี hyperkalemia (K+ > 7.5 mmol/L) ร่วมกับ pH < 7.2 ที่วัดได้ก่อน/ระหว่าง CPA
const SODIUM_BICARB_CPA_DOSE_MEQ_PER_KG = 1;
const SODIUM_BICARB_CPA_K_THRESHOLD = 7.5;
const SODIUM_BICARB_CPA_PH_THRESHOLD = 7.2;

const SODIUM_BICARB_SIDE_EFFECTS = [
  { name: "Ionized hypocalcemia", note: "ผลข้างเคียงที่พบบ่อยที่สุด (33% ในการศึกษานี้) — ระวังเป็นพิเศษในสัตว์ที่มีภาวะแคลเซียมไอออนต่ำอยู่ก่อน เพราะอาจทำให้ชัก ความดันต่ำ หัวใจเต้นผิดจังหวะ หรือเสียชีวิตได้" },
  { name: "Hypokalemia", note: "พบได้ ควรติดตามค่าโพแทสเซียมระหว่างและหลังให้ยา" },
  { name: "Hypernatremia", note: "พบได้น้อย (2/46 ตัวในการศึกษานี้)" },
  { name: "Metabolic alkalosis (pH > 7.5)", note: "เสี่ยงมากขึ้นหากให้ปริมาณมากเกินไปหรือให้ซ้ำโดยไม่ประเมินซ้ำ" },
  { name: "Phlebitis / เซลล์ขาดน้ำ / หลอดเลือดบาดเจ็บ", note: "จากการให้สารละลายเข้มข้นสูง (8.4% มี osmolality ~2000 mOsm/L, pH 7.8-8.0) แบบไม่เจือจางหรือเร็วเกินไป" }
];

// ข้อมูลเพิ่มเติมนี้ผู้ใช้ (สัตวแพทย์ผู้ดูแลโปรเจกต์) ให้มาโดยตรงจากความรู้ทางคลินิก
// ไม่ได้มาจาก [1]/[2]/[3] — สอดคล้องกับกลไก paradoxical CNS acidosis ที่ [1] กล่าวถึงไว้เช่นกัน
// ("paradoxical central nervous system acidosis with resulting cerebral oedema... particularly
// with aggressive or prolonged infusions")
const SODIUM_BICARB_RESP_ACIDOSIS_WARNING = {
  title: "ข้อควรระวังเป็นพิเศษ: Respiratory Acidosis",
  intro: "ควรระมัดระวังการให้ Sodium Bicarbonate อย่างมากในภาวะ Respiratory acidosis และโดยทั่วไปไม่ใช่การรักษาหลัก เพราะอาจทำให้อาการแย่ลงได้",
  mechanism: "เมื่อให้ SB จะเกิดปฏิกิริยา H⁺ + HCO₃⁻ → H₂CO₃ → CO₂ + H₂O ซึ่ง CO₂ ที่เกิดขึ้นแพร่เข้าสู่เซลล์และสมองได้เร็วกว่า HCO₃⁻ หากผู้ป่วยระบาย CO₂ ไม่ได้ (hypoventilation) CO₂ จะสะสมจนทำให้ intracellular acidosis และ CSF acidosis รุนแรงขึ้น แม้ pH ในเลือดจะดีขึ้นชั่วคราว",
  contraindications: "ควรหลีกเลี่ยงในผู้ป่วยที่มี upper airway obstruction, laryngeal paralysis, severe pneumonia, pulmonary edema, neuromuscular disease (เช่น myasthenia gravis, tick paralysis) หรือผู้ป่วยที่ hypoventilate/ไม่สามารถเพิ่ม minute ventilation ได้ — ไม่ควรให้ SB เพียงเพื่อแก้ pH ต่ำ ควรเปิดทางเดินหายใจ ให้ออกซิเจน เพิ่มการระบาย CO₂ (เช่น intubation/mechanical ventilation หากมีข้อบ่งชี้) และรักษาสาเหตุของ hypoventilation แทน",
  mixed: "หากมีทั้ง Metabolic และ Respiratory acidosis ร่วมกัน (เช่น septic shock, cardiac arrest, severe aspiration pneumonia, ARDS) ควรแก้ไข ventilation ก่อน แล้วจึงพิจารณา SB หากยังมี metabolic acidosis รุนแรง (เช่น pH < 7.1)"
};

const SODIUM_BICARB_CAUTIONS = [
  "ไม่แนะนำเป็นการรักษาหลักในภาวะ Lactic acidosis — ควรมุ่งรักษาสาเหตุ (เช่น แก้ไขการไหลเวียนเลือด/perfusion) เป็นหลัก",
  "ใน DKA (Diabetic Ketoacidosis) มักไม่แนะนำ เนื่องจากยังไม่มีหลักฐานชัดเจนว่าลดอัตราตายหรือทำให้ภาวะกรดหายเร็วขึ้น",
  "ควรเจือจางก่อนให้เสมอในกรณีที่ไม่ใช่ CPA (เช่น เจือจาง 1:6 กับน้ำกลั่น/สารน้ำที่เหมาะสม ให้ความเข้มข้นโซเดียมใกล้เคียงผู้ป่วย) แล้วให้ทางหลอดเลือดดำนาน 4-6 ชั่วโมง",
  "ควรรักษาสาเหตุที่แท้จริงของภาวะกรดควบคู่กันเสมอ ไม่ใช้ SB ทดแทนการรักษาโรคต้นเหตุ",
  "ประเมินซ้ำ (pH, HCO3, electrolytes) หลังให้ยา เนื่องจากขนาดยาที่ให้ไม่สัมพันธ์กับการเปลี่ยนแปลงของ pH ที่ได้อย่างแน่นอนในการศึกษานี้"
];
