# Codegen

## Modes

- **Codegen** is the foundation that converts user project data to code.
- **Loader** is a high-level abstraction built on top of codegen. It works by taking codegen outputs and bundling them together with necessary dependencies like `@plasmicapp/react-web` and `@plasmicpkgs/*`.
- **Export** is the same as codegen, except it outputs a minimal version of `@plasmicapp/react-web` so the user doesn't need to depend on it.

## Code organization

- `@/wab/shared/codegen/` contains all the core codegen logic. It is in `shared/` because it needs to work on the client to quickly render in canvas/preview.
- `@/wab/server/loader/` contains all the loader bundling logic. This depends on `@/wab/shared/codegen/` to generate project code.
- `@/wab/server/workers/` contains worker entry points for `codegen` and `loader-assets`.

## Architecture diagram

```mermaid
graph TB
  app-codegen[Codegen app]
  app-loader[Loader app]
  subgraph packages
    packages-cli[@plasmicapp/cli]
    packages-loader[@plasmicapp/loader-*]
  end

  app-codegen --> packages-cli
  packages-cli --> api-codegen

  app-loader --> packages-loader
  subgraph cdn
    cdn-loader["/api/v1/loader/*"]
  end
  packages-loader --> cdn-loader

  subgraph server
    api-codegen["/api/v1/codegen/*"]
    api-loader["/api/v1/loader/*"]
    subgraph workers
      worker-codegen[codegen worker]
      worker-loader-assets[loader-assets worker]
    end

    api-codegen --> worker-codegen

    cdn-loader --> api-loader
    subgraph loader-sequence[Sequence Diagram for loader]
      api-loader --> api-loader-codegen
      api-loader-codegen[1. codegen step] --> api-loader-bundle
      api-loader-codegen --for each project--> api-loader-codegen-cache
      api-loader-codegen-cache[check codegen cache] -.if not cached.-> worker-codegen
      api-loader-bundle[2. bundle step] --> worker-loader-assets
    end
  end
```

## Codegen dependency diagram

```mermaid
graph TB
  app[Codegen app]
  cli[@plasmicapp/cli]
  react-web[@plasmicapp/react-web]
  plasmicpkgs[@plasmicpkgs/*]

  app --devDependency--> cli
  app --dependency--> react-web
  app --> generated-code
  app -.dependency.-> plasmicpkgs

  generated-code[GENERATED CODE] --> react-web
  generated-code -.-> plasmicpkgs
```

For export mode, `@plasmicapp/react-web` is in GENERATED CODE.

## Loader dependency diagram

```mermaid
graph TB
  loader[@plasmicapp/loader-*]

  app[Loader app] --dependency--> loader
  loader -.loaded at runtime.-> bundled-code

  subgraph bundled-code[BUNDLED CODE]
    direction TB
    generated-code[GENERATED CODE]
    react-web[@plasmicapp/react-web]
    plasmicpkgs[@plasmicpkgs/*]

    generated-code --> react-web
    generated-code -.-> plasmicpkgs
  end
```
