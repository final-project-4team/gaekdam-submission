<template>
  <div>
    <!-- KPI 카드: 공통 TemplateGrid 컴포넌트로 렌더링 -->
    <TemplateGrid v-if="kpiWidgets && kpiWidgets.length" :widgets="kpiWidgets" />
    <div v-else class="template-grid kpi-row empty-kpis">템플릿에 KPI 카드가 없습니다.</div>

    <!-- 차트 영역: 고객경험 전용 시계열 차트 컴포넌트 사용 -->
    <div class="template-grid chart-grid">
      <CXTimeSeriesChart v-for="w in chartWidgets" :key="w.templateWidgetId || w.id" :widget="w" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TemplateGrid from '@/components/report/TemplateGrid.vue'
import CXTimeSeriesChart from './CXTimeSeriesChart.vue'

// 방어적으로 props 정의: widgets가 없으면 빈 배열을 사용
const props = defineProps({ widgets: { type: Array, default: () => [] } })

// 정렬된 위젯 배열 (sortOrder 기반)
const sorted = computed(() => (props.widgets || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))

// KPI 위젯과 차트 위젯 분리 로직은 OPS와 유사하게 유지
const kpiWidgets = computed(() => {
  const list = sorted.value
  if (!list || list.length === 0) return []
  const hasTypes = list.some(w => w.widgetType)
  if (hasTypes) {
    return list.filter(w => {
      const t = (w.widgetType || '').toString().toUpperCase()
      const hasSeries = Array.isArray(w.series) && w.series.length > 0
      return t === 'KPI_CARD' && !hasSeries
    })
  }
  return list.filter((w, idx) => idx < 4 && !(Array.isArray(w.series) && w.series.length > 0))
})

const chartWidgets = computed(() => {
  const list = sorted.value
  if (!list || list.length === 0) return []
  const hasTypes = list.some(w => w.widgetType)
  if (hasTypes) {
    return list.filter(w => {
      const t = (w.widgetType || '').toString().toUpperCase()
      const hasSeries = Array.isArray(w.series) && w.series.length > 0
      return t === 'LINE' || (t === 'TIME_SERIES' && hasSeries)
    })
  }
  return list.filter(w => Array.isArray(w.series) && w.series.length > 0)
})
</script>

<style scoped>
.template-grid.chart-grid { display: contents; }
.empty-kpis { padding: 12px; color: #6b7280 }
</style>
