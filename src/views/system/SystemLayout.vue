<template>
  <MainContentLayout>
    <template #tabs>
      <ContentTabs :tabs="showTabs" />
    </template>

    <router-view />
  </MainContentLayout>
</template>

<script setup>
import MainContentLayout from '@/components/layoutComponents/MainContentLayout.vue'
import ContentTabs from '@/components/layoutComponents/ContentTabs.vue'
import {useAuthStore} from "@/stores/authStore.js";
import {computed} from "vue";

const authStore=useAuthStore()


const systemAllTabs = [
  {
    label: '시스템 로그',
    path: '/system',
    activeMatches: ['/system/log', '/system/activity', '/system/permission', '/system/privacy']
  }
]


const showTabs=computed(() => {
  return systemAllTabs.filter(tab => !tab.permission || authStore.hasPermission(tab.permission))
})
</script>
<!--

const systemAllTabs = [
  {
    label: '시스템 로그',
    path: '/system',
    activeMatches: ['/system/log', '/system/activity', '/system/permission', '/system/privacy']
  }
]

const showTabs=computed(() => {
  return systemAllTabs.filter(tab => !tab.permission || authStore.hasPermission(tab.permission))
})
-->
