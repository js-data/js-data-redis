<img src="https://raw.githubusercontent.com/js-data/js-data/master/js-data.png" alt="js-data logo" title="js-data" align="right" width="96" height="96" />

# js-data-redis

[![Slack Status][sl_b]][sl_l]
[![npm version][npm_b]][npm_l]
[![Travis CI][travis_b]][travis_l]
[![npm downloads][dn_b]][dn_l]
[![Coverage Status][cov_b]][cov_l] [![Codacy][cod_b]][cod_l]

Redis adapter for [js-data](http://www.js-data.io/).

To get started, visit __[http://js-data.io](http://www.js-data.io)__.

## Table of contents

* [Quick start](#quick-start)
* [Example App](#example-app)
* [Guides and Tutorials](#guides-and-tutorials)
* [API Reference Docs](#api-reference-docs)
* [Community](#community)
* [Support](#support)
* [Contributing](#contributing)
* [License](#license)

## Quick Start
`npm install --save js-data js-data-redis redis`.

```js
// Use Container instead of DataStore on the server
import {Container} from 'js-data'
import RedisAdapter from 'js-data-redis'

// Create a store to hold your Mappers
const store = new Container()

// Create an instance of RedisAdapter with default settings
const adapter = new RedisAdapter()

// Mappers in "store" will use the Redis adapter by default
store.registerAdapter('redis', adapter, { default: true })

// Create a Mapper that maps to a "user" table
store.defineMapper('user')
```

```js
async function findAllAdminUsers () {
  // Find all users where "user.role" == "admin"
  return await store.findAll('user', {
    role: 'admin'
  })
}
```

## Guides and Tutorials

[Get started at http://js-data.io](http://js-data.io)

## API Reference Docs

[Visit http://api.js-data.io](http://api.js-data.io).

## Community

[Explore the Community](http://js-data.io/docs/community).

## Support

[Find out how to Get Support](http://js-data.io/docs/support).

## Contributing

[Read the Contributing Guide](http://js-data.io/docs/contributing).

## License

The MIT License (MIT)

Copyright (c) 2014-2016 js-data-redis project authors

* [LICENSE](https://github.com/js-data/js-data-redis/blob/master/LICENSE)
* [AUTHORS](https://github.com/js-data/js-data-redis/blob/master/AUTHORS)
* [CONTRIBUTORS](https://github.com/js-data/js-data-redis/blob/master/CONTRIBUTORS)

[sl_b]: http://slack.js-data.io/badge.svg
[sl_l]: http://slack.js-data.io
[npm_b]: https://img.shields.io/npm/v/js-data-redis.svg?style=flat
[npm_l]: https://www.npmjs.org/package/js-data-redis
[travis_b]: https://img.shields.io/travis/js-data/js-data-redis.svg
[travis_l]: https://travis-ci.org/js-data/js-data-redis
[dn_b]: https://img.shields.io/npm/dm/js-data-redis.svg?style=flat
[dn_l]: https://www.npmjs.org/package/js-data-redis
[cov_b]: https://img.shields.io/coveralls/js-data/js-data-redis/master.svg?style=flat
[cov_l]: https://coveralls.io/github/js-data/js-data-redis?branch=master
[cod_b]: https://img.shields.io/codacy/64cca2890a594370a5c9f4d5c0e3fcc3.svg
[cod_l]: https://www.codacy.com/app/jasondobry/js-data-redis/dashboard
