/** ESLint config for packages NOT using frameworks like React. */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  rules: {
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "prefer-const": "warn",
    "no-restricted-imports": [
      "error",
      {
        name: "@plasmicapp/host",
        importNames: ["registerComponent"],
        message:
          "Please import from @plasmicapp/host/registerComponent instead",
      },
    ],
  },
};
