/** Exhibition Lab audio — ambient bed + SFX (local /audio/* files). */

import { PATCHES, playPatch, unlockAudio } from "./watchSynth";

const AMBIENT_SRC = "/audio/ambient.mp3";

const SFX = {
  enter: "/audio/enter.mp3",
  hit1: "/audio/hit1.mp3",
  hit2: "/audio/hit2.mp3",
  softClick: "/audio/soft-click.mp3",
  softClick2: "/audio/soft-click2.mp3",
  scrub: "/audio/scrub.mp3",
};

let ambientNodes = null;
let ambientEl = null;
let ambientMuted = false;
let lastWhooshAt = 0;
let lastScrubAt = 0;
let lastHitAt = 0;
let lastIntroAt = 0;
let ambientStartPending = false;
let introSoftClickTimer = 0;
const sfxPool = {};

export function unlockExlabAudio() {
  return unlockAudio();
}

function ensureAmbientEl() {
  if (ambientEl) return ambientEl;
  const el = new Audio(AMBIENT_SRC);
  el.loop = true;
  el.preload = "auto";
  el.volume = 0;
  ambientEl = el;
  return el;
}

function fadeAmbientEl(toVolume, ms = 900) {
  const el = ambientEl;
  if (!el) return;
  const from = el.volume;
  const t0 = performance.now();
  const step = (now) => {
    const u = Math.min(1, (now - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (toVolume - from) * u));
    if (u < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function playFile(src, volume = 0.55) {
  if (ambientMuted) return;
  try {
    let el = sfxPool[src];
    if (!el) {
      el = new Audio(src);
      el.preload = "auto";
      sfxPool[src] = el;
    }
    const node = el.cloneNode();
    node.volume = volume;
    const p = node.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    /* ignore */
  }
}

export function isExlabAmbientOn() {
  if (ambientMuted) return false;
  if (ambientEl && !ambientEl.paused) return true;
  return !!ambientNodes;
}

export function setExlabAmbientMuted(muted) {
  ambientMuted = !!muted;
  if (ambientEl) {
    if (muted) fadeAmbientEl(0, 400);
    else if (!ambientEl.paused) fadeAmbientEl(0.42, 500);
  }
  if (!ambientNodes) return;
  const { master } = ambientNodes;
  const ctx = master.context;
  const t = ctx.currentTime;
  try {
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(muted ? 0.0001 : 0.045, t + 0.35);
  } catch {
    /* ignore */
  }
}

export function startExlabAmbient(volume = 0.42) {
  ambientMuted = false;
  unlockAudio();

  const el = ensureAmbientEl();
  if (!el.paused) {
    fadeAmbientEl(volume, 700);
    return;
  }
  if (ambientStartPending) return;

  const playBed = () => {
    ambientStartPending = false;
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(() => fadeAmbientEl(volume, 1200)).catch(() => {
        startSynthAmbient(0.045);
      });
    } else {
      fadeAmbientEl(volume, 1200);
    }
  };

  if (el.readyState >= 2) playBed();
  else {
    ambientStartPending = true;
    el.addEventListener("canplay", playBed, { once: true });
    el.addEventListener(
      "error",
      () => {
        ambientStartPending = false;
        startSynthAmbient(0.045);
      },
      { once: true }
    );
    el.load();
  }
}

function startSynthAmbient(volume = 0.045) {
  const ctx = unlockAudio();
  if (!ctx || ambientNodes) return;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.4);
  master.connect(ctx.destination);

  const makeTone = (freq, type, gainLevel) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gainLevel;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07 + Math.random() * 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = freq * 0.004;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(g);
    g.connect(master);
    osc.start();
    lfo.start();
    return { osc, lfo, g };
  };

  ambientNodes = {
    master,
    tones: [
      makeTone(110, "sine", 0.55),
      makeTone(164.81, "sine", 0.28),
      makeTone(220, "triangle", 0.12),
    ],
  };
}

export function stopExlabAmbient() {
  ambientStartPending = false;
  if (ambientEl) {
    fadeAmbientEl(0, 500);
    window.setTimeout(() => {
      try {
        ambientEl.pause();
        ambientEl.currentTime = 0;
      } catch {
        /* ignore */
      }
    }, 520);
  }

  if (!ambientNodes) return;
  const { master, tones } = ambientNodes;
  const ctx = master.context;
  const t = ctx.currentTime;
  try {
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0.0001, t + 0.8);
  } catch {
    /* ignore */
  }
  window.setTimeout(() => {
    tones.forEach(({ osc, lfo }) => {
      try {
        osc.stop();
        lfo.stop();
      } catch {
        /* ignore */
      }
    });
    try {
      master.disconnect();
    } catch {
      /* ignore */
    }
    ambientNodes = null;
  }, 900);
}

function soundEnabled() {
  return (
    !ambientMuted &&
    (isExlabAmbientOn() ||
      !!ambientNodes ||
      (ambientEl && !ambientEl.paused))
  );
}

/** Opening — ENTER + soft confirm */
export function playExlabIntro() {
  if (ambientMuted) return;
  const now = performance.now();
  if (now - lastIntroAt < 1200) return;
  lastIntroAt = now;
  playFile(SFX.enter, 0.55);
  window.clearTimeout(introSoftClickTimer);
  introSoftClickTimer = window.setTimeout(() => {
    playFile(SFX.softClick, 0.35);
  }, 180);
}

/** Orbit scrub / whoosh while dragging */
export function playExlabWhoosh(energy = 1) {
  if (!soundEnabled()) return;

  const now = performance.now();
  // Keep scrub sparse — rapid calls become a tick train
  const gap = energy > 2.5 ? 90 : energy > 1.2 ? 130 : 180;
  if (now - lastWhooshAt < gap) return;
  lastWhooshAt = now;

  if (now - lastScrubAt > 110) {
    lastScrubAt = now;
    playFile(SFX.scrub, Math.min(0.42, 0.1 + energy * 0.06));
  } else {
    playPatch(
      energy > 2 ? PATCHES.switch : PATCHES.tap,
      Math.min(0.28, 0.08 + energy * 0.04)
    );
  }
}

/** Focus a card — ambient + soft click */
export function playExlabFocus() {
  unlockAudio();
  if (!isExlabAmbientOn()) startExlabAmbient(0.42);
  else if (ambientMuted) setExlabAmbientMuted(false);
  playFile(SFX.softClick, 0.6);
  window.setTimeout(() => playFile(SFX.hit1, 0.28), 70);
}

export function playExlabUnfocus() {
  if (ambientMuted) return;
  playFile(SFX.softClick2, 0.55);
}

/** Hit accents — sparse one-shots only (never a tick loop) */
export function playExlabHit(hard = false) {
  if (!soundEnabled()) return;
  const now = performance.now();
  if (now - lastHitAt < 280) return;
  lastHitAt = now;
  playFile(hard ? SFX.hit2 : SFX.hit1, hard ? 0.4 : 0.28);
}
