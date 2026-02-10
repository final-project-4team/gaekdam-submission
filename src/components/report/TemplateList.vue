<template>
  <aside class="left-pane">
    <div class="template-list-vertical">
      <div v-for="(tpl, idx) in templates" :key="tpl.id" class="tpl-row">
        <button class="tpl-btn" :class="{ active: selectedIndex === idx }" @click="$emit('select', idx)">
          {{ tpl.name }}
        </button>
        <span class="tpl-delete" @click.stop>
          <BaseButton size="sm" @click="$emit('delete', idx)">✕</BaseButton>
        </span>
      </div>
    </div>
    <div class="left-controls">
      <BaseButton size="sm" @click="$emit('add')">+</BaseButton>
    </div>
  </aside>
</template>

<script setup>
/**
 * TemplateList.vue
 * - 왼쪽 템플릿 리스트 presentation 컴포넌트
 * - props: templates(Array), selectedIndex(Number)
 * - emits: select(index), add(), delete(index)
 */
import BaseButton from '@/components/common/button/BaseButton.vue'
import { defineProps } from 'vue'
const props = defineProps({ templates: { type: Array, default: () => [] }, selectedIndex: { type: Number, default: 0 } })
</script>

<style scoped>
/* 기존 ReportLayoutView의 left-pane 스타일과 클래스명을 재활용 */
.left-pane { width:200px; display:flex; flex-direction:column; align-items:flex-start; }
.left-controls { margin-bottom:8px; }
.template-list-vertical { display:flex; flex-direction:column; gap:8px; width:100%; }
.tpl-row { position: relative; display:flex; align-items:center; gap:8px; }
.tpl-btn { flex:1; padding:8px; border-radius:8px; background:#f6f8fb; border:1px solid #e6eef8; cursor:pointer; text-align:left }
.tpl-btn.active { background: linear-gradient(135deg,#e6f0ff,#dfeaff); color:#12336a }
.tpl-delete { position: relative; right:6px; display:inline-flex }
</style>
