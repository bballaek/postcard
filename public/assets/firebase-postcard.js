/**
 * Firebase helpers for student → parent postcard lookup.
 * Requires window.FIREBASE_CONFIG (see firebase-config.js).
 *
 * Photos prefer Firebase Storage. If Storage is not enabled yet,
 * images fall back to compressed data URLs inside Firestore.
 *
 * Card payload is stored as `dataJson` (string) to avoid Firestore
 * "Property data contains an invalid nested entity" on some projects.
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
  waitForPendingWrites,
  memoryLocalCache,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

let dbInstance = null;
let storageDisabled = false;

const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.72;
const FALLBACK_EDGE = 720;
const FALLBACK_QUALITY = 0.58;
const UPLOAD_TIMEOUT_MS = 40000;
const MAX_DATA_URL_CHARS = 450000;

const CARD_KEYS = [
  "titleLine1",
  "titleLine2",
  "from",
  "to",
  "message",
  "photo",
  "stickers",
  "stampFront",
  "stampFrontOpacity",
  "stampBack",
  "stampBackOpacity",
  "postageArt",
  "titleColor",
  "backPhoto",
];

function getConfig() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || cfg.apiKey === "YOUR_API_KEY") {
    throw new Error(
      "Firebase is not configured. Set window.FIREBASE_CONFIG in /assets/firebase-config.js",
    );
  }
  return cfg;
}

function getApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp(getConfig());
}

function getDb() {
  if (dbInstance) return dbInstance;
  const app = getApp();
  try {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: memoryLocalCache(),
    });
  } catch (err) {
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

function getBucket() {
  const app = getApp();
  const bucket = (getConfig().storageBucket || "").trim();
  if (bucket) {
    const gs = bucket.startsWith("gs://") ? bucket : `gs://${bucket}`;
    return getStorage(app, gs);
  }
  return getStorage(app);
}

function normalizeStudentId(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function isConfigured() {
  const cfg = window.FIREBASE_CONFIG;
  return !!(cfg && cfg.apiKey && cfg.apiKey !== "YOUR_API_KEY");
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function extFromMime(mime) {
  if (!mime) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `${label || "Upload"} timed out — check your network and try again`,
          ),
        );
      }, ms);
    }),
  ]);
}

function isStorageSetupError(err) {
  const code = err && (err.code || err.name);
  const msg = String((err && err.message) || err || "");
  return (
    code === "storage/unauthorized" ||
    code === "storage/unauthenticated" ||
    code === "storage/unknown" ||
    code === "permission-denied" ||
    /storage\//i.test(String(code || "")) ||
    /Firebase Storage has not been set up/i.test(msg) ||
    /bucket does not exist/i.test(msg) ||
    /permission/i.test(msg)
  );
}

function friendlyFirebaseError(err) {
  const code = err && (err.code || err.name);
  const msg = String((err && err.message) || err || "");
  if (/timed out/i.test(msg)) {
    return err instanceof Error ? err : new Error(msg);
  }
  if (
    code === "unavailable" ||
    /client is offline/i.test(msg) ||
    /Failed to get document because the client is offline/i.test(msg)
  ) {
    return new Error("เชื่อมต่อ Firebase ไม่ได้ — ตรวจเน็ตแล้วลองใหม่");
  }
  if (code === "permission-denied" || (/permission/i.test(msg) && !/storage/i.test(msg))) {
    return new Error(
      "Firestore ยังไม่อนุญาตบันทึก — ไป Firestore → Rules แล้ว Publish rules ที่อนุญาต read/write สำหรับ postcards",
    );
  }
  if (/invalid nested entity/i.test(msg)) {
    return new Error(
      "รูปแบบข้อมูลการ์ดไม่ถูกรับโดย Firestore — รีเฟรชหน้าแล้วลองบันทึกใหม่ (อัปเดตตัวบันทึกแล้ว)",
    );
  }
  if (/exceeds the maximum|too big|too large/i.test(msg)) {
    return new Error("รูปใหญ่เกินไป — ลองเลือกรูปที่เล็กกว่า หรือเปิด Firebase Storage");
  }
  return err instanceof Error ? err : new Error(msg || "Firebase request failed");
}

function pickCardData(input) {
  const src = input && typeof input === "object" ? input : {};
  const out = {};
  CARD_KEYS.forEach((key) => {
    if (src[key] !== undefined) out[key] = src[key];
  });
  return out;
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeMediaValue(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  return null;
}

function normalizeStickers(list) {
  const arr = Array.isArray(list) ? list.slice(0, 4) : [];
  while (arr.length < 4) arr.push(null);
  return arr.map((item) => normalizeMediaValue(item));
}

async function blobFromSrc(src) {
  if (!src) return null;
  if (src instanceof Blob) return src;
  if (typeof src !== "string") return null;
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    const res = await fetch(src);
    if (!res.ok) throw new Error("Could not read image for upload.");
    return res.blob();
  }
  return null;
}

async function compressImageBlob(blob, maxEdge, quality) {
  if (!(blob instanceof Blob)) return blob;
  const edge = maxEdge || MAX_EDGE;
  const q = quality == null ? JPEG_QUALITY : quality;

  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return blob;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const out = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || blob), "image/jpeg", q);
    });
    return out || blob;
  } catch {
    return blob;
  }
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not encode image"));
    reader.readAsDataURL(blob);
  });
}

async function toFallbackDataUrl(blob) {
  let current = await compressImageBlob(blob, FALLBACK_EDGE, FALLBACK_QUALITY);
  let dataUrl = await blobToDataUrl(current);
  let edge = FALLBACK_EDGE;
  let quality = FALLBACK_QUALITY;

  while (dataUrl.length > MAX_DATA_URL_CHARS && (edge > 320 || quality > 0.35)) {
    edge = Math.max(320, Math.round(edge * 0.78));
    quality = Math.max(0.35, quality - 0.08);
    current = await compressImageBlob(blob, edge, quality);
    dataUrl = await blobToDataUrl(current);
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error(
      "รูปใหญ่เกินไป และยังเปิด Firebase Storage ไม่ได้ — เปิด Storage ใน Console แล้วลองใหม่",
    );
  }
  return dataUrl;
}

async function uploadToStorage(blob, studentId, contentType) {
  const id = normalizeStudentId(studentId) || "anon";
  const ext = extFromMime(contentType);
  const path = `postcard-images/${id}/${uuid()}.${ext}`;
  const storageRef = ref(getBucket(), path);
  await withTimeout(
    uploadBytes(storageRef, blob, { contentType }),
    UPLOAD_TIMEOUT_MS,
    "Image upload",
  );
  return withTimeout(getDownloadURL(storageRef), 15000, "Getting image URL");
}

async function uploadImage(src, studentId) {
  if (!src) return null;

  // Keep packaged / static site assets as relative paths — no need to upload.
  if (typeof src === "string") {
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    if (
      src.startsWith("/assets/") ||
      src.startsWith("assets/") ||
      src.startsWith("/image/") ||
      src.startsWith("/card/")
    ) {
      return src.startsWith("/") ? src : `/${src}`;
    }
  }

  let blob = src instanceof Blob ? src : await blobFromSrc(src);
  if (!blob) return typeof src === "string" ? src : null;

  blob = await compressImageBlob(blob, MAX_EDGE, JPEG_QUALITY);
  const contentType =
    blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
  if (!blob.type || blob.type !== contentType) {
    blob = new Blob([blob], { type: contentType });
  }

  if (!storageDisabled) {
    try {
      return await uploadToStorage(blob, studentId, contentType);
    } catch (err) {
      console.warn(
        "[FirebasePostcard] Storage upload failed, using Firestore data URL fallback",
        err,
      );
      if (isStorageSetupError(err)) storageDisabled = true;
    }
  }

  return toFallbackDataUrl(blob);
}

async function hydrateDataMedia(data, studentId) {
  const next = pickCardData(data);

  if (next.photo) {
    next.photo = await uploadImage(next.photo, studentId);
  }

  if (Array.isArray(next.stickers)) {
    const list = await Promise.all(
      next.stickers.map((s) => (s ? uploadImage(s, studentId) : null)),
    );
    next.stickers = normalizeStickers(list);
  } else {
    next.stickers = normalizeStickers([]);
  }

  if (next.backPhoto) {
    next.backPhoto = await uploadImage(next.backPhoto, studentId);
  }
  if (next.postageArt) {
    next.postageArt = await uploadImage(next.postageArt, studentId);
  }
  if (next.stampFront) {
    next.stampFront = await uploadImage(next.stampFront, studentId);
  }
  if (next.stampBack) {
    next.stampBack = await uploadImage(next.stampBack, studentId);
  }

  next.photo = normalizeMediaValue(next.photo);
  next.backPhoto = normalizeMediaValue(next.backPhoto);
  next.postageArt = normalizeMediaValue(next.postageArt);
  next.stampFront = normalizeMediaValue(next.stampFront);
  next.stampBack = normalizeMediaValue(next.stampBack);

  if (typeof next.stampFrontOpacity !== "number") next.stampFrontOpacity = 1;
  if (typeof next.stampBackOpacity !== "number") next.stampBackOpacity = 1;
  if (typeof next.titleLine1 !== "string") next.titleLine1 = "";
  if (typeof next.titleLine2 !== "string") next.titleLine2 = "";
  if (typeof next.from !== "string") next.from = "";
  if (typeof next.to !== "string") next.to = "";
  if (typeof next.message !== "string") next.message = "";
  if (typeof next.titleColor !== "string") next.titleColor = "#0c0c0c";

  return toPlainJson(next);
}

function parseDocToPostcard(raw) {
  if (!raw || typeof raw !== "object") return null;

  let data = null;
  if (typeof raw.dataJson === "string" && raw.dataJson) {
    try {
      data = JSON.parse(raw.dataJson);
    } catch (err) {
      console.warn("[FirebasePostcard] bad dataJson", err);
    }
  }
  if (!data && raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    data = raw.data;
  }
  if (!data) {
    data = pickCardData(raw);
  }

  return {
    studentId: raw.studentId || null,
    style: raw.style || "vintage",
    data,
    updatedAt: raw.updatedAt || null,
    createdAt: raw.createdAt || null,
  };
}

async function savePostcard({ studentId, style, data, photoBlob }) {
  const id = normalizeStudentId(studentId);
  if (!id) throw new Error("Please enter your student ID");

  try {
    const payload = pickCardData(data || {});

    if (photoBlob instanceof Blob) {
      payload.photo = await uploadImage(photoBlob, id);
    } else if (payload.photo) {
      payload.photo = await uploadImage(payload.photo, id);
    }

    const hydrated = await hydrateDataMedia(payload, id);
    const dataJson = JSON.stringify(hydrated);
    if (dataJson.length > 900000) {
      throw new Error(
        "ข้อมูลการ์ดใหญ่เกินไป — เปิด Firebase Storage ใน Console แล้วลองใหม่",
      );
    }

    const db = getDb();
    const refDoc = doc(db, "postcards", id);

    // Store card as JSON string (avoids nested-entity errors on `data`).
    await withTimeout(
      setDoc(
        refDoc,
        {
          studentId: String(studentId).trim(),
          style: style || "vintage",
          dataJson,
          photo: hydrated.photo || null,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      ),
      UPLOAD_TIMEOUT_MS,
      "Saving postcard",
    );

    // Make sure the write reached the server (not only a local cache).
    await withTimeout(waitForPendingWrites(db), 20000, "Syncing postcard");
    const verify = await withTimeout(
      getDocFromServer(refDoc),
      20000,
      "Verifying postcard",
    );
    if (!verify.exists()) {
      throw new Error(
        "บันทึกไม่ขึ้นเซิร์ฟเวอร์ — ตรวจ Firestore Rules แล้ว Publish (allow read, write: if true)",
      );
    }

    return { studentId: id, style: style || "vintage", data: hydrated };
  } catch (err) {
    console.error("[FirebasePostcard] save failed", err);
    throw friendlyFirebaseError(err);
  }
}

async function getPostcard(studentId) {
  const id = normalizeStudentId(studentId);
  if (!id) return null;
  try {
    const refDoc = doc(getDb(), "postcards", id);
    let snap;
    try {
      snap = await withTimeout(
        getDocFromServer(refDoc),
        20000,
        "Loading postcard",
      );
    } catch (err) {
      // Fall back to cache/local if server read fails (offline / rules blip).
      console.warn("[FirebasePostcard] getDocFromServer failed, trying getDoc", err);
      snap = await withTimeout(getDoc(refDoc), 20000, "Loading postcard");
    }
    if (!snap.exists()) return null;
    return parseDocToPostcard(snap.data());
  } catch (err) {
    throw friendlyFirebaseError(err);
  }
}

window.FirebasePostcard = {
  isConfigured,
  normalizeStudentId,
  uploadImage,
  savePostcard,
  getPostcard,
};
