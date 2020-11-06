const chalk = require('chalk');

export function camelize(str) {
  return (str + "").replace(/[_|-]\S/g,function(match) {
    let char1 = match.charAt(1);
    if(isNaN(+char1)){
      return match.charAt(1).toUpperCase();
    }else{
      return match.charAt(1)
    }  
  })
}

export function kebabize(str){
  return (str + "").replace(/([A-Z])/g,function(match,p,offset) {
    if(offset === 0){
      return match.toLowerCase()
    }else{
      return '-'+match.toLowerCase()
    }
  })
}

let fileName = ''
export function initFileName(name){
  fileName = name
}
export function baseError(msg, line) {
  // if (process.env.NODE_ENV !== 'production') {
    if(line){
      console.log(chalk.red(`[Vue to WXML]: (line${line}) ${msg}。`) + (fileName? chalk.gray(`[file:${fileName}]`):'') );
      // console.log(chalk.red(`[Vue to WXML]: (line${line}) ${msg}。 ${fileName? '[file:' + fileName + ']' : ''} `));
    }else{
      console.log(chalk.red(`[Vue to WXML]: ${msg}。`) + (fileName? chalk.gray(`[file:${fileName}]`):'') );
    }
  // }
}

export function baseWarn(msg, line) {
  // if (process.env.NODE_ENV !== 'production') {
    if(line){
      console.log(chalk.yellow(`[Vue to WXML]: (line${line}) ${msg}。`) + (fileName? chalk.gray(`[file:${fileName}]`):'') );
    }else{
      console.log(chalk.yellow(`[Vue to WXML]: ${msg}。`) + (fileName? chalk.gray(`[file:${fileName}]`):'') );
    }
    
  // }
}

export function px2rpx (source) {
  if (!source) return ''
  return source.replace(/([0-9.]*)px/ig, (match, size) => {
      return `${size}rpx`
  })
}

/**
 * 
 * @param {*} source 
 * height: 7.5*(banner._img.scale) + 'rem' =>
 * height: 7.5*(banner._img.scale)*100 + 'rpx'
 * 
 * height: '3.2rem'
 * height: {{3.2*100+'rpx'}}
 */
const staticRemReg = /([0-9.]+)rem/ig
const dynamicRemReg = /(.*?)[ ]*\+[ ]*['"]rem([\W])/ig
export function rem2rpx (source) {
    if (!source) return ''
    return source.replace(staticRemReg, (match, size) => {
      let res = parseFloat((size * 100).toFixed(2))
      return `${res}rpx`
    }).replace(dynamicRemReg, (match, size, W) => {
      return `${size}*100 + 'rpx${W}`
    })
}

/**
 * 将 { name: guess, color: item.isActive ? selectedTxtColor : txtColor}
 * @param {*} item : 每条规则，如 'color: item.isActive ? selectedTxtColor : txtColor'
 * @param {*} isDynamic : 是否是动态数据，动态数据可能包含三元运算符
 * @returns {
 *    key: color
 *    value: item.isActive ? selectedTxtColor : txtColor
 * }
 */
export function splitObj(item, isDynamic = true){
  let keyValue = item.split(':')
  let key = keyValue[0].trim().replace(/'|"/g,'')
  let value= keyValue[1].trim()
  if(isDynamic && item.indexOf('?')!==-1){
    // 处理三元运算符(三元运算符的':'会被误处理): "color: item.isActive ? selectedTxtColor : txtColor"
    value = ''
    for(let j = 1; j < keyValue.length; j++){
      if(j === keyValue.length-1){
        value += keyValue[j]
      }else{
        value += keyValue[j]+':'
      }
    }
  }
  return {
    key,
    value
  }
}