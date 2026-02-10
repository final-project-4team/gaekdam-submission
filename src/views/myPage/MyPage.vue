<template>
  <div class="system-my-page">

    <section class="page-section">
      <div class="section-header">
        <h3>내 정보</h3>
      </div>

      <div class="detail-container">

        <div class="row">
          <div class="col">
            <label>성명</label>
            <input type="text" :value="myInfo.name" readonly class="read-only" />
          </div>
          <div class="col">
            <label>아이디</label>
            <input type="text" :value="myInfo.loginId" readonly class="read-only" />
          </div>
        </div>


        <div class="row">
          <div class="col">
            <label>사원번호</label>
            <input type="text" :value="myInfo.employeeNumber" readonly class="read-only" />
          </div>
          <div class="col">
            <label>입사일자</label>
            <input type="text" :value="formatDate(myInfo.hiredAt)" readonly class="read-only" />
          </div>
        </div>


        <div class="row">
          <div class="col">
            <label>부서</label>
            <input type="text" :value="myInfo.departmentName" readonly class="read-only" />
          </div>
          <div class="col">
            <label>직급</label>
            <input type="text" :value="myInfo.hotelPositionName" readonly class="read-only" />
          </div>
        </div>


        <div class="row">
          <div class="col">
            <label>권한</label>
             <input type="text" :value="myInfo.permissionName" readonly class="read-only" />
          </div>
          <div class="col">
            <label>전화번호</label>
            <input type="text" :value="myInfo.phone" readonly class="read-only" />
          </div>
        </div>


        <div class="row">
          <div class="col full-width">
            <label>이메일</label>
            <input type="text" :value="myInfo.email" readonly class="read-only" />
          </div>
        </div>
      </div>
    </section>

    <hr class="divider" />


    <section class="page-section">
      <div class="section-header flex-between">
        <h3>비밀번호 변경</h3>
        <BaseButton @click="onChangePassword">비밀번호 변경</BaseButton>
      </div>

      <div class="detail-container">
        <div class="row">
           <div class="col">
            <label>현재 비밀번호</label>
            <input type="password" v-model="passwordForm.currentPassword" />
          </div>
           <div class="col">
            <label>신규 비밀번호</label>
            <input type="password" v-model="passwordForm.newPassword" />
          </div>
           <div class="col">
            <label>신규 비밀번호 확인</label>
            <input 
              type="password" 
              v-model="passwordForm.confirmPassword" 
              :class="{ 'error-border': isPasswordMismatch }"
            />
            <p v-if="isPasswordMismatch" class="error-text">비밀번호가 일치하지 않습니다.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 결과 모달 -->
    <BaseModal 
      v-if="isModalOpen" 
      :title="modalTitle" 
      @close="closeModal"
    >
      <div class="modal-content-text">
        {{ modalMessage }}
      </div>
      <template #footer>
        <BaseButton type="primary" @click="closeModal">확인</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from "@/stores/authStore.js";
import {getMyPage} from "@/api/setting/employeeApi.js";
import { changePassword } from "@/api/system/myPageApi.js";
import BaseButton from "@/components/common/button/BaseButton.vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";

const saving = ref(false);
const authStore = useAuthStore();
const isModalOpen = ref(false);
const modalTitle = ref("");
const modalMessage = ref("");

const openModal = (title, message) => {
  modalTitle.value = title;
  modalMessage.value = message;
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};
const myInfo = ref({
  loginId: '',
  name: '',
  phone: '',
  departmentName: '',
  email: '',
  hotelPositionName: '',
  employeeStatus: '',
  employeeNumber: '',
  hiredAt: '',
  permissionName: ''
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const isPasswordMismatch = computed(() => {
    return passwordForm.value.newPassword && 
           passwordForm.value.confirmPassword && 
           passwordForm.value.newPassword !== passwordForm.value.confirmPassword
})

// 날짜 포맷팅
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return dateStr.substring(0, 10)
}

onMounted(async () => {
  try {
    const employeeDetail = await getMyPage();
        myInfo.value = {
          loginId: employeeDetail.loginId,
          name: employeeDetail.employeeName,
          phone: employeeDetail.phoneNumber,
          departmentName: employeeDetail.departmentName,
          email: employeeDetail.email,
          hotelPositionName: employeeDetail.hotelPositionName,
          employeeStatus: employeeDetail.employeeStatus,
          employeeNumber: employeeDetail.employeeNumber,
          hiredAt: employeeDetail.hiredAt,
          permissionName: employeeDetail.permissionName
        };
  } catch (e) {
    console.error("내 정보 불러오기 실패", e);
  }
});

const onChangePassword = async () => {
  // 1. 중복 클릭 방지 (가장 먼저)
  if (saving.value) return;
  saving.value = true;

  // 2. 유효성 검사 (아직 잠금 전)
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword) {
    alert("비밀번호를 입력해주세요.");
    saving.value = false;
    return;
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert("새 비밀번호가 일치하지 않습니다.");
    saving.value = false;
    return;
  }

  // 3. 잠금 시작

  try {
      const samplePassword=await changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    });
    
    // 성공 시 모달 오픈
    openModal("알림", samplePassword.data);
    
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
  } catch (e) {
    console.error("비밀번호 변경 실패", e);
    const errorMsg = e.response?.data.message || "비밀번호 변경에 실패했습니다.";
    openModal("오류", errorMsg);
  } finally {
    // 4. 잠금 해제 (항상 실행)
    saving.value = false;
  }
};
</script>

<style scoped>
.system-my-page {
  display: flex;
  flex-direction: column;
  gap: 40px;
  padding: 40px 0;
  max-width: 800px;
  margin: 0 auto;
}

.page-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #374151;
}

.section-header.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #374151;
  padding-bottom: 12px;
}

.section-header.flex-between h3 {
    border-bottom: none;
    padding-bottom: 0;
}

.divider {
  border: 0;
  height: 1px;
  background-color: #e5e7eb;
  margin: 0;
}


.detail-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 10px 0;
}

.row {
  display: flex;
  gap: 40px;
}

.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.col.full-width {
  flex: none;
  width: 100%;
}

label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

input, select {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  width: 100%;
}

input:focus {
  border-color: #2563eb;
  outline: none;
}

input.read-only {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: default;
}

.error-border {
  border-color: #ef4444 !important;
}

.error-text {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
}

.modal-content-text {
  font-size: 15px;
  color: #374151;
  text-align: center;
  padding: 20px 0;
  white-space: pre-wrap;
}
</style>