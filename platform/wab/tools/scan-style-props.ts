/**
 * Prints out all invalid style props in use (and which projects have them), as
 * determined by isValidStyleProp().
 */

import _ from "lodash";
import { getConnection } from "typeorm";
import { ensureDbConnection } from "../src/wab/server/db/DbCon";
import { withDbModels } from "../src/wab/server/db/Migrator";
import { ProjectRevision } from "../src/wab/server/entities/Entities";
import { genAsync, multimap, tuple } from "../src/wab/shared/common";
import { isValidStyleProp } from "../src/wab/shared/core/style-props";

async function main() {
  await ensureDbConnection();
  const pairs = await genAsync<[string, string, string]>(async (emit) => {
    await getConnection().transaction(async (txMgr) => {
      await withDbModels(txMgr, async (db, bundle, dbRow) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [k, v] of Object.entries(bundle.map)) {
          if (v.__type === "Rule") {
            emit(
              tuple(
                v.name,
                dbRow instanceof ProjectRevision ? dbRow.projectId : dbRow.id,
                v.values
              )
            );
          }
        }
      });
    });
  });
  const stylePropToProjectIds = multimap(
    _.uniqBy(
      pairs.map(([a, b]) => tuple(a, b)),
      JSON.stringify
    )
  );
  const stylePropToValues = multimap(
    _.uniqBy(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      pairs.map(([a, b, c]) => tuple(a, c)),
      JSON.stringify
    )
  );
  console.log("== Invalid props ==");
  for (const [styleProp, projectIds] of stylePropToProjectIds.entries()) {
    if (!isValidStyleProp(styleProp)) {
      console.log(
        `- ${styleProp}: ${stylePropToValues.get(styleProp)}\n${projectIds}`
      );
    }
  }
  console.log("== All props ==");
  console.log(
    [...stylePropToProjectIds.entries()]
      .map(([styleProp, projectIds]) => `${styleProp}: ${projectIds.length}`)
      .sort()
      .join("\n")
  );
}

main();
