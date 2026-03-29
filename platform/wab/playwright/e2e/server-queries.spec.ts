import { expect, Page } from "@playwright/test";
import { PageModels, test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

const MOCK_API_URL = "https://mock-api-for-server-queries.test";

async function createServerQuery(
  models: PageModels,
  opts: {
    name: string;
    expectedResult: string;
  } & ({ url: string } | { urlExpression: string })
) {
  await test.step(`Create server query "${opts.name}"`, async () => {
    const serverQueryModal = models.studio.serverQueryBottomModal;
    const previewResult = serverQueryModal.locator(".code-preview-inner");

    await models.studio.rightPanel.addServerQueryButton.click();
    // This is the server query created in the previous line
    await models.studio.rightPanel.serverQueriesSection
      .locator(`[data-plasmic-role="labeled-item"]`)
      .last()
      .click();

    const queryNameInput = serverQueryModal.locator(
      `[data-test-id="query-name"] input`
    );
    await queryNameInput.fill(opts.name);

    const urlInput = serverQueryModal
      .locator(`[data-test-id="prop-editor-row-url"]`)
      .locator(`[data-plasmic-prop="url"]`);

    if ("urlExpression" in opts) {
      await urlInput.click({ button: "right" });
      await models.studio.frame.getByText("Use dynamic value").click();
      await models.studio.rightPanel.insertMonacoCode(opts.urlExpression);
    } else {
      await urlInput.click();
      await models.studio.page.keyboard.type(opts.url);
    }

    await serverQueryModal.locator("button").getByText("Execute").click();
    await expect(previewResult).toContainText(opts.expectedResult);

    await serverQueryModal.locator("button").getByText("Save").click();
    await serverQueryModal.waitFor({ state: "hidden" });
  });
}

async function assertNotification(
  models: PageModels,
  expectedText: string,
  expectedDescription?: string
) {
  await test.step(`Assert notification "${expectedText}"`, async () => {
    await expect(models.studio.notificationMessage).toContainText(expectedText);
    if (expectedDescription) {
      await expect(models.studio.notificationDescription).toContainText(
        expectedDescription
      );
    } else {
      await expect(models.studio.notificationDescription).not.toBeVisible();
    }
    await models.studio.notificationClose.click();
  });
}

async function copyQueryFromPage(
  models: PageModels,
  sourcePage: string,
  queryName: string
) {
  await models.studio.rightPanel.addServerQueryButton.click();

  await models.studio.frame
    .locator(".ant-dropdown-menu-submenu-title")
    .filter({ hasText: "Copy from..." })
    .click();

  await models.studio.frame
    .locator(".ant-dropdown-menu-submenu-title")
    .filter({ hasText: sourcePage })
    .click();

  await models.studio.frame
    .locator(".ant-dropdown-menu-item")
    .getByText(queryName, { exact: true })
    .click();
}

async function generateMocks(page: Page) {
  const mockTodos = [
    { id: 1, title: "Buy milk", completed: false },
    { id: 2, title: "Walk the dog", completed: true },
    { id: 3, title: "Read a book", completed: false },
  ];
  // Mock the fetch endpoints
  await page.route(`${MOCK_API_URL}/todos/1`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockTodos[0]),
    });
  });
  await page.route(`${MOCK_API_URL}/todos`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockTodos),
    });
  });
}

test.describe("server queries", () => {
  let projectId: string;

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("create, duplicate, and copy server queries", async ({
    apiClient,
    page,
    models,
  }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      name: "server-queries",
      hostLessPackagesInfo: {
        name: "fetch",
        npmPkg: ["@plasmicpkgs/fetch"],
      },
    });
    await goToProject(page, `/projects/${projectId}?serverQueries=true`);

    await generateMocks(page);

    await models.studio.leftPanel.createNewPage("Source Page");
    await models.studio.rightPanel.clickPageData();

    const queryRows =
      models.studio.rightPanel.serverQueriesSectionContent.locator(
        `[data-plasmic-role="labeled-item"]`
      );

    await expect(queryRows).toHaveCount(0);

    // Create Todos query with $state, $props, $ctx references
    await createServerQuery(models, {
      name: "Todos",
      urlExpression: `"${MOCK_API_URL}/todos" + ($state.extra ?? "") + ($props.filter ?? "") + ($ctx.suffix ?? "")`,
      expectedResult: "Array(3)",
    });
    await expect(queryRows).toHaveCount(1);

    // Create a dependent query
    await createServerQuery(models, {
      name: "Todo",
      urlExpression: `"${MOCK_API_URL}/todos/" + $q.todos.data.body[0].id`,
      // TODO -- expand the body or adjust the display to only show response body again
      //  expectedResult: "Buy milk",
      expectedResult: "statusCode: 200",
    });
    await expect(queryRows).toHaveCount(2);

    await expect(queryRows.nth(0)).toContainText("Todos");
    await expect(queryRows.nth(1)).toContainText("Todo");

    await test.step(`Duplicate independent query within the same page"`, async () => {
      await queryRows
        .getByText("Todos", { exact: true })
        .click({ button: "right" });
      await models.studio.frame
        .locator(".ant-dropdown-menu-item")
        .getByText("Duplicate")
        .click();

      await expect(queryRows).toHaveCount(3);
      await expect(queryRows.nth(2)).toContainText("Todos 2");
      await expect(models.studio.notification).not.toBeVisible();
    });

    await test.step(`Duplicate dependent query within the same page"`, async () => {
      await queryRows
        .getByText("Todo", { exact: true })
        .click({ button: "right" });
      await models.studio.frame
        .locator(".ant-dropdown-menu-item")
        .getByText("Duplicate")
        .click();

      // Only the main query is copied
      await expect(queryRows).toHaveCount(4);
      await expect(queryRows.nth(3)).toContainText("Todo 2");
      await expect(models.studio.notification).not.toBeVisible();
    });

    await test.step(`Duplicate dependent query to a different page"`, async () => {
      await models.studio.leftPanel.createNewPage("Target Page");
      await models.studio.rightPanel.clickPageData();

      const targetQueryRows =
        models.studio.rightPanel.serverQueriesSectionContent.locator(
          `[data-plasmic-role="labeled-item"]`
        );
      await expect(targetQueryRows).toHaveCount(0);

      await copyQueryFromPage(models, "Source Page", "Todo");

      // The whole chain is copied
      await expect(targetQueryRows).toHaveCount(2);
      await expect(targetQueryRows.nth(0)).toContainText("Todos");
      await expect(targetQueryRows.nth(1)).toContainText("Todo");

      // Warning includes vars from the transitive dependency (Todos)
      await assertNotification(
        models,
        "Copied queries: Todos, Todo",
        "References component state (extra), props (filter), context (suffix) that may not exist or differ"
      );

      // Copy Todo again — Todos already exists on this page,
      // so only the Todo query should be added
      await copyQueryFromPage(models, "Source Page", "Todo");

      await expect(targetQueryRows).toHaveCount(3);
      await expect(targetQueryRows.nth(2)).toContainText("Todo 2");

      // No warning — Todo itself has no component-dependent vars
      await assertNotification(models, "Copied query: Todo 2");

      // Copy Todos separately — warns about all component-dependent vars
      await copyQueryFromPage(models, "Source Page", "Todos");

      await expect(targetQueryRows).toHaveCount(4);
      await expect(targetQueryRows.nth(3)).toContainText("Todos 2");

      await assertNotification(
        models,
        "Copied query: Todos 2",
        "References component state (extra), props (filter), context (suffix) that may not exist or differ"
      );
    });
  });
});
