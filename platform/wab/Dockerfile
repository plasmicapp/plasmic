# See https://hub.docker.com/_/node/
FROM node:24.4-alpine AS builder

RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash
# Switch workdir back to wab
WORKDIR /app/wab
COPY wab/package.json wab/yarn.lock ./
RUN yarn install --frozen-lockfile && yarn cache clean
COPY wab/ .
RUN mkdir -p src/wab/gen && make
RUN rm -rf node_modules/

FROM node:24.4-alpine AS runner
# System setup
RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash

# loader-bundle-env is expected to be a peer folder to wab, so we copy it there
WORKDIR /app/loader-bundle-env
COPY loader-bundle-env/package.json loader-bundle-env/yarn.lock ./
RUN yarn install --frozen-lockfile && yarn cache clean

# loader-html-hydrate is expected to be a peer folder to wab, so we copy it there
WORKDIR /app/loader-html-hydrate
COPY loader-html-hydrate/package.json loader-html-hydrate/yarn.lock ./
RUN yarn install --frozen-lockfile && yarn cache clean

WORKDIR /app/loader-bundle-env
COPY loader-bundle-env/ .
RUN ./yarn-install-internal-pkgs.sh
RUN ./yarn-build-internal-pkgs.sh

WORKDIR /app/loader-html-hydrate
COPY loader-html-hydrate/ .
RUN yarn build

# Expose main server port
EXPOSE 3004

# Switch workdir back to wab
WORKDIR /app/wab
COPY wab/package.json wab/yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean
COPY wab/ .
COPY --from=builder /app/wab/ .

USER node

CMD ["node", "-r", "esbuild-register", "src/wab/server/main.ts"]
