<template>
  <BaseModal :title="title" v-if="visible" @close="$emit('close')">
    <!-- default slot을 우선 렌더링하고, 없으면 message를 보여줍니다 -->
    <div class="confirm-body"><slot>{{ message }}</slot></div>
    <template #footer>
      <!-- BaseButton은 'press' 이벤트를 emit 하므로 @press로 바인딩 -->
      <BaseButton @press="handleClose">취소</BaseButton>
      <BaseButton type="danger" @press="handleConfirm" style="margin-left:8px">삭제</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
/**
 * ConfirmModal.vue
 * - props: visible(Boolean), title(String), message(String)
 *   - visible: 모달을 표시할지 여부
 *   - title: 모달의 제목 텍스트
 *   - message: 모달에 표시할 확인 메시지 내용
 * - emits:
 *   - confirm(): 사용자가 확인(삭제) 버튼을 클릭했을 때 발생
 *   - close(): 모달을 닫을 때 발생
 */
import BaseButton from '@/components/common/button/BaseButton.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import { defineProps, defineEmits } from 'vue'

const props = defineProps({ visible: Boolean, title: { type: String, default: '확인' }, message: { type: String, default: '' } })
const emit = defineEmits(['close', 'confirm'])

function handleClose(){
  console.log('ConfirmModal close clicked')
  emit('close')
}
function handleConfirm(){
  console.log('ConfirmModal confirm clicked')
  emit('confirm')
}
</script>

<style scoped>
.confirm-body { padding:12px 0 }
</style>
