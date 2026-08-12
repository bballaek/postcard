const FLOWER_SRCS = ["/blooming/mali-2.png", "/blooming/mali-1.png"];

const BURST_MS = 2600;
const SWAY_MS = 2800;
const FALL_MS = 3400;
const COVERED_AT = 0.86;

const sprites = [];
let preloadPromise = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function knockOutDark(img, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const frame = ctx.getImageData(0, 0, w, h);
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    if (max < 28) {
      data[i + 3] = 0;
    } else if (max < 72) {
      data[i + 3] = Math.round(data[i + 3] * ((max - 28) / 44));
    }
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

function toSprite(img, knockOut) {
  if (knockOut) return knockOutDark(img, 420);
  const maxSize = 420;
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale >= 1) return img;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function preloadBloom() {
  if (preloadPromise) return preloadPromise;
  preloadPromise = Promise.all(
    FLOWER_SRCS.map(async (src) => {
      const img = await loadImage(src);
      return toSprite(img, true);
    }),
  )
    .then((ready) => {
      sprites.length = 0;
      sprites.push(...ready);
    })
    .catch((err) => {
      preloadPromise = null;
      throw err;
    });
  return preloadPromise;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeInQuad(t) {
  return t * t;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pushFlower(flowers, width, height, tx, ty, index, size) {
  const cx = width / 2;
  const cy = height / 2;
  flowers.push({
    sprite: sprites[index % 2] || sprites[0],
    angle: Math.atan2(ty - cy, tx - cx) + rand(-0.05, 0.05),
    distance: Math.hypot(tx - cx, ty - cy),
    cluster: rand(0.12, 0.22),
    size,
    spin: rand(-Math.PI, Math.PI),
    spinSpeed: rand(-0.42, 0.42),
    swayAmp: rand(0.08, 0.22),
    swaySpeed: rand(0.55, 1.15),
    swayPhase: rand(0, Math.PI * 2),
    fallDelay: rand(0, 0.42),
    fallSpeed: rand(0.8, 1.4),
    drift: rand(-120, 120),
    opacity: 1,
  });
}

function makeFlowers(width, height) {
  const mobile = width < 700;
  const cell = mobile ? 70 : 86;
  const sizeMin = mobile ? 170 : 220;
  const sizeMax = mobile ? 300 : 420;
  const pad = cell * 0.7;
  const flowers = [];
  let index = 0;

  for (let y = -pad; y <= height + pad; y += cell) {
    for (let x = -pad; x <= width + pad; x += cell) {
      pushFlower(
        flowers,
        width,
        height,
        x + rand(-cell * 0.28, cell * 0.28),
        y + rand(-cell * 0.28, cell * 0.28),
        index,
        rand(sizeMin, sizeMax),
      );
      index += 1;
    }
  }

  const extra = mobile ? 24 : 36;
  for (let i = 0; i < extra; i += 1) {
    pushFlower(
      flowers,
      width,
      height,
      rand(-pad, width + pad),
      rand(-pad, height + pad),
      index + i,
      rand(sizeMax * 0.85, sizeMax * 1.15),
    );
  }

  return flowers;
}

function drawFlower(ctx, flower, x, y, scale, rotation, alpha) {
  const sprite = flower.sprite;
  if (!sprite || alpha <= 0.01) return;
  const w = flower.size * scale;
  const h = (sprite.height / sprite.width) * w;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export async function playBloom({ canvas, veil, onCovered } = {}) {
  if (!canvas) return;
  await preloadBloom();
  if (!sprites[0]) return;

  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let flowers = [];
  let coveredSent = false;
  let raf = 0;
  let startedAt = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  flowers = makeFlowers(width, height);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const burstMs = reduced ? 400 : BURST_MS;
  const swayMs = reduced ? 200 : SWAY_MS;
  const fallMs = reduced ? 500 : FALL_MS;
  const total = burstMs + swayMs + fallMs;

  return new Promise((resolve) => {
    function frame(now) {
      if (!startedAt) startedAt = now;
      const elapsed = now - startedAt;
      const cx = width / 2;
      const cy = height / 2;
      ctx.clearRect(0, 0, width, height);

      let veilAlpha = 0;
      const groupSway =
        elapsed > burstMs * 0.35
          ? Math.sin(((elapsed - burstMs * 0.35) / 1000) * 0.7) * 0.12
          : 0;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(groupSway);
      ctx.translate(-cx, -cy);

      for (const flower of flowers) {
        let x;
        let y;
        let scale;
        let alpha = flower.opacity;
        let rotation = flower.spin;

        if (elapsed <= burstMs) {
          const u = Math.min(1, elapsed / burstMs);
          let distMul;
          if (u < 0.32) {
            const t = easeOutCubic(u / 0.32);
            distMul = flower.cluster * t;
            scale = 0.18 + t * 0.62;
            alpha *= Math.min(1, t * 1.6);
            veilAlpha = t * 0.55;
          } else {
            const t = easeOutCubic((u - 0.32) / 0.68);
            distMul = flower.cluster + t * (1 - flower.cluster);
            scale = 0.8 + t * 0.28;
            veilAlpha = 0.55 + t * 0.45;
          }
          x = cx + Math.cos(flower.angle) * flower.distance * distMul;
          y = cy + Math.sin(flower.angle) * flower.distance * distMul;
          rotation += u * flower.spinSpeed * 1.2;
        } else if (elapsed <= burstMs + swayMs) {
          const swayT = (elapsed - burstMs) / 1000;
          x = cx + Math.cos(flower.angle) * flower.distance;
          y = cy + Math.sin(flower.angle) * flower.distance;
          scale = 1;
          rotation +=
            flower.spinSpeed * 0.35 +
            Math.sin(swayT * flower.swaySpeed + flower.swayPhase) * flower.swayAmp;
          veilAlpha = 1;
        } else {
          const raw = (elapsed - burstMs - swayMs) / fallMs;
          const local = Math.max(0, Math.min(1, (raw - flower.fallDelay) / (1 - flower.fallDelay * 0.5)));
          const fall = easeInQuad(local);
          x =
            cx +
            Math.cos(flower.angle) * flower.distance +
            flower.drift * fall;
          y =
            cy +
            Math.sin(flower.angle) * flower.distance +
            fall * (height * 0.95 + flower.size) * flower.fallSpeed;
          scale = 1 - fall * 0.12;
          alpha *= 1 - fall;
          rotation +=
            flower.spinSpeed * (0.35 + fall * 1.4) +
            Math.sin((elapsed / 1000) * flower.swaySpeed + flower.swayPhase) *
              flower.swayAmp;
          veilAlpha = 1 - easeInQuad(Math.min(1, raw));
        }

        drawFlower(ctx, flower, x, y, scale, rotation, alpha);
      }

      ctx.restore();

      if (veil) veil.style.opacity = String(veilAlpha);

      if (!coveredSent && elapsed >= burstMs * COVERED_AT) {
        coveredSent = true;
        if (typeof onCovered === "function") onCovered();
      }

      if (elapsed < total) {
        raf = window.requestAnimationFrame(frame);
        return;
      }

      if (veil) veil.style.opacity = "0";
      ctx.clearRect(0, 0, width, height);
      window.cancelAnimationFrame(raf);
      resolve();
    }

    raf = window.requestAnimationFrame(frame);
  });
}
