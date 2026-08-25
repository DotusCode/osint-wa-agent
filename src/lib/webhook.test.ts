import assert from "node:assert/strict";
import test from "node:test";
import { isDuplicateMessage, isRepeatCommand, pendingJob, processingMessage, quickReply, repeatedRequest, startJob } from "./webhook";

test("comandos AJUDA e STATUS respondem sem chamar o modelo", () => {
  assert.match(quickReply(" ajuda ") ?? "", /Agente OSINT Dotus/);
  assert.match(quickReply("STATUS") ?? "", /Agente OSINT online/);
  assert.equal(quickReply("liste meus repositorios"), null);
});

test("mensagens repetidas são identificadas pelo messageId", () => {
  const id = `test-${Date.now()}`;
  assert.equal(isDuplicateMessage(id, 1_000), false);
  assert.equal(isDuplicateMessage(id, 1_001), true);
});

test("gera progresso contextual para OSINT", () => {
  assert.match(processingMessage("pesquise este username"), /escopo/);
  assert.match(processingMessage("analise os metadados do PDF"), /metadados/);
});

test("acompanha e repete uma solicitação legada", () => {
  const phone = `test-${Date.now()}`;
  startJob(phone, "job-1", "liste meus repositorios");
  assert.equal(pendingJob(phone)?.id, "job-1");
  assert.equal(repeatedRequest(phone), "liste meus repositorios");
  assert.equal(isRepeatCommand(" repetir "), true);
  assert.match(quickReply("CANCELAR", phone) ?? "", /protocolo/);
});
