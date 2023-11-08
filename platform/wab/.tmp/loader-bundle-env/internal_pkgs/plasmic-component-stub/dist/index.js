
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./plasmic-component-stub.cjs.production.min.js')
} else {
  module.exports = require('./plasmic-component-stub.cjs.development.js')
}
