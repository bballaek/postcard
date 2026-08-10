/**
 * Firebase helpers for student → parent postcard lookup.
 * Requires window.FIREBASE_CONFIG (see firebase-config.js).
 *
 * Photos prefer Firebase Storage. If Storage is not enabled yet,
 * images fall back to compressed data URLs inside Firestore.
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

let dbInstance = null;
let storageDisabled = false;

const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.75;
const FALLBACK_EDGE = 900;
const FALLBACK_QUALITY = 0.62;
const UPLOAD_TIMEOUT_MS = 40000;
const MAX_DATA_URL_CHARS = 700000; // keep Firestore doc under ~1MB

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
  if (code === "permission-denied" || /permission/i.test(msg)) {
    return new Error(
      "Firestore ยังไม่อนุญาตบันทึก — ไป Firestore → Rules แล้ว Publish:\n\nrules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /postcards/{studentId} {\n      allow read, write: if true;\n    }\n  }\n}",
    );
  }
  return err instanceof Error ? err : new Error(msg || "Firebase request failed");
}

async function blobFromSrc(src) {
  if (!src) return null;
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

  // Shrink until it fits Firestore-ish budget.
  while (dataUrl.length > MAX_DATA_URL_CHARS && (edge > 400 || quality > 0.4)) {
    edge = Math.max(400, Math.round(edge * 0.8));
    quality = Math.max(0.4, quality - 0.08);
    current = await compressImageBlob(blob, edge, quality);
    dataUrl = await blobToDataUrl(current);
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error("รูปใหญ่เกินไปสำหรับบันทึกแบบสำรอง — ลองเลือกรูปที่เล็กกว่า");
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
  if (typeof src === "string") {
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    if (src.startsWith("data:image/")) return src;
    if (src.startsWith("/assets/") || src.startsWith("assets/")) {
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
      console.warn("[FirebasePostcard] Storage upload failed, using Firestore data URL fallback", err);
      if (isStorageSetupError(err)) {
        storageDisabled = true;
      } else {
        // Still try fallback for transient storage issues.
      }
    }
  }

  return toFallbackDataUrl(blob);
}

async function hydrateDataMedia(data, studentId) {
  const next = { ...(data || {}) };
  const tasks = [];

  if (next.photo) {
    tasks.push(
      uploadImage(next.photo, studentId).then((url) => {
        next.photo = url;
      }),
    );
  }

  if (Array.isArray(next.stickers)) {
    tasks.push(
      Promise.all(
        next.stickers.map((s) => (s ? uploadImage(s, studentId) : null)),
      ).then((list) => {
        next.stickers = list;
        while (next.stickers.length < 4) next.stickers.push(null);
      }),
    );
  }

  // Asset paths (/assets/...) are kept as-is inside uploadImage.
  if (next.postageArt) {
    tasks.push(
      uploadImage(next.postageArt, studentId).then((url) => {
        next.postageArt = url;
      }),
    );
  }
  if (next.stampFront) {
    tasks.push(
      uploadImage(next.stampFront, studentId).then((url) => {
        next.stampFront = url;
      }),
    );
  }
  if (next.stampBack) {
    tasks.push(
      uploadImage(next.stampBack, studentId).then((url) => {
        next.stampBack = url;
      }),
    );
  }

  await Promise.all(tasks);
  return next;
}

async function savePostcard({ studentId, style, data, photoBlob }) {
  const id = normalizeStudentId(studentId);
  if (!id) throw new Error("Please enter your student ID");

  try {
    const payload = { ...(data || {}) };
    if (photoBlob instanceof Blob) {
      payload.photo = await uploadImage(photoBlob, id);
    }

    const hydrated = await hydrateDataMedia(payload, id);
    const refDoc = doc(getDb(), "postcards", id);

    await withTimeout(
      setDoc(
        refDoc,
        {
          studentId: String(studentId).trim(),
          style: style || "vintage",
          data: hydrated,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      ),
      UPLOAD_TIMEOUT_MS,
      "Saving postcard",
    );

    return { studentId: id, data: hydrated };
  } catch (err) {
    console.error("[FirebasePostcard] save failed", err);
    throw friendlyFirebaseError(err);
  }
}

async function getPostcard(studentId) {
  const id = normalizeStudentId(studentId);
  if (!id) return null;
  try {
    const snap = await withTimeout(
      getDocFromServer(doc(getDb(), "postcards", id)),
      20000,
      "Loading postcard",
    );
    if (!snap.exists()) return null;
    return snap.data();
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
