const path = require("path");

module.exports = {
  mode: "development",
  // devtool: "source-map",
  entry: path.join(__dirname, 'index.js'),
  output: {
    filename: "[name].js",
    path: path.join(__dirname, 'dist')
  }
};