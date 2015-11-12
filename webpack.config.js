module.exports = {
  entry: './src/index.js',
  output: {
    filename: './dist/js-data-redis.js',
    libraryTarget: 'commonjs2',
    library: 'js-data-redis'
  },
  externals: [
    'js-data',
    'redis'
  ],
  module: {
    loaders: [
      {
        test: /(src)(.+)\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
};