<template>
  <BaseModal :title="title" v-if="visible" @close="$emit('close')">
    <div class="available-list">
      <div v-for="tpl in templates" :key="tpl.templateId" class="available-row">
        <span>{{ tpl.displayName }}</span>
        <BaseButton size="sm" @click="$emit('add', tpl)">추가</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
/**
 * CreateTemplateModal.vue
 * - 목적: 템플릿 목록에서 사용자가 템플릿을 선택하여 현재 레이아웃에 추가하도록 하는 모달
 * - props:
 *    - visible: Boolean - 모달 표시 여부
 *    - title: String - 모달 제목 (기본값: '템플릿 추가')
 *    - templates: Array - 사용자가 선택 가능한 템플릿 목록
 * - emits:
 *    - add(template): 사용자가 특정 템플릿의 '추가' 버튼을 클릭했을 때 해당 템플릿 객체를 부모에 전달
 *    - close(): 모달 닫기 요청
 */
import BaseButton from '@/components/common/button/BaseButton.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import { defineProps } from 'vue'

const props = defineProps({ visible: Boolean, title: { type: String, default: '템플릿 추가' }, templates: { type: Array, default: () => [] } })
</script>

<style scoped>
.available-list { padding: 8px 0 }
.available-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f3f4f6 }
</style>
