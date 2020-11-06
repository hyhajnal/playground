import deepcopy from 'deepcopy'
import {
  baseWarn
  , baseError
  , splitObj
  , camelize
} from './tool.js'

import {
  MIX_LOG_FLAG,
  LOG_FLAG
} from '../vueMapWXML.js'


// const ACM_FLAG = 'acm'
const EXPOSURE_LOG_FLAG_CLASS = 'log-item'
// const CLICK_LOG_FLAG_CLASS = 'acm-item' 

export function handleVlog(ast, res){
  if(ast.attrsMap['v-log'] || ast._vxClickNotJumpLog){
    if(res){
      res += ` ${EXPOSURE_LOG_FLAG_CLASS}`
    }else{
      res += ` class="${EXPOSURE_LOG_FLAG_CLASS}`
    }
  }
  // if(ast.attrsMap[`${ACM_FLAG}`] || ast.attrsMap[`:${ACM_FLAG}`] || ast.attrsMap[`v-bind:${ACM_FLAG}`]){
  //   if(res){
  //     res += ` ${CLICK_LOG_FLAG_CLASS}`
  //   }else{
  //     res += ` class="${CLICK_LOG_FLAG_CLASS}`
  //   }
  // }
  return res
}

//检查是否在非组件的小程序模板里直接使用了config变量 
export function checkConfigUse(code, line){
  const ILEGAL = /config(\.|\[)/
  const errMsg = '小程序模板中不能直接获取到this.config中的内容，请将需要的数据透出到data上'
  if(ILEGAL.test(code)){
    baseError(errMsg, line)
    return false
  }else{
    return true
  }
}

// v-log="{'cube-acm-node':true, 'data-log-content': item.acm, 'data-log-iid': item.item_id}"
// data-cube-acm-node="{{true}}" data-data-log-content="{{item.acm}}" data-data-log-iid="{{item.item_id}}"
export function handleLog(logContent, idx, isStatic){
  let res = ''
  logContent = logContent.replace(/\{|\}/g,'')
  let logItem = logContent.split(',')
  for (let index in logItem){
    let item = logItem[index]
    item = item.trim()
    if(item){
      let itemRes = splitObj(item)
      let key = itemRes.key.trim()
      key = key.startsWith('data-')?key: `data-${key}`
      res += ` ${key.replace(/'/g,'')}="{{${itemRes.value.trim()}}}"`
    }
  }
  if(isStatic){
    res += ` data-log-index="${idx}"`
  }else{
    res += ` data-log-index="{{${idx}}}"` 
  }
  return res
}

/** 
 * v-logclick的处理
 * 跳转打点： <a v-logclick=" {'cube-jump': true, 'data-log-content': item.acm, 'data-pit-index': item.index, 'data-params': 'a='+a+'&b='+b }"></a>
 * => <view bindtap="{{$scope}}.$vx_navigate" data-cube-acm="{{item.acm}}" data-pit-index="{{item.index}}" data-params="{{'a='+a+'&b='+b}}"></view>
 * 
 * 不跳转打点：<div v-logclick="{'cube-jump': false}" @click="handleClick" :class="mc2"></div>
 * => <view bindtap="vx_clickLogHandle" data-logclick="true" data-vx-scope="{{$scope}}"  data-click-event="handleClick" class="{{mc2}} log-item"></view>
 * 
 * <div v-logclick="true" class="mc-str"></div>
 * => <view bindtap="vx_clickLogHandle" data-logclick="true" data-vx-scope="{{$scope}}"  class="mc-str log-item"></view>
 * */ 
export function handleMixLog(ast, idx, isStatic){
  let res = ''
  const clickLogMap = {
    'data-log-content': 'data-cube-acm'
  }
  let hasVLog = ast.attrsMap[LOG_FLAG]? true: false

  if(!hasVLog){
    const logParamsArr = ast._vxMixLogArr
    logParamsArr.forEach((itemRes)=>{
      let key = itemRes.key && itemRes.key.trim()
      key = key.startsWith('data-')? key: `data-${key}`
      let xcxKey = clickLogMap[key] || key
      res += ` ${xcxKey.replace(/'/g,'')}="{{${itemRes.value.trim()}}}"`
    })
    if(isStatic){
      res += ` data-log-index="${idx}"`
    }else{
      res += ` data-log-index="{{${idx}}}"` 
    }
  }
  // 事件需要的打点规则
  res += `data-logclick="true" data-vx-scope="{{$scope}}"`
  return res
}

export function getMixLogParams(ast){
  if(ast.handledLog){
    return ast
  }
  let isClickJump = true
  let logContent = ast.attrsMap[MIX_LOG_FLAG].trim()
  let mixLogParams = []
  let cubeJumpVal
  if(logContent.startsWith('{')){
    logContent = logContent.slice(1, logContent.length-1)
    let logItem = logContent.split(',')
    for (let index in logItem){
      let item = logItem[index]
      item = item.trim()
      if(item){
        let itemRes = splitObj(item)
        if(itemRes.key === 'cube-jump'){
          
          if(itemRes.value === 'true' || itemRes.value === 'false'){
            isClickJump = itemRes.value === 'false'? false: true
          }else{
            cubeJumpVal = itemRes.value
          }
        }else{
          mixLogParams.push(itemRes)
        }
      }
    }
  }else if(logContent === 'true'){
    isClickJump = false
  }
  ast._vxClickNotJumpLog = !isClickJump
  ast._vxMixLogArr = mixLogParams

  if(!cubeJumpVal){
    ast.handledLog = true
    return ast
  }

  let ifState = cubeJumpVal
  // cube-jump: true - a标签跳转, false - 不点击跳转打点处理

  let extendAst = {
    tag: 'template'
    , type: 1
    , ifProcessed: true
    , ifConditions: []
    , if: ifState
    , children: []
    , attrsMap: {
      "v-if": ifState
    }
    , parent: Object.assign({}, ast.parent)
  }

  ast.parent = null

  let jumpAst = deepcopy(ast)//新版的映射到navigator的a
  jumpAst.handledLog = true
  jumpAst._vxClickNotJumpLog = false
  // notJumpAst.attrsMap[MIX_LOG_FLAG] = logContent
  // jumpAst.tag = "mvw-navigator"
  
  // for(let key in jumpAst.attrsMap){
  //   if(key.endsWith('data-ptp-customc')){
  //     let newKey = key.replace('data-ptp-customc', 'data-ptp-c')
  //     jumpAst.attrsMap[newKey] = jumpAst.attrsMap[key]
  //     delete jumpAst.attrsMap[key]
  //   }
  // }

  extendAst.children.push(jumpAst)

  let notJumpAst = Object.assign({}, ast, {
    parent: extendAst,
    handledLog: true,
    _vxClickNotJumpLog: true
  })
 
  let ifAst = {
    block: extendAst,
    exp: ifState
  }
  let elseAst = {
    block: {
      attrsMap: {
        "v-else":""
      },
      children: [notJumpAst],
      else: true,
      parent: undefined,
      tag: "template",
      type: 1
    },
    exp: undefined
  }
  extendAst.ifConditions = [ifAst, elseAst]

  return extendAst
}

export function isWXComment(isInComment,ast){
  if(isInComment){
    // 在comment阶段: 遇到xcx-end则结束comment阶段，否则一直存在comment阶段
    return !(ast.isComment && ast.text.trim() === 'xcx-end')
  }else{
    // 不在comment阶段
    return ast.isComment && ast.text.trim() === 'xcx-begin'    
  }
}

/**
 * 
 * @param {*} template 
 * @param {*} ast 
 * <mvw-navigator class="signIn signIn-un cube-acm-node" style="{{unSignInBoxStyle}}"
    data-cube-acm-node="{{true}}" data-data-log-content="{{'test-log-content'}}" data-data-log-iid="{{'test-log-iid'}}"

    can-mini-navigate="{{canMiniNavigate}}"
    app-id="{{unSignInAppId}}" xcx-href="{{unSignInXcxHref}}" fallback="{{configData.unSignInContent[0].link}}"     
    parent-scope = "{{$scope}}"
    log-data="{{'{\"acm\": \"acmtest\", \"pitIndex\": 1}'}}"

    bindclickevent="{{$scope}}.clickFn"
  >
  </mvw-navigator>
 */
export function handleATag(template,ast){
  // a标签的特殊处理
  if(ast.tag === 'a' && !ast.attrsMap['bindtap'] && !ast.attrsMap['v-on:click'] && !ast.attrsMap['@click']){
    // 小程序间互调
    if(ast.attrsMap['appId'] || ast.attrsMap[':appId'] || ast.attrsMap['v-bind:appId']){
      template += ` bindtap="{{$scope}}.$vx_launch"`
    }else if(ast.attrsMap['open-type'] === 'redirect'){
      template += ` bindtap="{{$scope}}.$vx_redirect"`
    }else{
      template += ` bindtap="{{$scope}}.$vx_navigate"` 
    }
  }else if(ast.tag === 'mvw-a'){
    if(ast.attrsMap['open-type']){
      template += ` bindtap="{{$scope}}.$vx_${ast.attrsMap['open-type']}"`
    }else{
      template += ` bindtap="{{$scope}}.$vx_navigate"` 
    }
  }
  if(!(ast.attrsMap['xcx-href'] || ast.attrsMap[':xcx-href'] || ast.attrsMap['v-bind:xcx-href'])){
    baseWarn(`${ast.tag}未使用xcx-href指定跳转链接，将会导致小程序里链接无效`,ast.originLine)
  } 
 
  return template
}

/**
 * <mvw-navigator class="signIn signIn-un cube-acm-node" style="{{unSignInBoxStyle}}"
      data-cube-acm-node="{{true}}" data-data-log-content="{{'test-log-content'}}" data-data-log-iid="{{'test-log-iid'}}"

      can-mini-navigate="{{canMiniNavigate}}"
      app-id="{{unSignInAppId}}" xcx-href="{{unSignInXcxHref}}" fallback="{{configData.unSignInContent[0].link}}"     
      parent-scope = "{{$scope}}"
      log-data='{ "acm": "{{unSignInAppId}}", "ptpc": "ptpc-test"}'

      bindclickevent="{{$scope}}.clickFn"
    >
    </mvw-navigator>
 */

export function handleMvwNavigatorTag(template,ast){
  // mvw-navigator标签的特殊处理
  template += ` can-mini-navigate="{{canMiniNavigate}}" parent-scope = "{{$scope}}" bindvxsetpath = "{{$scope}}.vx_triggerExtraEvent"`
  const attrsMap = ast.attrsMap
  let logDataStr = ''
  let needAddKey = ['acm', 'data-']
  for(let key in attrsMap){
    let trueKey 
    if(key.endsWith('acm')){
      trueKey = 'cubeAcm'
    }else{
      trueKey = key
    }
    needAddKey.forEach((attr)=>{

      if(key.startsWith(attr)){
        if(attr === 'data-'){
          trueKey = key.replace('data-','')
        }
        trueKey = camelize(trueKey)
        logDataStr +=  `"${trueKey}":"${attrsMap[key]}",`
        // delete attrsMap[key] 很难确定哪些参数曝光要用，索性牺牲体积不删属性
      }else if(key.startsWith(':'+attr)){
        if(attr === 'data-'){
          trueKey = key.replace(':data-','')
        }
        trueKey = camelize(trueKey)
        logDataStr += `"${trueKey}":"{{${attrsMap[key]}}}",` 
        // delete attrsMap[key]
      }else if(key.startsWith('v-bind:'+attr)){
        let trueKey
        if(attr === 'data-'){
          trueKey = key.replace('v-bind:data-','')
        }
        trueKey = camelize(trueKey)
        logDataStr += `"${trueKey}":"{{${attrsMap[key]}}}",` 
        // delete attrsMap[key]
      }
    })
    if(key.endsWith('acm')){
      delete attrsMap[key]
    }
  }
  if(logDataStr && logDataStr.endsWith(',')){
    logDataStr = logDataStr.slice(0, logDataStr.length-1)
  }
  if(logDataStr){
    template += " log-data='{"+logDataStr+"}'"
  }
  return {
    template,
    ast
  }
}

// 打点ast结构替换 
/**
 * <div type="submitlog" class="from_submit_wrap" @click="formSubmitHandler" data-context="加入购物车">加入购物车</div>
  替换成
  <form class="from_submit_wrap" @submit="formSubmitHandler" report-submit="true">
    <button form-type="submit">加入购物车</button>
  </form>
 */
export function replaceLogAst(ast){
  let logChild = {
    tag: 'button'
    , type: 1
    , attrsMap: {
      "form-type": "submit"
    }
  }
  ast.tag = "form"
  if(ast.attrsMap['@click'] || ast.attrsMap['v-on:click']){
    ast.attrsMap['@submit'] = ast.attrsMap['@click'] || ast.attrsMap['v-on:click']
    delete ast.attrsMap['@click']
    delete ast.attrsMap['v-on:click']
  }else{
    ast.attrsMap['@submit'] = '$vx_formSubmitHandler'
  }

  if(ast.attrsMap['data-context']){
    logChild.children = [{
      type: 3,
      text: ast.attrsMap['data-context']
    }]
    delete ast.attrsMap['data-context']
  }else if(ast.attrsMap[':data-context'] || ast.attrsMap['v-bind:data-context']){
    logChild.children = [{
      type: 2,
      text: '{{' + (ast.attrsMap[':data-context'] || ast.attrsMap['v-bind:data-context']) + '}}'
    }]
    delete ast.attrsMap[':data-context']
    delete ast.attrsMap['v-bind:data-context']
  }
  ast.attrsMap['report-submit'] = "true"
  delete ast.attrsMap['type']

  // 添加openType到子button上
  if(ast.attrsMap['v-opentype']){
    logChild.attrsMap['v-opentype'] = ast.attrsMap['v-opentype']
    delete ast.attrsMap['v-opentype']
  }

  if(ast.attrsMap['data-button-data']){
    logChild.attrsMap['data-button-data'] = ast.attrsMap['data-button-data']
  }
  if(ast.attrsMap[':data-button-data']){
    logChild.attrsMap[':data-button-data'] = ast.attrsMap[':data-button-data']
  }

  for(let attr in ast.attrsMap){
    if(attr.endsWith('data-vx-form-id')){
      logChild.attrsMap[attr] = ast.attrsMap[attr]
      delete ast.attrsMap[attr]
    }
  }

  let newChild = []
  ast.children.forEach((child)=>{
    if(child.type === 1){
      newChild.push(child)
    }
  })
  newChild.push(logChild)
  ast.children = newChild
  return ast
}

/**
 * 实现a标签的转化
 * @param {*} ast 
 * <a :href="goods.item_h5_url" :xcx-href="goods.item_xcx_url" appId="wxca3957e5474b3dnede" fallback="/page/fallback">跳转去女装</a>
 ->
  <template v-if="canMiniNavigate && appId">
    <mvw-navigator class="signIn signIn-un cube-acm-node" style="{{unSignInBoxStyle}}"
      data-cube-acm-node="{{true}}" data-data-log-content="{{'test-log-content'}}" data-data-log-iid="{{'test-log-iid'}}"

      can-mini-navigate="{{canMiniNavigate}}"
      app-id="{{unSignInAppId}}" xcx-href="{{unSignInXcxHref}}" fallback="{{configData.unSignInContent[0].link}}"     
      parent-scope = "{{$scope}}"
      log-data="{{'{\"acm\": \"acmtest\", \"pitIndex\": 1}'}}"

      bindclickevent="{{$scope}}.clickFn"
    >
    </mvw-navigator>
  </template>
  <template v-else>
    <a :href="goods.item_h5_url" :xcx-href="goods.item_xcx_url" appId="wxca3957e5474b3dnede" fallback="/page/fallback">跳转去女装</a>
  </template>

  /**
 * 
 * @param {*} template 
 * @param {*} ast 
 * 
 */

export function replaceAAst(ast){
  
  let staticAppId = ast.attrsMap['appId']
  let dynAppId = ast.attrsMap[':appId'] || ast.attrsMap['v-bind:appId']
  let cusClick = ast.events && ast.events.click
  let hasIfElse = ast.if || ast.elseif || ast.else

  // 被处理过 || 不是小程序互跳 || 拥有自定义click事件（事件里含有跳转逻辑，使用navigator可能会出现2次跳转）|| 本身就含有if || else的逻辑，处理起来要考虑兄弟节点的ifConditions，过于麻烦
  if(ast.handledA || (!staticAppId && !dynAppId) || cusClick || hasIfElse){
    return ast
  }

  let ifState 
  if(ast.for){
    ifState = 'canMiniNavigate'
  }else{
    ifState = staticAppId? `canMiniNavigate && '${staticAppId}'` : `canMiniNavigate && ${dynAppId}`
  }

  let extendAst = {
    tag: 'template'
    , type: 1
    , ifProcessed: true
    , ifConditions: []
    , if: ifState
    , children: []
    , attrsMap: {
      "v-if": ifState
    }
    , parent: Object.assign({}, ast.parent)
  }

  ast.parent = null

  let toNavigatorAst =  deepcopy(ast)//新版的映射到navigator的a
  toNavigatorAst.tag = "mvw-navigator"
  
  for(let key in toNavigatorAst.attrsMap){
    if(key.endsWith('data-ptp-customc')){
      let newKey = key.replace('data-ptp-customc', 'data-ptp-c')
      toNavigatorAst.attrsMap[newKey] = toNavigatorAst.attrsMap[key]
      delete toNavigatorAst.attrsMap[key]
    }
  }

  extendAst.children.push(toNavigatorAst)

  let toViewAst = Object.assign({}, ast, {
    parent: extendAst,
    handledA: true
  }) //老版的映射到view的a
 
  let ifAst = {
    block: extendAst,
    exp: ifState
  }
  let elseAst = {
    block: {
      attrsMap: {
        "v-else":""
      },
      children: [toViewAst],
      else: true,
      parent: undefined,
      tag: "template",
      type: 1
    },
    exp: undefined
  }
  extendAst.ifConditions = [ifAst, elseAst]

  return extendAst
}