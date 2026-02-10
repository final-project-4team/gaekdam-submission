<template>
  <div class="activity-all-page">


    <ListView
        :columns="columns"
        :rows="employeeList"
        :filters="filters"
        :searchTypes="searchTypes"
        show-detail
        v-model:detail="detailForm"
        @row-click="openRowModal"
    >

      <template #detail-form>
        <div class="detail-form">
          <div class="row">
            <label>고객명</label>
            <input v-model="detailForm.customerName" />
          </div>

          <div class="row">
            <label>예약번호</label>
            <input v-model="detailForm.reservationNo" />
          </div>

          <div class="row">
            <label>운영상태</label>
            <select v-model="detailForm.status">
              <option value="">전체</option>
              <option value="투숙중">투숙중</option>
              <option value="체크인예정">체크인예정</option>
              <option value="체크아웃예정">체크아웃예정</option>
            </select>
          </div>
        </div>
      </template>
    </ListView>

    <BaseModal
        v-if="showRowModal"
        title="예약 상세"
        @close="closeRowModal"
    >
      <div v-if="selectedRow" class="detail-view">
        <p><b>예약번호:</b> {{ selectedRow.reservationNo }}</p>
        <p><b>고객명:</b> {{ selectedRow.customerName }}</p>
        <p><b>객실유형:</b> {{ selectedRow.roomType }}</p>
        <p><b>투숙기간:</b> {{ selectedRow.checkinDate }} ~ {{ selectedRow.checkoutDate }}</p>
        <p><b>운영상태:</b> {{ selectedRow.status }}</p>
      </div>
    </BaseModal>
  </div>
</template>


<script setup>
import {onMounted, ref} from 'vue'

import ListView from '@/components/common/ListView.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import {hotelGroupList} from "@/api/hotelGroupApi.js";

const employeeList=ref([]);

const searchTypes = [
  { label: '전체', value: '' },
  { label: '고객명', value: 'CUSTOMER_NAME' },
  { label: '예약번호', value: 'RESERVATION_NO' },
]


const filters = [
  {
    key: 'status',
    options: [
      { label: '운영상태', value: '' },
      { label: '투숙중', value: '투숙중' },
      { label: '체크인예정', value: '체크인예정' },
      { label: '체크아웃예정', value: '체크아웃예정' },
    ],
  },
  {
    key: 'roomType',
    options: [
      { label: '객실유형', value: '' },
      { label: '디럭스', value: '디럭스' },
      { label: '스위트', value: '스위트' },
    ],
  },
]


const columns = [
  { key: 'hotelGroupCode', label: '그룹코드', align: 'center' },
  { key: 'hotelGroupName', label: '호텔그룹명' },
  { key: 'hotelExpiredAt', label: '만료일', align: 'center' },
]


const detailForm = ref({
  customerName: '',
  reservationNo: '',
  status: '',
})


const showRowModal = ref(false)
const selectedRow = ref(null)

const openRowModal = (row) => {
  selectedRow.value = row
  showRowModal.value = true
}

const closeRowModal = () => {
  showRowModal.value = false
  selectedRow.value = null
}


onMounted(async () => {
  employeeList.value = await hotelGroupList();
});
</script>


<style scoped>
.activity-all-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 20px;
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

.detail-form input,
.detail-form select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.detail-view p {
  margin: 6px 0;
}

</style>
