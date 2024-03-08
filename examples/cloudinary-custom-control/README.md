# Using Cloudinary as a custom control for code components

This is a Next.js project bootstrapped with [`create-plasmic-app`](https://www.npmjs.com/package/create-plasmic-app).

Integrated with Plasmic by following the [Supabase Auth Pages](https://supabase.com/docs/guides/auth/auth-helpers/nextjs-pages) guide.

- In [CustomCloudinaryControl](./components/CustomCloudinaryControl.tsx) the scripts for the Cloudinary widget are loaded and the widget is initialized. The studioDocument provided by Plasmic is used to load the script in the proper window.
- In [Next Config](./next.config.js) the cloudinary host is added to the list of remote patterns so that cloudinary assets can be used in Next Image.

## Getting Started

First, update [CustomCloudinaryControl](./components/CustomCloudinaryControl.tsx) with your cloud name and api key.

Then run the development server:

```bash
yarn
```

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
