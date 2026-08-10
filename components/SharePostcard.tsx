"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PostcardPreview from "@/components/PostcardPreview";
import {
  DRAFT_STORAGE_KEY,
  EMPTY_DRAFT,
  type PostcardDraft,
} from "@/lib/postcard-styles";

export default function SharePostcard() {
  const [draft, setDraft] = useState<PostcardDraft | null>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) setDraft(JSON.parse(raw) as PostcardDraft);
      else setDraft(EMPTY_DRAFT());
    } catch {
      setDraft(EMPTY_DRAFT());
    }
  }, []);

  if (!draft) {
    return (
      <main className="share-page">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="share-page">
      <h1 className="share-heading">
        your <u>postcard</u> is ready
      </h1>

      <div
        className="share-preview"
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
      >
        <div className="create-preview-scale share-preview-scale">
          <PostcardPreview
            draft={draft}
            flipped={flipped}
            onPickPhoto={() => undefined}
          />
        </div>
      </div>

      <p className="share-note">Tap the card to flip · draft saved in this browser</p>

      <div className="share-actions">
        <Link className="share-btn" href="/postcard-create">
          Edit again
        </Link>
        <Link className="share-btn share-btn--ghost" href="/">
          Home
        </Link>
      </div>
    </main>
  );
}
