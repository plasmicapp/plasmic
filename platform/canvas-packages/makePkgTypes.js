/* eslint-disable @typescript-eslint/no-var-requires */
const typedPkgNames = require("./typedPkgsList.json");

const fs = require("fs");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);
const lockfileParser = require("@yarnpkg/lockfile");

const lockfile = fs.readFileSync("yarn.lock", "utf8");
const tree = lockfileParser.parse(lockfile);

// For each hostless code library, we need to provide the typescript declaration
// files for the code editor to use.
// To do so, `typedPkgsList` should contain the list of NPM packages that need
// to be typed.
const genTsFiles = async () => {
  for (const rootPkg of typedPkgNames) {
    // For each NPM package, we generate `src/generated-types/pkgName.json`
    // containing the file names (w/ path), and contents for `package.json` and
    // the `.d.ts` files, in the format `{ fileName: string, contents: string }`

    // Because the NPM package might depend on other packages, we traverse the
    // dependencies and generate types for them as well.
    const mainVersion = require(`./package.json`).dependencies[rootPkg];
    const files = [];
    const data = { files };
    const alreadyIncludedInTopLevel = new Set();
    const dfs = async (pkgName, versionRange, path) => {
      // We need to generate the types for each `pkgName` and `versionRange`,
      // since different versions of the same file might have different types.

      // The `pkgData`, from the lockfile, contains the resolved version for
      // the given version range.
      const pkgData = tree.object[`${pkgName}@${versionRange}`];

      // If the resolved version is installed at the top-level `node_modules`
      // (and not, for example, in `node_modules/otherPkg/node_modules`), then
      // we don't need to re-generate types for this version.
      if (alreadyIncludedInTopLevel.has(`${pkgName}@${pkgData.version}`)) {
        return;
      }

      // Try to find it in node_modules with pkgName + path
      // If none is found, try again looking for @types/pkgName
      const typesPkgName = `@types/${pkgName
        .replace("@", "")
        .replace(/\//g, "__")}`;
      for (const lookupName of [pkgName, typesPkgName]) {
        // We look for a local `node_module` and go up in the directory
        // tree until we find a corresponding `node_module` for the given
        // package
        const newPath = [...path];
        while (true) {
          const pathStr = `./${newPath
            .map((pkg) => `node_modules/${pkg}/`)
            .join("")}node_modules/${lookupName}`;
          // Once we find a package with types, we grab all `.d.ts` files
          const tsFiles = await (async () => {
            try {
              return (
                await exec(
                  `bash -c "test -d ${pathStr} && find ${pathStr} -name *.d.ts -type f -not -path '${pathStr}/node_modules'"`
                )
              ).stdout
                .split("\n")
                .filter((l) => !!l);
            } catch {
              return [];
            }
          })();

          if (tsFiles.length > 0) {
            if (!newPath.length) {
              alreadyIncludedInTopLevel.add(`${pkgName}@${pkgData.version}`);
            }

            for (const tsFile of tsFiles) {
              const contents = fs.readFileSync(tsFile, "utf8");
              files.push({
                fileName: tsFile,
                contents,
              });
            }

            if (fs.existsSync(`${pathStr}/package.json`)) {
              const contents = fs.readFileSync(
                `${pathStr}/package.json`,
                "utf8"
              );
              files.push({
                fileName: `${pathStr}/package.json`,
                contents,
              });
            }

            // Now grab types from its dependencies
            for (const [dep, version] of Object.entries(
              pkgData.dependencies ?? {}
            )) {
              await dfs(dep, version, [...newPath, pkgName]);
            }
            return;
          }

          if (newPath.length === 0) {
            // If we are already at the top directory, assume there are no types
            // for that package.
            break;
          } else {
            // If no types were found, try again in the parent directory
            newPath.pop();
          }
        }
      }
    };
    await dfs(rootPkg, mainVersion, []);
    fs.mkdirSync(`./src/generated-types/${rootPkg.split("/").slice(0, -1)}`, {
      recursive: true,
    });
    fs.writeFileSync(
      `./src/generated-types/${rootPkg}.json`,
      JSON.stringify(data, undefined, 2)
    );
  }
};
genTsFiles();
