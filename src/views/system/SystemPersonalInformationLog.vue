<template>
  <div class="system-log-page">
    <!-- 상단 탭 -->
    <ContentTabs :tabs="tabs" />

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
        :rows="privacyLogList"
        :total="totalCount"
        :page="page"
        :pageSize="pageSize"
        :searchTypes="searchTypes"
        :filters="filterOptions"
        @search="onSearch"
        @filter="onFilter"
        @sort-change="onSortChange"
        @page-change="onPageChange"
        @row-click="openRowModal"
    />

    <!-- 상세 모달 -->
    <BaseModal
        v-if="showRowModal"
        title="개인정보 조회 사유"
        @close="closeRowModal"
    >
      <div v-if="logDetail" class="detail-view">
        <div class="purpose-section">
          <label>조회 사유</label>
          <div class="purpose-box">
             {{ logDetail.purpose || '사유 없음' }}
          </div>
        </div>

        <div class="meta-info">
          <p><b>로그 번호:</b> {{ logDetail.privacyLogCode }}</p>
          <p><b>접속자:</b> {{ logDetail.accessorName }} ({{ logDetail.loginId }})</p>
          <p><b>일시:</b> {{ logDetail.occurredAt }}</p>
          <p><b>대상:</b> {{ logDetail.targetName }} ({{ logDetail.targetType }})</p>
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
import { getPrivacyLogList } from '@/api/system/systemLogApi.js'
import { useAuthStore } from '@/stores/authStore'

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

// 테이블 컬럼
const columns = [
  { key: 'privacyLogCode', label: '개인정보 로그 코드', sortable: true, width: '160px', align: 'center' },
  { key: 'action', label: '업무명', sortable: true, align: 'center' },
  { key: 'targetType', label: '대상 종류', sortable: true, align: 'center' },
  { key: 'targetCode', label: '대상 코드', sortable: true, align: 'center' },
  { key: 'targetName', label: '대상 이름', sortable: true, align: 'center' },
  { key: 'accessorName', label: '접속자 이름', sortable: true, align: 'center' },
  { key: 'loginId', label: '접속자 ID', sortable: true, align: 'center' },
  { key: 'occurredAt', label: '일시', sortable: true, align: 'center' }
]

// 상태 관리
const privacyLogList = ref([])
const logDetail = ref(null)
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 검색 타입
const searchTypes = [
  { label: '전체', value: '' },
  { label: '개인정보 로그 코드', value: 'privacyLogCode' },
  { label: '업무명', value: 'action' },
  { label: '대상 코드', value: 'targetCode' },
  { label: '대상 이름', value: 'targetName' },
  { label: '접속자 이름', value: 'accessorName' },
  { label: '접속자 ID', value: 'loginId' }
]

// 필터 옵션
const filterOptions = [
  {
    key: 'targetType',
    options: [
      { label: '대상 종류 전체', value: '' },
      { label: '직원', value: 'EMPLOYEE' },
      { label: '고객', value: 'CUSTOMER' }
    ]
  }
]

// 필터 값
const filterValues = ref({
  targetType: undefined
})

// 날짜 필터
const dateFilter = ref({
  fromDate: null,
  toDate: null
})

// 검색어 상태
const quickSearch = ref({
  keyword: null
})

const sortState = ref({})

// 모달 상태
const showRowModal = ref(false)
const selectedRow = ref(null)

// 데이터 로드
const loadPrivacyLogs = async () => {
  try {
    const searchParams = {
      keyword: quickSearch.value.keyword,
      loginId: quickSearch.value.loginId,
      action: quickSearch.value.action,
      accessorName: quickSearch.value.accessorName,
      privacyLogCode: quickSearch.value.privacyLogCode,
      targetCode: quickSearch.value.targetCode,
      targetName: quickSearch.value.targetName,
      targetType: filterValues.value.targetType || undefined, // 필터 값 추가
      fromDate: dateFilter.value.fromDate,
      toDate: dateFilter.value.toDate
    }

    // 정렬 필드 매핑
    let mappedSort = { ...sortState.value }
    if (mappedSort.sortBy) {
        if (mappedSort.sortBy === 'privacyLogCode') mappedSort.sortBy = 'personalInformationLogCode'
        else if (mappedSort.sortBy === 'action') mappedSort.sortBy = 'permissionTypeKey'
        else if (mappedSort.sortBy === 'accessorName') mappedSort.sortBy = 'employeeAccessorName'
        else if (mappedSort.sortBy === 'loginId') mappedSort.sortBy = 'employeeAccessorLoginId'
    }
    
    // API Call
    const res = await getPrivacyLogList({
      page: page.value,
      size: pageSize.value,
      detail: searchParams,
      sort: mappedSort
    })

    // 매핑
    privacyLogList.value = (res.content || []).map(item => ({
      privacyLogCode: item.personalInformationLogCode,
      action: item.permissionTypeKey,
      targetType: item.targetType,
      targetCode: item.targetCode,
      targetName: item.targetName,
      accessorName: item.employeeAccessorName,
      loginId: item.employeeAccessorLoginId,
      occurredAt: item.occurredAt,
      purpose: item.purpose // 사유 매핑 (Backend field is 'purpose')
    }))
    totalCount.value = res.totalElements || 0
  } catch (error) {
    console.error('개인정보 조회 이력 조회 실패:', error)
    privacyLogList.value = []
    totalCount.value = 0
  }
}

// 날짜 변경
const handleDateChange = () => {
  page.value = 1
  loadPrivacyLogs()
}

// 필터 변경
const onFilter = (filters) => {
  filterValues.value = filters
  page.value = 1
  loadPrivacyLogs()
}

// 검색 핸들러
const onSearch = (payload) => {
  page.value = 1
  
    // quickSearch 초기화
  quickSearch.value = {
    keyword: null,
    loginId: null,
    action: null,
    accessorName: null,
    privacyLogCode: null,
    targetCode: null,
    targetName: null
  }

  if (!payload || !payload.value) {
    loadPrivacyLogs()
    return
  }
  
  const key = payload.key ?? payload.type
  const value = payload.value
  

  if (key === 'loginId') {
      quickSearch.value.loginId = value
  } else if (key === 'accessorName') {
      quickSearch.value.accessorName = value
  } else if (key === 'privacyLogCode') {
      quickSearch.value.privacyLogCode = value
  } else if (key === 'action') {
      quickSearch.value.action = value
  } else if (key === 'targetCode') {
      quickSearch.value.targetCode = value
  } else if (key === 'targetName') {
      quickSearch.value.targetName = value
  } else {
      quickSearch.value.keyword = value
  }
  
  loadPrivacyLogs()
}

// 페이지 변경
const onPageChange = (p) => {
  page.value = p
  loadPrivacyLogs()
}

// 정렬 변경
const onSortChange = (sort) => {
  sortState.value = sort
  loadPrivacyLogs()
}

// 모달 열기
const openRowModal = (row) => {
  selectedRow.value = row
  logDetail.value = row
  showRowModal.value = true
}

const closeRowModal = () => {
  showRowModal.value = false
  selectedRow.value = null
  logDetail.value = null
}

onMounted(() => {
  loadPrivacyLogs()
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
:deep(.toolbar) {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap; 
  gap: 10px;       
  padding: 16px 20px;
  width: 100%;
}

:deep(.toolbar-left),
:deep(.toolbar-right) {
  flex-wrap: wrap;
  white-space: normal;
  margin-left: 0 !important;
}

:deep(.search-bar) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap; 
  width: auto;
  max-width: 100%;
}

:deep(.input-wrap .input) {
  width: 600px !important; 
  max-width: 100%;         
  min-width: 200px;        
}

/* ==================== 모달 ==================== */
.detail-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.purpose-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.purpose-section label {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
}

.purpose-box {
  padding: 12px;
  background-color: #f3f4f6;
  border-radius: 6px;
  font-size: 15px;
  color: #111827;
  line-height: 1.5;
  min-height: 80px;
}

.meta-info {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.detail-view p {
  margin: 4px 0;
  font-size: 13px;
  color: #6b7280;
}

.detail-view b {
  color: #4b5563;
  font-weight: 600;
  margin-right: 6px;
}

/* ContentTabs 중앙 정렬 */
:deep(.tabs) {
  justify-content: center;
}
</style>