/**
 * 实际使用插件
 * .babelrc + npm install @babel/plugin-hello-world
 */

import { transform } from '@babel/core';
import myBabelPlugin from './src/index';

let res = transform(code, {
    plugins: [
        myBabelPlugin
    ]
});



