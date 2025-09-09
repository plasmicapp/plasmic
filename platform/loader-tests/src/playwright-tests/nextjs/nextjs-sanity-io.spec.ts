import { expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { waitForPlasmicDynamic } from "../playwright-utils";

test.describe(`NextJS Sanity.io`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "plasmic-sanity-io.json",
      projectName: "Sanity Project",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      removeComponentsPage: true,
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`should work`, async ({ page }) => {
    const fixturesPath = path.resolve(__dirname, "../../../cypress/fixtures");
    const allData = JSON.parse(
      fs.readFileSync(path.join(fixturesPath, "sanity-io-all.json"), "utf8")
    );
    const moviesData = JSON.parse(
      fs.readFileSync(path.join(fixturesPath, "sanity-io-movies.json"), "utf8")
    );
    const screeningData = JSON.parse(
      fs.readFileSync(
        path.join(fixturesPath, "sanity-io-screening.json"),
        "utf8"
      )
    );

    await page.route("**/*_type*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(allData),
      });
    });

    await page.route("**/*screening*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(screeningData),
      });
    });

    await page.route("**/*movie*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(moviesData),
      });
    });

    const imageUrls = [
      "https://cdn.sanity.io/images/b2gfz67v/production/69ad5d60ff19c456954513e8c67e9563c780d5e1-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/236a8e4d456db62a04f85c39abcfd74c50e0c37b-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/e22a88d23751a84df81f03ef287ae85fc992fe12-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/7aa06723bb01a7a79055b6d6f5be80329a0e5b58-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/60aaeca6580e3bc248678e344fab5d4e5638cc8c-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/222ce0eaef8662485762791f5c31b60ae627e83d-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/c6683ff02881704e326ca8b198af122e18513570-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/5b433475b541fc1f2903d9b281efdde7ac9c28a5-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/fc958a52785af03fea2cf33032b24b72332a5539-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/0a88401628a8205b658f2269a1718542d6a5ac44-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/332ce1adc107e1cd5444369dd88c7fcf78aaa57c-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/a1c52c102311a337b6795e207aaccf967c2b98cc-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/2db1db44ba70003091c0a1dc4c4b5eeb78dde498-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/094eaa00429d71f899271fbd223789c323587d7b-780x1170.jpg?w=300",
    ];

    for (const imageUrl of imageUrls) {
      await page.route(imageUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "base64"
          ),
        });
      });
    }

    await page.goto(ctx.host);

    await waitForPlasmicDynamic(page);

    await expect(page.getByText("WALL·E").first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator("img").first()).toHaveAttribute("src", /.+/);
  });
});
