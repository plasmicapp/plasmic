reuse-screen() {
  local name="$1"
  shift
  if ! screen -ls | grep -q "$name" ; then
    screen -S "$name" -d -m
    sleep 1
  fi
  screen -S "$name" "$@"
}

do-screen() {
  local name="$1"
  shift
  reuse-screen "$name" -p0 -X stuff $'\n'"$@"$'\n'
}

yarn
make
do-screen wab-dev-server 'TRANSPILER=swc nice -n +30 yarn start'
do-screen wab-watch 'yarn host-server & nice -n +30 yarn watch-css & cd ../sub/; yarn; nice -n +30 yarn watch & cd ../canvas-packages/; yarn; nice -n +30 yarn watch & cd ../react-web-bundle/; yarn; nice -n +30 yarn watch & cd ../live-frame/; yarn; nice -n +30 yarn watch & cd ../loader-html-hydrate/; yarn; nice -n +30 yarn build &'
do-screen wab-node-server 'nice -n +30 yarn backend'

{ sleep 1; screen -S wab-screens -X source tools/layout.screen; } &
screen -dR wab-screens
