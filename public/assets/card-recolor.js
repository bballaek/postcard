(function () {
  // Recolor postcard stamp-frame SVGs loaded as <img>,
  // because CSS variables do not apply inside data-URI images.
  const FALLBACK = "#e7dde0";

  function frameColor() {
    const fromHtml = getComputedStyle(document.documentElement)
      .getPropertyValue("--fill-0")
      .trim();
    const fromPage = document.querySelector(".create-page, .share-page");
    const pageVal = fromPage
      ? getComputedStyle(fromPage).getPropertyValue("--fill-0").trim()
      : "";
    const color = fromPage && pageVal ? pageVal : fromHtml || FALLBACK;
    return color.startsWith("#") ? color : FALLBACK;
  }

  function encodeColor(color) {
    return color.replace(/#/g, "%23");
  }

  function recolorSrc(src, color) {
    if (!src || src.indexOf("image/svg") === -1) return src;
    const enc = encodeColor(color);
    let next = src;
    // data-URI form: fill='var(--fill-0,%20%23232323)'
    next = next.replace(
      /fill='var\(--fill-0,(?:%20|\s)*%23[0-9A-Fa-f]{3,8}\)'/g,
      "fill='" + enc + "'",
    );
    next = next.replace(
      /fill='var\(--fill-0,(?:%20|\s)*#[0-9A-Fa-f]{3,8}\)'/g,
      "fill='" + enc + "'",
    );
    // already recolored previously
    if (next.indexOf("var(--fill-0") === -1) {
      next = next.replace(
        /fill='%23[0-9A-Fa-f]{3,8}'/g,
        "fill='" + enc + "'",
      );
    }
    return next;
  }

  function recolorFrames(root) {
    const color = frameColor();
    (root || document).querySelectorAll("img.pc-frame").forEach(function (img) {
      const next = recolorSrc(img.getAttribute("src") || "", color);
      if (next && next !== img.getAttribute("src")) {
        img.setAttribute("src", next);
      }
    });
  }

  function boot() {
    recolorFrames(document);
    const targets = [
      document.getElementById("previewFront"),
      document.getElementById("previewBack"),
      document.getElementById("cardFlip"),
      document.getElementById("createPage"),
    ].filter(Boolean);

    const obs = new MutationObserver(function () {
      recolorFrames(document);
    });
    targets.forEach(function (node) {
      obs.observe(node, { childList: true, subtree: true });
    });

    // when style buttons change theme vars
    document.querySelectorAll(".create-style-card").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTimeout(function () {
          recolorFrames(document);
        }, 50);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
