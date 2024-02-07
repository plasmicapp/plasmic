(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(function () {
      return factory(root);
    });
  } else if (typeof exports !== "undefined") {
    let domJSON = factory(root);
    if (typeof module !== "undefined" && module.exports) {
      module.exports = domJSON;
    }
    exports = domJSON;
  } else {
    window.domJSON = factory(root);
  }
})(window, function (win) {
  "use strict";
  let domJSON = {};
  let metadata = {
    href: win.location.href || null,
    userAgent:
      window.navigator && window.navigator.userAgent
        ? window.navigator.userAgent
        : null,
    version: "0.1.2",
  };
  let defaultsForToJSON = {
    absolutePaths: ["action", "data", "href", "src"],
    attributes: true,
    computedStyle: false,
    cull: true,
    deep: true,
    domProperties: true,
    filter: false,
    htmlOnly: false,
    metadata: true,
    serialProperties: false,
    stringify: false,
  };
  let defaultsForToDOM = {
    noMeta: false,
  };
  let banned = ["link", "script"];
  let required = ["nodeType", "nodeValue", "tagName"];
  let ignored = [
    "attributes",
    "childNodes",
    "children",
    "classList",
    "dataset",
    "style",
  ];
  let serials = [
    "innerHTML",
    "innerText",
    "outerHTML",
    "outerText",
    "prefix",
    "text",
    "textContent",
    "wholeText",
  ];
  let extend = function (target) {
    if (!arguments.length) {
      return arguments[0] || {};
    }
    for (let p in arguments[1]) {
      target[p] = arguments[1][p];
    }
    if (arguments.length > 2) {
      let moreArgs = [target].concat(Array.prototype.slice.call(arguments, 2));
      return extend.apply(null, moreArgs);
    } else {
      return target;
    }
  };
  let unique = function () {
    if (!arguments.length) {
      return [];
    }
    let all = Array.prototype.concat.apply([], arguments);
    for (let a = 0; a < all.length; a++) {
      if (all.indexOf(all[a]) < a) {
        all.splice(a, 1);
        a--;
      }
    }
    return all;
  };
  let copy = function (item) {
    if (item instanceof Array) {
      return item.slice();
    } else {
      let output = {};
      for (let i in item) {
        output[i] = item[i];
      }
      return output;
    }
  };
  let boolInter = function (item, filter) {
    let output;
    if (item instanceof Array) {
      output = unique(
        item.filter(function (val) {
          return filter.indexOf(val) > -1;
        })
      );
    } else {
      output = {};
      for (let f in filter) {
        if (item.hasOwnProperty(filter[f])) {
          output[filter[f]] = item[filter[f]];
        }
      }
    }
    return output;
  };
  let boolDiff = function (item, filter) {
    let output;
    if (item instanceof Array) {
      output = unique(
        item.filter(function (val) {
          return filter.indexOf(val) === -1;
        })
      );
    } else {
      output = {};
      for (let i in item) {
        output[i] = item[i];
      }
      for (let f in filter) {
        if (output.hasOwnProperty(filter[f])) {
          delete output[filter[f]];
        }
      }
    }
    return output;
  };
  let boolFilter = function (item, filter) {
    if (filter === false) {
      return item instanceof Array ? [] : {};
    }
    if (filter instanceof Array && filter.length) {
      if (typeof filter[0] === "boolean") {
        if (filter.length == 1 && typeof filter[0] === "boolean") {
          if (filter[0] === true) {
            return copy(item);
          } else {
            return item instanceof Array ? [] : {};
          }
        } else {
          if (filter[0] === true) {
            return boolDiff(item, filter.slice(1));
          } else {
            return boolInter(item, filter.slice(1));
          }
        }
      } else {
        return boolInter(item, filter);
      }
    } else {
      return copy(item);
    }
  };
  let toShorthand = function (filterList) {
    let outputArray;
    if (typeof filterList === "boolean") {
      return filterList;
    } else if (typeof filterList === "object" && filterList !== null) {
      if (filterList instanceof Array) {
        return filterList.filter(function (v, i) {
          return typeof v === "string" || (i === 0 && v === true)
            ? true
            : false;
        });
      } else {
        if (!(filterList.values instanceof Array)) {
          return false;
        }
        outputArray = filterList.values.filter(function (v) {
          return typeof v === "string" ? true : false;
        });
        if (!outputArray.length) {
          return false;
        }
        if (filterList.exclude) {
          outputArray.unshift(filterList.exclude);
        }
        return outputArray;
      }
    } else if (filterList) {
      return true;
    }
    return false;
  };
  let toAbsolute = function (value, origin) {
    let protocol, stack, parts;
    if (value.match(/(?:^data\:|^[\w\-\+\.]*?\:\/\/|^\/\/)/i)) {
      return value;
    }
    if (value.charAt(0) === "/") {
      return origin + value.substr(1);
    }
    protocol =
      origin.indexOf("://") > -1
        ? origin.substring(0, origin.indexOf("://") + 3)
        : "";
    stack = (
      protocol.length ? origin.substring(protocol.length) : origin
    ).split("/");
    parts = value.split("/");
    stack.pop();
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] == ".") {
        continue;
      }
      if (parts[i] == "..") {
        if (stack.length > 1) {
          stack.pop();
        }
      } else {
        stack.push(parts[i]);
      }
    }
    return protocol + stack.join("/");
  };
  let copyJSON = function (node, opts) {
    let copy = {};
    for (let n in node) {
      if (
        typeof node[n] !== "undefined" &&
        typeof node[n] !== "function" &&
        n.charAt(0).toLowerCase() === n.charAt(0)
      ) {
        if (typeof node[n] !== "object" || node[n] instanceof Array) {
          if (opts.cull) {
            if (node[n] || node[n] === 0 || node[n] === false) {
              copy[n] = node[n];
            }
          } else {
            copy[n] = node[n];
          }
        }
      }
    }
    copy = boolFilter(copy, opts.domProperties);
    return copy;
  };
  let attrJSON = function (node, opts) {
    let attributes = {};
    let attr = node.attributes;
    let length = attr.length;
    let absAttr;
    for (var i = 0; i < length; i++) {
      attributes[attr[i].name] = attr[i].value;
    }
    attributes = opts.attributes
      ? boolFilter(attributes, opts.attributes)
      : null;
    absAttr = boolFilter(attributes, opts.absolutePaths);
    for (var i in absAttr) {
      attributes[i] = toAbsolute(absAttr[i], opts.absoluteBase);
    }
    return attributes;
  };
  let styleJSON = function (node, opts) {
    let style,
      css = {};
    if (opts.computedStyle && node.style instanceof CSSStyleDeclaration) {
      style = win.getComputedStyle(node);
    } else {
      return null;
    }
    for (let k in style) {
      if (
        k !== "cssText" &&
        !k.match(/\d/) &&
        typeof style[k] === "string" &&
        style[k].length
      ) {
        css[k] = style[k];
      }
    }
    return opts.computedStyle instanceof Array
      ? boolFilter(css, opts.computedStyle)
      : css;
  };
  let toJSON = function (node, opts, depth) {
    let style,
      kids,
      kidCount,
      thisChild,
      children,
      copy = copyJSON(node, opts);
    if (node.nodeType === 1) {
      for (let b in banned) {
        if (node.tagName.toLowerCase() === banned[b]) {
          return null;
        }
      }
    } else if (node.nodeType === 3 && !node.nodeValue.trim()) {
      return null;
    }
    if (opts.attributes && node.attributes) {
      copy.attributes = attrJSON(node, opts);
    }
    if (opts.computedStyle && (style = styleJSON(node, opts))) {
      copy.style = style;
    }
    if (
      opts.deep === true ||
      (typeof opts.deep === "number" && opts.deep > depth)
    ) {
      children = [];
      kids = opts.htmlOnly ? node.children : node.childNodes;
      kidCount = kids.length;
      for (let c = 0; c < kidCount; c++) {
        thisChild = toJSON(kids[c], opts, depth + 1);
        if (thisChild) {
          children.push(thisChild);
        }
      }
      copy.childNodes = children;
    }
    return copy;
  };
  domJSON.toJSON = function (node, opts) {
    let copy,
      keys = [],
      options = {},
      output = {};
    let timer = new Date().getTime();
    let requiring = required.slice();
    let ignoring = ignored.slice();
    options = extend({}, defaultsForToJSON, opts);
    options.absolutePaths = toShorthand(options.absolutePaths);
    options.attributes = toShorthand(options.attributes);
    options.computedStyle = toShorthand(options.computedStyle);
    options.domProperties = toShorthand(options.domProperties);
    options.serialProperties = toShorthand(options.serialProperties);
    options.absoluteBase = win.location.origin + "/";
    if (options.serialProperties !== true) {
      if (
        options.serialProperties instanceof Array &&
        options.serialProperties.length
      ) {
        if (options.serialProperties[0] === true) {
          ignoring = ignoring.concat(
            boolDiff(serials, options.serialProperties)
          );
        } else {
          ignoring = ignoring.concat(
            boolInter(serials, options.serialProperties)
          );
        }
      } else {
        ignoring = ignoring.concat(serials);
      }
    }
    if (options.domProperties instanceof Array) {
      if (options.domProperties[0] === true) {
        options.domProperties = boolDiff(
          unique(options.domProperties, ignoring),
          requiring
        );
      } else {
        options.domProperties = boolDiff(
          unique(options.domProperties, requiring),
          ignoring
        );
      }
    } else {
      if (options.domProperties === false) {
        options.domProperties = requiring;
      } else {
        options.domProperties = [true].concat(ignoring);
      }
    }
    copy = toJSON(node, options, 0);
    if (options.metadata) {
      output.meta = extend({}, metadata, {
        clock: new Date().getTime() - timer,
        date: new Date().toISOString(),
        dimensions: {
          inner: {
            x: window.innerWidth,
            y: window.innerHeight,
          },
          outer: {
            x: window.outerWidth,
            y: window.outerHeight,
          },
        },
        options: options,
      });
      output.node = copy;
    } else {
      output = copy;
    }
    if (options.stringify) {
      return JSON.stringify(output);
    }
    return output;
  };
  let createNode = function (type, doc, data) {
    if (doc instanceof DocumentFragment) {
      doc = doc.ownerDocument;
    }
    switch (type) {
      case 1:
        if (typeof data.tagName === "string") {
          return doc.createElement(data.tagName);
        }
        return false;

      case 3:
        if (typeof data.nodeValue === "string" && data.nodeValue.length) {
          return doc.createTextNode(data.nodeValue);
        }
        return doc.createTextNode("");

      case 7:
        if (data.hasOwnProperty("target") && data.hasOwnProperty("data")) {
          return doc.createProcessingInstruction(data.target, data.data);
        }
        return false;

      case 8:
        if (typeof data.nodeValue === "string") {
          return doc.createComment(data.nodeValue);
        }
        return doc.createComment("");

      case 9:
        return doc.implementation.createHTMLDocument(data);

      case 11:
        return doc;

      default:
        return false;
    }
  };
  let toDOM = function (obj, parent, doc) {
    if (obj.nodeType) {
      var node = createNode(obj.nodeType, doc, obj);
      parent.appendChild(node);
    } else {
      return false;
    }
    for (let x in obj) {
      if (
        typeof obj[x] !== "object" &&
        x !== "isContentEditable" &&
        x !== "childNodes"
      ) {
        try {
          node[x] = obj[x];
        } catch (e) {
          continue;
        }
      }
    }
    let src;
    if (obj.nodeType === 1 && obj.tagName) {
      if (obj.attributes) {
        for (let a in obj.attributes) {
          node.setAttribute(a, obj.attributes[a]);
        }
      }
    }
    if (obj.childNodes && obj.childNodes.length) {
      for (let c in obj.childNodes) {
        toDOM(obj.childNodes[c], node, doc);
      }
    }
  };
  domJSON.toDOM = function (obj, opts) {
    let options, node;
    if (typeof obj === "string") {
      obj = JSON.parse(obj);
    }
    options = extend({}, defaultsForToDOM, opts);
    node = document.createDocumentFragment();
    if (options.noMeta) {
      toDOM(obj, node, node);
    } else {
      toDOM(obj.node, node, node);
    }
    return node;
  };
  return domJSON;
});
