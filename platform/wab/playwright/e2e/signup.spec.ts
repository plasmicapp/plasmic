import { v4 } from "uuid";
import { test } from "../fixtures/test";

test.describe("Signup flow", () => {
  let projectId: string;

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProjectAfterTest(
        projectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }
  });

  test("can sign up (password), take survey, continue to original project href", async ({
    page,
    models,
    apiClient,
  }) => {
    projectId = await apiClient.setupNewProject({
      name: "signup",
      inviteOnly: false,
    });

    await apiClient.logout();
    await page.context().clearCookies();

    const randomUserId = v4();
    const randomUserEmail = `fakeuser+${randomUserId}@gmail.com`;

    await page.goto(`/projects/${projectId}`);

    await page.getByText("Create account").click({ timeout: 120000 });
    await page.locator('input[name="email"]').fill(randomUserEmail);
    await page.locator('input[name="password"]').fill("!53kr3tz!");
    await page.locator('input[name="firstName"]').fill("Fakey");
    await page.locator('input[name="lastName"]').fill("Fake");
    await page.locator('button[type="submit"]').getByText("Sign up").click();

    await page.getByText("How did you hear about us").click({ timeout: 10000 });
    await page.locator(":focus").click();
    await page.locator(".ant-select-item").getByText("Product Hunt").click();
    await page.getByText("What kind of work do you do").click();
    await page.locator(":focus").click();

    await page
      .locator(".ant-select-item")
      .getByText("Software development")
      .click();
    await page.getByText("What do you want to build").click();
    await page.locator(":focus").click();
    await page.locator(".ant-select-item").getByText("External app").click();

    await page.getByText("Continue").click();

    await page.getByText("Verify your email").waitFor({ timeout: 10000 });

    await page.goto("/email-verification?token=invalid-token");

    await page
      .getByText("Sorry, something went wrong with that link")
      .waitFor({ timeout: 10000 });

    const token = await apiClient.getUserEmailVerificationToken(
      randomUserEmail
    );

    await page.goto(
      `/email-verification?token=${encodeURIComponent(
        token
      )}&continueTo=${encodeURIComponent(`/projects/${projectId}`)}`
    );

    await page
      .getByText("Thanks for verifying your email")
      .waitFor({ timeout: 10000 });

    await page.getByText("Continue").click();

    await page.getByText("Name this organization").click();
    await page
      .getByText("Insert your organization name to create an organization")
      .waitFor({ timeout: 2000 });
    await page.getByText("Tell us about your organization").click();

    await page.keyboard.type("Fake org");

    await page.getByText("Name this organization").click();

    await page
      .getByText("Share organization files and create together")
      .waitFor({ timeout: 10000 });

    await page.locator('[data-test-id="invite-emails"]').click();

    await page.keyboard.type("user1@gmail.com");
    await page.keyboard.press("Enter");
    await page.keyboard.type("user2@g");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");

    await page.getByText("Send invites").click();

    await page
      .getByText("Enter valid emails only, comma separated...")
      .waitFor({ timeout: 5000 });

    await Promise.all([
      page.waitForURL(`**/projects/${projectId}**`, { timeout: 60_000 }),
      page.getByText("Do this later").click(),
    ]);

    await models.studio.waitForFrameToLoad();
  });
});
