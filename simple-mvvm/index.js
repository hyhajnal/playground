class MVVM {
  // 在构造函数中进行一些数据的初始化，同时将computed和methods代理到this上。
  constructor(options) {
    this.$vm = this;
    this.$el = options.el;
    this.$data = options.data;
    let computed = options.computed;
    let methods = options.methods;
    if (this.$el) {
      //  将数据可观察化
      new Observer(this.$data);
      for (let key in computed) {
        Object.defineProperty(this.$data, key, {
          get() {
            return computed[key].call(this);
          }
        });
      }
      for (let key in methods) {
        Object.defineProperty(this, key, {
          get() {
            return methods[key].bind(this);
          }
        });
      }
      // 模板的编译
      new Compiler(this.$vm, this.$el);
    }
  }
}
// 这里就是将data可观察化的类
class Observer {
  constructor(data) {
    this.observer(data);
  }
  observer(data) {
    if (data && Object.prototype.toString.call(data) === '[object Object]') {
      for (let key in data) {
        this.defineReactive(data, key, data[key]);
      }
    }
  }
  defineReactive(obj, key, value) {
    const self = this;
    this.observer(value);
    let dep = new Dep();
    Object.defineProperty(obj, key, {
      //  在data被get时候将当前观察者存入到订阅容器当中
      get() {
        Dep.target && dep.addSub(Dep.target);
        return value;
      },
      //  在data被重新设置时，通知订阅者可以更新了！
      set(newValue) {
        if (value !== newValue) {
          self.observer(newValue);
          value = newValue;
          dep.notify();
        }
      }
    });
  }
}
//  订阅容器
class Dep {

  //  临时存放当前观察者的静态属性
  static target = null;
  
  constructor() {
    this.subs = [];
  }
  
  //  添加订阅者
  addSub(watcher) {
    this.subs.push(watcher);
  }
  //  通知更新
  notify() {
    this.subs.forEach(watcher => watcher.update());
  }
}

// 观察者类
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;
    this.oldValue = this.getVal();
  }
  getVal() {
    Dep.target = this;
    let value = compileUtils.getVmData(this.vm, this.expr);
    Dep.target = null;
    return value;
  }
  //  每个观察者都必须要有一个更新函数来触发视图更新的回调
  update() {
    let newValue = this.getVal();
    this.cb(newValue);
  }
}
class Compiler {
  constructor(vm, el) {
    this.vm = vm;
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    let fragment = this.nodeToFragment(this.el);
    this.compile(fragment);
    this.el.appendChild(fragment);
  }
  isElementNode(node) {
    return node.nodeType === Node.ELEMENT_NODE;
  }
  isDirective(attrName) {
    return attrName.startsWith('v-');
  }
  nodeToFragment(node) {
    let fragment = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = node.firstChild)) {
      fragment.appendChild(firstChild);
    }
    return fragment;
  }
  compile(node) {
    let childNodes = [...node.childNodes];
    childNodes.forEach(childNode => {
      if (this.isElementNode(childNode)) {
        this.compileElementNode(childNode);
        this.compile(childNode);
      } else {
        this.compileTextNode(childNode);
      }
    });
  }
  compileElementNode(node) {
    let attrs = [...node.attributes];
    attrs.forEach(({ name, value: expr }) => {
      if (this.isDirective(name)) {
        let [, directive] = name.split('-');
        let [directiveName, event] = directive.split(':');
        compileUtils[directiveName](this.vm, expr, node, event);
      }
    });
  }
  compileTextNode(node) {
    let reg = new RegExp(/\{\{(.*?)\}\}/g);
    if (reg.test(node.textContent)) {
      compileUtils.text(this.vm, node);
    }
  }
}
//  这里就是一些编译模板时所需要的工具函数
compileUtils = {
  getVmData(vm, expr) {
    return expr.split('.').reduce((data, current) => {
      return data[current];
    }, vm.$data);
  },
  on(vm, expr, node, event) {
    node.addEventListener(event, e => {
      vm[expr](e);
    });
  },
  model(vm, expr, node) {
    let value = this.getVmData(vm, expr);
    node.addEventListener('input', e => {
      expr.split('.').reduce((data, current, index, arr) => {
        if (index === arr.length - 1) {
          return (data[current] = e.target.value);
        }
        return data[current];
      }, vm.$data);
    });
    //  只要用到data的地方就要创建一个观察者
    new Watcher(vm, expr, newValue => {
      this.update.model(node, newValue);
    });
    this.update.model(node, value);
  },
  text(vm, node) {
    let oldContent = node.textContent;
    let reg = new RegExp(/\{\{(.*?)\}\}/g);
    let newContent = oldContent.replace(reg, (...args) => {
        //  只要用到data的地方就要创建一个观察者
      new Watcher(vm, args[1], () => {
        let newContent = oldContent.replace(reg, (...args) => {
          return this.getVmData(vm, args[1]);
        });
        this.update.text(node, newContent);
      });
      return this.getVmData(vm, args[1]);
    });
    this.update.text(node, newContent);
  },
  update: {
    model(node, value) {
      node.value = value;
    },
    text(node, content) {
      node.textContent = content;
    }
  }
};

