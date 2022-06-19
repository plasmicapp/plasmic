# @plasmicapp/query

This is a mini isomorphic, _component-level_ data-fetching library.
It lets you fetch data client-side or server-side.
On the server, it lets you fetch data from any component,
Suspense-style.

Normally in frameworks like Next.js, you cannot couple your data fetches with your components--you need to fetch from `getStaticProps`/`getServerSideProps`.
If you fetch from a component, it must happen client-side (ultimately via a `useEffect` or similar).
This also has other ramifications, e.g. your data fetching cannot depend on dynamic props.

This library lets you express your fetches directly in your components,
but still ultimately executed at pre-render time (from `getStaticProps`/`getServerSideProps`).

Learn more about how this can be used with Plasmic specifically in the docs: https://docs.plasmic.app/learn/data-code-components/.

The library a small API built around react-swr and react-ssr-prepass.
