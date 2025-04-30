
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./plasmic-rive.cjs.production.min.js')
} else {
  module.exports = require('./plasmic-rive.cjs.development.js')
}
