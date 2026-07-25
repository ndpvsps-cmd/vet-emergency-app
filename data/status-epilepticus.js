// ข้อมูลขั้นตอนการจัดการภาวะ Status Epilepticus (SE) ในสุนัขและแมว
// แหล่งข้อมูล: ACVIM Consensus Statement on the management of status epilepticus and cluster
// seizures in dogs and cats. Charalambous M, et al. J Vet Intern Med. 2024;38:19-40. (ผู้ใช้แนบไฟล์มาโดยตรง)
//
// สำคัญ: เอกสารนี้ให้ "ลำดับขั้นตอน / เส้นทางการให้ยา (route) / ระดับคำแนะนำ ACVIM (grade A-E)" ไว้ชัดเจน
// แต่ "ไม่ได้ระบุตัวเลขขนาดยา (mg/kg)" ไว้ในเนื้อหาหลักที่แนบมา — ตัวเลขเหล่านั้นถูกอ้างอิงไปยัง
// "Supplementary file 2-6" ซึ่งเป็นเอกสารแยกต่างหากที่ไม่ได้แนบมาด้วย
// ขนาดยาที่แสดงในหน้านี้ (เมื่อมี) จึงดึงจากฐานข้อมูลยา Plumb's 10th ที่มีอยู่แล้วในแอปนี้
// (data/drugs.js — Diazepam, Midazolam, Ketamine, Propofol) ไม่ใช่ตัวเลขจากเอกสาร ACVIM โดยตรง
// ยาที่เหลือ (levetiracetam, phenobarbital, fosphenytoin, dexmedetomidine, barbiturates ฯลฯ)
// ยังไม่มีขนาดยาที่ยืนยันได้ในแอปนี้ จึงแสดงเฉพาะลำดับ/เส้นทาง/ระดับคำแนะนำ ไม่มีตัวเลขคำนวณให้

const SE_GRADE_LEGEND = [
  { grade: "A", label: "คำแนะนำสูง — มีแนวโน้มได้ผลและปลอดภัย" },
  { grade: "B", label: "คำแนะนำปานกลาง — อาจได้ผลและปลอดภัย" },
  { grade: "C", label: "คำแนะนำต่ำ — อาจได้ผลหรือปลอดภัยไม่เพียงพอ" },
  { grade: "D", label: "ไม่สนับสนุนให้ใช้ — ไม่ได้ผลหรือไม่ปลอดภัย" },
  { grade: "E", label: "งดให้คำแนะนำ — หลักฐานยังจำกัดหรือไม่มี" }
];

const SE_STAGE_TABLE = [
  { stage: "1 — Impending", duration: "5-10 นาที", response: "ตอบสนองต่อ first-line ได้ดี" },
  { stage: "2 — Established", duration: "10-30 นาที", response: "first-line เริ่มตอบสนองน้อยลง; second-line ตอบสนองดี" },
  { stage: "3 — Refractory", duration: "มากกว่า 30 นาที", response: "ต้องใช้ first + second-line ร่วมกัน; third-line (ยาสลบ) ตอบสนองดี" },
  { stage: "4 — Super-refractory", duration: "มากกว่า 24 ชั่วโมง", response: "มักตอบสนองน้อยถึงไม่ตอบสนองแม้ใช้ทุกขั้นตอนร่วมกัน" }
];
