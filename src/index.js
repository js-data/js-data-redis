var JSData = require('js-data');
var redis = require('redis');
var P = JSData.DSUtils.Promise;
var deepMixIn = require('mout/object/deepMixIn');
var forEach = require('mout/array/forEach');
var underscore = require('mout/string/underscore');
var guid = require('mout/random/guid');
var emptyStore = new JSData.DS();
var filter = emptyStore.defaults.defaultFilter;

function getPath(resourceConfig) {
  if (resourceConfig) {
    return resourceConfig.table || underscore(resourceConfig.name);
  }
}

function Defaults() {

}

function DSRedisAdapter(options) {
  options = options || {};
  this.defaults = new Defaults();
  deepMixIn(this.defaults, options);
  this.client = redis.createClient(this.defaults);
}

var dsRedisAdapterPrototype = DSRedisAdapter.prototype;

dsRedisAdapterPrototype.getIds = function (resourceConfig) {
  var _this = this;
  return new P(function (resolve, reject) {
    return _this.client.SMEMBERS(getPath(resourceConfig), function (err, ids) {
      if (err) {
        reject(err);
      } else {
        resolve(ids);
      }
    });
  });
};

dsRedisAdapterPrototype.GET = function (path) {
  var _this = this;
  return new P(function (resolve, reject) {
    return _this.client.GET(path, function (err, value) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(value));
      }
    });
  });
};

dsRedisAdapterPrototype.find = function (resourceConfig, id) {
  var _this = this;
  return new P(function (resolve, reject) {
    return _this.client.GET(getPath(resourceConfig) + '-' + id, function (err, item) {
      if (err) {
        reject(err);
      } else if (!item) {
        reject(new Error('Not Found!'));
      } else {
        resolve(JSON.parse(item));
      }
    });
  });
};

dsRedisAdapterPrototype.findAll = function (resourceConfig, params) {
  var _this = this;
  return _this.getIds(resourceConfig).then(function (ids) {
    var tasks = [];
    var path = getPath(resourceConfig);

    forEach(ids, function (id) {
      tasks.push(_this.GET(path + '-' + id));
    });

    return P.all(tasks);
  }).then(function (items) {
    return filter.call(emptyStore, items, resourceConfig.name, params, { allowSimpleWhere: true });
  });
};

dsRedisAdapterPrototype.create = function (resourceConfig, attrs) {
  var _this = this;
  return new P(function (resolve, reject) {
    attrs[resourceConfig.idAttribute] = attrs[resourceConfig.idAttribute] || guid();
    return _this.client
      .multi()
      .SET(getPath(resourceConfig) + '-' + attrs[resourceConfig.idAttribute], JSON.stringify(attrs))
      .SADD(getPath(resourceConfig), attrs[resourceConfig.idAttribute])
      .exec(function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(attrs);
        }
      });
  });
};

dsRedisAdapterPrototype.update = function (resourceConfig, id, attrs) {
  var _this = this;
  return new P(function (resolve, reject) {
    var path = getPath(resourceConfig) + '-' + id;
    return _this.client.GET(path, function (err, value) {
      if (err) {
        reject(err);
      } else if (!value) {
        reject(new Error('Not Found!'));
      } else {
        value = JSON.parse(value);
        deepMixIn(value, attrs);
        _this.client.SET(path, JSON.stringify(value), function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(value);
          }
        });
      }
    });
  });
};

dsRedisAdapterPrototype.updateAll = function (resourceConfig, attrs, params) {
  var _this = this;
  return _this.findAll(resourceConfig, params).then(function (items) {
    var tasks = [];
    forEach(items, function (item) {
      tasks.push(_this.update(resourceConfig, item[resourceConfig.idAttribute], attrs));
    });
    return P.all(tasks);
  });
};

dsRedisAdapterPrototype.destroy = function (resourceConfig, id) {
  var _this = this;
  return new P(function (resolve, reject) {
    var path = getPath(resourceConfig);
    return _this.client
      .multi()
      .DEL(path + '-' + id)
      .SREM(path, id)
      .exec(function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
  });
};

dsRedisAdapterPrototype.destroyAll = function (resourceConfig, params) {
  var _this = this;
  return _this.findAll(resourceConfig, params).then(function (items) {
    var tasks = [];
    forEach(items, function (item) {
      tasks.push(_this.destroy(resourceConfig, item[resourceConfig.idAttribute]));
    });
    return P.all(tasks);
  });
};

module.exports = DSRedisAdapter;
