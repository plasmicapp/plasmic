FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app
RUN npm install -g pnpm@11.8.0
COPY . /app
RUN pnpm install --frozen-lockfile

CMD CI=true WAB_HOST=http://host.docker.internal:${BACKEND_PORT:-3003} pnpm test
