import { tool } from "ai";
import path from "node:path";
import { z } from "zod";
import { env } from "./env";
import { runOsintTool } from "./osint-runner";
import { assertAuthorized, safetyLimits } from "./safety-config";

const username = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/);
const mission = { missionId: z.string().min(6).max(100), authorization: z.string().optional() };
const requireAuthorization = (value?: string) => assertAuthorized(value ?? "");

export const osintTools = {
  openOsintUsername: tool({ description: "Pesquisa a presença pública de um username com OpenOSINT. Exige declaração de uso autorizado.", inputSchema: z.object({ ...mission, username }), execute: async ({ missionId, authorization, username: target }) => { requireAuthorization(authorization); return runOsintTool("openosint", ["username", target], target, missionId); } }),
  openOsintEmail: tool({ description: "Pesquisa exposição pública de um e-mail com OpenOSINT. Exige declaração de uso autorizado.", inputSchema: z.object({ ...mission, email: z.string().email() }), execute: async ({ missionId, authorization, email }) => { requireAuthorization(authorization); return runOsintTool("openosint", ["email", email], email, missionId); } }),
  openOsintDomain: tool({ description: "Consulta WHOIS ou DNS público de um domínio com OpenOSINT.", inputSchema: z.object({ ...mission, domain: z.string().regex(/^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/), mode: z.enum(["whois", "dns"]).default("dns") }), execute: async ({ missionId, domain, mode }) => runOsintTool("openosint", [mode, domain], domain, missionId) }),
  toutatisInstagram: tool({ description: "Consulta informações de perfil do Instagram usando Toutatis e a sessão configurada. Somente uso autorizado.", inputSchema: z.object({ ...mission, username }), execute: async ({ missionId, authorization, username: target }) => { requireAuthorization(authorization); const session = env("INSTAGRAM_SESSION_ID"); return runOsintTool("toutatis", ["-u", target, "-s", session], target, missionId, { sensitiveArgs: [3] }); } }),
  metaDetectiveUrl: tool({ description: "Faz varredura passiva e sem download de metadados publicados em uma URL com MetaDetective.", inputSchema: z.object({ ...mission, url: z.string().url().refine(value => value.startsWith("https://") || value.startsWith("http://")) }), execute: async ({ missionId, url }) => runOsintTool("metadetective", [url, "--scan", "--depth", String(safetyLimits.metadata.maxScrapeDepth), "--threads", String(safetyLimits.metadata.maxThreads), "--rate", String(safetyLimits.metadata.maxRequestsPerSecond), "--no-geocode", "--no-banner"], url, missionId) }),
  mrHolmesUsername: tool({ description: "Verifica username em fontes públicas usando a base de sites do Mr.Holmes. Somente uso autorizado.", inputSchema: z.object({ ...mission, username }), execute: async ({ missionId, authorization, username: target }) => { requireAuthorization(authorization); const root = path.resolve(env("MRHOLMES_ROOT") || "tools/vendor/Mr.Holmes"); const adapter = path.resolve(process.cwd(), "scripts", "mrholmes-adapter.py"); return runOsintTool("mrholmes", [adapter, "--root", root, "--username", target, "--limit", "40"], target, missionId); } }),
};
