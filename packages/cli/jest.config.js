module.exports = {
  preset: "ts-jest/presets/js-with-babel",
  reporters: [
    process.env.CI ? ["github-actions", { silent: false }] : "default",
    "summary",
  ],
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  testRunner: "jest-circus/runner",
};
