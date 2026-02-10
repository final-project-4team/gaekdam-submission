<template>
  <Teleport to="body">
    <div class="overlay">
      <div class="modal">
        <!-- Header -->
        <div class="modal-header">
          <span class="title">{{ title }}</span>
          <button class="close" @click="close">✕</button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <slot />
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <slot name="footer">
            <BaseButton type="ghost" @click="close">닫기</BaseButton>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import BaseButton from '@/components/common/button/BaseButton.vue'

defineProps({
  title: String,
})

const emit = defineEmits(['close'])
const close = () => emit('close')
</script>

<style scoped>
/* ===== overlay ===== */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45); /* 살짝 푸른 블랙 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

/* ===== modal card ===== */
.modal {
  width: 720px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.15),
      0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* ===== header ===== */
.modal-header {
  padding: 16px 20px;
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
}

.close:hover {
  color: #374151;
}

/* ===== body ===== */
.modal-body {
  padding: 24px;
  background: #ffffff;
}

/* ===== footer ===== */
.modal-footer {
  padding: 14px 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
