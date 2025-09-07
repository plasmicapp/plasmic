<!-- AUTO-GENERATED-CONTENT:START (STARTER) -->
<p align="center">
  <a href="https://www.plasmic.app">
    <img alt="Plasmic" role="img" src="https://static1.plasmic.app/brand/2023/logo-cropped.png" width="120">
  </a>
</p>
<h1 align="center">
  Plasmic
</h1>
<h3 align="center">
  The open-source visual builder for your codebase.
</h3>
<p align="center">
  Build beautiful apps and websites incredibly fast.
</p>
<p align="center">
  Drag and drop your own components, integrate with your codebase.
</p>
<p align="center">
  Break through the low-code ceiling.
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
- [Plasmic Forum][forum]
- [Slack Community][slack]

[docs]: https://www.plasmic.app/learn/
[quickstart]: https://www.plasmic.app/learn/quickstart/
[forum]: https://forum.plasmic.app/
[slack]: https://www.plasmic.app/slack

## See Plasmic in action

- Vercel marketing page: https://youtu.be/itvbmgLZvcM (live app: https://vercel-workflow.vercel.app)

- Apple.com: https://apple.plasmic.run

- Shopify headless storefront: https://commerce.plasmic.run

- Twitter clone: https://youtu.be/rpdjrFuVMog (live app: https://twitter.plasmic.run)

- Service desk app: https://youtu.be/rYqSpUEJSTw (live app: https://tickets.plasmic.run)

- Interview with Lee Robinson, Plasmic as a visual CMS: https://www.youtube.com/watch?v=pcVzNR6FBAQ

- Emails with React.Email: coming soon

## What is Plasmic?

Plasmic is a visual builder for the web.

It enables rapidly designing and building applications and websites--code optional.

Main use cases:

- Content management: let marketing drag/drop your React components to build landing pages in your Next.js website, with design guardrails

- Applications: let developers and technical users quickly build internal tools, client portals, and business software

- Website builder and design tool that doesn’t limit you to some built-in ecommerce platform, CMS, or hosting

Plasmic is powerful, with a deep feature set that scales to complex projects.
And with codebase integration, it removes the ceiling typically associated with low-code tools.

## What makes Plasmic special?

Plasmic combines some seemingly disparate genres:

- Webflow, Wordpress and other site builders
- Retool and other tool builders
- Glide and no-code app builders
- Contentful and other CMSes

Today these are different tools to specialize in, but the line between, say, a website and an application is blurry (consider an ecommerce storefront with user logins). With the right foundations, we think these can be unified—Plasmic’s UI can adapt to different levels of control for different personas/tasks.

But more importantly, unlike existing tools, Plasmic integrates with codebases. This is critical to making low-code scale past the complexity ceiling that all such tools (including Plasmic) have. You can drag and drop existing complex React components, and you can visually create new UIs/components within traditionally-coded applications, seamlessly weaving code and no-code.

Some feature highlights:

- **Full design freedom** and speedy modern design tool UX.
- **Integrate with codebases** to drag/drop existing React components, publish screens into existing applications, and extend/customize Plasmic Studio.
- Create **rich stateful interactions and behavior**.
- Connect with **arbitrary data source and backend integrations**.
- **Powerful abstractions** like components, variants, slots, composable state management, and more that promote composition and let you build and maintain at scale.
- **Customizable headless design system components** powered by [react-aria](https://react-spectrum.adobe.com/react-aria/).
- **Content creator mode**: give specific collaborators a more simplified editing experience with design guardrails.
- **Open integrations**: choose your own CMS, ecommerce platform, hosting provider, and more.
- Deep collaboration with multiplayer, branching, cross-project imports, and multi-workspace organizations.
- **Import designs from Figma**, translating its proprietary vector document format into DOM/CSS.
- **Page performance and high-quality codegen**. Supports static site generation, automatic image optimization, layout shift reduction, and more.
- **Deploy/host/export anywhere**, including Vercel, Netlify, or any hosting provider.
- **End-user auth and permissions**, including RBAC and user-scoped permissions.
- **Open-source platform** that you can always fork and control.

Learn more on [our website][website] and [our docs][docs]. Or check out [comparisons of Plasmic vs other tools][comparisons].

[website]: https://www.plasmic.app
[comparisons]: https://docs.plasmic.app/learn/comparisons/

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
  PlasmicComponent,
  PlasmicRootProvider,
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
    <img alt="Customer logos" width="1106"  src="https://github.com/plasmicapp/plasmic/assets/7129/2c682d45-6b72-4571-895a-e48b0c588647">
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
Each package always has an _exact_ version of its @plasmicapp dependencies.
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

## Get help and join our community

Our [docs][docs] and our community [forum] and [Slack] with 3000+ members are the best places to get help with Plasmic.

For support from the Plasmic team, please use the forum.
The forum is also easily searchable for all previously asked questions and discussions.

Both the docs and forum are indexed by search engines!
Search both by including “plasmic” in your query.

## License

All content outside of `platform/` is licensed under the MIT license--see LICENSE.md.

`platform/` is licensed under the AGPL--see LICENSE.platform.md.

## Contributors ❤️

Thanks to all the people who make Plasmic!

<a href="https://github.com/plasmicapp/plasmic/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=plasmicapp/plasmic" />
</a>

## Secrets (SOPS + age)
- Repo vault: `.secrets/dev.env.enc` (encrypted dotenv)
- Helper: `scripts/secrets` — `pull|edit|import|doctor`
- Global defaults (optional): `Smarty-Pants-Inc/secrets/global/workstation.env.enc` → `~/.config/smarty/global.env`

Local
- Edit repo vault: `scripts/secrets edit dev`
- Merge + write `.env.local`: `make secrets.pull && make secrets.doctor`

CI
- Add repo Actions secret `SOPS_AGE_KEY` (age private key)
- Use composite action: `uses: ./.github/actions/sops-setup` with `sops_age_key: ${{ secrets.SOPS_AGE_KEY }}`
- This writes `~/.config/age/key.txt`, installs `sops`, decrypts `.secrets/dev.env.enc` → `.env.local`, and exports keys to `GITHUB_ENV` for subsequent steps.
