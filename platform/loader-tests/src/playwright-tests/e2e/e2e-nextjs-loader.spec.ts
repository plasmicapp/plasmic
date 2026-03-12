import { testCms } from "../nextjs/shared/cms-test";
import { defineE2eTests } from "./e2e-test-utils";

defineE2eTests(
  "nextjs",
  [
    { scheme: "loader", typescript: true, appDir: true },
    { scheme: "loader", typescript: true, appDir: false },
    { scheme: "loader", typescript: false, appDir: true },
    { scheme: "loader", typescript: false, appDir: false },
  ],
  async (page, host) => {
    await testCms(page, host, { checkTitle: true, checkSSR: true });
  }
);
