"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  IconArrow,
  IconFlip,
  IconHome,
  IconTitle,
} from "@/components/create-icons";
import PostcardPreview from "@/components/PostcardPreview";
import {
  DRAFT_STORAGE_KEY,
  EMPTY_DRAFT,
  normalizeCreateStyle,
  STYLE_THEME,
  TEXT_COLORS,
  type CreateStyle,
  type PostcardDraft,
} from "@/lib/postcard-styles";

const DESIGN_W = 1440;
const DESIGN_H = 1024;
const POSTMARK_OPTIONS = [1, 2, 3];
const STICKER_EMOJIS = ["❤️", "🌊", "☕", "🏖️", "⛰️", "🥐", "🍹", "🎒"];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function emojiDataUrl(emoji: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="16" fill="#fff0"/><text x="64" y="84" font-size="72" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function CreatePostcard({
  initialStyle,
}: {
  initialStyle?: string;
}) {
  const router = useRouter();
  const [side, setSide] = useState<"front" | "back">("front");
  const [flipped, setFlipped] = useState(false);
  const [draft, setDraft] = useState<PostcardDraft>(() =>
    EMPTY_DRAFT(normalizeCreateStyle(initialStyle)),
  );

  const pageRef = useRef<HTMLDivElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const stickerSlotRef = useRef<number | null>(null);

  useEffect(() => {
    const style = normalizeCreateStyle(initialStyle);
    setDraft((d) => ({ ...d, style }));
    document.documentElement.dataset.style =
      style === "retro70" ? "retro" : style;
  }, [initialStyle]);

  useEffect(() => {
    const fill = STYLE_THEME[draft.style].fill;
    document.documentElement.style.setProperty("--page-frame-fill", fill);
    document.documentElement.dataset.style =
      draft.style === "retro70" ? "retro" : draft.style;
  }, [draft.style]);

  useEffect(() => {
    function fitStage() {
      const page = pageRef.current;
      const stage = stageRef.current;
      const wrap = stageWrapRef.current;
      if (!page || !stage) return;

      const mobile = window.matchMedia("(max-width:900px)").matches;
      stage.style.transform = "";
      stage.style.width = "";
      stage.style.height = "";
      if (wrap) {
        wrap.style.width = "";
        wrap.style.height = "";
      }
      if (mobile) return;

      const scale = Math.min(
        window.innerWidth / DESIGN_W,
        window.innerHeight / DESIGN_H,
        1,
      );
      if (scale < 1) {
        stage.style.transform = `scale(${scale})`;
        stage.style.transformOrigin = "top center";
        stage.style.width = `${DESIGN_W}px`;
        stage.style.height = `${DESIGN_H}px`;
        if (wrap) {
          wrap.style.width = `${Math.ceil(DESIGN_W * scale)}px`;
          wrap.style.height = `${Math.ceil(DESIGN_H * scale)}px`;
        }
      }
    }

    fitStage();
    requestAnimationFrame(fitStage);
    window.addEventListener("resize", fitStage);
    return () => window.removeEventListener("resize", fitStage);
  }, []);

  function setStyle(style: CreateStyle) {
    setDraft((d) => ({ ...d, style }));
  }

  function goSide(next: "front" | "back") {
    setSide(next);
    setFlipped(next === "back");
  }

  function toggleFlip() {
    setFlipped((f) => {
      const next = !f;
      setSide(next ? "back" : "front");
      return next;
    });
  }

  async function onPhotoSelected(file: File | undefined) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setDraft((d) => ({ ...d, photoDataUrl: dataUrl }));
  }

  async function onStickerSelected(file: File | undefined) {
    if (!file || stickerSlotRef.current == null) return;
    const dataUrl = await readFileAsDataUrl(file);
    const slot = stickerSlotRef.current;
    setDraft((d) => {
      const stickers = [...d.stickers];
      stickers[slot] = dataUrl;
      return { ...d, stickers };
    });
    stickerSlotRef.current = null;
  }

  function pickStickerEmoji(emoji: string) {
    const empty = draft.stickers.findIndex((s) => !s);
    const slot = empty === -1 ? 0 : empty;
    setDraft((d) => {
      const stickers = [...d.stickers];
      stickers[slot] = emojiDataUrl(emoji);
      return { ...d, stickers };
    });
  }

  function finish() {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    router.push("/postcard-share");
  }

  return (
    <div className="create-page" id="createPage" ref={pageRef}>
      <div
        className="create-stage-wrap"
        id="createStageWrap"
        ref={stageWrapRef}
      >
        <div className="create-stage" id="createStage" ref={stageRef}>
          <div className="create-bg-deco" aria-hidden="true" />
          <div className="create-divider-v" aria-hidden="true" />

          <nav className="create-topnav" aria-label="Card side">
            <Link aria-label="Home" href="/">
              <IconHome />
            </Link>
            <button
              type="button"
              className={`create-side-tab${side === "front" ? " is-active" : ""}`}
              data-side="front"
              onClick={() => goSide("front")}
            >
              front side
            </button>
            <span className="create-topnav-sep" aria-hidden="true" />
            <button
              type="button"
              className={`create-side-tab${side === "back" ? " is-active" : ""}`}
              data-side="back"
              onClick={() => goSide("back")}
            >
              back side
            </button>
          </nav>

          <div className="create-hero">
            <section
              className="create-preview-panel"
              aria-label="Postcard preview"
            >
              <h1 className="create-heading">
                <span>create your</span>
                <br />
                <span>
                  own <u>postcard</u>
                </span>
              </h1>

              <div
                className="create-preview-wrap"
                id="previewWrap"
                role="button"
                tabIndex={0}
                aria-label="Flip postcard preview"
                onClick={toggleFlip}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleFlip();
                  }
                }}
              >
                <div className="create-preview-scale">
                  <PostcardPreview
                    draft={draft}
                    flipped={flipped}
                    onPickPhoto={() => fileInputRef.current?.click()}
                  />
                </div>
              </div>

              <button
                type="button"
                className="create-flip"
                id="btnFlip"
                onClick={toggleFlip}
              >
                <IconFlip />
                <span>flip the card</span>
              </button>
            </section>
          </div>

          <aside
            className="create-panel create-panel-front"
            hidden={side !== "front"}
          >
            <div className="create-field create-field--style">
              <p className="create-label">Choose style of card:</p>
              <div className="create-styles" role="list">
                {(Object.keys(STYLE_THEME) as CreateStyle[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`create-style-card${draft.style === key ? " is-active" : ""}`}
                    data-style={key}
                    role="listitem"
                    onClick={() => setStyle(key)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/assets/welcome/${STYLE_THEME[key].welcomeKey}/front.png`}
                      alt=""
                    />
                    <span>{STYLE_THEME[key].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="create-field create-field--title">
              <label className="create-label" htmlFor="titleInput">
                Add title:
              </label>
              <div className="create-input-wrap create-input-wrap--title">
                <IconTitle />
                <input
                  id="titleInput"
                  type="text"
                  placeholder="(e.g. postcard from vacation)"
                  autoComplete="off"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, title: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="create-field create-field--color">
              <p className="create-label">Choose color of the text:</p>
              <div
                className="create-colors"
                role="radiogroup"
                aria-label="Text color"
              >
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`create-color${draft.textColor === c.hex ? " is-active" : ""}`}
                    data-color={c.id}
                    data-hex={c.hex}
                    aria-checked={draft.textColor === c.hex}
                    role="radio"
                    title={c.title}
                    onClick={() =>
                      setDraft((d) => ({ ...d, textColor: c.hex }))
                    }
                  />
                ))}
              </div>
            </div>

            <div className="create-field create-field--stamp">
              <p className="create-label">Add postmark:</p>
              <div
                className="create-stamps"
                id="frontPostmarkPicker"
                role="radiogroup"
                aria-label="Postmark"
              >
                {POSTMARK_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`create-stamp${draft.postmark === n ? " is-active" : ""}`}
                    aria-checked={draft.postmark === n}
                    role="radio"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        postmark: d.postmark === n ? 0 : n,
                      }))
                    }
                  >
                    <span className="create-stamp-plate" aria-hidden="true" />
                    <span className="create-stamp-letter">{["A", "B", "C"][n - 1]}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="create-next"
              id="btnNext"
              onClick={() => goSide("back")}
            >
              <span>next</span>
              <IconArrow />
            </button>
          </aside>

          <aside
            className="create-panel create-panel-back"
            hidden={side !== "back"}
          >
            <div className="create-field create-field--from">
              <label className="create-label" htmlFor="fromInput">
                From:
              </label>
              <div className="create-input-wrap">
                <IconTitle />
                <input
                  id="fromInput"
                  type="text"
                  placeholder="your name"
                  autoComplete="off"
                  value={draft.from}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, from: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="create-field create-field--to">
              <label className="create-label" htmlFor="toInput">
                To:
              </label>
              <div className="create-input-wrap">
                <IconTitle />
                <input
                  id="toInput"
                  type="text"
                  placeholder="name of person you think about"
                  autoComplete="off"
                  value={draft.to}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, to: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="create-field create-field--message">
              <label className="create-label" htmlFor="messageInput">
                Write your message:
              </label>
              <div className="create-textarea-wrap">
                <IconTitle />
                <textarea
                  id="messageInput"
                  rows={4}
                  placeholder="write a few words here...."
                  value={draft.message}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, message: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="create-field create-field--stickers">
              <p className="create-label">Add stickers:</p>
              <div
                className="create-picker-row"
                id="stickerPicker"
                role="group"
                aria-label="Stickers"
              >
                {STICKER_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="create-picker-item"
                    onClick={() => pickStickerEmoji(emoji)}
                  >
                    <span className="create-sticker-emoji">{emoji}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="create-picker-item"
                  onClick={() => {
                    stickerSlotRef.current = draft.stickers.findIndex((s) => !s);
                    if (stickerSlotRef.current === -1) stickerSlotRef.current = 0;
                    stickerInputRef.current?.click();
                  }}
                  title="Upload sticker"
                >
                  <span className="create-sticker-emoji">＋</span>
                </button>
              </div>
            </div>

            <div className="create-back-meta">
              <div className="create-field create-field--postmark-back">
                <p className="create-label">Add postmark:</p>
                <div
                  className="create-stamps"
                  id="backPostmarkPicker"
                  role="radiogroup"
                  aria-label="Back postmark"
                >
                  {POSTMARK_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`create-stamp${draft.backPostmark === n ? " is-active" : ""}`}
                      aria-checked={draft.backPostmark === n}
                      role="radio"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          backPostmark: d.backPostmark === n ? 0 : n,
                        }))
                      }
                    >
                      <span className="create-stamp-plate" aria-hidden="true" />
                      <span className="create-stamp-letter">
                        {["A", "B", "C"][n - 1]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="create-field create-field--postage-pick">
                <p className="create-label">Add stamp:</p>
                <div
                  className="create-postage-pick"
                  id="postagePicker"
                  role="radiogroup"
                  aria-label="Postage stamp"
                >
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`create-postage-item${draft.postage === n ? " is-active" : ""}`}
                      aria-checked={draft.postage === n}
                      role="radio"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          postage: d.postage === n ? 0 : n,
                        }))
                      }
                    >
                      <span className="create-postage-fallback">{n}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="create-finish"
              id="btnFinish"
              onClick={finish}
            >
              Finish
            </button>
          </aside>
        </div>
      </div>

      <input
        id="fileInput"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void onPhotoSelected(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        id="stickerFileInput"
        ref={stickerInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void onStickerSelected(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
