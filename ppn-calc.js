/* Numeric constants transcribed from Peripheral Parenteral Nutrition Form.docx.
   Keep its 33/33/33 split as 99%; do not silently normalize or fill range gaps. */
function calculatePPN(weight, species, method, selection, dextrose) {
  if (!Number.isFinite(weight) || weight <= 0) return { error: 'กรุณากรอกน้ำหนักมากกว่า 0 กก.' };
  if (method === 'linear' && (weight < 2 || weight > 30)) return { error: 'สูตร 30 × น้ำหนัก + 70 ใช้เฉพาะน้ำหนัก 2–30 กก. ตามเอกสาร กรุณาเปลี่ยนสูตร RER' };
  const ratios = { small: [0.2, 0.2, 0.6], medium: [0.25, 0.25, 0.5], large: [0.33, 0.33, 0.33], giant: [0.5, 0.25, 0.25] };
  const automatic = weight >= 3 && weight <= 5 ? 'small' : weight >= 6 && weight <= 10 ? 'medium' : species === 'dog' && weight >= 11 && weight <= 30 ? 'large' : species === 'dog' && weight > 30 ? 'giant' : null;
  const key = selection === 'auto' ? automatic : selection;
  if (!ratios[key]) return { error: 'แบบฟอร์มไม่ได้ระบุสัดส่วนสำหรับชนิดสัตว์/น้ำหนักนี้ (รวมช่วง 5–6 และ 10–11 กก.) ให้สัตวแพทย์เลือกสูตรที่เหมาะสมเอง ไม่อนุมานช่วงโดยอัตโนมัติ' };
  if (![0.17, 1.7].includes(dextrose)) return { error: 'กรุณาเลือกความเข้มข้น Dextrose ที่ระบุ' };
  const rer = method === 'linear' ? 30 * weight + 70 : 70 * Math.pow(weight, 0.75);
  const per = rer * 0.7;
  const energy = ratios[key].map(r => r * per);
  const volumes = energy.map((e, i) => e / [dextrose, 0.4, 2][i]);
  const total = volumes.reduce((a,b) => a+b,0);
  return { rer, per, energy, volumes, total, rate: total / 24, rateKg: total / 24 / weight, delivered: energy.reduce((a,b)=>a+b,0), key, outside: key !== automatic, small: weight < 3 };
}
// Label-based estimate for a single admixture; blank entries are not treated as zero.
function calculatePPNOsmolarity(volumes, concentrations, extraVolume = 0, extraOsm = null) {
  const number = v => v === null || v === undefined || String(v).trim() === '' ? NaN : Number(v);
  if (!Array.isArray(volumes) || volumes.length !== 3 || !Array.isArray(concentrations) || concentrations.length !== 3) return { error: 'ข้อมูลส่วนผสมไม่ครบ' };
  const vs = volumes.map(number), cs = concentrations.map(number);
  const ev = number(extraVolume), ec = number(extraOsm);
  if (vs.some(v => !Number.isFinite(v) || v <= 0) || cs.some(c => !Number.isFinite(c) || c <= 0)) return { error: 'กรอก osmolarity จากฉลากของสารอาหารทั้ง 3 ชนิดให้ครบ และมากกว่า 0 mOsm/L เพื่อคำนวณ' };
  if (!Number.isFinite(ev) || ev < 0 || (ev > 0 && (!Number.isFinite(ec) || ec < 0))) return { error: 'กรอกปริมาตรตัวเจือจางตั้งแต่ 0 mL และค่า osmolarity ตั้งแต่ 0 mOsm/L เมื่อมีการเติม' };
  const osmoles = vs.map((v,i) => v * cs[i] / 1000);
  const extraOsmoles = ev > 0 ? ev * ec / 1000 : 0;
  const totalOsmoles = osmoles.reduce((a,b)=>a+b,0) + extraOsmoles;
  const totalVolume = vs.reduce((a,b)=>a+b,0) + ev;
  const osmolarity = totalOsmoles / (totalVolume / 1000);
  if (![totalOsmoles,totalVolume,osmolarity].every(Number.isFinite)) return { error: 'ค่าที่กรอกสูงเกินขอบเขตการคำนวณ กรุณาตรวจข้อมูล' };
  return { osmoles, extraOsmoles, totalOsmoles, totalVolume, osmolarity, rate: totalVolume / 24, exceeds: osmolarity > 600 };
}
if (typeof module !== 'undefined') { module.exports = calculatePPN; module.exports.calculateOsmolarity = calculatePPNOsmolarity; }
if (typeof document !== 'undefined') (function () {
  'use strict';
  const get = id => document.getElementById(id);
  const result = get('ppn-result');
  if (!result) return;
  const f = n => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  function refresh() {
    const weight = Number(get('weight-kg').value);
    const species = document.querySelector('.species-btn.active[data-species]')?.dataset.species || 'dog';
    const dextrose = get('ppn-dextrose').value === 'saline5' ? 0.17 : Number(get('ppn-dextrose').value);
    const r = calculatePPN(weight, species, get('ppn-rer').value, get('ppn-ratio').value, dextrose);
    get('ppn-osm-result').innerHTML = '';
    get('ppn-extra-osm').disabled = !(Number(get('ppn-extra-volume').value) > 0);
    if (r.error) { result.innerHTML = '<p class="hint">' + r.error + '</p>'; return; }
    const names = [get('ppn-dextrose').selectedOptions[0].text, 'Amino acid 10%', 'Lipid 20%'];
    result.innerHTML = `<div class="result-box"><p>RER <strong>${f(r.rer)} kcal/วัน</strong> → เป้าหมาย PER 70% = <strong>${f(r.per)} kcal/วัน</strong></p>
      ${r.outside ? '<p class="warning-text">เลือกสูตรเองนอกช่วงชนิดสัตว์/น้ำหนักที่เอกสารระบุ ต้องประเมินความเหมาะสมก่อนใช้</p>' : ''}
      ${r.small ? '<p class="warning-text">น้ำหนักน้อยกว่า 3 กก.: เอกสารเตือนว่าปริมาตรอาจเกินความต้องการสารน้ำต่อวัน</p>' : ''}
      ${r.key === 'large' ? '<p class="warning-text">สูตร 33/33/33% รวม 99% ตามเอกสาร จึงได้พลังงานน้อยกว่าเป้าหมาย PER 1% โดยไม่ได้ปรับสัดส่วนเอง</p>' : ''}
      <div class="result-grid">${names.map((name,i)=>`<div class="result-item"><strong>${name}</strong><p>${f(r.energy[i])} kcal/วัน</p><strong>${f(r.volumes[i])} mL/วัน</strong></div>`).join('')}</div>
      <p>พลังงานที่คำนวณได้ ${f(r.delivered)} kcal/วัน (${f(r.delivered/r.rer*100)}% RER)</p>
      <p>ปริมาตรสารอาหารรวมก่อนเติมตัวเจือจาง <strong>${f(r.total)} mL/24 ชั่วโมง</strong></p>
      <p>อัตราก่อนเติมตัวเจือจาง ÷ 24 = <strong>${f(r.rate)} mL/h</strong> (${f(r.rateKg)} mL/kg/h)</p>
      <p class="warning-text">เป็นแผนคำนวณเต็ม 24 ชั่วโมง ไม่ใช่อัตราเริ่มต้นอัตโนมัติ ต้องตรวจ osmolarity ความเข้ากันได้ แผนสารน้ำ และการเริ่มให้แบบค่อยเป็นค่อยไปก่อนสั่งใช้</p></div>`;
    const osm = calculatePPNOsmolarity(r.volumes, ['ppn-osm-dextrose','ppn-osm-amino','ppn-osm-lipid'].map(id=>get(id).value), get('ppn-extra-volume').value, get('ppn-extra-osm').value);
    get('ppn-osm-result').innerHTML = osm.error ? `<p class="hint">${osm.error}</p>` : `<div class="result-box">
      <p>${names.map((name,i)=>`${name}: ${f(osm.osmoles[i])} mOsm`).join('<br>')}${Number(get('ppn-extra-volume').value)>0 ? `<br>ตัวเจือจาง: ${f(osm.extraOsmoles)} mOsm` : ''}</p>
      <p>ปริมาณอนุภาครวม <strong>${f(osm.totalOsmoles)} mOsm</strong> ÷ ปริมาตรรวม ${f(osm.totalVolume)} mL × 1,000</p>
      <p>Osmolarity โดยประมาณ <strong>${f(osm.osmolarity)} mOsm/L</strong></p>
      <p class="warning-text">${osm.exceeds ? 'เกิน 600 mOsm/L ตามเกณฑ์แบบฟอร์ม — ต้องทบทวนสูตร/การเจือจางและเส้นทางให้ก่อนใช้ ไม่ควรนำสูตรนี้ไปให้ทางหลอดเลือดส่วนปลายตามแบบฟอร์ม' : 'ไม่เกิน 600 mOsm/L ตามเกณฑ์แบบฟอร์ม แต่ยังต้องตรวจความเข้ากันได้ของส่วนผสมและความเหมาะสมในผู้ป่วย'}</p>
      <p>ปริมาตรรวมหลังเติมตัวเจือจาง <strong>${f(osm.totalVolume)} mL</strong> · อัตราหาร 24 ชั่วโมง <strong>${f(osm.rate)} mL/h</strong></p>
      <p class="hint">ผลครอบคลุมเฉพาะส่วนผสมที่กรอก ไม่รวมสารเติมอื่น และไม่ใช่ผลตรวจวัด osmolarity จริง หากตัวเจือจางมีพลังงาน ต้องนำพลังงานส่วนนั้นมารวมในแผนอาหารด้วย</p></div>`;
  }
  ['ppn-rer','ppn-ratio'].forEach(id=>get(id).addEventListener('change',refresh));
  get('ppn-dextrose').addEventListener('change', () => { get('ppn-osm-dextrose').value = ''; refresh(); });
  ['ppn-osm-dextrose','ppn-osm-amino','ppn-osm-lipid','ppn-extra-volume','ppn-extra-osm'].forEach(id=>get(id).addEventListener('input',refresh));
  get('weight-kg').addEventListener('input',refresh);
  document.addEventListener('species-change',refresh);
  refresh();
})();