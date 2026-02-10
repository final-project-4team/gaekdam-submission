<template>
  <!-- 차트 카드를 감싸는 공통 컴포넌트 -->
  <ChartCard>
    <!-- 카드 제목 슬롯: 백엔드에서 전달된 제목을 표시 -->
    <template #title>
      {{ displayedTitle }}
    </template>
    <!-- 툴바 슬롯: CSV/PNG 다운로드 버튼 제공 -->
    <template #toolbar>
      <button class="toolbar-btn" @click="downloadCSV">CSV</button>
      <button class="toolbar-btn" @click="downloadImage">PNG</button>
    </template>

    <!-- 차트 영역: canvas 요소에 Chart.js 인스턴스를 렌더링 -->
    <div class="chart-wrapper">
      <canvas ref="canvasEl"></canvas>
      <!-- 데이터가 없을 경우 보여줄 대체 UI -->
      <div v-if="!hasData" class="empty">데이터 없음</div>
    </div>
  </ChartCard>
</template>

<script setup>
// 주요 한글 주석 추가: 컴포넌트의 역할과 각 함수/변수에 대한 간단한 설명
// 이 컴포넌트는 "외국인 고객 Top3 국가" 데이터를 받아 가로 바 차트로 렌더링합니다.
// - props.widget: 백엔드 또는 샘플에서 전달되는 위젯 객체로, 보통 { labels: [...], series: [...], title: '...' } 형태입니다.
// - normalize(widget): reactive proxy 또는 다양한 형태의 series/labels 입력을 안전하게 평문 배열로 정규화합니다.
// - hasData: 실제로 표시 가능한 숫자 데이터가 있는지 검사합니다.
// - buildConfig: Chart.js에 전달할 config 객체를 생성합니다 (색상, 축, 플러그인 등).
// - renderChart: 기존 차트를 파괴(destroy)하고 새로운 차트를 생성합니다. 데이터가 없으면 렌더링을 중단합니다.
// - downloadCSV / downloadImage: 차트 데이터를 CSV/PNG로 내려받는 유틸리티입니다.

import { ref, onMounted, watch, computed } from 'vue'
import Chart from 'chart.js/auto'
import ChartCard from './ChartCard.vue'

// props 정의: widget 객체를 받음. 기본값은 개발 시 편의용 샘플 데이터입니다.
const props = defineProps({ widget: { type: Object, default: () => ({ labels:['중국','일본','대만'], series:[{ data:[340,200,70] }], title:'외국인 고객 Top3 국가' }) } })

// 캔버스 참조와 차트 인스턴스 변수
const canvasEl = ref(null)
let chart = null

// labels/series 를 안전하게 평문 배열로 변환하는 함수
// - reactive proxy(예: Vue의 반응형 객체)를 JSON 직렬화로 풀어내 시도
// - 실패 시 원본 객체를 사용하여 최대한 추출
// - series는 [{ data: [...] }] 또는 단일 배열 등 여러 형태를 허용
function normalize(widget){
  // labels 정규화: 직렬화해서 평범한 배열로 만들거나 직접 접근
  let labels = []
  try {
    const plainLabels = widget && widget.labels ? JSON.parse(JSON.stringify(widget.labels)) : null
    if (Array.isArray(plainLabels)) labels = plainLabels
    else if (Array.isArray(widget && widget.labels)) labels = widget.labels
  } catch(e) {
    if (Array.isArray(widget && widget.labels)) labels = widget.labels
  }

  // series -> 데이터 배열 추출: 여러 케이스를 처리
  let data = []
  try {
    const plainSeries = widget && widget.series ? JSON.parse(JSON.stringify(widget.series)) : null
    if (Array.isArray(plainSeries)) {
      if (plainSeries.length > 0 && Array.isArray(plainSeries[0].data)) {
        // [{ data: [...] }, ...] 형태 처리
        data = plainSeries[0].data.map(v => v == null || Number.isNaN(Number(v)) ? null : Number(v))
      } else if (plainSeries.every(x => typeof x === 'number' || (typeof x === 'string' && x.trim() !== ''))) {
        // [1,2,3] 또는 ['1','2'] 형태 처리
        data = plainSeries.map(v => v == null || Number.isNaN(Number(v)) ? null : Number(v))
      }
    }
  } catch(e) {
    // 직렬화 실패시 reactive 원시값으로 처리
    const rawSeries = widget && widget.series
    if (Array.isArray(rawSeries) && rawSeries.length > 0) {
      const first = rawSeries[0]
      if (first && Array.isArray(first.data)) data = first.data.map(v => v == null || Number.isNaN(Number(v)) ? null : Number(v))
      else if (rawSeries.every(x => typeof x === 'number' || (typeof x === 'string' && x.trim() !== ''))) data = rawSeries.map(v => v == null || Number.isNaN(Number(v)) ? null : Number(v))
    }
  }

  return { labels, data }
}

// 데이터가 있는지 판단: null/NaN은 무시하고 적어도 하나의 유효한 숫자가 있어야 true
const hasData = computed(() => {
  const { data } = normalize(props.widget)
  return data && data.length > 0 && data.some(v => v !== null && !Number.isNaN(v))
})

// 제목 표시: widget.title 이 있으면 사용, 없으면 기본 제목 사용
const displayedTitle = computed(() => props.widget?.title || '외국인 고객 TOP3 국가')

// Chart.js 구성 생성
// - 수평 바 차트(indexAxis:'y')
// - 색상 팔레트와 축 설정 포함
function buildConfig(widget){
  const { labels, data } = normalize(widget)
  const colors = ['#60a5fa','#34d399','#f97316']
  return {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth:0 }] },
    options: {
      indexAxis: 'y', // 가로형 바 차트
      responsive:true,
      maintainAspectRatio:false,
      plugins: { legend: { display:false } },
      scales: { x: { beginAtZero:true }, y: { ticks: { autoSkip:false } } }
    }
  }
}

// 실제 차트 렌더링 처리
// - 기존 차트가 있으면 파괴
// - 데이터가 없으면 렌더링을 중단
function renderChart(){
  if (!canvasEl.value) return
  const ctx = canvasEl.value.getContext('2d')
  if (chart) { chart.destroy(); chart = null }
  if (!hasData.value) return
  chart = new Chart(ctx, buildConfig(props.widget))
}

// CSV 다운로드 유틸리티
// - labels와 data를 CSV로 직렬화하여 브라우저에 다운로드 트리거
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
    a.download = (props.widget && (props.widget.widgetKey||props.widget.title)) ? `${(props.widget.widgetKey||props.widget.title).toString().replace(/\s+/g,'_')}.csv` : 'foreign_top3.csv'
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }catch(e){ console.warn('csv failed', e) }
}

// PNG 이미지 다운로드 유틸리티
// - Chart.js의 toBase64Image() 결과를 링크로 생성하여 다운로드
function downloadImage(){
  if (!chart) return
  try{
    const url = chart.toBase64Image()
    const a = document.createElement('a')
    a.href = url
    a.download = (props.widget && (props.widget.widgetKey||props.widget.title)) ? `${(props.widget.widgetKey||props.widget.title).toString().replace(/\s+/g,'_')}.png` : 'foreign_top3.png'
    document.body.appendChild(a); a.click(); a.remove()
  }catch(e){ console.warn('img failed', e) }
}

// 마운트 시 차트 렌더링
onMounted(()=>{ renderChart() })
// labels와 series 배열 변화를 관찰하여 차트 갱신. deep 및 immediate 옵션 설정
watch(() => [props.widget?.labels, props.widget?.series], () => { renderChart() }, { deep:true, immediate:true })
// widget 객체 전체 변화를 보조적으로 관찰
watch(() => props.widget, () => { renderChart() }, { deep:true })
</script>

<style scoped>
.chart-wrapper { width:100%; height:220px; position:relative }
canvas { width:100% !important; height:100% !important }
.empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#9ca3af }
.toolbar-btn { background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; cursor:pointer }
</style>
