// Note: this module seems to be unused, deprecated by req-api

import L from "lodash";
import * as najax from "najax";

export function fakeJq(baseUrl) {
  const wrap = (fn) =>
    function (url, opts) {
      const promise = (() => {
        if (L.isString(url)) {
          url = baseUrl + url;
          return fn(url, opts);
        } else {
          opts = url;
          opts.url = baseUrl + opts.url;
          return fn(opts);
        }
      })();
      return new Promise((resolve, reject) => promise.then(resolve, reject));
    };
  // promise
  return {
    ajax: wrap(najax),
    get: wrap(najax.get),
    post: wrap(najax.post),
    put: wrap(najax.put),
    delete: wrap(najax.delete),
  };
}
