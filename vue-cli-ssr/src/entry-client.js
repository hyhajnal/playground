import { createApp } from './main'

const { app, router, store } = createApp()

// 服务端预渲染数据
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__)
}

router.onReady(() => {
  app.$mount('#app')
})
