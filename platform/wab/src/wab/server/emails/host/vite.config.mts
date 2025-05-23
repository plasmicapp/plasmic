import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/plasmic-host",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../../../"),
    },
  },
});
