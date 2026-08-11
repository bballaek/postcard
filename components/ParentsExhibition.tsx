"use client";

import ExhibitionLab from "@/exhibition-lab/src/ExhibitionLab";
import { stopExlabAmbient } from "@/exhibition-lab/src/exlabSound";
import { POSTCARD_SEED_MAP } from "@/lib/postcard-seed-map";

const PHOTO_URLS = POSTCARD_SEED_MAP.map((entry) => entry.cover);

function notifyDone() {
  try {
    stopExlabAmbient();
  } catch {
    /* ignore */
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "parents-exhibition-next" }, "*");
    return;
  }
  window.location.href = "/postcard-share-parents.html";
}

export default function ParentsExhibition() {
  return (
    <div className="parents-exhibition-root">
      <ExhibitionLab
        photoUrls={PHOTO_URLS}
        maxTiles={PHOTO_URLS.length}
        hideChrome
        logoSrc="/logo/logoSceneLapse-Green.svg"
        homeHref="#"
        secondaryHref="#"
        tertiaryHref="#"
      />
      <div className="parents-exhibition-copy">
        <p className="parents-exhibition-copy__line">
          The Family of Room Seven
        </p>
        <p className="parents-exhibition-copy__line parents-exhibition-copy__line--sub">
          For Mother&apos;s Day
        </p>
      </div>
      <button
        type="button"
        className="parents-exhibition-next"
        onClick={notifyDone}
      >
        Next
      </button>
    </div>
  );
}
