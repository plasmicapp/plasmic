import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "bY35SmJJgVeJtcuAReMtgz",
      token:
        "pIa3vWHtSBVjJ69rSmfihVqf5SfLAjoigNd9kUFY5m9FrBkaxuVQxRcq6FQuPDVYcJpKtILIhSYjlxb698A",
    },
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
});
