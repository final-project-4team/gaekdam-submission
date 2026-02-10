<template>
  <div class="summary-grid">
    <section v-for="(group, idx) in groups" :key="idx" class="summary-section">
      <h4 class="section-title">{{ titles[idx] }}</h4>
      <div class="cards">
        <div class="card" v-for="w in group" :key="w.templateWidgetId || w.id">
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
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { defineProps } from 'vue'
const props = defineProps({ widgets: { type: Array, default: () => [] } })

const titles = ['객실운영', '고객현황', '고객경험', '예약및매출']

const groups = computed(() => {
  const items = props.widgets || []
  const chunkSize = 4
  const out = []
  for (let i = 0; i < titles.length; i++) {
    const start = i * chunkSize
    out.push(items.slice(start, start + chunkSize))
  }
  return out
})

function deltaClass(w){
  if (!w || !w.trend) return ''
  return w.trend === 'up' ? 'delta-up' : (w.trend === 'down' ? 'delta-down' : 'delta-neutral')
}
</script>

<style scoped>
.summary-section { margin-bottom: 28px; text-align: center; }
.section-title { font-size: 16px; font-weight:700; color:#374151; margin: 6px auto 12px; display: inline-block; text-align: center; }
.cards { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.card { display:flex; flex-direction:column; justify-content:center; align-items:center; padding:12px 10px; border:1px solid #eee; border-radius:8px; background:#fff; text-align:center; box-sizing:border-box; }
.card-title { font-weight:700; margin-bottom:8px; font-size:14px }
.kpi-value { font-size:20px; font-weight:800; margin-bottom:6px; }
.kpi-target { color:#6b7280; font-size:12px }
.kpi-delta { font-size:12px; margin-top:6px }
.delta-up { color:#0ea5a0 }
.delta-down { color:#ef4444 }
.delta-neutral { color:#6b7280 }

@media (max-width: 1100px) { .cards { grid-template-columns: repeat(3, minmax(0,1fr)); } }
@media (max-width: 760px) { .cards { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 420px) { .cards { grid-template-columns: 1fr; } }
</style>
