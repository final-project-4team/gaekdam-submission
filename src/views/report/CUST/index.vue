<template>
  <div class="cust-template">
    <div class="kpi-row">
      <!-- ...existing KPI cards (already in project) ... -->
    </div>
    <div class="chart-grid">
      <CustomerTypeDonut :widget="sampleWidget" />
      <!-- 추후 다른 차트 컴포넌트 삽입 -->
    </div>
  </div>
</template>

<script setup>
import CustomerTypeDonut from './CustomerTypeDonut.vue'

// 샘플 위젯(백엔드 대신 임시 데이터)
const sampleWidget = {
  widgetKey: 'cust_type',
  title: '고객유형 비율',
  labels: ['개인','단체','법인'],
  series: [{ data: [570,270,160] }],
  meta: { valueType: 'count' }
}
</script>

<style scoped>
.chart-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin-top:12px }
.kpi-row { display:flex; gap:12px }
</style>
