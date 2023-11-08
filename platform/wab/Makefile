SUBDIRS := $(wildcard src/wab/shared/copilot/internal/.)

all: \
	src/wab/gen/modelPegParser.js \
	src/wab/gen/funcTplParser.js \
	src/wab/classes.ts \
	src/wab \
	src/wab/gen/cssPegParser.js \
	src/wab/gen/GridStyleParser.js \
	public/static/img/custom-code.svg \
	src/wab/styles/_tokens.sass \
	src/wab/styles/_tokens.ts \
	src/wab/styles/css-variables.ts \
	src/wab/styles/css-variables.scss \
	src/wab/client/plasmic-deployed.json \
	$(SUBDIRS)
$(SUBDIRS):
	$(MAKE) -C $@
src/wab/classes.ts: src/wab/gen/modelPegParser.js src/wab/model/model-schema.ts tools/gen-models.ts src/wab/model/model-generator.ts
	yarn gen:models
src/wab/classes-metas.ts: src/wab/gen/modelPegParser.js src/wab/model/model-schema.ts tools/gen-models.ts src/wab/model/model-generator.ts
	yarn gen:models
src/wab/styles/_tokens.sass: src/wab/styles/plasmic-tokens.theo.json
	yarn run theo src/wab/styles/plasmic-tokens.theo.json --transform web --format sass --dest src/wab/styles
	mv src/wab/styles/plasmic-tokens.theo.sass src/wab/styles/_tokens.sass
src/wab/styles/_tokens.ts: src/wab/styles/plasmic-tokens.theo.json
	yarn run theo src/wab/styles/plasmic-tokens.theo.json --transform web --format module.js --dest src/wab/styles
	mv src/wab/styles/plasmic-tokens.theo.module.js src/wab/styles/_tokens.ts
src/wab/styles/css-variables.ts: src/wab/styles/css-variables.json
	node src/wab/styles/css-variables.gen.js
src/wab/styles/css-variables.scss: src/wab/styles/css-variables.json
	node src/wab/styles/css-variables.gen.js
src/wab/client/plasmic-deployed.json: tools/gen-plasmic-deployed.js plasmic.json plasmic.lock
	node tools/gen-plasmic-deployed.js > src/wab/client/plasmic-deployed.json

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
# Tolerate missing ../.gitignore since a wab backend docker build does not include parent dirs
.dockerignore: .gitignore $(wildcard ../.gitignore) tools/bootstrap/gen-dockerignore.js
	node tools/bootstrap/gen-dockerignore.js > $@
.PHONY: all $(SUBDIRS)