export function joinJs(confAndCompRecord, tagId, handledIfTag){
  let js = ''
  let pos = null
  let isDeeplyRecordComp = confAndCompRecord && confAndCompRecord[confAndCompRecord.length-1] && confAndCompRecord[confAndCompRecord.length-1].compName

  // 获得for中key的拼接
  function getForKey(){
    let forKey = ''
    confAndCompRecord && confAndCompRecord.map((item)=>{
      if(item.forKey){
        forKey += `+ '_' + ${item.forKey}`
      }
    })
    return forKey
  }

  function pushHandledIfTag(ifTag,exp){
    let handledIfTagId = handledIfTag.map((tag)=>{
      return tag.tagId
    })
    let useId = handledIfTagId.indexOf(ifTag)
    if(useId !== -1){
      handledIfTag[useId].exp.push(exp)
    }else{
      handledIfTag.push({
        tagId: ifTag
        , exp: [exp]
      })
    }
  }

  // 给只有elseif 或者 else逻辑的组件补全if语句
  function addIf(item){
    let ifStr = ''
    let relaIf = item.ifTagId
    let expArr = item.ifExp

    let checkExpUsed = function(ifTag, exp){
      let used = false
      let handledIfTagId = handledIfTag.map((tag)=>{
        return tag.tagId
      })
      let useId = handledIfTagId.indexOf(ifTag)
      if(useId !==-1 && handledIfTag[useId].exp.indexOf(exp) !== -1){
        used = true
      }
      return used
    }
    
    expArr && expArr.map((exp,index)=>{
      if(!checkExpUsed(relaIf, exp)){
        if(index === 0){
          ifStr += `if(${exp}){}`
        }else{
          ifStr += `else if(${exp}){}`
        }
        pushHandledIfTag(relaIf, exp)
      }
    })
    return ifStr
  }

  // 遇到组件才拼接有控制语句的js
  isDeeplyRecordComp && confAndCompRecord.map((item)=>{
    // 优先级：if>for>组件
    if(!item.process){
      item.closeNum = 0      
    }
    if(item.if && !item.process){
      js += `if(${item.if}){\n`
      item.closeNum++
      pushHandledIfTag(item.id, item.if)
    }
    if(item.elseif && !item.process){
      js += addIf(item)
      js += `else if(${item.elseif}){\n`
      item.closeNum++ 
      pushHandledIfTag(item.ifTagId, item.elseif) 
    }
    if(item.else && !item.process){
      js += addIf(item)
      js += `else{\n`
      item.closeNum++     
    }
    if(item.for && !item.process){

      js += `let __cubeFor = ${item.for}
      if(typeof ${item.for} === 'object' && Object.prototype.toString.call(${item.for})=='[object Array]'){
        __cubeFor = ${item.for}.concat()
      }else if(typeof ${item.for} === 'object' && Object.prototype.toString.call(${item.for})=='[object Object]'){
        __cubeFor = Object.assign({}, ${item.for})
      }
      for(let ${item.forKey} in __cubeFor){
        let ${item.alias} = ${item.for}[${item.forKey}]
      `
      // if(item.iterator1){
      //   js += `let ${item.iterator1} = ${item.forKey}\n`
      // }

      item.closeNum++      
    }
    if(item.compName && !item.process){  
      let props = '{' + (item.compProps && item.compProps.slice(0, -1) || '') + '}'
      let event = '{' + (item.compEvent && item.compEvent.slice(0, -1) || '') + '}'
      let forKey = getForKey()
      js += `  renderComponent(${item.compName}, ${props}, ${event}, '${item.compKey}'${forKey? forKey: ''} ) \n`
    }
    item.process = true
  })
  // 补全 '}'
  for (pos = confAndCompRecord.length-1 ; pos>=0; pos-- ){
    let record = confAndCompRecord[pos]
    if(record.id === tagId){
      if(record.process && record.closeNum){
        for(let i=0; i<record.closeNum; i++){
          js += '}\n'  
        }
      }
      break;
    }
  }
  // // 不是组件时，临时保存要丢弃的最外层的if或者else if 供else用
  // if(!isDeeplyRecordComp){

  // }
  // 最里面一层都不是组件时，需要丢弃保存的条件语句
  if ( pos!==null && pos >= 0 ) {
    // 出栈已处理的数据
    confAndCompRecord.length = pos
  }
  return {
    js: js,
    confAndCompRecord: confAndCompRecord,
    handledIfTag: handledIfTag
  }
}

export function recordConfAndComp(id, confAndCompRecord, confInfo, compInfo){
  let newRecord = {}
  if(confInfo){
    newRecord = Object.assign(newRecord, confInfo)
  }
  if(compInfo){
    newRecord = Object.assign(newRecord, compInfo)    
  }
  if(Object.keys(newRecord).length){
    newRecord.id = id
    confAndCompRecord.push(newRecord)
  }
  return confAndCompRecord
}

export function handleConf(ast, confAndCompRecord, compInfo){
  let confInfo = {}
  if(ast.if){
    confInfo = Object.assign(confInfo, {'if': ast.if})
  }
  if(ast.elseif){
    confInfo = Object.assign(confInfo, {
      'elseif': ast.elseif
      , ifTagId: ast.addIfTagId
      , ifExp: ast.addIfExp
    })
  }
  if(ast.else){
    confInfo = Object.assign(confInfo, {
      'else': ast.else
      , ifTagId: ast.addIfTagId
      , ifExp: ast.addIfExp
    })    
  }
  if(ast.attrsMap['v-show']){
    confInfo = Object.assign(confInfo, {'if': ast.attrsMap['v-show']})    
  }
  if(ast.for && ast.alias){
    confInfo = Object.assign(confInfo, {'if': ast.for})
    confInfo = Object.assign(confInfo, {
      'for':ast.for,
      'alias': ast.alias,
      'forKey': ast.forKey
    }) 
    if(ast.iterator1){
      confInfo.iterator1 = ast.iterator1
    }       
  }
  
  confAndCompRecord = recordConfAndComp(ast.tagId, confAndCompRecord, confInfo, compInfo)
  return confAndCompRecord
}