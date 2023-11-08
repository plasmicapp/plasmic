#!/bin/bash

# This will report the code coverage results to CodeClimate
# Note: You have to run a pre-built binary to upload the results

export CC_TEST_REPORTER_ID=5598426cb9150e7c48959602fb9a2513910d97581492995e1316896e42618d37

curl -L https://codeclimate.com/downloads/test-reporter/test-reporter-latest-linux-amd64 > ./cc-test-reporter
chmod +x ./cc-test-reporter
./cc-test-reporter before-build
yarn test:coverage
./cc-test-reporter after-build
