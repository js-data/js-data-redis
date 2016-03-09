'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var redis = _interopDefault(require('redis'));
var jsData = require('js-data');
var Adapter = require('js-data-adapter');
var Adapter__default = _interopDefault(Adapter);
var underscore = _interopDefault(require('mout/string/underscore'));
var unique = _interopDefault(require('mout/array/unique'));
var guid = _interopDefault(require('mout/random/guid'));

var babelHelpers = {};

babelHelpers.defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

babelHelpers;

var addHiddenPropsToTarget = jsData.utils.addHiddenPropsToTarget;
var classCallCheck = jsData.utils.classCallCheck;
var deepMixIn = jsData.utils.deepMixIn;
var extend = jsData.utils.extend;
var fillIn = jsData.utils.fillIn;
var forEachRelation = jsData.utils.forEachRelation;
var get = jsData.utils.get;
var isArray = jsData.utils.isArray;
var isObject = jsData.utils.isObject;
var isUndefined = jsData.utils.isUndefined;
var omit = jsData.utils.omit;
var plainCopy = jsData.utils.plainCopy;
var resolve = jsData.utils.resolve;


var withoutRelations = function withoutRelations(mapper, props) {
  return omit(props, mapper.relationFields || []);
};

function getPath(resourceConfig) {
  if (resourceConfig) {
    return resourceConfig.table || underscore(resourceConfig.name);
  }
}

var DEFAULTS = {
  /**
   * Redis host.
   *
   * @name RedisAdapter#host
   * @type {string}
   * @default "127.0.0.1"
   */
  host: '127.0.0.1',

  /**
   * Redis port.
   *
   * @name RedisAdapter#port
   * @type {number}
   * @default 6379
   */
  port: 6379
};

/**
 * RedisAdapter class.
 *
 * @example
 * // Use Container instead of DataStore on the server
 * import {Container} from 'js-data'
 * import RedisAdapter from 'js-data-redis'
 *
 * // Create a store to hold your Mappers
 * const store = new Container()
 *
 * // Create an instance of RedisAdapter with default settings
 * const adapter = new RedisAdapter()
 *
 * // Mappers in "store" will use the Redis adapter by default
 * store.registerAdapter('redis', adapter, { default: true })
 *
 * // Create a Mapper that maps to a "user" table
 * store.defineMapper('user')
 *
 * @class RedisAdapter
 * @extends Adapter
 * @param {Object} [opts] Configuration opts.
 * @param {boolean} [opts.debug=false] Whether to log debugging information.
 * @param {boolean} [opts.raw=false] Whether to return a more detailed response object.
 */
function RedisAdapter(opts) {
  var self = this;
  classCallCheck(self, RedisAdapter);
  opts || (opts = {});
  fillIn(opts, DEFAULTS);
  Adapter__default.call(self, opts);

  /**
   * The Redis client used by this adapter. Use this directly when you need to
   * write custom queries.
   *
   * @name RedisAdapter#client
   * @type {Object}
   */
  self.client = redis.createClient(opts.port, opts.host, opts);
}

// Setup prototype inheritance from Adapter
RedisAdapter.prototype = Object.create(Adapter__default.prototype, {
  constructor: {
    value: RedisAdapter,
    enumerable: false,
    writable: true,
    configurable: true
  }
});

Object.defineProperty(RedisAdapter, '__super__', {
  configurable: true,
  value: Adapter__default
});

/**
 * Alternative to ES6 class syntax for extending `RedisAdapter`.
 *
 * @name RedisAdapter.extend
 * @method
 * @param {Object} [instanceProps] Properties that will be added to the
 * prototype of the RedisAdapter.
 * @param {Object} [classProps] Properties that will be added as static
 * properties to the RedisAdapter itself.
 * @return {Object} RedisAdapter of `RedisAdapter`.
 */
RedisAdapter.extend = extend;

addHiddenPropsToTarget(RedisAdapter.prototype, {
  getIds: function getIds(mapper) {
    var self = this;
    return new Promise(function (resolve, reject) {
      return self.client.SMEMBERS(getPath(mapper), function (err, ids) {
        if (err) {
          return reject(err);
        }
        return resolve(ids.filter(function (id) {
          return id !== 'undefined';
        }));
      });
    });
  },
  GET: function GET(path) {
    var self = this;
    return new Promise(function (resolve, reject) {
      return self.client.GET(path, function (err, value) {
        return err ? reject(err) : resolve(isUndefined(value) ? value : JSON.parse(value));
      });
    });
  },


  /**
   * Create a new record.
   *
   * @name RedisAdapter#create
   * @method
   * @param {Object} mapper The mapper.
   * @param {Object} props The record to be created.
   * @param {Object} [opts] Configuration options.
   * @param {boolean} [opts.raw=false] Whether to return a more detailed
   * response object.
   * @return {Promise}
   */
  create: function create(mapper, props, opts) {
    var self = this;
    var op = void 0;
    var idAttribute = mapper.idAttribute;
    props || (props = {});
    opts || (opts = {});

    // beforeCreate lifecycle hook
    op = opts.op = 'beforeCreate';
    return resolve(self[op](mapper, props, opts)).then(function (_props) {
      // Allow for re-assignment from lifecycle hook
      props = isUndefined(_props) ? props : _props;
      var __props = plainCopy(props);
      var id = __props[idAttribute];
      if (isUndefined(id)) {
        __props[idAttribute] = id = guid();
      }
      op = opts.op = 'create';
      self.dbg(op, mapper, __props, opts);
      return new Promise(function (resolve, reject) {
        __props = JSON.stringify(__props);
        return self.client.multi().SET(getPath(mapper) + '-' + id, __props).SADD(getPath(mapper), id).exec(function (err) {
          return err ? reject(err) : resolve(JSON.parse(__props));
        });
      });
    }).then(function (record) {
      var response = new Adapter.Response(record, {}, 'create');
      response.created = record ? 1 : 0;
      response = self.respond(response, opts);

      // afterCreate lifecycle hook
      op = opts.op = 'afterCreate';
      return resolve(self[op](mapper, props, opts, response)).then(function (_response) {
        // Allow for re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response;
      });
    });
  },


  /**
   * Create multiple records in a single batch.
   *
   * @name RedisAdapter#createMany
   * @method
   * @param {Object} mapper The mapper.
   * @param {Object} props The records to be created.
   * @param {Object} [opts] Configuration options.
   * @param {boolean} [opts.raw=false] Whether to return a more detailed
   * response object.
   * @return {Promise}
   */
  createMany: function createMany(mapper, props, opts) {
    var self = this;
    var op = void 0;
    props || (props = {});
    opts || (opts = {});
    props = plainCopy(props);

    // beforeCreateMany lifecycle hook
    op = opts.op = 'beforeCreateMany';
    return resolve(self[op](mapper, props, opts)).then(function (_props) {
      // Allow for re-assignment from lifecycle hook
      props = isUndefined(_props) ? props : _props;
      _props = props.map(function (record) {
        return withoutRelations(mapper, record);
      });
      op = opts.op = 'createMany';
      self.dbg(op, mapper, props, opts);
      var _path = getPath(mapper);
      var idAttribute = mapper.idAttribute;
      return Promise.all(_props.map(function (_record) {
        return new Promise(function (resolve, reject) {
          var id = _record[idAttribute];
          if (isUndefined(id)) {
            _record[idAttribute] = id = guid();
          }
          _record = JSON.stringify(_record);
          return self.client.multi().SET(_path + '-' + id, _record).SADD(_path, id).exec(function (err) {
            return err ? reject(err) : resolve(JSON.parse(_record));
          });
        });
      }));
    }).then(function (records) {
      var response = new Adapter.Response(records, {}, 'createMany');
      response.created = records.length;
      response = self.respond(response, opts);

      // afterCreateMany lifecycle hook
      op = opts.op = 'afterCreateMany';
      return resolve(self[op](mapper, props, opts, response)).then(function (_response) {
        // Allow for re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response;
      });
    });
  },


  /**
   * Destroy the record with the given primary key.
   *
   * @name RedisAdapter#destroy
   * @method
   * @param {Object} mapper The mapper.
   * @param {(string|number)} id Primary key of the record to destroy.
   * @param {Object} [opts] Configuration options.
   * @param {boolean} [opts.raw=false] Whether to return a more detailed
   * response object.
   * @return {Promise}
   */
  destroy: function destroy(mapper, id, opts) {
    var self = this;
    var op = void 0;
    opts || (opts = {});

    // beforeDestroy lifecycle hook
    op = opts.op = 'beforeDestroy';
    return resolve(self[op](mapper, id, opts)).then(function () {
      op = opts.op = 'destroy';
      self.dbg(op, mapper, id, opts);
      return new Promise(function (resolve, reject) {
        return self.client.multi().DEL(getPath(mapper) + '-' + id).SREM(getPath(mapper), id).exec(function (err) {
          return err ? reject(err) : resolve();
        });
      });
    }).then(function () {
      var response = new Adapter.Response(undefined, {}, 'destroy');
      response = self.respond(response, opts);

      // afterDestroy lifecycle hook
      op = opts.op = 'afterDestroy';
      return resolve(self[op](mapper, id, opts, response)).then(function (_response) {
        // Allow for re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response;
      });
    });
  },


  /**
   * Destroy the records that match the selection query.
   *
   * @name RedisAdapter#destroyAll
   * @method
   * @param {Object} mapper the mapper.
   * @param {Object} [query] Selection query.
   * @param {Object} [query.where] Filtering criteria.
   * @param {string|Array} [query.orderBy] Sorting criteria.
   * @param {string|Array} [query.sort] Same as `query.sort`.
   * @param {number} [query.limit] Limit results.
   * @param {number} [query.skip] Offset results.
   * @param {number} [query.offset] Same as `query.skip`.
   * @param {Object} [opts] Configuration options.
   * @param {boolean} [opts.raw=false] Whether to return a more detailed
   * response object.
   * @return {Promise}
   */
  destroyAll: function destroyAll(mapper, query, opts) {
    var self = this;
    var op = void 0;
    query || (query = {});
    opts || (opts = {});

    // beforeDestroyAll lifecycle hook
    op = opts.op = 'beforeDestroyAll';
    return resolve(self[op](mapper, query, opts)).then(function () {
      op = opts.op = 'destroyAll';
      self.dbg(op, mapper, query, opts);
      return self.findAll(mapper, query, { raw: false }).then(function (records) {
        var _path = getPath(mapper);
        var idAttribute = mapper.idAttribute;
        return Promise.all(records.map(function (record) {
          return new Promise(function (resolve, reject) {
            var id = record[idAttribute];
            return self.client.multi().DEL(_path + '-' + id).SREM(_path, id).exec(function (err) {
              return err ? reject(err) : resolve();
            });
          });
        }));
      });
    }).then(function () {
      var response = new Adapter.Response(undefined, {}, 'destroyAll');
      response = self.respond(response, opts);

      // afterDestroyAll lifecycle hook
      op = opts.op = 'afterDestroyAll';
      return resolve(self[op](mapper, query, opts, response)).then(function (_response) {
        // Allow for re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response;
      });
    });
  },


  /**
   * Retrieve the record with the given primary key.
   *
   * @name RedisAdapter#find
   * @method
   * @param {Object} mapper The mapper.
   * @param {(string|number)} id Primary key of the record to retrieve.
   * @param {Object} [opts] Configuration options.
   * @param {boolean} [opts.raw=false] Whether to return a more detailed
   * response object.
   * @param {string[]} [opts.with=[]] Relations to eager load.
   * @return {Promise}
   */
  find: function find(mapper, id, opts) {
    var self = this;
    var record = void 0,
        op = void 0;
    opts || (opts = {});
    opts.with || (opts.with = []);

    // beforeFind lifecycle hook
    op = opts.op = 'beforeFind';
    return resolve(self[op](mapper, id, opts)).then(function () {
      op = opts.op = 'find';
      self.dbg(op, id, opts);
      return self.GET(getPath(mapper) + '-' + id);
    }).then(function (_record) {
      if (!_record) {
        return;
      }
      record = _record;
      var tasks = [];

      forEachRelation(mapper, opts, function (def, __opts) {
        var relatedMapper = def.getRelation();
        var task = void 0;

        if (def.foreignKey && (def.type === 'hasOne' || def.type === 'hasMany')) {
          if (def.type === 'hasOne') {
            task = self.loadHasOne(mapper, def, record, __opts);
          } else {
            task = self.loadHasMany(mapper, def, record, __opts);
          }
        } else if (def.type === 'hasMany' && def.localKeys) {
          var localKeys = [];
          var itemKeys = get(record, def.localKeys) || [];
          itemKeys = isArray(itemKeys) ? itemKeys : Object.keys(itemKeys);
          localKeys = localKeys.concat(itemKeys);
          task = self.findAll(relatedMapper, {
            where: babelHelpers.defineProperty({}, relatedMapper.idAttribute, {
              'in': unique(localKeys).filter(function (x) {
                return x;
              })
            })
          }, __opts).then(function (relatedItems) {
            def.setLocalField(record, relatedItems);
          });
        } else if (def.type === 'hasMany' && def.foreignKeys) {
          task = self.findAll(relatedMapper, {
            where: babelHelpers.defineProperty({}, def.foreignKeys, {
              'contains': self.makeHasManyForeignKeys(mapper, def, record)
            })
          }, __opts).then(function (relatedItems) {
            def.setLocalField(record, relatedItems);
          });
        } else if (def.type === 'belongsTo') {
          task = self.loadBelongsTo(mapper, def, record, __opts);
        }
        if (task) {
          tasks.push(task);
        }
      });

      return Promise.all(tasks);
    }).then(function () {
      var response = new Adapter.Response(record, {}, 'find');
      response.found = record ? 1 : 0;
      response = self.respond(response, opts);

      // afterFind lifecycle hook
      op = opts.op = 'afterFind';
      return resolve(self[op](mapper, id, opts, response)).then(function (_response) {
        // Allow for re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response;
      });
    });
  },


  /**
   * Retrieve the records that match the selection query.
   *
   * @name RedisAdapter#findAll
   * @method
   * @param {Object} mapper The mapper.
   * @param {Object} [query] Selection query.
   * @param {Object} [query.where] Filtering criteria.
   * @param {string|Array} [query.orderBy] Sorting criteria.
   * @param {string|Array} [query.sort] Same as `query.sort`.
   * @param {number} [query.limit] Limit results.
   * @param {number} [query.skip] Offset results.
   * @param {number} [query.offset] Same as `query.skip`.
   * @param {Object} [opts] Configuration options.
   * @param {boolean} [opts.raw=false] Whether to return a more detailed
   * response object.
   * @param {string[]} [opts.with=[]] Relations to eager load.
   * @return {Promise}
   */
  findAll: function findAll(mapper, query, opts) {
    var self = this;
    var records = [];
    var op = void 0;
    opts || (opts = {});
    opts.with || (opts.with = []);

    // beforeFindAll lifecycle hook
    op = opts.op = 'beforeFindAll';
    return resolve(self[op](mapper, query, opts)).then(function () {
      op = opts.op = 'findAll';
      self.dbg(op, query, opts);

      return self.getIds(mapper);
    }).then(function (ids) {
      var path = getPath(mapper);
      return Promise.all(ids.map(function (id) {
        return self.GET(path + '-' + id);
      }));
    }).then(function (_records) {
      var _query = new jsData.Query({
        index: {
          getAll: function getAll() {
            return _records;
          }
        }
      });
      records = _query.filter(query).run();
      var tasks = [];
      forEachRelation(mapper, opts, function (def, __opts) {
        var relatedMapper = def.getRelation();
        var idAttribute = mapper.idAttribute;
        var task = void 0;
        if (def.foreignKey && (def.type === 'hasOne' || def.type === 'hasMany')) {
          if (def.type === 'hasMany') {
            task = self.loadHasMany(mapper, def, records, __opts);
          } else {
            task = self.loadHasOne(mapper, def, records, __opts);
          }
        } else if (def.type === 'hasMany' && def.localKeys) {
          (function () {
            var localKeys = [];
            records.forEach(function (item) {
              var itemKeys = item[def.localKeys] || [];
              itemKeys = isArray(itemKeys) ? itemKeys : Object.keys(itemKeys);
              localKeys = localKeys.concat(itemKeys);
            });
            task = self.findAll(relatedMapper, {
              where: babelHelpers.defineProperty({}, relatedMapper.idAttribute, {
                'in': unique(localKeys).filter(function (x) {
                  return x;
                })
              })
            }, __opts).then(function (relatedItems) {
              records.forEach(function (item) {
                var attached = [];
                var itemKeys = get(item, def.localKeys) || [];
                itemKeys = isArray(itemKeys) ? itemKeys : Object.keys(itemKeys);
                relatedItems.forEach(function (relatedItem) {
                  if (itemKeys && itemKeys.indexOf(relatedItem[relatedMapper.idAttribute]) !== -1) {
                    attached.push(relatedItem);
                  }
                });
                def.setLocalField(item, attached);
              });
              return relatedItems;
            });
          })();
        } else if (def.type === 'hasMany' && def.foreignKeys) {
          task = self.findAll(relatedMapper, {
            where: babelHelpers.defineProperty({}, def.foreignKeys, {
              'isectNotEmpty': records.map(function (record) {
                return self.makeHasManyForeignKeys(mapper, def, record);
              })
            })
          }, __opts).then(function (relatedItems) {
            var foreignKeysField = def.foreignKeys;
            records.forEach(function (record) {
              var _relatedItems = [];
              var id = get(record, idAttribute);
              relatedItems.forEach(function (relatedItem) {
                var foreignKeys = get(relatedItems, foreignKeysField) || [];
                if (foreignKeys.indexOf(id) !== -1) {
                  _relatedItems.push(relatedItem);
                }
              });
              def.setLocalField(record, _relatedItems);
            });
          });
        } else if (def.type === 'belongsTo') {
          task = self.loadBelongsTo(mapper, def, records, __opts);
        }
        if (task) {
          tasks.push(task);
        }
      });
      return Promise.all(tasks);
    }).then(function () {
      // afterFindAll lifecycle hook
      op = opts.op = 'afterFindAll';
      return resolve(self[op](mapper, query, opts, records)).then(function (_records) {
        // Allow for re-assignment from lifecycle hook
        records = isUndefined(_records) ? records : _records;
        return opts.raw ? {
          data: records,
          found: records.length
        } : records;
      });
    });
  },
  _update: function _update(mapper, records, props) {
    var self = this;
    var idAttribute = mapper.idAttribute;
    var _path = getPath(mapper);
    if (isObject(records) && !isArray(records)) {
      records = [records];
    }
    return Promise.all(records.map(function (record) {
      deepMixIn(record, props);
      return new Promise(function (resolve, reject) {
        self.client.SET(_path + '-' + record[idAttribute], JSON.stringify(record), function (err) {
          return err ? reject(err) : resolve(record);
        });
      });
    }));
  },


  /**
   * Apply the given update to the record with the specified primary key.
   *
   * @name RedisAdapter#update
   * @method
   * @param {Object} mapper The mapper.
   * @param {(string|number)} id The primary key of the record to be updated.
   * @param {Object} props The update to apply to the record.
   * @param {Object} [opts] Configuration options.
   * @param {boolean} [opts.raw=false] Whether to return a more detailed
   * response object.
   * @return {Promise}
   */
  update: function update(mapper, id, props, opts) {
    var self = this;
    props || (props = {});
    opts || (opts = {});
    var op = void 0;

    // beforeUpdate lifecycle hook
    op = opts.op = 'beforeUpdate';
    return resolve(self[op](mapper, id, props, opts)).then(function (_props) {
      // Allow for re-assignment from lifecycle hook
      props = isUndefined(_props) ? props : _props;
      op = opts.op = 'update';
      self.dbg(op, mapper, id, props, opts);
      return self.GET(getPath(mapper) + '-' + id).then(function (record) {
        if (!record) {
          throw new Error('Not Found');
        }
        return self._update(mapper, record, props).then(function (records) {
          return records[0];
        });
      });
    }).then(function (record) {
      var response = new Adapter.Response(record, {}, 'update');
      response.updated = 1;
      response = self.respond(response, opts);

      // afterUpdate lifecycle hook
      op = opts.op = 'afterUpdate';
      return resolve(self[op](mapper, id, props, opts, response)).then(function (_response) {
        // Allow for re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response;
      });
    });
  },


  /**
   * Apply the given update to all records that match the selection query.
   *
   * @name RedisAdapter#updateAll
   * @method
   * @param {Object} mapper The mapper.
   * @param {Object} props The update to apply to the selected records.
   * @param {Object} [query] Selection query.
   * @param {Object} [query.where] Filtering criteria.
   * @param {string|Array} [query.orderBy] Sorting criteria.
   * @param {string|Array} [query.sort] Same as `query.sort`.
   * @param {number} [query.limit] Limit results.
   * @param {number} [query.skip] Offset results.
   * @param {number} [query.offset] Same as `query.skip`.
   * @param {Object} [opts] Configuration options.
   * @param {boolean} [opts.raw=false] Whether to return a more detailed
   * response object.
   * @return {Promise}
   */
  updateAll: function updateAll(mapper, props, query, opts) {
    var self = this;
    props || (props = {});
    query || (query = {});
    opts || (opts = {});
    var op = void 0;

    // beforeUpdateAll lifecycle hook
    op = opts.op = 'beforeUpdateAll';
    return resolve(self[op](mapper, props, query, opts)).then(function (_props) {
      // Allow for re-assignment from lifecycle hook
      props = isUndefined(_props) ? props : _props;
      op = opts.op = 'updateAll';
      self.dbg(op, mapper, props, query, opts);
      return self.findAll(mapper, query, { raw: false }).then(function (records) {
        return self._update(mapper, records, props);
      });
    }).then(function (records) {
      var response = new Adapter.Response(records, {}, 'updateAll');
      response.updated = records.length;
      response = self.respond(response, opts);

      // afterUpdateAll lifecycle hook
      op = opts.op = 'afterUpdateAll';
      return resolve(self[op](mapper, props, query, opts, response)).then(function (_response) {
        // Allow for re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response;
      });
    });
  },


  /**
   * Update the given records in a single batch.
   *
   * @name RedisAdapter#updateMany
   * @method
   * @param {Object} mapper The mapper.
   * @param {Object[]} records The records to update.
   * @param {Object} [opts] Configuration options.
   * @param {boolean} [opts.raw=false] Whether to return a more detailed
   * response object.
   * @return {Promise}
   */
  updateMany: function updateMany(mapper, records, opts) {
    var self = this;
    records || (records = []);
    opts || (opts = {});
    var op = void 0;
    var idAttribute = mapper.idAttribute;

    records = records.filter(function (record) {
      return get(record, idAttribute);
    });

    // beforeUpdateMany lifecycle hook
    op = opts.op = 'beforeUpdateMany';
    return resolve(self[op](mapper, records, opts)).then(function (_records) {
      // Allow for re-assignment from lifecycle hook
      _records = isUndefined(_records) ? records : _records;
      _records = _records.map(function (record) {
        return withoutRelations(mapper, record);
      });
      op = opts.op = 'updateMany';
      self.dbg(op, mapper, records, opts);
      // do
      var _path = getPath(mapper);
      var idAttribute = mapper.idAttribute;
      return Promise.all(records.map(function (record) {
        return self.GET(_path + '-' + get(record, idAttribute)).then(function (_record) {
          if (!_record) {
            return;
          }
          return self._update(mapper, _record, record).then(function (records) {
            return records[0];
          });
        });
      }));
    }).then(function (_records) {
      _records = _records.filter(function (record) {
        return record;
      });
      var response = new Adapter.Response(_records, {}, 'updateMany');
      response.updated = response.data.length;
      response = self.respond(response, opts);

      // afterUpdateMany lifecycle hook
      op = opts.op = 'afterUpdateMany';
      return resolve(self[op](mapper, records, opts, response)).then(function (_response) {
        // Allow for re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response;
      });
    });
  }
});

module.exports = RedisAdapter;
//# sourceMappingURL=js-data-redis.js.map