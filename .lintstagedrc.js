module.exports = {
  "*.{js,jsx,ts,tsx,cjs,mjs,cts,mts}": (files) => {
    // Examples lint themselves via `next lint`; the monorepo eslint can't
    // load their eslint-config-next (`extends` resolves before ignores).
    const eslintable = files.filter((f) => !/(^|\/)examples\//.test(f));
    const cmds = [];
    if (eslintable.length) {
      cmds.push(`eslint --fix ${eslintable.map((f) => `"${f}"`).join(" ")}`);
    }
    cmds.push(`prettier --write ${files.map((f) => `"${f}"`).join(" ")}`);
    return cmds;
  },
  "*.{json,css,less,scss,md,toml,xml,yml,yaml}": ["prettier --write"],
  "Dockerfile*": ["hadolint --failure-threshold=error"],

  // Format HCL/Terragrunt files, but never touch generated *.lock.hcl (excluded via extglob)
  "!(*lock).hcl": (files) => {
    return files.map((f) => `terragrunt hcl format --file "${f}"`);
  },

  // Terraform files (format on commit)
  "*.tf": (files) => {
    const path = require("path");
    const dirs = [...new Set(files.map((f) => path.dirname(f)))];
    return [
      "tofu fmt -write=true",
      ...dirs.map((d) => `tflint --chdir "${d}"`),
    ];
  },

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
