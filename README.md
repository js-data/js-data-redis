<img src="https://raw.githubusercontent.com/js-data/js-data/master/js-data.png" alt="js-data logo" title="js-data" align="right" width="64" height="64" />

## js-data-redis [![Slack Status][sl_b]][sl_l] [![npm version][npm_b]][npm_l] [![Travis CI][travis_b]][travis_l] [![npm downloads][dn_b]][dn_l] [![Coverage Status][cov_b]][cov_l] [![Codacy][cod_b]][cod_l]

Redis adapter for [js-data](http://www.js-data.io/).

### API Documentation
[DSRedisAdapter](http://www.js-data.io/docs/dsredisadapter)

### Quick Start
`npm install --save js-data js-data-redis redis`.

```js
var JSData = require('js-data');
var DSRedisAdapter = require('js-data-redis');

var store = new JSData.DS();

var adapter = new DSRedisAdapter({
  host: 'my.domain.com',
  port: 3333
});

store.registerAdapter('redis', adapter, { default: true });

// "store" will now use the Redis adapter for all async operations
```

Read about using [JSData on the Server](http://www.js-data.io/docs/jsdata-on-the-server).

### Changelog
[CHANGELOG.md](https://github.com/js-data/js-data-redis/blob/master/CHANGELOG.md)

### Community
- [Slack Channel](http://slack.js-data.io) - Better than IRC!
- [Announcements](http://www.js-data.io/blog)
- [Mailing List](https://groups.io/org/groupsio/jsdata) - Ask your questions!
- [Issues](https://github.com/js-data/js-data-redis/issues) - Found a bug? Feature request? Submit an issue!
- [GitHub](https://github.com/js-data/js-data-redis) - View the source code for js-data.
- [Contributing Guide](https://github.com/js-data/js-data-redis/blob/master/CONTRIBUTING.md)

### Contributing

First, support is handled via the [Slack Channel](http://slack.js-data.io) and
the [Mailing List](https://groups.io/org/groupsio/jsdata). Ask your questions
there.

When submitting issues on GitHub, please include as much detail as possible to
make debugging quick and easy.

- good - Your versions of js-data, js-data-redis, etc., relevant console
logs/error, code examples that revealed the issue
- better - A [plnkr](http://plnkr.co/), [fiddle](http://jsfiddle.net/), or
[bin](http://jsbin.com/?html,output) that demonstrates the issue
- best - A Pull Request that fixes the issue, including test coverage for the
issue and the fix

[Github Issues](https://github.com/js-data/js-data-redis/issues).

#### Submitting Pull Requests

1. Contribute to the issue/discussion that is the reason you'll be developing in
the first place
1. Fork js-data-redis
1. `git clone git@github.com:<you>/js-data-redis.git`
1. `cd js-data-redis; npm install;`
1. Write your code, including relevant documentation and tests
1. Run `npm test` (build and test)
  - You need io.js or Node 4.x that includes generator support without a flag
1. Your code will be linted and checked for formatting, the tests will be run
1. The `dist/` folder & files will be generated, do NOT commit `dist/*`! They
will be committed when a release is cut.
1. Submit your PR and we'll review!
1. Thanks!

#### Have write access?

Here's how to make a release on the `master` branch:

1. Bump `package.json` to the appropriate version.
1. `npm test` must succeed.
1. This time, the built `dist/js-data-redis.js` file _will_ be committed, so stage its changes.
1. Mention the release version in the commit message, e.g. `Stable Version 1.2.3`
1. Push to master.
1. Create a git tag. Name it the version of the release, e.g. `1.2.3`
  - Easiest way is to just create a GitHub Release, which will create the tag for you. Name the Release and the git tag the same thing.
1. `git fetch origin` if you tagged it via GitHub Release, so you can get the tag on your local machine.
1. `npm publish .` (Make sure you got the version bumped correctly!)

### License

The MIT License (MIT)

Copyright (c) 2014-2015 Jason Dobry

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

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
