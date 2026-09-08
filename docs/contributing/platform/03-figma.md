# Figma plugin setup

The plugin copies a `clipId` and uploads selected layers through a web bridge (`figma-plugin-web`) to `PUT /api/v1/clip/:clipId`. Studio fetches the data on paste with `GET /api/v1/clip/:clipId`.

## Use the production plugin

For internal development, use the published plugin if your Studio app server has authorized read access to production clip storage. Set `CLIP_BUCKET`, `S3_ENDPOINT`, and AWS credentials to match that storage, then restart the server. Having `~/.aws/credentials` alone does not grant access.

For separate storage, configure the bridge and exporter below.

## Configure storage

Set these on the Studio app server:

```sh
CLIP_BUCKET=your-figma-clips
# For S3-compatible storage:
# S3_ENDPOINT=https://s3.example.com
```

Use a private bucket and AWS credentials with `GetObject` and `PutObject` access. Allow multipart operations for large uploads. No public
bucket access or bucket CORS is needed. `CLIP_BUCKET` defaults to `plasmic-clips`, `S3_ENDPOINT` also affects other app server storage clients. The clip client doesn't force path-style addressing.

Clip routes don't need Studio auth or CSRF, anyone with a clip ID can retrieve it. Remember to set an expiration policy.

## Serve the web bridge

Use the repository’s Node version and each package’s pinned pnpm version.
From the repository root:

```sh
cd platform/figma-plugin-web
pnpm install --frozen-lockfile
PUBLIC_URL=/figma-plugin-app NODE_OPTIONS=--openssl-legacy-provider SKIP_PREFLIGHT_CHECK=true pnpm build
```

The flags are for Webpack 4 on Node 24 and Create React App’s ancestor dependency check. Serve `build/` at `https://studio.example.com/figma-plugin-app/`, on the same origin as the Studio API. The bridge uses relative `/api/v1/...` URLs.

## Build the exporter

In `platform/figma-plugin-plasmic-exporter`:

1. Set iframe `src` in `src/ui/components/App.tsx` to your URL, e.g. `https://studio.example.com/figma-plugin-app/`.
2. Set `networkAccess.allowedDomains` in `manifest.json` to `["https://studio.example.com"]`. For local development, use `devAllowedDomains` with HTTPS origin and port ([Figma manifest reference](https://developers.figma.com/docs/plugins/manifest/)).
3. Build:

   ```sh
   pnpm install --frozen-lockfile
   NODE_OPTIONS=--openssl-legacy-provider pnpm build
   ```

In Figma desktop, choose **Plugins → Development → Import plugin from manifest…** and select this package’s `manifest.json`. Run that plugin, select layers, click **Export selected layers to clipboard**, wait for completion, and paste into Studio. Rebuild and relaunch after source changes, and distribute `manifest.json`and `dist/` together.

## Troubleshoot

- **Export hangs:** check bridge assets, HTTPS, iframe URL, manifest allowlist, framing headers, and login redirects in Figma’s developer console.
- **Upload fails:** check the PUT response and app logs for storage permissions, routing, or request size limits.
- **Paste cannot find the clip:** verify the plugin’s destination and Studio’s bucket/endpoint match. The published plugin uses production storage.

Sources: [bridge](../../../platform/figma-plugin-web/src/index.tsx),
[clip API](../../../platform/wab/src/wab/server/routes/misc.ts),
[paste handler](../../../platform/wab/src/wab/client/figma.tsx).
