import redis from 'redis'
import {
  Query,
  utils
} from 'js-data'
import Adapter from 'js-data-adapter'
import underscore from 'mout/string/underscore'
import guid from 'mout/random/guid'

function getPath (mapper) {
  if (mapper) {
    return mapper.table || underscore(mapper.name)
  }
}

const DEFAULTS = {
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
}

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
function RedisAdapter (opts) {
  const self = this
  utils.classCallCheck(self, RedisAdapter)
  opts || (opts = {})
  utils.fillIn(opts, DEFAULTS)
  Adapter.call(self, opts)

  /**
   * The Redis client used by this adapter. Use this directly when you need to
   * write custom queries.
   *
   * @name RedisAdapter#client
   * @type {Object}
   */
  self.client = redis.createClient(opts.port, opts.host, opts)
}

// Setup prototype inheritance from Adapter
RedisAdapter.prototype = Object.create(Adapter.prototype, {
  constructor: {
    value: RedisAdapter,
    enumerable: false,
    writable: true,
    configurable: true
  }
})

Object.defineProperty(RedisAdapter, '__super__', {
  configurable: true,
  value: Adapter
})

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
RedisAdapter.extend = utils.extend

utils.addHiddenPropsToTarget(RedisAdapter.prototype, {
  getIds (mapper) {
    const self = this
    return new Promise(function (resolve, reject) {
      return self.client.SMEMBERS(getPath(mapper), function (err, ids) {
        if (err) {
          return reject(err)
        }
        return resolve(ids.filter(function (id) {
          return id !== 'undefined'
        }))
      })
    })
  },

  GET (path) {
    const self = this
    return new Promise(function (resolve, reject) {
      return self.client.GET(path, function (err, value) {
        return err ? reject(err) : resolve(utils.isUndefined(value) ? value : JSON.parse(value))
      })
    })
  },

  _count (mapper, query) {
    const self = this
    return self._findAll(mapper, query).then(function (result) {
      result[0] = result[0].length
      return result
    })
  },

  _create (mapper, props) {
    const self = this
    const idAttribute = mapper.idAttribute
    props || (props = {})
    props = utils.plainCopy(props)

    let id = utils.get(props, idAttribute)
    if (utils.isUndefined(id)) {
      id = guid()
      utils.set(props, idAttribute, id)
    }

    return new Promise(function (resolve, reject) {
      props = JSON.stringify(props)
      return self.client
        .multi()
        .set(`${getPath(mapper)}-${id}`, props)
        .SADD(getPath(mapper), id)
        .exec(function (err) {
          return err ? reject(err) : resolve([JSON.parse(props), {}])
        })
    })
  },

  _createMany (mapper, props) {
    const self = this
    const idAttribute = mapper.idAttribute
    props || (props = [])
    props = utils.plainCopy(props)

    const _path = getPath(mapper)
    return Promise.all(props.map(function (_props) {
      return new Promise(function (resolve, reject) {
        let id = utils.get(_props, idAttribute)
        if (utils.isUndefined(id)) {
          id = guid()
          utils.set(_props, idAttribute, id)
        }
        _props = JSON.stringify(_props)
        return self.client
          .multi()
          .set(`${_path}-${id}`, _props)
          .SADD(_path, id)
          .exec(function (err) {
            return err ? reject(err) : resolve(JSON.parse(_props))
          })
      })
    })).then(function (records) {
      return [records, {}]
    })
  },

  _destroy (mapper, id) {
    const self = this

    return new Promise(function (resolve, reject) {
      return self.client
        .multi()
        .DEL(`${getPath(mapper)}-${id}`)
        .SREM(getPath(mapper), id)
        .exec(function (err) {
          return err ? reject(err) : resolve([undefined, {}])
        })
    })
  },

  _destroyAll (mapper, query) {
    const self = this

    return self.findAll(mapper, query, { raw: false }).then(function (records) {
      const _path = getPath(mapper)
      const idAttribute = mapper.idAttribute
      return Promise.all(records.map(function (record) {
        return new Promise(function (resolve, reject) {
          const id = utils.get(record, idAttribute)
          return self.client
            .multi()
            .DEL(`${_path}-${id}`)
            .SREM(_path, id)
            .exec(function (err) {
              return err ? reject(err) : resolve()
            })
        })
      }))
    }).then(function () {
      return [undefined, {}]
    })
  },

  _find (mapper, id) {
    return this.GET(`${getPath(mapper)}-${id}`).then(function (record) {
      return [record, {}]
    })
  },

  _findAll (mapper, query) {
    const self = this
    query || (query = {})

    return self.getIds(mapper).then(function (ids) {
      const path = getPath(mapper)
      return Promise.all(ids.map(function (id) {
        return self.GET(`${path}-${id}`)
      }))
    }).then(function (_records) {
      const _query = new Query({
        index: {
          getAll () {
            return _records
          }
        }
      })
      return [_query.filter(query).run(), {}]
    })
  },

  _sum (mapper, field, query) {
    const self = this
    return self._findAll(mapper, query).then(function (result) {
      let sum = 0
      result[0].forEach(function (record) {
        sum += utils.get(record, field) || 0
      })
      result[0] = sum
      return result
    })
  },

  _updateHelper (mapper, records, props) {
    const self = this
    const idAttribute = mapper.idAttribute
    const _path = getPath(mapper)
    if (utils.isObject(records) && !utils.isArray(records)) {
      records = [records]
    }
    return Promise.all(records.map(function (record) {
      utils.deepMixIn(record, props)
      return new Promise(function (resolve, reject) {
        self.client.set(`${_path}-${record[idAttribute]}`, JSON.stringify(record), function (err) {
          return err ? reject(err) : resolve(record)
        })
      })
    }))
  },

  _update (mapper, id, props) {
    const self = this
    props || (props = {})

    return self.GET(`${getPath(mapper)}-${id}`).then(function (record) {
      if (!record) {
        throw new Error('Not Found')
      }
      return self._updateHelper(mapper, record, props)
    }).then(function (records) {
      return [records[0], {}]
    })
  },

  _updateAll (mapper, props, query) {
    const self = this
    props || (props = {})
    query || (query = {})

    return self.findAll(mapper, query, { raw: false }).then(function (records) {
      return self._updateHelper(mapper, records, props)
    }).then(function (records) {
      return [records, {}]
    })
  },

  _updateMany (mapper, records) {
    const self = this
    const idAttribute = mapper.idAttribute
    const _path = getPath(mapper)
    records || (records = [])

    return Promise.all(records.map(function (record) {
      return self.GET(`${_path}-${utils.get(record, idAttribute)}`).then(function (_record) {
        if (!_record) {
          return
        }
        return self._updateHelper(mapper, _record, record).then(function (records) {
          return records[0]
        })
      })
    })).then(function (records) {
      return [records.filter(function (record) {
        return record
      }), {}]
    })
  }
})

module.exports = RedisAdapter
