import { testHomeRoute } from "../nextjs/shared/cms-test";
import { defineE2eTests } from "./e2e-test-utils";

defineE2eTests(
  "react",
  [
    // loader not supported for react
    { scheme: "codegen", typescript: true },
    { scheme: "codegen", typescript: false },
  ],
  async (page, host) => {
    // TODO: Titles (static / dynamic) set in Plasmic Studio do not currently work for React
    await testHomeRoute(page, host, { checkTitle: false, checkSSR: false });
  }
);
