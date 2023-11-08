#!/usr/bin/env bash

function main() {
  # TODO:
  # check in a venv
  # check that node also in venv
  # install web deps
  # install python deps

  pip install -r requirements-dev.txt
  test -f .git/hooks/pre-commit.legacy && rm .git/hooks/pre-commit.legacy
  pre-commit install --install-hooks
}

main
