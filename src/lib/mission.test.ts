import assert from "node:assert/strict";
import test from "node:test";
import { classifyMission, missionPlan, missionStartedMessage, parseMissionCommand } from "./mission";

test("classifica e cria plano contextual para a missão", () => {
  assert.equal(classifyMission("consulte DNS do dominio exemplo.com"), "domain");
  assert.equal(classifyMission("pesquise este username"), "identity");
  assert.match(missionPlan("analise os metadados do PDF").join(" "), /passiva/);
});

test("gera cartão e interpreta comandos com protocolo", () => {
  assert.match(missionStartedMessage("DNS de exemplo.com", "mis_123"), /STATUS mis_123/);
  assert.deepEqual(parseMissionCommand(" cancelar run_123 "), { action: "CANCELAR", runId: "run_123" });
  assert.equal(parseMissionCommand("STATUS"), null);
});
