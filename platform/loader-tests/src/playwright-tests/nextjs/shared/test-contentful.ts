import { expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { waitForPlasmicDynamic } from "../../playwright-utils";

interface ContentfulEntry {
  sys: {
    id: string;
    contentType: {
      sys: {
        id: string;
      };
    };
  };
  fields: {
    slug: string;
    [key: string]: any;
  };
}

interface ContentfulResponse {
  items: ContentfulEntry[];
  includes: {
    Entry: any[];
    Asset: any[];
  };
  total: number;
  skip: number;
  limit: number;
}

/* The test sites for @plasmicpkgs/plasmic-contentful and @plasmicpkgs/contentful
 * are functionally identical, so the test body can be shared.
 */
export async function testContentfulLoader(page: Page, host: string) {
  const fixturesPath = path.resolve(__dirname, "../../../../cypress/fixtures");
  const blogData: ContentfulResponse = JSON.parse(
    fs.readFileSync(path.join(fixturesPath, "contentful-blog.json"), "utf8")
  );
  const pageData: ContentfulResponse = JSON.parse(
    fs.readFileSync(path.join(fixturesPath, "contentful-page.json"), "utf8")
  );
  const contentTypes: ContentfulResponse = JSON.parse(
    fs.readFileSync(path.join(fixturesPath, "contentful-types.json"), "utf8")
  );

  // Mock entries
  await page.route(
    /\/spaces\/[^/]+\/environments\/[^/]+\/entries(\?.*)?$/,
    async (route) => {
      const url = new URL(route.request().url());
      const slug = url.searchParams.get("fields.slug");
      const contentType = url.searchParams.get("content_type");
      let responseData;
      if (contentType === "pageBlogPost") {
        responseData = blogData;
        if (slug) {
          const filteredItems = blogData.items.filter(
            (item) => item.fields.slug === slug
          );
          responseData = {
            ...blogData,
            items: filteredItems,
            total: filteredItems.length,
          };
        }
      } else if (contentType === "pageLanding") {
        responseData = pageData;
      } else {
        // Default to returning all entries
        responseData = { items: [], total: 0, skip: 0, limit: 100 };
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseData),
      });
    }
  );
  // Mock content types
  await page.route(
    /\/spaces\/[^/]+\/environments\/[^/]+\/content_types(\?.*)?$/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(contentTypes),
      });
    }
  );

  // Test home page
  await page.goto(`${host}/home`);
  await waitForPlasmicDynamic(page);

  // Check that the home page title and description are rendered
  await expect(page.getByText("Technology Blog")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText(/technologies for a wide range/i)).toBeVisible();

  // Check that blog links are rendered
  const arBlog = page.getByText("How AR will transform");
  await expect(arBlog).toBeVisible();
  await expect(page.getByText("Humanoids take the stage")).toBeVisible();
  await expect(page.getByText("Exploring the intersection")).toBeVisible();
  await expect(page.getByText("Creating sustainable cities")).toBeVisible();

  // Navigate to a blog post
  await page
    .getByText("How AR will transform our lives in 2050")
    .first()
    .click();
  await expect(page).toHaveURL(
    /\/blog\/how-ar-will-transform-our-lives-in-2050/
  );

  // Check that the blog title, date, author, and content rendered
  await expect(page.getByText("How AR will transform")).toBeVisible();
  await expect(page.getByText(/2022-12-04|December 4, 2022/)).toBeVisible();
  await expect(page.getByText("Livia Dokidis")).toBeVisible();
  await expect(page.getByText(/the most obvious ways that AR/i)).toBeVisible();
}
