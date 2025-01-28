// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Poetsen_One, Space_Grotesk } from "next/font/google";

const poetsenOne = Poetsen_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poetsen-one",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Alex Maat",
  description: "Alexander Maat's Portfolio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poetsenOne.variable} ${spaceGrotesk.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
