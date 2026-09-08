FROM node:24.4.0

# The published CLI searches ancestors for an `app` directory to detect the
# Next.js App Router. A top-level /app would misclassify Pages Router fixtures.
WORKDIR /integration-tests

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy the manifests first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    corepack install -g pnpm@11.10.0 && \
    pnpm install --frozen-lockfile && \
    pnpm store prune && \
    rm -rf /var/lib/apt/lists/*

# Copy the rest of the application code
COPY . .

# Run tests
CMD ["pnpm", "test"]
