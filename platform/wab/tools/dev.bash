main() {
  concurrently \
  --names frontend,host,css,sub,canvas,react-web,live-frame,loader-html,backend \
  'TRANSPILER=swc nice -n +30 pnpm start' \
  'pnpm host-server' \
  'nice -n +30 pnpm watch-css' \
  'cd ../sub/; yarn; nice -n +30 yarn watch' \
  'cd ../canvas-packages/; nice -n +30 pnpm watch' \
  'cd ../react-web-bundle/; yarn; nice -n +30 yarn watch' \
  'cd ../live-frame/; yarn; nice -n +30 yarn watch' \
  'cd ../loader-html-hydrate/; nice -n +30 pnpm build &' \
  'nice -n +30 pnpm backend'
}

main
