<template>
  <div class="controls">
    <select v-model="periodType">
      <option value="year">연간</option>
      <option value="month">월간</option>
    </select>

    <select v-model="year">
      <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
    </select>

    <select v-if="periodType === 'month'" v-model="month">
      <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
    </select>

    <BaseButton class="ml" @click="share" size="md" type="primary">공유</BaseButton>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseButton from '@/components/common/button/BaseButton.vue'

const periodType = ref('year')
const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)

const years = computed(() => {
  const y = new Date().getFullYear()
  return Array.from({length: 6}, (_, i) => y - i)
})
const months = Array.from({length:12}, (_,i) => i+1)

const share = () => {
  // 예: 현재 선택값을 parent로 emit 또는 API 호출
  console.log('공유', { periodType: periodType.value, year: year.value, month: month.value })
}
</script>

<style scoped>
.controls { display:flex; gap:8px; align-items:center; }
.ml { margin-left: 8px; }
</style>