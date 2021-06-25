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
  The visual web design tool and frontend builder that works with your codebase.
</h3>

- [Documentation](https://www.plasmic.app/learn/)
- [Quickstart](https://www.plasmic.app/learn/quickstart/)

## Building packages

We use `lerna` to help us manage dependencies between the `@plasmicapp/loader-*` packages, (though we may pull in more packages to be managed by lerna, right now those are the ones with tight dependencies on each other).

### Getting started

Make sure you have `lerna` installed:

```
yarn global add lerna
lerna bootstrap  # inter-links all the lerna-managed packages together
```

We also make use of [Verdaccio](https://verdaccio.org/) to locally test packages.  This just stands up an npm registry that you can publish your test packages to.

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

### Workflow

1. Make some changes!

2. If you're ready to test, run `yarn local-canary`. This builds canary versions of your packages to your local registry.

3. Install the canary version into wherever you're trying to test, via `yarn add ... --registry=http://localhost:4873`

4. Once you're done, commit your changes, go through code reviews, etc.

5. When you're ready to do a release, run `yarn release`.  This will amend your commit that bumps all the changed package versions, and add also tag the git commit.