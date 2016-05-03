var babel = require('rollup-plugin-babel')

module.exports = {
  external: [
    'redis',
    'js-data',
    'js-data-adapter',
    'mout/string/underscore',
    'mout/random/guid'
  ],
  plugins: [
    babel({
      exclude: 'node_modules/**'
    })
  ]
}
