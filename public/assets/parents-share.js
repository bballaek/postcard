import "/assets/postcard-card-Dn_Hk0Aw.js";

const page = document.getElementById("parentsPage");
const stageWrap = document.getElementById("shareStageWrap");
const stage = document.getElementById("shareStage");
const search = document.getElementById("parentsSearch");
const form = document.getElementById("parentsForm");
const otpRoot = document.getElementById("parentsOtp");
const otpInputs = otpRoot
  ? Array.from(otpRoot.querySelectorAll(".parents-otp__digit"))
  : [];
const submit = document.getElementById("parentsSubmit");
const errorEl = document.getElementById("parentsError");
const cardSlot = document.getElementById("shareCardSlot");
const raster = document.getElementById("sharePreviewRaster");
const frontImg = document.getElementById("shareCardFront");
const backImg = document.getElementById("shareCardBack");
const envelope = document.getElementById("parentsEnvelope");
const flipBtn = document.getElementById("parentsFlipBtn");
const letter = document.getElementById("parentsLetter");
const letterProgress = document.getElementById("parentsLetterProgress");
const letterBg = document.getElementById("parentsLetterBg");
const letterBody = letter
  ? letter.querySelector(".parents-letter__body")
  : null;
const exhibition = document.getElementById("parentsExhibition");
const exhibitionFrame = document.getElementById("parentsExhibitionFrame");
const lightbox = document.getElementById("parentsLightbox");
const lightboxImg = document.getElementById("parentsLightboxImg");
const lightboxClose = document.getElementById("parentsLightboxClose");
const lightboxX = document.getElementById("parentsLightboxX");

const OTP_LEN = 5;
const FLIP_MS = 550;
const TYPE_MS = 58;
const LETTER_HOLD_MS = 4200;
const SUBMIT_LABEL = submit ? submit.textContent : "View card";
const ENVELOPES = {
  modern: "/assets/welcome/modern/envelope.png",
  retro70: "/assets/welcome/retro/envelope.png",
  retro: "/assets/welcome/retro/envelope.png",
  vintage: "/assets/welcome/vintage/envelope.png",
};

const frame = window.FrameBackground
  ? window.FrameBackground.create({
      sheet: document.getElementById("shareSheet"),
      stamp: document.getElementById("shareStamp"),
      stampFill: document.getElementById("stampFill"),
      stampMask: document.getElementById("stampMask"),
      stampMaskFill: document.getElementById("stampMaskFill"),
      stampHoleCircles: document.getElementById("stampHoleCircles"),
    })
  : null;

let flipped = false;
let flipping = false;
let frontUrl = "";
let backUrl = "";
let scrapbookPhotoUrl = "";
let letterPhotoUrl = "";
let stageReady = false;

function onlyDigit(value) {
  const m = String(value || "").match(/\d/);
  return m ? m[0] : "";
}

function getStudentId() {
  return otpInputs.map((el) => onlyDigit(el.value)).join("");
}

function setStudentId(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, OTP_LEN).split("");
  otpInputs.forEach((el, i) => {
    el.value = digits[i] || "";
  });
}

function focusOtp(index) {
  const el = otpInputs[Math.max(0, Math.min(OTP_LEN - 1, index))];
  if (!el || el.disabled) return;
  el.focus();
  el.select();
}

function setError(msg) {
  if (!errorEl) return;
  if (!msg) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

function fitStage() {
  if (!stage || !page || !window.FrameBackground) return;
  const { DESIGN_W, DESIGN_H } = window.FrameBackground;
  const mobile = window.matchMedia("(max-width:900px)").matches;

  stage.style.transform = "";
  stage.style.width = "";
  stage.style.height = "";
  stage.style.margin = "";
  stage.style.transformOrigin = "";
  page.style.overflow = mobile ? "hidden" : "";
  if (stageWrap) {
    stageWrap.style.width = "";
    stageWrap.style.height = "";
    stageWrap.style.overflow = "";
  }

  if (frame) frame.fitStampSheet();
  if (mobile) return;

  const inset = frame ? frame.getInset() : 30;
  const vw = window.innerWidth - inset * 2;
  const vh = window.innerHeight - inset * 2;
  const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H, 1);
  page.style.overflow = scale < 1 ? "auto" : "hidden";
  if (scale < 1) {
    stage.style.transform = `scale(${scale})`;
    stage.style.transformOrigin = "top left";
    stage.style.width = `${DESIGN_W}px`;
    stage.style.height = `${DESIGN_H}px`;
    stage.style.margin = "0";
    if (stageWrap) {
      stageWrap.style.width = `${Math.ceil(DESIGN_W * scale)}px`;
      stageWrap.style.height = `${Math.ceil(DESIGN_H * scale)}px`;
      stageWrap.style.overflow = "hidden";
    }
  }
}

function showSearch() {
  if (!page) return;
  page.classList.add("is-search");
  page.classList.remove("is-result", "is-loading", "is-letter", "is-exhibition");
  if (search) {
    search.hidden = false;
    search.removeAttribute("hidden");
    search.classList.remove("is-leaving");
  }
  if (exhibition) {
    exhibition.hidden = true;
    exhibition.classList.remove("is-visible");
  }
  if (exhibitionFrame) exhibitionFrame.removeAttribute("src");
  if (letter) {
    letter.hidden = true;
    letter.classList.remove("is-visible");
  }
  if (letterBg) letterBg.removeAttribute("src");
  if (cardSlot) {
    cardSlot.hidden = true;
    cardSlot.classList.remove("is-visible");
  }
  if (flipBtn) flipBtn.hidden = true;
  if (raster) {
    raster.hidden = true;
    raster.classList.remove("is-active", "is-ready", "is-flipped");
    raster.setAttribute("aria-pressed", "false");
  }
  flipped = false;
  frontUrl = "";
  backUrl = "";
  scrapbookPhotoUrl = "";
  letterPhotoUrl = "";
  stageReady = true;
  fitStage();
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function hideSearch() {
  if (!search || search.hidden) return;
  search.classList.add("is-leaving");
  await wait(420);
  search.hidden = true;
}

function normalizeLetterSpace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function segmentGraphemes(text) {
  const value = String(text || "");
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("th", { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (part) => part.segment);
  }
  return Array.from(value);
}

function appendGrapheme(parent, grapheme) {
  const last = parent.lastChild;
  if (last && last.nodeType === Node.TEXT_NODE) {
    last.data += grapheme;
    return;
  }
  parent.appendChild(document.createTextNode(grapheme));
}

function captureLetterScript() {
  if (!letterBody || letterBody.dataset.scriptReady === "1") return;
  const nodes = letterBody.querySelectorAll(
    ".parents-letter__title, p:not(.parents-letter__sign), .parents-letter__sign",
  );
  nodes.forEach((el) => {
    el.dataset.typeHtml = el.innerHTML;
  });
  letterBody.dataset.scriptReady = "1";
}

function countTypeChars(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return segmentGraphemes(normalizeLetterSpace(tmp.textContent)).length;
}

function setLetterProgress(ratio) {
  if (!letterProgress) return;
  letterProgress.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}

async function typeText(parent, text, onChar) {
  const parts = segmentGraphemes(text);
  for (const part of parts) {
    if (part === "\n") continue;
    appendGrapheme(parent, part);
    if (typeof onChar === "function") onChar(part);
    if (/^\s+$/.test(part)) await wait(TYPE_MS * 0.35);
    else await wait(TYPE_MS);
  }
}

async function typeInto(el, html, onChar) {
  const source = document.createElement("div");
  source.innerHTML = html;
  el.innerHTML = "";
  el.classList.add("is-typing");

  const nodes = Array.from(source.childNodes);
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      await typeText(el, node.textContent || "", onChar);
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag === "br") {
        el.appendChild(document.createElement("br"));
        continue;
      }
      if (tag === "strong" || tag === "em" || tag === "b" || tag === "i") {
        const wrap = document.createElement(tag);
        el.appendChild(wrap);
        await typeText(wrap, normalizeLetterSpace(node.textContent), onChar);
        continue;
      }
      el.appendChild(node.cloneNode(true));
    }
  }

  el.classList.remove("is-typing");
}

async function playLetterTypewriter() {
  captureLetterScript();
  if (!letterBody) return;

  const targets = Array.from(
    letterBody.querySelectorAll(
      ".parents-letter__title, p:not(.parents-letter__sign), .parents-letter__sign",
    ),
  );
  const totalChars = targets.reduce(
    (sum, el) => sum + countTypeChars(el.dataset.typeHtml || ""),
    0,
  );
  let typed = 0;

  targets.forEach((el) => {
    el.innerHTML = "";
    el.classList.remove("is-typed");
  });
  setLetterProgress(0);

  for (const el of targets) {
    const html = el.dataset.typeHtml || "";
    await typeInto(el, html, () => {
      typed += 1;
      if (totalChars > 0) setLetterProgress(typed / totalChars);
    });
    el.classList.add("is-typed");
    await wait(420);
  }

  setLetterProgress(1);
  await wait(LETTER_HOLD_MS);
}

async function showExhibition() {
  if (!page || !exhibition || !exhibitionFrame) return null;

  if (search && !search.hidden) {
    await hideSearch();
  }

  page.classList.remove("is-search", "is-result", "is-loading", "is-letter");
  page.classList.add("is-exhibition");

  exhibition.hidden = false;
  exhibition.removeAttribute("hidden");
  void exhibition.offsetWidth;
  exhibition.classList.add("is-visible");
  exhibitionFrame.src = "/parents-exhibition";

  const result = await new Promise((resolve) => {
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "parents-exhibition-next") {
        window.removeEventListener("message", onMessage);
        resolve({ mode: "next" });
      }
    }
    window.addEventListener("message", onMessage);
  });

  exhibition.classList.remove("is-visible");
  await wait(280);
  exhibition.hidden = true;
  exhibitionFrame.removeAttribute("src");
  page.classList.remove("is-exhibition");
  return result;
}

async function showLetter() {
  if (!page || !letter) return;

  if (search && !search.hidden) {
    await hideSearch();
  }

  page.classList.remove("is-search", "is-result", "is-loading", "is-exhibition");
  page.classList.add("is-letter");

  if (letterBg) {
    letterBg.src = "/assets/3.png";
  }

  letter.hidden = false;
  letter.removeAttribute("hidden");
  setLetterProgress(0);
  void letter.offsetWidth;
  letter.classList.add("is-visible");

  await playLetterTypewriter();

  letter.classList.remove("is-visible");
  await wait(350);
  letter.hidden = true;
  page.classList.remove("is-letter");
}

async function revealCard() {
  if (!page) return;

  page.classList.remove("is-search", "is-loading", "is-letter", "is-exhibition");
  page.classList.add("is-result");

  if (cardSlot) {
    cardSlot.hidden = false;
    cardSlot.classList.remove("is-visible");
  }
  if (flipBtn) {
    flipBtn.hidden = false;
    flipBtn.removeAttribute("hidden");
  }
  if (raster) {
    raster.hidden = false;
    raster.removeAttribute("hidden");
    raster.classList.add("is-active", "is-ready");
    raster.classList.remove("is-flipped");
    raster.setAttribute("aria-pressed", "false");
  }

  flipped = false;
  stageReady = true;
  fitStage();

  await wait(40);
  if (cardSlot) cardSlot.classList.add("is-visible");
}

async function loadCardForStudent(rawId) {
  const api = await waitForFirebase(8000);
  const postcard = await api.getPostcard(rawId);
  if (!postcard || !postcard.data) {
    throw new Error(
      "ยังไม่พบการ์ดของเลขนี้ — ไปที่ /postcard-seed.html กดบันทึกการ์ดทั้งหมดก่อน แล้วลองใหม่",
    );
  }
  const style = postcard.style || "vintage";
  applyTheme(style);
  await renderCard(style, postcard.data);
}

async function showResult() {
  if (!page) return;

  await showExhibition();
  // Teacher letter step hidden for this event.
  // Always show the card for the student ID entered at search.
  await revealCard();
}

async function lookupStudent(rawId) {
  setError("");
  await loadCardForStudent(rawId);
  await showResult();
}

function setLoading(loading) {
  if (submit) {
    submit.disabled = loading;
    submit.classList.toggle("is-loading", loading);
    submit.setAttribute("aria-busy", loading ? "true" : "false");
    submit.innerHTML = loading
      ? '<span class="parents-submit__spinner" aria-hidden="true"></span><span>Loading...</span>'
      : SUBMIT_LABEL;
  }
  otpInputs.forEach((el) => {
    el.disabled = loading;
  });
  if (page) page.classList.toggle("is-loading", loading);
}

function applyTheme(style) {
  const cardStyle =
    style === "retro" ? "retro70" : style || "vintage";
  const theme =
    cardStyle === "retro70" || cardStyle === "retro"
      ? "retro"
      : cardStyle === "vintage"
        ? "vintage"
        : "modern";

  document.documentElement.dataset.style = theme === "vintage" ? "retro" : theme;
  document.documentElement.dataset.cardStyle = cardStyle;
  if (page) page.dataset.style = theme === "vintage" ? "retro" : theme;

  if (window.PageTheme && window.PageTheme.applyPageTheme) {
    window.PageTheme.applyPageTheme(cardStyle);
  }
  if (window.FrameBackground && window.FrameBackground.applyTheme) {
    window.FrameBackground.applyTheme(page, cardStyle);
  }
  if (envelope) {
    envelope.src = ENVELOPES[cardStyle] || ENVELOPES.vintage;
  }
}

function waitForImages(urls) {
  return Promise.all(
    urls.filter(Boolean).map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );
}

async function renderCard(style, data) {
  if (!window.PostcardCard || !window.PostcardCard.toDataURL) {
    throw new Error("Postcard renderer failed to load.");
  }
  const front = await window.PostcardCard.toDataURL(style, "front", data, 2);
  scrapbookPhotoUrl =
    (data && data.stickers && data.stickers[0]) ||
    (data && data.backPhoto) ||
    "";
  letterPhotoUrl =
    scrapbookPhotoUrl ||
    (data && data.photo) ||
    "";

  // Back face: only the /card photo as a vertical photo card (no stamp chrome).
  const backPhotoOnly = scrapbookPhotoUrl || (data && data.photo) || "";
  frontUrl = front;
  backUrl = backPhotoOnly || front;

  if (frontImg) {
    frontImg.removeAttribute("src");
    frontImg.src = front;
    frontImg.alt = "Postcard front";
  }
  if (backImg) {
    backImg.removeAttribute("src");
    if (backPhotoOnly) {
      backImg.src = backPhotoOnly;
      backImg.alt = "Family photo card";
    } else {
      // Fallback: render classic back if no card photo exists.
      const back = await window.PostcardCard.toDataURL(style, "back", data, 2);
      backUrl = back;
      backImg.src = back;
      backImg.alt = "Postcard back";
    }
  }
  await waitForImages([
    front,
    backImg && backImg.src,
    envelope && envelope.src,
  ]);
}

function openScrapbookPhoto() {
  if (!scrapbookPhotoUrl || !lightbox || !lightboxImg) return false;
  lightboxImg.src = scrapbookPhotoUrl;
  lightboxImg.alt = "Scrapbook photo";
  lightbox.hidden = false;
  document.body.classList.add("parents-lightbox-open");
  return true;
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.hidden = true;
  if (lightboxImg) lightboxImg.removeAttribute("src");
  document.body.classList.remove("parents-lightbox-open");
}

function flipCard(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!frontUrl || !backUrl || !raster || flipping) return;
  flipping = true;
  flipped = !flipped;
  raster.classList.toggle("is-flipped", flipped);
  raster.setAttribute("aria-pressed", String(flipped));
  window.setTimeout(() => {
    flipping = false;
  }, FLIP_MS);
}

function onPreviewActivate(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  // On the back side, open the photo larger.
  // On the front side, flip to the vertical photo card.
  if (flipped && scrapbookPhotoUrl) {
    openScrapbookPhoto();
    return;
  }
  flipCard(e);
}

function waitForFirebase(timeoutMs) {
  const start = Date.now();
  return new Promise(function (resolve, reject) {
    (function tick() {
      if (window.FirebasePostcard && window.FirebasePostcard.isConfigured()) {
        resolve(window.FirebasePostcard);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Firebase is not ready — refresh and try again"));
        return;
      }
      setTimeout(tick, 50);
    })();
  });
}

function wireOtp() {
  if (!otpInputs.length) return;

  otpInputs.forEach((el, index) => {
    el.addEventListener("input", (e) => {
      const digit = onlyDigit(e.target.value);
      e.target.value = digit;
      setError("");
      if (digit && index < OTP_LEN - 1) focusOtp(index + 1);
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        if (el.value) {
          el.value = "";
          e.preventDefault();
          return;
        }
        if (index > 0) {
          e.preventDefault();
          otpInputs[index - 1].value = "";
          focusOtp(index - 1);
        }
        return;
      }
      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusOtp(index - 1);
        return;
      }
      if (e.key === "ArrowRight" && index < OTP_LEN - 1) {
        e.preventDefault();
        focusOtp(index + 1);
        return;
      }
    });

    el.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text") || "";
      const digits = text.replace(/\D/g, "").slice(0, OTP_LEN);
      if (!digits) return;
      setStudentId(digits);
      setError("");
      focusOtp(Math.min(digits.length, OTP_LEN - 1));
    });

    el.addEventListener("focus", () => {
      el.select();
    });
  });
}

wireOtp();
showSearch();

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = getStudentId();
    if (id.length !== OTP_LEN) {
      setError("Please enter all 5 digits.");
      focusOtp(id.length);
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Form leaves first, then card loads and fades in.
      await hideSearch();
      await lookupStudent(id);
    } catch (err) {
      console.error(err);
      showSearch();
      setError(err.message || "Could not load postcard.");
    } finally {
      setLoading(false);
    }
  });
}

if (raster) {
  raster.addEventListener("click", onPreviewActivate);
  raster.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      onPreviewActivate(e);
    }
  });
}

if (flipBtn) {
  flipBtn.addEventListener("click", flipCard);
}

if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
if (lightboxX) lightboxX.addEventListener("click", closeLightbox);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox && !lightbox.hidden) {
    closeLightbox();
  }
});

window.addEventListener("resize", () => {
  if (stageReady) fitStage();
});
window.addEventListener("orientationchange", () => {
  if (stageReady) fitStage();
});
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    if (stageReady) fitStage();
  });
}

const params = new URLSearchParams(window.location.search);
const preset = params.get("student");
if (preset && otpInputs.length) {
  setStudentId(preset);
  const id = getStudentId();
  if (id.length === OTP_LEN) {
    (async function autoLookup() {
      setLoading(true);
      setError("");
      try {
        await hideSearch();
        await lookupStudent(id);
      } catch (err) {
        console.error(err);
        showSearch();
        setError(err.message || "Could not load postcard.");
      } finally {
        setLoading(false);
      }
    })();
  }
}
