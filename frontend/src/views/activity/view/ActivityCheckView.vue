<template>
  <div class="activity-check">

    <!-- ===================== -->
    <!-- Today Summary -->
    <!-- ===================== -->
    <TodayCheckSummary
        :summary="summary"
        :active="summaryType"
        @select="onSelectSummary"
    />

    <!-- ===================== -->
    <!-- Today Operation List -->
    <!-- ===================== -->
    <ListView
        :columns="columns"
        :rows="rows"
        :page="page"
        :pageSize="pageSize"
        :total="total"
        :filters="filters"
        :searchTypes="searchTypes"
        show-search
        @filter="onFilter"
        @search="onSearch"
        @sort-change="onSortChange"
        @page-change="onPageChange"
        @row-click="onRowClick"
    >
      <!-- 운영 상태 -->
      <template #cell-operationStatus="{ value }">
        <span class="status" :class="value">
          {{ STATUS_LABEL[value] }}
        </span>
      </template>

      <!-- 체크인 / 체크아웃 -->
      <template #cell-action="{ row }">
        <div class="action-buttons">
          <!-- 체크인 예정 → 체크인 버튼만 -->
          <BaseButton
              v-if="row.operationStatus === 'CHECKIN_PLANNED'"
              type="primary"
              size="sm"
              @press="checkin(row)"
          >
            체크인 등록
          </BaseButton>

          <!-- 투숙중 / 체크아웃 예정 → 체크아웃 버튼만 -->
          <BaseButton
              v-else-if="
          row.operationStatus === 'STAYING'
          || row.operationStatus === 'CHECKOUT_PLANNED'
        "
              type="warning"
              size="sm"
              @press="checkout(row)"
          >
            체크아웃 등록
          </BaseButton>

          <!-- COMPLETED → 아무 버튼도 안 나옴 -->
        </div>
      </template>
    </ListView>


    <CheckInModal
        v-if="showCheckInModal"
        :reservationCode="selectedReservationCode"
        @close="showCheckInModal = false"
        @success="reload"
    />

    <CheckOutModal
        v-if="showCheckOutModal"
        :stayCode="selectedStayCode"
        @close="showCheckOutModal = false"
        @success="reload"
    />


    <CustomerBasicModal
        v-if="showCustomerModal"
        :customer="selectedCustomer"
        @close="showCustomerModal = false"
    />

    <ReasonRequestModal
        v-if="showReasonModal"
        @close="closeReasonModal"
        @confirm="onReasonConfirmed"
    />

  </div>

</template>
<script setup>
import {ref, reactive, onMounted, computed} from 'vue'
import ListView from '@/components/common/ListView.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import TodayCheckSummary from './TodayCheckSummary.vue'
import {
  getTodayOperationListApi,
  getTodayOperationSummaryApi,
} from '@/api/reservation'
import {getPropertyListByHotelGroupApi} from "@/api/property/propertyApi.js";
import CheckInModal from "@/views/activity/modal/CheckInModal.vue";
import CheckOutModal from "@/views/activity/modal/CheckOutModal.vue";
import CustomerBasicModal from '@/views/activity/modal/CustomerBasicModal.vue'
import { getCustomerBasicApi } from '@/api/customer/customerApi'
import ReasonRequestModal from "@/views/setting/modal/ReasonRequestModal.vue";
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();

const propertyOptions = ref([])

const filterValues = ref({
  propertyCode: null,
})

const filters = computed(() => [
  {
    key: 'propertyCode',
    options: propertyOptions.value,
  },
])

const onFilter = async (values) => {
  filterValues.value.propertyCode = values.propertyCode ?? null
  page.value = 1

  // 지점 바뀌면 Summary + List 둘 다 갱신
  await loadSummary()
  await loadList()
}

const sortState = ref({})

const TODAY_SORT_KEY_MAP = {
  reservationCode: 'r.reservation_code',
  plannedCheckinDate: 'r.checkin_date',
  plannedCheckoutDate: 'r.checkout_date',
}

/* ===================== */
/* Status Label */
const STATUS_LABEL = {
  CHECKIN_PLANNED: '체크인예정',
  STAYING: '투숙중',
  CHECKOUT_PLANNED: '체크아웃예정',
  COMPLETED: '완료',
}

/* ===================== */
/* Paging */
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const rows = ref([])

/* ===================== */
/* Summary */
const summaryType = ref('ALL_TODAY')

const summary = ref({
  ALL_TODAY: 0,
  CHECKIN_PLANNED: 0,
  CHECKOUT_PLANNED: 0,
  STAYING: 0,
  COMPLETED: 0,
})

/* ===================== */
/* Search */
const detail = reactive({
  customerName: null,
  reservationCode: null,
})

/* ===================== */
/* Columns */
const columns = [
  { key: 'reservationCode', label: '예약번호' ,sortable: true },
  { key: 'customerName', label: '고객명',sortable: false },
  { key: 'roomType', label: '객실유형' },
  { key: 'plannedCheckinDate', label: '체크인 예정',sortable: true },
  { key: 'plannedCheckoutDate', label: '체크아웃 예정',sortable: true },
  { key: 'operationStatus', label: '운영상태' },
  { key: 'action', label: '처리', width: 220 ,align: 'center' },
]

/* ===================== */
/* API */
const loadSummary = async () => {
  const res = await getTodayOperationSummaryApi({
    propertyCode: filterValues.value.propertyCode,
  })

  const data = res.data.data

  summary.value = {
    // 오늘 운영 대상 = 체크인 예정 + 투숙중
    ALL_TODAY:
        (data.CHECKIN_PLANNED || 0)
        + (data.STAYING || 0),

    // 카드용
    CHECKIN_PLANNED: data.CHECKIN_PLANNED || 0,
    STAYING: data.STAYING || 0,
    CHECKOUT_PLANNED: data.CHECKOUT_PLANNED || 0,
  }
}

const loadList = async () => {
  const res = await getTodayOperationListApi({
    page: page.value,
    size: pageSize.value,
    summaryType: summaryType.value === 'ALL_TODAY'
        ? undefined
        : summaryType.value,

    propertyCode: filterValues.value.propertyCode,
    sort: sortState.value,
    detail,
  })

  const data = res.data.data
  rows.value = data.content || []
  total.value = data.totalElements
}

/* ===================== */
/* Events */
const onSelectSummary = async (type) => {
  summaryType.value = type
  page.value = 1
  await loadList()
}


const searchTypes = [
  { label: '검색선택', value: '' },
  { label: '고객명', value: 'customerName' },
  { label: '예약번호', value: 'reservationCode' },
]


const onSearch = async ({ key, value }) => {
  page.value = 1
  detail.customerName = null
  detail.reservationCode = null

  if (!value) return loadList()

  if (key === 'keyword' || key === 'customerName') {
    detail.customerName = value
  }

  if (key === 'reservationCode') {
    detail.reservationCode = value
  }

  await loadList()
}

const onPageChange = async (p) => {
  page.value = p
  await loadList()
}

const onRowClick = (row) => {
  withPermission(['TODAY_RESERVATION_READ'], () => {
    console.log('row-click row:', row)

    if (!row || !row.customerCode) return
    openReasonModal(row.customerCode)
  });
}

const showReasonModal = ref(false)
const targetCustomerCode = ref(null)

const openReasonModal = (customerCode) => {
  targetCustomerCode.value = customerCode
  showReasonModal.value = true
}

const closeReasonModal = () => {
  showReasonModal.value = false
  targetCustomerCode.value = null
}

const onReasonConfirmed = (reason) => {
  if (targetCustomerCode.value) {
    openCustomerModal(targetCustomerCode.value, reason)
  }
  closeReasonModal()
}

const showCustomerModal = ref(false)
const selectedCustomer = ref(null)
const openCustomerModal = async (customerCode, reason) => {
  try {
    const res = await getCustomerBasicApi(customerCode, reason)
    selectedCustomer.value = res.data.data
    showCustomerModal.value = true
  } catch (e) {
    console.error(e)
    alert('고객 정보를 불러오지 못했습니다.')
  }
}

const onSortChange = (sort) => {
  sortState.value = {
    sortBy: sort.sortBy,
    direction: sort.direction,
  }
  page.value = 1
  loadList()
}

/* ===================== */
/* Button Rules */
const showCheckInModal = ref(false)
const showCheckOutModal = ref(false)
const selectedStayCode = ref(null)
const selectedReservationCode = ref(null)

const checkin = (row) => {
  withPermission('CHECK_IN_CREATE', () => {
    if (!row.reservationCode) {
      console.error('stayCode 누락', row)
      alert('투숙 정보가 없어 체크인을 진행할 수 없습니다.')
      return
    }

    selectedReservationCode.value = row.reservationCode
    showCheckInModal.value = true
  });
}

const checkout = (row) => {
  withPermission('CHECK_OUT_CREATE', () => {
    if (!row.stayCode) {
      console.error('stayCode 누락', row)
      alert('투숙 정보가 없어 체크인을 진행할 수 없습니다.')
      return
    }

    selectedStayCode.value = row.stayCode
    showCheckOutModal.value = true
  });
}

const reload = async () => {
  await loadSummary()
  await loadList()
}



/* ===================== */
onMounted(async () => {
  const res = await getPropertyListByHotelGroupApi()
  const list = res.data.data || []

  propertyOptions.value = [
    { label: '전체 지점', value: '' },
    ...list.map(p => ({
      label: p.propertyName,
      value: p.propertyCode,
    })),
  ]

  await loadSummary()
  await loadList()
})
</script>

<style scoped>
.activity-check {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

/* 화면이 작아지면 */
@media (max-width: 1600px) {
  .action-buttons {
    flex-direction: column;
    gap: 6px;
  }
}

.status {
  font-weight: 600;
}

.status.CHECKIN_PLANNED {
  color: #2563eb;
}

.status.STAYING {
  color: #047857;
}

.status.CHECKOUT_PLANNED {
  color: #d97706;
}

.status.COMPLETED {
  color: #6b7280;
}
</style>
