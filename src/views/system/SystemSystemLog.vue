<template>
  <div class="system-log-page">
    <!-- 상단 탭 -->
    <ContentTabs :tabs="tabs"/>

    <!-- 커스텀 날짜 필터 바 -->
    <div class="custom-filter-bar">
      <div class="date-range">
        <input
            type="date"
            v-model="dateFilter.fromDate"
            class="date-input"
            @change="handleDateChange"
        />
        <span class="separator">~</span>
        <input
            type="date"
            v-model="dateFilter.toDate"
            class="date-input"
            @change="handleDateChange"
        />
      </div>
    </div>

    <ListView
        :columns="columns"
        :rows="systemLogList"
        :total="totalCount"
        :page="page"
        :pageSize="pageSize"
        :filters="filterOptions"
        :searchTypes="searchTypes"
        @search="onSearch"
        @filter="onFilter"
        @sort-change="onSortChange"
        @page-change="onPageChange"
        @row-click="openRowModal"
    >
      <template #cell-result="{ value }">
  <span :class="['status-badge', value === 'SUCCESS' ? 'success' : 'fail']">
    {{ value === 'SUCCESS' ? '성공' : '실패' }}
  </span>
      </template>

      <!-- 관리 여부 커스텀 셀 -->
      <template #cell-actions="{ row }">
        <!-- 실패일 때만 상세 보기 버튼 표시 -->
        <div v-if="row.result === 'FAIL'" class="action-cell">
          <BaseButton size="sm" type="ghost" @press="openRowModal(row)">
            상세 보기
          </BaseButton>
        </div>
        <span v-else>-</span>
      </template>
    </ListView>

    <!-- 상세 모달 -->
    <BaseModal
        v-if="showRowModal"
        title="로그 상세 정보"
        @close="closeRowModal"
    >
      <div v-if="systemLogDetail" class="detail-view">
        <p><b>로그 번호:</b> {{ systemLogDetail.loginLogCode }}</p>
        <p><b>행위명:</b> {{ systemLogDetail.action }}</p>
        <p><b>접속자 ID:</b> {{ systemLogDetail.loginId }}</p>
        <p><b>접속자 IP:</b> {{ systemLogDetail.userIp }}</p>
        <p><b>접속 일시:</b> {{ systemLogDetail.occurredAt }}</p>
        <p><b>결과 여부:</b>
          <span
              :class="['status-badge', systemLogDetail.result === 'SUCCESS' ? 'success' : 'fail']">
              {{ systemLogDetail.result === 'SUCCESS' ? '성공' : '실패' }}
          </span>

        </p>

        <div v-if="systemLogDetail.result === 'FAIL'" class="comment-box">
          <span class="comment-title">실패 사유</span>
          <p class="comment-text">{{ systemLogDetail.failedReason || '-' }}</p>
        </div>
      </div>

      <template #footer>
        <BaseButton type="primary" size="sm" @press="closeRowModal">
          확인
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue' // computed added
import ContentTabs from '@/components/layoutComponents/ContentTabs.vue'
import ListView from '@/components/common/ListView.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import { useAuthStore } from '@/stores/authStore'
import {
  getSystemLogList,
  getSystemLogDetail
} from '@/api/system/systemLogApi.js'

const authStore = useAuthStore()

// 탭 설정
const allTabs = [
  {label: '로그인', path: '/system/log', permission: 'LOG_LOGIN_LIST'},
  {label: '활동 기록', path: '/system/activity', permission: 'LOG_AUDIT_LIST'},
  {label: '권한 변경', path: '/system/permission', permission: 'LOG_PERMISSION_CHANGED_LIST'},
  {label: '개인 정보 조회', path: '/system/privacy', permission: 'LOG_PERSONAL_INFORMATION_LIST'}
]

const tabs = computed(() => {
    return allTabs.filter(tab => !tab.permission || authStore.hasPermission(tab.permission))
})

// 테이블 컬럼 (API 데이터 매핑)
const columns = [
  {key: 'loginLogCode', label: '로그인 로그 코드', sortable: true, width: '140px', align: 'center'},
  {key: 'action', label: '행위명', sortable: true, align: 'left'},
  {key: 'loginId', label: '접속자 ID', sortable: true, align: 'center'},
  {key: 'userIp', label: '접속자 IP', sortable: true, align: 'center'},
  {key: 'occurredAt', label: '접속 일시', sortable: true, align: 'center'},
  {key: 'result', label: '결과 여부', sortable: true, align: 'center', width: '100px'},
  {key: 'actions', label: '관리 여부', sortable: false, align: 'center', width: '120px'}
]

// 상태 관리
const systemLogList = ref([])
const systemLogDetail = ref(null)
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 검색 타입 정의
const searchTypes = [
  {label: '전체', value: ''},
  {label: '접속자 ID', value: 'loginId'},
  {label: '접속자 IP', value: 'userIp'}
]

// 필터 옵션 정의 (결과 여부)
const filterOptions = [
  {
    key: 'result',
    options: [
      {label: '결과 전체', value: ''},
      {label: '성공', value: 'SUCCESS'},
      {label: '실패', value: 'FAIL'}
    ]
  }
]

// 필터 값
const filterValues = ref({
  result: undefined
})

// 날짜 필터 (백엔드가 fromDate/toDate 기대)
const dateFilter = ref({
  fromDate: null,
  toDate: null
})

// 검색어 상태
const quickSearch = ref({
  loginId: null,
  userIp: null,
  keyword: null
})

const sortState = ref({})

// 모달 상태
const showRowModal = ref(false)
const selectedRow = ref(null)

// 데이터 로드
const loadSystemLogs = async () => {
  try {
    const searchParams = {
      loginId: quickSearch.value.loginId,
      userIp: quickSearch.value.userIp,
      keyword: quickSearch.value.keyword,
      fromDate: dateFilter.value.fromDate,
      toDate: dateFilter.value.toDate
    }

    const res = await getSystemLogList({
      page: page.value,
      size: pageSize.value,
      filters: filterValues.value,
      detail: searchParams,
      sort: sortState.value
    })

    systemLogList.value = res.content || []
    totalCount.value = res.totalElements || 0
    console.log('filterValues', filterValues.value)
  } catch (error) {
    console.error('시스템 로그 조회 실패:', error)
    systemLogList.value = []
    totalCount.value = 0
  }
}

// 날짜 필터 변경 핸들러
const handleDateChange = () => {
  page.value = 1
  loadSystemLogs()
}

// 검색 핸들러
const onSearch = (payload) => {
  page.value = 1

  // quickSearch 초기화
  quickSearch.value = {
    loginId: null,
    userIp: null,
    keyword: null
  }

  if (!payload || !payload.value) {
    loadSystemLogs()
    return
  }

  const key = payload.key ?? payload.type
  const value = payload.value

  if (key === 'loginId') {
    quickSearch.value.loginId = value
  } else if (key === 'userIp') {
    quickSearch.value.userIp = value
  } else {
    // 전체 검색 (keyword)
    quickSearch.value.keyword = value
  }

  loadSystemLogs()
}

// 필터 핸들러
const onFilter = (payload) => {
  page.value = 1

  if (!payload) {
    filterValues.value = { result: undefined }
    loadSystemLogs()
    return
  }

  // FilterGroup emits the entire values object, e.g. { result: 'SUCCESS' }
  const { result } = payload
  filterValues.value.result = result === '' ? undefined : result

  loadSystemLogs()
}

// 페이지 변경
const onPageChange = (p) => {
  page.value = p
  loadSystemLogs()
}

// 정렬 변경
const onSortChange = (sort) => {
  sortState.value = sort
  loadSystemLogs()
}

// 모달 관련
const openRowModal = async (row) => {
  selectedRow.value = row
  systemLogDetail.value = {...row}
  showRowModal.value = true
}

const closeRowModal = () => {
  showRowModal.value = false
  selectedRow.value = null
  systemLogDetail.value = null
}

// 초기 로드
onMounted(() => {
  loadSystemLogs()
})
</script>

<style scoped>
.system-log-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ==================== 커스텀 필터 바 ==================== */
.custom-filter-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 14px 20px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-input {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  color: #374151;
  background: white;
  height: 32px;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.separator {
  color: #6b7280;
  font-size: 14px;
  margin: 0 4px;
}

/* ==================== 검색바 스타일 ==================== */
/* ListView의 toolbar 반응형 중앙 정렬 */
:deep(.toolbar) {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap; /* 줄바꿈 허용 */
  gap: 10px; /* 간격 */
  padding: 16px 20px;
  width: 100%;
}

:deep(.toolbar-left),
:deep(.toolbar-right) {
  flex-wrap: wrap;
  white-space: normal;
  margin-left: 0 !important;
}

/* 검색 컨테이너 */
:deep(.search-bar) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap; /* 내부 요소도 줄바꿈 허용 */
  width: auto;
  max-width: 100%;
}

/* 검색 입력창 너비 확장 (반응형) */
:deep(.input-wrap .input) {
  width: 600px !important; /* 기본 너비 */
  max-width: 100%; /* 화면보다 커지지 않게 */
  min-width: 200px; /* 너무 작아지지 않게 */
}

/* ==================== 테이블 관련 ==================== */
.action-cell {
  display: flex;
  justify-content: center;
}

/* 상태 뱃지 */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background: #f0fdf4;
  color: #16a34a;
}

.status-badge.fail {
  background: #fef2f2;
  color: #dc2626;
}

/* ==================== 모달 ==================== */
.detail-view p {
  margin: 8px 0;
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
}

.detail-view b {
  color: #1f2937;
  font-weight: 600;
  margin-right: 8px;
}

.comment-box {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.comment-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 6px;
}

.comment-text {
  font-size: 14px;
  color: #374151;
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}

/* ContentTabs 중앙 정렬 */
:deep(.tabs) {
  justify-content: center;
}
</style>

