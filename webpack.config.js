const { join } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const dev = process.env.NODE_ENV !== 'production';

const config = {
  mode: dev ? 'development' : 'production',
  devtool: 'source-map',

  entry: {
    index: [
      './src/mono.js',
      './src/index.ts',
    ],
  },

  output: {
    path: join(__dirname, 'dist'),
    filename: '[name].js',
  },

  resolve: {
    extensions: [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
    ],
  },

  module: {
    defaultRules: [
      {
        type: 'javascript/auto',
        resolve: {}
      },
      {
        test: /\.json$/,
        type: 'json',
      },
    ],

    rules: [
      {
        test: /\.tsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },

      {
        test: /\.(dll|wasm)$/,
        use: 'file-loader',
        exclude: /node_modules/,
      }
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'Babel + TypeScript + React = ❤️',
      template: 'src/index.html',
    }),
  ],

  node: {
    fs: 'empty',
    ws: 'empty',
  },
};

if (dev) {
  config.devServer = {
    port: 8080, // https://webpack.js.org/configuration/dev-server/#devserverport
    open: true, // https://webpack.js.org/configuration/dev-server/#devserveropen
    hot: true, // https://webpack.js.org/configuration/dev-server/#devserverhot
    compress: true, // https://webpack.js.org/configuration/dev-server/#devservercompress
    stats: 'errors-only', // https://webpack.js.org/configuration/dev-server/#devserverstats-
    overlay: true, // https://webpack.js.org/configuration/dev-server/#devserveroverlay
  };
} else {
  config.optimization = {
    minimizer: [
      new TerserPlugin(),
    ],
  };
}

module.exports = config;
