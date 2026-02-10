<template>
  <div class="permission-page">
    <div class="page-header">
      <BaseButton type="primary" @click="openCreateModal">권한 등록</BaseButton>
    </div>

    <!-- ListView 적용 -->
    <ListView
      :columns="columns"
      :rows="permissionList"
      :total="totalCount"
      :page="page"
      :pageSize="pageSize"
      :showSearch="true"
      :searchTypes="searchTypes"
      @search="onSearch"
      @page-change="onPageChange"
      @row-click="openEditModal"
    >
      <template #cell-actions="{ row }">
        <div class="action-buttons" @click.stop>
          <BaseButton 
            type="danger" 
            size="sm" 
            @click="deletePermission(row)"
            class="action-btn"
          >
            삭제
          </BaseButton>
        </div>
      </template>
    </ListView>

    <!-- 권한 상세/등록 모달 -->
    <PermissionDetailModal
      v-if="showModal"
      :permission="selectedPermission"
      @close="closeModal"
      @refresh="fetchPermissions"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import ListView from '@/components/common/ListView.vue'
import PermissionDetailModal from '@/views/setting/modal/PermissionDetailModal.vue'
import { getPermissionList, deletePermission as apiDeletePermission } from '@/api/setting/permissionApi.js'
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();
const permissionList = ref([])
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(10) // 기본 10개
const searchKeyword = ref('')

const showModal = ref(false)
const selectedPermission = ref(null)

// === Columns ===
const columns = [
  { key: 'permissionName', label: '권한 이름', align: 'center', width: '200px' },
  // 필요하다면 권한 개수 등을 보여줄 수 있지만, 현재 API 응답에 count가 있는지 불확실. 
  // 일단 이름만 표시.
  { key: 'actions', label: '관리', align: 'center', width: '120px' }
]

const searchTypes = [
  { label: '권한 이름', value: 'permissionName' }
]


const fetchPermissions = async () => {
  try {
    
    //  전체 조회
    const res = await getPermissionList()
    let allData = res.content || []

    // 검색 필터링
    if (searchKeyword.value) {
      allData = allData.filter(item => 
        item.permissionName.toLowerCase().includes(searchKeyword.value.toLowerCase())
      )
    }

    totalCount.value = allData.length
    
    //  페이징
    const start = (page.value - 1) * pageSize.value
    const end = start + pageSize.value
    permissionList.value = allData.slice(start, end)

  } catch (e) {
    console.error("Permissions Fetch Failed", e)
  }
}

// === Event Handlers ===
const onSearch = (payload) => {
  // ListView search event: payload = { key: 'permissionName', value: '...' }
  if (payload) {
    searchKeyword.value = payload.value
  } else {
    searchKeyword.value = ''
  }
  page.value = 1
  fetchPermissions()
}

const onPageChange = (p) => {
  page.value = p
  fetchPermissions()
}

// === Modal Logic ===
const openCreateModal = () => {
  withPermission('PERMISSION_CREATE', () => {
    selectedPermission.value = null
    showModal.value = true
  });
}

const openEditModal = (row) => {
  withPermission('PERMISSION_UPDATE', () => {
    selectedPermission.value = row // 객체 통째로 전달
    showModal.value = true
  });
}

const closeModal = () => {
  showModal.value = false
  selectedPermission.value = null
}

// === Delete Logic ===
const deletePermission =  (row) => {
  withPermission('PERMISSION_DELETE', async () => {
    if (!confirm(`'${row.permissionName}' 권한을 삭제하시겠습니까?`)) return
    try {
      await apiDeletePermission(row.permissionCode)
      alert('권한이 삭제되었습니다.')
      fetchPermissions()
    } catch (e) {
      console.error("Delete failed", e)
      alert('권한 삭제 중 오류가 발생했습니다.')
    }
  });
}

// === Lifecycle ===
onMounted(fetchPermissions)
</script>

<style scoped>
.permission-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 20px;
}

.page-header {
  display: flex;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.action-btn {
  font-size: 12px;
  height: 30px;
  min-width: 50px;
}
</style>
