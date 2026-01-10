yarn_if_needed() {
  if [ ! -d "node_modules" ]; then
    yarn --prefer-offline
  fi
}

main() {
  concurrently \
  --names frontend,host,css,sub,canvas,react-web,live-frame,loader-html,backend \
  'TRANSPILER=swc nice -n +30 yarn start' \
  'yarn host-server' \
  'nice -n +30 yarn watch-css' \
  'cd ../sub/; [ -d node_modules ] || yarn --prefer-offline; nice -n +30 yarn watch' \
  'cd ../canvas-packages/; [ -d node_modules ] || yarn --prefer-offline; nice -n +30 yarn watch' \
  'cd ../react-web-bundle/; [ -d node_modules ] || yarn --prefer-offline; nice -n +30 yarn watch' \
  'cd ../live-frame/; [ -d node_modules ] || yarn --prefer-offline; nice -n +30 yarn watch' \
  'cd ../loader-html-hydrate/; [ -d node_modules ] || yarn --prefer-offline; nice -n +30 yarn build &' \
  'nice -n +30 yarn backend'
}

main