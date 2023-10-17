# Custom Targeting Example

This is an example of how to use Plasmic with custom targeting. Following the code in [Docs](https://docs.plasmic.app/learn/rendering-variations/).

- In [plasmic-host](./pages/plasmic-host.tsx) it's defined the custom targetting traits `utm_source` and `browser`;
- In [middleware](./middleware.ts) both the values of `utm_source` and `browser` are passed to `getMiddlewareResponse` as well
  as some special handling to only `getMiddlewareResponse` if the page is a splits enabled page;
- In [Catch All](./pages/abtest/[[...catchall]].tsx) the `rewriteWithoutTraits` function is called to extract the traits from the url, in `getStaticPaths` the function `generateAllPaths` is called so that all seeded pages are generated in build time. The page uses `PlasmicSplitsProvider` to provide the traits to power A/B testing, segmentation and scheduling.

To open the corresponding Plasmic project (cloning it if you wish):

https://studio.plasmic.app/projects/pKnDSUf6hHdKMbSuzompSH

A live demo is available at:

https://custom-targeting-codegen.vercel.app/

The targetting shows different variations based on the following rules:

- `browser` = `chrome`
- `utm_source` = `google`

By going to the following URL:

https://custom-targeting-codegen.vercel.app/?utm_source=google

The variation with utm_source = google will be shown.
By using different browsers, the variation with browser = chrome will be shown.

In the abtest page, it's possible to see the different variations by clicking in the main button:

https://custom-targeting-codegen.vercel.app/abtest

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Slack Community](https://www.plasmic.app/slack)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!
