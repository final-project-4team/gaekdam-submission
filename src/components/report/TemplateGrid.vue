<template>
  <div class="template-grid">
    <div v-if="widgets && widgets.length" class="template-widgets">
      <div class="card" v-for="w in widgets" :key="w.templateWidgetId || w.id">
        <div class="card-title">{{ w.title }}</div>
        <div class="card-body">
          <div class="kpi-value">{{ w.value }}</div>
          <div class="kpi-target" v-if="w.targetValue">목표: {{ w.targetValue }}</div>
          <div class="kpi-delta" :class="deltaClass(w)">
            <span v-if="w.trend==='up'">▲</span>
            <span v-else-if="w.trend==='down'">▼</span>
            <span v-else>●</span>
            <span v-if="w.changePct !== null && w.changePct !== undefined"> {{ Math.abs(w.changePct).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty">템플릿을 선택하거나 위젯이 없습니다.</div>
  </div>
</template>

<script setup>
// expose component name for keep-alive cache matching
// (Vue 3.3+ / macro-enabled projects support defineOptions in <script setup>)
/* eslint-disable no-undef */
defineOptions({ name: 'TemplateGrid' })
/**
 * TemplateGrid.vue
 * - 목적: 템플릿의 위젯(카드) 그리드를 표시하는 presentation 컴포넌트
 * - props:
 *    widgets: Array - 렌더링할 위젯(카드) 목록
 * - 내부에서 위젯 클릭/상호작용 이벤트가 필요하면 emit으로 확장 가능
 */
import { defineProps } from 'vue'
const props = defineProps({ widgets: { type: Array, default: () => [] } })

function deltaClass(w){
  if (!w || !w.trend) return ''
  return w.trend === 'up' ? 'delta-up' : (w.trend === 'down' ? 'delta-down' : 'delta-neutral')
}
</script>

<style scoped>
.template-widgets { display: contents; }
.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
  width: 100%;
  grid-auto-rows: minmax(140px, 1fr);
  align-content: start;
}
.card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 12px 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fff;
  box-sizing: border-box;
  text-align: center;
  min-width: 0;
}
.card-title { font-weight:700; margin-bottom:8px; font-size:14px }
.kpi-value { font-size:20px; font-weight:800; margin-bottom:6px; word-break:keep-all }
.kpi-target { color:#6b7280; font-size:12px }
.kpi-delta { font-size:12px; margin-top:6px }
.delta-up { color:#0ea5a0 }
.delta-down { color:#ef4444 }
.delta-neutral { color:#6b7280 }

@media (max-width: 1100px) {
  .template-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .template-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 420px) {
  .template-grid { grid-template-columns: 1fr; }
}
</style>
