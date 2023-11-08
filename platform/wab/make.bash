srcs=''

./node_modules/.bin/terser --beautify \
  --source-map "root='../',url='all.js.map'" \
  --output src/wab/gen/all.js \
  $srcs
