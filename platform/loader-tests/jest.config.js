/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 20 * 60 * 1000, // 20-minute timeout :-/
  globalSetup: "./src/globalSetup.ts",
  roots: ["./src/"],
  testPathIgnorePatterns: ["/playwright-tests/"],
};
