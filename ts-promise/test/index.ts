import { MyPromise } from '../src/index';

new MyPromise(resolve => {
    console.log(1);
    resolve(3);
}).then(num => {
    console.log(num)
});
console.log(2)

// 测试finally
new MyPromise((resolve) => {
    setTimeout(() => resolve(1), 1000);
  }).finally(() => console.log(Date.now()));
