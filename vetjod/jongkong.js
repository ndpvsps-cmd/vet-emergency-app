// Read-only JONGKONG integration. Credentials are handled by Firebase Auth only.
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
export function patientKey(p) {
  return text(p.encounterId) || JSON.stringify([p.hn, p.admitdate, p.name, p.cageId]);
}
export function mapWardPatient(p) {
  let plan = {};
  try { plan = JSON.parse(p.wardPlanJson || '{}') || {}; } catch (_) {}
  const rows = Array.isArray(plan.rows) ? plan.rows : null;
  const rowText = r => [text(r.label), text(r.detail), Array.isArray(r.times) && r.times.length ? 'เวลา ' + r.times.map(text).join(', ') : ''].filter(Boolean).join(' — ');
  const group = types => rows.filter(r => r && types.includes(r.type)).map(rowText).filter(Boolean).join('\n');
  const oral = rows ? group(['oral_cage','oral_ward']) : [text(p.medoral), text(p.medOralCage)].filter(Boolean).join('\n');
  const injection = rows ? group(['iv']) : [['เช้า',p.medMorn],['เย็น',p.medEve],['21:00',p.v21],['24:00',p.v24],['06:00',p.v06]].filter(([,v])=>text(v)).map(([label,v])=>label+': '+text(v)).join('\n');
  const rawWeight = text(p.bw).replace(/\s*(kg|กก\.?)$/i,'').trim();
  const weight = /^\d+(?:\.\d+)?$/.test(rawWeight) ? Number(rawWeight) : null;
  return { name:text(p.name), weightKg:weight, rawWeight:text(p.bw), ddx:text(p.diagnosis || plan.dx), oral, injection, tx:rows ? group(['procedure']) : '', tp:text(p.plan || plan.plan), source:{system:'jongkong',key:patientKey(p),hn:text(p.hn),encounterId:text(p.encounterId),cageId:p.cageId,revision:p.revision ?? 0,importedAt:new Date().toISOString()} };
}
export function initJongkong({apply, confirm, getSource}) {
  const $ = id => document.getElementById(id);
  let connection, stop, patients = [], online = false;
  const status = message => { $('jk-status').textContent = message; };
  async function connect() {
    if (connection) return connection;
    const [app, authLib, dbLib, response] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
      fetch('./jongkong-config.json')
    ]);
    if (!response.ok) throw Error('โหลดการตั้งค่า JONGKONG ไม่สำเร็จ');
    const config = await response.json();
    const named = app.getApps().find(a => a.name === 'jongkong-reader') || app.initializeApp(config,'jongkong-reader');
    const auth = authLib.getAuth(named), db = dbLib.getFirestore(named);
    await authLib.setPersistence(auth,authLib.browserSessionPersistence);
    connection = {auth,db,config,authLib,dbLib};
    return connection;
  }
  function notifyUpdate() {
    const source = getSource(), current = source && patients.find(p=>patientKey(p)===source.key);
    $('jk-update').hidden = !online || !current || current.revision === source.revision;
    if (source && online && !current) status('ผู้ป่วยที่เลือกไม่อยู่ในวอร์ดแล้ว — ข้อมูลในแบบฟอร์มยังคงเดิม');
  }
  function render() {
    const list = $('jk-patient-chips');
    list.replaceChildren();
    for (const patient of patients) {
      const chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'chip jk-patient-chip';
      const key = patientKey(patient);
      chip.textContent = text(patient.name);
      const duplicate = patients.filter(p => text(p.name) === text(patient.name)).length > 1;
      if (duplicate) chip.textContent += ' · ' + patient.cageId;
      chip.title = text(patient.name) + ' · HN ' + (text(patient.hn) || '—') + ' · กรง ' + patient.cageId;
      chip.setAttribute('aria-label', chip.title);
      const selected = getSource()?.key === key;
      chip.classList.toggle('active', selected);
      chip.setAttribute('aria-pressed', String(selected));
      chip.disabled = !online;
      chip.addEventListener('click', () => importPatient(key));
      list.appendChild(chip);
    }
    if (!patients.length) {
      const empty = document.createElement('p');
      empty.className = 'jk-empty';
      empty.textContent = online ? 'ไม่มีผู้ป่วยแอดมิทอยู่ในวอร์ด' : 'เชื่อมต่อ JONGKONG เพื่อแสดงรายชื่อ';
      list.appendChild(empty);
    }
    notifyUpdate();
  }
  function report(error) {
    online=false; render(); $('jk-update').hidden=true;
    status(['auth/invalid-credential','auth/wrong-password','auth/invalid-login-credentials'].includes(error.code) ? 'รหัสผ่าน JONGKONG ไม่ถูกต้อง' : error.code==='permission-denied' ? 'บัญชีนี้ไม่มีสิทธิ์อ่านวอร์ด JONGKONG' : error.message || 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่');
  }
  async function login() {
    stop?.(); stop=null; online=false; patients=[]; render();
    $('jk-login').disabled=true; status('กำลังเชื่อมต่อ JONGKONG...');
    try {
      const c=await connect();
      await c.authLib.signInWithEmailAndPassword(c.auth,c.config.sharedLoginEmail,$('jk-password').value);
      $('jk-password').value='';
      const member=await c.dbLib.getDocFromServer(c.dbLib.doc(c.db,'members',c.auth.currentUser.uid));
      if (!member.exists() || member.data().enabled!==true) throw Error('บัญชีนี้ยังไม่ได้รับสิทธิ์สมาชิก JONGKONG');
      stop?.();
      stop=c.dbLib.onSnapshot(c.dbLib.doc(c.db,'wards','main'),{includeMetadataChanges:true},snap=>{
        online=!snap.metadata.fromCache && !snap.metadata.hasPendingWrites;
        const state=snap.data(); patients=Array.isArray(state?.patients) ? state.patients.filter(p=>p && text(p.name) && p.name!=='ว่าง') : [];
        status(online ? 'เชื่อมต่อแล้ว · รายชื่ออัปเดตแบบ real time ('+patients.length+' ตัว)' : 'รอเชื่อมต่อระบบ — ยังนำเข้าข้อมูลไม่ได้');
        render();
      },report);
      $('jk-logout').hidden=false;
    } catch(error) { report(error); }
    finally { $('jk-password').value=''; $('jk-login').disabled=false; }
  }
  function importPatient(key) {
    if (!online) return status('กรุณารอเชื่อมต่อระบบก่อนนำเข้า');
    const patient=patients.find(p=>patientKey(p)===key);
    if (!patient) return status('กรุณาเลือกผู้ป่วย');
    const revision=patient.revision;
    confirm('นำเข้าข้อมูลจาก JONGKONG?', 'ชื่อ น้ำหนัก DDx ยากิน ยาฉีด ช่อง Tx เพิ่มเติม และ TP จะถูกแทนที่ด้วยข้อมูลของ '+text(patient.name)+' · HN '+(text(patient.hn)||'—')+' · กรง '+patient.cageId+' กรุณาตรวจข้อมูลก่อนบันทึก',()=>{
      const latest=patients.find(p=>patientKey(p)===key);
      if (!online || !latest || latest.revision!==revision) return status('ข้อมูลต้นทางเปลี่ยนแล้ว กรุณาเลือกนำเข้าอีกครั้ง');
      apply(mapWardPatient(latest)); render(); status('นำเข้าแล้ว — ตรวจข้อมูลและกดบันทึกใน VETJOD');
    });
  }
  $('jk-login').addEventListener('click',login);
  $('jk-password').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();login();}});
  $('jk-update').addEventListener('click',()=>importPatient(getSource()?.key));
  $('jk-logout').addEventListener('click',async()=>{
    stop?.();stop=null;online=false;patients=[];render();
    try { if(connection) await connection.authLib.signOut(connection.auth); status('ออกจาก JONGKONG แล้ว'); } catch(error) { report(error); }
    $('jk-logout').hidden=true;
  });
  return {refresh:render};
}
