<template>
  <div class="crm-root">
    <TopBar />

    <div class="crm-body">
      <SideMenu />
      <div class="crm-content">
        <router-view />
      </div>
    </div>

    <!-- 챗봇 위젯: 로그인 상태일때만 보임 -->
    <ChatbotWidget v-if="auth.isLoggedIn" />
  </div>
</template>

<script setup>
import TopBar from '@/components/layoutComponents/TopBar.vue'
import SideMenu from '@/components/layoutComponents/SideMenu.vue'

import { defineAsyncComponent } from 'vue'
import { useAuthStore } from '@/stores/authStore' // 경로/이름이 다르면 조정

// 챗봇 지연로드
const ChatbotWidget = defineAsyncComponent(() => import('@/components/ai/ChatbotWidget.vue'))

// Pinia auth store 사용
const auth = useAuthStore()
</script>

<style scoped>
.crm-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* TopBar 제외한 전체 */
.crm-body {
  flex: 1;
  display: flex;
  background: #f4f7fb;
  overflow: hidden; /* body 자체는 스크롤 금지 */
}

/* 메인 컨텐츠만 스크롤 */
.crm-content {
  flex: 1;
  padding: 8px 12px;
  overflow-y: auto; /* 여기서만 스크롤 */
}
</style>
