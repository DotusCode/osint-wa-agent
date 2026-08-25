import { env } from "@/lib/env";
import { normalizePhone, parseEvolutionMessage, phonesMatch, sendText } from "@/lib/evolution";
import { runOsintAgent } from "@/lib/agent";
import { cancelMission, createMission, getMission, registerMissionController, releaseMissionController, updateMission, type StoredMission } from "@/lib/mission-store";
import { missionStartedMessage, parseMissionCommand } from "@/lib/mission";
import { isDuplicateMessage, isRepeatCommand, quickReply, rememberRequest, repeatedRequest } from "@/lib/webhook";
import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET() { return Response.json({ ok: true, service: "dotus-osint-whatsapp-agent", version: "1.0.0", mode: "local-durable-missions" }); }

function validSecret(receivedSecret: string) { const received = Buffer.from(receivedSecret); const expected = Buffer.from(env("WEBHOOK_SECRET")); return received.length === expected.length && timingSafeEqual(received, expected); }
const statusLabels = { pending: "⏳ aguardando", running: "⚙️ executando", completed: "✅ concluída", failed: "❌ falhou", cancelled: "🛑 cancelada" };

async function executeMission(initial: StoredMission) {
  const controller = new AbortController(); registerMissionController(initial.id, controller);
  try {
    const mission = await updateMission(initial, "running");
    await sendText(mission.phone, `⚙️ Missão ${mission.id}: consultando fontes públicas…`);
    const result = await runOsintAgent(mission.input, mission.id);
    const current = await getMission(mission.id);
    if (controller.signal.aborted || current?.status === "cancelled") return;
    await updateMission(mission, "completed", { result });
    await sendText(mission.phone, `✅ *Missão OSINT concluída*\nProtocolo: ${mission.id}\n\n${result}`);
  } catch (error) {
    const current = await getMission(initial.id); if (current?.status === "cancelled") return;
    const message = error instanceof Error ? error.message : String(error);
    await updateMission(initial, "failed", { error: message });
    await sendText(initial.phone, `❌ Não consegui concluir a missão ${initial.id}.\n\n${message.slice(0, 500)}`);
  } finally { releaseMissionController(initial.id); }
}

export async function POST(request: Request) {
  if (!validSecret(request.headers.get("x-webhook-secret") ?? "")) return Response.json({ error: "Webhook não autorizado" }, { status: 401 });
  let payload: unknown; try { payload = await request.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
  const incoming = parseEvolutionMessage(payload);
  if (!incoming || incoming.fromMe || incoming.isGroup) return Response.json({ accepted: true, ignored: true });
  if (isDuplicateMessage(incoming.messageId)) return Response.json({ accepted: true, duplicate: true });
  if (!phonesMatch(incoming.phone, normalizePhone(env("AGENT_OWNER_PHONE")))) return Response.json({ accepted: true, unauthorized: true });
  if (incoming.text.length > 8_000) { await sendText(incoming.phone, "A mensagem excede o limite de 8.000 caracteres."); return Response.json({ accepted: true, rejected: true }); }

  const command = parseMissionCommand(incoming.text);
  if (command) {
    const mission = await getMission(command.runId);
    if (!mission || !phonesMatch(mission.phone, incoming.phone)) await sendText(incoming.phone, "Protocolo não encontrado.");
    else if (command.action === "CANCELAR") await sendText(incoming.phone, await cancelMission(mission.id) ? `🛑 Missão ${mission.id} cancelada.` : "Essa missão já terminou.");
    else await sendText(incoming.phone, `${statusLabels[mission.status]}\n\nProtocolo: ${mission.id}${mission.error ? `\nErro: ${mission.error.slice(0, 300)}` : ""}`);
    return Response.json({ accepted: true, command: command.action });
  }
  const immediate = quickReply(incoming.text, incoming.phone); if (immediate) { await sendText(incoming.phone, immediate); return Response.json({ accepted: true, quickReply: true }); }
  const effectiveInput = isRepeatCommand(incoming.text) ? repeatedRequest(incoming.phone) : incoming.text;
  if (!effectiveInput) { await sendText(incoming.phone, "Ainda não existe uma solicitação anterior para repetir."); return Response.json({ accepted: true }); }
  try {
    rememberRequest(incoming.phone, effectiveInput);
    const mission = await createMission(incoming.phone, effectiveInput);
    await sendText(incoming.phone, missionStartedMessage(effectiveInput, mission.id));
    after(() => executeMission(mission));
    return Response.json({ accepted: true, missionId: mission.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error); await sendText(incoming.phone, `Não iniciei a missão: ${message}`); return Response.json({ accepted: false, error: message }, { status: 429 });
  }
}
