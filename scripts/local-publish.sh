#/bin/bash

pkg=$1

echo "Locally publishing $pkg"

# First, locally unpublish
./node_modules/.bin/lerna exec --loglevel=silent --scope "$pkg" --include-dependencies --no-bail -- npm --registry=http://localhost:4873 unpublish -f "\${LERNA_PACKAGE_NAME}"

# Next, build the packages using nx
./node_modules/.bin/lerna exec --loglevel=silent --scope "$pkg" --include-dependencies -- yarn nx build

# Finally, locally publish, skipping the build step
export PREPARE_NO_BUILD=true
./node_modules/.bin/lerna exec --loglevel=silent --scope "$pkg" --include-dependencies -- npm publish --registry=http://localhost:4873

unset PREPARE_NO_BUILD