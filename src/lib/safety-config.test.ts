import assert from "node:assert/strict";
import test from "node:test";
import { assertAuthorized, assertSafeTarget, safetyLimits } from "./safety-config";

test("carrega limites seguros do JSON", () => { assert.ok(safetyLimits.toolTimeoutMs >= 1_000); assert.ok(safetyLimits.maxConcurrentMissions <= 10); });
test("bloqueia alvo local e exige declaração para dados pessoais", () => { assert.throws(() => assertSafeTarget("http://127.0.0.1/admin")); assert.throws(() => assertAuthorized("pode pesquisar")); assert.doesNotThrow(() => assertAuthorized("USO AUTORIZADO")); });
