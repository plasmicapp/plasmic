# Integration of Supabase Auth with Plasmic using Next.js Pages and Headless Api

This is a Next.js project bootstrapped with [`create-plasmic-app`](https://www.npmjs.com/package/create-plasmic-app).

Integrated with Plasmic by following the [Supabase Auth Pages](https://supabase.com/docs/guides/auth/auth-helpers/nextjs-pages) guide.

- In [getPlasmicAuthData](./utils/plasmic-auth.ts) the conversion between supabase user and plasmic user is done. The supabase user is considered a source of truth and the plasmic user is built based on it.
- In [catch-all routes](./pages/%5B%5B...catchall%5D%5D.tsx) it's demonstrated how to use auth while fetching the user in client side.
- In [ssr](./pages/ssr/index.tsx) it's demonstrated how to use auth while fetching the user server side.
- In [plasmic-init](./plasmic-init.ts) the `AuthButton` and `AuthForm` components are substituted so that they have interactivity to perform supabase auth operations.

## Getting Started

First, create a `.env.local` file with the variables listed in `.env.example`.

Then run the development server:

```bash
yarn
```

```bash
yarn dev
```

Then open the corresponding Plasmic project (cloning it if you wish):

https://studio.plasmic.app/projects/2gYaa1FsuykK8CmmDLsakd

You can start editing your project in Plasmic Studio.

Remember to update your [plasmic-init](./plasmic-init.ts) with your project id and token if you have cloned the example project.

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Community Forum](https://forum.plasmic.app/)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!
