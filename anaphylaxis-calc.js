(function () {
  "use strict";

  const onsetButtons = document.querySelectorAll("[data-anaphylaxis-onset]");
  const signsFields = document.getElementById("anaphylaxis-signs-fields");
  const cutaneousCheckbox = document.getElementById("anaphylaxis-cutaneous-checkbox");
  const giSelect = document.getElementById("anaphylaxis-gi-select");
  const respFieldsEl = document.getElementById("anaphylaxis-resp-fields");
  const cvFieldsEl = document.getElementById("anaphylaxis-cv-fields");
  const collapseCheckbox = document.getElementById("anaphylaxis-collapse-checkbox");
  const supportingFieldsEl = document.getElementById("anaphylaxis-supporting-fields");
  const resultEl = document.getElementById("anaphylaxis-result");

  const state = { onset: null };

  function checkboxRowHtml(id, label) {
    return `
      <label class="checkbox-row" style="margin: 6px 0;">
        <input type="checkbox" id="${id}"> ${label}
      </label>
    `;
  }

  respFieldsEl.innerHTML = `
    <p class="hint-text" style="margin-top: 12px;">อาการระบบทางเดินหายใจ</p>
    ${ANAPHYLAXIS_RESP_SIGNS.map((s) => checkboxRowHtml(`anaphylaxis-resp-${s.key}`, s.label)).join("")}
  `;
  cvFieldsEl.innerHTML = `
    <p class="hint-text" style="margin-top: 12px;">อาการระบบหัวใจและหลอดเลือด (นอกเหนือจาก Collapse/Hypotension ด้านล่าง)</p>
    ${ANAPHYLAXIS_CV_SIGNS.map((s) => checkboxRowHtml(`anaphylaxis-cv-${s.key}`, s.label)).join("")}
  `;
  supportingFieldsEl.innerHTML = ANAPHYLAXIS_SUPPORTING_FINDINGS
    .map((s) => checkboxRowHtml(`anaphylaxis-support-${s.key}`, s.label))
    .join("");

  function isChecked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  }

  onsetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      onsetButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.onset = btn.dataset.anaphylaxisOnset;
      signsFields.hidden = state.onset !== "yes";
      refresh();
    });
  });

  document.addEventListener("change", (e) => {
    if (e.target.closest("#anaphylaxis-signs-fields")) refresh();
  });

  function ddxNoteHtml() {
    return `
      <div class="result-note">
        <strong>ควรพิจารณาสาเหตุอื่นมากกว่า</strong> หากอาการในระบบต่างๆ เกิดขึ้นไม่พร้อมกัน (เช่น เริ่มอาเจียนเมื่อวาน แล้วหายใจลำบากวันนี้)
        หรือเป็นอาการเรื้อรัง (เช่น ท้องเสียมาหลายสัปดาห์) เนื่องจาก Acute hypersensitivity ควรมีอาการแบบ peracute (เกิดพร้อมกันภายในไม่กี่นาทีถึงชั่วโมง)
      </div>
    `;
  }

  function refresh() {
    if (state.onset === null) {
      resultEl.hidden = true;
      return;
    }

    if (state.onset === "no") {
      resultEl.hidden = false;
      resultEl.innerHTML = `
        <h3>ผลการประเมิน</h3>
        <div class="result-note">ไม่น่าจะเป็น Acute Hypersensitivity Reaction (ไม่เข้าเกณฑ์ peracute onset ร่วมกับการสัมผัสสารก่อภูมิแพ้ที่เป็นไปได้) — ควรพิจารณาสาเหตุอื่นและดำเนินการวินิจฉัยแยกโรคต่อไป</div>
        <div class="result-source">ที่มา: RECOVER 2026 First Aid Guidelines: Acute Allergy and Anaphylaxis, Section 4.1 (Algorithm)</div>
      `;
      return;
    }

    const hasCutaneous = cutaneousCheckbox.checked;
    const gi = giSelect.value; // none | mild | persistent
    const respSigns = ANAPHYLAXIS_RESP_SIGNS.filter((s) => isChecked(`anaphylaxis-resp-${s.key}`));
    const cvSigns = ANAPHYLAXIS_CV_SIGNS.filter((s) => isChecked(`anaphylaxis-cv-${s.key}`));
    const collapseHypotension = collapseCheckbox.checked;
    const severeRespDistress = isChecked("anaphylaxis-resp-severeDistress");
    const supportingFindings = ANAPHYLAXIS_SUPPORTING_FINDINGS.filter((s) => isChecked(`anaphylaxis-support-${s.key}`));

    // คะแนน 0-3 ตามจำนวนระบบ (นอกเหนือผิวหนัง) ที่มีอาการ — persistent GI, respiratory ใดๆ, cardiovascular ใดๆ
    // (mild self-limiting GI ครั้งเดียวไม่นับคะแนน — ยังจัดเป็น "Grade 1 Uncomplicated" ตาม Table 1/Section 4.1)
  const giScored = gi === "persistent" ? 1 : 0;
    const respInvolved = respSigns.length > 0;
    const cvInvolved = cvSigns.length > 0 || collapseHypotension;
    const score = giScored + (respInvolved ? 1 : 0) + (cvInvolved ? 1 : 0);
    const severeFlag = collapseHypotension || severeRespDistress;

    resultEl.hidden = false;

    let bodyHtml = "";

    if (score === 0) {
      if (hasCutaneous || gi === "mild") {
        const d = ANAPHYLAXIS_DOSING.h1rAntagonist;
        bodyHtml = `
          <div class="result-note"><strong>Uncomplicated Allergic Reaction</strong> (Grade 0-1 ตาม Table 1) — ไม่ใช่ภาวะที่คุกคามชีวิตทันที</div>
          <h4>การรักษาที่แนะนำ</h4>
          <div class="result-item">
            <span class="label">${d.label}</span>
            <span class="value">Strong recommendation, Low quality of evidence</span>
          </div>
          <div class="result-note">${d.note}<br>${d.reportedDose}</div>
          <div class="result-note">
            หากไม่ตอบสนองต่อ H1R antagonist: พิจารณาเสริม ${ANAPHYLAXIS_DOSING.glucocorticoidUncomplicated.dose}
            (${ANAPHYLAXIS_DOSING.glucocorticoidUncomplicated.strength}) — โดยทั่วไป<strong>ไม่แนะนำ</strong>ให้ glucocorticoid เป็นประจำในภาวะนี้
            (Weak recommendation, Very low quality of evidence)
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="result-note">ไม่น่าจะเป็น Acute Hypersensitivity Reaction (คะแนน 0 และไม่มีอาการทางผิวหนัง) — ควรพิจารณาสาเหตุอื่น</div>
        `;
      }
    } else {
      // score >= 1
      const isAnaphylaxis = hasCutaneous || supportingFindings.length > 0 || severeFlag;
      if (!isAnaphylaxis) {
        bodyHtml = `
          <div class="result-note">
            <strong>Anaphylaxis ยังเป็นไปได้</strong> แต่ไม่มีอาการทางผิวหนังและไม่มีอาการสนับสนุนการวินิจฉัย — ควรพิจารณาสาเหตุอื่นร่วมด้วยอย่างจริงจัง
          </div>
          ${ddxNoteHtml()}
        `;
      } else if (severeFlag) {
        const d = ANAPHYLAXIS_DOSING.epinephrineCRI;
        bodyHtml = `
          <div class="result-out-of-range"><strong>Severe Anaphylaxis (Grade 3)</strong> — มี Collapse/Hypotension${severeRespDistress ? " และ/หรือหายใจลำบากรุนแรง" : ""} ถือเป็น Severe anaphylaxis เสมอ ไม่ว่าจะมีระบบอื่นร่วมด้วยกี่ระบบ</div>
          <h4>การรักษาที่แนะนำ</h4>
          <div class="result-item">
            <span class="label">${d.label}</span>
            <span class="value">Weak recommendation, Very low quality of evidence</span>
          </div>
          <div class="result-note"><strong>เป้าหมาย:</strong> ${d.target}</div>
          <div class="result-note">${d.reportedStartingRate}</div>
          <div class="result-note">${d.caution}</div>
          <div class="result-note">${ANAPHYLAXIS_DOSING.epinephrineIM.caution}</div>
          <div class="result-note">${ANAPHYLAXIS_DOSING.glucocorticoidAnaphylaxis.label}: ${ANAPHYLAXIS_DOSING.glucocorticoidAnaphylaxis.recommendation}</div>
          <div class="result-note">แมวที่มี severe respiratory distress ที่ไม่สามารถเปิดหลอดเลือดดำได้ทัน: การให้ epinephrine IM (0.01 mg/kg) ก่อนเป็นทางเลือกที่สมเหตุสมผล</div>
        `;
      } else {
        const d = ANAPHYLAXIS_DOSING.epinephrineIM;
        bodyHtml = `
          <div class="result-note"><strong>Moderate Anaphylaxis (Grade 2)</strong> — มีอาการ 2 ระบบขึ้นไป (หรือมีอาการสนับสนุนการวินิจฉัย) โดยไม่มี Collapse/Hypotension/หายใจลำบากรุนแรง</div>
          <h4>การรักษาที่แนะนำ</h4>
          <div class="result-item">
            <span class="label">${d.label}</span>
            <span class="value">Weak recommendation, Very low quality of evidence</span>
          </div>
          <div class="result-note"><strong>ขนาดยา:</strong> ${d.dose}</div>
          <div class="result-note">${d.note}</div>
          <div class="result-note">${ANAPHYLAXIS_DOSING.glucocorticoidAnaphylaxis.label}: ${ANAPHYLAXIS_DOSING.glucocorticoidAnaphylaxis.recommendation}</div>
          <div class="result-note">ให้เฝ้าระวังการลุกลามเป็น Severe anaphylaxis (Collapse/Hypotension) อย่างใกล้ชิด และเตรียมพร้อมให้ epinephrine CRI หากอาการแย่ลง</div>
        `;
      }
    }

    resultEl.innerHTML = `
      <h3>ผลการประเมิน Acute Hypersensitivity Reaction</h3>
      <div class="result-rate">
        <strong>คะแนนระบบที่มีอาการ (นอกผิวหนัง):</strong> ${score} &nbsp;|&nbsp;
        <strong>อาการทางผิวหนัง:</strong> ${hasCutaneous ? "มี" : "ไม่มี"}
      </div>
      ${bodyHtml}
      <div class="result-source">
        ที่มา: RECOVER 2026 First Aid Guidelines: Acute Allergy and Anaphylaxis (Burkitt-Creedon et al.,
        J Vet Emerg Crit Care 2026;36:S63-S89, DOI: 10.1111/vec.70137) — Table 1, Table 2,
        RECOVER First Aid Acute Hypersensitivity Reaction Algorithm — ใช้เป็นตัวช่วยประเมินเบื้องต้นเท่านั้น
        ไม่ทดแทนดุลยพินิจทางคลินิก
      </div>
    `;
  }

  refresh();
})();
