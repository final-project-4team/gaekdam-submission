<template>
  <div class="card" ref="cardEl">
    <div class="more-menu">
      <div v-if="isCumulativeWidget(widget)" class="mode-switch">
        <button class="mode-btn" :class="{ active: !cumulativeMode }" @click.stop="setCumulativeMode(false)">원본</button>
        <button class="mode-btn" :class="{ active: cumulativeMode }" @click.stop="setCumulativeMode(true)">누적+목표</button>
      </div>
      <button class="reset-btn" title="원래 보기로" @click.stop="resetZoom">↺</button>
      <button class="brush-toggle" :class="{ active: dragEnabled }" @click.stop="toggleBrush" :title="dragEnabled ? '브러시 끄기' : '브러시 켜기'">⊞</button>
      <button class="toolbar-btn" @click.stop="onDownloadCSV">CSV</button>
      <button class="toolbar-btn" @click.stop="onDownloadImage">PNG</button>
    </div>

    <div class="card-title">{{ widget.title }} <span v-if="pickUnitText(widget)">({{ pickUnitText(widget) }})</span></div>
    <div v-if="hasData">
      <canvas ref="chartEl" style="height:220px; width:100%"></canvas>
    </div>
    <div v-else class="empty-state">데이터 없음</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, onActivated, onDeactivated, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import { formatCount, safeNumber } from '@/utils/formatters'

Chart.register(...registerables)
Chart.register(zoomPlugin)

const props = defineProps({ widget: { type: Object, required: true }, period: { type: String, default: null }})

const chartEl = ref(null)
let chartInstance = null

const menuOpen = ref(false)
const dragEnabled = ref(false)
const cumulativeMode = ref(false)

// 데이터 정규화: labels, rawData, numericData 반환
function normalizeWidget(widget) {
  const labels = Array.isArray(widget?.labels) ? widget.labels.slice() : []
  const seriesArr = Array.isArray(widget?.series) ? widget.series : []
  const rawData = (seriesArr.length > 0 && Array.isArray(seriesArr[0].data)) ? seriesArr[0].data.slice() : []
  const numericData = rawData.map(d => safeNumber(d))

  if (labels.length === 0 && props.period && /^\d{4}$/.test(props.period)) {
    const generated = []
    for (let i = 1; i <= 12; i++) generated.push(String(i) + '월')
    if (!numericData || numericData.length === 0) {
      const nulls = Array.from({ length: 12 }, () => null)
      return { labels: generated, rawData: nulls, numericData: nulls }
    }
    return { labels: generated, rawData, numericData }
  }

  if (labels.length === 0 && (!numericData || numericData.length === 0) && widget && widget.targetValue !== undefined && widget.targetValue !== null) {
    return { labels: ['목표'], rawData: [null], numericData: [null] }
  }

  return { labels, rawData, numericData }
}

const hasData = computed(() => {
  const { numericData } = normalizeWidget(props.widget)
  const hasSeriesData = Array.isArray(numericData) && numericData.length > 0 && numericData.some(v => v !== null && !Number.isNaN(v))
  const tv = (props.widget && props.widget.targetValue !== undefined && props.widget.targetValue !== null) ? safeNumber(props.widget.targetValue) : NaN
  const hasTarget = !Number.isNaN(tv)
  // CX cumulative widgets: when user selects 원본, only render if series data exists
  if (isCumulativeWidget(props.widget) && !cumulativeMode.value) return hasSeriesData
  return hasSeriesData || hasTarget
})

// CX는 두 개의 MetricKey만 지원
const ALLOWED_KEYS = ['TOTAL_INQUIRY_COUNT', 'CLAIM_COUNT']
function selectFormatter(widget) {
  const key = (widget?.widgetKey || '').toString().toUpperCase()
  if (ALLOWED_KEYS.includes(key)) return formatCount
  return formatCount
}

const colorMap = { TOTAL_INQUIRY_COUNT: '#3b82f6', CLAIM_COUNT: '#ef4444' }
function pickColor(widget) {
  const k = (widget?.widgetKey || '').toString().toUpperCase()
  if (k.indexOf('TOTAL_INQUIRY_COUNT') !== -1) return colorMap.TOTAL_INQUIRY_COUNT
  if (k.indexOf('CLAIM_COUNT') !== -1) return colorMap.CLAIM_COUNT
  return '#3b82f6'
}

// 단위 텍스트: widget 파라미터를 허용하도록 수정
function pickUnitText(widget) { return '회' }

// CX에서 누적(누적합) 뷰를 허용할 지 결정
function isCumulativeWidget(widget) {
  const k = (widget?.widgetKey || '').toString().toUpperCase()
  // allow cumulative toggle for inquiry/claim counts
  return ALLOWED_KEYS.includes(k)
}

function buildConfig(widget) {
  const { labels: rawLabels, rawData, numericData } = normalizeWidget(widget)
  const labels = Array.isArray(rawLabels) ? rawLabels.slice() : []
  const formatter = selectFormatter(widget)
  const color = pickColor(widget)

  const targetNum = (widget && widget.targetValue !== undefined && widget.targetValue !== null) ? safeNumber(widget.targetValue) : null
  let displayData = Array.isArray(numericData) ? numericData.slice() : []

  // 누적 모드일 때 누적합 계산
  if (isCumulativeWidget(widget) && cumulativeMode.value) {
    let sum = 0
    displayData = displayData.map(v => {
      const val = (v === null || Number.isNaN(v)) ? 0 : v
      sum += val
      return sum
    })
    if ((!displayData || displayData.length === 0) && (targetNum !== null && !Number.isNaN(targetNum))) displayData = [0]
  }

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

  // 목표선: 누적 위젯은 누적 모드에서만 목표선 표시
  const shouldShowTarget = (targetNum !== null && !Number.isNaN(targetNum)) && (!isCumulativeWidget(widget) || cumulativeMode.value)
  if (shouldShowTarget) {
    const goalData = new Array(labels.length || 1).fill(targetNum)
    datasets.push({
      label: '목표',
      data: goalData,
      fill: false,
      borderColor: '#10b981',
      backgroundColor: '#10b981',
      borderDash: [6, 4],
      pointRadius: 0,
      borderWidth: 1.5,
      tension: 0,
      spanGaps: true,
      isGoal: true
    })
  }

  // 원본 렌더링인 경우 (누적 모드가 아닐 때) 최대/최소 포인트에 마커 표시
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

  // custom plugin to draw value labels next to marker points
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
            // use formatter if available
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
    data: { labels: labels, datasets: datasets },
    plugins: [markerValuePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        datalabels: { display: false },
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
            drag: { enabled: !!dragEnabled.value, backgroundColor: 'rgba(0,0,0,0.08)' }
          },
          pan: { enabled: true, mode: 'x' }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function (context) {
              const ds = context.dataset || {}
              const val = (context.parsed && context.parsed.y !== undefined) ? context.parsed.y : context.raw
              try {
                if (ds.isGoal) return '목표: ' + formatter(val)
                return (ds.label || '') + ': ' + formatter(val)
              } catch (e) {
                return String(val)
              }
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
            callback: function (value) {
              try { return selectFormatter(widget)(value) } catch (e) { return String(value) }
            }
          }
        }
      }
    }
  }
}

function renderChart() {
  if (!chartEl.value) return
  if (!hasData.value) {
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
  if (chartEl.value) chartEl.value.style.cursor = dragEnabled.value ? 'crosshair' : 'default'
}

onMounted(() => {
  try { if (props.widget) loadSavedMode(props.widget) } catch (e) {}
  try { renderChart() } catch (e) { console.warn('CXTimeSeriesChart mount render failed', e) }
})

// When used with <keep-alive>, Vue calls activated/deactivated instead of mount/unmount.
onActivated(() => {
  try { renderChart() } catch (e) { console.warn('CXTimeSeriesChart activated render failed', e) }
})

onDeactivated(() => {
  if (chartInstance) {
    try { chartInstance.destroy() } catch (e) { /* ignore */ }
    chartInstance = null
  }
})

 watch(() => props.widget, (w) => { try { loadSavedMode(w) } catch (e) {} renderChart() }, { deep: true })

function storageKeyForWidget(widget) {
  const id = (widget && (widget.widgetKey || widget.id || widget.title)) ? (widget.widgetKey || widget.id || widget.title) : 'default'
  return 'cxtc_mode_' + String(id)
}

function setCumulativeMode(v) {
  cumulativeMode.value = !!v
  try { localStorage.setItem(storageKeyForWidget(props.widget), cumulativeMode.value ? '1' : '0') } catch (e) {}
  try { renderChart() } catch (e) { console.warn('setCumulativeMode render failed', e) }
}

function loadSavedMode(widget) {
  try {
    const v = localStorage.getItem(storageKeyForWidget(widget))
    if (v !== null) cumulativeMode.value = v === '1'
  } catch (e) {}
}

function getDisplaySeriesForExport(widget) {
  const { labels, rawData, numericData } = normalizeWidget(widget)
  let displayData = Array.isArray(numericData) ? numericData.slice() : []
  if (isCumulativeWidget(widget) && cumulativeMode.value) {
    let sum = 0
    displayData = displayData.map(v => { const val = (v === null || Number.isNaN(v)) ? 0 : v; sum += val; return sum })
    if ((!displayData || displayData.length === 0) && (widget && widget.targetValue !== undefined && widget.targetValue !== null)) displayData = [0]
  }
  return { labels, rawData, numericData, displayData }
}

function downloadCSV() {
  try {
    const { labels, rawData, numericData, displayData } = getDisplaySeriesForExport(props.widget)
    const header = ['label', 'raw', 'value']
    const rows = []
    const n = Math.max((labels || []).length, (displayData || []).length, (rawData || []).length)
    for (let i = 0; i < n; i++) {
      const lab = (labels && labels[i] !== undefined) ? labels[i] : ''
      const raw = (rawData && rawData[i] !== undefined) ? rawData[i] : ''
      const val = (displayData && displayData[i] !== undefined) ? displayData[i] : (numericData && numericData[i] !== undefined ? numericData[i] : '')
      // JSON.stringify을 사용하면 라벨에 포함된 따옴표와 특수문자가 안전하게 이스케이프됨
      const escapedLabel = JSON.stringify(lab === null || lab === undefined ? '' : String(lab))
      rows.push([escapedLabel, raw === null || raw === undefined ? '' : String(raw), val === null || val === undefined ? '' : String(val)])
    }
    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const modeSuffix = isCumulativeWidget(props.widget) ? (cumulativeMode.value ? '_누적' : '_원본') : ''
    const baseName = (props.widget && (props.widget.widgetKey || props.widget.title)) ? (props.widget.widgetKey || props.widget.title).toString().replace(/\s+/g, '_') : 'chart'
    const name = baseName + modeSuffix + '.csv'
    a.download = name
    document.body.appendChild(a)
    a.click()
    // revokeObjectURL 전에 링크를 제거
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.warn('downloadCSV failed', e)
  }
}

function downloadImage() {
  if (!chartInstance) return
  try {
    const url = chartInstance.toBase64Image()
    const a = document.createElement('a')
    a.href = url
    const name = (props.widget && (props.widget.widgetKey || props.widget.title)) ? ((props.widget.widgetKey || props.widget.title).toString().replace(/\s+/g, '_') + '.png') : 'chart.png'
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch (e) {
    console.warn('downloadImage failed', e)
  }
}

function onDownloadCSV() { menuOpen.value = false; downloadCSV() }
function onDownloadImage() { menuOpen.value = false; downloadImage() }

function toggleBrush() { dragEnabled.value = !dragEnabled.value; try { renderChart() } catch (e) { console.warn('toggleBrush failed', e) } }

function resetZoom() { try { if (chartInstance && typeof chartInstance.resetZoom === 'function') chartInstance.resetZoom(); } catch (e) {} }

onBeforeUnmount(() => {
  if (chartInstance) {
    try { chartInstance.destroy() } catch (e) {}
    chartInstance = null
  }
})
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
