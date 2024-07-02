# Optimizing and increasing the safety in applications with multiple Plasmic projects

Live demo: https://optimized-multi-project-setup.vercel.app/

This is an example of a Next.js project demonstrating how to improve build times, reduce bundle sizes, and increase safety when working with multiple Plasmic projects.

In this example, we have three Plasmic projects:

- `Main project`(3QiseJHt6Z64CFRBL2oMQb) which is handled by [Main Catch-all](./pages/[[...catchall]].tsx)
- `Blog project`(waHQepGxJhtu3k3FzFxJoR) which is handled by [
  Blog Catch-all](./pages/blog/[[...catchall]].tsx)
- `Library project`(8fA1adnPC4e7fBBA6AVnWN), which is used by both previous routes and used to render [CookiesPolicy](./components/CookiesPolicy.tsx)

The main difference from the default setup is that `initPlasmicLoader` is not called in [Plasmic-init](./plasmic-init.ts) to export the loader instance to other files. Instead, the loader is created in each file using the minimal set of projects required for that file.

Plasmic automatically handles providing the necessary data to a page in your application, but when you have a single Plasmic loader instance, it will consider all the projects as a group. So, when a single project is updated, all the pages that use that loader will be invalidated and rebuilt, which can lead to slower build times.

Another aspect of using a single loader instance is that it can lead to larger bundle sizes because your code components are not appropriately tree-shaken. As all of them are imported in a single file, the bundler will include all of them in the final bundle. In this setup, you can be more selective about which components you import in each file, which can lead to smaller bundle sizes.

The last aspect is that it can increase the safety of your application. If a new version of a single project introduces a breaking change, only the pages that use that project will be affected. This can help you identify the issue faster and fix it.

## Known issues

- While using this setup, you may encounter an issue while trying to view a new version of a page in development mode. This is because the loader instance won't attempt to watch for changes in the projects with multiple instances of it. To fix this, you can restart the development server.

## Plasmic future improvements

Plasmic is working on improving the developer experience when working with multiple projects. In the future, we plan to automatically handle the splitting of responsibilities between pages/files, making it unnecessary to manually create multiple loader instances. Stay tuned for more updates!
