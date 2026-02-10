<template>
  <BaseModal :title="title" v-if="visible" @close="$emit('close')">
    <div class="create-layout-form">
      <!-- simplified rows: each row has fixed label column and flexible control column -->
      <div class="form-grid">
        <div class="form-row">
          <label class="form-label">레이아웃 이름</label>
          <input v-model="name" class="input" placeholder="ex. 2025년 리포트" />
        </div>

        <div class="form-row">
          <label class="form-label">기간 필터</label>
          <div class="period-inline">
            <div class="radio-group">
              <label><input type="radio" value="연간" v-model="periodType" /> 연간</label>
              <label><input type="radio" value="월간" v-model="periodType" /> 월간</label>
            </div>
            <select v-model="selectedYear" class="select compact">
              <option v-for="y in years" :key="y" :value="y">{{ y }}년</option>
            </select>
            <select v-if="periodType === '월간'" v-model="selectedMonth" class="select compact">
              <option v-for="m in months" :key="m" :value="m.padStart(2,'0')">{{ m.padStart(2,'0') }}월</option>
            </select>
          </div>
        </div>
      </div>

      <!-- description full width -->
      <div class="form-row full-width">
        <label class="form-label">내용</label>
        <textarea v-model="description" rows="5" class="textarea" placeholder="리포트에 대한 설명을 입력하세요"></textarea>
      </div>

      <!-- template cards with responsive grid -->
      <div class="form-row full-width templates-section">
        <label class="form-label">템플릿 선택</label>
        <div class="template-cards">
          <div v-for="tpl in templatesWithAll" :key="tpl.templateId" class="tpl-card" :class="{selected: isTplSelected(tpl.templateId)}" @click="toggleTemplate(tpl.templateId)">
            <div class="tpl-name">{{ tpl.displayName || tpl.name || tpl.templateName }}</div>
            <div class="tpl-badge" v-if="isTplSelected(tpl.templateId)">✓</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton @press="handleClose">취소</BaseButton>
      <BaseButton type="primary" @press="handleCreate" style="margin-left:8px">생성</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
/**
 * CreateLayoutModal.vue
 * - 목적: 새로운 레이아웃을 생성하기 위한 모달 컴포넌트 (presentation)
 * - props:
 *    - visible: Boolean - 모달 표시 여부
 *    - title: String - 모달 제목 (기본값: '레이아웃 추가')
 *    - initial: Object - 초기값(편집 시 사용 가능)
 * - emits:
 *    - create(payload): 생성 버튼 클릭 시 입력된 내용을 payload로 부모에게 전달
 *    - close(): 모달 닫기 요청 시 발생
 * - 비고:
 *    - 조회 권한 선택은 제거되어, 부모(ReportLayoutView)에서 생성 시 기본 조회 권한을 'PRIVATE'으로 강제합니다.
 */
import BaseButton from '@/components/common/button/BaseButton.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import { defineProps, ref, watch, defineEmits, computed } from 'vue'

const props = defineProps({ visible: Boolean, title: { type: String, default: '레이아웃 생성' }, initial: Object, templates: { type: Array, default: () => [] } })
const emit = defineEmits(['create', 'close'])

const now = new Date()
const currentYear = now.getFullYear()
const years = Array.from({ length: 6 }, (_, i) => String(currentYear - i))
const months = Array.from({ length: 12 }, (_, i) => String(i + 1))

const name = ref(props.initial?.name || '')
const description = ref(props.initial?.description || '')
const periodType = ref(props.initial?.defaultFilterJson?.periodType === 'MONTH' ? '월간' : (props.initial?.dateRangePreset === 'MONTH' ? '월간' : '연간'))
const selectedYear = ref(props.initial?.defaultFilterJson?.period ? String(props.initial.defaultFilterJson.period).split('-')[0] : String(currentYear))
const selectedMonth = ref(props.initial?.defaultFilterJson?.period ? (String(props.initial.defaultFilterJson.period).split('-')[1] || String(now.getMonth()+1)).padStart(2,'0') : String(now.getMonth()+1).padStart(2,'0'))

const selectedTemplateIds = ref([])

watch(() => props.initial, (v) => {
  name.value = v?.name || ''
  description.value = v?.description || ''
})

watch(() => props.visible, (visible) => {
  if (visible) {
    name.value = props.initial?.name || ''
    description.value = props.initial?.description || ''
    // reset selections to initial or defaults
    periodType.value = props.initial?.defaultFilterJson?.periodType === 'MONTH' ? '월간' : (props.initial?.dateRangePreset === 'MONTH' ? '월간' : '연간')
    selectedYear.value = props.initial?.defaultFilterJson?.period ? String(props.initial.defaultFilterJson.period).split('-')[0] : String(currentYear)
    selectedMonth.value = props.initial?.defaultFilterJson?.period ? (String(props.initial.defaultFilterJson.period).split('-')[1] || String(now.getMonth()+1)).padStart(2,'0') : String(now.getMonth()+1).padStart(2,'0')
    selectedTemplateIds.value = []
  }
})

const templatesToShow = computed(() => props.templates && props.templates.length ? props.templates : [
  { templateId: 1, displayName: '전체 요약 템플릿' },
  { templateId: 2, displayName: '객실운영 요약 템플릿' },
  { templateId: 3, displayName: '고객현황 요약 템플릿' },
  { templateId: 4, displayName: '고객경험 요약 템플릿' },
  { templateId: 5, displayName: '예약및매출 요약 템플릿' }
])

// Add explicit baseTemplates and include an "ALL" card at the top for quick-select
const baseTemplates = computed(() => props.templates && props.templates.length ? props.templates : [
  { templateId: 1, displayName: '전체 요약 템플릿' },
  { templateId: 2, displayName: '객실운영 요약 템플릿' },
  { templateId: 3, displayName: '고객현황 요약 템플릿' },
  { templateId: 4, displayName: '고객경험 요약 템플릿' },
  { templateId: 5, displayName: '예약및매출 요약 템플릿' }
])

const templatesWithAll = computed(() => {
  const allCard = { templateId: 'ALL', displayName: '전체 템플릿(5종) 선택' }
  return [allCard, ...baseTemplates.value]
})

// expose templatesWithAll to template usage (replace templatesToShow usage)

function isTplSelected(id){
  if (id === 'ALL') {
    // ALL considered selected when every base template is selected
    const base = baseTemplates.value || []
    if (!base.length) return false
    return base.every(t => selectedTemplateIds.value.includes(t.templateId))
  }
  return selectedTemplateIds.value.includes(id)
}

function toggleTemplate(id){
  if (id === 'ALL') {
    const base = baseTemplates.value || []
    const allSelected = base.length > 0 && base.every(t => selectedTemplateIds.value.includes(t.templateId))
    if (allSelected) {
      selectedTemplateIds.value = []
    } else {
      selectedTemplateIds.value = base.map(t => t.templateId)
    }
    return
  }
  const idx = selectedTemplateIds.value.indexOf(id)
  if (idx === -1) selectedTemplateIds.value.push(id)
  else selectedTemplateIds.value.splice(idx, 1)
}

function handleClose(){
  emit('close')
  // clear inputs so next open shows placeholders
  name.value = ''
  description.value = ''
  selectedTemplateIds.value = []
}

function handleCreate(){
  // visibilityScope는 부모에서 강제로 'PRIVATE'으로 설정하여
  // 생성된 레이아웃이 기본적으로 만든 사람만 볼 수 있도록 처리합니다.
  const preset = periodType.value === '월간' ? 'MONTH' : 'YEAR'
  const period = preset === 'MONTH' ? `${selectedYear.value}-${String(selectedMonth.value).padStart(2,'0')}` : `${selectedYear.value}`
  const templatesPayload = selectedTemplateIds.value.map((id, idx) => {
    const tpl = templatesToShow.value.find(t => t.templateId === id) || {}
    return { templateId: id, displayName: tpl.displayName || tpl.name || tpl.templateName || String(id), sortOrder: idx + 1, isActive: true }
  })

  const payload = {
    name: name.value,
    description: description.value,
    dateRangePreset: preset,
    defaultFilterJson: { periodType: preset, period },
    templates: templatesPayload
  }
  emit('create', payload)

  // reset
  name.value = ''
  description.value = ''
  selectedTemplateIds.value = []
}
</script>

<style scoped>
.create-layout-form { display:flex; flex-direction:column; gap:12px; min-width:520px; padding:8px }
.form-grid { display:flex; flex-direction:column; gap:8px }
.form-row { display:grid; grid-template-columns:130px 1fr; align-items:center }
.form-label { padding:8px 4px; color:#374151; font-weight:600 }
.input { width:100%; padding:10px 12px; border:1px solid #eef2f6; border-radius:8px; font-size:14px }
.textarea { width:100%; padding:12px; border:1px solid #eef2f6; border-radius:8px; font-size:14px; resize:vertical }
.radio-group { display:flex; gap:12px; align-items:center }
.radio-group label { display:flex; gap:6px; align-items:center; font-weight:500 }
.period-inline { display:flex; gap:8px; align-items:center }
.select { padding:8px 10px; border:1px solid #eef2f6; border-radius:6px; background:white }
.select.compact { padding:6px 8px; min-width:92px }

/* Template cards: simpler single row grid */
.templates-section .template-cards { display:flex; gap:10px; flex-wrap:wrap }
.tpl-card { border:1px solid #eef2f6; padding:10px 14px; border-radius:8px; display:flex; gap:8px; align-items:center; cursor:pointer; background:white }
.tpl-card.selected { border-color:#2563eb; background:#f8fbff }
.tpl-name { font-weight:600 }
.tpl-badge { background:#2563eb; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-weight:700 }

@media (max-width:720px){
  .form-row { grid-template-columns: 110px 1fr }
  .create-layout-form { min-width:320px }
}
</style>
