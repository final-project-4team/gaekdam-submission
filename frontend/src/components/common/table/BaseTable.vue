<template>
  <div class="table-wrapper">
    <table class="base-table">
      <colgroup ref="colgroupRef">
        <col
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width } : null"
        />
      </colgroup>

      <thead>
      <tr>
        <th
            v-for="(col, index) in columns"
            :key="col.key"
            :class="[
              'th',
              { sortable: col.sortable, active: sortKey === col.key },
              { resizing: resizeIndex === index }
            ]"
            @click="onSort(col)"
        >
          <span class="th-label">{{ col.label }}</span>

          <span v-if="col.sortable" class="sort-icon">
              <svg
                  v-if="sortKey !== col.key"
                  viewBox="0 0 24 24"
                  class="icon inactive"
              >
                <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
              </svg>

              <svg
                  v-else-if="sortOrder === 'ASC'"
                  viewBox="0 0 24 24"
                  class="icon active"
              >
                <path d="M8 14l4-4 4 4" />
              </svg>

              <svg
                  v-else
                  viewBox="0 0 24 24"
                  class="icon active"
              >
                <path d="M8 10l4 4 4-4" />
              </svg>
            </span>

          <!-- resize handle -->
          <span
              v-if="index < columns.length - 1"
              class="resize-handle"
              @mousedown.stop.prevent="startResize($event, index)"
              @click.stop
          />
        </th>
      </tr>
      </thead>

      <tbody>
      <tr
          v-for="row in rows"
          :key="row[rowKey]"
          class="table-row"
          @click="$emit('row-click', row)"
      >
        <td
            v-for="col in columns"
            :key="col.key"
            :class="col.align ? `align-${col.align}` : 'align-center'"
        >
          <slot
              :name="`cell-${col.key}`"
              :row="row"
              :value="row[col.key]"
          >
            {{ row[col.key] }}
          </slot>
        </td>
      </tr>

      <tr v-if="!rows?.length">
        <td :colspan="columns.length" class="empty">
          데이터가 없습니다.
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const MIN_WIDTH = 60

const props = defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
})

const emit = defineEmits(['row-click', 'sort-change'])

/* =====================
   정렬
===================== */
const sortKey = ref('')
const sortOrder = ref('ASC')
let isResizing = false

const onSort = (col) => {
  if (isResizing) return
  if (!col.sortable) return

  if (sortKey.value === col.key) {
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortKey.value = col.key
    sortOrder.value = 'ASC'
  }

  emit('sort-change', {
    sortBy: sortKey.value,
    direction: sortOrder.value,
  })
}

/* =====================
   엑셀 방식 컬럼 리사이즈
===================== */
const colgroupRef = ref(null)

let resizeIndex = null
let startX = 0
let startWidth = 0
let startNextWidth = 0
let rafId = null

const startResize = (e, index) => {
  const cols = colgroupRef.value?.children
  const cur = cols?.[index]
  const next = cols?.[index + 1]
  if (!cur || !next) return

  isResizing = true
  resizeIndex = index
  startX = e.clientX
  startWidth = cur.getBoundingClientRect().width
  startNextWidth = next.getBoundingClientRect().width

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', stopResize)
}

const onMouseMove = (e) => {
  if (resizeIndex === null || rafId) return

  rafId = requestAnimationFrame(() => {
    const cols = colgroupRef.value?.children
    const cur = cols?.[resizeIndex]
    const next = cols?.[resizeIndex + 1]
    if (!cur || !next) {
      stopResize()
      rafId = null
      return
    }

    const delta = e.clientX - startX
    const w1 = startWidth + delta
    const w2 = startNextWidth - delta

    if (w1 < MIN_WIDTH || w2 < MIN_WIDTH) {
      rafId = null
      return
    }

    cur.style.width = `${w1}px`
    next.style.width = `${w2}px`
    rafId = null
  })
}

const stopResize = () => {
  if (resizeIndex === null) return

  const cols = colgroupRef.value?.children
  if (cols?.[resizeIndex] && cols?.[resizeIndex + 1]) {
    props.columns[resizeIndex].width = cols[resizeIndex].style.width
    props.columns[resizeIndex + 1].width = cols[resizeIndex + 1].style.width
  }

  isResizing = false
  resizeIndex = null
  rafId = null

  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', stopResize)
}

watch(
    () => props.columns,
    () => {
      if (resizeIndex !== null) stopResize()
    }
)

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
/* =====================
   Layout
===================== */
.table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e6eaf0;
}

.base-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

/* =====================
   Cell
===================== */
th, td {
  padding: 12px;
  border-top: 1px solid #eef2f7;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th {
  position: relative;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  border-top: none;
  user-select: none;
  text-align: center;
}

.th-label {
  padding-right: 20px;
}

th.sortable {
  cursor: pointer;
}


.sort-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}

/* =====================
   Resize handle (정제된 UX)
===================== */
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 10px;              /* 클릭 영역 */
  height: 100%;
  cursor: col-resize;
  z-index: 2;
}

/* 항상 보이는 연한 라인 */
.resize-handle::before {
  content: '';
  position: absolute;
  right: 4px;
  top: 0;
  width: 1px;               /* 두께 고정 */
  height: 100%;
  background: rgba(196, 227, 255, 0.25); /* slate-400 연톤 */
  transition: background 0.15s ease;
}

/* hover 시 */
th:hover .resize-handle::before {
  background: rgba(156, 201, 255, 0.45);  /* blue-400 연톤 */
}

/* 드래그 중 */
th.resizing .resize-handle::before {
  background: rgba(37,99,235,0.65);   /* blue-600 */
}

/* =====================
   Icon
===================== */
.icon {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}

.icon.inactive { color: #cbd5e1; }
.icon.active { color: #5e89ff; }

/* =====================
   Body
===================== */
.table-row { cursor: pointer; }
.table-row:hover { background: #f1f5ff; }

.empty {
  text-align: center;
  color: #94a3b8;
  padding: 24px 12px;
}

.align-left { text-align: left; }
.align-center { text-align: center; }
.align-right { text-align: right; }
</style>
