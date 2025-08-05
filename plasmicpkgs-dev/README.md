# plasmicpkgs-dev

This is app host for testing `@plasmicpkgs/*` packages. This app host uses the `@plasmicapp/loader-nextjs` SDK with app router.

Since `plasmicpkgs-dev` is in the same monorepo as `@plasmicpkgs/*`, it can easily link to their local code under development.

## Setup

Have a test Plasmic project ready.

Create a `.env` file based on [`.env.example`](./.env.example) that stores the test project's ID and token. The app host will load this project's pages.

Check that the package you want to test is registered in [plasmic-init-client.tsx](./plasmic-init-client.tsx). If not, add the dependency in [package.json](./package.json) and add the registration calls.

To build all `@plasmicpkgs/*`, run `yarn lerna run build --scope="@plasmicpkgs/*"`.

## Workflow

1. In `plasmicpkgs-dev`, run `yarn dev`. This should start the app host at `http://localhost:3000`.
2. Set `http://localhost:3000/plasmic-host` as the app host URL in Plasmic Studio.
3. In `@plasmicpkgs/*`, after you make a change, run `yarn build`, then reload Plasmic Studio.
