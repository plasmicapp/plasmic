// organize-imports-ignore
import {
  PlasmicCanvasHost,
  unstable_registerFetcher as registerFetcher,
} from "@plasmicapp/host";

import * as React from "react";
import { createRoot } from "react-dom/client";

export async function getBlogPosts(publishedOnly: true) {
  console.log("BLOG POST WAIT");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("BLOG POST DONE");
  return {
    blogPosts: [
      { id: 42, title: "Baz", body: "Qux", isPublished: false },
      { id: 16, title: "Foo", body: "Bar", isPublished: true },
    ].filter((x) => !publishedOnly || x.isPublished),
  };
}

registerFetcher(getBlogPosts, {
  name: "getBlogPosts",
  displayName: "get blog posts",
  args: [
    {
      name: "publishedOnly",
      type: "boolean",
    },
  ],
  returns: "object",
  importPath: "./src/components/Badge.tsx",
});

export function renderHostScaffold() {
  const appRoot = document.querySelector(".app-root");
  if (appRoot) {
    const root = createRoot(appRoot);
    return root.render(<PlasmicCanvasHost />);
  }
}

if (location.pathname === "/static/host.html") {
  renderHostScaffold();
}
