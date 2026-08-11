import { Instrument_Serif, Playpen_Sans_Thai } from "next/font/google";

const playpenThai = Playpen_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playpen-thai",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-exlab-serif",
});

export default function ParentsExhibitionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${playpenThai.variable} ${instrumentSerif.variable}`}
      style={{ minHeight: "100%" }}
    >
      {children}
    </div>
  );
}
