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
        :rows="activityLogList"
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
    >
      <!-- 상세 정보 커스텀 셀 -->
      <template #cell-detail="{ value }">
        <span class="detail-text" :title="value">{{ value }}</span>
      </template>
    </ListView>

    <!-- 상세 모달 -->
    <BaseModal
        v-if="showRowModal"
        title="활동 로그 상세 정보"
        @close="closeRowModal"
    >
      <div class="modal-scroll-content">
        <div v-if="activityLogDetail" class="detail-view">
          <p><b>로그 번호:</b> {{ activityLogDetail.auditLogCode }}</p>
          <p><b>메뉴명:</b> {{ activityLogDetail.menuName }}</p>
          <p><b>업무명:</b> {{ activityLogDetail.action }}</p>
          <p><b>상세 정보:</b> {{ activityLogDetail.detail }}</p>

          <!-- 변경 전/후 값 표시 (값이 있을 때만) -->
          <p v-if="activityLogDetail.previousValue">
            <b>변경 전:</b> {{ activityLogDetail.previousValue }}
          </p>
          <p v-if="activityLogDetail.newValue">
            <b>변경 후:</b> {{ activityLogDetail.newValue }}
          </p>

          <p><b>접속자 ID:</b> {{ activityLogDetail.loginId }}</p>
          <p><b>일시:</b> {{ activityLogDetail.occurredAt }}</p>
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
import {
  getActivityLogList,
  getSystemLogDetail 
} from '@/api/system/systemLogApi.js'
import { usePermissionGuard } from '@/composables/usePermissionGuard';
import { useAuthStore } from '@/stores/authStore'

const { withPermission } = usePermissionGuard();
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
  { key: 'auditLogCode', label: '활동 로그 코드', sortable: true, width: '140px', align: 'center' },
  { key: 'action', label: '업무명', sortable: true, align: 'center' },
  { key: 'detail', label: '상세 정보', sortable: true, align: 'left' },
  { key: 'loginId', label: '접속자 ID', sortable: true, align: 'center' },
  { key: 'occurredAt', label: '일시', sortable: true, align: 'center' }
]

// 상태 관리
const activityLogList = ref([])
const activityLogDetail = ref(null)
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 검색 타입 (전체만 지원하거나 필요한 경우 추가)
const searchTypes = [
  //{ label: '전체', value: '' },
  { label: '접속자 ID', value: 'loginId' },
  { label: '업무명', value: 'action' },
  { label: '상세 정보', value: 'detail' }
]

// 필터 옵션 정의 (리소스, 업무명)
const filterOptions = [
  {
    key: 'resource',
    options: [
      { label: '리소스 전체', value: '' },
      { label: '리포트 레이아웃', value: 'REPORT_LAYOUT' },
      { label: '리포트 레이아웃 템플릿', value: 'REPORT_LAYOUT_TEMPLATE' },
      { label: '리포트 레이아웃 템플릿 라이브러리', value: 'REPORT_LAYOUT_TEMPLATE_LIBRARY' },
      { label: '회원', value: 'MEMBER' },
      { label: '직원', value: 'EMPLOYEE' },
      { label: '고객', value: 'CUSTOMER' },
      { label: '고객 메모', value: 'CUSTOMER_MEMO' },
      { label: '멤버십 정책', value: 'MEMBERSHIP_POLICY' },
      { label: '로열티 정책', value: 'LOYALTY_POLICY' },
      { label: '고객 타임라인', value: 'CUSTOMER_TIMELINE' },
      { label: '예약', value: 'RESERVATION' },
      { label: '당일 예약', value: 'TODAY_RESERVATION' },
      { label: '체크인', value: 'CHECK_IN' },
      { label: '체크아웃', value: 'CHECK_OUT' },
      { label: '당일 시설 이용', value: 'TODAY_FACILITY_USAGE' },
      { label: '문의', value: 'INQUIRY' },
      { label: '사건사고', value: 'INCIDENT' },
      { label: '메시지', value: 'MESSAGE' },
      { label: '권한', value: 'PERMISSION' },
      { label: '목표 관리', value: 'SETTING_OBJECTIVE' }
    ]
  },
  {
    key: 'action',
    options: [
      { label: '업무 전체', value: '' },
      { label: '목록조회', value: 'LIST' },
      { label: '상세조회', value: 'READ' },
      { label: '등록', value: 'CREATE' },
      { label: '수정', value: 'UPDATE' },
      { label: '삭제', value: 'DELETE' }
    ]
  }
]

// 필터 값
const filterValues = ref({
  resource: undefined,
  action: undefined
})

// 날짜 필터
const dateFilter = ref({
  fromDate: null,
  toDate: null
})

// 검색어 상태
const quickSearch = ref({
  keyword: null,
  loginId: null,
  action: null,
  detail: null
})

const sortState = ref({})

// 모달 상태
const showRowModal = ref(false)
const selectedRow = ref(null)

// 데이터 로드
const loadActivityLogs = async () => {
  try {
    const resource = filterValues.value.resource || ''
    const action = filterValues.value.action || quickSearch.value.action || ''
    
    let permissionTypeKey = ''
    if (resource && action) {
      permissionTypeKey = `${resource}_${action}`
    } else if (resource) {
      permissionTypeKey = resource
    } else if (action) {
      permissionTypeKey = action
    }

    // API wrapper(getActivityLogList) 내부에서 날짜 포맷팅과 action -> permissionTypeKey 매핑을 처리함
    const searchParams = {
      loginId: quickSearch.value.loginId,
      action: permissionTypeKey, // API 내부에서 permissionTypeKey로 매핑됨
      detail: quickSearch.value.detail,
      fromDate: dateFilter.value.fromDate || null, // API 내부에서 T00:00:00 추가됨
      toDate: dateFilter.value.toDate || null      // API 내부에서 T23:59:59 추가됨
    }

    // 2. 정렬 필드 매핑
    let mappedSort = { ...sortState.value }
    if (mappedSort.sortBy) {
      if (mappedSort.sortBy === 'action') mappedSort.sortBy = 'permissionTypeKey'
      else if (mappedSort.sortBy === 'detail') mappedSort.sortBy = 'details'
      else if (mappedSort.sortBy === 'loginId') mappedSort.sortBy = 'employeeLoginId'
    }

    const requestPage = page.value;

    const res = await getActivityLogList({
      page: requestPage,
      size: pageSize.value,
      detail: searchParams,
      sort: mappedSort
    })

    // 4. 결과 매핑 (백엔드 응답 필드 -> 프론트엔드 테이블 필드)
    activityLogList.value = (res.content || []).map(item => ({
      ...item,
      action: item.permissionTypeKey, // 백엔드 Enum/필드명 -> 테이블 '업무명'
      detail: item.details,           // 백엔드 details -> 테이블 '상세 정보'
      loginId: item.employeeLoginId   // 백엔드 employeeLoginId -> 테이블 '접속자 ID'
    }))
    totalCount.value = res.totalElements || 0
  } catch (error) {
    console.error('활동 로그 조회 실패:', error)
    activityLogList.value = []
    totalCount.value = 0
  }
}

// 날짜 변경
const handleDateChange = () => {
  page.value = 1
  loadActivityLogs()
}

// 검색 핸들러
const onSearch = (payload) => {
  page.value = 1
  // 검색어 초기화
  quickSearch.value = { keyword: null, loginId: null, action: null, detail: null }

  const key = payload.key ?? payload.type
  const value = payload.value

  if (key === 'loginId') {
    quickSearch.value.loginId = value
  } else if (key === 'detail') {
    quickSearch.value.detail = value
  } else if (key === 'action') { // 이 부분을 명시적으로 추가!
    quickSearch.value.action = value
  } else {
    quickSearch.value.keyword = value
  }

  loadActivityLogs()
}

// 필터 변경
const onFilter = (filters) => {
  filterValues.value = filters
  page.value = 1
  loadActivityLogs()
}


// 페이지 변경
const onPageChange = (p) => {
  page.value = p < 1 ? 1 : p
  loadActivityLogs()
}

// 정렬 변경
const onSortChange = (sort) => {
  sortState.value = sort
  loadActivityLogs()
}

// 모달 열기
const openRowModal =  (row) => {
  withPermission('LOG_AUDIT_READ', async () => {
    selectedRow.value = row
    showRowModal.value = true
    activityLogDetail.value = null // 로딩 상태

    try {
      const detailData = await getSystemLogDetail(row.auditLogCode)
      activityLogDetail.value = {
        ...row,
        ...detailData // previousValue, newValue 포함
      }
    } catch (error) {
      console.error('활동 로그 상세 조회 실패:', error)
      // 실패 시 기본 row 데이터라도 보여줌
      activityLogDetail.value = row
    }
  });
}

const closeRowModal = () => {
  showRowModal.value = false
  selectedRow.value = null
  activityLogDetail.value = null
}

onMounted(() => {
  loadActivityLogs()
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

/* 검색 컨테이너 */
:deep(.search-bar) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap; 
  width: auto;
  max-width: 100%;
}

/* 검색 입력창 너비 확장 (반응형) */
:deep(.input-wrap .input) {
  width: 600px !important; 
  max-width: 100%;         
  min-width: 200px;        
}

/* ==================== 테이블 관련 ==================== */
.detail-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px; /* 상세 정보 길이 제한 */
}

/* ContentTabs 중앙 정렬 */
:deep(.tabs) {
  justify-content: center;
}

/* 모달 스타일 */

/* ==================== 모달 스타일 ==================== */
.modal-scroll-content {
  max-height: 50vh;
  overflow-y: auto;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 스크롤바 스타일 */
.modal-scroll-content::-webkit-scrollbar {
  width: 6px;
}
.modal-scroll-content::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}
.modal-scroll-content::-webkit-scrollbar-track {
  background-color: #f3f4f6;
}

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
</style>