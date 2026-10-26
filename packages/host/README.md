# @plasmicapp/host

Plasmic is a visual page builder and web design tool that tightly integrates with your codebase.

This package contains functions and type definitions to enable code components to be used in Plasmic Studio.
More generally, it enables "application hosting."

Please see the docs to learn more!

https://docs.plasmic.app/learn/app-hosting

## Trusted Studio origins

`PlasmicCanvasHost` trusts `https://studio.plasmic.app` and its asset CDN, `https://studio-
static.plasmic.app`. For other Studios, including local development, list the Studio origins and,
if its assets are served from elsewhere, their base URL:

```tsx
<PlasmicCanvasHost
  allowedStudioOrigins={["https://studio.example.com"]}
  allowedStudioStaticBaseUrl="https://assets.example.com/studio"
/>
```

Setting either prop replaces Plasmic's defaults. Use exact origins (scheme, hostname, and port),
without paths or trailing slashes. These servers can execute code on your app’s origin; never
derive them from URL parameters or window messages. Untrusted configurations load no Studio script
and log a warning.
