/*global assert:true */
'use strict';

var JSData = require('js-data');
var TestRunner = require('js-data-adapter-tests');

var mocha = require('mocha');
var coMocha = require('co-mocha');

coMocha(mocha);
JSData.DSUtils.Promise = require('bluebird');

var DSRedisAdapter = require('./');

var globals = module.exports = {
  TestRunner: TestRunner,
  assert: TestRunner.assert
};

var test = new mocha();

var testGlobals = [];

for (var key in globals) {
  global[key] = globals[key];
  testGlobals.push(globals[key]);
}
test.globals(testGlobals);

TestRunner.init({
  DS: JSData.DS,
  Adapter: DSRedisAdapter,
  features: []
});

beforeEach(function () {
  globals.DSUtils = global.DSUtils = this.$$DSUtils;
  globals.DSErrors = global.DSErrors = this.$$DSErrors;
  globals.adapter = global.adapter = this.$$adapter;
  globals.store = global.store = this.$$store;
  globals.User = global.User = this.$$User;
  globals.Profile = global.Profile = this.$$Profile;
  globals.Post = global.Post = this.$$Post;
  globals.Comment = global.Comment = this.$$Comment;
});
