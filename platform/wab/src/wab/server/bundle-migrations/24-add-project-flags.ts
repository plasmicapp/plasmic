import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";

export const migrate: BundledMigrationFn = async (bundle, entity) => {
  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "Site") {
      inst["flags"] = {};
      if (
        projectIdsUsingPlasmicImg.has(entity.id) ||
        (entity instanceof PkgVersion &&
          projectIdsUsingPlasmicImg.has(entity.pkgId)) ||
        (entity instanceof ProjectRevision &&
          projectIdsUsingPlasmicImg.has(entity.projectId))
      ) {
        inst["flags"].usePlasmicImg = true;
      }
    }
  }
};

const projectIdsUsingPlasmicImg = new Set([
  // Dev bundles
  "id",

  // From devflags
  "kjuFFTSZb8fanzCHT2C1jz",
  "be3iwSZSRqjW19FBcALBPZ",
  "3PTKZLNd57QdjirJkbL9TZ",
  "ukPFVCMnAvkWNmmar7jcvi",
  "sfbZ9jvXZmaPw6PMg43H5U",
  "tpaYCxiyD9GxBTpZF65Y5o",
  "wfyHiJRnADGDeffJ4ihos1",
  "in6h1s1E8wMhshv721A27K",
  "54nUpmGGrJSezWfiuJnNHt",
  "bxMsMEqebSzRvGAwxB9tU3",
  "tFEwUuSq7AosmutVdWWVti",
  "8n9XSbRdFRLAt5dELEQwsv",
  "c7tGRVmeJ2GzNnnNZPj9Lp",
  "rMptvsAjZmosFYwA5uPzB8",
  "rcjVMxB6qKhGfoHrunVhqr",
  "4QxX6iwevFdNQHXhFw5Fzr",
  "381nQEB9wa8am1XALy1hKG",
  "6Wru3mcZP4xcAwBuVcobJh",
  "mcPeL4YNUz2MWQoppLQB6f",

  // Current starter releases
  "h5yFRrNfgfn7PeVQ1gSM6Z",
  "uH2TcxhGBVb2jMvpSK4T2N",
  "e4G4ZhKAw3zvHnmEWTEg1P",
  "dC27XMEqTTLZWmojD9ohwZ",
  "wFbFWMK5de8HSu1fyDeZDT",
  "pybk1g1g7kSmbUTJT7xTMH",
  "3gM4xrSdYFXoe1exZP2Pz5",
  "tqXTJe6DB4a1iJzWzrEz5R",
  "wy3QtFAtDBFaUooK4fsGV9",
  "szkCsrqPBS9MxWgdqT3sgo",
  "5SRJabuQTj7qz3iPbrWbwr",
  "caCnsZyB1882VuQ4D7Rjqx",
  "4anDwDfWrhkaCT7psjMwG1",

  // Landing Kit
  "3SwC2F4BeXucfS9cpFbd24",

  // Plume
  "tH77ekFNugan8Yv3d3xJez",

  // Primary copies (from Starter Projects workspace)
  "iYCLUNn8WMpw1U62MWQZGm",
  "euZipmXYVJ8mwVgFeFc5L5",
  "dNySwnLadyRahnMZR7skqu",
  "bT6dMi84CLhP3ovSWmvZH8",
  "qGzUYrSXGh2G1seMTJAame",
  "rimshGbkWB5wYc3b5NM51o",
  "cvXUzqk57WomqvTqXQ1QYL",
  "wDHK8xohJTQMyVDcVMDaJH",
  "b49KPkrvPCTnVu1XmBGo7j",
  "aPZu6epBt5EaEYRgMF1d6z",
  "26M4XssRY4W52SZG1ZxtG5",
  "55A93f171M8gjeFzAjQ9wx",
  "vP9xXLvZ7Ms4GyJbDi1yom",
  "qHHB9UthLR9FiAbZWsXhER",
  "QjRHpHmEJ32NBpDRFrUUm",

  // PkgIds
  "0ebf2464-51c9-4bd1-a6b8-d5f0b6c236f7",
  "6ac5f8b0-2214-4b0d-aa0a-4dc96ec60004",
  "079b163a-f92e-426a-8f13-a652a12fcf89",
  "cd919620-d87d-4f9d-b18d-94edfaecb99b",
  "9b77d612-3587-4915-a0fa-68cb48276f0f",
  "98505ca5-add3-49fc-b065-4bfe5828e697",
  "729c73e5-48bd-4251-9c4b-a02d50c40afb",
]);

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
