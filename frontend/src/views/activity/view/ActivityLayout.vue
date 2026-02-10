<template>
  <MainContentLayout>
    <template #tabs>
      <ContentTabs :tabs="activityTabs" />
    </template>

    <router-view />
  </MainContentLayout>
</template>

<script setup>
import MainContentLayout from '@/components/layoutComponents/MainContentLayout.vue'
import ContentTabs from '@/components/layoutComponents/ContentTabs.vue'
import {useAuthStore} from "@/stores/authStore.js";
import {computed} from "vue";



const authStore = useAuthStore()

const allTabs = [
  { label: '전체', path: '/activities/all',permission : 'RESERVATION_LIST' },
  { label: '체크인 / 체크아웃', path: '/activities/check', permission : 'TODAY_RESERVATION_LIST' },
  { label: '부대시설 이용', path: '/activities/facility',permission:'TODAY_FACILITY_USAGE_LIST' },
  { label: '타임라인', path: '/activities/timeline',permission: 'CUSTOMER_TIMELINE_READ' },
]

const activityTabs = computed(() => {
  return allTabs.filter(tab => !tab.permission || authStore.hasPermission(tab.permission))
})
</script>
