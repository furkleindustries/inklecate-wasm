const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/mono.js',
  target: 'node',
  output: {
    filename: 'main.min.js',
    libraryTarget: 'umd',
    path: path.join(__dirname, 'src'),
  },

  node: {
    __dirname: true,
    fs: 'empty',
    'fs-extra': 'empty',
  },
};
