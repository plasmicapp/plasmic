# syntax=docker/dockerfile:1
#
# Build context is the platform/ workspace root (not platform/wab), e.g.:
#   docker build -f platform/wab/Dockerfile platform/
#
# wab, canvas-packages, loader-bundle-env and loader-html-hydrate share the pnpm
# workspace rooted at platform/. wab's server reads loader-bundle-env and
# loader-html-hydrate as sibling directories at runtime
# (process.cwd()/../loader-bundle-env/node_modules), so the runtime image keeps
# the /platform/{wab,loader-bundle-env,loader-html-hydrate} peer layout together
# with the workspace-root node_modules/.pnpm store their symlinks point into.

# See https://hub.docker.com/_/node/
# Pinned to an exact patch (not the floating node:24-alpine tag) to avoid silently
# pulling in Node patch regressions on rebuild. Node 24.17.0 introduced an http.Agent
# keep-alive regression (nodejs/node#63989) that broke node-fetch outbound requests with
# ERR_STREAM_PREMATURE_CLOSE. Bump deliberately once a fixed 24.17.x+ is verified.
FROM node:24.16.0-alpine AS builder

ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CYPRESS_INSTALL_BINARY=0
ENV PLAYWRIGHT_DOWNLOAD_HOST=https://playwright-akamai.azureedge.net

# make + bubblewrap for wab codegen and the runtime code-eval sandbox;
# build-base/g++/gcc/python3/libc-dev to compile native addons (bcrypt, sharp,
# @swc/core, ...) during pnpm install.
RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash g++ gcc libc-dev

# pnpm via corepack; the version is pinned by "packageManager" in package.json.
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /platform

# Download every package into the store first, from the lockfile alone, so this
# expensive layer is invalidated only by lockfile changes — with a plain
# `COPY . .` before install, any source edit would re-resolve and re-link
# everything on every build. Patches ride along because patchedDependencies in
# pnpm-workspace.yaml references them.
#
# The store is in a layer (not `--mount=type=cache`), since cache mounts are
# builder-local, and CI builds on a fresh buildx builder whose mounts start empty
# while layers come from the registry cache. A mount here leaves every replayed
# `pnpm fetch` with an empty store, so installs below would refetch. Only the builder
# stage carries the store.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm fetch

# Copy the whole workspace (node_modules, build outputs and generated files are
# excluded via .dockerignore). pnpm needs every workspace member's package.json
# present to satisfy the frozen lockfile, and canvas-packages links wab's
# register-library through the workspace.
COPY . .

# --prefer-offline (not --offline) since the fetch above normally covers everything,
# but partial cache restore must degrade into a refetch, not hard failure.
RUN pnpm install --frozen-lockfile --prefer-offline

# Build loader-bundle-env's internal_pkgs and loader-html-hydrate. wab's server
# consumes their built output from the sibling directories at runtime.
# NB: filters match package *names*, and loader-html-hydrate's package name is
# @plasmicapp/loader-html-hydrate (a bare directory name would silently match
# nothing).
RUN pnpm --filter "loader-bundle-env..." --filter "@plasmicapp/loader-html-hydrate..." build

# Code generation (peg parsers, model classes, style tokens, vendored CSS).
WORKDIR /platform/wab
RUN mkdir -p src/wab/gen && make

# Re-resolve without devDependencies for the runtime image, and only for the
# three packages that actually ship in it — this keeps canvas-packages',
# analytics-rproxy's and mini-cache's prod deps out of the copied store.
# NB: `pnpm deploy` would be tidier but flattens node_modules and breaks wab's
# sibling-dir resolution (../loader-bundle-env/node_modules); see
# https://github.com/pnpm/pnpm/issues/9283
WORKDIR /platform
RUN rm -rf node_modules wab/node_modules loader-bundle-env/node_modules \
      loader-html-hydrate/node_modules canvas-packages/node_modules \
    && pnpm install --frozen-lockfile --prefer-offline --prod \
      --filter "wab..." --filter "loader-bundle-env..." \
      --filter "@plasmicapp/loader-html-hydrate..." \
      --config.confirmModulesPurge=false

FROM node:24.16.0-alpine AS runner

# make + bubblewrap for the runtime code-eval sandbox; toolchain kept so native
# addons that resolve a prebuilt binary at load time still have their deps.
RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash g++ gcc libc-dev

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Keep corepack's cache in a world-readable location so the pnpm dist baked in
# below (as root) is usable by the unprivileged node user at runtime.
ENV COREPACK_HOME="/pnpm/corepack"
RUN corepack enable

WORKDIR /platform

# Workspace-root store plus manifests, then the three peer packages wab needs at
# runtime. Symlinks inside each package's node_modules point back into
# /platform/node_modules/.pnpm, so both must be copied together.
COPY --from=builder --chown=node:node /platform/node_modules ./node_modules
COPY --from=builder --chown=node:node /platform/pnpm-workspace.yaml /platform/pnpm-lock.yaml /platform/package.json ./

# Bake the pinned pnpm dist into the image; otherwise the first `pnpm ...` in a
# pod (e.g. `pnpm db:one-time-job`) would download it from the registry at
# container runtime.
RUN pnpm --version && chmod -R a+rX "$COREPACK_HOME"
COPY --from=builder --chown=node:node /platform/wab ./wab
COPY --from=builder --chown=node:node /platform/loader-bundle-env ./loader-bundle-env
COPY --from=builder --chown=node:node /platform/loader-html-hydrate ./loader-html-hydrate

# Expose main server port
EXPOSE 3004

# Switch workdir back to wab
WORKDIR /platform/wab

USER node

CMD ["node", "-r", "esbuild-register", "src/wab/server/main.ts"]
