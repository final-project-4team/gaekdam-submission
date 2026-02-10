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
  { label: '마이페이지', path: '/myPage' },
]
</script>