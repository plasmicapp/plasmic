This demonstrates using Plasmic i18n with [react-intl](https://formatjs.io/docs/react-intl/).

See full instructions at https://docs.plasmic.app/learn/localization-frameworks/

The demo project is https://studio.plasmic.app/projects/fjKQstuhKKVhuH5dkNkNtj

1. In `plasmic-init.tsx`, `initPlasmicLoader()` is called with two i18n options:
   * `tagPrefix: "n"` ensures that when generating localizable rich text, the tag markers have the "n" prefix, which looks like `"Hello <n0>world!</n0>!"`. This is necessary for `react-intl`, which doesn't work with numerical tag names.
   * `keyScheme: "path"` as a demonstration; you can use whatever `keyScheme` you prefer!
2. `npm run plasmic-i18n` will export messages from the project into `locales/en.json`.  Check out the command in `package.json` for the options we are passing in; critically; the `--key-scheme` and `--tag-prefix` options must match with what you used in `initPlasmicLoader()`. 
3. `_app.tsx` contains the root provider for `react-intl` with the localized messages.
4. `i18n.tsx` contains the definition for the `usePlasmicTranslator()` hook, built on top of `react-intl`.
5. `index.tsx` uses the `usePlasmicTranslator()` hook to get a Plasmic translator, and passes it to `<PlasmicRootProvider />`.
6. `next.config.js` is set up with `i18n` options as well.

We've also provided a Spanish version in `locales/es.json`. 
