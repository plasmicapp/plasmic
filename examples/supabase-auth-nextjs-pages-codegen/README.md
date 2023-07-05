# Integration of Supabase Auth with Plasmic using Next.js Pages and Codegen

This is a Next.js project bootstrapped with [`create-plasmic-app`](https://www.npmjs.com/package/create-plasmic-app).

Integrated with Plasmic by following the [Supabase Auth Pages](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) guide.

- In [getPlasmicAuthData](./utils/plasmic-auth.ts) the conversion between supabase user and plasmic user is done. The supabase user is considered a source of truth and the plasmic user is built based on it.
- In [_app](./pages/_app.tsx) it's demonstrated how to use auth while fetching the user in client side.
- In [ssr](./pages/ssr.tsx) it's demonstrated how to use auth while fetching the user server side.
- In [AuthButton](./components/AuthButton.tsx) and [AuthForm](./components/AuthForm.tsx) the `AuthButton` and `AuthForm` components are instrumented to perform supabase auth operations.

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

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Slack Community](https://www.plasmic.app/slack)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!