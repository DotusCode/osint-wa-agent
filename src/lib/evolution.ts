import { env } from "./env";

export type IncomingMessage = { phone: string; text: string; fromMe: boolean; messageId?: string; isGroup: boolean };
const MAX_WHATSAPP_CHUNK = 3_500;

export function normalizePhone(value: string) { return value.replace(/\D/g, ""); }

function brazilianPhoneVariants(value: string) {
  const phone = normalizePhone(value);
  const variants = new Set([phone]);
  if (phone.startsWith("55") && phone.length === 13 && phone[4] === "9") variants.add(`${phone.slice(0, 4)}${phone.slice(5)}`);
  if (phone.startsWith("55") && phone.length === 12) variants.add(`${phone.slice(0, 4)}9${phone.slice(4)}`);
  return variants;
}

export function phonesMatch(left: string, right: string) {
  const leftVariants = brazilianPhoneVariants(left);
  return [...brazilianPhoneVariants(right)].some(phone => leftVariants.has(phone));
}

export function parseEvolutionMessage(payload: unknown): IncomingMessage | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, any>;
  const data = body.data ?? body;
  const key = data?.key ?? {};
  const message = data?.message ?? {};
  const remoteJid = String(key.remoteJid ?? data?.remoteJid ?? "");
  const phone = normalizePhone(remoteJid.replace(/@.*$/, ""));
  const text = message.conversation ?? message.extendedTextMessage?.text ?? message.imageMessage?.caption
    ?? message.videoMessage?.caption ?? message.documentMessage?.caption ?? data?.message?.text;
  if (!phone || typeof text !== "string" || !text.trim()) return null;
  return { phone, text: text.trim(), fromMe: Boolean(key.fromMe), messageId: typeof key.id === "string" ? key.id : undefined, isGroup: remoteJid.endsWith("@g.us") };
}

export function splitWhatsAppMessage(text: string, limit = MAX_WHATSAPP_CHUNK) {
  const clean = text.trim();
  if (clean.length <= limit) return clean ? [clean] : [];
  const chunks: string[] = [];
  let remaining = clean;
  while (remaining.length > limit) {
    const window = remaining.slice(0, limit + 1);
    const splitAt = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
    const index = splitAt > limit * 0.6 ? splitAt : limit;
    chunks.push(remaining.slice(0, index).trim());
    remaining = remaining.slice(index).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function sendChunk(phone: string, text: string) {
  const baseUrl = env("EVOLUTION_API_URL").replace(/\/$/, "");
  let lastError = "erro desconhecido";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(env("EVOLUTION_INSTANCE_NAME"))}`, {
        method: "POST",
        headers: { apikey: env("EVOLUTION_API_KEY"), "content-type": "application/json" },
        body: JSON.stringify({ number: normalizePhone(phone), text }),
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) return;
      lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`;
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) { lastError = error instanceof Error ? error.message : String(error); }
  }
  throw new Error(`Evolution API falhou: ${lastError}`);
}

export async function sendText(phone: string, text: string) {
  for (const chunk of splitWhatsAppMessage(text)) await sendChunk(phone, chunk);
}
