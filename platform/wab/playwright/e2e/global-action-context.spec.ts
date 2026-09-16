import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

let projectId: string | undefined;

// Register a test-only provider in the local host before its modules load.
// No custom host server or published package is needed.
test.beforeEach(async ({ context, apiClient, page }) => {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return [
      "localhost",
      "127.0.0.1",
      new URL(process.env.WAB_HOST ?? "http://localhost:3003").hostname,
    ].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
  const registerProviders = () => {
    (window as any).__PlasmicContextRegistry = [
      {
        component: (props: any) => {
          props.setControlContextData?.({ names: ["a", "b", "c"] });
          return props.children;
        },
        meta: {
          name: "HelloGlobalContext",
          importPath: "test-global-actions",
          props: {},
          globalActions: {
            sayHello: {
              displayName: "HelloGlobalContext.sayHello",
              parameters: [
                {
                  name: "name",
                  type: {
                    type: "choice",
                    options: (_props: any, ctx: any) =>
                      ctx?.names ?? ["dummy", "data"],
                  },
                },
              ],
            },
          },
        },
      },
    ];
  };
  // Canvas frames start as about:blank, so an init script can't tell them apart
  // from the Studio frame, which must not register. Prefix the host client
  // instead of host.html: a fulfilled document loses its loopback address
  // space, so Chromium blocks its Studio requests to localhost.
  await context.route("**/static/sub/build/client.*.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `(${registerProviders.toString()})();\n${await response.text()}`,
    });
  });
  projectId = await apiClient.setupNewProject({
    name: "Global action context",
  });
  await goToProject(page, `/projects/${projectId}`);
});

test.afterEach(async ({ apiClient }) => {
  if (projectId) {
    await apiClient.removeProject(projectId);
    projectId = undefined;
  }
});

test("global action arguments receive provider context", async ({ models }) => {
  const { studio } = models;
  await studio.createComponentFromNav("Action context test");
  await studio.insertTextNodeWithContent("Say hello");
  await studio.rightPanel.addInteractionButton.click();
  await studio.rightPanel.interactionsSearchInput.fill("onClick");
  await (await studio.rightPanel.selectInteractionEventById("onClick")).click();
  await studio.rightPanel.actionsDropdownButton.first().click();
  await studio.frame
    .locator('[data-key="HelloGlobalContext.sayHello"]')
    .click();
  await studio.frame.locator('[data-plasmic-prop="name"]').click();
  await expect(studio.frame.getByRole("option")).toHaveText(["a", "b", "c"]);
});
