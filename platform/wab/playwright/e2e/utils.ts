import {
  APIRequestContext,
  Page,
  FrameLocator,
  expect,
} from "@playwright/test";

const BASE_URL = process.env.PLASMIC_BASE_URL || "http://localhost:3003";
const TEST_USER = { email: "user2@example.com", password: "!53kr3tz!" };

export async function login(
  request: APIRequestContext,
  email = TEST_USER.email,
  password = TEST_USER.password
) {
  const csrfRes = await request.get(`${BASE_URL}/api/v1/auth/csrf`);
  const csrf = (await csrfRes.json()).csrf;

  await request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { email, password },
    headers: { "X-CSRF-Token": csrf },
  });
}

export async function importProjectFromTemplate(
  request: APIRequestContext,
  bundle: any
) {
  const csrfRes = await request.get(`${BASE_URL}/api/v1/auth/csrf`);
  const csrf = (await csrfRes.json()).csrf;

  const res = await request.post(`${BASE_URL}/api/v1/projects/import`, {
    data: {
      data: JSON.stringify(bundle),
      keepProjectIdsAndNames: false,
      migrationsStrict: true,
    },
    headers: { "X-CSRF-Token": csrf },
  });
  const body = await res.json();
  return body.projectId;
}

export async function removeProject(
  request: APIRequestContext,
  projectId: string,
  email = TEST_USER.email
) {
  const csrfRes = await request.get(`${BASE_URL}/api/v1/auth/csrf`);
  const csrf = (await csrfRes.json()).csrf;

  await login(request, email);

  await request.delete(`${BASE_URL}/api/v1/projects/${projectId}`, {
    headers: { "X-CSRF-Token": csrf },
  });
}

export async function getStudioFrame(page: Page) {
  const studioFrame = page.frameLocator("iframe.studio-frame");

  await expect(studioFrame.locator("iframe")).toBeVisible({ timeout: 120000 });

  return studioFrame.frameLocator("iframe");
}

export async function switchArena(frame: FrameLocator, name: string) {
  await frame.locator('[id="proj-nav-button"]').click({ force: true });
  if (
    await frame
      .locator('[data-test-id="nav-dropdown-clear-search"]')
      .isVisible()
  ) {
    await frame
      .locator('[data-test-id="nav-dropdown-clear-search"]')
      .click({ force: true });
  }
  await frame.locator('[data-test-id="nav-dropdown-search-input"]').fill(name);
  await frame.locator(`text=${name}`).click({ force: true });
  await frame
    .locator("body")
    .evaluate(() => new Promise((res) => setTimeout(res, 1000)));
}

export async function addInteraction(
  frame: FrameLocator,
  eventHandler: string,
  interaction: any
) {
  await frame.locator('[data-test-id="add-interaction"]').click();
  await frame.locator("#interactions-select").fill(eventHandler);
  await frame
    .locator(`#interactions-select-opt-${eventHandler}`)
    .scrollIntoViewIfNeeded();
  await frame.locator(`#interactions-select-opt-${eventHandler}`).click();

  await frame.locator('[data-plasmic-prop="action-name"]').first().click();
  await frame.locator(`[data-key="${interaction.actionName}"]`).click();
  if (interaction.args.variable) {
    await frame.locator('[data-plasmic-prop="variable"]').click();
    await frame
      .locator(`[data-test-id="0-${interaction.args.variable[0]}"]`)
      .first()
      .click();
    await frame
      .locator('[data-test-id="data-picker"]')
      .locator("text=Save")
      .click();
  }
  if (interaction.args.operation) {
    await frame.locator('[data-plasmic-prop="operation"]').click();
    if (interaction.args.operation === "newValue") {
      await frame.locator(`[data-key="0"]`).click();
    } else {
      await frame.locator(`[data-key="1"]`);
    }
  }
  if (interaction.args.value) {
    await frame.locator('[data-plasmic-prop="value"]').click();
    await frame
      .locator("div.react-monaco-editor-container")
      .pressSequentially(interaction.args.value);
    await frame
      .locator('[data-test-id="data-picker"]')
      .locator("text=Save")
      .click();
  }

  await frame.locator('[data-test-id="close-sidebar-modal"]').click();
}

export async function withinLiveMode(
  page: Page,
  frame: FrameLocator,
  fn: (liveFrame: FrameLocator) => Promise<void>
) {
  await frame
    .locator('[data-test-id="enter-live-mode-btn"]')
    .click({ force: true });
  const liveFrame = page
    .locator("iframe")
    .first()
    .contentFrame()
    .locator("iframe")
    .contentFrame()
    .locator('[data-test-id="live-frame"]')
    .contentFrame();

  await fn(liveFrame);
  await frame
    .locator('[data-test-id="exit-live-mode-btn"]')
    .click({ force: true });
}

export async function findFrameByText(page: Page, text: string) {
  for (const frame of page.frames()) {
    if ((await frame.locator(`:has-text("${text}")`).count()) > 0) {
      return frame;
    }
  }
  throw new Error(`No frame contains text: ${text}`);
}
