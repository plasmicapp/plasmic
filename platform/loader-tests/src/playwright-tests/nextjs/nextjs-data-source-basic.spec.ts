import { expect, test } from "@playwright/test";
import { getEnvVar } from "../../env";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

test.describe(`Data Source basic`, async () => {
  let ctx: NextJsContext;
  test.beforeEach(async () => {
    ctx = await setupNextJs({
      bundleFile: "data-source-basic.json",
      projectName: "Data Source basic",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      removeComponentsPage: true,
      dataSourceReplacement: {
        type: "pokedex",
      },
    });
  });

  test.afterEach(async () => {
    await teardownNextJs(ctx);
  });

  test(`it works`, async ({ page }) => {
    await page.goto(`${ctx.host}/pokedex`);

    await page.getByText("New pokemon").click();
    await page.getByLabel("Name").type("Totodile");
    await page.getByLabel("Description").type("Friendly alligator");
    await page
      .getByLabel("Image URL")
      .type("https://assets.pokemon.com/assets/cms2/img/pokedex/full/158.png");

    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Totodile")).toBeVisible();
    await expect(page.getByText("Friendly alligator")).toBeVisible();
    await expect(
      page.locator(
        `img[src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/158.png"]`
      )
    ).toBeVisible();
    await page.getByText("Edit").last().click();
    await page
      .getByLabel("Update pokemon")
      .locator("#description")
      .type("Ferocious alligator");
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page.getByText("Ferocious alligator")).toBeVisible();
    await page.getByText("Delete").last().click();
    await page.getByText("Totodile").waitFor({ state: "detached" });
  });
});
