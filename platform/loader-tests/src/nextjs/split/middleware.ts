// Import directly from loader-edge to avoid TS6 incompatibility with older
// loader-nextjs versions that use `export type *` in their edge.d.ts
import { getMiddlewareResponse } from "@plasmicapp/loader-edge";
import { NextRequest, NextResponse } from "next/server";

const excludePaths = [
  "/api",
  "/favicon",
  "/plasmic-host",
  "/fonts",
  "/images",
  "/videos",
  "/_next",
];

export async function middleware(req: NextRequest) {
  console.debug = console.log;
  if (
    req.method !== "GET" ||
    excludePaths.some((x) => req.nextUrl.pathname.startsWith(x))
  ) {
    return;
  }

  const { pathname, cookies } = getMiddlewareResponse({
    cookies: Object.fromEntries(
      "getAll" in req.cookies
        ? // Next 13+ API
          (req.cookies as any).getAll().map((c: any) => [c.name, c.value])
        : // Next 12 API
          Array.from((req.cookies as any).keys()).map((key: string) => [
            key,
            (req.cookies as any).get(key),
          ])
    ),
    traits: {
      ...(req.nextUrl.searchParams.get("utm_campaign")
        ? {
            utm_campaign: req.nextUrl.searchParams.get("utm_campaign"),
          }
        : {}),
    },
    path: req.nextUrl.pathname,
  });

  const newUrl = req.nextUrl.clone();
  newUrl.pathname = pathname;

  const res = NextResponse.rewrite(newUrl);
  cookies.forEach((cookie) => {
    res.cookies.set(cookie.key, cookie.value);
  });

  return res;
}
