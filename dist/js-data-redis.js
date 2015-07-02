module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var JSData = __webpack_require__(1);
	var redis = __webpack_require__(2);
	var underscore = __webpack_require__(3);
	var guid = __webpack_require__(4);
	var DSUtils = JSData.DSUtils;
	var deepMixIn = DSUtils.deepMixIn;
	var removeCircular = DSUtils.removeCircular;
	var forEach = DSUtils.forEach;
	var contains = DSUtils.contains;
	var omit = DSUtils.omit;

	var emptyStore = new JSData.DS();
	var filter = emptyStore.defaults.defaultFilter;

	var getPath = function getPath(resourceConfig) {
	  if (resourceConfig) {
	    return resourceConfig.table || underscore(resourceConfig.name);
	  }
	};

	var Defaults = function Defaults() {
	  _classCallCheck(this, Defaults);
	};

	var DSRedisAdapter = (function () {
	  function DSRedisAdapter(options) {
	    _classCallCheck(this, DSRedisAdapter);

	    options = options || {};
	    this.defaults = new Defaults();
	    deepMixIn(this.defaults, options);
	    this.client = redis.createClient(this.defaults);
	  }

	  _createClass(DSRedisAdapter, [{
	    key: 'getIds',
	    value: function getIds(resourceConfig) {
	      var _this = this;

	      return new DSUtils.Promise(function (resolve, reject) {
	        return _this.client.SMEMBERS(getPath(resourceConfig), function (err, ids) {
	          return err ? reject(err) : resolve(ids);
	        });
	      });
	    }
	  }, {
	    key: 'GET',
	    value: function GET(path) {
	      var _this2 = this;

	      return new DSUtils.Promise(function (resolve, reject) {
	        return _this2.client.GET(path, function (err, value) {
	          return err ? reject(err) : resolve(JSON.parse(value));
	        });
	      });
	    }
	  }, {
	    key: 'find',
	    value: function find(resourceConfig, id, options) {
	      var _this3 = this;

	      var fields = [];
	      return new DSUtils.Promise(function (resolve, reject) {
	        options = options || {};
	        return _this3.client.GET(getPath(resourceConfig) + '-' + id, function (err, item) {
	          if (err) {
	            reject(err);
	          } else if (!item) {
	            reject(new Error('Not Found!'));
	          } else {
	            resolve(JSON.parse(item));
	          }
	        });
	      }).then(function (instance) {
	        if (!options['with']) {
	          return instance;
	        }
	        var tasks = [];
	        forEach(resourceConfig.relationList, function (def) {
	          var relationName = def.relation;
	          var relationDef = resourceConfig.getResource(relationName);
	          var __options = DSUtils._(relationDef, options);
	          if (contains(options['with'], relationName) || contains(options['with'], def.localField)) {
	            var task = undefined;
	            var params = {};
	            if (__options.allowSimpleWhere) {
	              params[def.foreignKey] = instance[resourceConfig.idAttribute];
	            } else {
	              params.where = {};
	              params.where[def.foreignKey] = {
	                '==': instance[resourceConfig.idAttribute]
	              };
	            }

	            if (def.type === 'hasMany' && params[def.foreignKey]) {
	              task = _this3.findAll(relationDef, params, omit(__options.orig(), ['with']));
	            } else if (def.type === 'hasOne') {
	              if (def.localKey && instance[def.localKey]) {
	                task = _this3.find(relationDef, instance[def.localKey], omit(__options.orig(), ['with']));
	              } else if (def.foreignKey && params[def.foreignKey]) {
	                task = _this3.findAll(relationDef, params, omit(__options.orig(), ['with'])).then(function (hasOnes) {
	                  return hasOnes.length ? hasOnes[0] : null;
	                });
	              }
	            } else if (instance[def.localKey]) {
	              task = _this3.find(relationDef, instance[def.localKey], omit(__options.orig(), ['with']));
	            }

	            if (task) {
	              tasks.push(task);
	              fields.push(def.localField);
	            }
	          }
	        });
	        if (tasks.length) {
	          return DSUtils.Promise.all(tasks).then(function (loadedRelations) {
	            forEach(fields, function (field, index) {
	              instance[field] = loadedRelations[index];
	            });
	            return instance;
	          });
	        }
	        return instance;
	      });
	    }
	  }, {
	    key: 'findAll',
	    value: function findAll(resourceConfig, params, options) {
	      var _this4 = this;

	      return this.getIds(resourceConfig).then(function (ids) {
	        options = options || {};
	        var tasks = [];
	        var path = getPath(resourceConfig);
	        forEach(ids, function (id) {
	          return tasks.push(_this4.GET(path + '-' + id));
	        });
	        return DSUtils.Promise.all(tasks);
	      }).then(function (items) {
	        return filter.call(emptyStore, items, resourceConfig.name, params, { allowSimpleWhere: true });
	      }).then(function (items) {
	        if (!options['with']) {
	          return items;
	        }
	        var topTasks = [];
	        forEach(items, function (instance) {
	          var tasks = [];
	          var fields = [];
	          forEach(resourceConfig.relationList, function (def) {
	            var relationName = def.relation;
	            var relationDef = resourceConfig.getResource(relationName);
	            var __options = DSUtils._(relationDef, options);
	            if (contains(options['with'], relationName) || contains(options['with'], def.localField)) {
	              var task = undefined;
	              var _params = {};
	              if (__options.allowSimpleWhere) {
	                _params[def.foreignKey] = instance[resourceConfig.idAttribute];
	              } else {
	                _params.where = {};
	                _params.where[def.foreignKey] = {
	                  '==': instance[resourceConfig.idAttribute]
	                };
	              }

	              if (def.type === 'hasMany' && _params[def.foreignKey]) {
	                task = _this4.findAll(relationDef, _params, omit(__options.orig(), ['with']));
	              } else if (def.type === 'hasOne') {
	                if (def.localKey && instance[def.localKey]) {
	                  task = _this4.find(relationDef, instance[def.localKey], omit(__options.orig(), ['with']));
	                } else if (def.foreignKey && _params[def.foreignKey]) {
	                  task = _this4.findAll(relationDef, _params, omit(__options.orig(), ['with'])).then(function (hasOnes) {
	                    return hasOnes.length ? hasOnes[0] : null;
	                  });
	                }
	              } else if (instance[def.localKey]) {
	                task = _this4.find(relationDef, instance[def.localKey], omit(__options.orig(), ['with']));
	              }

	              if (task) {
	                tasks.push(task);
	                fields.push(def.localField);
	              }
	            }
	          });
	          if (tasks.length) {
	            topTasks.push(DSUtils.Promise.all(tasks).then(function (loadedRelations) {
	              forEach(fields, function (field, index) {
	                instance[field] = loadedRelations[index];
	              });
	              return instance;
	            }));
	          }
	        });
	        if (topTasks.length) {
	          return DSUtils.Promise.all(topTasks);
	        }
	        return items;
	      });
	    }
	  }, {
	    key: 'create',
	    value: function create(resourceConfig, attrs) {
	      var _this5 = this;

	      return new DSUtils.Promise(function (resolve, reject) {
	        attrs = removeCircular(omit(attrs, resourceConfig.relationFields || []));
	        attrs[resourceConfig.idAttribute] = attrs[resourceConfig.idAttribute] || guid();
	        return _this5.client.multi().SET(getPath(resourceConfig) + '-' + attrs[resourceConfig.idAttribute], JSON.stringify(attrs)).SADD(getPath(resourceConfig), attrs[resourceConfig.idAttribute]).exec(function (err) {
	          return err ? reject(err) : resolve(attrs);
	        });
	      });
	    }
	  }, {
	    key: 'update',
	    value: function update(resourceConfig, id, attrs) {
	      var _this6 = this;

	      return new DSUtils.Promise(function (resolve, reject) {
	        attrs = removeCircular(omit(attrs, resourceConfig.relationFields || []));
	        var path = getPath(resourceConfig) + '-' + id;
	        return _this6.client.GET(path, function (err, value) {
	          if (err) {
	            reject(err);
	          } else if (!value) {
	            reject(new Error('Not Found!'));
	          } else {
	            value = JSON.parse(value);
	            deepMixIn(value, attrs);
	            _this6.client.SET(path, JSON.stringify(value), function (err) {
	              return err ? reject(err) : resolve(value);
	            });
	          }
	        });
	      });
	    }
	  }, {
	    key: 'updateAll',
	    value: function updateAll(resourceConfig, attrs, params) {
	      var _this7 = this;

	      return this.findAll(resourceConfig, params).then(function (items) {
	        var tasks = [];
	        forEach(items, function (item) {
	          return tasks.push(_this7.update(resourceConfig, item[resourceConfig.idAttribute], attrs));
	        });
	        return DSUtils.Promise.all(tasks);
	      });
	    }
	  }, {
	    key: 'destroy',
	    value: function destroy(resourceConfig, id) {
	      var _this8 = this;

	      return new DSUtils.Promise(function (resolve, reject) {
	        var path = getPath(resourceConfig);
	        return _this8.client.multi().DEL(path + '-' + id).SREM(path, id).exec(function (err) {
	          return err ? reject(err) : resolve();
	        });
	      });
	    }
	  }, {
	    key: 'destroyAll',
	    value: function destroyAll(resourceConfig, params) {
	      var _this9 = this;

	      return this.findAll(resourceConfig, params).then(function (items) {
	        var tasks = [];
	        forEach(items, function (item) {
	          return tasks.push(_this9.destroy(resourceConfig, item[resourceConfig.idAttribute]));
	        });
	        return DSUtils.Promise.all(tasks);
	      });
	    }
	  }]);

	  return DSRedisAdapter;
	})();

	exports['default'] = DSRedisAdapter;
	module.exports = exports['default'];

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = require("js-data");

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = require("redis");

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = require("mout/string/underscore");

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = require("mout/random/guid");

/***/ }
/******/ ]);