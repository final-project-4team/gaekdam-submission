<template>
  <div class="chat">
    <div class="messages">
      <div v-for="(m,i) in messages" :key="i" :class="m.role">{{ m.text }}</div>
    </div>
    <form @submit.prevent="onSend">
      <input v-model="text" placeholder="질문 입력" />
      <button :disabled="loading || !text">전송</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { askChat } from '@/api/ai' // 경로에 맞게

const messages = ref([])
const text = ref('')
const loading = ref(false)

async function onSend() {
  if (!text.value) return
  messages.value.push({ role: 'user', text: text.value })
  loading.value = true
  try {
    const data = await askChat(text.value)
    // 서버 반환에 맞춰서 사용: 예) { answer: '...' }
    messages.value.push({ role: 'bot', text: data.answer ?? JSON.stringify(data) })
  } catch (e) {
    messages.value.push({ role: 'bot', text: `Error: ${e.message}` })
  } finally {
    loading.value = false
    text.value = ''
  }
}
</script>

<style scoped>
/* 간단 스타일 */
.chat { max-width:720px; margin:0 auto; }
.messages { min-height:300px; border:1px solid #ddd; padding:8px; overflow:auto }
.user { text-align:right; background:#e6f7ff; margin:6px; padding:8px; border-radius:6px }
.bot { text-align:left; background:#fff; margin:6px; padding:8px; border-radius:6px }
</style>