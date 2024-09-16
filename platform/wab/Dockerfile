# Need newer alpine for bubblewrap to work
FROM node:18.19-alpine3.18

# System setup
RUN apk add --no-cache bash=5.2.15-r5 make=4.4.1-r1 bubblewrap=0.8.0-r1
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

# We copy plasmic-deployed.json, which has been stuffed into .tmp,
# to its rightful place. We do this because we don't want `make` to
# generate it, as generating it requires using `git`, and `.git` is
# being .dockerignore-ed
COPY --chown=normaluser .tmp/plasmic-deployed.json /home/normaluser/src/wab/client/

# Run make, but touch src/wab/client/plasmic-deployed.json so it
# doesn't get made (see above)
RUN mkdir -p src/wab/gen/ && [[ -f src/wab/client/plasmic-deployed.json ]] && touch src/wab/client/plasmic-deployed.json && make

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
