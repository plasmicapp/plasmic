FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app
COPY . /app
RUN yarn

CMD CI=true WAB_HOST=http://host.docker.internal:${BACKEND_PORT:-3003} yarn test
