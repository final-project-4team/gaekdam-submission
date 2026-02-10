<template>
  <div class="activity-timeline">

    <!-- ===================== -->
    <!-- 고객 검색 -->
    <!-- ===================== -->
    <ListView
        :columns="customerColumns"
        :rows="customers"
        :page="page"
        :pageSize="size"
        :total="total"
        :searchTypes="customerSearchTypes"
        :disableSkeleton="true"
        @search="onCustomerSearch"
        @row-click="onCustomerSelect"
        @page-change="onPageChange"
    />

    <!-- ===================== -->
    <!-- 투숙 리스트 -->
    <!-- ===================== -->
    <div v-if="selectedCustomer" class="section">
      <h3 class="section-title">
        {{ selectedCustomer.customerName }} · 투숙 이력
      </h3>

      <TableWithPaging
          :columns="stayColumns"
          :rows="stays"
          :page="1"
          :pageSize="5"
          :total="stays.length"
          @row-click="onStaySelect"
      />
    </div>

    <!-- ===================== -->
    <!-- 타임라인 -->
    <!-- ===================== -->
    <div v-if="timeline" class="section timeline-section">
      <h3 class="section-title">투숙 타임라인</h3>

      <!-- 요약 -->
      <div class="summary-card">
        {{ timeline.summary.summaryText }}
      </div>

      <!-- 타임라인 카드 -->
      <div class="timeline-card">
        <div class="timeline-scroll">
          <div class="timeline-line"></div>

          <div
              v-for="(event, idx) in timeline.events"
              :key="idx"
              class="timeline-event"
              :style="{ left: `${idx * 220}px` }"
          >
            <!-- 점 -->
            <div class="dot"></div>

            <!-- 이벤트 박스 -->
            <div
                class="event-box"
                :class="{ top: idx % 2 === 0, bottom: idx % 2 === 1 }"
            >
              <div class="event-title">
                {{ renderTitle(event) }}
              </div>

              <div class="event-desc">
                {{ renderDesc(event) }}
              </div>

              <div class="event-time">
                {{ formatDate(event.occurredAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

import ListView from '@/components/common/ListView.vue'
import TableWithPaging from '@/components/common/table/TableWithPaging.vue'

import {
  getTimelineCustomerListApi,
  getCustomerStayListApi,
  getStayTimelineApi,
} from '@/api/reservation/timelineApi'

/* =====================
   Paging State
===================== */
const page = ref(1)
const size = ref(10)
const total = ref(0)

/* =====================
   State
===================== */
const customers = ref([])
const selectedCustomer = ref(null)

const stays = ref([])
const selectedStay = ref(null)

const timeline = ref(null)
const hasSearched = ref(false)

/* =====================
   Columns
===================== */
const customerColumns = [
  { key: 'customerCode', label: '고객코드', width: 100 },
  { key: 'customerName', label: '고객명' },
  { key: 'phone', label: '연락처' },
]

const customerSearchTypes = [
  { label: '이름 / 전화번호 / 고객코드', value: 'keyword' },
]

const stayColumns = [
  { key: 'stayCode', label: '투숙코드' },
  { key: 'roomNumber', label: '객실' },
  { key: 'actualCheckinAt', label: '체크인' },
  { key: 'actualCheckoutAt', label: '체크아웃' },
  { key: 'stayStatus', label: '상태' },
]

/* =====================
   Actions
===================== */
const onCustomerSearch = async ({ value }) => {
  page.value = 1

  // 상태 초기화
  selectedCustomer.value = null
  selectedStay.value = null
  stays.value = []
  timeline.value = null

  await fetchCustomers(value)
}

const onPageChange = async (p) => {
  page.value = p
  await fetchCustomers()
}

/**
 * 타임라인 전용 고객 검색
 * (투숙 이력 있는 고객만)
 */
const fetchCustomers = async (keyword = '') => {
  const res = await getTimelineCustomerListApi({ keyword })

  customers.value = res.data.data.map(c => ({
    customerCode: c.customerCode,
    customerName: c.customerName,
    phone: c.phone,
  }))

  total.value = customers.value.length
}

const onCustomerSelect = async (customer) => {
  selectedCustomer.value = customer
  selectedStay.value = null
  timeline.value = null

  const res = await getCustomerStayListApi({
    customerCode: customer.customerCode,
  })

  stays.value = res.data.data
}

const onStaySelect = async (stay) => {
  selectedStay.value = stay

  const res = await getStayTimelineApi({
    stayCode: stay.stayCode,
  })

  timeline.value = res.data.data
}

/* =====================
   Timeline Render
===================== */
const renderTitle = (event) => {
  switch (event.eventType) {
    case 'RESERVATION_CREATED': return '예약'
    case 'CHECK_IN': return '체크인'
    case 'CHECK_OUT': return '체크아웃'
    case 'FACILITY_USAGE': return event.facilityName
    default: return event.eventType
  }
}

const renderDesc = (event) => {
  const count = event.count ?? 1

  switch (event.eventType) {
    case 'RESERVATION_CREATED':
      return `객실 ${event.roomNumber}호 · ${count}명`
    case 'CHECK_IN':
    case 'CHECK_OUT':
      return event.channel
    case 'FACILITY_USAGE':
      return `${count}명 이용`
    default:
      return ''
  }
}

const formatDate = (dt) =>
    new Date(dt).toLocaleString()
</script>

<style scoped>
.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  background: #fff;
  padding: 16px;
  border-radius: 14px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

/* 요약 */
.summary-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 13px;
}

/* ===== 타임라인 카드 ===== */
.timeline-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px 0;
  overflow: hidden;
}

.timeline-scroll {
  position: relative;
  overflow-x: auto;
  padding: 60px 32px;
  min-height: 240px;
}

.timeline-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
      to right,
      #e5e7eb,
      #94a3b8,
      #e5e7eb
  );
}

.timeline-event {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.dot {
  width: 12px;
  height: 12px;
  background: #ffffff;
  border: 3px solid #6366f1;
  border-radius: 50%;
  z-index: 2;
}

.event-box {
  position: absolute;
  width: 190px;
  background: #ffffff;
  border-radius: 14px;
  padding: 12px;
  font-size: 12px;
  border: 1px solid #eef2ff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.event-box.top {
  bottom: 28px;
}

.event-box.bottom {
  top: 28px;
}

.event-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.event-desc {
  color: #374151;
  margin-bottom: 6px;
}

.event-time {
  font-size: 11px;
  color: #6b7280;
}
</style>
