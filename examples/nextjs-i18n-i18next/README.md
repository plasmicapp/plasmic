This demonstrates using Plasmic i18n with [next-i18next](https://github.com/i18next/next-i18next).

See full instructions at https://docs.plasmic.app/learn/localization-frameworks/

The demo project is https://studio.plasmic.app/projects/fjKQstuhKKVhuH5dkNkNtj

1. `npm run plasmic-i18n` will export messages from the project into `public/locales/en/common.json`.
2. You can then add translations to other languages in `public/locales/X/common.json`.

i18n-specific code is in:
* `_app.tsx`, where we wrap the `App` with `next-i18next`'s `appWithTranslation()`
* `i18n.tsx`, where we define `usePlasmicTranslator()` using lingui primitives.
* `index.tsx`, where `usePlasmicTranslator()` is used to create a translator, passed into `<PlasmicRootProvider />`.
* `next-i18next.config.js` following the [boilerplate](https://github.com/i18next/next-i18next).