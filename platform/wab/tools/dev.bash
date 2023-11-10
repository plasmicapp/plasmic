main() {
  concurrently \
  --names frontend,host,css,sub,canvas,react-web,live-frame,loader-html,pybackend,backend \
  'TRANSPILER=swc nice -n +30 yarn start' \
  'yarn host-server' \
  'nice -n +30 yarn watch-css' \
  'cd ../sub/; yarn; nice -n +30 yarn watch' \
  'cd ../canvas-packages/; yarn; nice -n +30 yarn watch' \
  'cd ../react-web-bundle/; yarn; nice -n +30 yarn watch' \
  'cd ../live-frame/; yarn; nice -n +30 yarn watch' \
  'cd ../loader-html-hydrate/; yarn; nice -n +30 yarn build &' \
  'cd ../pybackend/; bash ./start.sh' \
  'nice -n +30 yarn backend'
}

main