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
  The low-code visual builder for your codebase.
</h3>
<p align="center">
  Build beautiful apps and websites incredibly fast.
  Drag and drop your own components, integrate with your codebase.
  Break through the no-code ceiling.
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

## What is Plasmic?

Plasmic is a visual builder for the web.

You can use it to build web apps and websites, and you can use it as a visual content management system.

It lets anyone, regardless of coding background, design and build rapidly--code optional.

At the same time, it is powerful, with a deep feature set that scales to complex projects.
And with codebase integration, it removes the ceiling typically associated with low-code tools.

Some highlights of what Plasmic provides:

- **Full design freedom** and speedy modern design tool UX.
- Create **rich interactions and behavior**.
- Connect with **arbitrary data source and backend integrations**.
- **Content creator mode**: give specific collaborators a more simplified and restricted editing experience.
- Deep collaboration with multiplayer, branching, cross-project imports, and multi-workspace organizations.
- **Integrate with codebases** for unlimited flexibility and scale.
- **Drag/drop and visually manipulate your own React components**—design systems, interactions, data, behavior, and more. Extend and customize Studio with custom controls.
- **Import designs from Figma**, translating its proprietary vector document format into DOM/CSS.
- **Powerful abstractions** like components, variants, slots, composable state management, and more that promote composition and let you build and maintain at scale.
- **High-performance and high-quality codegen**. Supports static site generation, automatic image optimization, layout shift reduction, and more.
- **Customizable design system components**. Powered by [react-aria](https://react-spectrum.adobe.com/react-aria/). Most component libraries give you variables to tweak, but here you can completely change the structure and layout.
- Deploy/host/export anywhere
- End-user auth and permissions
- **Versatility in use cases**. The line between websites and web apps can be blurry.

Learn more on [our website][website] and [our docs][docs]. Or check out [comparisons of Plasmic vs other tools][comparisons].

[website]: https://www.plasmic.app
[comparisons]: https://docs.plasmic.app/learn/comparisons/

## Get help and join our community

Connect with the Plasmic team and with other Plasmic users on the [Plasmic Community Slack][slack].

[slack]: https://www.plasmic.app/slack

## How do I integrate Plasmic as a CMS?

This is one popular use case of Plasmic.

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

## Who uses Plasmic?

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

## How does Plasmic work?

### How codebase integration works

Note: you do not need to integrate Plasmic with a codebase.
This is core to using Plasmic as a CMS, but you can build complete apps and websites without this, entirely within Plasmic.

Read [the full technical overview](https://docs.plasmic.app/learn/technical-overview/).

### Bring your own React components

You can register your own arbitrary custom React components for use as building blocks within Plasmic Studio.
[Learn more about code components](https://code-components.plasmic.site).

### Codegen

Besides the Headless API, you can also [generate React code](https://docs.plasmic.app/learn/codegen-guide) into your codebase.
This is a powerful way to use Plasmic as a UI builder for creating rich interactive web applications—one example of this is Plasmic Studio itself.
See the [application development tutorials](https://docs.plasmic.app/learn/minitwitter-tutorial) to learn more.

## Note on versioning

One common issue we see is mismatched or duplicate versions of packages.

`@plasmicapp` packages can depend on each other.
Each package always has an *exact* version of its @plasmicapp dependencies.
This is because we want to ensure that all packages are always in sync, and that we don't end up with a mismatched set of packages.

Packages like `@plasmicapp/host` must also be deduped, since functionality such as `registerComponent` make use of globals and side effects, so with multiple versions you could end up using the wrong "instance" of this package.
Additionally, types can be tightly coupled across multiple packages.

Unfortunately, npm and yarn make it easy for you to end up with mismatched versions and duplicate versions of packages.
Use the `npm list` command to ensure that you have unique deduped versions of packages.
Furthermore, issues can be "sticky," since npm/yarn are stateful.
At times, you may need to rely on `npm dedupe`, or removing and reinstalling Plasmic packages (including `@plasmicpkgs` packages), resetting package-lock.json/yarn.lock, in order to unwedge npm/yarn.

`@plasmicpkgs` (the built-in code component packages) have `@plasmicapp` packages as peer dependencies,
and these specify ranges rather than exact versions--this is to offer some flexibility for developers to use the core package versions they need, while still using `@plasmicpkgs`.

Note: exact versioning does not imply that every package increments versions for every release.
Packages are only incremented if they or their dependencies have changed.
Incrementing versions, including those referenced in `dependencies` and `devDependencies`, is done automatically when our deployment scripts run `lerna version patch --exact...`,
which detects whether a package has changed since its last git-tagged release.

## Contributing 🚀

Please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Getting help

Feel free to join our [Slack Community][slack] and ask us anything! We're here to help and always welcome contributions.

## Contributors ❤️

Thanks to all the people who make Plasmic!

<a href="https://github.com/plasmicapp/plasmic/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=plasmicapp/plasmic" />
</a>