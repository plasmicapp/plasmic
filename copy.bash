#!/usr/bin/env bash
fd '^internal$' | xargs  rm -rf
rsync --archive --progress -i ./.copybara/ ./
