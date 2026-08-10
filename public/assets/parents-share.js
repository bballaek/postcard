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
const lightbox = document.getElementById("parentsLightbox");
const lightboxImg = document.getElementById("parentsLightboxImg");
const lightboxClose = document.getElementById("parentsLightboxClose");
const lightboxX = document.getElementById("parentsLightboxX");

const OTP_LEN = 5;
const FLIP_MS = 550;
const LETTER_MS = 15000;
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
  page.classList.remove("is-result", "is-loading", "is-letter");
  if (search) {
    search.hidden = false;
    search.removeAttribute("hidden");
    search.classList.remove("is-leaving");
  }
  if (letter) {
    letter.hidden = true;
    letter.classList.remove("is-visible");
  }
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

async function showLetter() {
  if (!page || !letter) return;

  if (search && !search.hidden) {
    await hideSearch();
  }

  page.classList.remove("is-search", "is-result", "is-loading");
  page.classList.add("is-letter");

  letter.hidden = false;
  letter.removeAttribute("hidden");
  if (letterProgress) letterProgress.style.width = "0%";
  void letter.offsetWidth;
  letter.classList.add("is-visible");

  await new Promise((resolve) => {
    let done = false;
    const started = performance.now();
    let raf = 0;

    function finish() {
      if (done) return;
      done = true;
      if (raf) cancelAnimationFrame(raf);
      resolve();
    }

    function tick(now) {
      if (done) return;
      const elapsed = now - started;
      const ratio = Math.min(1, elapsed / LETTER_MS);
      if (letterProgress) letterProgress.style.width = `${ratio * 100}%`;
      if (elapsed >= LETTER_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
  });

  letter.classList.remove("is-visible");
  await wait(350);
  letter.hidden = true;
  page.classList.remove("is-letter");
}

async function showResult() {
  if (!page) return;

  await showLetter();

  page.classList.remove("is-search", "is-loading", "is-letter");
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
  const [front, back] = await Promise.all([
    window.PostcardCard.toDataURL(style, "front", data, 2),
    window.PostcardCard.toDataURL(style, "back", data, 2),
  ]);
  frontUrl = front;
  backUrl = back;
  scrapbookPhotoUrl =
    (data && data.stickers && data.stickers[0]) ||
    (data && data.backPhoto) ||
    "";
  if (frontImg) {
    frontImg.removeAttribute("src");
    frontImg.src = front;
    frontImg.alt = "Postcard front";
  }
  if (backImg) {
    backImg.removeAttribute("src");
    backImg.src = back;
    backImg.alt = "Postcard back";
  }
  await waitForImages([front, back, envelope && envelope.src]);
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
  // On the back side, open the scrapbook polaroid photo.
  // On the front side (or if no photo), flip like the share page.
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

async function lookupStudent(rawId) {
  setError("");
  const api = await waitForFirebase(8000);
  const postcard = await api.getPostcard(rawId);
  if (!postcard || !postcard.data) {
    throw new Error("Could not find a postcard for that student ID.");
  }

  const style = postcard.style || "vintage";
  applyTheme(style);
  await renderCard(style, postcard.data);
  await showResult();
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
