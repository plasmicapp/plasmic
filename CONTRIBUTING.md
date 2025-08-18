# Contributing to Plasmic 🚀

Thank you for your interest in contributing to Plasmic! We appreciate all the contributions we receive, from issue reports to code changes.

Before getting started, get in touch with our team first on [Slack](https://plasmic.app/slack) or our [Community Forum](https://forum.plasmic.app/).

## Contributor License Agreement

When submitting a PR for `platform/` for the first time, you'll be automatically asked to agree to our [Individual Contributor License Agreement](docs/contributing/individual-cla.md), which is needed to accept your PR.
This only needs to be done once.

If you are contributing on behalf of a company, please have your company contact us to sign a [Corporate Contributor License Agreement](docs/contributing/corporate-cla.md), via community@plasmic.app.

## Codebase overview

This repo contains:

- the Plasmic Studio platform itself (under the `platform/` dir)
- code for all Plasmic component store packages (`@plasmicpkgs/*`)
- client libraries/SDKs (`@plasmicapp/*`)
- examples (under the `examples/` dir)

For hacking on code components or `plasmicpkgs`, see specific additional instructions further down.

We use `lerna` to help us manage dependencies among all the packages.

In general, we follow the "fork-and-pull" Git workflow.

1. Fork the repo on GitHub
2. Clone the project to your own machine
3. Commit changes to your own branch
4. Push your work back to your fork
5. Submit a Pull request so that we can review your changes

**NOTE:** Be sure to merge the latest changes from the "upstream" before making a pull request!

## Contributing to the Plasmic Studio platform

`platform/` folder contains the code for the Plasmic Studio platform itself.
This includes all the frontend and backend code for the design tool/visual editor,
as well as the backend code for the apps built in Plasmic.

To get studio running locally, please follow the [getting started guide](docs/contributing/platform/00-getting-started.md).

## Contributing to `plasmicpkgs` or SDKs

### Getting started

To configure the platform locally follow the instructions in [getting started guide](docs/contributing/platform/00-getting-started.md).

Internally we use [Verdaccio](https://verdaccio.org/) to locally test packages. This just stands up a local npm registry that you can publish your test packages to.

```
yarn global add verdaccio
verdaccio &  # Runs the verdaccio server at http://localhost:4873
```

You'll need to update the verdaccio config file, at `~/.config/verdaccio/config.yaml`, to instruct verdaccio to not use npmjs for our test packages:

```
packages:
  '@plasmicapp/isomorphic-unfetch':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
  '@plasmicapp/react-ssr-prepass':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
  '@plasmicapp/*':
    access: $all
    publish: $all
    unpublish: $all
  '@plasmicpkgs/data-table':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
  '@plasmicpkgs/plasmic-shopify':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
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

For standalone applications like the CLI, you can do this:

```bash
cd packages/cli/

# Step 1. (One-time)
# Ensure dependencies are built.
npx nx build @plasmicapp/cli

# Step 2. (Repeat)
# Hackety hack, then you can directly run the source with esbuild-register.
node -r esbuild-register src/index.ts -h
```

If you need the package installed in another npm project to test it, like say a Next.js project, you'll need to publish to your local verdaccio. This is the case for most packages in this repo, which are libraries meant to be used elsewhere.

```bash
# Step 1.
# Make some changes! Let's say, to @plasmicapp/host.
# vim packages/host/src/registerComponent.ts

# Step 2.
# Publish a specific package to verdaccio.
# This unpublishes YOURPKG and its dependencies from your verdaccio, re-builds them, and publishes them to your local
# verdaccio.
# Note that this does not bump versions!
# We are using nx under the hood, so if your dependencies haven't changed, this should be fast.
# In this example, even though we edited @plasmicapp/host, we can just think about publishing the "root" package(s) we're ultimately installing into the test app, in this case @plasmicapp/loader-nextjs.
yarn local-publish @plasmicapp/loader-nextjs &&

# Or publish all packages to verdaccio. This will take longer.
# yarn local-publish

# Step 3.
# Go to the package you're testing, e.g. test-host-app.
# You can quickly create a test target app with `npx create-plasmic-app`.
cd ~/test-host-app &&

# Step 4.
# Simply blow away existing package manager state, to ensure we're getting your locally published versions of packages.
# This is the simplest approach if this is a throwaway test app where you don't need to maintain version lock state.
rm -rf node_modules package-lock.json yarn.lock &&

# Or, to be more surgical: you can delete anything that pulls in any @plasmicapp/@plasmicpkgs packages.
# In this case, we want to remove anything that depends on the @plasmicapp/host package we updated.
# npm un @plasmicapp/loader-nextjs @plasmicpkgs/plasmic-rich-components

# Step 5.
# Delete any framework-specific caches, such as these for Next.js and Gatsby.
# Frameworks might cache node_modules packages in ways that won't pick up your changes, depending on how you carried out the prior steps.
rm -rf .next/ .cache/ &&

# Step 6.
# (Re-)install the necessary packages, from your local verdaccio.
# These will pull in the changes you made to @plasmicapp/host.
# Note: this proxies to npmjs.org for packages that aren't published locally to verdaccio.
npm i @plasmicapp/loader-nextjs @plasmicpkgs/plasmic-rich-components --registry=http://localhost:4873
```

Check that the versions in your package.json are also not holding back any plasmicpkgs and plasmicapp versions!

In general, you probably want all @plasmicapp/@plasmicpkgs packages to be installed from your local verdaccio, rather than having some installed from npmjs.org and others installed from local,
since you want to prevent mismatched and duplicate package versions.

### Odds and ends

For a few packages like react-ssr-prepass, these are not currently integrated into the NX workspace system.
This is because Lerna doesn't work with git submodules.
You can publish these as individual packages with, for instance:

```
cd plasmicpkgs/SOMETHING
yarn install # Not included in the workspace install
yarn publish --registry=http://localhost:4873
# Or with more options: yarn publish --canary --yes --include-merged-tags --no-git-tag-version --no-push --registry=http://localhost:4873 --force-publish
```

## Contributing code components (`plasmicpkgs`)

The above general contribution instructions also apply to plasmicpkgs, so read that if you haven't done so.

Before starting, we recommend reading our docs for Code Components:

- [Docs on code components][https://docs.plasmic.app/learn/code-components/]

### Creating a new package

Ignore this if you are just updating an existing package.

To create a new plasmicpkg, the easiest approach is to clone one of the existing packages (like react-slick) and fix up the names in package.json and README. Then author your registration code in src. Please use `yarn` for package management.

The directory name should be the same name as the main package you'll be using to import the React components. Your package must be named `@plasmicpkgs/{package-name}` and start with version 1.0.0.

### Versioning

`@plasmicpkgs/*` packages should depend on `@plasmicapp/*` packages as both peer dependencies and dev dependencies.
You should always use a permissive range in peerDependencies, so that users can install your `@plasmicpkgs/*` package with whatever their current versions are of `@plasmicapp/*` packages.
Dev dependencies should specify the most recent version of the package.

In general, `@plasmicpkgs/*` depend on `@plasmicapp/host` because it is the package that is used by Plasmic Studio to register components.
But you may also need others such as `@plasmicapp/data-sources`.

So a typical `package.json` might look like this:

```json
{
  "devDependencies": {
    "@plasmicapp/data-sources": "0.1.53",
    "@plasmicapp/host": "1.0.119",
    "@size-limit/preset-small-lib": "^4.11.0",
    "@types/node": "^14.0.26",
    "size-limit": "^4.11.0",
    "tsdx": "^0.14.1",
    "tslib": "^2.2.0",
    "typescript": "^3.9.7"
  },
  "peerDependencies": {
    "@plasmicapp/data-sources": ">=0.1.52",
    "@plasmicapp/host": ">=1.0.0",
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  },
  "dependencies": {
    "memoize-one": "^6.0.0"
  }
}
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
- Have component tests been added to loader-tests to ensure that it works?

Remember that your package will be used by a wide variety of users, so it's important to have easy-to-use components, with good descriptions.

After testing in the Studio, it's also good to test both the available code options: loader and codegen.
Testing codegen ensures your import paths are correct.

- [Codegen guide](https://docs.plasmic.app/learn/codegen-guide/)
- [Next.js loader guide](https://docs.plasmic.app/learn/nextjs-quickstart/)
