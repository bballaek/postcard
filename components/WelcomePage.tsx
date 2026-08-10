"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  applyTheme,
  createFrameBackground,
  DESIGN_H,
  DESIGN_W,
  type PostcardStyle,
} from "@/lib/frame-background";

const STYLES: Record<
  PostcardStyle,
  {
    envelope: string;
    front: string;
    back: string;
    create: string;
    label: string;
  }
> = {
  modern: {
    envelope: "/assets/welcome/modern/envelope.png",
    front: "/assets/welcome/modern/front.png",
    back: "/assets/welcome/modern/back.png",
    create: "/postcard-create.html?style=modern",
    label: "Modern postcard preview",
  },
  retro: {
    envelope: "/assets/welcome/retro/envelope.png",
    front: "/assets/welcome/retro/front.png",
    back: "/assets/welcome/retro/back.png",
    create: "/postcard-create.html?style=retro70",
    label: "Retro postcard preview",
  },
  vintage: {
    envelope: "/assets/welcome/vintage/envelope.png",
    front: "/assets/welcome/vintage/front.png",
    back: "/assets/welcome/vintage/back.png",
    create: "/postcard-create.html?style=vintage",
    label: "Vintage postcard preview",
  },
};

const FLIP_MS = 550;

const STAMP_BORDER_SVG =
  "data:image/svg+xml,%3csvg%20preserveAspectRatio='none'%20width='100%25'%20height='100%25'%20overflow='visible'%20style='display:%20block;'%20viewBox='0%200%2032%2026.2066'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20id='Group'%3e%3cpath%20id='Vector'%20d='M32%203.03312V0H28.9669C28.9669%200.76225%2028.349%201.38013%2027.5868%201.38013C26.8245%201.38013%2026.2066%200.76225%2026.2066%200H23.1735C23.1735%200.76225%2022.5556%201.38013%2021.7934%201.38013C21.0312%201.38013%2020.4132%200.76225%2020.4132%200H17.3801C17.3801%200.76225%2016.7623%201.38013%2016%201.38013C15.2377%201.38013%2014.6199%200.76225%2014.6199%200H11.5868C11.5868%200.76225%2010.9689%201.38013%2010.2066%201.38013C9.44437%201.38013%208.8265%200.76225%208.8265%200H5.79338C5.79338%200.76225%205.1755%201.38013%204.41325%201.38013C3.651%201.38013%203.03312%200.76225%203.03312%200H0V3.03312C0.76225%203.03312%201.38013%203.651%201.38013%204.41325C1.38013%205.17544%200.76225%205.79338%200%205.79338V8.8265C0.76225%208.8265%201.38013%209.44437%201.38013%2010.2066C1.38013%2010.9689%200.76225%2011.5868%200%2011.5868V14.6199C0.76225%2014.6199%201.38013%2015.2377%201.38013%2016C1.38013%2016.7622%200.76225%2017.3801%200%2017.3801V20.4132C0.76225%2020.4132%201.38013%2021.0311%201.38013%2021.7934C1.38013%2022.5556%200.76225%2023.1735%200%2023.1735V26.2066H3.03312C3.03312%2025.4444%203.651%2024.8265%204.41325%2024.8265C5.1755%2024.8265%205.79338%2025.4444%205.79338%2026.2066H8.8265C8.8265%2025.4444%209.44437%2024.8265%2010.2066%2024.8265C10.9689%2024.8265%2011.5868%2025.4444%2011.5868%2026.2066H14.6199C14.6199%2025.4444%2015.2377%2024.8265%2016%2024.8265C16.7623%2024.8265%2017.3801%2025.4444%2017.3801%2026.2066H20.4132C20.4132%2025.4444%2021.0311%2024.8265%2021.7934%2024.8265C22.5556%2024.8265%2023.1735%2025.4444%2023.1735%2026.2066H26.2066C26.2066%2025.4444%2026.8245%2024.8265%2027.5868%2024.8265C28.349%2024.8265%2028.9669%2025.4444%2028.9669%2026.2066H32V23.1735C31.2377%2023.1735%2030.6199%2022.5556%2030.6199%2021.7934C30.6199%2021.0312%2031.2377%2020.4132%2032%2020.4132V17.3801C31.2377%2017.3801%2030.6199%2016.7622%2030.6199%2016C30.6199%2015.2377%2031.2377%2014.6199%2032%2014.6199V11.5868C31.2377%2011.5868%2030.6199%2010.9689%2030.6199%2010.2066C30.6199%209.44437%2031.2377%208.8265%2032%208.8265V5.79338C31.2377%205.79338%2030.6199%205.1755%2030.6199%204.41325C30.6199%203.651%2031.2377%203.03312%2032%203.03312ZM3.70975%2022.4969V3.70981H28.2902V22.4969H3.70975Z'%20fill='var(--fill-0,%20white)'/%3e%3c/g%3e%3c/svg%3e";

const PHOTO_SVG =
  "data:image/svg+xml,%3csvg%20preserveAspectRatio='none'%20width='100%25'%20height='100%25'%20overflow='visible'%20style='display:%20block;'%20viewBox='0%200%2020.8304%2015.0371'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20id='Group'%3e%3cpath%20id='Vector'%20d='M0%200V15.0371H2.404L6.68%2010.0951L8.4215%2012.1079L13.5684%206.15931L20.8304%2014.5525V0H0ZM3.78475%206.61594C2.736%206.61594%201.88581%205.76575%201.88581%204.717C1.88581%203.66825%202.736%202.81806%203.78475%202.81806C4.8335%202.81806%205.68369%203.66825%205.68369%204.717C5.68369%205.76575%204.8335%206.61594%203.78475%206.61594Z'%20fill='var(--fill-0,%20white)'/%3e%3c/g%3e%3c/svg%3e";

export default function WelcomePage() {
  const [style, setStyle] = useState<PostcardStyle>("modern");
  const [flipped, setFlipped] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<SVGSVGElement>(null);
  const stampFillRef = useRef<SVGRectElement>(null);
  const stampMaskRef = useRef<SVGMaskElement>(null);
  const stampMaskFillRef = useRef<SVGRectElement>(null);
  const stampHoleCirclesRef = useRef<SVGGElement>(null);

  const flippingRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("style");
    const key =
      initial === "retro70"
        ? "retro"
        : initial === "retro" || initial === "vintage" || initial === "modern"
          ? initial
          : null;
    if (key) setStyle(key);
    applyTheme(pageRef.current, key ?? "modern");
  }, []);

  useEffect(() => {
    const frameBg = createFrameBackground({
      sheet: sheetRef.current,
      stamp: stampRef.current,
      stampFill: stampFillRef.current,
      stampMask: stampMaskRef.current,
      stampMaskFill: stampMaskFillRef.current,
      stampHoleCircles: stampHoleCirclesRef.current,
    });

    function fitStage() {
      const welcomePage = pageRef.current;
      const welcomeStage = stageRef.current;
      const welcomeStageWrap = stageWrapRef.current;
      if (!welcomePage || !welcomeStage) return;

      const mobile = window.matchMedia("(max-width:900px)").matches;
      welcomeStage.style.transform = "";
      welcomeStage.style.width = "";
      welcomeStage.style.height = "";
      welcomeStage.style.margin = "";
      welcomeStage.style.transformOrigin = "";
      welcomePage.style.overflow = mobile ? "hidden" : "";
      if (welcomeStageWrap) {
        welcomeStageWrap.style.width = "";
        welcomeStageWrap.style.height = "";
        welcomeStageWrap.style.overflow = "";
      }
      if (mobile) {
        frameBg.fitStampSheet();
        return;
      }
      const inset = frameBg.getInset();
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      const availW = vpW - inset * 2;
      const availH = vpH - inset * 2;
      const scale = Math.min(availW / DESIGN_W, availH / DESIGN_H, 1);
      welcomePage.style.overflow = scale < 1 ? "auto" : "hidden";
      if (scale < 1) {
        welcomeStage.style.transform = `scale(${scale})`;
        welcomeStage.style.transformOrigin = "top left";
        welcomeStage.style.width = `${DESIGN_W}px`;
        welcomeStage.style.height = `${DESIGN_H}px`;
        welcomeStage.style.margin = "0";
        if (welcomeStageWrap) {
          welcomeStageWrap.style.width = `${Math.ceil(DESIGN_W * scale)}px`;
          welcomeStageWrap.style.height = `${Math.ceil(DESIGN_H * scale)}px`;
          welcomeStageWrap.style.overflow = "hidden";
        }
      }
      frameBg.fitStampSheet();
    }

    function scheduleFit() {
      fitStage();
      requestAnimationFrame(fitStage);
    }

    scheduleFit();
    window.addEventListener("resize", scheduleFit);
    window.addEventListener("orientationchange", scheduleFit);
    window.addEventListener("load", scheduleFit);
    window.visualViewport?.addEventListener("resize", scheduleFit);
    document.fonts?.ready.then(scheduleFit);

    return () => {
      window.removeEventListener("resize", scheduleFit);
      window.removeEventListener("orientationchange", scheduleFit);
      window.removeEventListener("load", scheduleFit);
      window.visualViewport?.removeEventListener("resize", scheduleFit);
    };
  }, []);

  useEffect(() => {
    applyTheme(pageRef.current, style);
  }, [style]);

  const assets = STYLES[style];

  function toggleCardFlip() {
    if (flippingRef.current) return;
    flippingRef.current = true;
    setFlipped((prev) => !prev);
    window.setTimeout(() => {
      flippingRef.current = false;
    }, FLIP_MS);
  }

  return (
    <>
      <div
        className="welcome-sheet frame-sheet"
        id="welcomeSheet"
        aria-hidden="true"
        ref={sheetRef}
      >
        <svg
          className="welcome-stamp frame-stamp"
          id="welcomeStamp"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          preserveAspectRatio="none"
          overflow="visible"
          ref={stampRef}
        >
          <defs>
            <mask
              id="stampMask"
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              ref={stampMaskRef}
            >
              <rect id="stampMaskFill" fill="#fff" ref={stampMaskFillRef} />
              <g id="stampHoleCircles" fill="#000" ref={stampHoleCirclesRef} />
            </mask>
          </defs>
          <rect id="stampFill" mask="url(#stampMask)" ref={stampFillRef} />
        </svg>
      </div>

      <div
        className="welcome-page frame-page"
        id="welcomePage"
        data-style={style}
        ref={pageRef}
      >
        <div
          className="welcome-stage-wrap"
          id="welcomeStageWrap"
          ref={stageWrapRef}
        >
          <div className="welcome-stage" id="welcomeStage" ref={stageRef}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="welcome-logo"
              src="/assets/Postage%20stemp.png"
              alt="Postcard Maker"
            />

            <div className="welcome-left">
              <div className="welcome-copy">
                <h1 className="welcome-heading">
                  <em>a postcard</em>
                  <br />
                  for
                  <br />
                  <u>mom</u>
                </h1>
                <p className="welcome-lead">
                  Make a Mother&apos;s Day postcard and send a little love home.
                </p>
              </div>

              <Link
                className="welcome-cta"
                href={assets.create}
                id="welcomeCta"
              >
                <span className="welcome-cta-icon" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={STAMP_BORDER_SVG} alt="" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={PHOTO_SVG} alt="" />
                </span>
                <span>create a postcard</span>
              </Link>
            </div>

            <div
              className={`welcome-preview${flipped ? " is-flipped" : ""}`}
              id="welcomePreview"
              role="button"
              tabIndex={0}
              aria-pressed={flipped}
              aria-label="Flip postcard preview"
              aria-live="polite"
              onClick={toggleCardFlip}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCardFlip();
                }
              }}
            >
              <div className="preview-compose">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="welcome-envelope"
                  id="previewEnvelope"
                  src={assets.envelope}
                  alt=""
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="welcome-card-back"
                  id="previewBack"
                  src={assets.back}
                  alt=""
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="welcome-card-front"
                  id="previewFront"
                  src={assets.front}
                  alt={assets.label}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
