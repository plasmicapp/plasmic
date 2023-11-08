import { test as base } from "@playwright/test";

export const test = base.extend<{ saveLogs: void }>({
  saveLogs: [
    async ({}, use, testInfo) => {
      const origConsoleLog = console.log;
      console.log = (...args) => {
        origConsoleLog(
          `[${process.pid} ${testInfo.titlePath[0]}:${testInfo.line}]`,
          ...args
        );
      };
      console.log("STARTING", testInfo.titlePath.join(" > "));
      await use();
      console.log("ENDING", testInfo.titlePath.join(" > "));

      // The following very bizarre ordering can happen:
      // [78 nextjs/antd5/rate.spec.ts:32] ENDING nextjs/antd5/rate.spec.ts > Plasmic Antd5 Rate > loader-nextjs@latest, next@^12 > Rate s
      // [XX 78 nextjs/antd5/rate.spec.ts:32] [78 nextjs/antd5/tabs.spec.ts:32] STARTING nextjs/antd5/tabs.spec.ts > Plasmic Antd5 Tabs >
      // Somehow, although the previous test's ENDING is printed after the next test's STARTING (as expected),
      // the next test is actually starting before the previous test ends/restores console.log,
      // and thus the next test's origConsoleLog is the prev test's console.log!
      console.log = (...args) => {
        origConsoleLog(
          `[XX ${process.pid} ${testInfo.titlePath[0]}:${testInfo.line}]`,
          ...args
        );
      };
      // console.log = origConsoleLog;
    },
    { auto: true },
  ],
});
