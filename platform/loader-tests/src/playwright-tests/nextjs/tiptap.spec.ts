import { expect } from "@playwright/test";
import { LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

test.describe(`Tiptap`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "tiptap.json",
          projectName: "Tiptap",
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      test(`Tiptap state`, async ({ page }) => {
        await page.goto(`${ctx.host}/tiptap-test`);

        await page.waitForTimeout(1000);
        await expect(page.locator("#tiptap-state-text")).toHaveText(
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", marks: [{ type: "bold" }], text: "hello" },
                  { type: "text", text: "world" },
                ],
              },
              { type: "paragraph" },
            ],
          })
        );

        await page
          .locator('div[class$="toolbarItalic"][data-active=false]')
          .click();
        await expect(
          page.locator('div[class$="toolbarItalic"][data-active=true]')
        ).toBeVisible();
        await page.type("div.tiptap", "istanbul");

        await expect(page.locator("#tiptap-state-text")).toHaveText(
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [{ type: "bold" }, { type: "italic" }],
                    text: "istanbul",
                  },
                  { type: "text", marks: [{ type: "bold" }], text: "hello" },
                  { type: "text", text: "world" },
                ],
              },
              { type: "paragraph" },
            ],
          })
        );

        await page.evaluate((selector) => {
          const element: HTMLInputElement | null =
            document.querySelector(selector);
          if (element) {
            element.focus();
            document.execCommand("selectAll");
            // collapse selection to the end
            document.getSelection()?.collapseToEnd();
          }
        }, "div.tiptap");

        await expect(
          page.locator('div[role="button"][data-active=false]')
        ).toHaveCount(7);

        await expect(
          page.locator('div[class$="toolbarItalic"][data-active=true]')
        ).not.toBeVisible();
        await expect(
          page.locator('div[class$="toolbarBold"][data-active=true]')
        ).not.toBeVisible();
        await expect(
          page.locator('div[class$="toolbarUnderline"][data-active=true]')
        ).not.toBeVisible();
        await expect(
          page.locator('div[class$="toolbarStrike"][data-active=true]')
        ).not.toBeVisible();

        await page
          .locator('div[class$="toolbarItalic"][data-active=false]')
          .click();
        await page
          .locator('div[class$="toolbarBold"][data-active=false]')
          .click();
        await page
          .locator('div[class$="toolbarUnderline"][data-active=false]')
          .click();
        await page
          .locator('div[class$="toolbarStrike"][data-active=false]')
          .click();

        await expect(
          page.locator('div[class$="toolbarItalic"][data-active=true]')
        ).toBeVisible();
        await expect(
          page.locator('div[class$="toolbarBold"][data-active=true]')
        ).toBeVisible();
        await expect(
          page.locator('div[class$="toolbarUnderline"][data-active=true]')
        ).toBeVisible();
        await expect(
          page.locator('div[class$="toolbarStrike"][data-active=true]')
        ).toBeVisible();

        await page.type("div.tiptap", "Cappadocia");
        await expect(page.locator("#tiptap-state-text")).toHaveText(
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [{ type: "bold" }, { type: "italic" }],
                    text: "istanbul",
                  },
                  { type: "text", marks: [{ type: "bold" }], text: "hello" },
                  { type: "text", text: "world" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      { type: "bold" },
                      { type: "italic" },
                      { type: "underline" },
                      { type: "strike" },
                    ],
                    text: "Cappadocia",
                  },
                ],
              },
            ],
          })
        );

        await page
          .locator('div[class$="toolbarItalic"][data-active=true]')
          .click();
        await page
          .locator('div[class$="toolbarBold"][data-active=true]')
          .click();
        await page
          .locator('div[class$="toolbarUnderline"][data-active=true]')
          .click();
        await page
          .locator('div[class$="toolbarStrike"][data-active=true]')
          .click();

        await expect(
          page.locator('div[class$="toolbarItalic"][data-active=true]')
        ).not.toBeVisible();
        await expect(
          page.locator('div[class$="toolbarBold"][data-active=true]')
        ).not.toBeVisible();
        await expect(
          page.locator('div[class$="toolbarUnderline"][data-active=true]')
        ).not.toBeVisible();
        await expect(
          page.locator('div[class$="toolbarStrike"][data-active=true]')
        ).not.toBeVisible();

        await page.type("div.tiptap", " fun");
        await expect(page.locator("#tiptap-state-text")).toHaveText(
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [{ type: "bold" }, { type: "italic" }],
                    text: "istanbul",
                  },
                  { type: "text", marks: [{ type: "bold" }], text: "hello" },
                  { type: "text", text: "world" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      { type: "bold" },
                      { type: "italic" },
                      { type: "underline" },
                      { type: "strike" },
                    ],
                    text: "Cappadocia",
                  },
                  { type: "text", text: " fun" },
                ],
              },
            ],
          })
        );

        await page
          .locator('div[class$="toolbarMention"][data-active=false]')
          .click();
        await page.type("div.tiptap", "sh");
        await page.keyboard.press("Enter");
        await expect(page.locator("#tiptap-state-text")).toHaveText(
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [{ type: "bold" }, { type: "italic" }],
                    text: "istanbul",
                  },
                  { type: "text", marks: [{ type: "bold" }], text: "hello" },
                  { type: "text", text: "world" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      { type: "bold" },
                      { type: "italic" },
                      { type: "underline" },
                      { type: "strike" },
                    ],
                    text: "Cappadocia",
                  },
                  { type: "text", text: " fun " },
                  {
                    type: "mention",
                    attrs: { id: "sherlock221b", label: null },
                  },
                  { type: "text", text: " " },
                ],
              },
            ],
          })
        );

        await page
          .locator('div[class$="toolbarCode"][data-active=false]')
          .click();
        await page.type("div.tiptap", "a = b");
        await page
          .locator('div[class$="toolbarCode"][data-active=true]')
          .click();
        await expect(
          page.locator('div[class$="toolbarCode"][data-active=true]')
        ).not.toBeVisible();

        await page.type("div.tiptap", " easy ");
        await expect(page.locator("#tiptap-state-text")).toHaveText(
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [{ type: "bold" }, { type: "italic" }],
                    text: "istanbul",
                  },
                  { type: "text", marks: [{ type: "bold" }], text: "hello" },
                  { type: "text", text: "world" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      { type: "bold" },
                      { type: "italic" },
                      { type: "underline" },
                      { type: "strike" },
                    ],
                    text: "Cappadocia",
                  },
                  { type: "text", text: " fun " },
                  {
                    type: "mention",
                    attrs: { id: "sherlock221b", label: null },
                  },
                  { type: "text", text: " " },
                  { type: "text", marks: [{ type: "code" }], text: "a = b" },
                  { type: "text", text: " easy " },
                ],
              },
            ],
          })
        );
        await page.type("div.tiptap", "google.com "); // auto-detect links
        await expect(page.locator("#tiptap-state-text")).toHaveText(
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [{ type: "bold" }, { type: "italic" }],
                    text: "istanbul",
                  },
                  { type: "text", marks: [{ type: "bold" }], text: "hello" },
                  { type: "text", text: "world" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      { type: "bold" },
                      { type: "italic" },
                      { type: "underline" },
                      { type: "strike" },
                    ],
                    text: "Cappadocia",
                  },
                  { type: "text", text: " fun " },
                  {
                    type: "mention",
                    attrs: { id: "sherlock221b", label: null },
                  },
                  { type: "text", text: " " },
                  { type: "text", marks: [{ type: "code" }], text: "a = b" },
                  { type: "text", text: " easy " },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "http://google.com",
                          target: "_blank",
                          rel: "noopener noreferrer nofollow",
                          class: "ρi ρmjm82",
                        },
                      },
                    ],
                    text: "google.com",
                  },
                  { type: "text", text: " " },
                ],
              },
            ],
          })
        );

        await page.type("div.tiptap", "island");
        await page
          .locator('div[class$="toolbarLink"][data-active=false]')
          .click();
        await page.type("div.tiptap", "blah blah");
        await page
          .locator('div[class$="toolbarLink"][data-active=true]')
          .click();
        await expect(
          page.locator('div[class$="toolbarLink"][data-active=true]')
        ).not.toBeVisible();
        await page.type("div.tiptap", "happy");
        await expect(page.locator("#tiptap-state-text")).toHaveText(
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [{ type: "bold" }, { type: "italic" }],
                    text: "istanbul",
                  },
                  { type: "text", marks: [{ type: "bold" }], text: "hello" },
                  { type: "text", text: "world" },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      { type: "bold" },
                      { type: "italic" },
                      { type: "underline" },
                      { type: "strike" },
                    ],
                    text: "Cappadocia",
                  },
                  { type: "text", text: " fun " },
                  {
                    type: "mention",
                    attrs: { id: "sherlock221b", label: null },
                  },
                  { type: "text", text: " " },
                  { type: "text", marks: [{ type: "code" }], text: "a = b" },
                  { type: "text", text: " easy " },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "http://google.com",
                          target: "_blank",
                          rel: "noopener noreferrer nofollow",
                          class: "ρi ρmjm82",
                        },
                      },
                    ],
                    text: "google.com",
                  },
                  { type: "text", text: " island" },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: null,
                          target: "_blank",
                          rel: "noopener noreferrer nofollow",
                          class: "ρi ρmjm82",
                        },
                      },
                    ],
                    text: "blah blah",
                  },
                  { type: "text", text: "happy" },
                ],
              },
            ],
          })
        );
      });
    });
  }
});
