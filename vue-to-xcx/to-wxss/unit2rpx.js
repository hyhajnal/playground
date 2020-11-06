var postcss = require('postcss');

function px2rpx (source) {
  if (!source) return ''
  return source.replace(/([0-9.]+)px/ig, (match, size) => {
      return size + 'rpx'
  })
}

function rem2rpx (source) {
  if (!source) return ''
  return source.replace(/([0-9.]+)rem/ig, (match, size) => {
      // ps:0.28*100 -> 28.00000004
      var res = parseFloat((size * 100).toFixed(2))
      return res + 'rpx'
  })
}

/**
 * opts:
 *  keepComment: no2rem  -- tell not to transform（same use for h5）
 *  removeComment: ['xcx-begin', 'xcx-end'] -- need remove comment
 */
module.exports = postcss.plugin('postcss-unit2rpx', function (opts) {
  opts = opts || {};
  opts.removeComment = opts.removeComment || []
  if(opts.keepComment && opts.removeComment.indexOf(opts.keepComment) === -1){
    opts.removeComment.push(opts.keepComment)
  }
  return function (root, result) {
    // Transform CSS AST here
    root.walkDecls(decl => {
      var next = decl.next()
      // not transform flag
      if( !(next && next.type === 'comment' && next.text.trim() === opts.keepComment) ){
        decl.value = rem2rpx(px2rpx(decl.value))
      }
    })
    root.walkComments(comment => {
      if( opts.removeComment.indexOf(comment.text.trim()) !== -1 ){
        comment.remove()
      }
    })
  };
});
