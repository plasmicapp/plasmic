# Basic interaction (state management) example in Plasmic

This is an example of code components that let you create simple interactions in Plasmic Studio.

Specifically, it lets you make a button toggle whether something is displayed.

Usage (see [video](https://youtu.be/hWLKyPKnOTc)):

- Select a Button (or any element where you want clicking it to trigger the visibility change), and in the Custom Behaviors section in the right sidebar, select "Show/Hide Action"
- Select the content you want to show/hide, and in the Custom Behaviors section, select "Show/Hide Content".

That's it. They communicate via normal React context.

Read more on Custom Behaviors: https://docs.plasmic.app/learn/custom-behaviors/

See the ShowHide.tsx file for all the React components that serve as the building blocks.
Customize and extend these to fit your app.

This is a Next.js project bootstrapped with [`create-plasmic-app`](https://www.npmjs.com/package/create-plasmic-app).

## Getting Started

First, run the development server:

```bash
yarn dev
```

Open your browser to see the result.

You can start editing your project in Plasmic Studio. The page auto-updates as you edit the project.

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Community Forum](https://forum.plasmic.app/)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!
