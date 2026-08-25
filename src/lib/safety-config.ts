import limitsJson from "../../config/safety-limits.json";
import { z } from "zod";

const limitsSchema = z.object({
  version: z.literal(1), authorizationPhrase: z.string().min(8),
  requireAuthorizationForPersonalData: z.boolean(), maxConcurrentMissions: z.number().int().min(1).max(10),
  maxToolsPerMission: z.number().int().min(1).max(20), maxTargetsPerMission: z.number().int().min(1).max(20),
  maxRequestsPerHourPerOwner: z.number().int().min(1).max(500), toolTimeoutMs: z.number().int().min(1_000).max(600_000),
  maxOutputCharacters: z.number().int().min(500).max(100_000), auditRetentionDays: z.number().int().min(1).max(365),
  metadata: z.object({ maxScrapeDepth: z.number().int().min(0).max(3), maxThreads: z.number().int().min(1).max(10), maxRequestsPerSecond: z.number().min(0.1).max(10), allowExternalLinks: z.boolean(), allowDownloads: z.boolean(), disableReverseGeocoding: z.boolean() }),
  blockedTargetPatterns: z.array(z.string().min(1)), redactFields: z.array(z.string().min(1)),
});

export const safetyLimits = limitsSchema.parse(limitsJson);

export function assertAuthorized(input: string) {
  if (safetyLimits.requireAuthorizationForPersonalData && !input.toUpperCase().includes(safetyLimits.authorizationPhrase)) {
    throw new Error(`Pesquisa de dados pessoais exige a declaração: ${safetyLimits.authorizationPhrase}`);
  }
}

export function assertSafeTarget(target: string) {
  const normalized = target.trim().toLowerCase();
  if (!normalized || safetyLimits.blockedTargetPatterns.some(pattern => normalized.includes(pattern.toLowerCase()))) throw new Error("Alvo local, privado ou bloqueado pela política.");
}
