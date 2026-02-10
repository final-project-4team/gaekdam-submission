<template>
  <BaseModal title="체크인 등록" @close="close">
    <div class="form">

      <div class="row">
        <label>방문 인원</label>
        <input
            v-model.number="form.guestCount"
            type="number"
            min="1"
            class="input"
        />
      </div>

      <div class="row">
        <label>차량 번호</label>
        <input
            v-model="form.carNumber"
            type="text"
            placeholder="차량 번호"
            class="input"
        />
      </div>

      <div class="row">
        <label>체크인 시간</label>
        <input
            v-model="form.recordedAt"
            type="datetime-local"
            class="input"
        />
      </div>

      <div class="row">
        <label>정산 여부</label>
        <select v-model="form.settlementYn" class="input">
          <option value="N">미정산</option>
          <option value="Y">정산 완료</option>
        </select>
      </div>

    </div>

    <template #footer>
      <BaseButton type="ghost" size="sm" @press="close">
        취소
      </BaseButton>
      <BaseButton type="primary" size="sm" @press="submit">
        체크인 등록
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { reactive } from 'vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import { createCheckInApi } from '@/api/reservation/checkinoutApi.js'

const props = defineProps({
  reservationCode: { type: Number, required: true },
})

const emit = defineEmits(['close', 'success'])

const form = reactive({
  guestCount: 1,
  carNumber: '',
  recordedAt: new Date().toISOString().slice(0, 16),
  settlementYn: 'N',
})

const close = () => emit('close')

const submit = async () => {
  await createCheckInApi({
    reservationCode: props.reservationCode,
    guestCount: form.guestCount,
    carNumber: form.carNumber || null,
    recordedAt: form.recordedAt,
    settlementYn: form.settlementYn,
  })

  emit('success')
  close()
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.input {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 13px;
}

.input:focus {
  outline: none;
  border-color: #bfdbfe;
  box-shadow: 0 0 0 1px rgba(191, 219, 254, 0.4);
}
</style>
