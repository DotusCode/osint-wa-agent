import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { safetyLimits } from "./safety-config";

const auditDir = path.resolve(process.cwd(), "runtime", "audit");

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, safetyLimits.redactFields.some(field => key.toLowerCase().includes(field)) ? "[REDACTED]" : scrub(item)]));
  return value;
}

export async function audit(event: Record<string, unknown>) {
  await mkdir(auditDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  await appendFile(path.join(auditDir, `${day}.jsonl`), `${JSON.stringify(scrub({ at: new Date().toISOString(), ...event }))}\n`, "utf8");
}
