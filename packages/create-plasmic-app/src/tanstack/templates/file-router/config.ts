export function makeCustomAppConfig_file_router_codegen(): string {
  return `import { defineConfig } from "@tanstack/react-start/config";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  tsr: {
    appDirectory: "src",
  },
  vite: {
    plugins: [
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
    ],
    ssr: {
      noExternal: [
        "@plasmicapp/data-sources",
        "@plasmicapp/data-sources-context",
        "@plasmicapp/prepass",
        "@plasmicapp/query",
        "@plasmicapp/react-web",
      ],
    },
  },
})`;
}
