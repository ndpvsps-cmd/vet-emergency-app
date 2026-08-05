# VETJOD — ตั้งค่าเบื้องต้น (ครั้งเดียว)

VETJOD เป็นเว็บแอปแบบ static (ไม่มี build step) ที่ใช้ **Firebase** (ฟรี) เป็นฐานข้อมูลกลาง
เพื่อให้ทุกเครื่องเห็นข้อมูลเดียวกันแบบเรียลไทม์ ต้องตั้งค่า Firebase project หนึ่งครั้งก่อนใช้งานจริง

## 1) สร้าง Firebase project

1. ไปที่ https://console.firebase.google.com/ แล้วล็อกอินด้วย Google account ของคลินิก
2. กด **Add project** ตั้งชื่อ เช่น `vetjod` แล้วสร้างโปรเจกต์ (ปิด Google Analytics ก็ได้ ไม่จำเป็น)

## 2) เปิดใช้งาน Firestore

1. เมนูซ้าย > **Build > Firestore Database** > **Create database**
2. เลือก **Production mode** แล้วเลือก region ที่ใกล้ที่สุด (เช่น `asia-southeast1`)
3. เมื่อสร้างเสร็จ ไปที่แท็บ **Rules** แล้ววางกฎนี้แทนของเดิม แล้วกด **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /vetjod_records/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

กฎนี้อนุญาตให้อ่าน/เขียนได้เฉพาะผู้ที่ผ่านการ sign-in แบบ anonymous ของแอปเท่านั้น (ดูข้อ 3)

## 3) เปิดใช้งาน Anonymous Authentication

1. เมนูซ้าย > **Build > Authentication** > **Get started**
2. แท็บ **Sign-in method** > เลือก **Anonymous** > เปิดใช้งาน (Enable) > **Save**

## 4) คัดลอก config มาใส่ในแอป

1. เมนูซ้าย (รูปเฟือง) > **Project settings** > แท็บ **General**
2. เลื่อนลงมาที่ **Your apps** > กดไอคอน **</>** (Web) เพื่อเพิ่มเว็บแอป ตั้งชื่ออะไรก็ได้ เช่น `vetjod-web`
3. Firebase จะโชว์ก้อน config ประมาณนี้:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

4. เปิดไฟล์ [`firebase-config.js`](firebase-config.js) แล้วแทนที่ค่าใน `FIREBASE_CONFIG` ด้วยค่าจริงที่ได้มา

## 5) ตั้งรหัสผ่านทีม

ในไฟล์เดียวกัน แก้ค่า `TEAM_PASSCODE` เป็นรหัสที่ทีมจะใช้ร่วมกัน (จะเปลี่ยนเมื่อไรก็ได้ โดยแก้ไฟล์นี้แล้ว push ใหม่)

> รหัสผ่านนี้เป็นแค่ตัวกันคนนอกเปิดลิงก์เข้ามาดูข้อมูล ไม่ใช่ระบบความปลอดภัยระดับสูง เพราะค่าที่ตรวจสอบอยู่ในไฟล์ JS
> ฝั่ง client ซึ่งใครก็เปิดดูซอร์สได้ — เหมาะสำหรับกันคนนอกทั่วไป ไม่เหมาะกับข้อมูลที่ต้องปิดลับระดับสูงมาก

## 6) Deploy

Push โค้ดขึ้น GitHub แล้วเปิด GitHub Pages (Settings > Pages > Deploy from branch `main` / root) — ตัวแอปหลัก
ของ repo นี้ก็ deploy วิธีเดียวกันอยู่แล้ว เมื่อ deploy เสร็จ VETJOD จะอยู่ที่ `<เว็บไซต์เดิม>/vetjod/`

## หมายเหตุ

- Firestore + Anonymous Auth อยู่ใน Spark plan (ฟรี) ของ Firebase ปริมาณการใช้งานของคลินิกขนาดเล็ก-กลาง
  ไม่มีทางใกล้เพดานฟรีเลย
- ข้อมูลเก็บใน collection ชื่อ `vetjod_records` — เอกสารหนึ่งชิ้น = การตรวจหนึ่งครั้ง (สัตว์ตัวเดียวกันตรวจ
  หลายครั้ง/วัน จะมีหลายการ์ด เรียงตามเวลาที่บันทึกล่าสุดอยู่บนสุด)
- ปุ่ม "เริ่มบันทึกวันใหม่" จะลบบันทึกของ**วันนี้ทั้งหมด**ถาวร (มีขั้นตอนยืนยันก่อนลบ) เหมาะใช้ตอนเริ่มกะ/วันใหม่
