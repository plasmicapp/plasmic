import * as fs from "fs";
import * as path from "path";
import { MockServer } from "./mock-server";

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

interface ContentfulFixtures {
  blogData: ContentfulResponse;
  pageData: ContentfulResponse;
  contentTypes: ContentfulResponse;
}

/**
 * Load Contentful fixture data from the cypress/fixtures directory
 */
export function loadContentfulFixtures() {
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

  return { blogData, pageData, contentTypes };
}

function handleContentfulRequest(
  url: URL,
  blogData: ContentfulResponse,
  pageData: ContentfulResponse
): ContentfulResponse {
  const contentType = url.searchParams.get("content_type");

  // Check for slug filter - the parameter can be "fields.slug", "fields.slug[match]", etc.
  let slugFilter: string | undefined;
  for (const [key, value] of Array.from(url.searchParams)) {
    if (key.startsWith("fields.slug")) {
      slugFilter = value;
      break;
    }
  }

  console.log(
    `[ContentfulMocks] Request for content_type=${contentType}, slug=${slugFilter}`
  );

  if (contentType === "pageBlogPost") {
    if (slugFilter) {
      const filteredItems = blogData.items.filter(
        (item) => item.fields.slug === slugFilter
      );
      console.log(
        `[ContentfulMocks] Blog posts (slug=${slugFilter}) ${filteredItems.length}`
      );
      return {
        ...blogData,
        items: filteredItems,
        total: filteredItems.length,
      };
    }
    console.log(
      `[ContentfulMocks] Blog posts (no filter): ${blogData.items.length}`
    );
    return blogData;
  } else if (contentType === "pageLanding") {
    console.log(`[ContentfulMocks] Landing pages: ${pageData.items.length} `);
    return pageData;
  }

  console.log(`[ContentfulMocks] Unknown content_type`);
  return {
    items: [],
    includes: { Entry: [], Asset: [] },
    total: 0,
    skip: 0,
    limit: 100,
  } as ContentfulResponse;
}

export class ContentfulMockServer extends MockServer {
  fixtures: ContentfulFixtures;
  logName = "[ContentfulMock]";

  constructor() {
    super();
    this.fixtures = loadContentfulFixtures();
  }

  handleRequest(url: URL) {
    const { blogData, contentTypes, pageData } = this.fixtures;

    // Match content_types endpoint
    if (url.pathname.includes("/content_types")) {
      return contentTypes;
    }

    // Match entries endpoint
    if (url.pathname.includes("/entries")) {
      return handleContentfulRequest(url, blogData, pageData);
    }
    return undefined;
  }
}
