import * as fs from "fs";
import { escapeRegExp, without } from "lodash";
import { instUtil } from "../src/wab/shared/model/InstUtil";

function main() {
  const content: string = fs.readFileSync(".eslintrc.js", "utf8").toString();
  // Omit Type because there are legitimate uses of it.
  const classNames = without(
    Object.keys(instUtil.meta.clsByName),
    "Type"
  ).sort();
  const patternString = `${classNames.join("|")}`;
  const pattern = new RegExp(escapeRegExp(patternString), "g");
  if (!content.split("\n")[0].match(pattern)) {
    console.error(
      "Please update the .eslintrc.js with the following regex expression in `const TYPES =` for checking model types:\n\n" +
        patternString
    );
    process.exit(1);
  }
}

main();
