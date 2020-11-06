const REPLACECONTENT = 'REPLACECONTENT'
const DEPRECATED = 'DEPRECATED'

/**
 * 不支持: 
 * slot,component,select,option
 * address,article,audio,map,track,video,sub,sup,s,samp,small,strong,time,u,var,wbr,area,hgroup,
 * embed,object,param,source,canvas,script,noscript,del,ins,figcaption,figure,hr,
 * datalist,output,progress,
 * b,abbr,bdi,bdo,cite,code,data,dfn,em,kbd,mark,q,rp,rt,rtc,ruby,
 * details,dialog,menu,menuitem,summary,caption,col,colgroup,
 * content,element,shadow,template,meter,optgroup
 */
const TAGOPTION = {
  view: 'aside,footer,header,h1,h2,h3,h4,h5,h6,nav,section,' +
    'div,dd,dl,dt,li,main,ol,p,ul,' +
    'i,' +
    'table,thead,tbody,td,th,tr,' +
    'fieldset,legend' 
  , block: 'template' // 区域块，v-for, v-if
  , button: 'button'
    // , checkbox: 'checkbox'
  , form: 'form'
  , label: 'label'
  , input: 'input'
    // , radio: 'radio'
  , textarea: 'textarea'
  , text: 'span'
  , image: 'img'
  // , template: 'component' // for :is
  , audio: 'audio'
  , video: 'video'
}

/**
 *  { div: view, body: view, ul: view, li: view,..., a: navigator, span: text, img: image}
 */
let TAG_MAP = {}
for (let key in TAGOPTION) {
  // [div, body, ul, li, a, span]
  let values = TAGOPTION[key].split(',')
  values.forEach(value => {
    TAG_MAP[value] = key
  })
}

/**
 *  1. v-html是无效转换，wxml不支持直接插入html
 */
const ATTR_MAP = {
  'v-text': REPLACECONTENT
  , 'v-html': REPLACECONTENT
  , 'v-show': 'wx:if'
  , 'v-if': 'wx:if'
  , 'v-else': 'wx:else'
  , 'v-else-if': 'wx:elif'
  , 'v-for': 'wx:for'
  , 'v-model': DEPRECATED
  , 'v-pre': DEPRECATED
  , 'v-cloak': DEPRECATED
  , 'v-once': DEPRECATED
  , 'ref': DEPRECATED
  , 'slot': DEPRECATED
  , 'v-animate': 'animation'  //动画
  , 'acm': 'data-cube-acm' //坑位打点
  , 'v-logclick': 'data-logclick' //打点需求：统计任何标志过的点击
}

const WARN_MSG = {
  'v-model': 'WXML不支持vue对应的v-model功能，转化时已被忽略'
  , 'v-pre': 'WXML不支持vue对应的v-pre功能，转化时已被忽略'
  , 'v-cloak': 'WXML不支持vue对应的v-cloak功能，转化时已被忽略'
  , 'v-once': 'WXML不支持vue对应的v-once功能，转化时已被忽略'
  , 'ref': 'WXML不支持vue对应的ref属性，转化时已被忽略'
  , 'slot': 'WXML不支持vue对应的slot属性，转化时已被忽略'
}

const WARN_TAG_MSG = {
  'slot': 'WXML不支持vue对应的slot标签，转化时已被替换成普通的view标签'
}

const EVENT_REG = {
  ON: /^v-on(\:(\S+?)(\.\S+)?)?$/  //  /^v-on:(\S+?)(\.\S+)?$/
  , SHORT: /^@(\S+?)(\.\S+)?$/
}

const EVENT_MAP = {
  'click': 'tap'
  , 'touchstart': 'touchstart'
  , 'touchmove': 'touchmove'
  , 'touchcancel': 'touchcancel'
  , 'touchend': 'touchend'
  , 'submit': 'submit'
  , 'reset': 'reset'
  , 'input': 'input'
  , 'focus': 'focus'
  , 'blur': 'blur'
  , 'scroll': 'scroll'
  // video || audio
  , 'error': 'error'
  , 'play': 'play'
  , 'pause': 'pause'
  , 'ended': 'ended'
  , 'timeupdate': 'timeupdate'
  , 'animationstart': 'animationstart'
  , 'animationiteration': 'animationiteration'
  , 'animationend': 'animationend'
  , 'transitionend': 'transitionend'
  , 'longpress': 'longpress'
  , 'longtap': 'longtap'
  , 'touchforcechange': 'touchforcechange'
}

// 'v-bind'有特殊处理
const DIRECTIVES = ['v-text', 'v-html', 'v-show', 'v-if', 'v-else', 'v-else-if', 'v-show', 'v-for', 'v-on', 'v-bind', 'v-model', 'v-pre', 'v-cloak', 'v-once', 'v-animate', 'v-opentype']

const SURPORT_COMPONENT_DIRECTIVES = ['v-if', 'v-else', 'v-else-if', 'v-show', 'v-for', 'v-on', 'v-bind']

const SPEC_ATTR = ['v-bind:class', 'v-bind:style', ':class', ':style', 'class', 'style']

const VBIND_REG = {
  BIND: /^v-bind(\:(\S+?)(\.\S+)?)?$/
  , SHORT: /^:(\S+?)(\.\S+)?$/
}

// 未做隐射的attr和event会被保存
const COMPONENT_MAP = {
  'a': {
    tag: 'view'
    , attr: {
      'xcx-href': 'data-href'
      , 'href': 'data-h5-href'
      , 'appId': 'data-app-id'
      , 'fallback': 'data-fallback'
      , 'data-ptp-customc': 'data-ptp-c'
    }
  }
  , 'mvw-navigator': {
    tag: 'mvw-navigator'
    , attr: {
      'appId': 'app-id',
      'data-ptp-customc': 'data-ptp-c'
    }
    // , event: {
    //   'click': 'bindclickevent'
    // }
  }
  , 'button': {
    tag: 'button'
    , attr: {
      'type': 'form-type',
      'v-opentype': 'open-type'
    }
  }
  , 'canvas': {
    tag: 'canvas'
    , attr: {
      'id': 'canvas-id'
    }
  }
  , 'mvw-view': {
    tag: 'view'
  }
  , 'MvwView': {
    tag: 'view'
  }
  , 'mvw-text': {
    tag: 'text'
  }
  , 'MvwText': {
    tag: 'text'
  }
  // , 'mvw-image':{ mvw-image组件被小程序框架内置
  //   tag: 'image',
  //   event: {
  //     'binderror': 'binderror',
  //     'bindload': 'bindload'
  //   }
  // }
  , 'mvw-scroll-view': {
    tag: 'scroll-view',
    event: {
      'bindscrolltoupper': 'bindscrolltoupper',
      'bindscrolltolower': 'bindscrolltolower',
      'bindscroll': 'bindscroll'
    }
  }
  , 'MvwScrollView': {
    tag: 'scroll-view',
    event: {
      'bindscrolltoupper': 'bindscrolltoupper',
      'bindscrolltolower': 'bindscrolltolower',
      'bindscroll': 'bindscroll'
    }
  }
  , 'mvw-swiper': {
    tag: 'swiper',
    event: {
      'bindchange': 'bindchange'
    }
  }
  , 'MvwSwiper': {
    tag: 'swiper',
    event: {
      'bindchange': 'bindchange'
    }
  }
  , 'mvw-swiper-item': {
    tag: 'swiper-item'
  }
  , 'MvwSwiperItem': {
    tag: 'swiper-item'
  }
  , 'mvw-a':{
    tag: 'view',
    attr:{
      'xcx-href': 'data-href'
    }
  }
  , 'MvwA':{
    tag: 'view',
    attr:{
      'xcx-href': 'data-href'
    }
  }
  , 'mvw-switch':{
    tag: 'switch',
    event: {
      'bind-change': 'bindchange'
    }
  }
}

// vue组件和小程序组件不同名: 存在vue组件多对一
const TEMPLATE_NAME_MAP = {
  'lazy-image':'mvw-image'
}

// 内置标签，非自定义组件
let VX_TAG = []
for(let tag in COMPONENT_MAP){
  VX_TAG.push(tag)
}

// 标签上不生效的属性
const BLACKLISTATRR = {
  'a': ['href', 'url', 'open-type', 'delta', 'hover-class', 'hover-start-time', 'hover-stay-time' ],
  'mvw-a': ['href', 'url', 'open-type', 'delta', 'hover-class', 'hover-start-time', 'hover-stay-time' ],
  'mvw-navigator': ['href']
}

const VX_DIRECTIVE = ['v-suffix']
const MIX_LOG_FLAG = 'v-logclick' //点击打点的标志
const LOG_FLAG = 'v-log'  //曝光和点击打点的标志

module.exports = {
  TAG_MAP: TAG_MAP
  , REPLACECONTENT: REPLACECONTENT
  , DEPRECATED: DEPRECATED
  , ATTR_MAP: ATTR_MAP
  , WARN_MSG: WARN_MSG
  , WARN_TAG_MSG: WARN_TAG_MSG
  , DIRECTIVES: DIRECTIVES
  , SURPORT_COMPONENT_DIRECTIVES: SURPORT_COMPONENT_DIRECTIVES
  , SPEC_ATTR: SPEC_ATTR
  , EVENT_REG: EVENT_REG
  , EVENT_MAP: EVENT_MAP
  , VBIND_REG: VBIND_REG
  , COMPONENT_MAP: COMPONENT_MAP
  , VX_TAG: VX_TAG
  , BLACKLISTATRR: BLACKLISTATRR
  , TEMPLATE_NAME_MAP: TEMPLATE_NAME_MAP
  , VX_DIRECTIVE: VX_DIRECTIVE
  , MIX_LOG_FLAG: MIX_LOG_FLAG
  , LOG_FLAG: LOG_FLAG
}
