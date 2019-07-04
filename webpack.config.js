const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/mono.js',
  target: 'node',
  output: {
    filename: 'main.min.js',
    libraryTarget: 'commonjs2',
    path: __dirname + '/src/',
  },

  node: {
    __dirname: false,
    fs: 'empty',
    'fs-extra': 'empty',
  },
};
