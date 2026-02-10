<!-- src/views/customer/CustomerLayout.vue -->
<template>
  <MainContentLayout>
    <template #tabs>
      <ContentTabs :tabs="customerTabs" />
    </template>

    <router-view />
  </MainContentLayout>
</template>

<script setup>
import MainContentLayout from '@/components/layoutComponents/MainContentLayout.vue'
import ContentTabs from '@/components/layoutComponents/ContentTabs.vue'

const customerTabs = [
  { label: '고객 목록', path: '/customers/all' },
]
</script>
