import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getBackendUrl } from "./api";
import {
  isExlabAmbientOn,
  playExlabFocus,
  playExlabHit,
  playExlabIntro,
  playExlabUnfocus,
  playExlabWhoosh,
  setExlabAmbientMuted,
  startExlabAmbient,
  stopExlabAmbient,
  unlockExlabAudio,
} from "./exlabSound";
import "./ExhibitionLab.css";

const POLL_MS = 4000;

/**
 * Creative Space config (ported from gionatannese.com chunk).
 * Design units are mapped to world via du() = design * (2*z*tan(fov/2) / viewH).
 */
const CFG = {
  radiusX: 250,
  radiusY: 250,
  radiusZ: 250,
  planeSize: 82,
  randomness: 0,
  dragSpeed: 0.001,
  wheelSpeed: 2e-4,
  friction: 0.94,
  smoothing: 0.11,
  autoSpeed: 0.001,
  /** Pause auto while dragging/wheeling; resume after this idle (ms) */
  autoResumeMs: 850,
  spinTilt: 23,
  spinTiltDir: 0,
  expandHeightVh: 70,
  expandPush: 1.8,
  expandDuration: 0.8,
  logoOrbitRadius: 240,
  mobileCircleScale: 0.75,
  logoSize: 70,
  logoStartAngle: -90,
  logoStagger: 0.1,
  logoFadeDuration: 1,
  circleSpin: 0.5, // deg / frame @ 60fps
  fastSpinDelay: 1.3,
  fastSpinMult: 7.3,
  fastSpinRampDur: 1,
  collapseDelay: 0.8,
  collapseDuration: 1.25,
  collapseStagger: 0.05,
  stackGap: 1.5,
  centerScaleEnabled: true,
  centerScaleRatio: 120 / 82,
  explodeDelay: 0.2,
  explodeDuration: 1,
  explodeOvershoot: 0.1,
  spinMigrate: 0.012,
  bloomBreath: 0.05,
  introCircleCount: 10,
};

const MAX_TILES = 18;

const SEED_PHOTOS = Array.from({ length: 22 }, (_, i) => {
  const n = i + 1;
  return `/featuredBoard/FeaturedBoard-${n}.jpg`;
});

const resolvePhotoUrl = (url) => {
  if (!url) return "";
  if (
    url.startsWith("http") ||
    url.startsWith("data:") ||
    url.startsWith("/featuredBoard")
  ) {
    return url;
  }
  return `${getBackendUrl()}${url}`;
};

const uniqueUrls = (list) => {
  const seen = new Set();
  const out = [];
  for (const u of list) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
};

const padIndex = (n) => String(Math.max(1, n)).padStart(3, "0");

/** GSAP-like easings used by the reference */
const easePower2In = (t) => t * t;
const easePower2InOut = (t) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const easePower3Out = (t) => 1 - (1 - t) ** 3;
const easePower4Out = (t) => 1 - (1 - t) ** 4;
const easeBackOut = (t, c1 = 1.7) => {
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

/** Fibonacci sphere unit vector (same as reference eH) */
const fibonacciUnit = (i, n) => {
  const step = 2 / n;
  const y = i * step - 1 + step / 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
};

const prepTexture = (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);
  tex.needsUpdate = true;
  return tex;
};

const loadTexture = (loader, url) =>
  new Promise((resolve) => {
    loader.load(
      url,
      (tex) => resolve(prepTexture(tex)),
      undefined,
      () => resolve(null)
    );
  });

/**
 * SceneLapse Creative Space lab — portable export.
 * Pass `photoUrls` to skip polling, or set REACT_APP_BACKEND_URL / VITE_BACKEND_URL.
 */
const ExhibitionLab = ({
  photoUrls: photoUrlsProp,
  photosEndpoint,
  pollMs = POLL_MS,
  homeHref = "/",
  secondaryHref = "/exhibition",
  tertiaryHref = "/photobooth",
  logoSrc = "/logo/logoSceneLapse-Green.svg",
  maxTiles = MAX_TILES,
  hideChrome = false,
} = {}) => {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const tileLimit = Math.max(1, Number(maxTiles) || MAX_TILES);

  const [urls, setUrls] = useState(() =>
    photoUrlsProp?.length
      ? uniqueUrls(photoUrlsProp).slice(0, tileLimit)
      : SEED_PHOTOS.slice(0, tileLimit)
  );
  const [phase, setPhase] = useState("loading"); // loading | intro | ready
  const [soundOn, setSoundOn] = useState(false);
  const [focusIndex, setFocusIndex] = useState(null);
  const [counter, setCounter] = useState(1);
  const [sideVisible, setSideVisible] = useState(false);
  const [draggingUi, setDraggingUi] = useState(false);
  const [centerVisible, setCenterVisible] = useState(false);

  const urlList = useMemo(
    () => uniqueUrls(urls).slice(0, tileLimit),
    [urls, tileLimit]
  );

  useEffect(() => {
    if (photoUrlsProp?.length) {
      setUrls(uniqueUrls(photoUrlsProp).slice(0, tileLimit));
      return undefined;
    }

    let cancelled = false;
    const endpoint =
      photosEndpoint || `${getBackendUrl()}/exhibition/photos`;
    const fetchPhotos = async () => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || data?.success === false) return;
        const list = Array.isArray(data.photos)
          ? data.photos
          : Array.isArray(data)
          ? data
          : [];
        const live = list
          .map((p) => resolvePhotoUrl(p?.url || p))
          .filter(Boolean);
        setUrls(uniqueUrls([...live, ...SEED_PHOTOS]).slice(0, tileLimit));
      } catch {
        /* keep seeds */
      }
    };
    fetchPhotos();
    const id = setInterval(fetchPhotos, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [photoUrlsProp, photosEndpoint, pollMs]);

  useEffect(() => () => stopExlabAmbient(), []);

  useEffect(() => {
    apiRef.current?.syncUrls?.(urlList);
  }, [urlList]);

  const toggleSound = useCallback(() => {
    unlockExlabAudio();
    if (isExlabAmbientOn()) {
      setExlabAmbientMuted(true);
      stopExlabAmbient();
      setSoundOn(false);
      return;
    }
    playExlabIntro();
    startExlabAmbient(0.42);
    setExlabAmbientMuted(false);
    setSoundOn(true);
  }, []);

  const clearFocusUi = useCallback(() => {
    apiRef.current?.clearFocus?.();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    const initialUrls = urlList.length
      ? urlList
      : SEED_PHOTOS.slice(0, tileLimit);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f2f2);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    const sharedGeo = new THREE.PlaneGeometry(1, 1);
    const cards = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const loader = new THREE.TextureLoader();

    const rootQuat = new THREE.Quaternion();
    const invRootQuat = new THREE.Quaternion();
    const spinAxis = new THREE.Vector3(0, 1, 0);
    const migrateAxis = new THREE.Vector3(0, 1, 0);
    const qDelta = new THREE.Quaternion();
    const focusTarget = new THREE.Vector3();
    const tmpV = new THREE.Vector3();
    const circlePos = new THREE.Vector3();

    let viewH = 1;
    let viewW = 1;
    let isMobile = false;
    let planeSize = CFG.planeSize;
    let centerScale = planeSize * CFG.centerScaleRatio;

    /** design-unit → world (matches reference e_) */
    const du = (v) =>
      v * ((2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)) / viewH);

    const circleScale = () => (isMobile ? CFG.mobileCircleScale : 1);

    const setSpinAxis = () => {
      const e = (CFG.spinTilt * Math.PI) / 180;
      const d = (CFG.spinTiltDir * Math.PI) / 180;
      const r = Math.sin(e);
      spinAxis
        .set(r * Math.cos(d), Math.cos(e), r * Math.sin(d))
        .normalize();
    };
    setSpinAxis();
    migrateAxis.copy(spinAxis);

    const state = {
      phase: "loading",
      ready: false,
      introT0: 0,
      circleAngle: 0,
      ramp: 0,
      rampActive: false,
      collapsing: false,
      exploding: false,
      exploded: false,
      // Orbit: vel → accumulate → smooth → apply delta
      velYaw: 0,
      velPitch: 0,
      accYaw: 0,
      accPitch: 0,
      smYaw: 0,
      smPitch: 0,
      prevSmYaw: 0,
      prevSmPitch: 0,
      dragging: false,
      moved: false,
      autoPaused: false,
      autoResumeAt: 0,
      lastX: 0,
      lastY: 0,
      focus: null,
      expand: 0,
      expandTarget: 0,
      migrateSpin: CFG.autoSpeed,
      migrating: false,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      lastCounter: 1,
      knownUrls: [],
      pendingUrls: null,
    };

    const applyPlaneSize = () => {
      planeSize = isMobile ? 60 : 82;
      centerScale = planeSize * CFG.centerScaleRatio;
    };

    const basePosFor = (i, count) => {
      const n = Math.max(1, count);
      const unit = fibonacciUnit(i, n);
      // mobile: fit sphere to width like reference eU
      let rxW;
      let ryW;
      let rzW;
      if (isMobile) {
        const worldPerPx =
          (2 *
            camera.position.z *
            Math.tan((camera.fov * Math.PI) / 360) *
            camera.aspect) /
          viewW;
        const fit = Math.max(
          0,
          ((viewW - 48) / 2) * worldPerPx - du(planeSize) / 2
        );
        rxW = ryW = rzW = fit;
      } else {
        rxW = du(CFG.radiusX);
        ryW = du(CFG.radiusY);
        rzW = du(CFG.radiusZ);
      }
      return new THREE.Vector3(unit.x * rxW, unit.y * ryW, unit.z * rzW);
    };

    const baseScaleFor = (aspect) => {
      const t = du(planeSize);
      if (aspect >= 1) return { x: t, y: t / aspect };
      return { x: t * aspect, y: t };
    };

    const centerScaleFor = (aspect) => {
      const t = du(centerScale);
      if (aspect >= 1) return { x: t, y: t / aspect };
      return { x: t * aspect, y: t };
    };

    const logoScaleFor = (aspect) => {
      const t = du(CFG.logoSize) * circleScale();
      if (aspect >= 1) return { x: t, y: t / aspect };
      return { x: t * aspect, y: t };
    };

    const circleSlotPos = (slot, out) => {
      const r = du(CFG.logoOrbitRadius) * circleScale();
      const a =
        ((CFG.logoStartAngle + 36 * slot) * Math.PI) / 180 + state.circleAngle;
      out.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      return out;
    };

    const resize = () => {
      viewW = mount.clientWidth || window.innerWidth;
      viewH = mount.clientHeight || window.innerHeight;
      isMobile = viewW <= 640;
      camera.aspect = viewW / Math.max(1, viewH);
      camera.updateProjectionMatrix();
      renderer.setSize(viewW, viewH, false);
      applyPlaneSize();
      // refresh homes / scales if already built
      cards.forEach((mesh, i) => {
        const d = mesh.userData;
        d.basePos.copy(basePosFor(i, cards.length));
        const bs = baseScaleFor(d.aspect);
        d.baseScale.set(bs.x, bs.y, 1);
      });
    };
    resize();

    const makeCard = (tex, i, url, inCircle) => {
      const aspect =
        tex?.image?.width && tex?.image?.height
          ? tex.image.width / tex.image.height
          : 0.75;
      const mat = new THREE.MeshBasicMaterial({
        map: tex || null,
        color: tex ? 0xffffff : 0xe4e2dc,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(sharedGeo, mat);
      const bs = baseScaleFor(aspect);
      mesh.userData = {
        index: i,
        url,
        aspect,
        inCircle,
        intro: inCircle,
        collapse: 0,
        explode: 0,
        expand: 0,
        stackZ: 0,
        basePos: basePosFor(i, Math.max(initialUrls.length, 1)),
        baseScale: new THREE.Vector3(bs.x, bs.y, 1),
        expStartPos: new THREE.Vector3(),
        expStartScale: { x: 0.01, y: 0.01 },
        s0x: 0.01,
        s0y: 0.01,
        spawnT: null,
      };
      mesh.scale.set(0.01, 0.01, 1);
      mesh.visible = inCircle;
      root.add(mesh);
      return mesh;
    };

    const rebuildHomes = () => {
      cards.forEach((mesh, i) => {
        const d = mesh.userData;
        d.basePos.copy(basePosFor(i, cards.length));
        const bs = baseScaleFor(d.aspect);
        d.baseScale.set(bs.x, bs.y, 1);
      });
    };

    const buildCards = async (list) => {
      const n = Math.min(list.length, tileLimit);
      const textures = await Promise.all(
        list.slice(0, n).map((u) => loadTexture(loader, u))
      );
      if (disposed) {
        textures.forEach((t) => t?.dispose());
        return;
      }

      const circleN = Math.min(CFG.introCircleCount, n);
      textures.forEach((tex, i) => {
        const mesh = makeCard(tex, i, list[i], i < circleN);
        cards.push(mesh);
      });
      rebuildHomes();
      state.knownUrls = list.slice(0, n);
      state.ready = true;
      state.phase = "intro";
      state.introT0 = clock.getElapsedTime();
      if (!disposed) {
        setPhase("intro");
        setCenterVisible(true);
        unlockExlabAudio();
        playExlabIntro();
        startExlabAmbient(0.32);
        setSoundOn(true);
      }
    };

    const syncUrls = async (list) => {
      if (!state.ready || disposed) return;
      const next = uniqueUrls(list).slice(0, tileLimit);
      const known = new Set(state.knownUrls);
      const fresh = next.filter((u) => !known.has(u));
      if (!fresh.length) return;

      if (state.phase !== "ready") {
        state.pendingUrls = next;
        return;
      }

      for (const url of fresh) {
        if (cards.length >= tileLimit) break;
        const i = cards.length;
        const tex = await loadTexture(loader, url);
        if (disposed) {
          tex?.dispose();
          return;
        }
        const mesh = makeCard(tex, i, url, false);
        mesh.visible = true;
        mesh.material.opacity = 0;
        mesh.position.copy(mesh.userData.basePos);
        mesh.userData.spawnT = clock.elapsedTime;
        cards.push(mesh);
        state.knownUrls.push(url);
      }
      rebuildHomes();
    };

    const pointerNdc = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pauseAuto = (resumeMs = CFG.autoResumeMs) => {
      state.autoPaused = true;
      state.autoResumeAt = performance.now() + resumeMs;
      state.migrating = false;
    };

    const clearFocus = () => {
      if (state.focus == null) return;
      playExlabUnfocus();
      state.focus = null;
      state.expandTarget = 0;
      // After overview, ease auto spin back in
      pauseAuto(400);
      setFocusIndex(null);
    };

    const onPointerDown = (event) => {
      if (state.phase !== "ready") return;
      if (event.target.closest?.("a,button")) return;
      // Only orbit from stage/canvas — ignore chrome
      if (!mount.contains(event.target) && event.target !== renderer.domElement) {
        return;
      }
      event.preventDefault();
      state.dragging = true;
      state.moved = false;
      pauseAuto(CFG.autoResumeMs);
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      try {
        renderer.domElement.setPointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
      setDraggingUi(true);
    };

    const onPointerMove = (event) => {
      if (!state.dragging || state.phase !== "ready") return;
      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;
      if (Math.hypot(dx, dy) > 4) state.moved = true;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      // Impulse into velocity (integrated each frame)
      state.velYaw += dx * CFG.dragSpeed;
      state.velPitch += dy * CFG.dragSpeed;
      if (state.moved) {
        playExlabWhoosh(Math.min(4.2, Math.hypot(dx, dy) * 0.1));
        // Keep resume delayed while actively dragging
        state.autoResumeAt = performance.now() + CFG.autoResumeMs;
      }
    };

    const onPointerUp = (event) => {
      if (!state.dragging) return;
      state.dragging = false;
      setDraggingUi(false);
      try {
        renderer.domElement.releasePointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
      // After a drag, schedule soft return to auto orbit
      if (state.moved) {
        state.autoResumeAt = performance.now() + CFG.autoResumeMs;
      }
      if (state.phase !== "ready" || state.moved) return;

      pointerNdc(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(cards, false);
      if (!hits.length) {
        if (state.focus != null) clearFocus();
        return;
      }
      const mesh = hits[0].object;
      const idx = mesh.userData.index;
      if (state.focus === idx) {
        clearFocus();
        return;
      }
      playExlabFocus();
      state.focus = idx;
      state.expandTarget = 1;
      state.autoPaused = true; // hold while focused
      setFocusIndex(idx);
      setCounter(idx + 1);
      setSoundOn(true);
    };

    const onWheel = (event) => {
      if (state.phase !== "ready") return;
      if (!mount.contains(event.target) && event.target !== renderer.domElement) {
        return;
      }
      event.preventDefault();
      pauseAuto(CFG.autoResumeMs);
      state.velYaw +=
        event.deltaY * CFG.wheelSpeed + event.deltaX * CFG.wheelSpeed;
      playExlabWhoosh(
        Math.min(3.8, Math.abs(event.deltaY + event.deltaX) * 0.018)
      );
    };

    const onResize = () => resize();
    const stageEl = renderer.domElement;
    stageEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    stageEl.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    let raf = 0;
    const clock = new THREE.Clock();

    const introCircleCards = () =>
      cards.filter((m) => m.userData.inCircle).slice(0, CFG.introCircleCount);

    const updateIntro = (t) => {
      const circle = introCircleCards();
      const nCircle = Math.max(1, circle.length);

      // Fade / scale-in (logoStagger + logoFadeDuration + back.out)
      circle.forEach((mesh, i) => {
        const d = mesh.userData;
        const local = THREE.MathUtils.clamp(
          (t - i * CFG.logoStagger) / CFG.logoFadeDuration,
          0,
          1
        );
        const fade = easePower3Out(local);
        const pop = easeBackOut(local);
        const ls = logoScaleFor(d.aspect);
        d.s0x = ls.x * pop;
        d.s0y = ls.y * pop;
        mesh.material.opacity = fade;
        mesh.visible = true;
        mesh.scale.set(Math.max(0.01, d.s0x), Math.max(0.01, d.s0y), 1);
      });

      // Ramp schedule
      if (!state.rampActive && t >= CFG.fastSpinDelay) {
        state.rampActive = true;
      }
      if (state.rampActive && !state.collapsing && !state.exploding) {
        const u = THREE.MathUtils.clamp(
          (t - CFG.fastSpinDelay) / CFG.fastSpinRampDur,
          0,
          1
        );
        state.ramp = easePower2In(u);
      }

      // Collapse start
      const collapseT0 = CFG.fastSpinDelay + CFG.collapseDelay;
      if (!state.collapsing && t >= collapseT0) {
        state.collapsing = true;
        setCenterVisible(false);
        playExlabHit(false); // one accent only — not a rapid tick loop
        const gap = du(CFG.stackGap);
        circle.forEach((mesh, i) => {
          mesh.userData.stackZ = i * gap;
          mesh.renderOrder = 20 + i;
        });
      }

      // Explode start (after last staggered collapse + delay)
      const explodeT0 =
        collapseT0 +
        (Math.max(0, nCircle - 1) * CFG.collapseStagger +
          CFG.collapseDuration) +
        CFG.explodeDelay;
      if (!state.exploding && t >= explodeT0) {
        state.exploding = true;
        state.exploded = true;
        setSpinAxis();
        migrateAxis.copy(spinAxis);
        state.migrateSpin = CFG.autoSpeed;
        state.migrating = true;
        state.ramp = 0;
        state.rampActive = false;
        playExlabHit(true);
        playExlabWhoosh(2.4);

        cards.forEach((mesh) => {
          const d = mesh.userData;
          d.expStartPos.copy(mesh.position);
          d.expStartScale = { x: mesh.scale.x, y: mesh.scale.y };
          if (!d.inCircle) {
            const csc = centerScaleFor(d.aspect);
            d.expStartScale = { x: csc.x, y: csc.y };
            d.expStartPos.set(0, 0, 0);
            mesh.material.opacity = 1;
          }
          d.explode = 0;
          mesh.visible = true;
          mesh.renderOrder = 0;
        });
      }

      // Counter from spin
      const spinIdx =
        ((Math.floor(
          ((state.circleAngle / (Math.PI * 2)) * nCircle) % nCircle
        ) +
          nCircle) %
          nCircle) +
        1;
      if (state.lastCounter !== spinIdx) {
        state.lastCounter = spinIdx;
        setCounter(spinIdx);
      }
    };

    const applyIntroPositions = (t, dt) => {
      const circle = introCircleCards();
      const nCircle = Math.max(1, circle.length);
      const collapseT0 = CFG.fastSpinDelay + CFG.collapseDelay;
      const explodeT0 =
        collapseT0 +
        (Math.max(0, nCircle - 1) * CFG.collapseStagger +
          CFG.collapseDuration) +
        CFG.explodeDelay;

      if (!state.exploding) {
        const mult = 1 + (CFG.fastSpinMult - 1) * state.ramp;
        // circleSpin is deg/frame @60fps → rad/sec
        state.circleAngle +=
          CFG.circleSpin * mult * (Math.PI / 180) * 60 * dt;
      }

      if (!state.exploding) {
        const csc = du(centerScale);
        circle.forEach((mesh, i) => {
          const d = mesh.userData;
          circleSlotPos(i, circlePos);

          if (state.collapsing) {
            const local = THREE.MathUtils.clamp(
              (t - collapseT0 - i * CFG.collapseStagger) /
                CFG.collapseDuration,
              0,
              1
            );
            d.collapse = easePower2InOut(local);
            const n = d.collapse;
            const z = (d.stackZ || 0) * n;
            mesh.position.set(circlePos.x * (1 - n), circlePos.y * (1 - n), z);
            if (CFG.centerScaleEnabled) {
              const target =
                d.aspect >= 1
                  ? { x: csc, y: csc / d.aspect }
                  : { x: csc * d.aspect, y: csc };
              mesh.scale.set(
                d.s0x + (target.x - d.s0x) * n,
                d.s0y + (target.y - d.s0y) * n,
                1
              );
            }
          } else {
            mesh.position.copy(circlePos);
          }
          // Face camera (flat on XY during intro)
          mesh.quaternion.identity();
        });
        // Hide non-circle until explode
        cards.forEach((mesh) => {
          if (!mesh.userData.inCircle) {
            mesh.visible = false;
            mesh.material.opacity = 0;
          }
        });
        return;
      }

      // Exploding → sphere
      const uRaw = THREE.MathUtils.clamp(
        (t - explodeT0) / CFG.explodeDuration,
        0,
        1
      );
      const u = easePower3Out(uRaw);
      cards.forEach((mesh) => {
        const d = mesh.userData;
        d.explode = u;
        const over = 1 + CFG.explodeOvershoot * Math.sin(Math.PI * u);
        mesh.position.set(
          (d.expStartPos.x + (d.basePos.x - d.expStartPos.x) * u) * over,
          (d.expStartPos.y + (d.basePos.y - d.expStartPos.y) * u) * over,
          (d.expStartPos.z + (d.basePos.z - d.expStartPos.z) * u) * over
        );
        mesh.scale.set(
          d.expStartScale.x + (d.baseScale.x - d.expStartScale.x) * u,
          d.expStartScale.y + (d.baseScale.y - d.expStartScale.y) * u,
          1
        );
        mesh.material.opacity = 1;
        mesh.visible = true;
        mesh.quaternion.copy(invRootQuat);
      });

      if (uRaw >= 1) enterReady();
    };

    const enterReady = () => {
      if (state.phase === "ready" || disposed) return;
      state.phase = "ready";
      setPhase("ready");
      setSideVisible(true);
      setCounter(1);
      setSpinAxis();
      migrateAxis.copy(spinAxis);
      state.migrateSpin = CFG.autoSpeed;
      state.migrating = true;
      if (state.pendingUrls) {
        syncUrls(state.pendingUrls);
        state.pendingUrls = null;
      }
    };

    const updateReady = (elapsed, dt) => {
      // Integrate velocity → accumulated angle, then smooth (GN-style)
      state.accYaw += state.velYaw;
      state.accPitch += state.velPitch;
      state.velYaw *= CFG.friction;
      state.velPitch *= CFG.friction;
      state.smYaw += (state.accYaw - state.smYaw) * CFG.smoothing;
      state.smPitch += (state.accPitch - state.smPitch) * CFG.smoothing;

      const dYaw = state.smYaw - state.prevSmYaw;
      const dPitch = state.smPitch - state.prevSmPitch;
      state.prevSmYaw = state.smYaw;
      state.prevSmPitch = state.smPitch;

      if (Math.abs(dYaw) > 1e-8) {
        qDelta.setFromAxisAngle(tmpV.set(0, 1, 0), dYaw);
        rootQuat.premultiply(qDelta);
      }
      if (Math.abs(dPitch) > 1e-8) {
        qDelta.setFromAxisAngle(tmpV.set(1, 0, 0), dPitch);
        rootQuat.premultiply(qDelta);
      }

      // After user stops dragging/wheeling, ease auto orbit back in
      const now = performance.now();
      if (
        state.autoPaused &&
        !state.dragging &&
        state.focus == null &&
        now >= state.autoResumeAt
      ) {
        state.autoPaused = false;
        state.migrating = true;
        // Start from residual flick, then migrate to autoSpeed
        const residual = Math.max(
          0,
          Math.min(CFG.autoSpeed * 2.5, Math.abs(state.velYaw) * 0.85)
        );
        state.migrateSpin = residual || CFG.autoSpeed * 0.15;
        migrateAxis.copy(spinAxis);
      }

      const autoOk =
        CFG.autoSpeed &&
        !state.dragging &&
        !state.autoPaused &&
        state.focus == null;

      if (autoOk && state.migrating) {
        if (Math.abs(state.migrateSpin) > 1e-7) {
          qDelta.setFromAxisAngle(migrateAxis, state.migrateSpin);
          rootQuat.premultiply(qDelta);
        }
        migrateAxis.lerp(spinAxis, CFG.spinMigrate).normalize();
        state.migrateSpin +=
          (CFG.autoSpeed - state.migrateSpin) * CFG.spinMigrate;
        if (
          migrateAxis.distanceToSquared(spinAxis) < 1e-6 &&
          Math.abs(state.migrateSpin - CFG.autoSpeed) < 1e-7
        ) {
          state.migrating = false;
        }
      } else if (autoOk && !state.migrating) {
        qDelta.setFromAxisAngle(spinAxis, CFG.autoSpeed);
        rootQuat.premultiply(qDelta);
      }

      rootQuat.normalize();
      root.quaternion.copy(rootQuat);
      invRootQuat.copy(rootQuat).invert();

      // Expand ease toward target
      const expandSpeed = 1 / Math.max(0.05, CFG.expandDuration);
      if (state.expand < state.expandTarget) {
        state.expand = Math.min(
          state.expandTarget,
          state.expand + dt * expandSpeed
        );
      } else if (state.expand > state.expandTarget) {
        state.expand = Math.max(
          state.expandTarget,
          state.expand - dt * expandSpeed * 1.15
        );
      }
      const expandU = easePower4Out(
        THREE.MathUtils.clamp(state.expand, 0, 1)
      );

      // Focus height in world units (expandHeightVh)
      const visibleH =
        2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
      const focusH = (CFG.expandHeightVh / 100) * visibleH;
      focusTarget.set(0, 0, 0);

      // Push non-focused cards outward while one is expanded
      const push = 1 + (CFG.expandPush - 1) * (expandU > 1e-4 ? expandU : 0);

      cards.forEach((mesh) => {
        const d = mesh.userData;
        const focused = state.focus === d.index;
        d.expand = focused ? expandU : 0;

        let targetH = focusH;
        let targetW = targetH * d.aspect;
        // keep within width
        const maxW = visibleH * camera.aspect * 0.92;
        if (targetW > maxW) {
          targetW = maxW;
          targetH = targetW / d.aspect;
        }

        const sx =
          d.baseScale.x + (targetW - d.baseScale.x) * d.expand;
        const sy =
          d.baseScale.y + (targetH - d.baseScale.y) * d.expand;

        let px = d.basePos.x;
        let py = d.basePos.y;
        let pz = d.basePos.z;
        if (d.expand < 1e-4) {
          px *= push;
          py *= push;
          pz *= push;
        }

        if (focused && d.expand > 0) {
          mesh.position.set(
            px + (focusTarget.x - px) * d.expand,
            py + (focusTarget.y - py) * d.expand,
            pz + (focusTarget.z - pz) * d.expand
          );
        } else {
          mesh.position.set(px, py, pz);
        }

        // Soft spawn pop for late-arriving cards
        let scaleMul = 1;
        if (d.spawnT != null) {
          const age = elapsed - d.spawnT;
          const pop = Math.min(1, age / 0.55);
          scaleMul = easeBackOut(pop);
          mesh.material.opacity = Math.min(1, age / 0.35);
        } else {
          mesh.material.opacity = THREE.MathUtils.lerp(
            mesh.material.opacity,
            state.focus == null ? 1 : focused ? 1 : 0.42,
            1 - Math.exp(-dt * 8)
          );
        }

        mesh.scale.set(sx * scaleMul, sy * scaleMul, 1);
        mesh.quaternion.copy(invRootQuat);
        mesh.renderOrder = focused ? 10 : 0;
        mesh.visible = true;
      });

      // Orbit counter
      if (state.focus == null && cards.length) {
        const e = new THREE.Euler().setFromQuaternion(rootQuat, "YXZ");
        const idx =
          ((Math.floor(
            (((e.y % (Math.PI * 2)) + Math.PI * 2) /
              ((Math.PI * 2) / cards.length)) %
              cards.length
          ) +
            cards.length) %
            cards.length) +
          1;
        if (state.lastCounter !== idx) {
          state.lastCounter = idx;
          setCounter(idx);
        }
      }
    };

    const animate = () => {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.033, clock.getDelta());
      const elapsed = clock.elapsedTime;

      if (!state.ready) {
        renderer.render(scene, camera);
        return;
      }

      if (state.phase === "intro") {
        root.quaternion.identity();
        rootQuat.identity();
        invRootQuat.identity();
        if (state.reducedMotion) {
          cards.forEach((mesh) => {
            mesh.position.copy(mesh.userData.basePos);
            mesh.scale.copy(mesh.userData.baseScale);
            mesh.material.opacity = 1;
            mesh.visible = true;
            mesh.quaternion.copy(invRootQuat);
          });
          enterReady();
        } else {
          const t = elapsed - state.introT0;
          updateIntro(t);
          applyIntroPositions(t, dt);
        }
      } else if (state.phase === "ready") {
        updateReady(elapsed, dt);
      }

      renderer.render(scene, camera);
    };

    apiRef.current = {
      getPhase: () => state.phase,
      syncUrls,
      clearFocus,
    };

    buildCards(initialUrls).then(() => {
      if (!disposed) animate();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      stageEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      stageEl.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      cards.forEach((m) => {
        if (m.material.map) m.material.map.dispose();
        m.material.dispose();
      });
      sharedGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; URLs sync via apiRef
  }, []);

  return (
    <main
      className={`exlab phase-${phase}${sideVisible ? " is-side-on" : ""}${
        draggingUi ? " is-dragging" : ""
      }${focusIndex != null ? " is-focused" : ""}`}
      aria-label="SceneLapse Creative Space lab"
    >
      <p className="exlab-sr-only">
        Creative Space. Cards orbit, collapse, then explode onto a sphere. Drag
        to orbit. Click a photo to focus.
      </p>

      <header className="exlab-chrome-top">
        {!hideChrome ? (
          <>
            <a href={homeHref} className="exlab-brand" draggable={false}>
              SL
            </a>
            <nav className="exlab-pills" aria-label="Lab sections">
              <span className="exlab-pill is-active">
                <span className="exlab-pill-label">Creative Space</span>
                <sup>1</sup>
              </span>
              <a
                href={secondaryHref}
                className="exlab-pill exlab-pill-num"
                draggable={false}
              >
                <span className="exlab-pill-label">2</span>
              </a>
              <a
                href={tertiaryHref}
                className="exlab-pill exlab-pill-num"
                draggable={false}
              >
                <span className="exlab-pill-label">3</span>
              </a>
            </nav>
          </>
        ) : null}
        <button
          type="button"
          className={`exlab-sound${soundOn ? " is-on" : ""}`}
          aria-label={soundOn ? "Turn off sound" : "Turn on sound"}
          aria-pressed={soundOn}
          onClick={toggleSound}
        >
          <span className="exlab-sound-dot" />
        </button>
      </header>

      <section className="exlab-stage" ref={mountRef} />

      <div
        className={`exlab-center-mark${centerVisible ? " is-visible" : ""}`}
        aria-hidden
      >
        <img src={logoSrc} alt="" />
      </div>

      {!hideChrome ? (
        <div className="exlab-side" aria-hidden={!sideVisible}>
          <span className="exlab-side-left">
            <span className="exlab-side-word" data-side-word>
              SceneLapse
            </span>
          </span>
          <span className="exlab-side-right">
            <span className="exlab-side-word" data-side-word>
              Photobooth
            </span>
            <span className="exlab-side-word" data-side-word>
              Exhibition
            </span>
          </span>
        </div>
      ) : null}

      <div className="exlab-edge" aria-hidden />

      <footer className="exlab-chrome-bottom">
        {focusIndex != null ? (
          <>
            <div className="exlab-index-wrap" aria-live="polite">
              <p key={focusIndex} className="exlab-index-num">
                {padIndex(focusIndex + 1)}
              </p>
            </div>
            <button
              type="button"
              className="exlab-overview"
              onClick={clearFocusUi}
            >
              Overview
            </button>
          </>
        ) : phase === "ready" ? (
          <div className="exlab-index-wrap" aria-hidden>
            <p className="exlab-index-num is-idle">{padIndex(counter)}</p>
          </div>
        ) : (
          <p className="exlab-hint">
            {phase === "loading" ? "Loading…" : "Opening"}
          </p>
        )}
      </footer>
    </main>
  );
};

export default ExhibitionLab;
