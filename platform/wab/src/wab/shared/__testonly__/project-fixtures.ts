import { Bundle } from "@/wab/shared/bundles";
import fs from "fs";
import path from "path";

function readBundles(relPath: string): [string, Bundle][] {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "../..", relPath), "utf8"),
  );
}

export function loadStarterBundles(): [string, Bundle][] {
  return readBundles(
    "shared/web-exporter/bundles/starter-project-desktop-first.json",
  );
}

export function loadPlexusBundles(): [string, Bundle][] {
  return readBundles("server/pkg-mgr/data/plexus-master-pkg.json");
}
