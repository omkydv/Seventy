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
  get dailyCapUsd() {
    return Number(process.env.DAILY_SPEND_CAP_USD ?? "4");
  },
};
