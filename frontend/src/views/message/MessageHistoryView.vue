<template>
  <div class="message-history-page">

    <ListView
        class="history-list"
        :columns="columns"
        :rows="rows"
        :page="page"
        :pageSize="pageSize"
        :total="total"
        :filters="filters"
        :show-search="false"
        @filter="onFilter"
        @sort-change="onSortChange"
        @page-change="onPageChange"
        @row-click="openDetail"
    >
      <template #cell-status="{ row }">
        <span class="status-text" :class="row.status">
          {{ STATUS_LABEL[row.status] }}
        </span>
      </template>
    </ListView>

    <!-- 상세 Drawer -->
    <MessageHistoryDetailDrawer
        :visible="showDrawer"
        :detail="selectedDetail"
        @close="closeDrawer"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ListView from '@/components/common/ListView.vue'
import MessageHistoryDetailDrawer from './components/MessageHistoryDetailDrawer.vue'
import {
  getMessageSendHistoryApi,
  getMessageSendHistoryDetailApi
} from '@/api/message/messageSendHistoryApi'
import { getPropertyListByHotelGroupApi } from '@/api/property/propertyApi'
import { getMessageJourneyStagesApi } from '@/api/message/messageStageApi'
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();
const STATUS_LABEL = {
  SCHEDULED: '예약됨',
  SENT: '발송완료',
  FAILED: '실패',
}

const columns = [
  { key: 'stageNameKor', label: '여정 단계' },
  { key: 'templateTitle', label: '메시지 템플릿' },
  { key: 'reservationCode', label: '예약코드', align: 'center' },
  { key: 'stayCode', label: '투숙코드', align: 'center' },
  { key: 'status', label: '상태', align: 'center' },
  { key: 'sentAt', label: '발송 시각', sortable: true, align: 'center' },
]

const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const sortState = ref({
  sortBy: 'sentAt',
  direction: 'DESC',
})

/* ===================== */
/* 필터 옵션 */
/* ===================== */
const propertyOptions = ref([])
const stageOptions = ref([])

const filterValues = ref({
  propertyCode: null,
  status: null,
  stageCode: null,
})

const filters = computed(() => [

  {
    key: 'propertyCode',
    options: propertyOptions.value,
  },

  {
    key: 'stageCode',
    options: stageOptions.value,
  },

  {
    key: 'status',
    options: [
      { label: '전체 상태', value: '' },
      { label: '예약됨', value: 'SCHEDULED' },
      { label: '발송완료', value: 'SENT' },
      { label: '실패', value: 'FAILED' },
    ],
  },
])

/* ===================== */
/* Drawer */
/* ===================== */
const showDrawer = ref(false)
const selectedDetail = ref(null)

const loadHistories = async () => {
  const res = await getMessageSendHistoryApi({
    page: page.value,
    size: pageSize.value,
    sort: sortState.value,
    search: {
      propertyCode: filterValues.value.propertyCode || null,
      status: filterValues.value.status || null,
      stageCode: filterValues.value.stageCode || null,
    },
  })

  const data = res.data.data
  rows.value = data.content || []
  total.value = data.totalElements
}

const openDetail = async (row) => {
  withPermission('MESSAGE_READ',  async () => {
    const res = await getMessageSendHistoryDetailApi(row.sendCode)
    selectedDetail.value = res.data.data
    showDrawer.value = true
  });
}

const closeDrawer = () => {
  showDrawer.value = false
  selectedDetail.value = null
}

const onFilter = (values) => {
  filterValues.value = {
    stageCode: values.stageCode || null,
    propertyCode: values.propertyCode || null,
    status: values.status || null,
  }
  page.value = 1
  loadHistories()
}

const onSortChange = (sort) => {
  sortState.value = sort
  page.value = 1
  loadHistories()
}

const onPageChange = (p) => {
  page.value = p
  loadHistories()
}

onMounted(async () => {
  const [propertyRes, stageRes] = await Promise.all([
    getPropertyListByHotelGroupApi(),
    getMessageJourneyStagesApi(),
  ])

  const properties = propertyRes.data.data || []
  propertyOptions.value = [
    { label: '전체 지점', value: '' },
    ...properties.map(p => ({
      label: p.propertyName,
      value: p.propertyCode,
    })),
  ]

  const stages = stageRes.data.data || []
  stageOptions.value = [
    { label: '전체 여정', value: '' },
    ...stages.map(s => ({
      label: s.stageNameKor,
      value: s.stageCode,
    })),
  ]

  loadHistories()
})
</script>

<style scoped>
.message-history-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* =========================
   핵심: SearchBar 없을 때도
   필터 영역을 오른쪽 정렬
   =========================
   ListView 내부 구조가 보통
   .toolbar / .filters 같은 wrapper를 가짐.
   아래는 "가장 흔한" 클래스명에 대응.
   실제 클래스명이 다르면 ListView.vue에서
   toolbar 클래스명만 알려주면 거기에 맞춰줄게.
*/
.history-list :deep(.toolbar) {
  display: flex;
  justify-content: flex-end; /* 오른쪽 정렬 */
  gap: 12px;
}

/* FilterGroup이 width를 꽉 먹는 경우 대비 */
.history-list :deep(.filter-group) {
  width: auto;
}

/* 상태 색상 */
.status-text {
  font-size: 12px;
  font-weight: 600;
}

.status-text.SENT {
  color: #16a34a;
}

.status-text.FAILED {
  color: #dc2626;
}

.status-text.SCHEDULED {
  color: #6b7280;
}
</style>
