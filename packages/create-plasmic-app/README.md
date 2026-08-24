# Create Plasmic App

The easiest way to get started with Plasmic for a new code base is with `create-plasmic-app`. Under the hood, we'll use `create-next-app`, Gatsby's minimal starter, `create-vite`, or `create-tsrouter-app` (for TanStack Start) to help create a new app, and set it up with Plasmic.

## Quickstart

```bash
npx create-plasmic-app
```

## Package manager

By default, `create-plasmic-app` uses the package manager that launched it.
To choose a package manager explicitly, pass `--package-manager` with `npm`, `yarn`, or `pnpm`:

```bash
npx create-plasmic-app --package-manager pnpm
```

## Next.js SEO routes

When scaffolding a Next.js app, `create-plasmic-app` also generates sitemap
and robots routes:

- App Router: `app/sitemap.[jt]s` and `app/robots.[jt]s`
- Pages Router: `pages/sitemap.xml.[jt]s` and `pages/robots.txt.[jt]s`

The routes list non-dynamic Plasmic pages in the sitemap and link to it from
`robots.txt`. Loader projects fetch pages from Plasmic, while codegen projects
read the generated `plasmic.json`. Set `NEXT_PUBLIC_SITE_URL` to pin the site
the site origin, otherwise routes use the Vercel production URL or derive
the origin from request headers.
