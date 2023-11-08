#!/usr/bin/env bash

# Utility script to rsync the project dir to any destination, including
# generated sources but minus install/build/misc artifacts.  Useful for quickly
# testing out some CI/production changes.
#
# Use with e.g.:
#
#   bash tools/rsync.bash ubuntu@gerrit.aws.plasmic.app:/var/jenkins_home/workspace/build_plasmic_static_assets/plasmic/
#
# For less ambiguity, specify the actual destination directory with a trailing
# slash, which will make that the project root dir.

HERE="$( dirname "${BASH_SOURCE[0]}" )/"
PROJROOT="$HERE/../../"

rsync -ril \
  --exclude '*.egg-info' \
  --exclude '.git/' \
  --exclude '.*.swp' \
  --exclude 'node_modules/**' \
  --include '*/' \
  --stats \
  --exclude 'wab/build/**' \
  --exclude 'typedoc/**' \
  --exclude 'hired.com-filter/**' \
  --exclude 'cypress/videos/*.mp4' \
  --exclude typedoc.json.gz \
  "$PROJROOT" "$@"