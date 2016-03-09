/*global assert:true */
'use strict'

// prepare environment for js-data-adapter-tests
require('babel-polyfill')

var JSData = require('js-data')
var JSDataAdapterTests = require('js-data-adapter-tests')
var RedisAdapter = require('./')

global.assert = JSDataAdapterTests.assert
global.sinon = JSDataAdapterTests.sinon

JSDataAdapterTests.init({
  debug: false,
  JSData: JSData,
  Adapter: RedisAdapter,
  adapterConfig: {
    debug: false
  },
  xfeatures: [
    'findAllOpNotFound',
    'filterOnRelations'
  ]
})
