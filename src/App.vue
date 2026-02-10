<template>
  <router-view />
  <GlobalLoading />
  <Toast />
</template>

<script setup>
import GlobalLoading from '@/components/common/GlobalLoading.vue'
import Toast from '@/components/common/Toast.vue'
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
}
</style>
