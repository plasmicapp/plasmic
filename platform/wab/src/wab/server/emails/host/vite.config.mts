import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import devStudioOrigin from "../../../../../tools/dev-studio-origin.js";

export default defineConfig({
  plugins: [react()],
  base: "/plasmic-host",
  define: {
    "process.env.DEV_STUDIO_ORIGIN": JSON.stringify(devStudioOrigin),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../../../"),
    },
  },
});
