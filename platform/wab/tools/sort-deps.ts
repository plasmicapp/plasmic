/**
 * This was useful at some point for analyzing the dependency graph, finding
 * circular dependencies, etc.
 */

import * as fs from "fs";
import { Set } from "immutable";
import L from "lodash";

const content = fs.readFileSync("./a.json", { encoding: "utf8" });
const graph = JSON.parse(content) as { [key: string]: string[] };

const ordered: string[] = [];
let added = Set<string>();
function crawl(node: string) {
  let crawled = Set<string>([node]);
  const queue = [node];
  while (queue.length > 0) {
    const next = queue.shift()!;
    crawled = crawled.add(next);
    for (const neighbor of graph[next]) {
      if (!crawled.has(neighbor) && !queue.includes(neighbor)) {
        queue.push(neighbor);
      }
    }
  }
  return crawled;
}
let iteration = 0;
while (ordered.length < L.size(graph)) {
  console.log(
    iteration++,
    L(graph)
      .keys()
      .difference(ordered)
      .map((node) => [added.union(crawl(node)).size, node])
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .sortBy(([a, b]) => a)
      .value()
  );
  const bestNode = L(graph)
    .keys()
    .difference(ordered)
    .sortBy((node) => added.union(crawl(node)).size)
    .head()!;
  ordered.push(bestNode);
  added = added.union(crawl(bestNode));
}

console.log(
  ordered
    .filter((x) => !x.includes("/gen/"))
    .map((x) => `import "./${x}";`)
    .join("\n")
);
