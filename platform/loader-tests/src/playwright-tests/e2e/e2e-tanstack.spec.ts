import { testCms } from "../nextjs/shared/cms-test";
import { defineE2eTests } from "./e2e-test-utils";

defineE2eTests(
  "tanstack",
  [
    // loader not supported for tanstack
    { scheme: "codegen", typescript: true },
    { scheme: "codegen", typescript: false },
  ],
  async (page, host) => {
    // TODO: Assert dynamic titles for tanstack
    await testCms(page, host, { checkTitle: false, checkSSR: false });
  }
);
