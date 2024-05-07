import type { workerBuildAssets } from "@/wab/server/workers/build-loader-assets";
import type { workerGenCode } from "@/wab/server/workers/codegen";
import type { workerLocalizationStrings } from "@/wab/server/workers/localization-worker";
import path from "path";
import { pool as createPool, WorkerPool } from "workerpool";

// Setting a pool task timeout of 6 minutes
const TIMEOUT_MS = 6 * 60 * 1000;

export interface PlasmicWorkerPool {
  // We explicit specify exec overrides to allow type-checking,
  // since we are calling exec with a string and not a typed function
  exec(
    method: "codegen",
    params: Parameters<typeof workerGenCode>
  ): ReturnType<typeof workerGenCode>;
  exec(
    method: "loader-assets",
    params: Parameters<typeof workerBuildAssets>
  ): ReturnType<typeof workerBuildAssets>;
  exec(
    method: "localization-strings",
    params: Parameters<typeof workerLocalizationStrings>
  ): ReturnType<typeof workerLocalizationStrings>;
}

class WorkerPoolWrapper {
  constructor(private pool: WorkerPool) {}

  exec(method: string, params: any) {
    return this.pool.exec(method, params).timeout(TIMEOUT_MS);
  }
}

export function createWorkerPool() {
  const pool = createPool(path.join(__dirname, "worker.js"), {
    workerType: "thread",
    maxWorkers: 2,
  });

  const wrapper = new WorkerPoolWrapper(pool);
  return wrapper as any as PlasmicWorkerPool;
}
