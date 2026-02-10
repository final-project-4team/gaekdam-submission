<template>
  <div class="activity-facility">

    <template v-if="ready">
      <!-- ===================== -->
      <!-- Today Facility Summary -->
      <!-- ===================== -->
      <TodayFacilitySummary
          :summary="summary"
          :active="activeFacilityCode"
          @select="onSelectFacility"
      />

      <!-- ===================== -->
      <!-- Facility Usage List -->
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
      />
    </template>

    <!-- ===================== -->
    <!-- Customer Basic Modal -->
    <!-- ===================== -->
    <CustomerBasicModal
        v-if="showCustomerModal"
        :customer="selectedCustomer"
        @close="showCustomerModal = false"
    />

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import ListView from '@/components/common/ListView.vue'
import CustomerBasicModal from '@/views/activity/modal/CustomerBasicModal.vue'
import TodayFacilitySummary from '/src/views/activity/view/TodayFacilitySummary.vue'

import {
  getFacilityUsageListApi,
  getTodayFacilityUsageSummaryApi,
} from '@/api/facility/facilityUsageApi'

import { getPropertyListByHotelGroupApi } from '@/api/property/propertyApi'
import { getCustomerBasicApi } from '@/api/customer/customerApi'
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();

/* ===================== */
/* State */
/* ===================== */
const ready = ref(false)

const propertyOptions = ref([])
const firstPropertyCode = ref(null)

const filterValues = reactive({
  propertyCode: null,
})

const summary = ref([])
const activeFacilityCode = ref(null)

/* ===================== */
/* Filters */
/* ===================== */
const filters = computed(() => [
  {
    key: 'propertyCode',
    label: '지점',
    options: propertyOptions.value,
  },
])

const onFilter = async (values) => {
  // 전체 선택 방지 → 첫 지점으로 강제
  if (values.propertyCode === '') {
    filterValues.propertyCode = firstPropertyCode.value
    return
  }

  filterValues.propertyCode = values.propertyCode
  activeFacilityCode.value = null
  page.value = 1

  await loadSummary()
  await loadList()
}

/* ===================== */
/* Paging */
/* ===================== */
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const rows = ref([])

/* ===================== */
/* Sorting */
/* ===================== */
const sortState = ref({
  sortBy: 'usageAt',
  direction: 'DESC',
})

const onSortChange = async (sort) => {
  sortState.value = sort
  page.value = 1
  await loadList()
}

const onPageChange = async (p) => {
  page.value = p
  await loadList()
}

/* ===================== */
/* Columns */
/* ===================== */
const columns = [
  { key: 'facilityUsageCode', label: '번호' },
  { key: 'customerName', label: '고객명' },
  { key: 'roomNumber', label: '객실번호' },
  { key: 'facilityName', label: '시설명' },
  { key: 'facilityType', label: '시설유형' },
  { key: 'usageAt', label: '이용일시', sortable: true },
  { key: 'usageQuantity', label: '이용횟수' },
  { key: 'usedPersonCount', label: '사용인원' },
  { key: 'priceSource', label: '결제구분' },
  { key: 'usageType', label: '이용구분' },
]

/* ===================== */
/* Search */
/* ===================== */
const detail = reactive({
  customerName: null,
  stayCode: null,
})

const searchTypes = [
  { label: '검색선택', value: '' },
  { label: '고객명', value: 'customerName' },
  { label: '투숙코드', value: 'stayCode' },
]
const onSearch = async ({ key, value }) => {
  page.value = 1
  detail.customerName = null
  detail.stayCode = null

  if (!value) {
    await loadList()
    return
  }

  if (key === 'customerName' || key === 'keyword') {
    detail.customerName = value
  }

  if (key === 'stayCode') {
    detail.stayCode = Number(value)
  }

  await loadList()
}

/* ===================== */
/* Summary */
/* ===================== */
const onSelectFacility = async (facilityCode) => {
  activeFacilityCode.value = facilityCode
  page.value = 1
  await loadList()
}

/* ===================== */
/* API */
/* ===================== */
const loadSummary = async () => {
  const res = await getTodayFacilityUsageSummaryApi({
    propertyCode: filterValues.propertyCode,
  })
  summary.value = res.data.data || []
}

const loadList = async () => {
  const res = await getFacilityUsageListApi({
    page: page.value,
    size: pageSize.value,
    sort: sortState.value,
    propertyCode: Number(filterValues.propertyCode),
    facilityCode: activeFacilityCode.value,
    detail,
  })

  const data = res.data.data
  rows.value = data.content || []

  total.value = data.totalElements || 0
}

/* ===================== */
/* Row Click */
/* ===================== */
const showCustomerModal = ref(false)
const selectedCustomer = ref(null)

const onRowClick =  (row) => {
  withPermission(['CUSTOMER_READ','TODAY_FACILITY_USAGE_READ'], async () => {
    if (!row?.customerCode) return
    const res = await getCustomerBasicApi(row.customerCode)
    selectedCustomer.value = res.data.data
    showCustomerModal.value = true
  });
}

/* ===================== */
/* Init */
/* ===================== */
onMounted(async () => {
  const res = await getPropertyListByHotelGroupApi()
  const list = res.data.data || []

  if (list.length === 0) return

  firstPropertyCode.value = String(list[0].propertyCode)

  propertyOptions.value = [
    { label: '지점 선택', value: '' },
    ...list.map(p => ({
      label: p.propertyName,
      value: String(p.propertyCode),
    })),
  ]

  // 실제 로직 기준은 무조건 첫 지점
  filterValues.propertyCode = firstPropertyCode.value

  ready.value = true

  await loadSummary()
  await loadList()
})
</script>

<style scoped>
.activity-facility {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
