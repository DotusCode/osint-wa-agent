const required = [
  "EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE_NAME", "OPENAI_API_KEY", "WEBHOOK_SECRET",
  "MCP_SHARED_SECRET", "AGENT_OWNER_PHONE",
] as const;
type OptionalEnv = "INSTAGRAM_SESSION_ID" | "OPENOSINT_BIN" | "TOUTATIS_BIN" | "METADETECTIVE_BIN" | "MRHOLMES_ROOT";

export function env(name: (typeof required)[number] | OptionalEnv) {
  const value = process.env[name]?.trim();
  if (!value && required.includes(name as (typeof required)[number])) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value ?? "";
}
