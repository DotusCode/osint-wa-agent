import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { env } from "@/lib/env";
import { runOsintTool } from "@/lib/osint-runner";
import { assertAuthorized, safetyLimits } from "@/lib/safety-config";
import path from "node:path";

export const runtime = "nodejs";
const text = (value: unknown) => ({ content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value) }] });
const base = { missionId: z.string().min(6), authorization: z.string().optional() };
const username = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/);
const handler = createMcpHandler(server => {
  server.registerTool("openosint_username", { description: "Pesquisa username público; exige USO AUTORIZADO.", inputSchema: z.object({ ...base, username }) }, async ({ missionId, authorization, username }) => { assertAuthorized(authorization ?? ""); return text(await runOsintTool("openosint", ["username", username], username, missionId)); });
  server.registerTool("openosint_email", { description: "Pesquisa e-mail público; exige USO AUTORIZADO.", inputSchema: z.object({ ...base, email: z.string().email() }) }, async ({ missionId, authorization, email }) => { assertAuthorized(authorization ?? ""); return text(await runOsintTool("openosint", ["email", email], email, missionId)); });
  server.registerTool("openosint_domain", { description: "Consulta DNS/WHOIS público.", inputSchema: z.object({ ...base, domain: z.string(), mode: z.enum(["dns", "whois"]).default("dns") }) }, async ({ missionId, domain, mode }) => text(await runOsintTool("openosint", [mode, domain], domain, missionId)));
  server.registerTool("toutatis_instagram", { description: "Consulta Instagram via Toutatis; exige USO AUTORIZADO.", inputSchema: z.object({ ...base, username }) }, async ({ missionId, authorization, username }) => { assertAuthorized(authorization ?? ""); return text(await runOsintTool("toutatis", ["-u", username, "-s", env("INSTAGRAM_SESSION_ID")], username, missionId, { sensitiveArgs: [3] })); });
  server.registerTool("metadetective_url", { description: "Scan passivo, sem download, de metadados públicos.", inputSchema: z.object({ ...base, url: z.string().url() }) }, async ({ missionId, url }) => text(await runOsintTool("metadetective", [url, "--scan", "--depth", String(safetyLimits.metadata.maxScrapeDepth), "--threads", String(safetyLimits.metadata.maxThreads), "--rate", String(safetyLimits.metadata.maxRequestsPerSecond), "--no-geocode", "--no-banner"], url, missionId)));
  server.registerTool("mrholmes_username", { description: "Enumera username usando a base pública Mr.Holmes; exige USO AUTORIZADO.", inputSchema: z.object({ ...base, username }) }, async ({ missionId, authorization, username }) => { assertAuthorized(authorization ?? ""); const adapter = path.resolve(process.cwd(), "scripts", "mrholmes-adapter.py"); return text(await runOsintTool("mrholmes", [adapter, "--root", path.resolve(env("MRHOLMES_ROOT") || "tools/vendor/Mr.Holmes"), "--username", username, "--limit", "40"], username, missionId)); });
}, { serverInfo: { name: "dotus-osint-tools", version: "1.0.0" } });
async function authorized(request: Request) { if (request.headers.get("authorization") !== `Bearer ${env("MCP_SHARED_SECRET")}`) return Response.json({ error: "Unauthorized" }, { status: 401 }); return handler(request); }
export { authorized as GET, authorized as POST };
