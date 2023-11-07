import { getMiddlewareResponse } from "@plasmicapp/loader-nextjs/edge";
import { NextRequest, NextResponse, userAgent } from "next/server";

// Exclude paths that are definitely not Plasmic pages with variations
export const config = {
  matcher: ["/:path((?!_next/|api/|favicon\\.ico|plasmic-host).*)"],
};

export async function middleware(req: NextRequest) {
  // Only pick a dynamic variation for GET requests
  if (req.method !== "GET") {
    return;
  }

  // NextJs uses https://github.com/faisalman/ua-parser-js to parse
  const ua = userAgent(req);
  const browser = ua.browser.name?.includes("Chrome")
    ? "Chrome"
    : ua.browser.name?.includes("Safari")
    ? "Safari"
    : "Other";

  const newUrl = req.nextUrl.clone();

  const PLASMIC_SEED = req.cookies.get("plasmic_seed");

  // Rewrite to a new pathname that encodes the custom traits for
  // this request, as well as some randomness for A/B tests
  const { pathname, cookies } = getMiddlewareResponse({
    path: newUrl.pathname,
    traits: {
      // Add values for custom traits that you are using; these are
      // likely read off of the cookie.
      ...(req.nextUrl.searchParams.get("utm_source")
        ? { utm_source: req.nextUrl.searchParams.get("utm_source") ?? "" }
        : {}),
      browser,
    },
    cookies: {
      ...(PLASMIC_SEED ? { plasmic_seed: PLASMIC_SEED.value } : {}),
    },
  });

  // Rewrite the response to use this new pathname
  newUrl.pathname = pathname;
  const res = NextResponse.rewrite(newUrl);

  // Save anything that needs to be saved in a cookie -- specifically,
  // the custom trait that corresponds to the random seed. The same
  // random seed will be used to pick the A/B test bucket each time
  // the user visits, to ensure that a visitor will always see the
  // same A/B test bucket.
  cookies.forEach((cookie) => {
    res.cookies.set(cookie.key, cookie.value);
  });

  return res;
}
