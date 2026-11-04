import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Add it to .env.local at the repo root.`);
  return value;
}

export const env = {
  get modelKey() {
    return required("MODEL_API_KEY");
  },
  get modelBase() {
    return process.env.MODEL_API_BASE ?? "https://api.meta.ai/v1";
  },
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseSecret() {
    return required("SUPABASE_SECRET_KEY");
  },
  /** All visitors together, per day, so a busy day can't use up the API credit. */
  get overallCapUsd() {
    return Number(process.env.OVERALL_DAILY_CAP_USD ?? "15");
  },
  get dailyCapUsd() {
    return Number(process.env.DAILY_SPEND_CAP_USD ?? "4");
  },
};
