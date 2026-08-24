main() {
  concurrently \
  --names frontend,host,css,sub,canvas,react-web,live-frame,loader-html,backend \
  'TRANSPILER=swc nice -n +30 pnpm start' \
  'pnpm host-server' \
  'nice -n +30 pnpm watch-css' \
  'cd ../sub/; pnpm i; nice -n +30 pnpm watch' \
  'cd ../canvas-packages/; nice -n +30 pnpm watch' \
  'cd ../react-web-bundle/; pnpm i; nice -n +30 pnpm watch' \
  'cd ../live-frame/; pnpm i; nice -n +30 pnpm watch' \
  'cd ../loader-html-hydrate/; nice -n +30 pnpm build &' \
  'nice -n +30 pnpm backend'
}

main
