module.exports = {
  preset: "ts-jest/presets/js-with-babel",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  testRunner: "jest-circus/runner",
};
