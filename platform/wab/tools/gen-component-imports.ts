import { writeFileSync } from "fs";
import * as glob from "glob";
import { basename } from "path";
function* genStrapImports() {
  const paths = glob.sync("sub/node_modules/react-bootstrap/lib/[A-Z]*");
  yield `// Generated with gen-component-imports.ts`;
  for (const path of paths) {
    const module = basename(path).replace(/\.[^.]+$/, "");
    // No type declaration for this component for some reason.
    const modPath = JSON.stringify(path.replace("sub/node_modules/", ""));
    yield `import * as ${module} from ${modPath};`;
    yield `export { ${module} };`;
  }
}
function* genAntdImports() {
  const paths = glob.sync("sub/node_modules/antd/lib/**/[A-Z]*.js");
  yield `// Generated with gen-component-imports.ts`;
  for (const path of paths) {
    const module = basename(path).replace(/\.[^.]+$/, "");
    // THere are multiple classes named Group.
    if (module !== "Group") {
      const modPath = JSON.stringify(path.replace("sub/node_modules/", ""));
      yield `import * as ${module} from ${modPath};`;
      yield `export { ${module} };`;
    }
  }
}
writeFileSync(
  "sub/src/component-imports/StrapAuto.ts",
  [...genStrapImports()].join("\n")
);
writeFileSync(
  "sub/src/component-imports/AntdAuto.ts",
  [...genAntdImports()].join("\n")
);
