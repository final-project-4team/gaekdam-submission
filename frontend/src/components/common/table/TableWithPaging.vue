<template>
  <div class="table-with-paging">
    <BaseTable
        :columns="columns"
        :rows="rows"
        @row-click="$emit('row-click', $event)"
        @sort-change="s => emit('sort-change', s)"

    >
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps"/>
      </template>
    </BaseTable>

    <Pagination
        v-if="totalPages > 1"
        :current="page"
        :totalPages="totalPages"
        @change="p => emit('page-change', p)"
    />
  </div>
</template>

<script setup>
import {computed} from 'vue'
import BaseTable from '@/components/common/table/BaseTable.vue'
import Pagination from '@/components/common/pagination/Pagination.vue'

const props = defineProps({
  columns: {type: Array, required: true},
  rows: {type: Array, required: true},

  page: {type: Number, required: true},
  pageSize: {type: Number, required: true},
  total: {type: Number, required: true},
})

const emit = defineEmits([
  'row-click',
  'page-change',
  'sort-change',
])

/* 서버 기준 전체 페이지 수 */
const totalPages = computed(() => {
  if (!props.total || !props.pageSize) return 1
  return Math.ceil(props.total / props.pageSize)
})
</script>

<style scoped>
.table-with-paging {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
