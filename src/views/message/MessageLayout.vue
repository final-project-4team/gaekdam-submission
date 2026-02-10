<template>
  <MainContentLayout>
    <template #tabs>
      <ContentTabs :tabs="tabs" />
    </template>

    <router-view />
  </MainContentLayout>
</template>

<script setup>
import MainContentLayout from '@/components/layoutComponents/MainContentLayout.vue'
import ContentTabs from '@/components/layoutComponents/ContentTabs.vue'


const tabs = [
  { label: '메세지 템플릿 설정', path: '/messages/templates' },
  { label: '메세지 발송이력', path: '/messages/histories' },
  { label: '발신번호 설정', path: '/messages/sender-phones' },
]
</script>