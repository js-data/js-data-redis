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

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var JSData = __webpack_require__(1);
	var redis = __webpack_require__(2);
	var map = __webpack_require__(3);
	var unique = __webpack_require__(4);
	var underscore = __webpack_require__(5);
	var guid = __webpack_require__(6);
	var DSUtils = JSData.DSUtils;

	var emptyStore = new JSData.DS();
	var filter = emptyStore.defaults.defaultFilter;

	function getPath(resourceConfig) {
	  if (resourceConfig) {
	    return resourceConfig.table || underscore(resourceConfig.name);
	  }
	}

	var Defaults = function Defaults() {
	  _classCallCheck(this, Defaults);
	};

	var DSRedisAdapter = (function () {
	  function DSRedisAdapter(options) {
	    _classCallCheck(this, DSRedisAdapter);

	    options = options || {};

	    var host = options.hasOwnProperty('host') ? options.host : '127.0.0.1';
	    delete options.host;
	    var port = options.hasOwnProperty('port') ? options.port : 6379;
	    delete options.port;

	    this.defaults = new Defaults();
	    DSUtils.deepMixIn(this.defaults, options);
	    this.client = redis.createClient(port, host, this.defaults);
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

	      var instance = undefined;
	      options = options || {};
	      options['with'] = options['with'] || [];
	      return new DSUtils.Promise(function (resolve, reject) {
	        return _this3.client.GET(getPath(resourceConfig) + '-' + id, function (err, item) {
	          if (err) {
	            reject(err);
	          } else if (!item) {
	            reject(new Error('Not Found!'));
	          } else {
	            resolve(JSON.parse(item));
	          }
	        });
	      }).then(function (_instance) {
	        instance = _instance;
	        var tasks = [];

	        DSUtils.forEach(resourceConfig.relationList, function (def) {
	          var relationName = def.relation;
	          var relationDef = resourceConfig.getResource(relationName);
	          var containedName = null;
	          if (DSUtils.contains(options['with'], relationName)) {
	            containedName = relationName;
	          } else if (DSUtils.contains(options['with'], def.localField)) {
	            containedName = def.localField;
	          }
	          if (containedName) {
	            (function () {
	              var __options = DSUtils.deepMixIn({}, options.orig ? options.orig() : options);
	              __options['with'] = options['with'].slice();
	              __options = DSUtils._(relationDef, __options);
	              DSUtils.remove(__options['with'], containedName);
	              DSUtils.forEach(__options['with'], function (relation, i) {
	                if (relation && relation.indexOf(containedName) === 0 && relation.length >= containedName.length && relation[containedName.length] === '.') {
	                  __options['with'][i] = relation.substr(containedName.length + 1);
	                } else {
	                  __options['with'][i] = '';
	                }
	              });

	              var task = undefined;

	              if ((def.type === 'hasOne' || def.type === 'hasMany') && def.foreignKey) {
	                task = _this3.findAll(resourceConfig.getResource(relationName), {
	                  where: _defineProperty({}, def.foreignKey, {
	                    '==': instance[resourceConfig.idAttribute]
	                  })
	                }, __options).then(function (relatedItems) {
	                  if (def.type === 'hasOne' && relatedItems.length) {
	                    DSUtils.set(instance, def.localField, relatedItems[0]);
	                  } else {
	                    DSUtils.set(instance, def.localField, relatedItems);
	                  }
	                  return relatedItems;
	                });
	              } else if (def.type === 'hasMany' && def.localKeys) {
	                var localKeys = [];
	                var itemKeys = instance[def.localKeys] || [];
	                itemKeys = Array.isArray(itemKeys) ? itemKeys : DSUtils.keys(itemKeys);
	                localKeys = localKeys.concat(itemKeys || []);
	                task = _this3.findAll(resourceConfig.getResource(relationName), {
	                  where: _defineProperty({}, relationDef.idAttribute, {
	                    'in': DSUtils.filter(unique(localKeys), function (x) {
	                      return x;
	                    })
	                  })
	                }, __options).then(function (relatedItems) {
	                  DSUtils.set(instance, def.localField, relatedItems);
	                  return relatedItems;
	                });
	              } else if (def.type === 'belongsTo' || def.type === 'hasOne' && def.localKey) {
	                task = _this3.find(resourceConfig.getResource(relationName), DSUtils.get(instance, def.localKey), __options).then(function (relatedItem) {
	                  DSUtils.set(instance, def.localField, relatedItem);
	                  return relatedItem;
	                });
	              }

	              if (task) {
	                tasks.push(task);
	              }
	            })();
	          }
	        });

	        return DSUtils.Promise.all(tasks);
	      }).then(function () {
	        return instance;
	      });
	    }
	  }, {
	    key: 'findAll',
	    value: function findAll(resourceConfig, params, options) {
	      var _this4 = this;

	      var items = null;
	      options = options || {};
	      options['with'] = options['with'] || [];
	      return this.getIds(resourceConfig).then(function (ids) {
	        var tasks = [];
	        var path = getPath(resourceConfig);
	        DSUtils.forEach(ids, function (id) {
	          return tasks.push(_this4.GET(path + '-' + id));
	        });
	        return DSUtils.Promise.all(tasks);
	      }).then(function (items) {
	        return filter.call(emptyStore, items, resourceConfig.name, params, { allowSimpleWhere: true });
	      }).then(function (_items) {
	        items = _items;
	        var tasks = [];
	        DSUtils.forEach(resourceConfig.relationList, function (def) {
	          var relationName = def.relation;
	          var relationDef = resourceConfig.getResource(relationName);
	          var containedName = null;
	          if (DSUtils.contains(options['with'], relationName)) {
	            containedName = relationName;
	          } else if (DSUtils.contains(options['with'], def.localField)) {
	            containedName = def.localField;
	          }
	          if (containedName) {
	            (function () {
	              var __options = DSUtils.deepMixIn({}, options.orig ? options.orig() : options);
	              __options['with'] = options['with'].slice();
	              __options = DSUtils._(relationDef, __options);
	              DSUtils.remove(__options['with'], containedName);
	              DSUtils.forEach(__options['with'], function (relation, i) {
	                if (relation && relation.indexOf(containedName) === 0 && relation.length >= containedName.length && relation[containedName.length] === '.') {
	                  __options['with'][i] = relation.substr(containedName.length + 1);
	                } else {
	                  __options['with'][i] = '';
	                }
	              });

	              var task = undefined;

	              if ((def.type === 'hasOne' || def.type === 'hasMany') && def.foreignKey) {
	                task = _this4.findAll(resourceConfig.getResource(relationName), {
	                  where: _defineProperty({}, def.foreignKey, {
	                    'in': DSUtils.filter(map(items, function (item) {
	                      return DSUtils.get(item, resourceConfig.idAttribute);
	                    }), function (x) {
	                      return x;
	                    })
	                  })
	                }, __options).then(function (relatedItems) {
	                  DSUtils.forEach(items, function (item) {
	                    var attached = [];
	                    DSUtils.forEach(relatedItems, function (relatedItem) {
	                      if (DSUtils.get(relatedItem, def.foreignKey) === item[resourceConfig.idAttribute]) {
	                        attached.push(relatedItem);
	                      }
	                    });
	                    if (def.type === 'hasOne' && attached.length) {
	                      DSUtils.set(item, def.localField, attached[0]);
	                    } else {
	                      DSUtils.set(item, def.localField, attached);
	                    }
	                  });
	                  return relatedItems;
	                });
	              } else if (def.type === 'hasMany' && def.localKeys) {
	                (function () {
	                  var localKeys = [];
	                  DSUtils.forEach(items, function (item) {
	                    var itemKeys = item[def.localKeys] || [];
	                    itemKeys = Array.isArray(itemKeys) ? itemKeys : DSUtils.keys(itemKeys);
	                    localKeys = localKeys.concat(itemKeys || []);
	                  });
	                  task = _this4.findAll(resourceConfig.getResource(relationName), {
	                    where: _defineProperty({}, relationDef.idAttribute, {
	                      'in': DSUtils.filter(unique(localKeys), function (x) {
	                        return x;
	                      })
	                    })
	                  }, __options).then(function (relatedItems) {
	                    DSUtils.forEach(items, function (item) {
	                      var attached = [];
	                      var itemKeys = item[def.localKeys] || [];
	                      itemKeys = Array.isArray(itemKeys) ? itemKeys : DSUtils.keys(itemKeys);
	                      DSUtils.forEach(relatedItems, function (relatedItem) {
	                        if (itemKeys && DSUtils.contains(itemKeys, relatedItem[relationDef.idAttribute])) {
	                          attached.push(relatedItem);
	                        }
	                      });
	                      DSUtils.set(item, def.localField, attached);
	                    });
	                    return relatedItems;
	                  });
	                })();
	              } else if (def.type === 'belongsTo' || def.type === 'hasOne' && def.localKey) {
	                task = _this4.findAll(resourceConfig.getResource(relationName), {
	                  where: _defineProperty({}, relationDef.idAttribute, {
	                    'in': DSUtils.filter(map(items, function (item) {
	                      return DSUtils.get(item, def.localKey);
	                    }), function (x) {
	                      return x;
	                    })
	                  })
	                }, __options).then(function (relatedItems) {
	                  DSUtils.forEach(items, function (item) {
	                    DSUtils.forEach(relatedItems, function (relatedItem) {
	                      if (relatedItem[relationDef.idAttribute] === item[def.localKey]) {
	                        DSUtils.set(item, def.localField, relatedItem);
	                      }
	                    });
	                  });
	                  return relatedItems;
	                });
	              }

	              if (task) {
	                tasks.push(task);
	              }
	            })();
	          }
	        });
	        return DSUtils.Promise.all(tasks);
	      }).then(function () {
	        return items;
	      });
	    }
	  }, {
	    key: 'create',
	    value: function create(resourceConfig, attrs) {
	      var _this5 = this;

	      return new DSUtils.Promise(function (resolve, reject) {
	        attrs = DSUtils.removeCircular(DSUtils.omit(attrs, resourceConfig.relationFields || []));
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
	        attrs = DSUtils.removeCircular(DSUtils.omit(attrs, resourceConfig.relationFields || []));
	        var path = getPath(resourceConfig) + '-' + id;
	        return _this6.client.GET(path, function (err, value) {
	          if (err) {
	            reject(err);
	          } else if (!value) {
	            reject(new Error('Not Found!'));
	          } else {
	            value = JSON.parse(value);
	            DSUtils.deepMixIn(value, attrs);
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
	        DSUtils.forEach(items, function (item) {
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
	        DSUtils.forEach(items, function (item) {
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
/***/ function(module, exports) {

	module.exports = require("js-data");

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = require("redis");

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = require("mout/array/map");

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("mout/array/unique");

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = require("mout/string/underscore");

/***/ },
/* 6 */
/***/ function(module, exports) {

	module.exports = require("mout/random/guid");

/***/ }
/******/ ]);