type RequiredEnv =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "OPENAI_API_KEY";

export function requireEnv(name: RequiredEnv): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: () => requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  openAiKey: () => requireEnv("OPENAI_API_KEY"),
  openAiModel: () => process.env.OPENAI_MODEL ?? "gpt-5",
  signedUrlTtl: () =>
    Number.parseInt(process.env.SIGNED_URL_TTL_SECONDS ?? "900", 10),
};
