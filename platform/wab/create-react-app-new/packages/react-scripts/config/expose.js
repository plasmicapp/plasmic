/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

// Based on:
// https://github.com/webpack-contrib/exports-loader/blob/c015150cf0ca1c5914417ca661d2d308de0fc803/lib/index.js

const loaderUtils = require('loader-utils');
const { SourceNode } = require('source-map');
const { SourceMapConsumer } = require('source-map');
const path = require('path');
const paths = require('./paths');

const FOOTER = '/*** EXPORTS FROM exports-loader ***/\n';

function accessorString(value) {
  const childProperties = value.split(path.sep);
  childProperties.unshift('appModules');
  const { length } = childProperties;
  let propertyString = 'self';
  let result = '';

  for (let i = 0; i < length; i++) {
    if (i > 0) result += `if(!${propertyString}) ${propertyString} = {};\n`;
    propertyString += `[${JSON.stringify(childProperties[i])}]`;
  }

  result += `${propertyString} = `;
  return result;
}

module.exports = function loader(content, sourceMap) {
  if (this.cacheable) this.cacheable();
  let query = this.resourcePath.slice(paths.appSrc.length + 1);
  if (query.endsWith('.tsx')) {
    query = query.slice(0, -4);
  } else if (query.endsWith('.ts')) {
    query = query.slice(0, -3);
  }
  const toAdd = `\n\n${FOOTER}${accessorString(
    query
  )}(typeof   __webpack_exports__ !== "undefined" ? __webpack_exports__ : {});\n;`;

  if (sourceMap) {
    const currentRequest = loaderUtils.getCurrentRequest(this);
    const node = SourceNode.fromStringWithSourceMap(
      content,
      new SourceMapConsumer(sourceMap)
    );
    node.add(toAdd);
    const result = node.toStringWithSourceMap({
      file: currentRequest,
    });
    this.callback(null, result.code, result.map.toJSON());
    return;
  } else {
    // eslint-disable-next-line consistent-return
    return `${content}${toAdd}`;
  }
};
