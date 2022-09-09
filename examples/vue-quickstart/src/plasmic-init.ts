/** @format */

import { initPlasmicLoader } from "@plasmicapp/loader-vue";
export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "i5FheHmF6C39nqpnHjdBD4", // ID of a project you are using
      token:
        "e88cDjRCPlVXXeCSp8A92DdrypgHEx3GOup1zZRvkxkAbEZkXN0ry0uJjXdO58mzhPTnV83QAEOp6ZieXA", // API token for that project
    },
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
});
