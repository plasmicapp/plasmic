const styleVariables = require("./css-variables.json");
const fs = require("fs");
const path = require("path");

fs.writeFileSync(
  path.join(__dirname, "./css-variables.ts"),
  Object.entries(styleVariables)
    .map(([k]) => `export const ${k} = "--${k}";`)
    .join("\n")
);

fs.writeFileSync(
  path.join(__dirname, "./css-variables.scss"),
  [
    Object.entries(styleVariables)
      .map(([k]) => `$${k}: var(--${k});`)
      .join("\n"),
    `:root {
      ${Object.entries(styleVariables)
        .filter(([_, v]) => Boolean(v))
        .map(([k, v]) => `--${k}: ${v};`)
        .join("\n")}  
    }`,
  ].join("\n\n")
);
