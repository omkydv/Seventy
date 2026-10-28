import type { Metadata, Viewport } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";

const mona = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-mona",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3070"),
  title: {
    default: "Seventy: know when a street is safe from rabies",
    template: "%s | Seventy",
  },
  description:
    "Film a ten-minute walk. Seventy counts every dog once, reads each vaccination mark, and tells a vaccination team whether the area has reached the 70% that stops rabies.",
  openGraph: {
    title: "Seventy",
    description: "Know when a street is safe from rabies. Count every dog once, read every vaccination mark, measure coverage against the 70% line.",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#08121c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={mona.variable}>
      <body>{children}</body>
    </html>
  );
}
