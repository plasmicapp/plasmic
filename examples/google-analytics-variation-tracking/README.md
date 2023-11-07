# Tracking Plasmic Variations with Google Analytics

This is an example of how to use Plasmic variations of experiments and segmentation and track it in Google Analytics. Following the code in [Docs](https://docs.plasmic.app/learn/variations-external-ids/).

- In [plasmic-init](./plasmic-init.ts) it's defined the custom targetting traits `utm_source` and `browser`;
- In [middleware](./middleware.ts) both the values of `utm_source` and `browser` are passed to `getMiddlewareResponse`;
- In [Catch All](./pages/[[...catchall]].tsx) the `getActiveVariation` function is called to extract the variation based on the custom targetting traits.
- In [Catch All](./pages/[[...catchall]].tsx) the `getExternalVariation` function is called to extract the external ids based on picked variation, then it's passed to Google Analytics through `<Script>` tag.

To open the corresponding Plasmic project (cloning it if you wish):

https://studio.plasmic.app/projects/qSU617xDVJeD8V18Bsr4AA

A live demo is available at:

https://google-analytics-variation-tracking.vercel.app/

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Slack Community](https://www.plasmic.app/slack)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!
