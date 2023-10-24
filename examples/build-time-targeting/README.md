# Build Time Targeting

This is an example of how to use Plasmic with custom targeting. Following the code in [Docs](https://docs.plasmic.app/learn/rendering-variations/).

- In [plasmic-init](./plasmic-init.ts) it's defined the custom targetting traits `utm_source` and `browser`;
- In [middleware](./middleware.ts) both the values of `utm_source` and `browser` are passed to `getMiddlewareResponse`;
- In [Catch All](./pages/[[...catchall]].tsx) the `getActiveVariation` function is called to extract the variation based on the custom targetting traits.
- In [Catch All](./pages/[[...catchall]].tsx) the `generateAllPathsWithTraits` function is called to generate all the possible paths based on the custom targetting traits.

To open the corresponding Plasmic project (cloning it if you wish):

https://studio.plasmic.app/projects/qSU617xDVJeD8V18Bsr4AA

A live demo is available at:

https://build-time-targeting.vercel.app/

The targetting shows different variations based on the following rules:
- `browser` = `chrome`
- `utm_source` = `google`

By going to the following URL:

https://build-time-targeting.vercel.app/?utm_source=google

The variation with utm_source = google will be shown.
By using different browsers, the variation with browser = chrome will be shown.

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Slack Community](https://www.plasmic.app/slack)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!