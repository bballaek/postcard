"use client";

import type { CSSProperties } from "react";
import { IconUpload } from "@/components/create-icons";
import type { CreateStyle, PostcardDraft } from "@/lib/postcard-styles";
import { STYLE_THEME } from "@/lib/postcard-styles";

const POSTMARKS = ["A", "B", "C"];

function splitMessage(message: string, rows = 4) {
  const words = message.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return Array.from({ length: rows }, () => "");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 28 && current) {
      lines.push(current);
      current = word;
      if (lines.length >= rows) break;
    } else {
      current = next;
    }
  }
  if (lines.length < rows && current) lines.push(current);
  while (lines.length < rows) lines.push("");
  return lines.slice(0, rows);
}

function FrontCard({
  draft,
  onPickPhoto,
}: {
  draft: PostcardDraft;
  onPickPhoto: () => void;
}) {
  const style = draft.style;
  const title = draft.title.trim();
  const showHint = !title;

  return (
    <div
      className={`postcard-card postcard-card--${style} postcard-card--front`}
      style={
        {
          "--pc-front-title-color": draft.textColor,
          background: STYLE_THEME[style].fill,
        } as CSSProperties
      }
    >
      <div
        className={`pc-photo${draft.photoDataUrl ? "" : " pc-photo--empty"}`}
        onClick={(e) => {
          e.stopPropagation();
          onPickPhoto();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onPickPhoto();
          }
        }}
        aria-label="Upload photo"
      >
        {draft.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.photoDataUrl} alt="" />
        ) : (
          <div className="pc-upload-cta">
            <IconUpload />
            <span>upload a photo</span>
          </div>
        )}
      </div>

      <div
        className="pc-front-title"
        style={{ color: draft.textColor }}
        aria-hidden={!title}
      >
        {showHint ? (
          <span className="pc-line-hint">
            <span className="pc-underline">your title</span>
          </span>
        ) : (
          <span className="pc-underline">{title}</span>
        )}
      </div>

      {draft.postmark > 0 && (
        <div className="pc-stamp-slot pc-stamp-slot--front" aria-hidden="true">
          <div className="create-preview-postmark">{POSTMARKS[draft.postmark - 1]}</div>
        </div>
      )}
    </div>
  );
}

function BackCard({ draft }: { draft: PostcardDraft }) {
  const style = draft.style as CreateStyle;
  const lines = splitMessage(draft.message);
  const welcome = STYLE_THEME[style].welcomeKey;

  return (
    <div
      className={`postcard-card postcard-card--${style} postcard-card--back`}
      style={{ background: "#1a1a1a" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="pc-frame"
        src={`/assets/welcome/${welcome}/back.png`}
        alt=""
        style={{ objectFit: "cover" }}
      />
      <div className="pc-back-inner">
        <div className="pc-back-title">
          <span className="pc-underline">wish you were here</span>
        </div>
        <div className="pc-back-divider" aria-hidden="true" />

        <div className="pc-stickers">
          {draft.stickers.map((src, i) => (
            <div
              key={i}
              className={`pc-sticker-slot${src ? "" : " pc-sticker-slot--empty"}`}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" />
              ) : null}
            </div>
          ))}
        </div>

        <div className="pc-address">
          <div className="pc-field">
            <label>From</label>
            <span className="pc-handwriting">{draft.from}</span>
            <span className="pc-line" />
          </div>
          <div className="pc-field" style={{ marginTop: 16 }}>
            <label>To</label>
            <span className="pc-handwriting">{draft.to}</span>
            <span className="pc-line" />
          </div>
        </div>

        <div className="pc-message-lines" aria-hidden="true">
          {lines.map((_, i) => (
            <span className="pc-line" key={i} />
          ))}
        </div>
        <div className="pc-message">
          {lines.map((line, i) => (
            <div className="pc-message-row" key={i}>
              <span className="pc-message-text">{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PostcardPreview({
  draft,
  flipped,
  onPickPhoto,
}: {
  draft: PostcardDraft;
  flipped: boolean;
  onPickPhoto: () => void;
}) {
  return (
    <div
      className={`create-card-flip${flipped ? " is-flipped" : ""}`}
      id="cardFlip"
      style={{ ["--preview-scale" as string]: 0.811 }}
    >
      <div className="create-card-face create-card-face--front" id="previewFront">
        <FrontCard draft={draft} onPickPhoto={onPickPhoto} />
      </div>
      <div className="create-card-face create-card-face--back" id="previewBack">
        <BackCard draft={draft} />
      </div>
    </div>
  );
}
