import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { env } from "./env";
import { audit } from "./audit";
import { assertSafeTarget, safetyLimits } from "./safety-config";

type ToolName = "openosint" | "toutatis" | "metadetective" | "mrholmes";

const commandFor = (tool: ToolName) => ({
  openosint: env("OPENOSINT_BIN") || "openosint", toutatis: env("TOUTATIS_BIN") || "toutatis", metadetective: env("METADETECTIVE_BIN") || "metadetective",
  mrholmes: process.platform === "win32" ? "python" : "python3",
}[tool]);

function isPrivateAddress(address: string) {
  return /^(10\.|127\.|169\.254\.|192\.168\.|0\.)/.test(address) || /^172\.(1[6-9]|2\d|3[01])\./.test(address)
    || address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:");
}

async function assertPublicNetworkTarget(target: string) {
  if (!/^https?:\/\//i.test(target)) return;
  const url = new URL(target);
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(item => isPrivateAddress(item.address.toLowerCase()))) throw new Error("URL resolve para uma rede local ou reservada.");
}

export async function runOsintTool(tool: ToolName, args: string[], target: string, missionId: string, options: { cwd?: string; sensitiveArgs?: number[] } = {}) {
  assertSafeTarget(target);
  await assertPublicNetworkTarget(target);
  const safeArgs = args.map((arg, index) => options.sensitiveArgs?.includes(index) ? "[REDACTED]" : arg);
  await audit({ type: "tool.started", missionId, tool, target, args: safeArgs });
  const startedAt = Date.now();
  return new Promise<string>((resolve, reject) => {
    const child = spawn(commandFor(tool), args, { cwd: options.cwd, windowsHide: true, shell: false, env: process.env });
    let output = ""; let errorOutput = ""; let settled = false;
    const finish = async (error?: Error) => {
      if (settled) return; settled = true; clearTimeout(timer);
      const combined = `${output}${errorOutput ? `\n${errorOutput}` : ""}`.trim().slice(0, safetyLimits.maxOutputCharacters);
      await audit({ type: error ? "tool.failed" : "tool.completed", missionId, tool, target, durationMs: Date.now() - startedAt, error: error?.message, outputCharacters: combined.length });
      error ? reject(error) : resolve(combined || "Ferramenta concluída sem saída.");
    };
    const collect = (chunk: Buffer, stderr = false) => { if ((output.length + errorOutput.length) >= safetyLimits.maxOutputCharacters) return; stderr ? errorOutput += chunk.toString("utf8") : output += chunk.toString("utf8"); };
    child.stdout.on("data", chunk => collect(chunk)); child.stderr.on("data", chunk => collect(chunk, true));
    child.on("error", error => void finish(new Error(`Não foi possível iniciar ${tool}: ${error.message}`)));
    child.on("close", code => void finish(code === 0 ? undefined : new Error(`${tool} terminou com código ${code}. ${errorOutput.slice(0, 500)}`)));
    const timer = setTimeout(() => { child.kill(); void finish(new Error(`${tool} excedeu ${safetyLimits.toolTimeoutMs}ms.`)); }, safetyLimits.toolTimeoutMs);
  });
}
