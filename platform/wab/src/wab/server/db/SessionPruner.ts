import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { createDbConnection } from "@/wab/server/db/dbcli-utils";
import { logger } from "@/wab/server/observability";
import { delay, ensure } from "@/wab/shared/common";
import { Command, InvalidArgumentError } from "commander";

export interface SessionPruneOptions {
  batchSize: number;
  pauseMs: number;
  maxDurationSeconds: number;
}

function parseInteger(value: string, minimum: number) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new InvalidArgumentError(`Expected an integer >= ${minimum}`);
  }
  return parsed;
}

export async function pruneExpiredSessions(
  db: Pick<DbMgr, "deleteExpiredSessionsBatch">,
  options: SessionPruneOptions,
) {
  const expiredAtOrBefore = Date.now();
  const maxDurationMs = options.maxDurationSeconds * 1000;
  const stopPruningAt = expiredAtOrBefore + maxDurationMs;
  let deleted = 0;
  let batches = 0;
  let reason: "deadline" | "exhausted" = "deadline";
  let expiredAtOrAfter: number | undefined;

  logger().info("Start pruning expired sessions", {
    expiredAtOrBefore,
    batchSize: options.batchSize,
    pauseMs: options.pauseMs,
    maxDurationSeconds: options.maxDurationSeconds,
  });

  while (Date.now() < stopPruningAt) {
    const batch = await db.deleteExpiredSessionsBatch(
      expiredAtOrBefore,
      options.batchSize,
      expiredAtOrAfter,
    );
    batches++;
    deleted += batch.deleted;
    logger().info("Pruned expired session batch", {
      ...batch,
      totalDeleted: deleted,
      batches,
    });

    if (batch.selected === 0) {
      reason = "exhausted";
      break;
    }

    expiredAtOrAfter = ensure(
      batch.lastExpiredAt,
      "Missing session pruning cursor",
    );
    await delay(options.pauseMs);
  }

  logger().info("Done pruning expired sessions", {
    deleted,
    batches,
    reason,
    expiredAtOrBefore,
  });
  return { deleted, batches, reason, expiredAtOrBefore };
}

export async function main() {
  const options = new Command("session pruner")
    .option("-db, --dburi <dburi>", "Database uri", DEFAULT_DATABASE_URI)
    .option(
      "--batch-size <number>",
      "Sessions per batch",
      (value) => parseInteger(value, 1),
      1000,
    )
    .option(
      "--pause-ms <number>",
      "Pause between batches in milliseconds",
      (value) => parseInteger(value, 0),
      250,
    )
    .option(
      "--max-duration-seconds <number>",
      "Maximum run duration",
      (value) => parseInteger(value, 1),
      3300,
    )
    .parse(process.argv)
    .opts<SessionPruneOptions & { dburi: string }>();

  const connection = await createDbConnection(options.dburi);
  try {
    await pruneExpiredSessions(
      new DbMgr(connection.manager, SUPER_USER),
      options,
    );
  } finally {
    await connection.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    logger().error("Session pruning failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exitCode = 1;
  });
}
