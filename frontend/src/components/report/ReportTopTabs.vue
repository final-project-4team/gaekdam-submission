<template>
  <div class="top-tabs">
    <div v-for="(l, i) in layouts" :key="l.id" class="top-tab" :class="{ active: selectedIndex === i }" @click="handleSelect(i)">
      <span>{{ l.name }}</span>
      <span class="top-delete">
        <!-- slot이 제공되면 부모가 처리, 없으면 기본 삭제 버튼을 보여줍니다. -->
        <slot name="delete" :layout="l">
          <!-- BaseButton은 내부에서 'press' 이벤트를 emit 하므로 @press로 바인딩해야 합니다 -->
          <BaseButton size="sm" @press="handleDelete(l)">✕</BaseButton>
        </slot>
      </span>
    </div>
    <!-- BaseButton의 커스텀 이벤트 'press'를 사용하여 create 이벤트를 발생시킵니다 -->
    <BaseButton size="sm" @press="handleCreate" class="add-tab">+</BaseButton>
  </div>
</template>

<script setup>
/**
 * ReportTopTabs.vue
 * - 목적: 상단 레이아웃 탭 UI를 presentation으로 처리
 * - props:
 *    layouts: Array - 레이아웃 목록
 *    selectedIndex: Number - 현재 선택된 인덱스
 * - emits:
 *    select(index), create(), delete(layout)
 * - slot: "delete"(layout) - 탭 우측에 삭제 버튼을 삽입하기 위한 slot
 */
import BaseButton from '@/components/common/button/BaseButton.vue'
import { defineProps, defineEmits } from 'vue'
const props = defineProps({ layouts: Array, selectedIndex: Number })
const emit = defineEmits(['select', 'create', 'delete'])

function handleSelect(i){
  console.log('ReportTopTabs select', i)
  emit('select', i)
}
function handleCreate(){
  console.log('ReportTopTabs create')
  emit('create')
}
function handleDelete(layout){
  console.log('ReportTopTabs emit delete', layout)
  emit('delete', layout)
}
</script>

<style scoped>
.top-tabs { display:flex; gap:8px; align-items:center; padding:6px 10px; }
.top-tab { padding:8px 14px; border-radius:8px; background:#f5f7fb; color:#4b5563; cursor:pointer; }
.top-tab.active { background: linear-gradient(135deg,#e6f0ff,#dfeaff); color:#1e3a8a; font-weight:600 }
.add-tab { margin-left:6px }
.top-tab { position: relative }
.top-delete { position: relative; display:inline-flex }
</style>
