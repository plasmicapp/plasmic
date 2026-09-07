import { testCms, testHomeRoute } from "../nextjs/shared/cms-test";
import { defineE2eTests } from "./e2e-test-utils";

defineE2eTests(
  "gatsby",
  [
    { scheme: "loader", typescript: true },
    { scheme: "loader", typescript: false },
    { scheme: "codegen", typescript: true },
    { scheme: "codegen", typescript: false },
  ],
  async (page, host, { scheme }) => {
    if (scheme === "loader") {
      // TODO: loader-gatsby creates dynamic pages at their literal path
      // (/blog/[slug]) without a matchPath, so real slugs 404. Titles only
      // keep the static part of templated strings.
      await testHomeRoute(page, host, { checkTitle: false, checkSSR: true });
    } else {
      // TODO: Gatsby's Head API renders outside the page tree, so the dynamic
      // part of the blog title is empty. CMS data is fetched client-side.
      await testCms(page, host, { checkTitle: false, checkSSR: false });
    }
  }
);
