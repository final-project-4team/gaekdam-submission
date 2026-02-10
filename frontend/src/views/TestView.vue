<template>
  <div class="test-page">
    <h1 class="title">공통 컴포넌트 사용법 테스트 (최신 기준)</h1>


    <section class="block">
      <h3>BaseButton 종류 / 사이즈</h3>

      <div class="button-row">
        <BaseButton type="primary" size="sm">등록</BaseButton>
        <BaseButton type="primary" size="md">등록</BaseButton>
        <BaseButton type="primary" size="lg">등록</BaseButton>
      </div>

      <div class="button-row">
        <BaseButton type="warning" size="sm">수정</BaseButton>
        <BaseButton type="warning" size="md">수정</BaseButton>
        <BaseButton type="warning" size="lg">수정</BaseButton>
      </div>

      <div class="button-row">
        <BaseButton type="danger" size="sm">삭제</BaseButton>
        <BaseButton type="danger" size="md">삭제</BaseButton>
        <BaseButton type="danger" size="lg">삭제</BaseButton>
      </div>

      <div class="button-row">
        <BaseButton type="ghost" size="sm">닫기</BaseButton>
        <BaseButton type="ghost" size="md">닫기</BaseButton>
        <BaseButton type="ghost" size="lg">닫기</BaseButton>
      </div>
    </section>


    <!-- ===================== -->
    <!-- ListView -->
    <!-- ===================== -->
    <section class="block highlight">
      <h3>ListView (Search + Filter + Sort + Paging + Detail)</h3>

      <ListView
          :columns="columns"
          :rows="pagedRows"
          :filters="filters"
          :searchTypes="searchTypes"
          :page="page"
          :pageSize="pageSize"
          :total="filteredRows.length"
          show-search
          show-detail
          v-model:detail="detailForm"
          @search="onSearch"
          @filter="onFilter"
          @sort-change="onSortChange"
          @page-change="onPageChange"
          @detail-reset="onDetailReset"
          @row-click="openRowModal"
      >
        <!-- ===================== -->
        <!-- Detail Search Form -->
        <!-- ===================== -->
        <template #detail-form>
          <div class="detail-form">
            <div class="row">
              <label>고객명</label>
              <input v-model="detailForm.customerName" />
            </div>

            <div class="row">
              <label>예약번호</label>
              <input v-model="detailForm.reservationNo" />
            </div>

            <div class="row">
              <label>운영상태</label>
              <select v-model="detailForm.status">
                <option value="">전체</option>
                <option value="투숙중">투숙중</option>
                <option value="체크인예정">체크인예정</option>
              </select>
            </div>
          </div>
        </template>
      </ListView>
    </section>

    <!-- ===================== -->
    <!-- Row Modal -->
    <!-- ===================== -->
    <BaseModal
        v-if="showRowModal"
        title="예약 상세"
        @close="closeRowModal"
    >
      <pre>{{ selectedRow }}</pre>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ListView from '@/components/common/ListView.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import BaseButton from "@/components/common/button/BaseButton.vue"

/* ===================== */
/* Search Types */
const searchTypes = [
  { label: '전체', value: '' },
  { label: '고객명', value: 'CUSTOMER_NAME' },
  { label: '예약번호', value: 'RESERVATION_NO' },
]

/* ===================== */
/* Filters */
const filters = [
  {
    key: 'status',
    options: [
      { label: '운영상태', value: '' },
      { label: '투숙중', value: '투숙중' },
      { label: '체크인예정', value: '체크인예정' },
    ],
  },
  {
    key: 'roomType',
    options: [
      { label: '객실유형', value: '' },
      { label: '디럭스', value: '디럭스' },
      { label: '스위트', value: '스위트' },
    ],
  },
]

/* ===================== */
/* Table */
const columns = [
  { key: 'reservationNo', label: '예약번호', sortable: true },
  { key: 'customerName', label: '고객명', sortable: true },
  { key: 'roomType', label: '객실유형', sortable: true },
  { key: 'status', label: '운영상태', sortable: true },
]

/* ===================== */
/* Dummy Data */
const allRows = ref(
    [...Array(20)].map((_, i) => ({
      reservationNo: String(1000 + i),
      customerName: ['김철수', '이영희', '박고객'][i % 3],
      roomType: i % 2 ? '디럭스' : '스위트',
      status: i % 2 ? '투숙중' : '체크인예정',
    }))
)

/* ===================== */
/* Paging */
const page = ref(1)
const pageSize = ref(5)

/* ===================== */
/* 기본검색 (SearchBar 전용) */
const quickSearch = ref({
  keyword: null,        // 전체검색
  customerName: null,
  reservationNo: null,
})

/* ===================== */
/* Filter / Sort */
const filterValues = ref({})
const sortState = ref({})

/* ===================== */
/* Detail Search */
const detailForm = ref({
  customerName: '',
  reservationNo: '',
  status: '',
})

/* ===================== */
/* Filtering Logic */
const filteredRows = computed(() => {
  let rows = [...allRows.value]

  /* ===================== */
  /* 전체검색 (OR) */
  if (quickSearch.value.keyword) {
    const v = quickSearch.value.keyword
    rows = rows.filter(r =>
        r.customerName.includes(v) ||
        r.reservationNo.includes(v) ||
        r.roomType.includes(v) ||
        r.status.includes(v)
    )
  }

  if (quickSearch.value.customerName) {
    rows = rows.filter(r =>
        r.customerName.includes(quickSearch.value.customerName)
    )
  }

  if (quickSearch.value.reservationNo) {
    rows = rows.filter(r =>
        r.reservationNo.includes(quickSearch.value.reservationNo)
    )
  }

  /* ===================== */
  /* FilterGroup */
  Object.entries(filterValues.value).forEach(([k, v]) => {
    if (!v) return
    rows = rows.filter(r => r[k] === v)
  })

  /* ===================== */
  /* 상세검색 */
  if (detailForm.value.customerName) {
    rows = rows.filter(r =>
        r.customerName.includes(detailForm.value.customerName)
    )
  }

  if (detailForm.value.reservationNo) {
    rows = rows.filter(r =>
        r.reservationNo.includes(detailForm.value.reservationNo)
    )
  }

  if (detailForm.value.status) {
    rows = rows.filter(r =>
        r.status === detailForm.value.status
    )
  }

  /* ===================== */
  /* Sort */
  if (sortState.value.sortBy) {
    const { sortBy, direction } = sortState.value
    rows.sort((a, b) =>
        direction === 'ASC'
            ? String(a[sortBy]).localeCompare(String(b[sortBy]))
            : String(b[sortBy]).localeCompare(String(a[sortBy]))
    )
  }

  return rows
})

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

/* ===================== */
/* Events */
const onSearch = (payload) => {
  page.value = 1

  // 🔹 항상 초기화
  quickSearch.value = {
    keyword: null,
    customerName: null,
    reservationNo: null,
  }

  const key = payload?.key
  const value = payload?.value ?? ''

  // ✅ 빈 값 → 전체 조회
  if (!String(value).trim()) {
    return
  }

  // ✅ 전체검색
  if (key === 'keyword' || key === '') {
    quickSearch.value.keyword = value
    return
  }

  // ✅ 단일검색
  if (key === 'customerName') {
    quickSearch.value.customerName = value
  }

  if (key === 'reservationNo') {
    quickSearch.value.reservationNo = value
  }
}

const onDetailReset = () => {
  detailForm.value = {
    customerName: '',
    reservationNo: '',
    status: '',
  }

  quickSearch.value = {
    keyword: null,
    customerName: null,
    reservationNo: null,
  }

  page.value = 1
}

const onFilter = (values) => {
  page.value = 1
  filterValues.value = values
}

const onSortChange = ({ sortBy, direction }) => {
  sortState.value = { sortBy, direction }
}

const onPageChange = (p) => {
  page.value = p
}

const showRowModal = ref(false)
const selectedRow = ref(null)

const openRowModal = (row) => {
  selectedRow.value = row
  showRowModal.value = true
}

const closeRowModal = () => {
  showRowModal.value = false
  selectedRow.value = null
}

</script>


<style scoped>
.test-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.title {
  font-size: 18px;
  font-weight: 700;
}

.block {
  background: white;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #eef2f7;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.highlight {
  border: 2px solid #2563eb;
}

.detail-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-form .row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-form label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.detail-form input,
.detail-form select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
</style>
