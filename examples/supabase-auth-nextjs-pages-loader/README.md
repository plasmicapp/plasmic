# Integration of Supabase Auth with Plasmic using Next.js Pages and Headless Api

This is a Next.js project bootstrapped with [`create-plasmic-app`](https://www.npmjs.com/package/create-plasmic-app).

Integrated with Plasmic by following the [Supabase Auth Pages](https://supabase.com/docs/guides/auth/server-side/nextjs?queryGroups=router&router=pages) guide.

- In [getPlasmicAuthData](./utils/plasmic-auth.ts) the conversion between supabase user and plasmic user is done. The supabase user is considered a source of truth and the plasmic user is built based on it.
- In [catch-all routes](./pages/%5B%5B...catchall%5D%5D.tsx) it's demonstrated how to use auth while fetching the user in client side.
- In [ssr](./pages/ssr/index.tsx) it's demonstrated how to use auth while fetching the user server side.
- In [plasmic-init](./plasmic-init.ts) the `AuthButton` and `AuthForm` components are substituted so that they have interactivity to perform supabase auth operations.

## Getting Started

This example uses the corresponding Plasmic project (clone it if you wish):
https://studio.plasmic.app/projects/2gYaa1FsuykK8CmmDLsakd

1. [Create a Supabase project](https://supabase.com/dashboard).
2. Rename [.env.local.example](.env.local.example) to `.env.local` and populate with [your Supabase project's URL and Anon Key](https://supabase.com/dashboard/project/_/settings/api).
3. Populate the `PLASMIC_AUTH_SECRET` variable in `.env.local` with the [Plasmic token for your project](https://docs.plasmic.app/learn/auth-integration/#configuration).
4. Update your [plasmic-init](./plasmic-init.ts) with your [project id and token](https://docs.plasmic.app/learn/nextjs-quickstart/#initialization) if you have cloned the example project.
5. Install dependencies:

```bash
yarn
```

6. Start the development server:

```bash
yarn dev
```

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Community Forum](https://forum.plasmic.app/)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!
