# Contentful + Plasmic example

Here we demo how you can make data from Contentful available for drag-and-drop for your content editors in the Plasmic Studio visual editor.

This is a Next.js project bootstrapped with [`create-plasmic-app`](https://www.npmjs.com/package/create-plasmic-app).

To play with the live Plasmic project:

https://studio.plasmic.app/projects/8ibg42QGrW4vGT7WCuKLAF

It includes a couple of code components:

- ContenfulFetcher, which fetches Contenful data (type and schema hard-coded for this app) and repeats some elements
- ContenfulField, which renders a specific text or image field (you pick from a dropdown)

## Getting started with local development

1. Run the development server (make sure it's listening on port 3000):

```bash
yarn dev
```

2. Open the corresponding Plasmic project:

https://studio.plasmic.app/projects/8ibg42QGrW4vGT7WCuKLAF

3. Clone it from the menu by the title:

![clone it](https://user-images.githubusercontent.com/7129/158907103-3e603baa-b2fd-4a34-9755-c90f2a4eedc0.png)

4. In your clone, configure it to use http://localhost:3000 as your app host.

You can now start making changes to the way the code components work, and trying out the changes in the editor.

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Slack Community](https://www.plasmic.app/slack)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!
