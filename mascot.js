(function () {
  "use strict";

  const avatarBtn = document.getElementById("mascot-avatar-btn");
  const avatar = document.getElementById("mascot-avatar");
  const bubble = document.getElementById("mascot-bubble");
  if (!avatarBtn || !avatar || !bubble) return;

  const TIPS = [
    { title: "สวัสดี! ทาร์ปเองนะ 🐾", text: "กรอกข้อมูลผู้ป่วยด้านล่างก่อน แล้วไปเลือกเครื่องมือที่ต้องการใช้ได้จากเมนูทั้งหมดเลย" },
    { title: "รู้ไหม?", text: "กดปุ่ม 🗂️ เมนูทั้งหมด ด้านล่าง จะเจอเครื่องมือครบทุกอย่างเลยนะ" },
    { title: "อย่าลืม!", text: "กรอกน้ำหนักตัวสัตว์ก่อนไปหน้าคำนวณยา ไม่งั้นคำนวณให้ไม่ได้เลยนะ" },
    { title: "เคล็ดลับ", text: "ตาราง Crash Cart กดปุ่ม 🖨️ พิมพ์ ได้เลย จะได้ตารางสวยๆ ติดผนังไว้ใช้งานจริง" },
    { title: "ทาร์ปเป็นห่วงนะ", text: "ทุกผลลัพธ์ในแอปเป็นแค่ตัวช่วยคำนวณเบื้องต้น ต้องใช้ดุลยพินิจสัตวแพทย์เสมอน้า" }
  ];
  let index = 0;

  function renderTip() {
    const tip = TIPS[index];
    bubble.innerHTML = `<strong>${tip.title}</strong><p>${tip.text}</p>`;
  }

  function react() {
    index = (index + 1) % TIPS.length;
    renderTip();
    avatar.classList.remove("mascot-pop");
    void avatar.offsetWidth;
    avatar.classList.add("mascot-pop");
  }

  avatar.addEventListener("animationend", (e) => {
    if (e.animationName === "mascot-pop") avatar.classList.remove("mascot-pop");
  });

  avatarBtn.addEventListener("click", react);
})();
