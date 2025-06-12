# plasmicpkgs

`plasmicpkgs` are shared packages that allow using custom code (e.g. components, functions, and more) directly in Plasmic.

## Contributing

Contact us on our [Slack](https://www.plasmic.app/slack) or email us at [team@plasmic.app](mailto:team@plasmic.app).

## Development

Development of plasmicpkgs requires an [app host](https://docs.plasmic.app/learn/app-hosting/) for testing and development. You can use the app host at [plasmicpkgs-dev](../plasmicpkgs-dev), which conveniently alters names so they don't conflict with production names.

## Testing

Please set up Storybook tests. Refer to the [react-aria](./react-aria) package as a reference.

## Build Configuration Setup

For building common/smaller packages, copy the most updated `tsconfig.json` and build scripts from the `plasmicpkgs/fetch` directory to ensure consistent build configuration across the project. The fetch package contains the latest and most refined build setup that should be used as the template for other packages.

**Files to copy:**

- `tsconfig.json` - TypeScript compiler configuration
- Build scripts from `package.json` - Latest build pipeline setup

This ensures all packages use the same build standards and TypeScript configuration as the reference implementation in the fetch package.

If the package requires a `/skinny` folder, then you need to use rollup as in `plasmicpkgs/antd5` or edit build.mjs to support it.
