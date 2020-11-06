enum STATUS {
    PENDING,
    FULLFILLED,
    REJECTED
}

type PromiseCallback = () => void
type PromiseResolve = (value: undefined | MyPromise) => void
type PromiseRject = (reason: Error) => void
type PromiseExecutor = (resolve: PromiseResolve, reject: PromiseRject) => void


export class MyPromise {
    private status: STATUS = STATUS.PENDING
    private value: undefined | MyPromise = undefined
    private reason: any = undefined
    private onResolvedCallbacks: PromiseCallback[] = []
    private onRejectedCallbacks: PromiseCallback[] = []

    constructor(executor) {
        try {
            executor(this.resolve, this.reject)
        } catch (e) {
            this.reject(e);
        }
    }

    /**
     * 拿到外部传入的value，调用存起来的所有回调函数 
     * @param value 
     */
    public resolve(value) {
        setTimeout(() => {
            if (this.status === STATUS.PENDING) {   // 判断状态，保证只调用一次
                this.status = STATUS.FULLFILLED
                this.value = value
                this.onResolvedCallbacks.forEach(cb => cb())
            }
        }, 0)
    }

    public reject(reason) {
        setTimeout(() => {
            if (this.status === STATUS.PENDING) {
                this.status = STATUS.REJECTED
                this.reason = reason
                this.onRejectedCallbacks.forEach(cb => cb())
            }
        }, 0)
    }

    /**
     * 执行then的时候，先把回调函数存起来，此时value可能还没有值
     * @param onFullFilled 
     * @param onRejected 
     */
    public then(onFullFilled?: any, onRejected?: any) {

        // 缺省值
        const _onFullFilled = typeof onFullFilled === 'function' ? onFullFilled : v => v;
        const _onRejected = typeof onRejected === 'function' ? onRejected : v => { throw v };
        
        // 返回一个promise对象，支持链式调用
        return new MyPromise((resolve, reject) => {
            if (this.status === STATUS.FULLFILLED) {
                _onFullFilled(this.value)
            }
    
            if (this.status === STATUS.REJECTED) {
                _onRejected(this.reason)
            }
    
            if (this.status === STATUS.PENDING) {
                this.onResolvedCallbacks.push(() => {
                    onFullFilled(this.value)
                })
                this.onRejectedCallbacks.push(():void => {
                    onRejected(this.reason)
                })
            }
        })
    }

    /**
     * 相当于一个没有成功的 then
     * @param onRejected 
     */
    public catch(onRejected) {
        return this.then(null, onRejected)
    }

    /**
     * 等待这个promise执行完毕，无论成功/失败，将结果返回
     * @param onFinally 
     */
    public finally(onFinally) {
        if (typeof onFinally !== 'function') {
            return this.then()  // 注: bluebird 也是这么实现的: https://github.com/petkaantonov/bluebird/blob/master/src/finally.js#L93
        }
        return this.then(
            value => this.resolve(onFinally()).then(() => value),
            reason => this.resolve(onFinally()).then(() => { throw reason })
        )
    }

    public static all(promises: MyPromise[]) {
        let resArr = [], count = 0, len = promises.length
        return new MyPromise((resolve, reject) => {
            promises.forEach((promise, i) => {
                MyPromise.resolve(promise).then(res => {
                    resArr[i] = res
                    if (++count === len) return resolve(resArr)
                }, err => {
                    return reject(err)
                })
            })
        })
    }

    public static allSettled(promises: MyPromise[]) {
        const formatSettledResult = (success, value) => {
            return success
                ? { status: "fulfilled", value }
                : { status: "rejected", reason: value };
        }

        let resArr = [], count = 0, len = promises.length
        return new MyPromise((resolve, reject) => {
            promises.forEach((promise, i) => {
                MyPromise.resolve(promise)
                    .then(res => {
                        resArr[i] = formatSettledResult(true, res)
                        if (++count === len) return resolve(resArr)
                    })
                    .catch(res => {
                        resArr[i] = formatSettledResult(false, res)
                        if (++count === len) return resolve(resArr)
                    })
            })
        })
    }

    /**
     * 谁快返回谁
     * @param arr 
     */
    public static race(promises: MyPromise[]) {
        return new MyPromise((resolve, reject) => {
            promises.forEach(promise => {
                // 将传入的 promise 用MyPromise.resolve 包装一下，兼容非promise对象
                MyPromise.resolve(promise).then(resolve, reject)
            })
        })
    }
}