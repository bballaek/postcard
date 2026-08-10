export type CreateStyle = "modern" | "retro70" | "vintage";

export const STYLE_THEME: Record<
  CreateStyle,
  { fill: string; welcomeKey: "modern" | "retro" | "vintage"; label: string }
> = {
  modern: { fill: "#e7dde0", welcomeKey: "modern", label: "Modern" },
  retro70: { fill: "#dee3f5", welcomeKey: "retro", label: "Retro" },
  vintage: { fill: "#dee3f5", welcomeKey: "vintage", label: "Vintage" },
};

export const TEXT_COLORS = [
  { id: "black", hex: "#0c0c0c", title: "Black" },
  { id: "white", hex: "#ffffff", title: "White" },
  { id: "pink", hex: "#ffe0eb", title: "Pink" },
  { id: "yellow", hex: "#fef9dc", title: "Yellow" },
  { id: "green", hex: "#dff5e5", title: "Green" },
] as const;

export function normalizeCreateStyle(raw: string | null | undefined): CreateStyle {
  if (raw === "retro" || raw === "retro70") return "retro70";
  if (raw === "vintage") return "vintage";
  return "modern";
}

export type PostcardDraft = {
  style: CreateStyle;
  title: string;
  textColor: string;
  photoDataUrl: string | null;
  postmark: number;
  from: string;
  to: string;
  message: string;
  stickers: (string | null)[];
  postage: number;
  backPostmark: number;
};

export const EMPTY_DRAFT = (style: CreateStyle = "modern"): PostcardDraft => ({
  style,
  title: "",
  textColor: "#0c0c0c",
  photoDataUrl: null,
  postmark: 0,
  from: "",
  to: "",
  message: "",
  stickers: [null, null, null, null],
  postage: 0,
  backPostmark: 0,
});

export const DRAFT_STORAGE_KEY = "my-postcard-draft";
