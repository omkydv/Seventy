// Absolute URLs for link previews, the sitemap and structured data: the set site URL, else the
// production domain Vercel builds for, else the dev server.
export const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3070");

export const TITLE = "Seventy: find the dogs a rabies vaccination drive missed";
export const DESCRIPTION =
  "Film a street with any phone. Seventy counts every dog once, reads each vaccination mark with Meta’s SAM 3.1 and Muse models, checks the 70% rabies target and maps the dogs still to vaccinate.";

// The demo film. The landing page shows a link to it once this is set.
export const FILM_URL: string = "";
