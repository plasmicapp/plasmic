module.exports = {
  "*.{js,jsx,ts,tsx,cjs,mjs,cts,mts}": ["eslint --fix", "prettier --write"],
  "*.{json,css,less,scss,md,toml,xml,yml,yaml}": ["prettier --write"],
  "Dockerfile*": ["hadolint --failure-threshold=warning"],

  // Format HCL/Terragrunt files, but never touch generated *.lock.hcl (excluded via extglob)
  "!(*lock).hcl": (files) => {
    // Prefer terragrunt's formatter for *.hcl; fall back to terraform fmt if needed
    return files.map((f) => `terragrunt hclfmt --file "${f}"`);
  },

  // Terraform files (format on commit)
  "*.tf": ["terraform fmt -write=true"],

  "platform/wab/src/wab/server/bundle-migrations/**/*": [
    "platform/wab/tools/bundle-migration-check.sh",
  ],
  "platform/wab/src/wab/server/db/check-bundle-migrations.ts": [
    "platform/wab/tools/bundle-migration-check.sh",
  ],

  "platform/wab/src/wab/server/pkg-mgr/**/*.{json,ts}": [
    "tsx --tsconfig platform/wab/tsconfig.tools.json platform/wab/src/wab/server/pkg-mgr/plume-pkg-mgr.ts check",
  ],
  "platform/wab/src/wab/shared/model/model-schema.ts": [
    "tsx --tsconfig platform/wab/tsconfig.tools.json platform/wab/tools/check-instanceof-model.ts",
    // TODO: re-enable checkWeakRefs? currently has 600+ unhandled paths
    // "tsx --tsconfig platform/wab/tsconfig.tools.json platform/wab/tools/checkWeakRefs.ts",
  ],
};
