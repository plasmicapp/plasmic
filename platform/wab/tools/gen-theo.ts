import * as fs from "fs";
import { groupBy } from "lodash";
import { TheoToken } from "../src/wab/shared/codegen/style-tokens";

function main() {
  // Get command line arguments
  const [inputFile, outputFile] = process.argv.slice(2);

  // Read the tokens from the input theo JSON file
  const tokens: TheoToken[] = JSON.parse(
    fs.readFileSync(inputFile, "utf8")
  ).props;

  // Generate code based on output file extension
  let output: string;
  if (outputFile.endsWith(".sass")) {
    output = generateOutput(
      tokens,
      toSassVarName,
      (varName, cssValue) => `$${varName}: ${cssValue}`
    );
  } else if (outputFile.endsWith(".ts")) {
    output = generateOutput(
      tokens,
      toTsVarName,
      (varName, cssValue) => `export const ${varName} = "${cssValue}";`
    );
  } else {
    throw new Error(`can only output .sass and .ts, not ${outputFile}`);
  }

  // Write output files
  fs.writeFileSync(outputFile, output);
  console.log(`✅ Generated ${outputFile}`);
}

function generateOutput(
  tokens: TheoToken[],
  toVarName: (tokenName: string) => string,
  toCode: (varName: string, cssValue: string) => string
): string {
  return [...Object.entries(groupBy(tokens, (token) => toVarName(token.name)))]
    .map(([varName, dupTokens]) => {
      const code = toCode(varName, dupTokens[0].value);
      if (dupTokens.length === 1) {
        return code;
      } else {
        console.warn(`Token "${varName}" has ${dupTokens.length} duplicates`);
        return code + ` // WARNING: ${dupTokens.length} duplicates`;
      }
    })
    .map((line) => line + "\n")
    .join("");
}

function toSassVarName(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2") // Add hyphens between camelCase
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

function toTsVarName(str: string): string {
  // First convert to kebab style to normalize
  const kebab = toSassVarName(str);

  // Then convert to camelCase, handling numbers properly
  return kebab.replace(/-([a-z0-9])/gi, (_, char) => char.toUpperCase());
}

main();
