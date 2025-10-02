import { logger } from "@/wab/server/observability";
import { arrayEq, ensure, spawn, spawnWrapper } from "@/wab/shared/common";
import fs from "fs";
import { last } from "lodash";
import path from "path";
import yargs from "yargs";

interface CheckArgs {
  files: string[];
}

const migrationSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

async function checkBundleFiles({ files }: CheckArgs) {
  files.sort(migrationSorter.compare);
  files.forEach((file, i) => {
    if (i + 1 < files.length) {
      const id = +ensure(
        last(file.split("/")),
        () => `Unexpected file ${file}`
      ).split("-")[0];
      const nextId = +ensure(
        last(files[i + 1].split("/")),
        () => `Unexpected file ${files[i + 1]}`
      ).split("-")[0];
      if (id + 1 !== nextId) {
        throw new Error("Invalid migration index");
      }
    }
  });

  files.forEach((file) => {
    const content = fs.readFileSync(file).toString();
    if (
      !content.includes("export const MIGRATION_TYPE: BundleMigrationType =")
    ) {
      throw new Error(`Must export MIGRATION_TYPE from migration file ${file}`);
    }
    // Script may be unbundling if it calls upgradeHostlessProject(),
    // instantiates a Bundler, or uses the DbMgr
    // (which is not passed to BundledMigrationFn)
    const maybeUnbundling =
      content.includes("upgradeHostlessProject(") ||
      content.includes("new Bundler") ||
      content.includes("new FastBundler") ||
      content.includes("db.");
    if (content.includes(`= "bundled"`) && maybeUnbundling) {
      throw new Error(
        `Migration marked as bundled, but seems to be unbundling: ${file}`
      );
    } else if (content.includes(`= "unbundled"`) && !maybeUnbundling) {
      throw new Error(
        `Migration marked as unbundled, but doesn't seem to be unbundling: ${file}`
      );
    }
  });
  const savedList = (() => {
    try {
      return fs
        .readFileSync(path.join(__dirname, "migrations-list.txt"))
        .toString()
        .split("\n");
    } catch (err) {
      if (err.message.includes("ENOENT")) {
        return [];
      }
      throw err;
    }
  })();
  if (!arrayEq(files, savedList)) {
    fs.writeFileSync(
      path.join(__dirname, "migrations-list.txt"),
      files.join("\n")
    );
    throw new Error("Stale migrations list");
  }
}

export async function main() {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  yargs
    .usage("Usage: $0 check <files...>")
    .command<CheckArgs>(
      "check <files...>",
      "Check list of bundle migrations",
      (yargs2) =>
        yargs2.positional("files", {
          describe: "A list of bundle migration files",
        }),
      spawnWrapper((args) =>
        checkBundleFiles(args).catch((err) => {
          logger().error("Error on check list of bundle migrations", err);
          process.exit(1);
        })
      )
    )
    .demandCommand()
    .help("h")
    .alias("h", "help").argv;
}

if (require.main === module) {
  spawn(
    main().catch((err) => {
      logger().error("Error on check-bundle-migrations", err);
      process.exit(1);
    })
  );
}
