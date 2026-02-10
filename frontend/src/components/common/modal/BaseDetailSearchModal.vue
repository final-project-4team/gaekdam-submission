<template>
  <BaseModal :title="title" @close="$emit('close')">
    <div class="body">
      <slot />
    </div>

    <template #footer>
      <BaseButton type="ghost" size="sm" @click="$emit('reset')">
        초기화
      </BaseButton>
      <BaseButton type="primary" size="sm" @click="$emit('apply')">
        적용
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/common/modal/BaseModal.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'

defineProps({
  title: { type: String, default: '상세 검색' },
})

defineEmits(['close', 'reset', 'apply'])
</script>

<style scoped>
.body {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}
</style>
