import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { audit } from "./audit";
import { safetyLimits } from "./safety-config";

export type MissionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type StoredMission = { id: string; phone: string; input: string; status: MissionStatus; createdAt: string; updatedAt: string; result?: string; error?: string };
const dir = path.resolve(process.cwd(), "runtime", "missions");
const controllers = new Map<string, AbortController>();
const recentRequests = new Map<string, number[]>();

async function persist(mission: StoredMission) {
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `${mission.id}.json`); const temp = `${target}.tmp`;
  await writeFile(temp, JSON.stringify(mission, null, 2), "utf8"); await rename(temp, target);
}

export async function createMission(phone: string, input: string) {
  const now = Date.now(); const history = (recentRequests.get(phone) ?? []).filter(value => value > now - 3_600_000);
  if (history.length >= safetyLimits.maxRequestsPerHourPerOwner) throw new Error("Limite de missões por hora atingido.");
  history.push(now); recentRequests.set(phone, history);
  if (controllers.size >= safetyLimits.maxConcurrentMissions) throw new Error("Limite de missões simultâneas atingido.");
  const mission: StoredMission = { id: `mis_${randomUUID()}`, phone, input, status: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await persist(mission); await audit({ type: "mission.created", missionId: mission.id, phoneSuffix: phone.slice(-4) }); return mission;
}

export async function getMission(id: string) { try { return JSON.parse(await readFile(path.join(dir, `${id}.json`), "utf8")) as StoredMission; } catch { return null; } }

export async function updateMission(mission: StoredMission, status: MissionStatus, extra: Partial<StoredMission> = {}) {
  const updated = { ...mission, ...extra, status, updatedAt: new Date().toISOString() }; await persist(updated); await audit({ type: `mission.${status}`, missionId: mission.id }); return updated;
}

export function registerMissionController(id: string, controller: AbortController) { controllers.set(id, controller); }
export function releaseMissionController(id: string) { controllers.delete(id); }
export async function cancelMission(id: string) { const mission = await getMission(id); if (!mission || ["completed", "failed", "cancelled"].includes(mission.status)) return false; controllers.get(id)?.abort(); await updateMission(mission, "cancelled"); return true; }
