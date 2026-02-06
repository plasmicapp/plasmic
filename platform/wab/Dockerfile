# See https://hub.docker.com/_/node/
FROM node:24-alpine AS builder

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash
# Switch workdir back to wab
WORKDIR /app/wab
COPY wab/package.json wab/yarn.lock ./
COPY wab/patches/ ./patches/
RUN yarn install --frozen-lockfile
COPY wab/ .
RUN mkdir -p src/wab/gen && make
RUN rm -rf node_modules/

FROM node:24-alpine AS runner

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

# System setup
RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash

# loader-bundle-env is expected to be a peer folder to wab, so we copy it there
WORKDIR /app/loader-bundle-env
COPY loader-bundle-env/package.json loader-bundle-env/yarn.lock ./
COPY loader-bundle-env/patches/ ./patches/
RUN yarn install --frozen-lockfile

# loader-html-hydrate is expected to be a peer folder to wab, so we copy it there
WORKDIR /app/loader-html-hydrate
COPY loader-html-hydrate/package.json loader-html-hydrate/yarn.lock ./
RUN yarn install --frozen-lockfile

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
COPY wab/patches/ ./patches/
RUN yarn config set network-timeout 60000 && \
    yarn install --production --frozen-lockfile
COPY wab/ .
COPY --from=builder /app/wab/ .

USER node

CMD ["node", "-r", "esbuild-register", "src/wab/server/main.ts"]
