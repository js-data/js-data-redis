/*global assert:true */
'use strict'

// prepare environment for js-data-adapter-tests
require('babel-polyfill')

var JSData = require('js-data')
var JSDataAdapterTests = require('js-data-adapter-tests')
var JSDataRedis = require('./')

var assert = global.assert = JSDataAdapterTests.assert
global.sinon = JSDataAdapterTests.sinon

JSDataAdapterTests.init({
  debug: false,
  JSData: JSData,
  Adapter: JSDataRedis.RedisAdapter,
  adapterConfig: {
    debug: false
  },
  xfeatures: [
    'findAllOpNotFound',
    'filterOnRelations'
  ]
})

describe('exports', function () {
  it('should have correct exports', function () {
    assert(JSDataRedis.default)
    assert(JSDataRedis.RedisAdapter)
    assert(JSDataRedis.RedisAdapter === JSDataRedis.default)
    assert(JSDataRedis.version)
    assert(JSDataRedis.version.full)
  })
})
