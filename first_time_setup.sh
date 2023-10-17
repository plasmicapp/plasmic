#!/usr/bin/env bash

function main() {
  pip3 install -r requirements-dev.txt
  test -f .git/hooks/pre-commit.legacy && rm .git/hooks/pre-commit.legacy
  pre-commit install --install-hooks
}

main
