let JSData = require('js-data');
let redis = require('redis');
let underscore = require('mout/string/underscore');
let guid = require('mout/random/guid');
let P = JSData.DSUtils.Promise;
let deepMixIn = JSData.DSUtils.deepMixIn;
let forEach = JSData.DSUtils.forEach;
let emptyStore = new JSData.DS();
let filter = emptyStore.defaults.defaultFilter;

function getPath(resourceConfig) {
  if (resourceConfig) {
    return resourceConfig.table || underscore(resourceConfig.name);
  }
}

class Defaults {

}

class DSRedisAdapter {
  constructor(options) {
    options = options || {};
    this.defaults = new Defaults();
    deepMixIn(this.defaults, options);
    this.client = redis.createClient(this.defaults);
  }

  getIds(resourceConfig) {
    let _this = this;
    return new P((resolve, reject) => {
      return _this.client.SMEMBERS(getPath(resourceConfig), (err, ids) => err ? reject(err) : resolve(ids));
    });
  }

  GET(path) {
    let _this = this;
    return new P((resolve, reject) => {
      return _this.client.GET(path, (err, value) => err ? reject(err) : resolve(JSON.parse(value)));
    });
  }

  find(resourceConfig, id) {
    let _this = this;
    return new P((resolve, reject) => {
      return _this.client.GET(`${getPath(resourceConfig)}-${id}`, (err, item) => {
        if (err) {
          reject(err);
        } else if (!item) {
          reject(new Error('Not Found!'));
        } else {
          resolve(JSON.parse(item));
        }
      });
    });
  }

  findAll(resourceConfig, params) {
    let _this = this;
    return _this.getIds(resourceConfig).then(ids => {
      let tasks = [];
      let path = getPath(resourceConfig);
      forEach(ids, id => tasks.push(_this.GET(`${path}-${id}`)));
      return P.all(tasks);
    }).then(items => filter.call(emptyStore, items, resourceConfig.name, params, { allowSimpleWhere: true }));
  }

  create(resourceConfig, attrs) {
    let _this = this;
    return new P((resolve, reject) => {
      attrs[resourceConfig.idAttribute] = attrs[resourceConfig.idAttribute] || guid();
      return _this.client
        .multi()
        .SET(`${getPath(resourceConfig)}-${attrs[resourceConfig.idAttribute]}`, JSON.stringify(attrs))
        .SADD(getPath(resourceConfig), attrs[resourceConfig.idAttribute])
        .exec(err => err ? reject(err) : resolve(attrs));
    });
  }

  update(resourceConfig, id, attrs) {
    let _this = this;
    return new P((resolve, reject) => {
      let path = `${getPath(resourceConfig)}-${id}`;
      return _this.client.GET(path, (err, value) => {
        if (err) {
          reject(err);
        } else if (!value) {
          reject(new Error('Not Found!'));
        } else {
          value = JSON.parse(value);
          deepMixIn(value, attrs);
          _this.client.SET(path, JSON.stringify(value), err => err ? reject(err) : resolve(value));
        }
      });
    });
  }

  updateAll(resourceConfig, attrs, params) {
    let _this = this;
    return _this.findAll(resourceConfig, params).then(items => {
      let tasks = [];
      forEach(items, item => tasks.push(_this.update(resourceConfig, item[resourceConfig.idAttribute], attrs)));
      return P.all(tasks);
    });
  }

  destroy(resourceConfig, id) {
    let _this = this;
    return new P((resolve, reject) => {
      let path = getPath(resourceConfig);
      return _this.client
        .multi()
        .DEL(`${path}-${id}`)
        .SREM(path, id)
        .exec(err => err ? reject(err) : resolve());
    });
  }

  destroyAll(resourceConfig, params) {
    let _this = this;
    return _this.findAll(resourceConfig, params).then(items => {
      let tasks = [];
      forEach(items, item => tasks.push(_this.destroy(resourceConfig, item[resourceConfig.idAttribute])));
      return P.all(tasks);
    });
  }
}

export default DSRedisAdapter;
