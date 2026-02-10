<template>
  <div class="activity-all-page">

    <div class="button-row">
      <BaseButton type="primary" size="md" @click="openActionModal">
        멤버십 추가
      </BaseButton>
    </div>

    <ListView
        :columns="columns"
        :rows="membershipGradeList"
        :filters="filters"
        :showSearch="false"
        show-detail
        @row-click="openRowModal"
        @filter="handleFilter"
    >
      <template #cell-calculationTermMonth="{ row }">
        {{ row.calculationTermMonth }} 개월
      </template>
      <template #cell-calculationRenewalDay="{ row }">
        1월  {{ row.calculationRenewalDay }}일
      </template>
      <template #cell-membershipGradeStatus="{ row }">
        <div class="action-buttons" @click.stop>
          <BaseButton size="sm" type="primary" @click="openEditModal(row)" class="action-btn">수정</BaseButton>
          <BaseButton size="sm" type="danger" @click="deactivateMembership(row)" class="action-btn">삭제</BaseButton>
        </div>
      </template>
    </ListView>


    <BaseModal
        v-if="showRowModal"
        title="멤버십 상세"
        @close="closeRowModal"
    >
      <div v-if="membershipGradeDetail" class="detail-view">
        <p><b>멤버십 등급 이름:</b> {{ membershipGradeDetail.gradeName}}</p>
        <p><b>등급:</b> {{ membershipGradeDetail.tierLevel }}</p>
        <p><b>멤버십 금액(포인트):</b> {{ membershipGradeDetail.calculationAmount }}</p>
        <p><b>숙박 횟수:</b> {{ membershipGradeDetail.calculationCount}}</p>
        <p><b>산정 기간(개월):</b> {{ membershipGradeDetail.calculationTermMonth}}</p>
        <p><b>승급 일자(매 년):</b> {{ membershipGradeDetail.calculationRenewalDay }}</p>
        <p><b>활성화 상태:</b> {{ membershipGradeDetail.membershipGradeStatus }}</p>
        <p><b>수정 일자:</b> {{ membershipGradeDetail.updatedAt }}</p>
        
        <div class="comment-box">
            <span class="comment-title">등급 설명</span>
            <p class="comment-text">{{ membershipGradeDetail.tierComment || '-' }}</p>
        </div>
      </div>
      <div class="modal-footer">
        <BaseButton 
          v-if="membershipGradeDetail?.membershipGradeStatus === 'ACTIVE'"
          type="danger" 
          size="sm" 
          @click="deactivateMembership" 
          style="margin-right: 8px;"
        >
          비활성화
        </BaseButton>
        <BaseButton type="primary" size="sm" @click="closeRowModal">닫기</BaseButton>
      </div>
    </BaseModal>
    

    <BaseModal
        v-if="showActionModal"
        :title="isEditMode ? '멤버십 등급 수정' : '멤버십 등급 추가'"
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
                    <th>멤버십 이름</th>
                    <td>
                        <input v-model="newMembership.gradeName" placeholder="예: 다이아몬드" class="full-input" />
                    </td>
                </tr>
                <tr>
                    <th>멤버십 등급</th>
                    <td>
                        <input v-model="newMembership.tierLevel" type="number" placeholder="예: 1" class="full-input" />
                    </td>
                </tr>
                <tr>
                    <th>등급 설명</th>
                    <td>
                        <input v-model="newMembership.tierComment" placeholder="예: VIP 전용 혜택" class="full-input" />
                    </td>
                </tr>
                <tr>
                    <th>멤버십 금액</th>
                    <td>
                        <div class="input-unit-wrapper">
                            <input v-model="newMembership.calculationAmount" type="number" class="unit-input" />
                            <span class="unit-text">포인트</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>숙박 횟수</th>
                    <td>
                        <div class="input-unit-wrapper">
                            <input v-model="newMembership.calculationCount" type="number" class="unit-input" />
                            <span class="unit-text">회</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>산정 기간</th>
                    <td>
                        <div class="input-unit-wrapper">
                            <input v-model="newMembership.calculationTermMonth" type="number" class="unit-input" readonly/>
                            <span class="unit-text">개월</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>승급 일자(매 년)</th>
                    <td>
                        <div class="input-unit-wrapper">
                            <input v-model="newMembership.calculationRenewalDay" type="number" class="unit-input" readonly />
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
            <BaseButton type="primary" class="footer-btn" @click="saveMembership">{{ isEditMode ? '수정 완료' : '멤버십 등록' }}</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>


<script setup>
import {onMounted, ref, computed} from 'vue'

import BaseModal from '@/components/common/modal/BaseModal.vue'
import {
  createMembershipGrade,
  updateMembershipGrade,
  deleteMembershipGrade,
  getMembershipGradeDetail,
  getMembershipGradeList
} from "@/api/setting/membershipGrade.js";
import BaseButton from "@/components/common/button/BaseButton.vue";
import ListView from "@/components/common/ListView.vue";
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();

const membershipGradeList=ref([]);
const membershipGradeDetail=ref([]);
const activeFilters = ref({})

const columns = [
  { key: 'gradeName', label: '멤버십 이름', align: 'center' },
  { key: 'tierLevel', label: '멤버십 등급' },
  { key: 'calculationAmount', label: '멤버십 금액(포인트)', align: 'center' },
  { key: 'calculationCount', label: '숙박 횟수', align: 'center' },
  { key: 'calculationTermMonth', label: '산정 기간(몇 개월)', align: 'center' },
  { key: 'calculationRenewalDay', label: '승급 일자(매 년)', align: 'center' },
  { key: 'membershipGradeStatus', label: '', align: 'center' } // Ensure status col exists for check
]

const filters = [
  {
    key: 'membershipGradeStatus',
    options: [
      { label: '전체 상태', value: '' },
      { label: '활성화된 멤버십', value: 'ACTIVE' },
      { label: '비활성화된 멤버십', value: 'INACTIVE' }
    ]
  }
]

// 1. filteredMembershipList 삭제하고 바로 membershipGradeList 사용하도록 변경
// const filteredMembershipList = computed(() => { ... }); (삭제)

const fetchMemberships = async (status = '') => {
    // API 요청 파라미터 매핑
    const params = {
        sortBy: 'gradeName',
        direction: 'ASC',
        status: status || 'ALL' // 값이 없으면 ALL
    };
    membershipGradeList.value = await getMembershipGradeList(params);
}

const handleFilter = (filterValues) => {
    activeFilters.value = filterValues;
    const status = filterValues.membershipGradeStatus;
    fetchMemberships(status);
}

const showRowModal = ref(false)
const showActionModal = ref(false)
const selectedRow = ref(null)

const newMembership = ref({
  membershipGradeCode:'',
    gradeName: '',
    tierLevel: '',
    tierComment: '',
    calculationAmount: '',
    calculationCount: '',
    calculationTermMonth: '',
    calculationRenewalDay: ''
})

const openRowModal =  (row) => {
  withPermission('MEMBERSHIP_POLICY_READ', async () => {
    selectedRow.value = row
    showRowModal.value = true

    const membershipGradeCode = row.membershipGradeCode;
    membershipGradeDetail.value = await getMembershipGradeDetail(membershipGradeCode);
  });
}

const closeRowModal = () => {
  showRowModal.value = false
  selectedRow.value = null
}

const deactivateMembership =  (row) => {
  withPermission('MEMBERSHIP_POLICY_DELETE', async () => {
    const target = (row && row.membershipGradeCode) ? row : selectedRow.value;
    if (!target) return;

    if (!confirm('정말로 이 멤버십 등급을 비활성화(삭제) 하시겠습니까?')) return

    try {
      await deleteMembershipGrade(target.membershipGradeCode)
      alert('멤버십 등급이 비활성화되었습니다.')
      
      // 목록 새로고침
      membershipGradeList.value = await getMembershipGradeList()

      // 모달 닫기
      if (showRowModal.value) {
        closeRowModal()
      }
    } catch (error) {
      console.error('멤버십 비활성화 실패:', error)
      alert('멤버십 비활성화 중 오류가 발생했습니다.')
    }
  });
}


const isEditMode = ref(false)

const openEditModal =  (row) => {
  withPermission('MEMBERSHIP_POLICY_UPDATE', async () => {
    isEditMode.value = true
    selectedRow.value = row

    try {
      const detail = await getMembershipGradeDetail(row.membershipGradeCode)
      newMembership.value = {
        membershipGradeCode: detail.membershipGradeCode,
        gradeName: detail.gradeName,
        tierLevel: detail.tierLevel,
        tierComment: detail.tierComment || '',
        calculationAmount: detail.calculationAmount,
        calculationCount: detail.calculationCount,
        calculationTermMonth: detail.calculationTermMonth,
        calculationRenewalDay: detail.calculationRenewalDay
      }
      showActionModal.value = true
    } catch (e) {
      console.error("상세 정보 로드 실패:", e)
    }
  });
}

const openActionModal = () => {
  withPermission('MEMBERSHIP_POLICY_CREATE',  () => {

    isEditMode.value = false
    newMembership.value = {
      membershipGradeCode: null,
      gradeName: '',
      tierLevel: '',
      tierComment: '',
      calculationAmount: '',
      calculationCount: '',
      calculationTermMonth: '12',
      calculationRenewalDay: '1'
    }
    showActionModal.value = true
  });
}

const closeActionModal = () => {
    showActionModal.value = false
    isEditMode.value = false
}

const saveMembership = async () => {
    try {
        const payload = {
            gradeName: newMembership.value.gradeName,
            tierLevel: Number(newMembership.value.tierLevel),
            tierComment: String(newMembership.value.tierComment || ''),
            calculationAmount: Number(newMembership.value.calculationAmount),
            calculationCount: Number(newMembership.value.calculationCount),
            calculationTermMonth: Number(newMembership.value.calculationTermMonth),
            calculationRenewalDay: Number(newMembership.value.calculationRenewalDay)
        }

        if (isEditMode.value) {
            const id = newMembership.value.membershipGradeCode;
            await updateMembershipGrade(id, payload)
            alert(`[성공] ${newMembership.value.gradeName} 등급이 수정되었습니다.`)
        } else {
            await createMembershipGrade(payload)
            alert(`[성공] ${newMembership.value.gradeName} 등급이 저장되었습니다.`)
        }

        membershipGradeList.value = await getMembershipGradeList()
        closeActionModal()
    } catch (error) {
        console.error('멤버십 저장 실패:', error)
        alert('작업 중 오류가 발생했습니다.')
    }
}

onMounted(async () => {
  await fetchMemberships();
});
</script>


<style scoped>
.activity-all-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 20px;
}

.button-row {
     display: flex;
    justify-content: flex-end;
}

.detail-view p {
  margin: 6px 0;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
}


.form-table-wrapper {
    padding: 10px 0;
}

.form-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
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

.input-unit-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 200px;
    position: relative;
}

.unit-input {
    width: 100%;
    padding: 8px 60px 8px 12px;
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
    justify-content: center;
    gap: 6px;
}

.action-btn {
    min-width: 50px;
    height: 30px;
    font-size: 12px;
}
</style>
