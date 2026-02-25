# See https://hub.docker.com/_/node/
FROM node:24-alpine AS builder

ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV PLAYWRIGHT_DOWNLOAD_HOST=https://playwright-akamai.azureedge.net

RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash g++ gcc libc-dev

# loader-bundle-env is expected to be a peer folder to wab, so we copy it there
WORKDIR /app/loader-bundle-env
# Don't bother optimizing Docker layer caching for loader-bundle-env
# since it is more complicated with internal_pkgs/* directories
COPY loader-bundle-env/ .
RUN yarn install --frozen-lockfile --network-timeout 600000 --mutex file

# loader-html-hydrate is expected to be a peer folder to wab, so we copy it there
WORKDIR /app/loader-html-hydrate
COPY loader-html-hydrate/package.json loader-html-hydrate/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000 --mutex file
COPY loader-html-hydrate/ .
RUN yarn build

# wab install
WORKDIR /app/wab
COPY wab/package.json wab/yarn.lock ./
COPY wab/patches/ ./patches/
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 yarn install --frozen-lockfile --network-timeout 600000 --mutex file
COPY wab/ .
RUN mkdir -p src/wab/gen && make
# TODO: Use prune command after migrating to pnpm
RUN rm -rf node_modules/
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 yarn install --production --frozen-lockfile --network-timeout 600000 --mutex file

FROM node:24-alpine AS runner

# System setup
RUN apk add --no-cache make~=4 bubblewrap~=0.11 python3 build-base bash g++ gcc libc-dev

COPY --from=builder /app/loader-bundle-env ./app/loader-bundle-env
COPY --from=builder /app/loader-html-hydrate ./app/loader-html-hydrate
COPY --from=builder /app/wab/ ./app/wab

# Expose main server port
EXPOSE 3004

# Switch workdir back to wab
WORKDIR /app/wab

USER node

CMD ["node", "-r", "esbuild-register", "src/wab/server/main.ts"]
