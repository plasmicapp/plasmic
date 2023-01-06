<!-- AUTO-GENERATED-CONTENT:START (STARTER) -->
<p align="center">
  <a href="https://www.plasmic.app">
    <img alt="Plasmic" role="img" src="https://cdn-images-1.medium.com/max/176/1*D1nV2o_le9dJEO3G80P4xg@2x.png" width="120">
  </a>
</p>
<h1 align="center">
  Plasmic
</h1>
<h3 align="center">
  The headless page builder + CMS for React, Vue, Angular, PHP, vanilla JS, and more.
</h3>
<p align="center">
  Drag and drop your own code components.
  Let non-developers create stunning content,
  and free up developers from pixel-pushing.
</p>

<p>&nbsp;</p>

<p align="center">
  <a href="https://www.plasmic.app">
    <img src="https://user-images.githubusercontent.com/7129/146098801-0691ff13-e302-40fb-827e-90488a7a28b4.gif"/>
  </a>
</p>

<p align="center">
  <a href="https://docs.plasmic.app/learn/quickstart">
    <img src="https://user-images.githubusercontent.com/7129/139351025-8acd6f6d-8e32-4486-982e-a6f26a53d865.png"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/plasmicapp/plasmic"><img alt="License" src="https://img.shields.io/github/license/plasmicapp/plasmic" /></a>
  <a href="https://www.npmjs.com/package/@plasmicapp/loader-react"><img alt="Types" src="https://img.shields.io/npm/types/@plasmicapp/loader-react" /></a>
  <a href="https://github.com/prettier/prettier"><img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg" /></a>
  <a href="https://github.com/plasmicapp/plasmic/pulls"><img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" /></a>
</p>

## Quick links

- [Website](https://www.plasmic.app/)
- [Documentation][docs]
- [Quickstart][quickstart]
- [Slack Community][slack]

[docs]: https://www.plasmic.app/learn/
[quickstart]: https://www.plasmic.app/learn/quickstart/

## How it works

**Step 1.** Install Plasmic into your codebase (exact package [depends on your framework][quickstart]).

```
npm install @plasmicapp/loader-nextjs
```

**Step 2 (optional).** Make components from your app or design system available for drag-and-drop in the visual editor:

```tsx
// Take any component from your app or design system...
export default function HeroSection({ children }) {
  return <div className="hero-section">{children}</div>;
}

// ...and make it available for drag-and-drop, along with any props you want to
// expose.
PLASMIC.registerComponent(HeroSection, {
  props: {
    children: "slot",
  },
});
```

**Step 3.** Add placeholders that render pages/components made in the visual editor anywhere in your app:

```tsx
// pages/index.tsx

import {
  PlasmicRootProvider,
  PlasmicComponent,
} from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "../plasmic-init";

// Here we fetch dynamically on the client, but you can also fetch and render
// components server-side in SSG/SSR frameworks, such as via getStaticProps
// in Next.js.
export default function IndexPage() {
  return (
    <PlasmicRootProvider plasmic={PLASMIC}>
      <PlasmicComponent component="Summer22LandingPage" />
    </PlasmicRootProvider>
  );
}
```

**Step 4.** Non-developers (or developers!) can now create new pages, sections, or components that ship directly into the app/website.

**Step 5.** When you hit Publish, changes get picked up via webhooks that trigger rebuilds,
or more specific mechanisms such as incremental static revalidation or dynamic fetching from the Plasmic CDN.

## Overview

Plasmic is a platform that contains a few things:

- Visual builder / web design tool--**this is the heart of Plasmic**
- Headless CMS for structured content (or bring your own CMS)
- Growth optimization tools (A/B testing, personalization, analytics)

Plasmic's main feature is its visual builder for the web.
Developers integrate this into their codebase,
and anyone (including non-developers) can build pages or parts of pages.

The goal is to empower and unblock non-developers such as marketers and designers, while freeing up developers from pixel-pushing content, thus letting the whole team move faster.

Plasmic as a page builder and “visual CMS” is its simplest and most common use case. Editors can create and update content in Plasmic without code, and publish this into their production site without needing to block on developers.

A key capability is that **Plasmic lets you drag and drop your own components**.
There are multiple ways to use Plasmic--editors can:

- Design and build from scratch entirely in the visual tool, as a freeform page builder. No developer code needed.
- Exclusively use existing components as building blocks (this can be enforced). This ensures consistency and makes editing easier for non-designer/non-developers.
- Anything in between.

Beyond website content, Plasmic can even be used to create frontends for complex web applications (such as Plasmic itself, which was built in Plasmic).
This is a more advanced use case.

Learn more on [our website][website] and [our docs][docs]. Or check out [comparisons of Plasmic vs other tools][comparisons].

[website]: https://www.plasmic.app
[comparisons]: https://docs.plasmic.app/learn/comparisons/

Or check out our [Next.js-based talk and demo at Next.js Conf 2021][nextconf-talk]:

[![Next.js-based talk and demo at Next.js Conf 2021](https://user-images.githubusercontent.com/7129/139349085-0e72defe-89c2-47c4-8915-b92143fbb33c.png)][nextconf-talk]

[nextconf-talk]: https://www.youtube.com/watch?v=fhEwNlzzobE

## Get help and join our community

Connect with the Plasmic team and with other Plasmic users on the [Plasmic Community Slack][slack].

[slack]: https://www.plasmic.app/slack

## Features

A smattering of interesting highlights about Plasmic:

- **Drag/drop and visually manipulate your own React components**, and seamlessly nest design elements within your React components (using slots).
- **Import designs from Figma**, translating its proprietary vector document format into DOM/CSS.
- **Scalable component system** with slots/props, variants (that can be combined), and style mixins/tokens.
- **High-performance and high-quality codegen**. Supports static site generation, automatic image optimization, layout shift reduction, and more.
- **Design fully functional and accessible design system components**. For designers, you can craft completely bespoke, complex design system components like dropdowns, and we wire it up to [react-aria](https://react-spectrum.adobe.com/react-aria/). Most component libraries give you variables to tweak, but here you can completely change the structure and layout of these components.
- **Versatility in use cases**. Use it as a page builder to create simple static content like marketing/landing pages and promotional sections, or use it as a development tool for visually building complex, stateful React UIs.

## Users of Plasmic

Plasmic is used by companies ranging from Fortune 500s to boutique brands to solo makers.
It's used for websites ranging from headless commerce storefronts to marketing websites to logged-in app content.

Check out the [Case Studies and Community Showcase][customers].

[customers]: https://www.plasmic.app/casestudies

<p align="center">
  <a href="https://www.plasmic.app/casestudies">
    <img alt="Customer logos" src="https://user-images.githubusercontent.com/7129/139349783-70fc4289-ea1a-4ca2-bff1-400c8b367c17.png">
  </a>
</p>

<p align="center">
  <a href="https://www.plasmic.app/casestudies">
    <img alt="Showcase" src="https://user-images.githubusercontent.com/7129/139349675-a807ad9d-aaaf-411b-ab4b-8247a09be676.png">
  </a>
</p>

## Technical overview

(Read [the full technical overview](https://docs.plasmic.app/learn/technical-overview/).)

The main way to integrate Plasmic into a codebase is via the Headless API.
The Headless API lets developers fetch and render into your existing codebase, without touching your code base besides the initial setup.
This allows your Plasmic users to build designs and pages, and publish directly to production, without involving the development team.

You can think of Plasmic as a CMS, but where editors get to edit HTML/CSS rather than JSON data.
Developers then just render the content as-is.

Plasmic does not host your site;
your site continues to run on your existing infrastructure and tech stack.

For static site generators and server-rendered pages,
Plasmic content is loaded at build-time or server-side and thus pre-rendered,
optimizing page load performance.
For other sites that fetch and render client-side,
Plasmic content is loaded from the AWS Cloudfront CDN.

New pages can automatically just show up.
The codebase integration can be configured such that
as users create pages and routes in Plasmic Studio,
they will be auto-loaded into your app without developer involvement.

### Bring your own React components

You can register your own arbitrary custom React components for use as building blocks within Plasmic Studio.
[Learn more about code components](https://code-components.plasmic.site).

### Codegen

Besides the Headless API, you can also [generate React code](https://docs.plasmic.app/learn/codegen-guide) into your codebase.
This is a powerful way to use Plasmic as a UI builder for creating rich interactive web applications—one example of this is Plasmic Studio itself.
See the [application development tutorials](https://docs.plasmic.app/learn/minitwitter-tutorial) to learn more.

## Contributing

This repo contains the code for all Plasmic component store packages (`@plasmicpkgs/*`), client libraries/SDKs (`@plasmicapp/*`), and examples (under the `examples/` dir).

(For hacking on code components or `plasmicpkgs`, see specific additional instructions further down.)

We use `lerna` to help us manage dependencies among all the packages.

In general, we follow the "fork-and-pull" Git workflow.

1. Fork the repo on GitHub
2. Clone the project to your own machine
3. Commit changes to your own branch
4. Push your work back up to your fork
5. Submit a Pull request so that we can review your changes

NOTE: Be sure to merge the latest from "upstream" before making a pull request!

### Getting started

```
yarn lerna bootstrap  # inter-links all the lerna-managed packages together
```

We also make use of [Verdaccio](https://verdaccio.org/) to locally test packages. This just stands up a local npm registry that you can publish your test packages to.

```
yarn global add verdaccio
verdaccio &  # Runs the verdaccio server at http://localhost:4873
```

You'll need to update the verdaccio config file, at `~/.config/verdaccio/config.yaml`, to instruct verdaccio to not use npmjs for our test packages:

```
packages:
  '@plasmicapp/*':
    access: $all
    publish: $all
    unpublish: $all
  '@plasmicpkgs/*':
    access: $all
    publish: $all
    unpublish: $all
```

Then kill and restart the verdaccio server:

```
verdaccio &
```

Finally, in order to publish, you may be required to have a user login.
Create this one-time in your Verdaccio--it doesn't matter what user/password/email you input:

```
npm --registry=http://localhost:4873 adduser
```

### Development workflow

1. Make some changes!

1. If you're ready to test, run `yarn local-publish YOURPKG`. This unpublishes YOURPKG and its dependencies from your verdaccio, re-builds them, and publishes them to your local verdaccio. Note that this does not bump versions!  We are using nx under the hood, so if your dependencies haven't changed, this should be fast.

1. Install the canary version into wherever you're trying to test, via `yarn add ... --registry=http://localhost:4873`

(You can quickly create a test target app to install into with `npx create-plasmic-app`).

### Development tips

You can publish an individual package with, for instance:

```
cd plasmicpkgs/SOMETHING
yarn publish --registry=http://localhost:4873
# Or with more options: yarn publish --canary --yes --include-merged-tags --no-git-tag-version --no-push --registry=http://localhost:4873 --force-publish
```

As a hack, you can also temporarily edit `package.json` to list just the desired project + dependencies in `workspaces`, if you need to develop/test across multiple packages.

As an alternative to verdaccio, you can also use `yalc`.
Your mileage may vary.
It tends to work when there are fewer dependencies/moving parts.

```
yalc publish  # from the packages/ or plasmicpkgs/ dir

yalc add @plasmicpkgs/PACKAGENAME  # from your test app
npm i
npm run dev
```

## Contributing code components (`plasmicpkgs`)

The above general contribution instructions also apply to plasmicpkgs, so read that if you haven't done so.

Before starting, we recommend reading our docs for Code Components:

- [Docs on code components][code component docs]

### Creating a new package

Skip this if you are just updating an existing package.

To create a new plasmicpkg, the easiest approach is to clone one of the existing packages (like react-slick) and fix up the names in package.json and README. Then author your registration code in src. Please use `yarn` for package management.

The directory name should be the same name as the main package you'll be using to import the React components. Your package must be named `@plasmicpkgs/{package-name}` and start with version 1.0.0. It should have the most recent version of `@plasmicapp/host` as a peerDependency.

### Testing changes

Ensure you can start running/testing a package before starting to make any code changes.

1. (One-time) Set up a normal repo with an app host, as [documented here](https://docs.plasmic.app/learn/app-hosting/). You can do this with:

   ```
   npx create-plasmic-app # Just create a Next.js app using PlasmicLoader
   ```

1. Now each time you want to try out a change, install your plasmicpkg into the app host repo using `yalc`.

    1. From your plasmicpkg/PACKAGENAME directory, run:

       ```
       npm run local-canary
       ```

    2. From your app host directory, run:

       ```
       npm install @plasmicpkgs/PACKAGENAME@latest
       ```

    3. Restart your app host, and reload the project in Studio:

       ```
       npm run dev
       ```

### Note on registration functions

The package must work for both codegen and loader users. This means that the register functions must have a optional parameter for the loader. It should also have an optional metadata parameter for users that want to use their own custom metadata.

```typescript
export function registerFooBar(
  loader?: { registerComponent: typeof registerComponent },
  customFooBarMeta?: ComponentMeta<FooBarProps>
) {
  if (loader) {
    loader.registerComponent(FooBar, customFooBarMeta ?? FooBarMeta);
  } else {
    registerComponent(FooBar, customFooBarMeta ?? FooBarMeta);
  }
}
```

Feel free to create wrapper components if it makes the final result better for the user. You also don't need to register all the props available for the component, only the ones that will be used in the studio.

Remember to export any wrapper components/types used to register the component. Everything should be also exported from the `index.ts` file, so all the imports are from `@plasmicpkgs/{package-name}`.

We recommend a `registerAll()` function for an easy way to register all the available components in the package.

### Submitting changes

Checklist to test:

- Does your component behave well in the Studio in **both** editing and live preview modes?
- Do _all_ of the props and slots work correctly?

Remember that your package will be used by a wide variety of users, so it's important to have easy-to-use components, with good descriptions.

After testing in the Studio, it's also good to test both the available code options: loader and codegen.
Testing codegen ensures your import paths are correct.

- [Codegen guide](https://docs.plasmic.app/learn/codegen-guide/)
- [Next.js loader guide](https://docs.plasmic.app/learn/nextjs-quickstart/)

## Getting help

Feel free to join our [Slack Community][slack] and ask us anything! We're here to help and always welcome contributions.
