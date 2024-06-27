import { ensureInstance } from "@/wab/shared/common";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { loadDepPackages } from "@/wab/server/db/DbBundleLoader";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { Bundler } from "@/wab/shared/bundler";
import { ProjectDependency, Site } from "@/wab/shared/model/classes";

const bgAtomicProps = [
  "background-image",
  "background-position",
  "background-size",
  "background-repeat",
  "background-origin",
  "background-clip",
  "background-attachment",
];

const bgImg = "background-image";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const rsIids: string[] = [];
  for (const [iid, json] of Object.entries(bundle.map)) {
    if (json.__type === "RuleSet") {
      rsIids.push(iid);
    }
  }

  const deps = await loadDepPackages(db, bundle);
  const bundler = new Bundler();

  deps.forEach((dep) => bundler.unbundle(JSON.parse(dep.model), dep.id));
  const siteOrProjectDep = ensureInstance(
    bundler.unbundle(bundle, entity.id),
    Site,
    ProjectDependency
  );

  // OBSOLETED by 183-
  // for (const iid of rsIids) {
  //   const rs = bundler.objByAddr({ iid, uuid: entity.id });
  //   if (rs) {
  //     assert(isKnownRuleSet(rs), "must be a RuleSet");
  //     const exp = new RuleSetHelpers(rs, "div");
  //     let imgVals = exp.getsRaw(bgImg);
  //     if (imgVals && imgVals.length > 0) {
  //       if (arrayEq(imgVals, ["none"]) || arrayEq(imgVals, ["initial"])) {
  //         exp.set("background", "none");
  //       } else {
  //         if (
  //           imgVals.some(
  //             (v) =>
  //               !swallow(() =>
  //                 cssPegParser.parse(v, { startRule: "backgroundImage" })
  //               )
  //           ) &&
  //           imgVals.every(
  //             (v) =>
  //               !!swallow(() =>
  //                 (
  //                   cssPegParser.parse(v, {
  //                     startRule: "commaSepValues",
  //                   }) as string[]
  //                 ).every(
  //                   (v2) =>
  //                     !!swallow(() =>
  //                       cssPegParser.parse(v2, { startRule: "backgroundImage" })
  //                     )
  //                 )
  //               )
  //           )
  //         ) {
  //           imgVals = imgVals
  //             .map(
  //               (v) =>
  //                 cssPegParser.parse(v, {
  //                   startRule: "commaSepValues",
  //                 }) as string[]
  //             )
  //             .flat();
  //           bgAtomicProps.forEach((prop) => {
  //             try {
  //               maybe(exp.getsRaw(prop), (vals) =>
  //                 exp.sets(
  //                   prop,
  //                   vals
  //                     .map(
  //                       (v) =>
  //                         cssPegParser.parse(v, {
  //                           startRule: "commaSepValues",
  //                         }) as string[]
  //                     )
  //                     .flat()
  //                 )
  //               );
  //             } catch {}
  //           });
  //         }
  //         const layers = withoutNils(
  //           range(imgVals.length).map((i) => {
  //             const getProp = (prop: string) => {
  //               const propVals = exp.getsRaw(prop);
  //               if (exp.has(prop) && propVals.length > 0) {
  //                 return propVals[i % propVals.length];
  //               }
  //               return undefined;
  //             };
  //             try {
  //               return new BackgroundLayer({
  //                 image: cssPegParser.parse(imgVals[i], {
  //                   startRule: "backgroundImage",
  //                 }),
  //                 attachment: getProp("background-attachment"),
  //                 repeat: getProp("background-repeat"),
  //                 clip: getProp("background-clip"),
  //                 origin: getProp("background-origin"),
  //                 position: getProp("background-position"),
  //                 size: getProp("background-size"),
  //               });
  //             } catch (err) {
  //               if (
  //                 (imgVals[i].startsWith("linear-gradient(") ||
  //                   imgVals[i].startsWith("repeating-linear-gradient(") ||
  //                   imgVals[i].startsWith("radial-gradient(") ||
  //                   imgVals[i].startsWith("repeating-radial-gradient(")) &&
  //                 !!swallow(() =>
  //                   cssPegParser.parse(
  //                     imgVals[i]
  //                       .replace(/NAN/g, "00")
  //                       .replace(/nan/g, "00")
  //                       .replace(/NaN/g, "00"),
  //                     {
  //                       startRule: "backgroundImage",
  //                     }
  //                   )
  //                 )
  //               ) {
  //                 console.log(`deleting layer with: ${imgVals[i]}...`);
  //                 return null;
  //               }
  //               console.log(imgVals[i]);
  //               throw err;
  //             }
  //           })
  //         );
  //         exp.sets(
  //           "background",
  //           layers.map((l) => l.showCss())
  //         );
  //       }
  //     }
  //     [...bgAtomicProps, "background-color"].forEach((prop) => exp.clear(prop));
  //     // Sometimes "clear" fails to delete the props - if the Rule ended up with
  //     // `values = []` somehow :/ so we should filter empty Rules as well:
  //     rs.children = rs.children.filter((rule) => rule.values.length > 0);
  //   }
  // }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "16-backgrounds"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
