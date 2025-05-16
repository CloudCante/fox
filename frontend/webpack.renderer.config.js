const webpack = require('webpack');
const rules = require('./webpack.rules');

module.exports = {
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.css']
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_BASE': JSON.stringify(process.env.REACT_APP_API_BASE)
    })
  ]
};