<!-- /src/components/common/ListView.vue -->
<template>
  <div class="list-view">
    <!-- Toolbar -->
    <div class="toolbar">
      <!-- Left -->
      <div class="toolbar-left">
        <SearchBar
            v-if="showSearch"
            :searchTypes="searchTypes"
            :type="searchType"
            :showDetail="showDetail"
            @update:type="t => emit('update:searchType', t)"
            @search="payload => emit('search', payload)"
            @detail="openDetailModal"
        />
      </div>

      <!-- Right -->
      <div class="toolbar-right">
        <FilterGroup
            v-if="filters?.length"
            :filters="filters"
            @change="values => emit('filter', values)"
        />
      </div>
    </div>

    <!-- 1) 최초 로딩: Skeleton -->
    <TableSkeleton
        v-if="internalLoading && !disableSkeleton"
        :columns="columns"
        :rows="pageSize"
    />

    <!-- 2) 응답 완료 + 데이터 있음 -->
    <TableWithPaging
        v-else-if="rows.length > 0"
        :columns="columns"
        :rows="rows"
        :page="page"
        :pageSize="pageSize"
        :total="total"
        @page-change="p => emit('page-change', p)"
        @sort-change="s => emit('sort-change', s)"
        @row-click="$emit('row-click', $event)"
    >
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </TableWithPaging>

    <!-- 3) 응답 완료 + 데이터 없음 -->
    <div v-else class="empty-state">
      조회된 데이터가 없습니다.
    </div>

    <!-- Detail Search Modal -->
    <BaseDetailSearchModal
        v-if="showDetailModal"
        @close="closeDetailModal"
        @apply="applyDetail"
        @reset="onDetailReset"
    >
      <slot name="detail-form" />
    </BaseDetailSearchModal>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import SearchBar from '@/components/common/form/SearchBar.vue'
import FilterGroup from '@/components/common/filter/FilterGroup.vue'
import TableWithPaging from '@/components/common/table/TableWithPaging.vue'
import BaseDetailSearchModal from '@/components/common/modal/BaseDetailSearchModal.vue'
import TableSkeleton from '@/components/common/table/TableSkeleton.vue'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },

  page: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  total: { type: Number, required: true },

  filters: { type: Array, default: () => [] },
  searchTypes: { type: Array, default: () => [] },

  searchType: { type: String, default: '' },

  showSearch: { type: Boolean, default: true },
  showDetail: { type: Boolean, default: false },

  disableSkeleton: { type: Boolean, default: false },
})

const emit = defineEmits([
  'row-click',
  'page-change',
  'sort-change',
  'search',
  'filter',
  'update:detail',
  'update:searchType',
  'detail-reset',
])

/* =====================
   최초 진입 스켈레톤 (응답 오면 무조건 종료)
   - rows가 0이어도 응답은 응답임 → empty-state로 내려가야 함
===================== */
const internalLoading = ref(true)     // 최초엔 무조건 스켈레톤
const hasLoadedOnce = ref(false)      // 응답 1회라도 왔는지

watch(
    () => props.rows,
    (rows) => {
      // rows가 한 번이라도 변경되면 = API 응답 도착
      if (!hasLoadedOnce.value) {
        internalLoading.value = false
        hasLoadedOnce.value = true
      }
    },
    { immediate: false }
)

/* =====================
   Detail Modal
===================== */
const showDetailModal = ref(false)

const openDetailModal = () => {
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
}

const applyDetail = () => {
  showDetailModal.value = false
}

const onDetailReset = () => {
  emit('detail-reset')
  showDetailModal.value = false
}
</script>

<style scoped>
.list-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.toolbar-right {
  margin-left: auto;
}

/* Empty State */
.empty-state {
  padding: 48px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

/* Scrollbar */
.toolbar::-webkit-scrollbar {
  height: 6px;
}
.toolbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}
</style>
