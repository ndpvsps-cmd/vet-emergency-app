// ฐานข้อมูลอาหารสำหรับคำนวณปริมาณอาหาร (RER/DER feeding calculator)
// แหล่งข้อมูล: Therapeutic_Diet_Energy_Values_V6.xlsx (ผู้ใช้ให้มา)
// energyKcalPerKg = พลังงานต่ออาหาร 1 กิโลกรัม (kcal/kg) ตามที่ระบุในไฟล์
// form: "wet" หรือ "dry" (ประเมินจากค่าพลังงาน/ชื่อผลิตภัณฑ์ในไฟล์ — อาหารเปียก/กระป๋องมักอยู่ที่ ~700-1350 kcal/kg
//   ส่วนอาหารเม็ดแห้งมักอยู่ที่ ~3400-3900 kcal/kg เนื่องจากมีน้ำน้อยกว่ามาก)
// unitSizeG / unitLabel = ขนาดต่อหน่วยบรรจุภัณฑ์ (กรัม) และชื่อหน่วย (กระป๋อง/ซอง) สำหรับแปลงปริมาณ
//   เป็นสัดส่วนกระป๋อง/ซองให้เจ้าหน้าที่เข้าใจง่าย — ใส่เฉพาะรายการที่มีข้อมูลยืนยันแล้วเท่านั้น
//   - SmartHeart, Me-O, Delisci: ตัวเลขที่ผู้ใช้ให้มาโดยตรง (ยืนยันแล้ว)
//   - Royal Canin เปียก 195 g/กระป๋อง, Royal Canin Urinary S/O Pouch 85 g/ซอง, Hill's เปียก 156 g/กระป๋อง:
//     เป็นขนาดบรรจุภัณฑ์มาตรฐานที่พบทั่วไปของแบรนด์นี้ แต่ไม่ได้ยืนยันกับสต๊อกจริงของคลินิก
//     โปรดตรวจสอบกับกระป๋อง/ซองจริงที่มีก่อนใช้สรุปให้เจ้าหน้าที่
//   - Purina Pro Plan, VetPrima, S-Mellow: ยังไม่มีข้อมูลขนาดบรรจุภัณฑ์ที่ยืนยันได้ ปล่อยว่างไว้ก่อน
//   - อาหารเม็ดแห้งและอาหารทำเอง: ไม่มีแนวคิด "ต่อกระป๋อง" จึงไม่ใส่ unitSizeG
const DIETS = [
  { brand: "Royal Canin", line: "Recovery", species: "Dog/Cat", energyKcalPerKg: 1150, focus: "High Energy", form: "wet", unitSizeG: 195, unitLabel: "กระป๋อง" },
  { brand: "Royal Canin", line: "Gastrointestinal", species: "Dog/Cat", energyKcalPerKg: 1100, focus: "Digestive", form: "wet", unitSizeG: 195, unitLabel: "กระป๋อง" },
  { brand: "Royal Canin", line: "Renal", species: "Dog/Cat", energyKcalPerKg: 1200, focus: "Kidney", form: "wet", unitSizeG: 195, unitLabel: "กระป๋อง" },
  { brand: "Royal Canin", line: "Satiety", species: "Dog/Cat", energyKcalPerKg: 700, focus: "Weight Loss", form: "wet", unitSizeG: 195, unitLabel: "กระป๋อง" },
  { brand: "Hill's", line: "a/d", species: "Dog/Cat", energyKcalPerKg: 1250, focus: "Critical Care", form: "wet", unitSizeG: 156, unitLabel: "กระป๋อง" },
  { brand: "Hill's", line: "k/d", species: "Dog/Cat", energyKcalPerKg: 1300, focus: "Kidney", form: "wet", unitSizeG: 156, unitLabel: "กระป๋อง" },
  { brand: "Hill's", line: "w/d", species: "Dog/Cat", energyKcalPerKg: 850, focus: "Weight/Glucose", form: "wet", unitSizeG: 156, unitLabel: "กระป๋อง" },
  { brand: "Purina Pro Plan", line: "CN", species: "Dog/Cat", energyKcalPerKg: 1350, focus: "Critical Care", form: "wet" },
  { brand: "Purina Pro Plan", line: "NF", species: "Dog/Cat", energyKcalPerKg: 1200, focus: "Kidney", form: "wet" },
  { brand: "Royal Canin", line: "Gastrointestinal Low Fat", species: "Dog/Cat", energyKcalPerKg: 950, focus: "Low Fat Digestive", form: "wet", unitSizeG: 195, unitLabel: "กระป๋อง" },
  { brand: "Royal Canin", line: "Diabetic", species: "Dog/Cat", energyKcalPerKg: 800, focus: "Blood Glucose", form: "wet", unitSizeG: 195, unitLabel: "กระป๋อง" },
  { brand: "VetPrima", line: "Gastrointestinal", species: "Dog/Cat", energyKcalPerKg: 1050, focus: "Digestive", form: "wet" },
  { brand: "VetPrima", line: "Renal", species: "Dog/Cat", energyKcalPerKg: 1150, focus: "Kidney", form: "wet" },
  { brand: "Delisci", line: "Recovery", species: "Dog", energyKcalPerKg: 1236, focus: "High Energy", form: "wet", unitSizeG: 400, unitLabel: "กระป๋อง" },
  { brand: "Delisci", line: "Recovery", species: "Cat", energyKcalPerKg: 1237.5, focus: "High Energy", form: "wet", unitSizeG: 80, unitLabel: "ซอง" },
  { brand: "S-Mellow", line: "Recovery", species: "Dog/Cat", energyKcalPerKg: 1100, focus: "High Energy", form: "wet" },
  { brand: "SmartHeart", line: "Dry Food (General)", species: "Dog", energyKcalPerKg: 3500, focus: "Maintenance", form: "dry" },
  { brand: "SmartHeart", line: "Wet Food (Canned)", species: "Dog", energyKcalPerKg: 1000, focus: "Maintenance", form: "wet", unitSizeG: 400, unitLabel: "กระป๋อง" },
  { brand: "Me-O", line: "Dry Food (General)", species: "Cat", energyKcalPerKg: 3600, focus: "Maintenance", form: "dry" },
  { brand: "Me-O", line: "Wet Food (Canned)", species: "Cat", energyKcalPerKg: 950, focus: "Maintenance", form: "wet", unitSizeG: 400, unitLabel: "กระป๋อง" },
  { brand: "Royal Canin", line: "Urinary S/O Dry", species: "Dog/Cat", energyKcalPerKg: 3800, focus: "Urinary/Struvite", form: "dry" },
  { brand: "Royal Canin", line: "Renal Dry", species: "Dog/Cat", energyKcalPerKg: 3900, focus: "Kidney", form: "dry" },
  { brand: "Royal Canin", line: "Gastrointestinal Dry", species: "Dog/Cat", energyKcalPerKg: 3700, focus: "Digestive", form: "dry" },
  { brand: "Royal Canin", line: "Diabetic Dry", species: "Dog/Cat", energyKcalPerKg: 3400, focus: "Blood Glucose", form: "dry" },
  { brand: "Hill's", line: "c/d Multicare Dry", species: "Dog/Cat", energyKcalPerKg: 3850, focus: "Urinary", form: "dry" },
  { brand: "Hill's", line: "i/d Dry", species: "Dog/Cat", energyKcalPerKg: 3600, focus: "Digestive", form: "dry" },
  { brand: "Purina Pro Plan", line: "EN Gastroenteric Dry", species: "Dog/Cat", energyKcalPerKg: 3750, focus: "Digestive", form: "dry" },
  { brand: "Royal Canin", line: "Urinary S/O Pouch", species: "Dog/Cat", energyKcalPerKg: 900, focus: "Urinary/Struvite", form: "wet", unitSizeG: 85, unitLabel: "ซอง" },
  { brand: "Homemade", line: "Boiled Chicken Breast (เนื้อไก่ต้ม)", species: "Dog/Cat", energyKcalPerKg: 1100, focus: "Protein Source", form: "wet" },
  { brand: "Homemade", line: "Boiled Chicken Liver (ตับไก่ต้ม)", species: "Dog/Cat", energyKcalPerKg: 1300, focus: "Protein/Vitamin Source", form: "wet" }
];

// ปัจจัยคูณ RER มาตรฐาน (DER = RER x factor) — ค่ามาตรฐานที่ใช้สอนทั่วไปในวิชาโภชนศาสตร์สัตวแพทย์
// (WSAVA Global Nutrition Committee / ตำราโภชนศาสตร์สัตวแพทย์ทั่วไป) ไม่ได้มาจากเอกสาร AAHA fluid therapy
// ที่แนบมา — ใช้เป็นจุดเริ่มต้น ควรปรับตามการประเมินผู้ป่วยจริงเสมอ
const RER_FACTORS = [
  { key: "critical", label: "ผู้ป่วยวิกฤต/นอนโรงพยาบาล (เริ่มต้นแบบระวัง)", factor: 1.0 },
  { key: "weight_loss", label: "ลดน้ำหนัก", factor: 1.0 },
  { key: "neutered_adult", label: "สัตว์โตเต็มวัย ทำหมันแล้ว (maintenance)", factor: 1.6 },
  { key: "intact_adult", label: "สัตว์โตเต็มวัย ไม่ได้ทำหมัน (maintenance)", factor: 1.8 },
  { key: "senior", label: "สัตว์สูงอายุ กิจกรรมน้อย", factor: 1.4 },
  { key: "weight_gain", label: "เพิ่มน้ำหนัก/ฟื้นฟูสภาพร่างกาย", factor: 1.4 },
  { key: "active", label: "กิจกรรมสูง/สัตว์ทำงาน", factor: 2.0 },
  { key: "growth_young", label: "ลูกสัตว์ช่วงโต (อายุน้อยกว่า 4 เดือน)", factor: 3.0 },
  { key: "growth_older", label: "ลูกสัตว์ช่วงโต (อายุ 4-12 เดือน)", factor: 2.0 }
];

// ตารางค่อยเป็นค่อยไปเพื่อป้องกัน refeeding syndrome (เริ่มที่ 1/3 RER แล้วค่อยเพิ่ม)
// อ้างอิง: 2024 AAHA Fluid Therapy Guidelines for Dogs and Cats, p.145
// "enteral nutrition rates typically start at one-third the resting energy requirement to avoid refeeding syndrome"
const REFEEDING_SCHEDULE = [
  { key: "day1", label: "วันที่ 1 (1/3 RER)", fraction: 1 / 3 },
  { key: "day2", label: "วันที่ 2 (2/3 RER)", fraction: 2 / 3 },
  { key: "day3", label: "วันที่ 3 เป็นต้นไป (เต็มขนาด)", fraction: 1 },
  { key: "full", label: "ไม่ต้องค่อยเป็นค่อยไป (ให้เต็มขนาดทันที)", fraction: 1 }
];

// ความจุกระเพาะอาหารโดยประมาณตอนเริ่มให้อาหารทางสาย (mL/kg)
// ค่านี้ผู้ใช้ (สัตวแพทย์ผู้ดูแลระบบ) แก้ไขจากค่าเดิม 5-10 mL/kg ที่อ้างอิงจาก
// 2024 AAHA Fluid Therapy Guidelines for Dogs and Cats, p.145 เป็น 10-20 mL/kg ตามที่ยืนยันมาโดยตรง
const GASTRIC_CAPACITY_ML_PER_KG = { low: 10, high: 20 };
