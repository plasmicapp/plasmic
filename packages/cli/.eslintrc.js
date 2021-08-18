module.exports = {
  // Make sure we don't end up using .eslintrc.js from our cicd repo
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    // "eslint:recommended",
    // "plugin:@typescript-eslint/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 11,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "no-restricted-properties": [
      "error",
      {
        property: "readFileSync",
      },
      {
        property: "writeFileSync",
      },
      {
        property: "existsSync",
      },
      {
        property: "unlinkSync",
      },
      {
        property: "renameSync",
      },
      {
        object: "process",
        property: "exit",
        message:
          "CLI can be used as a library. Please throw Error or HandledError instead.",
      },
      {
        object: "console",
        message:
          "Please use `logger` so that consumers of the library can control logging.",
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.name='readFileSync']",
      },
      {
        selector: "CallExpression[callee.name='writeFileSync']",
      },
      {
        selector: "CallExpression[callee.name='existsSync']",
      },
    ],
  },
};
