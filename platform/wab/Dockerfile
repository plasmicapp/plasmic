# See https://hub.docker.com/_/node/
FROM node:24-alpine AS builder

ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV PLAYWRIGHT_DOWNLOAD_HOST=https://playwright-akamai.azureedge.net

RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash g++ gcc libc-dev

# Switch workdir back to wab
WORKDIR /app/wab
COPY wab/package.json wab/yarn.lock ./
COPY wab/patches/ ./patches/
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 yarn install --frozen-lockfile --network-timeout 600000 --mutex network
RUN yarn patch-package
COPY wab/ .
RUN mkdir -p src/wab/gen && make
RUN rm -rf node_modules/

FROM node:24-alpine AS runner

ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV PLAYWRIGHT_DOWNLOAD_HOST=https://playwright-akamai.azureedge.net

# System setup
RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash g++ gcc libc-dev

# loader-bundle-env is expected to be a peer folder to wab, so we copy it there
WORKDIR /app/loader-bundle-env
COPY loader-bundle-env/package.json loader-bundle-env/yarn.lock ./
COPY loader-bundle-env/patches/ ./patches/
RUN yarn install --frozen-lockfile --network-timeout 600000 --mutex network

# loader-html-hydrate is expected to be a peer folder to wab, so we copy it there
WORKDIR /app/loader-html-hydrate
COPY loader-html-hydrate/package.json loader-html-hydrate/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000 --mutex file
COPY loader-html-hydrate/ .
RUN yarn build

# Copy loader-bundle-env source files and build internal packages
WORKDIR /app/loader-bundle-env
COPY loader-bundle-env/yarn-install-internal-pkgs.sh loader-bundle-env/yarn-build-internal-pkgs.sh ./
COPY loader-bundle-env/internal_pkgs/ ./internal_pkgs/
RUN ./yarn-install-internal-pkgs.sh
RUN ./yarn-build-internal-pkgs.sh

# Expose main server port
EXPOSE 3004

# Switch workdir back to wab
WORKDIR /app/wab
COPY wab/package.json wab/yarn.lock ./
COPY wab/patches/ ./patches/
COPY wab/ .
COPY --from=builder /app/wab/ .
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 yarn install --production --frozen-lockfile --network-timeout 600000 --mutex network

USER node

CMD ["node", "-r", "esbuild-register", "src/wab/server/main.ts"]
