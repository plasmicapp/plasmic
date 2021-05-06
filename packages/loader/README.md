# Plasmic Loader

A plugin to sync your Plasmic designs via a convenient <PlasmicLoader /> component! Supports both NextJS and Gatsby. Check README.npm.md for usage.

To release a new version, run `npm version patch` (or set the proper version in the `package.json` file) and run `npm run release`.

## Building the package

Running `node build.js` will create a build with development config. Pass the `--prod` flag to use prod config. This config is available at `src/shared/config`

## Development workflow

When developing, it can be useful to use `yalc` to test development versions of loader. To do so, run `npm run yalc:push`. This will build the project, push the code to yalc, and automatically update any project where you are using yalc.

To add @plasmicapp/loader to a new test project from yalc, run `yalc add @plasmicapp/loader`.
## Debugging

Here are some flags that may help with your local development/debugging the CLI+Loader combo.

    DO_YALC_ADD_CLI=1 yarn build

By default, PlasmicLoader will install the latest CLI from npm. This flag will install the CLI you previously ran `yalc publish` on, so that you can locally iterate on simultaneous changes to CLI and PlasmicLoader (without needing to actually publish the CLI to npm).

    NO_INSTALL=1 yarn build

This will skip the installation process altogether, allowing you to perform more surgical experimentation within the .plasmic dir.

    LOADER_CLI_NODE_OPTIONS=--inspect-brk yarn build

This will pass the given args as the NODE_OPTIONS to the CLI process, during the sync stage.
