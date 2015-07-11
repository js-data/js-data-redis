let JSData = require('js-data');
let redis = require('redis');
let map = require('mout/array/map');
let unique = require('mout/array/unique');
let underscore = require('mout/string/underscore');
let guid = require('mout/random/guid');
let { DSUtils } = JSData;
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
    DSUtils.deepMixIn(this.defaults, options);
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
    let instance;
    options = options || {};
    options.with = options.with || [];
    return new DSUtils.Promise((resolve, reject) => {
      return this.client.GET(`${getPath(resourceConfig)}-${id}`, (err, item) => {
        if (err) {
          reject(err);
        } else if (!item) {
          reject(new Error('Not Found!'));
        } else {
          resolve(JSON.parse(item));
        }
      });
    }).then(_instance => {
        instance = _instance;
        let tasks = [];

        DSUtils.forEach(resourceConfig.relationList, def => {
          let relationName = def.relation;
          let relationDef = resourceConfig.getResource(relationName);
          let containedName = null;
          if (DSUtils.contains(options.with, relationName)) {
            containedName = relationName;
          } else if (DSUtils.contains(options.with, def.localField)) {
            containedName = def.localField;
          }
          if (containedName) {
            let __options = DSUtils.deepMixIn({}, options.orig ? options.orig() : options);
            __options.with = options.with.slice();
            __options = DSUtils._(relationDef, __options);
            DSUtils.remove(__options.with, containedName);
            DSUtils.forEach(__options.with, (relation, i) => {
              if (relation && relation.indexOf(containedName) === 0 && relation.length >= containedName.length && relation[containedName.length] === '.') {
                __options.with[i] = relation.substr(containedName.length + 1);
              } else {
                __options.with[i] = '';
              }
            });

            let task;

            if ((def.type === 'hasOne' || def.type === 'hasMany') && def.foreignKey) {
              task = this.findAll(resourceConfig.getResource(relationName), {
                where: {
                  [def.foreignKey]: {
                    '==': instance[resourceConfig.idAttribute]
                  }
                }
              }, __options).then(relatedItems => {
                if (def.type === 'hasOne' && relatedItems.length) {
                  DSUtils.set(instance, def.localField, relatedItems[0]);
                } else {
                  DSUtils.set(instance, def.localField, relatedItems);
                }
                return relatedItems;
              });
            } else if (def.type === 'hasMany' && def.localKeys) {
              let localKeys = [];
              let itemKeys = instance[def.localKeys] || [];
              itemKeys = Array.isArray(itemKeys) ? itemKeys : DSUtils.keys(itemKeys);
              localKeys = localKeys.concat(itemKeys || []);
              task = this.findAll(resourceConfig.getResource(relationName), {
                where: {
                  [relationDef.idAttribute]: {
                    'in': DSUtils.filter(unique(localKeys), x => x)
                  }
                }
              }, __options).then(relatedItems => {
                DSUtils.set(instance, def.localField, relatedItems);
                return relatedItems;
              });
            } else if (def.type === 'belongsTo' || (def.type === 'hasOne' && def.localKey)) {
              task = this.find(resourceConfig.getResource(relationName), DSUtils.get(instance, def.localKey), __options).then(relatedItem => {
                DSUtils.set(instance, def.localField, relatedItem);
                return relatedItem;
              });
            }

            if (task) {
              tasks.push(task);
            }
          }
        });

        return DSUtils.Promise.all(tasks);
      })
      .then(() => instance);

  }

  findAll(resourceConfig, params, options) {
    let items = null;
    options = options || {};
    options.with = options.with || [];
    return this.getIds(resourceConfig).then(ids => {
      let tasks = [];
      let path = getPath(resourceConfig);
      DSUtils.forEach(ids, id => tasks.push(this.GET(`${path}-${id}`)));
      return DSUtils.Promise.all(tasks);
    })
      .then(items => filter.call(emptyStore, items, resourceConfig.name, params, {allowSimpleWhere: true}))
      .then(_items => {
        items = _items;
        let tasks = [];
        DSUtils.forEach(resourceConfig.relationList, def => {
          let relationName = def.relation;
          let relationDef = resourceConfig.getResource(relationName);
          let containedName = null;
          if (DSUtils.contains(options.with, relationName)) {
            containedName = relationName;
          } else if (DSUtils.contains(options.with, def.localField)) {
            containedName = def.localField;
          }
          if (containedName) {
            let __options = DSUtils.deepMixIn({}, options.orig ? options.orig() : options);
            __options.with = options.with.slice();
            __options = DSUtils._(relationDef, __options);
            DSUtils.remove(__options.with, containedName);
            DSUtils.forEach(__options.with, (relation, i) => {
              if (relation && relation.indexOf(containedName) === 0 && relation.length >= containedName.length && relation[containedName.length] === '.') {
                __options.with[i] = relation.substr(containedName.length + 1);
              } else {
                __options.with[i] = '';
              }
            });

            let task;

            if ((def.type === 'hasOne' || def.type === 'hasMany') && def.foreignKey) {
              task = this.findAll(resourceConfig.getResource(relationName), {
                where: {
                  [def.foreignKey]: {
                    'in': DSUtils.filter(map(items, item => DSUtils.get(item, resourceConfig.idAttribute)), x => x)
                  }
                }
              }, __options).then(relatedItems => {
                DSUtils.forEach(items, item => {
                  let attached = [];
                  DSUtils.forEach(relatedItems, relatedItem => {
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
              let localKeys = [];
              DSUtils.forEach(items, item => {
                let itemKeys = item[def.localKeys] || [];
                itemKeys = Array.isArray(itemKeys) ? itemKeys : DSUtils.keys(itemKeys);
                localKeys = localKeys.concat(itemKeys || []);
              });
              task = this.findAll(resourceConfig.getResource(relationName), {
                where: {
                  [relationDef.idAttribute]: {
                    'in': DSUtils.filter(unique(localKeys), x => x)
                  }
                }
              }, __options).then(relatedItems => {
                DSUtils.forEach(items, item => {
                  let attached = [];
                  let itemKeys = item[def.localKeys] || [];
                  itemKeys = Array.isArray(itemKeys) ? itemKeys : DSUtils.keys(itemKeys);
                  DSUtils.forEach(relatedItems, relatedItem => {
                    if (itemKeys && DSUtils.contains(itemKeys, relatedItem[relationDef.idAttribute])) {
                      attached.push(relatedItem);
                    }
                  });
                  DSUtils.set(item, def.localField, attached);
                });
                return relatedItems;
              });
            } else if (def.type === 'belongsTo' || (def.type === 'hasOne' && def.localKey)) {
              task = this.findAll(resourceConfig.getResource(relationName), {
                where: {
                  [relationDef.idAttribute]: {
                    'in': DSUtils.filter(map(items, item => DSUtils.get(item, def.localKey)), x => x)
                  }
                }
              }, __options).then(relatedItems => {
                DSUtils.forEach(items, item => {
                  DSUtils.forEach(relatedItems, relatedItem => {
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
          }
        });
        return DSUtils.Promise.all(tasks);
      })
      .then(() => items);
  }

  create(resourceConfig, attrs) {
    return new DSUtils.Promise((resolve, reject) => {
      attrs = DSUtils.removeCircular(DSUtils.omit(attrs, resourceConfig.relationFields || []));
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
      attrs = DSUtils.removeCircular(DSUtils.omit(attrs, resourceConfig.relationFields || []));
      let path = `${getPath(resourceConfig)}-${id}`;
      return this.client.GET(path, (err, value) => {
        if (err) {
          reject(err);
        } else if (!value) {
          reject(new Error('Not Found!'));
        } else {
          value = JSON.parse(value);
          DSUtils.deepMixIn(value, attrs);
          this.client.SET(path, JSON.stringify(value), err => err ? reject(err) : resolve(value));
        }
      });
    });
  }

  updateAll(resourceConfig, attrs, params) {
    return this.findAll(resourceConfig, params).then(items => {
      let tasks = [];
      DSUtils.forEach(items, item => tasks.push(this.update(resourceConfig, item[resourceConfig.idAttribute], attrs)));
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
      DSUtils.forEach(items, item => tasks.push(this.destroy(resourceConfig, item[resourceConfig.idAttribute])));
      return DSUtils.Promise.all(tasks);
    });
  }
}

export default DSRedisAdapter;
