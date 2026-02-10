<template>
  <BaseModal 
    title="사유 입력" 
    @close="close"
    width="500px"
  >
    <div class="reason-modal-content">
      <p class="description">
        개인정보 조회 또는 민감한 작업 수행을 위해<br/>
        사유를 입력해주세요.
      </p>
      
      <div class="input-group">
        <label>요청 사유</label>
        <textarea 
          v-model="reason" 
          placeholder="예: 고객 문의 응대, 정기 감사 등"
          rows="3"
          class="reason-input"
        ></textarea>
      </div>
    </div>

    <template #footer>
      <BaseButton type="ghost" @click="close">취소</BaseButton>
      <BaseButton type="primary" @click="confirm">확인</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'

const emit = defineEmits(['close', 'confirm'])

const reason = ref('')

const close = () => {
  emit('close')
}

const confirm = () => {
  if (!reason.value.trim()) {
    alert('사유를 입력해주세요.')
    return
  }
  emit('confirm', reason.value)
}
</script>

<style scoped>
.reason-modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px 0;
}

.description {
  font-size: 14px;
  color: #374151;
  text-align: center;
  line-height: 1.5;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.reason-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  resize: none;
}

.reason-input:focus {
  outline: none;
  border-color: #2563eb;
  ring: 2px solid #2563eb;
}
</style>
