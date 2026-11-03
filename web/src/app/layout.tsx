import type { Metadata, Viewport } from "next";
import { Mona_Sans } from "next/font/google";
import { DESCRIPTION, SITE, TITLE } from "@/lib/site";
import "./globals.css";

const mona = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-mona",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s | Seventy" },
  description: DESCRIPTION,
  applicationName: "Seventy",
  keywords: [
    "rabies",
    "dog vaccination coverage",
    "post-vaccination survey",
    "mass dog vaccination",
    "Zero by 30",
    "street dog count",
    "dog population survey",
    "SAM 3.1",
    "Muse Spark",
    "Meta AI",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Seventy",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Seventy: Rabies hides in the dogs a drive missed. Seventy finds them." }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.jpg"] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f2f6f9",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Browser extensions (grammar checkers, dark-mode tools) add attributes to <html> and <body>
  // before React loads; without this every refresh in development reports a hydration mismatch.
  return (
    <html lang="en" className={mona.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
