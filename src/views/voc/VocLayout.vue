<template>
  <MainContentLayout>
    <template #tabs>
      <ContentTabs :tabs="Voctabs" />
    </template>

    <router-view />
  </MainContentLayout>
</template>

<script setup>
import { computed } from 'vue'
import MainContentLayout from '@/components/layoutComponents/MainContentLayout.vue'
import ContentTabs from '@/components/layoutComponents/ContentTabs.vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

const allTabs = [
  { label: '전체', path: '/voc/inquiries', permission: 'INQUIRY_LIST' },
  { label: '사건/사고 관리', path: '/voc/incidents', permission: 'INCIDENT_LIST' },
]

const Voctabs = computed(() => {
  return allTabs.filter(tab => !tab.permission || authStore.hasPermission(tab.permission))
})
</script>