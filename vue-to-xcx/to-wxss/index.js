import less from 'less'
import postcss from 'postcss'
import bem from 'postcss-bem-fix'
import precss from 'precss'
import calc from 'postcss-calc'
// import Promise from 'bluebird'
import path from 'path'

import unit2rpx from './unit2rpx'
const unit2rpxOpt = {
    keepComment: 'no2rem',
    removeComment: ['xcx-begin', 'xcx-end']
}

const processor = postcss([bem, precss, calc])

async function pcss2css (source) {
    if (!source) return ''
    return await processor.process(source).then(result => result.css)
}

async function less2css (source, filePath) {
    if (!source) return ''
    // let findDir = path.dirname(filePath)
    let fileName = path.basename(filePath)
    return await less.render(source, {
        paths: filePath,
        filename: fileName
    }).then(result => result.css)
}

// function filterCode (code) {
//     const VUE_COMMENT = /\/\*\s*h5-begin\s*\*\/[\s\S]*?\/\*\s*h5-end\s*\*\//ig
//     return code.replace(VUE_COMMENT, '')
// }

async function handleUnit (source) {
    if (!source) return ''
    return await postcss([ unit2rpx(unit2rpxOpt) ]).process(source)
    .then(result => result.css)
}

module.exports = (content, filePath, lang = 'less') => {
    return new Promise(async (resolve, reject) => {
        try {
            // content = filterCode(content)
            switch (lang) {
                case 'pcss':
                case 'postcss':
                    content = await pcss2css(content)
                    break
                case 'less':
                    content = await less2css(content, filePath)
                    break
                default:
                    content = lang ? `暂不支持“${lang}”预处理语言` : content
                    break
            }
            content = handleUnit(content)
            resolve(content)
        } catch (err) {
            reject(err)
        }
    })
}
