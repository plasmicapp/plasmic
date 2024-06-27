import { memoize, uniq } from "lodash";
import { instUtil } from "../src/wab/shared/model/InstUtil";
import { Type, isWeakRefField } from "../src/wab/shared/model/model-meta";
import {
  ClassNames,
  PartialPath,
  Path,
  handledWeakRefPaths,
} from "./handledWeakRefPaths";

const builtinTypes = new Set([
  "String",
  "Number",
  "Bool",
  "List",
  "Set",
  "Lit",
  "Any",
  "Optional",
  "Map",
  "Or",
  "StringLiteral",
]);
const flattenTypes = (type: Type): string[] => [
  type.type,
  ...type.params.flatMap((t) => (typeof t === "string" ? [] : flattenTypes(t))),
];
const getDeepInstanceTypes = memoize(
  (type: Type) =>
    uniq(
      flattenTypes(type).filter((t) => !builtinTypes.has(t))
    ) as ClassNames[],
  (t) => JSON.stringify(t)
);

const getSubClasses = memoize((_cls: ClassNames): ClassNames[] => {
  function* genSubClasses(cls: ClassNames): Generator<ClassNames> {
    yield cls;
    for (const subClass of instUtil.meta.getStrictSubclasses(
      instUtil.meta.clsByName[cls]
    )) {
      yield* genSubClasses(subClass.name as ClassNames);
    }
  }
  return [...genSubClasses(_cls)];
});

function buildHandledPaths() {
  function* genPaths(path: Path, index: number): Generator<Path> {
    if (index === path.length) {
      yield path;
      return;
    }
    const clsOrEdge = path[index];
    if (typeof clsOrEdge === "string") {
      for (const subCls of getSubClasses(clsOrEdge)) {
        const newPath = [...path];
        newPath[index] = subCls;
        yield* genPaths(newPath as Path, index + 1);
      }
    } else {
      const [cls, field] = clsOrEdge;
      for (const subCls of getSubClasses(cls)) {
        const newPath = [...path];
        newPath[index] = [subCls, field] as any;
        yield* genPaths(newPath as Path, index + 1);
      }
    }
  }
  return handledWeakRefPaths
    .flatMap((path: Path) => [...genPaths(path, 0)])
    .map((path: Path) => JSON.stringify(path));
}

const handledPaths = new Set(buildHandledPaths());

const badPaths: Path[] = [];
let seenLeaves = 0;
function checkPath(path: Path) {
  seenLeaves++;
  for (let i = 1; i < path.length; i++) {
    if (handledPaths.has(JSON.stringify(path.slice(path.length - i - 1)))) {
      return;
    }
  }
  badPaths.push(path);
}

const seenPaths = new Set<string>();

function hasSeenPath(path: PartialPath, cls: ClassNames) {
  const key = JSON.stringify([...path, cls]);
  if (seenPaths.has(key)) {
    return true;
  }
  seenPaths.add(key);
  return false;
}

function dfs(cls: ClassNames, path: PartialPath) {
  if (path.some(([cls2]) => cls2 === cls)) {
    // No need include paths with cycles; just need to visit each instance
    // type once
    return;
  }
  if (
    path.length > 1 &&
    path
      .slice(0, path.length - 1)
      .filter(([cls2, field]) =>
        getDeepInstanceTypes(
          instUtil.meta.getFieldByName(cls2, field).type
        ).some((t) => getSubClasses(t).includes(cls))
      ).length > 1
  ) {
    // We also don't allow paths that "could" have visited the same instance
    // type multiple times before. We only allow once, in order to visit
    // recursive expressions such as `Arg.expr` -> `PageHref.params` -> `VarRef.variable`
    // (we have two nested expressions in this case: `PageHRef` and `VarRef`).
    //
    // We need, however, to limit the max nesting level, because it can make the
    // number of paths explode very easily, e.g., having all permutations of
    // recursive expressions nested together, starting from paths from every
    // field that accepts `Expr`.
    return;
  }
  if (hasSeenPath(path, cls)) {
    return;
  }
  instUtil.meta
    .getStrictSubclasses(instUtil.meta.clsByName[cls])
    .forEach((strictSubCls) => dfs(strictSubCls.name as ClassNames, path));
  instUtil.meta.clsByName[cls].fields.forEach((f) => {
    if (isWeakRefField(f)) {
      getDeepInstanceTypes(f.type).forEach((instance) =>
        checkPath([...path, [cls, f.name] as any, instance])
      );
    } else {
      getDeepInstanceTypes(f.type).forEach((instance) =>
        dfs(instance, [...path, [cls, f.name] as any])
      );
    }
  });
}

function main() {
  dfs("Site", []);
  console.log({
    handledPaths: handledPaths.size,
    seenPaths: seenPaths.size,
    seenLeaves,
    badPaths: badPaths.length,
  });
  // process.exit(1);
  if (badPaths.length > 0) {
    badPaths.forEach((path) => {
      console.error(path);
    });
    console.error(
      `Found ${badPaths.length} unhandled paths ending at WeakRefs`
    );
    process.exit(1);
  }
}

main();
