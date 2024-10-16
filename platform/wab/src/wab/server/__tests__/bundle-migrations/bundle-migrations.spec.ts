import { migrateInMemory } from "@/wab/server/scripts/dev-bundle-migrator";
import fs from "fs";
import path from "path";
import * as Prettier from "prettier";

// temporarily change this to true to write input and expected bundles
const WRITE_FILES = false;

const FIXTURES_DIR = "src/wab/server/__tests__/bundle-migrations/fixtures";
const EXPECTED_EXT = ".migrated.json";
const PRETTIER_OPTS: Prettier.Options = {
  parser: "json",
  printWidth: 0, // force nested members on their own lines
  trailingComma: "none",
};

describe("bundle-migrations", () => {
  fs.readdirSync(FIXTURES_DIR)
    .filter(
      (fileName) =>
        fileName.endsWith(".json") && !fileName.endsWith(EXPECTED_EXT)
    )
    .forEach((fileName) => {
      it(`migrates ${fileName}`, async () => {
        const inputFilePath = path.join(FIXTURES_DIR, fileName);
        const expectedFilePath = inputFilePath.replace(".json", EXPECTED_EXT);
        const inputBundle = fs.readFileSync(inputFilePath, {
          encoding: "utf8",
        });
        const expectedBundle = fs.readFileSync(expectedFilePath, {
          encoding: "utf8",
        });
        const outputBundle = await migrateInMemory(inputBundle);

        if (WRITE_FILES) {
          console.log(`Formatting input at ${inputFilePath}`);
          fs.writeFileSync(
            inputFilePath,
            Prettier.format(inputBundle, PRETTIER_OPTS)
          );
          console.log(`Writing output to ${expectedFilePath}`);
          fs.writeFileSync(
            expectedFilePath,
            Prettier.format(outputBundle, PRETTIER_OPTS)
          );
          expect(WRITE_FILES).toBe(false);
        }

        expect(Prettier.format(outputBundle, PRETTIER_OPTS)).toEqual(
          Prettier.format(expectedBundle, PRETTIER_OPTS)
        );
      });
    });
});
