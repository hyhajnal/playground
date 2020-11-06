import formatHtml from './format.js'
import {
  TAG_MAP
  , WARN_TAG_MSG
  , COMPONENT_MAP
  , TEMPLATE_NAME_MAP
  , MIX_LOG_FLAG
  , LOG_FLAG
} from './vueMapWXML.js';

import {
  isUnaryTag
  , isReservedTag
} from './trans-util/judgeTag.js'

import {
  initFileName
  , baseError
  , baseWarn
} from './trans-util/tool.js'

import {
  vForMap
  , recordForKey
  , generateAstAttr
  , generateCompAstAttr
} from './trans-util/attrHandler.js'

import {
  handleConf
  , joinJs
} from './trans-util/confHandler.js'

import {
  isWXComment
  , handleATag
  , handleMvwNavigatorTag
  , checkConfigUse
  , replaceLogAst
  , replaceAAst
  , getMixLogParams
} from './trans-util/business.js'

const COMPONENT_TAG = 'template'
const VUE_COMPONENT_IS_TAG = 'component'
const FOR_KEY = '__key_'
// const quotEscapeReg = /\\ "/g

let fileName = ''

// 记录被处理过的含有if或者elseif的tag，防止出栈后，else对应条件语句丢失
/* 
{
  tagId: 12
  exp: [ 'a==1', 'a==2' ]
}
*/
var handledIfTag = []

/**
 * Convert AST to HTML string.
 * @param {*obejct} ast: vue ast
 * @param {*boolen}  isNeedComponent: is need generate component add js
 * @return if isNeedComponent === true { 
 *  return object { wxml: template(string), js: outSubCompJs(string) } 
 * } else { 
 *  return template(string)
 * }
 */
function compileAST(
  ast
  , isNeedComponent
  , astFileName
) {
  let template = ''  //最终生成的wxml模板字符串
  let outSubCompJs = ''  //遇到组件时生成的注册组件的js
  let stack = []   //记录未闭合的标签
  let isInComment = false  //记录位于xcx-start和xcx-end的状态
  let compIndex = 0 //防止组件key重复
  let confAndCompRecord = [] //记录组件依赖的控制条件
  let tagQuiId = 0   //记录tag唯一标识
  let forKeyIndex = 0 //记录for循环中的key标识符，防止重复: `__key_${forKeyIndex}`
  let forKeyArr = [] //记录for循环中的key的键，组件强依赖于该key
  let mixLogIndex = 0 //记录v-logclick含有混合打点元素的唯一性
  handledIfTag = []

  fileName = astFileName
  initFileName(fileName)
  /**
   * 处理需要转换的单个ast结构成模板
   * @param {*vue ast} target 
   * @return {*boolen} 转化的tag是否合法 
   * 依赖外部：
   * 改变外部：template、stack
   */
  function joinTransTpl(target, isRoot) {
    switch (target.type) {
      case 1:{

        // 特殊的业务逻辑 需要替换掉dom结构
        if(target.attrsMap['type'] === 'submitlog'){
          target = replaceLogAst(target)
        } 

        // 处理tag
        let mapTag = TAG_MAP[target.tag] || COMPONENT_MAP[target.tag] && COMPONENT_MAP[target.tag].tag
        if(target.attrsMap["v-html"]){
          mapTag = 'rich-text'
        }
        if(!mapTag){
          baseWarn(`目前不支持${target.tag}标签`, target.originLine)
          return false
        }

        // v-for的特殊处理：由于小程序模板渲染时有问题，模板中若要使用 wx:for 语句，需要在在外层用 <block wx:if="{{list}}"> 包裹
        if(target.attrsMap['v-for'] && target.tag !== 'template'){
          template += `<block wx:if="{{${target.for}}}">`
        }

        // 插入换行符、空格、标签
        template += `<${mapTag}`;

        // a标签的特殊处理
        if(target.tag === 'a' || target.tag === 'mvw-a'){
          template = handleATag(template,target)
        }else if(target.tag === 'mvw-navigator'){
          let navigatorRes = handleMvwNavigatorTag(template,target)
          template = navigatorRes.template
          target = navigatorRes.ast
        }

        WARN_TAG_MSG[target.tag] && baseWarn(WARN_TAG_MSG[target.tag], target.originLine)

        if(target.for){
          if(target.iterator1){
            target.forKey = target.iterator1
          }else{
            target.forKey = `${FOR_KEY}${forKeyIndex}`
            forKeyIndex++
          }
          
          forKeyArr = recordForKey(forKeyArr, target.forKey)
        }

        let specInfo = {}
        if(target.attrsMap[MIX_LOG_FLAG] || target.attrsMap[LOG_FLAG]){
          // if(target._vxClickNotJumpLog){
            let forKey = ''
            forKeyArr && forKeyArr.map((keyItem) => {
              forKey += `+'_'+${keyItem}`
            })

            if(forKey){
              specInfo.mixLogIdx = `'${++mixLogIndex}'${forKey}`
              specInfo.mixLogIdxStatic = false
            }else{
              specInfo.mixLogIdx = `${++mixLogIndex}`
              specInfo.mixLogIdxStatic = true
            }
          // }
        }

        let astAttrRes = generateAstAttr(target, template, isRoot, specInfo)
        template = astAttrRes.template
        let insertMap = astAttrRes.insertMap

        // 处理控制语句
        confAndCompRecord = handleConf(target, confAndCompRecord, false)

        // v-text处理逻辑 
        if (isUnaryTag(target.tag)) {
          if (insertMap.value !== null) {
            baseWarn(`${target.tag} 不支持 ${insertMap.attr}, 转化时已被去除`, target.originLine)
          }
          template += ` />`
        } else {
          if(insertMap.type === 'html'){
            // v-html
            template += ` type="node" nodes="{{${insertMap.value}}}">`
            stack.push({
              tag: 'rich-text'
            })
          }else{
            template += `>`
            if (insertMap.value !== null) {
              template += `{{${insertMap.value}}}`
            }
            stack.push({
              tag: target.tag
            })
          }
        }
        break;
      }

      case 2: {
        checkConfigUse(target.text, target.originLine)
        if( target.text && target.text.indexOf('|')!==-1 && target.text[target.text.indexOf('|')+1] !== '|'){ //排除`||`的语句
          // 处理filter
          let resText = target.text.split('|')[0] + ' }}'
          template += resText;          
          baseWarn(`小程序不支持filter，${target.text}已被转为${resText}`, target.originLine)
        }else{
          template += target.text;
        }
        break;
      }

      case 3: {
        if(target.isComment){
          template += `<!-- ${target.text} -->`;
        }else{
          template += target.text;
        }
        break;
      }
    }
    return true
  }

  /**
   * 处理wx comment block 的单个ast结构成模板
   * @param {*vue ast} target 
   * @return {*boolen} 转化的tag是否合法 
   */
  function joinOriginTpl(target){
    switch (target.type) {
      case 1: {
        // 处理tag
        // 插入换行符、空格、标签
        template += `<${target.tag}`;

        // 处理attr
        let attrs = target.attrsMap;
        attrs && Object.keys(attrs).map((key) => {
          let value = attrs[key]
          template += ` ${key}="${value}"`
        })

        // handle class and style
        // template += handleClassAndStyle(target)

        if (isUnaryTag(target.tag)) {
          template += ` />`
        } else {
          template += `>`
          stack.push({
            tag: target.tag
          })
        }
        break;
      }

      case 2:
        template += target.text;
        break;
      case 3:
        if(target.isComment){
          template += `<!-- ${target.text} -->`;
        }else{
          template += target.text;
        }
        break;
    }
    return true
  }

  /**
   * 处理template 的单个ast结构成模板
   * @param {*vue ast} target 
   * @return {*boolen} 转化的tag是否合法 
   */
  function joinComponentTpl(ast, isRoot){

    // 给root的ast加__vx_class和__vx_style，以支持组件上传递的样式
    
    
    // 时间戳+index防止重复
    let resTag = TEMPLATE_NAME_MAP[ast.tag] || ast.tag
    let compWithIs = false
    // 对<component v-bind:is="currentView">的特殊处理
    if(ast.tag === VUE_COMPONENT_IS_TAG && (ast.attrsMap['v-bind:is'] || ast.attrsMap[':is'])){
      compWithIs = true
      resTag = ast.attrsMap['v-bind:is'] || ast.attrsMap[':is']
    }
    let compKey = `${Date.now()}${compIndex}`
    compIndex++

    // v-for外部加block处理, v-for的外部再加block if判断
    if(ast.for){
      if(ast.iterator1){
        ast.forKey = ast.iterator1
      }else{
        ast.forKey = `${FOR_KEY}${forKeyIndex}`
        forKeyIndex++
      }
      forKeyArr = recordForKey(forKeyArr, ast.forKey)
      let vForRes = vForMap(ast)
      template += `<block wx:if="{{${ast.for}}}">`
      if(ast.tag !== 'template'){
        template += `<block ${vForRes} >`
      }
    }

    let forKey = ''
    forKeyArr && forKeyArr.map((keyItem) => {
      forKey += `+'_'+${keyItem}`
    })
    // <template is="demo-component" data="{{ $parent:$parent['$'+label],...$parent['$'+label]['$demo-component_154651572719716'+'_'+index+'_'+__key_6]}}
    if(compWithIs){
      template += `<${COMPONENT_TAG} is="{{${resTag}}}" data="{{ $parent:$parent['$'+label],...$parent['$'+label]['$'+${resTag}+'_${compKey}'${forKey?forKey: ''}]}}"`
    }else{
      template += `<${COMPONENT_TAG} is="${resTag}" data="{{ $parent:$parent['$'+label],...$parent['$'+label]['$${resTag}_${compKey}'${forKey?forKey: ''}]}}"`
    }

    let props = '' //记录组件的props
    let event = '' //记录组件上父元素的事件

    let attrRes = generateCompAstAttr(ast, template, isRoot, props, event)
    template = attrRes.template
    props = attrRes.props
    event = attrRes.event

    // 处理控制语句
    let compInfo = {
      compName: compWithIs? resTag: `'${resTag}'`,
      compProps: props,
      compEvent: event,
      compKey: compKey
    }
    confAndCompRecord = handleConf(ast, confAndCompRecord, compInfo)
    
    template += `>`

    stack.push({
      tag: COMPONENT_TAG
    })

    return true
  }

  /**
   * 拼接结束标签
   * @param {*vue ast} item 
   * @param {*booleb} isComp: 是否是合法组件
   * 依赖外部：stack
   * 改变外部：template、stack
   */
  function parseEndTag(item, isComp) {
    let tagName = item.tag
    var pos, mapTag;
    if(isInComment){
      // comment 里的都属于小程序的内容，不转化
      mapTag = tagName
    }else if(isNeedComponent  && !isReservedTag(item.tag)){
      // 自定义组件的tag不转化
      mapTag = COMPONENT_TAG
    }else{
      mapTag = TAG_MAP[tagName] || COMPONENT_MAP[tagName] && COMPONENT_MAP[tagName].tag 
      if(item.attrsMap["v-html"]){
        mapTag = 'rich-text'
      }     
    }

    if(!mapTag){
      baseWarn(`目前不支持${tagName}标签`, item.originLine)
      return
    }
    // Find the closest opened tag of the same type
    if (tagName) {
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].tag === tagName || mapTag === COMPONENT_TAG || item.attrsMap["v-html"]) {
          template += `</${mapTag}>`
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0;
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (var i = stack.length - 1; i >= pos; i--) {
        if ((i > pos || !tagName) && baseError) {
          baseError(" <" + (stack[i].tag) + "> 标签未闭合.", item.originLine);
        }
      }
      // Remove the open elements from the stack
      stack.length = pos;
    }
    
    // v-for外加 block包裹的特殊处理
    if(item.attrsMap['v-for']){
      // 组件外需要再包裹一层block处理wx:for
      if(isComp){
        template += `</block>`
      }
      if(item.tag !== 'template'){
        template += `</block>`
      }
    }
  } 

  /**
   * 生成template
   * @param {*ast} item 
   * @param {*boolen} isComp : 是否为组件
   * @return {*boolen} isValidTag: 是否是合法的tag
   * 依赖外部：tagQuiId、isInComment
   * 改变外部：isInComment
   */
  function generateElement(item, isComp, isRoot){
    if(item.type === 1){
      item.tagId = tagQuiId
      tagQuiId++
    }
    isInComment = isWXComment(isInComment,item)
    let isValidTag
    if(isInComment){
      isValidTag = joinOriginTpl(item)
    }else{
      if(isComp){
        // 组件元素
        isValidTag = joinComponentTpl(item, isRoot)
      }else{
        // 非组件元素
        isValidTag = joinTransTpl(item, isRoot)
      }
    }
    return isValidTag
  }

  /**
   * 处理ast
   * @param {*ast} item 
   * 依赖外部：
   * 改变外部： outSubCompJs、confAndCompRecord
   */
  function processItem(item, isRoot){
    if(item.tag === 'a'){
      item = replaceAAst(item)
    }
    if( item.attrsMap && item.attrsMap[MIX_LOG_FLAG]){
      item = getMixLogParams(item)
    }
    let isComp = isNeedComponent && item.type === 1 && !isReservedTag(item.tag)
    let isValidTag = generateElement(item, isComp, isRoot)
    if(!isValidTag){
      return;
    }
    let children = item.children
    if (children && children.length) {
      mapChildren(children)
    }
    if (item.type === 1) {
      parseEndTag(item, isComp)
      // 处理forKey数组的记录
      if(item.for){
        forKeyArr.pop()
      }
      // 处理栈内记录的条件语句和组件信息，生成js语句
      let joinJsRes = joinJs(confAndCompRecord, item.tagId, handledIfTag)
      outSubCompJs += joinJsRes.js
      confAndCompRecord = joinJsRes.confAndCompRecord
      handledIfTag = joinJsRes.handledIfTag
        // if的特殊处理，else-if和else信息都放到了ifConditions里了
      if(item.ifConditions && item.ifConditions.length > 0){
        for (let i=1; i<item.ifConditions.length; i++){
          let block = item.ifConditions[i].block
          if(block){
            block.addIfExp = [item.if]
            block.addIfTagId = item.tagId
            for(let j=1; j<i; j++){
              let preBlock = item.ifConditions[j].block
              preBlock.elseif && block.addIfExp.push(item.ifConditions[j].exp)
            }
            processItem(block)
          }
        }
      }
    }
  }

  /**
   * 遍历子元素
   * @param {*vue ast} target 
   */
  function mapChildren(target) {
    target && target.map((item) => {
      processItem(item)
    })
  }

  processItem(ast, true)

  if(isInComment){
    baseError('xcx-start注释区未闭合，请在合适位置添加xcx-end')
  }

  if(isNeedComponent){
    const outputJs = `
    const _renderFunc = function(renderComponent){\n${outSubCompJs}}
    `  
    let resWxml = formatHtml(template)
    // // 给js-beautify库打补丁
    // resWxml = resWxml.replace(quotEscapeReg,'\\"')
    return {
      wxml: resWxml,
      js: outputJs
    }
  }else{
    return template
  }
  
}

module.exports = {
  compileAST: compileAST
}
