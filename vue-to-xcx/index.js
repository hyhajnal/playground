const compiler = require('vue-template-compiler');
const fs = require('fs');
const path = require('path');
const ToJS = require('./to-js');
const ToWxml = require('./to-wxml');
const ToWxss = require('./to-wxss');
const { compileAST } = require('./to-wxml/astToWXML');


// 过滤 H5 的注释
const VUE_COMMENT = /<!--\s*h5-begin\s*-->[\s\S]*?<!--\s*h5-end\s*-->/ig;
const remove_xcx_block = (content) => content.replace(VUE_COMMENT, '');

/**
 * 转换一个文件
 */
const gen_file = (entryPath) => {
    const content = fs.readFileSync(path.join(__dirname, entryPath), 'utf8');

    // 1. parse vue 获取 sfc = { template, script, styles }
    const sfc = compiler.parseComponent(content);

    // 2. 编译拿到AST
    const tplRes = compiler.compile(remove_xcx_block(sfc.template.content), { comments: true, preserveWhitespace: false, shouldDecodeNewlines: true });

    // 3.转换成 wxml
    const wxmlRes = compileAST(tplRes.ast, true, 'index.vue');

    // 4.转换 wxss
    const trans_css = async () => {
        let cssRes = ''
        for(let i = 0; i < sfc.styles.length; i++) {
            const style = sfc.styles[i]
            const content = await ToWxss(remove_xcx_block(style.content), style.attrs.lang)
            cssRes += content;
        }
        fs.writeFileSync('./output/index.wxss', cssRes, 'utf-8');
    } 

    trans_css();

    // 5. 写入文件
    fs.writeFileSync('./output/index.wxml', wxmlRes.wxml, 'utf-8');
    fs.writeFileSync('./output/index.js', sfc.script.content, 'utf-8');
}


gen_file('./example/index.vue')
