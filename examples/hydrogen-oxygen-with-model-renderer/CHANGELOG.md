# demo-store

## 1.0.4

### Patch Changes

- Update Remix to the latest version (`1.17.1`). ([#852](https://github.com/Shopify/hydrogen/pull/852)) by [@frandiox](https://github.com/frandiox)

  When updating your app, remember to also update your Remix dependencies to `1.17.1` in your `package.json` file:

  ```diff
  -"@remix-run/react": "1.15.0",
  +"@remix-run/react": "1.17.1",

  -"@remix-run/dev": "1.15.0",
  -"@remix-run/eslint-config": "1.15.0",
  +"@remix-run/dev": "1.17.1",
  +"@remix-run/eslint-config": "1.17.1",
  ```

- Updated dependencies [[`f29e178a`](https://github.com/Shopify/hydrogen/commit/f29e178ada608ef3797c5049fd498afeed272152)]:
  - @shopify/remix-oxygen@1.1.1
  - @shopify/hydrogen@2023.4.5
  - @shopify/cli-hydrogen@5.0.1

## 1.0.3

### Patch Changes

- A default `https://` protocol is now added automatically to `storeDomain` if missing. ([#985](https://github.com/Shopify/hydrogen/pull/985)) by [@frandiox](https://github.com/frandiox)

- Start using GraphQL code generation. This allows us to have full-stack type-safety and better developer experience. ([#937](https://github.com/Shopify/hydrogen/pull/937)) by [@frandiox](https://github.com/frandiox)

  As a result of the above, we've fixed issues where the frontend was accessing data that was not correctly fetched from the Storefront API. For example, missing `product.vendor` or accessing `totalPrice` instead of `totalPriceV2`.

  To enable the unstable codegen feature in your project, run your dev command as `shopify hydrogen dev --codegen-unstable`. See the [changes associated here](https://github.com/Shopify/hydrogen/pull/937/files) for examples.

- Update the demostore to not cache the customer query. This is important to update in your app if you copied the logic from the demo store. ([#950](https://github.com/Shopify/hydrogen/pull/950)) by [@blittle](https://github.com/blittle)

- Remove wrong cache control headers from route. Demo store is setting `cache-control` header when it is not suppose to. The demo store server renders cart information. Cart information is consider personalized content and should never be cached in any way. ([#991](https://github.com/Shopify/hydrogen/pull/991)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Route `($locale).api.countries.tsx` can have cache control header because it is an API endpoint that doesn't render the cart.

- Make `storefrontApiVersion` parameter optional. By default, it will use the current version of Hydrogen as the Storefront API version. ([#984](https://github.com/Shopify/hydrogen/pull/984)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`b2195520`](https://github.com/Shopify/hydrogen/commit/b219552030ed9cdb3fcd3343deaf5c502d12411b), [`4c5cdfd6`](https://github.com/Shopify/hydrogen/commit/4c5cdfd61b4634c76db7ecca05972102071109f9), [`7b4afea2`](https://github.com/Shopify/hydrogen/commit/7b4afea29a050f9c77482540e321d9bc60351b2e), [`42683d0a`](https://github.com/Shopify/hydrogen/commit/42683d0a1b6288d8f6a6e58bfbf2e2650f0d82d2), [`7d6a1a7c`](https://github.com/Shopify/hydrogen/commit/7d6a1a7cd3adb6ee0cf4cf242b72d5650509639b), [`808ceb51`](https://github.com/Shopify/hydrogen/commit/808ceb518a30389d0df4226bed23aead65ccd11f), [`442f602a`](https://github.com/Shopify/hydrogen/commit/442f602a45902beeb188575a85151f45b8be23ca), [`be912b2f`](https://github.com/Shopify/hydrogen/commit/be912b2ff7f4bc7a45688ff96d76f482b164efe5), [`8ccf6dbe`](https://github.com/Shopify/hydrogen/commit/8ccf6dbe7fb9cb2dec161dea2653c4ef6ba212c4), [`428c78dc`](https://github.com/Shopify/hydrogen/commit/428c78dcb6005c369c0c60e4c4cffb869afa7eb1), [`93a7c3c6`](https://github.com/Shopify/hydrogen/commit/93a7c3c65fc10c8b1a16cee5fa57ad932d278dc8), [`5124d618`](https://github.com/Shopify/hydrogen/commit/5124d6189ccfc208b65d4e8894be1a9a2bfb7db9)]:
  - @shopify/cli-hydrogen@5.0.0
  - @shopify/hydrogen@2023.4.4
  - @shopify/remix-oxygen@1.1.0

## 1.0.2

### Patch Changes

- Fix release ([#926](https://github.com/Shopify/hydrogen/pull/926)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`7aaa4e86`](https://github.com/Shopify/hydrogen/commit/7aaa4e86739e22b2d9a517e2b2cfc20110c87acd)]:
  - @shopify/cli-hydrogen@4.2.1
  - @shopify/hydrogen@2023.4.3
  - @shopify/remix-oxygen@1.0.7

## 1.0.1

### Patch Changes

- Fix the load more results button on the /search route ([#909](https://github.com/Shopify/hydrogen/pull/909)) by [@juanpprieto](https://github.com/juanpprieto)

- Adds pagination support on /search results ([#918](https://github.com/Shopify/hydrogen/pull/918)) by [@juanpprieto](https://github.com/juanpprieto)

- Added import/order ESLint rule and @remix-run/eslint plugin to demo-store template eslint configuration. ([#895](https://github.com/Shopify/hydrogen/pull/895)) by [@QuintonC](https://github.com/QuintonC)

- Updated dependencies [[`1a9f4025`](https://github.com/Shopify/hydrogen/commit/1a9f4025d765bff672cf3c02d87c5303e8b027f9), [`112ac42a`](https://github.com/Shopify/hydrogen/commit/112ac42a095afc5269ae75ff15828f27b90c9687), [`a8d5fefe`](https://github.com/Shopify/hydrogen/commit/a8d5fefe79140c09a58e77aae329e5034d030a93), [`24b82fcf`](https://github.com/Shopify/hydrogen/commit/24b82fcf457d82f456d9661b8a44e4f51b5fbdf5), [`3cc6d751`](https://github.com/Shopify/hydrogen/commit/3cc6d75194df4007ebc2f023c46086f093482a87), [`112ac42a`](https://github.com/Shopify/hydrogen/commit/112ac42a095afc5269ae75ff15828f27b90c9687), [`ba54a3b6`](https://github.com/Shopify/hydrogen/commit/ba54a3b650b85191d3417647f08a6fb932f20d44)]:
  - @shopify/cli-hydrogen@4.2.0
  - @shopify/hydrogen@2023.4.2

## 1.0.0

### Major Changes

- All routes were changed from having a `$lang` path parameter to having a `$locale` path parameter. See #860 for more details. ([#864](https://github.com/Shopify/hydrogen/pull/864)) by [@frehner](https://github.com/frehner)

### Patch Changes

- Add `.shopify` to the .gitignore file to support upcoming CLI changes ([#784](https://github.com/Shopify/hydrogen/pull/784)) by [@graygilmore](https://github.com/graygilmore)

- Move GraphQL fragments from the beginning of the template literal to the end of it, so that we don't get the EOF error in VSCode. ([#833](https://github.com/Shopify/hydrogen/pull/833)) by [@frehner](https://github.com/frehner)

- Updated Tailwind configuration file with a new dynamic opacity placeholder for colors ([#851](https://github.com/Shopify/hydrogen/pull/851)) by [@blanklob](https://github.com/blanklob)

- Updated dependencies [[`685bb696`](https://github.com/Shopify/hydrogen/commit/685bb696a9bd03b8a7fe8bcefa3630d6ba0c99c8), [`025385b6`](https://github.com/Shopify/hydrogen/commit/025385b6f9f58a76ffb15d9f505dfbf2b5e21427), [`35a87107`](https://github.com/Shopify/hydrogen/commit/35a871073941e008e104e9c491719d4cade8b49a), [`33f33edd`](https://github.com/Shopify/hydrogen/commit/33f33edd205bbc113047533c71c71ad53bc91b3e), [`0a009a3b`](https://github.com/Shopify/hydrogen/commit/0a009a3ba06dadd8f9d799575d7f88590f82a966), [`9c2e67c5`](https://github.com/Shopify/hydrogen/commit/9c2e67c52ec1c77062cb667505560afb757372a9), [`9c2e67c5`](https://github.com/Shopify/hydrogen/commit/9c2e67c52ec1c77062cb667505560afb757372a9), [`3d458e2b`](https://github.com/Shopify/hydrogen/commit/3d458e2b3c66a4daac798598cadba38b9ecd8a1e)]:
  - @shopify/cli-hydrogen@4.1.2
  - @shopify/remix-oxygen@1.0.6
  - @shopify/hydrogen@2023.4.1

## 0.2.1

### Patch Changes

- Updated dependencies [[`2039a4a`](https://github.com/Shopify/hydrogen/commit/2039a4a534cf75ebcf39bab6d2f95a535bb5d390), [`82b6af7`](https://github.com/Shopify/hydrogen/commit/82b6af71cafe1f88c24630178e61cd09e5a59f5e), [`361879e`](https://github.com/Shopify/hydrogen/commit/361879ee11dfe8f1ee916b022165b1e7f0e45964)]:
  - @shopify/cli-hydrogen@4.1.1
  - @shopify/hydrogen@2023.4.0

## 0.2.0

### Minor Changes

- Fix scroll issues on Product Detail Page for small screens ([#782](https://github.com/Shopify/hydrogen/pull/782)) by [@lifeiscontent](https://github.com/lifeiscontent)

- Fix Layout title on mobile when title is long ([#781](https://github.com/Shopify/hydrogen/pull/781)) by [@lifeiscontent](https://github.com/lifeiscontent)

### Patch Changes

- Adopt Remix [`v2_meta`](https://remix.run/docs/en/main/route/meta#metav2) future flag ([#738](https://github.com/Shopify/hydrogen/pull/738)) by [@wizardlyhel](https://github.com/wizardlyhel)

  ### `v2_meta` migration steps

  1. For any routes that you used `meta` route export, convert it to the `V2_MetaFunction` equivalent. Notice that the package name in the import statement has also changed to `'@remix-run/react'`:

     ```diff
     - import {type MetaFunction} from '@shopify/remix-oxygen';
     + import {type V2_MetaFunction} from '@remix-run/react';

     - export const meta: MetaFunction = () => {
     + export const meta: V2_MetaFunction = () => {
     -   return {title: 'Login'};
     +   return [{title: 'Login'}];
       };
     ```

  2. If you are using data from loaders, pass the loader type to the `V2_MetaFunction` generic:

     ```diff
     - export const meta: MetaFunction = ({data}) => {
     + export const meta: V2_MetaFunction<typeof loader> = ({data}) => {
     -   return {title: `Order ${data?.order?.name}`};
     +   return [{title: `Order ${data?.order?.name}`}];
       };
     ```

  3. If you are using `meta` route export in `root`, convert it to [Global Meta](https://remix.run/docs/en/main/route/meta#global-meta)

     ```diff
     // app/root.tsx

     - export const meta: MetaFunction = () => ({
     -   charset: 'utf-8',
     -   viewport: 'width=device-width,initial-scale=1',
     - });

     export default function App() {

       return (
         <html lang={locale.language}>
           <head>
     +       <meta charSet="utf-8" />
     +       <meta name="viewport" content="width=device-width,initial-scale=1" />
             <Seo />
             <Meta />
     ```

- Adopt `v2_routeConvention` future flag ([#747](https://github.com/Shopify/hydrogen/pull/747)) by [@wizardlyhel](https://github.com/wizardlyhel)

  ## `v2_routeConventions` migration steps

  Remix v2 route conventions are just file renames. We just need to ensure when changing file name and file location, the import paths of other files are also updated.

  Go to Remix docs for more details on the [V2 route convention](https://remix.run/docs/en/main/file-conventions/route-files-v2).

  Rename and move the following files in the `routes` folder to adopt to V2 route convention.

  <table>
  <tr>
  <th>Before</th>
  <th>After (V2 route convention)</th>
  </tr>
  <tr>
  <td>

  ```txt
  app/routes/
    ├─ [sitemap.xml].tsx
    ├─ [robots.txt].tsx
    └─ ($lang)/
        ├─ $shopid/orders/$token/
        │   └─ authenticate.tsx
        ├─ account/
        │   ├─ __private/
        │   │   ├─ address/
        │   │   │   └─ $id.tsx
        │   │   ├─ orders.$id.tsx
        │   │   ├─ edit.tsx
        │   │   └─ logout.ts
        │   └─ __public/
        │       ├─ recover.tsx
        │       ├─ login.tsx
        │       ├─ register.tsx
        │       ├─ activate.$id.$activationToken.tsx
        │       └─ reset.$id.$resetToken.tsx
        ├─ api/
        │   ├─ countries.tsx
        │   └─ products.tsx
        ├─ collections/
        │   ├─ index.tsx
        │   ├─ $collectionHandle.tsx
        │   └─ all.tsx
        ├─ journal/
        │   ├─ index.tsx
        │   └─ $journalHandle.tsx
        ├─ pages
        │   └─ $pageHandle.tsx
        ├─ policies/
        │   ├─ index.tsx
        │   └─ $policyHandle.tsx
        ├─ products/
        │   ├─ index.tsx
        │   └─ $productHandle.tsx
        ├─ $.tsx
        ├─ account.tsx
        ├─ cart.tsx
        ├─ cart.$lines.tsx
        ├─ discount.$code.tsx
        ├─ featured-products.tsx
        ├─ index.tsx
        └─ search.tsx
  ```

  </td>
  <td valign="top">

  ```txt
  app/routes/
    ├─ [sitemap.xml].tsx
    ├─ [robots.txt].tsx
    ├─ ($lang).$shopid.orders.$token.authenticate.tsx
    ├─ ($lang).account.address.$id.tsx
    ├─ ($lang).account.orders.$id.tsx
    ├─ ($lang).account.edit.tsx
    ├─ ($lang).account.logout.ts
    ├─ ($lang).account.recover.tsx
    ├─ ($lang).account.login.tsx
    ├─ ($lang).account.register.tsx
    ├─ ($lang).account.activate.$id.$activationToken.tsx
    ├─ ($lang).account.reset.$id.$resetToken.tsx
    ├─ ($lang).api.countries.tsx
    ├─ ($lang).api.products.tsx
    ├─ ($lang).collections._index.tsx
    ├─ ($lang).collections.$collectionHandle.tsx
    ├─ ($lang).collections.all.tsx
    ├─ ($lang).journal._index.tsx
    ├─ ($lang).journal.$journalHandle.tsx
    ├─ ($lang).pages.$pageHandle.tsx
    ├─ ($lang).policies._index.tsx
    ├─ ($lang).policies.$policyHandle.tsx
    ├─ ($lang).products._index.tsx
    ├─ ($lang).products.$productHandle.tsx
    ├─ $.tsx
    ├─ ($lang)._index.tsx
    ├─ ($lang).account.tsx
    ├─ ($lang).cart.tsx
    ├─ ($lang).cart.$lines.tsx
    ├─ ($lang).discount.$code.tsx
    ├─ ($lang).featured-products.tsx
    └─ ($lang).search.tsx
  ```

  </td>
  </tr>
  </table>

  ### Optional

  If you want to continue using nested folder routes but have the `v2_routeConvention` flag turned on, you may consider using the npm package [`@remix-run/v1-route-convention`](https://www.npmjs.com/package/@remix-run/v1-route-convention).

  If you like the flat route convention but still wants a hybrid style of nested route folder, you may consider using the npm package [`remix-flat-routes`](https://www.npmjs.com/package/remix-flat-routes)

- Adopt Remix [`unstable_tailwind`](https://remix.run/docs/en/1.15.0/guides/styling#built-in-tailwind-support) and [`unstable_postcss`](https://remix.run/docs/en/1.15.0/guides/styling#built-in-postcss-support) future flags for the Demo Store template. ([#751](https://github.com/Shopify/hydrogen/pull/751)) by [@frandiox](https://github.com/frandiox)

  ### `unstable_tailwind` and `unstable_postcss` migration steps

  1. Move the file `<root>/styles/app.css` to `<root>/app/styles/app.css`, and remove it from `.gitignore`.

  2. Add `"browserslist": ["defaults"]` to your `package.json`, or your preferred [value from Browserslist](https://browsersl.ist/).

  3. Replace the `build` and `dev` scripts in your `package.json` with the following:

     **Before**

     ```json
      "scripts": {
        "build": "npm run build:css && shopify hydrogen build",
        "build:css": "postcss styles --base styles --dir app/styles --env production",
        "dev": "npm run build:css && concurrently -g --kill-others-on-fail -r npm:dev:css \"shopify hydrogen dev\"",
        "dev:css": "postcss styles --base styles --dir app/styles -w",
        ...
      }
     ```

     **After**

     ```json
      "scripts": {
        "dev": "shopify hydrogen dev",
        "build": "shopify hydrogen build",
        ...
      }
     ```

  You can also remove dependencies like `concurrently` if you don't use them anywhere else.

- Forwards search params of `/discount/<code>` route to a redirect route. ([#766](https://github.com/Shopify/hydrogen/pull/766)) by [@lneicelis](https://github.com/lneicelis)

- Carts created in liquid will soon be compatible with the Storefront API and vice versa, making it possible to share carts between channels. ([#721](https://github.com/Shopify/hydrogen/pull/721)) by [@scottdixon](https://github.com/scottdixon)

  This change updates the Demo Store to use Online Store's `cart` cookie (instead of sessions) which prevents customers from losing carts when merchants migrate to/from Hydrogen.

- Bump internal Remix dependencies to 1.15.0. ([#728](https://github.com/Shopify/hydrogen/pull/728)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Recommendations to follow:

  - Upgrade all the Remix packages in your app to 1.15.0.
  - Enable Remix v2 future flags at your earliest convenience following [the official guide](https://remix.run/docs/en/1.15.0/pages/v2).

- Updated CLI prompts. It's recommended to update your version of `@shopify/cli` to `3.45.0` when updating `@shopify/cli-hydrogen`. ([#733](https://github.com/Shopify/hydrogen/pull/733)) by [@frandiox](https://github.com/frandiox)

  ```diff
  "dependencies": {
  -  "@shopify/cli": "3.x.x",
  +  "@shopify/cli": "3.45.0",
  }
  ```

- Adopt Remix [`v2_errorBoundary`](https://remix.run/docs/en/release-next/route/error-boundary-v2) future flag ([#729](https://github.com/Shopify/hydrogen/pull/729)) by [@wizardlyhel](https://github.com/wizardlyhel)

  ### `v2_errorBoundary` migration steps

  1. Remove all `CatchBoundary` route exports

  2. Handle route level errors with `ErrorBoundary`

     Before:

     ```jsx
     // app/root.tsx
     export function ErrorBoundary({error}: {error: Error}) {
       const [root] = useMatches();
       const locale = root?.data?.selectedLocale ?? DEFAULT_LOCALE;

       return (
         <html lang={locale.language}>
           <head>
             <title>Error</title>
             <Meta />
             <Links />
           </head>
           <body>
             <Layout layout={root?.data?.layout}>
               <GenericError error={error} />
             </Layout>
             <Scripts />
           </body>
         </html>
       );
     }
     ```

     After:

     ```jsx
     // app/root.tsx
     import {isRouteErrorResponse, useRouteError} from '@remix-run/react';

     export function ErrorBoundary({error}: {error: Error}) {
       const [root] = useMatches();
       const locale = root?.data?.selectedLocale ?? DEFAULT_LOCALE;
       const routeError = useRouteError();
       const isRouteError = isRouteErrorResponse(routeError);

       let title = 'Error';
       let pageType = 'page';

       // We have an route error
       if (isRouteError) {
         title = 'Not found';

         // We have a page not found error
         if (routeError.status === 404) {
           pageType = routeError.data || pageType;
         }
       }

       return (
         <html lang={locale.language}>
           <head>
             <title>{title}</title>
             <Meta />
             <Links />
           </head>
           <body>
             <Layout
               layout={root?.data?.layout}
               key={`${locale.language}-${locale.country}`}
             >
               {isRouteError ? (
                 <>
                   {routeError.status === 404 ? (
                     <NotFound type={pageType} />
                   ) : (
                     <GenericError
                       error={{
                         message: `${routeError.status} ${routeError.data}`,
                       }}
                     />
                   )}
                 </>
               ) : (
                 <GenericError
                   error={error instanceof Error ? error : undefined}
                 />
               )}
             </Layout>
             <Scripts />
           </body>
         </html>
       );
     }
     ```

- Updated dependencies [[`e6e6c2d`](https://github.com/Shopify/hydrogen/commit/e6e6c2da274d0582c6b3b9f298dfd2e86dd4bfbe), [`475a39c`](https://github.com/Shopify/hydrogen/commit/475a39c867b0851bba0358b6db9208b664aec68c), [`1f8526c`](https://github.com/Shopify/hydrogen/commit/1f8526c750dc1d5aa7ea02e196fffdd14d17a536), [`0f4d562`](https://github.com/Shopify/hydrogen/commit/0f4d562a2129e8e03ed123dc572a14a72e487a1b), [`737f83e`](https://github.com/Shopify/hydrogen/commit/737f83ebb72fccc2f367532ebaa19ea00b1b3436), [`2d4c5d9`](https://github.com/Shopify/hydrogen/commit/2d4c5d9340c5a2458c682aa3f9b12352dacdd759), [`68a6028`](https://github.com/Shopify/hydrogen/commit/68a60285a3d563d6e98fb79c3ba6d98eb4ee6be0)]:
  - @shopify/cli-hydrogen@4.1.0
  - @shopify/hydrogen@2023.1.7
  - @shopify/remix-oxygen@1.0.5
