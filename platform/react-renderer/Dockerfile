FROM node:18.7.0-alpine3.16

# Config
ARG RENDERER_PORT=3010
ENV RENDERER_PORT=${RENDERER_PORT}

# System setup
RUN apk update && apk add --no-cache bubblewrap=0.6.2-r0 bash=5.1.16-r2 make=4.3-r0 python3=3.10.13-r0 g++=11.2.1_git20220219-r2 libseccomp-dev=2.5.2-r1
SHELL ["/bin/bash","-o", "pipefail","-l","-c"]

WORKDIR /

COPY package*.json yarn.lock ./

RUN yarn

COPY *.cc *.c *.h *.gyp ./

RUN yarn # build

COPY . .

EXPOSE ${RENDERER_PORT}

RUN echo | adduser normaluser --disabled-password
USER normaluser

ENV BWRAP_ARGS='--ro-bind /home /home'

CMD ["yarn", "start-prod"]
