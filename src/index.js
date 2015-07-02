let JSData = require('js-data');
let redis = require('redis');
let underscore = require('mout/string/underscore');
let guid = require('mout/random/guid');
let { DSUtils } = JSData;
let { deepMixIn, removeCircular, forEach, contains, omit } = DSUtils;
let emptyStore = new JSData.DS();
let filter = emptyStore.defaults.defaultFilter;

let getPath = resourceConfig => {
  if (resourceConfig) {
    return resourceConfig.table || underscore(resourceConfig.name);
  }
};

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
    return new DSUtils.Promise((resolve, reject) => {
      return this.client.SMEMBERS(getPath(resourceConfig), (err, ids) => err ? reject(err) : resolve(ids));
    });
  }

  GET(path) {
    return new DSUtils.Promise((resolve, reject) => {
      return this.client.GET(path, (err, value) => err ? reject(err) : resolve(JSON.parse(value)));
    });
  }

  find(resourceConfig, id, options) {
    let fields = [];
    return new DSUtils.Promise((resolve, reject) => {
      options = options || {};
      return this.client.GET(`${getPath(resourceConfig)}-${id}`, (err, item) => {
        if (err) {
          reject(err);
        } else if (!item) {
          reject(new Error('Not Found!'));
        } else {
          resolve(JSON.parse(item));
        }
      });
    }).then(instance => {
        if (!options.with) {
          return instance;
        }
        let tasks = [];
        forEach(resourceConfig.relationList, def => {
          let relationName = def.relation;
          let relationDef = resourceConfig.getResource(relationName);
          let __options = DSUtils._(relationDef, options);
          if (contains(options.with, relationName) || contains(options.with, def.localField)) {
            let task;
            let params = {};
            if (__options.allowSimpleWhere) {
              params[def.foreignKey] = instance[resourceConfig.idAttribute];
            } else {
              params.where = {};
              params.where[def.foreignKey] = {
                '==': instance[resourceConfig.idAttribute]
              };
            }

            if (def.type === 'hasMany' && params[def.foreignKey]) {
              task = this.findAll(relationDef, params, omit(__options.orig(), ['with']));
            } else if (def.type === 'hasOne') {
              if (def.localKey && instance[def.localKey]) {
                task = this.find(relationDef, instance[def.localKey], omit(__options.orig(), ['with']));
              } else if (def.foreignKey && params[def.foreignKey]) {
                task = this.findAll(relationDef, params, omit(__options.orig(), ['with'])).then(hasOnes => hasOnes.length ? hasOnes[0] : null);
              }
            } else if (instance[def.localKey]) {
              task = this.find(relationDef, instance[def.localKey], omit(__options.orig(), ['with']));
            }

            if (task) {
              tasks.push(task);
              fields.push(def.localField);
            }
          }
        });
        if (tasks.length) {
          return DSUtils.Promise.all(tasks).then(loadedRelations => {
            forEach(fields, (field, index) => {
              instance[field] = loadedRelations[index];
            });
            return instance;
          });
        }
        return instance;
      });
  }

  findAll(resourceConfig, params, options) {
    return this.getIds(resourceConfig).then(ids => {
      options = options || {};
      let tasks = [];
      let path = getPath(resourceConfig);
      forEach(ids, id => tasks.push(this.GET(`${path}-${id}`)));
      return DSUtils.Promise.all(tasks);
    })
      .then(items => filter.call(emptyStore, items, resourceConfig.name, params, { allowSimpleWhere: true }))
      .then(items => {
        if (!options.with) {
          return items;
        }
        let topTasks = [];
        forEach(items, instance => {
          let tasks = [];
          let fields = [];
          forEach(resourceConfig.relationList, def => {
            let relationName = def.relation;
            let relationDef = resourceConfig.getResource(relationName);
            let __options = DSUtils._(relationDef, options);
            if (contains(options.with, relationName) || contains(options.with, def.localField)) {
              let task;
              let params = {};
              if (__options.allowSimpleWhere) {
                params[def.foreignKey] = instance[resourceConfig.idAttribute];
              } else {
                params.where = {};
                params.where[def.foreignKey] = {
                  '==': instance[resourceConfig.idAttribute]
                };
              }

              if (def.type === 'hasMany' && params[def.foreignKey]) {
                task = this.findAll(relationDef, params, omit(__options.orig(), ['with']));
              } else if (def.type === 'hasOne') {
                if (def.localKey && instance[def.localKey]) {
                  task = this.find(relationDef, instance[def.localKey], omit(__options.orig(), ['with']));
                } else if (def.foreignKey && params[def.foreignKey]) {
                  task = this.findAll(relationDef, params, omit(__options.orig(), ['with'])).then(hasOnes => hasOnes.length ? hasOnes[0] : null);
                }
              } else if (instance[def.localKey]) {
                task = this.find(relationDef, instance[def.localKey], omit(__options.orig(), ['with']));
              }

              if (task) {
                tasks.push(task);
                fields.push(def.localField);
              }
            }
          });
          if (tasks.length) {
            topTasks.push(DSUtils.Promise.all(tasks).then(loadedRelations => {
              forEach(fields, (field, index) => {
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

  create(resourceConfig, attrs) {
    return new DSUtils.Promise((resolve, reject) => {
      attrs = removeCircular(omit(attrs, resourceConfig.relationFields || []));
      attrs[resourceConfig.idAttribute] = attrs[resourceConfig.idAttribute] || guid();
      return this.client
        .multi()
        .SET(`${getPath(resourceConfig)}-${attrs[resourceConfig.idAttribute]}`, JSON.stringify(attrs))
        .SADD(getPath(resourceConfig), attrs[resourceConfig.idAttribute])
        .exec(err => err ? reject(err) : resolve(attrs));
    });
  }

  update(resourceConfig, id, attrs) {
    return new DSUtils.Promise((resolve, reject) => {
      attrs = removeCircular(omit(attrs, resourceConfig.relationFields || []));
      let path = `${getPath(resourceConfig)}-${id}`;
      return this.client.GET(path, (err, value) => {
        if (err) {
          reject(err);
        } else if (!value) {
          reject(new Error('Not Found!'));
        } else {
          value = JSON.parse(value);
          deepMixIn(value, attrs);
          this.client.SET(path, JSON.stringify(value), err => err ? reject(err) : resolve(value));
        }
      });
    });
  }

  updateAll(resourceConfig, attrs, params) {
    return this.findAll(resourceConfig, params).then(items => {
      let tasks = [];
      forEach(items, item => tasks.push(this.update(resourceConfig, item[resourceConfig.idAttribute], attrs)));
      return DSUtils.Promise.all(tasks);
    });
  }

  destroy(resourceConfig, id) {
    return new DSUtils.Promise((resolve, reject) => {
      let path = getPath(resourceConfig);
      return this.client
        .multi()
        .DEL(`${path}-${id}`)
        .SREM(path, id)
        .exec(err => err ? reject(err) : resolve());
    });
  }

  destroyAll(resourceConfig, params) {
    return this.findAll(resourceConfig, params).then(items => {
      let tasks = [];
      forEach(items, item => tasks.push(this.destroy(resourceConfig, item[resourceConfig.idAttribute])));
      return DSUtils.Promise.all(tasks);
    });
  }
}

export default DSRedisAdapter;
