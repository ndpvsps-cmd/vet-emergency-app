/* iCatCare, An update on treatment of FIP, July 2025, Table 1 p.5.
   Numbers are mg/kg PER ADMINISTRATION; GS split regimens preserve daily total.
   EIDD-1931 table doses are for relapse, not routine first-line treatment. */
const FIP_TYPES = {
  effusive: 'มีน้ำในช่องอก/ช่องท้อง ไม่มีอาการตาหรือระบบประสาท',
  noneffusive: 'ไม่มีน้ำ ไม่มีอาการตาหรือระบบประสาท',
  ocular: 'มีอาการทางตา (มีหรือไม่มีน้ำ)',
  neuro: 'มีอาการระบบประสาท (รวมกรณีมีอาการตาร่วมด้วย)'
};
const FIP_DRUGS = {
  gs: { name: 'GS-441524', route: 'PO', doses: { effusive:[15,15,24], noneffusive:[15,15,24], ocular:[20,20,24], neuro:[10,10,12] }, note: 'ยาหลักที่เอกสารแนะนำ เริ่มและให้ตลอดคอร์สทางปากได้ ให้ขณะท้องว่างหรือพร้อมอาหาร/ขนมปริมาณเล็กน้อย แล้วเว้นอย่างน้อย 30 นาทีก่อนมื้อใหญ่ (หน้า 2–3, 5–6)' },
  rem: { name: 'Remdesivir', route: 'IV', doses: { effusive:[15,15,24], noneffusive:[15,15,24], ocular:[20,20,24], neuro:[20,20,24] }, note: 'พิจารณาเมื่อให้ยาทางปากไม่ได้ ป่วยหนัก หรือขาดน้ำรุนแรง ให้ IV ช้า 30 นาที–2 ชั่วโมง อาจเจือจางใน saline; SC เจ็บและไม่แนะนำถ้ามีทางเลือก เปลี่ยนเป็น GS ทางปากได้เมื่อเหมาะสม (หน้า 3–5)' },
  mol: { name: 'Molnupiravir (EIDD-2801)', route: 'PO', doses: { effusive:[10,15,12], noneffusive:[15,15,12], ocular:[15,15,12], neuro:[15,20,12] }, note: 'สงวนเป็นยาทางเลือกเมื่อ GS/Remdesivir ไม่ตอบสนองหรือกลับเป็นซ้ำทั้งที่ได้ขนาดเหมาะสม หรือเมื่อเป็นยาที่เข้าถึงได้ตามข้อกำหนดในพื้นที่ ระวัง neutropenia และผลก่อกลายพันธุ์/ความพิการของตัวอ่อน โดยเฉพาะมากกว่า 15 mg/kg/ครั้ง q12h; สวมถุงมือและผู้ตั้งครรภ์หลีกเลี่ยงการสัมผัส (หน้า 3–5)' },
  eidd: { name: 'EIDD-1931', route: 'PO', doses: { effusive:[15,15,12], noneffusive:[15,15,12], ocular:[15,15,12], neuro:[20,20,12] }, note: 'ขนาดใน Table 1 นี้สำหรับ relapse เท่านั้น หลักฐานน้อยกว่า GS ไม่ใช้เป็นสูตรเริ่มต้นอัตโนมัติ ระวัง cytopenia และผลต่อทารกในครรภ์เช่นเดียวกับ molnupiravir ไม่สลับขนาด mg ต่อ mg ระหว่างสองยา (หน้า 3–5 และเชิงอรรถ Table 1)' }
};
if (typeof module !== 'undefined') module.exports = { FIP_TYPES, FIP_DRUGS };