FROM cypress/base:18.12.0

ARG PLASMIC_AUTH_USER
ARG PLASMIC_AUTH_TOKEN

ENV PLASMIC_AUTH_USER=$PLASMIC_AUTH_USER
ENV PLASMIC_AUTH_TOKEN=$PLASMIC_AUTH_TOKEN

RUN apt-get -y update
RUN apt-get -y install git

RUN test -n "$PLASMIC_AUTH_USER"
RUN test -n "$PLASMIC_AUTH_TOKEN"

WORKDIR /app

COPY . /app

RUN npm install -g @plasmicapp/cli create-plasmic-app

RUN yarn install

CMD CI=true yarn test --runInBand
