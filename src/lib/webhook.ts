const seenMessages = new Map<string, number>();
const jobs = new Map<string, { id: string; input: string; startedAt: number; controller: AbortController }>();
const lastRequests = new Map<string, string>();
const MESSAGE_TTL_MS = 15 * 60 * 1_000;

export function isDuplicateMessage(messageId?: string, now = Date.now()) {
  for (const [id, expiresAt] of seenMessages) if (expiresAt <= now) seenMessages.delete(id);
  if (!messageId) return false;
  if (seenMessages.has(messageId)) return true;
  seenMessages.set(messageId, now + MESSAGE_TTL_MS);
  return false;
}

export function processingMessage(input: string) {
  const text = input.toLowerCase();
  if (/username|usuário|instagram|e-?mail/.test(text)) return "🔎 Recebi. Estou validando o escopo da pesquisa…";
  if (/metadad|documento|foto|pdf/.test(text)) return "🧾 Recebi. Estou preparando a análise de metadados…";
  if (/dns|whois|domínio|dominio/.test(text)) return "🌐 Recebi. Estou consultando fontes públicas do domínio…";
  return "⚡ Recebi. Já estou trabalhando nisso…";
}

export function startJob(phone: string, id: string, input: string) {
  jobs.get(phone)?.controller.abort("substituído por nova solicitação");
  const job = { id, input, startedAt: Date.now(), controller: new AbortController() };
  jobs.set(phone, job);
  lastRequests.set(phone, input);
  return job;
}

export function finishJob(phone: string, id: string) {
  if (jobs.get(phone)?.id === id) jobs.delete(phone);
}

export function cancelJob(phone: string) {
  const job = jobs.get(phone);
  if (!job) return false;
  job.controller.abort("cancelado pelo usuário");
  jobs.delete(phone);
  return true;
}

export function pendingJob(phone: string, now = Date.now()) {
  const job = jobs.get(phone);
  return job ? { id: job.id, input: job.input, elapsedSeconds: Math.max(0, Math.round((now - job.startedAt) / 1_000)) } : null;
}

export function repeatedRequest(phone: string) { return lastRequests.get(phone) ?? null; }
export function rememberRequest(phone: string, input: string) { lastRequests.set(phone, input); }

export function quickReply(input: string, phone?: string) {
  const command = input.trim().toUpperCase();
  if (["AJUDA", "/AJUDA", "MENU"].includes(command)) return [
    "🕵️ *Agente OSINT Dotus*", "", "Investigo dados públicos com OpenOSINT, Toutatis, Mr.Holmes e MetaDetective.", "", "Comandos rápidos:", "• STATUS — verificar conexão", "• STATUS <protocolo> — acompanhar uma missão", "• CANCELAR <protocolo> — interromper uma missão", "• REPETIR — executar novamente o último pedido", "", "Pesquisas pessoais devem conter a frase USO AUTORIZADO.",
  ].join("\n");
  if (["STATUS", "/STATUS"].includes(command)) return "✅ Agente OSINT online. Modo Missão e auditoria local ativos.";
  if (["PENDENCIAS", "PENDÊNCIAS", "/PENDENCIAS"].includes(command)) return "Envie STATUS seguido do protocolo completo da missão.";
  if (["CANCELAR", "/CANCELAR"].includes(command)) return "Envie CANCELAR seguido do protocolo completo da missão.";
  return null;
}

export function isRepeatCommand(input: string) { return ["REPETIR", "/REPETIR"].includes(input.trim().toUpperCase()); }
