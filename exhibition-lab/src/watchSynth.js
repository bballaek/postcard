/** Web Audio synth patches (from my-focus / Nalika watch UI). */

export const PATCHES = {
  tap: {
    source: { type: "sine", frequency: 1300, fm: { ratio: 0.5, depth: 100 } },
    envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.005 },
    gain: 0.2,
  },
  switch: {
    source: {
      type: "sine",
      frequency: { start: 1100, end: 1500 },
      fm: { ratio: 0.5, depth: 50 },
    },
    envelope: { attack: 0, decay: 0.05, sustain: 0, release: 0.015 },
    gain: 0.18,
  },
  click: {
    source: {
      type: "sine",
      frequency: { start: 200, end: 700 },
      fm: { ratio: 0.5, depth: 80 },
    },
    envelope: { attack: 0, decay: 0.06, sustain: 0, release: 0.02 },
    gain: 0.25,
  },
  expand: {
    source: { type: "sine", frequency: { start: 500, end: 700 } },
    envelope: { attack: 0.003, decay: 0.1, sustain: 0.02, release: 0.04 },
    gain: 0.12,
  },
  collapse: {
    source: { type: "sine", frequency: { start: 700, end: 500 } },
    envelope: { attack: 0.003, decay: 0.1, sustain: 0.02, release: 0.04 },
    gain: 0.12,
  },
  cancel: {
    source: { type: "sine", frequency: { start: 400, end: 150 } },
    envelope: { attack: 0, decay: 0.08, sustain: 0, release: 0.025 },
    gain: 0.25,
  },
  holdEnd: {
    layers: [
      {
        source: { type: "sine", frequency: { start: 220, end: 90 } },
        envelope: { attack: 0, decay: 0.12, sustain: 0, release: 0.04 },
        gain: 0.32,
      },
      {
        source: { type: "sine", frequency: { start: 180, end: 70 } },
        envelope: { attack: 0, decay: 0.14, sustain: 0, release: 0.05 },
        delay: 0.07,
        gain: 0.28,
      },
    ],
  },
  holdArm: {
    source: {
      type: "sine",
      frequency: { start: 880, end: 1200 },
      fm: { ratio: 0.5, depth: 40 },
    },
    envelope: { attack: 0, decay: 0.04, sustain: 0, release: 0.02 },
    gain: 0.2,
  },
  toggleOn: {
    layers: [
      {
        source: { type: "sine", frequency: 2093 },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        gain: 0.2,
      },
      {
        source: { type: "sine", frequency: 3136 },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        delay: 0.025,
        gain: 0.2,
      },
    ],
  },
  toggleOff: {
    layers: [
      {
        source: { type: "sine", frequency: 3136 },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        gain: 0.2,
      },
      {
        source: { type: "sine", frequency: 2093 },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
        delay: 0.025,
        gain: 0.2,
      },
    ],
  },
  tick: {
    source: { type: "sine", frequency: 1500, fm: { ratio: 0.5, depth: 60 } },
    envelope: { attack: 0, decay: 0.008, sustain: 0, release: 0.004 },
    gain: 0.22,
  },
  countdownTick: {
    source: { type: "sine", frequency: 1400, fm: { ratio: 0.5, depth: 50 } },
    envelope: { attack: 0, decay: 0.008, sustain: 0, release: 0.004 },
    gain: 0.18,
  },
  finalTick: {
    source: {
      type: "sine",
      frequency: { start: 1700, end: 2100 },
      fm: { ratio: 0.5, depth: 80 },
    },
    envelope: { attack: 0, decay: 0.04, sustain: 0, release: 0.02 },
    gain: 0.32,
  },
  watchPreview: {
    layers: [
      {
        source: { type: "sine", frequency: 1500, fm: { ratio: 0.5, depth: 60 } },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.006 },
        gain: 0.3,
      },
      {
        source: { type: "sine", frequency: 1500, fm: { ratio: 0.5, depth: 60 } },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.006 },
        delay: 0.18,
        gain: 0.3,
      },
      {
        source: { type: "sine", frequency: 1500, fm: { ratio: 0.5, depth: 60 } },
        envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.006 },
        delay: 0.36,
        gain: 0.3,
      },
    ],
  },
  confirm: {
    layers: [
      {
        source: { type: "sine", frequency: 523 },
        envelope: { attack: 0.003, decay: 0.3, sustain: 0.06, release: 0.1 },
        gain: 0.16,
      },
      {
        source: { type: "sine", frequency: 659 },
        envelope: { attack: 0.003, decay: 0.28, sustain: 0.05, release: 0.1 },
        delay: 0.07,
        gain: 0.14,
      },
      {
        source: { type: "sine", frequency: { start: 784, end: 880 } },
        envelope: { attack: 0.003, decay: 0.32, sustain: 0.06, release: 0.12 },
        delay: 0.14,
        gain: 0.15,
      },
    ],
  },
  alert: {
    layers: [
      {
        source: { type: "sine", frequency: 523 },
        envelope: { attack: 0.003, decay: 0.35, sustain: 0.05, release: 0.1 },
        gain: 0.15,
      },
      {
        source: { type: "sine", frequency: 659 },
        envelope: { attack: 0.003, decay: 0.35, sustain: 0.05, release: 0.1 },
        delay: 0.015,
        gain: 0.13,
      },
      {
        source: { type: "sine", frequency: 784 },
        envelope: { attack: 0.003, decay: 0.35, sustain: 0.05, release: 0.1 },
        delay: 0.03,
        gain: 0.12,
      },
      {
        source: { type: "sine", frequency: { start: 1046, end: 1175 } },
        envelope: { attack: 0.003, decay: 0.3, sustain: 0.04, release: 0.12 },
        delay: 0.045,
        gain: 0.1,
      },
    ],
  },
};

let sharedCtx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** Call from a click/pointer handler so resume stays in the user gesture. */
export function unlockAudio() {
  const ctx = getCtx();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

function playLayer(ctx, patch, volume, when) {
  if (patch.layers) {
    for (const layer of patch.layers) {
      playLayer(ctx, layer, volume, when + (layer.delay ?? 0));
    }
    return;
  }

  const source = patch.source;
  const envelope = patch.envelope;
  if (!source || !envelope) return;

  const gainLevel = (patch.gain ?? 0.2) * Math.max(volume, 0.05);
  const attack = Math.max(envelope.attack, 0.001);
  const decay = Math.max(envelope.decay, 0.001);
  const sustain = Math.max(envelope.sustain, 0);
  const release = Math.max(envelope.release, 0.001);
  const dur = attack + decay + sustain + release;
  const start = when;

  const osc = ctx.createOscillator();
  osc.type = "sine";

  const freq = source.frequency;
  if (typeof freq === "number") {
    osc.frequency.setValueAtTime(freq, start);
  } else {
    osc.frequency.setValueAtTime(Math.max(freq.start, 1), start);
    osc.frequency.linearRampToValueAtTime(
      Math.max(freq.end, 1),
      start + Math.max(dur, 0.01)
    );
  }

  if (source.fm) {
    const mod = ctx.createOscillator();
    mod.type = "sine";
    const base = typeof freq === "number" ? freq : (freq.start + freq.end) / 2;
    mod.frequency.setValueAtTime(base * source.fm.ratio, start);
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(source.fm.depth, start);
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    mod.start(start);
    mod.stop(start + dur + 0.05);
  }

  const gain = ctx.createGain();
  const peak = Math.max(gainLevel, 0.0001);
  const aEnd = start + attack;
  const dEnd = aEnd + decay;
  const sEnd = dEnd + sustain;
  const rEnd = sEnd + release;

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, aEnd);
  const sustainLevel = Math.max(peak * (sustain > 0 ? 0.35 : 0.001), 0.0001);
  gain.gain.linearRampToValueAtTime(sustainLevel, dEnd);
  if (sustain > 0) {
    gain.gain.setValueAtTime(sustainLevel, sEnd);
  }
  gain.gain.linearRampToValueAtTime(0.0001, rEnd);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(rEnd + 0.02);
}

/** Play immediately inside a user gesture when possible. */
export function playPatch(patch, volume = 1) {
  const ctx = unlockAudio();
  if (!ctx) return;

  const go = () => playLayer(ctx, patch, volume, ctx.currentTime);

  if (ctx.state === "running") {
    go();
    return;
  }

  void ctx.resume().then(() => {
    if (ctx.state === "running") go();
  });
}
