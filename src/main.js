import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/authStore'
import Toast from '@/components/common/Toast.vue' // Import Toast

const app = createApp(App)

app.component('Toast', Toast) // Register globally



const pinia = createPinia()
app.use(pinia)


app.use(router)
app.use(ElementPlus)


const authStore = useAuthStore(pinia)
authStore.loadFromStorage()

app.mount('#app')
