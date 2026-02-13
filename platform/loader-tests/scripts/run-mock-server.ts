#!/usr/bin/env tsx
import { ContentfulMockServer } from "../src/playwright-tests/nextjs/shared/contentful-mocks";
import { MockServer } from "../src/playwright-tests/nextjs/shared/mock-server";
import { StrapiMockServer } from "../src/playwright-tests/nextjs/shared/strapi-mocks";
import { WordpressMockServer } from "../src/playwright-tests/nextjs/shared/wordpress-mocks";

const DEFAULT_PORT = 34423;

interface ServerEntry {
  create: () => MockServer;
  info: (baseUrl: string) => void;
}

const SERVERS: Record<string, ServerEntry> = {
  contentful: {
    create: () => new ContentfulMockServer(),
    info: (baseUrl) => {
      console.log(`\nExample endpoints:`);
      console.log(
        `  Content Types: ${baseUrl}/spaces/1234567890abc/environments/master/content_types?access_token=TOKEN`
      );
      console.log(
        `  All Blogs:     ${baseUrl}/spaces/1234567890abc/environments/master/entries?access_token=TOKEN&content_type=pageBlogPost`
      );
      console.log(
        `  All Pages:     ${baseUrl}/spaces/1234567890abc/environments/master/entries?access_token=TOKEN&content_type=pageLanding`
      );
    },
  },
  wordpress: {
    create: () => new WordpressMockServer(),
    info: (baseUrl) => {
      console.log(`\nExample endpoints:`);
      console.log(`  Posts:   ${baseUrl}/wp-json/wp/v2/posts`);
      console.log(`  Pages:   ${baseUrl}/wp-json/wp/v2/pages`);
      console.log(`  By slug: ${baseUrl}/wp-json/wp/v2/posts?slug=hello-world`);
    },
  },
  strapi: {
    create: () => new StrapiMockServer(),
    info: (baseUrl) => {
      console.log(`\nExample endpoints:`);
      console.log(`  v4 Restaurants: ${baseUrl}/api/restaurants?populate=*`);
      console.log(`  v5 Restaurants: ${baseUrl}/api/restaurants-v5?populate=*`);
    },
  },
};

async function main() {
  const serverType = process.argv[2] ?? "contentful";
  const port = process.argv[3] ? parseInt(process.argv[3], 10) : DEFAULT_PORT;

  const entry = SERVERS[serverType];
  if (!entry) {
    console.error(
      `Unknown server type: ${serverType}. Available: ${Object.keys(
        SERVERS
      ).join(", ")}`
    );
    process.exit(1);
  }

  if (isNaN(port)) {
    console.error(`Invalid port: ${process.argv[3]}`);
    process.exit(1);
  }

  const server = entry.create();

  console.log(`Starting ${serverType} mock server...`);
  await server.start(port);

  const baseUrl = server.getBaseUrl();
  console.log("\n" + "=".repeat(60));
  console.log(`${serverType} Mock Server is running!`);
  console.log("=".repeat(60));
  console.log(`\nBase URL: ${baseUrl}`);

  // Display server-specific info/examples
  entry.info(baseUrl);

  const serverStr = Object.keys(SERVERS).join("|");
  console.log(`\nUsage: run-mock-server.ts [${serverStr}] [port]`);
  console.log(`\nPress Ctrl+C to stop the server\n`);

  // Keep the process running
  process.on("SIGINT", async () => {
    console.log("\n\nShutting down...");
    await server.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
