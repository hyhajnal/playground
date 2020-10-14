## babel 插件入门

### 插件功能
* 头部添加 "use strict"
* console，生产环境删除，开发环境添加console的位置信息
* " ** " 转换成 Math.pow()

### 转换前
``` js
var a = 2;
a ** a;

console.log('hhhh', 1);
```

### 转换后

``` js
"use strict";

var a = 2;
Math.pow(a, a);
```

``` js
"use strict";

var a = 2;
Math.pow(a, a);
console.log("hhhh (trace: line 4, column 0)", 1);
```

### 插件使用
```
npm i @babel/plugin-hello
```
```
{
    "plugins": ["@babel/plugin-hello"]
}
```

### 插件开发
[请戳 👉 这里](https://www.yuque.com/docs/share/604fd54e-d87e-4c0b-90ac-00e6b35c0a92)