import type { MetadataRoute } from "next";

// Added to a phone's home screen, Seventy opens straight to the surveys, ready to record a walk.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seventy",
    short_name: "Seventy",
    description: "Film a walk. Seventy counts every dog once, reads each vaccination mark and measures coverage against the 70% line.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f2f6f9",
    theme_color: "#f2f6f9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
