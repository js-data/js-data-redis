##### 3.0.0-beta.2 - 03 May 2016

###### Breaking changes
- How you must now import in ES2015:

    ```js
    import RedisAdapter from 'js-data-redis'
    const adapter = new RedisAdapter()
    ```
    or
    ```js
    import {RedisAdapter, version} from 'js-data-redis'
    console.log(version)
    const adapter = new RedisAdapter()
    ```

- How you must now import in ES5:

    ```js
    var JSDataRedis = require('js-data-redis')
    var RedisAdapter = JSDataRedis.RedisAdapter
    var adapter = new RedisAdapter()
    ```

- Moved some `dist` files to `release` to reduce noise

###### Other
- Upgraded dependencies
- Improved JSDoc comments
- Now using js-data JSDoc template

##### 3.0.0-beta.1 - 17 April 2016

Official v3 beta release

###### Other
- Upgraded dependencies

##### 3.0.0-alpha.3 - 18 March 2016

###### Backwards compatible API changes
- Added count and sum methods

##### 3.0.0-alpha.2 - 10 March 2016

###### Other
- Moved more common adapter functionality into js-data-adapter

##### 3.0.0-alpha.1 - 09 March 2016

###### Breaking API changes
- Now depends on js-data 3.x
- Now longer uses internal `defaults` property, settings are on the adapter instance itself

###### Backwards compatible API changes
- Added createMany and updateMany methods
- Added lifecycle hooks for all methods

###### Other
- Now using js-data-adapter
- Now using js-data-repo-tools

##### 2.3.0 - 11 November 2015

###### Other
- Rebuilt with Babel 6
- Dropped Grunt
- Integrated js-data-adapter-tests

##### 2.2.0 - 09 September 2015

###### Backwards compatible API changes
- #8 - Added support for changing host and port

##### 2.1.0 - 10 July 2015

###### Backwards compatible API changes
- #6 - Support loading relations in find() (better support this time)
- #7 - Support loading relations in findAll() (better support this time)

##### 2.0.0 - 02 July 2015

Stable Version 2.0.0

##### 1.1.0 - 27 March 2015

###### Backwards compatible API changes
- #4 - Support loading relations in find()
- #5 - Support loading relations in findAll()

###### Backwards compatible bug fixes
- #2 - Should not be saving relations (duplicating data)
- #3 - Should be using removeCircular

##### 1.0.3 - 10 March 2015

Rebuild.

##### 1.0.2 - 10 March 2015

Converted to ES6.

##### 1.0.1 - 25 February 2015

Updated dependencies

##### 1.0.0 - 03 February 2015

Stable Version 1.0.0

##### 1.0.0-beta.1 - 12 January 2015

Now in beta.

##### 1.0.0-alpha.1 - 01 November 2014

Stable Version 1.0.0-alpha.1

##### 0.1.0 - 03 October 2014

- Initial Release
