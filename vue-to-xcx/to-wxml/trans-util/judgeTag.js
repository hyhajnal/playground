import {
  VX_TAG,
  BLACKLISTATRR
} from '../vueMapWXML.js';
/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
function makeMap(
  str
  , expectsLowerCase
) {
  var map = Object.create(null);
  var list = str.split(',');
  for (var i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return expectsLowerCase ?

    function(val) { return map[val.toLowerCase()]; } :
    function(val) { return map[val]; }
}

// Elements single use
export const isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
  'link,meta,param,source,track,wbr'
);

var isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,' +
  'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
  'div,dd,dl,dt,figcaption,figure,hr,img,li,main,ol,p,pre,ul,' +
  'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
  's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
  'embed,object,param,source,canvas,script,noscript,del,ins,' +
  'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
  'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
  'output,progress,select,textarea,' +
  'details,dialog,menu,menuitem,summary,' +
  'content,element,shadow,template'
);

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
var isSVG = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
  'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
  'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true
);

// vx组件，以小程序api为准实现的一套vue组件
var isWXcomp = makeMap(
  VX_TAG.join(','),
  false
);

// 判断是否为标准html中注册的标签。
export function isReservedTag(tag) {
  return isHTMLTag(tag) || isSVG(tag) || isWXcomp(tag)
}

 // 判断是否是无用的h5属性
export function isNoUseAtrr(attr, tag){
  let specTag = Object.keys(BLACKLISTATRR)
  // 标签上的小程序黑名单属性
  if(specTag.indexOf(tag)!==-1){
    return BLACKLISTATRR[tag].indexOf(attr)!==-1
  }else{
    return false
  }
}

