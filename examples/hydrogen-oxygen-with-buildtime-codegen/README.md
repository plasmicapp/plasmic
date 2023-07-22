# Plasmic + Hydrogen (Remix) with build-time codegen

This demonstrates using Plasmic with Hydrogen / Remix with build-time codegen.

## What is build-time codegen?

[Build-time codegen](https://docs.plasmic.app/learn/build-time-codegen/) is similar to [regular codegen](https://docs.plasmic.app/learn/codegen-guide/); designs are built in Plasmic, and then synced as React components to your repo.  The main difference is that the syncing happens at build time (or developement time), and the synced files are not checked into your git repo. That means picking up new design changes in Plasmic does not require creating a commit or a PR and therefore does not involve a developer; instead, rebuilding the app is sufficient to pick up the changes.

## How does it work?

This is repo started out as the basic starter app for Hydrogen, with a few modifications:

* `plasmic-empty.json` configures the project you want to sync, its API token, and other settings that work well for Remix.  Specifically, all Plasmic-generated code is directed to `app/_plasmic`, which is a `.gitignore`d folder, so none of the generated files are checked into the repo.
* `package.json` defines commands that perform a `plasmic sync`, starting from your `plasmic-empty.json`
  * `plasmic-sync` command that syncs the most recently-published version of the Plasmic project, which is good for production builds.
  * `plasmic-sync-latest` command that syncs the current version of the Plasmic project (which may not be published yet), which is good during development when you want to see changes you're making in Plasmic show up in your Remix app without publishing.
  * `plasmic-clean` deletes all generated Plasmic files that shouldn't be checked in.
* `.github/workflows/oxygen-deployment.yml` contains a Github action to build and deploy to Oxygen. This is the default definition except for one change -- an additional `repository_dispatch` trigger, which allows us to trigger this workflow using a webhook.
* `app/routes/_index.tsx` renders a component built in Plasmic.  You can set up other pages in a similar way.  These components won't compile unless `plasmic-sync` has already been run, as otherwise the generated files don't exist.
* `app/routes/plasmic-host.tsx` is set up as the custom host page for registering code components.  One example is provided.
* Plasmic component styles are defined in CSS module files, which requires setting up [css bundling for Remix](https://remix.run/docs/en/main/guides/styling#css-bundling).
* `.gitignore` excludes Plasmic artifacts like the generated code (in `app/_plasmic`), `plasmic.json`, and `plasmic.lock`.

### Publishing from Plasmic

If you would like to kick off a rebuild and deploy of the Remix app whenever you publish your changes in Plasmic, you can add a webhook upon publishing.  This webhook is enabled when we added the `repository_dispatch` to `.github/workflows/oxygen-deployment.yml`.

Here's how to [add a webhook to your Plasmic publish flow](https://docs.plasmic.app/learn/webhooks/)

Here are the setting for your webhook:

* Method: `POST`
* Header: `Authorization: Bearer GITHUB_TOKEN`. You will have to generate a [Github token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) that has proper permission to run this workflow.
* Payload: `{ "event_type": "plasmic" }`

## Other references
* [Plasmic docs](https://plasmic.app/learn)
* [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
* [Get familiar with Remix](https://remix.run/docs/en/v1)
