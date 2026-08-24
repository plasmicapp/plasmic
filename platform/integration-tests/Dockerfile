FROM node:24.4.0

# Set the working directory
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy the manifests first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    npm install -g @plasmicapp/cli@latest create-plasmic-app@latest && \
    pnpm install --frozen-lockfile && \
    pnpm store prune && \
    apt-get purge -y --auto-remove git && \
    rm -rf /var/lib/apt/lists/*

# Copy the rest of the application code
COPY . .

# Run tests
CMD ["pnpm", "test"]
