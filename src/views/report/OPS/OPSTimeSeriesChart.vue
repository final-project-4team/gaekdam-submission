<template>
  <div class="card" ref="cardEl">
    <!-- 오른쪽 상단: 줌리셋, 브러시 토글, 더보기 메뉴 (왼→오) -->
    <div class="more-menu">
      <!-- 누적/원본 모드 토글: CHECKIN/CHECKOUT 전용 -->
      <div v-if="isCumulativeWidget(widget)" class="mode-switch">
        <button class="mode-btn" :class="{ active: !cumulativeMode }" @click.stop="setCumulativeMode(false)">원본</button>
        <button class="mode-btn" :class="{ active: cumulativeMode }" @click.stop="setCumulativeMode(true)">누적+목표</button>
      </div>
      <button class="reset-btn" title="원래 보기로" @click.stop="resetZoom">↺</button>
      <button class="brush-toggle" :class="{ active: dragEnabled }" @click.stop="toggleBrush" :title="dragEnabled ? '브러시 끄기' : '브러시 켜기'">
        ⊞
      </button>
      <!-- CSV / PNG 버튼: CustomerTypeDonut과 동일한 방식으로 표시 -->
      <button class="toolbar-btn" @click.stop="onDownloadCSV">CSV</button>
      <button class="toolbar-btn" @click.stop="onDownloadImage">PNG</button>

    </div>
    <div class="card-title">{{ widget.title }} <span v-if="pickUnitText(widget)">({{ pickUnitText(widget) }})</span></div>
    <!-- Chart.js는 canvas에 렌더링됩니다 -->
    <div v-if="hasData">
      <canvas ref="chartEl" style="height:220px; width:100%"></canvas>
    </div>
    <div v-else class="empty-state">데이터 없음</div>

    <!-- (리셋 버튼은 상단에 통합됨) -->
  </div>
</template>

<script setup>
/*
  TimeSeriesChart.vue (Chart.js 버전 개선)
  - 목적: 템플릿 내 시계열 차트를 Chart.js로 렌더링합니다.
  - 이번 변경사항 요약:
    1) 툴팁과 Y축 눈금에 대해 KPI 유형에 맞춘 포맷터(통화, 퍼센트, 건수)를 적용합니다.
    2) widget.widgetKey 또는 title을 기반으로 적절한 포맷터를 선택하여 툴팁/축/레이블에 반영합니다.
    3) 데이터 정규화(normalize) 과정에서 숫자 변환(safeNumber)을 수행하여 차트에 숫자 배열이 들어가도록 보장합니다.
    4) 차트 색상 기본 맵을 제공하여 KPI별 시각적 구분을 쉽게 합니다.
    5) 컴포넌트 내에 상세 한국어 주석을 추가하여 유지보수성을 높였습니다.

  - 설치 필요: 프로젝트에 chart.js 설치 필요 (`npm i chart.js`).
*/

import { ref, watch, onMounted, onBeforeUnmount, onActivated, onDeactivated, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import { formatCurrency, formatPercent, formatCount, safeNumber } from '@/utils/formatters'
Chart.register(...registerables)

const props = defineProps({ widget: { type: Object, required: true }, period: { type: String, default: null }})
const chartEl = ref(null)
let chartInstance = null

/*
  normalizeWidget:
  - widget에서 labels와 series를 안전하게 추출
  - series가 객체 배열인 경우 첫번째 시리즈의 data를 사용
  - rawData(원본값)과 numericData(차트에 사용할 숫자) 둘 다 반환
*/
function normalizeWidget(widget){
  // 우선 백엔드에서 labels가 제공되면 사용
  let labels = Array.isArray(widget?.labels) ? widget.labels : []
  const seriesArr = Array.isArray(widget?.series) ? widget.series : []
  const rawData = (seriesArr.length > 0 && Array.isArray(seriesArr[0].data)) ? seriesArr[0].data : []
  // 숫자 변환: API에서 문자열('1,234.00') 등으로 올 수 있으므로 safeNumber로 정규화
  const numericData = rawData.map(d => safeNumber(d))

  // 레이블이 없고 period가 연도(YYYY) 형태면 월 레이블(1월..12월)을 자동 생성
  if ((!labels || labels.length === 0) && props.period && /^\d{4}$/.test(props.period)){
    labels = Array.from({ length: 12 }, (_, i) => `${i+1}월`)
    // 데이터가 없으면 월별 값이 아직 없음을 명확히 하기 위해 null 배열(Chart.js는 null을 gap으로 렌더링)
    if (!numericData || numericData.length === 0) {
      // 월 12개에 대응하는 null 값 생성
      const nulls = Array.from({ length: 12 }, () => null)
      return { labels, rawData: nulls, numericData: nulls }
    }
  }

  // targetValue만 있는 경우에도 목표선 렌더링을 허용하기 위해 최소 라벨/데이터(단일 포인트)를 생성
  if ((!labels || labels.length === 0) && (!numericData || numericData.length === 0) && widget && widget.targetValue !== undefined && widget.targetValue !== null) {
    const nulls = [null]
    labels = ['목표']
    return { labels, rawData: nulls, numericData: nulls }
  }

  return { labels, rawData, numericData }
}

// computed: 데이터 유무 판단 (모든 값이 null 또는 비어있으면 false)
const hasData = computed(() => {
  const { numericData } = normalizeWidget(props.widget)
  const hasSeriesData = numericData && numericData.length > 0 && numericData.some(v => v !== null && !Number.isNaN(v))
  const tv = (props.widget && props.widget.targetValue !== undefined && props.widget.targetValue !== null) ? safeNumber(props.widget.targetValue) : NaN
  const hasTarget = !Number.isNaN(tv)
  // cumulative widget인 경우, 사용자가 원본 모드를 선택하면 target만으로는 차트를 렌더링하지 않음
  if (isCumulativeWidget(props.widget) && !cumulativeMode.value) {
    return hasSeriesData
  }
  return hasSeriesData || hasTarget
})

/*
  selectFormatter:
  - widgetKey 또는 title을 분석해 적절한 포맷터 반환
  - ADR/PRICE 계열은 통화, RATE/OCCUPANCY 계열은 퍼센트, 그 외는 건수 포맷
*/
function selectFormatter(widget){
  const k = (widget?.widgetKey || '').toString().toUpperCase()
  const t = (widget?.title || '').toString()
  if (k.includes('ADR') || k.includes('PRICE')) return formatCurrency
  if (k.includes('RATE') || k.includes('OCCUPANCY') || t.includes('%')) return formatPercent
  return formatCount
}

/*
  colorMap: KPI별 기본 선 색상 매핑
  - 필요시 프로젝트 디자인 가이드에 따라 색상을 조정하세요.
*/
const colorMap = {
  CHECKIN: '#06b6d4', // cyan
  CHECKOUT: '#3b82f6', // blue
  ADR: '#f97316', // orange
  OCCUPANCY: '#ef4444', // red
}

function pickColor(widget){
  const k = (widget?.widgetKey || '').toString().toUpperCase()
  if (k.includes('CHECKIN')) return colorMap.CHECKIN
  if (k.includes('CHECKOUT')) return colorMap.CHECKOUT
  if (k.includes('ADR') || k.includes('PRICE')) return colorMap.ADR
  if (k.includes('OCCUPANCY') || k.includes('RATE')) return colorMap.OCCUPANCY
  return '#3b82f6' // 기본 파랑
}

// 단위 텍스트 결정: 툴팁/타이틀 옆에 표시할 단위(예: '회', '원', '%')
function pickUnitText(widget){
  const k = (widget?.widgetKey || '').toString().toUpperCase()
  if (k.includes('ADR') || k.includes('PRICE')) return '원'
  if (k.includes('RATE') || k.includes('OCCUPANCY') || (widget?.title || '').includes('%')) return '%'
  return '회'
}

// CHECKIN/CHECKOUT 계열은 누적(누적합)으로 표시하여 목표 달성 여부 시각화
function isCumulativeWidget(widget){
  const k = (widget?.widgetKey || '').toString().toUpperCase()
  return k.includes('CHECKIN') || k.includes('CHECKOUT')
}

function buildConfig(widget){
  const { labels: rawLabels, rawData, numericData } = normalizeWidget(widget)
  let labels = Array.isArray(rawLabels) ? rawLabels.slice() : []
  const formatter = selectFormatter(widget)
  const color = pickColor(widget)
  const unitText = pickUnitText(widget)

  // If no labels but target exists, provide a minimal single label so the goal line can render
  const targetNum = (widget && (widget.targetValue !== undefined && widget.targetValue !== null)) ? safeNumber(widget.targetValue) : null
  if ((!labels || labels.length === 0) && (targetNum !== null && !Number.isNaN(targetNum))) {
    labels = ['']
  }

  // Decide displayed numeric series: 원본 numericData 또는 누적합
  let displayData = Array.isArray(numericData) ? numericData.slice() : []
  if (isCumulativeWidget(widget) && cumulativeMode.value){
    // 누적 모드일 때만 누적합 계산 (원본 모드면 원본 데이터 유지)
    let sum = 0
    displayData = displayData.map(v => {
      const val = (v === null || Number.isNaN(v)) ? 0 : v
      sum += val
      return sum
    })
    if ((!displayData || displayData.length === 0) && (targetNum !== null && !Number.isNaN(targetNum))) displayData = [0]
  }

  // build main dataset
  const datasets = [
    {
      label: widget?.title || '',
      data: displayData,
      fill: false,
      borderColor: color,
      backgroundColor: color,
      tension: 0.35,
      pointRadius: 0,
      borderWidth: 2,
      spanGaps: true
    }
  ]

  // add target/goal dataset if provided: render as dashed horizontal line
  const shouldShowTarget = (targetNum !== null && !Number.isNaN(targetNum)) && (!isCumulativeWidget(widget) || cumulativeMode.value)
  if (shouldShowTarget){
    // create goal data array matching labels length
    const goalData = Array.from({ length: labels.length }, () => targetNum)
    datasets.push({
      label: '목표',
      data: goalData,
      fill: false,
      borderColor: '#10b981', // green for goal
      backgroundColor: '#10b981',
      borderDash: [6,4],
      pointRadius: 0,
      borderWidth: 1.5,
      tension: 0,
      spanGaps: true,
      // custom flag to identify goal dataset in callbacks
      isGoal: true
    })
  }

  // 원본 렌더링인 경우(max/min marker 표시)
  const isOriginalView = !(isCumulativeWidget(widget) && cumulativeMode.value)
  if (isOriginalView) {
    try {
      const vals = Array.isArray(numericData) ? numericData.slice() : []
      let minVal = Infinity, maxVal = -Infinity, minIdx = -1, maxIdx = -1
      for (let i = 0; i < vals.length; i++) {
        const v = vals[i]
        if (v === null || Number.isNaN(v)) continue
        if (v > maxVal) { maxVal = v; maxIdx = i }
        if (v < minVal) { minVal = v; minIdx = i }
      }
      const len = Math.max(labels.length, vals.length)
      if (maxIdx >= 0) {
        const maxArr = new Array(len).fill(null)
        maxArr[maxIdx] = maxVal
        datasets.push({
          label: '최대',
          data: maxArr,
          fill: false,
          showLine: false,
          pointRadius: 6,
          pointHoverRadius: 8,
          backgroundColor: '#f59e0b',
          borderColor: '#f59e0b',
          spanGaps: true,
          order: 2,
          showValue: true,
          valueColor: '#f59e0b'
        })
      }
      if (minIdx >= 0 && minIdx !== maxIdx) {
        const minArr = new Array(len).fill(null)
        minArr[minIdx] = minVal
        datasets.push({
          label: '최소',
          data: minArr,
          fill: false,
          showLine: false,
          pointRadius: 6,
          pointHoverRadius: 8,
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          spanGaps: true,
          order: 2,
          showValue: true,
          valueColor: '#10b981'
        })
      }
    } catch (e) { /* ignore marker errors */ }
  }

  const markerValuePlugin = {
    id: 'markerValuePlugin',
    afterDatasetsDraw: (chart) => {
      try {
        const ctx = chart.ctx
        chart.data.datasets.forEach((ds, dsIndex) => {
          if (!ds.showValue) return
          const meta = chart.getDatasetMeta(dsIndex)
          meta.data.forEach((el, idx) => {
            const v = ds.data[idx]
            if (v === null || v === undefined) return
            const pos = el.getProps ? el.getProps(['x','y'], true) : { x: el.x, y: el.y }
            const x = pos.x
            const y = pos.y
            ctx.save()
            ctx.fillStyle = ds.valueColor || ds.borderColor || '#000'
            ctx.font = '12px sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            let text = String(v)
            try { if (typeof formatter === 'function') text = formatter(v) } catch (e) {}
            ctx.fillText(text, x + 8, y)
            ctx.restore()
          })
        })
      } catch (e) { /* ignore drawing errors */ }
    }
  }

  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    plugins: [markerValuePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // zoom/pan 설정: 휠(마우스)/핀치(터치)로 확대/축소, 드래그로 pan
      plugins: {
        // 데이터 라벨 표시를 명시적으로 비활성화하여 각 포인트 위에 숫자가 렌더링되는 것을 방지
        datalabels: { display: false },
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
            // drag-based brush (background 표시) - dragEnabled 값에 따라 활성화
            drag: { enabled: !!dragEnabled.value, backgroundColor: 'rgba(0,0,0,0.08)' }
          },
          pan: { enabled: true, mode: 'x' }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context){
              const ds = context.dataset || {}
              // Chart.js에서 표시되는 값은 parsed.y에 있음
              const val = (context.parsed && context.parsed.y !== undefined) ? context.parsed.y : context.raw
              try{
                if (ds.isGoal) {
                  return '목표: ' + formatter(val)
                }
                // 누적 차트는 누적된 값을 보여주므로 label에 명시
                return `${ds.label}: ${formatter(val)}`
              }catch(e){ return String(val) }
            }
          }
        }
      },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { display: true },
        y: {
          display: true,
          ticks: {
            // Y축 눈금 포맷: formatter를 사용
            callback: function(value){
              try{ return selectFormatter(widget)(value) }catch(e){ return String(value) }
            }
          }
        }
      }
    }
  }
}

/*
  renderChart:
  - 기존 인스턴스가 있으면 데이터/옵션을 교체하고 update(), 없으면 새로 생성
  - numericData에 NaN이 포함되어 있을 경우 Chart.js가 처리할 수 있도록 그대로 전달(툴팁에서 포맷 시도)
*/
function renderChart(){
  if (!chartEl.value) return
  if (!hasData.value) {
    // 데이터 없음: 기존 차트가 있으면 제거
    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
    return
  }
  const ctx = chartEl.value.getContext('2d')
  const cfg = buildConfig(props.widget)
  if (chartInstance) {
    chartInstance.data.labels = cfg.data.labels
    chartInstance.data.datasets = cfg.data.datasets
    chartInstance.options = cfg.options
    chartInstance.update()
  } else {
    chartInstance = new Chart(ctx, cfg)
  }
  // 렌더 이후 canvas cursor 상태 반영
  if (chartEl.value) chartEl.value.style.cursor = dragEnabled.value ? 'crosshair' : 'default'
}

onMounted(()=>{
  try{ if (props.widget) loadSavedMode(props.widget) }catch(e){}
  try{ renderChart() }catch(e){ console.warn('TimeSeriesChart mount render failed', e) }
})

onActivated(() => {
  try { renderChart() } catch (e) { console.warn('TimeSeriesChart activated render failed', e) }
})

onDeactivated(() => {
  if (chartInstance) {
    try { chartInstance.destroy() } catch (e) { /* ignore */ }
    chartInstance = null
  }
})

watch(() => props.widget, (w) => {
  try{
    // 위젯이 변경되면 로컬 저장된 모드를 불러오고 차트를 갱신
    try{ loadSavedMode(w) }catch(e){}
    renderChart()
  }catch(e){ console.warn('TimeSeriesChart render failed', e) }
}, { deep: true })

import zoomPlugin from 'chartjs-plugin-zoom'
Chart.register(zoomPlugin)

import { onMounted as onMount } from 'vue'

const menuOpen = ref(false)
const dragEnabled = ref(false)
// cumulativeMode: 체크인/체크아웃에 대해 사용자가 원본/누적 모드를 선택하도록 함
const cumulativeMode = ref(false)

function storageKeyForWidget(widget){
  const id = (widget && (widget.widgetKey || widget.id || widget.title)) ? (widget.widgetKey || widget.id || widget.title) : 'default'
  return `opstc_mode_${String(id)}`
}

function setCumulativeMode(v){
  cumulativeMode.value = !!v
  try{ localStorage.setItem(storageKeyForWidget(props.widget), cumulativeMode.value ? '1' : '0') }catch(e){}
  // 토글시 차트 즉시 갱신
  try{ renderChart() }catch(e){ console.warn('setCumulativeMode render failed', e) }
}

function loadSavedMode(widget){
  try{
    const v = localStorage.getItem(storageKeyForWidget(widget))
    if (v !== null) cumulativeMode.value = v === '1'
  }catch(e){}
}

// 모드 적용된 export용 시리즈 생성 함수
function getDisplaySeriesForExport(widget){
  const { labels, rawData, numericData } = normalizeWidget(widget)
  let displayData = Array.isArray(numericData) ? numericData.slice() : []
  if (isCumulativeWidget(widget) && cumulativeMode.value){
    let sum = 0
    displayData = displayData.map(v => { const val = (v === null || Number.isNaN(v)) ? 0 : v; sum += val; return sum })
    if ((!displayData || displayData.length === 0) && (widget && widget.targetValue !== undefined && widget.targetValue !== null)) displayData = [0]
  }
  return { labels, rawData, numericData, displayData }
}

// 안전한 CSV 다운로드: header 컬럼과 행 길이 정렬
function downloadCSV(){
  try{
    const { labels, rawData, numericData, displayData } = getDisplaySeriesForExport(props.widget)
    // 헤더: label, raw, value
    const header = ['label','raw','value']
    const rows = []
    const n = Math.max((labels||[]).length, (displayData||[]).length, (rawData||[]).length)
    for (let i=0;i<n;i++){
      const lab = (labels && labels[i] !== undefined) ? labels[i] : ''
      const raw = (rawData && rawData[i] !== undefined) ? rawData[i] : ''
      const val = (displayData && displayData[i] !== undefined) ? displayData[i] : (numericData && numericData[i] !== undefined ? numericData[i] : '')
      // 이스케이프 따옴표
      rows.push([`"${String(lab).replace(/"/g,'""') }"`, raw === null ? '' : String(raw), val === null ? '' : String(val)])
    }
    const csvContent = [header.join(','), ...rows.map(r=>r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // CSV 파일명에 모드(원본/누적)를 포함
    const modeSuffix = isCumulativeWidget(props.widget) ? (cumulativeMode.value ? '_누적' : '_원본') : ''
    const baseName = (props.widget && (props.widget.widgetKey || props.widget.title)) ? (props.widget.widgetKey||props.widget.title).toString().replace(/\s+/g,'_') : 'chart'
    const name = `${baseName}${modeSuffix}.csv`
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }catch(e){ console.warn('downloadCSV failed', e) }
}

function downloadImage(){
  if (!chartInstance) return
  try{
    const url = chartInstance.toBase64Image()
    const a = document.createElement('a')
    a.href = url
    const name = (props.widget && (props.widget.widgetKey || props.widget.title)) ? `${(props.widget.widgetKey||props.widget.title).toString().replace(/\s+/g,'_')}.png` : 'chart.png'
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }catch(e){ console.warn('downloadImage failed', e) }
}

function onDownloadCSV(){ menuOpen.value = false; downloadCSV() }
function onDownloadImage(){ menuOpen.value = false; downloadImage() }

function toggleBrush(){
  // 브러시(드래그) 모드 토글: 옵션을 확실히 반영하기 위해 차트를 재생성합니다.
  dragEnabled.value = !dragEnabled.value
  try{
    if (chartInstance) {
      chartInstance.destroy()
      chartInstance = null
    }
    // 메뉴 닫기
    menuOpen.value = false
    // 재렌더링
    renderChart()
    // canvas cursor 반영
    if (chartEl.value) {
      chartEl.value.style.cursor = dragEnabled.value ? 'crosshair' : 'default'
    }
  }catch(e){ console.warn('toggleBrush failed', e) }
}

function resetZoom(){
  try{
    if (chartInstance && typeof chartInstance.resetZoom === 'function') { chartInstance.resetZoom() }
    else if (chartInstance) { setCategoryRange(0, (chartInstance.data.labels||[]).length - 1) }
  }catch(e){ console.warn('resetZoom failed', e) }
}
</script>

<style scoped>
.card { position:relative; padding:12px; border:1px solid #eee; border-radius:8px; background:#fff }
.more-menu { position:absolute; top:10px; right:10px; display:flex; gap:6px; align-items:center }
.mode-switch { display:flex; border-radius:6px; overflow:hidden; border:1px solid #e5e7eb }
.mode-btn { padding:6px 8px; background:#fff; border:none; cursor:pointer }
.mode-btn.active { background:#f3f4f6 }
.reset-btn, .brush-toggle, .toolbar-btn { padding:6px 8px; border-radius:6px; border:1px solid #e5e7eb; background:#fff; cursor:pointer }
.card-title { font-weight:700; margin-bottom:8px; font-size:14px }
.empty-state { padding:24px; color:#9ca3af; text-align:center }
</style>