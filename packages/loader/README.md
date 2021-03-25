# Plasmic Loader

A plugin to sync your Plasmic designs via a convenient <PlasmicLoader /> component! Supports both NextJS and Gatsby. Check README.npm.md for usage.

To release a new version, run `npm version patch` (or set the proper version in the `package.json` file) and run `npm run release`.

## Debugging

Here are some flags that may help with your local development/debugging the CLI+Loader combo.

    DO_YALC_ADD_CLI=1 yarn build

By default, PlasmicLoader will install the latest CLI from npm. This flag will install the CLI you previously ran `yalc publish` on, so that you can locally iterate on simultaneous changes to CLI and PlasmicLoader (without needing to actually publish the CLI to npm).

    NO_INSTALL=1 yarn build

This will skip the installation process altogether, allowing you to perform more surgical experimentation within the .plasmic dir.

    LOADER_CLI_NODE_OPTIONS=--inspect-brk yarn build

This will pass the given args as the NODE_OPTIONS to the CLI process, during the sync stage.