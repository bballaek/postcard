# Exhibition Lab (portable export)

แพ็กเกจแยกจาก SceneLapse — Creative Space orbit wall เท่านั้น  
(`circle → ramp ×7.3 → collapse → Fibonacci explode → quaternion drag / focus`)

## โครงสร้าง

```
exports/exhibition-lab/
  README.md
  package.json
  src/
    ExhibitionLab.js      # คอมโพเนนต์หลัก
    ExhibitionLab.css
    exlabSound.js
    watchSynth.js
    api.js
    index.js
  public/
    audio/                # ambient + SFX
    logo/logoSceneLapse-Green.svg
    featuredBoard/        # seed รูปตัวอย่าง
```

## Dependencies ที่ต้องมีในโปรเจกต์ปลายทาง

```bash
npm i react react-dom three
```

- React ≥ 18  
- `three` ≥ 0.160  

ไม่ต้องใช้ `react-router-dom`

## วิธีเอาไปใช้

### 1) คัดลอกไฟล์

- คัดลอก `src/` เข้าโปรเจกต์ (เช่น `src/exhibition-lab/`)
- คัดลอก `public/audio`, `public/logo`, `public/featuredBoard` ไปที่ `public/` ของแอป

### 2) Mount คอมโพเนนต์

```jsx
import ExhibitionLab from "./exhibition-lab/ExhibitionLab";
// หรือ
import { ExhibitionLab } from "./exhibition-lab";

export default function Page() {
  return <ExhibitionLab />;
}
```

### 3) โหมดรูปภาพ

**A — ใช้ seed ใน `/featuredBoard` อย่างเดียว**  
ไม่ต้องมี backend

**B — ส่ง URL เอง (แนะนำสำหรับงานอื่น)**

```jsx
<ExhibitionLab
  photoUrls={[
    "/photos/a.jpg",
    "/photos/b.jpg",
    "https://cdn.example.com/c.jpg",
  ]}
/>
```

**C — โพล API แบบ SceneLapse**

```jsx
<ExhibitionLab
  photosEndpoint="https://api.example.com/exhibition/photos"
  pollMs={4000}
/>
```

คาดหวัง JSON แบบ:

```json
{ "success": true, "photos": [{ "url": "/exhibition/image/…" }] }
```

หรือส่งอาร์เรย์ URL ตรงๆ ก็ได้

ตั้งค่า backend (ถ้าใช้ relative URL):

```env
REACT_APP_BACKEND_URL=http://localhost:5001
# หรือ Vite:
VITE_BACKEND_URL=http://localhost:5001
```

### 4) Props ที่ปรับได้

| Prop | Default | ความหมาย |
|------|---------|----------|
| `photoUrls` | — | รายการรูป (ข้าม polling) |
| `photosEndpoint` | `{backend}/exhibition/photos` | URL โพล |
| `pollMs` | `4000` | ช่วงโพล |
| `homeHref` | `/` | ลิงก์ brand |
| `secondaryHref` | `/exhibition` | ปุ่ม 2 |
| `tertiaryHref` | `/photobooth` | ปุ่ม 3 |
| `logoSrc` | `/logo/logoSceneLapse-Green.svg` | โลโก้กลางจอตอน intro |

## พฤติกรรมหลัก (CFG)

- วง 10 ใบ · มุม −90° + 36° · fade/scale `back.out`
- หมุน 0.5°/frame → หลัง 1.3s เร่งถึง ×7.3 ใน 1s
- collapse → explode Fibonacci · overshoot 0.1 · `power3.out`
- drag: quaternion · friction 0.94 · smoothing 0.11 · tilt 23°
- คลิกโฟกัส ~70vh · ปุ่ม Overview กลับ

## หมายเหตุ

- ต้องมี user gesture ก่อนเสียงบางตัวจะเล่นได้ (ปุ่มเสียงมุมบน)
- แพ็กนี้**ไม่รวม** `/exhibition` wall หลัก / sendToExhibition / booth
- ไฟล์ต้นทางในโมโนรีโป: `frontend/src/components/ExhibitionLab.js`
