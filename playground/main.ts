import { createApp } from 'vue'
import App from './App.vue'

// 与 npm 使用方式一致：组件入口不再自动注入样式
import '../src/styles/index.css'

createApp(App).mount('#app')
