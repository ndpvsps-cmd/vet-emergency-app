/* Clinical reference: iCatCare July 2025 Table 1 p.5; monitoring pp.4,6–10. */
function fipRegimen(drug, type, split) {
  const drugs = typeof FIP_DRUGS !== 'undefined' ? FIP_DRUGS : require('./data/feline-fip.js').FIP_DRUGS;
  if (!drugs[drug] || !drugs[drug].doses[type]) return null;
  let [low, high, hours] = drugs[drug].doses[type];
  if (drug === 'gs' && type !== 'neuro' && split) { low /= 2; high /= 2; hours = 12; }
  return { low, high, hours, route: drugs[drug].route };
}
function calculateFIP(weight, species, drug, type, split, dose, strength) {
  if (species !== 'cat') return { error: 'เมนูนี้ใช้สำหรับแมว กรุณาเลือกแมวในแถบผู้ป่วยด้านบน' };
  if (!Number.isFinite(weight) || weight <= 0) return { error: 'กรุณากรอกน้ำหนักแมวมากกว่า 0 กก.' };
  const regimen = fipRegimen(drug,type,split);
  if (!regimen || !Number.isFinite(dose) || dose < regimen.low || dose > regimen.high) return { error: 'กรอกขนาดต่อครั้งภายในช่วงจาก Table 1 ที่แสดง' };
  const mg = weight * dose, daily = mg * 24 / regimen.hours;
  const hasStrength = strength !== '' && strength !== null && strength !== undefined;
  const concentration = Number(strength);
  if (hasStrength && (!Number.isFinite(concentration) || concentration <= 0)) return { error: 'ความแรงยาต้องมากกว่า 0 หรือเว้นว่างเพื่อดูเฉพาะ mg' };
  if (!Number.isFinite(mg) || !Number.isFinite(daily)) return { error: 'ค่าที่กรอกเกินขอบเขตการคำนวณ' };
  const quantity = hasStrength ? mg / concentration : null;
  if (quantity !== null && !Number.isFinite(quantity)) return { error: 'โปรดตรวจความแรงยา' };
  return { ...regimen, dose, mg, daily, quantity };
}
if (typeof module !== 'undefined') module.exports = { fipRegimen, calculateFIP };
if (typeof document !== 'undefined') (function () {
  'use strict';
  const el = id => document.getElementById(id);
  if (!el('fip-result')) return;
  const fmt = n => n.toLocaleString('th-TH', { maximumFractionDigits: 3 });
  function updateControls(reset) {
    const drug=el('fip-drug').value, type=el('fip-type').value;
    const canSplit=drug==='gs' && type!=='neuro';
    el('fip-split-row').hidden=!canSplit;
    const r=fipRegimen(drug,type,canSplit && el('fip-split').value==='12');
    el('fip-reference').textContent = `${FIP_DRUGS[drug].name}: ${fmt(r.low)}${r.low!==r.high?'–'+fmt(r.high):''} mg/kg/ครั้ง ${r.route} ทุก ${r.hours} ชั่วโมง (Table 1 หน้า 5)`;
    el('fip-dose').min=r.low; el('fip-dose').max=r.high;
    el('fip-dose').readOnly=r.low===r.high;
    if (reset) { el('fip-dose').value=r.low===r.high?r.low:''; }
    el('fip-note').textContent=FIP_DRUGS[drug].note;
    el('fip-strength-label').textContent=el('fip-form').value==='liquid'?'ความเข้มข้นตามฉลาก (mg/mL)':'ความแรงตามฉลาก (mg/เม็ด)';
    render();
  }
  function render() {
    const drug=el('fip-drug').value;
    const species=document.querySelector('.species-btn.active[data-species]')?.dataset.species;
    const r=calculateFIP(Number(el('weight-kg').value),species,drug,el('fip-type').value,el('fip-split').value==='12',Number(el('fip-dose').value),el('fip-strength').value);
    if(r.error) { el('fip-result').textContent=r.error; return; }
    const liquid=el('fip-form').value==='liquid';
    el('fip-result').innerHTML=`<div class="result-grid"><div class="result-item">ต่อครั้ง<strong>${fmt(r.mg)} mg</strong></div><div class="result-item">ความถี่<strong>${r.route} ทุก ${r.hours} ชั่วโมง</strong></div><div class="result-item">รวมต่อวัน<strong>${fmt(r.daily)} mg/วัน</strong></div></div>
      <p>${r.quantity===null?'กรอกความแรงยาจริงหากต้องการแปลงเป็นปริมาตร/จำนวนเม็ด':`เทียบความแรง ${fmt(Number(el('fip-strength').value))} ${liquid?'mg/mL':'mg/เม็ด'} = <strong>${fmt(r.quantity)} ${liquid?'mL':'เม็ด'} ต่อครั้ง</strong>${liquid?' (ปริมาตรยาก่อนเจือจาง)':' (จำนวนทางคณิตศาสตร์ ไม่ได้ปัดเม็ด; ตรวจว่ายาแบ่งได้จริงก่อนใช้)'}`}</p>
      ${drug==='rem'?'<p class="warning-text">ให้ IV ช้า 30 นาที–2 ชั่วโมง ไม่ใช่ IV bolus และปริมาตรนี้ไม่ใช่อัตรา infusion</p>':''}
      ${drug==='mol' && r.dose>15?'<p class="warning-text">ขนาดมากกว่า 15 mg/kg/ครั้ง: เอกสารให้ระวังเป็นพิเศษเรื่องความปลอดภัยและ neutropenia</p>':''}
      <p class="hint">คำนวณจากน้ำหนักปัจจุบัน หากน้ำหนักลดเพราะน้ำในช่องตัวหาย ไม่ควรลดขนาด mg เดิมโดยอัตโนมัติ ให้สัตวแพทย์ทบทวนขนาดเดิม (หน้า 6)</p>`;
  }
  ['fip-type','fip-drug','fip-split'].forEach(id=>el(id).addEventListener('change',()=>{
    if(id==='fip-drug') { el('fip-strength').value=''; el('fip-form').value='liquid'; }
    el('fip-form').querySelector('option[value="tablet"]').disabled=el('fip-drug').value==='rem';
    updateControls(true);
  }));
  el('fip-form').addEventListener('change',()=>{el('fip-strength').value='';updateControls(false);});
  ['fip-dose','fip-strength','weight-kg'].forEach(id=>el(id).addEventListener('input',render));
  document.addEventListener('species-change',render);
  updateControls(true);
})();