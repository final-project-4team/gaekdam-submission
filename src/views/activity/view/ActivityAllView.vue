<template>
  <div class="activity-all-page">
    <ListView
        :columns="columns"
        :rows="rows"
        :total="totalCount"
        :page="page"
        :pageSize="pageSize"
        :filters="filters"
        :searchTypes="searchTypes"
        show-detail
        v-model:detail="detailForm"
        @search="onSearch"
        @filter="onFilter"
        @sort-change="onSortChange"
        @page-change="onPageChange"
        @row-click="openRowModal"
        @detail-reset="onDetailReset"
    >
      <template #cell-status="{ row }">
    <span
        class="status-text"
        :style="{ color: row.statusColor }"
    >
      {{ row.statusText }}
    </span>
      </template>

      <!-- 상세검색 -->
      <template #detail-form>
        <div class="detail-form">
          <div class="row">
            <label>고객명</label>
            <input v-model="detailForm.customerName"/>
          </div>

          <div class="row">
            <label>예약번호</label>
            <input v-model="detailForm.reservationNo"/>
          </div>
        </div>
      </template>
    </ListView>

    <ActivityDetailModal
        v-if="showRowModal"
        :reservationCode="selectedReservationCode"
        :reason="selectedReason"
        @close="closeRowModal"
    />

    <ReasonRequestModal
        v-if="showReasonModal"
        @close="closeReasonModal"
        @confirm="onReasonConfirmed"
    />
  </div>
</template>

<script setup>
import {ref, computed, onMounted, watch} from 'vue'
import ListView from '@/components/common/ListView.vue'
import {getOperationBoardApi} from '@/api/reservation/operationApi.js'
import {getPropertyListByHotelGroupApi} from '@/api/property/propertyApi.js'
import ActivityDetailModal from "@/views/activity/modal/ActivityDetailModal.vue";
import ReasonRequestModal from "@/views/setting/modal/ReasonRequestModal.vue";
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();

/* ===================== */
/* 상태 라벨 */
/* ===================== */
const OPERATION_STATUS_LABEL = {
  RESERVED: '예약중',
  CHECKIN_PLANNED: '체크인예정',
  STAYING: '투숙중',
  CHECKOUT_PLANNED: '체크아웃예정',
  COMPLETED: '완료',
}

/* ===================== */
/* 검색 기준 */
/* ===================== */
const searchTypes = [
  {label: '전체', value: ''},
  {label: '고객명', value: 'CUSTOMER_NAME'},
  {label: '예약번호', value: 'RESERVATION_NO'},
]

/* ===================== */
/* 지점 필터 */
/* ===================== */
const propertyOptions = ref([])

const filters = computed(() => [
  { key: 'propertyCode', options: propertyOptions.value },
  {
    key: 'status',
    options: [
      { label: '운영상태', value: '' },
      { label: '예약중', value: 'RESERVED' },
      { label: '투숙중', value: 'STAYING' },
      { label: '완료', value: 'COMPLETED' },
      { label: '취소', value: 'CANCELED' },
      { label: '노쇼', value: 'NO_SHOW' },
    ],
  },
])

const OPERATION_STATUS_STYLE = {
  RESERVED: {
    label: '예약중',
    color: '#111827', // Slate
  },
  STAYING: {
    label: '투숙중',
    color: '#15803D', // Emerald
  },
  COMPLETED: {
    label: '완료',
    color: '#6B7280', // Gray
  },
  CANCELED: {
    label: '취소',
    color: '#9CA3AF', // Gray (톤다운)
  },
  NO_SHOW: {
    label: '노쇼',
    color: '#7C2D12', // Brown / 경고성
  },
}


/* ===================== */
/* 테이블 */
/* ===================== */
const columns = [
  {key: 'reservationNo', label: '예약번호', sortable: true, align: 'center'},
  {key: 'propertyName', label: '지점', sortable: true, align: 'center'},
  {key: 'customerName', label: '고객명', sortable: true},
  {key: 'roomType', label: '객실유형', sortable: true, align: 'center'},
  {key: 'checkinDate', label: '투숙예정일', sortable: true, align: 'center'},
  {key: 'checkoutDate', label: '투숙종료일', sortable: true, align: 'center'},
  {key: 'status', label: '운영상태', sortable: true, align: 'center'},
]

/* ===================== */
/* 상태 */
/* ===================== */
const rows = ref([])
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(10)

const filterValues = ref({
  propertyCode: null,
  status: null,
})

const sortState = ref({})


/* 기본검색 전용 */
const quickSearch = ref({
  keyword: null,        // 전체검색
  customerName: null,
  reservationCode: null,
})

/* 상세검색 전용 */
const detailForm = ref({
  customerName: null,
  reservationNo: null,
})

/* ===================== */
/* 데이터 로딩 */
/* ===================== */
const loadOperationBoard = async () => {
  const res = await getOperationBoardApi({
    page: page.value,
    size: pageSize.value,
    filters: filterValues.value,

    // 기본검색 + 상세검색 병합
    detail: {
      keyword: quickSearch.value.keyword,
      customerName:
          quickSearch.value.customerName ?? detailForm.value.customerName,

      reservationCode:
          quickSearch.value.reservationCode ??
          (detailForm.value.reservationNo
              ? Number(detailForm.value.reservationNo)
              : null),
    },

    sort: sortState.value,
  })

  const data = res.data.data

  rows.value = (data.content || []).map(r => {
    const status = OPERATION_STATUS_STYLE[r.operationStatus] || {
      label: r.operationStatus,
      color: '#374151',
    }

    return {
      reservationNo: r.reservationCode,
      propertyName: r.propertyName,
      customerName: r.customerName,
      roomType: r.roomType,
      checkinDate: r.plannedCheckinDate,
      checkoutDate: r.plannedCheckoutDate,

      statusText: status.label,
      statusColor: status.color,
    }
  })

  totalCount.value = data.totalElements
}

/* ===================== */
/* 기본검색 (SearchBar) */
/* ===================== */
const onSearch = (payload) => {
  page.value = 1

  quickSearch.value = {
    keyword: null,
    customerName: null,
    reservationCode: null,
  }

  if (!payload || !payload.value) {
    loadOperationBoard()
    return
  }

  const key = payload.key ?? payload.type
  const value = payload.value

  if (key === '' || key === 'keyword') {
    quickSearch.value.keyword = value
  }

  if (key === 'CUSTOMER_NAME') {
    quickSearch.value.customerName = value
  }

  if (key === 'RESERVATION_NO') {
    quickSearch.value.reservationCode = Number(value)
  }

  loadOperationBoard()
}


/* ===================== */
/* 상세검색 watch (모달 전용) */
/* ===================== */
watch(
    () => ({...detailForm.value}),
    (v) => {
      if (!v.customerName && !v.reservationNo) return

      //  상세검색 시 기본검색 무효화
      quickSearch.value.customerName = null
      quickSearch.value.reservationCode = null

      page.value = 1
      loadOperationBoard()
    }
)

/* ===================== */
/* 필터 / 정렬 / 페이지 */
/* ===================== */
const onFilter = (values) => {
  filterValues.value = {
    propertyCode:
        values.propertyCode !== '' ? values.propertyCode : null,

    status:
        values.status !== '' ? values.status : null,
  }

  page.value = 1
  loadOperationBoard()
}

const onSortChange = (sort) => {
  sortState.value = sort
  loadOperationBoard()
}

const onPageChange = (p) => {
  page.value = p
  loadOperationBoard()
}

const onDetailReset = () => {
  // 상세검색 초기화
  detailForm.value.customerName = null
  detailForm.value.reservationNo = null

  // 기본검색도 같이 초기화 (중요)
  quickSearch.value.customerName = null
  quickSearch.value.reservationCode = null

  page.value = 1
  loadOperationBoard()   // 전체 데이터 재조회
}

/* ===================== */
/* 모달 */
/* ===================== */
const showRowModal = ref(false)
const selectedReservationCode = ref(null)

const closeRowModal = () => {
  showRowModal.value = false
  selectedReservationCode.value = null;
}

/* ===================== */
/* 사유 입력 모달 */
/* ===================== */
const showReasonModal = ref(false)
const targetRow = ref(null)

const openRowModal = (row) => {
  withPermission(['RESERVATION_READ'], () => {
    targetRow.value = row
    showReasonModal.value = true
  });
}

const closeReasonModal = () => {
  showReasonModal.value = false
  targetRow.value = null
}

const onReasonConfirmed = (reason) => {
  if (targetRow.value) {
    selectedReservationCode.value = targetRow.value.reservationNo
    selectedReason.value = reason
    showRowModal.value = true
  }
  closeReasonModal()
}

const selectedReason = ref('')

/* ===================== */
/* 초기 로딩 */
/* ===================== */
onMounted(async () => {
  const res = await getPropertyListByHotelGroupApi()
  const list = res.data.data || []

  propertyOptions.value = [
    {label: '전체 지점', value: ''},
    ...list.map(p => ({
      label: p.propertyName,
      value: p.propertyCode,
    })),
  ]

  loadOperationBoard()
})
</script>

<style scoped>
.activity-all-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 20px;
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

.detail-form input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.detail-view p {
  margin: 6px 0;
}

.status-text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.2px;
}
</style>