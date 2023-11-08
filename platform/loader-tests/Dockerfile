FROM cypress/browsers:node-18.16.0-chrome-113.0.5672.92-1-ff-113.0-edge-113.0.1774.35-1

WORKDIR /app
COPY . /app
RUN yarn

CMD CI=true WAB_HOST=http://host.docker.internal:${BACKEND_PORT:-3003} yarn test
