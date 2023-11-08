import { initPlasmicLoader } from "@plasmicapp/loader-vue";
export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "pWdzPUfJ3sKwMngXRAtzVR", // ID of a project you are using
      token:
        "QwHDESDFvJdJe0UiaKoZGgLbiYK1COf5Uqbfii7H08PmUgWbZtTajElp3bihR1vIiRmbaQSxlL7OnlXRQ7w", // API token for that project
    },
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
});
