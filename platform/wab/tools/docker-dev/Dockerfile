# --- Build stage ---
FROM node:18-alpine AS builder
ENV PLASMIC_HOME=/plasmic \
    HOME=/home/plasmic \
    NODE_ENV=development \
    PYTHON=/usr/bin/python3
WORKDIR $PLASMIC_HOME

# Install system deps
RUN apk add --no-cache \
    bash \
    curl \
    git \
    wget \
    python3 \
    py3-pip \
    build-base

# Copy only dependency files first for caching
COPY package.json yarn.lock ./

# Install deps early for cache
RUN yarn install --frozen-lockfile --prefer-offline

# Then copy rest of the app
COPY . .

# Secrets setup and build tools
RUN mkdir -p /tmp/.plasmic && \
    cp platform/wab/tools/docker-dev/secrets.json /tmp/.plasmic/secrets.json && \
    sed -i -e 's/"host": "localhost"/"host": "plasmic-db"/' -e '/"database": "wab"/a "password": "w1G_xJzN8.q9Q2_nRyY1CxzW.o257dtta.ZxUakSu",' platform/wab/ormconfig.json && \
    yarn setup && \
    yarn cache clean

# --- Final stage ---
FROM node:18-alpine
ENV PLASMIC_HOME=/plasmic \
    HOME=/home/plasmic \
    NODE_ENV=production

# Create non-root user and prepare env
RUN addgroup -S plasmic && \
    adduser -S plasmic -G plasmic && \
    apk add --no-cache bash && \
    yarn global add pm2 && \
    yarn cache clean && \
    echo "fs.inotify.max_user_watches=524288" >> /etc/sysctl.conf && \
    sysctl -p && \
    mkdir -p $HOME && \
    chown -R plasmic:plasmic $HOME

USER plasmic
WORKDIR $PLASMIC_HOME

# Copy built app and secrets with correct ownership
COPY --chown=plasmic:plasmic --from=builder /plasmic $PLASMIC_HOME
COPY --chown=plasmic:plasmic --from=builder /tmp/.plasmic $HOME/.plasmic

EXPOSE 3004

ENTRYPOINT ["sh", "-c"]
CMD ["cd platform/wab && yarn typeorm migration:run && yarn seed && yarn start-backend"]