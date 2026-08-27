FROM node:24-alpine

# Config
ARG RENDERER_PORT=3010
ENV RENDERER_PORT=${RENDERER_PORT}

# System setup
RUN apk add --no-cache bubblewrap~=0.12 bash~=5 make~=4 python3 g++ libseccomp-dev
SHELL ["/bin/bash","-o", "pipefail","-l","-c"]

# Keep corepack's cache world-readable and bake the pnpm dist in, so the
# unprivileged user below does not download it at container startup.
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_HOME="/pnpm/corepack"
RUN corepack enable && pnpm --version && chmod -R a+rX "$COREPACK_HOME"

WORKDIR /

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY *.cc *.c *.h *.gyp ./

# Builds the seccomp addon. A repeat `pnpm install` would short-circuit with
# "Already up to date" and never run the implicit binding.gyp rebuild.
RUN pnpm build

COPY . .

EXPOSE ${RENDERER_PORT}

RUN echo | adduser normaluser --disabled-password
USER normaluser

ENV BWRAP_ARGS='--ro-bind /home /home'

CMD ["pnpm", "start-prod"]
