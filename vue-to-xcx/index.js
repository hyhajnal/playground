const compiler = require('vue-template-compiler');
const fs = require('fs');
const path = require('path');
const ToJS = require('./to-js');
const ToWxml = require('./to-wxml');
const ToWxss = require('./to-wxss');

const content = fs.readFileSync(path.join(__dirname, './example/index.vue'), 'utf8');

// 1. parse vue 获取 sfc = { template, script, styles }
const sfc = compiler.parseComponent(content);

// 2. 过滤 H5 的注释
const VUE_COMMENT = /<!--\s*h5-begin\s*-->[\s\S]*?<!--\s*h5-end\s*-->/ig;
const tpl = sfc.template.content.replace(VUE_COMMENT, '');

// 3. 编译拿到AST
const tplRes = compiler.compile(tpl, { comments: true, preserveWhitespace: false, shouldDecodeNewlines: true });

console.log(tplRes);