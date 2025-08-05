import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  ssr: {
    noExternal: [
      "@plasmicapp/data-sources",
      "@plasmicapp/data-sources-context",
      "@plasmicapp/prepass",
      "@plasmicapp/query",
      "@plasmicapp/react-web",
    ],
  },
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
  ],
})

export default config
