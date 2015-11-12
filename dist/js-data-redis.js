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

	'use strict';

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var JSData = __webpack_require__(1);
	var redis = __webpack_require__(2);
	var map = __webpack_require__(3);
	var unique = __webpack_require__(14);
	var underscore = __webpack_require__(16);
	var guid = __webpack_require__(26);
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
	      options.with = options.with || [];
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
	          if (DSUtils.contains(options.with, relationName)) {
	            containedName = relationName;
	          } else if (DSUtils.contains(options.with, def.localField)) {
	            containedName = def.localField;
	          }
	          if (containedName) {
	            (function () {
	              var __options = DSUtils.deepMixIn({}, options.orig ? options.orig() : options);
	              __options.with = options.with.slice();
	              __options = DSUtils._(relationDef, __options);
	              DSUtils.remove(__options.with, containedName);
	              DSUtils.forEach(__options.with, function (relation, i) {
	                if (relation && relation.indexOf(containedName) === 0 && relation.length >= containedName.length && relation[containedName.length] === '.') {
	                  __options.with[i] = relation.substr(containedName.length + 1);
	                } else {
	                  __options.with[i] = '';
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
	      options.with = options.with || [];
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
	          if (DSUtils.contains(options.with, relationName)) {
	            containedName = relationName;
	          } else if (DSUtils.contains(options.with, def.localField)) {
	            containedName = def.localField;
	          }
	          if (containedName) {
	            (function () {
	              var __options = DSUtils.deepMixIn({}, options.orig ? options.orig() : options);
	              __options.with = options.with.slice();
	              __options = DSUtils._(relationDef, __options);
	              DSUtils.remove(__options.with, containedName);
	              DSUtils.forEach(__options.with, function (relation, i) {
	                if (relation && relation.indexOf(containedName) === 0 && relation.length >= containedName.length && relation[containedName.length] === '.') {
	                  __options.with[i] = relation.substr(containedName.length + 1);
	                } else {
	                  __options.with[i] = '';
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

	module.exports = DSRedisAdapter;

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
/***/ function(module, exports, __webpack_require__) {

	var makeIterator = __webpack_require__(4);

	    /**
	     * Array map
	     */
	    function map(arr, callback, thisObj) {
	        callback = makeIterator(callback, thisObj);
	        var results = [];
	        if (arr == null){
	            return results;
	        }

	        var i = -1, len = arr.length;
	        while (++i < len) {
	            results[i] = callback(arr[i], i, arr);
	        }

	        return results;
	    }

	     module.exports = map;



/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var identity = __webpack_require__(5);
	var prop = __webpack_require__(6);
	var deepMatches = __webpack_require__(7);

	    /**
	     * Converts argument into a valid iterator.
	     * Used internally on most array/object/collection methods that receives a
	     * callback/iterator providing a shortcut syntax.
	     */
	    function makeIterator(src, thisObj){
	        if (src == null) {
	            return identity;
	        }
	        switch(typeof src) {
	            case 'function':
	                // function is the first to improve perf (most common case)
	                // also avoid using `Function#call` if not needed, which boosts
	                // perf a lot in some cases
	                return (typeof thisObj !== 'undefined')? function(val, i, arr){
	                    return src.call(thisObj, val, i, arr);
	                } : src;
	            case 'object':
	                return function(val){
	                    return deepMatches(val, src);
	                };
	            case 'string':
	            case 'number':
	                return prop(src);
	        }
	    }

	    module.exports = makeIterator;




/***/ },
/* 5 */
/***/ function(module, exports) {

	

	    /**
	     * Returns the first argument provided to it.
	     */
	    function identity(val){
	        return val;
	    }

	    module.exports = identity;




/***/ },
/* 6 */
/***/ function(module, exports) {

	

	    /**
	     * Returns a function that gets a property of the passed object
	     */
	    function prop(name){
	        return function(obj){
	            return obj[name];
	        };
	    }

	    module.exports = prop;




/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var forOwn = __webpack_require__(8);
	var isArray = __webpack_require__(11);

	    function containsMatch(array, pattern) {
	        var i = -1, length = array.length;
	        while (++i < length) {
	            if (deepMatches(array[i], pattern)) {
	                return true;
	            }
	        }

	        return false;
	    }

	    function matchArray(target, pattern) {
	        var i = -1, patternLength = pattern.length;
	        while (++i < patternLength) {
	            if (!containsMatch(target, pattern[i])) {
	                return false;
	            }
	        }

	        return true;
	    }

	    function matchObject(target, pattern) {
	        var result = true;
	        forOwn(pattern, function(val, key) {
	            if (!deepMatches(target[key], val)) {
	                // Return false to break out of forOwn early
	                return (result = false);
	            }
	        });

	        return result;
	    }

	    /**
	     * Recursively check if the objects match.
	     */
	    function deepMatches(target, pattern){
	        if (target && typeof target === 'object') {
	            if (isArray(target) && isArray(pattern)) {
	                return matchArray(target, pattern);
	            } else {
	                return matchObject(target, pattern);
	            }
	        } else {
	            return target === pattern;
	        }
	    }

	    module.exports = deepMatches;




/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var hasOwn = __webpack_require__(9);
	var forIn = __webpack_require__(10);

	    /**
	     * Similar to Array/forEach but works over object properties and fixes Don't
	     * Enum bug on IE.
	     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
	     */
	    function forOwn(obj, fn, thisObj){
	        forIn(obj, function(val, key){
	            if (hasOwn(obj, key)) {
	                return fn.call(thisObj, obj[key], key, obj);
	            }
	        });
	    }

	    module.exports = forOwn;




/***/ },
/* 9 */
/***/ function(module, exports) {

	

	    /**
	     * Safer Object.hasOwnProperty
	     */
	     function hasOwn(obj, prop){
	         return Object.prototype.hasOwnProperty.call(obj, prop);
	     }

	     module.exports = hasOwn;




/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var hasOwn = __webpack_require__(9);

	    var _hasDontEnumBug,
	        _dontEnums;

	    function checkDontEnum(){
	        _dontEnums = [
	                'toString',
	                'toLocaleString',
	                'valueOf',
	                'hasOwnProperty',
	                'isPrototypeOf',
	                'propertyIsEnumerable',
	                'constructor'
	            ];

	        _hasDontEnumBug = true;

	        for (var key in {'toString': null}) {
	            _hasDontEnumBug = false;
	        }
	    }

	    /**
	     * Similar to Array/forEach but works over object properties and fixes Don't
	     * Enum bug on IE.
	     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
	     */
	    function forIn(obj, fn, thisObj){
	        var key, i = 0;
	        // no need to check if argument is a real object that way we can use
	        // it for arrays, functions, date, etc.

	        //post-pone check till needed
	        if (_hasDontEnumBug == null) checkDontEnum();

	        for (key in obj) {
	            if (exec(fn, obj, key, thisObj) === false) {
	                break;
	            }
	        }


	        if (_hasDontEnumBug) {
	            var ctor = obj.constructor,
	                isProto = !!ctor && obj === ctor.prototype;

	            while (key = _dontEnums[i++]) {
	                // For constructor, if it is a prototype object the constructor
	                // is always non-enumerable unless defined otherwise (and
	                // enumerated above).  For non-prototype objects, it will have
	                // to be defined on this object, since it cannot be defined on
	                // any prototype objects.
	                //
	                // For other [[DontEnum]] properties, check if the value is
	                // different than Object prototype value.
	                if (
	                    (key !== 'constructor' ||
	                        (!isProto && hasOwn(obj, key))) &&
	                    obj[key] !== Object.prototype[key]
	                ) {
	                    if (exec(fn, obj, key, thisObj) === false) {
	                        break;
	                    }
	                }
	            }
	        }
	    }

	    function exec(fn, obj, key, thisObj){
	        return fn.call(thisObj, obj[key], key, obj);
	    }

	    module.exports = forIn;




/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	var isKind = __webpack_require__(12);
	    /**
	     */
	    var isArray = Array.isArray || function (val) {
	        return isKind(val, 'Array');
	    };
	    module.exports = isArray;



/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	var kindOf = __webpack_require__(13);
	    /**
	     * Check if value is from a specific "kind".
	     */
	    function isKind(val, kind){
	        return kindOf(val) === kind;
	    }
	    module.exports = isKind;



/***/ },
/* 13 */
/***/ function(module, exports) {

	

	    var _rKind = /^\[object (.*)\]$/,
	        _toString = Object.prototype.toString,
	        UNDEF;

	    /**
	     * Gets the "kind" of value. (e.g. "String", "Number", etc)
	     */
	    function kindOf(val) {
	        if (val === null) {
	            return 'Null';
	        } else if (val === UNDEF) {
	            return 'Undefined';
	        } else {
	            return _rKind.exec( _toString.call(val) )[1];
	        }
	    }
	    module.exports = kindOf;



/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var filter = __webpack_require__(15);

	    /**
	     * @return {array} Array of unique items
	     */
	    function unique(arr, compare){
	        compare = compare || isEqual;
	        return filter(arr, function(item, i, arr){
	            var n = arr.length;
	            while (++i < n) {
	                if ( compare(item, arr[i]) ) {
	                    return false;
	                }
	            }
	            return true;
	        });
	    }

	    function isEqual(a, b){
	        return a === b;
	    }

	    module.exports = unique;




/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	var makeIterator = __webpack_require__(4);

	    /**
	     * Array filter
	     */
	    function filter(arr, callback, thisObj) {
	        callback = makeIterator(callback, thisObj);
	        var results = [];
	        if (arr == null) {
	            return results;
	        }

	        var i = -1, len = arr.length, value;
	        while (++i < len) {
	            value = arr[i];
	            if (callback(value, i, arr)) {
	                results.push(value);
	            }
	        }

	        return results;
	    }

	    module.exports = filter;




/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	var toString = __webpack_require__(17);
	var slugify = __webpack_require__(18);
	var unCamelCase = __webpack_require__(25);
	    /**
	     * Replaces spaces with underscores, split camelCase text, remove non-word chars, remove accents and convert to lower case.
	     */
	    function underscore(str){
	        str = toString(str);
	        str = unCamelCase(str);
	        return slugify(str, "_");
	    }
	    module.exports = underscore;



/***/ },
/* 17 */
/***/ function(module, exports) {

	

	    /**
	     * Typecast a value to a String, using an empty string value for null or
	     * undefined.
	     */
	    function toString(val){
	        return val == null ? '' : val.toString();
	    }

	    module.exports = toString;




/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	var toString = __webpack_require__(17);
	var replaceAccents = __webpack_require__(19);
	var removeNonWord = __webpack_require__(20);
	var trim = __webpack_require__(21);
	    /**
	     * Convert to lower case, remove accents, remove non-word chars and
	     * replace spaces with the specified delimeter.
	     * Does not split camelCase text.
	     */
	    function slugify(str, delimeter){
	        str = toString(str);

	        if (delimeter == null) {
	            delimeter = "-";
	        }
	        str = replaceAccents(str);
	        str = removeNonWord(str);
	        str = trim(str) //should come after removeNonWord
	                .replace(/ +/g, delimeter) //replace spaces with delimeter
	                .toLowerCase();
	        return str;
	    }
	    module.exports = slugify;



/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	var toString = __webpack_require__(17);
	    /**
	    * Replaces all accented chars with regular ones
	    */
	    function replaceAccents(str){
	        str = toString(str);

	        // verifies if the String has accents and replace them
	        if (str.search(/[\xC0-\xFF]/g) > -1) {
	            str = str
	                    .replace(/[\xC0-\xC5]/g, "A")
	                    .replace(/[\xC6]/g, "AE")
	                    .replace(/[\xC7]/g, "C")
	                    .replace(/[\xC8-\xCB]/g, "E")
	                    .replace(/[\xCC-\xCF]/g, "I")
	                    .replace(/[\xD0]/g, "D")
	                    .replace(/[\xD1]/g, "N")
	                    .replace(/[\xD2-\xD6\xD8]/g, "O")
	                    .replace(/[\xD9-\xDC]/g, "U")
	                    .replace(/[\xDD]/g, "Y")
	                    .replace(/[\xDE]/g, "P")
	                    .replace(/[\xE0-\xE5]/g, "a")
	                    .replace(/[\xE6]/g, "ae")
	                    .replace(/[\xE7]/g, "c")
	                    .replace(/[\xE8-\xEB]/g, "e")
	                    .replace(/[\xEC-\xEF]/g, "i")
	                    .replace(/[\xF1]/g, "n")
	                    .replace(/[\xF2-\xF6\xF8]/g, "o")
	                    .replace(/[\xF9-\xFC]/g, "u")
	                    .replace(/[\xFE]/g, "p")
	                    .replace(/[\xFD\xFF]/g, "y");
	        }
	        return str;
	    }
	    module.exports = replaceAccents;



/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var toString = __webpack_require__(17);
	    // This pattern is generated by the _build/pattern-removeNonWord.js script
	    var PATTERN = /[^\x20\x2D0-9A-Z\x5Fa-z\xC0-\xD6\xD8-\xF6\xF8-\xFF]/g;

	    /**
	     * Remove non-word chars.
	     */
	    function removeNonWord(str){
	        str = toString(str);
	        return str.replace(PATTERN, '');
	    }

	    module.exports = removeNonWord;



/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	var toString = __webpack_require__(17);
	var WHITE_SPACES = __webpack_require__(22);
	var ltrim = __webpack_require__(23);
	var rtrim = __webpack_require__(24);
	    /**
	     * Remove white-spaces from beginning and end of string.
	     */
	    function trim(str, chars) {
	        str = toString(str);
	        chars = chars || WHITE_SPACES;
	        return ltrim(rtrim(str, chars), chars);
	    }

	    module.exports = trim;



/***/ },
/* 22 */
/***/ function(module, exports) {

	
	    /**
	     * Contains all Unicode white-spaces. Taken from
	     * http://en.wikipedia.org/wiki/Whitespace_character.
	     */
	    module.exports = [
	        ' ', '\n', '\r', '\t', '\f', '\v', '\u00A0', '\u1680', '\u180E',
	        '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006',
	        '\u2007', '\u2008', '\u2009', '\u200A', '\u2028', '\u2029', '\u202F',
	        '\u205F', '\u3000'
	    ];



/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	var toString = __webpack_require__(17);
	var WHITE_SPACES = __webpack_require__(22);
	    /**
	     * Remove chars from beginning of string.
	     */
	    function ltrim(str, chars) {
	        str = toString(str);
	        chars = chars || WHITE_SPACES;

	        var start = 0,
	            len = str.length,
	            charLen = chars.length,
	            found = true,
	            i, c;

	        while (found && start < len) {
	            found = false;
	            i = -1;
	            c = str.charAt(start);

	            while (++i < charLen) {
	                if (c === chars[i]) {
	                    found = true;
	                    start++;
	                    break;
	                }
	            }
	        }

	        return (start >= len) ? '' : str.substr(start, len);
	    }

	    module.exports = ltrim;



/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	var toString = __webpack_require__(17);
	var WHITE_SPACES = __webpack_require__(22);
	    /**
	     * Remove chars from end of string.
	     */
	    function rtrim(str, chars) {
	        str = toString(str);
	        chars = chars || WHITE_SPACES;

	        var end = str.length - 1,
	            charLen = chars.length,
	            found = true,
	            i, c;

	        while (found && end >= 0) {
	            found = false;
	            i = -1;
	            c = str.charAt(end);

	            while (++i < charLen) {
	                if (c === chars[i]) {
	                    found = true;
	                    end--;
	                    break;
	                }
	            }
	        }

	        return (end >= 0) ? str.substring(0, end + 1) : '';
	    }

	    module.exports = rtrim;



/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	var toString = __webpack_require__(17);

	    var CAMEL_CASE_BORDER = /([a-z\xE0-\xFF])([A-Z\xC0\xDF])/g;

	    /**
	     * Add space between camelCase text.
	     */
	    function unCamelCase(str, delimiter){
	        if (delimiter == null) {
	            delimiter = ' ';
	        }

	        function join(str, c1, c2) {
	            return c1 + delimiter + c2;
	        }

	        str = toString(str);
	        str = str.replace(CAMEL_CASE_BORDER, join);
	        str = str.toLowerCase(); //add space between camelCase text
	        return str;
	    }
	    module.exports = unCamelCase;



/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	var randHex = __webpack_require__(27);
	var choice = __webpack_require__(28);

	  /**
	   * Returns pseudo-random guid (UUID v4)
	   * IMPORTANT: it's not totally "safe" since randHex/choice uses Math.random
	   * by default and sequences can be predicted in some cases. See the
	   * "random/random" documentation for more info about it and how to replace
	   * the default PRNG.
	   */
	  function guid() {
	    return (
	        randHex(8)+'-'+
	        randHex(4)+'-'+
	        // v4 UUID always contain "4" at this position to specify it was
	        // randomly generated
	        '4' + randHex(3) +'-'+
	        // v4 UUID always contain chars [a,b,8,9] at this position
	        choice(8, 9, 'a', 'b') + randHex(3)+'-'+
	        randHex(12)
	    );
	  }
	  module.exports = guid;



/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	var choice = __webpack_require__(28);

	    var _chars = '0123456789abcdef'.split('');

	    /**
	     * Returns a random hexadecimal string
	     */
	    function randHex(size){
	        size = size && size > 0? size : 6;
	        var str = '';
	        while (size--) {
	            str += choice(_chars);
	        }
	        return str;
	    }

	    module.exports = randHex;




/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	var randInt = __webpack_require__(29);
	var isArray = __webpack_require__(11);

	    /**
	     * Returns a random element from the supplied arguments
	     * or from the array (if single argument is an array).
	     */
	    function choice(items) {
	        var target = (arguments.length === 1 && isArray(items))? items : arguments;
	        return target[ randInt(0, target.length - 1) ];
	    }

	    module.exports = choice;




/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	var MIN_INT = __webpack_require__(30);
	var MAX_INT = __webpack_require__(31);
	var rand = __webpack_require__(32);

	    /**
	     * Gets random integer inside range or snap to min/max values.
	     */
	    function randInt(min, max){
	        min = min == null? MIN_INT : ~~min;
	        max = max == null? MAX_INT : ~~max;
	        // can't be max + 0.5 otherwise it will round up if `rand`
	        // returns `max` causing it to overflow range.
	        // -0.5 and + 0.49 are required to avoid bias caused by rounding
	        return Math.round( rand(min - 0.5, max + 0.499999999999) );
	    }

	    module.exports = randInt;



/***/ },
/* 30 */
/***/ function(module, exports) {

	/**
	 * @constant Minimum 32-bit signed integer value (-2^31).
	 */

	    module.exports = -2147483648;



/***/ },
/* 31 */
/***/ function(module, exports) {

	/**
	 * @constant Maximum 32-bit signed integer value. (2^31 - 1)
	 */

	    module.exports = 2147483647;



/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	var random = __webpack_require__(33);
	var MIN_INT = __webpack_require__(30);
	var MAX_INT = __webpack_require__(31);

	    /**
	     * Returns random number inside range
	     */
	    function rand(min, max){
	        min = min == null? MIN_INT : min;
	        max = max == null? MAX_INT : max;
	        return min + (max - min) * random();
	    }

	    module.exports = rand;



/***/ },
/* 33 */
/***/ function(module, exports) {

	

	    /**
	     * Just a wrapper to Math.random. No methods inside mout/random should call
	     * Math.random() directly so we can inject the pseudo-random number
	     * generator if needed (ie. in case we need a seeded random or a better
	     * algorithm than the native one)
	     */
	    function random(){
	        return random.get();
	    }

	    // we expose the method so it can be swapped if needed
	    random.get = Math.random;

	    module.exports = random;




/***/ }
/******/ ]);