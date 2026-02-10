<template>
  <div class="objective-page">
    <div class="page-header">
      <div class="filters">
        <select v-model="periodType" class="select-period">
          <option value="YEAR">연간</option>
          <option value="MONTH">월간</option>
        </select>

        <select v-if="periodType === 'YEAR'" v-model.number="year" class="select-year">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>

        <div v-else class="select-month-wrap">
          <select v-model.number="year" class="select-year">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <select v-model.number="month" class="select-month">
            <option v-for="m in 12" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
          </select>
        </div>

        <BaseButton class="btn" @click="exportExcel">
          {{ isDownloading ? '다운로드 중...' : '양식다운로드' }}
        </BaseButton>
        <BaseButton class="btn" @click="showImportModal = true">엑셀입력</BaseButton>
      </div>

      <div class="actions">
        <BaseButton @click="resetForm">초기화</BaseButton>
        <BaseButton type="primary" @click="saveTargets">저장</BaseButton>
      </div>
    </div>

    <div class="kpi-grid">
      <section v-for="(group, idx) in groups" :key="idx" class="summary-section">
        <h4 class="section-title">{{ titles[idx] }}</h4>
        <div class="cards">
          <div class="card" v-for="kpi in group" :key="kpi.code">
            <div class="card-title">{{ kpi.name }}</div>
            <div class="card-body">
              <div class="kpi-input-row">
                <input
                  v-model="targets[kpi.code]"
                  class="kpi-input"
                  type="text"
                  :placeholder="kpi.placeholder || '목표값 입력'"
                />
                <div class="kpi-unit">{{ kpi.unit }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <BaseModal v-if="showImportModal" title="엑셀 입력" @close="showImportModal = false">
      <div class="import-body">
        <input type="file" accept=".xlsx,.xls" @change="onFileChange" />
        <p class="import-hint">양식에 맞는 엑셀 파일을 업로드해주세요.</p>
        
        <div v-if="importResult" class="import-result">
          <p>생성: {{ importResult.created }}, 업데이트: {{ importResult.updated }}, 스킵: {{ importResult.skipped }}</p>
          <ul v-if="importResult.errors && importResult.errors.length">
            <li v-for="err in importResult.errors" :key="err.row">시트/행 {{ err.row }}: {{ err.message }}</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <BaseButton @click="showImportModal = false">취소</BaseButton>
        <BaseButton type="primary" :disabled="uploadLoading" @click="handleImport">
          {{ uploadLoading ? '업로드 중...' : '업로드' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import * as targetApi from '@/api/report/targetApi.js'
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();
const periodType = ref('YEAR')
const current = new Date()
const year = ref(current.getFullYear())
const month = ref(current.getMonth() + 1)
const years = computed(() => {
  const start = current.getFullYear() - 5
  return Array.from({ length: 11 }).map((_, i) => start + i)
})
const hotelGroupCode = 1 // 테스트: 실제는 authStore에서 가져오기
const existingTargets = ref({}) // kpiCode -> full response obj (targetId 등)

// make KPI definitions dynamic: fetch from backend (kpiCode, kpiName, unit, description)
import { ref as _ref } from 'vue'
const kpis = _ref([]) // will hold objects: { code, name, unit, description }

// Targets state keyed by kpi.code
const targets = reactive({})
// ensure targets initialized for dynamic kpis after kpis loaded
const initTargetsForKpis = () => {
  kpis.value.forEach(k => {
    if (!(k.code in targets)) targets[k.code] = ''
  })
}

const showImportModal = ref(false)
let importFile = ref(null)

const isDownloading = ref(false)
const uploadLoading = ref(false)
const importResult = ref(null)

// period format: use hyphen (YYYY-MM) to match backend validatePeriod
const formattedPeriod = computed(() => {
  return periodType.value === 'YEAR'
    ? String(year.value)
    : `${year.value}-${String(month.value).padStart(2, '0')}` // YYYY-MM
})

// load kpi metadata from backend
const loadKpiMeta = async () => {
  try {
    const list = await targetApi.listKpiCodes()
    // list items: { kpiCode, kpiName, unit, description }
    kpis.value = (list || []).map(i => ({ code: i.kpiCode, name: i.kpiName, unit: i.unit, description: i.description }))
    initTargetsForKpis()
  } catch (e) {
    console.warn('failed to load KPI meta', e)
  }
}

// load targets: call listByHotelGroup then client-side filter by period
const loadTargets = async () => {
  try {
    const raw = await targetApi.listByHotelGroup(hotelGroupCode)

    // unwrap ApiResponse wrapper if present
    let items = raw
    if (raw && raw.data) items = raw.data
    if (items && items.data) items = items.data
    if (!Array.isArray(items)) items = []

    // filter by selected period
    const filtered = items.filter(r => r.periodType === periodType.value && r.periodValue === formattedPeriod.value)

    // map existing targets for update/delete decisions
    existingTargets.value = {}
    filtered.forEach(r => {
      existingTargets.value[r.kpiCode] = r
    })

    // populate UI values
    kpis.value.forEach(k => {
      const rawVal = existingTargets.value[k.code]?.targetValue
      targets[k.code] = (rawVal === null || rawVal === undefined || rawVal === '') 
        ? '' 
        : Number(rawVal).toFixed(2)
    })

    console.log(items.map(i => ({ kpiCode: i.kpiCode, period: i.periodValue, targetValue: i.targetValue})))

  } catch (e) {
    console.error(e)
    alert('목표값 불러오기에 실패했습니다.')
  }
}

// save targets: for each KPI, create (POST) if no existing targetId, otherwise PATCH
const saveTargets =  () => {
  withPermission('SETTING_OBJECTIVE_UPDATE', async() => {
    try {
      const jobs = []

      for (const k of kpis.value) {
        const code = k.code
        const raw = targets[code]

        const value = (raw === '' || raw == null) ? null : Number(String(raw).replace(/,/g, ''))

        const exist = existingTargets.value[code]
        if (exist && exist.targetId) {
          // PATCH: update only targetValue
          jobs.push(targetApi.updateTarget(hotelGroupCode, exist.targetId, {targetValue: value}))
        } else {
          // POST: create new target
          const payload = {
            targetId: `${code}_${formattedPeriod.value}`,
            hotelGroupCode: hotelGroupCode,
            kpiCode: code,
            periodType: periodType.value,
            periodValue: formattedPeriod.value,
            targetValue: value
          }
          jobs.push(targetApi.createTarget(payload))
        }
      }

      await Promise.all(jobs)
      await loadTargets()
      alert('저장되었습니다.')
    } catch (e) {
      console.error(e)
      alert('저장에 실패했습니다.')
    }
  });
}

const resetForm = () => {
  if (!confirm('입력된 목표값을 초기화하시겠습니까?')) return
  kpis.value.forEach(k => (targets[k.code] = ''))
}

const exportExcel = async () => {
  try {
    isDownloading.value = true
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    // build a sheet per year in `years` list
    const yearList = (years && years.value) ? years.value : [String(new Date().getFullYear())]
    const monthCols = Array.from({ length: 12 }, (_, i) => `${i + 1}월`)

    for (const y of yearList) {
      const rows = []
      // We'll add a hidden first column (for instructions) so header stays at normal columns
      // Row 0 = header row: ['', 'KPI 이름', '단위', '연간목표', ...]
      rows.push(['', 'KPI 이름', '단위', '연간목표', ...monthCols])
      // Row 1 = instruction placed in hidden column (col 0)
      rows.push(['이 파일의 구조를 수정하지 마세요. 섹션 타이틀은 지우지 마세요. 연간/월간 목표 칸만 입력하세요.'])

      // track which rows are section titles and which are KPI data rows so we can apply styles & merges
      const sectionTitleRows = []
      const kpiDataRows = [] // { rowIdx, isDataRow }

      // iterate desired layout in fixed order
      // currentRow: index within sheet rows array (0-based)
      let currentRow = 2 // header at 0, instruction at 1
      for (let i = 0; i < desiredLayout.length; i++) {
        const labels = desiredLayout[i] || []
        // section title row (place title in col 1 since col0 is hidden)
        const titleRow = ['', titles[i]]
        rows.push(titleRow)
        sectionTitleRows.push(currentRow)
        currentRow++

        for (const label of labels) {
          const found = kpis.value.find(k => (k.name || '').trim() === label) || kpis.value.find(k => (k.name || '').includes(label))
          const unit = (found && found.unit) ? found.unit : getUnitForLabel(label)
          const row = ['', label, unit, '']
          // 12 empty month cols
          for (let m = 0; m < 12; m++) row.push('')
          rows.push(row)
          kpiDataRows.push(currentRow)
          currentRow++
        }
        // spacer row
        rows.push([''])
        currentRow++
      }

      const ws = XLSX.utils.aoa_to_sheet(rows)

      // prepare merges for instruction row (merge across data columns 1..(totalCols-1))
      const dataCols = 3 + 12 // KPI 이름, 단위, 연간 + 12 months
      const totalCols = 1 + dataCols // plus hidden col
      ws['!merges'] = ws['!merges'] || []
      // merge instruction cell across data columns
      ws['!merges'].push({ s: { r: 1, c: 1 }, e: { r: 1, c: totalCols - 1 } })

      // prepare merges for section title rows: merge across all data columns (1..totalCols-1)
      for (const r of sectionTitleRows) {
        ws['!merges'].push({ s: { r, c: 1 }, e: { r, c: totalCols - 1 } })
      }

      // set column widths; make col 0 hidden
      ws['!cols'] = Array.from({ length: totalCols }).map((_, idx) => {
        if (idx === 0) return { wch: 2, hidden: true }
        if (idx === 1) return { wch: 30 } // KPI name
        if (idx === 2) return { wch: 14 } // unit
        return { wch: 12 } // numeric columns
      })

      // apply styles: header, instruction, section titles, kpi rows (name/unit non-input gray, targets input highlighted)
      const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'FFB9E4F1' } }, alignment: { horizontal: 'center', vertical: 'center' } }
      const instrStyle = { font: { italic: true }, fill: { fgColor: { rgb: 'FFFFF7F0' } }, alignment: { horizontal: 'left', vertical: 'center' } }
      const sectionStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'FFD1D5DB' } }, alignment: { horizontal: 'center', vertical: 'center' } }
      const nonInputStyle = { fill: { fgColor: { rgb: 'FFF3F4F6' } }, alignment: { vertical: 'center' } }
      const inputStyle = { fill: { fgColor: { rgb: 'FFFFF7CC' } }, alignment: { horizontal: 'center', vertical: 'center' } }

      // helper to ensure a cell exists
      const ensureCell = (r, c) => {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) ws[addr] = { t: 's', v: '' }
        return ws[addr]
      }

      // style header row (row 0): header cells are at cols 1..totalCols-1
      for (let c = 1; c < totalCols; c++) {
        const cell = ensureCell(0, c)
        cell.s = { ...(cell.s || {}), ...headerStyle }
      }

      // style instruction row (row 1) in merged area starting col1
      const instrCell = ensureCell(1, 1)
      instrCell.v = rows[1][1] || rows[1][0] || ''
      instrCell.s = { ...(instrCell.s || {}), ...instrStyle }

      // style section title rows
      for (const r of sectionTitleRows) {
        const cell = ensureCell(r, 1)
        cell.s = { ...(cell.s || {}), ...sectionStyle }
      }

      // style KPI rows
      for (const r of kpiDataRows) {
        // name (col 1) and unit (col 2) -> non-input style
        const nameCell = ensureCell(r, 1)
        nameCell.s = { ...(nameCell.s || {}), ...nonInputStyle }
        const unitCell = ensureCell(r, 2)
        unitCell.s = { ...(unitCell.s || {}), ...nonInputStyle }
        // annual (col 3) and month cols (4.. ) -> input style (highlight for user to fill)
        for (let c = 3; c < totalCols; c++) {
          const vCell = ensureCell(r, c)
          vCell.s = { ...(vCell.s || {}), ...inputStyle }
        }
      }

      // append sheet
      XLSX.utils.book_append_sheet(wb, ws, String(y))
    }

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const pad = n => String(n).padStart(2,'0')
    const fileName = `KPI_Template_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}.xlsx`
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('exportExcel failed', err)
    alert('양식 다운로드에 실패했습니다.')
  } finally {
    isDownloading.value = false
  }
}

// helper used in import: robust KPI item find
const findKpiItemByLabel = (label) => {
  const items = kpis.value || []
  const mappedCode = labelToKpiCode[label]
  if (mappedCode) {
    const byCode = items.find(k => k.code === mappedCode)
    if (byCode) return byCode
  }
  const nLabel = normalize(label)
  // try exact normalized match
  let found = items.find(k => normalize(k.name) === nLabel)
  if (found) return found
  // try includes both directions
  found = items.find(k => normalize(k.name).includes(nLabel) || nLabel.includes(normalize(k.name)))
  if (found) return found
  // try by code
  found = items.find(k => k.code === label)
  return found || null
}

const onFileChange = (e) => {
  const file = e.target.files && e.target.files[0]
  importFile.value = file
}

const handleImport = () => {
  withPermission('SETTING_OBJECTIVE_UPDATE', async () => {
    if (!importFile.value) {
      alert('파일 선택 필요');
      return
    }

    uploadLoading.value = true
    importResult.value = null
    try {
      const XLSX = await import('xlsx')
      const data = await importFile.value.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })

      // build map of existing targets across all periods to decide update/create
      const rawAll = await targetApi.listByHotelGroup(hotelGroupCode)
      let items = rawAll
      if (rawAll && rawAll.data) items = rawAll.data
      if (items && items.data) items = items.data
      if (!Array.isArray(items)) items = []
      const existMap = {}
      items.forEach(t => {
        const key = `${t.kpiCode}_${t.periodType}_${t.periodValue}`
        existMap[key] = t
      })

      const results = { created: 0, updated: 0, skipped: 0, errors: [] }
      const jobs = []

      // iterate sheets: sheet name expected to be year (e.g., '2026')
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName]
        // parse rows as objects using header row
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const yearStr = String(sheetName).trim()
        if (!/^[0-9]{4}$/.test(yearStr)) continue

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const r = rows[rowIndex]
          const sheetRow = rowIndex + 2 // header row is row 1 in Excel
          const kpiNameRaw = (r['KPI 이름'] || '').toString()
          const kpiName = kpiNameRaw.trim()
          if (!kpiName) continue

          // skip section title rows (the titles array)
          if (titles.includes(kpiName)) {
            results.skipped++
            continue
          }

          // annual
          const annualVal = r['연간목표'] !== undefined ? r['연간목표'] : r['Annual']
          if (annualVal !== '' && annualVal !== null && annualVal !== undefined) {
            const kpiItem = findKpiItemByLabel(kpiName)
            if (!kpiItem) {
              results.errors.push({ sheet: sheetName, row: sheetRow, message: `KPI 매칭 실패: '${kpiName}'` })
            } else {
              const kpiCode = kpiItem.code
              const value = Number(String(annualVal).replace(/,/g, ''))
              const key = `${kpiCode}_YEAR_${yearStr}`
              if (existMap[key] && existMap[key].targetId) {
                jobs.push(targetApi.updateTarget(hotelGroupCode, existMap[key].targetId, { targetValue: value }).then(() => { results.updated++ }).catch(e => { results.errors.push({ sheet: sheetName, row: sheetRow, message: e.message || e }) }))
              } else {
                const payload = { targetId: `${kpiCode}_${yearStr}`, hotelGroupCode, kpiCode, periodType: 'YEAR', periodValue: yearStr, targetValue: value }
                jobs.push(targetApi.createTarget(payload).then(() => { results.created++ }).catch(e => { results.errors.push({ sheet: sheetName, row: sheetRow, message: e.message || e }) }))
              }
            }
          }

          // monthly columns 1월..12월
          for (let m = 1; m <= 12; m++) {
            const colKey = `${m}월`
            const mv = r[colKey]
            if (mv === '' || mv === null || mv === undefined) continue
            const kpiItem = findKpiItemByLabel(kpiName)
            if (!kpiItem) {
              results.errors.push({ sheet: sheetName, row: sheetRow, message: `KPI 매칭 실패: '${kpiName}'` })
              continue
            }
            const kpiCode = kpiItem.code
            const value = Number(String(mv).replace(/,/g, ''))
            const monthStr = String(m).padStart(2, '0')
            const periodValue = `${yearStr}-${monthStr}`
            const key = `${kpiCode}_MONTH_${periodValue}`
            if (existMap[key] && existMap[key].targetId) {
              jobs.push(targetApi.updateTarget(hotelGroupCode, existMap[key].targetId, { targetValue: value }).then(() => { results.updated++ }).catch(e => { results.errors.push({ sheet: sheetName, row: sheetRow, message: e.message || e }) }))
            } else {
              const payload = { targetId: `${kpiCode}_${periodValue}`, hotelGroupCode, kpiCode, periodType: 'MONTH', periodValue, targetValue: value }
              jobs.push(targetApi.createTarget(payload).then(() => { results.created++ }).catch(e => { results.errors.push({ sheet: sheetName, row: sheetRow, message: e.message || e }) }))
            }
          }
        }
      }

      await Promise.all(jobs)
      importResult.value = results
      await loadTargets()

      if (results.errors.length) {
        alert('일부 항목에서 오류가 발생했습니다. 모달에서 상세 정보를 확인하세요.')
      } else {
        showImportModal.value = false
        alert('업로드가 완료되었습니다.')
      }

    } catch (err) {
      console.error(err)
      alert('엑셀 파싱/업로드 중 오류가 발생했습니다.')
    } finally {
      uploadLoading.value = false
    }
  })
}

watch([periodType, year, month], () => {
    loadTargets()
})

onMounted(async () => {
  await loadKpiMeta()
  await loadTargets()
})

const titles = ['객실운영', '고객현황', '고객경험', '예약및매출']

// map desired labels per section in the order you specified
const desiredLayout = [
  ['체크인', '체크아웃', '평균객실단가', '객실점유율'],
  ['투숙객', '재방문율', '멤버십 비율', '외국인 비율'],
  ['고객 문의', '고객 클레임', '미처리 문의 비율', '평균응답시간'],
  ['예약', '예약 취소율', '노쇼율', '객실 외 매출비율']
]

// If backend doesn't provide unit for some KPIs, enforce sensible defaults here
const unitMap = {
  // 객실운영
  '체크인': 'COUNT',
  '체크아웃': 'COUNT',
  '평균객실단가': 'KRW',
  '객실점유율': 'PERCENT',
  '객실 점유율': 'PERCENT',
  // 고객현황
  '투숙객': 'COUNT',
  '재방문율': 'PERCENT',
  '멤버십 비율': 'PERCENT',
  '멤버십비율': 'PERCENT',
  '외국인 비율': 'PERCENT',
  '외국인비율': 'PERCENT',
  // 고객경험
  '고객 문의': 'COUNT',
  '고객문의': 'COUNT',
  '고객 클레임': 'COUNT',
  '고객클레임': 'COUNT',
  '미처리 문의 비율': 'PERCENT',
  '미처리문의비율': 'PERCENT',
  '평균응답시간': 'HOURS',
  // 예약및매출
  '예약': 'COUNT',
  '예약 취소율': 'PERCENT',
  '예약취소율': 'PERCENT',
  '노쇼율': 'PERCENT',
  '객실 외 매출비율': 'PERCENT',
  '객실외매출비율': 'PERCENT'
}

// normalized helper must be defined before using it
const normalize = s => (s || '').toString().normalize('NFKC').replace(/\s+/g, '').toLowerCase()

// normalized lookup to be robust against spacing/format differences
const normalizedUnitMap = Object.fromEntries(Object.entries(unitMap).map(([k, v]) => [normalize(k), v]))
const getUnitForLabel = (label) => normalizedUnitMap[normalize(label)] || ''

// Map layout labels to explicit KPI codes when names differ from backend
const labelToKpiCode = {
  '객실 외 매출비율': 'NON_ROOM_REVENUE'
}

const groups = computed(() => {
  const items = kpis.value || []
  const out = []
  for (let i = 0; i < desiredLayout.length; i++) {
    const labels = desiredLayout[i]
    const group = labels.map(label => {
      // 1) try explicit mapping by label -> kpiCode
      let found = null
      const mappedCode = labelToKpiCode[label]
      if (mappedCode) {
        found = items.find(k => k.code === mappedCode)
      }

      // 2) try exact name (normalized)
      if (!found) found = items.find(k => normalize(k.name) === normalize(label))
      // 3) try includes (normalized)
      if (!found) found = items.find(k => normalize(k.name).includes(normalize(label)))
      // 4) try matching by code directly in case label is a code
      if (!found) found = items.find(k => k.code === label)

      if (found) {
        // ensure displayed name follows the desired layout label when mapping was explicit
        // or when backend name differs from our label (normalize compare)
        const mappedCode = labelToKpiCode[label]
        if (mappedCode || normalize(found.name) !== normalize(label)) {
          // force display name to the label
          found = { ...found, name: label }
        }

        // apply unit override if backend omitted unit; for specific label ensure PERCENT
        if (label === '객실 외 매출비율') {
          found = { ...found, unit: 'PERCENT' }
        } else if ((!found.unit || String(found.unit).trim() === '')) {
          const u = getUnitForLabel(label)
          if (u) found = { ...found, unit: u }
        }

        return found
      }
      // placeholder so layout remains consistent
      return { code: `ph_${i}_${label}`, name: label, unit: getUnitForLabel(label) || '' }
    })
    out.push(group)
  }
  return out
})
</script>

<style scoped>
.objective-page {
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.select-period,
.select-year,
.select-month {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
}

.actions {
  display: flex;
  gap: 8px;
}

.kpi-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.summary-section { margin-bottom: 28px; text-align: center; }
.section-title { font-size: 16px; font-weight:700; color:#374151; margin: 6px auto 12px; display: inline-block; text-align: center; }
.cards { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.card { display:flex; flex-direction:column; justify-content:flex-start; align-items:flex-start; padding:18px; border:1px solid #f1f5f9; border-radius:10px; background:#fff; text-align:left; box-sizing:border-box; width:100%; }
.card-title { font-weight:700; margin-bottom:8px; font-size:14px }
.card-body { width:100%; }

.kpi-input-row { display:flex; gap:10px; align-items:center; justify-content:flex-start }
.kpi-input { padding: 10px 12px; border-radius: 8px; border: 1px solid #e5e7eb; background: #ffffff; width: 100%; box-sizing: border-box; font-size:16px }
.kpi-unit { color:#6b7280; font-size:12px; margin-left:8px }

@media (max-width: 1100px) { .cards { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 760px) { .cards { grid-template-columns: repeat(1, minmax(0,1fr)); } }
</style>