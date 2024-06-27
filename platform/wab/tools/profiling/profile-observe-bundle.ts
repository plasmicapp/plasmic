import fs from "fs";
import { last } from "lodash";
import { ChangeRecorder } from "../../src/wab/observable-model";
import { Bundler } from "../../src/wab/shared/bundler";
import { maybe, spawn } from "../../src/wab/shared/common";
import { instUtil } from "../../src/wab/shared/model/InstUtil";
import { Site } from "../../src/wab/shared/model/classes";
import { meta } from "../../src/wab/shared/model/classes-metas";

const prettyTime = (interval: number) => `${interval.toFixed(2)}ms`;
const prettyMemory = (mem: number) => `${(mem / 1024 / 1024).toFixed(2)}MB`;
const gc = (globalThis as any).gc;

function measured<T>(msg: string, func: () => T) {
  const start = performance.now();
  const heapStart = process.memoryUsage().heapUsed;
  const result = func();
  const time = performance.now() - start;
  const heapEnd = process.memoryUsage().heapUsed;
  gc();
  const heapEndGc = process.memoryUsage().heapUsed;
  console.log(`DONE ${msg};
  \tTime: ${prettyTime(time)}
  \tMemory: ${prettyMemory(heapEnd - heapStart)}
  \tMemory (after GC): ${prettyMemory(heapEndGc - heapStart)}
  \tTotal heap: ${prettyMemory(heapEnd)}
  \tTotal heap (after GC): ${prettyMemory(heapEndGc)}`);
  return result;
}

async function main() {
  if (!gc) {
    throw new Error(`Must run with "node --expose-gc"`);
  }
  const bundleFile = process.argv[2];
  console.log("Using file", bundleFile);

  gc();
  console.log("STARTING", `${prettyMemory(process.memoryUsage().heapUsed)}`);

  const bundles = measured("Parsing", () =>
    JSON.parse(fs.readFileSync(bundleFile).toString())
  );

  const bundler = new Bundler();

  const [siteUuid, site] = measured("Unbundling", () => {
    let site_: Site;
    for (const [uuid, bundle] of bundles) {
      site_ = bundler.unbundle(bundle, uuid) as Site;
    }

    const siteUuid_ = (last(bundles) as any)?.[0] as string;
    return [siteUuid_, site_!];
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recorder = measured(
    "Observing",
    () =>
      new ChangeRecorder(
        site!,
        instUtil,
        [meta.getFieldByName("ProjectDependency", "site")],
        [],
        (obj) => !!maybe(bundler.addrOf(obj), (addr) => addr.uuid !== siteUuid)
      )
  );
}

if (require.main === module) {
  spawn(main());
}
