<template>
  <div class="activity-all-page">
    <div class="page-header">
      <BaseButton type="primary" @click="openCreateModal">직원 등록</BaseButton>
    </div>
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
        <span>{{ row.statusText }}</span>
      </template>


      <template #cell-actions="{ row }">
        <div class="menu-container">
          <button class="kebab-btn" @click.stop="toggleMenu(row, $event)">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </button>
        </div>
      </template>

      <!-- 상세검색 -->
      <template #detail-form>
        <div class="detail-form">
          <div class="row">
            <label>직원 명</label>
            <input v-model="detailForm.employeeName"/>
          </div>

          <div class="row">
            <label>사번</label>
            <input v-model="detailForm.employeeNumber"/>
          </div>

          <div class="row">
            <label>전화번호</label>
            <input v-model="detailForm.phoneNumber"/>
          </div>

          <div class="row">
            <label>이메일</label>
            <input v-model="detailForm.email"/>
          </div>
        </div>
      </template>
    </ListView>

    <!-- 상세 모달 -->
    <EmployeeDetailModal
        v-if="showRowModal"
        :employeeCode="selectedEmployee?.employeeCode"
        :reason="currentReason"
        @close="closeRowModal"
        @refresh="loadEmployeeList"
    />

    <!-- 사유 입력 모달 -->
    <ReasonRequestModal
        v-if="showReasonModal"
        @close="closeReasonModal"
        @confirm="onReasonConfirmed"
    />

    <!-- 비밀번호 초기화 결과 모달 -->
    <BaseModal
        v-if="showResetModal"
        title="비밀번호 초기화 결과"
        @close="closeResetModal"
    >
      <div class="reset-result-content">
        <p class="desc">임시 비밀번호가 메일로 발송 되었습니다.</p>
      </div>
      <template #footer>
        <BaseButton type="primary" @click="closeResetModal">확인</BaseButton>
      </template>
    </BaseModal>


    <Teleport to="body">
      <div
          v-if="activeMenuRow"
          class="context-menu"
          :style="menuStyle"
          @click.stop
      >

        <template v-if="activeMenuRow.employeeStatus === 'ACTIVE'">
          <button class="menu-item danger" @click="handleAction('lock', activeMenuRow)">
            사용자 잠금
          </button>
          <button class="menu-item danger" @click="handleAction('resetPassword', activeMenuRow)">
            비밀번호 초기화
          </button>
        </template>

        <!-- LOCKED / DORMANCY: 사용자 활성화, 비번 초기화, 유저 수정 -->
        <template v-else>
          <button class="menu-item primary" @click="handleAction('activate', activeMenuRow)">
            사용자 활성화
          </button>
          <button class="menu-item danger" @click="handleAction('resetPassword', activeMenuRow)">
            비밀번호 초기화
          </button>
        </template>

        <!-- 공통: 유저 수정 -->
        <button class="menu-item" @click="handleAction('edit', activeMenuRow)">
          유저 수정
        </button>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import {ref, onMounted, watch} from 'vue'
import ListView from '@/components/common/ListView.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import {
  getEmployeeList,
  updateEmployeeStatus,
  resetEmployeePassword,
  unlockEmployee,
  lockEmployee
} from '@/api/setting/employeeApi.js'
import EmployeeDetailModal from "@/views/setting/modal/EmployeeDetailModal.vue";
import ReasonRequestModal from "@/views/setting/modal/ReasonRequestModal.vue";
import {usePermissionGuard} from '@/composables/usePermissionGuard';
import {ElMessageBox} from "element-plus";
// ...
const {withPermission} = usePermissionGuard();

const columns = [
  {key: 'employeeNumber', label: '사번', align: 'center', sortable: true, width: '100px'},
  // { key: 'departmentName', label: '부서',sortable: true, width: '100px' }, // 제거
  // { key: 'hotelPositionName', label: '직책', align: 'center',sortable: true, width: '100px' }, // 제거
  {key: 'permissionName', label: '권한', align: 'center', sortable: true, width: '120px'}, // 추가
  {key: 'employeeName', label: '이름', align: 'center', sortable: true, width: '100px'},
  {key: 'phoneNumber', label: '전화번호', align: 'center', sortable: true, width: '140px'},
  {key: 'loginId', label: '아이디', align: 'center', sortable: true, width: '100px'},
  {key: 'email', label: '이메일', align: 'center', sortable: true, width: '200px'},
  {key: 'employeeStatus', label: '상태', align: 'center', sortable: true, width: '100px'},
  {key: 'actions', label: '', align: 'center', sortable: false, width: '60px'},
]

const rows = ref([])
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(10)

const filterValues = ref({
  employeeStatus: null,
})

const sortState = ref({})

const searchTypes = [
  {label: '전체', value: ''},
  {label: '부서', value: 'departmentName'},
  {label: '직책', value: 'hotelPositionName'},
  {label: '이름', value: 'employeeName'},
  {label: '권한', value: 'permissionName'},
]

const filters = [
  {
    key: 'employeeStatus',
    options: [
      {label: '상태', value: ''},
      {label: 'ACTIVE', value: 'ACTIVE'},
      {label: 'LOCKED', value: 'LOCKED'},
      {label: 'DORMANCY', value: 'DORMANCY'},
      {label: 'INACTIVE', value: 'INACTIVE'},
    ],
  }
]

const quickSearch = ref({
  keyword: null,        // 전체검색
  employeeName: null,
  employeeNumber: null,
  departmentName: null,
  hotelPositionName: null,
  permissionName:null
})

const detailForm = ref({
  employeeName: null,
  employeeNumber: null,
  phoneNumber: null,
  email: null,
})

const loadEmployeeList = async () => {
  try {
    const searchParams = {
      keyword: quickSearch.value.keyword,
      employeeName: quickSearch.value.employeeName ?? detailForm.value.employeeName,
      employeeNumber: quickSearch.value.employeeNumber ?? detailForm.value.employeeNumber,
      departmentName: quickSearch.value.departmentName,
      hotelPositionName: quickSearch.value.hotelPositionName,
      permissionName: quickSearch.value.permissionName,
      phoneNumber: detailForm.value.phoneNumber,
      email: detailForm.value.email
    }

    const res = await getEmployeeList({
      page: page.value,
      size: pageSize.value,
      filters: filterValues.value,
      detail: searchParams,
      sort: sortState.value,
    })

    const data = res
    // API return structure: { content: [], totalElements: 123 }

    rows.value = (data.content || []).map(r => {
      return {
        ...r,
        statusText: r.employeeStatus, // Simple mapping for now
      }
    })

    totalCount.value = data.totalElements || 0
  } catch (e) {
    console.error(e)
  }
}

const onSearch = (payload) => {
  page.value = 1

  quickSearch.value = {
    keyword: null,
    employeeName: null,
    employeeNumber: null,
    departmentName: null,
    positionName: null
  }

  if (!payload || !payload.value) {
    loadEmployeeList()
    return
  }

  const key = payload.key ?? payload.type
  const value = payload.value

  if (key === '' || key === 'keyword') {
    quickSearch.value.keyword = value
  } else if (key === 'employeeName') {
    quickSearch.value.employeeName = value
  } else if (key === 'departmentName') {
    quickSearch.value.departmentName = value
  } else if (key === 'hotelPositionName') {
    quickSearch.value.hotelPositionName = value
  } else if (key === 'permissionName') {
    quickSearch.value.permissionName = value
  }

  loadEmployeeList()
}

/* ===================== */
/* 상세검색 watch (모달 전용) */
/* ===================== */
watch(
    () => ({...detailForm.value}),
    (v) => {
      // 값이 하나라도 있으면 검색 수행
      if (!v.employeeName && !v.employeeNumber && !v.phoneNumber && !v.email) {
        return
      }

      //  상세검색 시 기본검색 무효화 (필요시)
      // quickSearch.value.keyword = null

      page.value = 1
      loadEmployeeList()
    }
)

const onFilter = (values) => {
  filterValues.value = {
    employeeStatus: values.employeeStatus ?? null,
  }
  page.value = 1
  loadEmployeeList()
}

const onSortChange = (sort) => {
  sortState.value = sort
  loadEmployeeList()
}

const onPageChange = (p) => {
  page.value = p
  loadEmployeeList()
}

const onDetailReset = () => {
  detailForm.value = {
    employeeName: null,
    employeeNumber: null,
    phoneNumber: null,
    email: null,
  }

  // 기본검색도 초기화
  quickSearch.value = {
    keyword: null,
    employeeName: null,
    employeeNumber: null,
    departmentName: null,
    hotelPositionName: null
  }

  page.value = 1
  loadEmployeeList()
}

const showRowModal = ref(false)
const selectedEmployee = ref(null)
const currentReason = ref('')

const showReasonModal = ref(false)
const pendingRow = ref(null)

const openRowModal = (row) => {
  // 생성 모드가 아닌 조회/수정 모드일 때만 사유 입력
  // row가 있으면 기존 회원 조회
  withPermission('EMPLOYEE_READ', () => {
    if (row && row.employeeCode) {
      pendingRow.value = row
      currentReason.value = ''
      showReasonModal.value = true
    } else {
      // 혹시 모를 예외 처리 (row 없이 호출 시)
      selectedEmployee.value = row
      showRowModal.value = true
    }
  });
}

const openCreateModal = () => {
  withPermission('EMPLOYEE_CREATE', () => {
    selectedEmployee.value = {employeeCode: null} // Create Mode
    currentReason.value = ''
    showRowModal.value = true
  });
}

const closeReasonModal = () => {
  showReasonModal.value = false
  pendingRow.value = null
}

const onReasonConfirmed = (reason) => {
  currentReason.value = reason
  selectedEmployee.value = pendingRow.value
  showReasonModal.value = false
  showRowModal.value = true
}

const closeRowModal = () => {
  showRowModal.value = false
  selectedEmployee.value = null;
  currentReason.value = ''
}

/* ===================== */
/* Context Menu */
/* ===================== */
const activeMenuRow = ref(null)
const menuStyle = ref({top: '0px', left: '0px'})

const toggleMenu = (row, event) => {
  if (event) {
    event.stopPropagation()
  } // 행 클릭 방지

  if (activeMenuRow.value && activeMenuRow.value.employeeCode === row.employeeCode) {
    activeMenuRow.value = null
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()

  menuStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.right - 140}px`, // Align somewhat to right
    position: 'fixed',
    zIndex: 9999
  }

  activeMenuRow.value = row
}

// 메뉴 외부 클릭 시 닫기 (Optional: 전역 클릭 이벤트 추가 필요하지만 간단히 구현)
// 실제로는 global click listener가 필요하나, 여기서는 다른 행 클릭 시 닫히는 것으로 대체될 수 있음.

const handleAction = (action, row) => {
  withPermission('EMPLOYEE_UPDATE', async () => {
    activeMenuRow.value = null // 메뉴 닫기

    if (action === 'edit') {
      openRowModal(row)
      return
    }

    try {
      if (action === 'lock') {
        if (!confirm(`${row.employeeName} 님을 잠금 처리하시겠습니까?`)) {
          return
        }
        await lockEmployee(row.employeeCode)
        await ElMessageBox.alert('잠금 되었습니다', '알림', {
          confirmButtonText: '확인',
          type: 'warning', // success, warning, info, error 아이콘 자동 생성
        });
      } else if (action === 'activate') {
        if (!confirm(`${row.employeeName} 님을 활성화하시겠습니까?`)) {
          return
        }
        await unlockEmployee(row.employeeCode)
        alert('활성화되었습니다.')
      } else if (action === 'resetPassword') {
        if (!confirm(`${row.employeeName} 님의 비밀번호를 초기화하시겠습니까?`)) {
          return
        }
        const res = await resetEmployeePassword(row.employeeCode)
        resetPasswordResult.value = res?.data ?? res
        showResetModal.value = true
      }

      // 리스트 갱신
      loadEmployeeList()
    } catch (e) {
      console.error(e)
      alert('요청 처리에 실패했습니다.')
    }
  });
}

/* ===================== */
/* 초기 로딩 */
/* ===================== */
const showResetModal = ref(false)
const resetPasswordResult = ref('')

const closeResetModal = () => {
  showResetModal.value = false
  resetPasswordResult.value = ''
}

/* ... existing code ... */
onMounted(() => {
  loadEmployeeList()
  window.addEventListener('click', () => {
    activeMenuRow.value = null
  })
})
</script>

<style scoped>
.reset-result-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 20px 0;
}

.desc {
  font-size: 15px;
  color: #374151;
}

.result-box {
  width: 100%;
  background: #f3f4f6;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.result-box label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
}

.password-text {
  font-size: 24px;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 1px;
}

.caution {
  font-size: 13px;
  color: #ef4444;
}
</style>

<style scoped>
.activity-all-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 20px;
}

.page-header {
  display: flex;
  justify-content: flex-end;
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

/* Context Menu Styles */
.menu-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.kebab-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 12px; /* Click area increased */
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  transition: background-color 0.2s;
}

.kebab-btn:hover {
  background-color: #f3f4f6;
}

.dot {
  width: 4px;
  height: 4px;
  background-color: #6b7280;
  border-radius: 50%;
}

.context-menu {
  position: absolute;
  top: 100%;
  right: 0; /* Align to right */
  z-index: 1000; /* High z-index */
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  min-width: 160px; /* Slightly wider */
  padding: 4px 0;
  overflow: hidden;
}

/* Override BaseTable cell overflow to allow menu to show */
:deep(.base-table td) {
  overflow: visible !important;
}

.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 16px; /* Larger touch target */
  font-size: 14px;
  border: none;
  background: white;
  cursor: pointer;
  color: #374151;
}


.menu-item:hover {
  background-color: #f3f4f6;
}

.menu-item.danger {
  color: #ef4444;
  background-color: #fef2f2;
}

.menu-item.danger:hover {
  background-color: #fee2e2;
}

.menu-item.primary {
  color: #2563eb;
  background-color: #eff6ff;
}

.menu-item.primary:hover {
  background-color: #dbeafe;
}
</style>
