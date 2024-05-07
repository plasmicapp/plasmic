import { Site } from "@/wab/classes";
import {
  ensure,
  ensureString,
  hackyCast,
  safeCast,
  swallowAsync,
  tuple,
} from "@/wab/common";
import { bytesToStringUTF8, hexToBytes } from "@/wab/commons/string-encodings";
import { isPageComponent } from "@/wab/components";
import { Config } from "@/wab/server/config";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { User } from "@/wab/server/entities/Entities";
import { genLoaderHtmlBundleSandboxed } from "@/wab/server/routes/loader";
import { getUser, superDbMgr, userDbMgr } from "@/wab/server/routes/util";
import { getShopifySecrets } from "@/wab/server/secrets";
import { UnauthorizedError } from "@/wab/shared/ApiErrors/errors";
import { ProjectId, UserId } from "@/wab/shared/ApiSchema";
import { getPublicUrl } from "@/wab/urls";
import Shopify, {
  ApiVersion,
  DataType,
  SessionInterface,
} from "@shopify/shopify-api";
import { RestClient } from "@shopify/shopify-api/dist/clients/rest";
import { Request, Response } from "express-serve-static-core";
import fs from "fs";
import glob from "glob";
import https from "https";
import { matchPath } from "react-router-dom";
import { z } from "zod";

const always = !process.env.NEVER;

export async function emailWebhook(req: Request, res: Response) {
  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: req.config.mailUserOps,
    subject: `Got webhook call at ${req.path}`,
    text: JSON.stringify(req.body, null, 2),
  });
  res.json({});
}

const ShopifyPagePayload = z.object({
  title: z.string(),
  handle: z.string(),
  body_html: z.string(),
  author: z.nullable(z.string()),
  template_suffix: z.nullable(z.string()),
});
export const ShopifyPage = ShopifyPagePayload.extend({
  id: z.number(),
  shop_id: z.number(),
  /** ISO format */
  created_at: z.string(),
  /** ISO format */
  updated_at: z.string(),
  /** ISO format */
  published_at: z.nullable(z.string()),
});

export type ShopifyPage = z.infer<typeof ShopifyPage>;

export const ShopifyCreatePageData = ShopifyPagePayload.extend({
  published: z.boolean(),
}).partial();

export const ShopifyUpdatePageData = ShopifyCreatePageData.extend({
  /** Yes, Shopify requires ID in both path and body */
  id: z.number(),
});

export const ShopifyGetPagesResponse = z.object({
  pages: z.array(ShopifyPage),
});

export const ShopifyUpdatePageRequest = z.object({
  page: ShopifyUpdatePageData,
});

export type ShopifyUpdatePageRequest = z.infer<typeof ShopifyUpdatePageRequest>;

export const ShopifyCreatePageRequest = z.object({
  page: ShopifyCreatePageData,
});

export type ShopifyCreatePageRequest = z.infer<typeof ShopifyCreatePageRequest>;

export const ShopifyTheme = z.object({
  id: z.number(),
  role: z.string(),
});

export type ShopifyTheme = z.infer<typeof ShopifyTheme>;

export const ShopifyGetThemesResponse = z.object({
  themes: z.array(ShopifyTheme),
});

export const ShopifyAsset = z.object({
  key: z.string(),
  value: z.string(),
});

export const ShopifyGetAssetResponse = z.object({
  asset: ShopifyAsset,
});

export const ShopifyScriptTagPayload = z.object({
  event: z.literal("onload"),
  src: z.string(),
});

export const ShopifyScriptTag = ShopifyScriptTagPayload.extend({
  id: z.number(),
});

export const ShopifyGetScriptTagsResponse = z.object({
  script_tags: z.array(ShopifyScriptTag),
});

export const ShopifyCreateScriptTagRequest = z.object({
  script_tag: ShopifyScriptTagPayload.partial().and(
    ShopifyScriptTag.pick({
      src: true,
      event: true,
    })
  ),
});

export type ShopifyCreateScriptTagRequest = z.infer<
  typeof ShopifyCreateScriptTagRequest
>;

export async function getShopifyClientForUserId(dbMgr: DbMgr, userId: UserId) {
  const token = await dbMgr.tryGetOauthToken(userId, "shopify");
  if (!token) {
    throw new Error("Missing Shopify token");
  }
  const rawSession = hackyCast<SessionInterface>(token.token);

  // TODO Some scratch notes - hopefully will be replacing all this soon with
  //  proper storage into OAuthToken:

  // await Shopify.Context.SESSION_STORAGE.storeSession(rawSession);
  // const session = ensure(
  //   await Shopify.Utils.loadOfflineSession(shop)
  // );

  // const session = new Session(rawSession.id);
  // Object.assign(session, rawSession);

  const session = rawSession;

  const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
  return { session, client };
}

async function getShopifyClient(req: Request) {
  const userId = getUser(req).id;
  const dbMgr = superDbMgr(req);
  const { session, client } = await getShopifyClientForUserId(dbMgr, userId);
  addShopify(req.config, session.shop);
  return { session, client };
}

export async function getProducts(req: Request, res: Response) {
  const projectId = ensureString(req.query.projectId);
  const project = await userDbMgr(req).getProjectById(projectId);
  const { html } = await genLoaderHtmlBundleSandboxed({
    projectId: projectId,
    component: ensureString(req.query.component),
    hydrate: false,
    embedHydrate: false,
    projectToken: ensure(
      project.projectApiToken,
      "Must have a project API token"
    ),
  });
  res.json({ html });
  if (always) return;

  const { client } = await getShopifyClient(req);
  const products = await client.get({ path: "products" });
  res.json({ products });
}

/**
 * We maintain some sync state mapping between pages in the Plasmic project and in the shop.
 *
 * TODO Also need to think about draft and published states.
 *
 * TODO You can only publish all or nothing, not a single page at a time.
 */
export async function publishShopifyPages(req: Request, res: Response) {
  const db = userDbMgr(req);
  const { client } = await getShopifyClient(req);

  const projectId: ProjectId = ensureString(req.query.projectId) as ProjectId;
  const rev = await db.getLatestProjectRev(projectId);
  const site = req.bundler.unbundle(JSON.parse(rev.data), projectId) as Site;

  const shopPagesResp = await client.get({ path: "pages" });
  const shopPages = ShopifyGetPagesResponse.parse(shopPagesResp.body).pages;
  const shopPageByHandle = new Map(
    shopPages.map((shopPage) => tuple(shopPage.handle, shopPage))
  );
  const shopPageById = new Map(
    shopPages.map((shopPage) => tuple(shopPage.id, shopPage))
  );

  const pages = site.components.filter(isPageComponent);

  const syncState = await db.getShopifySyncState(projectId);
  const plasmicPageToShopPage = new Map(Object.entries(syncState.pages));

  const errors = [];

  for (const page of pages) {
    const match = matchPath<{ handle: string }>(page.pageMeta.path, {
      path: "/pages/:handle",
      exact: true,
      strict: true,
    });
    if (!match) {
      continue;
    }
    const handle = match.params.handle;
    const shopPageId = plasmicPageToShopPage.get(page.uuid);
    const shopPage = shopPageId ? shopPageById.get(shopPageId) : undefined;

    // TODO If another page already has this handle, then error and skip.

    const projectApiToken = await db.validateOrGetProjectApiToken(projectId);

    const pageArgs = {
      projectId,
      projectApiToken,
      host: getPublicUrl(),
    };
    const html = `<script>window.__plasmicPageArgs = ${JSON.stringify(
      pageArgs
    )}</script>`;

    const create: ShopifyCreatePageRequest = {
      page: {
        body_html: html,
        // author: fullName(user),
        title: page.pageMeta.title ?? "(untitled)",
        handle: handle,
        published: true,
        template_suffix: "pl-base",
      },
    };
    let finalShopPage: ShopifyPage;
    if (shopPage) {
      const update: ShopifyUpdatePageRequest = {
        page: { ...create.page, id: shopPage.id },
      };
      finalShopPage = (
        (
          await client.put({
            path: `pages/${shopPage.id}`,
            data: safeCast<{}>(update),
            type: DataType.JSON,
          })
        ).body as any
      ).page;
    } else {
      finalShopPage = (
        (
          await client.post({
            path: `pages`,
            data: safeCast<{}>(create),
            type: DataType.JSON,
          })
        ).body as any
      ).page;
    }

    syncState.pages[page.uuid] = finalShopPage.id;
  }

  await db.upsertShopifySyncState(projectId, syncState);

  res.json({ errors });
}

const sessionStorage = new Shopify.Session.MemorySessionStorage();

/**
 * TODO This is likely not safe for concurrent use!!!
 *  Terrible.
 *  Thankfully our interaction with the Shopify that depends on this is limited for now - just the auth flow.
 *  We should migrate all customers off to a single app soon though.
 *  Maybe even use a lock for a while.
 */
export function addShopify(config: Config, customerName: string) {
  const shopifySecrets = ensure(
    getShopifySecrets(),
    "Shopify secrets must exist"
  );
  const alt = shopifySecrets.alts?.[customerName];
  const final = alt ?? shopifySecrets;
  Shopify.Context.initialize({
    API_KEY: final.apiKey,
    API_SECRET_KEY: final.secretKey,
    SCOPES: [
      "write_content",
      "write_themes",
      "write_script_tags",
      "read_products",
      "read_product_listings",
      "write_products",
      "unauthenticated_read_content",
      "unauthenticated_read_customer_tags",
      "unauthenticated_read_product_tags",
      "unauthenticated_read_product_listings",
      "unauthenticated_write_checkouts",
      "unauthenticated_read_checkouts",
      "unauthenticated_write_customers",
      "unauthenticated_read_customers",
    ],
    HOST_NAME: config.host.replace("https://", ""),
    API_VERSION: ApiVersion.July21,
    IS_EMBEDDED_APP: false,
    // This should be replaced with your preferred storage strategy
    SESSION_STORAGE: sessionStorage,
  });
  return !!alt;
}

async function upsertShopifyPageByHandle(
  client: RestClient,
  desiredPageData: ShopifyCreatePageRequest
) {
  const { pages } = ShopifyGetPagesResponse.parse(
    (await client.get({ path: "pages" })).body
  );
  const existingPage = pages.find(
    (page) => page.handle === desiredPageData.page.handle
  );
  if (existingPage) {
    await client.put({
      path: `pages/${existingPage.id}`,
      type: DataType.JSON,
      data: desiredPageData,
    });
  } else {
    await client.post({
      path: "pages",
      type: DataType.JSON,
      data: desiredPageData,
    });
  }
}

async function upsertThemeAsset(
  client: RestClient,
  mainTheme: ShopifyTheme,
  path: string,
  value: string
) {
  await client.put({
    path: `themes/${mainTheme.id}/assets`,
    type: DataType.JSON,
    data: {
      asset: {
        key: path,
        value: value,
      },
    },
  });
}

const CURRENT_VERSION = 1;

/**
 * To make the Shopify integration work, we need to perform some post-install setup.
 *
 * This is mainly to add our client-side scripts, create an app-host page, and create a data-fetching endpoint.
 *
 * This function assumes all operations are idempotent.
 *
 * Failures (for instance, due to interruption or due to concurrent races) can result in incomplete state - for now the
 * user would need to retry the auth. But it should be safe to retry due to idempotence.
 */
export async function shopifyPostInstallSetup(
  client: RestClient,
  { force = false }: { force?: boolean } = {}
) {
  // Check if we are up-to-date.
  const { themes } = ShopifyGetThemesResponse.parse(
    (await client.get({ path: "themes" })).body
  );
  const mainTheme = ensure(
    themes.find((theme) => theme.role === "main"),
    "There must be a main theme"
  );

  async function readVersionStamp() {
    const versionResponse = await client.get({
      path: `themes/${mainTheme.id}/assets`,
      query: {
        "asset[key]": "snippets/_pl-version-stamp.liquid",
      },
    });
    const { version } = JSON.parse(
      ShopifyGetAssetResponse.parse(versionResponse.body).asset.value
    );
    return version;
  }

  const version = await swallowAsync(readVersionStamp());
  if (!force && version === CURRENT_VERSION) {
    return;
  }

  // Install script tag to serve React and code components.
  const { script_tags: scriptTags } = ShopifyGetScriptTagsResponse.parse(
    (await client.get({ path: "script_tags" })).body
  );
  const existingScriptTag = scriptTags.find((tag) =>
    tag.src.includes("//static1.plasmic.app/")
  );
  const desiredScriptTag: ShopifyCreateScriptTagRequest = {
    script_tag: {
      src: "https://static1.plasmic.app/shopify.bundle.min.js",
      event: "onload",
    },
  };
  if (existingScriptTag) {
    await client.put({
      path: `script_tags/${existingScriptTag.id}`,
      type: DataType.JSON,
      data: { id: existingScriptTag.id, ...desiredScriptTag },
    });
  } else {
    await client.post({
      path: `script_tags`,
      type: DataType.JSON,
      data: desiredScriptTag,
    });
  }

  // Install data-fetching Liquid page template.
  const relativeBaseDir = "../shopify/shopify-theme-assets";
  for (const path of glob.sync("**/*.liquid", {
    cwd: `${__dirname}/${relativeBaseDir}`,
  })) {
    const value = fs.readFileSync(
      `${__dirname}/${relativeBaseDir}/${path}`,
      "utf8"
    );
    await upsertThemeAsset(client, mainTheme, path, value);
  }

  // Install the actual data-fetching page endpoint, which uses the above template.
  await upsertShopifyPageByHandle(client, {
    page: {
      body_html: "",
      title: "(System) Generic data fetching endpoint",
      handle: "_pl-data",
      template_suffix: "pl-data",
      published: true,
    },
  });

  // Install empty host page.
  await upsertShopifyPageByHandle(client, {
    page: {
      body_html: "",
      title: "(System) Generic empty app host page",
      handle: "_pl-host",
      template_suffix: "pl-host",
      published: true,
    },
  });

  // Note that we have finished installation by adding a version stamp.
  await upsertThemeAsset(
    client,
    mainTheme,
    "snippets/_pl-version-stamp.liquid",
    JSON.stringify({
      version: CURRENT_VERSION,
    })
  );
}

const ShopifyStoreData = z.object({
  password: z.optional(z.string()),
  cookies: z.optional(z.string()),
});

async function checkUserAuthorizedForShop(
  dbMgr: DbMgr,
  user: User,
  shop: string
) {
  const token = await dbMgr.tryGetOauthToken(user.id, "shopify");
  if (!token || hackyCast<SessionInterface>(token.token).shop === shop) {
    throw new UnauthorizedError();
  }
}

async function getStoreData(dbMgr: DbMgr, shop: string) {
  return ShopifyStoreData.parse(
    JSON.parse(
      (await dbMgr.tryGetKeyValue("shopify-store-data", shop))?.value ?? "{}"
    )
  );
}

/**
 * Use the first part of the subdomain (2348a5ee97ff22348a5ee97ff22348a5ee97ff2.prox.plasmic.link)
 *
 * TODO Remove this. With hex encoding every character, this quickly reaches max subdomain length of 63 chars / full domain length of 255 chars. Should just switch to some opaque stable ID instead.
 */
function appHostUrlToShopName(appHostUrl: string) {
  return bytesToStringUTF8(hexToBytes(appHostUrl.split(".")[0]));
}

export async function fetchFromShopify(req: Request) {
  const dbMgr = superDbMgr(req);

  const appHostUrl = req.hostname;

  const shop = appHostUrlToShopName(appHostUrl);
  const origin = `https://${shop}`;

  // TODO Ensure viewer has access to Shopify store, somehow, if it is password-protected
  //  (but this usually only applies to development stores).

  // Get the session cookies to make a fetch even if behind password protection.
  const storeData = await getStoreData(dbMgr, shop);

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  const response = await fetch(`${origin}${req.originalUrl}`, {
    headers: {
      host: shop,
      cookie: storeData.cookies ?? "",
    },
    redirect: "follow",
    ...({ agent: httpsAgent } as any),
  });

  return { response };
}

/**
 * TODO This is not working.
 */
export async function updateShopifyStorePassword(req: Request, res: Response) {
  const { hostUrl, password } = req.body;
  const shop = appHostUrlToShopName(hostUrl);

  const dbMgr = userDbMgr(req);
  await checkUserAuthorizedForShop(dbMgr, getUser(req), shop);
  const existingKv = await getStoreData(dbMgr, shop);
  const kv = {
    ...existingKv,
    password,
  };
  await dbMgr.setKeyValue("shopify-store-data", shop, JSON.stringify(kv));

  try {
    const response = await fetch(`https://${shop}/password`, {
      method: "POST",
      redirect: "follow",
      body: `password=${password}`,
    });
    const result = await response.text();
    if (response.url.endsWith("/password")) {
      // TODO Unable to get cookies (and note that you need all the set-cookie headers).
      const cookies = response.headers.get("set-cookie");
      await dbMgr.setKeyValue(
        "shopify-store-data",
        shop,
        JSON.stringify({
          ...kv,
          cookies,
        })
      );
      res.json({ success: false, result });
    } else {
      res.json({ success: true, result });
    }
  } catch (error) {
    res.json({ success: false });
  }
}

export async function probeCanAccessShopifyShop(req: Request, res: Response) {
  const { response } = await fetchFromShopify(req);
  if (new URL(response.url).pathname.endsWith("/password")) {
    res.json({ error: "Not found" });
  } else {
    res.json({ success: true });
  }
}

export const proxyToShopify = async (req, res, next) => {
  // Should probably proxy more stuff back to the origin, but this will work in a pinch.
  // Leaving around some proxy logic here.

  // res.removeHeader("X-Frame-Options");
  // proxy.createProxyMiddleware({
  //   target: origin,
  //   secure: false,
  //   // hostRewrite: origin,
  //   headers: {
  //     Host: shop,
  //     Cookie: storeData.cookies ?? "",
  //   },
  //   onProxyRes: function (proxyRes, req, res) {
  //     delete proxyRes.headers["content-security-policy"];
  //     delete proxyRes.headers["X-Frame-Options"];
  //     delete proxyRes.headers["x-frame-options"];
  //   },
  // })(req, res, next);
  const { response } = await fetchFromShopify(req);
  const text = await response.text();
  res.removeHeader("X-Frame-Options");
  res.send(text);
};
