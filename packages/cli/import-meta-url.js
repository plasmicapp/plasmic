// Needed to handle ESM-only modules that rely on `import.meta.url` (prettier@3)
// https://github.com/evanw/esbuild/issues/1492#issuecomment-893144483
export const import_meta_url = require("url").pathToFileURL(__filename);
