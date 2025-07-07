# See https://hub.docker.com/_/node/
FROM node:18-alpine

# System setup
RUN apk add --no-cache bash~=5 make~=4 bubblewrap~=0.11
SHELL ["/bin/bash","-o", "pipefail","-l","-c"]

RUN echo | adduser normaluser --disabled-password
USER normaluser

WORKDIR /home/normaluser/

COPY --chown=normaluser package.json yarn.lock plasmic/
WORKDIR /home/normaluser/plasmic/

# For local tests:
# COPY --chown=normaluser pgpass /home/normaluser/.pgpass
# RUN chmod 600 /home/normaluser/.pgpass

RUN yarn install --frozen-lockfile && yarn cypress cache clear

COPY --chown=normaluser . .

# Run make
RUN mkdir -p src/wab/gen/ && make

RUN rm -rf ./node_modules
RUN yarn install --production --frozen-lockfile && yarn cache clean

COPY --chown=normaluser tools/docker-dev/secrets.json /home/normaluser/.plasmic/secrets.json
RUN chmod 600 ~/.plasmic/secrets.json

# loader-bundle-env is expected to be a peer folder to wab, so we copy it there
COPY --chown=normaluser .tmp/loader-bundle-env /home/normaluser/loader-bundle-env
WORKDIR /home/normaluser/loader-bundle-env
RUN yarn install && yarn cache clean

# loader-html-hydrate is expected to be a peer folder to wab, so we copy it there
COPY --chown=normaluser .tmp/loader-html-hydrate /home/normaluser/loader-html-hydrate
WORKDIR /home/normaluser/loader-html-hydrate
RUN yarn install && yarn build && yarn cache clean

# Expose main server port
EXPOSE 3004

# Switch workdir back to wab
WORKDIR /home/normaluser/plasmic

# Run the main server by default
CMD ["yarn", "prod-backend"]
