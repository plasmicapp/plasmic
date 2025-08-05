import { expect } from "@playwright/test";
import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import { NextJsContext, teardownNextJs } from "../../nextjs/nextjs-setup";
import { authNextJsSetup } from "../auth-test-utils";

test.skip(`PlasmicRootProvider Auth`, async () => {
  let ctx: NextJsContext;
  test.beforeEach(async ({ request }) => {
    const bundleFile = "auth-e2e.json";

    ctx = await authNextJsSetup({
      request,
      bundleFile,
      template: "custom-auth",
      projectName: "Custom Auth",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      wabHost: getEnvVar("WAB_HOST"),
      appAuthOpts: {
        provider: "custom-auth",
      },
    });
  });

  test.afterEach(async () => {
    await teardownNextJs(ctx);
  });

  test(`it works`, async ({ page }) => {
    const NORMAL_USER = `userEmail=e2e.1@plasmic.app`;
    const ADMIN_USER = `userEmail=e2e.2@plasmic.app`;

    function createFetchTodosPromise() {
      return page.waitForResponse(async (response) => {
        if (!response.url().endsWith("execute")) {
          return false;
        }

        const json = await response.json();

        if (!json || typeof json !== "object") {
          return false;
        }

        // This is a way to know that the request was the refetch for todos
        return "data" in json && "schema" in json && !("rowCount" in json);
      });
    }

    async function withFetchTodosPromise(action: Promise<void>) {
      const fetchTodosResPromise = createFetchTodosPromise();
      await action;
      await fetchTodosResPromise;
    }

    await page.goto(ctx.host);

    expect(await page.isVisible('text="Auth e2e"')).toBeTruthy();

    await page.goto(`${ctx.host}/normal-user`);
    expect(
      await page.isVisible(`text="You don't have access to this page"`)
    ).toBeTruthy();

    await page.goto(`${ctx.host}/normal-user?${NORMAL_USER}`);
    expect(
      await page.isVisible('text="normal user role required"')
    ).toBeTruthy();
    expect(
      await page.isVisible('text="Email: e2e.1@plasmic.app"')
    ).toBeTruthy();
    expect(await page.isVisible('text="Role: Normal User"')).toBeTruthy();

    await page.goto(`${ctx.host}/normal-user?${ADMIN_USER}`);
    expect(
      await page.isVisible('text="normal user role required"')
    ).toBeTruthy();
    expect(
      await page.isVisible('text="Email: e2e.2@plasmic.app"')
    ).toBeTruthy();
    expect(await page.isVisible('text="Role: Admin"')).toBeTruthy();

    await page.goto(`${ctx.host}/admin`);
    expect(
      await page.isVisible(`text="You don't have access to this page"`)
    ).toBeTruthy();

    await page.goto(`${ctx.host}/admin?${NORMAL_USER}`);
    expect(
      await page.isVisible(`text="You don't have access to this page"`)
    ).toBeTruthy();

    await page.goto(`${ctx.host}/admin?${ADMIN_USER}`);
    expect(await page.isVisible('text="admin role required"')).toBeTruthy();
    expect(
      await page.isVisible('text="Email: e2e.2@plasmic.app"')
    ).toBeTruthy();
    expect(await page.isVisible('text="Role: Admin"')).toBeTruthy();

    await page.goto(`${ctx.host}/todos`);

    await page.goto(`${ctx.host}/todos?${NORMAL_USER}`);

    // Hydration wait
    await page.waitForTimeout(6000);

    await page.getByLabel("Description").fill("todo 1");

    const submitTodoReqPromise = page.waitForRequest(async (request) => {
      if (!request.url().endsWith("execute")) {
        return false;
      }

      const body = request.postData();

      if (!body) {
        return false;
      }

      const json = JSON.parse(body);

      const variables = json?.userArgs?.variables;

      if (!variables) {
        return false;
      }

      return (
        variables.length === 2 &&
        variables[0] === "todo 1" &&
        variables[1] === false
      );
    });

    const fetchTodosResPromise = createFetchTodosPromise();

    await page.getByRole("button", { name: "Submit" }).click();
    await submitTodoReqPromise;
    await fetchTodosResPromise;

    expect(await page.isVisible('text="todo 1"')).toBeTruthy();

    await page.goto(`${ctx.host}/todos?${ADMIN_USER}`);

    // Hydration wait
    await page.waitForTimeout(6000);

    await page.getByLabel("Description").fill("todo 2");

    const fetchTodosResPromise2 = createFetchTodosPromise();
    await page.getByRole("button", { name: "Submit" }).click();
    await fetchTodosResPromise2;

    await page.goto(`${ctx.host}/admin-panel?${NORMAL_USER}`);
    await page.isHidden('text="Loaded todos:"');

    await page.goto(`${ctx.host}/admin-panel?${ADMIN_USER}`);

    // Hydration wait
    await page.waitForTimeout(6000);

    expect(await page.isVisible('text="Loaded todos: 2"')).toBeTruthy();

    const fetchTodosResPromise3 = createFetchTodosPromise();
    await page
      .locator("div")
      .filter({ hasText: /^todo 1e2e\.1@plasmic\.appDelete$/ })
      .getByRole("button")
      .click();
    await fetchTodosResPromise3;

    expect(await page.isVisible('text="Loaded todos: 1"')).toBeTruthy();

    await page.goto(`${ctx.host}/permission-check`);

    // Hydration wait
    await page.waitForTimeout(6000);

    expect(await page.isVisible('text="Request count: 0"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 0"')).toBeTruthy();

    await withFetchTodosPromise(
      page.getByRole("button").filter({ hasText: "anonymous" }).click()
    );

    expect(await page.isVisible('text="Request count: 1"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 1"')).toBeTruthy();

    await page.getByRole("button").filter({ hasText: "normal user" }).click();
    expect(await page.isVisible('text="Request count: 2"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 1"')).toBeTruthy();

    await page.getByRole("button").filter({ hasText: "admin" }).click();
    expect(await page.isVisible('text="Request count: 3"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 1"')).toBeTruthy();

    await page.goto(`${ctx.host}/permission-check?${NORMAL_USER}`);

    // Hydration wait
    await page.waitForTimeout(6000);

    expect(await page.isVisible('text="Request count: 0"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 0"')).toBeTruthy();

    await withFetchTodosPromise(
      page.getByRole("button").filter({ hasText: "anonymous" }).click()
    );

    expect(await page.isVisible('text="Request count: 1"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 1"')).toBeTruthy();

    await withFetchTodosPromise(
      page.getByRole("button").filter({ hasText: "normal user" }).click()
    );
    expect(await page.isVisible('text="Request count: 2"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 2"')).toBeTruthy();

    await page.getByRole("button").filter({ hasText: "admin" }).click();
    expect(await page.isVisible('text="Request count: 3"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 2"')).toBeTruthy();

    await page.goto(`${ctx.host}/permission-check?${ADMIN_USER}`);

    // Hydration wait
    await page.waitForTimeout(6000);

    expect(await page.isVisible('text="Request count: 0"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 0"')).toBeTruthy();

    await withFetchTodosPromise(
      page.getByRole("button").filter({ hasText: "anonymous" }).click()
    );

    expect(await page.isVisible('text="Request count: 1"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 1"')).toBeTruthy();

    await withFetchTodosPromise(
      page.getByRole("button").filter({ hasText: "normal user" }).click()
    );
    expect(await page.isVisible('text="Request count: 2"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 2"')).toBeTruthy();

    await withFetchTodosPromise(
      page.getByRole("button").filter({ hasText: "admin" }).click()
    );
    expect(await page.isVisible('text="Request count: 3"')).toBeTruthy();
    expect(await page.isVisible('text="Request ok: 3"')).toBeTruthy();
  });
});
