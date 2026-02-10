<template>
  <div>
    <!-- KPI 카드: 재사용 가능한 TemplateGrid 컴포넌트로 렌더링 -->
    <TemplateGrid v-if="kpiWidgets && kpiWidgets.length" :widgets="kpiWidgets" />
    <div v-else class="template-grid kpi-row empty-kpis">템플릿에 KPI 카드가 없습니다.</div>

    <!-- 차트 영역: 고객유형 도넛 + 외국인 Top3 바 -->
    <div class="template-grid chart-grid">
      <CustomerTypeDonut v-if="hasCustomerTypeWidget" :widget="customerTypeWidget" :key="customerTypeWidget.templateWidgetId || customerTypeWidget.widgetKey || 'customer_type'" />
      <ForeignTop3Bar v-if="hasForeignTopWidget" :widget="foreignTopWidget" :key="foreignTopWidget.templateWidgetId || foreignTopWidget.widgetKey || 'foreign_top'" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TemplateGrid from '@/components/report/TemplateGrid.vue'
import CustomerTypeDonut from './CustomerTypeDonut.vue'
import ForeignTop3Bar from './ForeignTop3Bar.vue'

const props = defineProps({ widgets: { type: Array, default: () => [] } })

const sorted = computed(() => (props.widgets || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))

// KPI: widgetType이 KPI_CARD 이거나 앞 4개
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

// 차트 위젯 추출: 고객유형, 외국인Top3 키로 매핑
const customerTypeWidget = computed(() => sorted.value.find(w => (w.widgetKey||'').toString().toUpperCase() === 'CUSTOMER_TYPE_RATIO' || (w.title||'').includes('고객유형')))
const foreignTopWidget = computed(() => sorted.value.find(w => {
  const key = (w.widgetKey || '').toString().toUpperCase()
  const wt = (w.widgetType || '').toString().toUpperCase()
  return key === 'FOREIGN_TOP_COUNTRY' || wt === 'BAR'
}))

const hasCustomerTypeWidget = computed(() => !!customerTypeWidget.value)
const hasForeignTopWidget = computed(() => !!foreignTopWidget.value)
</script>

<style scoped>
.template-grid.chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:12px; margin-top:12px }
.empty-kpis { padding:12px; color:#6b7280 }
</style>
