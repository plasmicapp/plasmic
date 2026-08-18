if [[ $debug ]] ; then
  # Usually you'll want to run this like:
  # debug=1 bash tools/test.bash branching -t auto-commits
  NODE_OPTIONS="--max-old-space-size=10000" \
    nice -n +20 pnpm test:inspect "$@"
else
  NODE_OPTIONS="--max-old-space-size=10000" \
    nice -n +20 pnpm test "$@"
fi
