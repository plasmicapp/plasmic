NODE_OPTIONS="--max-old-space-size=10000" nice -n +10 pnpm test:debug "$@"
