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
        :rows="permissionLogList"
        :total="totalCount"
        :page="page"
        :pageSize="pageSize"
        :searchTypes="searchTypes"
        @search="onSearch"
        @sort-change="onSortChange"
        @page-change="onPageChange"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue' // computed added
import ContentTabs from '@/components/layoutComponents/ContentTabs.vue'
import ListView from '@/components/common/ListView.vue'
import { getPermissionLogList } from '@/api/system/systemLogApi.js'
import { useAuthStore } from '@/stores/authStore' // Import authStore

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
  { key: 'permissionLogCode', label: '권한 로그 코드', sortable: true, width: '140px', align: 'center' },
  { key: 'changeName', label: '변경명', sortable: true, align: 'center' },
  { key: 'beforePermission', label: '변경 전 권한', sortable: true, align: 'center' },
  { key: 'afterPermission', label: '변경 후 권한', sortable: true, align: 'center' },
  { key: 'targetId', label: '변경된 직원 ID', sortable: true, align: 'center' },
  { key: 'modifierId', label: '변경한 직원 ID', sortable: true, align: 'center' },
  { key: 'occurredAt', label: '일시', sortable: true, align: 'center' }
]

// 상태 관리
const permissionLogList = ref([])
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 검색 타입
const searchTypes = [
  { label: '전체', value: '' },
  { label: '변경 전 권한', value: 'beforePermission' },
  { label: '변경 후 권한', value: 'afterPermission' },
  { label: '변경된 직원 ID', value: 'targetId' },
  { label: '변경한 직원 ID', value: 'modifierId' }
]

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

// 데이터 로드
const loadPermissionLogs = async () => {
  try {
    const searchParams = {
      keyword: quickSearch.value.keyword,
      targetId: quickSearch.value.targetId,
      modifierId: quickSearch.value.modifierId,
      beforePermission: quickSearch.value.beforePermission,
      afterPermission: quickSearch.value.afterPermission,
      fromDate: dateFilter.value.fromDate,
      toDate: dateFilter.value.toDate
    }
    
    // 정렬 필드 매핑
    let mappedSort = { ...sortState.value }
    if (mappedSort.sortBy) {
        if (mappedSort.sortBy === 'permissionLogCode') mappedSort.sortBy = 'permissionChangedLogCode'
        else if (mappedSort.sortBy === 'changeName') mappedSort.sortBy = 'employeeChangedName'
        else if (mappedSort.sortBy === 'beforePermission') mappedSort.sortBy = 'beforePermissionName'
        else if (mappedSort.sortBy === 'afterPermission') mappedSort.sortBy = 'afterPermissionName'
        else if (mappedSort.sortBy === 'targetId') mappedSort.sortBy = 'employeeChangedLoginId'
        else if (mappedSort.sortBy === 'modifierId') mappedSort.sortBy = 'employeeAccessorLoginId'
        else if (mappedSort.sortBy === 'occurredAt') mappedSort.sortBy = 'changedAt'
    }
    
    // API Call
    const res = await getPermissionLogList({
      page: page.value,
      size: pageSize.value,
      detail: searchParams,
      sort: mappedSort
    })

    // 매핑
    permissionLogList.value = (res.content || []).map(item => ({
      permissionLogCode: item.permissionChangedLogCode,
      // 변경명 생성: "{대상자이름} 권한 변경"
      changeName: `${item.employeeChangedName} 권한 변경`,
      beforePermission: item.beforePermissionName,
      afterPermission: item.afterPermissionName,
      targetId: item.employeeChangedLoginId,
      modifierId: item.employeeAccessorLoginId,
      occurredAt: item.changedAt
    }))
    
    totalCount.value = res.totalElements || 0
  } catch (error) {
    console.error('권한 변경 로그 조회 실패:', error)
    permissionLogList.value = []
    totalCount.value = 0
  }
}

// 날짜 변경
const handleDateChange = () => {
  page.value = 1
  loadPermissionLogs()
}

// 검색 핸들러
const onSearch = (payload) => {
  page.value = 1
  
  // quickSearch 초기화
  quickSearch.value = {
    keyword: null,
    targetId: null,
    modifierId: null,
    beforePermission: null,
    afterPermission: null
  }

  if (!payload || !payload.value) {
    loadPermissionLogs()
    return
  }

  const key = payload.key ?? payload.type
  const value = payload.value

  if (key === 'targetId') {
      quickSearch.value.targetId = value
  } else if (key === 'modifierId') {
      quickSearch.value.modifierId = value
  } else if (key === 'beforePermission') {
      quickSearch.value.beforePermission = value
  } else if (key === 'afterPermission') {
      quickSearch.value.afterPermission = value
  } else {
      quickSearch.value.keyword = value
  }

  loadPermissionLogs()
}

// 페이지 변경
const onPageChange = (p) => {
  page.value = p
  loadPermissionLogs()
}

// 정렬 변경
const onSortChange = (sort) => {
  sortState.value = sort
  loadPermissionLogs()
}

onMounted(() => {
  loadPermissionLogs()
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

/* ContentTabs 중앙 정렬 */
:deep(.tabs) {
  justify-content: center;
}
</style>