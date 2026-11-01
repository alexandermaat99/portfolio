// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const description =
  "Alex Maat is a product manager at Brite in Lehi, UT with a background in C++ engineering, and the builder behind The Pattern's Place.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.alexandermaat.com"),
  title: "Alex Maat | Product Manager",
  description,
  authors: [{ name: "Alexander Maat" }],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Alex Maat | Product Manager",
    description,
    url: "/",
    siteName: "Alex Maat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alex Maat | Product Manager",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8ed" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="font-space-grotesk">{children}</body>
    </html>
  );
}
