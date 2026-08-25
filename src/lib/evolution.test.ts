import assert from "node:assert/strict";
import test from "node:test";
import { parseEvolutionMessage, phonesMatch, splitWhatsAppMessage } from "./evolution";

test("interpreta mensagem privada da Evolution", () => {
  const result = parseEvolutionMessage({ data: { key: { remoteJid: "5511999999999@s.whatsapp.net", fromMe: false, id: "abc" }, message: { conversation: "Olá" } } });
  assert.deepEqual(result, { phone: "5511999999999", text: "Olá", fromMe: false, messageId: "abc", isGroup: false });
});

test("identifica grupos e aceita legendas", () => {
  const result = parseEvolutionMessage({ data: { key: { remoteJid: "123@g.us" }, message: { imageMessage: { caption: "Analise isto" } } } });
  assert.equal(result?.isGroup, true);
  assert.equal(result?.text, "Analise isto");
});

test("divide respostas longas sem perder conteúdo", () => {
  const chunks = splitWhatsAppMessage("palavra ".repeat(1_000), 500);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length <= 500));
  assert.equal(chunks.join(" ").replace(/\s+/g, " ").trim(), "palavra ".repeat(1_000).trim());
});

test("reconhece número brasileiro com ou sem nono dígito", () => {
  assert.equal(phonesMatch("5571991234567", "557191234567"), true);
  assert.equal(phonesMatch("557191234567", "5571991234567"), true);
  assert.equal(phonesMatch("5571991234567", "5572991234567"), false);
});
