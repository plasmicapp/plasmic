This demonstrates using Plasmic i18n with lingui.

See full instructions at https://docs.plasmic.app/learn/localization-frameworks/

The demo project is https://studio.plasmic.app/projects/fjKQstuhKKVhuH5dkNkNtj

1. `npm run plasmic-i18n` will export messages from the project into `locales/en/messages.po`.
2. You can then add translations to other languages in `locales/X/messages.po`.
3. Running `npm run i18n-compile` will generate corresponding `locales/X/messages.js` files needed for lingui.

i18n-specific code is in:
* `_app.tsx`, where we use lingui's `<I18nProvider />`
* `i18n.tsx`, where we define `PlasmicTranslator` using lingui primitives.
* `index.tsx`, where `PlasmicTranslator` is passed into `<PlasmicRootProvider />`.