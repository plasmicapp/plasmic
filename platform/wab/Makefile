SUBDIRS := $(wildcard src/wab/shared/copilot/internal/.)

all: \
	src/wab/gen/modelPegParser.js \
	src/wab/gen/funcTplParser.js \
	src/wab/shared/model/classes.ts \
	src/wab \
	src/wab/gen/cssPegParser.js \
	src/wab/gen/GridStyleParser.js \
	public/static/img/custom-code.svg \
	src/wab/styles/_tokens.sass \
	src/wab/styles/_tokens.ts \
	src/wab/styles/css-variables.ts \
	src/wab/styles/css-variables.scss \
	src/wab/gen/static/styles/react-web-css.txt \
	src/wab/gen/static/styles/tinymce-content-css.txt \
	src/wab/gen/static/styles/prismjs-css.txt \
	$(SUBDIRS)
$(SUBDIRS):
	$(MAKE) -C $@
src/wab/shared/model/classes.ts: src/wab/gen/modelPegParser.js src/wab/shared/model/model-schema.ts tools/gen-models.ts src/wab/shared/model/model-generator.ts
	yarn gen:models
src/wab/shared/model/classes-metas.ts: src/wab/gen/modelPegParser.js src/wab/shared/model/model-schema.ts tools/gen-models.ts src/wab/shared/model/model-generator.ts
	yarn gen:models
src/wab/styles/_tokens.sass: src/wab/styles/plasmic-tokens.theo.json
	yarn gen:plasmic-tokens-sass
src/wab/styles/_tokens.ts: src/wab/styles/plasmic-tokens.theo.json
	yarn gen:plasmic-tokens-ts
src/wab/styles/css-variables.ts: src/wab/styles/css-variables.json
	node src/wab/styles/css-variables.gen.js
src/wab/styles/css-variables.scss: src/wab/styles/css-variables.json
	node src/wab/styles/css-variables.gen.js

src/wab/gen/GridStyleParser.js: PEGJS_FLAGS = --allowed-start-rules axisTemplate,size,atomicSize,numSize,flexibleSize
src/wab/gen/cssPegParser.js: PEGJS_FLAGS = --allowed-start-rules backgroundLayer,backgroundImage,boxShadows,boxShadow,commaSepValues,spaceSepValues

src/wab/gen/%.js: %.pegjs
	./node_modules/.bin/pegjs -o $@ $(PEGJS_FLAGS) $<
	echo '/* eslint-disable */' > $@.tmp
	cat $@ >> $@.tmp
	mv $@.tmp $@
src/wab/gen/%.js: %.pegcoffee
	./node_modules/.bin/pegjs --plugin pegjs-coffee-plugin -o $@ $(PEGJS_FLAGS) $<
	echo '/* eslint-disable */' > $@.tmp
	cat $@ >> $@.tmp
	mv $@.tmp $@
public/static/img/%.svg: export/%.svg tools/clean-svg.ts
	yarn clean-svg

src/wab/gen/static/styles/react-web-css.txt: node_modules/@plasmicapp/react-web/lib/plasmic.css
	mkdir -p src/wab/gen/static/styles && cp ./node_modules/@plasmicapp/react-web/lib/plasmic.css src/wab/gen/static/styles/react-web-css.txt

src/wab/gen/static/styles/tinymce-content-css.txt: node_modules/tinymce/skins/ui/tinymce-5/content.min.css
	mkdir -p src/wab/gen/static/styles && cp -p ./node_modules/tinymce/skins/ui/tinymce-5/content.min.css src/wab/gen/static/styles/tinymce-content-css.txt

src/wab/gen/static/styles/prismjs-css.txt: node_modules/prismjs/themes/prism.min.css
	mkdir -p src/wab/gen/static/styles && cp -p ./node_modules/prismjs/themes/prism.min.css src/wab/gen/static/styles/prismjs-css.txt

# Tolerate missing ../.gitignore since a wab backend docker build does not include parent dirs
.dockerignore: .gitignore $(wildcard ../.gitignore) tools/bootstrap/gen-dockerignore.js
	node tools/bootstrap/gen-dockerignore.js > $@
.PHONY: all $(SUBDIRS)
