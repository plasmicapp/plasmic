import { ICruiseResult } from "dependency-cruiser";
import * as fs from "fs";
import * as readline from "readline";
import { ensure, multimap, pairwise, tuple } from "../src/wab/shared/common";

function cleanup(path: string) {
  return `"${path.replace("src/wab/", "")}"`;
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [node, cmd, jsonPath, dotPath, queryModule] = process.argv;
  const result: ICruiseResult = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const moduleToDependents = multimap(
    result.modules.flatMap(({ source, dependencies }) =>
      dependencies.map(({ resolved }) => tuple(resolved, source))
    )
  );

  // From dependent to dependency. Only edges that are part of a chain from root to the query.
  const chainEdges = new Set<string>();
  const seenModules = new Set<string>();
  const root = "src/wab/client/canvas-entry.tsx";
  // All modules that are involved in any chain.
  const chainModules = new Set<string>([root]);

  function findPaths(module: string, path: string[] = []) {
    if (chainModules.has(module)) {
      for (const pair of pairwise([module, ...path])) {
        chainEdges.add(JSON.stringify(pair));
        chainModules.add(pair[1]);
      }
      return;
    }
    if (seenModules.has(module)) {
      return;
    }
    seenModules.add(module);
    for (const dependent of moduleToDependents.get(module) ?? []) {
      findPaths(dependent, [module, ...path]);
    }
  }
  findPaths(ensure(queryModule));
  fs.writeFileSync(
    dotPath,
    `
digraph G {
  ${[...chainEdges]
    .map((x) => JSON.parse(x))
    .map(([a, b]) => `${cleanup(a)} -> ${cleanup(b)}`)
    .join("\n")}
}
  `
  );

  const adj = new Map<string, Set<string>>();
  [...chainEdges]
    .map((x) => JSON.parse(x))
    .forEach(([a, b]) => {
      if (!adj.get(a)) {
        adj.set(a, new Set<string>());
      }
      if (!adj.get(b)) {
        adj.set(b, new Set<string>());
      }
      adj.get(a)!.add(b);
    });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    let start: string, end: string;
    let done = false;
    rl.question("Say two files (or type 0 to quit)\n", (ans) => {
      if (ans.trim() === "0") {
        rl.close();
        return;
      }
      const [a, b] = ans.split(" ").map((s) => s.trim());
      start = a;
      end = b;

      [...adj.keys()].forEach((v) => {
        if (v.includes(start)) {
          console.log("start === ", v);
          start = v;
        }
      });

      const seen = new Set<string>();
      const dfs = (u: string, path: string[]) => {
        if (seen.has(u) || done) {
          return;
        }
        seen.add(u);
        const newPath = [...path, u];
        if (u.includes(end)) {
          console.log("FOUND:\n", newPath.join("\n"));
          done = true;
        }
        for (const v of [...(adj.get(u)?.keys() || [])]) {
          dfs(v, newPath);
        }
      };

      dfs(start, []);

      if (!done) {
        console.log("Not found.");
      }
      ask();
    });
  };
  ask();
}

main();
