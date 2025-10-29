import { expect } from "@playwright/test";
import { test } from "../../fixtures/test";

test.describe("create-data-source", () => {
  let dataSourceName: string;

  test.beforeEach(async ({ apiClient, page, context, request }) => {
    await apiClient.makeApiClient(
      request,
      context,
      "user@example.com",
      "!53kr3tz!"
    );
    await page.goto("/projects/", { timeout: 120000 });
  });

  test.afterEach(async ({ models }) => {
    await models.studio.deleteDataSource(dataSourceName);
  });

  test("can create postgres data source", async ({ page }) => {
    dataSourceName = "Postgres Test";

    await page.getByText("Plasmic's First Workspace").click();
    await page.getByText("Integrations").click();
    await page.getByText("New integration").click();
    await page.waitForTimeout(1000);

    const dataSourcePicker = page.locator(
      `[data-test-id="data-source-picker"]`
    );
    await dataSourcePicker.click();
    await page.getByRole("option", { name: "Postgres" }).click();

    const nameInput = page.locator(`[data-test-id="data-source-name"]`);
    await nameInput.click();
    await nameInput.fill(dataSourceName);

    const connectionStringInput = page.locator(
      `[data-test-id="postgres-connection-string"]`
    );
    await connectionStringInput.click();

    const promptInput = page.locator(`[data-test-id="prompt"]`);
    await promptInput.click();
    await promptInput.fill(
      "postgresql://wronguser:SEKRET@localhost:5432/postgres"
    );

    await page.locator(`[data-test-id="prompt-submit"]`).last().click();

    await expect(page.locator(`[data-test-id="host"]`)).toHaveValue(
      "localhost"
    );
    await expect(page.locator(`[data-test-id="port"]`)).toHaveValue("5432");
    await expect(page.locator(`[data-test-id="name"]`)).toHaveValue("postgres");
    await expect(page.locator(`[data-test-id="user"]`)).toHaveValue(
      "wronguser"
    );

    await page.locator(`[data-test-id="test-connection"]`).click();

    const errorNotification = page.locator(
      ".ant-notification-notice-error:has(.ant-notification-notice-message:has-text('Connection failed'))"
    );
    await errorNotification.waitFor({ state: "visible" });
    await errorNotification.locator(".ant-notification-notice-close").click();

    const userInput = page.locator(`[data-test-id="user"]`);
    await userInput.click();
    await userInput.press("Control+a");
    await userInput.press("Backspace");
    await userInput.fill("cypress");

    await page.locator(`[data-test-id="test-connection"]`).click();

    const successNotification = page.locator(
      ".ant-notification-notice-success:has(.ant-notification-notice-message:has-text('Connection successful'))"
    );
    await successNotification.waitFor({ state: "visible" });
    await successNotification.locator(".ant-notification-notice-close").click();

    await page.locator(`[data-test-id="prompt-submit"]`).click();
    await page.waitForTimeout(1000);
  });

  test("can create HTTP data source", async ({ page }) => {
    dataSourceName = "HTTP Test";

    await page.getByText("Plasmic's First Workspace").click();
    await page.getByText("Integrations").click();
    await page.getByText("New integration").click();
    await page.waitForTimeout(1000);

    const dataSourcePicker = page.locator(
      `[data-test-id="data-source-picker"]`
    );
    await dataSourcePicker.click();
    await page.getByRole("option", { name: "HTTP" }).click();

    const nameInput = page.locator(`[data-test-id="data-source-name"]`);
    await nameInput.click();
    await nameInput.fill(dataSourceName);

    const baseUrlInput = page.locator(`[data-test-id="baseUrl"]`);
    await baseUrlInput.click();
    await baseUrlInput.fill("https://jsonplaceholder.typicode.com/");

    await page.locator(`[data-test-id="prompt-submit"]`).click();
    await page.waitForTimeout(1000);
  });
});
