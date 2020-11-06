import {
  baseWarn
  , baseError
  , rem2rpx
  , px2rpx
  , kebabize
  , camelize
  , splitObj
} from './tool.js'

import {
  ATTR_MAP
  , COMPONENT_MAP
  , VX_TAG
  , EVENT_MAP
  , WARN_MSG
  , EVENT_REG
  , VBIND_REG
  , REPLACECONTENT
  , DEPRECATED
  , SPEC_ATTR
  , DIRECTIVES
  , SURPORT_COMPONENT_DIRECTIVES
  , VX_DIRECTIVE
  , MIX_LOG_FLAG
  , LOG_FLAG
} from '../vueMapWXML.js';

import {
  handleVlog
  , checkConfigUse
  , handleLog
  , handleMixLog
} from './business.js'

import {
  isNoUseAtrr
} from './judgeTag.js'

const COMPGETCLASS = '__vx_class'
const COMPGETSTYLE = '__vx_style'

/**
 * 处理v-for
 * @param {*} ast 
 *  <li v-for="(item, index) in items">
    {{ index }} - {{ item.message }}
  </li>
 * <view wx:for="{{items}}" wx:for-item="item" wx:for-index="index" >
  {{ index }} - {{ item.message }}
</view>
 */
export function vForMap(ast) {
  // 强制赋予了wx:for-index 如果有iterator1则用iterator1，否则程序指定为遍历的索引
  let forRes = ` ${ATTR_MAP['v-for']}="{{${ast.for}}}" wx:for-item="${ast.alias}" wx:for-index="${ast.forKey}"`
  if (ast.iterator2 !== undefined) {
    baseWarn(`wx:for 不支持对象的索引${ast.iterator2}遍历，已被忽略`, ast.originLine)
  }
  // 添加wx:key 避免warning
  // if (ast.attrsMap[':key'] === undefined && ast.attrsMap['v-bind:key'] === undefined) {
  //   forRes += ` wx:key="${ast.forKey}"`
  // }
  if(ast.key){
    let xcxKey = ast.key.replace( ast.alias + '.' ,'')
    xcxKey = xcxKey.replace(/"|'/g, "")
    forRes += ` wx:key="${xcxKey}"`
  }else if(ast.attrsMap[':wx-key'] || ast.attrsMap['v-bind:wx-key']){
    let xcxKey = ast.attrsMap[':wx-key'] || ast.attrsMap['v-bind:wx-key']
    xcxKey = xcxKey.replace( ast.alias + '.' ,'').replace(/"|'/g, "")
    forRes += ` wx:key="${xcxKey}"`
  }
  return forRes
}

function handleStyleValue(item, isDynamic = true) {
  let res = splitObj(item, isDynamic)
  // 处理css单位转化
  let styleValue = rem2rpx(px2rpx(res.value))
  // 处理css，驼峰转中划线
  let styleKey = kebabize(res.key)
  return {
    styleValue,
    styleKey
  }
}

/**
 * 检查根据','的若拆解是否有错误
 * eg: transform:'scale(1,'+slideScaleY+')'会被拆成["transform:'scale(1,'", "'+slideScaleY+')'"]导致错误
 * @param {*} arr 
 */
function checkObjSplit(arr){
  let res = []
  arr && arr.map((item)=>{
    if(item.indexOf(':') !== -1){
      res.push(item)
    }else if(item){
      res[res.length-1] = res[res.length-1] + ',' +item
    }
  })
  return res
}

function transObjStyle(str){
  let res = ''
  // todo: 改为babel分析生成ast
  str = str.replace(/\{|\}/g,'')
  let styleArr = str.split(',')
  styleArr = checkObjSplit(styleArr)
  styleArr.map((item)=>{
    if(!item){
      return 
    }
    
    let styleRes = handleStyleValue(item, true)
    let styleKey = styleRes.styleKey
    let styleValue = styleRes.styleValue
    res += `${styleKey}: {{${styleValue}}};`
  })
  return res
}

export function getObjItem(str){
  let res = ''
  let objContent = str.trim().slice(1, str.length-1)
  let keyValueArr = objContent.split(',')
  keyValueArr.forEach((item, index) => {
    let keyValue = item.split(':')
    let key = keyValue[0].trim().replace(/'|"/g,'')
    let value= keyValue[1].trim()
    if(index>0){
      res += ','
    }
    res += `${value}?'${key}': ''`
  })
  return res
}

function transObjClass(str){
  let res = '{{['
  res += getObjItem(str)
  res += ']}}'
  return res
}

function transArrClass(str){
  let res = '{{['
  let objContent = str.trim().slice(1, str.length-1)
  let keyValueArr = objContent.split(',')
  keyValueArr.forEach((item, index) => {
    if(index>0){
      res += ','
    }
    if( item.startsWith('{') && item.endsWith('}') ){
      res += getObjItem(item)
    }else{
      res += item
    }
  })
  res += ']}}'
  return res
}

/**
 * 处理v-bind:class和v-bind:style
 * v-bind:class不支持对象。简单变量/数组可以支持；但是变量如果是对象，将无法被小程序解析
 * @param {*} ast 
 * :style="{height: 7.5*(banner._img.scale) + 'rem', color: '#fff'}"
 * style="height: 2rem"
 * 
 * isRoot: true.  需要在原class和style上拼接__vx_class和__vx_style，以支持组件上传递的样式
 */

export function handleClassAndStyle(ast, isRoot) {
  let specAttrRes = ''
  let specAttrBinding = {
    class: 'classBinding'
    , style: 'styleBinding'
  }

  Object.keys(specAttrBinding).map((attr) => {
    let res = ''
    let attrBinding = specAttrBinding[attr]
    // 静态数据
    // style="width: 400px; height: 500px;"
    if (ast.attrsMap[attr]) {
      if(attr === 'class'){
        res += ` ${attr}="${ast.attrsMap[attr]}`
      }else{
        try {
          let staticStyleArr = ast.attrsMap[attr].split(';')
          staticStyleArr.map((item)=>{
            if(!item){
              return
            }
            let styleRes = handleStyleValue(item, false)
            let styleKey = styleRes.styleKey
            let styleValue = styleRes.styleValue
            if (res) {
              res += ` ${styleKey}: ${styleValue};`
            } else {
              res += ` ${attr}="${styleKey}: ${styleValue};`
            }
          })
        }catch(err){
          err && console.error(err.stack)
        }
      }
    }

    //动态数据
    if (ast[attrBinding]) {
      if (ast[attrBinding][0] === '{') {
        // v-bind:class="{ active: isActive, 'text-danger': hasError }"
        if(attr === 'class'){
          if (res) {
            res += ` ${transObjClass(ast[attrBinding])}`
          }else{
            res += ` ${attr}="${transObjClass(ast[attrBinding])}`
          }
          // baseWarn(`:${attr}="${ast[attrBinding]}"无法转化至WXML，已被忽略`, ast.originLine)
        }else{
          // :style="{height: 7.5*(banner._img.scale) + 'rem', color: '#fff'}" -> 
          // style="height: {{7.5*(banner._img.scale) + 'rpx'}}; color: '#fff';"
          try {
            if(res){
              res += ` ${transObjStyle(ast[attrBinding])}`
            }else{
              res += ` ${attr}="${transObjStyle(ast[attrBinding])}`
            }
          } catch (err) {
            baseError(`:${attr}="${ast[attrBinding]}"语法错误，=后不是合法对象`, ast.originLine)
          }
        }
        
      } else if (ast[attrBinding][0] === '[') {
        if(attr === 'class'){
          if (res) {
            res += ` ${transArrClass(ast[attrBinding])}`
          }else{
            res += ` ${attr}="${transArrClass(ast[attrBinding])}`
          }
        }else{
          try {
            let str = ast[attrBinding].slice(1, ast[attrBinding].length-1)
            if(res){
              res += ` ${transObjStyle(str)}`
            }else{
              res += ` ${attr}="${transObjStyle(str)}`
            }
          } catch (err) {
            baseError(`:${attr}="${ast[attrBinding]}"语法错误，=后不是合法对象`, ast.originLine)
          }
        }
        
      } else {
        // <div v-bind:class="variable"> （如果variable是对象、数组变量，则无法被小程序解析）
        let attrValue = ast[attrBinding].trim()
        if(attr === 'style'){
          attrValue = rem2rpx(px2rpx(ast[attrBinding].trim()))
        }
        if (res) {
          res += ` {{${attrValue}}}`
        } else {
          res += ` ${attr}="{{${attrValue}}}`
        }
      }
    }

    // 非组件且含有曝光打点
    if(attr === 'class' ){
      res = handleVlog(ast, res)
    }

    if(isRoot){
      res += res? ` {{__vx_${attr}}}`: ` ${attr}="{{__vx_${attr}}}`
    }

    res += res? '"': ''
    
    specAttrRes += res
  })

  return specAttrRes
}

/**
 * class="favor_goods_image" :class="varClass"
 * => class: "favor_goods_image " + varClass ,
 * @param {*} ast 
 * 
 * isRoot: 需要添加外部传入的class：COMPGETCLASS
 */
export function handleCompClass(ast, isRoot){
  let res = ''

  if(ast['classBinding']){
    res += `"${COMPGETCLASS}":${ast['classBinding']}`
  }

  if(ast.attrsMap['class']) {
    if(res){
      res += `+" ${ast.attrsMap['class']}"`
    }else{
      res += `"${COMPGETCLASS}":"${ast.attrsMap['class']}"`
    } 
  }

  if(isRoot){
    res += res ? ` + ${COMPGETCLASS}`: `"${COMPGETCLASS}": ${COMPGETCLASS}`
  }

  if(res){
    res +=','
  }
  return res
}

/** 
style="height:100px; width:100px" :style="variable"
=>
"style": "height:100px; width:100px;" + variable

style="height:100px; width:100px" :style="{'marginTop': '10px', 'marginBottom': bot + 'rem'}"
=>
"style": { 'height':'100px'; 'width':'100px', 'marginTop': '10rem', 'marginBottom': this.bot + 'rem' }
改成字符串拼接
"style": "height:100px; width:100px; marginTop: 10rem; marginBottom: " + this.bot + "rem"

* isRoot: 需要添加外部传入的style：COMPGETSTYLE
*/
export function handleCompStyle(ast, isRoot){
  let staticObj = {}
  let dynamicObj = {}
  let dynamicVar = null
  let res = ''
  // 静态数据
  // style="width: 400px; height: 500px;"
  if (ast.attrsMap['style']) {
    try {
      let staticStyleArr = ast.attrsMap['style'].split(';')
      staticStyleArr.map((item)=>{
        if(!item){
          return
        }
        let styleRes = handleStyleValue(item, false)
        let styleKey = styleRes.styleKey
        let styleValue = styleRes.styleValue
        staticObj[styleKey] = styleValue
      })
    }catch(err){
      err && console.error(err.stack)
    }
  }

  //动态数据
  if (ast['styleBinding']) {
    if (ast['styleBinding'][0] === '{') {
      
        // :style="{height: 7.5*(banner._img.scale) + 'rem', color: '#fff'}" -> 
        // style="height: {{7.5*(banner._img.scale) + 'rpx'}}; color: '#fff';"
        try {
          let value = ast['styleBinding']
          value = value.replace(/\{|\}/g,'')
          let styleArr = value.split(',')
          styleArr.map((item)=>{
            if(!item){
              return
            }
            let styleRes = handleStyleValue(item, true)
            let styleKey = styleRes.styleKey
            let styleValue = styleRes.styleValue
            dynamicObj[styleKey] = styleValue
          })
        } catch (err) {
          baseError(`style="${ast['styleBinding']}"语法错误，=后不是合法对象`, ast.originLine)
        }
      
      
    } else if (ast['styleBinding'][0] === '[') {
      baseWarn(`:style="${ast['styleBinding']}"无法转化至WXML，已被忽略`, ast.originLine)
    } else {
      // <div v-bind:style="variable"> （如果variable是对象、数组变量，则无法被小程序解析）
      dynamicVar = ast['styleBinding'].trim()
    }
  }
  
  // 1) static + dynamicObj;  2) static + dynamicVar 3) dynamicObj 4)dynamicVar 5)static
  if(Object.keys(staticObj).length && Object.keys(dynamicObj).length){
    if(!res){
      res += `"${COMPGETSTYLE}":`
    }
    res += '"'
    Object.keys(staticObj).map((key) => {
      res += `${key}:${staticObj[key]};`
    })
    Object.keys(dynamicObj).map((key) => {
      res += `${key}:" + ${dynamicObj[key]} + ";`
    })
    res += '"'
    
  }else if(Object.keys(staticObj).length && dynamicVar){
    if(!res){
      res += `"${COMPGETSTYLE}":`
    }
    res += '"'
    Object.keys(staticObj).map((key) => {
      res += `${key}:${staticObj[key]};`
    })
    res += `"+${dynamicVar}`
  }else if(Object.keys(dynamicObj).length){
    if(!res){
      res += `"${COMPGETSTYLE}":`
    }
    res += '"'
    Object.keys(dynamicObj).map((key) => {
      res += `${key}:" + ${dynamicObj[key]} + ";`
    })
    res += '"'
  }else if(dynamicVar){
    if(!res){
      res += `"${COMPGETSTYLE}":`
    }
    res += `${dynamicVar}`
  }else if(Object.keys(staticObj).length){
    if(!res){
      res += `"${COMPGETSTYLE}":`
    }
    res += '"'
    Object.keys(staticObj).map((key) => {
      res += `${key}:${staticObj[key]};`
    })
    res += '"'
  }

  if(isRoot){
    res += res ? ` + ${COMPGETSTYLE}`: `"${COMPGETSTYLE}": ${COMPGETSTYLE}`
  }

  if(res){
    res +=','
  }

  return res
}

/**
 * 事件处理，返回事件的key-value对
 * @param {*string} direcKey:
 * ["v-on:click.once", ":click.once", "click", ".once", index: 0, input: "v-on:click.once"]
 * ["v-on:click", ":click", "click", undefined, index: 0, input: "v-on:click"]
 * ["@click.once", "click", ".once", index: 0, input: ":@click.once"]
 * ["v-on", undefined, undefined, undefined, index: 0, input: "v-on"]
 * @param {*string} value: @click = value
 * @return {*object}
 */
function getEventKeyValue(direcKey, value, isComp, line, ast){
  let res = {}

  function checkEvent(event, handle, modifer){
    let obj = {}
    let isVXtag = VX_TAG.indexOf(ast.tag)===-1? false: true
    
    if(isComp){
      // 组件上
      // if(mapEvent){
      //   // 不支持原生事件
      //   baseWarn(`不支持在组件上直接绑定内置事件，${event}=${value}转化时已被忽略`, line)
      // }else{
        // 支持外部传给组件内部的事件回调函数
        obj[event] = handle
      // }
    }else{
      // 非组件元素
      let resEvent
      let VXtagEvent = COMPONENT_MAP[ast.tag] && COMPONENT_MAP[ast.tag].event && COMPONENT_MAP[ast.tag].event[event]
      // 是组件上的非标准事件。使用映射事件或原样保留
      if(isVXtag && COMPONENT_MAP[ast.tag] && !EVENT_MAP[event]){
        // 内置组件的内置事件
        resEvent = VXtagEvent || event
      }else{
        // 普通元素 || 普通事件
        let mapEvent = EVENT_MAP[event] 
        if(mapEvent){
          resEvent = 'bind' + mapEvent
          if(modifer){
            if(modifer === '.stop'){
              resEvent = 'catch' + mapEvent
            }else if(modifer.indexOf('.stop') !== -1){
              resEvent = 'catch' + mapEvent
              baseWarn(`不支持除了.stop之外的事件的modifiers`, line)
            }else{
              baseWarn(`小程序不支持事件的modifiers，${event}${modifer}已被替换为${event}`, line)
            }
          }
        }
      }
      if(resEvent){
        obj[resEvent] = handle
      }else{
        baseWarn(`小程序不支持${event}事件，转化时已被忽略`, line)
      }
    }
    return obj;
  }

  if (direcKey[2] && direcKey[2][0] !== '.') {
    res = checkEvent(direcKey[2], value, direcKey[3])
  } else if (direcKey[1] && direcKey[1][0] !== ':') {
    res = checkEvent(direcKey[1], value, direcKey[2])
  } else if (direcKey[0] === 'v-on') {
    if(value && value[0] !== '{'){
      if(isComp){
        res = `...${value}`
      }else{
        baseWarn(`${direcKey[0]}="${value}"语法错误，v-on的值只允许为对象，转化时已被忽略`, line)
      }
    }else{
      try {
        value = value.replace(/\{|\}/g,'')
        var attrsArr = value.split(',')
        attrsArr.map((item)=>{
          let itemRes = splitObj(item)
          res = Object.assign(res,checkEvent(itemRes.key, itemRes.value))
        })
      } catch (err) {
        baseError(`${direcKey[0]}="${value}"语法错误，v-on=后应该跟随对象`, line)
      }
    }
  }
  return res

  // let finalRes = {}
  // if(isComp && typeof res === 'object'){
  //   // 中划线转驼峰。props内容传递给子组件js
  //   for (let key in res){
  //     finalRes[camelize(key)] = res[key]
  //   }
  // }else{
  //   finalRes = res
  // }
  
  // return finalRes
}

/**
 * 事件处理，返回处理后的字符串供template拼接
 * @param {*string} direcKey:
 * ["v-on:click.once", ":click.once", "click", ".once", index: 0, input: "v-on:click.once"]
 * ["v-on:click", ":click", "click", undefined, index: 0, input: "v-on:click"]
 * ["@click.once", "click", ".once", index: 0, input: ":@click.once"]
 * ["v-on", undefined, undefined, undefined, index: 0, input: "v-on"]
 * @param {*string} value: @click = value
 * @return {*string}
 */
export function handleEvent(event, handler, line, ast) {
  let res = ''
  let resObj = getEventKeyValue(event, handler, false, line, ast)
  resObj && Object.keys(resObj).map((key) => {
    if(key === 'bindinput'){
      res += ` ${key}="vx_inputHandle" data-input-event="${resObj[key]}" data-vx-scope="{{$scope}}" `
    }else if( (key === 'bindtap' || key === 'catchtap') && ast._vxClickNotJumpLog){
      res += ` ${key}="vx_clickLogHandle" data-click-event="${resObj[key]}"`
    }else{
      res += ` ${key}="{{$scope}}.${resObj[key]}"`
    }
  })
  return res
}


/**
 * v-bind处理，获得处理后的键值对
 * @param {*string} direcKey : ["v-bind:text-content.prop", ":text-content.prop", "text-content", ".prop", index: 0, input: "v-bind:text-content.prop"]
 * ["v-bind:src", ":src", "src", undefined, index: 0, input: "v-bind:src"]
 * [":src.prop", "src", ".prop", index: 0, input: ":src.prop"]
 * ["v-bind", undefined, undefined, undefined, index: 0, input: "v-bind"]
 * @param {*string} value: v-bind:key=value 
 * @param {*boolen}isComp
 * @return {*object} object为key-value
 */
function getVbindKeyValue(direcKey, value, isComp, line, ast){
  let res = {}
  let resName = '';
  // 过滤value的filter
  let originValue = value
  if( value && value.indexOf('|')!==-1 && value[value.indexOf('|')+1] !== '|'){ //排除`||`的语句
    // 处理filter
    value = value.split('|')[0]        
    baseWarn(`小程序不支持filter，${originValue}已被转为${value}`, line)
  }

  if (direcKey[2] && direcKey[2][0] !== '.') {
    // :key -> wx:key的处理
    resName = ATTR_MAP[direcKey[2]] || (COMPONENT_MAP[ast.tag] && COMPONENT_MAP[ast.tag].attr && COMPONENT_MAP[ast.tag].attr[direcKey[2]]) || direcKey[2]
    // :is的特殊处理
    if(resName === 'is'){
      // res = ` ${resName}="${value}"`
      !isComp && baseWarn(`不支持is方式的组件引入，转化时已被忽略`, line)
    }else if(direcKey[2]==='key'){
      // baseWarn(`不支持在组件中使用循环和key，转化时已被忽略`, line)
    }else{
      res = {
        [resName]: value
      }
    }
    if (direcKey[3]) {
      baseWarn(`小程序不支持vue对应v-bind的modifiers，${direcKey[2]}${direcKey[3]}已被替换为${direcKey[2]}`, line)
    }
  } else if (direcKey[1] && direcKey[1][0] !== ':') {
    resName = ATTR_MAP[direcKey[1]] || (COMPONENT_MAP[ast.tag] && COMPONENT_MAP[ast.tag].attr && COMPONENT_MAP[ast.tag].attr[direcKey[1]]) || direcKey[1]
    // :is的特殊处理
    if(resName === 'is'){
      // res = ` ${resName}="${value}"`
      baseWarn(`不支持is方式的组件引入，转化时已被忽略`, line)
    }else{
      res = {
        [resName]: value
      }
    }
    if (direcKey[2]) {
      baseWarn(`小程序不支持vue对应v-bind的modifiers，${direcKey[1]}${direcKey[2]}已被替换为${direcKey[1]}`, line)
    }
  } else if (direcKey[0] === 'v-bind') {
    if(value && value[0] !== '{'){
      if(isComp){
        // 值为对象的变量
        res = `...${value}`
      }else{
        baseWarn(`${direcKey[0]}="${value}"语法错误，v-bind的值只允许为对象，转化时已被忽略`, line)
      } 
    }else{
      try {
        value = value.replace(/\{|\}/g,'')
        var attrsArr = value.split(',')
        attrsArr.map((item)=>{
          let itemRes = splitObj(item)
          let bindValue = itemRes.value
          res[itemRes.key] = ATTR_MAP[bindValue] || (COMPONENT_MAP[ast.tag] && COMPONENT_MAP[ast.tag].attr && COMPONENT_MAP[ast.tag].attr[bindValue]) || bindValue
        })
      } catch (err) {
        baseError(`${direcKey[0]}="${value}"语法错误，v-bind=后应该跟随对象`, line)
      }
    }
  }
  // return res
  let finalRes = {}
  if(isComp && typeof res === 'object'){
    // 中划线转驼峰。props内容传递给子组件js
    for (let key in res){
      finalRes[camelize(key)] = res[key]
    }
  }else{
    finalRes = res
  }
  return finalRes
}

/**
 * v-bind处理，获得处理后的字符串，以追加在模板上
 * @param {*string} bindKey : ["v-bind:text-content.prop", ":text-content.prop", "text-content", ".prop", index: 0, input: "v-bind:text-content.prop"]
 * ["v-bind:src", ":src", "src", undefined, index: 0, input: "v-bind:src"]
 * [":src.prop", "src", ".prop", index: 0, input: ":src.prop"]
 * ["v-bind", undefined, undefined, undefined, index: 0, input: "v-bind"]
 * @param {*string} value: v-bind:key=value 
 * @return {*string} 追加到template的字符串
 */
export function handleVbind(bindKey, value, line, ast) {
  let res = ''
  let resObj = getVbindKeyValue(bindKey, value, false, line, ast)
  resObj && Object.keys(resObj).map((key) => {
    if(!isNoUseAtrr(key, ast.tag)){
      res += ` ${key}="{{${resObj[key]}}}"`
    }
  })
  return res
}

// function handleFilter(value, line){
//   let originValue = value
//   let filterReg = /.*?[^|](|.*?}})/g //不对
//   if( value && value.indexOf('|')!==-1 && value[value.indexOf('|')+1] !== '|'){ //排除`||`的语句
//     // 处理filter
//     value = value.split('|')[0]        
//     baseWarn(`小程序不支持filter，${originValue}已被转为${value}`, line)
//   }
//   return value
// }

export function recordForKey(forKeyArr, key){
  forKeyArr.push(key)
  return forKeyArr
}

function transquota(ast){
  if(ast.classBinding){
    ast.classBinding = ast.classBinding.replace(/"/g, "'")
  }
  if(ast.styleBinding){
    ast.styleBinding = ast.styleBinding.replace(/"/g, "'")
  }
  return ast
}

/**
 * 
 * @param {*} target 
 * @param {*} template 
 * @param {*} isRoot 
 * @param {*} specInfo 特殊节点需要的信息，譬如MIX_LOG_FLAG会带有mixLogIdx，
 * { mixLogIdx: "'1'_key1_key2", mixLogIdxStatic: false}
 */
export function generateAstAttr(target, template, isRoot, specInfo){

  // 处理attr
  let insertMap = {
    attr: null
    , value: null
    , type: 'text'
  }; //处理v-text和v-html
  let hasEventKey = false
  target = transquota(target)
  let attrs = target.attrsMap;
  attrs && Object.keys(attrs).map((key) => {
    // a的target不支持
    if(target.tag === 'a' && key === 'target'){
      return
    }
    if (WARN_MSG[key]) {
      baseWarn(WARN_MSG[key], target.originLine)
    }
    let value = attrs[key]
    if(typeof value === 'string'){
      value = value.trim()
      value = value.replace(/"/g, "'")
      attrs[key] = value
    }
    checkConfigUse(value, target.originLine)

    let eventKey = key.match(EVENT_REG.ON) || key.match(EVENT_REG.SHORT)
    let vbindKey = key.match(VBIND_REG.BIND) || key.match(VBIND_REG.SHORT)
    let mapKey = ATTR_MAP[key] || (COMPONENT_MAP[target.tag] && COMPONENT_MAP[target.tag].attr && COMPONENT_MAP[target.tag].attr[key])
    let resKey = mapKey !== undefined ? mapKey : key

    if (resKey === REPLACECONTENT) {
      // v-text和v-html处理
      insertMap.attr = key
      insertMap.value = value
      if(key === 'v-html'){
        insertMap.type = 'html'
      }
    } else if(resKey === DEPRECATED){
      // 不支持的标签不做处理
    } else if (key === 'v-for') {
      template += vForMap(target)
    } else if(target.for && (key === 'key'|| key === ":key" || key === "v-bind:key" || key ===':wx-key' || key === 'v-bind:wx-key')){
      // key在vForMap里有单独的处理
    } else if (SPEC_ATTR.indexOf(key) !== -1) {
      // class 和 style的特殊处理
    } else if (vbindKey) {
      template += handleVbind(vbindKey, value, target.originLine, target)
    } else if (eventKey) {
      // 事件的处理
      template += handleEvent(eventKey, value, target.originLine, target)
      hasEventKey = true
    } else if (DIRECTIVES.indexOf(key) !== -1) {
      if(resKey === 'wx:else'){
        template += ` ${resKey}`
      }else{
        template += ` ${resKey}="{{${value}}}"`              
      }
    } else {
      if(value === ""){
        template += ` ${resKey}`
      }else{
        if(!isNoUseAtrr(resKey, target.tag)){
          // 是否是打点标志，打点的属性需要平铺
          if(key === LOG_FLAG){
            template += handleLog(value, specInfo.mixLogIdx, specInfo.mixLogIdxStatic)
          }else if(key === MIX_LOG_FLAG){
            template += handleMixLog(target, specInfo.mixLogIdx, specInfo.mixLogIdxStatic)
          }else{
            template += ` ${resKey}="${value}"`
          }
        }
      }
    }
  })

  if(target._vxClickNotJumpLog && !hasEventKey){
    template += ` capture-bind:tap="vx_clickLogHandle"`
  }

  // handle class and style
  template += handleClassAndStyle(target, isRoot)

  return {
    template,
    insertMap
  }
}

export function generateCompAstAttr(ast, template, isRoot, props, event ){

  // 处理attr
  ast = transquota(ast)
  let attrs = ast.attrsMap;
  attrs && Object.keys(attrs).map((key) => {
    if (WARN_MSG[key]) {
      baseWarn(WARN_MSG[key], ast.originLine)
    }
    let value = attrs[key]
    if(typeof value === 'string'){
      value = value.trim()
      value = value.replace(/"/g, "'")
      attrs[key] = value
    }
    let eventKey = key.match(EVENT_REG.ON) || key.match(EVENT_REG.SHORT)
    let vbindKey = key.match(VBIND_REG.BIND) || key.match(VBIND_REG.SHORT)
    let mapKey = ATTR_MAP[key] || (COMPONENT_MAP[ast.tag] && COMPONENT_MAP[ast.tag].attr && COMPONENT_MAP[ast.tag].attr[key])
    let resKey = mapKey !== undefined ? mapKey : key

    if (resKey === REPLACECONTENT) {
      // v-text和v-html处理
      baseWarn(`组件${ast.tag}不支持使用${key}`, ast.originLine)
    } else if(resKey === DEPRECATED){
      // 不支持的标签不做处理, baseWarn(WARN_MSG[key])已抛出
    } else if (SPEC_ATTR.indexOf(key) !== -1) {
      // style的特殊处理
    } else if (key === 'v-for') {
      // template += vForMap(ast)
    } else if(ast.for && (key === 'key'|| key === ":key" || key === "v-bind:key")){
      // key在vForMap里有单独的处理
    } else if (vbindKey) {
      let propsRes = getVbindKeyValue(vbindKey, value, true, ast.originLine, ast)
      if(typeof propsRes === 'string'){
        // ...value的处理
        props += `${propsRes},`
      }else{
        for (let key in propsRes){
          props += `"${key}": ${propsRes[key]},`
        }
      }
      
    } else if (eventKey) {
      // 事件的处理
      let eventRes = getEventKeyValue(eventKey, value, true, ast.originLine, ast)
      if(typeof eventRes === 'string'){
        // ...value的处理
        event += `${eventRes},`
      }else{
        for (let eventKey in eventRes){
          event += `"${eventKey}": ${eventRes[eventKey]},`
        }
      }
    } else if (DIRECTIVES.indexOf(key) !== -1) {
      // 'v-if', 'v-else', 'v-else-if', 'v-show'
      if(SURPORT_COMPONENT_DIRECTIVES){
        if(resKey === 'wx:else'){
          template += ` ${resKey}`
        }else{
          template += ` ${resKey}="{{${value}}}"`              
        }
      }else{
        baseWarn(`不支持在组件${ast.tag}上使用${key}，转化时已被忽略`, ast.originLine)
      }
    } else {
      if(VX_DIRECTIVE.indexOf(resKey) !== -1){
        props += `"${resKey}": ${value},`
      }else{
        if(key === LOG_FLAG || key === MIX_LOG_FLAG){
          baseError(`不支持在组件${ast.tag}上使用${key}，转化时已被忽略，请在组件外或者内部包裹一层元素打点`, ast.originLine)
        }else{
          resKey = camelize(resKey)
          props += `"${resKey}": "${value}",`
        }
      }
    }
  })

  // handle class
  props += handleCompClass(ast, isRoot)

  // handle style
  props += handleCompStyle(ast, isRoot)

  return {
    template
    , props
    , event
  }

}