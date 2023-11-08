import { getMiddlewareResponse } from "@plasmicapp/loader-nextjs/edge";
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
      Array.from(req.cookies.keys()).map((key) => [key, req.cookies.get(key)])
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
