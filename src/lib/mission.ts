export type MissionKind = "identity" | "metadata" | "domain" | "general";

export function classifyMission(input: string): MissionKind {
  const text = input.toLowerCase();
  if (/username|usu[aá]rio|instagram|e-?mail|pessoa|perfil/.test(text)) return "identity";
  if (/metadad|arquivo|documento|foto|imagem|pdf/.test(text)) return "metadata";
  if (/dom[ií]nio|dns|whois|site|url/.test(text)) return "domain";
  return "general";
}

export function missionPlan(input: string) {
  const plans: Record<MissionKind, string[]> = {
    identity: ["Validar autorização e alvo", "Consultar fontes públicas", "Correlacionar sem assumir identidade", "Redigir achados e ressalvas"],
    metadata: ["Validar escopo", "Executar análise passiva", "Filtrar dados sensíveis", "Entregar evidências"],
    domain: ["Validar o domínio", "Consultar DNS/WHOIS público", "Cruzar os resultados", "Entregar evidências"],
    general: ["Entender o objetivo", "Validar escopo legal", "Executar consultas permitidas", "Entregar evidências"],
  };
  return plans[classifyMission(input)];
}

export function missionStartedMessage(input: string, runId: string) {
  const plan = missionPlan(input).map((step, index) => `${index === 0 ? "🔄" : "▫️"} ${index + 1}. ${step}`).join("\n");
  return [`🎯 *Missão iniciada*`, "", plan, "", `Protocolo: ${runId}`, `Acompanhe: STATUS ${runId}`, `Cancele: CANCELAR ${runId}`].join("\n");
}

export function parseMissionCommand(input: string) {
  const match = input.trim().match(/^(STATUS|CANCELAR)\s+([^\s]+)$/i);
  return match ? { action: match[1].toUpperCase() as "STATUS" | "CANCELAR", runId: match[2] } : null;
}

export function missionStatusMessage(runId: string, status: string) {
  const messages: Record<string, string> = {
    pending: "⏳ Missão aguardando início.", running: "⚙️ Missão em execução.",
    completed: "✅ Missão concluída.", failed: "❌ A missão falhou.", cancelled: "🛑 Missão cancelada.",
  };
  return `${messages[status.toLowerCase()] ?? `ℹ️ Estado da missão: ${status}.`}\n\nProtocolo: ${runId}`;
}
