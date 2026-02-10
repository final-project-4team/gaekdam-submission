<template>
  <ChartCard>
    <template #title>
      {{ widget.title || '고객유형 비율' }}
    </template>
    <template #toolbar>
      <button class="toolbar-btn" @click="downloadCSV">CSV</button>
      <button class="toolbar-btn" @click="downloadImage">PNG</button>
    </template>
    <div class="chart-wrapper">
      <canvas ref="canvasEl"></canvas>
      <div v-if="!hasData" class="empty">데이터 없음</div>
    </div>
  </ChartCard>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import Chart from 'chart.js/auto'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import ChartCard from './ChartCard.vue'
Chart.register(ChartDataLabels)

// 컴포넌트 props: 상위에서 widget 객체를 전달받습니다.
// 개발 편의를 위해 기본값(sample)을 설정하지만, 실제는 백엔드 응답을 사용합니다.
const props = defineProps({ widget: { type: Object, default: () => ({ labels:['개인','단체','법인'], series:[{ data:[0.57,0.27,0.16] }], title:'고객유형 비율' }) } })

const canvasEl = ref(null)
let chart = null

function mapLabel(label){
  // 입력 라벨을 한국어 라벨로 매핑합니다.
  // 예: 'INDIVIDUAL' -> '개인 고객', 'CORPORATE' -> '법인 고객'
  if (!label && label !== 0) return label
  const key = String(label).toUpperCase()
  switch(key){
    case 'INDIVIDUAL': return '개인 고객'
    case 'CORPORATE': return '법인 고객'
    case 'GROUP': return '단체'
    default: return label
  }
}

function normalize(widget){
  // 정규화 함수: 백엔드에서 전달된 widget의 labels/series 구조를 표준형({labels[], data[]})으로 변환합니다.
  // labels: 배열이어야 하며, mapLabel을 통해 화면용 한글 라벨로 변환합니다.
  const labels = Array.isArray(widget && widget.labels) ? widget.labels : []
  const seriesArr = Array.isArray(widget && widget.series) ? widget.series : []
  const data = (seriesArr[0] && Array.isArray(seriesArr[0].data))
    ? seriesArr[0].data.map(v => (v === null || Number.isNaN(Number(v))) ? null : Number(v))
    : []

  // 화면에 표시할 라벨은 매핑된 한글 라벨을 사용
  const mappedLabels = labels.map(l => mapLabel(l))

  // 주의: labels 또는 data가 비어있으면 차트 대신 '데이터 없음'을 표시하도록 hasData에서 판별합니다.
  return { labels: mappedLabels, data }
}

// 데이터 유효성 검사: labels와 data가 모두 존재하고, data에 숫자값이 하나 이상 있어야 차트를 렌더링합니다.
const hasData = computed(() => {
  const { labels, data } = normalize(props.widget)
  return Array.isArray(labels) && labels.length > 0 && Array.isArray(data) && data.length > 0 && data.some(v => v !== null && !Number.isNaN(v))
})

function buildConfig(widget){
  const { labels, data } = normalize(widget)
  const colors = ['#60a5fa','#34d399','#f97316']
  return {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth:0 }] },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      plugins: {
        legend: { position:'bottom' },
        datalabels: {
          color:'#fff',
          formatter: (value, ctx) => {
            try{
              const total = ctx.chart.data.datasets[0].data.reduce((s,v)=>s + (v||0),0)
              if (!total) return ''
              const pct = Math.round((value/total)*100)
              return pct + '%'
            }catch(e){ return '' }
          }
        }
      }
    }
  }
}

function renderChart(){
  if (!canvasEl.value) return
  const ctx = canvasEl.value.getContext('2d')
  if (chart) { chart.destroy(); chart = null }
  // 데이터가 없으면 차트 생성 중단(화면에는 '데이터 없음'이 표시됨)
  if (!hasData.value) return
  chart = new Chart(ctx, buildConfig(props.widget))
}

function downloadCSV(){
  try{
    const { labels, data } = normalize(props.widget)
    const header = ['label','value']
    const rows = labels.map((l,i)=>[`"${String(l).replace(/"/g,'""')}"`, data[i] === null ? '' : String(data[i])])
    const csv = [header.join(','), ...rows.map(r=>r.join(','))].join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (props.widget && (props.widget.widgetKey||props.widget.title)) ? `${(props.widget.widgetKey||props.widget.title).toString().replace(/\s+/g,'_')}.csv` : 'cust_type.csv'
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }catch(e){ console.warn('csv failed', e) }
}

function downloadImage(){
  if (!chart) return
  try{
    const url = chart.toBase64Image()
    const a = document.createElement('a')
    a.href = url
    a.download = (props.widget && (props.widget.widgetKey||props.widget.title)) ? `${(props.widget.widgetKey||props.widget.title).toString().replace(/\s+/g,'_')}.png` : 'cust_type.png'
    document.body.appendChild(a); a.click(); a.remove()
  }catch(e){ console.warn('img failed', e) }
}

onMounted(()=>{ renderChart() })
watch(()=>props.widget, ()=>{ renderChart() }, { deep:true })
</script>

<style scoped>
.chart-wrapper { width:100%; height:220px; position:relative }
canvas { width:100% !important; height:100% !important }
.empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#9ca3af }
.toolbar-btn { background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; cursor:pointer }
</style>
