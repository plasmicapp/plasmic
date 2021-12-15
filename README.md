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
  The headless page builder + web design tool for React, Vue, Angular, PHP, vanilla JS, and more.
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

# Quick links

- [Website](https://www.plasmic.app/)
- [Documentation](docs)
- [Quickstart](quickstart)
- [Slack Community](slack)

[docs]: https://www.plasmic.app/learn/
[quickstart]: https://www.plasmic.app/learn/quickstart/

# The gist

**Step 1.** Install Plasmic into your codebase (exact package [depends on your framework](quickstart)).

```
npm install @plasmicapp/loader-nextjs
```

**Step 2.** Make components from your app or design system available for drag-and-drop in the visual editor:

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
// components server-side in SSG/SSR frameworks.
export default function IndexPage() {
  return (
    <PlasmicRootProvider plasmic={PLASMIC}>
      <PlasmicComponent component="Summer22LandingPage" />
    </PlasmicRootProvider>
  );
}
```

# Overview

Plasmic is a visual builder for the web.
Developers integrate this into their codebase,
and anyone (including non-developers) can build pages or parts of pages.

The goal is to empower and unblock non-developers such as marketers and designers, while freeing up developers from pixel-pushing content, thus letting the whole team move faster.

Plasmic as a page builder and “visual CMS” is its simplest and most common use case. Editors can create and update content in Plasmic without code, and publish this into their production site without needing to block on developers.

Beyond website content, Plasmic can even be used to create frontends for complex web applications (such as Plasmic itself, which was built in Plasmic). This is possible because—despite being easy to start with—Plasmic gives you full visual control and works deeply with code.

Learn more on [our website](website) and [our docs](docs).

Or check out our [Next.js-based talk and demo at Next.js Conf 2021](nextconf-talk):

[![Next.js-based talk and demo at Next.js Conf 2021](https://user-images.githubusercontent.com/7129/139349085-0e72defe-89c2-47c4-8915-b92143fbb33c.png)](nextconf-talk)

[nextconf-talk]: https://www.youtube.com/watch?v=fhEwNlzzobE

# Get help and join our community

Connect with the Plasmic team and with other Plasmic users on the [Plasmic Community Slack](slack).

[slack]: https://www.plasmic.app/slack

# Features

A smattering of interesting highlights about Plasmic:

- **Drag/drop and visually manipulate your own React components**, and seamlessly nest design elements within your React components (using slots).
- **Import designs from Figma**, translating its proprietary vector document format into DOM/CSS.
- **Scalable component system** with slots/props, variants (that can be combined), and style mixins/tokens.
- **High-performance and high-quality codegen**. Supports static site generation, automatic image optimization, layout shift reduction, and more.
- **Design fully functional and accessible design system components**. For designers, you can craft completely bespoke, complex design system components like dropdowns, and we wire it up to [react-aria](https://react-spectrum.adobe.com/react-aria/). Most component libraries give you variables to tweak, but here you can completely change the structure and layout of these components.
- **Versatility in use cases**. Use it as a page builder to create simple static content like marketing/landing pages and promotional sections, or use it as a development tool for visually building complex, stateful React UIs.

# Users of Plasmic

Plasmic is used by companies ranging from Fortune 500s to boutique brands to solo makers.
It's used for websites ranging from headless commerce storefronts to marketing websites to logged-in app content.

Check out the [Case Studies and Community Showcase](customers).

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

# Technical overview

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

## Bring your own React components

You can register your own arbitrary custom React components for use as building blocks within Plasmic Studio.
[Learn more about code components](https://code-components.plasmic.site).

## Codegen

Besides the Headless API, you can also [generate React code](https://docs.plasmic.app/learn/codegen-guide) into your codebase.
This is a powerful way to use Plasmic as a UI builder for creating rich interactive web applications—one example of this is Plasmic Studio itself.
See the [application development tutorials](https://docs.plasmic.app/learn/minitwitter-tutorial) to learn more.

# Contributing

We use `lerna` to help us manage dependencies between the `@plasmicapp/loader-*` packages, (though we may pull in more packages to be managed by lerna, right now those are the ones with tight dependencies on each other).

## Getting started

```
yarn lerna bootstrap  # inter-links all the lerna-managed packages together
```

We also make use of [Verdaccio](https://verdaccio.org/) to locally test packages. This just stands up an npm registry that you can publish your test packages to.

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
```

## Development workflow

1. Make some changes!

2. If you're ready to test, run `yarn local-canary`. This builds canary versions of your packages to your local registry.

3. Install the canary version into wherever you're trying to test, via `yarn add ... --registry=http://localhost:4873`

## Release workflow

Run `yarn bump` to bump the versions of the changed packages. If you already have an existing git commit you want to use, do `yarn bump --amend`. Submit for code review.

Make user you are authenticating with npm as the plasmicapp user.

    npm whoami # check who you are currently
    npm login # if you were not plasmicapp

Ensure you have no outstanding unmerged commits or uncommitted changes.

Ensure you have pulled the latest changes from master.

Once your change has been approved and you're ready to release to npm, run `yarn release`. This will individually publish each package to npm.
