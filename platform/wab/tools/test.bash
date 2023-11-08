# SKIP_PREFLIGHT_CHECK is needed because our root directory has an eslint
# version incompatible with create-react-app.

if [[ $debug ]] ; then
  # Usually you'll want to run this like:
  # debug=1 bash tools/test.bash branching -t auto-commits
  SKIP_PREFLIGHT_CHECK=true \
    NODE_OPTIONS="--max-old-space-size=10000" \
    nice -n +20 yarn test:debug --no-cache --watch false --watchAll false --runInBand "$@"
else
  SKIP_PREFLIGHT_CHECK=true \
    NODE_OPTIONS="--max-old-space-size=10000" \
    nice -n +20 yarn test --no-cache "$@"
fi

