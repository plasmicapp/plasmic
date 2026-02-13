import * as fs from "fs";
import * as path from "path";
import { MockServer } from "./mock-server";

interface StrapiFixtures {
  v4Restaurants: any;
  v5Restaurants: any;
  errorData: any;
}

/**
 * Load Strapi fixture data from the cypress/fixtures directory
 */
export function loadStrapiFixtures(): StrapiFixtures {
  const fixturesPath = path.resolve(__dirname, "../../../../cypress/fixtures");
  const v4Restaurants = JSON.parse(
    fs.readFileSync(path.join(fixturesPath, "strapi-restaurants.json"), "utf8")
  );
  const v5Restaurants = JSON.parse(
    fs.readFileSync(
      path.join(fixturesPath, "strapi-v5-restaurants.json"),
      "utf8"
    )
  );
  const errorData = JSON.parse(
    fs.readFileSync(path.join(fixturesPath, "strapi-error.json"), "utf8")
  );

  return { v4Restaurants, v5Restaurants, errorData };
}

/**
 * Mock server for Strapi REST API.
 *
 * Routes by collection name:
 *   /api/restaurants    → v4 format data
 *   /api/restaurants-v5 → v5 format data
 *
 * The test bundles use a "restaurants" collection for v4 pages and "restaurants-v5"
 * for v5 pages, so the mock server can return the correct response format.
 *
 * Any unrecognized /api/ path returns the Strapi error response.
 */
export class StrapiMockServer extends MockServer {
  fixtures: StrapiFixtures;
  logName = "[StrapiMock]";

  constructor() {
    super();
    this.fixtures = loadStrapiFixtures();
  }

  handleRequest(url: URL) {
    const { v4Restaurants, v5Restaurants, errorData } = this.fixtures;

    // Match /api/restaurants (v4 data)
    if (url.pathname.match(/\/api\/restaurants\/?$/)) {
      console.log(`[StrapiMock] v4 restaurants: ${v4Restaurants.data.length}`);
      return v4Restaurants;
    }

    // Match /api/restaurants-v5 (v5 data)
    if (url.pathname.match(/\/api\/restaurants-v5\/?$/)) {
      console.log(`[StrapiMock] v5 restaurants: ${v5Restaurants.data.length}`);
      return v5Restaurants;
    }

    // Any other /api/ request returns the error response
    if (url.pathname.includes("/api/")) {
      console.log(`[StrapiMock] Unknown path ${url.pathname}, returning error`);
      return errorData;
    }

    return undefined;
  }
}
