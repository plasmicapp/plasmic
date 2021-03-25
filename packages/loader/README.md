# Plasmic Loader

A plugin to sync your Plasmic designs via a convenient <PlasmicLoader /> component! Supports both NextJS and Gatsby. Check README.npm.md for usage.

To release a new version, run `npm version patch` (or set the proper version in the `package.json` file) and run `npm run release`.

## Debugging

By default, PlasmicLoader will install the latest CLI from npm.

If you instead start PlasmicLoader with this env var:

    DO_YALC_ADD_CLI=1 yarn build

Then it will install the CLI you previously ran `yalc publish` on, so that you can locally iterate on simultaneous changes to CLI and PlasmicLoader (without needing to actually publish the CLI to npm).