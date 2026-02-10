<template>
  <MainContentLayout>
    <template #tabs>
      <ContentTabs :tabs="showActivityTabs" />
    </template>

    <router-view />
  </MainContentLayout>
</template>

<script setup>
import MainContentLayout from '@/components/layoutComponents/MainContentLayout.vue'
import ContentTabs from '@/components/layoutComponents/ContentTabs.vue'
import {computed} from "vue";
import {useAuthStore} from "@/stores/authStore.js";
const authStore=useAuthStore()

const allActivityTabs = [
  { label: '직원 관리', path: '/setting/employee',permission:'EMPLOYEE_LIST' },
  { label: '목표 관리', path: '/setting/objective',permission:'SETTING_OBJECTIVE_LIST' },
  { label: '권한 관리', path: '/setting/permission',permission:'PERMISSION_LIST' },
  { label: '멤버십 관리', path: '/setting/membership' ,permission:'MEMBERSHIP_POLICY_LIST'},
  { label: '로열티 관리', path: '/setting/loyalty' ,permission:'LOYALTY_POLICY_LIST'},
]
const showActivityTabs=computed(() => {
  return allActivityTabs.filter(tab => !tab.permission || authStore.hasPermission(tab.permission))
})
</script>
