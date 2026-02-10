<template>
  <div class="setting-loyalty-page">

    <div class="button-row">
      <BaseButton type="primary" size="md" @click="openActionModal">
        로열티 정책 추가
      </BaseButton>
    </div>


    <ListView
        :columns="columns"
        :rows="loyaltyList"
        :filters="filters"
        :searchTypes="searchTypes"
        :showSearch="false"
        show-detail
        v-model:detail="detailForm"
        @row-click="openRowModal"
        @filter="handleFilter"
    >
      <template #cell-loyaltyGradeStatus="{ row }">
        <div class="action-buttons" @click.stop>
          <BaseButton size="sm" type="primary" @click="openEditModal(row)" class="action-btn">수정</BaseButton>
          <BaseButton size="sm" type="danger" @click="deactivateLoyalty(row)" class="action-btn">삭제</BaseButton>
        </div>
      </template>
    </ListView>


    <BaseModal
        v-if="showRowModal"
        title="로열티 정책 상세"
        @close="closeRowModal"
    >
      <div v-if="loyaltyGradeDetail" class="detail-view">
        <p><b>등급 코드:</b> {{ loyaltyGradeDetail.loyaltyGradeCode }}</p>
        <p><b>등급명:</b> {{ loyaltyGradeDetail.loyaltyGradeName }}</p>
        <p><b>등급 레벨:</b> {{ loyaltyGradeDetail.loyaltyTierLevel }}</p>
        <p><b>실적 금액(포인트):</b> {{ loyaltyGradeDetail.loyaltyCalculationAmount }}원</p>
        <p><b>숙박 횟수:</b> {{ loyaltyGradeDetail.loyaltyCalculationCount }}회</p>
        <p><b>산정 기간:</b> {{ loyaltyGradeDetail.loyaltyCalculationTermMonth }}개월</p>
        <p><b>승급 일자:</b> {{ loyaltyGradeDetail.loyaltyCalculationRenewalDay }}일</p>

        <div class="comment-box">
            <span class="comment-title">등급 설명</span>
            <p class="comment-text">{{ loyaltyGradeDetail.loyaltyTierComment || '-' }}</p>
        </div>
      </div>
      <div class="modal-footer">
        <BaseButton type="danger" size="sm" @click="deletePolicy" style="margin-right: 8px;">비활성화</BaseButton>
        <BaseButton type="primary" size="sm" @click="closeRowModal">확인</BaseButton>
      </div>
    </BaseModal>

    <!-- 추가/액션 모달 (디자인 변경) -->
    <BaseModal
        v-if="showActionModal"
        :title="isEditMode ? '로열티 정책 수정' : '로열티 정책 추가'"
        @close="closeActionModal"
    >
      <div class="form-table-wrapper">
        <table class="form-table">
            <colgroup>
                <col width="140" />
                <col />
            </colgroup>
            <tbody>
                <tr>
                    <th>등급 이름</th>
                    <td>
                        <input v-model="newPolicy.loyaltyGradeName" placeholder="예: 프리미엄 골드" class="full-input" />
                    </td>
                </tr>
                <tr>
                    <th>등급 레벨</th>
                    <td>
                        <input v-model="newPolicy.loyaltyTierLevel" type="number" placeholder="예: 1" class="full-input" />
                    </td>
                </tr>
                <tr>
                    <th>등급 설명</th>
                    <td>
                        <input v-model="newPolicy.loyaltyTierComment" placeholder="예: VIP 전용 혜택" class="full-input" />
                    </td>
                </tr>
                <tr>
                    <th>실적 금액</th>
                    <td>
                        <div class="input-unit-wrapper">
                            <input v-model="newPolicy.loyaltyCalculationAmount" type="number" class="unit-input" />
                            <span class="unit-text">원</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>실적 횟수</th>
                    <td>
                        <div class="input-unit-wrapper">
                            <input v-model="newPolicy.loyaltyCalculationCount" type="number" class="unit-input" />
                            <span class="unit-text">회</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>실적 기간</th>
                    <td>
                        <div class="input-unit-wrapper">
                            <input v-model="newPolicy.loyaltyCalculationTermMonth" type="number" class="unit-input" readonly/>
                            <span class="unit-text">개월</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>승급 판정 일자(매월)</th>
                    <td>
                        <div class="input-unit-wrapper">
                            <input v-model="newPolicy.loyaltyCalculationRenewalDay" type="number" class="unit-input" readonly />
                            <span class="unit-text">일</span>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
      </div>

      <template #footer>
        <div class="custom-modal-footer">
            <BaseButton type="danger" class="footer-btn" @click="closeActionModal">취소</BaseButton>
            <BaseButton type="primary" class="footer-btn" @click="savePolicy">{{ isEditMode ? '수정 완료' : '등록' }}</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

// 기존 컴포넌트 활용
import ListView from '@/components/common/ListView.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'

// API
import {
  getLoyaltyGradeList,
  getLoyaltyGradeDetail,
  createLoyaltyGrade,
  updateLoyaltyGrade,
  deleteLoyaltyGrade
} from "@/api/setting/loyaltyGrade.js"
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();
const loyaltyList = ref([])
const loyaltyGradeDetail = ref(null)
const activeFilters = ref({}) // 현재 적용된 필터

const detailForm = ref({
  loyaltyGradeName: '',
  minRate: '',
  maxRate: ''
})


const columns = [
  { key: 'loyaltyGradeName', label: '로열티 등급명', align: 'center', sortable: true },
  { key: 'loyaltyTierLevel', label: '등급 레벨', align: 'center', sortable: true },
  { key: 'loyaltyCalculationAmount', label: '실적 금액(포인트)', align: 'center', sortable: true },
  { key: 'loyaltyCalculationCount', label: '숙박 횟수', align: 'center' },
  { key: 'loyaltyCalculationTermMonth', label: '산정 기간(몇 개월)', align: 'center' },
  { key: 'loyaltyCalculationRenewalDay', label: '승급 일자(매 년)', align: 'center' },
  { key: 'loyaltyGradeStatus', label: '', align: 'center' }
]


const filters = [
  {
    key: 'loyaltyGradeStatus',
    options: [
      { label: '전체', value: '' },
      { label: '활성화된 로열티', value: 'ACTIVE' },
      { label: '비활성화된 로열티', value: 'INACTIVE' }
    ]
  }
]

const searchTypes = [
  { label: '전체', value: '' },
  { label: '정책명', value: 'loyaltyGradeName' }
]


// 1. filteredLoyaltyList 삭제하고 바로 loyaltyList 사용하도록 변경
// const filteredLoyaltyList = computed(() => { ... }); (삭제)

const fetchLoyaltyGrades = async (status = '') => {
    // API 요청 파라미터 매핑
    const params = {
        sortBy: 'loyaltyGradeName',
        direction: 'ASC',
        status: status || 'ALL' // 값이 없으면 ALL
    };
    loyaltyList.value = await getLoyaltyGradeList(params);
}

const handleFilter = (filterValues) => {
    activeFilters.value = filterValues;
    const status = filterValues.loyaltyGradeStatus; // 필터 키 사용
    fetchLoyaltyGrades(status);
}


const showRowModal = ref(false)
const showActionModal = ref(false)
const selectedRow = ref(null)
const isEditMode = ref(false)

// Updated to match the new image fields
const newPolicy = ref({
  loyaltyGradeCode: null,
  loyaltyGradeName: '',
  loyaltyTierLevel: '',
  loyaltyTierComment: '',
  loyaltyCalculationAmount: '',
  loyaltyCalculationCount: '',
  loyaltyCalculationTermMonth: '',
  loyaltyCalculationRenewalDay: ''
})

// 상세 모달 열기
const openRowModal =  (row) => {
  withPermission('LOYALTY_POLICY_READ', async () => {
    selectedRow.value = row
    showRowModal.value = true

    // API Call
    loyaltyGradeDetail.value = await getLoyaltyGradeDetail(row.loyaltyGradeCode)
  });
}

const closeRowModal = () => {
  showRowModal.value = false
  selectedRow.value = null
  loyaltyGradeDetail.value = null
}

// 등록 모달 열기
const openActionModal = () => {
  withPermission('LOYALTY_POLICY_CREATE',  () => {
    isEditMode.value = false
    newPolicy.value = {
      loyaltyGradeCode: null,
      loyaltyGradeName: '',
      loyaltyTierLevel: '',
      loyaltyTierComment: '',
      loyaltyCalculationAmount: '',
      loyaltyCalculationCount: '',
      loyaltyCalculationTermMonth: '12',
      loyaltyCalculationRenewalDay: '1'
    }
    showActionModal.value = true
  });
}

// 수정 모달 열기
const openEditModal = (row) => {
  withPermission('LOYALTY_POLICY_UPDATE',  () => {
    isEditMode.value = true
    newPolicy.value = {
      loyaltyGradeCode: row.loyaltyGradeCode,
      loyaltyGradeName: row.loyaltyGradeName,
      loyaltyTierLevel: row.loyaltyTierLevel,
      loyaltyTierComment: row.loyaltyTierComment,
      loyaltyCalculationAmount: row.loyaltyCalculationAmount,
      loyaltyCalculationCount: row.loyaltyCalculationCount,
      loyaltyCalculationTermMonth: row.loyaltyCalculationTermMonth,
      loyaltyCalculationRenewalDay: row.loyaltyCalculationRenewalDay
    }
    showActionModal.value = true
  });
}

const closeActionModal = () => {
  showActionModal.value = false
}

// 저장 로직
const savePolicy = async () => {
  try {
      const payload = {
        ...newPolicy.value,
        loyaltyTierLevel: Number(newPolicy.value.loyaltyTierLevel),
        loyaltyCalculationAmount: Number(newPolicy.value.loyaltyCalculationAmount),
        loyaltyCalculationCount: Number(newPolicy.value.loyaltyCalculationCount),
        loyaltyCalculationTermMonth: Number(newPolicy.value.loyaltyCalculationTermMonth),
        loyaltyCalculationRenewalDay: Number(newPolicy.value.loyaltyCalculationRenewalDay)
      }

      if (isEditMode.value) {
          await updateLoyaltyGrade(payload)
          alert(`[성공] ${newPolicy.value.loyaltyGradeName} 정책이 수정되었습니다.`)
      } else {
          await createLoyaltyGrade(payload)
          alert(`[성공] ${newPolicy.value.loyaltyGradeName} 정책이 저장되었습니다.`)
      }
      
      // Refresh
      loyaltyList.value = await getLoyaltyGradeList()
      closeActionModal()
  } catch (error) {
      console.error('로열티 정책 저장 실패:', error)
     // alert('로열티 정책 저장 중 오류가 발생했습니다.')
  }
}

// 비활성화/삭제 (List Action)
const deactivateLoyalty =  (row) => {
  withPermission('LOYALTY_POLICY_DELETE', async () => {
    if (!confirm('정말로 이 정책을 비활성화(삭제) 하시겠습니까?')) return

    try {
      await deleteLoyaltyGrade(row.loyaltyGradeCode)
      alert('정책이 비활성화되었습니다.')

      // Refresh
      loyaltyList.value = await getLoyaltyGradeList()
      closeRowModal()
    } catch (error) {
      console.error('로열티 정책 비활성화 실패:', error)
      //   alert('작업 중 오류가 발생했습니다.')
    }
  });
}

// 상세 모달 내부 삭제 (Deprecated but kept for now compatibility)
const deletePolicy = () => {
    if (selectedRow.value) {
        deactivateLoyalty(selectedRow.value)
    }
}

onMounted(async () => {
  await fetchLoyaltyGrades();
})
</script>

<style scoped>
.setting-loyalty-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 20px;
}

.button-row {
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
  align-items: center;
  gap: 8px;
}

.detail-form label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  width: 80px;
}

.detail-form input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.detail-view p {
  margin: 8px 0;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}


.form-table-wrapper {
    padding: 10px 0;
}

.form-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
}

.form-table {
    border-collapse: collapse;
}

.form-table th, .form-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 14px;
    vertical-align: middle;
}

.form-table tr:last-child th,
.form-table tr:last-child td {
    border-bottom: none;
}

.form-table th {
    background-color: #f3f4f6;
    color: #1f2937;
    font-weight: 600;
    text-align: center;
    border-right: 1px solid #e5e7eb;
}

.form-table td {
    background-color: #ffffff;
}


.full-input, .full-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
}

.select-wrapper {
    position: relative;
    width: 200px;
}

.input-unit-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 200px;
    position: relative;
}

.unit-input {
    width: 100%;
    padding: 8px 30px 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    text-align: center;
    font-size: 14px;
    box-sizing: border-box;

    -moz-appearance: textfield;
}

.unit-input::-webkit-outer-spin-button,
.unit-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.unit-input:read-only {
  background-color: #f3f4f6; /* 회색 배경 */
  color: #6b7280;
  outline: none;
  cursor: default;
}
.unit-text {
    position: absolute;
    right: 12px;
    font-size: 13px;
    color: #4b5563;
    pointer-events: none;
}


.custom-modal-footer {
    display: flex;
    justify-content: space-between;
    width: 100%;
    justify-content: center;
    gap: 40px;
    margin-top: 10px;
}

.footer-btn {
    min-width: 120px;
    height: 44px;
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

.action-buttons {
    display: flex;
    gap: 6px;
    justify-content: center;
}

.action-btn {

}
</style>
