#!/usr/bin/env bash

yarn test-playwright
echo 'PLAYWRIGHT DONE'

jest --runInBand
echo 'JEST DONE'