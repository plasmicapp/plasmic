import { testCms } from "../nextjs/shared/cms-test";
import { defineE2eTests } from "./e2e-test-utils";

defineE2eTests(
  "nextjs",
  [
    { scheme: "codegen", typescript: true, appDir: true },
    { scheme: "codegen", typescript: true, appDir: false },
    { scheme: "codegen", typescript: false, appDir: true },
    { scheme: "codegen", typescript: false, appDir: false },
  ],
  async (page, host) => {
    await testCms(page, host, { checkTitle: true, checkSSR: true });
  }
);
