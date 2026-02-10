<template>
  <div>
    <!-- KPI 카드: 공통 TemplateGrid 컴포넌트로 렌더링 -->
    <TemplateGrid v-if="kpiWidgets && kpiWidgets.length" :widgets="kpiWidgets" />
    <div v-else class="template-grid kpi-row empty-kpis">템플릿에 KPI 카드가 없습니다.</div>

    <!-- 차트 영역 -->
    <div class="template-grid chart-grid">
      <OPSTimeSeriesChart v-for="w in chartWidgets" :key="w.templateWidgetId || w.id" :widget="w" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TemplateGrid from '@/components/report/TemplateGrid.vue'
import OPSTimeSeriesChart from './OPSTimeSeriesChart.vue'

// 방어적으로 props 정의: widgets가 없으면 빈 배열을 사용
const props = defineProps({ widgets: { type: Array, default: () => [] } })

// 정렬된 위젯 배열 (sortOrder 기반)
const sorted = computed(() => (props.widgets || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))

// widgetType이 명시되어 있으면 그에 따라 분리, 없으면 앞 4개를 KPI로 판단
const kpiWidgets = computed(() => {
  const list = sorted.value
  if (!list || list.length === 0) return []
  const hasTypes = list.some(w => w.widgetType)
  if (hasTypes) {
    // KPI_CARD로 명시된 것만 KPI로 처리, 시계열(series)가 있는 위젯은 제외
    return list.filter(w => {
      const t = (w.widgetType || '').toString().toUpperCase()
      const hasSeries = Array.isArray(w.series) && w.series.length > 0
      return t === 'KPI_CARD' && !hasSeries
    })
  }
  // widgetType이 없을 때: 기본적으로 앞 4개를 KPI로 보되, series가 있는 위젯은 건너뜀
  return list.filter((w, idx) => idx < 4 && !(Array.isArray(w.series) && w.series.length > 0))
})

const chartWidgets = computed(() => {
  const list = sorted.value
  if (!list || list.length === 0) return []
  const hasTypes = list.some(w => w.widgetType)
  if (hasTypes) {
    // LINE 타입만 OPSTimeSeriesChart로 렌더링. TIME_SERIES도 상황에 따라 포함하고 싶다면 여기에 추가 가능
    return list.filter(w => {
      const t = (w.widgetType || '').toString().toUpperCase()
      const hasSeries = Array.isArray(w.series) && w.series.length > 0
      return t === 'LINE' || (t === 'TIME_SERIES' && hasSeries)
    })
  }
  // widgetType이 없을 때: series가 있는 위젯들을 차트로 처리
  return list.filter(w => Array.isArray(w.series) && w.series.length > 0)
})
</script>

<style scoped>
.template-grid.chart-grid { display: contents; }
.empty-kpis { padding: 12px; color: #6b7280 }
</style>