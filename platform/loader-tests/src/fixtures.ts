import { test as base } from "@playwright/test";

// Captured once at module load, so every test's wrapper writes through to
// the real console.log instead of wrapping the previous test's wrapper.
const origConsoleLog = console.log;

export const test = base.extend<{ saveLogs: void }>({
  saveLogs: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, testInfo) => {
      const prefix = `[${process.pid} ${testInfo.titlePath[0]}:${testInfo.line}]`;
      const testConsoleLog = (...args: any[]) =>
        origConsoleLog(prefix, ...args);
      console.log = testConsoleLog;
      console.log("STARTING", testInfo.titlePath.join(" > "));
      await use();
      console.log("ENDING", testInfo.titlePath.join(" > "));
      // Only restore if a later test hasn't already installed its own wrapper.
      if (console.log === testConsoleLog) {
        console.log = origConsoleLog;
      }
    },
    { auto: true },
  ],
});
