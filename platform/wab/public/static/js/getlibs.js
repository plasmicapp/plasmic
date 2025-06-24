(function(){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.6+9869a4bc
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var vertx = Function('return this')().require('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(2);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var TRY_CATCH_ERROR = { error: null };

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    TRY_CATCH_ERROR.error = error;
    return TRY_CATCH_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === TRY_CATCH_ERROR) {
      reject(promise, TRY_CATCH_ERROR.error);
      TRY_CATCH_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = getThen(entry);

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$2) {
        var promise = new c(noop);
        handleMaybeThenable(promise, entry, _then);
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$2 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves

    Synchronous example:

    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }

    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```

    Asynchronous example:

    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```

    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    if (isFunction(callback)) {
      return promise.then(function (value) {
        return constructor.resolve(callback()).then(function () {
          return value;
        });
      }, function (reason) {
        return constructor.resolve(callback()).then(function () {
          throw reason;
        });
      });
    }

    return promise.then(callback, callback);
  };

  return Promise;
}();

Promise$2.prototype.then = then;
Promise$2.all = all;
Promise$2.race = race;
Promise$2.resolve = resolve$1;
Promise$2.reject = reject$1;
Promise$2._setScheduler = setScheduler;
Promise$2._setAsap = setAsap;
Promise$2._asap = asap;

/*global self*/
function polyfill() {
  var local = void 0;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof self !== 'undefined') {
    local = self;
  } else {
    try {
      local = Function('return this')();
    } catch (e) {
      throw new Error('polyfill failed because global object is unavailable in this environment');
    }
  }

  var P = local.Promise;

  if (P) {
    var promiseToString = null;
    try {
      promiseToString = Object.prototype.toString.call(P.resolve());
    } catch (e) {
      // silently ignored
    }

    if (promiseToString === '[object Promise]' && !P.cast) {
      return;
    }
  }

  local.Promise = Promise$2;
}

// Strange compat..
Promise$2.polyfill = polyfill;
Promise$2.Promise = Promise$2;

Promise$2.polyfill();

return Promise$2;

})));



//# sourceMappingURL=es6-promise.auto.map

/*
 * SystemJS v0.20.19 Dev
 */
(function () {
    'use strict';

    const redirects = {}, cached = {};

    /*
     * Environment
     */
    var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    var isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    var isWindows = typeof process !== 'undefined' && typeof process.platform === 'string' && process.platform.match(/^win/);

    var envGlobal = typeof self !== 'undefined' ? self : global;
    /*
     * Simple Symbol() shim
     */
    var hasSymbol = typeof Symbol !== 'undefined';
    function createSymbol (name) {
        return hasSymbol ? Symbol() : '@@' + name;
    }





    /*
     * Environment baseURI
     */
    var baseURI;

// environent baseURI detection
    if (typeof document != 'undefined' && document.getElementsByTagName) {
        baseURI = document.baseURI;

        if (!baseURI) {
            var bases = document.getElementsByTagName('base');
            baseURI = bases[0] && bases[0].href || window.location.href;
        }
    }
    else if (typeof location != 'undefined') {
        baseURI = location.href;
    }

// sanitize out the hash and querystring
    if (baseURI) {
        baseURI = baseURI.split('#')[0].split('?')[0];
        var slashIndex = baseURI.lastIndexOf('/');
        if (slashIndex !== -1)
            baseURI = baseURI.substr(0, slashIndex + 1);
    }
    else if (typeof process !== 'undefined' && process.cwd) {
        baseURI = 'file://' + (isWindows ? '/' : '') + process.cwd();
        if (isWindows)
            baseURI = baseURI.replace(/\\/g, '/');
    }
    else {
        throw new TypeError('No environment baseURI');
    }

// ensure baseURI has trailing "/"
    if (baseURI[baseURI.length - 1] !== '/')
        baseURI += '/';

    /*
     * LoaderError with chaining for loader stacks
     */
    var errArgs = new Error(0, '_').fileName == '_';
    function LoaderError__Check_error_message_for_loader_stack (childErr, newMessage) {
        // Convert file:/// URLs to paths in Node
        if (!isBrowser)
            newMessage = newMessage.replace(isWindows ? /file:\/\/\//g : /file:\/\//g, '');

        var message = (childErr.message || childErr) + '\n  ' + newMessage;

        var err;
        if (errArgs && childErr.fileName)
            err = new Error(message, childErr.fileName, childErr.lineNumber);
        else
            err = new Error(message);


        var stack = childErr.originalErr ? childErr.originalErr.stack : childErr.stack;

        if (isNode)
        // node doesn't show the message otherwise
            err.stack = message + '\n  ' + stack;
        else
            err.stack = stack;

        err.originalErr = childErr.originalErr || childErr;

        return err;
    }

    /*
     * Optimized URL normalization assuming a syntax-valid URL parent
     */
    function throwResolveError (relUrl, parentUrl) {
        throw new RangeError('Unable to resolve "' + relUrl + '" to ' + parentUrl);
    }
    function resolveIfNotPlain (relUrl, parentUrl) {
        // console.log('resolveIfNotPlain', {relUrl, parentUrl})
        relUrl = relUrl.trim();
        var parentProtocol = parentUrl && parentUrl.substr(0, parentUrl.indexOf(':') + 1);

        var firstChar = relUrl[0];
        var secondChar = relUrl[1];

        // protocol-relative
        if (firstChar === '/' && secondChar === '/') {
            if (!parentProtocol)
                throwResolveError(relUrl, parentUrl);
            return parentProtocol + relUrl;
        }
        // relative-url
        else if (firstChar === '.' && (secondChar === '/' || secondChar === '.' && (relUrl[2] === '/' || relUrl.length === 2 && (relUrl += '/')) ||
            relUrl.length === 1  && (relUrl += '/')) ||
            firstChar === '/') {
            var parentIsPlain = !parentProtocol || parentUrl[parentProtocol.length] !== '/';

            // read pathname from parent if a URL
            // pathname taken to be part after leading "/"
            var pathname;
            if (parentIsPlain) {
                // resolving to a plain parent -> skip standard URL prefix, and treat entire parent as pathname
                if (parentUrl === undefined)
                    throwResolveError(relUrl, parentUrl);
                pathname = parentUrl;
            }
            else if (parentUrl[parentProtocol.length + 1] === '/') {
                // resolving to a :// so we need to read out the auth and host
                if (parentProtocol !== 'file:') {
                    pathname = parentUrl.substr(parentProtocol.length + 2);
                    pathname = pathname.substr(pathname.indexOf('/') + 1);
                }
                else {
                    pathname = parentUrl.substr(8);
                }
            }
            else {
                // resolving to :/ so pathname is the /... part
                pathname = parentUrl.substr(parentProtocol.length + 1);
            }

            if (firstChar === '/') {
                if (parentIsPlain)
                    throwResolveError(relUrl, parentUrl);
                else
                    return parentUrl.substr(0, parentUrl.length - pathname.length - 1) + relUrl;
            }

            // join together and split for removal of .. and . segments
            // looping the string instead of anything fancy for perf reasons
            // '../../../../../z' resolved to 'x/y' is just 'z' regardless of parentIsPlain
            var segmented = pathname.substr(0, pathname.lastIndexOf('/') + 1) + relUrl;

            var output = [];
            var segmentIndex = -1;

            for (var i = 0; i < segmented.length; i++) {
                // busy reading a segment - only terminate on '/'
                if (segmentIndex !== -1) {
                    if (segmented[i] === '/') {
                        output.push(segmented.substring(segmentIndex, i + 1));
                        segmentIndex = -1;
                    }
                    continue;
                }

                // new segment - check if it is relative
                if (segmented[i] === '.') {
                    // ../ segment
                    if (segmented[i + 1] === '.' && (segmented[i + 2] === '/' || i + 2 === segmented.length)) {
                        output.pop();
                        i += 2;
                    }
                    // ./ segment
                    else if (segmented[i + 1] === '/' || i + 1 === segmented.length) {
                        i += 1;
                    }
                    else {
                        // the start of a new segment as below
                        segmentIndex = i;
                        continue;
                    }

                    // this is the plain URI backtracking error (../, package:x -> error)
                    if (parentIsPlain && output.length === 0)
                        throwResolveError(relUrl, parentUrl);

                    continue;
                }

                // it is the start of a new segment
                segmentIndex = i;
            }
            // finish reading out the last segment
            if (segmentIndex !== -1)
                output.push(segmented.substr(segmentIndex));

            return parentUrl.substr(0, parentUrl.length - pathname.length) + output.join('');
        }

        // sanitizes and verifies (by returning undefined if not a valid URL-like form)
        // Windows filepath compatibility is an added convenience here
        var protocolIndex = relUrl.indexOf(':');
        if (protocolIndex !== -1) {
            if (isNode) {
                // C:\x becomes file:///c:/x (we don't support C|\x)
                if (relUrl[1] === ':' && relUrl[2] === '\\' && relUrl[0].match(/[a-z]/i))
                    return 'file:///' + relUrl.replace(/\\/g, '/');
            }
            return relUrl;
        }
    }

    var resolvedPromise$1 = Promise.resolve();

    /*
     * Simple Array values shim
     */
    function arrayValues (arr) {
        if (arr.values)
            return arr.values();

        if (typeof Symbol === 'undefined' || !Symbol.iterator)
            throw new Error('Symbol.iterator not supported in this browser');

        var iterable = {};
        iterable[Symbol.iterator] = function () {
            var keys = Object.keys(arr);
            var keyIndex = 0;
            return {
                next: function () {
                    if (keyIndex < keys.length)
                        return {
                            value: arr[keys[keyIndex++]],
                            done: false
                        };
                    else
                        return {
                            value: undefined,
                            done: true
                        };
                }
            };
        };
        return iterable;
    }

    /*
     * 3. Reflect.Loader
     *
     * We skip the entire native internal pipeline, just providing the bare API
     */
// 3.1.1
    function Loader () {
        this.registry = new Registry();
    }
// 3.3.1
    Loader.prototype.constructor = Loader;

    function ensureInstantiated (module) {
        if (!(module instanceof ModuleNamespace))
            throw new TypeError('Module instantiation did not return a valid namespace object.');
        return module;
    }

// 3.3.2
    Loader.prototype.import = function (key, parent) {
        // console.log('import', {key, parent});
        if (typeof key !== 'string')
            throw new TypeError('Loader import method must be passed a module key string');
        // custom resolveInstantiate combined hook for better perf
        var loader = this;
        return resolvedPromise$1
            .then(function () {
                return loader[RESOLVE_INSTANTIATE](key, parent);
            })
            .then(ensureInstantiated)
            //.then(Module.evaluate)
            .catch(function (err) {
                throw LoaderError__Check_error_message_for_loader_stack(err, 'Loading ' + key + (parent ? ' from ' + parent : ''));
            });
    };
// 3.3.3
    var RESOLVE = Loader.resolve = createSymbol('resolve');

    /*
     * Combined resolve / instantiate hook
     *
     * Not in current reduced spec, but necessary to separate RESOLVE from RESOLVE + INSTANTIATE as described
     * in the spec notes of this repo to ensure that loader.resolve doesn't instantiate when not wanted.
     *
     * We implement RESOLVE_INSTANTIATE as a single hook instead of a separate INSTANTIATE in order to avoid
     * the need for double registry lookups as a performance optimization.
     */
    var RESOLVE_INSTANTIATE = Loader.resolveInstantiate = createSymbol('resolveInstantiate');

// default resolveInstantiate is just to call resolve and then get from the registry
// this provides compatibility for the resolveInstantiate optimization
    Loader.prototype[RESOLVE_INSTANTIATE] = function (key, parent) {
        var loader = this;
        return loader.resolve(key, parent)
            .then(function (resolved) {
                return loader.registry.get(resolved);
            });
    };

    function ensureResolution (resolvedKey) {
        if (resolvedKey === undefined)
            throw new RangeError('No resolution found.');
        return resolvedKey;
    }

    Loader.prototype.resolve = function (key, parent) {
        var loader = this;
        return resolvedPromise$1
            .then(function() {
                return loader[RESOLVE](key, parent);
            })
            .then(ensureResolution)
            .catch(function (err) {
                throw LoaderError__Check_error_message_for_loader_stack(err, 'Resolving ' + key + (parent ? ' to ' + parent : ''));
            });
    };

// 3.3.4 (import without evaluate)
// this is not documented because the use of deferred evaluation as in Module.evaluate is not
// documented, as it is not considered a stable feature to be encouraged
// Loader.prototype.load may well be deprecated if this stays disabled
    /* Loader.prototype.load = function (key, parent) {
      return Promise.resolve(this[RESOLVE_INSTANTIATE](key, parent || this.key))
      .catch(function (err) {
        throw addToError(err, 'Loading ' + key + (parent ? ' from ' + parent : ''));
      });
    }; */

    /*
     * 4. Registry
     *
     * Instead of structuring through a Map, just use a dictionary object
     * We throw for construction attempts so this doesn't affect the public API
     *
     * Registry has been adjusted to use Namespace objects over ModuleStatus objects
     * as part of simplifying loader API implementation
     */
    var iteratorSupport = typeof Symbol !== 'undefined' && Symbol.iterator;
    var REGISTRY = createSymbol('registry');
    function Registry() {
        this[REGISTRY] = {};
    }
// 4.4.1
    if (iteratorSupport) {
        // 4.4.2
        Registry.prototype[Symbol.iterator] = function () {
            return this.entries()[Symbol.iterator]();
        };

        // 4.4.3
        Registry.prototype.entries = function () {
            var registry = this[REGISTRY];
            return arrayValues(Object.keys(registry).map(function (key) {
                return [key, registry[key]];
            }));
        };
    }

// 4.4.4
    Registry.prototype.keys = function () {
        return arrayValues(Object.keys(this[REGISTRY]));
    };
// 4.4.5
    Registry.prototype.values = function () {
        var registry = this[REGISTRY];
        return arrayValues(Object.keys(registry).map(function (key) {
            return registry[key];
        }));
    };
// 4.4.6
    Registry.prototype.get = function (key) {
        return this[REGISTRY][key];
    };
// 4.4.7
    Registry.prototype.set = function (key, namespace) {
        if (!(namespace instanceof ModuleNamespace))
            throw new Error('Registry must be set with an instance of Module Namespace');
        this[REGISTRY][key] = namespace;
        return this;
    };
// 4.4.8
    Registry.prototype.has = function (key) {
        return Object.hasOwnProperty.call(this[REGISTRY], key);
    };
// 4.4.9
    Registry.prototype.delete = function (key) {
        if (Object.hasOwnProperty.call(this[REGISTRY], key)) {
            delete this[REGISTRY][key];
            return true;
        }
        return false;
    };

    /*
     * Simple ModuleNamespace Exotic object based on a baseObject
     * We export this for allowing a fast-path for module namespace creation over Module descriptors
     */
// var EVALUATE = createSymbol('evaluate');
    var BASE_OBJECT = createSymbol('baseObject');

// 8.3.1 Reflect.Module
    /*
     * Best-effort simplified non-spec implementation based on
     * a baseObject referenced via getters.
     *
     * Allows:
     *
     *   loader.registry.set('x', new Module({ default: 'x' }));
     *
     * Optional evaluation function provides experimental Module.evaluate
     * support for non-executed modules in registry.
     */
    function ModuleNamespace (baseObject/*, evaluate*/) {
        Object.defineProperty(this, BASE_OBJECT, {
            value: baseObject
        });

        // evaluate defers namespace population
        /* if (evaluate) {
          Object.defineProperty(this, EVALUATE, {
            value: evaluate,
            configurable: true,
            writable: true
          });
        }
        else { */
        Object.keys(baseObject).forEach(extendNamespace, this);
        //}
    }
// 8.4.2
    ModuleNamespace.prototype = Object.create(null);

    if (typeof Symbol !== 'undefined' && Symbol.toStringTag)
        Object.defineProperty(ModuleNamespace.prototype, Symbol.toStringTag, {
            value: 'Module'
        });

    function extendNamespace (key) {
        Object.defineProperty(this, key, {
            enumerable: true,
            get: function () {
                return this[BASE_OBJECT][key];
            }
        });
    }

    /* function doEvaluate (evaluate, context) {
      try {
        evaluate.call(context);
      }
      catch (e) {
        return e;
      }
    }

    // 8.4.1 Module.evaluate... not documented or used because this is potentially unstable
    Module.evaluate = function (ns) {
      var evaluate = ns[EVALUATE];
      if (evaluate) {
        ns[EVALUATE] = undefined;
        var err = doEvaluate(evaluate);
        if (err) {
          // cache the error
          ns[EVALUATE] = function () {
            throw err;
          };
          throw err;
        }
        Object.keys(ns[BASE_OBJECT]).forEach(extendNamespace, ns);
      }
      // make chainable
      return ns;
    }; */

    /*
     * Register Loader
     *
     * Builds directly on top of loader polyfill to provide:
     * - loader.register support
     * - hookable higher-level resolve
     * - instantiate hook returning a ModuleNamespace or undefined for es module loading
     * - loader error behaviour as in HTML and loader specs, caching load and eval errors separately
     * - build tracing support by providing a .trace=true and .loads object format
     */

    var REGISTER_INTERNAL = createSymbol('register-internal');

    function RegisterLoader$1 () {
        Loader.call(this);

        var registryDelete = this.registry.delete;
        this.registry.delete = function (key) {
            var deleted = registryDelete.call(this, key);

            // also delete from register registry if linked
            if (records.hasOwnProperty(key) && !records[key].linkRecord) {
                delete records[key];
                deleted = true;
            }

            return deleted;
        };

        var records = {};

        this[REGISTER_INTERNAL] = {
            // last anonymous System.register call
            lastRegister: undefined,
            // in-flight es module load records
            records: records
        };

        // tracing
        this.trace = false;
    }

    RegisterLoader$1.prototype = Object.create(Loader.prototype);
    RegisterLoader$1.prototype.constructor = RegisterLoader$1;

    var INSTANTIATE = RegisterLoader$1.instantiate = createSymbol('instantiate');

// default normalize is the WhatWG style normalizer
    RegisterLoader$1.prototype[RegisterLoader$1.resolve = Loader.resolve] = function (key, parentKey) {
        return resolveIfNotPlain(key, parentKey || baseURI);
    };

    RegisterLoader$1.prototype[INSTANTIATE] = function (key, processAnonRegister) {};

// once evaluated, the linkRecord is set to undefined leaving just the other load record properties
// this allows tracking new binding listeners for es modules through importerSetters
// for dynamic modules, the load record is removed entirely.
    function createLoadRecord (state, key, registration) {
        return state.records[key] = {
            key: key,

            // defined System.register cache
            registration: registration,

            // module namespace object
            module: undefined,

            // es-only
            // this sticks around so new module loads can listen to binding changes
            // for already-loaded modules by adding themselves to their importerSetters
            importerSetters: undefined,

            loadError: undefined,
            evalError: undefined,

            // in-flight linking record
            linkRecord: {
                // promise for instantiated
                instantiatePromise: undefined,
                dependencies: undefined,
                execute: undefined,
                executingRequire: false,

                // underlying module object bindings
                moduleObj: undefined,

                // es only, also indicates if es or not
                setters: undefined,

                // promise for instantiated dependencies (dependencyInstantiations populated)
                depsInstantiatePromise: undefined,
                // will be the array of dependency load record or a module namespace
                dependencyInstantiations: undefined,

                // NB optimization and way of ensuring module objects in setters
                // indicates setters which should run pre-execution of that dependency
                // setters is then just for completely executed module objects
                // alternatively we just pass the partially filled module objects as
                // arguments into the execute function
                // hoisted: undefined
            }
        };
    }

    RegisterLoader$1.prototype[Loader.resolveInstantiate] = function (key, parentKey) {
        var loader = this;
        var state = this[REGISTER_INTERNAL];
        var registry = this.registry[REGISTRY];

        return resolveInstantiate(loader, key, parentKey, registry, state)
            .then(function (instantiated) {
                if (instantiated instanceof ModuleNamespace)
                    return instantiated;

                // resolveInstantiate always returns a load record with a link record and no module value
                var link = instantiated.linkRecord;
                // console.log('resolveInstantiate', {key, parentKey, link, instantiated});

                // if already beaten to done, return
                if (!link) {
                    if (instantiated.module)
                        return instantiated.module;
                    throw instantiated.evalError;
                }

                return deepInstantiateDeps(loader, instantiated, link, registry, state)
                    .then(function () {
                        return ensureEvaluate(loader, instantiated, link, registry, state, undefined);
                    });
            });
    };

    function resolveInstantiate (loader, key, parentKey, registry, state) {
        // normalization shortpath for already-normalized key
        // could add a plain name filter, but doesn't yet seem necessary for perf
        var module = registry[key];
        if (module)
            return Promise.resolve(module);

        var load = state.records[key];

        // already linked but not in main registry is ignored
        if (load && !load.module) {
            if (load.loadError)
                return Promise.reject(load.loadError);
            return instantiate(loader, load, load.linkRecord, registry, state);
        }

        return loader.resolve(key, parentKey)
            .then(function (resolvedKey) {
                // main loader registry always takes preference
                module = registry[resolvedKey];
                if (module)
                    return module;

                load = state.records[resolvedKey];

                // already has a module value but not already in the registry (load.module)
                // means it was removed by registry.delete, so we should
                // disgard the current load record creating a new one over it
                // but keep any existing registration
                if (!load || load.module)
                    load = createLoadRecord(state, resolvedKey, load && load.registration);

                if (load.loadError)
                    return Promise.reject(load.loadError);

                var link = load.linkRecord;
                if (!link)
                    return load;

                return instantiate(loader, load, link, registry, state);
            });
    }

    function createProcessAnonRegister (loader, load, state) {
        return function () {
            var lastRegister = state.lastRegister;

            if (!lastRegister)
                return !!load.registration;

            state.lastRegister = undefined;
            load.registration = lastRegister;

            return true;
        };
    }

    function instantiate (loader, load, link, registry, state) {
        return link.instantiatePromise || (link.instantiatePromise =
            // if there is already an existing registration, skip running instantiate
            (load.registration ? Promise.resolve() : Promise.resolve().then(function () {
                state.lastRegister = undefined;
                return loader[INSTANTIATE](load.key, loader[INSTANTIATE].length > 1 && createProcessAnonRegister(loader, load, state));
            }))
                .then(function (instantiation) {
                    // direct module return from instantiate -> we're done
                    if (instantiation !== undefined) {
                        if (!(instantiation instanceof ModuleNamespace))
                            throw new TypeError('Instantiate did not return a valid Module object.');

                        delete state.records[load.key];
                        if (loader.trace)
                            traceLoad(loader, load, link);
                        return registry[load.key] = instantiation;
                    }

                    // run the cached loader.register declaration if there is one
                    var registration = load.registration;
                    // clear to allow new registrations for future loads (combined with registry delete)
                    load.registration = undefined;
                    if (!registration)
                        throw new TypeError('Module instantiation did not call an anonymous or correctly named System.register.');

                    link.dependencies = registration[0];

                    load.importerSetters = [];

                    link.moduleObj = {};

                    // process System.registerDynamic declaration
                    if (registration[2]) {
                        link.moduleObj.default = link.moduleObj.__useDefault = {};
                        link.executingRequire = registration[1];
                        link.execute = registration[2];
                    }

                    // process System.register declaration
                    else {
                        registerDeclarative(loader, load, link, registration[1]);
                    }

                    return load;
                })
                .catch(function (err) {
                    load.linkRecord = undefined;
                    throw load.loadError = load.loadError || LoaderError__Check_error_message_for_loader_stack(err, 'Instantiating ' + load.key);
                }));
    }

// like resolveInstantiate, but returning load records for linking
    function resolveInstantiateDep (loader, key, parentKey, registry, state, traceDepMap) {
        // normalization shortpaths for already-normalized key
        // DISABLED to prioritise consistent resolver calls
        // could add a plain name filter, but doesn't yet seem necessary for perf
        /* var load = state.records[key];
        var module = registry[key];

        if (module) {
          if (traceDepMap)
            traceDepMap[key] = key;

          // registry authority check in case module was deleted or replaced in main registry
          if (load && load.module && load.module === module)
            return load;
          else
            return module;
        }

        // already linked but not in main registry is ignored
        if (load && !load.module) {
          if (traceDepMap)
            traceDepMap[key] = key;
          return instantiate(loader, load, load.linkRecord, registry, state);
        } */
        return loader.resolve(key, parentKey)
            .then(function (resolvedKey) {
                if (traceDepMap)
                    traceDepMap[key] = resolvedKey;

                // normalization shortpaths for already-normalized key
                var load = state.records[resolvedKey];
                var module = registry[resolvedKey];

                // main loader registry always takes preference
                if (module && (!load || load.module && module !== load.module))
                    return module;

                if (load && load.loadError)
                    throw load.loadError;

                // already has a module value but not already in the registry (load.module)
                // means it was removed by registry.delete, so we should
                // disgard the current load record creating a new one over it
                // but keep any existing registration
                if (!load || !module && load.module)
                    load = createLoadRecord(state, resolvedKey, load && load.registration);

                var link = load.linkRecord;
                if (!link)
                    return load;

                return instantiate(loader, load, link, registry, state);
            });
    }

    function traceLoad (loader, load, link) {
        loader.loads = loader.loads || {};
        loader.loads[load.key] = {
            key: load.key,
            deps: link.dependencies,
            dynamicDeps: [],
            depMap: link.depMap || {}
        };
    }

    /*
     * Convert a CJS module.exports into a valid object for new Module:
     *
     *   new Module(getEsModule(module.exports))
     *
     * Sets the default value to the module, while also reading off named exports carefully.
     */
    function registerDeclarative (loader, load, link, declare) {
        var moduleObj = link.moduleObj;
        var importerSetters = load.importerSetters;

        var definedExports = false;

        // closure especially not based on link to allow link record disposal
        var declared = declare.call(envGlobal, function (name, value) {
            if (typeof name === 'object') {
                var changed = false;
                for (var p in name) {
                    value = name[p];
                    if (p !== '__useDefault' && (!(p in moduleObj) || moduleObj[p] !== value)) {
                        changed = true;
                        moduleObj[p] = value;
                    }
                }
                if (changed === false)
                    return value;
            }
            else {
                if ((definedExports || name in moduleObj) && moduleObj[name] === value)
                    return value;
                moduleObj[name] = value;
            }

            for (var i = 0; i < importerSetters.length; i++)
                importerSetters[i](moduleObj);

            return value;
        }, new ContextualLoader(loader, load.key));

        link.setters = declared.setters;
        link.execute = declared.execute;
        if (declared.exports) {
            link.moduleObj = moduleObj = declared.exports;
            definedExports = true;
        }
    }

    function instantiateDeps (loader, load, link, registry, state) {
        if (link.depsInstantiatePromise)
            return link.depsInstantiatePromise;

        var depsInstantiatePromises = Array(link.dependencies.length);

        for (var i = 0; i < link.dependencies.length; i++)
            depsInstantiatePromises[i] = resolveInstantiateDep(loader, link.dependencies[i], load.key, registry, state, loader.trace && link.depMap || (link.depMap = {}));

        var depsInstantiatePromise = Promise.all(depsInstantiatePromises)
            .then(function (dependencyInstantiations) {
                link.dependencyInstantiations = dependencyInstantiations;

                // run setters to set up bindings to instantiated dependencies
                if (link.setters) {
                    for (var i = 0; i < dependencyInstantiations.length; i++) {
                        var setter = link.setters[i];
                        if (setter) {
                            var instantiation = dependencyInstantiations[i];

                            if (instantiation instanceof ModuleNamespace) {
                                setter(instantiation);
                            }
                            else {
                                if (instantiation.loadError)
                                    throw instantiation.loadError;
                                setter(instantiation.module || instantiation.linkRecord.moduleObj);
                                // this applies to both es and dynamic registrations
                                if (instantiation.importerSetters)
                                    instantiation.importerSetters.push(setter);
                            }
                        }
                    }
                }

                return load;
            });

        if (loader.trace)
            depsInstantiatePromise = depsInstantiatePromise.then(function () {
                traceLoad(loader, load, link);
                return load;
            });

        depsInstantiatePromise = depsInstantiatePromise.catch(function (err) {
            // throw up the instantiateDeps stack
            link.depsInstantiatePromise = undefined;
            throw LoaderError__Check_error_message_for_loader_stack(err, 'Loading ' + load.key);
        });

        depsInstantiatePromise.catch(function () {});

        return link.depsInstantiatePromise = depsInstantiatePromise;
    }

    function deepInstantiateDeps (loader, load, link, registry, state) {
        return new Promise(function (resolve, reject) {
            var seen = [];
            var loadCnt = 0;
            function queueLoad (load) {
                var link = load.linkRecord;
                if (!link)
                    return;

                if (seen.indexOf(load) !== -1)
                    return;
                seen.push(load);

                loadCnt++;
                instantiateDeps(loader, load, link, registry, state)
                    .then(processLoad, reject);
            }
            function processLoad (load) {
                loadCnt--;
                var link = load.linkRecord;
                if (link) {
                    for (var i = 0; i < link.dependencies.length; i++) {
                        var depLoad = link.dependencyInstantiations[i];
                        if (!(depLoad instanceof ModuleNamespace))
                            queueLoad(depLoad);
                    }
                }
                if (loadCnt === 0)
                    resolve();
            }
            queueLoad(load);
        });
    }

    /*
     * System.register
     */
    RegisterLoader$1.prototype.register = function (key, deps, declare) {
        var state = this[REGISTER_INTERNAL];

        // anonymous modules get stored as lastAnon
        if (declare === undefined) {
            state.lastRegister = [key, deps, undefined];
        }

        // everything else registers into the register cache
        else {
            var load = state.records[key] || createLoadRecord(state, key, undefined);
            load.registration = [deps, declare, undefined];
        }
    };

    /*
     * System.registerDyanmic
     */
    RegisterLoader$1.prototype.registerDynamic = function (key, deps, executingRequire, execute) {
        var state = this[REGISTER_INTERNAL];

        // anonymous modules get stored as lastAnon
        if (typeof key !== 'string') {
            state.lastRegister = [key, deps, executingRequire];
        }

        // everything else registers into the register cache
        else {
            var load = state.records[key] || createLoadRecord(state, key, undefined);
            load.registration = [deps, executingRequire, execute];
        }
    };

// ContextualLoader class
// backwards-compatible with previous System.register context argument by exposing .id, .key
    function ContextualLoader (loader, key) {
        this.loader = loader;
        this.key = this.id = key;
        this.meta = {
            url: key
            // scriptElement: null
        };
    }
    /*ContextualLoader.prototype.constructor = function () {
      throw new TypeError('Cannot subclass the contextual loader only Reflect.Loader.');
    };*/
    ContextualLoader.prototype.import = function (key) {
        if (this.loader.trace)
            this.loader.loads[this.key].dynamicDeps.push(key);
        return this.loader.import(key, this.key);
    };
    /*ContextualLoader.prototype.resolve = function (key) {
      return this.loader.resolve(key, this.key);
    };*/

// this is the execution function bound to the Module namespace record
    function ensureEvaluate (loader, load, link, registry, state, seen) {
        if (load.module)
            return load.module;

        if (load.evalError)
            throw load.evalError;

        if (seen && seen.indexOf(load) !== -1)
            return load.linkRecord.moduleObj;

        // for ES loads we always run ensureEvaluate on top-level, so empty seen is passed regardless
        // for dynamic loads, we pass seen if also dynamic
        var err = doEvaluate(loader, load, link, registry, state, link.setters ? [] : seen || []);
        if (err)
            throw err;

        return load.module;
    }

    function makeDynamicRequire (loader, key, dependencies, dependencyInstantiations, registry, state, seen) {
        // we can only require from already-known dependencies
        return function (name) {
            for (var i = 0; i < dependencies.length; i++) {
                if (dependencies[i] === name) {
                    var depLoad = dependencyInstantiations[i];
                    var module;

                    if (depLoad instanceof ModuleNamespace)
                        module = depLoad;
                    else
                        module = ensureEvaluate(loader, depLoad, depLoad.linkRecord, registry, state, seen);

                    return '__useDefault' in module ? module.__useDefault : module;
                }
            }
            throw new Error('Module ' + name + ' not declared as a System.registerDynamic dependency of ' + key);
        };
    }

// ensures the given es load is evaluated
// returns the error if any
    function doEvaluate (loader, load, link, registry, state, seen) {
        seen.push(load);

        var err;

        // es modules evaluate dependencies first
        // non es modules explicitly call moduleEvaluate through require
        if (link.setters) {
            var depLoad, depLink;
            for (var i = 0; i < link.dependencies.length; i++) {
                depLoad = link.dependencyInstantiations[i];

                if (depLoad instanceof ModuleNamespace)
                    continue;

                // custom Module returned from instantiate
                depLink = depLoad.linkRecord;
                if (depLink && seen.indexOf(depLoad) === -1) {
                    if (depLoad.evalError)
                        err = depLoad.evalError;
                    else
                    // dynamic / declarative boundaries clear the "seen" list
                    // we just let cross format circular throw as would happen in real implementations
                        err = doEvaluate(loader, depLoad, depLink, registry, state, depLink.setters ? seen : []);
                }

                if (err) {
                    load.linkRecord = undefined;
                    load.evalError = LoaderError__Check_error_message_for_loader_stack(err, 'Evaluating ' + load.key);
                    return load.evalError;
                }
            }
        }

        // link.execute won't exist for Module returns from instantiate on top-level load
        if (link.execute) {
            // ES System.register execute
            // "this" is null in ES
            if (link.setters) {
                err = declarativeExecute(link.execute);
            }
            // System.registerDynamic execute
            // "this" is "exports" in CJS
            else {
                var module = { id: load.key };
                var moduleObj = link.moduleObj;
                Object.defineProperty(module, 'exports', {
                    configurable: true,
                    set: function (exports) {
                        moduleObj.default = moduleObj.__useDefault = exports;
                    },
                    get: function () {
                        return moduleObj.__useDefault;
                    }
                });

                var require = makeDynamicRequire(loader, load.key, link.dependencies, link.dependencyInstantiations, registry, state, seen);

                // evaluate deps first
                if (!link.executingRequire)
                    for (var i = 0; i < link.dependencies.length; i++)
                        require(link.dependencies[i]);

                err = dynamicExecute(link.execute, require, moduleObj.default, module);

                // pick up defineProperty calls to module.exports when we can
                if (module.exports !== moduleObj.__useDefault)
                    moduleObj.default = moduleObj.__useDefault = module.exports;

                var moduleDefault = moduleObj.default;

                // __esModule flag extension support via lifting
                if (moduleDefault && moduleDefault.__esModule) {
                    for (var p in moduleDefault) {
                        if (Object.hasOwnProperty.call(moduleDefault, p))
                            moduleObj[p] = moduleDefault[p];
                    }
                }
            }
        }

        // dispose link record
        load.linkRecord = undefined;

        if (err)
            return load.evalError = LoaderError__Check_error_message_for_loader_stack(err, 'Evaluating ' + load.key);

        registry[load.key] = load.module = new ModuleNamespace(link.moduleObj);

        // if not an esm module, run importer setters and clear them
        // this allows dynamic modules to update themselves into es modules
        // as soon as execution has completed
        if (!link.setters) {
            if (load.importerSetters)
                for (var i = 0; i < load.importerSetters.length; i++)
                    load.importerSetters[i](load.module);
            load.importerSetters = undefined;
        }
    }

// {} is the closest we can get to call(undefined)
    var nullContext = {};
    if (Object.freeze)
        Object.freeze(nullContext);

    function declarativeExecute (execute) {
        try {
            execute.call(nullContext);
        }
        catch (e) {
            return e;
        }
    }

    function dynamicExecute (execute, require, exports, module) {
        try {
            var output = execute.call(envGlobal, require, exports, module);
            if (output !== undefined)
                module.exports = output;
        }
        catch (e) {
            return e;
        }
    }

    var resolvedPromise = Promise.resolve();
    function noop () {}

    var emptyModule = new ModuleNamespace({});

    function protectedCreateNamespace (bindings) {
        if (bindings instanceof ModuleNamespace)
            return bindings;

        if (bindings && bindings.__esModule)
            return new ModuleNamespace(bindings);

        return new ModuleNamespace({ default: bindings, __useDefault: bindings });
    }

    var hasStringTag;
    function isModule (m) {
        if (hasStringTag === undefined)
            hasStringTag = typeof Symbol !== 'undefined' && !!Symbol.toStringTag;
        return m instanceof ModuleNamespace || hasStringTag && Object.prototype.toString.call(m) == '[object Module]';
    }

    var CONFIG = createSymbol('loader-config');
    var METADATA = createSymbol('metadata');



    var isWorker = typeof window === 'undefined' && typeof self !== 'undefined' && typeof importScripts !== 'undefined';

    function warn (msg, force) {
        if (force || this.warnings && typeof console !== 'undefined' && console.warn)
            console.warn(msg);
    }

    function checkInstantiateWasm (loader, wasmBuffer, processAnonRegister) {
        var bytes = new Uint8Array(wasmBuffer);

        // detect by leading bytes
        // Can be (new Uint32Array(fetched))[0] === 0x6D736100 when working in Node
        if (bytes[0] === 0 && bytes[1] === 97 && bytes[2] === 115) {
            return WebAssembly.compile(wasmBuffer).then(function (m) {
                var deps = [];
                var setters = [];
                var importObj = {};

                // we can only set imports if supported (eg Safari doesnt support)
                if (WebAssembly.Module.imports)
                    WebAssembly.Module.imports(m).forEach(function (i) {
                        var key = i.module;
                        setters.push(function (m) {
                            importObj[key] = m;
                        });
                        if (deps.indexOf(key) === -1)
                            deps.push(key);
                    });
                loader.register(deps, function (_export) {
                    return {
                        setters: setters,
                        execute: function () {
                            _export(new WebAssembly.Instance(m, importObj).exports);
                        }
                    };
                });
                processAnonRegister();

                return true;
            });
        }

        return Promise.resolve(false);
    }

    var parentModuleContext;
    function loadNodeModule (key, baseURL) {
        if (key[0] === '.')
            throw new Error('Node module ' + key + ' can\'t be loaded as it is not a package require.');

        if (!parentModuleContext) {
            var Module = this._nodeRequire('module');
            var base = decodeURI(baseURL.substr(isWindows ? 8 : 7));
            parentModuleContext = new Module(base);
            parentModuleContext.paths = Module._nodeModulePaths(base);
        }
        return parentModuleContext.require(key);
    }

    function extend (a, b) {
        for (var p in b) {
            if (!Object.hasOwnProperty.call(b, p))
                continue;
            a[p] = b[p];
        }
        return a;
    }

    function prepend (a, b) {
        for (var p in b) {
            if (!Object.hasOwnProperty.call(b, p))
                continue;
            if (a[p] === undefined)
                a[p] = b[p];
        }
        return a;
    }

// meta first-level extends where:
// array + array appends
// object + object extends
// other properties replace
    function extendMeta (a, b, _prepend) {
        for (var p in b) {
            if (!Object.hasOwnProperty.call(b, p))
                continue;
            var val = b[p];
            if (a[p] === undefined)
                a[p] = val;
            else if (val instanceof Array && a[p] instanceof Array)
                a[p] = [].concat(_prepend ? val : a[p]).concat(_prepend ? a[p] : val);
            else if (typeof val == 'object' && val !== null && typeof a[p] == 'object')
                a[p] = (_prepend ? prepend : extend)(extend({}, a[p]), val);
            else if (!_prepend)
                a[p] = val;
        }
    }

    var supportsPreload = false;
    var supportsPrefetch = false;
    if (isBrowser)
        (function () {
            var relList = document.createElement('link').relList;
            if (relList && relList.supports) {
                supportsPrefetch = true;
                try {
                    supportsPreload = relList.supports('preload');
                }
                catch (e) {}
            }
        })();

    function preloadScript (url) {
        // fallback to old fashioned image technique which still works in safari
        if (!supportsPreload && !supportsPrefetch) {
            var preloadImage = new Image();
            preloadImage.src = url;
            return;
        }

        var link = document.createElement('link');
        if (supportsPreload) {
            link.rel = 'preload';
            link.as = 'script';
        }
        else {
            // this works for all except Safari (detected by relList.supports lacking)
            link.rel = 'prefetch';
        }
        link.href = url;
        document.head.appendChild(link);
    }

    function workerImport (src, resolve, reject) {
        try {
            importScripts(src);
        }
        catch (e) {
            reject(e);
        }
        resolve();
    }

    if (isBrowser) {
        var loadingScripts = [];
        var onerror = window.onerror;
        window.onerror = function globalOnerror (msg, src) {
            for (var i = 0; i < loadingScripts.length; i++) {
                if (loadingScripts[i].src !== src)
                    continue;
                loadingScripts[i].err(msg);
                return;
            }
            if (onerror)
                onerror.apply(this, arguments);
        };
    }

    function scriptLoad (src, crossOrigin, integrity, resolve, reject) {
        // percent encode just "#" for HTTP requests
        src = src.replace(/#/g, '%23');

        // subresource integrity is not supported in web workers
        if (isWorker)
            return workerImport(src, resolve, reject);

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.async = true;

        if (crossOrigin)
            script.crossOrigin = crossOrigin;
        if (integrity)
            script.integrity = integrity;

        script.addEventListener('load', load, false);
        script.addEventListener('error', error, false);

        script.src = src;
        document.head.appendChild(script);

        function load () {
            resolve();
            cleanup();
        }

        // note this does not catch execution errors
        function error (err) {
            cleanup();
            reject(new Error('Fetching ' + src));
        }

        function cleanup () {
            for (var i = 0; i < loadingScripts.length; i++) {
                if (loadingScripts[i].err === error) {
                    loadingScripts.splice(i, 1);
                    break;
                }
            }
            script.removeEventListener('load', load, false);
            script.removeEventListener('error', error, false);
            document.head.removeChild(script);
        }
    }

    function readMemberExpression (p, value) {
        var pParts = p.split('.');
        while (pParts.length)
            value = value[pParts.shift()];
        return value;
    }

// separate out paths cache as a baseURL lock process
    function applyPaths (baseURL, paths, key) {
        // console.log('applyPaths', {key});
        var mapMatch = getMapMatch(paths, key);
        if (mapMatch) {
            var target = paths[mapMatch] + key.substr(mapMatch.length);

            var resolved = resolveIfNotPlain(target, baseURI);
            if (resolved !== undefined)
                return resolved;

            return baseURL + target;
        }
        else if (key.indexOf(':') !== -1) {
            return key;
        }
        else {
            return baseURL + key;
        }
    }

    function checkMap (p) {
        var name = this.name;
        // can add ':' here if we want paths to match the behaviour of map
        if (name.substr(0, p.length) === p && (name.length === p.length || name[p.length] === '/' || p[p.length - 1] === '/' || p[p.length - 1] === ':')) {
            var curLen = p.split('/').length;
            if (curLen > this.len) {
                this.match = p;
                this.len = curLen;
            }
        }
    }

    function getMapMatch (map, name) {
        if (Object.hasOwnProperty.call(map, name))
            return name;

        var bestMatch = {
            name: name,
            match: undefined,
            len: 0
        };

        Object.keys(map).forEach(checkMap, bestMatch);

        return bestMatch.match;
    }

// RegEx adjusted from https://github.com/jbrantly/yabble/blob/master/lib/yabble.js#L339
    var cjsRequireRegEx = /(?:^\uFEFF?|[^$_a-zA-Z\xA0-\uFFFF."'])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)\s*\)/g;

    function rawFetch (url, authorization, integrity, asBuffer) {
        // fetch doesn't support file:/// urls
        if (url.substr(0, 8) === 'file:///') {
            if (hasXhr)
                return resolvedPromise.then(() => url);
            else
                throw new Error('Unable to fetch file URLs in this environment.');
        }

        // percent encode just "#" for HTTP requests
        url = url.replace(/#/g, '%23');

        var opts = {
            // NB deprecate
            headers: { Accept: 'application/x-es-module, */*' }
        };

        if (integrity)
            opts.integrity = integrity;

        if (authorization) {
            if (typeof authorization == 'string')
                opts.headers['Authorization'] = authorization;
            opts.credentials = 'include';
        }

        return fetch(url, opts)
            .then(function(res) {
                if (res.ok)
                    return res.url;
                else
                    throw new Error('Fetch error: ' + res.status + ' ' + res.statusText);
            });
    }

    /*
     * Source loading
     */
    function fetchFetch (url, authorization, integrity, asBuffer) {
        if (System.fs && System.fs[url]) {
            return System.fs[url];
        }

        // fetch doesn't support file:/// urls
        if (url.substr(0, 8) === 'file:///') {
            if (hasXhr)
                return xhrFetch(url, authorization, integrity, asBuffer);
            else
                throw new Error('Unable to fetch file URLs in this environment.');
        }

        // percent encode just "#" for HTTP requests
        url = url.replace(/#/g, '%23');

        var opts = {
            // NB deprecate
            headers: { Accept: 'application/x-es-module, */*' }
        };

        if (integrity)
            opts.integrity = integrity;

        if (authorization) {
            if (typeof authorization == 'string')
                opts.headers['Authorization'] = authorization;
            opts.credentials = 'include';
        }

        return fetch(url, opts)
            .then(function(res) {
                if (res.ok)
                    return asBuffer ? res.arrayBuffer() : res.text();
                else
                    throw new Error(`Fetch error (${url}): ` + res.status + ' ' + res.statusText);
            });
    }

    function xhrFetch (url, authorization, integrity, asBuffer) {
        return new Promise(function (resolve, reject) {
            // percent encode just "#" for HTTP requests
            url = url.replace(/#/g, '%23');

            var xhr = new XMLHttpRequest();
            if (asBuffer)
                xhr.responseType = 'arraybuffer';
            function load() {
                resolve(asBuffer ? xhr.response : xhr.responseText);
            }
            function error() {
                reject(new Error('XHR error: ' + (xhr.status ? ' (' + xhr.status + (xhr.statusText ? ' ' + xhr.statusText  : '') + ')' : '') + ' loading ' + url));
            }

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    // in Chrome on file:/// URLs, status is 0
                    if (xhr.status == 0) {
                        if (xhr.response) {
                            load();
                        }
                        else {
                            // when responseText is empty, wait for load or error event
                            // to inform if it is a 404 or empty file
                            xhr.addEventListener('error', error);
                            xhr.addEventListener('load', load);
                        }
                    }
                    else if (xhr.status === 200) {
                        load();
                    }
                    else {
                        error();
                    }
                }
            };
            xhr.open("GET", url, true);

            if (xhr.setRequestHeader) {
                xhr.setRequestHeader('Accept', 'application/x-es-module, */*');
                // can set "authorization: true" to enable withCredentials only
                if (authorization) {
                    if (typeof authorization == 'string')
                        xhr.setRequestHeader('Authorization', authorization);
                    xhr.withCredentials = true;
                }
            }

            xhr.send(null);
        });
    }

    var fs;
    function nodeFetch (url, authorization, integrity, asBuffer) {
        if (url.substr(0, 8) != 'file:///')
            return Promise.reject(new Error('Unable to fetch "' + url + '". Only file URLs of the form file:/// supported running in Node.'));

        fs = fs || require('fs');
        if (isWindows)
            url = url.replace(/\//g, '\\').substr(8);
        else
            url = url.substr(7);

        return new Promise(function (resolve, reject) {
            fs.readFile(url, function(err, data) {
                if (err) {
                    return reject(err);
                }
                else {
                    if (asBuffer) {
                        resolve(data);
                    }
                    else {
                        // Strip Byte Order Mark out if it's the leading char
                        var dataString = data + '';
                        if (dataString[0] === '\ufeff')
                            dataString = dataString.substr(1);

                        resolve(dataString);
                    }
                }
            });
        });
    }

    function noFetch () {
        throw new Error('No fetch method is defined for this environment.');
    }

    var fetchFunction;

    var hasXhr = typeof XMLHttpRequest !== 'undefined';

    if (typeof self !== 'undefined' && typeof self.fetch !== 'undefined')
        fetchFunction = fetchFetch;
    else if (hasXhr)
        fetchFunction = xhrFetch;
    else if (typeof require !== 'undefined' && typeof process !== 'undefined')
        fetchFunction = nodeFetch;
    else
        fetchFunction = noFetch;

    var fetch$1 = fetchFunction;

    function createMetadata () {
        return {
            pluginKey: undefined,
            pluginArgument: undefined,
            pluginModule: undefined,
            packageKey: undefined,
            packageConfig: undefined,
            load: undefined
        };
    }

    function getParentMetadata (loader, config, parentKey) {
        var parentMetadata = createMetadata();

        if (parentKey) {
            // detect parent plugin
            // we just need pluginKey to be truthy for package configurations
            // so we duplicate it as pluginArgument - although not correct its not used
            var parentPluginIndex;
            if (config.pluginFirst) {
                if ((parentPluginIndex = parentKey.lastIndexOf('!')) !== -1)
                    parentMetadata.pluginArgument = parentMetadata.pluginKey = parentKey.substr(0, parentPluginIndex);
            }
            else {
                if ((parentPluginIndex = parentKey.indexOf('!')) !== -1)
                    parentMetadata.pluginArgument = parentMetadata.pluginKey = parentKey.substr(parentPluginIndex + 1);
            }

            // detect parent package
            parentMetadata.packageKey = getMapMatch(config.packages, parentKey);
            if (parentMetadata.packageKey)
                parentMetadata.packageConfig = config.packages[parentMetadata.packageKey];
        }

        return parentMetadata;
    }

    function normalize (key, parentKey) {
        var config = this[CONFIG];

        var metadata = createMetadata();
        var parentMetadata = getParentMetadata(this, config, parentKey);

        var loader = this;

        // console.log('normalizing', {key, parentKey});

        return Promise.resolve()

        // boolean conditional
            .then(function () {
                // first we normalize the conditional
                var booleanIndex = key.lastIndexOf('#?');

                if (booleanIndex === -1)
                    return Promise.resolve(key);

                var conditionObj = parseCondition.call(loader, key.substr(booleanIndex + 2));

                // in builds, return normalized conditional
                /*if (this.builder)
                  return this.resolve(conditionObj.module, parentKey)
                  .then(function (conditionModule) {
                    conditionObj.module = conditionModule;
                    return key.substr(0, booleanIndex) + '#?' + serializeCondition(conditionObj);
                  });*/

                return resolveCondition.call(loader, conditionObj, parentKey, true)
                    .then(function (conditionValue) {
                        return conditionValue ? key.substr(0, booleanIndex) : '@empty';
                    });
            })

            // plugin
            .then(function (key) {
                var parsed = parsePlugin(config.pluginFirst, key);

                if (!parsed)
                    return packageResolve.call(loader, config, key, parentMetadata && parentMetadata.pluginArgument || parentKey, metadata, parentMetadata, false);

                metadata.pluginKey = parsed.plugin;

                return Promise.all([
                    packageResolve.call(loader, config, parsed.argument, parentMetadata && parentMetadata.pluginArgument || parentKey, metadata, parentMetadata, true),
                    loader.resolve(parsed.plugin, parentKey)
                ])
                    .then(function (normalized) {
                        metadata.pluginArgument = normalized[0];
                        metadata.pluginKey = normalized[1];

                        // don't allow a plugin to load itself
                        if (metadata.pluginArgument === metadata.pluginKey)
                            throw new Error('Plugin ' + metadata.pluginArgument + ' cannot load itself, make sure it is excluded from any wildcard meta configuration via a custom loader: false rule.');

                        return combinePluginParts(config.pluginFirst, normalized[0], normalized[1]);
                    });
            })
            .then(function (normalized) {
                // console.log('normalized', {key, parentKey, normalized});

                return interpolateConditional.call(loader, normalized, parentKey, parentMetadata);
            })
            .then(function (normalized) {
                setMeta.call(loader, config, normalized, metadata);

                if (metadata.pluginKey || !metadata.load.loader)
                    return normalized;

                // loader by configuration
                // normalizes to parent to support package loaders
                return loader.resolve(metadata.load.loader, normalized)
                    .then(function (pluginKey) {
                        metadata.pluginKey = pluginKey;
                        metadata.pluginArgument = normalized;
                        return normalized;
                    });
            })
            .then(function (normalized) {
                loader[METADATA][normalized] = metadata;
                return normalized;
            });
    }

// normalization function used for registry keys
// just does coreResolve without map
    function decanonicalize (config, key) {
        var parsed = parsePlugin(config.pluginFirst, key);

        // plugin
        if (parsed) {
            var pluginKey = decanonicalize.call(this, config, parsed.plugin);
            return combinePluginParts(config.pluginFirst, coreResolve.call(this, config, parsed.argument, undefined, false, false), pluginKey);
        }

        return coreResolve.call(this, config, key, undefined, false, false);
    }

    function normalizeSync (key, parentKey) {
        var config = this[CONFIG];

        // normalizeSync is metadataless, so create metadata
        var metadata = createMetadata();
        var parentMetadata = parentMetadata || getParentMetadata(this, config, parentKey);

        var parsed = parsePlugin(config.pluginFirst, key);

        // plugin
        if (parsed) {
            metadata.pluginKey = normalizeSync.call(this, parsed.plugin, parentKey);
            return combinePluginParts(config.pluginFirst,
                packageResolveSync.call(this, config, parsed.argument, parentMetadata.pluginArgument || parentKey, metadata, parentMetadata, !!metadata.pluginKey),
                metadata.pluginKey);
        }

        return packageResolveSync.call(this, config, key, parentMetadata.pluginArgument || parentKey, metadata, parentMetadata, !!metadata.pluginKey);
    }

    function coreResolve (config, key, parentKey, doMap, packageName) {
        var relativeResolved = resolveIfNotPlain(key, parentKey || baseURI);

        // standard URL resolution
        if (relativeResolved)
            return applyPaths(config.baseURL, config.paths, relativeResolved);

        // plain keys not starting with './', 'x://' and '/' go through custom resolution
        if (doMap) {
            var mapMatch = getMapMatch(config.map, key);

            if (mapMatch) {
                key = config.map[mapMatch] + key.substr(mapMatch.length);

                relativeResolved = resolveIfNotPlain(key, baseURI);
                if (relativeResolved)
                    return applyPaths(config.baseURL, config.paths, relativeResolved);
            }
        }

        if (this.registry.has(key))
            return key;

        if (key.substr(0, 6) === '@node/')
            return key;

        var trailingSlash = packageName && key[key.length - 1] !== '/';
        var resolved = applyPaths(config.baseURL, config.paths, trailingSlash ? key + '/' : key);
        if (trailingSlash)
            return resolved.substr(0, resolved.length - 1);
        return resolved;
    }

    function packageResolveSync (config, key, parentKey, metadata, parentMetadata, skipExtensions) {
        // ignore . since internal maps handled by standard package resolution
        if (parentMetadata && parentMetadata.packageConfig && key[0] !== '.') {
            var parentMap = parentMetadata.packageConfig.map;
            var parentMapMatch = parentMap && getMapMatch(parentMap, key);

            if (parentMapMatch && typeof parentMap[parentMapMatch] === 'string') {
                var mapped = doMapSync(this, config, parentMetadata.packageConfig, parentMetadata.packageKey, parentMapMatch, key, metadata, skipExtensions);
                if (mapped)
                    return mapped;
            }
        }

        var normalized = coreResolve.call(this, config, key, parentKey, true, true);

        var pkgConfigMatch = getPackageConfigMatch(config, normalized);
        metadata.packageKey = pkgConfigMatch && pkgConfigMatch.packageKey || getMapMatch(config.packages, normalized);

        if (!metadata.packageKey)
            return normalized;

        if (config.packageConfigKeys.indexOf(normalized) !== -1) {
            metadata.packageKey = undefined;
            return normalized;
        }

        metadata.packageConfig = config.packages[metadata.packageKey] || (config.packages[metadata.packageKey] = createPackage());

        var subPath = normalized.substr(metadata.packageKey.length + 1);

        return applyPackageConfigSync(this, config, metadata.packageConfig, metadata.packageKey, subPath, metadata, skipExtensions);
    }

    function packageResolve (config, key, parentKey, metadata, parentMetadata, skipExtensions) {
        var loader = this;

        return resolvedPromise
            .then(function () {
                // ignore . since internal maps handled by standard package resolution
                if (parentMetadata && parentMetadata.packageConfig && key.substr(0, 2) !== './') {
                    var parentMap = parentMetadata.packageConfig.map;
                    var parentMapMatch = parentMap && getMapMatch(parentMap, key);

                    if (parentMapMatch)
                        return doMap(loader, config, parentMetadata.packageConfig, parentMetadata.packageKey, parentMapMatch, key, metadata, skipExtensions);
                }

                return resolvedPromise;
            })
            // .then(function (mapped) {
            //     if (mapped)
            //         return mapped;
            //
            //     // apply map, core, paths, contextual package map
            //     var normalized = coreResolve.call(loader, config, key, parentKey, true, true);
            //
            // })
            .then(function (mapped) {
                if (mapped)
                    return mapped;

                // apply map, core, paths, contextual package map
                var normalized = coreResolve.call(loader, config, key, parentKey, true, true);

                var pkgConfigMatch = getPackageConfigMatch(config, normalized);
                metadata.packageKey = pkgConfigMatch && pkgConfigMatch.packageKey || getMapMatch(config.packages, normalized);

                if (!metadata.packageKey)
                    return Promise.resolve(normalized);

                if (config.packageConfigKeys.indexOf(normalized) !== -1) {
                    metadata.packageKey = undefined;
                    metadata.load = createMeta();
                    metadata.load.format = 'json';
                    // ensure no loader
                    metadata.load.loader = '';
                    return Promise.resolve(normalized);
                }

                metadata.packageConfig = config.packages[metadata.packageKey] || (config.packages[metadata.packageKey] = createPackage());

                // load configuration when it matches packageConfigPaths, not already configured, and not the config itself
                var loadConfig = pkgConfigMatch && !metadata.packageConfig.configured;

                return (loadConfig ? loadPackageConfigPath(loader, config, pkgConfigMatch.configPath, metadata) : resolvedPromise)
                    .then(function () {
                        var subPath = normalized.substr(metadata.packageKey.length + 1);

                        return applyPackageConfig(loader, config, metadata.packageConfig, metadata.packageKey, subPath, metadata, skipExtensions);
                    });
            })
            .then(normalized => {
                return normalized;

                // The following is maybe maybe not necessary?  Dunno :-/  But adding rawFetch here
                // makes resolution async, which messes up the order in which dependencies are
                // loaded.

                if (normalized === 'https://unpkg.com/babel-runtime@6.26.0/core-js/symbol') {
                    return 'https://unpkg.com/babel-runtime@6.26.0/core-js/symbol.js';
                }
                if (normalized.startsWith("https://unpkg.com/dom-helpers/")) {
                    normalized = "https://unpkg.com/dom-helpers/cjs/" + normalized.split("/")[normalized.split("/").length - 1];
                }
                // return normalized;
                if (normalized.search(/getlibs|tsx|cdn|@babel|https:\/\/unpkg.com\/json/)>=0) {
                    return normalized;
                }
                if (normalized.startsWith('https://unpkg.com/core-js') && !normalized.startsWith('https://unpkg.com/core-js@')) {
                    normalized = normalized.replace('https://unpkg.com/core-js', 'https://unpkg.com/core-js@2.6.4')
                }
                normalized = normalized.replace(/\/$/, '');
                if (cached[normalized]) return cached[normalized];
                // console.log('rawFetch', {key, normalized});
                return rawFetch(normalized, undefined, undefined, false).then(url => {
                    // console.log('rawFetched', {key, normalized, url});
                    if (normalized !== url) {
                        console.log("RAW FETCH CONVERTED:", normalized, url);
                    }
                    if (url.includes("jss-plugin")) {
                        url = url.replace(".bundle.js", ".cjs.js");
                    }
                    cached[normalized] = url;
                    return url;
                });
            });
    }

    function createMeta () {
        return {
            extension: '',
            deps: undefined,
            format: undefined,
            loader: undefined,
            scriptLoad: undefined,
            globals: undefined,
            nonce: undefined,
            integrity: undefined,
            sourceMap: undefined,
            exports: undefined,
            encapsulateGlobal: false,
            crossOrigin: undefined,
            cjsRequireDetection: true,
            cjsDeferDepsExecute: false,
            esModule: false
        };
    }

    function setMeta (config, key, metadata) {
        metadata.load = metadata.load || createMeta();

        // apply wildcard metas
        var bestDepth = 0;
        var wildcardIndex;
        for (var module in config.meta) {
            wildcardIndex = module.indexOf('*');
            if (wildcardIndex === -1)
                continue;
            if (module.substr(0, wildcardIndex) === key.substr(0, wildcardIndex)
                && module.substr(wildcardIndex + 1) === key.substr(key.length - module.length + wildcardIndex + 1)) {
                var depth = module.split('/').length;
                if (depth > bestDepth)
                    bestDepth = depth;
                extendMeta(metadata.load, config.meta[module], bestDepth !== depth);
            }
        }

        // apply exact meta
        if (config.meta[key])
            extendMeta(metadata.load, config.meta[key], false);

        // apply package meta
        if (metadata.packageKey) {
            var subPath = key.substr(metadata.packageKey.length + 1);

            var meta = {};
            if (metadata.packageConfig.meta) {
                var bestDepth = 0;
                getMetaMatches(metadata.packageConfig.meta, subPath, function (metaPattern, matchMeta, matchDepth) {
                    if (matchDepth > bestDepth)
                        bestDepth = matchDepth;
                    extendMeta(meta, matchMeta, matchDepth && bestDepth > matchDepth);
                });

                extendMeta(metadata.load, meta, false);
            }

            // format
            if (metadata.packageConfig.format && !metadata.pluginKey && !metadata.load.loader)
                metadata.load.format = metadata.load.format || metadata.packageConfig.format;
        }
    }

    function parsePlugin (pluginFirst, key) {
        var argumentKey;
        var pluginKey;

        var pluginIndex = pluginFirst ? key.indexOf('!') : key.lastIndexOf('!');

        if (pluginIndex === -1)
            return;

        if (pluginFirst) {
            argumentKey = key.substr(pluginIndex + 1);
            pluginKey = key.substr(0, pluginIndex);
        }
        else {
            argumentKey = key.substr(0, pluginIndex);
            pluginKey = key.substr(pluginIndex + 1) || argumentKey.substr(argumentKey.lastIndexOf('.') + 1);
        }

        return {
            argument: argumentKey,
            plugin: pluginKey
        };
    }

// put key back together after parts have been normalized
    function combinePluginParts (pluginFirst, argumentKey, pluginKey) {
        if (pluginFirst)
            return pluginKey + '!' + argumentKey;
        else
            return argumentKey + '!' + pluginKey;
    }

    /*
     * Package Configuration Extension
     *
     * Example:
     *
     * SystemJS.packages = {
     *   jquery: {
     *     main: 'index.js', // when not set, package key is requested directly
     *     format: 'amd',
     *     defaultExtension: 'ts', // defaults to 'js', can be set to false
     *     modules: {
     *       '*.ts': {
     *         loader: 'typescript'
     *       },
     *       'vendor/sizzle.js': {
     *         format: 'global'
     *       }
     *     },
     *     map: {
     *        // map internal require('sizzle') to local require('./vendor/sizzle')
     *        sizzle: './vendor/sizzle.js',
     *        // map any internal or external require of 'jquery/vendor/another' to 'another/index.js'
     *        './vendor/another.js': './another/index.js',
     *        // test.js / test -> lib/test.js
     *        './test.js': './lib/test.js',
     *
     *        // environment-specific map configurations
     *        './index.js': {
     *          '~browser': './index-node.js',
     *          './custom-condition.js|~export': './index-custom.js'
     *        }
     *     },
     *     // allows for setting package-prefixed depCache
     *     // keys are normalized module keys relative to the package itself
     *     depCache: {
     *       // import 'package/index.js' loads in parallel package/lib/test.js,package/vendor/sizzle.js
     *       './index.js': ['./test'],
     *       './test.js': ['external-dep'],
     *       'external-dep/path.js': ['./another.js']
     *     }
     *   }
     * };
     *
     * Then:
     *   import 'jquery'                       -> jquery/index.js
     *   import 'jquery/submodule'             -> jquery/submodule.js
     *   import 'jquery/submodule.ts'          -> jquery/submodule.ts loaded as typescript
     *   import 'jquery/vendor/another'        -> another/index.js
     *
     * Detailed Behaviours
     * - main can have a leading "./" can be added optionally
     * - map and defaultExtension are applied to the main
     * - defaultExtension adds the extension only if the exact extension is not present

     * - if a meta value is available for a module, map and defaultExtension are skipped
     * - like global map, package map also applies to subpaths (sizzle/x, ./vendor/another/sub)
     * - condition module map is '@env' module in package or '@system-env' globally
     * - map targets support conditional interpolation ('./x': './x.#{|env}.js')
     * - internal package map targets cannot use boolean conditionals
     *
     * Package Configuration Loading
     *
     * Not all packages may already have their configuration present in the System config
     * For these cases, a list of packageConfigPaths can be provided, which when matched against
     * a request, will first request a ".json" file by the package key to derive the package
     * configuration from. This allows dynamic loading of non-predetermined code, a key use
     * case in SystemJS.
     *
     * Example:
     *
     *   SystemJS.packageConfigPaths = ['packages/test/package.json', 'packages/*.json'];
     *
     *   // will first request 'packages/new-package/package.json' for the package config
     *   // before completing the package request to 'packages/new-package/path'
     *   SystemJS.import('packages/new-package/path');
     *
     *   // will first request 'packages/test/package.json' before the main
     *   SystemJS.import('packages/test');
     *
     * When a package matches packageConfigPaths, it will always send a config request for
     * the package configuration.
     * The package key itself is taken to be the match up to and including the last wildcard
     * or trailing slash.
     * The most specific package config path will be used.
     * Any existing package configurations for the package will deeply merge with the
     * package config, with the existing package configurations taking preference.
     * To opt-out of the package configuration request for a package that matches
     * packageConfigPaths, use the { configured: true } package config option.
     *
     */

    function addDefaultExtension (config, pkg, pkgKey, subPath, skipExtensions) {
        // don't apply extensions to folders or if defaultExtension = false
        if (!subPath || !pkg.defaultExtension || subPath[subPath.length - 1] === '/' || skipExtensions)
            return subPath;

        var metaMatch = false;

        // exact meta or meta with any content after the last wildcard skips extension
        if (pkg.meta)
            getMetaMatches(pkg.meta, subPath, function (metaPattern, matchMeta, matchDepth) {
                if (matchDepth === 0 || metaPattern.lastIndexOf('*') !== metaPattern.length - 1)
                    return metaMatch = true;
            });

        // exact global meta or meta with any content after the last wildcard skips extension
        if (!metaMatch && config.meta)
            getMetaMatches(config.meta, pkgKey + '/' + subPath, function (metaPattern, matchMeta, matchDepth) {
                if (matchDepth === 0 || metaPattern.lastIndexOf('*') !== metaPattern.length - 1)
                    return metaMatch = true;
            });

        if (metaMatch)
            return subPath;

        // work out what the defaultExtension is and add if not there already
        var defaultExtension = '.' + pkg.defaultExtension;
        if (subPath.substr(subPath.length - defaultExtension.length) !== defaultExtension)
            return subPath + defaultExtension;
        else
            return subPath;
    }

    function applyPackageConfigSync (loader, config, pkg, pkgKey, subPath, metadata, skipExtensions) {
        // main
        if (!subPath) {
            if (pkg.main)
                subPath = pkg.main.substr(0, 2) === './' ? pkg.main.substr(2) : pkg.main;
            else
            // also no submap if key is package itself (import 'pkg' -> 'path/to/pkg.js')
            // NB can add a default package main convention here
            // if it becomes internal to the package then it would no longer be an exit path
                return pkgKey;
        }

        // map config checking without then with extensions
        if (pkg.map) {
            var mapPath = './' + subPath;

            var mapMatch = getMapMatch(pkg.map, mapPath);

            // we then check map with the default extension adding
            if (!mapMatch) {
                mapPath = './' + addDefaultExtension(config, pkg, pkgKey, subPath, skipExtensions);
                if (mapPath !== './' + subPath)
                    mapMatch = getMapMatch(pkg.map, mapPath);
            }
            if (mapMatch) {
                var mapped = doMapSync(loader, config, pkg, pkgKey, mapMatch, mapPath, metadata, skipExtensions);
                if (mapped)
                    return mapped;
            }
        }

        // normal package resolution
        return pkgKey + '/' + addDefaultExtension(config, pkg, pkgKey, subPath, skipExtensions);
    }

    function validMapping (mapMatch, mapped, path) {
        // allow internal ./x -> ./x/y or ./x/ -> ./x/y recursive maps
        // but only if the path is exactly ./x and not ./x/z
        if (mapped.substr(0, mapMatch.length) === mapMatch && path.length > mapMatch.length)
            return false;

        return true;
    }

    function doMapSync (loader, config, pkg, pkgKey, mapMatch, path, metadata, skipExtensions) {
        if (path[path.length - 1] === '/')
            path = path.substr(0, path.length - 1);
        var mapped = pkg.map[mapMatch];

        if (typeof mapped === 'object')
            throw new Error('Synchronous conditional normalization not supported sync normalizing ' + mapMatch + ' in ' + pkgKey);

        if (!validMapping(mapMatch, mapped, path) || typeof mapped !== 'string')
            return;

        return packageResolveSync.call(loader, config, mapped + path.substr(mapMatch.length), pkgKey + '/', metadata, metadata, skipExtensions);
    }

    function applyPackageConfig (loader, config, pkg, pkgKey, subPath, metadata, skipExtensions) {
        // main
        if (!subPath) {
            if (pkg.main)
                subPath = pkg.main.substr(0, 2) === './' ? pkg.main.substr(2) : pkg.main;
            // also no submap if key is package itself (import 'pkg' -> 'path/to/pkg.js')
            else
            // NB can add a default package main convention here
            // if it becomes internal to the package then it would no longer be an exit path
                return Promise.resolve(pkgKey);
        }

        // map config checking without then with extensions
        var mapPath, mapMatch;

        if (pkg.map) {
            mapPath = './' + subPath;
            mapMatch = getMapMatch(pkg.map, mapPath);

            // we then check map with the default extension adding
            if (!mapMatch) {
                mapPath = './' + addDefaultExtension(config, pkg, pkgKey, subPath, skipExtensions);
                if (mapPath !== './' + subPath)
                    mapMatch = getMapMatch(pkg.map, mapPath);
            }
        }

        return (mapMatch ? doMap(loader, config, pkg, pkgKey, mapMatch, mapPath, metadata, skipExtensions) : resolvedPromise)
            .then(function (mapped) {
                if (mapped)
                    return Promise.resolve(mapped);

                // normal package resolution / fallback resolution for no conditional match
                return Promise.resolve(pkgKey + '/' + addDefaultExtension(config, pkg, pkgKey, subPath, skipExtensions));
            });
    }

    function doMap (loader, config, pkg, pkgKey, mapMatch, path, metadata, skipExtensions) {
        if (path[path.length - 1] === '/')
            path = path.substr(0, path.length - 1);

        var mapped = pkg.map[mapMatch];

        if (typeof mapped === 'string') {
            if (!validMapping(mapMatch, mapped, path))
                return resolvedPromise;
            return packageResolve.call(loader, config, mapped + path.substr(mapMatch.length), pkgKey + '/', metadata, metadata, skipExtensions)
                .then(function (normalized) {
                    return interpolateConditional.call(loader, normalized, pkgKey + '/', metadata);
                });
        }

        // we use a special conditional syntax to allow the builder to handle conditional branch points further
        /*if (loader.builder)
          return Promise.resolve(pkgKey + '/#:' + path);*/

        // we load all conditions upfront
        var conditionPromises = [];
        var conditions = [];
        for (var e in mapped) {
            var c = parseCondition(e);
            conditions.push({
                condition: c,
                map: mapped[e]
            });
            conditionPromises.push(RegisterLoader$1.prototype.import.call(loader, c.module, pkgKey));
        }

        // map object -> conditional map
        return Promise.all(conditionPromises)
            .then(function (conditionValues) {
                // first map condition to match is used
                for (var i = 0; i < conditions.length; i++) {
                    var c = conditions[i].condition;
                    var value = readMemberExpression(c.prop, '__useDefault' in conditionValues[i] ? conditionValues[i].__useDefault : conditionValues[i]);
                    if (!c.negate && value || c.negate && !value)
                        return conditions[i].map;
                }
            })
            .then(function (mapped) {
                if (mapped) {
                    if (!validMapping(mapMatch, mapped, path))
                        return resolvedPromise;
                    return packageResolve.call(loader, config, mapped + path.substr(mapMatch.length), pkgKey + '/', metadata, metadata, skipExtensions)
                        .then(function (normalized) {
                            return interpolateConditional.call(loader, normalized, pkgKey + '/', metadata);
                        });
                }

                // no environment match -> fallback to original subPath by returning undefined
            });
    }

// check if the given normalized key matches a packageConfigPath
// if so, loads the config
    var packageConfigPaths = {};

// data object for quick checks against package paths
    function createPkgConfigPathObj (path) {
        var lastWildcard = path.lastIndexOf('*');
        var length = Math.max(lastWildcard + 1, path.lastIndexOf('/'));
        return {
            length: length,
            regEx: new RegExp('^(' + path.substr(0, length).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^\\/]+') + ')(\\/|$)'),
            wildcard: lastWildcard !== -1
        };
    }

// most specific match wins
    function getPackageConfigMatch (config, normalized) {
        var pkgKey, exactMatch = false, configPath;
        for (var i = 0; i < config.packageConfigPaths.length; i++) {
            var packageConfigPath = config.packageConfigPaths[i];
            var p = packageConfigPaths[packageConfigPath] || (packageConfigPaths[packageConfigPath] = createPkgConfigPathObj(packageConfigPath));
            if (normalized.length < p.length)
                continue;
            var match = normalized.match(p.regEx);
            if (match && (!pkgKey || (!(exactMatch && p.wildcard) && pkgKey.length < match[1].length))) {
                pkgKey = match[1];
                exactMatch = !p.wildcard;
                configPath = pkgKey + packageConfigPath.substr(p.length);
            }
        }

        if (!pkgKey)
            return;

        return {
            packageKey: pkgKey,
            configPath: configPath
        };
    }

    function loadPackageConfigPath (loader, config, pkgConfigPath, metadata, normalized) {
        var configLoader = loader.pluginLoader || loader;

        // ensure we note this is a package config file path
        // it will then be skipped from getting other normalizations itself to ensure idempotency
        if (config.packageConfigKeys.indexOf(pkgConfigPath) === -1)
            config.packageConfigKeys.push(pkgConfigPath);

        return configLoader.import(pkgConfigPath)
            .then(function (pkgConfig) {
                setPkgConfig(metadata.packageConfig, pkgConfig, metadata.packageKey, true, config);
                metadata.packageConfig.configured = true;
            })
            .catch(function (err) {
                throw LoaderError__Check_error_message_for_loader_stack(err, 'Unable to fetch package configuration file ' + pkgConfigPath);
            });
    }

    function getMetaMatches (pkgMeta, subPath, matchFn) {
        // wildcard meta
        var wildcardIndex;
        for (var module in pkgMeta) {
            // allow meta to start with ./ for flexibility
            var dotRel = module.substr(0, 2) === './' ? './' : '';
            if (dotRel)
                module = module.substr(2);

            wildcardIndex = module.indexOf('*');
            if (wildcardIndex === -1)
                continue;

            if (module.substr(0, wildcardIndex) === subPath.substr(0, wildcardIndex)
                && module.substr(wildcardIndex + 1) === subPath.substr(subPath.length - module.length + wildcardIndex + 1)) {
                // alow match function to return true for an exit path
                if (matchFn(module, pkgMeta[dotRel + module], module.split('/').length))
                    return;
            }
        }
        // exact meta
        var exactMeta = pkgMeta[subPath] && Object.hasOwnProperty.call(pkgMeta, subPath) ? pkgMeta[subPath] : pkgMeta['./' + subPath];
        if (exactMeta)
            matchFn(exactMeta, exactMeta, 0);
    }


    /*
     * Conditions Extension
     *
     *   Allows a condition module to alter the resolution of an import via syntax:
     *
     *     import $ from 'jquery/#{browser}';
     *
     *   Will first load the module 'browser' via `SystemJS.import('browser')` and
     *   take the default export of that module.
     *   If the default export is not a string, an error is thrown.
     *
     *   We then substitute the string into the require to get the conditional resolution
     *   enabling environment-specific variations like:
     *
     *     import $ from 'jquery/ie'
     *     import $ from 'jquery/firefox'
     *     import $ from 'jquery/chrome'
     *     import $ from 'jquery/safari'
     *
     *   It can be useful for a condition module to define multiple conditions.
     *   This can be done via the `|` modifier to specify an export member expression:
     *
     *     import 'jquery/#{./browser.js|grade.version}'
     *
     *   Where the `grade` export `version` member in the `browser.js` module  is substituted.
     *
     *
     * Boolean Conditionals
     *
     *   For polyfill modules, that are used as imports but have no module value,
     *   a binary conditional allows a module not to be loaded at all if not needed:
     *
     *     import 'es5-shim#?./conditions.js|needs-es5shim'
     *
     *   These conditions can also be negated via:
     *
     *     import 'es5-shim#?./conditions.js|~es6'
     *
     */

    var sysConditions = ['browser', 'node', 'dev', 'build', 'production', 'default'];

    function parseCondition (condition) {
        var conditionExport, conditionModule, negation;

        var negation;
        var conditionExportIndex = condition.lastIndexOf('|');
        if (conditionExportIndex !== -1) {
            conditionExport = condition.substr(conditionExportIndex + 1);
            conditionModule = condition.substr(0, conditionExportIndex);

            if (conditionExport[0] === '~') {
                negation = true;
                conditionExport = conditionExport.substr(1);
            }
        }
        else {
            negation = condition[0] === '~';
            conditionExport = 'default';
            conditionModule = condition.substr(negation);
            if (sysConditions.indexOf(conditionModule) !== -1) {
                conditionExport = conditionModule;
                conditionModule = null;
            }
        }

        return {
            module: conditionModule || '@system-env',
            prop: conditionExport,
            negate: negation
        };
    }

    function resolveCondition (conditionObj, parentKey, bool) {
        // import without __useDefault handling here
        return RegisterLoader$1.prototype.import.call(this, conditionObj.module, parentKey)
            .then(function (condition) {
                var m = readMemberExpression(conditionObj.prop, condition);

                if (bool && typeof m !== 'boolean')
                    throw new TypeError('Condition did not resolve to a boolean.');

                return conditionObj.negate ? !m : m;
            });
    }

    var interpolationRegEx = /#\{[^\}]+\}/;
    function interpolateConditional (key, parentKey, parentMetadata) {
        // first we normalize the conditional
        var conditionalMatch = key.match(interpolationRegEx);

        if (!conditionalMatch)
            return Promise.resolve(key);

        var conditionObj = parseCondition.call(this, conditionalMatch[0].substr(2, conditionalMatch[0].length - 3));

        // in builds, return normalized conditional
        /*if (this.builder)
          return this.normalize(conditionObj.module, parentKey, createMetadata(), parentMetadata)
          .then(function (conditionModule) {
            conditionObj.module = conditionModule;
            return key.replace(interpolationRegEx, '#{' + serializeCondition(conditionObj) + '}');
          });*/

        return resolveCondition.call(this, conditionObj, parentKey, false)
            .then(function (conditionValue) {
                if (typeof conditionValue !== 'string')
                    throw new TypeError('The condition value for ' + key + ' doesn\'t resolve to a string.');

                if (conditionValue.indexOf('/') !== -1)
                    throw new TypeError('Unabled to interpolate conditional ' + key + (parentKey ? ' in ' + parentKey : '') + '\n\tThe condition value ' + conditionValue + ' cannot contain a "/" separator.');

                return key.replace(interpolationRegEx, conditionValue);
            });
    }

    /*
     Extend config merging one deep only

      loader.config({
        some: 'random',
        config: 'here',
        deep: {
          config: { too: 'too' }
        }
      });

      <=>

      loader.some = 'random';
      loader.config = 'here'
      loader.deep = loader.deep || {};
      loader.deep.config = { too: 'too' };


      Normalizes meta and package configs allowing for:

      SystemJS.config({
        meta: {
          './index.js': {}
        }
      });

      To become

      SystemJS.meta['https://thissite.com/index.js'] = {};

      For easy normalization canonicalization with latest URL support.

    */
    var envConfigNames = ['browserConfig', 'nodeConfig', 'devConfig', 'buildConfig', 'productionConfig'];
    function envSet(loader, cfg, envCallback) {
        for (var i = 0; i < envConfigNames.length; i++) {
            var envConfig = envConfigNames[i];
            if (cfg[envConfig] && envModule[envConfig.substr(0, envConfig.length - 6)])
                envCallback(cfg[envConfig]);
        }
    }

    function cloneObj (obj, maxDepth) {
        var clone = {};
        for (var p in obj) {
            var prop = obj[p];
            if (maxDepth > 1) {
                if (prop instanceof Array)
                    clone[p] = [].concat(prop);
                else if (typeof prop === 'object')
                    clone[p] = cloneObj(prop, maxDepth - 1);
                else if (p !== 'packageConfig')
                    clone[p] = prop;
            }
            else {
                clone[p] = prop;
            }
        }
        return clone;
    }

    function getConfigItem (config, p) {
        var cfgItem = config[p];

        // getConfig must return an unmodifiable clone of the configuration
        if (cfgItem instanceof Array)
            return config[p].concat([]);
        else if (typeof cfgItem === 'object')
            return cloneObj(cfgItem, 3)
        else
            return config[p];
    }

    function getConfig (configName) {
        if (configName) {
            if (configNames.indexOf(configName) !== -1)
                return getConfigItem(this[CONFIG], configName);
            throw new Error('"' + configName + '" is not a valid configuration name. Must be one of ' + configNames.join(', ') + '.');
        }

        var cfg = {};
        for (var i = 0; i < configNames.length; i++) {
            var p = configNames[i];
            var configItem = getConfigItem(this[CONFIG], p);
            if (configItem !== undefined)
                cfg[p] = configItem;
        }
        return cfg;
    }

    function setConfig (cfg, isEnvConfig) {
        var loader = this;
        var config = this[CONFIG];

        if ('warnings' in cfg)
            config.warnings = cfg.warnings;

        if ('wasm' in cfg)
            config.wasm = typeof WebAssembly !== 'undefined' && cfg.wasm;

        if ('production' in cfg || 'build' in cfg)
            setProduction.call(loader, !!cfg.production, !!(cfg.build || envModule && envModule.build));

        if (!isEnvConfig) {
            // if using nodeConfig / browserConfig / productionConfig, take baseURL from there
            // these exceptions will be unnecessary when we can properly implement config queuings
            var baseURL;
            envSet(loader, cfg, function(cfg) {
                baseURL = baseURL || cfg.baseURL;
            });
            baseURL = baseURL || cfg.baseURL;

            // always configure baseURL first
            if (baseURL) {
                config.baseURL = resolveIfNotPlain(baseURL, baseURI) || resolveIfNotPlain('./' + baseURL, baseURI);
                if (config.baseURL[config.baseURL.length - 1] !== '/')
                    config.baseURL += '/';
            }

            if (cfg.paths)
                extend(config.paths, cfg.paths);

            envSet(loader, cfg, function(cfg) {
                if (cfg.paths)
                    extend(config.paths, cfg.paths);
            });

            for (var p in config.paths) {
                if (config.paths[p].indexOf('*') === -1)
                    continue;
                warn.call(config, 'Path config ' + p + ' -> ' + config.paths[p] + ' is no longer supported as wildcards are deprecated.');
                delete config.paths[p];
            }
        }

        if (cfg.defaultJSExtensions)
            warn.call(config, 'The defaultJSExtensions configuration option is deprecated.\n  Use packages defaultExtension instead.', true);

        if (typeof cfg.pluginFirst === 'boolean')
            config.pluginFirst = cfg.pluginFirst;

        if (cfg.map) {
            for (var p in cfg.map) {
                var v = cfg.map[p];

                if (typeof v === 'string') {
                    var mapped = coreResolve.call(loader, config, v, undefined, false, false);
                    if (mapped[mapped.length -1] === '/' && p[p.length - 1] !== ':' && p[p.length - 1] !== '/')
                        mapped = mapped.substr(0, mapped.length - 1);
                    config.map[p] = mapped;
                }

                // object map
                else {
                    var pkgName = coreResolve.call(loader, config, p[p.length - 1] !== '/' ? p + '/' : p, undefined, true, true);
                    pkgName = pkgName.substr(0, pkgName.length - 1);

                    var pkg = config.packages[pkgName];
                    if (!pkg) {
                        pkg = config.packages[pkgName] = createPackage();
                        // use '' instead of false to keep type consistent
                        pkg.defaultExtension = '';
                    }
                    setPkgConfig(pkg, { map: v }, pkgName, false, config);
                }
            }
        }

        if (cfg.packageConfigPaths) {
            var packageConfigPaths = [];
            for (var i = 0; i < cfg.packageConfigPaths.length; i++) {
                var path = cfg.packageConfigPaths[i];
                var packageLength = Math.max(path.lastIndexOf('*') + 1, path.lastIndexOf('/'));
                var normalized = coreResolve.call(loader, config, path.substr(0, packageLength), undefined, false, false);
                packageConfigPaths[i] = normalized + path.substr(packageLength);
            }
            config.packageConfigPaths = packageConfigPaths;
        }

        if (cfg.bundles) {
            for (var p in cfg.bundles) {
                var bundle = [];
                for (var i = 0; i < cfg.bundles[p].length; i++)
                    bundle.push(loader.normalizeSync(cfg.bundles[p][i]));
                config.bundles[p] = bundle;
            }
        }

        if (cfg.packages) {
            for (var p in cfg.packages) {
                if (p.match(/^([^\/]+:)?\/\/$/))
                    throw new TypeError('"' + p + '" is not a valid package name.');

                var pkgName = coreResolve.call(loader, config, p[p.length - 1] !== '/' ? p + '/' : p, undefined, true, true);
                pkgName = pkgName.substr(0, pkgName.length - 1);

                setPkgConfig(config.packages[pkgName] = config.packages[pkgName] || createPackage(), cfg.packages[p], pkgName, false, config);
            }
        }

        if (cfg.depCache) {
            for (var p in cfg.depCache)
                config.depCache[loader.normalizeSync(p)] = [].concat(cfg.depCache[p]);
        }

        if (cfg.meta) {
            for (var p in cfg.meta) {
                // base wildcard stays base
                if (p[0] === '*') {
                    extend(config.meta[p] = config.meta[p] || {}, cfg.meta[p]);
                }
                else {
                    var resolved = coreResolve.call(loader, config, p, undefined, true, true);
                    extend(config.meta[resolved] = config.meta[resolved] || {}, cfg.meta[p]);
                }
            }
        }

        if ('transpiler' in cfg)
            config.transpiler = cfg.transpiler;


        // copy any remaining non-standard configuration properties
        for (var c in cfg) {
            if (configNames.indexOf(c) !== -1)
                continue;
            if (envConfigNames.indexOf(c) !== -1)
                continue;

            // warn.call(config, 'Setting custom config option `System.config({ ' + c + ': ... })` is deprecated. Avoid custom config options or set SystemJS.' + c + ' = ... directly.');
            loader[c] = cfg[c];
        }

        envSet(loader, cfg, function(cfg) {
            loader.config(cfg, true);
        });
    }

    function createPackage () {
        return {
            defaultExtension: undefined,
            main: undefined,
            format: undefined,
            meta: undefined,
            map: undefined,
            packageConfig: undefined,
            configured: false
        };
    }

// deeply-merge (to first level) config with any existing package config
    function setPkgConfig (pkg, cfg, pkgName, prependConfig, config) {
        for (var prop in cfg) {
            if (prop === 'main' || prop === 'format' || prop === 'defaultExtension' || prop === 'configured') {
                if (!prependConfig || pkg[prop] === undefined)
                    pkg[prop] = cfg[prop];
            }
            else if (prop === 'map') {
                (prependConfig ? prepend : extend)(pkg.map = pkg.map || {}, cfg.map);
            }
            else if (prop === 'meta') {
                (prependConfig ? prepend : extend)(pkg.meta = pkg.meta || {}, cfg.meta);
            }
            else if (Object.hasOwnProperty.call(cfg, prop)) {
                warn.call(config, '"' + prop + '" is not a valid package configuration option in package ' + pkgName);
            }
        }

        // default defaultExtension for packages only
        if (pkg.defaultExtension === undefined)
            pkg.defaultExtension = 'js';

        if (pkg.main === undefined && pkg.map && pkg.map['.']) {
            pkg.main = pkg.map['.'];
            delete pkg.map['.'];
        }
        // main object becomes main map
        else if (typeof pkg.main === 'object') {
            pkg.map = pkg.map || {};
            pkg.map['./@main'] = pkg.main;
            pkg.main['default'] = pkg.main['default'] || './';
            pkg.main = '@main';
        }

        return pkg;
    }

    var hasBuffer = typeof Buffer !== 'undefined';
    try {
        if (hasBuffer && new Buffer('a').toString('base64') !== 'YQ==')
            hasBuffer = false;
    }
    catch (e) {
        hasBuffer = false;
    }

    var sourceMapPrefix = '\n//# sourceMapping' + 'URL=data:application/json;base64,';
    function inlineSourceMap (sourceMapString) {
        if (hasBuffer)
            return sourceMapPrefix + new Buffer(sourceMapString).toString('base64');
        else if (typeof btoa !== 'undefined')
            return sourceMapPrefix + btoa(unescape(encodeURIComponent(sourceMapString)));
        else
            return '';
    }

    function getSource(source, sourceMap, address, wrap) {
        var lastLineIndex = source.lastIndexOf('\n');

        if (sourceMap) {
            if (typeof sourceMap != 'object')
                throw new TypeError('load.metadata.sourceMap must be set to an object.');

            sourceMap = JSON.stringify(sourceMap);
        }

        return (wrap ? '(function(System, SystemJS) {' : '') + source + (wrap ? '\n})(System, System);' : '')
            // adds the sourceURL comment if not already present
            + (source.substr(lastLineIndex, 15) != '\n//# sourceURL='
                ? '\n//# sourceURL=' + address + (sourceMap ? '!transpiled' : '') : '')
            // add sourceMappingURL if load.metadata.sourceMap is set
            + (sourceMap && inlineSourceMap(sourceMap) || '');
    }

// script execution via injecting a script tag into the page
// this allows CSP nonce to be set for CSP environments
    var head;
    function scriptExec(loader, source, sourceMap, address, nonce) {
        if (!head)
            head = document.head || document.body || document.documentElement;

        var script = document.createElement('script');
        script.text = getSource(source, sourceMap, address, false);
        var onerror = window.onerror;
        var e;
        window.onerror = function(_e) {
            e = addToError(_e, 'Evaluating ' + address);
            if (onerror)
                onerror.apply(this, arguments);
        };
        preExec(loader);

        if (nonce)
            script.setAttribute('nonce', nonce);

        head.appendChild(script);
        head.removeChild(script);
        postExec();
        window.onerror = onerror;
        if (e)
            return e;
    }

    var vm;
    var useVm;

    var curSystem;

    var callCounter = 0;
    function preExec (loader) {
        if (callCounter++ == 0)
            curSystem = envGlobal.System;
        envGlobal.System = envGlobal.SystemJS = loader;
    }
    function postExec () {
        if (--callCounter == 0)
            envGlobal.System = envGlobal.SystemJS = curSystem;
    }

    var supportsScriptExec = false;
    if (isBrowser && typeof document != 'undefined' && document.getElementsByTagName) {
        if (!(window.chrome && window.chrome.extension || navigator.userAgent.match(/^Node\.js/)))
            supportsScriptExec = true;
    }

    function evaluate (loader, source, sourceMap, address, integrity, nonce, noWrap) {
        if (!source)
            return;
        if (nonce && supportsScriptExec)
            return scriptExec(loader, source, sourceMap, address, nonce);
        try {
            preExec(loader);
            // global scoped eval for node (avoids require scope leak)
            if (!vm && loader._nodeRequire) {
                vm = loader._nodeRequire('vm');
                useVm = vm.runInThisContext("typeof System !== 'undefined' && System") === loader;
            }
            if (useVm)
                vm.runInThisContext(getSource(source, sourceMap, address, !noWrap), { filename: address + (sourceMap ? '!transpiled' : '') });
            else
                (0, eval)(getSource(source, sourceMap, address, !noWrap));
            postExec();
        }
        catch (e) {
            console.error(address, e, source);
            postExec();
            return e;
        }
    }

    var formatHelpers = function (loader) {
        loader.set('@@cjs-helpers', loader.newModule({
            requireResolve: requireResolve.bind(loader),
            getPathVars: getPathVars
        }));

        loader.set('@@global-helpers', loader.newModule({
            prepareGlobal: prepareGlobal
        }));

        /*
          AMD-compatible require
          To copy RequireJS, set window.require = window.requirejs = loader.amdRequire
        */
        function require (names, callback, errback, referer) {
            // in amd, first arg can be a config object... we just ignore
            if (typeof names === 'object' && !(names instanceof Array))
                return require.apply(null, Array.prototype.splice.call(arguments, 1, arguments.length - 1));

            // amd require
            if (typeof names === 'string' && typeof callback === 'function')
                names = [names];
            if (names instanceof Array) {
                var dynamicRequires = [];
                for (var i = 0; i < names.length; i++)
                    dynamicRequires.push(loader.import(names[i], referer));
                Promise.all(dynamicRequires).then(function (modules) {
                    if (callback)
                        callback.apply(null, modules);
                }, errback);
            }

            // commonjs require
            else if (typeof names === 'string') {
                var normalized = loader.decanonicalize(names, referer);
                var module = loader.get(normalized);
                if (!module)
                    throw new Error('Module not already loaded loading "' + names + '" as ' + normalized + (referer ? ' from "' + referer + '".' : '.'));
                return '__useDefault' in module ? module.__useDefault : module;
            }

            else
                throw new TypeError('Invalid require');
        }

        function define (name, deps, factory) {
            if (typeof name !== 'string') {
                factory = deps;
                deps = name;
                name = null;
            }

            if (!(deps instanceof Array)) {
                factory = deps;
                deps = ['require', 'exports', 'module'].splice(0, factory.length);
            }

            if (typeof factory !== 'function')
                factory = (function (factory) {
                    return function() { return factory; }
                })(factory);

            if (!name) {
                if (curMetaDeps) {
                    deps = deps.concat(curMetaDeps);
                    curMetaDeps = undefined;
                }
            }

            // remove system dependencies
            var requireIndex, exportsIndex, moduleIndex;

            if ((requireIndex = deps.indexOf('require')) !== -1) {

                deps.splice(requireIndex, 1);

                // only trace cjs requires for non-named
                // named defines assume the trace has already been done
                if (!name)
                    deps = deps.concat(amdGetCJSDeps(factory.toString(), requireIndex));
            }

            if ((exportsIndex = deps.indexOf('exports')) !== -1)
                deps.splice(exportsIndex, 1);

            if ((moduleIndex = deps.indexOf('module')) !== -1)
                deps.splice(moduleIndex, 1);

            function execute (req, exports, module) {
                var depValues = [];
                for (var i = 0; i < deps.length; i++)
                    depValues.push(req(deps[i]));

                module.uri = module.id;

                module.config = noop;

                // add back in system dependencies
                if (moduleIndex !== -1)
                    depValues.splice(moduleIndex, 0, module);

                if (exportsIndex !== -1)
                    depValues.splice(exportsIndex, 0, exports);

                if (requireIndex !== -1) {
                    var contextualRequire = function (names, callback, errback) {
                        if (typeof names === 'string' && typeof callback !== 'function')
                            return req(names);
                        return require.call(loader, names, callback, errback, module.id);
                    };
                    contextualRequire.toUrl = function (name) {
                        return loader.normalizeSync(name, module.id);
                    };
                    depValues.splice(requireIndex, 0, contextualRequire);
                }

                // set global require to AMD require
                var curRequire = envGlobal.require;
                envGlobal.require = require;

                var output = factory.apply(exportsIndex === -1 ? envGlobal : exports, depValues);

                envGlobal.require = curRequire;

                if (typeof output !== 'undefined')
                    module.exports = output;
            }

            // anonymous define
            if (!name) {
                loader.registerDynamic(deps, false, curEsModule ? wrapEsModuleExecute(execute) : execute);
            }
            else {
                loader.registerDynamic(name, deps, false, execute);

                // if we don't have any other defines,
                // then let this be an anonymous define
                // this is just to support single modules of the form:
                // define('jquery')
                // still loading anonymously
                // because it is done widely enough to be useful
                // as soon as there is more than one define, this gets removed though
                if (lastNamedDefine) {
                    lastNamedDefine = undefined;
                    multipleNamedDefines = true;
                }
                else if (!multipleNamedDefines) {
                    lastNamedDefine = [deps, execute];
                }
            }
        }
        define.amd = {};

        loader.amdDefine = define;
        loader.amdRequire = require;
    };

// CJS
    var windowOrigin;
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.location)
        windowOrigin = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');

    function stripOrigin(path) {
        if (path.substr(0, 8) === 'file:///')
            return path.substr(7 + !!isWindows);

        if (windowOrigin && path.substr(0, windowOrigin.length) === windowOrigin)
            return path.substr(windowOrigin.length);

        return path;
    }

    function requireResolve (request, parentId) {
        return stripOrigin(this.normalizeSync(request, parentId));
    }

    function getPathVars (moduleId) {
        // remove any plugin syntax
        var pluginIndex = moduleId.lastIndexOf('!');
        var filename;
        if (pluginIndex !== -1)
            filename = moduleId.substr(0, pluginIndex);
        else
            filename = moduleId;

        var dirname = filename.split('/');
        dirname.pop();
        dirname = dirname.join('/');

        return {
            filename: stripOrigin(filename),
            dirname: stripOrigin(dirname)
        };
    }

    var commentRegEx$1 = /(^|[^\\])(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
    var stringRegEx$1 = /("[^"\\\n\r]*(\\.[^"\\\n\r]*)*"|'[^'\\\n\r]*(\\.[^'\\\n\r]*)*')/g;

// extract CJS dependencies from source text via regex static analysis
// read require('x') statements not in comments or strings
    function getCJSDeps (source) {
        cjsRequireRegEx.lastIndex = commentRegEx$1.lastIndex = stringRegEx$1.lastIndex = 0;

        var deps = [];

        var match;

        // track string and comment locations for unminified source
        var stringLocations = [], commentLocations = [];

        function inLocation (locations, match) {
            for (var i = 0; i < locations.length; i++)
                if (locations[i][0] < match.index && locations[i][1] > match.index)
                    return true;
            return false;
        }

        if (source.length / source.split('\n').length < 200) {
            while (match = stringRegEx$1.exec(source))
                stringLocations.push([match.index, match.index + match[0].length]);

            // TODO: track template literals here before comments

            while (match = commentRegEx$1.exec(source)) {
                // only track comments not starting in strings
                if (!inLocation(stringLocations, match))
                    commentLocations.push([match.index + match[1].length, match.index + match[0].length - 1]);
            }
        }

        while (match = cjsRequireRegEx.exec(source)) {
            // ensure we're not within a string or comment location
            if (!inLocation(stringLocations, match) && !inLocation(commentLocations, match)) {
                var dep = match[1].substr(1, match[1].length - 2);
                // skip cases like require('" + file + "')
                if (dep.match(/"|'/))
                    continue;
                deps.push(dep);
            }
        }

        return deps;
    }

// Global
// bare minimum ignores
    var ignoredGlobalProps = ['_g', 'sessionStorage', 'localStorage', 'clipboardData', 'frames', 'frameElement', 'external',
        'mozAnimationStartTime', 'webkitStorageInfo', 'webkitIndexedDB', 'mozInnerScreenY', 'mozInnerScreenX'];

    var globalSnapshot;
    function globalIterator (globalName) {
        if (ignoredGlobalProps.indexOf(globalName) !== -1)
            return;
        try {
            var value = envGlobal[globalName];
        }
        catch (e) {
            ignoredGlobalProps.push(globalName);
        }
        this(globalName, value);
    }

    function getGlobalValue (exports) {
        if (typeof exports === 'string')
            return readMemberExpression(exports, envGlobal);

        if (!(exports instanceof Array))
            throw new Error('Global exports must be a string or array.');

        var globalValue = {};
        for (var i = 0; i < exports.length; i++)
            globalValue[exports[i].split('.').pop()] = readMemberExpression(exports[i], envGlobal);
        return globalValue;
    }

    function prepareGlobal (moduleName, exports, globals, encapsulate) {
        // disable module detection
        var curDefine = envGlobal.define;

        envGlobal.define = undefined;

        // set globals
        var oldGlobals;
        if (globals) {
            oldGlobals = {};
            for (var g in globals) {
                oldGlobals[g] = envGlobal[g];
                envGlobal[g] = globals[g];
            }
        }

        // store a complete copy of the global object in order to detect changes
        if (!exports) {
            globalSnapshot = {};

            Object.keys(envGlobal).forEach(globalIterator, function (name, value) {
                globalSnapshot[name] = value;
            });
        }

        // return function to retrieve global
        return function () {
            var globalValue = exports ? getGlobalValue(exports) : {};

            var singleGlobal;
            var multipleExports = !!exports;

            if (!exports || encapsulate)
                Object.keys(envGlobal).forEach(globalIterator, function (name, value) {
                    if (globalSnapshot[name] === value)
                        return;
                    if (value === undefined)
                        return;

                    // allow global encapsulation where globals are removed
                    if (encapsulate)
                        envGlobal[name] = undefined;

                    if (!exports) {
                        globalValue[name] = value;

                        if (singleGlobal !== undefined) {
                            if (!multipleExports && singleGlobal !== value)
                                multipleExports = true;
                        }
                        else {
                            singleGlobal = value;
                        }
                    }
                });

            globalValue = multipleExports ? globalValue : singleGlobal;

            // revert globals
            if (oldGlobals) {
                for (var g in oldGlobals)
                    envGlobal[g] = oldGlobals[g];
            }
            envGlobal.define = curDefine;

            return globalValue;
        };
    }

// AMD
    var cjsRequirePre = "(?:^|[^$_a-zA-Z\\xA0-\\uFFFF.])";
    var cjsRequirePost = "\\s*\\(\\s*(\"([^\"]+)\"|'([^']+)')\\s*\\)";
    var fnBracketRegEx = /\(([^\)]*)\)/;
    var wsRegEx = /^\s+|\s+$/g;

    var requireRegExs = {};

    function amdGetCJSDeps(source, requireIndex) {

        // remove comments
        source = source.replace(commentRegEx$1, '');

        // determine the require alias
        var params = source.match(fnBracketRegEx);
        var requireAlias = (params[1].split(',')[requireIndex] || 'require').replace(wsRegEx, '');

        // find or generate the regex for this requireAlias
        var requireRegEx = requireRegExs[requireAlias] || (requireRegExs[requireAlias] = new RegExp(cjsRequirePre + requireAlias + cjsRequirePost, 'g'));

        requireRegEx.lastIndex = 0;

        var deps = [];

        var match;
        while (match = requireRegEx.exec(source))
            deps.push(match[2] || match[3]);

        return deps;
    }

    function wrapEsModuleExecute (execute) {
        return function (require, exports, module) {
            execute(require, exports, module);
            exports = module.exports;
            if ((typeof exports === 'object' || typeof exports === 'function') && !('__esModule' in exports))
                Object.defineProperty(module.exports, '__esModule', {
                    value: true
                });
        };
    }

// generate anonymous define from singular named define
    var multipleNamedDefines = false;
    var lastNamedDefine;
    var curMetaDeps;
    var curEsModule = false;
    function clearLastDefine (metaDeps, esModule) {
        curMetaDeps = metaDeps;
        curEsModule = esModule;
        lastNamedDefine = undefined;
        multipleNamedDefines = false;
    }
    function registerLastDefine (loader) {
        if (lastNamedDefine)
            loader.registerDynamic(curMetaDeps ? lastNamedDefine[0].concat(curMetaDeps) : lastNamedDefine[0],
                false, curEsModule ? wrapEsModuleExecute(lastNamedDefine[1]) : lastNamedDefine[1]);

        // bundles are an empty module
        else if (multipleNamedDefines)
            loader.registerDynamic([], false, noop);
    }

    var supportsScriptLoad = (isBrowser || isWorker) && typeof navigator !== 'undefined' && navigator.userAgent && !navigator.userAgent.match(/MSIE (9|10).0/);

// include the node require since we're overriding it
    var nodeRequire;
    if (typeof require !== 'undefined' && typeof process !== 'undefined' && !process.browser)
        nodeRequire = require;

    function setMetaEsModule (metadata, moduleValue) {
        if (metadata.load.esModule && (typeof moduleValue === 'object' || typeof moduleValue === 'function') &&
            !('__esModule' in moduleValue))
            Object.defineProperty(moduleValue, '__esModule', {
                value: true
            });
    }

    function instantiate$1 (key, processAnonRegister) {
        var loader = this;
        var config = this[CONFIG];
        // console.log('instantiating', {key});
        // first do bundles and depCache
        return (loadBundlesAndDepCache(config, this, key) || resolvedPromise)
            .then(function () {
                if (processAnonRegister())
                    return;

                var metadata = loader[METADATA][key];

                // node module loading
                if (key.substr(0, 6) === '@node/') {
                    if (!loader._nodeRequire)
                        throw new TypeError('Error loading ' + key + '. Can only load node core modules in Node.');
                    loader.registerDynamic([], false, function () {
                        return loadNodeModule.call(loader, key.substr(6), loader.baseURL);
                    });
                    processAnonRegister();
                    return;
                }

                if (metadata.load.scriptLoad ) {
                    if (metadata.load.pluginKey || !supportsScriptLoad) {
                        metadata.load.scriptLoad = false;
                        warn.call(config, 'scriptLoad not supported for "' + key + '"');
                    }
                }
                else if (metadata.load.scriptLoad !== false && !metadata.load.pluginKey && supportsScriptLoad) {
                    // auto script load AMD, global without deps
                    if (!metadata.load.deps && !metadata.load.globals &&
                        (metadata.load.format === 'system' || metadata.load.format === 'register' || metadata.load.format === 'global' && metadata.load.exports))
                        metadata.load.scriptLoad = true;
                }

                // fetch / translate / instantiate pipeline
                if (!metadata.load.scriptLoad)
                    return initializePlugin(loader, key, metadata)
                        .then(function () {
                            return runFetchPipeline(loader, key, metadata, processAnonRegister, config.wasm);
                        });

                // just script loading
                return new Promise(function (resolve, reject) {
                    if (metadata.load.format === 'amd' && envGlobal.define !== loader.amdDefine)
                        throw new Error('Loading AMD with scriptLoad requires setting the global `' + globalName + '.define = SystemJS.amdDefine`');

                    scriptLoad(key, metadata.load.crossOrigin, metadata.load.integrity, function () {
                        if (!processAnonRegister()) {
                            metadata.load.format = 'global';
                            var globalValue = metadata.load.exports && getGlobalValue(metadata.load.exports);
                            loader.registerDynamic([], false, function () {
                                setMetaEsModule(metadata, globalValue);
                                return globalValue;
                            });
                            processAnonRegister();
                        }

                        resolve();
                    }, reject);
                });
            })
            .then(function (instantiated) {
                delete loader[METADATA][key];
                return instantiated;
            });
    }

    function initializePlugin (loader, key, metadata) {
        if (!metadata.pluginKey)
            return resolvedPromise;

        return loader.import(metadata.pluginKey).then(function (plugin) {
            metadata.pluginModule = plugin;
            metadata.pluginLoad = {
                name: key,
                address: metadata.pluginArgument,
                source: undefined,
                metadata: metadata.load
            };
            metadata.load.deps = metadata.load.deps || [];
        });
    }

    function loadBundlesAndDepCache (config, loader, key) {
        // load direct deps, in turn will pick up their trace trees
        var deps = config.depCache[key];
        if (deps) {
            for (var i = 0; i < deps.length; i++)
                loader.normalize(deps[i], key).then(preloadScript);
        }
        else {
            var matched = false;
            for (var b in config.bundles) {
                for (var i = 0; i < config.bundles[b].length; i++) {
                    var curModule = config.bundles[b][i];

                    if (curModule === key) {
                        matched = true;
                        break;
                    }

                    // wildcard in bundles includes / boundaries
                    if (curModule.indexOf('*') !== -1) {
                        var parts = curModule.split('*');
                        if (parts.length !== 2) {
                            config.bundles[b].splice(i--, 1);
                            continue;
                        }

                        if (key.substr(0, parts[0].length) === parts[0] &&
                            key.substr(key.length - parts[1].length, parts[1].length) === parts[1]) {
                            matched = true;
                            break;
                        }
                    }
                }

                if (matched)
                    return loader.import(b);
            }
        }
    }

    function runFetchPipeline (loader, key, metadata, processAnonRegister, wasm) {
        if (metadata.load.exports && !metadata.load.format)
            metadata.load.format = 'global';

        return resolvedPromise

        // locate
            .then(function () {
                // console.log('pluginKey', metadata.pluginKey, 'pluginArgument', metadata.pluginArgument);
                if (!metadata.pluginModule || !metadata.pluginModule.locate)
                    return;

                return Promise.resolve(metadata.pluginModule.locate.call(loader, metadata.pluginLoad))
                    .then(function (address) {
                        if (address)
                            metadata.pluginLoad.address = address;
                    });
            })

            // fetch
            .then(function () {
                if (!metadata.pluginModule)
                    return fetch$1(key, metadata.load.authorization, metadata.load.integrity, wasm);

                wasm = false;

                if (!metadata.pluginModule.fetch)
                    return fetch$1(metadata.pluginLoad.address, metadata.load.authorization, metadata.load.integrity, false);

                return metadata.pluginModule.fetch.call(loader, metadata.pluginLoad, function (load) {
                    return fetch$1(load.address, metadata.load.authorization, metadata.load.integrity, false);
                });
            })

            .then(function (fetched) {
                // fetch is already a utf-8 string if not doing wasm detection
                if (!wasm || typeof fetched === 'string')
                    return translateAndInstantiate(loader, key, fetched, metadata, processAnonRegister);

                return checkInstantiateWasm(loader, fetched, processAnonRegister)
                    .then(function (wasmInstantiated) {
                        if (wasmInstantiated)
                            return;

                        // not wasm -> convert buffer into utf-8 string to execute as a module
                        // TextDecoder compatibility matches WASM currently. Need to keep checking this.
                        // The TextDecoder interface is documented at http://encoding.spec.whatwg.org/#interface-textdecoder
                        var stringSource = isBrowser ? new TextDecoder('utf-8').decode(new Uint8Array(fetched)) : fetched.toString();
                        return translateAndInstantiate(loader, key, stringSource, metadata, processAnonRegister);
                    });
            });
    }

    function translateAndInstantiate (loader, key, source, metadata, processAnonRegister) {
        return Promise.resolve(source)
        // translate
            .then(function (source) {
                if (metadata.load.format === 'detect')
                    metadata.load.format = undefined;

                readMetaSyntax(source, metadata);

                if (!metadata.pluginModule)
                    return source;

                metadata.pluginLoad.source = source;

                if (!metadata.pluginModule.translate)
                    return source;

                return Promise.resolve(metadata.pluginModule.translate.call(loader, metadata.pluginLoad, metadata.traceOpts))
                    .then(function (translated) {
                        if (metadata.load.sourceMap) {
                            if (typeof metadata.load.sourceMap !== 'object')
                                throw new Error('metadata.load.sourceMap must be set to an object.');
                            sanitizeSourceMap(metadata.pluginLoad.address, metadata.load.sourceMap);
                        }

                        if (typeof translated === 'string')
                            return translated;
                        else
                            return metadata.pluginLoad.source;
                    });
            })
            .then(function (source) {
                if (!metadata.load.format && source.substring(0, 8) === '"bundle"') {
                    metadata.load.format = 'system';
                    return source;
                }

                if (metadata.load.format === 'register' || !metadata.load.format && detectRegisterFormat(source)) {
                    metadata.load.format = 'register';
                    return source;
                }

                if (metadata.load.format !== 'esm' && (metadata.load.format || !source.match(esmRegEx))) {
                    return source;
                }

                metadata.load.format = 'esm';
                return transpile(loader, source, key, metadata, processAnonRegister);
            })

            // instantiate
            .then(function (translated) {
                if (typeof translated !== 'string' || !metadata.pluginModule || !metadata.pluginModule.instantiate)
                    return translated;

                var calledInstantiate = false;
                metadata.pluginLoad.source = translated;
                return Promise.resolve(metadata.pluginModule.instantiate.call(loader, metadata.pluginLoad, function (load) {
                    translated = load.source;
                    metadata.load = load.metadata;
                    if (calledInstantiate)
                        throw new Error('Instantiate must only be called once.');
                    calledInstantiate = true;
                }))
                    .then(function (result) {
                        if (calledInstantiate)
                            return translated;
                        return protectedCreateNamespace(result);
                    });
            })
            .then(function (source) {
                // plugin instantiate result case
                if (typeof source !== 'string')
                    return source;

                if (!metadata.load.format)
                    metadata.load.format = detectLegacyFormat(source, key);

                var registered = false;

                switch (metadata.load.format) {
                    case 'esm':
                    case 'register':
                    case 'system':
                        var err = evaluate(loader, source, metadata.load.sourceMap, key, metadata.load.integrity, metadata.load.nonce, false);
                        if (err)
                            throw err;
                        if (!processAnonRegister())
                            return emptyModule;
                        return;
                        break;

                    case 'json':
                        // warn.call(config, '"json" module format is deprecated.');
                        var parsed = JSON.parse(source);
                        return loader.newModule({ default: parsed, __useDefault: parsed });

                    case 'amd':
                        var curDefine = envGlobal.define;
                        envGlobal.define = loader.amdDefine;

                        clearLastDefine(metadata.load.deps, metadata.load.esModule);

                        var err = evaluate(loader, source, metadata.load.sourceMap, key, metadata.load.integrity, metadata.load.nonce, false);

                        // if didn't register anonymously, use the last named define if only one
                        registered = processAnonRegister();
                        if (!registered) {
                            registerLastDefine(loader);
                            registered = processAnonRegister();
                        }

                        envGlobal.define = curDefine;

                        if (err)
                            throw err;
                        break;

                    case 'cjs':
                        var metaDeps = metadata.load.deps;
                        var deps = (metadata.load.deps || []).concat(metadata.load.cjsRequireDetection ? getCJSDeps(source) : []);

                        for (var g in metadata.load.globals)
                            if (metadata.load.globals[g])
                                deps.push(metadata.load.globals[g]);

                        loader.registerDynamic(deps, true, function (require, exports, module) {
                            require.resolve = function (key) {
                                return requireResolve.call(loader, key, module.id);
                            };
                            // support module.paths ish
                            module.paths = [];
                            module.require = require;

                            // ensure meta deps execute first
                            if (!metadata.load.cjsDeferDepsExecute && metaDeps)
                                for (var i = 0; i < metaDeps.length; i++)
                                    require(metaDeps[i]);

                            var pathVars = getPathVars(module.id);
                            var __cjsWrapper = {
                                exports: exports,
                                args: [require, exports, module, pathVars.filename, pathVars.dirname, envGlobal, envGlobal]
                            };

                            var cjsWrapper = "(function (require, exports, module, __filename, __dirname, global, GLOBAL";

                            // add metadata.globals to the wrapper arguments
                            if (metadata.load.globals)
                                for (var g in metadata.load.globals) {
                                    __cjsWrapper.args.push(require(metadata.load.globals[g]));
                                    cjsWrapper += ", " + g;
                                }

                            // disable AMD detection
                            var define = envGlobal.define;
                            envGlobal.define = undefined;
                            envGlobal.__cjsWrapper = __cjsWrapper;

                            source = cjsWrapper + ") {" + source.replace(hashBangRegEx, '') + "\n}).apply(__cjsWrapper.exports, __cjsWrapper.args);";

                            var err = evaluate(loader, source, metadata.load.sourceMap, key, metadata.load.integrity, metadata.load.nonce, false);
                            if (err)
                                throw err;

                            setMetaEsModule(metadata, exports);

                            envGlobal.__cjsWrapper = undefined;
                            envGlobal.define = define;
                        });
                        registered = processAnonRegister();
                        break;

                    case 'global':
                        var deps = metadata.load.deps || [];
                        for (var g in metadata.load.globals) {
                            var gl = metadata.load.globals[g];
                            if (gl)
                                deps.push(gl);
                        }

                        loader.registerDynamic(deps, false, function (require, exports, module) {
                            var globals;
                            if (metadata.load.globals) {
                                globals = {};
                                for (var g in metadata.load.globals)
                                    if (metadata.load.globals[g])
                                        globals[g] = require(metadata.load.globals[g]);
                            }

                            var exportName = metadata.load.exports;

                            if (exportName)
                                source += '\n' + globalName + '["' + exportName + '"] = ' + exportName + ';';

                            var retrieveGlobal = prepareGlobal(module.id, exportName, globals, metadata.load.encapsulateGlobal);
                            var err = evaluate(loader, source, metadata.load.sourceMap, key, metadata.load.integrity, metadata.load.nonce, true);

                            if (err)
                                throw err;

                            var output = retrieveGlobal();
                            setMetaEsModule(metadata, output);
                            return output;
                        });
                        registered = processAnonRegister();
                        break;

                    default:
                        throw new TypeError('Unknown module format "' + metadata.load.format + '" for "' + key + '".' + (metadata.load.format === 'es6' ? ' Use "esm" instead here.' : ''));
                }

                if (!registered)
                    throw new Error('Module ' + key + ' detected as ' + metadata.load.format + ' but didn\'t execute correctly.');
            });
    }

    var globalName = typeof self != 'undefined' ? 'self' : 'global';

// good enough ES6 module detection regex - format detections not designed to be accurate, but to handle the 99% use case
    var esmRegEx = /(^\s*|[}\);\n]\s*)(import\s*(['"]|(\*\s+as\s+)?(?!type)([^"'\(\)\n; ]+)\s*from\s*['"]|\{)|export\s+\*\s+from\s+["']|export\s*(\{|default|function|class|var|const|let|async\s+function))/;

    var leadingCommentAndMetaRegEx = /^(\s*\/\*[^\*]*(\*(?!\/)[^\*]*)*\*\/|\s*\/\/[^\n]*|\s*"[^"]+"\s*;?|\s*'[^']+'\s*;?)*\s*/;
    function detectRegisterFormat(source) {
        var leadingCommentAndMeta = source.match(leadingCommentAndMetaRegEx);
        return leadingCommentAndMeta && source.substr(leadingCommentAndMeta[0].length, 15) === 'System.register';
    }

// AMD Module Format Detection RegEx
// define([.., .., ..], ...)
// define(varName); || define(function(require, exports) {}); || define({})
    var amdRegEx = /(?:^\uFEFF?|[^$_a-zA-Z\xA0-\uFFFF.])define\s*\(\s*("[^"]+"\s*,\s*|'[^']+'\s*,\s*)?\s*(\[(\s*(("[^"]+"|'[^']+')\s*,|\/\/.*\r?\n|\/\*(.|\s)*?\*\/))*(\s*("[^"]+"|'[^']+')\s*,?)?(\s*(\/\/.*\r?\n|\/\*(.|\s)*?\*\/))*\s*\]|function\s*|{|[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*\))/;

/// require('...') || exports[''] = ... || exports.asd = ... || module.exports = ...
    var cjsExportsRegEx = /(?:^\uFEFF?|[^$_a-zA-Z\xA0-\uFFFF.])(exports\s*(\[['"]|\.)|module(\.exports|\['exports'\]|\["exports"\])\s*(\[['"]|[=,\.]))/;
// used to support leading #!/usr/bin/env in scripts as supported in Node
    var hashBangRegEx = /^\#\!.*/;

    function detectLegacyFormat (source, key) {
        if (key.match(/^(.*)\/__wab_jsbundle_(.*)$/))
            return 'amd';
        // if (source.match(amdRegEx))
        //     return 'amd';

        cjsExportsRegEx.lastIndex = 0;
        cjsRequireRegEx.lastIndex = 0;
        if (cjsRequireRegEx.exec(source) || cjsExportsRegEx.exec(source))
            return 'cjs';

        // global is the fallback format
        return 'global';
    }

    function sanitizeSourceMap (address, sourceMap) {
        var originalName = address.split('!')[0];

        // force set the filename of the original file
        if (!sourceMap.file || sourceMap.file == address)
            sourceMap.file = originalName + '!transpiled';

        // force set the sources list if only one source
        if (!sourceMap.sources || sourceMap.sources.length <= 1 && (!sourceMap.sources[0] || sourceMap.sources[0] === address))
            sourceMap.sources = [originalName];
    }

    function transpile (loader, source, key, metadata, processAnonRegister) {
        if (!loader.transpiler)
            throw new TypeError('Unable to dynamically transpile ES module\n   A loader plugin needs to be configured via `SystemJS.config({ transpiler: \'transpiler-module\' })`.');

        // deps support for es transpile
        if (metadata.load.deps) {
            var depsPrefix = '';
            for (var i = 0; i < metadata.load.deps.length; i++)
                depsPrefix += 'import "' + metadata.load.deps[i] + '"; ';
            source = depsPrefix + source;
        }

        // do transpilation
        return loader.import.call(loader, loader.transpiler)
            .then(function (transpiler) {
                transpiler = transpiler.__useDefault || transpiler;

                // translate hooks means this is a transpiler plugin instead of a raw implementation
                if (!transpiler.translate)
                    throw new Error(loader.transpiler + ' is not a valid transpiler plugin.');

                // if transpiler is the same as the plugin loader, then don't run twice
                if (transpiler === metadata.pluginModule)
                    return source;

                // convert the source map into an object for transpilation chaining
                if (typeof metadata.load.sourceMap === 'string')
                    metadata.load.sourceMap = JSON.parse(metadata.load.sourceMap);

                metadata.pluginLoad = metadata.pluginLoad || {
                    name: key,
                    address: key,
                    source: source,
                    metadata: metadata.load
                };
                metadata.load.deps = metadata.load.deps || [];

                return Promise.resolve(transpiler.translate.call(loader, metadata.pluginLoad, metadata.traceOpts))
                    .then(function (source) {
                        // sanitize sourceMap if an object not a JSON string
                        var sourceMap = metadata.load.sourceMap;
                        if (sourceMap && typeof sourceMap === 'object')
                            sanitizeSourceMap(key, sourceMap);

                        if (metadata.load.format === 'esm' && detectRegisterFormat(source))
                            metadata.load.format = 'register';

                        return source;
                    });
            }, function (err) {
                throw LoaderError__Check_error_message_for_loader_stack(err, 'Unable to load transpiler to transpile ' + key);
            });
    }

// detect any meta header syntax
// only set if not already set
    var metaRegEx = /^(\s*\/\*[^\*]*(\*(?!\/)[^\*]*)*\*\/|\s*\/\/[^\n]*|\s*"[^"]+"\s*;?|\s*'[^']+'\s*;?)+/;
    var metaPartRegEx = /\/\*[^\*]*(\*(?!\/)[^\*]*)*\*\/|\/\/[^\n]*|"[^"]+"\s*;?|'[^']+'\s*;?/g;

    function setMetaProperty(target, p, value) {
        var pParts = p.split('.');
        var curPart;
        while (pParts.length > 1) {
            curPart = pParts.shift();
            target = target[curPart] = target[curPart] || {};
        }
        curPart = pParts.shift();
        if (target[curPart] === undefined)
            target[curPart] = value;
    }

    function readMetaSyntax (source, metadata) {
        var meta = source.match(metaRegEx);
        if (!meta)
            return;

        var metaParts = meta[0].match(metaPartRegEx);

        for (var i = 0; i < metaParts.length; i++) {
            var curPart = metaParts[i];
            var len = curPart.length;

            var firstChar = curPart.substr(0, 1);
            if (curPart.substr(len - 1, 1) == ';')
                len--;

            if (firstChar != '"' && firstChar != "'")
                continue;

            var metaString = curPart.substr(1, curPart.length - 3);
            var metaName = metaString.substr(0, metaString.indexOf(' '));

            if (metaName) {
                var metaValue = metaString.substr(metaName.length + 1, metaString.length - metaName.length - 1);

                if (metaName === 'deps')
                    metaName = 'deps[]';

                if (metaName.substr(metaName.length - 2, 2) === '[]') {
                    metaName = metaName.substr(0, metaName.length - 2);
                    metadata.load[metaName] = metadata.load[metaName] || [];
                    metadata.load[metaName].push(metaValue);
                }
                // "use strict" is not meta
                else if (metaName !== 'use') {
                    setMetaProperty(metadata.load, metaName, metaValue);
                }
            }
            else {
                metadata.load[metaString] = true;
            }
        }
    }

    var scriptSrc;

// Promise detection and error message
    if (typeof Promise === 'undefined')
        throw new Error('SystemJS needs a Promise polyfill.');

    if (typeof document !== 'undefined') {
        var scripts = document.getElementsByTagName('script');
        var curScript = scripts[scripts.length - 1];
        if (document.currentScript && (curScript.defer || curScript.async))
            curScript = document.currentScript;

        scriptSrc = curScript && curScript.src;
    }
// worker
    else if (typeof importScripts !== 'undefined') {
        try {
            throw new Error('_');
        }
        catch (e) {
            e.stack.replace(/(?:at|@).*(http.+):[\d]+:[\d]+/, function(m, url) {
                scriptSrc = url;
            });
        }
    }
// node
    else if (typeof __filename !== 'undefined') {
        scriptSrc = __filename;
    }

    function SystemJSLoader$1 () {
        RegisterLoader$1.call(this);

        this.redirects = cached;

        // NB deprecate
        this._loader = {};

        // internal metadata store
        this[METADATA] = {};

        // internal configuration
        this[CONFIG] = {
            baseURL: baseURI,
            paths: {},

            packageConfigPaths: [],
            packageConfigKeys: [],
            map: {},
            packages: {},
            depCache: {},
            meta: {},
            bundles: {},

            production: false,

            transpiler: undefined,
            loadedBundles: {},

            // global behaviour flags
            warnings: false,
            pluginFirst: false,

            // enable wasm loading and detection when supported
            wasm: false
        };

        // make the location of the system.js script accessible (if any)
        this.scriptSrc = scriptSrc;

        this._nodeRequire = nodeRequire;

        // support the empty module, as a concept
        this.registry.set('@empty', emptyModule);

        setProduction.call(this, false, false);

        // add module format helpers
        formatHelpers(this);
    }

    var envModule;
    function setProduction (isProduction, isBuilder) {
        this[CONFIG].production = isProduction;
        this.registry.set('@system-env', envModule = this.newModule({
            browser: isBrowser,
            node: !!this._nodeRequire,
            production: !isBuilder && isProduction,
            dev: isBuilder || !isProduction,
            build: isBuilder,
            'default': true
        }));
    }

    SystemJSLoader$1.prototype = Object.create(RegisterLoader$1.prototype);

    SystemJSLoader$1.prototype.constructor = SystemJSLoader$1;

// NB deprecate normalize
    SystemJSLoader$1.prototype[SystemJSLoader$1.resolve = RegisterLoader$1.resolve] = SystemJSLoader$1.prototype.normalize = normalize;

    SystemJSLoader$1.prototype.load = function (key, parentKey) {
        warn.call(this[CONFIG], 'System.load is deprecated.');
        return this.import(key, parentKey);
    };

// NB deprecate decanonicalize, normalizeSync
    SystemJSLoader$1.prototype.decanonicalize = SystemJSLoader$1.prototype.normalizeSync = SystemJSLoader$1.prototype.resolveSync = normalizeSync;

    SystemJSLoader$1.prototype[SystemJSLoader$1.instantiate = RegisterLoader$1.instantiate] = instantiate$1;

    SystemJSLoader$1.prototype.config = setConfig;
    SystemJSLoader$1.prototype.getConfig = getConfig;

    SystemJSLoader$1.prototype.global = envGlobal;

    SystemJSLoader$1.prototype.import = function () {
        return RegisterLoader$1.prototype.import.apply(this, arguments)
            .then(function (m) {
                return '__useDefault' in m ? m.__useDefault : m;
            });
    };

    var configNames = ['baseURL', 'map', 'paths', 'packages', 'packageConfigPaths', 'depCache', 'meta', 'bundles', 'transpiler', 'warnings', 'pluginFirst', 'production', 'wasm'];

    var hasProxy = typeof Proxy !== 'undefined';
    for (var i = 0; i < configNames.length; i++) (function (configName) {
        Object.defineProperty(SystemJSLoader$1.prototype, configName, {
            get: function () {
                var cfg = getConfigItem(this[CONFIG], configName);

                if (hasProxy && typeof cfg === 'object')
                    cfg = new Proxy(cfg, {
                        set: function (target, option) {
                            throw new Error('Cannot set SystemJS.' + configName + '["' + option + '"] directly. Use SystemJS.config({ ' + configName + ': { "' + option + '": ... } }) rather.');
                        }
                    });

                //if (typeof cfg === 'object')
                //  warn.call(this[CONFIG], 'Referencing `SystemJS.' + configName + '` is deprecated. Use the config getter `SystemJS.getConfig(\'' + configName + '\')`');
                return cfg;
            },
            set: function (name) {
                throw new Error('Setting `SystemJS.' + configName + '` directly is no longer supported. Use `SystemJS.config({ ' + configName + ': ... })`.');
            }
        });
    })(configNames[i]);

    /*
     * Backwards-compatible registry API, to be deprecated
     */
    function registryWarn(loader, method) {
        warn.call(loader[CONFIG], 'SystemJS.' + method + ' is deprecated for SystemJS.registry.' + method);
    }
    SystemJSLoader$1.prototype.delete = function (key) {
        registryWarn(this, 'delete');
        return this.registry.delete(key);
    };
    SystemJSLoader$1.prototype.get = function (key) {
        registryWarn(this, 'get');
        return this.registry.get(key);
    };
    SystemJSLoader$1.prototype.has = function (key) {
        registryWarn(this, 'has');
        return this.registry.has(key);
    };
    SystemJSLoader$1.prototype.set = function (key, module) {
        registryWarn(this, 'set');
        return this.registry.set(key, module);
    };
    SystemJSLoader$1.prototype.newModule = function (bindings) {
        return new ModuleNamespace(bindings);
    };
    SystemJSLoader$1.prototype.isModule = isModule;

// ensure System.register and System.registerDynamic decanonicalize
    SystemJSLoader$1.prototype.register = function (key, deps, declare) {
        if (typeof key === 'string')
            key = decanonicalize.call(this, this[CONFIG], key);
        return RegisterLoader$1.prototype.register.call(this, key, deps, declare);
    };

    SystemJSLoader$1.prototype.registerDynamic = function (key, deps, executingRequire, execute) {
        if (typeof key === 'string')
            key = decanonicalize.call(this, this[CONFIG], key);
        return RegisterLoader$1.prototype.registerDynamic.call(this, key, deps, executingRequire, execute);
    };

    SystemJSLoader$1.prototype.version = "0.20.19 Dev";

    var System = new SystemJSLoader$1();

// only set the global System on the global in browsers
    if (isBrowser || isWorker)
        envGlobal.SystemJS = envGlobal.System = System;

    if (typeof module !== 'undefined' && module.exports)
        module.exports = System;

}());
//# sourceMappingURL=system.src.js.map


/* eslint no-unused-vars: "off" */

function define(){
	return SystemJS.amdDefine.apply(SystemJS, arguments);
}

function config(){
	return SystemJS.config.apply(SystemJS, arguments);
}


define.loader = function(name, plugins){

	function merge(result, plugin){

		var _fetch = result.fetch,
			_translate = result.translate;

		function fetch(load, fallback){

			var loader = this;

			function _fallback(){
				return _fetch.call(loader, load, fallback);
			}

			return plugin.fetch.call(loader, load, _fallback);
		}


		function translate(load){

			var loader = this,
				result = plugin.translate.call(loader, load);

			return Promise.resolve(result).then(function(source){

				if (typeof source == 'string'){
					load.source = source;
				}

				return _translate.call(loader, load);
			});
		}


		function wrap(load){
			return plugin.wrap.call(this, load, _translate);
		}


		if (plugin.fetch){
			result.fetch = _fetch ? fetch : plugin.fetch;
		}

		if (plugin.translate){
			result.translate = _translate ? translate : plugin.translate;
		}

		if (plugin.wrap){
			result.translate = wrap;
		}
	}


	define(name, plugins, function(){

		var i = arguments.length, result = {};

		while(--i >= 0){
			merge(result, arguments[i]);
		}

		return result;
	});
};
window.process = {
    env: {
        NODE_ENV: 'production'
    },
    platform: "",
};


config({

	baseURL: 'https://unpkg.com/',

	packages: {
		'babel-standalone': {main: 'babel.js'},
		'cdn': {main: '@@', defaultExtension: '', meta: {'*': {loader: 'getlibs/loader/cdnjs'}}},
		'pkg': {main: '@@', defaultExtension: '', meta: {'*': {loader: 'getlibs/loader/package'}}},
	},

	map: {
		'babel-standalone': 'https://unpkg.com/@babel/standalone',
		'plugins': 'getlibs/plugins',
		"react": "https://unpkg.com/react/umd/react.production.min.js",
		"react-dom": "https://unpkg.com/react-dom/umd/react-dom.production.min.js",
	},

	meta: {
		// default loader always wants a crack at loading, in case any of the
		// referenced modules is inlined as an x-module
		'*': {loader: 'getlibs/loader/default'},
		'*.js': {loader: 'js'},
		'*.jsx': {loader: 'js'},
		'*.ts': {loader: 'ts'},
		'*.tsx': {loader: 'tsx'},
		'*.css': {loader: 'getlibs/loader/css'},
		'*.txt': {loader: 'text'},
		'*.tpl': {loader: 'text'},
		'*.htm': {loader: 'text'},
		'*.html': {loader: 'text'},
		'*.json': {loader: 'json'},
		'*.hbs': {loader: 'hbs'},
	},

	babelOptions: {js: {
			sourceMap: false,
			presets: ['es2017', 'react'],
			plugins: ['transform-modules-systemjs', ['proposal-decorators', {legacy: true}]]
		}, jsx: {
			sourceMap: false,
			presets: ['es2017', 'react'],
			plugins: ['transform-modules-systemjs', ['proposal-decorators', {legacy: true}]]
		}, ts: {
			sourceMap: false,
			presets: ['es2017', 'typescript'],
			plugins: ['transform-modules-systemjs']
		}, tsx: {
			sourceMap: false,
			presets: ['es2017', 'react', 'typescript'],
			plugins: ['transform-modules-systemjs']
	}},

	transpiler: 'getlibs/plugins/sucrase'
});


define.loader('@babel', [
	'plugins/babel'
]);


define.loader('js', [
	'plugins/scan',
	'plugins/roots',
	'plugins/index',
	'plugins/files'
]);


define.loader('ts', [
	'plugins/scan',
	'plugins/roots',
	'plugins/index',
	'plugins/files',
]);


define.loader('tsx', [
	'plugins/scan',
	'plugins/roots',
	'plugins/index',
	'plugins/files',
]);

define('getlibs/src/idb', [], function(){

	var store = 'cache';

	var init = new Promise(function(resolve, reject){

		var request = indexedDB.open('getlibs', 1);

		request.onupgradeneeded = function(){
			request.result.createObjectStore(store);
		};

		request.onsuccess = function(){
			resolve(request.result);
		};

		request.onerror = function(){
			reject(request.error);
		};
	});


	function wrap(callback){
		return init.then(function(db){
			return new Promise(function(resolve, reject){

				var request = callback(db);

				request.transaction.oncomplete = function(){
					resolve(request.result);
				};

				request.transaction.onerror = function() {
					reject(request.error);
				};
			});
		});
	}


	function getItem(key){
		return wrap(function(db){
			return db.transaction(store).objectStore(store).get(key);
		});
	}


	function setItem(key, value){
		return wrap(function(db){
			return db.transaction(store, 'readwrite').objectStore(store).put(value, key);
		});
	}

	return {
		'get': getItem,
		'set': setItem
	};
});


define('getlibs/src/worker', [], function(){


	function remote(){

		var port = self;

		self.onmessage = function(event){

			try {
				var request = {};
				request = JSON.parse(event.data);

				port.postMessage(JSON.stringify({
					id: request.id,
					result: self[request.method].apply(self, request.args)
				}));
			}
			catch(err){
				port.postMessage(JSON.stringify({
					id: request.id,
					error: {
						message: err.message,
						stack: err.stack
					}
				}));
			}
		};


		self.onconnect = function(event){
			port = event.ports[0];
			port.onmessage = self.onmessage;
		};
	}


	function createWorker(scripts){

		var source = scripts.concat(remote).map(function(item){

			if (typeof item == 'string'){
				return 'importScripts(' + JSON.stringify(System.normalizeSync(item)) + ');\n';
			}

			if (typeof item == 'function'){
				return '(' + item + ')();\n';
			}
		});

		var blob = new Blob(source, {type: 'application/javascript'});

		return new Worker(URL.createObjectURL(blob));
	}


	return function(scripts){

		var serial = 0,
			tasks = [],
			error = null;


		var worker = createWorker(scripts);


		function handleError(err){

			error = err;

			tasks.forEach(function(task, i){
				if (task) {
					tasks[i] = null;
					task.failure(err);
				}
			});
		}

		worker.onerror = function(event){
			handleError(new Error(event.message, event.filename, event.lineno));
		};


		worker.onmessage = function(e){
			try {
				var msg = JSON.parse(e.data),
					task = tasks[msg.id];

				tasks[msg.id] = null;

				if (msg.error) {
					task.failure(msg.error);
				}
				else {
					task.success(msg.result);
				}
			}
			catch(err){
				handleError(err);
			}
		};


		this.call = function(method){

			if (error){
				return Promise.reject(error);
			}

			var i, args = [], id = ++serial;

			for(i=1; i<arguments.length; i++){
				args[i-1] = arguments[i];
			}

			return new Promise(function(success, failure){

				tasks[id] = {
					success: success,
					failure: failure
				};

				worker.postMessage(JSON.stringify({
					id: id,
					method: method,
					args: args
				}));
			});
		};
	};
});

(function(){

	function reload(e){

		if (e.event != 'change' || e.type != 'inject'){
			return;
		}

		var i, address, path = e.path.replace(/\\/g, '/');

		for (;;) {

			address = location.protocol + '//' + location.host + '/' + path;

			if (System.has(address)){
				return System.reload(address);
			}

			i = path.indexOf('/');

			if (i == -1){
				return;
			}

			path = path.substr(i+1);
		}
	}

	var initialized;

	document.addEventListener('load', function(){

		if (initialized || !window.___browserSync___){
			return;
		}

		System.import('https://unpkg.com/systemjs-hmr').then(function(){
			window.___browserSync___.socket.on('file:reload', reload);
		});

	}, true);

})();

config({

	packages: {
		'activewidgets': {main: 'dist/ax.js'}
	},

	map: {
		'activewidgets': 'https://cdn.activewidgets.com/'
	}
});


config({

	packages: {
		'@angular/core': {main: 'bundles/core.umd.min.js', meta: {'*.js': {deps: ['core-js', 'zone.js', 'rxjs']}}},
		'@angular/common': {main: 'bundles/common.umd.min.js'},
		'@angular/compiler': {main: 'bundles/compiler.umd.min.js'},
		'@angular/platform-browser': {main: 'bundles/platform-browser.umd.min.js'},
		'@angular/platform-browser-dynamic': {main: 'bundles/platform-browser-dynamic.umd.min.js'},
		'@angular/forms': {main: 'bundles/forms.umd.min.js'},
		'@angular/http': {main: 'bundles/http.umd.min.js'},
		'@angular/router': {main: 'bundles/router.umd.min.js'}
	}

});


config({

	packages: {
		'angular': {exports: 'angular'}
	}

});


config({

	bundles: {
		'aurelia-core': [
			'aurelia-binding',
			'aurelia-bootstrapper',
			'aurelia-dependency-injection',
			'aurelia-event-aggregator',
			'aurelia-framework',
			'aurelia-loader',
			'aurelia-loader-default',
			'aurelia-logging',
			'aurelia-logging-console',
			'aurelia-metadata',
			'aurelia-pal',
			'aurelia-pal-browser',
			'aurelia-path',
			'aurelia-polyfills',
			'aurelia-task-queue',
			'aurelia-templating',
			'aurelia-templating-binding',
			'aurelia-templating-resources'
		],

		'aurelia-routing': [
			'aurelia-history',
			'aurelia-history-browser',
			'aurelia-route-recognizer',
			'aurelia-router',
			'aurelia-templating-router'
		]
	},

	map: {
		'aurelia-core':  'https://rawgit.com/aurelia/aurelia/master/scripts/aurelia-core.min.js',
		'aurelia-routing': 'https://rawgit.com/aurelia/aurelia/master/scripts/aurelia-routing.min.js'
	}
});



config({

	packages: {

		'core-js': {main: 'core.min.js', meta: {
			'core.min.js': {loader: 'cdn'},
			'core.js': {loader: 'cdn'},
			'*': {loader: 'pkg'}
		}}
	}

});


config({

	packages: {
		'ember-source': {main: 'dist/ember.min.js', meta: {'*.js': {format: 'global', deps: ['jquery', './ember-template-compiler']}}}
	},

	map: {
		'ember': 'ember-source'
	}
});



config({

	packages: {

		'lodash': {main: 'lodash.min.js', defaultExtension: 'js', meta: {
			'lodash.min.js': {loader: 'cdn'},
			'lodash.js': {loader: 'cdn'},
			'*': {loader: 'pkg/*'}
		}}
	}

});


config({

	packages: {

		'rxjs': {main: 'Rx.min.js', meta: {
			'observable/*': {loader: 'pkg/Observable'},
			'operator/*': {loader: 'pkg/Observable.prototype'},
			'Rx.min.js': {loader: 'cdn'},
			'Rx.js': {loader: 'cdn'},
			'*': {loader: 'pkg'}
		}}
	},

	map: {
		'rxjs': '@reactivex/rxjs',
		'rxjs/Rx': '@reactivex/rxjs',
		'@reactivex/rxjs': '@reactivex/rxjs'
	}
});


config({

	map: {
		'vue-class-component': 'vue-class-component/dist/vue-class-component.min.js'
	}
});



config({

	map: {
		'zone.js/dist/zone': 'zone.js'
	}
});


define('text', [], function(){
	return {
		instantiate: function(load) {
			return load.source;
		}
	};
});

/**
 * We cannot use the vanilla systemjs-plugin-css plugin, because it detects if `window`
 * is defined, and if so, only inserts <style src=.../> instead of inserting
 * <style>...</style> with the css content.  I guess this is how they differentiate
 * between the browser use case and the bundling use case.
 *
 * Still, we need the bundling use case!  The below implementation is basically directly
 * taken from systemjs-plugin-css/css.js.
 */

(function() {
  // We try to record the css files that we load, and we try to instantiate
  // them in the document the same order.  Note that this does _not_ guarantee
  // that we will instantiate them in the same order that they are imported
  // from the tsx files; before plugins are even used, the dependencies like
  // css files are "resolved", which in our case involves remote-fetching from
  // cdn for non-local files like @plasmicapp/reactweb/lib/plasmic.css.  So
  // the order is not guaranteed.  But it _should_ be the case that all local
  // css files (like ./plasmic-defaults.css) will be instantiated in the
  // right order.
  const knownLoads = [];

  function getExistingStyleElement(address) {
    return document.querySelector(`style[data-systemjs-address="${address}"]`);
  }

  function makeLoader() {
    return {
      prefetch: function(load) {
        knownLoads.push(load.address);
      },
      translate: function(load, opts) {
        load.metadata.style = load.source;
        return null;
      },
      instantiate: function(load, opts) {
        // Reuse existing style tags
        const existing = getExistingStyleElement(load.address);
        if (existing) {
          existing.innerHTML = load.metadata.style;
        } else {
          const style = document.createElement('style');
          style.type = 'text/css';
          style.setAttribute("data-systemjs-address", load.address);
          style.innerHTML = load.metadata.style;
          const index = knownLoads.indexOf(load.address);
          if (index < 0) {
            document.head.appendChild(style);
          } else {
            const loadeds = knownLoads.slice(index + 1).map(address => getExistingStyleElement(address)).filter(elt => !!elt).reverse();
            if (loadeds.length === 0) {
              document.head.appendChild(style);
            } else {
              document.head.insertBefore(style, loadeds[0]);
            }
          }
        }
      },
    }
  }

  define("getlibs/loader/css", [], makeLoader);
})();

define('json', [], function(){
	return {
		instantiate: function(load) {
			return JSON.parse(load.source);
		}
	};
});


define('getlibs/plugins/preload', [], function(){

	var map = System.preload.map;

	var defer = function(fn){
		var channel = new MessageChannel();
		channel.port1.onmessage = fn;
		channel.port2.postMessage(0);
	};

	if (!window.MessageChannel){
		defer = setTimeout;
	}

	function timeout(value){
		return new Promise(function(resolve){
			defer(function(){
				resolve(value);
			}, 0);
		});
	}


	function fetch(load, defaultFetch){

		var prev = map[load.address],
			result = defaultFetch(load);

		if (!prev) {
			return result;
		}

		return System.import(prev).then(timeout).then(function(){
			return result;
		});
	}


	return {
		fetch: fetch
	};
});


System.preload = function(items){

	var i, prev, item, map = System.preload.map;

	for(i=0; i<items.length; i++){
		item = System.normalizeSync(items[i]);
		map[item] = prev;
		prev = item;
		System.import(item);
	}
};

System.preload.map = {};

define('getlibs/loader/cdnjs', [], function(){

	// var init = System.import('https://api.cdnjs.com/libraries!json').then(function(response){

	// 	var libs = {}, map = {"angular.js": "angular", "10up-sanitize.css":"sanitize.css","accounting.js":"accounting","alertify.js":"alertify","AlertifyJS":"alertifyjs","alexandernst-angular-multi-select":"angular-multi-select","angular-autofields":"angular-autoFields-bootstrap","audio5js":"audio5","aui":"@atlassian/aui","babel-core":"babel-browser","backbone-localstorage.js":"backbone.localstorage","backbone.collectionView":"bb-collection-view","backbone.js":"backbone","backbone.validation":"backbone-validation","bacon.js":"baconjs","baffle.js":"baffle","basis.js":"basis-library","bespoke.js":"bespoke","bokeh":"bokehjs","breezejs":"breeze-client","camanjs":"caman","can.js":"can","cannon.js":"cannon","cash":"cash-dom","Chart.js":"chart.js","ClientJS":"clientjs","clipboard.js":"clipboard","Colors.js":"colors.js","cookie.js":"cookie_js","Cookies.js":"cookies-js","css-loader":"pure-css-loader","custom-elements-builder":"ceb","custom-elements":"@webcomponents/custom-elements","dancer.js":"dancer","danialfarid-angular-file-upload":"ng-file-upload","danielgindi-jquery-backstretch":"jquery.backstretch","data.js":"data_js","datepicker":"@fengyuanchen/datepicker","dio":"dio.js","dropbox.js":"dropbox","Dropify":"dropify","dygraph":"dygraphs","elasticsearch":"elasticsearch-browser","eModal":"emodal","Faker":"faker","file-uploader":"fine-uploader","FileSaver.js":"file-saver","forge":"node-forge","graingert-wow":"wow.js","Han":"han-css","handlebars.js":"handlebars","headroom":"headroom.js","hola-video.js":"@hola.org/video.js","ICanHaz.js":"icanhaz","idbwrapper":"idb-wrapper","ifvisible":"ifvisible.js","ion.checkradio":"ion-checkradio","javascript-hooker":"hooker","jquery-browser":"jquery.browser","jquery-easing":"jquery.easing","jquery-jgrowl":"jgrowl","jQuery-linkify":"linkifyjs","jquery-minicolors":"@claviska/jquery-minicolors","jquery-noty":"noty","jquery.imagesloaded":"imagesloaded","jquery.isotope":"isotope-layout","jquery.lazyloadxt":"lazyloadxt","jQuery.Marquee":"jquery.marquee","jQuery.my":"jquerymy","jquery.simpleWeather":"simpleweather","jquery.tabslet.js":"tabslet","jquery.textcomplete":"jquery-textcomplete","jquery.ui-contextmenu":"ui-contextmenu","jquery.wookmark":"wookmark","jqueryui-touch-punch":"jquery-ui-touch-punch","js-xss":"xss","jsdiff":"diff","json-formatter":"jsonformatter","kineticjs":"kinetic","knockout-validation":"knockout.validation","leaflet-locatecontrol":"leaflet.locatecontrol","leaflet.draw":"leaflet-draw","less.js":"less","line-chart":"n3-charts","lunr.js":"lunr","machina.js":"machina","markdown.js":"markdown","mindb":"min","MinPubSub":"minpubsub","mistic100-Bootstrap-Confirmation":"bootstrap-confirmation2","moment.js":"moment","multi-select":"multiselect","MutationObserver.js":"mutationobserver-shim","mycolorway-simple-hotkeys":"simple-hotkeys","ngOfficeUiFabric":"ng-office-ui-fabric","nod":"nod-validate","normalize":"normalize.css","notify.js":"notifyjs","numeral.js":"numeral","oauth-io":"oauthio-web","odometer.js":"odometer","ol3":"openlayers","onsen":"onsenui","p2.js":"p2","p5.js":"p5","parsley.js":"parsleyjs","pdf.js":"pdfjs-dist","pegasus":"@typicode/pegasus","perliedman-leaflet-control-geocoder":"leaflet-control-geocoder","pickadate.js":"pickadate","plastiq":"angular-moment","plottable.js":"plottable","portal":"portal-client","postal.js":"postal","Primer":"primer-css","prism":"prismjs","proj4js":"proj4","pure":"purecss","q.js":"q","qunit":"qunitjs","ramjet.js":"ramjet","remoteStorage":"remotestoragejs","Repaintless.css":"repaintless","retina.js":"retinajs","roll":"rolljs","rxjs":"@reactivex/rxjs","scion":"scxml","script.js":"scriptjs","ScrollMagic":"scrollmagic","should.js":"should","Shuffle":"shufflejs","sigma.js":"sigma","simple-gallery-js":"simpleGallery.js","smoothscroll":"smoothscroll-for-websites","socket.io":"socket.io-client","sprintf":"sprintf-js","stacktrace.js":"stacktrace-js","stomp.js":"stompjs","string.js":"string","Swiper":"swiper","tabletop.js":"tabletop","teleject-hisrc":"hisrc","tinycolor":"tinycolor2","tracking.js":"tracking","Turf.js":"@turf/turf","twitter-bootstrap":"bootstrap","twix.js":"twix","UAParser.js":"ua-parser-js","Uniform.js":"jquery.uniform","Vidage":"vidage","weather":"weather.js","whitestorm.js":"whs","wordcloud2.js":"wordcloud","xls":"xlsjs","yasqe":"yasgui-yasqe","yasr":"yasgui-yasr","Zebra_datepicker":"zebra_datepicker"};

	// 	response.results.forEach(function(item){
	// 		libs[map[item.name] || item.name] = item;
	// 	});

	// 	return libs;
	// });
	var init = Promise.resolve({});


	var exceptions = ['@angular/', 'inferno/'],
		baseURL = SystemJS.baseURL;


	function notcdnjs(url){
		return url.indexOf(baseURL) != 0 || exceptions.some(function(item){
			return url.indexOf(baseURL + item) == 0;
		});
	}


	function build(base){

		var plugin = {};

		Object.keys(base).forEach(function(i){
			plugin[i] = base[i];
		});

		plugin.fetch = function(load, fetch){

			var loader = this;

			if (notcdnjs(load.address)){
				return base.fetch.call(loader, load, fetch);
			}

			return init.then(function(libs){

				var name = load.address.substr(baseURL.length).replace(/^([^@\/]+|@[^\/]+\/[^\/]+)(.*)$/, '$1'),
					file = RegExp.$2,
					item = libs[name];

				if (!item){
					return base.fetch.call(loader, load, fetch);
				}

				var redirect = item.latest;

				if (file){

					if (!file.match(/\.\w+$/)){
						file += '.min.js';
					}

					redirect = item.latest.replace(/^(.+\/ajax\/libs\/[^\/]+\/[^\/]+)\/.+$/, '$1') + file;
				}

				load.source = 'module.exports = require(' + JSON.stringify(redirect) + ')';


				var map = System.preload.map,
					prev = map[load.address];

				if (prev) {
					map[redirect] = prev;
				}

				return load.source;
			});
		}

		return plugin;
	}


	function skip(){
		return ''
	}


	function instantiate(load){

		var path = load.address.substr(SystemJS.baseURL.length + 4);
		path = (path == '@@') ? 'getlibs/plugins/preload' : path;
		return System.import(path).then(build);
	}


	return {
		fetch: skip,
		instantiate: instantiate
	};
});


(function(){

	config({
		meta: {
			'https://unpkg.com/*': {loader: 'cdn'},
			'https://cdnjs.cloudflare.com/*.js': {loader: 'cdn'},
			'getlibs/*': {loader: ''}
		}
	});

	var path, meta = {}, current = SystemJS.meta;

	for(path in current){
		if (path.indexOf('*.') == 0 && current[path].loader) {
			meta['https://unpkg.com/' + path] = {loader: 'cdn/' + current[path].loader};
		}
	}

	meta['https://unpkg.com/*.js'] = {loader: 'cdn'};

	config({
		meta: meta
	});

})();

define('getlibs/plugins/cached', ['../src/idb'], function(db){

	function wrap(load, translate){

		var loader = this,
			source = load.source,
			address = load.address;


		function save(result){

			var item = {
				input: source,
				result: result,
				sourceMap: load.metadata.sourceMap
			};

			return db.set(address, item).then(function(){
				return result;
			});
		}


		function compare(item){

			if (item && item.input == source){
				load.metadata.sourceMap = item.sourceMap;
				return item.result;
			}

			return translate.call(loader, load).then(save);
		}


		return db.get(address).then(compare);
	}

	return {
		wrap: wrap
	};
});


define('getlibs/plugins/files', [], function(){


	function fileAccessWarning(){
		/* eslint no-console: "off" */
		console.warn("Allow file access when running directly from files: http://getlibs.com/allow-file-access.html");

		var e = document.createElement('div');
		e.innerHTML = '<div style="border: 1px solid red; padding: 30px; background: #fff; position: fixed; top: 20px; left: 20px;">' +
			'getlibs error: file access not allowed (<a href="http://getlibs.com/allow-file-access.html">more info</a>)' +
		'</div>';
		document.body.appendChild(e);
	}


	var loadingFromFiles = (location.protocol == 'file:'),
		fileAccessAllowed;



	function fetch(load, fallback){

		function ok(source){

			if (loadingFromFiles && load.address.indexOf('file:') == 0){
				fileAccessAllowed = true;
			}

			return source;
		}

		function fail(err){

			if (loadingFromFiles && !fileAccessAllowed){
				setTimeout(fileAccessWarning, 100);
				throw new Error('No access to files or wrong path: ' + load.address);
			}

			throw err;
		}


		return Promise.resolve(fallback(load)).then(ok, fail);
	}


	return {
		fetch: fetch
	};
});


/**
 * This is a plugin that takes imports like @material-ui/core/Button, and turns them
 * into importing the standalone UMD build, and returning the component from the full
 * module instead.  This significantly speeds up the use of material UI components, as
 * we no longer need to go into these modularized builds and try to resolve all their
 * imports; instead, we just download everything already nicely build in one go!
 *
 * Going through the modularized build for a complicated project like material-ui is
 * always iffy, as there may be dependencies that are not packaged quite correctly
 * and does not work well with this SystemJs + unpkg.com scheme.  Always safer to
 * rely on standalone builds instead.
 */
(function() {

  function makeLoader(arg) {
    const base = arg || {};
    const loader = {};

    Object.keys(base).forEach(function(i){
      loader[i] = base[i];
    });

    loader.instantiate = function(load, instantiate) {
      if (load.address.includes("/umd/")) {
        // For loading the actual umd build, we do it the usual way
        if (base.instantiate) {
          return base.instantiate.apply(this, arguments);
        } else {
          return instantiate(load);
        }
      }

      // But for loading something like @material-ui/core/Button, we instead
      // import the umd build, and the return the component from the full module.
      const parts = load.name.split("/");
      const coreIndex = parts.findIndex(x => x.startsWith("core"));
      const componentName = parts[coreIndex + 1];
      return System.import('https://unpkg.com/@material-ui/core@latest/umd/material-ui.production.min.js').then(res => {
        return res[componentName];
      });
    };

    return loader;
  }

  define('getlibs/loader/material', [], makeLoader);

  config({
    meta: {
      '@material-ui/core*': {loader: 'getlibs/loader/material'},
    }
  });
})();

define('getlibs/plugins/roots', [], function(){

	var roots = ['https://unpkg.com/', 'https://cdnjs.cloudflare.com/'];

	function defineRoots(url){

		var i, root;

		for(i=0; i<roots.length; i++){

			root = roots[i];

			if (url.substr(0, root.length) == root){
				return;
			}
		}

		if (!url.match(/\.(ts|js)$/)){
			return;
		}

		var ext = RegExp.$1,
			packages = {};


		if (!System.resolveSync('./aaaa', url).match(/\.(ts|js)$/)){
			root = System.resolveSync('.', url);
			packages[root] = {defaultExtension: ext};
			config({packages: packages});
			roots.push(root);
		}
	}


	function fetch(load, fallback){

		defineRoots(String(load.address));

		return fallback(load);
	}


	return {
		fetch: fetch
	};
});



define('getlibs/plugins/index', [], function(){

	function fetch(load, fallback){

		function retry(err){

			if (String(err.message).indexOf('No access to files') == 0){
				throw err;
			}

			var address = load.address,
				index = address.replace(/\.(ts|js)$/, '/index.$1'),
				ext = RegExp.$1,
				path = JSON.stringify(index),
				source = (ext == 'ts') ?
					'export * from ' + path :
					'module.exports = require(' + path + ')';

			if (address.match(/\.(ts|js)$/) && !address.match(/index\.(ts|js)$/)){
				return source;
			}

			throw err;
		}


		return Promise.resolve(fallback(load)).catch(retry);
	}


	return {
		fetch: fetch
	};
});



define('getlibs/plugins/scan', [], function(){

	var angularPreloaded;

	function angular(load){

		var reTemplateUrl = /(\btemplateUrl\s*:\s*['"`])(\..*?)([`"'])/g,
			reStyleUrls = /(\bstyleUrls\s*:\s*\[)([^\]]*?)(\])/g,
			reUrl = /(['"`])(\..*?)([`"'])/g,
			source = String(load.source);

		if (!angularPreloaded && source.indexOf('@angular/platform-browser-dynamic') >= 0){

			angularPreloaded = true;

			System.preload([
				'core-js',
				'zone.js',
				'rxjs',
				'@angular/core',
				'@angular/common',
				'@angular/platform-browser',
				'@angular/compiler',
				'@angular/platform-browser-dynamic'
			]);
		}

		function absoluteUrl(match, before, url, after){
			return before + System.resolveSync(url, load.address) + after;
		}

		function styleUrls(match, before, urls, after){
			return before + urls.replace(reUrl, absoluteUrl) + after;
		}

		if (source.indexOf('moduleId') == -1) {
			load.source = source.replace(reTemplateUrl, absoluteUrl).replace(reStyleUrls, styleUrls);
		}
	}


	function scan(load){

		var source = String(load.source);

		if (source.indexOf('@angular') >= 0) {
			angular(load);
		}
	}


	var baseURL = SystemJS.baseURL;

	function translate(load){

		if (String(load.address).substr(0, baseURL.length) != baseURL){
			scan(load);
		}
	}


	return {
		translate: translate
	};
});



define('getlibs/plugins/js', [], function(){
	return {};
});

define('getlibs/plugins/babel', ['../src/worker'], function(WebWorker){

	function transpiler(){

		self.translate = function(address, source, options) {

			options.ast = false;
			options.filename = address;
			options.sourceFileName = address;

			/* global Babel */
			return Babel.transform(source, options);
		};
	}


	var worker = new WebWorker(['babel-standalone', transpiler]),
		options = SystemJS.babelOptions;


	function translate(load){

		const ext = /.*\.(.+?)$/.exec(load.address)[1];
		return worker.call('translate', load.address, load.source, options[ext]).then(function(result){
			load.metadata.sourceMap = result.map;
			return result.code;
		});
	}


	return {
		translate: translate
	};
});
// sucrase standalone global is loaded in min.js; it is built using
// ext/sucrase-standalone, here https://github.com/arv/sucrase-standalone
// There is no official standalone build.
// TODO: figure out how to load sucrase-standalone in webworker
define('getlibs/plugins/sucrase', [], function() {

  function getOptions(load) {
    const parts = load.address.split("/");
    const fileName = parts[parts.length - 1];
    const ext = /.*\.(.+?)$/.exec(load.address)[1];
    const jsxPragma = (
      fileName.startsWith("render__")
      ? "createPlasmicElementProxy"
      : undefined
    );

    if (ext === "js") {
      return {
        transforms: ["imports"]
      };
    } else if (ext === "jsx") {
      return {
        transforms: ["imports", "jsx"],
        jsxPragma,
      };
    } else if (ext === "ts") {
      return {
        transforms: ["imports", "typescript"]
      };
    } else if (ext === "tsx") {
      return {
        transforms: ["imports", "typescript", "jsx"],
        jsxPragma
      };
    } else {
      return {};
    }
  }

	function translate(load){
    const res = sucrase.transform(load.source, getOptions(load));
    load.metadata.sourceMap = res.map;

    // Sucrase always outputs in cjs format with the "imports" transform.
    load.metadata.format = "cjs";
    return res.code;
	}

	return {
		translate: translate
	};
});
// NOTE: this is not actually being used; we are using babel to do the
// typescript transformation.
define('getlibs/plugins/typescript', ['../src/worker'], function(WebWorker){

	function transpiler(){

		self.translate = function(address, source, options) {

			/* global ts */
			var result = ts.transpileModule(source, {
				compilerOptions: options,
				reportDiagnostics: true,
				moduleName: address,
				fileName: address
			});

			result.diagnostics.forEach(function(item){
				item.file = null;
			});

			return result;
		};
	}


	var worker = new WebWorker(['typescript', transpiler]),
		options = SystemJS.typescriptOptions;


	function error(items, address, source){

		var item = items[0],
			parts = source.substr(0, item.start).split('\n'),
			line = parts.length,
			message = item.messageText + ' (line: ' + line + ')\n\n' +
				source.split('\n')[line-1] + '\n' +
				parts[line-1].replace(/\S/g, ' ') + '^';

		return new Error(message);
	}


	function translate(load){
		return worker.call('translate', load.address, load.source, options).then(function(result){

			if (result.diagnostics.length){
				throw error(result.diagnostics, load.address, load.source);
			}

			load.metadata.sourceMap = JSON.parse(result.sourceMapText);
			return result.outputText.replace(/^\/\/# sourceMappingURL=.+/m, '');
		});
	}


	return {
		translate: translate
	};
});

define('hbs', ['handlebars'], function(Handlebars){

	function translate(load){

		var precompiled = Handlebars.precompile(load.source),
			output = 'var Handlebars = require("handlebars"); \n module.exports = Handlebars.template(' +  precompiled +');';

		load.source = output;
		return output;
	}

	return {
		translate: translate
	};
});


define('getlibs/loader/package', [], function(){

	function fetch(){
		return ''
	}

	var packages = SystemJS.packages;

	function package(address){

		var i, name, parts = address.split('/');

		for(i=parts.length; i>2; --i){
			name = parts.slice(0, i).join('/');
			if (name in packages){
				return name;
			}
		}
	}


	function property(address, loadAddress){

		return function(value){

			var path = address.replace(/^.*\//, '');

			if (path == '@@'){
				return value;
			}

			if (path == '*'){
				path = loadAddress.replace(/^.+\/(\w+)\.js$/, '$1');
			}

			path &&	path.split('.').forEach(function(name){
				value = value[name];
			});

			return value;
		};
	}

	function instantiate(plugin){
		return {
			fetch: fetch,
			instantiate: function(load){
				return System.import(package(load.address)).then(property(plugin.address, load.address));
			}
		};
	}

	return {
		fetch: fetch,
		instantiate: instantiate
	}
});


define('vue-loader', ['vue-content'], function(content){

	function translate(load){

		var address = load.address,
			ext = SystemJS.resolveSync('./aaaa', address).match(/\.ts$/) ? '-ts' : '-js';

		content[address] = load.source;

		var source = 'module.exports = require("vue-builder")(';

		source += 'require(' + JSON.stringify(address + ext) + '),\n';
		source += 'require(' + JSON.stringify(address + '-html') + '),\n';
		source += 'require(' + JSON.stringify(address + '-css') + '))\n';

		return source;
	}


	return {
		translate: translate
	};
});


define('vue-builder', [], function(){
	return function(component, template){

		component = component || {};
		component = component.default || component;

		var options = component.options || component;
		options.template = template || '';

		return component;
	};
});


define('vue-js', ['vue-content'], function(content){

	function fetch(load){

		var address = load.address.replace(/-.s$/, ''),
			text = content[address],
			source = '';

		if (String(text).match(/<script[^>]*>([\s\S]*)<\/script>/)){
			source = RegExp.$1;
		}

		load.source = source;
		return source;
	}

	return {
		fetch: fetch
	};
});


define('vue-html', ['vue-content'], function(content){

	function fetch(load){

		var address = load.address.replace(/-html$/, ''),
			text = content[address],
			source = '';

		if (String(text).match(/<template[^>]*>([\s\S]*)<\/template>/)){
			source = 'module.exports = ' + JSON.stringify(RegExp.$1);
		}

		return source;
	}

	return {
		fetch: fetch
	};
});


define('vue-css', ['vue-content'], function(content){

	function fetch(load){

		var address = load.address.replace(/-css$/, ''),
			text = content[address],
			source = '';

		if (String(text).match(/<style[^>]*>([\s\S]*)<\/style>/)){

			var style = RegExp.$1,
				el = document.createElement('style');

			if (el.styleSheet) {
				el.styleSheet.cssText = style;
			}
			else {
				el.appendChild(document.createTextNode(style));
			}

			document.head.appendChild(el);
		}

		return source;
	}


	return {
		fetch: fetch
	};
});


define('vue-content', [], function(){
	return {};
});


define.loader('vue-ts', [
	'vue-js',
	'plugins/cached',
	'plugins/typescript'
]);


config({
	meta: {
		'*.vue-js': {loader: 'vue-js'},
		'*.vue-ts': {loader: 'vue-ts'},
		'*.vue-html': {loader: 'vue-html'},
		'*.vue-css': {loader: 'vue-css'},
		'*.vue': {loader: 'vue-loader'}
	}
});


(function(){

	var defaultLoader = 'getlibs/loader/default';

	var content = {}, loaders = {'default': defaultLoader};


	function tagLoader(arg){

		var base = arg || {},
			loader = {};

		Object.keys(base).forEach(function(i){
			loader[i] = base[i];
		});

		loader.locate = function(load) {
			// We allow referencing ts/tsx/js/jsx files in x-modules without their extensions
			const name = load.name;
			for (const maybeName of [name, `${name}.ts`, `${name}.tsx`, `${name}.js`, `${name}.jsx`]) {
				if (content[maybeName]) {
					return maybeName;
				}
			}
			return load.key;
		};

		loader.fetch = function(load, fetch){
			// If we're taking over fetch from a base loader,
			// then at least let the base loader know that.
			if (base && base.prefetch) {
				base.prefetch.apply(this, arguments);
			}

			var name = load.address;

      // Allow empty modules, for example when no CSS is required for a component.
			if (content[name] != null){
				load.source = content[name];
				return content[name];
			}

			if (base.fetch){
				return base.fetch.apply(this, arguments);
			}

			return fetch(load);
		};

		return loader;
	}


	define(defaultLoader, [], tagLoader);


	function registerLoader(name){

		var xname = 'getlibs/loader/' + name,
			basename = SystemJS.normalizeSync(name),
			map = {};

		map[name] = xname;

		define(xname, [basename], tagLoader);
		config({map: map});

		return xname;
	}


	function makeLoader(name){

		if (!loaders[name]){
			loaders[name] = registerLoader(name);
		}

		return loaders[name];
	}


	Object.keys(SystemJS.meta).forEach(function(key){

		var meta = SystemJS.meta[key],
			name = meta && key.indexOf('*.') == 0 && meta.loader;

		name && makeLoader(name);
	});


	function isDefault(name){
		return name.match(/\.js$|[^\.\w]\w*$/);
	}

	function getNameWithoutExt(modName) {
		const parts = modName.split(".");
		return parts.slice(0, parts.length  -1).join(".");
	}

	function findDependents(modName) {
		const seen = new Set();

		const find = (name) => {
			if (seen.has(name)) {
				return;
			}
			seen.add(name);
			const withoutExp = getNameWithoutExt(name);
			const directDependents = Object.keys(SystemJS.loads || {}).filter(key => {
				const deps = Object.values(SystemJS.loads[key].depMap || {});
				return deps.includes(name) || deps.includes(withoutExp);
			});
			directDependents.forEach(d => find(d));
		};

		find(modName);

		return Array.from(seen);
	}

	function deleteModule(modName) {
		SystemJS.delete(modName);
		const withoutExt = getNameWithoutExt(modName);
		SystemJS.delete(withoutExt);
	}


	function registerModulesFromPage(){
		const scripts = document.querySelectorAll('script[type="x-module"]');
		const moduleDefs = [];
		for (let i=0; i<scripts.length; i++) {
			const script = scripts[i];
			moduleDefs.push({
				name: script.getAttribute("name"),
				lang: script.getAttribute("lang"),
				sourceUrl: script.getAttribute("src"),
				source: script.innerHTML
			});
		}
		registerModules(moduleDefs);
	}

	function registerModules(moduleDefs){
		const meta = {}, start = [];
		for (let i=0; i<moduleDefs.length; i++) {
			const moduleDef = moduleDefs[i];
			const ext = moduleDef.lang || "js";
			const name = moduleDef.name || `./script${i}.${ext}`;

			const full = SystemJS.normalizeSync(name);

			if (moduleDef.sourceUrl) {
				SystemJS.import(moduleDef.sourceUrl);
				continue;
			}

			if (content[full] !== moduleDef.source) {
				content[full] = moduleDef.source;
				const deps = findDependents(full);
				for (const dep of deps) {
					deleteModule(dep);
				}
			}

			if (isDefault(name)) {
				meta[full] = {
					loader: defaultLoader
				};
			}

			if (!moduleDef.name || moduleDef.run) {
				start.push(name);
			}
		}
		config({
			meta: meta
		});

		console.log('************************');
		console.log('************************');
		console.log('************************');
		console.log('************************');
		console.log('************************');
		console.log('STARTING');
		console.log('************************');
		console.log('************************');
		console.log('************************');
		console.log('************************');
		console.log('************************');
		SystemJS.trace = true;
		return Promise.all(start.map(function(name){
			return SystemJS.import(name).then(mod => {
				if (mod.__run) {
					mod.__run();
				}
				return mod;
			});
		}));
	}


	document.addEventListener('DOMContentLoaded', registerModulesFromPage, true);

	SystemJS.refreshXModules = function(moduleDefs) {
		return registerModules(moduleDefs);
	};
})();

parcelRequire=function(e,r,t,n){var i,o="function"==typeof parcelRequire&&parcelRequire,u="function"==typeof require&&require;function f(t,n){if(!r[t]){if(!e[t]){var i="function"==typeof parcelRequire&&parcelRequire;if(!n&&i)return i(t,!0);if(o)return o(t,!0);if(u&&"string"==typeof t)return u(t);var c=new Error("Cannot find module '"+t+"'");throw c.code="MODULE_NOT_FOUND",c}p.resolve=function(r){return e[t][1][r]||r},p.cache={};var l=r[t]=new f.Module(t);e[t][0].call(l.exports,p,l,l.exports,this)}return r[t].exports;function p(e){return f(p.resolve(e))}}f.isParcelRequire=!0,f.Module=function(e){this.id=e,this.bundle=f,this.exports={}},f.modules=e,f.cache=r,f.parent=o,f.register=function(r,t){e[r]=[function(e,r){r.exports=t},{}]};for(var c=0;c<t.length;c++)try{f(t[c])}catch(e){i||(i=e)}if(t.length){var l=f(t[t.length-1]);"object"==typeof exports&&"undefined"!=typeof module?module.exports=l:"function"==typeof define&&define.amd?define(function(){return l}):n&&(this[n]=l)}if(parcelRequire=f,i)throw i;return f}({"qf4T":[function(require,module,exports) {

var e=module.exports="undefined"!=typeof window&&window.Math==Math?window:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")();"number"==typeof __g&&(__g=e);
},{}],"ss9A":[function(require,module,exports) {
var e=module.exports={version:"2.6.11"};"number"==typeof __e&&(__e=e);
},{}],"M7z6":[function(require,module,exports) {
module.exports=function(o){return"object"==typeof o?null!==o:"function"==typeof o};
},{}],"eT53":[function(require,module,exports) {
var r=require("./_is-object");module.exports=function(e){if(!r(e))throw TypeError(e+" is not an object!");return e};
},{"./_is-object":"M7z6"}],"BXiR":[function(require,module,exports) {
module.exports=function(r){try{return!!r()}catch(t){return!0}};
},{}],"P9Ib":[function(require,module,exports) {
module.exports=!require("./_fails")(function(){return 7!=Object.defineProperty({},"a",{get:function(){return 7}}).a});
},{"./_fails":"BXiR"}],"vZ6E":[function(require,module,exports) {
var e=require("./_is-object"),r=require("./_global").document,t=e(r)&&e(r.createElement);module.exports=function(e){return t?r.createElement(e):{}};
},{"./_is-object":"M7z6","./_global":"qf4T"}],"o6Gq":[function(require,module,exports) {
module.exports=!require("./_descriptors")&&!require("./_fails")(function(){return 7!=Object.defineProperty(require("./_dom-create")("div"),"a",{get:function(){return 7}}).a});
},{"./_descriptors":"P9Ib","./_fails":"BXiR","./_dom-create":"vZ6E"}],"y37I":[function(require,module,exports) {
var t=require("./_is-object");module.exports=function(r,e){if(!t(r))return r;var o,n;if(e&&"function"==typeof(o=r.toString)&&!t(n=o.call(r)))return n;if("function"==typeof(o=r.valueOf)&&!t(n=o.call(r)))return n;if(!e&&"function"==typeof(o=r.toString)&&!t(n=o.call(r)))return n;throw TypeError("Can't convert object to primitive value")};
},{"./_is-object":"M7z6"}],"nw8e":[function(require,module,exports) {
var e=require("./_an-object"),r=require("./_ie8-dom-define"),t=require("./_to-primitive"),i=Object.defineProperty;exports.f=require("./_descriptors")?Object.defineProperty:function(o,n,u){if(e(o),n=t(n,!0),e(u),r)try{return i(o,n,u)}catch(c){}if("get"in u||"set"in u)throw TypeError("Accessors not supported!");return"value"in u&&(o[n]=u.value),o};
},{"./_an-object":"eT53","./_ie8-dom-define":"o6Gq","./_to-primitive":"y37I","./_descriptors":"P9Ib"}],"uJ6d":[function(require,module,exports) {
module.exports=function(e,r){return{enumerable:!(1&e),configurable:!(2&e),writable:!(4&e),value:r}};
},{}],"NXbe":[function(require,module,exports) {
var r=require("./_object-dp"),e=require("./_property-desc");module.exports=require("./_descriptors")?function(t,u,o){return r.f(t,u,e(1,o))}:function(r,e,t){return r[e]=t,r};
},{"./_object-dp":"nw8e","./_property-desc":"uJ6d","./_descriptors":"P9Ib"}],"uHgd":[function(require,module,exports) {
var r={}.hasOwnProperty;module.exports=function(e,n){return r.call(e,n)};
},{}],"U49f":[function(require,module,exports) {
var o=0,t=Math.random();module.exports=function(n){return"Symbol(".concat(void 0===n?"":n,")_",(++o+t).toString(36))};
},{}],"H21C":[function(require,module,exports) {
module.exports=!1;
},{}],"zGcK":[function(require,module,exports) {

var r=require("./_core"),e=require("./_global"),o="__core-js_shared__",i=e[o]||(e[o]={});(module.exports=function(r,e){return i[r]||(i[r]=void 0!==e?e:{})})("versions",[]).push({version:r.version,mode:require("./_library")?"pure":"global",copyright:"© 2019 Denis Pushkarev (zloirock.ru)"});
},{"./_core":"ss9A","./_global":"qf4T","./_library":"H21C"}],"d5RU":[function(require,module,exports) {
module.exports=require("./_shared")("native-function-to-string",Function.toString);
},{"./_shared":"zGcK"}],"PHot":[function(require,module,exports) {

var e=require("./_global"),r=require("./_hide"),t=require("./_has"),i=require("./_uid")("src"),n=require("./_function-to-string"),o="toString",u=(""+n).split(o);require("./_core").inspectSource=function(e){return n.call(e)},(module.exports=function(n,o,c,l){var s="function"==typeof c;s&&(t(c,"name")||r(c,"name",o)),n[o]!==c&&(s&&(t(c,i)||r(c,i,n[o]?""+n[o]:u.join(String(o)))),n===e?n[o]=c:l?n[o]?n[o]=c:r(n,o,c):(delete n[o],r(n,o,c)))})(Function.prototype,o,function(){return"function"==typeof this&&this[i]||n.call(this)});
},{"./_global":"qf4T","./_hide":"NXbe","./_has":"uHgd","./_uid":"U49f","./_function-to-string":"d5RU","./_core":"ss9A"}],"kYjc":[function(require,module,exports) {
module.exports=function(o){if("function"!=typeof o)throw TypeError(o+" is not a function!");return o};
},{}],"E3Kh":[function(require,module,exports) {
var r=require("./_a-function");module.exports=function(n,t,u){if(r(n),void 0===t)return n;switch(u){case 1:return function(r){return n.call(t,r)};case 2:return function(r,u){return n.call(t,r,u)};case 3:return function(r,u,e){return n.call(t,r,u,e)}}return function(){return n.apply(t,arguments)}};
},{"./_a-function":"kYjc"}],"izCb":[function(require,module,exports) {

var e=require("./_global"),r=require("./_core"),o=require("./_hide"),i=require("./_redefine"),u=require("./_ctx"),n="prototype",t=function(c,f,l){var q,_,a,d,p=c&t.F,v=c&t.G,F=c&t.S,x=c&t.P,y=c&t.B,B=v?e:F?e[f]||(e[f]={}):(e[f]||{})[n],G=v?r:r[f]||(r[f]={}),P=G[n]||(G[n]={});for(q in v&&(l=f),l)a=((_=!p&&B&&void 0!==B[q])?B:l)[q],d=y&&_?u(a,e):x&&"function"==typeof a?u(Function.call,a):a,B&&i(B,q,a,c&t.U),G[q]!=a&&o(G,q,d),x&&P[q]!=a&&(P[q]=a)};e.core=r,t.F=1,t.G=2,t.S=4,t.P=8,t.B=16,t.W=32,t.U=64,t.R=128,module.exports=t;
},{"./_global":"qf4T","./_core":"ss9A","./_hide":"NXbe","./_redefine":"PHot","./_ctx":"E3Kh"}],"yjVO":[function(require,module,exports) {
var o=Math.ceil,r=Math.floor;module.exports=function(t){return isNaN(t=+t)?0:(t>0?r:o)(t)};
},{}],"vfEH":[function(require,module,exports) {
var e=require("./_to-integer"),r=Math.max,t=Math.min;module.exports=function(n,a){return(n=e(n))<0?r(n+a,0):t(n,a)};
},{"./_to-integer":"yjVO"}],"xSM3":[function(require,module,exports) {
var r=require("./_export"),o=require("./_to-absolute-index"),e=String.fromCharCode,n=String.fromCodePoint;r(r.S+r.F*(!!n&&1!=n.length),"String",{fromCodePoint:function(r){for(var n,t=[],i=arguments.length,a=0;i>a;){if(n=+arguments[a++],o(n,1114111)!==n)throw RangeError(n+" is not a valid code point");t.push(n<65536?e(n):e(55296+((n-=65536)>>10),n%1024+56320))}return t.join("")}});
},{"./_export":"izCb","./_to-absolute-index":"vfEH"}],"Z5df":[function(require,module,exports) {
var r={}.toString;module.exports=function(t){return r.call(t).slice(8,-1)};
},{}],"nGau":[function(require,module,exports) {
var e=require("./_cof");module.exports=Object("z").propertyIsEnumerable(0)?Object:function(r){return"String"==e(r)?r.split(""):Object(r)};
},{"./_cof":"Z5df"}],"BjjL":[function(require,module,exports) {
module.exports=function(o){if(null==o)throw TypeError("Can't call method on  "+o);return o};
},{}],"g6sb":[function(require,module,exports) {
var e=require("./_iobject"),r=require("./_defined");module.exports=function(i){return e(r(i))};
},{"./_iobject":"nGau","./_defined":"BjjL"}],"dJBs":[function(require,module,exports) {
var e=require("./_to-integer"),r=Math.min;module.exports=function(t){return t>0?r(e(t),9007199254740991):0};
},{"./_to-integer":"yjVO"}],"t29D":[function(require,module,exports) {
var r=require("./_export"),e=require("./_to-iobject"),t=require("./_to-length");r(r.S,"String",{raw:function(r){for(var n=e(r.raw),i=t(n.length),o=arguments.length,u=[],g=0;i>g;)u.push(String(n[g++])),g<o&&u.push(String(arguments[g]));return u.join("")}});
},{"./_export":"izCb","./_to-iobject":"g6sb","./_to-length":"dJBs"}],"ECro":[function(require,module,exports) {
module.exports="\t\n\v\f\r   ᠎             　\u2028\u2029\ufeff";
},{}],"y5m2":[function(require,module,exports) {
var r=require("./_export"),e=require("./_defined"),i=require("./_fails"),n=require("./_string-ws"),t="["+n+"]",u="​",o=RegExp("^"+t+t+"*"),p=RegExp(t+t+"*$"),a=function(e,t,o){var p={},a=i(function(){return!!n[e]()||u[e]()!=u}),f=p[e]=a?t(c):n[e];o&&(p[o]=f),r(r.P+r.F*a,"String",p)},c=a.trim=function(r,i){return r=String(e(r)),1&i&&(r=r.replace(o,"")),2&i&&(r=r.replace(p,"")),r};module.exports=a;
},{"./_export":"izCb","./_defined":"BjjL","./_fails":"BXiR","./_string-ws":"ECro"}],"ZW4n":[function(require,module,exports) {
"use strict";require("./_string-trim")("trim",function(r){return function(){return r(this,3)}});
},{"./_string-trim":"y5m2"}],"x5yM":[function(require,module,exports) {
var e=require("./_to-integer"),r=require("./_defined");module.exports=function(t){return function(n,i){var o,u,c=String(r(n)),d=e(i),a=c.length;return d<0||d>=a?t?"":void 0:(o=c.charCodeAt(d))<55296||o>56319||d+1===a||(u=c.charCodeAt(d+1))<56320||u>57343?t?c.charAt(d):o:t?c.slice(d,d+2):u-56320+(o-55296<<10)+65536}};
},{"./_to-integer":"yjVO","./_defined":"BjjL"}],"JO4d":[function(require,module,exports) {
module.exports={};
},{}],"Ca7J":[function(require,module,exports) {
var e=require("./_to-iobject"),r=require("./_to-length"),t=require("./_to-absolute-index");module.exports=function(n){return function(i,o,u){var f,l=e(i),a=r(l.length),c=t(u,a);if(n&&o!=o){for(;a>c;)if((f=l[c++])!=f)return!0}else for(;a>c;c++)if((n||c in l)&&l[c]===o)return n||c||0;return!n&&-1}};
},{"./_to-iobject":"g6sb","./_to-length":"dJBs","./_to-absolute-index":"vfEH"}],"NaGB":[function(require,module,exports) {
var e=require("./_shared")("keys"),r=require("./_uid");module.exports=function(u){return e[u]||(e[u]=r(u))};
},{"./_shared":"zGcK","./_uid":"U49f"}],"vL0Z":[function(require,module,exports) {
var r=require("./_has"),e=require("./_to-iobject"),u=require("./_array-includes")(!1),i=require("./_shared-key")("IE_PROTO");module.exports=function(o,a){var n,s=e(o),t=0,h=[];for(n in s)n!=i&&r(s,n)&&h.push(n);for(;a.length>t;)r(s,n=a[t++])&&(~u(h,n)||h.push(n));return h};
},{"./_has":"uHgd","./_to-iobject":"g6sb","./_array-includes":"Ca7J","./_shared-key":"NaGB"}],"bbv4":[function(require,module,exports) {
module.exports="constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",");
},{}],"U9a7":[function(require,module,exports) {
var e=require("./_object-keys-internal"),r=require("./_enum-bug-keys");module.exports=Object.keys||function(u){return e(u,r)};
},{"./_object-keys-internal":"vL0Z","./_enum-bug-keys":"bbv4"}],"MiMz":[function(require,module,exports) {
var e=require("./_object-dp"),r=require("./_an-object"),t=require("./_object-keys");module.exports=require("./_descriptors")?Object.defineProperties:function(o,i){r(o);for(var u,c=t(i),n=c.length,s=0;n>s;)e.f(o,u=c[s++],i[u]);return o};
},{"./_object-dp":"nw8e","./_an-object":"eT53","./_object-keys":"U9a7","./_descriptors":"P9Ib"}],"xjB1":[function(require,module,exports) {
var e=require("./_global").document;module.exports=e&&e.documentElement;
},{"./_global":"qf4T"}],"sYaK":[function(require,module,exports) {
var e=require("./_an-object"),r=require("./_object-dps"),t=require("./_enum-bug-keys"),n=require("./_shared-key")("IE_PROTO"),o=function(){},i="prototype",u=function(){var e,r=require("./_dom-create")("iframe"),n=t.length;for(r.style.display="none",require("./_html").appendChild(r),r.src="javascript:",(e=r.contentWindow.document).open(),e.write("<script>document.F=Object<\/script>"),e.close(),u=e.F;n--;)delete u[i][t[n]];return u()};module.exports=Object.create||function(t,c){var a;return null!==t?(o[i]=e(t),a=new o,o[i]=null,a[n]=t):a=u(),void 0===c?a:r(a,c)};
},{"./_an-object":"eT53","./_object-dps":"MiMz","./_enum-bug-keys":"bbv4","./_shared-key":"NaGB","./_dom-create":"vZ6E","./_html":"xjB1"}],"AIP1":[function(require,module,exports) {
var e=require("./_shared")("wks"),r=require("./_uid"),o=require("./_global").Symbol,u="function"==typeof o,i=module.exports=function(i){return e[i]||(e[i]=u&&o[i]||(u?o:r)("Symbol."+i))};i.store=e;
},{"./_shared":"zGcK","./_uid":"U49f","./_global":"qf4T"}],"rq3q":[function(require,module,exports) {
var e=require("./_object-dp").f,r=require("./_has"),o=require("./_wks")("toStringTag");module.exports=function(t,u,i){t&&!r(t=i?t:t.prototype,o)&&e(t,o,{configurable:!0,value:u})};
},{"./_object-dp":"nw8e","./_has":"uHgd","./_wks":"AIP1"}],"ebgP":[function(require,module,exports) {
"use strict";var e=require("./_object-create"),r=require("./_property-desc"),t=require("./_set-to-string-tag"),i={};require("./_hide")(i,require("./_wks")("iterator"),function(){return this}),module.exports=function(o,u,s){o.prototype=e(i,{next:r(1,s)}),t(o,u+" Iterator")};
},{"./_object-create":"sYaK","./_property-desc":"uJ6d","./_set-to-string-tag":"rq3q","./_hide":"NXbe","./_wks":"AIP1"}],"rfVX":[function(require,module,exports) {
var e=require("./_defined");module.exports=function(r){return Object(e(r))};
},{"./_defined":"BjjL"}],"q6yw":[function(require,module,exports) {
var t=require("./_has"),e=require("./_to-object"),o=require("./_shared-key")("IE_PROTO"),r=Object.prototype;module.exports=Object.getPrototypeOf||function(c){return c=e(c),t(c,o)?c[o]:"function"==typeof c.constructor&&c instanceof c.constructor?c.constructor.prototype:c instanceof Object?r:null};
},{"./_has":"uHgd","./_to-object":"rfVX","./_shared-key":"NaGB"}],"mH0U":[function(require,module,exports) {
"use strict";var e=require("./_library"),r=require("./_export"),t=require("./_redefine"),i=require("./_hide"),n=require("./_iterators"),u=require("./_iter-create"),o=require("./_set-to-string-tag"),s=require("./_object-gpo"),a=require("./_wks")("iterator"),c=!([].keys&&"next"in[].keys()),f="@@iterator",l="keys",q="values",y=function(){return this};module.exports=function(_,p,h,k,v,w,d){u(h,p,k);var x,b,g,j=function(e){if(!c&&e in I)return I[e];switch(e){case l:case q:return function(){return new h(this,e)}}return function(){return new h(this,e)}},m=p+" Iterator",A=v==q,F=!1,I=_.prototype,O=I[a]||I[f]||v&&I[v],P=O||j(v),z=v?A?j("entries"):P:void 0,B="Array"==p&&I.entries||O;if(B&&(g=s(B.call(new _)))!==Object.prototype&&g.next&&(o(g,m,!0),e||"function"==typeof g[a]||i(g,a,y)),A&&O&&O.name!==q&&(F=!0,P=function(){return O.call(this)}),e&&!d||!c&&!F&&I[a]||i(I,a,P),n[p]=P,n[m]=y,v)if(x={values:A?P:j(q),keys:w?P:j(l),entries:z},d)for(b in x)b in I||t(I,b,x[b]);else r(r.P+r.F*(c||F),p,x);return x};
},{"./_library":"H21C","./_export":"izCb","./_redefine":"PHot","./_hide":"NXbe","./_iterators":"JO4d","./_iter-create":"ebgP","./_set-to-string-tag":"rq3q","./_object-gpo":"q6yw","./_wks":"AIP1"}],"tbKg":[function(require,module,exports) {
"use strict";var i=require("./_string-at")(!0);require("./_iter-define")(String,"String",function(i){this._t=String(i),this._i=0},function(){var t,e=this._t,n=this._i;return n>=e.length?{value:void 0,done:!0}:(t=i(e,n),this._i+=t.length,{value:t,done:!1})});
},{"./_string-at":"x5yM","./_iter-define":"mH0U"}],"zR9y":[function(require,module,exports) {
"use strict";var r=require("./_export"),t=require("./_string-at")(!1);r(r.P,"String",{codePointAt:function(r){return t(this,r)}});
},{"./_export":"izCb","./_string-at":"x5yM"}],"WEVF":[function(require,module,exports) {
var e=require("./_is-object"),r=require("./_cof"),i=require("./_wks")("match");module.exports=function(o){var u;return e(o)&&(void 0!==(u=o[i])?!!u:"RegExp"==r(o))};
},{"./_is-object":"M7z6","./_cof":"Z5df","./_wks":"AIP1"}],"GbTB":[function(require,module,exports) {
var e=require("./_is-regexp"),r=require("./_defined");module.exports=function(i,t,n){if(e(t))throw TypeError("String#"+n+" doesn't accept regex!");return String(r(i))};
},{"./_is-regexp":"WEVF","./_defined":"BjjL"}],"AhNa":[function(require,module,exports) {
var r=require("./_wks")("match");module.exports=function(t){var c=/./;try{"/./"[t](c)}catch(e){try{return c[r]=!1,!"/./"[t](c)}catch(a){}}return!0};
},{"./_wks":"AIP1"}],"zRn7":[function(require,module,exports) {
"use strict";var e=require("./_export"),t=require("./_to-length"),i=require("./_string-context"),r="endsWith",n=""[r];e(e.P+e.F*require("./_fails-is-regexp")(r),"String",{endsWith:function(e){var s=i(this,e,r),g=arguments.length>1?arguments[1]:void 0,h=t(s.length),l=void 0===g?h:Math.min(t(g),h),u=String(e);return n?n.call(s,u,l):s.slice(l-u.length,l)===u}});
},{"./_export":"izCb","./_to-length":"dJBs","./_string-context":"GbTB","./_fails-is-regexp":"AhNa"}],"fH7p":[function(require,module,exports) {
"use strict";var e=require("./_export"),i=require("./_string-context"),r="includes";e(e.P+e.F*require("./_fails-is-regexp")(r),"String",{includes:function(e){return!!~i(this,e,r).indexOf(e,arguments.length>1?arguments[1]:void 0)}});
},{"./_export":"izCb","./_string-context":"GbTB","./_fails-is-regexp":"AhNa"}],"UH4U":[function(require,module,exports) {
"use strict";var r=require("./_to-integer"),e=require("./_defined");module.exports=function(t){var i=String(e(this)),n="",o=r(t);if(o<0||o==1/0)throw RangeError("Count can't be negative");for(;o>0;(o>>>=1)&&(i+=i))1&o&&(n+=i);return n};
},{"./_to-integer":"yjVO","./_defined":"BjjL"}],"C85R":[function(require,module,exports) {
var r=require("./_export");r(r.P,"String",{repeat:require("./_string-repeat")});
},{"./_export":"izCb","./_string-repeat":"UH4U"}],"w2SA":[function(require,module,exports) {
"use strict";var t=require("./_export"),r=require("./_to-length"),e=require("./_string-context"),i="startsWith",n=""[i];t(t.P+t.F*require("./_fails-is-regexp")(i),"String",{startsWith:function(t){var s=e(this,t,i),g=r(Math.min(arguments.length>1?arguments[1]:void 0,s.length)),h=String(t);return n?n.call(s,h,g):s.slice(g,g+h.length)===h}});
},{"./_export":"izCb","./_to-length":"dJBs","./_string-context":"GbTB","./_fails-is-regexp":"AhNa"}],"NE20":[function(require,module,exports) {
var r=require("./_export"),e=require("./_fails"),t=require("./_defined"),n=/"/g,i=function(r,e,i,u){var o=String(t(r)),a="<"+e;return""!==i&&(a+=" "+i+'="'+String(u).replace(n,"&quot;")+'"'),a+">"+o+"</"+e+">"};module.exports=function(t,n){var u={};u[t]=n(i),r(r.P+r.F*e(function(){var r=""[t]('"');return r!==r.toLowerCase()||r.split('"').length>3}),"String",u)};
},{"./_export":"izCb","./_fails":"BXiR","./_defined":"BjjL"}],"USd7":[function(require,module,exports) {
"use strict";require("./_string-html")("anchor",function(n){return function(r){return n(this,"a","name",r)}});
},{"./_string-html":"NE20"}],"c1D0":[function(require,module,exports) {
"use strict";require("./_string-html")("big",function(t){return function(){return t(this,"big","","")}});
},{"./_string-html":"NE20"}],"Ee86":[function(require,module,exports) {
"use strict";require("./_string-html")("blink",function(n){return function(){return n(this,"blink","","")}});
},{"./_string-html":"NE20"}],"ry39":[function(require,module,exports) {
"use strict";require("./_string-html")("bold",function(t){return function(){return t(this,"b","","")}});
},{"./_string-html":"NE20"}],"AHLq":[function(require,module,exports) {
"use strict";require("./_string-html")("fixed",function(t){return function(){return t(this,"tt","","")}});
},{"./_string-html":"NE20"}],"H7V0":[function(require,module,exports) {
"use strict";require("./_string-html")("fontcolor",function(t){return function(r){return t(this,"font","color",r)}});
},{"./_string-html":"NE20"}],"Dx83":[function(require,module,exports) {
"use strict";require("./_string-html")("fontsize",function(t){return function(n){return t(this,"font","size",n)}});
},{"./_string-html":"NE20"}],"fRhg":[function(require,module,exports) {
"use strict";require("./_string-html")("italics",function(t){return function(){return t(this,"i","","")}});
},{"./_string-html":"NE20"}],"Aaz0":[function(require,module,exports) {
"use strict";require("./_string-html")("link",function(r){return function(t){return r(this,"a","href",t)}});
},{"./_string-html":"NE20"}],"qBr3":[function(require,module,exports) {
"use strict";require("./_string-html")("small",function(t){return function(){return t(this,"small","","")}});
},{"./_string-html":"NE20"}],"eNyu":[function(require,module,exports) {
"use strict";require("./_string-html")("strike",function(t){return function(){return t(this,"strike","","")}});
},{"./_string-html":"NE20"}],"BVLK":[function(require,module,exports) {
"use strict";require("./_string-html")("sub",function(t){return function(){return t(this,"sub","","")}});
},{"./_string-html":"NE20"}],"kMsL":[function(require,module,exports) {
"use strict";require("./_string-html")("sup",function(t){return function(){return t(this,"sup","","")}});
},{"./_string-html":"NE20"}],"t3as":[function(require,module,exports) {
"use strict";var r=require("./_string-at")(!0);module.exports=function(t,e,n){return e+(n?r(t,e).length:1)};
},{"./_string-at":"x5yM"}],"GM7B":[function(require,module,exports) {
var e=require("./_cof"),t=require("./_wks")("toStringTag"),n="Arguments"==e(function(){return arguments}()),r=function(e,t){try{return e[t]}catch(n){}};module.exports=function(u){var o,c,i;return void 0===u?"Undefined":null===u?"Null":"string"==typeof(c=r(o=Object(u),t))?c:n?e(o):"Object"==(i=e(o))&&"function"==typeof o.callee?"Arguments":i};
},{"./_cof":"Z5df","./_wks":"AIP1"}],"sNFG":[function(require,module,exports) {
"use strict";var e=require("./_classof"),r=RegExp.prototype.exec;module.exports=function(t,o){var c=t.exec;if("function"==typeof c){var n=c.call(t,o);if("object"!=typeof n)throw new TypeError("RegExp exec method returned something other than an Object or null");return n}if("RegExp"!==e(t))throw new TypeError("RegExp#exec called on incompatible receiver");return r.call(t,o)};
},{"./_classof":"GM7B"}],"hgks":[function(require,module,exports) {
"use strict";var e=require("./_an-object");module.exports=function(){var i=e(this),r="";return i.global&&(r+="g"),i.ignoreCase&&(r+="i"),i.multiline&&(r+="m"),i.unicode&&(r+="u"),i.sticky&&(r+="y"),r};
},{"./_an-object":"eT53"}],"ZcPD":[function(require,module,exports) {
"use strict";var e=require("./_flags"),l=RegExp.prototype.exec,t=String.prototype.replace,r=l,a="lastIndex",n=function(){var e=/a/,t=/b*/g;return l.call(e,"a"),l.call(t,"a"),0!==e[a]||0!==t[a]}(),o=void 0!==/()??/.exec("")[1],c=n||o;c&&(r=function(r){var c,i,g,u,p=this;return o&&(i=new RegExp("^"+p.source+"$(?!\\s)",e.call(p))),n&&(c=p[a]),g=l.call(p,r),n&&g&&(p[a]=p.global?g.index+g[0].length:c),o&&g&&g.length>1&&t.call(g[0],i,function(){for(u=1;u<arguments.length-2;u++)void 0===arguments[u]&&(g[u]=void 0)}),g}),module.exports=r;
},{"./_flags":"hgks"}],"S07n":[function(require,module,exports) {
"use strict";var e=require("./_regexp-exec");require("./_export")({target:"RegExp",proto:!0,forced:e!==/./.exec},{exec:e});
},{"./_regexp-exec":"ZcPD","./_export":"izCb"}],"LmBS":[function(require,module,exports) {
"use strict";require("./es6.regexp.exec");var e=require("./_redefine"),r=require("./_hide"),n=require("./_fails"),t=require("./_defined"),u=require("./_wks"),i=require("./_regexp-exec"),c=u("species"),o=!n(function(){var e=/./;return e.exec=function(){var e=[];return e.groups={a:"7"},e},"7"!=="".replace(e,"$<a>")}),a=function(){var e=/(?:)/,r=e.exec;e.exec=function(){return r.apply(this,arguments)};var n="ab".split(e);return 2===n.length&&"a"===n[0]&&"b"===n[1]}();module.exports=function(l,f,p){var s=u(l),v=!n(function(){var e={};return e[s]=function(){return 7},7!=""[l](e)}),x=v?!n(function(){var e=!1,r=/a/;return r.exec=function(){return e=!0,null},"split"===l&&(r.constructor={},r.constructor[c]=function(){return r}),r[s](""),!e}):void 0;if(!v||!x||"replace"===l&&!o||"split"===l&&!a){var d=/./[s],q=p(t,s,""[l],function(e,r,n,t,u){return r.exec===i?v&&!u?{done:!0,value:d.call(r,n,t)}:{done:!0,value:e.call(n,r,t)}:{done:!1}}),g=q[0],_=q[1];e(String.prototype,l,g),r(RegExp.prototype,s,2==f?function(e,r){return _.call(e,this,r)}:function(e){return _.call(e,this)})}};
},{"./es6.regexp.exec":"S07n","./_redefine":"PHot","./_hide":"NXbe","./_fails":"BXiR","./_defined":"BjjL","./_wks":"AIP1","./_regexp-exec":"ZcPD"}],"RTfC":[function(require,module,exports) {
"use strict";var r=require("./_an-object"),e=require("./_to-length"),n=require("./_advance-string-index"),t=require("./_regexp-exec-abstract");require("./_fix-re-wks")("match",1,function(i,a,u,l){return[function(r){var e=i(this),n=null==r?void 0:r[a];return void 0!==n?n.call(r,e):new RegExp(r)[a](String(e))},function(i){var a=l(u,i,this);if(a.done)return a.value;var c=r(i),o=String(this);if(!c.global)return t(c,o);var s=c.unicode;c.lastIndex=0;for(var v,d=[],g=0;null!==(v=t(c,o));){var x=String(v[0]);d[g]=x,""===x&&(c.lastIndex=n(o,e(c.lastIndex),s)),g++}return 0===g?null:d}]});
},{"./_an-object":"eT53","./_to-length":"dJBs","./_advance-string-index":"t3as","./_regexp-exec-abstract":"sNFG","./_fix-re-wks":"LmBS"}],"KGao":[function(require,module,exports) {
var global = arguments[3];
var r=arguments[3],e=require("./_an-object"),t=require("./_to-object"),n=require("./_to-length"),i=require("./_to-integer"),a=require("./_advance-string-index"),u=require("./_regexp-exec-abstract"),c=Math.max,l=Math.min,o=Math.floor,v=/\$([$&`']|\d\d?|<[^>]*>)/g,s=/\$([$&`']|\d\d?)/g,g=function(r){return void 0===r?r:String(r)};require("./_fix-re-wks")("replace",2,function(r,d,f,h){return[function(e,t){var n=r(this),i=null==e?void 0:e[d];return void 0!==i?i.call(e,n,t):f.call(String(n),e,t)},function(r,t){var o=h(f,r,this,t);if(o.done)return o.value;var v=e(r),s=String(this),d="function"==typeof t;d||(t=String(t));var x=v.global;if(x){var b=v.unicode;v.lastIndex=0}for(var q=[];;){var S=u(v,s);if(null===S)break;if(q.push(S),!x)break;""===String(S[0])&&(v.lastIndex=a(s,n(v.lastIndex),b))}for(var _="",$=0,k=0;k<q.length;k++){S=q[k];for(var m=String(S[0]),A=c(l(i(S.index),s.length),0),I=[],M=1;M<S.length;M++)I.push(g(S[M]));var j=S.groups;if(d){var w=[m].concat(I,A,s);void 0!==j&&w.push(j);var y=String(t.apply(void 0,w))}else y=p(m,s,A,I,j,t);A>=$&&(_+=s.slice($,A)+y,$=A+m.length)}return _+s.slice($)}];function p(r,e,n,i,a,u){var c=n+r.length,l=i.length,g=s;return void 0!==a&&(a=t(a),g=v),f.call(u,g,function(t,u){var v;switch(u.charAt(0)){case"$":return"$";case"&":return r;case"`":return e.slice(0,n);case"'":return e.slice(c);case"<":v=a[u.slice(1,-1)];break;default:var s=+u;if(0===s)return t;if(s>l){var g=o(s/10);return 0===g?t:g<=l?void 0===i[g-1]?u.charAt(1):i[g-1]+u.charAt(1):t}v=i[s-1]}return void 0===v?"":v})}});
},{"./_an-object":"eT53","./_to-object":"rfVX","./_to-length":"dJBs","./_to-integer":"yjVO","./_advance-string-index":"t3as","./_regexp-exec-abstract":"sNFG","./_fix-re-wks":"LmBS"}],"zutv":[function(require,module,exports) {
module.exports=Object.is||function(e,t){return e===t?0!==e||1/e==1/t:e!=e&&t!=t};
},{}],"zOab":[function(require,module,exports) {
"use strict";var e=require("./_an-object"),r=require("./_same-value"),n=require("./_regexp-exec-abstract");require("./_fix-re-wks")("search",1,function(t,i,a,u){return[function(e){var r=t(this),n=null==e?void 0:e[i];return void 0!==n?n.call(e,r):new RegExp(e)[i](String(r))},function(t){var i=u(a,t,this);if(i.done)return i.value;var s=e(t),l=String(this),c=s.lastIndex;r(c,0)||(s.lastIndex=0);var v=n(s,l);return r(s.lastIndex,c)||(s.lastIndex=c),null===v?-1:v.index}]});
},{"./_an-object":"eT53","./_same-value":"zutv","./_regexp-exec-abstract":"sNFG","./_fix-re-wks":"LmBS"}],"ExG3":[function(require,module,exports) {
var r=require("./_an-object"),e=require("./_a-function"),u=require("./_wks")("species");module.exports=function(n,o){var i,t=r(n).constructor;return void 0===t||null==(i=r(t)[u])?o:e(i)};
},{"./_an-object":"eT53","./_a-function":"kYjc","./_wks":"AIP1"}],"aOHf":[function(require,module,exports) {
"use strict";var e=require("./_is-regexp"),r=require("./_an-object"),i=require("./_species-constructor"),n=require("./_advance-string-index"),t=require("./_to-length"),u=require("./_regexp-exec-abstract"),l=require("./_regexp-exec"),s=require("./_fails"),c=Math.min,a=[].push,o="split",g="length",h="lastIndex",d=4294967295,f=!s(function(){RegExp(d,"y")});require("./_fix-re-wks")("split",2,function(s,v,p,x){var q;return q="c"=="abbc"[o](/(b)*/)[1]||4!="test"[o](/(?:)/,-1)[g]||2!="ab"[o](/(?:ab)*/)[g]||4!="."[o](/(.?)(.?)/)[g]||"."[o](/()()/)[g]>1||""[o](/.?/)[g]?function(r,i){var n=String(this);if(void 0===r&&0===i)return[];if(!e(r))return p.call(n,r,i);for(var t,u,s,c=[],o=(r.ignoreCase?"i":"")+(r.multiline?"m":"")+(r.unicode?"u":"")+(r.sticky?"y":""),f=0,v=void 0===i?d:i>>>0,x=new RegExp(r.source,o+"g");(t=l.call(x,n))&&!((u=x[h])>f&&(c.push(n.slice(f,t.index)),t[g]>1&&t.index<n[g]&&a.apply(c,t.slice(1)),s=t[0][g],f=u,c[g]>=v));)x[h]===t.index&&x[h]++;return f===n[g]?!s&&x.test("")||c.push(""):c.push(n.slice(f)),c[g]>v?c.slice(0,v):c}:"0"[o](void 0,0)[g]?function(e,r){return void 0===e&&0===r?[]:p.call(this,e,r)}:p,[function(e,r){var i=s(this),n=null==e?void 0:e[v];return void 0!==n?n.call(e,i,r):q.call(String(i),e,r)},function(e,l){var s=x(q,e,this,l,q!==p);if(s.done)return s.value;var a=r(e),o=String(this),g=i(a,RegExp),h=a.unicode,v=(a.ignoreCase?"i":"")+(a.multiline?"m":"")+(a.unicode?"u":"")+(f?"y":"g"),_=new g(f?a:"^(?:"+a.source+")",v),b=void 0===l?d:l>>>0;if(0===b)return[];if(0===o.length)return null===u(_,o)?[o]:[];for(var m=0,y=0,w=[];y<o.length;){_.lastIndex=f?y:0;var E,I=u(_,f?o:o.slice(y));if(null===I||(E=c(t(_.lastIndex+(f?0:y)),o.length))===m)y=n(o,y,h);else{if(w.push(o.slice(m,y)),w.length===b)return w;for(var R=1;R<=I.length-1;R++)if(w.push(I[R]),w.length===b)return w;y=m=E}}return w.push(o.slice(m)),w}]});
},{"./_is-regexp":"WEVF","./_an-object":"eT53","./_species-constructor":"ExG3","./_advance-string-index":"t3as","./_to-length":"dJBs","./_regexp-exec-abstract":"sNFG","./_regexp-exec":"ZcPD","./_fails":"BXiR","./_fix-re-wks":"LmBS"}],"mfdM":[function(require,module,exports) {
require("../modules/es6.string.from-code-point"),require("../modules/es6.string.raw"),require("../modules/es6.string.trim"),require("../modules/es6.string.iterator"),require("../modules/es6.string.code-point-at"),require("../modules/es6.string.ends-with"),require("../modules/es6.string.includes"),require("../modules/es6.string.repeat"),require("../modules/es6.string.starts-with"),require("../modules/es6.string.anchor"),require("../modules/es6.string.big"),require("../modules/es6.string.blink"),require("../modules/es6.string.bold"),require("../modules/es6.string.fixed"),require("../modules/es6.string.fontcolor"),require("../modules/es6.string.fontsize"),require("../modules/es6.string.italics"),require("../modules/es6.string.link"),require("../modules/es6.string.small"),require("../modules/es6.string.strike"),require("../modules/es6.string.sub"),require("../modules/es6.string.sup"),require("../modules/es6.regexp.match"),require("../modules/es6.regexp.replace"),require("../modules/es6.regexp.search"),require("../modules/es6.regexp.split"),module.exports=require("../modules/_core").String;
},{"../modules/es6.string.from-code-point":"xSM3","../modules/es6.string.raw":"t29D","../modules/es6.string.trim":"ZW4n","../modules/es6.string.iterator":"tbKg","../modules/es6.string.code-point-at":"zR9y","../modules/es6.string.ends-with":"zRn7","../modules/es6.string.includes":"fH7p","../modules/es6.string.repeat":"C85R","../modules/es6.string.starts-with":"w2SA","../modules/es6.string.anchor":"USd7","../modules/es6.string.big":"c1D0","../modules/es6.string.blink":"Ee86","../modules/es6.string.bold":"ry39","../modules/es6.string.fixed":"AHLq","../modules/es6.string.fontcolor":"H7V0","../modules/es6.string.fontsize":"Dx83","../modules/es6.string.italics":"fRhg","../modules/es6.string.link":"Aaz0","../modules/es6.string.small":"qBr3","../modules/es6.string.strike":"eNyu","../modules/es6.string.sub":"BVLK","../modules/es6.string.sup":"kMsL","../modules/es6.regexp.match":"RTfC","../modules/es6.regexp.replace":"KGao","../modules/es6.regexp.search":"zOab","../modules/es6.regexp.split":"aOHf","../modules/_core":"ss9A"}],"zTK3":[function(require,module,exports) {
"use strict";var e=require("./_classof"),r={};r[require("./_wks")("toStringTag")]="z",r+""!="[object z]"&&require("./_redefine")(Object.prototype,"toString",function(){return"[object "+e(this)+"]"},!0);
},{"./_classof":"GM7B","./_wks":"AIP1","./_redefine":"PHot"}],"Z7eD":[function(require,module,exports) {
var e=require("./_wks")("unscopables"),r=Array.prototype;null==r[e]&&require("./_hide")(r,e,{}),module.exports=function(o){r[e][o]=!0};
},{"./_wks":"AIP1","./_hide":"NXbe"}],"x8b3":[function(require,module,exports) {
module.exports=function(e,n){return{value:n,done:!!e}};
},{}],"wVEN":[function(require,module,exports) {
"use strict";var e=require("./_add-to-unscopables"),r=require("./_iter-step"),t=require("./_iterators"),i=require("./_to-iobject");module.exports=require("./_iter-define")(Array,"Array",function(e,r){this._t=i(e),this._i=0,this._k=r},function(){var e=this._t,t=this._k,i=this._i++;return!e||i>=e.length?(this._t=void 0,r(1)):r(0,"keys"==t?i:"values"==t?e[i]:[i,e[i]])},"values"),t.Arguments=t.Array,e("keys"),e("values"),e("entries");
},{"./_add-to-unscopables":"Z7eD","./_iter-step":"x8b3","./_iterators":"JO4d","./_to-iobject":"g6sb","./_iter-define":"mH0U"}],"v6Aj":[function(require,module,exports) {

for(var e=require("./es6.array.iterator"),t=require("./_object-keys"),i=require("./_redefine"),r=require("./_global"),s=require("./_hide"),L=require("./_iterators"),a=require("./_wks"),o=a("iterator"),l=a("toStringTag"),S=L.Array,n={CSSRuleList:!0,CSSStyleDeclaration:!1,CSSValueList:!1,ClientRectList:!1,DOMRectList:!1,DOMStringList:!1,DOMTokenList:!0,DataTransferItemList:!1,FileList:!1,HTMLAllCollection:!1,HTMLCollection:!1,HTMLFormElement:!1,HTMLSelectElement:!1,MediaList:!0,MimeTypeArray:!1,NamedNodeMap:!1,NodeList:!0,PaintRequestList:!1,Plugin:!1,PluginArray:!1,SVGLengthList:!1,SVGNumberList:!1,SVGPathSegList:!1,SVGPointList:!1,SVGStringList:!1,SVGTransformList:!1,SourceBufferList:!1,StyleSheetList:!0,TextTrackCueList:!1,TextTrackList:!1,TouchList:!1},u=t(n),T=0;T<u.length;T++){var c,g=u[T],M=n[g],y=r[g],f=y&&y.prototype;if(f&&(f[o]||s(f,o,S),f[l]||s(f,l,g),L[g]=S,M))for(c in e)f[c]||i(f,c,e[c],!0)}
},{"./es6.array.iterator":"wVEN","./_object-keys":"U9a7","./_redefine":"PHot","./_global":"qf4T","./_hide":"NXbe","./_iterators":"JO4d","./_wks":"AIP1"}],"J0Tl":[function(require,module,exports) {
var r=require("./_redefine");module.exports=function(e,n,i){for(var o in n)r(e,o,n[o],i);return e};
},{"./_redefine":"PHot"}],"yJTF":[function(require,module,exports) {
module.exports=function(o,n,r,i){if(!(o instanceof n)||void 0!==i&&i in o)throw TypeError(r+": incorrect invocation!");return o};
},{}],"RnOJ":[function(require,module,exports) {
var r=require("./_an-object");module.exports=function(t,e,o,a){try{return a?e(r(o)[0],o[1]):e(o)}catch(n){var c=t.return;throw void 0!==c&&r(c.call(t)),n}};
},{"./_an-object":"eT53"}],"B0pB":[function(require,module,exports) {
var r=require("./_iterators"),e=require("./_wks")("iterator"),t=Array.prototype;module.exports=function(o){return void 0!==o&&(r.Array===o||t[e]===o)};
},{"./_iterators":"JO4d","./_wks":"AIP1"}],"ia42":[function(require,module,exports) {
var r=require("./_classof"),e=require("./_wks")("iterator"),t=require("./_iterators");module.exports=require("./_core").getIteratorMethod=function(o){if(null!=o)return o[e]||o["@@iterator"]||t[r(o)]};
},{"./_classof":"GM7B","./_wks":"AIP1","./_iterators":"JO4d","./_core":"ss9A"}],"Abke":[function(require,module,exports) {
var e=require("./_ctx"),r=require("./_iter-call"),t=require("./_is-array-iter"),i=require("./_an-object"),o=require("./_to-length"),n=require("./core.get-iterator-method"),u={},a={},f=module.exports=function(f,l,c,q,_){var h,s,d,g,p=_?function(){return f}:n(f),v=e(c,q,l?2:1),x=0;if("function"!=typeof p)throw TypeError(f+" is not iterable!");if(t(p)){for(h=o(f.length);h>x;x++)if((g=l?v(i(s=f[x])[0],s[1]):v(f[x]))===u||g===a)return g}else for(d=p.call(f);!(s=d.next()).done;)if((g=r(d,v,s.value,l))===u||g===a)return g};f.BREAK=u,f.RETURN=a;
},{"./_ctx":"E3Kh","./_iter-call":"RnOJ","./_is-array-iter":"B0pB","./_an-object":"eT53","./_to-length":"dJBs","./core.get-iterator-method":"ia42"}],"h4dH":[function(require,module,exports) {

"use strict";var e=require("./_global"),r=require("./_object-dp"),i=require("./_descriptors"),t=require("./_wks")("species");module.exports=function(u){var s=e[u];i&&s&&!s[t]&&r.f(s,t,{configurable:!0,get:function(){return this}})};
},{"./_global":"qf4T","./_object-dp":"nw8e","./_descriptors":"P9Ib","./_wks":"AIP1"}],"AoVy":[function(require,module,exports) {
var e=require("./_uid")("meta"),r=require("./_is-object"),t=require("./_has"),n=require("./_object-dp").f,i=0,u=Object.isExtensible||function(){return!0},f=!require("./_fails")(function(){return u(Object.preventExtensions({}))}),o=function(r){n(r,e,{value:{i:"O"+ ++i,w:{}}})},s=function(n,i){if(!r(n))return"symbol"==typeof n?n:("string"==typeof n?"S":"P")+n;if(!t(n,e)){if(!u(n))return"F";if(!i)return"E";o(n)}return n[e].i},c=function(r,n){if(!t(r,e)){if(!u(r))return!0;if(!n)return!1;o(r)}return r[e].w},E=function(r){return f&&a.NEED&&u(r)&&!t(r,e)&&o(r),r},a=module.exports={KEY:e,NEED:!1,fastKey:s,getWeak:c,onFreeze:E};
},{"./_uid":"U49f","./_is-object":"M7z6","./_has":"uHgd","./_object-dp":"nw8e","./_fails":"BXiR"}],"FW4z":[function(require,module,exports) {
var r=require("./_is-object");module.exports=function(e,i){if(!r(e)||e._t!==i)throw TypeError("Incompatible receiver, "+i+" required!");return e};
},{"./_is-object":"M7z6"}],"aIiY":[function(require,module,exports) {
"use strict";var e=require("./_object-dp").f,r=require("./_object-create"),t=require("./_redefine-all"),i=require("./_ctx"),n=require("./_an-instance"),_=require("./_for-of"),o=require("./_iter-define"),u=require("./_iter-step"),f=require("./_set-species"),s=require("./_descriptors"),l=require("./_meta").fastKey,c=require("./_validate-collection"),v=s?"_s":"size",a=function(e,r){var t,i=l(r);if("F"!==i)return e._i[i];for(t=e._f;t;t=t.n)if(t.k==r)return t};module.exports={getConstructor:function(o,u,f,l){var h=o(function(e,t){n(e,h,u,"_i"),e._t=u,e._i=r(null),e._f=void 0,e._l=void 0,e[v]=0,null!=t&&_(t,f,e[l],e)});return t(h.prototype,{clear:function(){for(var e=c(this,u),r=e._i,t=e._f;t;t=t.n)t.r=!0,t.p&&(t.p=t.p.n=void 0),delete r[t.i];e._f=e._l=void 0,e[v]=0},delete:function(e){var r=c(this,u),t=a(r,e);if(t){var i=t.n,n=t.p;delete r._i[t.i],t.r=!0,n&&(n.n=i),i&&(i.p=n),r._f==t&&(r._f=i),r._l==t&&(r._l=n),r[v]--}return!!t},forEach:function(e){c(this,u);for(var r,t=i(e,arguments.length>1?arguments[1]:void 0,3);r=r?r.n:this._f;)for(t(r.v,r.k,this);r&&r.r;)r=r.p},has:function(e){return!!a(c(this,u),e)}}),s&&e(h.prototype,"size",{get:function(){return c(this,u)[v]}}),h},def:function(e,r,t){var i,n,_=a(e,r);return _?_.v=t:(e._l=_={i:n=l(r,!0),k:r,v:t,p:i=e._l,n:void 0,r:!1},e._f||(e._f=_),i&&(i.n=_),e[v]++,"F"!==n&&(e._i[n]=_)),e},getEntry:a,setStrong:function(e,r,t){o(e,r,function(e,t){this._t=c(e,r),this._k=t,this._l=void 0},function(){for(var e=this._k,r=this._l;r&&r.r;)r=r.p;return this._t&&(this._l=r=r?r.n:this._t._f)?u(0,"keys"==e?r.k:"values"==e?r.v:[r.k,r.v]):(this._t=void 0,u(1))},t?"entries":"values",!t,!0),f(r)}};
},{"./_object-dp":"nw8e","./_object-create":"sYaK","./_redefine-all":"J0Tl","./_ctx":"E3Kh","./_an-instance":"yJTF","./_for-of":"Abke","./_iter-define":"mH0U","./_iter-step":"x8b3","./_set-species":"h4dH","./_descriptors":"P9Ib","./_meta":"AoVy","./_validate-collection":"FW4z"}],"md62":[function(require,module,exports) {
var r=require("./_wks")("iterator"),t=!1;try{var n=[7][r]();n.return=function(){t=!0},Array.from(n,function(){throw 2})}catch(e){}module.exports=function(n,u){if(!u&&!t)return!1;var o=!1;try{var c=[7],a=c[r]();a.next=function(){return{done:o=!0}},c[r]=function(){return a},n(c)}catch(e){}return o};
},{"./_wks":"AIP1"}],"vjRp":[function(require,module,exports) {
exports.f={}.propertyIsEnumerable;
},{}],"uIjZ":[function(require,module,exports) {
var e=require("./_object-pie"),r=require("./_property-desc"),i=require("./_to-iobject"),t=require("./_to-primitive"),o=require("./_has"),c=require("./_ie8-dom-define"),u=Object.getOwnPropertyDescriptor;exports.f=require("./_descriptors")?u:function(p,q){if(p=i(p),q=t(q,!0),c)try{return u(p,q)}catch(_){}if(o(p,q))return r(!e.f.call(p,q),p[q])};
},{"./_object-pie":"vjRp","./_property-desc":"uJ6d","./_to-iobject":"g6sb","./_to-primitive":"y37I","./_has":"uHgd","./_ie8-dom-define":"o6Gq","./_descriptors":"P9Ib"}],"vn3S":[function(require,module,exports) {
var t=require("./_is-object"),e=require("./_an-object"),r=function(r,o){if(e(r),!t(o)&&null!==o)throw TypeError(o+": can't set as prototype!")};module.exports={set:Object.setPrototypeOf||("__proto__"in{}?function(t,e,o){try{(o=require("./_ctx")(Function.call,require("./_object-gopd").f(Object.prototype,"__proto__").set,2))(t,[]),e=!(t instanceof Array)}catch(c){e=!0}return function(t,c){return r(t,c),e?t.__proto__=c:o(t,c),t}}({},!1):void 0),check:r};
},{"./_is-object":"M7z6","./_an-object":"eT53","./_ctx":"E3Kh","./_object-gopd":"uIjZ"}],"ogxf":[function(require,module,exports) {
var t=require("./_is-object"),o=require("./_set-proto").set;module.exports=function(r,e,p){var u,n=e.constructor;return n!==p&&"function"==typeof n&&(u=n.prototype)!==p.prototype&&t(u)&&o&&o(r,u),r};
},{"./_is-object":"M7z6","./_set-proto":"vn3S"}],"hWYB":[function(require,module,exports) {

"use strict";var e=require("./_global"),r=require("./_export"),t=require("./_redefine"),n=require("./_redefine-all"),i=require("./_meta"),u=require("./_for-of"),o=require("./_an-instance"),c=require("./_is-object"),a=require("./_fails"),s=require("./_iter-detect"),l=require("./_set-to-string-tag"),f=require("./_inherit-if-required");module.exports=function(d,h,q,_,p,g){var v=e[d],w=v,y=p?"set":"add",x=w&&w.prototype,E={},b=function(e){var r=x[e];t(x,e,"delete"==e?function(e){return!(g&&!c(e))&&r.call(this,0===e?0:e)}:"has"==e?function(e){return!(g&&!c(e))&&r.call(this,0===e?0:e)}:"get"==e?function(e){return g&&!c(e)?void 0:r.call(this,0===e?0:e)}:"add"==e?function(e){return r.call(this,0===e?0:e),this}:function(e,t){return r.call(this,0===e?0:e,t),this})};if("function"==typeof w&&(g||x.forEach&&!a(function(){(new w).entries().next()}))){var m=new w,j=m[y](g?{}:-0,1)!=m,C=a(function(){m.has(1)}),D=s(function(e){new w(e)}),F=!g&&a(function(){for(var e=new w,r=5;r--;)e[y](r,r);return!e.has(-0)});D||((w=h(function(e,r){o(e,w,d);var t=f(new v,e,w);return null!=r&&u(r,p,t[y],t),t})).prototype=x,x.constructor=w),(C||F)&&(b("delete"),b("has"),p&&b("get")),(F||j)&&b(y),g&&x.clear&&delete x.clear}else w=_.getConstructor(h,d,p,y),n(w.prototype,q),i.NEED=!0;return l(w,d),E[d]=w,r(r.G+r.W+r.F*(w!=v),E),g||_.setStrong(w,d,p),w};
},{"./_global":"qf4T","./_export":"izCb","./_redefine":"PHot","./_redefine-all":"J0Tl","./_meta":"AoVy","./_for-of":"Abke","./_an-instance":"yJTF","./_is-object":"M7z6","./_fails":"BXiR","./_iter-detect":"md62","./_set-to-string-tag":"rq3q","./_inherit-if-required":"ogxf"}],"ioKM":[function(require,module,exports) {
"use strict";var t=require("./_collection-strong"),e=require("./_validate-collection"),r="Map";module.exports=require("./_collection")(r,function(t){return function(){return t(this,arguments.length>0?arguments[0]:void 0)}},{get:function(n){var i=t.getEntry(e(this,r),n);return i&&i.v},set:function(n,i){return t.def(e(this,r),0===n?0:n,i)}},t,!0);
},{"./_collection-strong":"aIiY","./_validate-collection":"FW4z","./_collection":"hWYB"}],"C0Ih":[function(require,module,exports) {
require("../modules/es6.object.to-string"),require("../modules/es6.string.iterator"),require("../modules/web.dom.iterable"),require("../modules/es6.map"),module.exports=require("../modules/_core").Map;
},{"../modules/es6.object.to-string":"zTK3","../modules/es6.string.iterator":"tbKg","../modules/web.dom.iterable":"v6Aj","../modules/es6.map":"ioKM","../modules/_core":"ss9A"}],"coyu":[function(require,module,exports) {
"use strict";var e=require("./_collection-strong"),t=require("./_validate-collection"),r="Set";module.exports=require("./_collection")(r,function(e){return function(){return e(this,arguments.length>0?arguments[0]:void 0)}},{add:function(i){return e.def(t(this,r),i=0===i?0:i,i)}},e);
},{"./_collection-strong":"aIiY","./_validate-collection":"FW4z","./_collection":"hWYB"}],"VvYp":[function(require,module,exports) {
require("../modules/es6.object.to-string"),require("../modules/es6.string.iterator"),require("../modules/web.dom.iterable"),require("../modules/es6.set"),module.exports=require("../modules/_core").Set;
},{"../modules/es6.object.to-string":"zTK3","../modules/es6.string.iterator":"tbKg","../modules/web.dom.iterable":"v6Aj","../modules/es6.set":"coyu","../modules/_core":"ss9A"}],"AuE7":[function(require,module,exports) {
exports.f=require("./_wks");
},{"./_wks":"AIP1"}],"r4vV":[function(require,module,exports) {

var r=require("./_global"),e=require("./_core"),o=require("./_library"),i=require("./_wks-ext"),l=require("./_object-dp").f;module.exports=function(u){var a=e.Symbol||(e.Symbol=o?{}:r.Symbol||{});"_"==u.charAt(0)||u in a||l(a,u,{value:i.f(u)})};
},{"./_global":"qf4T","./_core":"ss9A","./_library":"H21C","./_wks-ext":"AuE7","./_object-dp":"nw8e"}],"EWMd":[function(require,module,exports) {
exports.f=Object.getOwnPropertySymbols;
},{}],"jjwB":[function(require,module,exports) {
var e=require("./_object-keys"),r=require("./_object-gops"),o=require("./_object-pie");module.exports=function(t){var u=e(t),i=r.f;if(i)for(var c,f=i(t),a=o.f,l=0;f.length>l;)a.call(t,c=f[l++])&&u.push(c);return u};
},{"./_object-keys":"U9a7","./_object-gops":"EWMd","./_object-pie":"vjRp"}],"JTrm":[function(require,module,exports) {
var r=require("./_cof");module.exports=Array.isArray||function(e){return"Array"==r(e)};
},{"./_cof":"Z5df"}],"Vzm0":[function(require,module,exports) {
var e=require("./_object-keys-internal"),r=require("./_enum-bug-keys").concat("length","prototype");exports.f=Object.getOwnPropertyNames||function(t){return e(t,r)};
},{"./_object-keys-internal":"vL0Z","./_enum-bug-keys":"bbv4"}],"dvol":[function(require,module,exports) {
var e=require("./_to-iobject"),t=require("./_object-gopn").f,o={}.toString,r="object"==typeof window&&window&&Object.getOwnPropertyNames?Object.getOwnPropertyNames(window):[],n=function(e){try{return t(e)}catch(o){return r.slice()}};module.exports.f=function(c){return r&&"[object Window]"==o.call(c)?n(c):t(e(c))};
},{"./_to-iobject":"g6sb","./_object-gopn":"Vzm0"}],"uVn9":[function(require,module,exports) {

"use strict";var e=require("./_global"),r=require("./_has"),t=require("./_descriptors"),i=require("./_export"),n=require("./_redefine"),o=require("./_meta").KEY,u=require("./_fails"),s=require("./_shared"),f=require("./_set-to-string-tag"),c=require("./_uid"),a=require("./_wks"),l=require("./_wks-ext"),p=require("./_wks-define"),b=require("./_enum-keys"),y=require("./_is-array"),h=require("./_an-object"),_=require("./_is-object"),q=require("./_to-object"),g=require("./_to-iobject"),m=require("./_to-primitive"),v=require("./_property-desc"),d=require("./_object-create"),S=require("./_object-gopn-ext"),j=require("./_object-gopd"),O=require("./_object-gops"),w=require("./_object-dp"),k=require("./_object-keys"),P=j.f,F=w.f,E=S.f,N=e.Symbol,J=e.JSON,x=J&&J.stringify,I="prototype",T=a("_hidden"),C=a("toPrimitive"),M={}.propertyIsEnumerable,D=s("symbol-registry"),G=s("symbols"),K=s("op-symbols"),Q=Object[I],W="function"==typeof N&&!!O.f,Y=e.QObject,z=!Y||!Y[I]||!Y[I].findChild,A=t&&u(function(){return 7!=d(F({},"a",{get:function(){return F(this,"a",{value:7}).a}})).a})?function(e,r,t){var i=P(Q,r);i&&delete Q[r],F(e,r,t),i&&e!==Q&&F(Q,r,i)}:F,B=function(e){var r=G[e]=d(N[I]);return r._k=e,r},H=W&&"symbol"==typeof N.iterator?function(e){return"symbol"==typeof e}:function(e){return e instanceof N},L=function(e,t,i){return e===Q&&L(K,t,i),h(e),t=m(t,!0),h(i),r(G,t)?(i.enumerable?(r(e,T)&&e[T][t]&&(e[T][t]=!1),i=d(i,{enumerable:v(0,!1)})):(r(e,T)||F(e,T,v(1,{})),e[T][t]=!0),A(e,t,i)):F(e,t,i)},R=function(e,r){h(e);for(var t,i=b(r=g(r)),n=0,o=i.length;o>n;)L(e,t=i[n++],r[t]);return e},U=function(e,r){return void 0===r?d(e):R(d(e),r)},V=function(e){var t=M.call(this,e=m(e,!0));return!(this===Q&&r(G,e)&&!r(K,e))&&(!(t||!r(this,e)||!r(G,e)||r(this,T)&&this[T][e])||t)},X=function(e,t){if(e=g(e),t=m(t,!0),e!==Q||!r(G,t)||r(K,t)){var i=P(e,t);return!i||!r(G,t)||r(e,T)&&e[T][t]||(i.enumerable=!0),i}},Z=function(e){for(var t,i=E(g(e)),n=[],u=0;i.length>u;)r(G,t=i[u++])||t==T||t==o||n.push(t);return n},$=function(e){for(var t,i=e===Q,n=E(i?K:g(e)),o=[],u=0;n.length>u;)!r(G,t=n[u++])||i&&!r(Q,t)||o.push(G[t]);return o};W||(n((N=function(){if(this instanceof N)throw TypeError("Symbol is not a constructor!");var e=c(arguments.length>0?arguments[0]:void 0),i=function(t){this===Q&&i.call(K,t),r(this,T)&&r(this[T],e)&&(this[T][e]=!1),A(this,e,v(1,t))};return t&&z&&A(Q,e,{configurable:!0,set:i}),B(e)})[I],"toString",function(){return this._k}),j.f=X,w.f=L,require("./_object-gopn").f=S.f=Z,require("./_object-pie").f=V,O.f=$,t&&!require("./_library")&&n(Q,"propertyIsEnumerable",V,!0),l.f=function(e){return B(a(e))}),i(i.G+i.W+i.F*!W,{Symbol:N});for(var ee="hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables".split(","),re=0;ee.length>re;)a(ee[re++]);for(var te=k(a.store),ie=0;te.length>ie;)p(te[ie++]);i(i.S+i.F*!W,"Symbol",{for:function(e){return r(D,e+="")?D[e]:D[e]=N(e)},keyFor:function(e){if(!H(e))throw TypeError(e+" is not a symbol!");for(var r in D)if(D[r]===e)return r},useSetter:function(){z=!0},useSimple:function(){z=!1}}),i(i.S+i.F*!W,"Object",{create:U,defineProperty:L,defineProperties:R,getOwnPropertyDescriptor:X,getOwnPropertyNames:Z,getOwnPropertySymbols:$});var ne=u(function(){O.f(1)});i(i.S+i.F*ne,"Object",{getOwnPropertySymbols:function(e){return O.f(q(e))}}),J&&i(i.S+i.F*(!W||u(function(){var e=N();return"[null]"!=x([e])||"{}"!=x({a:e})||"{}"!=x(Object(e))})),"JSON",{stringify:function(e){for(var r,t,i=[e],n=1;arguments.length>n;)i.push(arguments[n++]);if(t=r=i[1],(_(r)||void 0!==e)&&!H(e))return y(r)||(r=function(e,r){if("function"==typeof t&&(r=t.call(this,e,r)),!H(r))return r}),i[1]=r,x.apply(J,i)}}),N[I][C]||require("./_hide")(N[I],C,N[I].valueOf),f(N,"Symbol"),f(Math,"Math",!0),f(e.JSON,"JSON",!0);
},{"./_global":"qf4T","./_has":"uHgd","./_descriptors":"P9Ib","./_export":"izCb","./_redefine":"PHot","./_meta":"AoVy","./_fails":"BXiR","./_shared":"zGcK","./_set-to-string-tag":"rq3q","./_uid":"U49f","./_wks":"AIP1","./_wks-ext":"AuE7","./_wks-define":"r4vV","./_enum-keys":"jjwB","./_is-array":"JTrm","./_an-object":"eT53","./_is-object":"M7z6","./_to-object":"rfVX","./_to-iobject":"g6sb","./_to-primitive":"y37I","./_property-desc":"uJ6d","./_object-create":"sYaK","./_object-gopn-ext":"dvol","./_object-gopd":"uIjZ","./_object-gops":"EWMd","./_object-dp":"nw8e","./_object-keys":"U9a7","./_object-gopn":"Vzm0","./_object-pie":"vjRp","./_library":"H21C","./_hide":"NXbe"}],"CtPZ":[function(require,module,exports) {
require("../modules/es6.symbol"),require("../modules/es6.object.to-string"),module.exports=require("../modules/_core").Symbol;
},{"../modules/es6.symbol":"uVn9","../modules/es6.object.to-string":"zTK3","../modules/_core":"ss9A"}],"TLss":[function(require,module,exports) {
"use strict";var r=require("./_export"),e=require("./_array-includes")(!0);r(r.P,"Array",{includes:function(r){return e(this,r,arguments.length>1?arguments[1]:void 0)}}),require("./_add-to-unscopables")("includes");
},{"./_export":"izCb","./_array-includes":"Ca7J","./_add-to-unscopables":"Z7eD"}],"rQfI":[function(require,module,exports) {
require("../../modules/es7.array.includes"),module.exports=require("../../modules/_core").Array.includes;
},{"../../modules/es7.array.includes":"TLss","../../modules/_core":"ss9A"}],"GGTW":[function(require,module,exports) {
"use strict";var e;Object.defineProperty(exports,"__esModule",{value:!0}),exports.ContextualKeyword=void 0,exports.ContextualKeyword=e,function(e){e[e.NONE=0]="NONE";e[e._abstract=1]="_abstract";e[e._as=2]="_as";e[e._asserts=3]="_asserts";e[e._async=4]="_async";e[e._await=5]="_await";e[e._checks=6]="_checks";e[e._constructor=7]="_constructor";e[e._declare=8]="_declare";e[e._enum=9]="_enum";e[e._exports=10]="_exports";e[e._from=11]="_from";e[e._get=12]="_get";e[e._global=13]="_global";e[e._implements=14]="_implements";e[e._infer=15]="_infer";e[e._interface=16]="_interface";e[e._is=17]="_is";e[e._keyof=18]="_keyof";e[e._mixins=19]="_mixins";e[e._module=20]="_module";e[e._namespace=21]="_namespace";e[e._of=22]="_of";e[e._opaque=23]="_opaque";e[e._private=24]="_private";e[e._protected=25]="_protected";e[e._proto=26]="_proto";e[e._public=27]="_public";e[e._readonly=28]="_readonly";e[e._require=29]="_require";e[e._set=30]="_set";e[e._static=31]="_static";e[e._type=32]="_type";e[e._unique=33]="_unique"}(e||(exports.ContextualKeyword=e={}));
},{}],"sS1T":[function(require,module,exports) {
"use strict";var e;function r(r){switch(r){case e.num:return"num";case e.bigint:return"bigint";case e.regexp:return"regexp";case e.string:return"string";case e.name:return"name";case e.eof:return"eof";case e.bracketL:return"[";case e.bracketR:return"]";case e.braceL:return"{";case e.braceBarL:return"{|";case e.braceR:return"}";case e.braceBarR:return"|}";case e.parenL:return"(";case e.parenR:return")";case e.comma:return",";case e.semi:return";";case e.colon:return":";case e.doubleColon:return"::";case e.dot:return".";case e.question:return"?";case e.questionDot:return"?.";case e.arrow:return"=>";case e.template:return"template";case e.ellipsis:return"...";case e.backQuote:return"`";case e.dollarBraceL:return"${";case e.at:return"@";case e.hash:return"#";case e.eq:return"=";case e.assign:return"_=";case e.preIncDec:case e.postIncDec:return"++/--";case e.bang:return"!";case e.tilde:return"~";case e.pipeline:return"|>";case e.nullishCoalescing:return"??";case e.logicalOR:return"||";case e.logicalAND:return"&&";case e.bitwiseOR:return"|";case e.bitwiseXOR:return"^";case e.bitwiseAND:return"&";case e.equality:return"==/!=";case e.lessThan:return"<";case e.greaterThan:return">";case e.relationalOrEqual:return"<=/>=";case e.bitShift:return"<</>>";case e.plus:return"+";case e.minus:return"-";case e.modulo:return"%";case e.star:return"*";case e.slash:return"/";case e.exponent:return"**";case e.jsxName:return"jsxName";case e.jsxText:return"jsxText";case e.jsxTagStart:return"jsxTagStart";case e.jsxTagEnd:return"jsxTagEnd";case e.typeParameterStart:return"typeParameterStart";case e.nonNullAssertion:return"nonNullAssertion";case e._break:return"break";case e._case:return"case";case e._catch:return"catch";case e._continue:return"continue";case e._debugger:return"debugger";case e._default:return"default";case e._do:return"do";case e._else:return"else";case e._finally:return"finally";case e._for:return"for";case e._function:return"function";case e._if:return"if";case e._return:return"return";case e._switch:return"switch";case e._throw:return"throw";case e._try:return"try";case e._var:return"var";case e._let:return"let";case e._const:return"const";case e._while:return"while";case e._with:return"with";case e._new:return"new";case e._this:return"this";case e._super:return"super";case e._class:return"class";case e._extends:return"extends";case e._export:return"export";case e._import:return"import";case e._yield:return"yield";case e._null:return"null";case e._true:return"true";case e._false:return"false";case e._in:return"in";case e._instanceof:return"instanceof";case e._typeof:return"typeof";case e._void:return"void";case e._delete:return"delete";case e._async:return"async";case e._get:return"get";case e._set:return"set";case e._declare:return"declare";case e._readonly:return"readonly";case e._abstract:return"abstract";case e._static:return"static";case e._public:return"public";case e._private:return"private";case e._protected:return"protected";case e._as:return"as";case e._enum:return"enum";case e._type:return"type";case e._implements:return"implements";default:return""}}Object.defineProperty(exports,"__esModule",{value:!0}),exports.formatTokenType=r,exports.TokenType=void 0,exports.TokenType=e,function(e){e[e.PRECEDENCE_MASK=15]="PRECEDENCE_MASK";e[e.IS_KEYWORD=16]="IS_KEYWORD";e[e.IS_ASSIGN=32]="IS_ASSIGN";e[e.IS_RIGHT_ASSOCIATIVE=64]="IS_RIGHT_ASSOCIATIVE";e[e.IS_PREFIX=128]="IS_PREFIX";e[e.IS_POSTFIX=256]="IS_POSTFIX";e[e.num=0]="num";e[e.bigint=512]="bigint";e[e.regexp=1024]="regexp";e[e.string=1536]="string";e[e.name=2048]="name";e[e.eof=2560]="eof";e[e.bracketL=3072]="bracketL";e[e.bracketR=3584]="bracketR";e[e.braceL=4096]="braceL";e[e.braceBarL=4608]="braceBarL";e[e.braceR=5120]="braceR";e[e.braceBarR=5632]="braceBarR";e[e.parenL=6144]="parenL";e[e.parenR=6656]="parenR";e[e.comma=7168]="comma";e[e.semi=7680]="semi";e[e.colon=8192]="colon";e[e.doubleColon=8704]="doubleColon";e[e.dot=9216]="dot";e[e.question=9728]="question";e[e.questionDot=10240]="questionDot";e[e.arrow=10752]="arrow";e[e.template=11264]="template";e[e.ellipsis=11776]="ellipsis";e[e.backQuote=12288]="backQuote";e[e.dollarBraceL=12800]="dollarBraceL";e[e.at=13312]="at";e[e.hash=13824]="hash";e[e.eq=14368]="eq";e[e.assign=14880]="assign";e[e.preIncDec=15744]="preIncDec";e[e.postIncDec=16256]="postIncDec";e[e.bang=16512]="bang";e[e.tilde=17024]="tilde";e[e.pipeline=17409]="pipeline";e[e.nullishCoalescing=17922]="nullishCoalescing";e[e.logicalOR=18434]="logicalOR";e[e.logicalAND=18947]="logicalAND";e[e.bitwiseOR=19460]="bitwiseOR";e[e.bitwiseXOR=19973]="bitwiseXOR";e[e.bitwiseAND=20486]="bitwiseAND";e[e.equality=20999]="equality";e[e.lessThan=21512]="lessThan";e[e.greaterThan=22024]="greaterThan";e[e.relationalOrEqual=22536]="relationalOrEqual";e[e.bitShift=23049]="bitShift";e[e.plus=23690]="plus";e[e.minus=24202]="minus";e[e.modulo=24587]="modulo";e[e.star=25099]="star";e[e.slash=25611]="slash";e[e.exponent=26188]="exponent";e[e.jsxName=26624]="jsxName";e[e.jsxText=27136]="jsxText";e[e.jsxTagStart=27648]="jsxTagStart";e[e.jsxTagEnd=28160]="jsxTagEnd";e[e.typeParameterStart=28672]="typeParameterStart";e[e.nonNullAssertion=29184]="nonNullAssertion";e[e._break=29712]="_break";e[e._case=30224]="_case";e[e._catch=30736]="_catch";e[e._continue=31248]="_continue";e[e._debugger=31760]="_debugger";e[e._default=32272]="_default";e[e._do=32784]="_do";e[e._else=33296]="_else";e[e._finally=33808]="_finally";e[e._for=34320]="_for";e[e._function=34832]="_function";e[e._if=35344]="_if";e[e._return=35856]="_return";e[e._switch=36368]="_switch";e[e._throw=37008]="_throw";e[e._try=37392]="_try";e[e._var=37904]="_var";e[e._let=38416]="_let";e[e._const=38928]="_const";e[e._while=39440]="_while";e[e._with=39952]="_with";e[e._new=40464]="_new";e[e._this=40976]="_this";e[e._super=41488]="_super";e[e._class=42e3]="_class";e[e._extends=42512]="_extends";e[e._export=43024]="_export";e[e._import=43536]="_import";e[e._yield=44048]="_yield";e[e._null=44560]="_null";e[e._true=45072]="_true";e[e._false=45584]="_false";e[e._in=46104]="_in";e[e._instanceof=46616]="_instanceof";e[e._typeof=47248]="_typeof";e[e._void=47760]="_void";e[e._delete=48272]="_delete";e[e._async=48656]="_async";e[e._get=49168]="_get";e[e._set=49680]="_set";e[e._declare=50192]="_declare";e[e._readonly=50704]="_readonly";e[e._abstract=51216]="_abstract";e[e._static=51728]="_static";e[e._public=52240]="_public";e[e._private=52752]="_private";e[e._protected=53264]="_protected";e[e._as=53776]="_as";e[e._enum=54288]="_enum";e[e._type=54800]="_type";e[e._implements=55312]="_implements"}(e||(exports.TokenType=e={}));
},{}],"Z7yX":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=exports.StateSnapshot=exports.Scope=void 0;var t=require("./keywords"),e=require("./types");function i(t,e){for(var i=0;i<e.length;i++){var n=e[i];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function n(t,e,n){return e&&i(t.prototype,e),n&&i(t,n),t}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var s=function t(e,i,n){o(this,t),this.startTokenIndex=e,this.endTokenIndex=i,this.isFunctionScope=n};exports.Scope=s;var r=function t(e,i,n,s,r,h,p,a,l,c,u,y){o(this,t),this.potentialArrowAt=e,this.noAnonFunctionType=i,this.tokensLength=n,this.scopesLength=s,this.pos=r,this.type=h,this.contextualKeyword=p,this.start=a,this.end=l,this.isType=c,this.scopeDepth=u,this.error=y};exports.StateSnapshot=r;var h=function(){function i(){o(this,i),i.prototype.__init.call(this),i.prototype.__init2.call(this),i.prototype.__init3.call(this),i.prototype.__init4.call(this),i.prototype.__init5.call(this),i.prototype.__init6.call(this),i.prototype.__init7.call(this),i.prototype.__init8.call(this),i.prototype.__init9.call(this),i.prototype.__init10.call(this),i.prototype.__init11.call(this),i.prototype.__init12.call(this)}return n(i,[{key:"__init",value:function(){this.potentialArrowAt=-1}},{key:"__init2",value:function(){this.noAnonFunctionType=!1}},{key:"__init3",value:function(){this.tokens=[]}},{key:"__init4",value:function(){this.scopes=[]}},{key:"__init5",value:function(){this.pos=0}},{key:"__init6",value:function(){this.type=e.TokenType.eof}},{key:"__init7",value:function(){this.contextualKeyword=t.ContextualKeyword.NONE}},{key:"__init8",value:function(){this.start=0}},{key:"__init9",value:function(){this.end=0}},{key:"__init10",value:function(){this.isType=!1}},{key:"__init11",value:function(){this.scopeDepth=0}},{key:"__init12",value:function(){this.error=null}},{key:"snapshot",value:function(){return new r(this.potentialArrowAt,this.noAnonFunctionType,this.tokens.length,this.scopes.length,this.pos,this.type,this.contextualKeyword,this.start,this.end,this.isType,this.scopeDepth,this.error)}},{key:"restoreFromSnapshot",value:function(t){this.potentialArrowAt=t.potentialArrowAt,this.noAnonFunctionType=t.noAnonFunctionType,this.tokens.length=t.tokensLength,this.scopes.length=t.scopesLength,this.pos=t.pos,this.type=t.type,this.contextualKeyword=t.contextualKeyword,this.start=t.start,this.end=t.end,this.isType=t.isType,this.scopeDepth=t.scopeDepth,this.error=t.error}}]),i}();exports.default=h;
},{"./keywords":"GGTW","./types":"sS1T"}],"EwSx":[function(require,module,exports) {
"use strict";var e;function a(a){return a>=e.digit0&&a<=e.digit9||a>=e.lowercaseA&&a<=e.lowercaseF||a>=e.uppercaseA&&a<=e.uppercaseF}Object.defineProperty(exports,"__esModule",{value:!0}),exports.isDigit=a,exports.charCodes=void 0,exports.charCodes=e,function(e){e[e.backSpace=8]="backSpace";e[e.lineFeed=10]="lineFeed";e[e.carriageReturn=13]="carriageReturn";e[e.shiftOut=14]="shiftOut";e[e.space=32]="space";e[e.exclamationMark=33]="exclamationMark";e[e.quotationMark=34]="quotationMark";e[e.numberSign=35]="numberSign";e[e.dollarSign=36]="dollarSign";e[e.percentSign=37]="percentSign";e[e.ampersand=38]="ampersand";e[e.apostrophe=39]="apostrophe";e[e.leftParenthesis=40]="leftParenthesis";e[e.rightParenthesis=41]="rightParenthesis";e[e.asterisk=42]="asterisk";e[e.plusSign=43]="plusSign";e[e.comma=44]="comma";e[e.dash=45]="dash";e[e.dot=46]="dot";e[e.slash=47]="slash";e[e.digit0=48]="digit0";e[e.digit1=49]="digit1";e[e.digit2=50]="digit2";e[e.digit3=51]="digit3";e[e.digit4=52]="digit4";e[e.digit5=53]="digit5";e[e.digit6=54]="digit6";e[e.digit7=55]="digit7";e[e.digit8=56]="digit8";e[e.digit9=57]="digit9";e[e.colon=58]="colon";e[e.semicolon=59]="semicolon";e[e.lessThan=60]="lessThan";e[e.equalsTo=61]="equalsTo";e[e.greaterThan=62]="greaterThan";e[e.questionMark=63]="questionMark";e[e.atSign=64]="atSign";e[e.uppercaseA=65]="uppercaseA";e[e.uppercaseB=66]="uppercaseB";e[e.uppercaseC=67]="uppercaseC";e[e.uppercaseD=68]="uppercaseD";e[e.uppercaseE=69]="uppercaseE";e[e.uppercaseF=70]="uppercaseF";e[e.uppercaseG=71]="uppercaseG";e[e.uppercaseH=72]="uppercaseH";e[e.uppercaseI=73]="uppercaseI";e[e.uppercaseJ=74]="uppercaseJ";e[e.uppercaseK=75]="uppercaseK";e[e.uppercaseL=76]="uppercaseL";e[e.uppercaseM=77]="uppercaseM";e[e.uppercaseN=78]="uppercaseN";e[e.uppercaseO=79]="uppercaseO";e[e.uppercaseP=80]="uppercaseP";e[e.uppercaseQ=81]="uppercaseQ";e[e.uppercaseR=82]="uppercaseR";e[e.uppercaseS=83]="uppercaseS";e[e.uppercaseT=84]="uppercaseT";e[e.uppercaseU=85]="uppercaseU";e[e.uppercaseV=86]="uppercaseV";e[e.uppercaseW=87]="uppercaseW";e[e.uppercaseX=88]="uppercaseX";e[e.uppercaseY=89]="uppercaseY";e[e.uppercaseZ=90]="uppercaseZ";e[e.leftSquareBracket=91]="leftSquareBracket";e[e.backslash=92]="backslash";e[e.rightSquareBracket=93]="rightSquareBracket";e[e.caret=94]="caret";e[e.underscore=95]="underscore";e[e.graveAccent=96]="graveAccent";e[e.lowercaseA=97]="lowercaseA";e[e.lowercaseB=98]="lowercaseB";e[e.lowercaseC=99]="lowercaseC";e[e.lowercaseD=100]="lowercaseD";e[e.lowercaseE=101]="lowercaseE";e[e.lowercaseF=102]="lowercaseF";e[e.lowercaseG=103]="lowercaseG";e[e.lowercaseH=104]="lowercaseH";e[e.lowercaseI=105]="lowercaseI";e[e.lowercaseJ=106]="lowercaseJ";e[e.lowercaseK=107]="lowercaseK";e[e.lowercaseL=108]="lowercaseL";e[e.lowercaseM=109]="lowercaseM";e[e.lowercaseN=110]="lowercaseN";e[e.lowercaseO=111]="lowercaseO";e[e.lowercaseP=112]="lowercaseP";e[e.lowercaseQ=113]="lowercaseQ";e[e.lowercaseR=114]="lowercaseR";e[e.lowercaseS=115]="lowercaseS";e[e.lowercaseT=116]="lowercaseT";e[e.lowercaseU=117]="lowercaseU";e[e.lowercaseV=118]="lowercaseV";e[e.lowercaseW=119]="lowercaseW";e[e.lowercaseX=120]="lowercaseX";e[e.lowercaseY=121]="lowercaseY";e[e.lowercaseZ=122]="lowercaseZ";e[e.leftCurlyBrace=123]="leftCurlyBrace";e[e.verticalBar=124]="verticalBar";e[e.rightCurlyBrace=125]="rightCurlyBrace";e[e.tilde=126]="tilde";e[e.nonBreakingSpace=160]="nonBreakingSpace";e[e.oghamSpaceMark=5760]="oghamSpaceMark";e[e.lineSeparator=8232]="lineSeparator";e[e.paragraphSeparator=8233]="paragraphSeparator"}(e||(exports.charCodes=e={}));
},{}],"WaVM":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.getNextContextId=c,exports.augmentError=l,exports.locationForIndex=d,exports.initParser=f,exports.Loc=exports.nextContextId=exports.input=exports.state=exports.isFlowEnabled=exports.isTypeScriptEnabled=exports.isJSXEnabled=void 0;var e,t,o,r,n,s,i=a(require("../tokenizer/state")),p=require("../util/charcodes");function a(e){return e&&e.__esModule?e:{default:e}}function x(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function c(){var e;return e=+s,exports.nextContextId=s=e+1,e}function l(e){if("pos"in e){var t=d(e.pos);e.message+=" (".concat(t.line,":").concat(t.column,")"),e.loc=t}return e}exports.isJSXEnabled=e,exports.isTypeScriptEnabled=t,exports.isFlowEnabled=o,exports.state=r,exports.input=n,exports.nextContextId=s;var u=function e(t,o){x(this,e),this.line=t,this.column=o};function d(e){for(var t=1,o=1,r=0;r<e;r++)n.charCodeAt(r)===p.charCodes.lineFeed?(t++,o=1):o++;return new u(t,o)}function f(p,a,x,c){exports.input=n=p,exports.state=r=new i.default,exports.nextContextId=s=1,exports.isJSXEnabled=e=a,exports.isTypeScriptEnabled=t=x,exports.isFlowEnabled=o=c}exports.Loc=u;
},{"../tokenizer/state":"Z7yX","../util/charcodes":"EwSx"}],"Z5xF":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.isContextual=r,exports.isLookaheadContextual=a,exports.eatContextual=s,exports.expectContextual=i,exports.canInsertSemicolon=c,exports.hasPrecedingLineBreak=u,exports.isLineTerminator=p,exports.semicolon=x,exports.expect=d,exports.unexpected=f;var e=require("../tokenizer/index"),t=require("../tokenizer/types"),n=require("../util/charcodes"),o=require("./base");function r(e){return o.state.contextualKeyword===e}function a(n){var o=(0,e.lookaheadTypeAndKeyword)();return o.type===t.TokenType.name&&o.contextualKeyword===n}function s(n){return o.state.contextualKeyword===n&&(0,e.eat)(t.TokenType.name)}function i(e){s(e)||f()}function c(){return(0,e.match)(t.TokenType.eof)||(0,e.match)(t.TokenType.braceR)||u()}function u(){for(var e=o.state.tokens[o.state.tokens.length-1],t=e?e.end:0;t<o.state.start;t++){var r=o.input.charCodeAt(t);if(r===n.charCodes.lineFeed||r===n.charCodes.carriageReturn||8232===r||8233===r)return!0}return!1}function p(){return(0,e.eat)(t.TokenType.semi)||c()}function x(){p()||f('Unexpected token, expected ";"')}function d(n){(0,e.eat)(n)||f('Unexpected token, expected "'.concat((0,t.formatTokenType)(n),'"'))}function f(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"Unexpected token",r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:o.state.start;if(!o.state.error){var a=new SyntaxError(n);a.pos=r,o.state.error=a,o.state.pos=o.input.length,(0,e.finishToken)(t.TokenType.eof)}}
},{"../tokenizer/index":"zEJU","../tokenizer/types":"sS1T","../util/charcodes":"EwSx","./base":"WaVM"}],"OvHT":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.IS_WHITESPACE=exports.WHITESPACE_CHARS=void 0;var e=require("./charcodes"),r=[9,11,12,e.charCodes.space,e.charCodes.nonBreakingSpace,e.charCodes.oghamSpaceMark,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8239,8287,12288,65279];exports.WHITESPACE_CHARS=r;var a=new Uint8Array(65536);exports.IS_WHITESPACE=a;for(var o=0,s=r;o<s.length;o++){var t=s[o];a[t]=1}
},{"./charcodes":"EwSx"}],"NoJD":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.IS_IDENTIFIER_START=exports.IS_IDENTIFIER_CHAR=void 0;var r=require("./charcodes"),e=require("./whitespace");function t(r,e){var t;if("undefined"==typeof Symbol||null==r[Symbol.iterator]){if(Array.isArray(r)||(t=n(r))||e&&r&&"number"==typeof r.length){t&&(r=t);var o=0,i=function(){};return{s:i,n:function(){return o>=r.length?{done:!0}:{done:!1,value:r[o++]}},e:function(r){throw r},f:i}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,u=!0,f=!1;return{s:function(){t=r[Symbol.iterator]()},n:function(){var r=t.next();return u=r.done,r},e:function(r){f=!0,a=r},f:function(){try{u||null==t.return||t.return()}finally{if(f)throw a}}}}function n(r,e){if(r){if("string"==typeof r)return o(r,e);var t=Object.prototype.toString.call(r).slice(8,-1);return"Object"===t&&r.constructor&&(t=r.constructor.name),"Map"===t||"Set"===t?Array.from(r):"Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?o(r,e):void 0}}function o(r,e){(null==e||e>r.length)&&(e=r.length);for(var t=0,n=new Array(e);t<e;t++)n[t]=r[t];return n}function i(r){if(r<48)return 36===r;if(r<58)return!0;if(r<65)return!1;if(r<91)return!0;if(r<97)return 95===r;if(r<123)return!0;if(r<128)return!1;throw new Error("Should not be called with non-ASCII char code.")}var a=new Uint8Array(65536);exports.IS_IDENTIFIER_CHAR=a;for(var u=0;u<128;u++)a[u]=i(u)?1:0;for(var f=128;f<65536;f++)a[f]=1;var c,l=t(e.WHITESPACE_CHARS);try{for(l.s();!(c=l.n()).done;){var s=c.value;a[s]=0}}catch(v){l.e(v)}finally{l.f()}a[8232]=0,a[8233]=0;var d=a.slice();exports.IS_IDENTIFIER_START=d;for(var I=r.charCodes.digit0;I<=r.charCodes.digit9;I++)d[I]=0;
},{"./charcodes":"EwSx","./whitespace":"OvHT"}],"u7Au":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.READ_WORD_TREE=void 0;var e=require("./keywords"),o=require("./types"),t=new Int32Array([-1,27,594,729,1566,2187,2673,3294,-1,3510,-1,4428,4563,4644,4941,5319,5508,-1,6048,6507,6966,7398,7560,7722,-1,7938,-1,-1,-1,54,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,243,-1,-1,-1,486,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,81,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,108,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,135,-1,-1,-1,-1,-1,-1,-1,-1,-1,162,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,189,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,216,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._abstract<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._as<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,270,-1,-1,-1,-1,-1,405,-1,-1,-1,-1,-1,-1,297,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,324,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,351,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,378,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._asserts<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,432,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,459,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._async<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,513,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,540,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,567,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._await<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,621,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,648,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,675,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,702,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._break<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,756,-1,-1,-1,-1,-1,-1,918,-1,-1,-1,1053,-1,-1,1161,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,783,837,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,810,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._case<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,864,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,891,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._catch<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,945,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,972,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,999,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1026,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._checks<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1080,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1107,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1134,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._class<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1188,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1215,1431,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1242,-1,-1,-1,-1,-1,-1,1+(o.TokenType._const<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1269,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1296,-1,-1,-1,-1,-1,-1,-1,-1,1323,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1350,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1377,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1404,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._constructor<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1458,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1485,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1512,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1539,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._continue<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1593,-1,-1,-1,-1,-1,-1,-1,-1,-1,2160,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1620,1782,-1,-1,1917,-1,-1,-1,-1,-1,2052,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1647,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1674,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1701,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1728,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1755,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._debugger<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1809,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1836,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1863,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1890,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._declare<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1944,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1971,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1998,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2025,-1,-1,-1,-1,-1,-1,1+(o.TokenType._default<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2079,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2106,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2133,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._delete<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._do<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2214,-1,2295,-1,-1,-1,-1,-1,-1,-1,-1,-1,2376,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2241,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2268,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._else<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2322,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2349,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._enum<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2403,-1,-1,-1,2538,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2430,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2457,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2484,-1,-1,-1,-1,-1,-1,1+(o.TokenType._export<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2511,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._exports<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2565,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2592,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2619,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2646,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._extends<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2700,-1,-1,-1,-1,-1,-1,-1,2808,-1,-1,-1,-1,-1,2970,-1,-1,3024,-1,-1,3105,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2727,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2754,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2781,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._false<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2835,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2862,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2889,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2916,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2943,-1,1+(o.TokenType._finally<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,2997,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._for<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3051,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3078,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._from<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3132,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3159,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3186,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3213,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3240,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3267,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._function<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3321,-1,-1,-1,-1,-1,-1,3375,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3348,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._get<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3402,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3429,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3456,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3483,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._global<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3537,-1,-1,-1,-1,-1,-1,3564,3888,-1,-1,-1,-1,4401,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._if<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3591,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3618,-1,-1,3807,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3645,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3672,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3699,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3726,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3753,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3780,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._implements<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3834,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3861,-1,-1,-1,-1,-1,-1,1+(o.TokenType._import<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._in<<1),-1,-1,-1,-1,-1,3915,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3996,4212,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3942,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3969,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._infer<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4023,-1,-1,-1,-1,-1,-1,-1,4050,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4077,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4104,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4131,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4158,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4185,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._instanceof<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4239,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4266,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4293,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4320,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4347,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4374,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._interface<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._is<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4455,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4482,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4509,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4536,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._keyof<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4590,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4617,-1,-1,-1,-1,-1,-1,1+(o.TokenType._let<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4671,-1,-1,-1,-1,-1,4806,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4698,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4725,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4752,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4779,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._mixins<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4833,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4860,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4887,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4914,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._module<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4968,-1,-1,-1,5184,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5238,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,4995,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5022,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5049,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5076,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5103,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5130,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5157,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._namespace<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5211,-1,-1,-1,1+(o.TokenType._new<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5265,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5292,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._null<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5346,-1,-1,-1,-1,-1,-1,-1,-1,-1,5373,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._of<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5400,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5427,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5454,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5481,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._opaque<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5535,-1,-1,5913,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5562,-1,-1,-1,-1,-1,5697,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5589,-1,-1,-1,-1,-1,5616,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5643,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5670,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._private<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5724,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5751,-1,-1,-1,-1,-1,-1,-1,-1,-1,5886,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5778,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5805,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5832,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5859,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._protected<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._proto<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5940,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5967,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,5994,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6021,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._public<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6075,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6102,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6264,-1,-1,6399,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6129,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6156,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6183,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6210,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6237,-1,e.ContextualKeyword._readonly<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6291,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6318,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6345,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6372,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._require<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6426,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6453,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6480,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._return<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6534,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6588,6723,-1,6831,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6561,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._set<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6615,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6642,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6669,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6696,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._static<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6750,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6777,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6804,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._super<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6858,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6885,-1,-1,-1,-1,-1,-1,-1,-1,-1,6912,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6939,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._switch<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,6993,-1,-1,-1,-1,-1,-1,-1,-1,-1,7155,-1,-1,-1,-1,-1,-1,7263,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7020,-1,-1,-1,-1,-1,-1,-1,-1,7074,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7047,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._this<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7101,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7128,-1,-1,-1,1+(o.TokenType._throw<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7182,-1,-1,-1,7236,-1,-1,-1,-1,-1,-1,7209,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._true<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._try<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7290,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7317,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._type<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7344,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7371,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._typeof<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7425,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7452,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7479,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7506,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7533,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,e.ContextualKeyword._unique<<1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7587,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7641,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7614,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._var<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7668,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7695,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._void<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7749,7857,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7776,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7803,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7830,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._while<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7884,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7911,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._with<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7965,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,7992,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,8019,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,8046,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,1+(o.TokenType._yield<<1),-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]);exports.READ_WORD_TREE=t;
},{"./keywords":"GGTW","./types":"sS1T"}],"t0jf":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=s;var e=require("../traverser/base"),r=require("../util/charcodes"),a=require("../util/identifier"),t=require("./index"),i=require("./readWordTree"),o=require("./types");function s(){for(var s=0,n=0,c=e.state.pos;c<e.input.length&&!((n=e.input.charCodeAt(c))<r.charCodes.lowercaseA||n>r.charCodes.lowercaseZ);){var u=i.READ_WORD_TREE[s+(n-r.charCodes.lowercaseA)+1];if(-1===u)break;s=u,c++}var d=i.READ_WORD_TREE[s];if(d>-1&&!a.IS_IDENTIFIER_CHAR[n])return e.state.pos=c,void(1&d?(0,t.finishToken)(d>>>1):(0,t.finishToken)(o.TokenType.name,d>>>1));for(;c<e.input.length;){var h=e.input.charCodeAt(c);if(a.IS_IDENTIFIER_CHAR[h])c++;else if(h===r.charCodes.backslash){if(c+=2,e.input.charCodeAt(c)===r.charCodes.leftCurlyBrace){for(;c<e.input.length&&e.input.charCodeAt(c)!==r.charCodes.rightCurlyBrace;)c++;c++}}else{if(h!==r.charCodes.atSign||e.input.charCodeAt(c+1)!==r.charCodes.atSign)break;c+=2}}e.state.pos=c,(0,t.finishToken)(o.TokenType.name)}
},{"../traverser/base":"WaVM","../util/charcodes":"EwSx","../util/identifier":"NoJD","./index":"zEJU","./readWordTree":"u7Au","./types":"sS1T"}],"zEJU":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.isDeclaration=h,exports.isNonTopLevelDeclaration=u,exports.isTopLevelDeclaration=l,exports.isBlockScopedDeclaration=T,exports.isFunctionScopedDeclaration=C,exports.isObjectShorthandDeclaration=k,exports.next=y,exports.nextTemplateToken=v,exports.retokenizeSlashAsRegex=g,exports.pushTypeContext=S,exports.popTypeContext=A,exports.eat=x,exports.match=b,exports.lookaheadType=D,exports.lookaheadTypeAndKeyword=q,exports.nextToken=w,exports.skipLineComment=R,exports.skipSpace=j,exports.finishToken=F,exports.getTokenFromCode=W,exports.skipWord=Y,exports.TypeAndKeyword=exports.Token=exports.IdentifierRole=void 0;var e,t=require("../traverser/base"),o=require("../traverser/util"),a=require("../util/charcodes"),s=require("../util/identifier"),r=require("../util/whitespace"),n=require("./keywords"),c=p(require("./readWord")),i=require("./types");function p(e){return e&&e.__esModule?e:{default:e}}function d(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function h(t){var o=t.identifierRole;return o===e.TopLevelDeclaration||o===e.FunctionScopedDeclaration||o===e.BlockScopedDeclaration||o===e.ObjectShorthandTopLevelDeclaration||o===e.ObjectShorthandFunctionScopedDeclaration||o===e.ObjectShorthandBlockScopedDeclaration}function u(t){var o=t.identifierRole;return o===e.FunctionScopedDeclaration||o===e.BlockScopedDeclaration||o===e.ObjectShorthandFunctionScopedDeclaration||o===e.ObjectShorthandBlockScopedDeclaration}function l(t){var o=t.identifierRole;return o===e.TopLevelDeclaration||o===e.ObjectShorthandTopLevelDeclaration||o===e.ImportDeclaration}function T(t){var o=t.identifierRole;return o===e.TopLevelDeclaration||o===e.BlockScopedDeclaration||o===e.ObjectShorthandTopLevelDeclaration||o===e.ObjectShorthandBlockScopedDeclaration}function C(t){var o=t.identifierRole;return o===e.FunctionScopedDeclaration||o===e.ObjectShorthandFunctionScopedDeclaration}function k(t){return t.identifierRole===e.ObjectShorthandTopLevelDeclaration||t.identifierRole===e.ObjectShorthandBlockScopedDeclaration||t.identifierRole===e.ObjectShorthandFunctionScopedDeclaration}exports.IdentifierRole=e,function(e){e[e.Access=0]="Access";e[e.ExportAccess=1]="ExportAccess";e[e.TopLevelDeclaration=2]="TopLevelDeclaration";e[e.FunctionScopedDeclaration=3]="FunctionScopedDeclaration";e[e.BlockScopedDeclaration=4]="BlockScopedDeclaration";e[e.ObjectShorthandTopLevelDeclaration=5]="ObjectShorthandTopLevelDeclaration";e[e.ObjectShorthandFunctionScopedDeclaration=6]="ObjectShorthandFunctionScopedDeclaration";e[e.ObjectShorthandBlockScopedDeclaration=7]="ObjectShorthandBlockScopedDeclaration";e[e.ObjectShorthand=8]="ObjectShorthand";e[e.ImportDeclaration=9]="ImportDeclaration";e[e.ObjectKey=10]="ObjectKey";e[e.ImportAccess=11]="ImportAccess"}(e||(exports.IdentifierRole=e={}));var f=function e(){d(this,e),this.type=t.state.type,this.contextualKeyword=t.state.contextualKeyword,this.start=t.state.start,this.end=t.state.end,this.scopeDepth=t.state.scopeDepth,this.isType=t.state.isType,this.identifierRole=null,this.shadowsGlobal=!1,this.contextId=null,this.rhsEndIndex=null,this.isExpression=!1,this.numNullishCoalesceStarts=0,this.numNullishCoalesceEnds=0,this.isOptionalChainStart=!1,this.isOptionalChainEnd=!1,this.subscriptStartIndex=null,this.nullishStartIndex=null};function y(){t.state.tokens.push(new f),w()}function v(){t.state.tokens.push(new f),t.state.start=t.state.pos,V()}function g(){t.state.type===i.TokenType.assign&&--t.state.pos,H()}function S(e){for(var o=t.state.tokens.length-e;o<t.state.tokens.length;o++)t.state.tokens[o].isType=!0;var a=t.state.isType;return t.state.isType=!0,a}function A(e){t.state.isType=e}function x(e){return!!b(e)&&(y(),!0)}function b(e){return t.state.type===e}function D(){var e=t.state.snapshot();y();var o=t.state.type;return t.state.restoreFromSnapshot(e),o}exports.Token=f;var m=function e(t,o){d(this,e),this.type=t,this.contextualKeyword=o};function q(){var e=t.state.snapshot();y();var o=t.state.type,a=t.state.contextualKeyword;return t.state.restoreFromSnapshot(e),new m(o,a)}function w(){if(j(),t.state.start=t.state.pos,t.state.pos>=t.input.length){var e=t.state.tokens;return e.length>=2&&e[e.length-1].start>=t.input.length&&e[e.length-2].start>=t.input.length&&(0,o.unexpected)("Unexpectedly reached the end of input."),void F(i.TokenType.eof)}O(t.input.charCodeAt(t.state.pos))}function O(e){s.IS_IDENTIFIER_START[e]||e===a.charCodes.backslash||e===a.charCodes.atSign&&t.input.charCodeAt(t.state.pos+1)===a.charCodes.atSign?(0,c.default)():W(e)}function B(){for(;t.input.charCodeAt(t.state.pos)!==a.charCodes.asterisk||t.input.charCodeAt(t.state.pos+1)!==a.charCodes.slash;)if(t.state.pos++,t.state.pos>t.input.length)return void(0,o.unexpected)("Unterminated comment",t.state.pos-2);t.state.pos+=2}function R(e){var o=t.input.charCodeAt(t.state.pos+=e);if(t.state.pos<t.input.length)for(;o!==a.charCodes.lineFeed&&o!==a.charCodes.carriageReturn&&o!==a.charCodes.lineSeparator&&o!==a.charCodes.paragraphSeparator&&++t.state.pos<t.input.length;)o=t.input.charCodeAt(t.state.pos)}function j(){for(;t.state.pos<t.input.length;){var e=t.input.charCodeAt(t.state.pos);switch(e){case a.charCodes.carriageReturn:t.input.charCodeAt(t.state.pos+1)===a.charCodes.lineFeed&&++t.state.pos;case a.charCodes.lineFeed:case a.charCodes.lineSeparator:case a.charCodes.paragraphSeparator:++t.state.pos;break;case a.charCodes.slash:switch(t.input.charCodeAt(t.state.pos+1)){case a.charCodes.asterisk:t.state.pos+=2,B();break;case a.charCodes.slash:R(2);break;default:return}break;default:if(!r.IS_WHITESPACE[e])return;++t.state.pos}}}function F(e){var o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:n.ContextualKeyword.NONE;t.state.end=t.state.pos,t.state.type=e,t.state.contextualKeyword=o}function I(){var e=t.input.charCodeAt(t.state.pos+1);e>=a.charCodes.digit0&&e<=a.charCodes.digit9?G(!0):e===a.charCodes.dot&&t.input.charCodeAt(t.state.pos+2)===a.charCodes.dot?(t.state.pos+=3,F(i.TokenType.ellipsis)):(++t.state.pos,F(i.TokenType.dot))}function E(){t.input.charCodeAt(t.state.pos+1)===a.charCodes.equalsTo?X(i.TokenType.assign,2):X(i.TokenType.slash,1)}function L(e){var o=e===a.charCodes.asterisk?i.TokenType.star:i.TokenType.modulo,s=1,r=t.input.charCodeAt(t.state.pos+1);e===a.charCodes.asterisk&&r===a.charCodes.asterisk&&(s++,r=t.input.charCodeAt(t.state.pos+2),o=i.TokenType.exponent),r===a.charCodes.equalsTo&&t.input.charCodeAt(t.state.pos+2)!==a.charCodes.greaterThan&&(s++,o=i.TokenType.assign),X(o,s)}function K(e){var o=t.input.charCodeAt(t.state.pos+1);if(o!==e){if(e===a.charCodes.verticalBar){if(o===a.charCodes.greaterThan)return void X(i.TokenType.pipeline,2);if(o===a.charCodes.rightCurlyBrace&&t.isFlowEnabled)return void X(i.TokenType.braceBarR,2)}o!==a.charCodes.equalsTo?X(e===a.charCodes.verticalBar?i.TokenType.bitwiseOR:i.TokenType.bitwiseAND,1):X(i.TokenType.assign,2)}else t.input.charCodeAt(t.state.pos+2)===a.charCodes.equalsTo?X(i.TokenType.assign,3):X(e===a.charCodes.verticalBar?i.TokenType.logicalOR:i.TokenType.logicalAND,2)}function N(){t.input.charCodeAt(t.state.pos+1)===a.charCodes.equalsTo?X(i.TokenType.assign,2):X(i.TokenType.bitwiseXOR,1)}function _(e){var o=t.input.charCodeAt(t.state.pos+1);o!==e?o===a.charCodes.equalsTo?X(i.TokenType.assign,2):e===a.charCodes.plusSign?X(i.TokenType.plus,1):X(i.TokenType.minus,1):X(i.TokenType.preIncDec,2)}function M(e){if(e===a.charCodes.greaterThan&&t.state.isType)X(i.TokenType.greaterThan,1);else{var o=t.input.charCodeAt(t.state.pos+1);if(o===e){var s=e===a.charCodes.greaterThan&&t.input.charCodeAt(t.state.pos+2)===a.charCodes.greaterThan?3:2;return t.input.charCodeAt(t.state.pos+s)===a.charCodes.equalsTo?void X(i.TokenType.assign,s+1):void X(i.TokenType.bitShift,s)}o===a.charCodes.equalsTo?X(i.TokenType.relationalOrEqual,2):e===a.charCodes.lessThan?X(i.TokenType.lessThan,1):X(i.TokenType.greaterThan,1)}}function U(e){var o=t.input.charCodeAt(t.state.pos+1);if(o!==a.charCodes.equalsTo)return e===a.charCodes.equalsTo&&o===a.charCodes.greaterThan?(t.state.pos+=2,void F(i.TokenType.arrow)):void X(e===a.charCodes.equalsTo?i.TokenType.eq:i.TokenType.bang,1);X(i.TokenType.equality,t.input.charCodeAt(t.state.pos+2)===a.charCodes.equalsTo?3:2)}function P(){var e=t.input.charCodeAt(t.state.pos+1),o=t.input.charCodeAt(t.state.pos+2);e!==a.charCodes.questionMark||t.state.isType?e!==a.charCodes.dot||o>=a.charCodes.digit0&&o<=a.charCodes.digit9?(++t.state.pos,F(i.TokenType.question)):(t.state.pos+=2,F(i.TokenType.questionDot)):o===a.charCodes.equalsTo?X(i.TokenType.assign,3):X(i.TokenType.nullishCoalescing,2)}function W(e){switch(e){case a.charCodes.numberSign:return++t.state.pos,void F(i.TokenType.hash);case a.charCodes.dot:return void I();case a.charCodes.leftParenthesis:return++t.state.pos,void F(i.TokenType.parenL);case a.charCodes.rightParenthesis:return++t.state.pos,void F(i.TokenType.parenR);case a.charCodes.semicolon:return++t.state.pos,void F(i.TokenType.semi);case a.charCodes.comma:return++t.state.pos,void F(i.TokenType.comma);case a.charCodes.leftSquareBracket:return++t.state.pos,void F(i.TokenType.bracketL);case a.charCodes.rightSquareBracket:return++t.state.pos,void F(i.TokenType.bracketR);case a.charCodes.leftCurlyBrace:return void(t.isFlowEnabled&&t.input.charCodeAt(t.state.pos+1)===a.charCodes.verticalBar?X(i.TokenType.braceBarL,2):(++t.state.pos,F(i.TokenType.braceL)));case a.charCodes.rightCurlyBrace:return++t.state.pos,void F(i.TokenType.braceR);case a.charCodes.colon:return void(t.input.charCodeAt(t.state.pos+1)===a.charCodes.colon?X(i.TokenType.doubleColon,2):(++t.state.pos,F(i.TokenType.colon)));case a.charCodes.questionMark:return void P();case a.charCodes.atSign:return++t.state.pos,void F(i.TokenType.at);case a.charCodes.graveAccent:return++t.state.pos,void F(i.TokenType.backQuote);case a.charCodes.digit0:var s=t.input.charCodeAt(t.state.pos+1);if(s===a.charCodes.lowercaseX||s===a.charCodes.uppercaseX||s===a.charCodes.lowercaseO||s===a.charCodes.uppercaseO||s===a.charCodes.lowercaseB||s===a.charCodes.uppercaseB)return void z();case a.charCodes.digit1:case a.charCodes.digit2:case a.charCodes.digit3:case a.charCodes.digit4:case a.charCodes.digit5:case a.charCodes.digit6:case a.charCodes.digit7:case a.charCodes.digit8:case a.charCodes.digit9:return void G(!1);case a.charCodes.quotationMark:case a.charCodes.apostrophe:return void J(e);case a.charCodes.slash:return void E();case a.charCodes.percentSign:case a.charCodes.asterisk:return void L(e);case a.charCodes.verticalBar:case a.charCodes.ampersand:return void K(e);case a.charCodes.caret:return void N();case a.charCodes.plusSign:case a.charCodes.dash:return void _(e);case a.charCodes.lessThan:case a.charCodes.greaterThan:return void M(e);case a.charCodes.equalsTo:case a.charCodes.exclamationMark:return void U(e);case a.charCodes.tilde:return void X(i.TokenType.tilde,1)}(0,o.unexpected)("Unexpected character '".concat(String.fromCharCode(e),"'"),t.state.pos)}function X(e,o){t.state.pos+=o,F(e)}function H(){for(var e=t.state.pos,s=!1,r=!1;;){if(t.state.pos>=t.input.length)return void(0,o.unexpected)("Unterminated regular expression",e);var n=t.input.charCodeAt(t.state.pos);if(s)s=!1;else{if(n===a.charCodes.leftSquareBracket)r=!0;else if(n===a.charCodes.rightSquareBracket&&r)r=!1;else if(n===a.charCodes.slash&&!r)break;s=n===a.charCodes.backslash}++t.state.pos}++t.state.pos,Y(),F(i.TokenType.regexp)}function Q(){for(;;){var e=t.input.charCodeAt(t.state.pos);if(!(e>=a.charCodes.digit0&&e<=a.charCodes.digit9||e>=a.charCodes.lowercaseA&&e<=a.charCodes.lowercaseF||e>=a.charCodes.uppercaseA&&e<=a.charCodes.uppercaseF||e===a.charCodes.underscore))break;t.state.pos++}}function z(){var e=!1;t.state.pos+=2,Q(),t.input.charCodeAt(t.state.pos)===a.charCodes.lowercaseN&&(++t.state.pos,e=!0),F(e?i.TokenType.bigint:i.TokenType.num)}function G(e){var o=!1;e||Q();var s=t.input.charCodeAt(t.state.pos);s===a.charCodes.dot&&(++t.state.pos,Q(),s=t.input.charCodeAt(t.state.pos)),s!==a.charCodes.uppercaseE&&s!==a.charCodes.lowercaseE||((s=t.input.charCodeAt(++t.state.pos))!==a.charCodes.plusSign&&s!==a.charCodes.dash||++t.state.pos,Q(),s=t.input.charCodeAt(t.state.pos)),s===a.charCodes.lowercaseN&&(++t.state.pos,o=!0),F(o?i.TokenType.bigint:i.TokenType.num)}function J(e){for(t.state.pos++;;){if(t.state.pos>=t.input.length)return void(0,o.unexpected)("Unterminated string constant");var s=t.input.charCodeAt(t.state.pos);if(s===a.charCodes.backslash)t.state.pos++;else if(s===e)break;t.state.pos++}t.state.pos++,F(i.TokenType.string)}function V(){for(;;){if(t.state.pos>=t.input.length)return void(0,o.unexpected)("Unterminated template");var e=t.input.charCodeAt(t.state.pos);if(e===a.charCodes.graveAccent||e===a.charCodes.dollarSign&&t.input.charCodeAt(t.state.pos+1)===a.charCodes.leftCurlyBrace)return t.state.pos===t.state.start&&b(i.TokenType.template)?e===a.charCodes.dollarSign?(t.state.pos+=2,void F(i.TokenType.dollarBraceL)):(++t.state.pos,void F(i.TokenType.backQuote)):void F(i.TokenType.template);e===a.charCodes.backslash&&t.state.pos++,t.state.pos++}}function Y(){for(;t.state.pos<t.input.length;){var e=t.input.charCodeAt(t.state.pos);if(s.IS_IDENTIFIER_CHAR[e])t.state.pos++;else{if(e!==a.charCodes.backslash)break;if(t.state.pos+=2,t.input.charCodeAt(t.state.pos)===a.charCodes.leftCurlyBrace){for(;t.state.pos<t.input.length&&t.input.charCodeAt(t.state.pos)!==a.charCodes.rightCurlyBrace;)t.state.pos++;t.state.pos++}}}}exports.TypeAndKeyword=m;
},{"../traverser/base":"WaVM","../traverser/util":"Z5xF","../util/charcodes":"EwSx","../util/identifier":"NoJD","../util/whitespace":"OvHT","./keywords":"GGTW","./readWord":"t0jf","./types":"sS1T"}],"ObIJ":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var a={quot:'"',amp:"&",apos:"'",lt:"<",gt:">",nbsp:" ",iexcl:"¡",cent:"¢",pound:"£",curren:"¤",yen:"¥",brvbar:"¦",sect:"§",uml:"¨",copy:"©",ordf:"ª",laquo:"«",not:"¬",shy:"­",reg:"®",macr:"¯",deg:"°",plusmn:"±",sup2:"²",sup3:"³",acute:"´",micro:"µ",para:"¶",middot:"·",cedil:"¸",sup1:"¹",ordm:"º",raquo:"»",frac14:"¼",frac12:"½",frac34:"¾",iquest:"¿",Agrave:"À",Aacute:"Á",Acirc:"Â",Atilde:"Ã",Auml:"Ä",Aring:"Å",AElig:"Æ",Ccedil:"Ç",Egrave:"È",Eacute:"É",Ecirc:"Ê",Euml:"Ë",Igrave:"Ì",Iacute:"Í",Icirc:"Î",Iuml:"Ï",ETH:"Ð",Ntilde:"Ñ",Ograve:"Ò",Oacute:"Ó",Ocirc:"Ô",Otilde:"Õ",Ouml:"Ö",times:"×",Oslash:"Ø",Ugrave:"Ù",Uacute:"Ú",Ucirc:"Û",Uuml:"Ü",Yacute:"Ý",THORN:"Þ",szlig:"ß",agrave:"à",aacute:"á",acirc:"â",atilde:"ã",auml:"ä",aring:"å",aelig:"æ",ccedil:"ç",egrave:"è",eacute:"é",ecirc:"ê",euml:"ë",igrave:"ì",iacute:"í",icirc:"î",iuml:"ï",eth:"ð",ntilde:"ñ",ograve:"ò",oacute:"ó",ocirc:"ô",otilde:"õ",ouml:"ö",divide:"÷",oslash:"ø",ugrave:"ù",uacute:"ú",ucirc:"û",uuml:"ü",yacute:"ý",thorn:"þ",yuml:"ÿ",OElig:"Œ",oelig:"œ",Scaron:"Š",scaron:"š",Yuml:"Ÿ",fnof:"ƒ",circ:"ˆ",tilde:"˜",Alpha:"Α",Beta:"Β",Gamma:"Γ",Delta:"Δ",Epsilon:"Ε",Zeta:"Ζ",Eta:"Η",Theta:"Θ",Iota:"Ι",Kappa:"Κ",Lambda:"Λ",Mu:"Μ",Nu:"Ν",Xi:"Ξ",Omicron:"Ο",Pi:"Π",Rho:"Ρ",Sigma:"Σ",Tau:"Τ",Upsilon:"Υ",Phi:"Φ",Chi:"Χ",Psi:"Ψ",Omega:"Ω",alpha:"α",beta:"β",gamma:"γ",delta:"δ",epsilon:"ε",zeta:"ζ",eta:"η",theta:"θ",iota:"ι",kappa:"κ",lambda:"λ",mu:"μ",nu:"ν",xi:"ξ",omicron:"ο",pi:"π",rho:"ρ",sigmaf:"ς",sigma:"σ",tau:"τ",upsilon:"υ",phi:"φ",chi:"χ",psi:"ψ",omega:"ω",thetasym:"ϑ",upsih:"ϒ",piv:"ϖ",ensp:" ",emsp:" ",thinsp:" ",zwnj:"‌",zwj:"‍",lrm:"‎",rlm:"‏",ndash:"–",mdash:"—",lsquo:"‘",rsquo:"’",sbquo:"‚",ldquo:"“",rdquo:"”",bdquo:"„",dagger:"†",Dagger:"‡",bull:"•",hellip:"…",permil:"‰",prime:"′",Prime:"″",lsaquo:"‹",rsaquo:"›",oline:"‾",frasl:"⁄",euro:"€",image:"ℑ",weierp:"℘",real:"ℜ",trade:"™",alefsym:"ℵ",larr:"←",uarr:"↑",rarr:"→",darr:"↓",harr:"↔",crarr:"↵",lArr:"⇐",uArr:"⇑",rArr:"⇒",dArr:"⇓",hArr:"⇔",forall:"∀",part:"∂",exist:"∃",empty:"∅",nabla:"∇",isin:"∈",notin:"∉",ni:"∋",prod:"∏",sum:"∑",minus:"−",lowast:"∗",radic:"√",prop:"∝",infin:"∞",ang:"∠",and:"∧",or:"∨",cap:"∩",cup:"∪",int:"∫",there4:"∴",sim:"∼",cong:"≅",asymp:"≈",ne:"≠",equiv:"≡",le:"≤",ge:"≥",sub:"⊂",sup:"⊃",nsub:"⊄",sube:"⊆",supe:"⊇",oplus:"⊕",otimes:"⊗",perp:"⊥",sdot:"⋅",lceil:"⌈",rceil:"⌉",lfloor:"⌊",rfloor:"⌋",lang:"〈",rang:"〉",loz:"◊",spades:"♠",clubs:"♣",hearts:"♥",diams:"♦"},e=a;exports.default=e;
},{}],"Bsuo":[function(require,module,exports) {
"use strict";function t(t,n){return o(t)||a(t,n)||e(t,n)||r()}function r(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function e(t,r){if(t){if("string"==typeof t)return n(t,r);var e=Object.prototype.toString.call(t).slice(8,-1);return"Object"===e&&t.constructor&&(e=t.constructor.name),"Map"===e||"Set"===e?Array.from(t):"Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?n(t,r):void 0}}function n(t,r){(null==r||r>t.length)&&(r=t.length);for(var e=0,n=new Array(r);e<r;e++)n[e]=t[e];return n}function a(t,r){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t)){var e=[],n=!0,a=!1,o=void 0;try{for(var i,u=t[Symbol.iterator]();!(n=(i=u.next()).done)&&(e.push(i.value),!r||e.length!==r);n=!0);}catch(f){a=!0,o=f}finally{try{n||null==u.return||u.return()}finally{if(a)throw o}}return e}}function o(t){if(Array.isArray(t))return t}function i(r){var e=t(u(r.jsxPragma||"React.createElement"),2),n=e[0],a=e[1],o=t(u(r.jsxFragmentPragma||"React.Fragment"),2);return{base:n,suffix:a,fragmentBase:o[0],fragmentSuffix:o[1]}}function u(t){var r=t.indexOf(".");return-1===r&&(r=t.length),[t.slice(0,r),t.slice(r)]}Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=i;
},{}],"MJ2y":[function(require,module,exports) {
"use strict";function e(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function t(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function n(e,n,r){return n&&t(e.prototype,n),r&&t(e,r),e}Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var r=function(){function t(){e(this,t)}return n(t,[{key:"getPrefixCode",value:function(){return""}},{key:"getSuffixCode",value:function(){return""}}]),t}();exports.default=r;
},{}],"xUYp":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.startsWithLowerCase=j,exports.default=void 0;var e=s(require("../parser/plugins/jsx/xhtml")),t=require("../parser/tokenizer/types"),n=require("../parser/util/charcodes"),r=s(require("../util/getJSXPragmaInfo")),o=s(require("./Transformer"));function s(e){return e&&e.__esModule?e:{default:e}}function i(e,t){var n;if("undefined"==typeof Symbol||null==e[Symbol.iterator]){if(Array.isArray(e)||(n=a(e))||t&&e&&"number"==typeof e.length){n&&(e=n);var r=0,o=function(){};return{s:o,n:function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}},e:function(e){throw e},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var s,i=!0,c=!1;return{s:function(){n=e[Symbol.iterator]()},n:function(){var e=n.next();return i=e.done,e},e:function(e){c=!0,s=e},f:function(){try{i||null==n.return||n.return()}finally{if(c)throw s}}}}function a(e,t){if(e){if("string"==typeof e)return c(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?c(e,t):void 0}}function c(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function l(e){return(l="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function h(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function u(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function f(e,t,n){return t&&u(e.prototype,t),n&&u(e,n),e}function p(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&k(e,t)}function k(e,t){return(k=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function T(e){var t=d();return function(){var n,r=g(e);if(t){var o=g(this).constructor;n=Reflect.construct(r,arguments,o)}else n=r.apply(this,arguments);return y(this,n)}}function y(e,t){return!t||"object"!==l(t)&&"function"!=typeof t?m(e):t}function m(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function d(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}function g(e){return(g=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}var v=/^[\da-fA-F]+$/,b=/^\d+$/,x=function(e){p(s,o.default);var n=T(s);function s(e,t,o,i,a){var c;return h(this,s),(c=n.call(this)).rootTransformer=e,c.tokens=t,c.importProcessor=o,c.nameManager=i,c.options=a,s.prototype.__init.call(m(c)),s.prototype.__init2.call(m(c)),s.prototype.__init3.call(m(c)),c.jsxPragmaInfo=(0,r.default)(a),c}return f(s,[{key:"__init",value:function(){this.lastLineNumber=1}},{key:"__init2",value:function(){this.lastIndex=0}},{key:"__init3",value:function(){this.filenameVarName=null}}]),f(s,[{key:"process",value:function(){return!!this.tokens.matches1(t.TokenType.jsxTagStart)&&(this.processJSXTag(),!0)}},{key:"getPrefixCode",value:function(){return this.filenameVarName?"const ".concat(this.filenameVarName," = ").concat(JSON.stringify(this.options.filePath||""),";"):""}},{key:"getLineNumberForIndex",value:function(e){for(var t=this.tokens.code;this.lastIndex<e&&this.lastIndex<t.length;)"\n"===t[this.lastIndex]&&this.lastLineNumber++,this.lastIndex++;return this.lastLineNumber}},{key:"getFilenameVarName",value:function(){return this.filenameVarName||(this.filenameVarName=this.nameManager.claimFreeName("_jsxFileName")),this.filenameVarName}},{key:"processProps",value:function(e){var n=this.getLineNumberForIndex(e),r=this.options.production?"":"__self: this, __source: {fileName: ".concat(this.getFilenameVarName(),", lineNumber: ").concat(n,"}");if(this.tokens.matches1(t.TokenType.jsxName)||this.tokens.matches1(t.TokenType.braceL)){for(this.tokens.appendCode(", {");;){if(this.tokens.matches2(t.TokenType.jsxName,t.TokenType.eq))this.processPropKeyName(),this.tokens.replaceToken(": "),this.tokens.matches1(t.TokenType.braceL)?(this.tokens.replaceToken(""),this.rootTransformer.processBalancedCode(),this.tokens.replaceToken("")):this.tokens.matches1(t.TokenType.jsxTagStart)?this.processJSXTag():this.processStringPropValue();else if(this.tokens.matches1(t.TokenType.jsxName))this.processPropKeyName(),this.tokens.appendCode(": true");else{if(!this.tokens.matches1(t.TokenType.braceL))break;this.tokens.replaceToken(""),this.rootTransformer.processBalancedCode(),this.tokens.replaceToken("")}this.tokens.appendCode(",")}r?this.tokens.appendCode(" ".concat(r,"}")):this.tokens.appendCode("}")}else r?this.tokens.appendCode(", {".concat(r,"}")):this.tokens.appendCode(", null")}},{key:"processPropKeyName",value:function(){var e=this.tokens.identifierName();e.includes("-")?this.tokens.replaceToken("'".concat(e,"'")):this.tokens.copyToken()}},{key:"processStringPropValue",value:function(){var e=this.tokens.currentToken(),t=this.tokens.code.slice(e.start+1,e.end-1),n=N(t),r=S(t);this.tokens.replaceToken(r+n)}},{key:"processTagIntro",value:function(){for(var e=this.tokens.currentIndex()+1;this.tokens.tokens[e].isType||!this.tokens.matches2AtIndex(e-1,t.TokenType.jsxName,t.TokenType.jsxName)&&!this.tokens.matches2AtIndex(e-1,t.TokenType.greaterThan,t.TokenType.jsxName)&&!this.tokens.matches1AtIndex(e,t.TokenType.braceL)&&!this.tokens.matches1AtIndex(e,t.TokenType.jsxTagEnd)&&!this.tokens.matches2AtIndex(e,t.TokenType.slash,t.TokenType.jsxTagEnd);)e++;if(e===this.tokens.currentIndex()+1){var n=this.tokens.identifierName();j(n)&&this.tokens.replaceToken("'".concat(n,"'"))}for(;this.tokens.currentIndex()<e;)this.rootTransformer.processToken()}},{key:"processChildren",value:function(){for(;;){if(this.tokens.matches2(t.TokenType.jsxTagStart,t.TokenType.slash))return;if(this.tokens.matches1(t.TokenType.braceL))this.tokens.matches2(t.TokenType.braceL,t.TokenType.braceR)?(this.tokens.replaceToken(""),this.tokens.replaceToken("")):(this.tokens.replaceToken(", "),this.rootTransformer.processBalancedCode(),this.tokens.replaceToken(""));else if(this.tokens.matches1(t.TokenType.jsxTagStart))this.tokens.appendCode(", "),this.processJSXTag();else{if(!this.tokens.matches1(t.TokenType.jsxText))throw new Error("Unexpected token when processing JSX children.");this.processChildTextElement()}}}},{key:"processChildTextElement",value:function(){var e=this.tokens.currentToken(),t=this.tokens.code.slice(e.start,e.end),n=N(t),r=I(t);'""'===r?this.tokens.replaceToken(n):this.tokens.replaceToken(", ".concat(r).concat(n))}},{key:"processJSXTag",value:function(){var e=this.jsxPragmaInfo,n=this.importProcessor&&this.importProcessor.getIdentifierReplacement(e.base)||e.base,r=this.tokens.currentToken().start;if(this.tokens.replaceToken("".concat(n).concat(e.suffix,"(")),this.tokens.matches1(t.TokenType.jsxTagEnd)){var o=this.importProcessor&&this.importProcessor.getIdentifierReplacement(e.fragmentBase)||e.fragmentBase;for(this.tokens.replaceToken("".concat(o).concat(e.fragmentSuffix,", null")),this.processChildren();!this.tokens.matches1(t.TokenType.jsxTagEnd);)this.tokens.replaceToken("");this.tokens.replaceToken(")")}else if(this.processTagIntro(),this.processProps(r),this.tokens.matches2(t.TokenType.slash,t.TokenType.jsxTagEnd))this.tokens.replaceToken(""),this.tokens.replaceToken(")");else{if(!this.tokens.matches1(t.TokenType.jsxTagEnd))throw new Error("Expected either /> or > at the end of the tag.");for(this.tokens.replaceToken(""),this.processChildren();!this.tokens.matches1(t.TokenType.jsxTagEnd);)this.tokens.replaceToken("");this.tokens.replaceToken(")")}}}]),s}();function j(e){var t=e.charCodeAt(0);return t>=n.charCodes.lowercaseA&&t<=n.charCodes.lowercaseZ}function I(e){for(var t="",n="",r=!1,o=!1,s=0;s<e.length;s++){var i=e[s];if(" "===i||"\t"===i||"\r"===i)r||(n+=i);else if("\n"===i)n="",r=!0;else{if(o&&r&&(t+=" "),t+=n,n="","&"===i){var a=_(e,s+1),c=a.entity;s=a.newI-1,t+=c}else t+=i;o=!0,r=!1}}return r||(t+=n),JSON.stringify(t)}function N(e){var t,n=0,r=0,o=i(e);try{for(o.s();!(t=o.n()).done;){var s=t.value;"\n"===s?(n++,r=0):" "===s&&r++}}catch(a){o.e(a)}finally{o.f()}return"\n".repeat(n)+" ".repeat(r)}function S(e){for(var t="",n=0;n<e.length;n++){var r=e[n];if("\n"===r)if(/\s/.test(e[n+1]))for(t+=" ";n<e.length&&/\s/.test(e[n+1]);)n++;else t+="\n";else if("&"===r){var o=_(e,n+1);t+=o.entity,n=o.newI-1}else t+=r}return JSON.stringify(t)}function _(t,n){for(var r,o="",s=0,i=n;i<t.length&&s++<10;){var a=t[i];if(i++,";"===a){"#"===o[0]?"x"===o[1]?(o=o.substr(2),v.test(o)&&(r=String.fromCodePoint(parseInt(o,16)))):(o=o.substr(1),b.test(o)&&(r=String.fromCodePoint(parseInt(o,10)))):r=e.default[o];break}o+=a}return r?{entity:r,newI:i}:{entity:"&",newI:n}}exports.default=x;
},{"../parser/plugins/jsx/xhtml":"ObIJ","../parser/tokenizer/types":"sS1T","../parser/util/charcodes":"EwSx","../util/getJSXPragmaInfo":"Bsuo","./Transformer":"MJ2y"}],"BOKS":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.getNonTypeIdentifiers=i;var e=require("../parser/tokenizer"),r=require("../parser/tokenizer/types"),t=require("../transformers/JSXTransformer"),n=o(require("./getJSXPragmaInfo"));function o(e){return e&&e.__esModule?e:{default:e}}function i(o,i){for(var a=(0,n.default)(i),s=new Set,d=0;d<o.tokens.length;d++){var f=o.tokens[d];if(f.type!==r.TokenType.name||f.isType||f.identifierRole!==e.IdentifierRole.Access&&f.identifierRole!==e.IdentifierRole.ObjectShorthand&&f.identifierRole!==e.IdentifierRole.ExportAccess||f.shadowsGlobal||s.add(o.identifierNameForToken(f)),f.type===r.TokenType.jsxTagStart&&s.add(a.base),f.type===r.TokenType.jsxTagStart&&d+1<o.tokens.length&&o.tokens[d+1].type===r.TokenType.jsxTagEnd&&(s.add(a.base),s.add(a.fragmentBase)),f.type===r.TokenType.jsxName&&f.identifierRole===e.IdentifierRole.Access){var p=o.identifierNameForToken(f);(0,t.startsWithLowerCase)(p)&&o.tokens[d+1].type!==r.TokenType.dot||s.add(o.identifierNameForToken(f))}}return s}
},{"../parser/tokenizer":"zEJU","../parser/tokenizer/types":"sS1T","../transformers/JSXTransformer":"xUYp","./getJSXPragmaInfo":"Bsuo"}],"XAQy":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("./parser/tokenizer"),t=require("./parser/tokenizer/keywords"),n=require("./parser/tokenizer/types"),r=require("./util/getNonTypeIdentifiers");function o(e){return s(e)||i(e)||m(e)||a()}function a(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function i(e){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e))return Array.from(e)}function s(e){if(Array.isArray(e))return u(e)}function p(e,t){return l(e)||h(e,t)||m(e,t)||c()}function c(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function h(e,t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e)){var n=[],r=!0,o=!1,a=void 0;try{for(var i,s=e[Symbol.iterator]();!(r=(i=s.next()).done)&&(n.push(i.value),!t||n.length!==t);r=!0);}catch(p){o=!0,a=p}finally{try{r||null==s.return||s.return()}finally{if(o)throw a}}return n}}function l(e){if(Array.isArray(e))return e}function d(e,t){var n;if("undefined"==typeof Symbol||null==e[Symbol.iterator]){if(Array.isArray(e)||(n=m(e))||t&&e&&"number"==typeof e.length){n&&(e=n);var r=0,o=function(){};return{s:o,n:function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}},e:function(e){throw e},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,i=!0,s=!1;return{s:function(){n=e[Symbol.iterator]()},n:function(){var e=n.next();return i=e.done,e},e:function(e){s=!0,a=e},f:function(){try{i||null==n.return||n.return()}finally{if(s)throw a}}}}function m(e,t){if(e){if("string"==typeof e)return u(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?u(e,t):void 0}}function u(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function y(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function f(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function k(e,t,n){return t&&f(e.prototype,t),n&&f(e,n),e}var x=function(){function a(e,t,n,r,o,i){y(this,a),this.nameManager=e,this.tokens=t,this.enableLegacyTypeScriptModuleInterop=n,this.options=r,this.isTypeScriptTransformEnabled=o,this.helperManager=i,a.prototype.__init.call(this),a.prototype.__init2.call(this),a.prototype.__init3.call(this),a.prototype.__init4.call(this),a.prototype.__init5.call(this)}return k(a,[{key:"__init",value:function(){this.nonTypeIdentifiers=new Set}},{key:"__init2",value:function(){this.importInfoByPath=new Map}},{key:"__init3",value:function(){this.importsToReplace=new Map}},{key:"__init4",value:function(){this.identifierReplacements=new Map}},{key:"__init5",value:function(){this.exportBindingsByLocalName=new Map}}]),k(a,[{key:"preprocessTokens",value:function(){for(var e=0;e<this.tokens.tokens.length;e++)this.tokens.matches1AtIndex(e,n.TokenType._import)&&!this.tokens.matches3AtIndex(e,n.TokenType._import,n.TokenType.name,n.TokenType.eq)&&this.preprocessImportAtIndex(e),this.tokens.matches1AtIndex(e,n.TokenType._export)&&!this.tokens.matches2AtIndex(e,n.TokenType._export,n.TokenType.eq)&&this.preprocessExportAtIndex(e);this.generateImportReplacements()}},{key:"pruneTypeOnlyImports",value:function(){var e=this;this.nonTypeIdentifiers=(0,r.getNonTypeIdentifiers)(this.tokens,this.options);var t,n=d(this.importInfoByPath.entries());try{for(n.s();!(t=n.n()).done;){var a=p(t.value,2),i=a[0],s=a[1];if(!(s.hasBareImport||s.hasStarExport||s.exportStarNames.length>0||s.namedExports.length>0))[].concat(o(s.defaultNames),o(s.wildcardNames),o(s.namedImports.map(function(e){return e.localName}))).every(function(t){return e.isTypeName(t)})&&this.importsToReplace.set(i,"")}}catch(c){n.e(c)}finally{n.f()}}},{key:"isTypeName",value:function(e){return this.isTypeScriptTransformEnabled&&!this.nonTypeIdentifiers.has(e)}},{key:"generateImportReplacements",value:function(){var e,t=d(this.importInfoByPath.entries());try{for(t.s();!(e=t.n()).done;){var n=p(e.value,2),r=n[0],o=n[1],a=o.defaultNames,i=o.wildcardNames,s=o.namedImports,c=o.namedExports,h=o.exportStarNames,l=o.hasStarExport;if(0!==a.length||0!==i.length||0!==s.length||0!==c.length||0!==h.length||l){var m=this.getFreeIdentifierForPath(r),u=void 0;u=this.enableLegacyTypeScriptModuleInterop?m:i.length>0?i[0]:this.getFreeIdentifierForPath(r);var y="var ".concat(m," = require('").concat(r,"');");if(i.length>0){var f,k=d(i);try{for(k.s();!(f=k.n()).done;){var x=f.value,T=this.enableLegacyTypeScriptModuleInterop?m:"".concat(this.helperManager.getHelperName("interopRequireWildcard"),"(").concat(m,")");y+=" var ".concat(x," = ").concat(T,";")}}catch(j){k.e(j)}finally{k.f()}}else h.length>0&&u!==m?y+=" var ".concat(u," = ").concat(this.helperManager.getHelperName("interopRequireWildcard"),"(").concat(m,");"):a.length>0&&u!==m&&(y+=" var ".concat(u," = ").concat(this.helperManager.getHelperName("interopRequireDefault"),"(").concat(m,");"));var I,v=d(c);try{for(v.s();!(I=v.n()).done;){var g=I.value,A=g.importedName,b=g.localName;y+=" ".concat(this.helperManager.getHelperName("createNamedExportFrom"),"(").concat(m,", '").concat(b,"', '").concat(A,"');")}}catch(j){v.e(j)}finally{v.f()}var N,_=d(h);try{for(_.s();!(N=_.n()).done;){var w=N.value;y+=" exports.".concat(w," = ").concat(u,";")}}catch(j){_.e(j)}finally{_.f()}l&&(y+=" ".concat(this.helperManager.getHelperName("createStarExport"),"(").concat(m,");")),this.importsToReplace.set(r,y);var E,S=d(a);try{for(S.s();!(E=S.n()).done;){var B=E.value;this.identifierReplacements.set(B,"".concat(u,".default"))}}catch(j){S.e(j)}finally{S.f()}var R,C=d(s);try{for(C.s();!(R=C.n()).done;){var M=R.value,L=M.importedName,q=M.localName;this.identifierReplacements.set(q,"".concat(m,".").concat(L))}}catch(j){C.e(j)}finally{C.f()}}else this.importsToReplace.set(r,"require('".concat(r,"');"))}}catch(j){t.e(j)}finally{t.f()}}},{key:"getFreeIdentifierForPath",value:function(e){var t=e.split("/"),n=t[t.length-1].replace(/\W/g,"");return this.nameManager.claimFreeName("_".concat(n))}},{key:"preprocessImportAtIndex",value:function(e){var r,a,i,s=[],p=[],c=[];if(e++,(!this.tokens.matchesContextualAtIndex(e,t.ContextualKeyword._type)&&!this.tokens.matches1AtIndex(e,n.TokenType._typeof)||this.tokens.matches1AtIndex(e+1,n.TokenType.comma)||this.tokens.matchesContextualAtIndex(e+1,t.ContextualKeyword._from))&&!this.tokens.matches1AtIndex(e,n.TokenType.parenL)){if(this.tokens.matches1AtIndex(e,n.TokenType.name)&&(s.push(this.tokens.identifierNameAtIndex(e)),e++,this.tokens.matches1AtIndex(e,n.TokenType.comma)&&e++),this.tokens.matches1AtIndex(e,n.TokenType.star)&&(e+=2,p.push(this.tokens.identifierNameAtIndex(e)),e++),this.tokens.matches1AtIndex(e,n.TokenType.braceL)){e++;var h=this.getNamedImports(e);e=h.newIndex,c=h.namedImports}if(this.tokens.matchesContextualAtIndex(e,t.ContextualKeyword._from)&&e++,!this.tokens.matches1AtIndex(e,n.TokenType.string))throw new Error("Expected string token at the end of import statement.");var l=this.tokens.stringValueAtIndex(e),d=this.getImportInfo(l);(r=d.defaultNames).push.apply(r,s),(a=d.wildcardNames).push.apply(a,p),(i=d.namedImports).push.apply(i,o(c)),0===s.length&&0===p.length&&0===c.length&&(d.hasBareImport=!0)}}},{key:"preprocessExportAtIndex",value:function(e){if(this.tokens.matches2AtIndex(e,n.TokenType._export,n.TokenType._var)||this.tokens.matches2AtIndex(e,n.TokenType._export,n.TokenType._let)||this.tokens.matches2AtIndex(e,n.TokenType._export,n.TokenType._const))this.preprocessVarExportAtIndex(e);else if(this.tokens.matches2AtIndex(e,n.TokenType._export,n.TokenType._function)||this.tokens.matches2AtIndex(e,n.TokenType._export,n.TokenType._class)){var t=this.tokens.identifierNameAtIndex(e+2);this.addExportBinding(t,t)}else if(this.tokens.matches3AtIndex(e,n.TokenType._export,n.TokenType.name,n.TokenType._function)){var r=this.tokens.identifierNameAtIndex(e+3);this.addExportBinding(r,r)}else this.tokens.matches2AtIndex(e,n.TokenType._export,n.TokenType.braceL)?this.preprocessNamedExportAtIndex(e):this.tokens.matches2AtIndex(e,n.TokenType._export,n.TokenType.star)&&this.preprocessExportStarAtIndex(e)}},{key:"preprocessVarExportAtIndex",value:function(t){for(var r=0,o=t+2;;o++)if(this.tokens.matches1AtIndex(o,n.TokenType.braceL)||this.tokens.matches1AtIndex(o,n.TokenType.dollarBraceL)||this.tokens.matches1AtIndex(o,n.TokenType.bracketL))r++;else if(this.tokens.matches1AtIndex(o,n.TokenType.braceR)||this.tokens.matches1AtIndex(o,n.TokenType.bracketR))r--;else{if(0===r&&!this.tokens.matches1AtIndex(o,n.TokenType.name))break;if(this.tokens.matches1AtIndex(1,n.TokenType.eq)){var a=this.tokens.currentToken().rhsEndIndex;if(null==a)throw new Error("Expected = token with an end index.");o=a-1}else{var i=this.tokens.tokens[o];if((0,e.isDeclaration)(i)){var s=this.tokens.identifierNameAtIndex(o);this.identifierReplacements.set(s,"exports.".concat(s))}}}}},{key:"preprocessNamedExportAtIndex",value:function(e){var r;e+=2;var a=this.getNamedImports(e),i=a.newIndex,s=a.namedImports;if(e=i,this.tokens.matchesContextualAtIndex(e,t.ContextualKeyword._from)){if(e++,!this.tokens.matches1AtIndex(e,n.TokenType.string))throw new Error("Expected string token at the end of import statement.");var p=this.tokens.stringValueAtIndex(e);(r=this.getImportInfo(p).namedExports).push.apply(r,o(s))}else{var c,h=d(s);try{for(h.s();!(c=h.n()).done;){var l=c.value,m=l.importedName,u=l.localName;this.addExportBinding(m,u)}}catch(y){h.e(y)}finally{h.f()}}}},{key:"preprocessExportStarAtIndex",value:function(e){var t=null;if(this.tokens.matches3AtIndex(e,n.TokenType._export,n.TokenType.star,n.TokenType._as)?(e+=3,t=this.tokens.identifierNameAtIndex(e),e+=2):e+=3,!this.tokens.matches1AtIndex(e,n.TokenType.string))throw new Error("Expected string token at the end of star export statement.");var r=this.tokens.stringValueAtIndex(e),o=this.getImportInfo(r);null!==t?o.exportStarNames.push(t):o.hasStarExport=!0}},{key:"getNamedImports",value:function(e){for(var r=[];;){if(this.tokens.matches1AtIndex(e,n.TokenType.braceR)){e++;break}var o=!1;(this.tokens.matchesContextualAtIndex(e,t.ContextualKeyword._type)||this.tokens.matches1AtIndex(e,n.TokenType._typeof))&&this.tokens.matches1AtIndex(e+1,n.TokenType.name)&&!this.tokens.matchesContextualAtIndex(e+1,t.ContextualKeyword._as)&&(o=!0,e++);var a=this.tokens.identifierNameAtIndex(e),i=void 0;if(e++,this.tokens.matchesContextualAtIndex(e,t.ContextualKeyword._as)?(e++,i=this.tokens.identifierNameAtIndex(e),e++):i=a,o||r.push({importedName:a,localName:i}),this.tokens.matches2AtIndex(e,n.TokenType.comma,n.TokenType.braceR)){e+=2;break}if(this.tokens.matches1AtIndex(e,n.TokenType.braceR)){e++;break}if(!this.tokens.matches1AtIndex(e,n.TokenType.comma))throw new Error("Unexpected token: ".concat(JSON.stringify(this.tokens.tokens[e])));e++}return{newIndex:e,namedImports:r}}},{key:"getImportInfo",value:function(e){var t=this.importInfoByPath.get(e);if(t)return t;var n={defaultNames:[],wildcardNames:[],namedImports:[],namedExports:[],hasBareImport:!1,exportStarNames:[],hasStarExport:!1};return this.importInfoByPath.set(e,n),n}},{key:"addExportBinding",value:function(e,t){this.exportBindingsByLocalName.has(e)||this.exportBindingsByLocalName.set(e,[]),this.exportBindingsByLocalName.get(e).push(t)}},{key:"claimImportCode",value:function(e){var t=this.importsToReplace.get(e);return this.importsToReplace.set(e,""),t||""}},{key:"getIdentifierReplacement",value:function(e){return this.identifierReplacements.get(e)||null}},{key:"resolveExportBinding",value:function(e){var t=this.exportBindingsByLocalName.get(e);return t&&0!==t.length?t.map(function(e){return"exports.".concat(e)}).join(" = "):null}},{key:"getGlobalNames",value:function(){return new Set([].concat(o(this.identifierReplacements.keys()),o(this.exportBindingsByLocalName.keys())))}}]),a}();exports.default=x;
},{"./parser/tokenizer":"zEJU","./parser/tokenizer/keywords":"GGTW","./parser/tokenizer/types":"sS1T","./util/getNonTypeIdentifiers":"BOKS"}],"nRoK":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=r;var e=require("./parser/util/charcodes");function r(r,s,o){for(var t=o.compiledFilename,a="AAAA",i=0;i<r.length;i++)r.charCodeAt(i)===e.charCodes.lineFeed&&(a+=";AACA");return{version:3,file:t||"",sources:[s],mappings:a,names:[]}}
},{"./parser/util/charcodes":"EwSx"}],"e8q9":[function(require,module,exports) {
"use strict";function e(e,a){return l(e)||r(e,a)||t(e,a)||n()}function n(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function t(e,n){if(e){if("string"==typeof e)return a(e,n);var t=Object.prototype.toString.call(e).slice(8,-1);return"Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t?Array.from(e):"Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?a(e,n):void 0}}function a(e,n){(null==n||n>e.length)&&(n=e.length);for(var t=0,a=new Array(n);t<n;t++)a[t]=e[t];return a}function r(e,n){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e)){var t=[],a=!0,r=!1,l=void 0;try{for(var o,i=e[Symbol.iterator]();!(a=(o=i.next()).done)&&(t.push(o.value),!n||t.length!==n);a=!0);}catch(s){r=!0,l=s}finally{try{a||null==i.return||i.return()}finally{if(r)throw l}}return t}}function l(e){if(Array.isArray(e))return e}function o(e,n){if(!(e instanceof n))throw new TypeError("Cannot call a class as a function")}function i(e,n){for(var t=0;t<n.length;t++){var a=n[t];a.enumerable=a.enumerable||!1,a.configurable=!0,"value"in a&&(a.writable=!0),Object.defineProperty(e,a.key,a)}}function s(e,n,t){return n&&i(e.prototype,n),t&&i(e,t),e}Object.defineProperty(exports,"__esModule",{value:!0}),exports.HelperManager=void 0;var u={interopRequireWildcard:"\n    function interopRequireWildcard(obj) {\n      if (obj && obj.__esModule) {\n        return obj;\n      } else {\n        var newObj = {};\n        if (obj != null) {\n          for (var key in obj) {\n            if (Object.prototype.hasOwnProperty.call(obj, key)) {\n              newObj[key] = obj[key];\n            }\n          }\n        }\n        newObj.default = obj;\n        return newObj;\n      }\n    }\n  ",interopRequireDefault:"\n    function interopRequireDefault(obj) {\n      return obj && obj.__esModule ? obj : { default: obj };\n    }\n  ",createNamedExportFrom:"\n    function createNamedExportFrom(obj, localName, importedName) {\n      Object.defineProperty(exports, localName, {enumerable: true, get: () => obj[importedName]});\n    }\n  ",createStarExport:'\n    function createStarExport(obj) {\n      Object.keys(obj)\n        .filter((key) => key !== "default" && key !== "__esModule")\n        .forEach((key) => {\n          if (exports.hasOwnProperty(key)) {\n            return;\n          }\n          Object.defineProperty(exports, key, {enumerable: true, get: () => obj[key]});\n        });\n    }\n  ',nullishCoalesce:"\n    function nullishCoalesce(lhs, rhsFn) {\n      if (lhs != null) {\n        return lhs;\n      } else {\n        return rhsFn();\n      }\n    }\n  ",asyncNullishCoalesce:"\n    async function asyncNullishCoalesce(lhs, rhsFn) {\n      if (lhs != null) {\n        return lhs;\n      } else {\n        return await rhsFn();\n      }\n    }\n  ",optionalChain:"\n    function optionalChain(ops) {\n      let lastAccessLHS = undefined;\n      let value = ops[0];\n      let i = 1;\n      while (i < ops.length) {\n        const op = ops[i];\n        const fn = ops[i + 1];\n        i += 2;\n        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {\n          return undefined;\n        }\n        if (op === 'access' || op === 'optionalAccess') {\n          lastAccessLHS = value;\n          value = fn(value);\n        } else if (op === 'call' || op === 'optionalCall') {\n          value = fn((...args) => value.call(lastAccessLHS, ...args));\n          lastAccessLHS = undefined;\n        }\n      }\n      return value;\n    }\n  ",asyncOptionalChain:"\n    async function asyncOptionalChain(ops) {\n      let lastAccessLHS = undefined;\n      let value = ops[0];\n      let i = 1;\n      while (i < ops.length) {\n        const op = ops[i];\n        const fn = ops[i + 1];\n        i += 2;\n        if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {\n          return undefined;\n        }\n        if (op === 'access' || op === 'optionalAccess') {\n          lastAccessLHS = value;\n          value = await fn(value);\n        } else if (op === 'call' || op === 'optionalCall') {\n          value = await fn((...args) => value.call(lastAccessLHS, ...args));\n          lastAccessLHS = undefined;\n        }\n      }\n      return value;\n    }\n  ",optionalChainDelete:"\n    function optionalChainDelete(ops) {\n      const result = OPTIONAL_CHAIN_NAME(ops);\n      return result == null ? true : result;\n    }\n  ",asyncOptionalChainDelete:"\n    async function asyncOptionalChainDelete(ops) {\n      const result = await ASYNC_OPTIONAL_CHAIN_NAME(ops);\n      return result == null ? true : result;\n    }\n  "},c=function(){function n(e){o(this,n),this.nameManager=e,n.prototype.__init.call(this)}return s(n,[{key:"__init",value:function(){this.helperNames={}}}]),s(n,[{key:"getHelperName",value:function(e){var n=this.helperNames[e];return n||(n=this.nameManager.claimFreeName("_".concat(e)),this.helperNames[e]=n,n)}},{key:"emitHelpers",value:function(){var n="";this.helperNames.optionalChainDelete&&this.getHelperName("optionalChain"),this.helperNames.asyncOptionalChainDelete&&this.getHelperName("asyncOptionalChain");for(var t=0,a=Object.entries(u);t<a.length;t++){var r=e(a[t],2),l=r[0],o=r[1],i=this.helperNames[l],s=o;"optionalChainDelete"===l?s=s.replace("OPTIONAL_CHAIN_NAME",this.helperNames.optionalChain):"asyncOptionalChainDelete"===l&&(s=s.replace("ASYNC_OPTIONAL_CHAIN_NAME",this.helperNames.asyncOptionalChain)),i&&(n+=" ",n+=s.replace(l,i).replace(/\s+/g," ").trim())}return n}}]),n}();exports.HelperManager=c;
},{}],"IgGt":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=i,exports.hasShadowedGlobals=a;var e=require("./parser/tokenizer"),n=require("./parser/tokenizer/types");function r(e,n){var r;if("undefined"==typeof Symbol||null==e[Symbol.iterator]){if(Array.isArray(e)||(r=t(e))||n&&e&&"number"==typeof e.length){r&&(e=r);var o=0,i=function(){};return{s:i,n:function(){return o>=e.length?{done:!0}:{done:!1,value:e[o++]}},e:function(e){throw e},f:i}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,f=!0,l=!1;return{s:function(){r=e[Symbol.iterator]()},n:function(){var e=r.next();return f=e.done,e},e:function(e){l=!0,a=e},f:function(){try{f||null==r.return||r.return()}finally{if(l)throw a}}}}function t(e,n){if(e){if("string"==typeof e)return o(e,n);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?o(e,n):void 0}}function o(e,n){(null==n||n>e.length)&&(n=e.length);for(var r=0,t=new Array(n);r<n;r++)t[r]=e[r];return t}function i(e,n,r){a(e,r)&&f(e,n,r)}function a(t,o){var i,a=r(t.tokens);try{for(a.s();!(i=a.n()).done;){var f=i.value;if(f.type===n.TokenType.name&&(0,e.isNonTopLevelDeclaration)(f)&&o.has(t.identifierNameForToken(f)))return!0}}catch(l){a.e(l)}finally{a.f()}return!1}function f(r,t,o){for(var i=[],a=t.length-1,f=r.tokens.length-1;;f--){for(;i.length>0&&i[i.length-1].startTokenIndex===f+1;)i.pop();for(;a>=0&&t[a].endTokenIndex===f+1;)i.push(t[a]),a--;if(f<0)break;var u=r.tokens[f],s=r.identifierNameForToken(u);if(i.length>1&&u.type===n.TokenType.name&&o.has(s))if((0,e.isBlockScopedDeclaration)(u))l(i[i.length-1],r,s);else if((0,e.isFunctionScopedDeclaration)(u)){for(var c=i.length-1;c>0&&!i[c].isFunctionScope;)c--;if(c<0)throw new Error("Did not find parent function scope.");l(i[c],r,s)}}if(i.length>0)throw new Error("Expected empty scope stack after processing file.")}function l(e,r,t){for(var o=e.startTokenIndex;o<e.endTokenIndex;o++){var i=r.tokens[o];i.type===n.TokenType.name&&r.identifierNameForToken(i)===t&&(i.shadowsGlobal=!0)}}
},{"./parser/tokenizer":"zEJU","./parser/tokenizer/types":"sS1T"}],"ZB00":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=o;var r=require("../parser/tokenizer/types");function t(r,t){var n;if("undefined"==typeof Symbol||null==r[Symbol.iterator]){if(Array.isArray(r)||(n=e(r))||t&&r&&"number"==typeof r.length){n&&(r=n);var o=0,a=function(){};return{s:a,n:function(){return o>=r.length?{done:!0}:{done:!1,value:r[o++]}},e:function(r){throw r},f:a}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var i,u=!0,l=!1;return{s:function(){n=r[Symbol.iterator]()},n:function(){var r=n.next();return u=r.done,r},e:function(r){l=!0,i=r},f:function(){try{u||null==n.return||n.return()}finally{if(l)throw i}}}}function e(r,t){if(r){if("string"==typeof r)return n(r,t);var e=Object.prototype.toString.call(r).slice(8,-1);return"Object"===e&&r.constructor&&(e=r.constructor.name),"Map"===e||"Set"===e?Array.from(r):"Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?n(r,t):void 0}}function n(r,t){(null==t||t>r.length)&&(t=r.length);for(var e=0,n=new Array(t);e<t;e++)n[e]=r[e];return n}function o(e,n){var o,a=[],i=t(n);try{for(i.s();!(o=i.n()).done;){var u=o.value;u.type===r.TokenType.name&&a.push(e.slice(u.start,u.end))}}catch(l){i.e(l)}finally{i.f()}return a}
},{"../parser/tokenizer/types":"sS1T"}],"pt6I":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=t(require("./util/getIdentifierNames"));function t(e){return e&&e.__esModule?e:{default:e}}function n(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function r(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function a(e,t,n){return t&&r(e.prototype,t),n&&r(e,n),e}var i=function(){function t(r,a){n(this,t),t.prototype.__init.call(this),this.usedNames=new Set((0,e.default)(r,a))}return a(t,[{key:"__init",value:function(){this.usedNames=new Set}}]),a(t,[{key:"claimFreeName",value:function(e){var t=this.findFreeName(e);return this.usedNames.add(t),t}},{key:"findFreeName",value:function(e){if(!this.usedNames.has(e))return e;for(var t=2;this.usedNames.has(e+t);)t++;return e+t}}]),t}();exports.default=i;
},{"./util/getIdentifierNames":"ZB00"}],"EqZa":[function(require,module,exports) {
"use strict";var t=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,r){t.__proto__=r}||function(t,r){for(var e in r)r.hasOwnProperty(e)&&(t[e]=r[e])};return function(r,e){function o(){this.constructor=r}t(r,e),r.prototype=null===e?Object.create(e):(o.prototype=e.prototype,new o)}}();Object.defineProperty(exports,"__esModule",{value:!0});var r=function(r){function e(t,e){var o=r.call(this,e)||this;return o.path=t,o}return t(e,r),e}(Error);exports.VError=r;var e=function(){function t(){}return t.prototype.fail=function(t,r,e){return!1},t.prototype.unionResolver=function(){return this},t.prototype.createContext=function(){return this},t.prototype.resolveUnion=function(t){},t}();exports.NoopContext=e;var o=function(){function t(){this._propNames=[""],this._messages=[null],this._score=0}return t.prototype.fail=function(t,r,e){return this._propNames.push(t),this._messages.push(r),this._score+=e,!1},t.prototype.unionResolver=function(){return new n},t.prototype.resolveUnion=function(t){for(var r,e,o=null,n=0,s=t.contexts;n<s.length;n++){var p=s[n];(!o||p._score>=o._score)&&(o=p)}o&&o._score>0&&((r=this._propNames).push.apply(r,o._propNames),(e=this._messages).push.apply(e,o._messages))},t.prototype.getError=function(t){for(var e=[],o=this._propNames.length-1;o>=0;o--){var n=this._propNames[o];t+="number"==typeof n?"["+n+"]":n?"."+n:"";var s=this._messages[o];s&&e.push(t+" "+s)}return new r(t,e.join("; "))},t.prototype.getErrorDetail=function(t){for(var r=[],e=this._propNames.length-1;e>=0;e--){var o=this._propNames[e];t+="number"==typeof o?"["+o+"]":o?"."+o:"";var n=this._messages[e];n&&r.push({path:t,message:n})}var s=null;for(e=r.length-1;e>=0;e--)s&&(r[e].nested=[s]),s=r[e];return s},t}();exports.DetailContext=o;var n=function(){function t(){this.contexts=[]}return t.prototype.createContext=function(){var t=new o;return this.contexts.push(t),t},t}();
},{}],"yh9p":[function(require,module,exports) {
"use strict";exports.byteLength=u,exports.toByteArray=i,exports.fromByteArray=d;for(var r=[],t=[],e="undefined"!=typeof Uint8Array?Uint8Array:Array,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",o=0,a=n.length;o<a;++o)r[o]=n[o],t[n.charCodeAt(o)]=o;function h(r){var t=r.length;if(t%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var e=r.indexOf("=");return-1===e&&(e=t),[e,e===t?0:4-e%4]}function u(r){var t=h(r),e=t[0],n=t[1];return 3*(e+n)/4-n}function c(r,t,e){return 3*(t+e)/4-e}function i(r){var n,o,a=h(r),u=a[0],i=a[1],f=new e(c(r,u,i)),A=0,d=i>0?u-4:u;for(o=0;o<d;o+=4)n=t[r.charCodeAt(o)]<<18|t[r.charCodeAt(o+1)]<<12|t[r.charCodeAt(o+2)]<<6|t[r.charCodeAt(o+3)],f[A++]=n>>16&255,f[A++]=n>>8&255,f[A++]=255&n;return 2===i&&(n=t[r.charCodeAt(o)]<<2|t[r.charCodeAt(o+1)]>>4,f[A++]=255&n),1===i&&(n=t[r.charCodeAt(o)]<<10|t[r.charCodeAt(o+1)]<<4|t[r.charCodeAt(o+2)]>>2,f[A++]=n>>8&255,f[A++]=255&n),f}function f(t){return r[t>>18&63]+r[t>>12&63]+r[t>>6&63]+r[63&t]}function A(r,t,e){for(var n,o=[],a=t;a<e;a+=3)n=(r[a]<<16&16711680)+(r[a+1]<<8&65280)+(255&r[a+2]),o.push(f(n));return o.join("")}function d(t){for(var e,n=t.length,o=n%3,a=[],h=0,u=n-o;h<u;h+=16383)a.push(A(t,h,h+16383>u?u:h+16383));return 1===o?(e=t[n-1],a.push(r[e>>2]+r[e<<4&63]+"==")):2===o&&(e=(t[n-2]<<8)+t[n-1],a.push(r[e>>10]+r[e>>4&63]+r[e<<2&63]+"=")),a.join("")}t["-".charCodeAt(0)]=62,t["_".charCodeAt(0)]=63;
},{}],"JgNJ":[function(require,module,exports) {
exports.read=function(a,o,t,r,h){var M,p,w=8*h-r-1,f=(1<<w)-1,e=f>>1,i=-7,N=t?h-1:0,n=t?-1:1,s=a[o+N];for(N+=n,M=s&(1<<-i)-1,s>>=-i,i+=w;i>0;M=256*M+a[o+N],N+=n,i-=8);for(p=M&(1<<-i)-1,M>>=-i,i+=r;i>0;p=256*p+a[o+N],N+=n,i-=8);if(0===M)M=1-e;else{if(M===f)return p?NaN:1/0*(s?-1:1);p+=Math.pow(2,r),M-=e}return(s?-1:1)*p*Math.pow(2,M-r)},exports.write=function(a,o,t,r,h,M){var p,w,f,e=8*M-h-1,i=(1<<e)-1,N=i>>1,n=23===h?Math.pow(2,-24)-Math.pow(2,-77):0,s=r?0:M-1,u=r?1:-1,l=o<0||0===o&&1/o<0?1:0;for(o=Math.abs(o),isNaN(o)||o===1/0?(w=isNaN(o)?1:0,p=i):(p=Math.floor(Math.log(o)/Math.LN2),o*(f=Math.pow(2,-p))<1&&(p--,f*=2),(o+=p+N>=1?n/f:n*Math.pow(2,1-N))*f>=2&&(p++,f/=2),p+N>=i?(w=0,p=i):p+N>=1?(w=(o*f-1)*Math.pow(2,h),p+=N):(w=o*Math.pow(2,N-1)*Math.pow(2,h),p=0));h>=8;a[t+s]=255&w,s+=u,w/=256,h-=8);for(p=p<<h|w,e+=h;e>0;a[t+s]=255&p,s+=u,p/=256,e-=8);a[t+s-u]|=128*l};
},{}],"REa7":[function(require,module,exports) {
var r={}.toString;module.exports=Array.isArray||function(t){return"[object Array]"==r.call(t)};
},{}],"dskh":[function(require,module,exports) {

var global = arguments[3];
var t=arguments[3],r=require("base64-js"),e=require("ieee754"),n=require("isarray");function i(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()&&"function"==typeof t.subarray&&0===t.subarray(1,1).byteLength}catch(r){return!1}}function o(){return f.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function u(t,r){if(o()<r)throw new RangeError("Invalid typed array length");return f.TYPED_ARRAY_SUPPORT?(t=new Uint8Array(r)).__proto__=f.prototype:(null===t&&(t=new f(r)),t.length=r),t}function f(t,r,e){if(!(f.TYPED_ARRAY_SUPPORT||this instanceof f))return new f(t,r,e);if("number"==typeof t){if("string"==typeof r)throw new Error("If encoding is specified then the first argument must be a string");return c(this,t)}return s(this,t,r,e)}function s(t,r,e,n){if("number"==typeof r)throw new TypeError('"value" argument must not be a number');return"undefined"!=typeof ArrayBuffer&&r instanceof ArrayBuffer?g(t,r,e,n):"string"==typeof r?l(t,r,e):y(t,r)}function h(t){if("number"!=typeof t)throw new TypeError('"size" argument must be a number');if(t<0)throw new RangeError('"size" argument must not be negative')}function a(t,r,e,n){return h(r),r<=0?u(t,r):void 0!==e?"string"==typeof n?u(t,r).fill(e,n):u(t,r).fill(e):u(t,r)}function c(t,r){if(h(r),t=u(t,r<0?0:0|w(r)),!f.TYPED_ARRAY_SUPPORT)for(var e=0;e<r;++e)t[e]=0;return t}function l(t,r,e){if("string"==typeof e&&""!==e||(e="utf8"),!f.isEncoding(e))throw new TypeError('"encoding" must be a valid string encoding');var n=0|v(r,e),i=(t=u(t,n)).write(r,e);return i!==n&&(t=t.slice(0,i)),t}function p(t,r){var e=r.length<0?0:0|w(r.length);t=u(t,e);for(var n=0;n<e;n+=1)t[n]=255&r[n];return t}function g(t,r,e,n){if(r.byteLength,e<0||r.byteLength<e)throw new RangeError("'offset' is out of bounds");if(r.byteLength<e+(n||0))throw new RangeError("'length' is out of bounds");return r=void 0===e&&void 0===n?new Uint8Array(r):void 0===n?new Uint8Array(r,e):new Uint8Array(r,e,n),f.TYPED_ARRAY_SUPPORT?(t=r).__proto__=f.prototype:t=p(t,r),t}function y(t,r){if(f.isBuffer(r)){var e=0|w(r.length);return 0===(t=u(t,e)).length?t:(r.copy(t,0,0,e),t)}if(r){if("undefined"!=typeof ArrayBuffer&&r.buffer instanceof ArrayBuffer||"length"in r)return"number"!=typeof r.length||W(r.length)?u(t,0):p(t,r);if("Buffer"===r.type&&n(r.data))return p(t,r.data)}throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}function w(t){if(t>=o())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+o().toString(16)+" bytes");return 0|t}function d(t){return+t!=t&&(t=0),f.alloc(+t)}function v(t,r){if(f.isBuffer(t))return t.length;if("undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(t)||t instanceof ArrayBuffer))return t.byteLength;"string"!=typeof t&&(t=""+t);var e=t.length;if(0===e)return 0;for(var n=!1;;)switch(r){case"ascii":case"latin1":case"binary":return e;case"utf8":case"utf-8":case void 0:return $(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*e;case"hex":return e>>>1;case"base64":return K(t).length;default:if(n)return $(t).length;r=(""+r).toLowerCase(),n=!0}}function E(t,r,e){var n=!1;if((void 0===r||r<0)&&(r=0),r>this.length)return"";if((void 0===e||e>this.length)&&(e=this.length),e<=0)return"";if((e>>>=0)<=(r>>>=0))return"";for(t||(t="utf8");;)switch(t){case"hex":return x(this,r,e);case"utf8":case"utf-8":return Y(this,r,e);case"ascii":return L(this,r,e);case"latin1":case"binary":return D(this,r,e);case"base64":return S(this,r,e);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return C(this,r,e);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0}}function b(t,r,e){var n=t[r];t[r]=t[e],t[e]=n}function R(t,r,e,n,i){if(0===t.length)return-1;if("string"==typeof e?(n=e,e=0):e>2147483647?e=2147483647:e<-2147483648&&(e=-2147483648),e=+e,isNaN(e)&&(e=i?0:t.length-1),e<0&&(e=t.length+e),e>=t.length){if(i)return-1;e=t.length-1}else if(e<0){if(!i)return-1;e=0}if("string"==typeof r&&(r=f.from(r,n)),f.isBuffer(r))return 0===r.length?-1:_(t,r,e,n,i);if("number"==typeof r)return r&=255,f.TYPED_ARRAY_SUPPORT&&"function"==typeof Uint8Array.prototype.indexOf?i?Uint8Array.prototype.indexOf.call(t,r,e):Uint8Array.prototype.lastIndexOf.call(t,r,e):_(t,[r],e,n,i);throw new TypeError("val must be string, number or Buffer")}function _(t,r,e,n,i){var o,u=1,f=t.length,s=r.length;if(void 0!==n&&("ucs2"===(n=String(n).toLowerCase())||"ucs-2"===n||"utf16le"===n||"utf-16le"===n)){if(t.length<2||r.length<2)return-1;u=2,f/=2,s/=2,e/=2}function h(t,r){return 1===u?t[r]:t.readUInt16BE(r*u)}if(i){var a=-1;for(o=e;o<f;o++)if(h(t,o)===h(r,-1===a?0:o-a)){if(-1===a&&(a=o),o-a+1===s)return a*u}else-1!==a&&(o-=o-a),a=-1}else for(e+s>f&&(e=f-s),o=e;o>=0;o--){for(var c=!0,l=0;l<s;l++)if(h(t,o+l)!==h(r,l)){c=!1;break}if(c)return o}return-1}function A(t,r,e,n){e=Number(e)||0;var i=t.length-e;n?(n=Number(n))>i&&(n=i):n=i;var o=r.length;if(o%2!=0)throw new TypeError("Invalid hex string");n>o/2&&(n=o/2);for(var u=0;u<n;++u){var f=parseInt(r.substr(2*u,2),16);if(isNaN(f))return u;t[e+u]=f}return u}function m(t,r,e,n){return Q($(r,t.length-e),t,e,n)}function P(t,r,e,n){return Q(G(r),t,e,n)}function T(t,r,e,n){return P(t,r,e,n)}function B(t,r,e,n){return Q(K(r),t,e,n)}function U(t,r,e,n){return Q(H(r,t.length-e),t,e,n)}function S(t,e,n){return 0===e&&n===t.length?r.fromByteArray(t):r.fromByteArray(t.slice(e,n))}function Y(t,r,e){e=Math.min(t.length,e);for(var n=[],i=r;i<e;){var o,u,f,s,h=t[i],a=null,c=h>239?4:h>223?3:h>191?2:1;if(i+c<=e)switch(c){case 1:h<128&&(a=h);break;case 2:128==(192&(o=t[i+1]))&&(s=(31&h)<<6|63&o)>127&&(a=s);break;case 3:o=t[i+1],u=t[i+2],128==(192&o)&&128==(192&u)&&(s=(15&h)<<12|(63&o)<<6|63&u)>2047&&(s<55296||s>57343)&&(a=s);break;case 4:o=t[i+1],u=t[i+2],f=t[i+3],128==(192&o)&&128==(192&u)&&128==(192&f)&&(s=(15&h)<<18|(63&o)<<12|(63&u)<<6|63&f)>65535&&s<1114112&&(a=s)}null===a?(a=65533,c=1):a>65535&&(a-=65536,n.push(a>>>10&1023|55296),a=56320|1023&a),n.push(a),i+=c}return O(n)}exports.Buffer=f,exports.SlowBuffer=d,exports.INSPECT_MAX_BYTES=50,f.TYPED_ARRAY_SUPPORT=void 0!==t.TYPED_ARRAY_SUPPORT?t.TYPED_ARRAY_SUPPORT:i(),exports.kMaxLength=o(),f.poolSize=8192,f._augment=function(t){return t.__proto__=f.prototype,t},f.from=function(t,r,e){return s(null,t,r,e)},f.TYPED_ARRAY_SUPPORT&&(f.prototype.__proto__=Uint8Array.prototype,f.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&f[Symbol.species]===f&&Object.defineProperty(f,Symbol.species,{value:null,configurable:!0})),f.alloc=function(t,r,e){return a(null,t,r,e)},f.allocUnsafe=function(t){return c(null,t)},f.allocUnsafeSlow=function(t){return c(null,t)},f.isBuffer=function(t){return!(null==t||!t._isBuffer)},f.compare=function(t,r){if(!f.isBuffer(t)||!f.isBuffer(r))throw new TypeError("Arguments must be Buffers");if(t===r)return 0;for(var e=t.length,n=r.length,i=0,o=Math.min(e,n);i<o;++i)if(t[i]!==r[i]){e=t[i],n=r[i];break}return e<n?-1:n<e?1:0},f.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},f.concat=function(t,r){if(!n(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return f.alloc(0);var e;if(void 0===r)for(r=0,e=0;e<t.length;++e)r+=t[e].length;var i=f.allocUnsafe(r),o=0;for(e=0;e<t.length;++e){var u=t[e];if(!f.isBuffer(u))throw new TypeError('"list" argument must be an Array of Buffers');u.copy(i,o),o+=u.length}return i},f.byteLength=v,f.prototype._isBuffer=!0,f.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var r=0;r<t;r+=2)b(this,r,r+1);return this},f.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var r=0;r<t;r+=4)b(this,r,r+3),b(this,r+1,r+2);return this},f.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var r=0;r<t;r+=8)b(this,r,r+7),b(this,r+1,r+6),b(this,r+2,r+5),b(this,r+3,r+4);return this},f.prototype.toString=function(){var t=0|this.length;return 0===t?"":0===arguments.length?Y(this,0,t):E.apply(this,arguments)},f.prototype.equals=function(t){if(!f.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===f.compare(this,t)},f.prototype.inspect=function(){var t="",r=exports.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,r).match(/.{2}/g).join(" "),this.length>r&&(t+=" ... ")),"<Buffer "+t+">"},f.prototype.compare=function(t,r,e,n,i){if(!f.isBuffer(t))throw new TypeError("Argument must be a Buffer");if(void 0===r&&(r=0),void 0===e&&(e=t?t.length:0),void 0===n&&(n=0),void 0===i&&(i=this.length),r<0||e>t.length||n<0||i>this.length)throw new RangeError("out of range index");if(n>=i&&r>=e)return 0;if(n>=i)return-1;if(r>=e)return 1;if(this===t)return 0;for(var o=(i>>>=0)-(n>>>=0),u=(e>>>=0)-(r>>>=0),s=Math.min(o,u),h=this.slice(n,i),a=t.slice(r,e),c=0;c<s;++c)if(h[c]!==a[c]){o=h[c],u=a[c];break}return o<u?-1:u<o?1:0},f.prototype.includes=function(t,r,e){return-1!==this.indexOf(t,r,e)},f.prototype.indexOf=function(t,r,e){return R(this,t,r,e,!0)},f.prototype.lastIndexOf=function(t,r,e){return R(this,t,r,e,!1)},f.prototype.write=function(t,r,e,n){if(void 0===r)n="utf8",e=this.length,r=0;else if(void 0===e&&"string"==typeof r)n=r,e=this.length,r=0;else{if(!isFinite(r))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");r|=0,isFinite(e)?(e|=0,void 0===n&&(n="utf8")):(n=e,e=void 0)}var i=this.length-r;if((void 0===e||e>i)&&(e=i),t.length>0&&(e<0||r<0)||r>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");for(var o=!1;;)switch(n){case"hex":return A(this,t,r,e);case"utf8":case"utf-8":return m(this,t,r,e);case"ascii":return P(this,t,r,e);case"latin1":case"binary":return T(this,t,r,e);case"base64":return B(this,t,r,e);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return U(this,t,r,e);default:if(o)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),o=!0}},f.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var I=4096;function O(t){var r=t.length;if(r<=I)return String.fromCharCode.apply(String,t);for(var e="",n=0;n<r;)e+=String.fromCharCode.apply(String,t.slice(n,n+=I));return e}function L(t,r,e){var n="";e=Math.min(t.length,e);for(var i=r;i<e;++i)n+=String.fromCharCode(127&t[i]);return n}function D(t,r,e){var n="";e=Math.min(t.length,e);for(var i=r;i<e;++i)n+=String.fromCharCode(t[i]);return n}function x(t,r,e){var n=t.length;(!r||r<0)&&(r=0),(!e||e<0||e>n)&&(e=n);for(var i="",o=r;o<e;++o)i+=Z(t[o]);return i}function C(t,r,e){for(var n=t.slice(r,e),i="",o=0;o<n.length;o+=2)i+=String.fromCharCode(n[o]+256*n[o+1]);return i}function M(t,r,e){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+r>e)throw new RangeError("Trying to access beyond buffer length")}function k(t,r,e,n,i,o){if(!f.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(r>i||r<o)throw new RangeError('"value" argument is out of bounds');if(e+n>t.length)throw new RangeError("Index out of range")}function N(t,r,e,n){r<0&&(r=65535+r+1);for(var i=0,o=Math.min(t.length-e,2);i<o;++i)t[e+i]=(r&255<<8*(n?i:1-i))>>>8*(n?i:1-i)}function z(t,r,e,n){r<0&&(r=4294967295+r+1);for(var i=0,o=Math.min(t.length-e,4);i<o;++i)t[e+i]=r>>>8*(n?i:3-i)&255}function F(t,r,e,n,i,o){if(e+n>t.length)throw new RangeError("Index out of range");if(e<0)throw new RangeError("Index out of range")}function j(t,r,n,i,o){return o||F(t,r,n,4,3.4028234663852886e38,-3.4028234663852886e38),e.write(t,r,n,i,23,4),n+4}function q(t,r,n,i,o){return o||F(t,r,n,8,1.7976931348623157e308,-1.7976931348623157e308),e.write(t,r,n,i,52,8),n+8}f.prototype.slice=function(t,r){var e,n=this.length;if((t=~~t)<0?(t+=n)<0&&(t=0):t>n&&(t=n),(r=void 0===r?n:~~r)<0?(r+=n)<0&&(r=0):r>n&&(r=n),r<t&&(r=t),f.TYPED_ARRAY_SUPPORT)(e=this.subarray(t,r)).__proto__=f.prototype;else{var i=r-t;e=new f(i,void 0);for(var o=0;o<i;++o)e[o]=this[o+t]}return e},f.prototype.readUIntLE=function(t,r,e){t|=0,r|=0,e||M(t,r,this.length);for(var n=this[t],i=1,o=0;++o<r&&(i*=256);)n+=this[t+o]*i;return n},f.prototype.readUIntBE=function(t,r,e){t|=0,r|=0,e||M(t,r,this.length);for(var n=this[t+--r],i=1;r>0&&(i*=256);)n+=this[t+--r]*i;return n},f.prototype.readUInt8=function(t,r){return r||M(t,1,this.length),this[t]},f.prototype.readUInt16LE=function(t,r){return r||M(t,2,this.length),this[t]|this[t+1]<<8},f.prototype.readUInt16BE=function(t,r){return r||M(t,2,this.length),this[t]<<8|this[t+1]},f.prototype.readUInt32LE=function(t,r){return r||M(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},f.prototype.readUInt32BE=function(t,r){return r||M(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},f.prototype.readIntLE=function(t,r,e){t|=0,r|=0,e||M(t,r,this.length);for(var n=this[t],i=1,o=0;++o<r&&(i*=256);)n+=this[t+o]*i;return n>=(i*=128)&&(n-=Math.pow(2,8*r)),n},f.prototype.readIntBE=function(t,r,e){t|=0,r|=0,e||M(t,r,this.length);for(var n=r,i=1,o=this[t+--n];n>0&&(i*=256);)o+=this[t+--n]*i;return o>=(i*=128)&&(o-=Math.pow(2,8*r)),o},f.prototype.readInt8=function(t,r){return r||M(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},f.prototype.readInt16LE=function(t,r){r||M(t,2,this.length);var e=this[t]|this[t+1]<<8;return 32768&e?4294901760|e:e},f.prototype.readInt16BE=function(t,r){r||M(t,2,this.length);var e=this[t+1]|this[t]<<8;return 32768&e?4294901760|e:e},f.prototype.readInt32LE=function(t,r){return r||M(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},f.prototype.readInt32BE=function(t,r){return r||M(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},f.prototype.readFloatLE=function(t,r){return r||M(t,4,this.length),e.read(this,t,!0,23,4)},f.prototype.readFloatBE=function(t,r){return r||M(t,4,this.length),e.read(this,t,!1,23,4)},f.prototype.readDoubleLE=function(t,r){return r||M(t,8,this.length),e.read(this,t,!0,52,8)},f.prototype.readDoubleBE=function(t,r){return r||M(t,8,this.length),e.read(this,t,!1,52,8)},f.prototype.writeUIntLE=function(t,r,e,n){(t=+t,r|=0,e|=0,n)||k(this,t,r,e,Math.pow(2,8*e)-1,0);var i=1,o=0;for(this[r]=255&t;++o<e&&(i*=256);)this[r+o]=t/i&255;return r+e},f.prototype.writeUIntBE=function(t,r,e,n){(t=+t,r|=0,e|=0,n)||k(this,t,r,e,Math.pow(2,8*e)-1,0);var i=e-1,o=1;for(this[r+i]=255&t;--i>=0&&(o*=256);)this[r+i]=t/o&255;return r+e},f.prototype.writeUInt8=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,1,255,0),f.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),this[r]=255&t,r+1},f.prototype.writeUInt16LE=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,2,65535,0),f.TYPED_ARRAY_SUPPORT?(this[r]=255&t,this[r+1]=t>>>8):N(this,t,r,!0),r+2},f.prototype.writeUInt16BE=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,2,65535,0),f.TYPED_ARRAY_SUPPORT?(this[r]=t>>>8,this[r+1]=255&t):N(this,t,r,!1),r+2},f.prototype.writeUInt32LE=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,4,4294967295,0),f.TYPED_ARRAY_SUPPORT?(this[r+3]=t>>>24,this[r+2]=t>>>16,this[r+1]=t>>>8,this[r]=255&t):z(this,t,r,!0),r+4},f.prototype.writeUInt32BE=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,4,4294967295,0),f.TYPED_ARRAY_SUPPORT?(this[r]=t>>>24,this[r+1]=t>>>16,this[r+2]=t>>>8,this[r+3]=255&t):z(this,t,r,!1),r+4},f.prototype.writeIntLE=function(t,r,e,n){if(t=+t,r|=0,!n){var i=Math.pow(2,8*e-1);k(this,t,r,e,i-1,-i)}var o=0,u=1,f=0;for(this[r]=255&t;++o<e&&(u*=256);)t<0&&0===f&&0!==this[r+o-1]&&(f=1),this[r+o]=(t/u>>0)-f&255;return r+e},f.prototype.writeIntBE=function(t,r,e,n){if(t=+t,r|=0,!n){var i=Math.pow(2,8*e-1);k(this,t,r,e,i-1,-i)}var o=e-1,u=1,f=0;for(this[r+o]=255&t;--o>=0&&(u*=256);)t<0&&0===f&&0!==this[r+o+1]&&(f=1),this[r+o]=(t/u>>0)-f&255;return r+e},f.prototype.writeInt8=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,1,127,-128),f.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),t<0&&(t=255+t+1),this[r]=255&t,r+1},f.prototype.writeInt16LE=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,2,32767,-32768),f.TYPED_ARRAY_SUPPORT?(this[r]=255&t,this[r+1]=t>>>8):N(this,t,r,!0),r+2},f.prototype.writeInt16BE=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,2,32767,-32768),f.TYPED_ARRAY_SUPPORT?(this[r]=t>>>8,this[r+1]=255&t):N(this,t,r,!1),r+2},f.prototype.writeInt32LE=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,4,2147483647,-2147483648),f.TYPED_ARRAY_SUPPORT?(this[r]=255&t,this[r+1]=t>>>8,this[r+2]=t>>>16,this[r+3]=t>>>24):z(this,t,r,!0),r+4},f.prototype.writeInt32BE=function(t,r,e){return t=+t,r|=0,e||k(this,t,r,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),f.TYPED_ARRAY_SUPPORT?(this[r]=t>>>24,this[r+1]=t>>>16,this[r+2]=t>>>8,this[r+3]=255&t):z(this,t,r,!1),r+4},f.prototype.writeFloatLE=function(t,r,e){return j(this,t,r,!0,e)},f.prototype.writeFloatBE=function(t,r,e){return j(this,t,r,!1,e)},f.prototype.writeDoubleLE=function(t,r,e){return q(this,t,r,!0,e)},f.prototype.writeDoubleBE=function(t,r,e){return q(this,t,r,!1,e)},f.prototype.copy=function(t,r,e,n){if(e||(e=0),n||0===n||(n=this.length),r>=t.length&&(r=t.length),r||(r=0),n>0&&n<e&&(n=e),n===e)return 0;if(0===t.length||0===this.length)return 0;if(r<0)throw new RangeError("targetStart out of bounds");if(e<0||e>=this.length)throw new RangeError("sourceStart out of bounds");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-r<n-e&&(n=t.length-r+e);var i,o=n-e;if(this===t&&e<r&&r<n)for(i=o-1;i>=0;--i)t[i+r]=this[i+e];else if(o<1e3||!f.TYPED_ARRAY_SUPPORT)for(i=0;i<o;++i)t[i+r]=this[i+e];else Uint8Array.prototype.set.call(t,this.subarray(e,e+o),r);return o},f.prototype.fill=function(t,r,e,n){if("string"==typeof t){if("string"==typeof r?(n=r,r=0,e=this.length):"string"==typeof e&&(n=e,e=this.length),1===t.length){var i=t.charCodeAt(0);i<256&&(t=i)}if(void 0!==n&&"string"!=typeof n)throw new TypeError("encoding must be a string");if("string"==typeof n&&!f.isEncoding(n))throw new TypeError("Unknown encoding: "+n)}else"number"==typeof t&&(t&=255);if(r<0||this.length<r||this.length<e)throw new RangeError("Out of range index");if(e<=r)return this;var o;if(r>>>=0,e=void 0===e?this.length:e>>>0,t||(t=0),"number"==typeof t)for(o=r;o<e;++o)this[o]=t;else{var u=f.isBuffer(t)?t:$(new f(t,n).toString()),s=u.length;for(o=0;o<e-r;++o)this[o+r]=u[o%s]}return this};var V=/[^+\/0-9A-Za-z-_]/g;function X(t){if((t=J(t).replace(V,"")).length<2)return"";for(;t.length%4!=0;)t+="=";return t}function J(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}function Z(t){return t<16?"0"+t.toString(16):t.toString(16)}function $(t,r){var e;r=r||1/0;for(var n=t.length,i=null,o=[],u=0;u<n;++u){if((e=t.charCodeAt(u))>55295&&e<57344){if(!i){if(e>56319){(r-=3)>-1&&o.push(239,191,189);continue}if(u+1===n){(r-=3)>-1&&o.push(239,191,189);continue}i=e;continue}if(e<56320){(r-=3)>-1&&o.push(239,191,189),i=e;continue}e=65536+(i-55296<<10|e-56320)}else i&&(r-=3)>-1&&o.push(239,191,189);if(i=null,e<128){if((r-=1)<0)break;o.push(e)}else if(e<2048){if((r-=2)<0)break;o.push(e>>6|192,63&e|128)}else if(e<65536){if((r-=3)<0)break;o.push(e>>12|224,e>>6&63|128,63&e|128)}else{if(!(e<1114112))throw new Error("Invalid code point");if((r-=4)<0)break;o.push(e>>18|240,e>>12&63|128,e>>6&63|128,63&e|128)}}return o}function G(t){for(var r=[],e=0;e<t.length;++e)r.push(255&t.charCodeAt(e));return r}function H(t,r){for(var e,n,i,o=[],u=0;u<t.length&&!((r-=2)<0);++u)n=(e=t.charCodeAt(u))>>8,i=e%256,o.push(i),o.push(n);return o}function K(t){return r.toByteArray(X(t))}function Q(t,r,e,n){for(var i=0;i<n&&!(i+e>=r.length||i>=t.length);++i)r[i+e]=t[i];return i}function W(t){return t!=t}
},{"base64-js":"yh9p","ieee754":"JgNJ","isarray":"REa7","buffer":"dskh"}],"zOaa":[function(require,module,exports) {
var Buffer = require("buffer").Buffer;
var n=require("buffer").Buffer,t=this&&this.__extends||function(){var n=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,t){n.__proto__=t}||function(n,t){for(var r in t)t.hasOwnProperty(r)&&(n[r]=t[r])};return function(t,r){function e(){this.constructor=t}n(t,r),t.prototype=null===r?Object.create(r):(e.prototype=r.prototype,new e)}}();Object.defineProperty(exports,"__esModule",{value:!0});var r=require("./util"),e=function(){return function(){}}();function i(n){return"string"==typeof n?u(n):n}function o(n,t){var r=n[t];if(!r)throw new Error("Unknown type "+t);return r}function u(n){return new a(n)}exports.TType=e,exports.name=u;var a=function(n){function r(t){var r=n.call(this)||this;return r.name=t,r._failMsg="is not a "+t,r}return t(r,n),r.prototype.getChecker=function(n,t,e){var i=this,u=o(n,this.name),a=u.getChecker(n,t,e);return u instanceof B||u instanceof r?a:function(n,t){return!!a(n,t)||t.fail(null,i._failMsg,0)}},r}(e);function s(n){return new f(n)}exports.TName=a,exports.lit=s;var f=function(n){function r(t){var r=n.call(this)||this;return r.value=t,r.name=JSON.stringify(t),r._failMsg="is not "+r.name,r}return t(r,n),r.prototype.getChecker=function(n,t){var r=this;return function(n,t){return n===r.value||t.fail(null,r._failMsg,-1)}},r}(e);function c(n){return new l(i(n))}exports.TLiteral=f,exports.array=c;var l=function(n){function r(t){var r=n.call(this)||this;return r.ttype=t,r}return t(r,n),r.prototype.getChecker=function(n,t){var r=this.ttype.getChecker(n,t);return function(n,t){if(!Array.isArray(n))return t.fail(null,"is not an array",0);for(var e=0;e<n.length;e++){if(!r(n[e],t))return t.fail(e,null,1)}return!0}},r}(e);function p(){for(var n=[],t=0;t<arguments.length;t++)n[t]=arguments[t];return new h(n.map(function(n){return i(n)}))}exports.TArray=l,exports.tuple=p;var h=function(n){function r(t){var r=n.call(this)||this;return r.ttypes=t,r}return t(r,n),r.prototype.getChecker=function(n,t){var r=this.ttypes.map(function(r){return r.getChecker(n,t)}),e=function(n,t){if(!Array.isArray(n))return t.fail(null,"is not an array",0);for(var e=0;e<r.length;e++){if(!r[e](n[e],t))return t.fail(e,null,1)}return!0};return t?function(n,t){return!!e(n,t)&&(n.length<=r.length||t.fail(r.length,"is extraneous",2))}:e},r}(e);function v(){for(var n=[],t=0;t<arguments.length;t++)n[t]=arguments[t];return new y(n.map(function(n){return i(n)}))}exports.TTuple=h,exports.union=v;var y=function(n){function r(t){var r=n.call(this)||this;r.ttypes=t;var e=t.map(function(n){return n instanceof a||n instanceof f?n.name:null}).filter(function(n){return n}),i=t.length-e.length;return e.length?(i>0&&e.push(i+" more"),r._failMsg="is none of "+e.join(", ")):r._failMsg="is none of "+i+" types",r}return t(r,n),r.prototype.getChecker=function(n,t){var r=this,e=this.ttypes.map(function(r){return r.getChecker(n,t)});return function(n,t){for(var i=t.unionResolver(),o=0;o<e.length;o++){if(e[o](n,i.createContext()))return!0}return t.resolveUnion(i),t.fail(null,r._failMsg,0)}},r}(e);function m(){for(var n=[],t=0;t<arguments.length;t++)n[t]=arguments[t];return new g(n.map(function(n){return i(n)}))}exports.TUnion=y,exports.intersection=m;var g=function(n){function r(t){var r=n.call(this)||this;return r.ttypes=t,r}return t(r,n),r.prototype.getChecker=function(n,t){var r=new Set,e=this.ttypes.map(function(e){return e.getChecker(n,t,r)});return function(n,t){return!!e.every(function(r){return r(n,t)})||t.fail(null,null,0)}},r}(e);function w(n){return new x(n)}exports.TIntersection=g,exports.enumtype=w;var x=function(n){function r(t){var r=n.call(this)||this;return r.members=t,r.validValues=new Set,r._failMsg="is not a valid enum value",r.validValues=new Set(Object.keys(t).map(function(n){return t[n]})),r}return t(r,n),r.prototype.getChecker=function(n,t){var r=this;return function(n,t){return!!r.validValues.has(n)||t.fail(null,r._failMsg,0)}},r}(e);function b(n,t){return new d(n,t)}exports.TEnumType=x,exports.enumlit=b;var d=function(n){function r(t,r){var e=n.call(this)||this;return e.enumName=t,e.prop=r,e._failMsg="is not "+t+"."+r,e}return t(r,n),r.prototype.getChecker=function(n,t){var r=this,e=o(n,this.enumName);if(!(e instanceof x))throw new Error("Type "+this.enumName+" used in enumlit is not an enum type");var i=e.members[this.prop];if(!e.members.hasOwnProperty(this.prop))throw new Error("Unknown value "+this.enumName+"."+this.prop+" used in enumlit");return function(n,t){return n===i||t.fail(null,r._failMsg,-1)}},r}(e);function k(n){return Object.keys(n).map(function(t){return C(t,n[t])})}function C(n,t){return t instanceof j?new O(n,t.ttype,!0):new O(n,i(t),!1)}function T(n,t){return new _(n,k(t))}exports.TEnumLiteral=d,exports.iface=T;var _=function(n){function e(t,r){var e=n.call(this)||this;return e.bases=t,e.props=r,e.propSet=new Set(r.map(function(n){return n.name})),e}return t(e,n),e.prototype.getChecker=function(n,t,e){var i=this,u=this.bases.map(function(r){return o(n,r).getChecker(n,t)}),a=this.props.map(function(r){return r.ttype.getChecker(n,t)}),s=new r.NoopContext,f=this.props.map(function(n,t){return!n.isOpt&&!a[t](void 0,s)}),c=function(n,t){if("object"!=typeof n||null===n)return t.fail(null,"is not an object",0);for(var r=0;r<u.length;r++)if(!u[r](n,t))return!1;for(r=0;r<a.length;r++){var e=i.props[r].name,o=n[e];if(void 0===o){if(f[r])return t.fail(e,"is missing",1)}else if(!a[r](o,t))return t.fail(e,null,1)}return!0};if(!t)return c;var l=this.propSet;return e&&(this.propSet.forEach(function(n){return e.add(n)}),l=e),function(n,t){if(!c(n,t))return!1;for(var r in n)if(!l.has(r))return t.fail(r,"is extraneous",2);return!0}},e}(e);function A(n){return new j(i(n))}exports.TIface=_,exports.opt=A;var j=function(n){function r(t){var r=n.call(this)||this;return r.ttype=t,r}return t(r,n),r.prototype.getChecker=function(n,t){var r=this.ttype.getChecker(n,t);return function(n,t){return void 0===n||r(n,t)}},r}(e);exports.TOptional=j;var O=function(){return function(n,t,r){this.name=n,this.ttype=t,this.isOpt=r}}();function M(n){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];return new E(new U(t),i(n))}exports.TProp=O,exports.func=M;var E=function(n){function r(t,r){var e=n.call(this)||this;return e.paramList=t,e.result=r,e}return t(r,n),r.prototype.getChecker=function(n,t){return function(n,t){return"function"==typeof n||t.fail(null,"is not a function",0)}},r}(e);function S(n,t,r){return new N(n,i(t),Boolean(r))}exports.TFunc=E,exports.param=S;var N=function(){return function(n,t,r){this.name=n,this.ttype=t,this.isOpt=r}}();exports.TParam=N;var U=function(n){function e(t){var r=n.call(this)||this;return r.params=t,r}return t(e,n),e.prototype.getChecker=function(n,t){var e=this,i=this.params.map(function(r){return r.ttype.getChecker(n,t)}),o=new r.NoopContext,u=this.params.map(function(n,t){return!n.isOpt&&!i[t](void 0,o)}),a=function(n,t){if(!Array.isArray(n))return t.fail(null,"is not an array",0);for(var r=0;r<i.length;r++){var o=e.params[r];if(void 0===n[r]){if(u[r])return t.fail(o.name,"is missing",1)}else if(!i[r](n[r],t))return t.fail(o.name,null,1)}return!0};return t?function(n,t){return!!a(n,t)&&(n.length<=i.length||t.fail(i.length,"is extraneous",2))}:a},e}(e);exports.TParamList=U;var B=function(n){function r(t,r){var e=n.call(this)||this;return e.validator=t,e.message=r,e}return t(r,n),r.prototype.getChecker=function(n,t){var r=this;return function(n,t){return!!r.validator(n)||t.fail(null,r.message,0)}},r}(e);exports.BasicType=B,exports.basicTypes={any:new B(function(n){return!0},"is invalid"),number:new B(function(n){return"number"==typeof n},"is not a number"),object:new B(function(n){return"object"==typeof n&&n},"is not an object"),boolean:new B(function(n){return"boolean"==typeof n},"is not a boolean"),string:new B(function(n){return"string"==typeof n},"is not a string"),symbol:new B(function(n){return"symbol"==typeof n},"is not a symbol"),void:new B(function(n){return null==n},"is not void"),undefined:new B(function(n){return void 0===n},"is not undefined"),null:new B(function(n){return null===n},"is not null"),never:new B(function(n){return!1},"is unexpected"),Date:new B(I("[object Date]"),"is not a Date"),RegExp:new B(I("[object RegExp]"),"is not a RegExp")};var P=Object.prototype.toString;function I(n){return function(t){return"object"==typeof t&&t&&P.call(t)===n}}void 0!==n&&(exports.basicTypes.Buffer=new B(function(t){return n.isBuffer(t)},"is not a Buffer"));for(var L=function(n){exports.basicTypes[n.name]=new B(function(t){return t instanceof n},"is not a "+n.name)},R=0,D=[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,ArrayBuffer];R<D.length;R++){var F=D[R];L(F)}
},{"./util":"EqZa","buffer":"dskh"}],"DGEr":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var t=require("./types"),e=require("./util"),r=require("./types");function o(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];for(var o=Object.assign.apply(Object,[{},t.basicTypes].concat(e)),i={},p=0,s=e;p<s.length;p++)for(var a=s[p],c=0,u=Object.keys(a);c<u.length;c++){var h=u[c];i[h]=new n(o,a[h])}return i}exports.TArray=r.TArray,exports.TEnumType=r.TEnumType,exports.TEnumLiteral=r.TEnumLiteral,exports.TFunc=r.TFunc,exports.TIface=r.TIface,exports.TLiteral=r.TLiteral,exports.TName=r.TName,exports.TOptional=r.TOptional,exports.TParam=r.TParam,exports.TParamList=r.TParamList,exports.TProp=r.TProp,exports.TTuple=r.TTuple,exports.TType=r.TType,exports.TUnion=r.TUnion,exports.TIntersection=r.TIntersection,exports.array=r.array,exports.enumlit=r.enumlit,exports.enumtype=r.enumtype,exports.func=r.func,exports.iface=r.iface,exports.lit=r.lit,exports.name=r.name,exports.opt=r.opt,exports.param=r.param,exports.tuple=r.tuple,exports.union=r.union,exports.intersection=r.intersection,exports.BasicType=r.BasicType,exports.createCheckers=o;var n=function(){function r(e,r,o){if(void 0===o&&(o="value"),this.suite=e,this.ttype=r,this._path=o,this.props=new Map,r instanceof t.TIface)for(var n=0,i=r.props;n<i.length;n++){var p=i[n];this.props.set(p.name,p.ttype)}this.checkerPlain=this.ttype.getChecker(e,!1),this.checkerStrict=this.ttype.getChecker(e,!0)}return r.prototype.setReportedPath=function(t){this._path=t},r.prototype.check=function(t){return this._doCheck(this.checkerPlain,t)},r.prototype.test=function(t){return this.checkerPlain(t,new e.NoopContext)},r.prototype.validate=function(t){return this._doValidate(this.checkerPlain,t)},r.prototype.strictCheck=function(t){return this._doCheck(this.checkerStrict,t)},r.prototype.strictTest=function(t){return this.checkerStrict(t,new e.NoopContext)},r.prototype.strictValidate=function(t){return this._doValidate(this.checkerStrict,t)},r.prototype.getProp=function(t){var e=this.props.get(t);if(!e)throw new Error("Type has no property "+t);return new r(this.suite,e,this._path+"."+t)},r.prototype.methodArgs=function(t){var e=this._getMethod(t);return new r(this.suite,e.paramList)},r.prototype.methodResult=function(t){var e=this._getMethod(t);return new r(this.suite,e.result)},r.prototype.getArgs=function(){if(!(this.ttype instanceof t.TFunc))throw new Error("getArgs() applied to non-function");return new r(this.suite,this.ttype.paramList)},r.prototype.getResult=function(){if(!(this.ttype instanceof t.TFunc))throw new Error("getResult() applied to non-function");return new r(this.suite,this.ttype.result)},r.prototype.getType=function(){return this.ttype},r.prototype._doCheck=function(t,r){if(!t(r,new e.NoopContext)){var o=new e.DetailContext;throw t(r,o),o.getError(this._path)}},r.prototype._doValidate=function(t,r){if(t(r,new e.NoopContext))return null;var o=new e.DetailContext;return t(r,o),o.getErrorDetail(this._path)},r.prototype._getMethod=function(e){var r=this.props.get(e);if(!r)throw new Error("Type has no property "+e);if(!(r instanceof t.TFunc))throw new Error("Property "+e+" is not a method");return r},r}();exports.Checker=n;
},{"./types":"zOaa","./util":"EqZa"}],"Lq1w":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=exports.Options=exports.SourceMapOptions=exports.Transform=void 0;var e=o(require("ts-interface-checker"));function o(e){return e&&e.__esModule?e:{default:e}}var t=e.union(e.lit("jsx"),e.lit("typescript"),e.lit("flow"),e.lit("imports"),e.lit("react-hot-loader"));exports.Transform=t;var r=e.iface([],{compiledFilename:"string"});exports.SourceMapOptions=r;var a=e.iface([],{transforms:e.array("Transform"),jsxPragma:e.opt("string"),jsxFragmentPragma:e.opt("string"),enableLegacyTypeScriptModuleInterop:e.opt("boolean"),enableLegacyBabel5ModuleInterop:e.opt("boolean"),sourceMapOptions:e.opt("SourceMapOptions"),filePath:e.opt("string"),production:e.opt("boolean")});exports.Options=a;var p={Transform:t,SourceMapOptions:r,Options:a},s=p;exports.default=s;
},{"ts-interface-checker":"DGEr"}],"QEqm":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.validateOptions=c;var e=require("ts-interface-checker"),t=r(require("./Options-gen-types"));function r(e){return e&&e.__esModule?e:{default:e}}var s=(0,e.createCheckers)(t.default),i=s.Options;function c(e){i.strictCheck(e)}
},{"ts-interface-checker":"DGEr","./Options-gen-types":"Lq1w"}],"yj5C":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.parseSpread=p,exports.parseRest=l,exports.parseBindingIdentifier=d,exports.parseImportedIdentifier=c,exports.markPriorBindingIdentifier=k,exports.parseBindingAtom=f,exports.parseBindingList=u,exports.parseMaybeDefault=x;var e=require("../plugins/flow"),t=require("../plugins/typescript"),n=require("../tokenizer/index"),s=require("../tokenizer/keywords"),i=require("../tokenizer/types"),o=require("./base"),r=require("./expression"),a=require("./util");function p(){(0,n.next)(),(0,r.parseMaybeAssign)(!1)}function l(e){(0,n.next)(),f(e)}function d(e){(0,r.parseIdentifier)(),k(e)}function c(){(0,r.parseIdentifier)(),o.state.tokens[o.state.tokens.length-1].identifierRole=n.IdentifierRole.ImportDeclaration}function k(e){0===o.state.scopeDepth?o.state.tokens[o.state.tokens.length-1].identifierRole=n.IdentifierRole.TopLevelDeclaration:o.state.tokens[o.state.tokens.length-1].identifierRole=e?n.IdentifierRole.BlockScopedDeclaration:n.IdentifierRole.FunctionScopedDeclaration}function f(e){switch(o.state.type){case i.TokenType._this:var t=(0,n.pushTypeContext)(0);return(0,n.next)(),void(0,n.popTypeContext)(t);case i.TokenType._yield:case i.TokenType.name:return o.state.type=i.TokenType.name,void d(e);case i.TokenType.bracketL:return(0,n.next)(),void u(i.TokenType.bracketR,e,!0);case i.TokenType.braceL:return void(0,r.parseObj)(!0,e);default:(0,a.unexpected)()}}function u(e,t){for(var s=arguments.length>2&&void 0!==arguments[2]&&arguments[2],r=arguments.length>3&&void 0!==arguments[3]&&arguments[3],p=arguments.length>4&&void 0!==arguments[4]?arguments[4]:0,d=!0,c=!1,k=o.state.tokens.length;!(0,n.eat)(e)&&!o.state.error;)if(d?d=!1:((0,a.expect)(i.TokenType.comma),o.state.tokens[o.state.tokens.length-1].contextId=p,!c&&o.state.tokens[k].isType&&(o.state.tokens[o.state.tokens.length-1].isType=!0,c=!0)),s&&(0,n.match)(i.TokenType.comma));else{if((0,n.eat)(e))break;if((0,n.match)(i.TokenType.ellipsis)){l(t),y(),(0,n.eat)(i.TokenType.comma),(0,a.expect)(e);break}T(r,t)}}function T(e,n){e&&((0,t.tsParseAccessModifier)(),(0,t.tsParseModifier)([s.ContextualKeyword._readonly])),x(n),y(),x(n,!0)}function y(){o.isFlowEnabled?(0,e.flowParseAssignableListItemTypes)():o.isTypeScriptEnabled&&(0,t.tsParseAssignableListItemTypes)()}function x(e){if(arguments.length>1&&void 0!==arguments[1]&&arguments[1]||f(e),(0,n.eat)(i.TokenType.eq)){var t=o.state.tokens.length-1;(0,r.parseMaybeAssign)(),o.state.tokens[t].rhsEndIndex=o.state.tokens.length}}
},{"../plugins/flow":"nAYr","../plugins/typescript":"PJ8T","../tokenizer/index":"zEJU","../tokenizer/keywords":"GGTW","../tokenizer/types":"sS1T","./base":"WaVM","./expression":"dXGT","./util":"Z5xF"}],"PJ8T":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.tsParseModifier=u,exports.tsTryParseTypeParameters=C,exports.tsTryParseTypeAnnotation=Z,exports.tsParseTypeAnnotation=te,exports.tsParseType=ne,exports.tsParseNonConditionalType=oe,exports.tsParseTypeAssertion=ae,exports.tsTryParseJSXTypeArgument=re,exports.tsParseImportEqualsDeclaration=le,exports.tsIsDeclarationStart=Ke,exports.tsParseFunctionBodyAndFinish=Pe,exports.tsParseSubscript=Le,exports.tsStartParseNewArguments=Se,exports.tsTryParseExport=Ae,exports.tsTryParseExportDefaultExpression=qe,exports.tsTryParseStatementContent=Ie,exports.tsParseAccessModifier=Fe,exports.tsTryParseClassMemberWithIsStatic=Re,exports.tsParseIdentifierStatement=Me,exports.tsParseExportDeclaration=Be,exports.tsAfterParseClassSuper=De,exports.tsStartParseObjPropValue=Ee,exports.tsStartParseFunctionParams=Ne,exports.tsAfterParseVarHead=Oe,exports.tsStartParseAsyncArrowFromCallExpression=Je,exports.tsParseMaybeAssign=Xe,exports.tsParseMaybeAssignWithJSX=je,exports.tsParseMaybeAssignWithoutJSX=We,exports.tsParseArrow=ze,exports.tsParseAssignableListItemTypes=Ve,exports.tsParseMaybeDecoratorArguments=Qe;var e,t=require("../tokenizer/index"),n=require("../tokenizer/keywords"),o=require("../tokenizer/types"),a=require("../traverser/base"),r=require("../traverser/expression"),s=require("../traverser/lval"),p=require("../traverser/statement"),T=require("../traverser/util"),y=require("./jsx");function c(){return(0,t.match)(o.TokenType.name)}function i(){var e=a.state.snapshot();return(0,t.next)(),!!!((0,T.hasPrecedingLineBreak)()||(0,t.match)(o.TokenType.parenL)||(0,t.match)(o.TokenType.parenR)||(0,t.match)(o.TokenType.colon)||(0,t.match)(o.TokenType.eq)||(0,t.match)(o.TokenType.question)||(0,t.match)(o.TokenType.bang))||(a.state.restoreFromSnapshot(e),!1)}function u(e){if(!(0,t.match)(o.TokenType.name))return null;var r=a.state.contextualKeyword;if(-1!==e.indexOf(r)&&i()){switch(r){case n.ContextualKeyword._readonly:a.state.tokens[a.state.tokens.length-1].type=o.TokenType._readonly;break;case n.ContextualKeyword._abstract:a.state.tokens[a.state.tokens.length-1].type=o.TokenType._abstract;break;case n.ContextualKeyword._static:a.state.tokens[a.state.tokens.length-1].type=o.TokenType._static;break;case n.ContextualKeyword._public:a.state.tokens[a.state.tokens.length-1].type=o.TokenType._public;break;case n.ContextualKeyword._private:a.state.tokens[a.state.tokens.length-1].type=o.TokenType._private;break;case n.ContextualKeyword._protected:a.state.tokens[a.state.tokens.length-1].type=o.TokenType._protected;break;case n.ContextualKeyword._declare:a.state.tokens[a.state.tokens.length-1].type=o.TokenType._declare}return r}return null}function k(){for((0,r.parseIdentifier)();(0,t.eat)(o.TokenType.dot);)(0,r.parseIdentifier)()}function x(){k(),!(0,T.hasPrecedingLineBreak)()&&(0,t.match)(o.TokenType.lessThan)&&ge()}function l(){(0,t.next)(),te()}function h(){(0,t.next)()}function m(){(0,T.expect)(o.TokenType._typeof),(0,t.match)(o.TokenType._import)?f():k()}function f(){(0,T.expect)(o.TokenType._import),(0,T.expect)(o.TokenType.parenL),(0,T.expect)(o.TokenType.string),(0,T.expect)(o.TokenType.parenR),(0,t.eat)(o.TokenType.dot)&&k(),(0,t.match)(o.TokenType.lessThan)&&ge()}function d(){(0,r.parseIdentifier)(),(0,t.eat)(o.TokenType._extends)&&ne(),(0,t.eat)(o.TokenType.eq)&&ne()}function C(){(0,t.match)(o.TokenType.lessThan)&&_()}function _(){var e=(0,t.pushTypeContext)(0);for((0,t.match)(o.TokenType.lessThan)||(0,t.match)(o.TokenType.typeParameterStart)?(0,t.next)():(0,T.unexpected)();!(0,t.eat)(o.TokenType.greaterThan)&&!a.state.error;)d(),(0,t.eat)(o.TokenType.comma);(0,t.popTypeContext)(e)}function b(e){var n=e===o.TokenType.arrow;C(),(0,T.expect)(o.TokenType.parenL),a.state.scopeDepth++,w(!1),a.state.scopeDepth--,n?Y(e):(0,t.match)(e)&&Y(e)}function w(e){(0,s.parseBindingList)(o.TokenType.parenR,e)}function v(){(0,t.eat)(o.TokenType.comma)||(0,T.semicolon)()}function g(){b(o.TokenType.colon),v()}function K(){var e=a.state.snapshot();(0,t.next)();var n=(0,t.eat)(o.TokenType.name)&&(0,t.match)(o.TokenType.colon);return a.state.restoreFromSnapshot(e),n}function P(){if(!(0,t.match)(o.TokenType.bracketL)||!K())return!1;var e=(0,t.pushTypeContext)(0);return(0,T.expect)(o.TokenType.bracketL),(0,r.parseIdentifier)(),te(),(0,T.expect)(o.TokenType.bracketR),Z(),v(),(0,t.popTypeContext)(e),!0}function L(e){(0,t.eat)(o.TokenType.question),e||!(0,t.match)(o.TokenType.parenL)&&!(0,t.match)(o.TokenType.lessThan)?(Z(),v()):(b(o.TokenType.colon),v())}function S(){if((0,t.match)(o.TokenType.parenL)||(0,t.match)(o.TokenType.lessThan))g();else{if((0,t.match)(o.TokenType._new))return(0,t.next)(),void((0,t.match)(o.TokenType.parenL)||(0,t.match)(o.TokenType.lessThan)?g():L(!1));var e=!!u([n.ContextualKeyword._readonly]);P()||((0,r.parsePropertyName)(-1),L(e))}}function A(){q()}function q(){for((0,T.expect)(o.TokenType.braceL);!(0,t.eat)(o.TokenType.braceR)&&!a.state.error;)S()}function I(){var e=a.state.snapshot(),t=F();return a.state.restoreFromSnapshot(e),t}function F(){return(0,t.next)(),(0,t.eat)(o.TokenType.plus)||(0,t.eat)(o.TokenType.minus)?(0,T.isContextual)(n.ContextualKeyword._readonly):((0,T.isContextual)(n.ContextualKeyword._readonly)&&(0,t.next)(),!!(0,t.match)(o.TokenType.bracketL)&&((0,t.next)(),!!c()&&((0,t.next)(),(0,t.match)(o.TokenType._in))))}function R(){(0,r.parseIdentifier)(),(0,T.expect)(o.TokenType._in),ne()}function M(){(0,T.expect)(o.TokenType.braceL),(0,t.match)(o.TokenType.plus)||(0,t.match)(o.TokenType.minus)?((0,t.next)(),(0,T.expectContextual)(n.ContextualKeyword._readonly)):(0,T.eatContextual)(n.ContextualKeyword._readonly),(0,T.expect)(o.TokenType.bracketL),R(),(0,T.expect)(o.TokenType.bracketR),(0,t.match)(o.TokenType.plus)||(0,t.match)(o.TokenType.minus)?((0,t.next)(),(0,T.expect)(o.TokenType.question)):(0,t.eat)(o.TokenType.question),$(),(0,T.semicolon)(),(0,T.expect)(o.TokenType.braceR)}function B(){for((0,T.expect)(o.TokenType.bracketL);!(0,t.eat)(o.TokenType.bracketR)&&!a.state.error;)D(),(0,t.eat)(o.TokenType.comma)}function D(){(0,t.eat)(o.TokenType.ellipsis)?ne():(ne(),(0,t.eat)(o.TokenType.question))}function E(){(0,T.expect)(o.TokenType.parenL),ne(),(0,T.expect)(o.TokenType.parenR)}function N(t){t===e.TSConstructorType&&(0,T.expect)(o.TokenType._new),b(o.TokenType.arrow)}function O(){switch(a.state.type){case o.TokenType.name:return void x();case o.TokenType._void:case o.TokenType._null:return void(0,t.next)();case o.TokenType.string:case o.TokenType.num:case o.TokenType._true:case o.TokenType._false:return void(0,r.parseLiteral)();case o.TokenType.minus:return(0,t.next)(),void(0,r.parseLiteral)();case o.TokenType._this:return h(),void((0,T.isContextual)(n.ContextualKeyword._is)&&!(0,T.hasPrecedingLineBreak)()&&l());case o.TokenType._typeof:return void m();case o.TokenType._import:return void f();case o.TokenType.braceL:return void(I()?M():A());case o.TokenType.bracketL:return void B();case o.TokenType.parenL:return void E();case o.TokenType.backQuote:return void(0,r.parseTemplate)();default:if(a.state.type&o.TokenType.IS_KEYWORD)return(0,t.next)(),void(a.state.tokens[a.state.tokens.length-1].type=o.TokenType.name)}(0,T.unexpected)()}function J(){for(O();!(0,T.hasPrecedingLineBreak)()&&(0,t.eat)(o.TokenType.bracketL);)(0,t.eat)(o.TokenType.bracketR)||(ne(),(0,T.expect)(o.TokenType.bracketR))}function X(){(0,T.expectContextual)(n.ContextualKeyword._infer),(0,r.parseIdentifier)()}function j(){(0,T.isContextual)(n.ContextualKeyword._keyof)||(0,T.isContextual)(n.ContextualKeyword._unique)||(0,T.isContextual)(n.ContextualKeyword._readonly)?((0,t.next)(),j()):(0,T.isContextual)(n.ContextualKeyword._infer)?X():J()}function W(){if((0,t.eat)(o.TokenType.bitwiseAND),j(),(0,t.match)(o.TokenType.bitwiseAND))for(;(0,t.eat)(o.TokenType.bitwiseAND);)j()}function z(){if((0,t.eat)(o.TokenType.bitwiseOR),W(),(0,t.match)(o.TokenType.bitwiseOR))for(;(0,t.eat)(o.TokenType.bitwiseOR);)W()}function V(){return!!(0,t.match)(o.TokenType.lessThan)||(0,t.match)(o.TokenType.parenL)&&H()}function Q(){if((0,t.match)(o.TokenType.name)||(0,t.match)(o.TokenType._this))return(0,t.next)(),!0;if((0,t.match)(o.TokenType.braceL)||(0,t.match)(o.TokenType.bracketL)){var e=1;for((0,t.next)();e>0&&!a.state.error;)(0,t.match)(o.TokenType.braceL)||(0,t.match)(o.TokenType.bracketL)?e++:((0,t.match)(o.TokenType.braceR)||(0,t.match)(o.TokenType.bracketR))&&e--,(0,t.next)();return!0}return!1}function H(){var e=a.state.snapshot(),t=U();return a.state.restoreFromSnapshot(e),t}function U(){if((0,t.next)(),(0,t.match)(o.TokenType.parenR)||(0,t.match)(o.TokenType.ellipsis))return!0;if(Q()){if((0,t.match)(o.TokenType.colon)||(0,t.match)(o.TokenType.comma)||(0,t.match)(o.TokenType.question)||(0,t.match)(o.TokenType.eq))return!0;if((0,t.match)(o.TokenType.parenR)&&((0,t.next)(),(0,t.match)(o.TokenType.arrow)))return!0}return!1}function Y(e){var n=(0,t.pushTypeContext)(0);(0,T.expect)(e),ee()||ne(),(0,t.popTypeContext)(n)}function G(){(0,t.match)(o.TokenType.colon)&&Y(o.TokenType.colon)}function Z(){(0,t.match)(o.TokenType.colon)&&te()}function $(){(0,t.eat)(o.TokenType.colon)&&ne()}function ee(){var e=a.state.snapshot();return(0,T.isContextual)(n.ContextualKeyword._asserts)&&!(0,T.hasPrecedingLineBreak)()?((0,t.next)(),(0,T.eatContextual)(n.ContextualKeyword._is)?(ne(),!0):c()||(0,t.match)(o.TokenType._this)?((0,t.next)(),(0,T.eatContextual)(n.ContextualKeyword._is)&&ne(),!0):(a.state.restoreFromSnapshot(e),!1)):!(!c()&&!(0,t.match)(o.TokenType._this))&&((0,t.next)(),(0,T.isContextual)(n.ContextualKeyword._is)&&!(0,T.hasPrecedingLineBreak)()?((0,t.next)(),ne(),!0):(a.state.restoreFromSnapshot(e),!1))}function te(){var e=(0,t.pushTypeContext)(0);(0,T.expect)(o.TokenType.colon),ne(),(0,t.popTypeContext)(e)}function ne(){oe(),!(0,T.hasPrecedingLineBreak)()&&(0,t.eat)(o.TokenType._extends)&&(oe(),(0,T.expect)(o.TokenType.question),ne(),(0,T.expect)(o.TokenType.colon),ne())}function oe(){V()?N(e.TSFunctionType):(0,t.match)(o.TokenType._new)?N(e.TSConstructorType):z()}function ae(){var e=(0,t.pushTypeContext)(1);ne(),(0,T.expect)(o.TokenType.greaterThan),(0,t.popTypeContext)(e),(0,r.parseMaybeUnary)()}function re(){if((0,t.eat)(o.TokenType.jsxTagStart)){a.state.tokens[a.state.tokens.length-1].type=o.TokenType.typeParameterStart;for(var e=(0,t.pushTypeContext)(1);!(0,t.match)(o.TokenType.greaterThan)&&!a.state.error;)ne(),(0,t.eat)(o.TokenType.comma);(0,y.nextJSXTagToken)(),(0,t.popTypeContext)(e)}}function se(){for(;!(0,t.match)(o.TokenType.braceL)&&!a.state.error;)pe(),(0,t.eat)(o.TokenType.comma)}function pe(){k(),(0,t.match)(o.TokenType.lessThan)&&ge()}function Te(){(0,s.parseBindingIdentifier)(!1),C(),(0,t.eat)(o.TokenType._extends)&&se(),q()}function ye(){(0,s.parseBindingIdentifier)(!1),C(),(0,T.expect)(o.TokenType.eq),ne(),(0,T.semicolon)()}function ce(){if((0,t.match)(o.TokenType.string)?(0,r.parseLiteral)():(0,r.parseIdentifier)(),(0,t.eat)(o.TokenType.eq)){var e=a.state.tokens.length-1;(0,r.parseMaybeAssign)(),a.state.tokens[e].rhsEndIndex=a.state.tokens.length}}function ie(){for((0,s.parseBindingIdentifier)(!1),(0,T.expect)(o.TokenType.braceL);!(0,t.eat)(o.TokenType.braceR)&&!a.state.error;)ce(),(0,t.eat)(o.TokenType.comma)}function ue(){(0,T.expect)(o.TokenType.braceL),(0,p.parseBlockBody)(o.TokenType.braceR)}function ke(){(0,s.parseBindingIdentifier)(!1),(0,t.eat)(o.TokenType.dot)?ke():ue()}function xe(){(0,T.isContextual)(n.ContextualKeyword._global)?(0,r.parseIdentifier)():(0,t.match)(o.TokenType.string)?(0,r.parseExprAtom)():(0,T.unexpected)(),(0,t.match)(o.TokenType.braceL)?ue():(0,T.semicolon)()}function le(){(0,s.parseImportedIdentifier)(),(0,T.expect)(o.TokenType.eq),me(),(0,T.semicolon)()}function he(){return(0,T.isContextual)(n.ContextualKeyword._require)&&(0,t.lookaheadType)()===o.TokenType.parenL}function me(){he()?fe():k()}function fe(){(0,T.expectContextual)(n.ContextualKeyword._require),(0,T.expect)(o.TokenType.parenL),(0,t.match)(o.TokenType.string)||(0,T.unexpected)(),(0,r.parseLiteral)(),(0,T.expect)(o.TokenType.parenR)}function de(){if((0,T.isLineTerminator)())return!1;switch(a.state.type){case o.TokenType._function:var e=(0,t.pushTypeContext)(1);(0,t.next)();var r=a.state.start;return(0,p.parseFunction)(r,!0),(0,t.popTypeContext)(e),!0;case o.TokenType._class:var s=(0,t.pushTypeContext)(1);return(0,p.parseClass)(!0,!1),(0,t.popTypeContext)(s),!0;case o.TokenType._const:if((0,t.match)(o.TokenType._const)&&(0,T.isLookaheadContextual)(n.ContextualKeyword._enum)){var y=(0,t.pushTypeContext)(1);return(0,T.expect)(o.TokenType._const),(0,T.expectContextual)(n.ContextualKeyword._enum),a.state.tokens[a.state.tokens.length-1].type=o.TokenType._enum,ie(),(0,t.popTypeContext)(y),!0}case o.TokenType._var:case o.TokenType._let:var c=(0,t.pushTypeContext)(1);return(0,p.parseVarStatement)(a.state.type),(0,t.popTypeContext)(c),!0;case o.TokenType.name:var i=(0,t.pushTypeContext)(1),u=a.state.contextualKeyword,k=!1;return u===n.ContextualKeyword._global?(xe(),k=!0):k=be(u,!0),(0,t.popTypeContext)(i),k;default:return!1}}function Ce(){return be(a.state.contextualKeyword,!0)}function _e(e){switch(e){case n.ContextualKeyword._declare:var r=a.state.tokens.length-1;if(de())return a.state.tokens[r].type=o.TokenType._declare,!0;break;case n.ContextualKeyword._global:if((0,t.match)(o.TokenType.braceL))return ue(),!0;break;default:return be(e,!1)}return!1}function be(e,r){switch(e){case n.ContextualKeyword._abstract:if(we(o.TokenType._class,r))return r&&(0,t.next)(),a.state.tokens[a.state.tokens.length-1].type=o.TokenType._abstract,(0,p.parseClass)(!0,!1),!0;break;case n.ContextualKeyword._enum:if(we(o.TokenType.name,r))return r&&(0,t.next)(),a.state.tokens[a.state.tokens.length-1].type=o.TokenType._enum,ie(),!0;break;case n.ContextualKeyword._interface:if(we(o.TokenType.name,r)){var s=(0,t.pushTypeContext)(1);return r&&(0,t.next)(),Te(),(0,t.popTypeContext)(s),!0}break;case n.ContextualKeyword._module:if(r&&(0,t.next)(),(0,t.match)(o.TokenType.string)){var T=(0,t.pushTypeContext)(r?2:1);return xe(),(0,t.popTypeContext)(T),!0}if(we(o.TokenType.name,r)){var y=(0,t.pushTypeContext)(r?2:1);return r&&(0,t.next)(),ke(),(0,t.popTypeContext)(y),!0}break;case n.ContextualKeyword._namespace:if(we(o.TokenType.name,r)){var c=(0,t.pushTypeContext)(1);return r&&(0,t.next)(),ke(),(0,t.popTypeContext)(c),!0}break;case n.ContextualKeyword._type:if(we(o.TokenType.name,r)){var i=(0,t.pushTypeContext)(1);return r&&(0,t.next)(),ye(),(0,t.popTypeContext)(i),!0}}return!1}function we(e,n){return!(0,T.isLineTerminator)()&&(n||(0,t.match)(e))}function ve(){var e=a.state.snapshot();return _(),(0,p.parseFunctionParams)(),G(),(0,T.expect)(o.TokenType.arrow),a.state.error?(a.state.restoreFromSnapshot(e),!1):((0,r.parseFunctionBody)(!0),!0)}function ge(){var e=(0,t.pushTypeContext)(0);for((0,T.expect)(o.TokenType.lessThan);!(0,t.eat)(o.TokenType.greaterThan)&&!a.state.error;)ne(),(0,t.eat)(o.TokenType.comma);(0,t.popTypeContext)(e)}function Ke(){if((0,t.match)(o.TokenType.name))switch(a.state.contextualKeyword){case n.ContextualKeyword._abstract:case n.ContextualKeyword._declare:case n.ContextualKeyword._enum:case n.ContextualKeyword._interface:case n.ContextualKeyword._module:case n.ContextualKeyword._namespace:case n.ContextualKeyword._type:return!0}return!1}function Pe(e,n){if((0,t.match)(o.TokenType.colon)&&Y(o.TokenType.colon),(0,t.match)(o.TokenType.braceL)||!(0,T.isLineTerminator)())(0,r.parseFunctionBody)(!1,n);else for(var s=a.state.tokens.length-1;s>=0&&(a.state.tokens[s].start>=e||a.state.tokens[s].type===o.TokenType._default||a.state.tokens[s].type===o.TokenType._export);)a.state.tokens[s].isType=!0,s--}function Le(e,n,s){if((0,T.hasPrecedingLineBreak)()||!(0,t.eat)(o.TokenType.bang)){if((0,t.match)(o.TokenType.lessThan)){var p=a.state.snapshot();if(!n&&(0,r.atPossibleAsync)())if(ve())return;if(ge(),!n&&(0,t.eat)(o.TokenType.parenL)?(a.state.tokens[a.state.tokens.length-1].subscriptStartIndex=e,(0,r.parseCallExpressionArguments)()):(0,t.match)(o.TokenType.backQuote)?(0,r.parseTemplate)():(0,T.unexpected)(),!a.state.error)return;a.state.restoreFromSnapshot(p)}else!n&&(0,t.match)(o.TokenType.questionDot)&&(0,t.lookaheadType)()===o.TokenType.lessThan&&((0,t.next)(),a.state.tokens[e].isOptionalChainStart=!0,a.state.tokens[a.state.tokens.length-1].subscriptStartIndex=e,ge(),(0,T.expect)(o.TokenType.parenL),(0,r.parseCallExpressionArguments)());(0,r.baseParseSubscript)(e,n,s)}else a.state.tokens[a.state.tokens.length-1].type=o.TokenType.nonNullAssertion}function Se(){if((0,t.match)(o.TokenType.lessThan)){var e=a.state.snapshot();a.state.type=o.TokenType.typeParameterStart,ge(),(0,t.match)(o.TokenType.parenL)||(0,T.unexpected)(),a.state.error&&a.state.restoreFromSnapshot(e)}}function Ae(){return(0,t.match)(o.TokenType._import)?((0,T.expect)(o.TokenType._import),le(),!0):(0,t.eat)(o.TokenType.eq)?((0,r.parseExpression)(),(0,T.semicolon)(),!0):(0,T.eatContextual)(n.ContextualKeyword._as)?((0,T.expectContextual)(n.ContextualKeyword._namespace),(0,r.parseIdentifier)(),(0,T.semicolon)(),!0):((0,T.isContextual)(n.ContextualKeyword._type)&&(0,t.lookaheadType)()===o.TokenType.braceL&&(0,t.next)(),!1)}function qe(){if((0,T.isContextual)(n.ContextualKeyword._abstract)&&(0,t.lookaheadType)()===o.TokenType._class)return a.state.type=o.TokenType._abstract,(0,t.next)(),(0,p.parseClass)(!0,!0),!0;if((0,T.isContextual)(n.ContextualKeyword._interface)){var e=(0,t.pushTypeContext)(2);return be(n.ContextualKeyword._interface,!0),(0,t.popTypeContext)(e),!0}return!1}function Ie(){if(a.state.type===o.TokenType._const){var e=(0,t.lookaheadTypeAndKeyword)();if(e.type===o.TokenType.name&&e.contextualKeyword===n.ContextualKeyword._enum)return(0,T.expect)(o.TokenType._const),(0,T.expectContextual)(n.ContextualKeyword._enum),a.state.tokens[a.state.tokens.length-1].type=o.TokenType._enum,ie(),!0}return!1}function Fe(){u([n.ContextualKeyword._public,n.ContextualKeyword._protected,n.ContextualKeyword._private])}function Re(e,t){for(var o=!1,a=!1;;){var r=u([n.ContextualKeyword._abstract,n.ContextualKeyword._readonly,n.ContextualKeyword._declare]);if(null==r)break;r===n.ContextualKeyword._readonly&&(a=!0),r===n.ContextualKeyword._abstract&&(o=!0)}if(!o&&!e&&P())return!0;return!!a&&((0,p.parseClassPropertyName)(t),(0,p.parsePostMemberNameModifiers)(),(0,p.parseClassProperty)(),!0)}function Me(e){_e(e)||(0,T.semicolon)()}function Be(){var e=(0,T.eatContextual)(n.ContextualKeyword._declare);e&&(a.state.tokens[a.state.tokens.length-1].type=o.TokenType._declare);var r=!1;if((0,t.match)(o.TokenType.name))if(e){var s=(0,t.pushTypeContext)(2);r=Ce(),(0,t.popTypeContext)(s)}else r=Ce();if(!r)if(e){var y=(0,t.pushTypeContext)(2);(0,p.parseStatement)(!0),(0,t.popTypeContext)(y)}else(0,p.parseStatement)(!0)}function De(e){if(e&&(0,t.match)(o.TokenType.lessThan)&&ge(),(0,T.eatContextual)(n.ContextualKeyword._implements)){a.state.tokens[a.state.tokens.length-1].type=o.TokenType._implements;var r=(0,t.pushTypeContext)(1);se(),(0,t.popTypeContext)(r)}}function Ee(){C()}function Ne(){C()}function Oe(){var e=(0,t.pushTypeContext)(0);(0,t.eat)(o.TokenType.bang),Z(),(0,t.popTypeContext)(e)}function Je(){(0,t.match)(o.TokenType.colon)&&te()}function Xe(e,t){return a.isJSXEnabled?je(e,t):We(e,t)}function je(e,n){if(!(0,t.match)(o.TokenType.lessThan))return(0,r.baseParseMaybeAssign)(e,n);var s=a.state.snapshot(),p=(0,r.baseParseMaybeAssign)(e,n);return a.state.error?(a.state.restoreFromSnapshot(s),a.state.type=o.TokenType.typeParameterStart,_(),(p=(0,r.baseParseMaybeAssign)(e,n))||(0,T.unexpected)(),p):p}function We(e,n){if(!(0,t.match)(o.TokenType.lessThan))return(0,r.baseParseMaybeAssign)(e,n);var s=a.state.snapshot();_();var p=(0,r.baseParseMaybeAssign)(e,n);return p||(0,T.unexpected)(),a.state.error?(a.state.restoreFromSnapshot(s),(0,r.baseParseMaybeAssign)(e,n)):p}function ze(){if((0,t.match)(o.TokenType.colon)){var e=a.state.snapshot();Y(o.TokenType.colon),(0,T.canInsertSemicolon)()&&(0,T.unexpected)(),(0,t.match)(o.TokenType.arrow)||(0,T.unexpected)(),a.state.error&&a.state.restoreFromSnapshot(e)}return(0,t.eat)(o.TokenType.arrow)}function Ve(){var e=(0,t.pushTypeContext)(0);(0,t.eat)(o.TokenType.question),Z(),(0,t.popTypeContext)(e)}function Qe(){(0,t.match)(o.TokenType.lessThan)&&ge(),(0,p.baseParseMaybeDecoratorArguments)()}!function(e){e[e.TSFunctionType=0]="TSFunctionType";e[e.TSConstructorType=1]="TSConstructorType"}(e||(e={}));
},{"../tokenizer/index":"zEJU","../tokenizer/keywords":"GGTW","../tokenizer/types":"sS1T","../traverser/base":"WaVM","../traverser/expression":"dXGT","../traverser/lval":"yj5C","../traverser/statement":"JoXu","../traverser/util":"Z5xF","./jsx":"hvzv"}],"hvzv":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.jsxParseElement=g,exports.nextJSXTagToken=m;var e=require("../../tokenizer/index"),t=require("../../tokenizer/types"),n=require("../../traverser/base"),s=require("../../traverser/expression"),o=require("../../traverser/util"),a=require("../../util/charcodes"),r=require("../../util/identifier"),i=require("../typescript");function T(){for(;;){if(n.state.pos>=n.input.length)return void(0,o.unexpected)("Unterminated JSX contents");var s=n.input.charCodeAt(n.state.pos);switch(s){case a.charCodes.lessThan:case a.charCodes.leftCurlyBrace:return n.state.pos===n.state.start?s===a.charCodes.lessThan?(n.state.pos++,void(0,e.finishToken)(t.TokenType.jsxTagStart)):void(0,e.getTokenFromCode)(s):void(0,e.finishToken)(t.TokenType.jsxText);default:n.state.pos++}}}function c(s){for(n.state.pos++;;){if(n.state.pos>=n.input.length)return void(0,o.unexpected)("Unterminated string constant");if(n.input.charCodeAt(n.state.pos)===s){n.state.pos++;break}n.state.pos++}(0,e.finishToken)(t.TokenType.string)}function p(){var s;do{if(n.state.pos>n.input.length)return void(0,o.unexpected)("Unexpectedly reached the end of input.");s=n.input.charCodeAt(++n.state.pos)}while(r.IS_IDENTIFIER_CHAR[s]||s===a.charCodes.dash);(0,e.finishToken)(t.TokenType.jsxName)}function u(){m()}function d(s){u(),(0,e.eat)(t.TokenType.colon)?u():n.state.tokens[n.state.tokens.length-1].identifierRole=s}function h(){for(d(e.IdentifierRole.Access);(0,e.match)(t.TokenType.dot);)m(),u()}function k(){switch(n.state.type){case t.TokenType.braceL:return(0,e.next)(),y(),void m();case t.TokenType.jsxTagStart:return g(),void m();case t.TokenType.string:return void m();default:(0,o.unexpected)("JSX value should be either an expression or a quoted JSX text")}}function f(){}function l(){(0,o.expect)(t.TokenType.ellipsis),(0,s.parseExpression)()}function y(){(0,e.match)(t.TokenType.braceR)?f():(0,s.parseExpression)()}function x(){if((0,e.eat)(t.TokenType.braceL))return(0,o.expect)(t.TokenType.ellipsis),(0,s.parseMaybeAssign)(),void m();d(e.IdentifierRole.ObjectKey),(0,e.match)(t.TokenType.eq)&&(m(),k())}function b(){if((0,e.match)(t.TokenType.jsxTagEnd))return!1;for(h(),n.isTypeScriptEnabled&&(0,i.tsTryParseJSXTypeArgument)();!(0,e.match)(t.TokenType.slash)&&!(0,e.match)(t.TokenType.jsxTagEnd)&&!n.state.error;)x();var s=(0,e.match)(t.TokenType.slash);return s&&m(),s}function v(){(0,e.match)(t.TokenType.jsxTagEnd)||h()}function C(){if(!b())for(j();;)switch(n.state.type){case t.TokenType.jsxTagStart:if(m(),(0,e.match)(t.TokenType.slash))return m(),void v();C(),j();break;case t.TokenType.jsxText:j();break;case t.TokenType.braceL:(0,e.next)(),(0,e.match)(t.TokenType.ellipsis)?(l(),j()):(y(),j());break;default:return void(0,o.unexpected)()}}function g(){m(),C()}function m(){n.state.tokens.push(new e.Token),(0,e.skipSpace)(),n.state.start=n.state.pos;var s=n.input.charCodeAt(n.state.pos);if(r.IS_IDENTIFIER_START[s])p();else if(s===a.charCodes.quotationMark||s===a.charCodes.apostrophe)c(s);else switch(++n.state.pos,s){case a.charCodes.greaterThan:(0,e.finishToken)(t.TokenType.jsxTagEnd);break;case a.charCodes.lessThan:(0,e.finishToken)(t.TokenType.jsxTagStart);break;case a.charCodes.slash:(0,e.finishToken)(t.TokenType.slash);break;case a.charCodes.equalsTo:(0,e.finishToken)(t.TokenType.eq);break;case a.charCodes.leftCurlyBrace:(0,e.finishToken)(t.TokenType.braceL);break;case a.charCodes.dot:(0,e.finishToken)(t.TokenType.dot);break;case a.charCodes.colon:(0,e.finishToken)(t.TokenType.colon);break;default:(0,o.unexpected)()}}function j(){n.state.tokens.push(new e.Token),n.state.start=n.state.pos,T()}
},{"../../tokenizer/index":"zEJU","../../tokenizer/types":"sS1T","../../traverser/base":"WaVM","../../traverser/expression":"dXGT","../../traverser/util":"Z5xF","../../util/charcodes":"EwSx","../../util/identifier":"NoJD","../typescript":"PJ8T"}],"mXXu":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.typedParseConditional=s,exports.typedParseParenItem=a;var e=require("../tokenizer/index"),r=require("../tokenizer/types"),t=require("../traverser/base"),o=require("../traverser/expression"),n=require("./flow"),i=require("./typescript");function s(t){if((0,e.match)(r.TokenType.question)){var n=(0,e.lookaheadType)();if(n===r.TokenType.colon||n===r.TokenType.comma||n===r.TokenType.parenR)return}(0,o.baseParseConditional)(t)}function a(){(0,e.eat)(r.TokenType.question)&&(t.state.tokens[t.state.tokens.length-1].isType=!0),(0,e.match)(r.TokenType.colon)&&(t.isTypeScriptEnabled?(0,i.tsParseTypeAnnotation)():t.isFlowEnabled&&(0,n.flowParseTypeAnnotation)())}
},{"../tokenizer/index":"zEJU","../tokenizer/types":"sS1T","../traverser/base":"WaVM","../traverser/expression":"dXGT","./flow":"nAYr","./typescript":"PJ8T"}],"dXGT":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.parseExpression=u,exports.parseMaybeAssign=h,exports.baseParseMaybeAssign=x,exports.baseParseConditional=m,exports.parseMaybeUnary=S,exports.parseExprSubscripts=w,exports.baseParseSubscripts=v,exports.baseParseSubscript=P,exports.atPossibleAsync=C,exports.parseCallExpressionArguments=_,exports.parseExprAtom=L,exports.parseLiteral=O,exports.parseParenExpression=j,exports.parseArrow=N,exports.parseTemplate=X,exports.parseObj=Q,exports.parsePropertyName=W,exports.parseMethod=Y,exports.parseArrowExpression=Z,exports.parseFunctionBodyAndFinish=$,exports.parseFunctionBody=ee,exports.parseIdentifier=oe,exports.StopState=void 0;var e=require("../plugins/flow"),t=require("../plugins/jsx/index"),n=require("../plugins/types"),o=require("../plugins/typescript"),a=require("../tokenizer/index"),s=require("../tokenizer/keywords"),r=require("../tokenizer/state"),p=require("../tokenizer/types"),i=require("./base"),T=require("./lval"),c=require("./statement"),k=require("./util");function l(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}var y=function e(t){l(this,e),this.stop=t};function u(){var e=arguments.length>0&&void 0!==arguments[0]&&arguments[0];if(h(e),(0,a.match)(p.TokenType.comma))for(;(0,a.eat)(p.TokenType.comma);)h(e)}function h(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0],n=arguments.length>1&&void 0!==arguments[1]&&arguments[1];return i.isTypeScriptEnabled?(0,o.tsParseMaybeAssign)(t,n):i.isFlowEnabled?(0,e.flowParseMaybeAssign)(t,n):x(t,n)}function x(e,t){if((0,a.match)(p.TokenType._yield))return se(),!1;((0,a.match)(p.TokenType.parenL)||(0,a.match)(p.TokenType.name)||(0,a.match)(p.TokenType._yield))&&(i.state.potentialArrowAt=i.state.start);var n=d(e);return t&&M(),i.state.type&p.TokenType.IS_ASSIGN?((0,a.next)(),h(e),!1):n}function d(e){return!!b(e)||(f(e),!1)}function f(e){i.isTypeScriptEnabled||i.isFlowEnabled?(0,n.typedParseConditional)(e):m(e)}function m(e){(0,a.eat)(p.TokenType.question)&&(h(),(0,k.expect)(p.TokenType.colon),h(e))}function b(e){var t=i.state.tokens.length;return!!S()||(g(t,-1,e),!1)}function g(e,t,n){if(i.isTypeScriptEnabled&&(p.TokenType._in&p.TokenType.PRECEDENCE_MASK)>t&&!(0,k.hasPrecedingLineBreak)()&&(0,k.eatContextual)(s.ContextualKeyword._as)){i.state.tokens[i.state.tokens.length-1].type=p.TokenType._as;var r=(0,a.pushTypeContext)(1);return(0,o.tsParseType)(),(0,a.popTypeContext)(r),void g(e,t,n)}var T=i.state.type&p.TokenType.PRECEDENCE_MASK;if(T>0&&(!n||!(0,a.match)(p.TokenType._in))&&T>t){var c=i.state.type;(0,a.next)(),c===p.TokenType.nullishCoalescing&&(i.state.tokens[i.state.tokens.length-1].nullishStartIndex=e);var l=i.state.tokens.length;S(),g(l,c&p.TokenType.IS_RIGHT_ASSOCIATIVE?T-1:T,n),c===p.TokenType.nullishCoalescing&&(i.state.tokens[e].numNullishCoalesceStarts++,i.state.tokens[i.state.tokens.length-1].numNullishCoalesceEnds++),g(e,t,n)}}function S(){if(i.isTypeScriptEnabled&&!i.isJSXEnabled&&(0,a.eat)(p.TokenType.lessThan))return(0,o.tsParseTypeAssertion)(),!1;if(i.state.type&p.TokenType.IS_PREFIX)return(0,a.next)(),S(),!1;if(w())return!0;for(;i.state.type&p.TokenType.IS_POSTFIX&&!(0,k.canInsertSemicolon)();)i.state.type===p.TokenType.preIncDec&&(i.state.type=p.TokenType.postIncDec),(0,a.next)();return!1}function w(){var e=i.state.tokens.length;return!!L()||(I(e),i.state.tokens.length>e&&i.state.tokens[e].isOptionalChainStart&&(i.state.tokens[i.state.tokens.length-1].isOptionalChainEnd=!0),!1)}function I(t){var n=arguments.length>1&&void 0!==arguments[1]&&arguments[1];i.isFlowEnabled?(0,e.flowParseSubscripts)(t,n):v(t,n)}function v(e){var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1],n=new y(!1);do{E(e,t,n)}while(!n.stop&&!i.state.error)}function E(t,n,a){i.isTypeScriptEnabled?(0,o.tsParseSubscript)(t,n,a):i.isFlowEnabled?(0,e.flowParseSubscript)(t,n,a):P(t,n,a)}function P(e,t,n){if(!t&&(0,a.eat)(p.TokenType.doubleColon))R(),n.stop=!0,I(e,t);else if((0,a.match)(p.TokenType.questionDot)){if(i.state.tokens[e].isOptionalChainStart=!0,t&&(0,a.lookaheadType)()===p.TokenType.parenL)return void(n.stop=!0);(0,a.next)(),i.state.tokens[i.state.tokens.length-1].subscriptStartIndex=e,(0,a.eat)(p.TokenType.bracketL)?(u(),(0,k.expect)(p.TokenType.bracketR)):(0,a.eat)(p.TokenType.parenL)?_():oe()}else if((0,a.eat)(p.TokenType.dot))i.state.tokens[i.state.tokens.length-1].subscriptStartIndex=e,D();else if((0,a.eat)(p.TokenType.bracketL))i.state.tokens[i.state.tokens.length-1].subscriptStartIndex=e,u(),(0,k.expect)(p.TokenType.bracketR);else if(!t&&(0,a.match)(p.TokenType.parenL))if(C()){var o=i.state.snapshot(),s=i.state.tokens.length;(0,a.next)(),i.state.tokens[i.state.tokens.length-1].subscriptStartIndex=e;var r=(0,i.getNextContextId)();i.state.tokens[i.state.tokens.length-1].contextId=r,_(),i.state.tokens[i.state.tokens.length-1].contextId=r,A()&&(i.state.restoreFromSnapshot(o),n.stop=!0,i.state.scopeDepth++,(0,c.parseFunctionParams)(),F(s))}else{(0,a.next)(),i.state.tokens[i.state.tokens.length-1].subscriptStartIndex=e;var T=(0,i.getNextContextId)();i.state.tokens[i.state.tokens.length-1].contextId=T,_(),i.state.tokens[i.state.tokens.length-1].contextId=T}else(0,a.match)(p.TokenType.backQuote)?X():n.stop=!0}function C(){return i.state.tokens[i.state.tokens.length-1].contextualKeyword===s.ContextualKeyword._async&&!(0,k.canInsertSemicolon)()}function _(){for(var e=!0;!(0,a.eat)(p.TokenType.parenR)&&!i.state.error;){if(e)e=!1;else if((0,k.expect)(p.TokenType.comma),(0,a.eat)(p.TokenType.parenR))break;ne(!1)}}function A(){return(0,a.match)(p.TokenType.colon)||(0,a.match)(p.TokenType.arrow)}function F(t){i.isTypeScriptEnabled?(0,o.tsStartParseAsyncArrowFromCallExpression)():i.isFlowEnabled&&(0,e.flowStartParseAsyncArrowFromCallExpression)(),(0,k.expect)(p.TokenType.arrow),Z(t)}function R(){var e=i.state.tokens.length;L(),I(e,!0)}function L(){if((0,a.eat)(p.TokenType.modulo))return oe(),!1;if((0,a.match)(p.TokenType.jsxText))return O(),!1;if((0,a.match)(p.TokenType.lessThan)&&i.isJSXEnabled)return i.state.type=p.TokenType.jsxTagStart,(0,t.jsxParseElement)(),(0,a.next)(),!1;var e=i.state.potentialArrowAt===i.state.start;switch(i.state.type){case p.TokenType.slash:case p.TokenType.assign:(0,a.retokenizeSlashAsRegex)();case p.TokenType._super:case p.TokenType._this:case p.TokenType.regexp:case p.TokenType.num:case p.TokenType.bigint:case p.TokenType.string:case p.TokenType._null:case p.TokenType._true:case p.TokenType._false:return(0,a.next)(),!1;case p.TokenType._import:return(0,a.next)(),(0,a.match)(p.TokenType.dot)&&(i.state.tokens[i.state.tokens.length-1].type=p.TokenType.name,(0,a.next)(),oe()),!1;case p.TokenType.name:var n=i.state.tokens.length,o=i.state.start,r=i.state.contextualKeyword;return oe(),r===s.ContextualKeyword._await?(ae(),!1):r===s.ContextualKeyword._async&&(0,a.match)(p.TokenType._function)&&!(0,k.canInsertSemicolon)()?((0,a.next)(),(0,c.parseFunction)(o,!1),!1):e&&!(0,k.canInsertSemicolon)()&&r===s.ContextualKeyword._async&&(0,a.match)(p.TokenType.name)?(i.state.scopeDepth++,(0,T.parseBindingIdentifier)(!1),(0,k.expect)(p.TokenType.arrow),Z(n),!0):e&&!(0,k.canInsertSemicolon)()&&(0,a.match)(p.TokenType.arrow)?(i.state.scopeDepth++,(0,T.markPriorBindingIdentifier)(!1),(0,k.expect)(p.TokenType.arrow),Z(n),!0):(i.state.tokens[i.state.tokens.length-1].identifierRole=a.IdentifierRole.Access,!1);case p.TokenType._do:return(0,a.next)(),(0,c.parseBlock)(!1),!1;case p.TokenType.parenL:return B(e);case p.TokenType.bracketL:return(0,a.next)(),te(p.TokenType.bracketR,!0),!1;case p.TokenType.braceL:return Q(!1,!1),!1;case p.TokenType._function:return q(),!1;case p.TokenType.at:(0,c.parseDecorators)();case p.TokenType._class:return(0,c.parseClass)(!1),!1;case p.TokenType._new:return z(),!1;case p.TokenType.backQuote:return X(),!1;case p.TokenType.doubleColon:return(0,a.next)(),R(),!1;case p.TokenType.hash:return(0,a.next)(),!1;default:return(0,k.unexpected)(),!1}}function D(){(0,a.eat)(p.TokenType.hash),oe()}function q(){var e=i.state.start;oe(),(0,a.eat)(p.TokenType.dot)&&oe(),(0,c.parseFunction)(e,!1)}function O(){(0,a.next)()}function j(){(0,k.expect)(p.TokenType.parenL),u(),(0,k.expect)(p.TokenType.parenR)}function B(e){var t=i.state.snapshot(),n=i.state.tokens.length;(0,k.expect)(p.TokenType.parenL);for(var o=!0;!(0,a.match)(p.TokenType.parenR)&&!i.state.error;){if(o)o=!1;else if((0,k.expect)(p.TokenType.comma),(0,a.match)(p.TokenType.parenR))break;if((0,a.match)(p.TokenType.ellipsis)){(0,T.parseRest)(!1),M();break}h(!1,!0)}if(((0,k.expect)(p.TokenType.parenR),e&&K())&&N())return i.state.restoreFromSnapshot(t),i.state.scopeDepth++,(0,c.parseFunctionParams)(),N(),Z(n),!0;return!1}function K(){return(0,a.match)(p.TokenType.colon)||!(0,k.canInsertSemicolon)()}function N(){return i.isTypeScriptEnabled?(0,o.tsParseArrow)():i.isFlowEnabled?(0,e.flowParseArrow)():(0,a.eat)(p.TokenType.arrow)}function M(){(i.isTypeScriptEnabled||i.isFlowEnabled)&&(0,n.typedParseParenItem)()}function z(){(0,k.expect)(p.TokenType._new),(0,a.eat)(p.TokenType.dot)?oe():(R(),(0,a.eat)(p.TokenType.questionDot),V())}function V(){i.isTypeScriptEnabled?(0,o.tsStartParseNewArguments)():i.isFlowEnabled&&(0,e.flowStartParseNewArguments)(),(0,a.eat)(p.TokenType.parenL)&&te(p.TokenType.parenR)}function X(){for((0,a.nextTemplateToken)(),(0,a.nextTemplateToken)();!(0,a.match)(p.TokenType.backQuote)&&!i.state.error;)(0,k.expect)(p.TokenType.dollarBraceL),u(),(0,a.nextTemplateToken)(),(0,a.nextTemplateToken)();(0,a.next)()}function Q(e,t){var n=(0,i.getNextContextId)(),o=!0;for((0,a.next)(),i.state.tokens[i.state.tokens.length-1].contextId=n;!(0,a.eat)(p.TokenType.braceR)&&!i.state.error;){if(o)o=!1;else if((0,k.expect)(p.TokenType.comma),(0,a.eat)(p.TokenType.braceR))break;var r=!1;if((0,a.match)(p.TokenType.ellipsis)){var c=i.state.tokens.length;if((0,T.parseSpread)(),e&&(i.state.tokens.length===c+2&&(0,T.markPriorBindingIdentifier)(t),(0,a.eat)(p.TokenType.braceR)))break}else e||(r=(0,a.eat)(p.TokenType.star)),!e&&(0,k.isContextual)(s.ContextualKeyword._async)?(r&&(0,k.unexpected)(),oe(),(0,a.match)(p.TokenType.colon)||(0,a.match)(p.TokenType.parenL)||(0,a.match)(p.TokenType.braceR)||(0,a.match)(p.TokenType.eq)||(0,a.match)(p.TokenType.comma)||((0,a.match)(p.TokenType.star)&&((0,a.next)(),r=!0),W(n))):W(n),U(e,t,n)}i.state.tokens[i.state.tokens.length-1].contextId=n}function G(e){return!e&&((0,a.match)(p.TokenType.string)||(0,a.match)(p.TokenType.num)||(0,a.match)(p.TokenType.bracketL)||(0,a.match)(p.TokenType.name)||!!(i.state.type&p.TokenType.IS_KEYWORD))}function J(e,t){var n=i.state.start;return(0,a.match)(p.TokenType.parenL)?(e&&(0,k.unexpected)(),Y(n,!1),!0):!!G(e)&&(W(t),Y(n,!1),!0)}function H(e,t){(0,a.eat)(p.TokenType.colon)?e?(0,T.parseMaybeDefault)(t):h(!1):(i.state.tokens[i.state.tokens.length-1].identifierRole=e?t?a.IdentifierRole.ObjectShorthandBlockScopedDeclaration:a.IdentifierRole.ObjectShorthandFunctionScopedDeclaration:a.IdentifierRole.ObjectShorthand,(0,T.parseMaybeDefault)(t,!0))}function U(t,n,a){i.isTypeScriptEnabled?(0,o.tsStartParseObjPropValue)():i.isFlowEnabled&&(0,e.flowStartParseObjPropValue)(),J(t,a)||H(t,n)}function W(t){i.isFlowEnabled&&(0,e.flowParseVariance)(),(0,a.eat)(p.TokenType.bracketL)?(i.state.tokens[i.state.tokens.length-1].contextId=t,h(),(0,k.expect)(p.TokenType.bracketR),i.state.tokens[i.state.tokens.length-1].contextId=t):((0,a.match)(p.TokenType.num)||(0,a.match)(p.TokenType.string)||(0,a.match)(p.TokenType.bigint)?L():D(),i.state.tokens[i.state.tokens.length-1].identifierRole=a.IdentifierRole.ObjectKey,i.state.tokens[i.state.tokens.length-1].contextId=t)}function Y(e,t){var n=(0,i.getNextContextId)();i.state.scopeDepth++;var o=i.state.tokens.length,a=t;(0,c.parseFunctionParams)(a,n),$(e,n);var s=i.state.tokens.length;i.state.scopes.push(new r.Scope(o,s,!0)),i.state.scopeDepth--}function Z(e){ee(!0);var t=i.state.tokens.length;i.state.scopes.push(new r.Scope(e,t,!0)),i.state.scopeDepth--}function $(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;i.isTypeScriptEnabled?(0,o.tsParseFunctionBodyAndFinish)(t,n):i.isFlowEnabled?(0,e.flowParseFunctionBodyAndFinish)(n):ee(!1,n)}function ee(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;e&&!(0,a.match)(p.TokenType.braceL)?h():(0,c.parseBlock)(!0,!0,t)}function te(e){for(var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1],n=!0;!(0,a.eat)(e)&&!i.state.error;){if(n)n=!1;else if((0,k.expect)(p.TokenType.comma),(0,a.eat)(e))break;ne(t)}}function ne(e){e&&(0,a.match)(p.TokenType.comma)||((0,a.match)(p.TokenType.ellipsis)?((0,T.parseSpread)(),M()):(0,a.match)(p.TokenType.question)?(0,a.next)():h(!1,!0))}function oe(){(0,a.next)(),i.state.tokens[i.state.tokens.length-1].type=p.TokenType.name}function ae(){S()}function se(){(0,a.next)(),(0,a.match)(p.TokenType.semi)||(0,k.canInsertSemicolon)()||((0,a.eat)(p.TokenType.star),h())}exports.StopState=y;
},{"../plugins/flow":"nAYr","../plugins/jsx/index":"hvzv","../plugins/types":"mXXu","../plugins/typescript":"PJ8T","../tokenizer/index":"zEJU","../tokenizer/keywords":"GGTW","../tokenizer/state":"Z7yX","../tokenizer/types":"sS1T","./base":"WaVM","./lval":"yj5C","./statement":"JoXu","./util":"Z5xF"}],"nAYr":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.flowParseTypeParameterDeclaration=A,exports.flowParseTypeAnnotation=Z,exports.flowParseVariance=ee,exports.flowParseFunctionBodyAndFinish=te,exports.flowParseSubscript=oe,exports.flowStartParseNewArguments=ne,exports.flowTryParseStatement=ae,exports.flowParseIdentifierStatement=pe,exports.flowShouldParseExportDeclaration=re,exports.flowShouldDisallowExportDefaultSpecifier=Te,exports.flowParseExportDeclaration=se,exports.flowShouldParseExportStar=ye,exports.flowParseExportStar=ce,exports.flowAfterParseClassSuper=ie,exports.flowStartParseObjPropValue=ue,exports.flowParseAssignableListItemTypes=xe,exports.flowStartParseImportSpecifiers=ke,exports.flowParseImportSpecifier=le,exports.flowStartParseFunctionParams=fe,exports.flowAfterParseVarHead=me,exports.flowStartParseAsyncArrowFromCallExpression=he,exports.flowParseMaybeAssign=de,exports.flowParseArrow=Ce,exports.flowParseSubscripts=we;var e=require("../tokenizer/index"),t=require("../tokenizer/keywords"),o=require("../tokenizer/types"),n=require("../traverser/base"),a=require("../traverser/expression"),p=require("../traverser/statement"),r=require("../traverser/util");function T(e){return(e.type===o.TokenType.name||!!(e.type&o.TokenType.IS_KEYWORD))&&e.contextualKeyword!==t.ContextualKeyword._from}function s(t){var n=(0,e.pushTypeContext)(0);(0,r.expect)(t||o.TokenType.colon),X(),(0,e.popTypeContext)(n)}function y(){(0,r.expect)(o.TokenType.modulo),(0,r.expectContextual)(t.ContextualKeyword._checks),(0,e.eat)(o.TokenType.parenL)&&((0,a.parseExpression)(),(0,r.expect)(o.TokenType.parenR))}function c(){var t=(0,e.pushTypeContext)(0);(0,r.expect)(o.TokenType.colon),(0,e.match)(o.TokenType.modulo)?y():(X(),(0,e.match)(o.TokenType.modulo)&&y()),(0,e.popTypeContext)(t)}function i(){(0,e.next)(),w(!0)}function u(){(0,e.next)(),(0,a.parseIdentifier)(),(0,e.match)(o.TokenType.lessThan)&&A(),(0,r.expect)(o.TokenType.parenL),V(),(0,r.expect)(o.TokenType.parenR),c(),(0,r.semicolon)()}function x(){(0,e.match)(o.TokenType._class)?i():(0,e.match)(o.TokenType._function)?u():(0,e.match)(o.TokenType._var)?k():(0,r.eatContextual)(t.ContextualKeyword._module)?(0,e.eat)(o.TokenType.dot)?m():l():(0,r.isContextual)(t.ContextualKeyword._type)?h():(0,r.isContextual)(t.ContextualKeyword._opaque)?d():(0,r.isContextual)(t.ContextualKeyword._interface)?C():(0,e.match)(o.TokenType._export)?f():(0,r.unexpected)()}function k(){(0,e.next)(),$(),(0,r.semicolon)()}function l(){for((0,e.match)(o.TokenType.string)?(0,a.parseExprAtom)():(0,a.parseIdentifier)(),(0,r.expect)(o.TokenType.braceL);!(0,e.match)(o.TokenType.braceR)&&!n.state.error;)(0,e.match)(o.TokenType._import)?((0,e.next)(),(0,p.parseImport)()):(0,r.unexpected)();(0,r.expect)(o.TokenType.braceR)}function f(){(0,r.expect)(o.TokenType._export),(0,e.eat)(o.TokenType._default)?(0,e.match)(o.TokenType._function)||(0,e.match)(o.TokenType._class)?x():(X(),(0,r.semicolon)()):(0,e.match)(o.TokenType._var)||(0,e.match)(o.TokenType._function)||(0,e.match)(o.TokenType._class)||(0,r.isContextual)(t.ContextualKeyword._opaque)?x():(0,e.match)(o.TokenType.star)||(0,e.match)(o.TokenType.braceL)||(0,r.isContextual)(t.ContextualKeyword._interface)||(0,r.isContextual)(t.ContextualKeyword._type)||(0,r.isContextual)(t.ContextualKeyword._opaque)?(0,p.parseExport)():(0,r.unexpected)()}function m(){(0,r.expectContextual)(t.ContextualKeyword._exports),Z(),(0,r.semicolon)()}function h(){(0,e.next)(),b()}function d(){(0,e.next)(),P(!0)}function C(){(0,e.next)(),w()}function w(){var n=arguments.length>0&&void 0!==arguments[0]&&arguments[0];if(K(),(0,e.match)(o.TokenType.lessThan)&&A(),(0,e.eat)(o.TokenType._extends))do{_()}while(!n&&(0,e.eat)(o.TokenType.comma));if((0,r.isContextual)(t.ContextualKeyword._mixins)){(0,e.next)();do{_()}while((0,e.eat)(o.TokenType.comma))}if((0,r.isContextual)(t.ContextualKeyword._implements)){(0,e.next)();do{_()}while((0,e.eat)(o.TokenType.comma))}D(n,!1,n)}function _(){M(!1),(0,e.match)(o.TokenType.lessThan)&&R()}function v(){w()}function K(){(0,a.parseIdentifier)()}function b(){K(),(0,e.match)(o.TokenType.lessThan)&&A(),s(o.TokenType.eq),(0,r.semicolon)()}function P(n){(0,r.expectContextual)(t.ContextualKeyword._type),K(),(0,e.match)(o.TokenType.lessThan)&&A(),(0,e.match)(o.TokenType.colon)&&s(o.TokenType.colon),n||s(o.TokenType.eq),(0,r.semicolon)()}function S(){ee(),$(),(0,e.eat)(o.TokenType.eq)&&X()}function A(){var t=(0,e.pushTypeContext)(0);(0,e.match)(o.TokenType.lessThan)||(0,e.match)(o.TokenType.typeParameterStart)?(0,e.next)():(0,r.unexpected)();do{S(),(0,e.match)(o.TokenType.greaterThan)||(0,r.expect)(o.TokenType.comma)}while(!(0,e.match)(o.TokenType.greaterThan)&&!n.state.error);(0,r.expect)(o.TokenType.greaterThan),(0,e.popTypeContext)(t)}function R(){var t=(0,e.pushTypeContext)(0);for((0,r.expect)(o.TokenType.lessThan);!(0,e.match)(o.TokenType.greaterThan)&&!n.state.error;)X(),(0,e.match)(o.TokenType.greaterThan)||(0,r.expect)(o.TokenType.comma);(0,r.expect)(o.TokenType.greaterThan),(0,e.popTypeContext)(t)}function L(){if((0,r.expectContextual)(t.ContextualKeyword._interface),(0,e.eat)(o.TokenType._extends))do{_()}while((0,e.eat)(o.TokenType.comma));D(!1,!1,!1)}function q(){(0,e.match)(o.TokenType.num)||(0,e.match)(o.TokenType.string)?(0,a.parseExprAtom)():(0,a.parseIdentifier)()}function g(){(0,e.lookaheadType)()===o.TokenType.colon?(q(),s()):X(),(0,r.expect)(o.TokenType.bracketR),s()}function I(){q(),(0,r.expect)(o.TokenType.bracketR),(0,r.expect)(o.TokenType.bracketR),(0,e.match)(o.TokenType.lessThan)||(0,e.match)(o.TokenType.parenL)?F():((0,e.eat)(o.TokenType.question),s())}function F(){for((0,e.match)(o.TokenType.lessThan)&&A(),(0,r.expect)(o.TokenType.parenL);!(0,e.match)(o.TokenType.parenR)&&!(0,e.match)(o.TokenType.ellipsis)&&!n.state.error;)N(),(0,e.match)(o.TokenType.parenR)||(0,r.expect)(o.TokenType.comma);(0,e.eat)(o.TokenType.ellipsis)&&N(),(0,r.expect)(o.TokenType.parenR),s()}function E(){F()}function D(a,p,T){var s;for(p&&(0,e.match)(o.TokenType.braceBarL)?((0,r.expect)(o.TokenType.braceBarL),s=o.TokenType.braceBarR):((0,r.expect)(o.TokenType.braceL),s=o.TokenType.braceR);!(0,e.match)(s)&&!n.state.error;){if(T&&(0,r.isContextual)(t.ContextualKeyword._proto)){var y=(0,e.lookaheadType)();y!==o.TokenType.colon&&y!==o.TokenType.question&&((0,e.next)(),a=!1)}if(a&&(0,r.isContextual)(t.ContextualKeyword._static)){var c=(0,e.lookaheadType)();c!==o.TokenType.colon&&c!==o.TokenType.question&&(0,e.next)()}if(ee(),(0,e.eat)(o.TokenType.bracketL))(0,e.eat)(o.TokenType.bracketL)?I():g();else if((0,e.match)(o.TokenType.parenL)||(0,e.match)(o.TokenType.lessThan))E();else{if((0,r.isContextual)(t.ContextualKeyword._get)||(0,r.isContextual)(t.ContextualKeyword._set)){var i=(0,e.lookaheadType)();i!==o.TokenType.name&&i!==o.TokenType.string&&i!==o.TokenType.num||(0,e.next)()}O()}B()}(0,r.expect)(s)}function O(){if((0,e.match)(o.TokenType.ellipsis)){if((0,r.expect)(o.TokenType.ellipsis),(0,e.eat)(o.TokenType.comma)||(0,e.eat)(o.TokenType.semi),(0,e.match)(o.TokenType.braceR))return;X()}else q(),(0,e.match)(o.TokenType.lessThan)||(0,e.match)(o.TokenType.parenL)?F():((0,e.eat)(o.TokenType.question),s())}function B(){(0,e.eat)(o.TokenType.semi)||(0,e.eat)(o.TokenType.comma)||(0,e.match)(o.TokenType.braceR)||(0,e.match)(o.TokenType.braceBarR)||(0,r.unexpected)()}function M(t){for(t||(0,a.parseIdentifier)();(0,e.eat)(o.TokenType.dot);)(0,a.parseIdentifier)()}function W(){M(!0),(0,e.match)(o.TokenType.lessThan)&&R()}function Y(){(0,r.expect)(o.TokenType._typeof),j()}function z(){for((0,r.expect)(o.TokenType.bracketL);n.state.pos<n.input.length&&!(0,e.match)(o.TokenType.bracketR)&&(X(),!(0,e.match)(o.TokenType.bracketR));)(0,r.expect)(o.TokenType.comma);(0,r.expect)(o.TokenType.bracketR)}function N(){var t=(0,e.lookaheadType)();t===o.TokenType.colon||t===o.TokenType.question?((0,a.parseIdentifier)(),(0,e.eat)(o.TokenType.question),s()):X()}function V(){for(;!(0,e.match)(o.TokenType.parenR)&&!(0,e.match)(o.TokenType.ellipsis)&&!n.state.error;)N(),(0,e.match)(o.TokenType.parenR)||(0,r.expect)(o.TokenType.comma);(0,e.eat)(o.TokenType.ellipsis)&&N()}function j(){var p=!1,T=n.state.noAnonFunctionType;switch(n.state.type){case o.TokenType.name:return(0,r.isContextual)(t.ContextualKeyword._interface)?void L():((0,a.parseIdentifier)(),void W());case o.TokenType.braceL:return void D(!1,!1,!1);case o.TokenType.braceBarL:return void D(!1,!0,!1);case o.TokenType.bracketL:return void z();case o.TokenType.lessThan:return A(),(0,r.expect)(o.TokenType.parenL),V(),(0,r.expect)(o.TokenType.parenR),(0,r.expect)(o.TokenType.arrow),void X();case o.TokenType.parenL:if((0,e.next)(),!(0,e.match)(o.TokenType.parenR)&&!(0,e.match)(o.TokenType.ellipsis))if((0,e.match)(o.TokenType.name)){var s=(0,e.lookaheadType)();p=s!==o.TokenType.question&&s!==o.TokenType.colon}else p=!0;if(p){if(n.state.noAnonFunctionType=!1,X(),n.state.noAnonFunctionType=T,n.state.noAnonFunctionType||!((0,e.match)(o.TokenType.comma)||(0,e.match)(o.TokenType.parenR)&&(0,e.lookaheadType)()===o.TokenType.arrow))return void(0,r.expect)(o.TokenType.parenR);(0,e.eat)(o.TokenType.comma)}return V(),(0,r.expect)(o.TokenType.parenR),(0,r.expect)(o.TokenType.arrow),void X();case o.TokenType.minus:return(0,e.next)(),void(0,a.parseLiteral)();case o.TokenType.string:case o.TokenType.num:case o.TokenType._true:case o.TokenType._false:case o.TokenType._null:case o.TokenType._this:case o.TokenType._void:case o.TokenType.star:return void(0,e.next)();default:if(n.state.type===o.TokenType._typeof)return void Y();if(n.state.type&o.TokenType.IS_KEYWORD)return(0,e.next)(),void(n.state.tokens[n.state.tokens.length-1].type=o.TokenType.name)}(0,r.unexpected)()}function H(){for(j();!(0,r.canInsertSemicolon)()&&(0,e.match)(o.TokenType.bracketL);)(0,r.expect)(o.TokenType.bracketL),(0,r.expect)(o.TokenType.bracketR)}function G(){(0,e.eat)(o.TokenType.question)?G():H()}function J(){G(),!n.state.noAnonFunctionType&&(0,e.eat)(o.TokenType.arrow)&&X()}function Q(){for((0,e.eat)(o.TokenType.bitwiseAND),J();(0,e.eat)(o.TokenType.bitwiseAND);)J()}function U(){for((0,e.eat)(o.TokenType.bitwiseOR),Q();(0,e.eat)(o.TokenType.bitwiseOR);)Q()}function X(){U()}function Z(){s()}function $(){(0,a.parseIdentifier)(),(0,e.match)(o.TokenType.colon)&&Z()}function ee(){((0,e.match)(o.TokenType.plus)||(0,e.match)(o.TokenType.minus))&&(0,e.next)()}function te(t){(0,e.match)(o.TokenType.colon)&&c(),(0,a.parseFunctionBody)(!1,t)}function oe(t,p,T){if((0,e.match)(o.TokenType.questionDot)&&(0,e.lookaheadType)()===o.TokenType.lessThan)return p?void(T.stop=!0):((0,e.next)(),R(),(0,r.expect)(o.TokenType.parenL),void(0,a.parseCallExpressionArguments)());if(!p&&(0,e.match)(o.TokenType.lessThan)){var s=n.state.snapshot();if(R(),(0,r.expect)(o.TokenType.parenL),(0,a.parseCallExpressionArguments)(),!n.state.error)return;n.state.restoreFromSnapshot(s)}(0,a.baseParseSubscript)(t,p,T)}function ne(){if((0,e.match)(o.TokenType.lessThan)){var t=n.state.snapshot();R(),n.state.error&&n.state.restoreFromSnapshot(t)}}function ae(){if((0,e.match)(o.TokenType.name)&&n.state.contextualKeyword===t.ContextualKeyword._interface){var a=(0,e.pushTypeContext)(0);return(0,e.next)(),v(),(0,e.popTypeContext)(a),!0}return!1}function pe(n){if(n===t.ContextualKeyword._declare){if((0,e.match)(o.TokenType._class)||(0,e.match)(o.TokenType.name)||(0,e.match)(o.TokenType._function)||(0,e.match)(o.TokenType._var)||(0,e.match)(o.TokenType._export)){var a=(0,e.pushTypeContext)(1);x(),(0,e.popTypeContext)(a)}}else if((0,e.match)(o.TokenType.name))if(n===t.ContextualKeyword._interface){var p=(0,e.pushTypeContext)(1);v(),(0,e.popTypeContext)(p)}else if(n===t.ContextualKeyword._type){var T=(0,e.pushTypeContext)(1);b(),(0,e.popTypeContext)(T)}else if(n===t.ContextualKeyword._opaque){var s=(0,e.pushTypeContext)(1);P(!1),(0,e.popTypeContext)(s)}(0,r.semicolon)()}function re(){return(0,r.isContextual)(t.ContextualKeyword._type)||(0,r.isContextual)(t.ContextualKeyword._interface)||(0,r.isContextual)(t.ContextualKeyword._opaque)}function Te(){return(0,e.match)(o.TokenType.name)&&(n.state.contextualKeyword===t.ContextualKeyword._type||n.state.contextualKeyword===t.ContextualKeyword._interface||n.state.contextualKeyword===t.ContextualKeyword._opaque)}function se(){if((0,r.isContextual)(t.ContextualKeyword._type)){var n=(0,e.pushTypeContext)(1);(0,e.next)(),(0,e.match)(o.TokenType.braceL)?((0,p.parseExportSpecifiers)(),(0,p.parseExportFrom)()):b(),(0,e.popTypeContext)(n)}else if((0,r.isContextual)(t.ContextualKeyword._opaque)){var a=(0,e.pushTypeContext)(1);(0,e.next)(),P(!1),(0,e.popTypeContext)(a)}else if((0,r.isContextual)(t.ContextualKeyword._interface)){var T=(0,e.pushTypeContext)(1);(0,e.next)(),v(),(0,e.popTypeContext)(T)}else(0,p.parseStatement)(!0)}function ye(){return(0,e.match)(o.TokenType.star)||(0,r.isContextual)(t.ContextualKeyword._type)&&(0,e.lookaheadType)()===o.TokenType.star}function ce(){if((0,r.eatContextual)(t.ContextualKeyword._type)){var o=(0,e.pushTypeContext)(2);(0,p.baseParseExportStar)(),(0,e.popTypeContext)(o)}else(0,p.baseParseExportStar)()}function ie(a){if(a&&(0,e.match)(o.TokenType.lessThan)&&R(),(0,r.isContextual)(t.ContextualKeyword._implements)){var p=(0,e.pushTypeContext)(0);(0,e.next)(),n.state.tokens[n.state.tokens.length-1].type=o.TokenType._implements;do{K(),(0,e.match)(o.TokenType.lessThan)&&R()}while((0,e.eat)(o.TokenType.comma));(0,e.popTypeContext)(p)}}function ue(){(0,e.match)(o.TokenType.lessThan)&&(A(),(0,e.match)(o.TokenType.parenL)||(0,r.unexpected)())}function xe(){var t=(0,e.pushTypeContext)(0);(0,e.eat)(o.TokenType.question),(0,e.match)(o.TokenType.colon)&&Z(),(0,e.popTypeContext)(t)}function ke(){if((0,e.match)(o.TokenType._typeof)||(0,r.isContextual)(t.ContextualKeyword._type)){var n=(0,e.lookaheadTypeAndKeyword)();(T(n)||n.type===o.TokenType.braceL||n.type===o.TokenType.star)&&(0,e.next)()}}function le(){var p=n.state.contextualKeyword===t.ContextualKeyword._type||n.state.type===o.TokenType._typeof;p?(0,e.next)():(0,a.parseIdentifier)(),(0,r.isContextual)(t.ContextualKeyword._as)&&!(0,r.isLookaheadContextual)(t.ContextualKeyword._as)?((0,a.parseIdentifier)(),(!p||(0,e.match)(o.TokenType.name)||n.state.type&o.TokenType.IS_KEYWORD)&&(0,a.parseIdentifier)()):p&&((0,e.match)(o.TokenType.name)||n.state.type&o.TokenType.IS_KEYWORD)&&((0,a.parseIdentifier)(),(0,r.eatContextual)(t.ContextualKeyword._as)&&(0,a.parseIdentifier)())}function fe(){if((0,e.match)(o.TokenType.lessThan)){var t=(0,e.pushTypeContext)(0);A(),(0,e.popTypeContext)(t)}}function me(){(0,e.match)(o.TokenType.colon)&&Z()}function he(){if((0,e.match)(o.TokenType.colon)){var t=n.state.noAnonFunctionType;n.state.noAnonFunctionType=!0,Z(),n.state.noAnonFunctionType=t}}function de(t,p){if((0,e.match)(o.TokenType.lessThan)){var T=n.state.snapshot(),s=(0,a.baseParseMaybeAssign)(t,p);if(!n.state.error)return s;n.state.restoreFromSnapshot(T),n.state.type=o.TokenType.typeParameterStart;var y=(0,e.pushTypeContext)(0);if(A(),(0,e.popTypeContext)(y),s=(0,a.baseParseMaybeAssign)(t,p))return!0;(0,r.unexpected)()}return(0,a.baseParseMaybeAssign)(t,p)}function Ce(){if((0,e.match)(o.TokenType.colon)){var t=(0,e.pushTypeContext)(0),a=n.state.snapshot(),p=n.state.noAnonFunctionType;n.state.noAnonFunctionType=!0,c(),n.state.noAnonFunctionType=p,(0,r.canInsertSemicolon)()&&(0,r.unexpected)(),(0,e.match)(o.TokenType.arrow)||(0,r.unexpected)(),n.state.error&&n.state.restoreFromSnapshot(a),(0,e.popTypeContext)(t)}return(0,e.eat)(o.TokenType.arrow)}function we(p){var r=arguments.length>1&&void 0!==arguments[1]&&arguments[1];if(n.state.tokens[n.state.tokens.length-1].contextualKeyword===t.ContextualKeyword._async&&(0,e.match)(o.TokenType.lessThan)){var T=n.state.snapshot();if(_e()&&!n.state.error)return;n.state.restoreFromSnapshot(T)}(0,a.baseParseSubscripts)(p,r)}function _e(){n.state.scopeDepth++;var e=n.state.tokens.length;return(0,p.parseFunctionParams)(),!!(0,a.parseArrow)()&&((0,a.parseArrowExpression)(e),!0)}
},{"../tokenizer/index":"zEJU","../tokenizer/keywords":"GGTW","../tokenizer/types":"sS1T","../traverser/base":"WaVM","../traverser/expression":"dXGT","../traverser/statement":"JoXu","../traverser/util":"Z5xF"}],"JoXu":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.parseTopLevel=l,exports.parseStatement=y,exports.parseDecorators=k,exports.baseParseMaybeDecoratorArguments=f,exports.parseVarStatement=I,exports.parseBlock=L,exports.parseBlockBody=R,exports.parseFunction=N,exports.parseFunctionParams=V,exports.parseClass=H,exports.parseClassPropertyName=Q,exports.parsePostMemberNameModifiers=X,exports.parseClassProperty=Y,exports.parseExport=ee,exports.parseExportFrom=se,exports.baseParseExportStar=ie,exports.parseExportSpecifiers=le,exports.parseImport=ye;var e=require("../index"),t=require("../plugins/flow"),n=require("../plugins/typescript"),o=require("../tokenizer"),a=require("../tokenizer/keywords"),s=require("../tokenizer/state"),r=require("../tokenizer/types"),p=require("./base"),i=require("./expression"),c=require("./lval"),T=require("./util");function l(){if(R(r.TokenType.eof),p.state.scopes.push(new s.Scope(0,p.state.tokens.length,!0)),0!==p.state.scopeDepth)throw new Error("Invalid scope depth at end of file: ".concat(p.state.scopeDepth));return new e.File(p.state.tokens,p.state.scopes)}function y(e){p.isFlowEnabled&&(0,t.flowTryParseStatement)()||((0,o.match)(r.TokenType.at)&&k(),u(e))}function u(e){if(!p.isTypeScriptEnabled||!(0,n.tsTryParseStatementContent)()){var t=p.state.type;switch(t){case r.TokenType._break:case r.TokenType._continue:return void h();case r.TokenType._debugger:return void m();case r.TokenType._do:return void w();case r.TokenType._for:return void _();case r.TokenType._function:if((0,o.lookaheadType)()===r.TokenType.dot)break;return e||(0,T.unexpected)(),void E();case r.TokenType._class:return e||(0,T.unexpected)(),void H(!0);case r.TokenType._if:return void b();case r.TokenType._return:return void g();case r.TokenType._switch:return void C();case r.TokenType._throw:return void S();case r.TokenType._try:return void P();case r.TokenType._let:case r.TokenType._const:e||(0,T.unexpected)();case r.TokenType._var:return void I(t);case r.TokenType._while:return void K();case r.TokenType.braceL:return void L();case r.TokenType.semi:return void D();case r.TokenType._export:case r.TokenType._import:var s=(0,o.lookaheadType)();if(s===r.TokenType.parenL||s===r.TokenType.dot)break;return(0,o.next)(),void(t===r.TokenType._import?ye():ee());case r.TokenType.name:if(p.state.contextualKeyword===a.ContextualKeyword._async){var c=p.state.start,l=p.state.snapshot();if((0,o.next)(),(0,o.match)(r.TokenType._function)&&!(0,T.canInsertSemicolon)())return(0,T.expect)(r.TokenType._function),void N(c,!0);p.state.restoreFromSnapshot(l)}}var y=p.state.tokens.length;(0,i.parseExpression)();var u=null;if(p.state.tokens.length===y+1){var k=p.state.tokens[p.state.tokens.length-1];k.type===r.TokenType.name&&(u=k.contextualKeyword)}null!=u?(0,o.eat)(r.TokenType.colon)?F():A(u):(0,T.semicolon)()}}function k(){for(;(0,o.match)(r.TokenType.at);)d()}function d(){if((0,o.next)(),(0,o.eat)(r.TokenType.parenL))(0,i.parseExpression)(),(0,T.expect)(r.TokenType.parenR);else for((0,i.parseIdentifier)();(0,o.eat)(r.TokenType.dot);)(0,i.parseIdentifier)();x()}function x(){p.isTypeScriptEnabled?(0,n.tsParseMaybeDecoratorArguments)():f()}function f(){(0,o.eat)(r.TokenType.parenL)&&(0,i.parseCallExpressionArguments)()}function h(){(0,o.next)(),(0,T.isLineTerminator)()||((0,i.parseIdentifier)(),(0,T.semicolon)())}function m(){(0,o.next)(),(0,T.semicolon)()}function w(){(0,o.next)(),y(!1),(0,T.expect)(r.TokenType._while),(0,i.parseParenExpression)(),(0,o.eat)(r.TokenType.semi)}function _(){p.state.scopeDepth++;var e=p.state.tokens.length;v();var t=p.state.tokens.length;p.state.scopes.push(new s.Scope(e,t,!1)),p.state.scopeDepth--}function v(){(0,o.next)();var e=!1;if((0,T.isContextual)(a.ContextualKeyword._await)&&(e=!0,(0,o.next)()),(0,T.expect)(r.TokenType.parenL),(0,o.match)(r.TokenType.semi))return e&&(0,T.unexpected)(),void q();if((0,o.match)(r.TokenType._var)||(0,o.match)(r.TokenType._let)||(0,o.match)(r.TokenType._const)){var t=p.state.type;return(0,o.next)(),B(!0,t),(0,o.match)(r.TokenType._in)||(0,T.isContextual)(a.ContextualKeyword._of)?void M(e):void q()}(0,i.parseExpression)(!0),(0,o.match)(r.TokenType._in)||(0,T.isContextual)(a.ContextualKeyword._of)?M(e):(e&&(0,T.unexpected)(),q())}function E(){var e=p.state.start;(0,o.next)(),N(e,!0)}function b(){(0,o.next)(),(0,i.parseParenExpression)(),y(!1),(0,o.eat)(r.TokenType._else)&&y(!1)}function g(){(0,o.next)(),(0,T.isLineTerminator)()||((0,i.parseExpression)(),(0,T.semicolon)())}function C(){(0,o.next)(),(0,i.parseParenExpression)(),p.state.scopeDepth++;var e=p.state.tokens.length;for((0,T.expect)(r.TokenType.braceL);!(0,o.match)(r.TokenType.braceR)&&!p.state.error;)if((0,o.match)(r.TokenType._case)||(0,o.match)(r.TokenType._default)){var t=(0,o.match)(r.TokenType._case);(0,o.next)(),t&&(0,i.parseExpression)(),(0,T.expect)(r.TokenType.colon)}else y(!0);(0,o.next)();var n=p.state.tokens.length;p.state.scopes.push(new s.Scope(e,n,!1)),p.state.scopeDepth--}function S(){(0,o.next)(),(0,i.parseExpression)(),(0,T.semicolon)()}function P(){if((0,o.next)(),L(),(0,o.match)(r.TokenType._catch)){(0,o.next)();var e=null;if((0,o.match)(r.TokenType.parenL)&&(p.state.scopeDepth++,e=p.state.tokens.length,(0,T.expect)(r.TokenType.parenL),(0,c.parseBindingAtom)(!0),(0,T.expect)(r.TokenType.parenR)),L(),null!=e){var t=p.state.tokens.length;p.state.scopes.push(new s.Scope(e,t,!1)),p.state.scopeDepth--}}(0,o.eat)(r.TokenType._finally)&&L()}function I(e){(0,o.next)(),B(!1,e),(0,T.semicolon)()}function K(){(0,o.next)(),(0,i.parseParenExpression)(),y(!1)}function D(){(0,o.next)()}function F(){y(!0)}function A(e){p.isTypeScriptEnabled?(0,n.tsParseIdentifierStatement)(e):p.isFlowEnabled?(0,t.flowParseIdentifierStatement)(e):(0,T.semicolon)()}function L(){arguments.length>0&&void 0!==arguments[0]&&arguments[0];var e=arguments.length>1&&void 0!==arguments[1]&&arguments[1],t=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,n=p.state.tokens.length;p.state.scopeDepth++,(0,T.expect)(r.TokenType.braceL),t&&(p.state.tokens[p.state.tokens.length-1].contextId=t),R(r.TokenType.braceR),t&&(p.state.tokens[p.state.tokens.length-1].contextId=t);var o=p.state.tokens.length;p.state.scopes.push(new s.Scope(n,o,e)),p.state.scopeDepth--}function R(e){for(;!(0,o.eat)(e)&&!p.state.error;)y(!0)}function q(){(0,T.expect)(r.TokenType.semi),(0,o.match)(r.TokenType.semi)||(0,i.parseExpression)(),(0,T.expect)(r.TokenType.semi),(0,o.match)(r.TokenType.parenR)||(0,i.parseExpression)(),(0,T.expect)(r.TokenType.parenR),y(!1)}function M(e){e?(0,T.eatContextual)(a.ContextualKeyword._of):(0,o.next)(),(0,i.parseExpression)(),(0,T.expect)(r.TokenType.parenR),y(!1)}function B(e,t){for(;;){if(z(t===r.TokenType._const||t===r.TokenType._let),(0,o.eat)(r.TokenType.eq)){var n=p.state.tokens.length-1;(0,i.parseMaybeAssign)(e),p.state.tokens[n].rhsEndIndex=p.state.tokens.length}if(!(0,o.eat)(r.TokenType.comma))break}}function z(e){(0,c.parseBindingAtom)(e),p.isTypeScriptEnabled?(0,n.tsAfterParseVarHead)():p.isFlowEnabled&&(0,t.flowAfterParseVarHead)()}function N(e,t){var n=arguments.length>2&&void 0!==arguments[2]&&arguments[2];(0,o.match)(r.TokenType.star)&&(0,o.next)(),!t||n||(0,o.match)(r.TokenType.name)||(0,o.match)(r.TokenType._yield)||(0,T.unexpected)();var a=null;(0,o.match)(r.TokenType.name)&&(t||(a=p.state.tokens.length,p.state.scopeDepth++),(0,c.parseBindingIdentifier)(!1));var l=p.state.tokens.length;p.state.scopeDepth++,V(),(0,i.parseFunctionBodyAndFinish)(e);var y=p.state.tokens.length;p.state.scopes.push(new s.Scope(l,y,!0)),p.state.scopeDepth--,null!==a&&(p.state.scopes.push(new s.Scope(a,y,!0)),p.state.scopeDepth--)}function V(){var e=arguments.length>0&&void 0!==arguments[0]&&arguments[0],o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;p.isTypeScriptEnabled?(0,n.tsStartParseFunctionParams)():p.isFlowEnabled&&(0,t.flowStartParseFunctionParams)(),(0,T.expect)(r.TokenType.parenL),o&&(p.state.tokens[p.state.tokens.length-1].contextId=o),(0,c.parseBindingList)(r.TokenType.parenR,!1,!1,e,o),o&&(p.state.tokens[p.state.tokens.length-1].contextId=o)}function H(e){var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1],n=(0,p.getNextContextId)();(0,o.next)(),p.state.tokens[p.state.tokens.length-1].contextId=n,p.state.tokens[p.state.tokens.length-1].isExpression=!e;var a=null;e||(a=p.state.tokens.length,p.state.scopeDepth++),Z(e,t),$();var r=p.state.tokens.length;if(U(n),!p.state.error&&(p.state.tokens[r].contextId=n,p.state.tokens[p.state.tokens.length-1].contextId=n,null!==a)){var i=p.state.tokens.length;p.state.scopes.push(new s.Scope(a,i,!1)),p.state.scopeDepth--}}function j(){return(0,o.match)(r.TokenType.eq)||(0,o.match)(r.TokenType.semi)||(0,o.match)(r.TokenType.braceR)||(0,o.match)(r.TokenType.bang)||(0,o.match)(r.TokenType.colon)}function O(){return(0,o.match)(r.TokenType.parenL)||(0,o.match)(r.TokenType.lessThan)}function U(e){for((0,T.expect)(r.TokenType.braceL);!(0,o.eat)(r.TokenType.braceR)&&!p.state.error;){if(!(0,o.eat)(r.TokenType.semi))if((0,o.match)(r.TokenType.at))d();else W(p.state.start,e)}}function W(e,t){p.isTypeScriptEnabled&&((0,T.eatContextual)(a.ContextualKeyword._declare),(0,n.tsParseAccessModifier)(),(0,T.eatContextual)(a.ContextualKeyword._declare));var s=!1;if((0,o.match)(r.TokenType.name)&&p.state.contextualKeyword===a.ContextualKeyword._static){if((0,i.parseIdentifier)(),O())return void J(e,!1);if(j())return void Y();p.state.tokens[p.state.tokens.length-1].type=r.TokenType._static,s=!0}G(e,s,t)}function G(e,t,s){if(!p.isTypeScriptEnabled||!(0,n.tsTryParseClassMemberWithIsStatic)(t,s)){if((0,o.eat)(r.TokenType.star))return Q(s),void J(e,!1);Q(s);var i=!1,c=p.state.tokens[p.state.tokens.length-1];if(c.contextualKeyword===a.ContextualKeyword._constructor&&(i=!0),X(),O())J(e,i);else if(j())Y();else if(c.contextualKeyword!==a.ContextualKeyword._async||(0,T.isLineTerminator)())c.contextualKeyword!==a.ContextualKeyword._get&&c.contextualKeyword!==a.ContextualKeyword._set||(0,T.isLineTerminator)()&&(0,o.match)(r.TokenType.star)?(0,T.isLineTerminator)()?Y():(0,T.unexpected)():(c.contextualKeyword===a.ContextualKeyword._get?p.state.tokens[p.state.tokens.length-1].type=r.TokenType._get:p.state.tokens[p.state.tokens.length-1].type=r.TokenType._set,Q(s),J(e,!1));else{p.state.tokens[p.state.tokens.length-1].type=r.TokenType._async,(0,o.match)(r.TokenType.star)&&(0,o.next)(),Q(s),X(),J(e,!1)}}}function J(e,a){p.isTypeScriptEnabled?(0,n.tsTryParseTypeParameters)():p.isFlowEnabled&&(0,o.match)(r.TokenType.lessThan)&&(0,t.flowParseTypeParameterDeclaration)(),(0,i.parseMethod)(e,a)}function Q(e){(0,i.parsePropertyName)(e)}function X(){if(p.isTypeScriptEnabled){var e=(0,o.pushTypeContext)(0);(0,o.eat)(r.TokenType.question),(0,o.popTypeContext)(e)}}function Y(){if(p.isTypeScriptEnabled?((0,o.eat)(r.TokenType.bang),(0,n.tsTryParseTypeAnnotation)()):p.isFlowEnabled&&(0,o.match)(r.TokenType.colon)&&(0,t.flowParseTypeAnnotation)(),(0,o.match)(r.TokenType.eq)){var e=p.state.tokens.length;(0,o.next)(),(0,i.parseMaybeAssign)(),p.state.tokens[e].rhsEndIndex=p.state.tokens.length}(0,T.semicolon)()}function Z(e){var s=arguments.length>1&&void 0!==arguments[1]&&arguments[1];p.isTypeScriptEnabled&&(!e||s)&&(0,T.isContextual)(a.ContextualKeyword._implements)||((0,o.match)(r.TokenType.name)&&(0,c.parseBindingIdentifier)(!0),p.isTypeScriptEnabled?(0,n.tsTryParseTypeParameters)():p.isFlowEnabled&&(0,o.match)(r.TokenType.lessThan)&&(0,t.flowParseTypeParameterDeclaration)())}function $(){var e=!1;(0,o.eat)(r.TokenType._extends)?((0,i.parseExprSubscripts)(),e=!0):e=!1,p.isTypeScriptEnabled?(0,n.tsAfterParseClassSuper)(e):p.isFlowEnabled&&(0,t.flowAfterParseClassSuper)(e)}function ee(){var e=p.state.tokens.length-1;p.isTypeScriptEnabled&&(0,n.tsTryParseExport)()||(re()?pe():oe()?((0,i.parseIdentifier)(),(0,o.match)(r.TokenType.comma)&&(0,o.lookaheadType)()===r.TokenType.star?((0,T.expect)(r.TokenType.comma),(0,T.expect)(r.TokenType.star),(0,T.expectContextual)(a.ContextualKeyword._as),(0,i.parseIdentifier)()):ae(),se()):(0,o.eat)(r.TokenType._default)?te():Te()?ne():(le(),se()),p.state.tokens[e].rhsEndIndex=p.state.tokens.length)}function te(){if(!p.isTypeScriptEnabled||!(0,n.tsTryParseExportDefaultExpression)()){var e=p.state.start;(0,o.eat)(r.TokenType._function)?N(e,!0,!0):(0,T.isContextual)(a.ContextualKeyword._async)&&(0,o.lookaheadType)()===r.TokenType._function?((0,T.eatContextual)(a.ContextualKeyword._async),(0,o.eat)(r.TokenType._function),N(e,!0,!0)):(0,o.match)(r.TokenType._class)?H(!0,!0):(0,o.match)(r.TokenType.at)?(k(),H(!0,!0)):((0,i.parseMaybeAssign)(),(0,T.semicolon)())}}function ne(){p.isTypeScriptEnabled?(0,n.tsParseExportDeclaration)():p.isFlowEnabled?(0,t.flowParseExportDeclaration)():y(!0)}function oe(){if(p.isTypeScriptEnabled&&(0,n.tsIsDeclarationStart)())return!1;if(p.isFlowEnabled&&(0,t.flowShouldDisallowExportDefaultSpecifier)())return!1;if((0,o.match)(r.TokenType.name))return p.state.contextualKeyword!==a.ContextualKeyword._async;if(!(0,o.match)(r.TokenType._default))return!1;var e=(0,o.lookaheadTypeAndKeyword)();return e.type===r.TokenType.comma||e.type===r.TokenType.name&&e.contextualKeyword===a.ContextualKeyword._from}function ae(){(0,o.eat)(r.TokenType.comma)&&le()}function se(){(0,T.eatContextual)(a.ContextualKeyword._from)&&(0,i.parseExprAtom)(),(0,T.semicolon)()}function re(){return p.isFlowEnabled?(0,t.flowShouldParseExportStar)():(0,o.match)(r.TokenType.star)}function pe(){p.isFlowEnabled?(0,t.flowParseExportStar)():ie()}function ie(){(0,T.expect)(r.TokenType.star),(0,T.isContextual)(a.ContextualKeyword._as)?ce():se()}function ce(){(0,o.next)(),p.state.tokens[p.state.tokens.length-1].type=r.TokenType._as,(0,i.parseIdentifier)(),ae(),se()}function Te(){return p.isTypeScriptEnabled&&(0,n.tsIsDeclarationStart)()||p.isFlowEnabled&&(0,t.flowShouldParseExportDeclaration)()||p.state.type===r.TokenType._var||p.state.type===r.TokenType._const||p.state.type===r.TokenType._let||p.state.type===r.TokenType._function||p.state.type===r.TokenType._class||(0,T.isContextual)(a.ContextualKeyword._async)||(0,o.match)(r.TokenType.at)}function le(){var e=!0;for((0,T.expect)(r.TokenType.braceL);!(0,o.eat)(r.TokenType.braceR)&&!p.state.error;){if(e)e=!1;else if((0,T.expect)(r.TokenType.comma),(0,o.eat)(r.TokenType.braceR))break;(0,i.parseIdentifier)(),p.state.tokens[p.state.tokens.length-1].identifierRole=o.IdentifierRole.ExportAccess,(0,T.eatContextual)(a.ContextualKeyword._as)&&(0,i.parseIdentifier)()}}function ye(){p.isTypeScriptEnabled&&(0,o.match)(r.TokenType.name)&&(0,o.lookaheadType)()===r.TokenType.eq?(0,n.tsParseImportEqualsDeclaration)():(p.isTypeScriptEnabled&&(0,T.eatContextual)(a.ContextualKeyword._type),(0,o.match)(r.TokenType.string)?(0,i.parseExprAtom)():(de(),(0,T.expectContextual)(a.ContextualKeyword._from),(0,i.parseExprAtom)()),(0,T.semicolon)())}function ue(){return(0,o.match)(r.TokenType.name)}function ke(){(0,c.parseImportedIdentifier)()}function de(){p.isFlowEnabled&&(0,t.flowStartParseImportSpecifiers)();var e=!0;if(!ue()||(ke(),(0,o.eat)(r.TokenType.comma))){if((0,o.match)(r.TokenType.star))return(0,o.next)(),(0,T.expectContextual)(a.ContextualKeyword._as),void ke();for((0,T.expect)(r.TokenType.braceL);!(0,o.eat)(r.TokenType.braceR)&&!p.state.error;){if(e)e=!1;else if((0,o.eat)(r.TokenType.colon)&&(0,T.unexpected)("ES2015 named imports do not destructure. Use another statement for destructuring after the import."),(0,T.expect)(r.TokenType.comma),(0,o.eat)(r.TokenType.braceR))break;xe()}}}function xe(){p.isFlowEnabled?(0,t.flowParseImportSpecifier)():((0,c.parseImportedIdentifier)(),(0,T.isContextual)(a.ContextualKeyword._as)&&(p.state.tokens[p.state.tokens.length-1].identifierRole=o.IdentifierRole.ImportAccess,(0,o.next)(),(0,c.parseImportedIdentifier)()))}
},{"../index":"nAG2","../plugins/flow":"nAYr","../plugins/typescript":"PJ8T","../tokenizer":"zEJU","../tokenizer/keywords":"GGTW","../tokenizer/state":"Z7yX","../tokenizer/types":"sS1T","./base":"WaVM","./expression":"dXGT","./lval":"yj5C","./util":"Z5xF"}],"aWUt":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.parseFile=n;var e=require("../tokenizer/index"),r=require("../util/charcodes"),t=require("./base"),i=require("./statement");function n(){return 0===t.state.pos&&t.input.charCodeAt(0)===r.charCodes.numberSign&&t.input.charCodeAt(1)===r.charCodes.exclamationMark&&(0,e.skipLineComment)(2),(0,e.nextToken)(),(0,i.parseTopLevel)()}
},{"../tokenizer/index":"zEJU","../util/charcodes":"EwSx","./base":"WaVM","./statement":"JoXu"}],"nAG2":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.parse=o,exports.File=void 0;var r=require("./traverser/base"),e=require("./traverser/index");function t(r,e){if(!(r instanceof e))throw new TypeError("Cannot call a class as a function")}var s=function r(e,s){t(this,r),this.tokens=e,this.scopes=s};function o(t,s,o,i){if(i&&o)throw new Error("Cannot combine flow and typescript plugins.");(0,r.initParser)(t,s,o,i);var n=(0,e.parseFile)();if(r.state.error)throw(0,r.augmentError)(r.state.error);return n}exports.File=s;
},{"./traverser/base":"WaVM","./traverser/index":"aWUt"}],"l4nX":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=t;var e=require("../parser/tokenizer/keywords");function t(t){var r=t.currentIndex(),n=0,o=t.currentToken();do{var i=t.tokens[r];if(i.isOptionalChainStart&&n++,i.isOptionalChainEnd&&n--,n+=i.numNullishCoalesceStarts,n-=i.numNullishCoalesceEnds,i.contextualKeyword===e.ContextualKeyword._await&&null==i.identifierRole&&i.scopeDepth===o.scopeDepth)return!0;r+=1}while(n>0&&r<t.tokens.length);return!1}
},{"../parser/tokenizer/keywords":"GGTW"}],"pI6e":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("./parser/tokenizer/types"),t=n(require("./util/isAsyncOperation"));function n(e){return e&&e.__esModule?e:{default:e}}function i(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function s(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}function o(e,t,n){return t&&s(e.prototype,t),n&&s(e,n),e}var r=function(){function n(e,t,s,o){i(this,n),this.code=e,this.tokens=t,this.isFlowEnabled=s,this.helperManager=o,n.prototype.__init.call(this),n.prototype.__init2.call(this)}return o(n,[{key:"__init",value:function(){this.resultCode=""}},{key:"__init2",value:function(){this.tokenIndex=0}}]),o(n,[{key:"snapshot",value:function(){return{resultCode:this.resultCode,tokenIndex:this.tokenIndex}}},{key:"restoreToSnapshot",value:function(e){this.resultCode=e.resultCode,this.tokenIndex=e.tokenIndex}},{key:"getResultCodeIndex",value:function(){return this.resultCode.length}},{key:"reset",value:function(){this.resultCode="",this.tokenIndex=0}},{key:"matchesContextualAtIndex",value:function(t,n){return this.matches1AtIndex(t,e.TokenType.name)&&this.tokens[t].contextualKeyword===n}},{key:"identifierNameAtIndex",value:function(e){return this.identifierNameForToken(this.tokens[e])}},{key:"identifierName",value:function(){return this.identifierNameForToken(this.currentToken())}},{key:"identifierNameForToken",value:function(e){return this.code.slice(e.start,e.end)}},{key:"rawCodeForToken",value:function(e){return this.code.slice(e.start,e.end)}},{key:"stringValueAtIndex",value:function(e){return this.stringValueForToken(this.tokens[e])}},{key:"stringValue",value:function(){return this.stringValueForToken(this.currentToken())}},{key:"stringValueForToken",value:function(e){return this.code.slice(e.start+1,e.end-1)}},{key:"matches1AtIndex",value:function(e,t){return this.tokens[e].type===t}},{key:"matches2AtIndex",value:function(e,t,n){return this.tokens[e].type===t&&this.tokens[e+1].type===n}},{key:"matches3AtIndex",value:function(e,t,n,i){return this.tokens[e].type===t&&this.tokens[e+1].type===n&&this.tokens[e+2].type===i}},{key:"matches1",value:function(e){return this.tokens[this.tokenIndex].type===e}},{key:"matches2",value:function(e,t){return this.tokens[this.tokenIndex].type===e&&this.tokens[this.tokenIndex+1].type===t}},{key:"matches3",value:function(e,t,n){return this.tokens[this.tokenIndex].type===e&&this.tokens[this.tokenIndex+1].type===t&&this.tokens[this.tokenIndex+2].type===n}},{key:"matches4",value:function(e,t,n,i){return this.tokens[this.tokenIndex].type===e&&this.tokens[this.tokenIndex+1].type===t&&this.tokens[this.tokenIndex+2].type===n&&this.tokens[this.tokenIndex+3].type===i}},{key:"matches5",value:function(e,t,n,i,s){return this.tokens[this.tokenIndex].type===e&&this.tokens[this.tokenIndex+1].type===t&&this.tokens[this.tokenIndex+2].type===n&&this.tokens[this.tokenIndex+3].type===i&&this.tokens[this.tokenIndex+4].type===s}},{key:"matchesContextual",value:function(e){return this.matchesContextualAtIndex(this.tokenIndex,e)}},{key:"matchesContextIdAndLabel",value:function(e,t){return this.matches1(e)&&this.currentToken().contextId===t}},{key:"previousWhitespaceAndComments",value:function(){var e=this.code.slice(this.tokenIndex>0?this.tokens[this.tokenIndex-1].end:0,this.tokenIndex<this.tokens.length?this.tokens[this.tokenIndex].start:this.code.length);return this.isFlowEnabled&&(e=e.replace(/@flow/g,"")),e}},{key:"replaceToken",value:function(e){this.resultCode+=this.previousWhitespaceAndComments(),this.appendTokenPrefix(),this.resultCode+=e,this.appendTokenSuffix(),this.tokenIndex++}},{key:"replaceTokenTrimmingLeftWhitespace",value:function(e){this.resultCode+=this.previousWhitespaceAndComments().replace(/[^\r\n]/g,""),this.appendTokenPrefix(),this.resultCode+=e,this.appendTokenSuffix(),this.tokenIndex++}},{key:"removeInitialToken",value:function(){this.replaceToken("")}},{key:"removeToken",value:function(){this.replaceTokenTrimmingLeftWhitespace("")}},{key:"copyExpectedToken",value:function(e){if(this.tokens[this.tokenIndex].type!==e)throw new Error("Expected token ".concat(e));this.copyToken()}},{key:"copyToken",value:function(){this.resultCode+=this.previousWhitespaceAndComments(),this.appendTokenPrefix(),this.resultCode+=this.code.slice(this.tokens[this.tokenIndex].start,this.tokens[this.tokenIndex].end),this.appendTokenSuffix(),this.tokenIndex++}},{key:"copyTokenWithPrefix",value:function(e){this.resultCode+=this.previousWhitespaceAndComments(),this.appendTokenPrefix(),this.resultCode+=e,this.resultCode+=this.code.slice(this.tokens[this.tokenIndex].start,this.tokens[this.tokenIndex].end),this.appendTokenSuffix(),this.tokenIndex++}},{key:"appendTokenPrefix",value:function(){var n=this.currentToken();if((n.numNullishCoalesceStarts||n.isOptionalChainStart)&&(n.isAsyncOperation=(0,t.default)(this)),n.numNullishCoalesceStarts)for(var i=0;i<n.numNullishCoalesceStarts;i++)n.isAsyncOperation?(this.resultCode+="await ",this.resultCode+=this.helperManager.getHelperName("asyncNullishCoalesce")):this.resultCode+=this.helperManager.getHelperName("nullishCoalesce"),this.resultCode+="(";n.isOptionalChainStart&&(n.isAsyncOperation&&(this.resultCode+="await "),this.tokenIndex>0&&this.tokenAtRelativeIndex(-1).type===e.TokenType._delete?n.isAsyncOperation?this.resultCode+=this.helperManager.getHelperName("asyncOptionalChainDelete"):this.resultCode+=this.helperManager.getHelperName("optionalChainDelete"):n.isAsyncOperation?this.resultCode+=this.helperManager.getHelperName("asyncOptionalChain"):this.resultCode+=this.helperManager.getHelperName("optionalChain"),this.resultCode+="([")}},{key:"appendTokenSuffix",value:function(){var e=this.currentToken();if(e.isOptionalChainEnd&&(this.resultCode+="])"),e.numNullishCoalesceEnds)for(var t=0;t<e.numNullishCoalesceEnds;t++)this.resultCode+="))"}},{key:"appendCode",value:function(e){this.resultCode+=e}},{key:"currentToken",value:function(){return this.tokens[this.tokenIndex]}},{key:"currentTokenCode",value:function(){var e=this.currentToken();return this.code.slice(e.start,e.end)}},{key:"tokenAtRelativeIndex",value:function(e){return this.tokens[this.tokenIndex+e]}},{key:"currentIndex",value:function(){return this.tokenIndex}},{key:"nextToken",value:function(){if(this.tokenIndex===this.tokens.length)throw new Error("Unexpectedly reached end of input.");this.tokenIndex++}},{key:"previousToken",value:function(){this.tokenIndex--}},{key:"finish",value:function(){if(this.tokenIndex!==this.tokens.length)throw new Error("Tried to finish processing tokens before reaching the end.");return this.resultCode+=this.previousWhitespaceAndComments(),this.resultCode}},{key:"isAtEnd",value:function(){return this.tokenIndex===this.tokens.length}}]),n}();exports.default=r;
},{"./parser/tokenizer/types":"sS1T","./util/isAsyncOperation":"l4nX"}],"fDA4":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=t;var e=require("../parser/tokenizer/keywords"),n=require("../parser/tokenizer/types");function t(t,a,T){var i=a.snapshot(),u=r(a),k=[],p=[],x=[],l=null,d=[],f=[],y=a.currentToken().contextId;if(null==y)throw new Error("Expected non-null class context ID on class open-brace.");for(a.nextToken();!a.matchesContextIdAndLabel(n.TokenType.braceR,y);)if(a.matchesContextual(e.ContextualKeyword._constructor)&&!a.currentToken().isType){var I=o(a);k=I.constructorInitializerStatements,l=I.constructorInsertPos}else if(a.matches1(n.TokenType.semi))f.push({start:a.currentIndex(),end:a.currentIndex()+1}),a.nextToken();else if(a.currentToken().isType)a.nextToken();else{for(var m=a.currentIndex(),h=!1;s(a.currentToken());)a.matches1(n.TokenType._static)&&(h=!0),a.nextToken();if(a.matchesContextual(e.ContextualKeyword._constructor)&&!a.currentToken().isType){var v=o(a);k=v.constructorInitializerStatements,l=v.constructorInsertPos;continue}var E=a.currentIndex();if(c(a),a.matches1(n.TokenType.lessThan)||a.matches1(n.TokenType.parenL)){for(;a.currentToken().contextId!==y;)a.nextToken();for(;s(a.tokenAtRelativeIndex(-1));)a.previousToken();continue}for(;a.currentToken().isType;)a.nextToken();if(a.matches1(n.TokenType.eq)){var _=a.currentIndex(),w=a.currentToken().rhsEndIndex;if(null==w)throw new Error("Expected rhsEndIndex on class field assignment.");for(a.nextToken();a.currentIndex()<w;)t.processToken();var b=void 0;h?(b=T.claimFreeName("__initStatic"),x.push(b)):(b=T.claimFreeName("__init"),p.push(b)),d.push({initializerName:b,equalsIndex:_,start:E,end:a.currentIndex()})}else f.push({start:m,end:a.currentIndex()})}return a.restoreToSnapshot(i),{headerInfo:u,constructorInitializerStatements:k,instanceInitializerNames:p,staticInitializerNames:x,constructorInsertPos:l,fields:d,rangesToRemove:f}}function r(e){var t=e.currentToken(),r=t.contextId;if(null==r)throw new Error("Expected context ID on class token.");var o=t.isExpression;if(null==o)throw new Error("Expected isExpression on class token.");var s=null,c=!1;for(e.nextToken(),e.matches1(n.TokenType.name)&&(s=e.identifierName());!e.matchesContextIdAndLabel(n.TokenType.braceL,r);)e.matches1(n.TokenType._extends)&&!e.currentToken().isType&&(c=!0),e.nextToken();return{isExpression:o,className:s,hasSuperclass:c}}function o(e){var t=[];e.nextToken();var r=e.currentToken().contextId;if(null==r)throw new Error("Expected context ID on open-paren starting constructor params.");for(;!e.matchesContextIdAndLabel(n.TokenType.parenR,r);)if(e.currentToken().contextId===r){if(e.nextToken(),s(e.currentToken())){for(e.nextToken();s(e.currentToken());)e.nextToken();var o=e.currentToken();if(o.type!==n.TokenType.name)throw new Error("Expected identifier after access modifiers in constructor arg.");var c=e.identifierNameForToken(o);t.push("this.".concat(c," = ").concat(c))}}else e.nextToken();e.nextToken();for(var a=e.currentIndex(),T=!1;!e.matchesContextIdAndLabel(n.TokenType.braceR,r);){if(!T&&e.matches2(n.TokenType._super,n.TokenType.parenL)){e.nextToken();var i=e.currentToken().contextId;if(null==i)throw new Error("Expected a context ID on the super call");for(;!e.matchesContextIdAndLabel(n.TokenType.parenR,i);)e.nextToken();a=e.currentIndex(),T=!0}e.nextToken()}return e.nextToken(),{constructorInitializerStatements:t,constructorInsertPos:a}}function s(e){return[n.TokenType._async,n.TokenType._get,n.TokenType._set,n.TokenType.plus,n.TokenType.minus,n.TokenType._readonly,n.TokenType._static,n.TokenType._public,n.TokenType._private,n.TokenType._protected,n.TokenType._abstract,n.TokenType.star,n.TokenType._declare].includes(e.type)}function c(e){if(e.matches1(n.TokenType.bracketL)){var t=e.currentToken().contextId;if(null==t)throw new Error("Expected class context ID on computed name open bracket.");for(;!e.matchesContextIdAndLabel(n.TokenType.bracketR,t);)e.nextToken();e.nextToken()}else e.nextToken()}
},{"../parser/tokenizer/keywords":"GGTW","../parser/tokenizer/types":"sS1T"}],"WiIy":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=o;var e=require("../parser/tokenizer/types");function o(o){if(o.removeInitialToken(),o.removeToken(),o.removeToken(),o.removeToken(),o.matches1(e.TokenType.parenL))o.removeToken(),o.removeToken(),o.removeToken();else for(;o.matches1(e.TokenType.dot);)o.removeToken(),o.removeToken()}
},{"../parser/tokenizer/types":"sS1T"}],"jVbB":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=a,exports.EMPTY_DECLARATION_INFO=void 0;var e=require("../parser/tokenizer"),r=require("../parser/tokenizer/types"),t={typeDeclarations:new Set,valueDeclarations:new Set};function a(t){for(var a=new Set,n=new Set,o=0;o<t.tokens.length;o++){var i=t.tokens[o];i.type===r.TokenType.name&&(0,e.isTopLevelDeclaration)(i)&&(i.isType?a.add(t.identifierNameForToken(i)):n.add(t.identifierNameForToken(i)))}return{typeDeclarations:a,valueDeclarations:n}}exports.EMPTY_DECLARATION_INFO=t;
},{"../parser/tokenizer":"zEJU","../parser/tokenizer/types":"sS1T"}],"pV7C":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=r;var e=require("../parser/tokenizer/types");function r(r,n,t){if(!r)return!1;var o=n.currentToken();if(null==o.rhsEndIndex)throw new Error("Expected non-null rhsEndIndex on export token.");var a=o.rhsEndIndex-n.currentIndex();if(3!==a&&(4!==a||!n.matches1AtIndex(o.rhsEndIndex-1,e.TokenType.semi)))return!1;var s=n.tokenAtRelativeIndex(2);if(s.type!==e.TokenType.name)return!1;var d=n.identifierNameForToken(s);return t.typeDeclarations.has(d)&&!t.valueDeclarations.has(d)}
},{"../parser/tokenizer/types":"sS1T"}],"FsEu":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("../parser/tokenizer"),t=require("../parser/tokenizer/keywords"),o=require("../parser/tokenizer/types"),n=a(require("../util/elideImportEquals")),s=a(require("../util/getDeclarationInfo")),r=a(require("../util/shouldElideDefaultExport")),i=a(require("./Transformer"));function a(e){return e&&e.__esModule?e:{default:e}}function k(e){return(k="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function c(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function p(e,t){for(var o=0;o<t.length;o++){var n=t[o];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}function h(e,t,o){return t&&p(e.prototype,t),o&&p(e,o),e}function T(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&m(e,t)}function m(e,t){return(m=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function u(e){var t=f();return function(){var o,n=d(e);if(t){var s=d(this).constructor;o=Reflect.construct(n,arguments,s)}else o=n.apply(this,arguments);return y(this,o)}}function y(e,t){return!t||"object"!==k(t)&&"function"!=typeof t?l(e):t}function l(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function f(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}function d(e){return(d=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}var x=function(a){T(p,i.default);var k=u(p);function p(e,t,o,n,r,i,a){var h;return c(this,p),(h=k.call(this)).rootTransformer=e,h.tokens=t,h.importProcessor=o,h.nameManager=n,h.reactHotLoaderTransformer=r,h.enableLegacyBabel5ModuleInterop=i,h.isTypeScriptTransformEnabled=a,p.prototype.__init.call(l(h)),p.prototype.__init2.call(l(h)),p.prototype.__init3.call(l(h)),h.declarationInfo=a?(0,s.default)(t):s.EMPTY_DECLARATION_INFO,h}return h(p,[{key:"__init",value:function(){this.hadExport=!1}},{key:"__init2",value:function(){this.hadNamedExport=!1}},{key:"__init3",value:function(){this.hadDefaultExport=!1}}]),h(p,[{key:"getPrefixCode",value:function(){var e="";return this.hadExport&&(e+='Object.defineProperty(exports, "__esModule", {value: true});'),e}},{key:"getSuffixCode",value:function(){return this.enableLegacyBabel5ModuleInterop&&this.hadDefaultExport&&!this.hadNamedExport?"\nmodule.exports = exports.default;\n":""}},{key:"process",value:function(){return this.tokens.matches3(o.TokenType._import,o.TokenType.name,o.TokenType.eq)?this.processImportEquals():this.tokens.matches1(o.TokenType._import)?(this.processImport(),!0):this.tokens.matches2(o.TokenType._export,o.TokenType.eq)?(this.tokens.replaceToken("module.exports"),!0):this.tokens.matches1(o.TokenType._export)&&!this.tokens.currentToken().isType?(this.hadExport=!0,this.processExport()):!(!this.tokens.matches2(o.TokenType.name,o.TokenType.postIncDec)||!this.processPostIncDec())||(this.tokens.matches1(o.TokenType.name)||this.tokens.matches1(o.TokenType.jsxName)?this.processIdentifier():this.tokens.matches1(o.TokenType.eq)?this.processAssignment():this.tokens.matches1(o.TokenType.assign)?this.processComplexAssignment():!!this.tokens.matches1(o.TokenType.preIncDec)&&this.processPreIncDec())}},{key:"processImportEquals",value:function(){var e=this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+1);return this.importProcessor.isTypeName(e)?(0,n.default)(this.tokens):this.tokens.replaceToken("const"),!0}},{key:"processImport",value:function(){if(this.tokens.matches2(o.TokenType._import,o.TokenType.parenL)){this.tokens.replaceToken("Promise.resolve().then(() => require");var e=this.tokens.currentToken().contextId;if(null==e)throw new Error("Expected context ID on dynamic import invocation.");for(this.tokens.copyToken();!this.tokens.matchesContextIdAndLabel(o.TokenType.parenR,e);)this.rootTransformer.processToken();this.tokens.replaceToken("))")}else{if(this.removeImportAndDetectIfType())this.tokens.removeToken();else{var t=this.tokens.stringValue();this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(t)),this.tokens.appendCode(this.importProcessor.claimImportCode(t))}this.tokens.matches1(o.TokenType.semi)&&this.tokens.removeToken()}}},{key:"removeImportAndDetectIfType",value:function(){if(this.tokens.removeInitialToken(),this.tokens.matchesContextual(t.ContextualKeyword._type)&&!this.tokens.matches1AtIndex(this.tokens.currentIndex()+1,o.TokenType.comma)&&!this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+1,t.ContextualKeyword._from))return this.removeRemainingImport(),!0;if(this.tokens.matches1(o.TokenType.name)||this.tokens.matches1(o.TokenType.star))return this.removeRemainingImport(),!1;if(this.tokens.matches1(o.TokenType.string))return!1;for(var e=!1;!this.tokens.matches1(o.TokenType.string);)(!e&&this.tokens.matches1(o.TokenType.braceL)||this.tokens.matches1(o.TokenType.comma))&&(this.tokens.removeToken(),(this.tokens.matches2(o.TokenType.name,o.TokenType.comma)||this.tokens.matches2(o.TokenType.name,o.TokenType.braceR)||this.tokens.matches4(o.TokenType.name,o.TokenType.name,o.TokenType.name,o.TokenType.comma)||this.tokens.matches4(o.TokenType.name,o.TokenType.name,o.TokenType.name,o.TokenType.braceR))&&(e=!0)),this.tokens.removeToken();return!e}},{key:"removeRemainingImport",value:function(){for(;!this.tokens.matches1(o.TokenType.string);)this.tokens.removeToken()}},{key:"processIdentifier",value:function(){var t=this.tokens.currentToken();if(t.shadowsGlobal)return!1;if(t.identifierRole===e.IdentifierRole.ObjectShorthand)return this.processObjectShorthand();if(t.identifierRole!==e.IdentifierRole.Access)return!1;var n=this.importProcessor.getIdentifierReplacement(this.tokens.identifierNameForToken(t));if(!n)return!1;for(var s=this.tokens.currentIndex()+1;s<this.tokens.tokens.length&&this.tokens.tokens[s].type===o.TokenType.parenR;)s++;return this.tokens.tokens[s].type===o.TokenType.parenL?this.tokens.tokenAtRelativeIndex(1).type===o.TokenType.parenL&&this.tokens.tokenAtRelativeIndex(-1).type!==o.TokenType._new?(this.tokens.replaceToken("".concat(n,".call(void 0, ")),this.tokens.removeToken(),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(o.TokenType.parenR)):this.tokens.replaceToken("(0, ".concat(n,")")):this.tokens.replaceToken(n),!0}},{key:"processObjectShorthand",value:function(){var e=this.tokens.identifierName(),t=this.importProcessor.getIdentifierReplacement(e);return!!t&&(this.tokens.replaceToken("".concat(e,": ").concat(t)),!0)}},{key:"processExport",value:function(){if(this.tokens.matches2(o.TokenType._export,o.TokenType._enum)||this.tokens.matches3(o.TokenType._export,o.TokenType._const,o.TokenType._enum))return!1;if(this.tokens.matches2(o.TokenType._export,o.TokenType._default))return this.processExportDefault(),this.hadDefaultExport=!0,!0;if(this.hadNamedExport=!0,this.tokens.matches2(o.TokenType._export,o.TokenType._var)||this.tokens.matches2(o.TokenType._export,o.TokenType._let)||this.tokens.matches2(o.TokenType._export,o.TokenType._const))return this.processExportVar(),!0;if(this.tokens.matches2(o.TokenType._export,o.TokenType._function)||this.tokens.matches3(o.TokenType._export,o.TokenType.name,o.TokenType._function))return this.processExportFunction(),!0;if(this.tokens.matches2(o.TokenType._export,o.TokenType._class)||this.tokens.matches3(o.TokenType._export,o.TokenType._abstract,o.TokenType._class))return this.processExportClass(),!0;if(this.tokens.matches2(o.TokenType._export,o.TokenType.braceL))return this.processExportBindings(),!0;if(this.tokens.matches2(o.TokenType._export,o.TokenType.star))return this.processExportStar(),!0;if(this.tokens.matches3(o.TokenType._export,o.TokenType.name,o.TokenType.braceL)&&this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+1,t.ContextualKeyword._type)){for(this.tokens.removeInitialToken();!this.tokens.matches1(o.TokenType.braceR);)this.tokens.removeToken();return this.tokens.removeToken(),this.tokens.matchesContextual(t.ContextualKeyword._from)&&this.tokens.matches1AtIndex(this.tokens.currentIndex()+1,o.TokenType.string)&&(this.tokens.removeToken(),this.tokens.removeToken()),!0}throw new Error("Unrecognized export syntax.")}},{key:"processAssignment",value:function(){var e=this.tokens.currentIndex(),t=this.tokens.tokens[e-1];if(t.isType||t.type!==o.TokenType.name)return!1;if(t.shadowsGlobal)return!1;if(e>=2&&this.tokens.matches1AtIndex(e-2,o.TokenType.dot))return!1;if(e>=2&&[o.TokenType._var,o.TokenType._let,o.TokenType._const].includes(this.tokens.tokens[e-2].type))return!1;var n=this.importProcessor.resolveExportBinding(this.tokens.identifierNameForToken(t));return!!n&&(this.tokens.copyToken(),this.tokens.appendCode(" ".concat(n," =")),!0)}},{key:"processComplexAssignment",value:function(){var e=this.tokens.currentIndex(),t=this.tokens.tokens[e-1];if(t.type!==o.TokenType.name)return!1;if(t.shadowsGlobal)return!1;if(e>=2&&this.tokens.matches1AtIndex(e-2,o.TokenType.dot))return!1;var n=this.importProcessor.resolveExportBinding(this.tokens.identifierNameForToken(t));return!!n&&(this.tokens.appendCode(" = ".concat(n)),this.tokens.copyToken(),!0)}},{key:"processPreIncDec",value:function(){var e=this.tokens.currentIndex(),t=this.tokens.tokens[e+1];if(t.type!==o.TokenType.name)return!1;if(t.shadowsGlobal)return!1;if(e+2<this.tokens.tokens.length&&(this.tokens.matches1AtIndex(e+2,o.TokenType.dot)||this.tokens.matches1AtIndex(e+2,o.TokenType.bracketL)||this.tokens.matches1AtIndex(e+2,o.TokenType.parenL)))return!1;var n=this.tokens.identifierNameForToken(t),s=this.importProcessor.resolveExportBinding(n);return!!s&&(this.tokens.appendCode("".concat(s," = ")),this.tokens.copyToken(),!0)}},{key:"processPostIncDec",value:function(){var e=this.tokens.currentIndex(),t=this.tokens.tokens[e],n=this.tokens.tokens[e+1];if(t.type!==o.TokenType.name)return!1;if(t.shadowsGlobal)return!1;if(e>=1&&this.tokens.matches1AtIndex(e-1,o.TokenType.dot))return!1;var s=this.tokens.identifierNameForToken(t),r=this.importProcessor.resolveExportBinding(s);if(!r)return!1;var i=this.tokens.rawCodeForToken(n),a=this.importProcessor.getIdentifierReplacement(s)||s;if("++"===i)this.tokens.replaceToken("(".concat(a," = ").concat(r," = ").concat(a," + 1, ").concat(a," - 1)"));else{if("--"!==i)throw new Error("Unexpected operator: ".concat(i));this.tokens.replaceToken("(".concat(a," = ").concat(r," = ").concat(a," - 1, ").concat(a," + 1)"))}return this.tokens.removeToken(),!0}},{key:"processExportDefault",value:function(){if(this.tokens.matches4(o.TokenType._export,o.TokenType._default,o.TokenType._function,o.TokenType.name)||this.tokens.matches5(o.TokenType._export,o.TokenType._default,o.TokenType.name,o.TokenType._function,o.TokenType.name)){this.tokens.removeInitialToken(),this.tokens.removeToken();var e=this.processNamedFunction();this.tokens.appendCode(" exports.default = ".concat(e,";"))}else if(this.tokens.matches4(o.TokenType._export,o.TokenType._default,o.TokenType._class,o.TokenType.name)||this.tokens.matches5(o.TokenType._export,o.TokenType._default,o.TokenType._abstract,o.TokenType._class,o.TokenType.name)){this.tokens.removeInitialToken(),this.tokens.removeToken(),this.tokens.matches1(o.TokenType._abstract)&&this.tokens.removeToken();var t=this.rootTransformer.processNamedClass();this.tokens.appendCode(" exports.default = ".concat(t,";"))}else{if(this.tokens.matches3(o.TokenType._export,o.TokenType._default,o.TokenType.at))throw new Error("Export default statements with decorators are not yet supported.");if((0,r.default)(this.isTypeScriptTransformEnabled,this.tokens,this.declarationInfo))this.tokens.removeInitialToken(),this.tokens.removeToken(),this.tokens.removeToken();else if(this.reactHotLoaderTransformer){var n=this.nameManager.claimFreeName("_default");this.tokens.replaceToken("let ".concat(n,"; exports.")),this.tokens.copyToken(),this.tokens.appendCode(" = ".concat(n," =")),this.reactHotLoaderTransformer.setExtractedDefaultExportName(n)}else this.tokens.replaceToken("exports."),this.tokens.copyToken(),this.tokens.appendCode(" =")}}},{key:"processExportVar",value:function(){this.isSimpleExportVar()?this.processSimpleExportVar():this.processComplexExportVar()}},{key:"isSimpleExportVar",value:function(){var e=this.tokens.currentIndex();if(e++,e++,!this.tokens.matches1AtIndex(e,o.TokenType.name))return!1;for(e++;e<this.tokens.tokens.length&&this.tokens.tokens[e].isType;)e++;return!!this.tokens.matches1AtIndex(e,o.TokenType.eq)}},{key:"processSimpleExportVar",value:function(){this.tokens.removeInitialToken(),this.tokens.copyToken();for(var e=this.tokens.identifierName();!this.tokens.matches1(o.TokenType.eq);)this.rootTransformer.processToken();var t=this.tokens.currentToken().rhsEndIndex;if(null==t)throw new Error("Expected = token with an end index.");for(;this.tokens.currentIndex()<t;)this.rootTransformer.processToken();this.tokens.appendCode("; exports.".concat(e," = ").concat(e))}},{key:"processComplexExportVar",value:function(){this.tokens.removeInitialToken(),this.tokens.removeToken();var t=this.tokens.matches1(o.TokenType.braceL);t&&this.tokens.appendCode("(");for(var n=0;;)if(this.tokens.matches1(o.TokenType.braceL)||this.tokens.matches1(o.TokenType.dollarBraceL)||this.tokens.matches1(o.TokenType.bracketL))n++,this.tokens.copyToken();else if(this.tokens.matches1(o.TokenType.braceR)||this.tokens.matches1(o.TokenType.bracketR))n--,this.tokens.copyToken();else{if(0===n&&!this.tokens.matches1(o.TokenType.name)&&!this.tokens.currentToken().isType)break;if(this.tokens.matches1(o.TokenType.eq)){var s=this.tokens.currentToken().rhsEndIndex;if(null==s)throw new Error("Expected = token with an end index.");for(;this.tokens.currentIndex()<s;)this.rootTransformer.processToken()}else{var r=this.tokens.currentToken();if((0,e.isDeclaration)(r)){var i=this.tokens.identifierName(),a=this.importProcessor.getIdentifierReplacement(i);if(null===a)throw new Error("Expected a replacement for ".concat(i," in `export var` syntax."));(0,e.isObjectShorthandDeclaration)(r)&&(a="".concat(i,": ").concat(a)),this.tokens.replaceToken(a)}else this.rootTransformer.processToken()}}if(t){var k=this.tokens.currentToken().rhsEndIndex;if(null==k)throw new Error("Expected = token with an end index.");for(;this.tokens.currentIndex()<k;)this.rootTransformer.processToken();this.tokens.appendCode(")")}}},{key:"processExportFunction",value:function(){this.tokens.replaceToken("");var e=this.processNamedFunction();this.tokens.appendCode(" exports.".concat(e," = ").concat(e,";"))}},{key:"processNamedFunction",value:function(){if(this.tokens.matches1(o.TokenType._function))this.tokens.copyToken();else if(this.tokens.matches2(o.TokenType.name,o.TokenType._function)){if(!this.tokens.matchesContextual(t.ContextualKeyword._async))throw new Error("Expected async keyword in function export.");this.tokens.copyToken(),this.tokens.copyToken()}if(this.tokens.matches1(o.TokenType.star)&&this.tokens.copyToken(),!this.tokens.matches1(o.TokenType.name))throw new Error("Expected identifier for exported function name.");var e=this.tokens.identifierName();if(this.tokens.copyToken(),this.tokens.currentToken().isType)for(this.tokens.removeInitialToken();this.tokens.currentToken().isType;)this.tokens.removeToken();return this.tokens.copyExpectedToken(o.TokenType.parenL),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(o.TokenType.parenR),this.rootTransformer.processPossibleTypeRange(),this.tokens.copyExpectedToken(o.TokenType.braceL),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(o.TokenType.braceR),e}},{key:"processExportClass",value:function(){this.tokens.removeInitialToken(),this.tokens.matches1(o.TokenType._abstract)&&this.tokens.removeToken();var e=this.rootTransformer.processNamedClass();this.tokens.appendCode(" exports.".concat(e," = ").concat(e,";"))}},{key:"processExportBindings",value:function(){this.tokens.removeInitialToken(),this.tokens.removeToken();for(var e=[];;){if(this.tokens.matches1(o.TokenType.braceR)){this.tokens.removeToken();break}var n=this.tokens.identifierName(),s=void 0;if(this.tokens.removeToken(),this.tokens.matchesContextual(t.ContextualKeyword._as)?(this.tokens.removeToken(),s=this.tokens.identifierName(),this.tokens.removeToken()):s=n,!this.shouldElideExportedIdentifier(n)){var r=this.importProcessor.getIdentifierReplacement(n);e.push("exports.".concat(s," = ").concat(r||n,";"))}if(this.tokens.matches1(o.TokenType.braceR)){this.tokens.removeToken();break}if(this.tokens.matches2(o.TokenType.comma,o.TokenType.braceR)){this.tokens.removeToken(),this.tokens.removeToken();break}if(!this.tokens.matches1(o.TokenType.comma))throw new Error("Unexpected token: ".concat(JSON.stringify(this.tokens.currentToken())));this.tokens.removeToken()}if(this.tokens.matchesContextual(t.ContextualKeyword._from)){this.tokens.removeToken();var i=this.tokens.stringValue();this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(i))}else this.tokens.appendCode(e.join(" "));this.tokens.matches1(o.TokenType.semi)&&this.tokens.removeToken()}},{key:"processExportStar",value:function(){for(this.tokens.removeInitialToken();!this.tokens.matches1(o.TokenType.string);)this.tokens.removeToken();var e=this.tokens.stringValue();this.tokens.replaceTokenTrimmingLeftWhitespace(this.importProcessor.claimImportCode(e)),this.tokens.matches1(o.TokenType.semi)&&this.tokens.removeToken()}},{key:"shouldElideExportedIdentifier",value:function(e){return this.isTypeScriptTransformEnabled&&!this.declarationInfo.valueDeclarations.has(e)}}]),p}();exports.default=x;
},{"../parser/tokenizer":"zEJU","../parser/tokenizer/keywords":"GGTW","../parser/tokenizer/types":"sS1T","../util/elideImportEquals":"WiIy","../util/getDeclarationInfo":"jVbB","../util/shouldElideDefaultExport":"pV7C","./Transformer":"MJ2y"}],"MRZP":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("../parser/tokenizer/keywords"),t=require("../parser/tokenizer/types"),o=k(require("../util/elideImportEquals")),n=k(require("../util/getDeclarationInfo")),s=require("../util/getNonTypeIdentifiers"),r=k(require("../util/shouldElideDefaultExport")),i=k(require("./Transformer"));function k(e){return e&&e.__esModule?e:{default:e}}function a(e){return(a="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function T(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function p(e,t){for(var o=0;o<t.length;o++){var n=t[o];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}function c(e,t,o){return t&&p(e.prototype,t),o&&p(e,o),e}function h(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&m(e,t)}function m(e,t){return(m=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function y(e){var t=l();return function(){var o,n=d(e);if(t){var s=d(this).constructor;o=Reflect.construct(n,arguments,s)}else o=n.apply(this,arguments);return u(this,o)}}function u(e,t){return!t||"object"!==a(t)&&"function"!=typeof t?f(e):t}function f(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function l(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}function d(e){return(d=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}var v=function(k){h(p,i.default);var a=y(p);function p(e,t,o,r,i){var k;return T(this,p),(k=a.call(this)).tokens=e,k.nameManager=t,k.reactHotLoaderTransformer=o,k.isTypeScriptTransformEnabled=r,k.nonTypeIdentifiers=r?(0,s.getNonTypeIdentifiers)(e,i):new Set,k.declarationInfo=r?(0,n.default)(e):n.EMPTY_DECLARATION_INFO,k}return c(p,[{key:"process",value:function(){if(this.tokens.matches3(t.TokenType._import,t.TokenType.name,t.TokenType.eq))return this.processImportEquals();if(this.tokens.matches2(t.TokenType._export,t.TokenType.eq))return this.tokens.replaceToken("module.exports"),!0;if(this.tokens.matches1(t.TokenType._import))return this.processImport();if(this.tokens.matches2(t.TokenType._export,t.TokenType._default))return this.processExportDefault();if(this.tokens.matches2(t.TokenType._export,t.TokenType.braceL))return this.processNamedExports();if(this.tokens.matches3(t.TokenType._export,t.TokenType.name,t.TokenType.braceL)&&this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+1,e.ContextualKeyword._type)){for(this.tokens.removeInitialToken();!this.tokens.matches1(t.TokenType.braceR);)this.tokens.removeToken();return this.tokens.removeToken(),this.tokens.matchesContextual(e.ContextualKeyword._from)&&this.tokens.matches1AtIndex(this.tokens.currentIndex()+1,t.TokenType.string)&&(this.tokens.removeToken(),this.tokens.removeToken()),!0}return!1}},{key:"processImportEquals",value:function(){var e=this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+1);return this.isTypeName(e)?(0,o.default)(this.tokens):this.tokens.replaceToken("const"),!0}},{key:"processImport",value:function(){if(this.tokens.matches2(t.TokenType._import,t.TokenType.parenL))return!1;var e=this.tokens.snapshot();if(this.removeImportTypeBindings()){for(this.tokens.restoreToSnapshot(e);!this.tokens.matches1(t.TokenType.string);)this.tokens.removeToken();this.tokens.removeToken(),this.tokens.matches1(t.TokenType.semi)&&this.tokens.removeToken()}return!0}},{key:"removeImportTypeBindings",value:function(){if(this.tokens.copyExpectedToken(t.TokenType._import),this.tokens.matchesContextual(e.ContextualKeyword._type)&&!this.tokens.matches1AtIndex(this.tokens.currentIndex()+1,t.TokenType.comma)&&!this.tokens.matchesContextualAtIndex(this.tokens.currentIndex()+1,e.ContextualKeyword._from))return!0;if(this.tokens.matches1(t.TokenType.string))return this.tokens.copyToken(),!1;var o=!1;if(this.tokens.matches1(t.TokenType.name)&&(this.isTypeName(this.tokens.identifierName())?(this.tokens.removeToken(),this.tokens.matches1(t.TokenType.comma)&&this.tokens.removeToken()):(o=!0,this.tokens.copyToken(),this.tokens.matches1(t.TokenType.comma)&&this.tokens.copyToken())),this.tokens.matches1(t.TokenType.star))this.isTypeName(this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+2))?(this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.removeToken()):(o=!0,this.tokens.copyExpectedToken(t.TokenType.star),this.tokens.copyExpectedToken(t.TokenType.name),this.tokens.copyExpectedToken(t.TokenType.name));else if(this.tokens.matches1(t.TokenType.braceL)){for(this.tokens.copyToken();!this.tokens.matches1(t.TokenType.braceR);)if(this.tokens.matches3(t.TokenType.name,t.TokenType.name,t.TokenType.comma)||this.tokens.matches3(t.TokenType.name,t.TokenType.name,t.TokenType.braceR))this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.matches1(t.TokenType.comma)&&this.tokens.removeToken();else if(this.tokens.matches5(t.TokenType.name,t.TokenType.name,t.TokenType.name,t.TokenType.name,t.TokenType.comma)||this.tokens.matches5(t.TokenType.name,t.TokenType.name,t.TokenType.name,t.TokenType.name,t.TokenType.braceR))this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.matches1(t.TokenType.comma)&&this.tokens.removeToken();else if(this.tokens.matches2(t.TokenType.name,t.TokenType.comma)||this.tokens.matches2(t.TokenType.name,t.TokenType.braceR))this.isTypeName(this.tokens.identifierName())?(this.tokens.removeToken(),this.tokens.matches1(t.TokenType.comma)&&this.tokens.removeToken()):(o=!0,this.tokens.copyToken(),this.tokens.matches1(t.TokenType.comma)&&this.tokens.copyToken());else{if(!this.tokens.matches4(t.TokenType.name,t.TokenType.name,t.TokenType.name,t.TokenType.comma)&&!this.tokens.matches4(t.TokenType.name,t.TokenType.name,t.TokenType.name,t.TokenType.braceR))throw new Error("Unexpected import form.");this.isTypeName(this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+2))?(this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.removeToken(),this.tokens.matches1(t.TokenType.comma)&&this.tokens.removeToken()):(o=!0,this.tokens.copyToken(),this.tokens.copyToken(),this.tokens.copyToken(),this.tokens.matches1(t.TokenType.comma)&&this.tokens.copyToken())}this.tokens.copyExpectedToken(t.TokenType.braceR)}return!o}},{key:"isTypeName",value:function(e){return this.isTypeScriptTransformEnabled&&!this.nonTypeIdentifiers.has(e)}},{key:"processExportDefault",value:function(){if((0,r.default)(this.isTypeScriptTransformEnabled,this.tokens,this.declarationInfo))return this.tokens.removeInitialToken(),this.tokens.removeToken(),this.tokens.removeToken(),!0;if(!(this.tokens.matches4(t.TokenType._export,t.TokenType._default,t.TokenType._function,t.TokenType.name)||this.tokens.matches5(t.TokenType._export,t.TokenType._default,t.TokenType.name,t.TokenType._function,t.TokenType.name)||this.tokens.matches4(t.TokenType._export,t.TokenType._default,t.TokenType._class,t.TokenType.name)||this.tokens.matches5(t.TokenType._export,t.TokenType._default,t.TokenType._abstract,t.TokenType._class,t.TokenType.name))&&this.reactHotLoaderTransformer){var e=this.nameManager.claimFreeName("_default");return this.tokens.replaceToken("let ".concat(e,"; export")),this.tokens.copyToken(),this.tokens.appendCode(" ".concat(e," =")),this.reactHotLoaderTransformer.setExtractedDefaultExportName(e),!0}return!1}},{key:"processNamedExports",value:function(){if(!this.isTypeScriptTransformEnabled)return!1;for(this.tokens.copyExpectedToken(t.TokenType._export),this.tokens.copyExpectedToken(t.TokenType.braceL);!this.tokens.matches1(t.TokenType.braceR);){if(!this.tokens.matches1(t.TokenType.name))throw new Error("Expected identifier at the start of named export.");if(this.shouldElideExportedName(this.tokens.identifierName())){for(;!this.tokens.matches1(t.TokenType.comma)&&!this.tokens.matches1(t.TokenType.braceR)&&!this.tokens.isAtEnd();)this.tokens.removeToken();this.tokens.matches1(t.TokenType.comma)&&this.tokens.removeToken()}else{for(;!this.tokens.matches1(t.TokenType.comma)&&!this.tokens.matches1(t.TokenType.braceR)&&!this.tokens.isAtEnd();)this.tokens.copyToken();this.tokens.matches1(t.TokenType.comma)&&this.tokens.copyToken()}}return this.tokens.copyExpectedToken(t.TokenType.braceR),!0}},{key:"shouldElideExportedName",value:function(e){return this.isTypeScriptTransformEnabled&&this.declarationInfo.typeDeclarations.has(e)&&!this.declarationInfo.valueDeclarations.has(e)}}]),p}();exports.default=v;
},{"../parser/tokenizer/keywords":"GGTW","../parser/tokenizer/types":"sS1T","../util/elideImportEquals":"WiIy","../util/getDeclarationInfo":"jVbB","../util/getNonTypeIdentifiers":"BOKS","../util/shouldElideDefaultExport":"pV7C","./Transformer":"MJ2y"}],"CO99":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var t=e(require("./Transformer"));function e(t){return t&&t.__esModule?t:{default:t}}function r(t){return(r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function n(t,e){for(var r=0;r<e.length;r++){var o=e[r];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}function u(t,e,r){return e&&n(t.prototype,e),r&&n(t,r),t}function c(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&f(t,e)}function f(t,e){return(f=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}function i(t){var e=l();return function(){var r,o=p(t);if(e){var n=p(this).constructor;r=Reflect.construct(o,arguments,n)}else r=o.apply(this,arguments);return s(this,r)}}function s(t,e){return!e||"object"!==r(e)&&"function"!=typeof e?a(t):e}function a(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function l(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(t){return!1}}function p(t){return(p=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}var y=function(e){c(n,t.default);var r=i(n);function n(t,e){var u;return o(this,n),(u=r.call(this)).rootTransformer=t,u.tokens=e,u}return u(n,[{key:"process",value:function(){return this.rootTransformer.processPossibleArrowParamEnd()||this.rootTransformer.processPossibleAsyncArrowWithTypeParams()||this.rootTransformer.processPossibleTypeRange()}}]),n}();exports.default=y;
},{"./Transformer":"MJ2y"}],"S5mr":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var t=require("../parser/tokenizer/types"),e=r(require("./Transformer"));function r(t){return t&&t.__esModule?t:{default:t}}function n(t){return(n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function u(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function c(t,e,r){return e&&u(t.prototype,e),r&&u(t,r),t}function i(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&f(t,e)}function f(t,e){return(f=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}function s(t){var e=p();return function(){var r,n=y(t);if(e){var o=y(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return a(this,r)}}function a(t,e){return!e||"object"!==n(e)&&"function"!=typeof e?l(t):e}function l(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function p(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(t){return!1}}function y(t){return(y=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}var b=function(r){i(u,e.default);var n=s(u);function u(t){var e;return o(this,u),(e=n.call(this)).tokens=t,e}return c(u,[{key:"process",value:function(){if(this.tokens.matches1(t.TokenType.num)){var e=this.tokens.currentTokenCode();if(e.includes("_"))return this.tokens.replaceToken(e.replace(/_/g,"")),!0}return!1}}]),u}();exports.default=b;
},{"../parser/tokenizer/types":"sS1T","./Transformer":"MJ2y"}],"MRRY":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var t=require("../parser/tokenizer/types"),e=n(require("./Transformer"));function n(t){return t&&t.__esModule?t:{default:t}}function r(t){return(r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function u(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function c(t,e,n){return e&&u(t.prototype,e),n&&u(t,n),t}function i(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&f(t,e)}function f(t,e){return(f=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}function a(t){var e=p();return function(){var n,r=y(t);if(e){var o=y(this).constructor;n=Reflect.construct(r,arguments,o)}else n=r.apply(this,arguments);return s(this,n)}}function s(t,e){return!e||"object"!==r(e)&&"function"!=typeof e?l(t):e}function l(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}function p(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(t){return!1}}function y(t){return(y=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}var b=function(n){i(u,e.default);var r=a(u);function u(t,e){var n;return o(this,u),(n=r.call(this)).tokens=t,n.nameManager=e,n}return c(u,[{key:"process",value:function(){return!!this.tokens.matches2(t.TokenType._catch,t.TokenType.braceL)&&(this.tokens.copyToken(),this.tokens.appendCode(" (".concat(this.nameManager.claimFreeName("e"),")")),!0)}}]),u}();exports.default=b;
},{"../parser/tokenizer/types":"sS1T","./Transformer":"MJ2y"}],"o0Sk":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("../parser/tokenizer/types"),t=n(require("./Transformer"));function n(e){return e&&e.__esModule?e:{default:e}}function o(e){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function s(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function i(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o)}}function r(e,t,n){return t&&i(e.prototype,t),n&&i(e,n),e}function c(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&a(e,t)}function a(e,t){return(a=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function u(e){var t=f();return function(){var n,o=l(e);if(t){var s=l(this).constructor;n=Reflect.construct(o,arguments,s)}else n=o.apply(this,arguments);return p(this,n)}}function p(e,t){return!t||"object"!==o(t)&&"function"!=typeof t?h(e):t}function h(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function f(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}function l(e){return(l=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}var k=function(n){c(i,t.default);var o=u(i);function i(e,t){var n;return s(this,i),(n=o.call(this)).tokens=e,n.nameManager=t,n}return r(i,[{key:"process",value:function(){if(this.tokens.matches1(e.TokenType.nullishCoalescing)){var t=this.tokens.currentToken();return this.tokens.tokens[t.nullishStartIndex].isAsyncOperation?this.tokens.replaceTokenTrimmingLeftWhitespace(", async () => ("):this.tokens.replaceTokenTrimmingLeftWhitespace(", () => ("),!0}if(this.tokens.matches1(e.TokenType._delete)&&this.tokens.tokenAtRelativeIndex(1).isOptionalChainStart)return this.tokens.removeInitialToken(),!0;var n=this.tokens.currentToken().subscriptStartIndex;if(null!=n&&this.tokens.tokens[n].isOptionalChainStart&&this.tokens.tokenAtRelativeIndex(-1).type!==e.TokenType._super){var o,s=this.nameManager.claimFreeName("_");if(o=n>0&&this.tokens.matches1AtIndex(n-1,e.TokenType._delete)&&this.isLastSubscriptInChain()?"".concat(s," => delete ").concat(s):"".concat(s," => ").concat(s),this.tokens.tokens[n].isAsyncOperation&&(o="async ".concat(o)),this.tokens.matches2(e.TokenType.questionDot,e.TokenType.parenL)||this.tokens.matches2(e.TokenType.questionDot,e.TokenType.lessThan))this.justSkippedSuper()&&this.tokens.appendCode(".bind(this)"),this.tokens.replaceTokenTrimmingLeftWhitespace(", 'optionalCall', ".concat(o));else if(this.tokens.matches2(e.TokenType.questionDot,e.TokenType.bracketL))this.tokens.replaceTokenTrimmingLeftWhitespace(", 'optionalAccess', ".concat(o));else if(this.tokens.matches1(e.TokenType.questionDot))this.tokens.replaceTokenTrimmingLeftWhitespace(", 'optionalAccess', ".concat(o,"."));else if(this.tokens.matches1(e.TokenType.dot))this.tokens.replaceTokenTrimmingLeftWhitespace(", 'access', ".concat(o,"."));else if(this.tokens.matches1(e.TokenType.bracketL))this.tokens.replaceTokenTrimmingLeftWhitespace(", 'access', ".concat(o,"["));else{if(!this.tokens.matches1(e.TokenType.parenL))throw new Error("Unexpected subscript operator in optional chain.");this.justSkippedSuper()&&this.tokens.appendCode(".bind(this)"),this.tokens.replaceTokenTrimmingLeftWhitespace(", 'call', ".concat(o,"("))}return!0}return!1}},{key:"isLastSubscriptInChain",value:function(){for(var e=0,t=this.tokens.currentIndex()+1;;t++){if(t>=this.tokens.tokens.length)throw new Error("Reached the end of the code while finding the end of the access chain.");if(this.tokens.tokens[t].isOptionalChainStart?e++:this.tokens.tokens[t].isOptionalChainEnd&&e--,e<0)return!0;if(0===e&&null!=this.tokens.tokens[t].subscriptStartIndex)return!1}}},{key:"justSkippedSuper",value:function(){for(var t=0,n=this.tokens.currentIndex()-1;;){if(n<0)throw new Error("Reached the start of the code while finding the start of the access chain.");if(this.tokens.tokens[n].isOptionalChainStart?t--:this.tokens.tokens[n].isOptionalChainEnd&&t++,t<0)return!1;if(0===t&&null!=this.tokens.tokens[n].subscriptStartIndex)return this.tokens.tokens[n-1].type===e.TokenType._super;n--}}}]),i}();exports.default=k;
},{"../parser/tokenizer/types":"sS1T","./Transformer":"MJ2y"}],"momJ":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("../parser/tokenizer"),t=require("../parser/tokenizer/types"),n=o(require("./Transformer"));function o(e){return e&&e.__esModule?e:{default:e}}function r(e){return(r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function s(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function i(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o)}}function c(e,t,n){return t&&i(e.prototype,t),n&&i(e,n),e}function a(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&p(e,t)}function p(e,t){return(p=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function u(e){var t=k();return function(){var n,o=y(e);if(t){var r=y(this).constructor;n=Reflect.construct(o,arguments,r)}else n=o.apply(this,arguments);return l(this,n)}}function l(e,t){return!t||"object"!==r(t)&&"function"!=typeof t?f(e):t}function f(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function k(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}function y(e){return(y=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}var h=function(o){a(i,n.default);var r=u(i);function i(e,t,n,o){var c;return s(this,i),(c=r.call(this)).rootTransformer=e,c.tokens=t,c.importProcessor=n,c.options=o,c}return c(i,[{key:"process",value:function(){var e=this.tokens.currentIndex();if("createReactClass"===this.tokens.identifierName()){var n=this.importProcessor&&this.importProcessor.getIdentifierReplacement("createReactClass");return n?this.tokens.replaceToken("(0, ".concat(n,")")):this.tokens.copyToken(),this.tryProcessCreateClassCall(e),!0}if(this.tokens.matches3(t.TokenType.name,t.TokenType.dot,t.TokenType.name)&&"React"===this.tokens.identifierName()&&"createClass"===this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+2)){var o=this.importProcessor&&this.importProcessor.getIdentifierReplacement("React")||"React";return o?(this.tokens.replaceToken(o),this.tokens.copyToken(),this.tokens.copyToken()):(this.tokens.copyToken(),this.tokens.copyToken(),this.tokens.copyToken()),this.tryProcessCreateClassCall(e),!0}return!1}},{key:"tryProcessCreateClassCall",value:function(e){var n=this.findDisplayName(e);n&&this.classNeedsDisplayName()&&(this.tokens.copyExpectedToken(t.TokenType.parenL),this.tokens.copyExpectedToken(t.TokenType.braceL),this.tokens.appendCode("displayName: '".concat(n,"',")),this.rootTransformer.processBalancedCode(),this.tokens.copyExpectedToken(t.TokenType.braceR),this.tokens.copyExpectedToken(t.TokenType.parenR))}},{key:"findDisplayName",value:function(n){return n<2?null:this.tokens.matches2AtIndex(n-2,t.TokenType.name,t.TokenType.eq)?this.tokens.identifierNameAtIndex(n-2):n>=2&&this.tokens.tokens[n-2].identifierRole===e.IdentifierRole.ObjectKey?this.tokens.identifierNameAtIndex(n-2):this.tokens.matches2AtIndex(n-2,t.TokenType._export,t.TokenType._default)?this.getDisplayNameFromFilename():null}},{key:"getDisplayNameFromFilename",value:function(){var e=(this.options.filePath||"unknown").split("/"),t=e[e.length-1],n=t.lastIndexOf("."),o=-1===n?t:t.slice(0,n);return"index"===o&&e[e.length-2]?e[e.length-2]:o}},{key:"classNeedsDisplayName",value:function(){var n=this.tokens.currentIndex();if(!this.tokens.matches2(t.TokenType.parenL,t.TokenType.braceL))return!1;var o=n+1,r=this.tokens.tokens[o].contextId;if(null==r)throw new Error("Expected non-null context ID on object open-brace.");for(;n<this.tokens.tokens.length;n++){var s=this.tokens.tokens[n];if(s.type===t.TokenType.braceR&&s.contextId===r){n++;break}if("displayName"===this.tokens.identifierNameAtIndex(n)&&this.tokens.tokens[n].identifierRole===e.IdentifierRole.ObjectKey&&s.contextId===r)return!1}if(n===this.tokens.tokens.length)throw new Error("Unexpected end of input when processing React class.");return this.tokens.matches1AtIndex(n,t.TokenType.parenR)||this.tokens.matches2AtIndex(n,t.TokenType.comma,t.TokenType.parenR)}}]),i}();exports.default=h;
},{"../parser/tokenizer":"zEJU","../parser/tokenizer/types":"sS1T","./Transformer":"MJ2y"}],"AxMm":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("../parser/tokenizer"),t=r(require("./Transformer"));function r(e){return e&&e.__esModule?e:{default:e}}function n(e){return(n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function o(e,t){var r;if("undefined"==typeof Symbol||null==e[Symbol.iterator]){if(Array.isArray(e)||(r=a(e))||t&&e&&"number"==typeof e.length){r&&(e=r);var n=0,o=function(){};return{s:o,n:function(){return n>=e.length?{done:!0}:{done:!1,value:e[n++]}},e:function(e){throw e},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var u,i=!0,c=!1;return{s:function(){r=e[Symbol.iterator]()},n:function(){var e=r.next();return i=e.done,e},e:function(e){c=!0,u=e},f:function(){try{i||null==r.return||r.return()}finally{if(c)throw u}}}}function a(e,t){if(e){if("string"==typeof e)return u(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?u(e,t):void 0}}function u(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}function i(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function c(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}function f(e,t,r){return t&&c(e.prototype,t),r&&c(e,r),e}function l(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&s(e,t)}function s(e,t){return(s=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function p(e){var t=v();return function(){var r,n=m(e);if(t){var o=m(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return y(this,r)}}function y(e,t){return!t||"object"!==n(t)&&"function"!=typeof t?d(e):t}function d(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function v(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}function m(e){return(m=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}var b=function(r){l(a,t.default);var n=p(a);function a(e,t){var r;return i(this,a),(r=n.call(this)).tokens=e,r.filePath=t,a.prototype.__init.call(d(r)),r}return f(a,[{key:"__init",value:function(){this.extractedDefaultExportName=null}}]),f(a,[{key:"setExtractedDefaultExportName",value:function(e){this.extractedDefaultExportName=e}},{key:"getPrefixCode",value:function(){return"\n      (function () {\n        var enterModule = require('react-hot-loader').enterModule;\n        enterModule && enterModule(module);\n      })();".replace(/\s+/g," ").trim()}},{key:"getSuffixCode",value:function(){var t,r=this,n=new Set,a=o(this.tokens.tokens);try{for(a.s();!(t=a.n()).done;){var u=t.value;!u.isType&&(0,e.isTopLevelDeclaration)(u)&&u.identifierRole!==e.IdentifierRole.ImportDeclaration&&n.add(this.tokens.identifierNameForToken(u))}}catch(c){a.e(c)}finally{a.f()}var i=Array.from(n).map(function(e){return{variableName:e,uniqueLocalName:e}});return this.extractedDefaultExportName&&i.push({variableName:this.extractedDefaultExportName,uniqueLocalName:"default"}),"\n;(function () {\n  var reactHotLoader = require('react-hot-loader').default;\n  var leaveModule = require('react-hot-loader').leaveModule;\n  if (!reactHotLoader) {\n    return;\n  }\n".concat(i.map(function(e){var t=e.variableName,n=e.uniqueLocalName;return"  reactHotLoader.register(".concat(t,', "').concat(n,'", ').concat(JSON.stringify(r.filePath||""),");")}).join("\n"),"\n  leaveModule(module);\n})();")}},{key:"process",value:function(){return!1}}]),a}();exports.default=b;
},{"../parser/tokenizer":"zEJU","./Transformer":"MJ2y"}],"bqh1":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=r;var e=require("../parser/util/identifier"),t=new Set(["break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","finally","for","function","if","import","in","instanceof","new","return","super","switch","this","throw","try","typeof","var","void","while","with","yield","enum","implements","interface","let","package","private","protected","public","static","await"]);function r(r){if(0===r.length)return!1;if(!e.IS_IDENTIFIER_START[r.charCodeAt(0)])return!1;for(var i=1;i<r.length;i++)if(!e.IS_IDENTIFIER_CHAR[r.charCodeAt(i)])return!1;return!t.has(r)}
},{"../parser/util/identifier":"NoJD"}],"t5ej":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("../parser/tokenizer/types"),t=o(require("../util/isIdentifier")),n=o(require("./Transformer"));function o(e){return e&&e.__esModule?e:{default:e}}function r(e){return(r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function s(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function i(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o)}}function c(e,t,n){return t&&i(e.prototype,t),n&&i(e,n),e}function a(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&p(e,t)}function p(e,t){return(p=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function u(e){var t=f();return function(){var n,o=T(e);if(t){var r=T(this).constructor;n=Reflect.construct(o,arguments,r)}else n=o.apply(this,arguments);return k(this,n)}}function k(e,t){return!t||"object"!==r(t)&&"function"!=typeof t?h(e):t}function h(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function f(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}function T(e){return(T=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}var l=function(o){a(i,n.default);var r=u(i);function i(e,t,n){var o;return s(this,i),(o=r.call(this)).rootTransformer=e,o.tokens=t,o.isImportsTransformEnabled=n,o}return c(i,[{key:"process",value:function(){return!!(this.rootTransformer.processPossibleArrowParamEnd()||this.rootTransformer.processPossibleAsyncArrowWithTypeParams()||this.rootTransformer.processPossibleTypeRange())||(this.tokens.matches1(e.TokenType._public)||this.tokens.matches1(e.TokenType._protected)||this.tokens.matches1(e.TokenType._private)||this.tokens.matches1(e.TokenType._abstract)||this.tokens.matches1(e.TokenType._readonly)||this.tokens.matches1(e.TokenType.nonNullAssertion)?(this.tokens.removeInitialToken(),!0):this.tokens.matches1(e.TokenType._enum)||this.tokens.matches2(e.TokenType._const,e.TokenType._enum)?(this.processEnum(),!0):!(!this.tokens.matches2(e.TokenType._export,e.TokenType._enum)&&!this.tokens.matches3(e.TokenType._export,e.TokenType._const,e.TokenType._enum))&&(this.processEnum(!0),!0))}},{key:"processEnum",value:function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];for(this.tokens.removeInitialToken();this.tokens.matches1(e.TokenType._const)||this.tokens.matches1(e.TokenType._enum);)this.tokens.removeToken();var n=this.tokens.identifierName();this.tokens.removeToken(),t&&!this.isImportsTransformEnabled&&this.tokens.appendCode("export "),this.tokens.appendCode("var ".concat(n,"; (function (").concat(n,")")),this.tokens.copyExpectedToken(e.TokenType.braceL),this.processEnumBody(n),this.tokens.copyExpectedToken(e.TokenType.braceR),t&&this.isImportsTransformEnabled?this.tokens.appendCode(")(".concat(n," || (exports.").concat(n," = ").concat(n," = {}));")):this.tokens.appendCode(")(".concat(n," || (").concat(n," = {}));"))}},{key:"processEnumBody",value:function(n){for(var o=!1,r=null;!this.tokens.matches1(e.TokenType.braceR);){var s=this.tokens.currentToken(),i=void 0,c=void 0;if(s.type===e.TokenType.name)i=this.tokens.identifierNameForToken(s),c='"'.concat(i,'"');else{if(s.type!==e.TokenType.string)throw new Error("Expected name or string at beginning of enum element.");i=this.tokens.stringValueForToken(s),c=this.tokens.code.slice(s.start,s.end)}var a=(0,t.default)(i);this.tokens.removeInitialToken();var p=void 0,u=void 0;if(this.tokens.matches1(e.TokenType.eq)){var k=this.tokens.currentToken().rhsEndIndex;if(null==k)throw new Error("Expected rhsEndIndex on enum assign.");this.tokens.removeToken(),(this.tokens.matches2(e.TokenType.string,e.TokenType.comma)||this.tokens.matches2(e.TokenType.string,e.TokenType.braceR))&&(p=!0);for(var h=this.tokens.currentToken();this.tokens.currentIndex()<k;)this.tokens.removeToken();u=this.tokens.code.slice(h.start,this.tokens.tokenAtRelativeIndex(-1).end)}else p=!1,u=null!=r?o?"".concat(r," + 1"):"(".concat(r,") + 1"):"0";this.tokens.matches1(e.TokenType.comma)&&this.tokens.removeToken();var f=void 0;a?(this.tokens.appendCode("const ".concat(i," = ").concat(u,"; ")),f=i):f=u,p?this.tokens.appendCode("".concat(n,"[").concat(c,"] = ").concat(f,";")):this.tokens.appendCode("".concat(n,"[").concat(n,"[").concat(c,"] = ").concat(f,"] = ").concat(c,";")),r=f,o=a}}}]),i}();exports.default=l;
},{"../parser/tokenizer/types":"sS1T","../util/isIdentifier":"bqh1","./Transformer":"MJ2y"}],"svek":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("../parser/tokenizer/keywords"),t=require("../parser/tokenizer/types"),n=p(require("../util/getClassInfo")),r=p(require("./CJSImportTransformer")),s=p(require("./ESMImportTransformer")),o=p(require("./FlowTransformer")),i=p(require("./JSXTransformer")),a=p(require("./NumericSeparatorTransformer")),c=p(require("./OptionalCatchBindingTransformer")),h=p(require("./OptionalChainingNullishTransformer")),l=p(require("./ReactDisplayNameTransformer")),u=p(require("./ReactHotLoaderTransformer")),f=p(require("./TypeScriptTransformer"));function p(e){return e&&e.__esModule?e:{default:e}}function k(e){return y(e)||m(e)||v(e)||d()}function d(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function m(e){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(e))return Array.from(e)}function y(e){if(Array.isArray(e))return I(e)}function T(e,t){var n;if("undefined"==typeof Symbol||null==e[Symbol.iterator]){if(Array.isArray(e)||(n=v(e))||t&&e&&"number"==typeof e.length){n&&(e=n);var r=0,s=function(){};return{s:s,n:function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}},e:function(e){throw e},f:s}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var o,i=!0,a=!1;return{s:function(){n=e[Symbol.iterator]()},n:function(){var e=n.next();return i=e.done,e},e:function(e){a=!0,o=e},f:function(){try{i||null==n.return||n.return()}finally{if(a)throw o}}}}function v(e,t){if(e){if("string"==typeof e)return I(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?I(e,t):void 0}}function I(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function b(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function g(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function x(e,t,n){return t&&g(e.prototype,t),n&&g(e,n),e}var w=function(){function p(e,t,n,k){b(this,p),p.prototype.__init.call(this),p.prototype.__init2.call(this),this.nameManager=e.nameManager,this.helperManager=e.helperManager;var d=e.tokenProcessor,m=e.importProcessor;this.tokens=d,this.isImportsTransformEnabled=t.includes("imports"),this.isReactHotLoaderTransformEnabled=t.includes("react-hot-loader"),this.transformers.push(new h.default(d,this.nameManager)),this.transformers.push(new a.default(d)),this.transformers.push(new c.default(d,this.nameManager)),t.includes("jsx")&&(this.transformers.push(new i.default(this,d,m,this.nameManager,k)),this.transformers.push(new l.default(this,d,m,k)));var y=null;if(t.includes("react-hot-loader")){if(!k.filePath)throw new Error("filePath is required when using the react-hot-loader transform.");y=new u.default(d,k.filePath),this.transformers.push(y)}if(t.includes("imports")){if(null===m)throw new Error("Expected non-null importProcessor with imports transform enabled.");this.transformers.push(new r.default(this,d,m,this.nameManager,y,n,t.includes("typescript")))}else this.transformers.push(new s.default(d,this.nameManager,y,t.includes("typescript"),k));t.includes("flow")&&this.transformers.push(new o.default(this,d)),t.includes("typescript")&&this.transformers.push(new f.default(this,d,t.includes("imports")))}return x(p,[{key:"__init",value:function(){this.transformers=[]}},{key:"__init2",value:function(){this.generatedVariables=[]}}]),x(p,[{key:"transform",value:function(){this.tokens.reset(),this.processBalancedCode();var e,t=this.isImportsTransformEnabled?'"use strict";':"",n=T(this.transformers);try{for(n.s();!(e=n.n()).done;){t+=e.value.getPrefixCode()}}catch(c){n.e(c)}finally{n.f()}t+=this.helperManager.emitHelpers(),t+=this.generatedVariables.map(function(e){return" var ".concat(e,";")}).join("");var r,s="",o=T(this.transformers);try{for(o.s();!(r=o.n()).done;){s+=r.value.getSuffixCode()}}catch(c){o.e(c)}finally{o.f()}var i=this.tokens.finish();if(i.startsWith("#!")){var a=i.indexOf("\n");return-1===a&&(a=i.length,i+="\n"),i.slice(0,a+1)+t+i.slice(a+1)+s}return t+this.tokens.finish()+s}},{key:"processBalancedCode",value:function(){for(var e=0,n=0;!this.tokens.isAtEnd();){if(this.tokens.matches1(t.TokenType.braceL)||this.tokens.matches1(t.TokenType.dollarBraceL))e++;else if(this.tokens.matches1(t.TokenType.braceR)){if(0===e)return;e--}if(this.tokens.matches1(t.TokenType.parenL))n++;else if(this.tokens.matches1(t.TokenType.parenR)){if(0===n)return;n--}this.processToken()}}},{key:"processToken",value:function(){if(this.tokens.matches1(t.TokenType._class))this.processClass();else{var e,n=T(this.transformers);try{for(n.s();!(e=n.n()).done;){if(e.value.process())return}}catch(r){n.e(r)}finally{n.f()}this.tokens.copyToken()}}},{key:"processNamedClass",value:function(){if(!this.tokens.matches2(t.TokenType._class,t.TokenType.name))throw new Error("Expected identifier for exported class name.");var e=this.tokens.identifierNameAtIndex(this.tokens.currentIndex()+1);return this.processClass(),e}},{key:"processClass",value:function(){var e=(0,n.default)(this,this.tokens,this.nameManager),r=e.headerInfo.isExpression&&e.staticInitializerNames.length+e.instanceInitializerNames.length>0,s=e.headerInfo.className;r&&(s=this.nameManager.claimFreeName("_class"),this.generatedVariables.push(s),this.tokens.appendCode(" (".concat(s," =")));var o=this.tokens.currentToken().contextId;if(null==o)throw new Error("Expected class to have a context ID.");for(this.tokens.copyExpectedToken(t.TokenType._class);!this.tokens.matchesContextIdAndLabel(t.TokenType.braceL,o);)this.processToken();this.processClassBody(e,s);var i=e.staticInitializerNames.map(function(e){return"".concat(s,".").concat(e,"()")});r?this.tokens.appendCode(", ".concat(i.map(function(e){return"".concat(e,", ")}).join("")).concat(s,")")):e.staticInitializerNames.length>0&&this.tokens.appendCode(" ".concat(i.map(function(e){return"".concat(e,";")}).join(" ")))}},{key:"processClassBody",value:function(e,n){var r=e.headerInfo,s=e.constructorInsertPos,o=e.constructorInitializerStatements,i=e.fields,a=e.instanceInitializerNames,c=e.rangesToRemove,h=0,l=0,u=this.tokens.currentToken().contextId;if(null==u)throw new Error("Expected non-null context ID on class.");this.tokens.copyExpectedToken(t.TokenType.braceL),this.isReactHotLoaderTransformEnabled&&this.tokens.appendCode("__reactstandin__regenerateByEval(key, code) {this[key] = eval(code);}");var f=o.length+a.length>0;if(null===s&&f){var p=this.makeConstructorInitCode(o,a,n);if(r.hasSuperclass){var k=this.nameManager.claimFreeName("args");this.tokens.appendCode("constructor(...".concat(k,") { super(...").concat(k,"); ").concat(p,"; }"))}else this.tokens.appendCode("constructor() { ".concat(p,"; }"))}for(;!this.tokens.matchesContextIdAndLabel(t.TokenType.braceR,u);)if(h<i.length&&this.tokens.currentIndex()===i[h].start){var d=!1;for(this.tokens.matches1(t.TokenType.bracketL)?this.tokens.copyTokenWithPrefix("".concat(i[h].initializerName,"() {this")):this.tokens.matches1(t.TokenType.string)||this.tokens.matches1(t.TokenType.num)?(this.tokens.copyTokenWithPrefix("".concat(i[h].initializerName,"() {this[")),d=!0):this.tokens.copyTokenWithPrefix("".concat(i[h].initializerName,"() {this."));this.tokens.currentIndex()<i[h].end;)d&&this.tokens.currentIndex()===i[h].equalsIndex&&this.tokens.appendCode("]"),this.processToken();this.tokens.appendCode("}"),h++}else if(l<c.length&&this.tokens.currentIndex()===c[l].start){for(this.tokens.removeInitialToken();this.tokens.currentIndex()<c[l].end;)this.tokens.removeToken();l++}else this.tokens.currentIndex()===s?(this.tokens.copyToken(),f&&this.tokens.appendCode(";".concat(this.makeConstructorInitCode(o,a,n),";")),this.processToken()):this.processToken();this.tokens.copyExpectedToken(t.TokenType.braceR)}},{key:"makeConstructorInitCode",value:function(e,t,n){return[].concat(k(e),k(t.map(function(e){return"".concat(n,".prototype.").concat(e,".call(this)")}))).join(";")}},{key:"processPossibleArrowParamEnd",value:function(){if(this.tokens.matches2(t.TokenType.parenR,t.TokenType.colon)&&this.tokens.tokenAtRelativeIndex(1).isType){for(var e=this.tokens.currentIndex()+1;this.tokens.tokens[e].isType;)e++;if(this.tokens.matches1AtIndex(e,t.TokenType.arrow)){for(this.tokens.removeInitialToken();this.tokens.currentIndex()<e;)this.tokens.removeToken();return this.tokens.replaceTokenTrimmingLeftWhitespace(") =>"),!0}}return!1}},{key:"processPossibleAsyncArrowWithTypeParams",value:function(){if(!this.tokens.matchesContextual(e.ContextualKeyword._async)&&!this.tokens.matches1(t.TokenType._async))return!1;var n=this.tokens.tokenAtRelativeIndex(1);if(n.type!==t.TokenType.lessThan||!n.isType)return!1;for(var r=this.tokens.currentIndex()+1;this.tokens.tokens[r].isType;)r++;if(this.tokens.matches1AtIndex(r,t.TokenType.parenL)){for(this.tokens.replaceToken("async ("),this.tokens.removeInitialToken();this.tokens.currentIndex()<r;)this.tokens.removeToken();return this.tokens.removeToken(),this.processBalancedCode(),this.processToken(),!0}return!1}},{key:"processPossibleTypeRange",value:function(){if(this.tokens.currentToken().isType){for(this.tokens.removeInitialToken();this.tokens.currentToken().isType;)this.tokens.removeToken();return!0}return!1}}]),p}();exports.default=w;
},{"../parser/tokenizer/keywords":"GGTW","../parser/tokenizer/types":"sS1T","../util/getClassInfo":"fDA4","./CJSImportTransformer":"FsEu","./ESMImportTransformer":"MRZP","./FlowTransformer":"CO99","./JSXTransformer":"xUYp","./NumericSeparatorTransformer":"S5mr","./OptionalCatchBindingTransformer":"MRRY","./OptionalChainingNullishTransformer":"o0Sk","./ReactDisplayNameTransformer":"momJ","./ReactHotLoaderTransformer":"AxMm","./TypeScriptTransformer":"t5ej"}],"GLLC":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var t="\n",e="\r",n=function(){function n(n){this.string=n;for(var s=[0],o=0;o<n.length;)switch(n[o]){case t:o+=t.length,s.push(o);break;case e:n[o+=e.length]===t&&(o+=t.length),s.push(o);break;default:o++}this.offsets=s}return n.prototype.locationForIndex=function(t){if(t<0||t>this.string.length)return null;for(var e=0,n=this.offsets;n[e+1]<=t;)e++;return{line:e,column:t-n[e]}},n.prototype.indexForLocation=function(t){var e=t.line,n=t.column;return e<0||e>=this.offsets.length?null:n<0||n>this.lengthOfLine(e)?null:this.offsets[e]+n},n.prototype.lengthOfLine=function(t){var e=this.offsets[t];return(t===this.offsets.length-1?this.string.length:this.offsets[t+1])-e},n}(),s=n;exports.default=s;
},{}],"psyw":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=f;var n=r(require("lines-and-columns")),t=require("../parser/tokenizer/types");function r(n){return n&&n.__esModule?n:{default:n}}function e(n,t){var r;if("undefined"==typeof Symbol||null==n[Symbol.iterator]){if(Array.isArray(n)||(r=u(n))||t&&n&&"number"==typeof n.length){r&&(n=r);var e=0,o=function(){};return{s:o,n:function(){return e>=n.length?{done:!0}:{done:!1,value:n[e++]}},e:function(n){throw n},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var a,i=!0,c=!1;return{s:function(){r=n[Symbol.iterator]()},n:function(){var n=r.next();return i=n.done,n},e:function(n){c=!0,a=n},f:function(){try{i||null==r.return||r.return()}finally{if(c)throw a}}}}function o(n){return c(n)||i(n)||u(n)||a()}function a(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function u(n,t){if(n){if("string"==typeof n)return l(n,t);var r=Object.prototype.toString.call(n).slice(8,-1);return"Object"===r&&n.constructor&&(r=n.constructor.name),"Map"===r||"Set"===r?Array.from(n):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?l(n,t):void 0}}function i(n){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(n))return Array.from(n)}function c(n){if(Array.isArray(n))return l(n)}function l(n,t){(null==t||t>n.length)&&(t=n.length);for(var r=0,e=new Array(t);r<t;r++)e[r]=n[r];return e}function f(r,a){if(0===a.length)return"";var u,i=Object.keys(a[0]).filter(function(n){return"type"!==n&&"value"!==n&&"start"!==n&&"end"!==n&&"loc"!==n}),c=Object.keys(a[0].type).filter(function(n){return"label"!==n&&"keyword"!==n}),l=["Location","Label","Raw"].concat(o(i),o(c)),f=new n.default(r),s=[l].concat(o(a.map(function(n){var e=r.slice(n.start,n.end);return[(a=n.start,u=n.end,"".concat(h(a),"-").concat(h(u))),(0,t.formatTokenType)(n.type),y(String(e),14)].concat(o(i.map(function(t){return v(n[t],t)})),o(c.map(function(t){return v(n.type[t],t)})));var a,u}))),d=l.map(function(){return 0}),p=e(s);try{for(p.s();!(u=p.n()).done;)for(var m=u.value,b=0;b<m.length;b++)d[b]=Math.max(d[b],m[b].length)}catch(g){p.e(g)}finally{p.f()}return s.map(function(n){return n.map(function(n,t){return n.padEnd(d[t])}).join(" ")}).join("\n");function v(n,t){return!0===n?t:!1===n||null===n?"":String(n)}function h(n){var t=f.locationForIndex(n);return t?"".concat(t.line+1,":").concat(t.column+1):"Unknown"}}function y(n,t){return n.length>t?"".concat(n.slice(0,t-3),"..."):n}
},{"lines-and-columns":"GLLC","../parser/tokenizer/types":"sS1T"}],"L0XJ":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=n;var e=require("../parser/tokenizer/keywords"),t=require("../parser/tokenizer/types");function n(e){for(var n=new Set,a=0;a<e.tokens.length;a++)e.matches1AtIndex(a,t.TokenType._import)&&!e.matches3AtIndex(a,t.TokenType._import,t.TokenType.name,t.TokenType.eq)&&r(e,a,n);return n}function r(e,n,r){n++,e.matches1AtIndex(n,t.TokenType.parenL)||(e.matches1AtIndex(n,t.TokenType.name)&&(r.add(e.identifierNameAtIndex(n)),n++,e.matches1AtIndex(n,t.TokenType.comma)&&n++),e.matches1AtIndex(n,t.TokenType.star)&&(n+=2,r.add(e.identifierNameAtIndex(n)),n++),e.matches1AtIndex(n,t.TokenType.braceL)&&a(e,++n,r))}function a(n,r,a){for(;;){if(n.matches1AtIndex(r,t.TokenType.braceR))return;var o=n.identifierNameAtIndex(r);if(r++,n.matchesContextualAtIndex(r,e.ContextualKeyword._as)&&(r++,o=n.identifierNameAtIndex(r),r++),a.add(o),n.matches2AtIndex(r,t.TokenType.comma,t.TokenType.braceR))return;if(n.matches1AtIndex(r,t.TokenType.braceR))return;if(!n.matches1AtIndex(r,t.TokenType.comma))throw new Error("Unexpected token: ".concat(JSON.stringify(n.tokens[r])));r++}}
},{"../parser/tokenizer/keywords":"GGTW","../parser/tokenizer/types":"sS1T"}],"dLmb":[function(require,module,exports) {
module.exports={name:"sucrase",version:"3.15.0",description:"Super-fast alternative to Babel for when you can target modern JS runtimes",author:"Alan Pierce <alangpierce@gmail.com>",license:"MIT",main:"dist/index",module:"dist/index.mjs",types:"dist/index.d.ts",bin:{sucrase:"./bin/sucrase","sucrase-node":"./bin/sucrase-node"},scripts:{build:"sucrase-node script/build.ts","fast-build":"sucrase-node script/build.ts --fast",clean:"rm -rf ./build ./dist ./dist-self-build ./dist-types ./example-runner/example-repos ./test262/test262-checkout",generate:"sucrase-node generator/generate.ts",benchmark:"sucrase-node benchmark/benchmark.ts",microbenchmark:"sucrase-node benchmark/microbenchmark.ts","benchmark-react":"sucrase-node benchmark/benchmark-react.ts","benchmark-project":"sucrase-node benchmark/benchmark-project.ts",lint:"sucrase-node script/lint.ts",profile:"node --inspect-brk ./node_modules/.bin/sucrase-node ./benchmark/profile","profile-project":"node --inspect-brk ./node_modules/.bin/sucrase-node ./benchmark/benchmark-project.ts --profile",prepublishOnly:"yarn clean && yarn build",release:"sucrase-node script/release.ts","run-examples":"sucrase-node example-runner/example-runner.ts",test:"yarn lint && yarn test-only","test-only":"mocha './test/**/*.ts'",test262:"sucrase-node test262/run-test262.ts","test-with-coverage":"nyc mocha './test/**/*.ts'","report-coverage":"nyc report --reporter=text-lcov > coverage.lcov && codecov"},repository:{type:"git",url:"https://github.com/alangpierce/sucrase.git"},keywords:["babel","jsx","typescript","flow"],bugs:{url:"https://github.com/alangpierce/sucrase/issues"},devDependencies:{"@babel/cli":"^7.7.0","@babel/core":"^7.7.2","@babel/plugin-proposal-class-properties":"^7.7.0","@babel/plugin-proposal-object-rest-spread":"^7.6.2","@babel/plugin-transform-modules-commonjs":"^7.7.0","@babel/preset-flow":"^7.0.0","@babel/preset-react":"^7.7.0","@babel/preset-typescript":"^7.7.2","@types/glob":"7.1.1","@types/mocha":"^5.2.7","@types/mz":"^0.0.32","@types/node":"^12.12.7","@types/yargs-parser":"^13.1.0","@typescript-eslint/parser":"^2.33.0",chalk:"2.4.1",codecov:"^3.6.1",eslint:"^6.6.0","eslint-config-airbnb-base":"^14.0.0","eslint-config-prettier":"^6.5.0","eslint-plugin-import":"^2.18.2","eslint-plugin-prettier":"^3.1.1","eslint-plugin-typescript":"^0.14.0",mocha:"^7.1.1",nyc:"^14.1.1",prettier:"^2.0.5",sucrase:"^3.14.1","test262-harness":"^6.5.0","ts-interface-builder":"^0.2.1",tslint:"^5.20.1",typescript:"^3.7.2","typescript-tslint-plugin":"^0.5.4","yargs-parser":"^16.1.0"},dependencies:{commander:"^4.0.0",glob:"7.1.6","lines-and-columns":"^1.1.6",mz:"^2.7.0",pirates:"^4.0.1","ts-interface-checker":"^0.1.9"},engines:{node:">=8"},resolutions:{"**/eshost/socket.io":"^2"}};
},{}],"JP1Y":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.getVersion=f,exports.transform=d,exports.getFormattedTokens=m;var e=p(require("./CJSImportProcessor")),r=p(require("./computeSourceMap")),t=require("./HelperManager"),o=p(require("./identifyShadowedGlobals")),s=p(require("./NameManager")),n=require("./Options"),a=require("./parser"),u=p(require("./TokenProcessor")),i=p(require("./transformers/RootTransformer")),l=p(require("./util/formatTokens")),c=p(require("./util/getTSImportedNames"));function p(e){return e&&e.__esModule?e:{default:e}}function f(){return require("../package.json").version}function d(e,t){(0,n.validateOptions)(t);try{var o=g(e,t),s={code:new i.default(o,t.transforms,Boolean(t.enableLegacyBabel5ModuleInterop),t).transform()};if(t.sourceMapOptions){if(!t.filePath)throw new Error("filePath must be specified when generating a source map.");s={...s,sourceMap:(0,r.default)(s.code,t.filePath,t.sourceMapOptions)}}return s}catch(a){throw t.filePath&&(a.message="Error transforming ".concat(t.filePath,": ").concat(a.message)),a}}function m(e,r){var t=g(e,r).tokenProcessor.tokens;return(0,l.default)(e,t)}function g(r,n){var i=n.transforms.includes("jsx"),l=n.transforms.includes("typescript"),p=n.transforms.includes("flow"),f=(0,a.parse)(r,i,l,p),d=f.tokens,m=f.scopes,g=new s.default(r,d),M=new t.HelperManager(g),q=new u.default(r,d,p,M),y=Boolean(n.enableLegacyTypeScriptModuleInterop),h=null;return n.transforms.includes("imports")?((h=new e.default(g,q,y,n,n.transforms.includes("typescript"),M)).preprocessTokens(),(0,o.default)(q,m,h.getGlobalNames()),n.transforms.includes("typescript")&&h.pruneTypeOnlyImports()):n.transforms.includes("typescript")&&(0,o.default)(q,m,(0,c.default)(q)),{tokenProcessor:q,scopes:m,nameManager:g,importProcessor:h,helperManager:M}}
},{"./CJSImportProcessor":"XAQy","./computeSourceMap":"nRoK","./HelperManager":"e8q9","./identifyShadowedGlobals":"IgGt","./NameManager":"pt6I","./Options":"QEqm","./parser":"nAG2","./TokenProcessor":"pI6e","./transformers/RootTransformer":"svek","./util/formatTokens":"psyw","./util/getTSImportedNames":"L0XJ","../package.json":"dLmb"}],"Focm":[function(require,module,exports) {
var global = arguments[3];
var e=arguments[3];Object.defineProperty(exports,"__esModule",{value:!0});var r={};exports.default=void 0,require("core-js/es6/string"),require("core-js/es6/map"),require("core-js/es6/set"),require("core-js/es6/symbol"),require("core-js/fn/array/includes");var t=n(require("sucrase"));function o(){if("function"!=typeof WeakMap)return null;var e=new WeakMap;return o=function(){return e},e}function n(e){if(e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var r=o();if(r&&r.has(e))return r.get(e);var t={},n=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if(Object.prototype.hasOwnProperty.call(e,u)){var s=n?Object.getOwnPropertyDescriptor(e,u):null;s&&(s.get||s.set)?Object.defineProperty(t,u,s):t[u]=e[u]}return t.default=e,r&&r.set(e,t),t}Object.keys(t).forEach(function(e){"default"!==e&&"__esModule"!==e&&(Object.prototype.hasOwnProperty.call(r,e)||Object.defineProperty(exports,e,{enumerable:!0,get:function(){return t[e]}}))});var u=t;exports.default=u,e.sucrase=t;
},{"core-js/es6/string":"mfdM","core-js/es6/map":"C0Ih","core-js/es6/set":"VvYp","core-js/es6/symbol":"CtPZ","core-js/fn/array/includes":"rQfI","sucrase":"JP1Y"}]},{},["Focm"], null)
//# sourceMappingURL=/sucrase.min.js.map
})()
//# sourceMappingURL=https://unpkg.com/getlibs@0.1.1/dist/src.js.map
