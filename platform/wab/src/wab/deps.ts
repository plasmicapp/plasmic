// `window` could still exist due to jsdom.  Ignore it!
// Note: this was done to try making source run in jest, but this is not sufficient.  Leaving here for now.

// win is window if we're a real browser else null
import ClipboardJS from "clipboard";
import $$ from "jquery";
import { flatMap } from "lodash";
import ShortUuid from "short-uuid";
import * as Signals from "signals";
import _ from "underscore";
import * as US from "underscore.string";
import { fakeJq } from "./server/fake-jquery";

export const win: any =
  typeof window !== "undefined" &&
  window !== null &&
  !(
    window.navigator.userAgent.includes("Node.js") ||
    window.navigator.userAgent.includes("jsdom")
  )
    ? window
    : null;

// Fool webpack to not statically include this in the bundle.
// We still need to include this for tests / in node.
export const req = eval(
  'typeof require !== "undefined" ? require : __webpack_require__'
);

declare namespace global {
  let dbg: { [name: string]: any };
}

// debug tools
export const dbg: { [name: string]: any } = (global.dbg = {});

// global settings
// https://stackoverflow.com/questions/9931444/how-to-increase-number-of-call-stack-entries-in-google-chrome-developer-tools-o
Error.stackTraceLimit = 1000;

export { _, _ as U };
export { Signals };
export { ClipboardJS };
export { US };

export let $: typeof $$;
if (typeof window !== "undefined" && window != null) {
  $ = $$;
  require("jquery-serializejson");
} else {
  $ = fakeJq("http://localhost:3003") as any;
}
export type JQ<T = HTMLElement> = JQuery<T>;

export const CssJson = require("cssjson");
export const PR = require("packrattle");
require("es7-shim");
export const NestedError = require("nested-error-stacks");
export const reAll = require("regexp.execall");
export const jsStringEscape = require("js-string-escape");

if (![].flatMap) {
  (Array as any).prototype.flatMap = function <T, U>(f: (x: T) => U[]) {
    return flatMap(this, f);
  };
}
export const shortUuid = ShortUuid();
