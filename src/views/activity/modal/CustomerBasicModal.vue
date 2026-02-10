<template>
  <BaseModal title="고객 정보" width="420px" @close="$emit('close')">
    <div class="customer-card">
      <div class="name">{{ customer.customerName }}</div>
      <div class="phone">{{ formattedPhone }}</div>
    </div>

    <template #footer>
      <BaseButton type="primary" size="sm" @click="$emit('close')">
        확인
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'

const props = defineProps({
  customer: { type: Object, required: true },
})

const formattedPhone = computed(() => {
  const v = props.customer.phoneNumber
  if (!v) return '-'
  return v.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
})
</script>

<style scoped>
.customer-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
}

.name {
  font-size: 18px;
  font-weight: 600;
  color: #111827; /* 거의 블랙 */
}

.phone {
  font-size: 14px;
  color: #6b7280; /* 그레이 */
}
</style>
