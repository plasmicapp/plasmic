# Plasmic Integration Tests

Contains integration tests between our public packages and the server. Run them with `npm test`!

## Running with Docker

Jenkins runs the tests using Docker. To run them with the same setup (that's useful to debug when tests are not passing CI), run:

  $ docker build --no-cache --build-arg PLASMIC_AUTH_USER=testing@plasmic.app --build-arg PLASMIC_AUTH_TOKEN=OfjA0Py2vZrBwkzOozYNGSK3zMHwWevKXTv8ZgAjXmlxQLUjuJ9KsVdQFB6lqM7Atq3IdqWPxrVIYZLA -t integration-tests .
  $ docker run --rm integration-tests

## Dev notes

Tests are written using Jest. For tests that interacts with the UI we have Cypress, which is used as a Node module. See some of the tests for examples.

Testing user: testing@plasmic.app
Testing project: https://studio.plasmic.app/projects/jrK3EHVDvsuNrYohN5Dhrt
