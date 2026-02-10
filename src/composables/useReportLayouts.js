// useReportLayouts: 리포트 레이아웃 관련 상태와 비동기 작업을 캡슐화한 composable
// - 레이아웃 목록 불러오기, 템플릿 목록 불러오기, 템플릿 위젯 불러오기
// - 레이아웃/템플릿 생성/삭제, 기간 적용 등 뷰에서 사용하는 모든 로직 제공

import { ref, computed } from 'vue'
import { createReportLayout, deleteReportLayout, listReportLayouts, updateReportLayout } from '@/api/report/layoutApi'
import { addLayoutTemplate, deleteLayoutTemplate, listLayoutTemplates, getTemplateWidgets as apiGetTemplateWidgets } from '@/api/report/layoutTemplateApi'
import { useAuthStore } from '@/stores/authStore'

export function useReportLayouts() {
  // 인증(현재 직원 코드 등)이 필요한 경우 사용
  const auth = useAuthStore?.()

  // UI/상태
  const layouts = ref([]) // 레이아웃 목록
  const selectedIndex = ref(0) // 선택된 레이아웃 인덱스
  const selectedTemplateIndex = ref(0) // 선택된 템플릿 인덱스

  // 기간 관련 상태 (뷰에서 바인딩 가능)
  const periodType = ref('연간')
  const currentYear = new Date().getFullYear()
  const years = ref(Array.from({ length: 6 }, (_, i) => String(currentYear - i)))
  const months = ref(Array.from({ length: 12 }, (_, i) => String(i + 1)))
  const selectedYear = ref(String(currentYear))
  const selectedMonth = ref(String(new Date().getMonth() + 1))

  // In-memory cache for template widgets keyed by `${templateId}::${period}`
  // Keeps previously loaded widgets per template+period to allow instant re-render when returning to a template
  const widgetCache = new Map()

  // 계산된 값들
  const currentLayout = computed(() => layouts.value[selectedIndex.value] || { name: '', templates: [] })
  const selectedTemplate = computed(() => {
    const templates = currentLayout.value?.templates || []
    const idx = selectedTemplateIndex.value
    if (typeof idx === 'number' && idx >= 0 && idx < templates.length) return [templates[idx]]
    return []
  })

  function pad(n){ return String(n).padStart(2,'0') }
  // Get period string for current layout (layout-specific defaultFilterJson wins, otherwise fall back to global selectors)
  function getPeriod(){
    const def = currentLayout.value?.defaultFilterJson
    if (def && def.period) return def.period
    const preset = periodType.value === '월간' ? 'MONTH' : 'YEAR'
    return preset === 'MONTH' ? `${selectedYear.value}-${pad(selectedMonth.value)}` : `${selectedYear.value}`
  }

  // Helpers to map layout.defaultFilterJson -> UI values and setters
  function _layoutToUI(layout){
    const def = layout?.defaultFilterJson || {}
    const pt = def.periodType === 'MONTH' ? '월간' : '연간'
    const period = def.period || ''
    let y = String(currentYear)
    let m = String(new Date().getMonth() + 1).padStart(2,'0')
    if (period) {
      const parts = String(period).split('-')
      y = parts[0] || y
      if (parts[1]) m = String(parts[1]).padStart(2,'0')
    }
    return { periodTypeUI: pt, year: y, month: m }
  }

  const currentPeriodType = computed({
    get(){ return _layoutToUI(currentLayout.value).periodTypeUI },
    set(v){
      const layout = currentLayout.value
      if (!layout) return
      const pt = v === '월간' ? 'MONTH' : 'YEAR'
      const ui = _layoutToUI(layout)
      const period = pt === 'MONTH' ? `${ui.year}-${ui.month}` : `${ui.year}`
      if (!layout.defaultFilterJson) layout.defaultFilterJson = {}
      layout.defaultFilterJson.periodType = pt
      layout.defaultFilterJson.period = period
    }
  })

  const currentSelectedYear = computed({
    get(){ return _layoutToUI(currentLayout.value).year },
    set(v){
      const layout = currentLayout.value
      if (!layout) return
      const ui = _layoutToUI(layout)
      const pt = (layout.defaultFilterJson?.periodType === 'MONTH') ? 'MONTH' : (periodType.value === '월간' ? 'MONTH' : 'YEAR')
      const year = String(v)
      const month = ui.month
      const period = pt === 'MONTH' ? `${year}-${month}` : `${year}`
      if (!layout.defaultFilterJson) layout.defaultFilterJson = {}
      layout.defaultFilterJson.periodType = pt
      layout.defaultFilterJson.period = period
    }
  })

  const currentSelectedMonth = computed({
    get(){ return _layoutToUI(currentLayout.value).month },
    set(v){
      const layout = currentLayout.value
      if (!layout) return
      const ui = _layoutToUI(layout)
      const pt = (layout.defaultFilterJson?.periodType === 'MONTH') ? 'MONTH' : (periodType.value === '월간' ? 'MONTH' : 'YEAR')
      const year = ui.year
      const month = String(v).padStart(2,'0')
      const period = pt === 'MONTH' ? `${year}-${month}` : `${year}`
      if (!layout.defaultFilterJson) layout.defaultFilterJson = {}
      layout.defaultFilterJson.periodType = pt
      layout.defaultFilterJson.period = period
    }
  })

  // --- 주요 함수들 ---
  // 1) 레이아웃 목록 조회: 서버에서 레이아웃을 가져와 내부 상태에 설정
  const loadLayouts = async () => {
    const employeeCode = auth?.employeeCode ?? 1
    try {
      const res = await listReportLayouts(employeeCode)
      const data = res?.data?.data || []
      // backend shape에 따라 id/name/templates 추출
      layouts.value = data.map(r => ({ id: r.layoutId ?? r.id, name: r.name, templates: r.templates || [], defaultFilterJson: r.defaultFilterJson ?? (r.dateRangePreset ? { periodType: r.dateRangePreset === 'MONTH' ? 'MONTH' : 'YEAR', period: r.defaultFilterJson?.period || undefined } : undefined) }))

      // merge any locally saved per-layout periods (fallback when server omitted them)
      const saved = loadPeriodsFromStorage()
      for (const l of layouts.value) {
        const key = String(l.id)
        if ((!l.defaultFilterJson || !l.defaultFilterJson.period) && saved[key]) {
          l.defaultFilterJson = saved[key]
        }
      }
      const initial = layouts.value[selectedIndex.value]
      if (initial && initial.id) loadTemplatesForLayout(initial.id, selectedIndex.value)
    } catch (err) {
      console.error('[useReportLayouts] loadLayouts failed', err)
      // 뷰에서 알림을 표시하려면 호출자에서 잡아서 처리
    }
  }

  // 2) 특정 레이아웃의 템플릿 목록 로드
  // - layoutId: 서버에 요청할 id
  // - index: 로컬 layouts 배열의 인덱스 (있으면 해당 인덱스에 결과를 넣음)
  const loadTemplatesForLayout = async (layoutId, index, desiredTemplateIndex) => {
    try {
      const res = await listLayoutTemplates(layoutId)
      const payload = res?.data?.data
      let items = []
      if (Array.isArray(payload)) items = payload
      else if (payload?.templates && Array.isArray(payload.templates)) items = payload.templates
      else if (payload?.items && Array.isArray(payload.items)) items = payload.items
      else if (payload?.list && Array.isArray(payload.list)) items = payload.list
      else if (payload && typeof payload === 'object') items = [payload]

      // UI에서 사용할 형태로 매핑
      const mapped = items.map(r => ({ id: r.layoutTemplateId ?? r.id ?? (r.templateId ? `${r.templateId}-${Date.now()}` : `${Math.random()}`), templateId: r.templateId, isActive: r.isActive, name: r.templateName }))
      const idx = typeof index === 'number' ? index : layouts.value.findIndex(l => l.id === layoutId)
      if (idx !== -1) {
        layouts.value[idx].templates = mapped
        if (selectedIndex.value === idx) {
          // honor desiredTemplateIndex when provided, otherwise default to 0
          if (typeof desiredTemplateIndex === 'number' && desiredTemplateIndex >= 0 && desiredTemplateIndex < mapped.length) {
            selectedTemplateIndex.value = desiredTemplateIndex
          } else {
            selectedTemplateIndex.value = 0
          }
        }
      }
      if (selectedIndex.value === idx) {
        const chosenIdx = (typeof desiredTemplateIndex === 'number' && desiredTemplateIndex >= 0 && desiredTemplateIndex < mapped.length) ? desiredTemplateIndex : 0
        const tpl = layouts.value[idx].templates[chosenIdx]
        if (tpl) await loadWidgetsForTemplate(tpl)
      }
    } catch (err) {
      console.error('[useReportLayouts] loadTemplatesForLayout failed', err)
    }
  }

  // 3) 템플릿에 포함된 위젯(카드)들 로드
  const makeCacheKey = (templateId, period) => `${templateId}::${period}`

  function invalidateCacheForTemplateId(templateId){
    if (!templateId) return
    for (const k of Array.from(widgetCache.keys())){
      if (k.startsWith(`${templateId}::`)) widgetCache.delete(k)
    }
  }

  function invalidateCacheForLayout(layout){
    if (!layout || !Array.isArray(layout.templates)) return
    for (const tpl of layout.templates){
      const tid = tpl.templateId ?? tpl.id
      if (tid) invalidateCacheForTemplateId(tid)
    }
  }

  const loadWidgetsForTemplate = async (template) => {
    if (!template) return
    const templateId = template.templateId ?? template.id
    if (!templateId) return
    const period = getPeriod()
    const cacheKey = makeCacheKey(templateId, period)

    // Return cached widgets if present
    if (widgetCache.has(cacheKey)) {
      try {
        const cached = widgetCache.get(cacheKey)
        // mutate existing array to preserve reference used by child components
        if (!Array.isArray(template.widgets)) template.widgets = []
        if (Array.isArray(cached)) {
          template.widgets.splice(0, template.widgets.length, ...cached.slice())
        } else {
          template.widgets.splice(0, template.widgets.length)
        }
        // console debug to show cache hit
        console.debug('[useReportLayouts] loadWidgetsForTemplate cache hit', { templateId, period })
        return template.widgets
      } catch (e) { /* fallthrough to fetch on unexpected error */ }
    }

    try {
      const res = await apiGetTemplateWidgets(templateId, period)
      const items = res?.data?.data || []
      console.log('[useReportLayouts] loadWidgetsForTemplate', { templateId, period })
      // sort and attach
      const sorted = Array.isArray(items) ? items.sort((a,b)=> (a.sortOrder||0)-(b.sortOrder||0)) : []
      // mutate existing array (preserve reference) so child components keep stable layout
      if (!Array.isArray(template.widgets)) template.widgets = []
      template.widgets.splice(0, template.widgets.length, ...sorted)
      // cache the result for quick reuse
      try { widgetCache.set(cacheKey, sorted.slice()) } catch(e){ /* ignore cache set errors */ }
      return template.widgets
    } catch (err) {
      console.error('[useReportLayouts] loadWidgetsForTemplate failed', err)
      template.widgets = []
      return template.widgets
    }
  }

  // 4) 레이아웃 생성: payload는 뷰에서 준비된 DTO
  const createLayout = async (payload) => {
    try {
      const res = await createReportLayout(payload)
      const newId = res?.data?.data
      const newLayout = { id: newId ?? `layout-${Date.now()}`, name: payload.name, templates: [], defaultFilterJson: payload.defaultFilterJson }
      // add to local list and select it
      layouts.value.push(newLayout)
      selectedIndex.value = layouts.value.length - 1
      selectedTemplateIndex.value = 0

      // If payload contains templates to apply immediately, add them to the newly created layout.
      if (Array.isArray(payload?.templates) && payload.templates.length) {
        for (const tpl of payload.templates) {
          try {
            // addTemplate will persist and load widgets for the added template
            await addTemplate(selectedIndex.value, { templateId: tpl.templateId, displayName: tpl.displayName, sortOrder: tpl.sortOrder, isActive: tpl.isActive }, auth?.employeeCode ?? 1)
          } catch (err) {
            console.warn('[useReportLayouts] failed to add template during createLayout', err)
          }
        }
      }

      // Ensure layout period is applied/persisted on server and reload widgets for the currently selected template
      try {
        await applyPeriodToLayout(newLayout)
      } catch (err) {
        console.warn('[useReportLayouts] applyPeriodToLayout after createLayout failed', err)
      }

      // If there is at least one template, make sure its widgets are loaded
      const tpl = currentLayout.value?.templates?.[selectedTemplateIndex.value]
      if (tpl) {
        try { await loadWidgetsForTemplate(tpl) } catch (e) { /* ignore */ }
      }

      // persist newly created layout's period locally as well
      try { savePeriodsToStorage() } catch(e){ /* ignore */ }

      return layouts.value[selectedIndex.value]
    } catch (err) {
      console.error('[useReportLayouts] createLayout failed', err)
      throw err
    }
  }

  // 5) 레이아웃 삭제
  const deleteLayout = async (id) => {
    if (!id) return
    try {
      const parsed = Number(id)
      const sendId = Number.isFinite(parsed) ? parsed : id
      await deleteReportLayout(sendId)
      const idx = layouts.value.findIndex(l => l.id === id)
      if (idx !== -1) {
        layouts.value.splice(idx, 1)
        selectedIndex.value = Math.max(0, idx - 1)
      }
    } catch (err) {
      console.error('[useReportLayouts] deleteLayout failed', err)
      throw err
    }
  }

  // 6) 레이아웃의 기본 기간(defaultFilterJson) 적용 (PATCH)
  const applyPeriodToLayout = async (layout) => {
    const target = layout && layout.id ? layout : currentLayout.value
    if (!target || !target.id) return
    const def = target.defaultFilterJson || {}
    const preset = def.periodType === 'MONTH' ? 'MONTH' : (periodType.value === '월간' ? 'MONTH' : 'YEAR')
    const period = def.period || (preset === 'MONTH' ? `${selectedYear.value}-${String(selectedMonth.value).padStart(2,'0')}` : `${selectedYear.value}`)
    const payload = { layoutId: target.id, defaultFilterJson: { periodType: preset, period } }
    try {
      await updateReportLayout(target.id, payload)
      const idx = layouts.value.findIndex(l => l.id === target.id)
      if (idx !== -1) layouts.value[idx].defaultFilterJson = payload.defaultFilterJson
      // persist to local storage as a resilient fallback
      try { savePeriodsToStorage() } catch(e){ /* ignore */ }
      // invalidate cached widgets for this layout because period changed
      try { invalidateCacheForLayout(target) } catch(e){ /* ignore */ }
      const tpl = currentLayout.value?.templates?.[selectedTemplateIndex.value]
      if (tpl) await loadWidgetsForTemplate(tpl)
    } catch (err) {
      console.error('[useReportLayouts] applyPeriodToLayout failed', err)
      throw err
    }
  }

  // 7) 템플릿 추가 (로컬 또는 서버 호출)
  const addTemplate = async (layoutIndex, tplDto, employeeCode) => {
    try {
      const layout = layouts.value[layoutIndex]
      if (!layout || !layout.id) {
        // 서버 저장 대상이 아니면 로컬에 임시 추가
        const copy = { ...tplDto, id: `${tplDto.templateId}-${Date.now()}`, name: tplDto.displayName }
        layouts.value[layoutIndex].templates.push(copy)
        selectedTemplateIndex.value = layouts.value[layoutIndex].templates.length - 1
        return copy
      }
      const sendLayoutId = Number.isFinite(Number(layout.id)) ? Number(layout.id) : layout.id
      const res = await addLayoutTemplate(sendLayoutId, tplDto, employeeCode ?? (auth?.employeeCode ?? 1))
      const newId = res?.data?.data
      const added = { id: newId ?? `${tplDto.templateId}-${Date.now()}`, templateId: tplDto.templateId, displayName: tplDto.displayName, sortOrder: tplDto.sortOrder, isActive: tplDto.isActive, name: tplDto.displayName }
      layouts.value[layoutIndex].templates.push(added)
      selectedTemplateIndex.value = layouts.value[layoutIndex].templates.length - 1
      // 새로 추가한 템플릿의 위젯을 즉시 로드하여 화면에 카드가 표시되도록 함
      try {
        if (added.templateId || added.id) {
          await loadWidgetsForTemplate(added)
        }
      } catch (err) {
        console.warn('[useReportLayouts] loadWidgetsForTemplate after addTemplate failed', err)
      }
      return added
    } catch (err) {
      console.error('[useReportLayouts] addTemplate failed', err)
      throw err
    }
  }

  // 8) 템플릿 삭제 (서버 호출 후 로컬 제거)
  const deleteTemplate = async (layoutIndex, templateIndex) => {
    const templates = layouts.value[layoutIndex]?.templates || []
    if (templateIndex < 0 || templateIndex >= templates.length) return
    const tpl = templates[templateIndex]
    const layout = layouts.value[layoutIndex]
    try {
      if (layout && layout.id && tpl) {
        const sendLayoutId = Number.isFinite(Number(layout.id)) ? Number(layout.id) : layout.id
        const sendTemplateId = tpl.templateId !== undefined ? tpl.templateId : (Number.isFinite(Number(tpl.id)) ? Number(tpl.id) : tpl.id)
        await deleteLayoutTemplate(sendLayoutId, sendTemplateId)
      }
      templates.splice(templateIndex, 1)
      if (templates.length === 0) selectedTemplateIndex.value = 0
      else selectedTemplateIndex.value = Math.max(0, templateIndex - 1)
    } catch (err) {
      console.error('[useReportLayouts] deleteTemplate failed', err)
      throw err
    }
  }

  // helpers: persist per-layout periods to localStorage as a fallback when server doesn't return them
  const STORAGE_KEY = 'report_layout_periods'
  function loadPeriodsFromStorage(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    }catch(e){ return {} }
  }
  function savePeriodsToStorage(){
    try{
      const map = {}
      for (const l of layouts.value) {
        if (l && l.id && l.defaultFilterJson && l.defaultFilterJson.period) {
          map[String(l.id)] = l.defaultFilterJson
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    }catch(e){ console.warn('savePeriodsToStorage failed', e) }
  }

  return {
    layouts,
    selectedIndex,
    selectedTemplateIndex,
    currentLayout,
    selectedTemplate,
    periodType,
    years,
    months,
    selectedYear,
    selectedMonth,
    // per-layout period bindings
    currentPeriodType,
    currentSelectedYear,
    currentSelectedMonth,
    loadLayouts,
    loadTemplatesForLayout,
    loadWidgetsForTemplate,
    createLayout,
    deleteLayout,
    applyPeriodToLayout,
    addTemplate,
    deleteTemplate,
  }
}
