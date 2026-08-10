import type { Metadata } from "next";
import {
  Cabin_Sketch,
  Homemade_Apple,
  Instrument_Serif,
  Inter,
} from "next/font/google";
import "./globals.css";
import "./wishpost.css";
import "./frame-background.css";
import "./mobile-responsive.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const cabinSketch = Cabin_Sketch({
  variable: "--font-cabin-sketch",
  subsets: ["latin"],
  weight: "400",
});

const homemadeApple = Homemade_Apple({
  variable: "--font-homemade-apple",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Postcard Generator",
  description: "Make a postcard in any style and send it to someone you miss.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-style="modern"
      className={`${inter.variable} ${instrumentSerif.variable} ${cabinSketch.variable} ${homemadeApple.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
