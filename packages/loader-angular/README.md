Steps to publish a new version.

- Bump version in src/package.json

- Run the following commands:
  yarn build
  cd dist
  npm publish --access public
