'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var redis = _interopDefault(require('redis'));
var jsData = require('js-data');
var Adapter = _interopDefault(require('js-data-adapter'));
var underscore = _interopDefault(require('mout/string/underscore'));
var guid = _interopDefault(require('mout/random/guid'));

function getPath(mapper) {
  if (mapper) {
    return mapper.table || underscore(mapper.name);
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
  jsData.utils.classCallCheck(self, RedisAdapter);
  opts || (opts = {});
  jsData.utils.fillIn(opts, DEFAULTS);
  Adapter.call(self, opts);

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
RedisAdapter.prototype = Object.create(Adapter.prototype, {
  constructor: {
    value: RedisAdapter,
    enumerable: false,
    writable: true,
    configurable: true
  }
});

Object.defineProperty(RedisAdapter, '__super__', {
  configurable: true,
  value: Adapter
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
RedisAdapter.extend = jsData.utils.extend;

/**
 * Details of the current version of the `js-data-redis` module.
 *
 * @name RedisAdapter.version
 * @type {Object}
 * @property {string} full The full semver value.
 * @property {number} major The major version number.
 * @property {number} minor The minor version number.
 * @property {number} patch The patch version number.
 * @property {(string|boolean)} alpha The alpha version value, otherwise `false`
 * if the current version is not alpha.
 * @property {(string|boolean)} beta The beta version value, otherwise `false`
 * if the current version is not beta.
 */
RedisAdapter.version = {
  beta: 1,
  full: '3.0.0-beta.1',
  major: 3,
  minor: 0,
  patch: 0
};

jsData.utils.addHiddenPropsToTarget(RedisAdapter.prototype, {
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
        return err ? reject(err) : resolve(jsData.utils.isUndefined(value) ? value : JSON.parse(value));
      });
    });
  },
  _count: function _count(mapper, query) {
    var self = this;
    return self._findAll(mapper, query).then(function (result) {
      result[0] = result[0].length;
      return result;
    });
  },
  _create: function _create(mapper, props) {
    var self = this;
    var idAttribute = mapper.idAttribute;
    props || (props = {});
    props = jsData.utils.plainCopy(props);

    var id = jsData.utils.get(props, idAttribute);
    if (jsData.utils.isUndefined(id)) {
      id = guid();
      jsData.utils.set(props, idAttribute, id);
    }

    return new Promise(function (resolve, reject) {
      props = JSON.stringify(props);
      return self.client.multi().set(getPath(mapper) + '-' + id, props).SADD(getPath(mapper), id).exec(function (err) {
        return err ? reject(err) : resolve([JSON.parse(props), {}]);
      });
    });
  },
  _createMany: function _createMany(mapper, props) {
    var self = this;
    var idAttribute = mapper.idAttribute;
    props || (props = []);
    props = jsData.utils.plainCopy(props);

    var _path = getPath(mapper);
    return Promise.all(props.map(function (_props) {
      return new Promise(function (resolve, reject) {
        var id = jsData.utils.get(_props, idAttribute);
        if (jsData.utils.isUndefined(id)) {
          id = guid();
          jsData.utils.set(_props, idAttribute, id);
        }
        _props = JSON.stringify(_props);
        return self.client.multi().set(_path + '-' + id, _props).SADD(_path, id).exec(function (err) {
          return err ? reject(err) : resolve(JSON.parse(_props));
        });
      });
    })).then(function (records) {
      return [records, {}];
    });
  },
  _destroy: function _destroy(mapper, id) {
    var self = this;

    return new Promise(function (resolve, reject) {
      return self.client.multi().DEL(getPath(mapper) + '-' + id).SREM(getPath(mapper), id).exec(function (err) {
        return err ? reject(err) : resolve([undefined, {}]);
      });
    });
  },
  _destroyAll: function _destroyAll(mapper, query) {
    var self = this;

    return self.findAll(mapper, query, { raw: false }).then(function (records) {
      var _path = getPath(mapper);
      var idAttribute = mapper.idAttribute;
      return Promise.all(records.map(function (record) {
        return new Promise(function (resolve, reject) {
          var id = jsData.utils.get(record, idAttribute);
          return self.client.multi().DEL(_path + '-' + id).SREM(_path, id).exec(function (err) {
            return err ? reject(err) : resolve();
          });
        });
      }));
    }).then(function () {
      return [undefined, {}];
    });
  },
  _find: function _find(mapper, id) {
    return this.GET(getPath(mapper) + '-' + id).then(function (record) {
      return [record, {}];
    });
  },
  _findAll: function _findAll(mapper, query) {
    var self = this;
    query || (query = {});

    return self.getIds(mapper).then(function (ids) {
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
      return [_query.filter(query).run(), {}];
    });
  },
  _sum: function _sum(mapper, field, query) {
    var self = this;
    return self._findAll(mapper, query).then(function (result) {
      var sum = 0;
      result[0].forEach(function (record) {
        sum += jsData.utils.get(record, field) || 0;
      });
      result[0] = sum;
      return result;
    });
  },
  _updateHelper: function _updateHelper(mapper, records, props) {
    var self = this;
    var idAttribute = mapper.idAttribute;
    var _path = getPath(mapper);
    if (jsData.utils.isObject(records) && !jsData.utils.isArray(records)) {
      records = [records];
    }
    return Promise.all(records.map(function (record) {
      jsData.utils.deepMixIn(record, props);
      return new Promise(function (resolve, reject) {
        self.client.set(_path + '-' + record[idAttribute], JSON.stringify(record), function (err) {
          return err ? reject(err) : resolve(record);
        });
      });
    }));
  },
  _update: function _update(mapper, id, props) {
    var self = this;
    props || (props = {});

    return self.GET(getPath(mapper) + '-' + id).then(function (record) {
      if (!record) {
        throw new Error('Not Found');
      }
      return self._updateHelper(mapper, record, props);
    }).then(function (records) {
      return [records[0], {}];
    });
  },
  _updateAll: function _updateAll(mapper, props, query) {
    var self = this;
    props || (props = {});
    query || (query = {});

    return self.findAll(mapper, query, { raw: false }).then(function (records) {
      return self._updateHelper(mapper, records, props);
    }).then(function (records) {
      return [records, {}];
    });
  },
  _updateMany: function _updateMany(mapper, records) {
    var self = this;
    var idAttribute = mapper.idAttribute;
    var _path = getPath(mapper);
    records || (records = []);

    return Promise.all(records.map(function (record) {
      return self.GET(_path + '-' + jsData.utils.get(record, idAttribute)).then(function (_record) {
        if (!_record) {
          return;
        }
        return self._updateHelper(mapper, _record, record).then(function (records) {
          return records[0];
        });
      });
    })).then(function (records) {
      return [records.filter(function (record) {
        return record;
      }), {}];
    });
  }
});

module.exports = RedisAdapter;
//# sourceMappingURL=js-data-redis.js.map