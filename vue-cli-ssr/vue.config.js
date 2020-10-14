
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')
const nodeExternals = require('webpack-node-externals')
const merge = require('lodash.merge')
const TARGET_NODE = process.env.WEBPACK_TARGET === 'node'
const target = TARGET_NODE ? 'server' : 'client'

module.exports = {
  css: {
    extract: process.env.NODE_ENV === 'production'
  },
  configureWebpack: () => ({
    entry: `./src/entry-${target}.js`, // 将 entry 指向应用程序的 server / client 文件
    devtool: 'source-map',
    target: TARGET_NODE ? 'node' : 'web',
    node: TARGET_NODE ? undefined : false,
    output: {
      libraryTarget: TARGET_NODE ? 'commonjs2' : undefined
    },
    externals: TARGET_NODE
      ? nodeExternals({
        allowlist: [/\.css$/]
      })
      : undefined,
    // 避免在服务器配置中使用CommonsChunkPlugin
    optimization: {
      splitChunks: TARGET_NODE ? false : undefined
    },
    plugins: [TARGET_NODE ? new VueSSRServerPlugin() : new VueSSRClientPlugin()]
  }),
  chainWebpack: config => {
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap(options => {
        merge(options, {
          optimizeSSR: false
        })
      })

    // fix ssr hot update bug
    if (TARGET_NODE) {
      config.plugins.delete('hmr')
    }
  }
}
