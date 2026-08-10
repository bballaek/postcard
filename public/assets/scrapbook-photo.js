(function () {
  let activeSlot = null;
  let passThroughClick = false;

  function getPhotoSrc(slot) {
    const existingPhoto =
      slot.querySelector(":scope > img:not(.pc-slot-upload)") ||
      slot.querySelector(".back-photo-img");
    return existingPhoto && existingPhoto.getAttribute("src")
      ? existingPhoto.getAttribute("src")
      : null;
  }

  function ensureLightbox() {
    let modal = document.getElementById("backPhotoLightbox");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "backPhotoLightbox";
    modal.className = "back-photo-lightbox";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="back-photo-lightbox__backdrop" data-lightbox-close="1"></div>' +
      '<div class="back-photo-lightbox__panel" role="dialog" aria-modal="true" aria-label="Photo preview">' +
      '<button type="button" class="back-photo-lightbox__close" data-lightbox-close="1" aria-label="Close">×</button>' +
      '<img class="back-photo-lightbox__img" alt="Postcard photo">' +
      '<div class="back-photo-lightbox__actions">' +
      '<button type="button" class="back-photo-lightbox__btn" data-lightbox-change="1">Change</button>' +
      '<button type="button" class="back-photo-lightbox__btn back-photo-lightbox__btn--danger" data-lightbox-remove="1">Remove</button>' +
      "</div></div>";
    document.body.appendChild(modal);

    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-lightbox-close]")) {
        closeLightbox();
        return;
      }

      if (e.target.closest("[data-lightbox-change]")) {
        const slot = activeSlot;
        closeLightbox();
        if (!slot) return;
        const hadPhoto = !!getPhotoSrc(slot);
        slot.classList.add("pc-sticker-slot--empty");
        passThroughClick = true;
        slot.click();
        passThroughClick = false;
        if (hadPhoto) {
          requestAnimationFrame(function () {
            if (getPhotoSrc(slot)) {
              slot.classList.remove("pc-sticker-slot--empty");
            }
          });
        }
        return;
      }

      if (e.target.closest("[data-lightbox-remove]")) {
        const slot = activeSlot;
        closeLightbox();
        if (!slot) return;
        passThroughClick = true;
        slot.click();
        passThroughClick = false;
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && !modal.hidden) closeLightbox();
    });

    return modal;
  }

  function openLightbox(src, slot) {
    const modal = ensureLightbox();
    modal.querySelector(".back-photo-lightbox__img").src = src;
    activeSlot = slot;
    modal.hidden = false;
    document.body.classList.add("back-photo-lightbox-open");
  }

  function closeLightbox() {
    const modal = document.getElementById("backPhotoLightbox");
    if (!modal) return;
    modal.hidden = true;
    const img = modal.querySelector(".back-photo-lightbox__img");
    if (img) img.removeAttribute("src");
    activeSlot = null;
    document.body.classList.remove("back-photo-lightbox-open");
  }

  function ensureSinglePhoto(slot) {
    const stickers = slot.closest(".pc-stickers");
    if (stickers) stickers.classList.add("pc-stickers--single-photo");
    if (!slot || slot.dataset.slot !== "sticker-0") return;

    const photoSrc = getPhotoSrc(slot);
    const isEmpty =
      slot.classList.contains("pc-sticker-slot--empty") || !photoSrc;

    let frame = slot.querySelector(".back-photo-frame");
    if (!frame) {
      frame = document.createElement("div");
      frame.className = "back-photo-frame";
      slot.appendChild(frame);
    }

    if (isEmpty) {
      if (!frame.querySelector(".back-photo-empty")) {
        frame.innerHTML =
          '<div class="back-photo-empty">' +
          '<div class="back-photo-plus">+</div>' +
          '<div class="back-photo-label">Add photo</div>' +
          "</div>";
      }
      slot.setAttribute("aria-label", "Add photo");
    } else {
      let img = frame.querySelector(".back-photo-img");
      if (!img) {
        frame.innerHTML = "";
        img = document.createElement("img");
        img.className = "back-photo-img";
        img.alt = "";
        frame.appendChild(img);
      }
      if (img.getAttribute("src") !== photoSrc) {
        img.setAttribute("src", photoSrc);
      }
      slot.querySelectorAll(":scope > img").forEach(function (node) {
        if (!node.classList.contains("back-photo-img")) {
          node.style.display = "none";
        }
      });
      slot.setAttribute("aria-label", "View photo");
    }

    slot.dataset.singlePhotoReady = "1";
  }

  function enhanceAll() {
    document.querySelectorAll(".pc-stickers").forEach(function (el) {
      el.classList.add("pc-stickers--single-photo");
    });
    document
      .querySelectorAll('.pc-sticker-slot[data-slot="sticker-0"]')
      .forEach(ensureSinglePhoto);
  }

  function onSlotClickCapture(e) {
    if (passThroughClick) return;

    const slot = e.target.closest('.pc-sticker-slot[data-slot="sticker-0"]');
    if (!slot) return;

    const photoSrc = getPhotoSrc(slot);
    const isEmpty =
      slot.classList.contains("pc-sticker-slot--empty") || !photoSrc;
    if (isEmpty) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    openLightbox(photoSrc, slot);
  }

  function boot() {
    enhanceAll();
    ensureLightbox();
    document.addEventListener("click", onSlotClickCapture, true);

    const targets = [
      document.getElementById("previewBack"),
      document.getElementById("previewFront"),
      document.getElementById("cardFlip"),
      document.getElementById("createPage"),
    ].filter(Boolean);

    const obs = new MutationObserver(enhanceAll);
    targets.forEach(function (node) {
      obs.observe(node, { childList: true, subtree: true });
    });

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
