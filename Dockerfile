FROM node:18-alpine

# Create app directory
WORKDIR /plasmic

# Install system dependencies
RUN apk add --no-cache \
 bash \
 git \
 curl \
 wget \
 python3 \
 py3-pip \
 postgresql-client \
 sudo \
 rsync \
 build-base && \
 echo "fs.inotify.max_user_watches=524288" >> /etc/sysctl.conf && \
 sysctl -p /etc/sysctl.conf

# Copy local application code instead of git clone
COPY . /plasmic/

# Setup the application
RUN cd /plasmic && \
 mkdir /$HOME/.plasmic && \
 cp platform/wab/tools/docker-dev/secrets.json /$HOME/.plasmic/secrets.json && \
 npm install -g concurrently nx && \
 yarn setup && \
 yarn setup:canvas-packages

EXPOSE 3003 3004 3005 9229

CMD ["sh", "-c", "cd /plasmic/platform/wab && yarn typeorm migration:run && yarn migrate-dev-bundles && yarn seed && yarn plume:dev update && cd /plasmic && yarn dev"]