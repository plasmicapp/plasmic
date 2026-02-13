import * as fs from "fs";
import * as path from "path";
import { MockServer } from "./mock-server";

interface WordpressItem {
  slug: string;
  [key: string]: any;
}

interface WordpressFixtures {
  postsData: WordpressItem[];
  pagesData: WordpressItem[];
}

/**
 * Load WordPress fixture data from the cypress/fixtures directory
 */
export function loadWordpressFixtures(): WordpressFixtures {
  const fixturesPath = path.resolve(__dirname, "../../../../cypress/fixtures");
  const postsData: WordpressItem[] = JSON.parse(
    fs.readFileSync(path.join(fixturesPath, "wordpress-posts.json"), "utf8")
  );
  const pagesData: WordpressItem[] = JSON.parse(
    fs.readFileSync(path.join(fixturesPath, "wordpress-pages.json"), "utf8")
  );

  return { postsData, pagesData };
}

function filterBySlug(items: WordpressItem[], url: URL): WordpressItem[] {
  const slug = url.searchParams.get("slug");
  return slug ? items.filter((item) => item.slug === slug) : items;
}

export class WordpressMockServer extends MockServer {
  fixtures: WordpressFixtures;
  logName = "[WordpressMock]";

  constructor() {
    super();
    this.fixtures = loadWordpressFixtures();
  }

  handleRequest(url: URL) {
    const { postsData, pagesData } = this.fixtures;

    // Match /wp-json/wp/v2/posts
    if (url.pathname.match(/\/wp-json\/wp\/v2\/posts\/?$/)) {
      const filtered = filterBySlug(postsData, url);
      console.log(
        `[WordpressMock] Posts (slug=${url.searchParams.get("slug")}): ${
          filtered.length
        }`
      );
      return filtered;
    }

    // Match /wp-json/wp/v2/pages
    if (url.pathname.match(/\/wp-json\/wp\/v2\/pages\/?$/)) {
      const filtered = filterBySlug(pagesData, url);
      console.log(
        `[WordpressMock] Pages (slug=${url.searchParams.get("slug")}): ${
          filtered.length
        }`
      );
      return filtered;
    }

    return undefined;
  }
}
