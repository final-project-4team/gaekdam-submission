<template>
  <button
      class="btn"
      :class="[type, size]"
      @click.stop.prevent="onPress"
  >
    <slot />
  </button>
</template>

<script setup>
const emit = defineEmits(['press'])

defineProps({
  type: {
    type: String,
    default: 'ghost',
    // primary | warning | danger | ghost
  },
  size: {
    type: String,
    default: 'md',
    // sm | md | lg
  },
})

const onPress = () => {
  emit('press')
}
</script>

<style scoped>
/* =====================
   공통
===================== */
.btn {
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
      background 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.1s ease;
}

.btn {
  white-space: nowrap;
  flex-shrink: 0;
}

.btn:active {
  transform: translateY(1px);
}

/* =====================
   Size
===================== */
.btn.sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn.md {
  padding: 8px 16px;
  font-size: 13px;
}

.btn.lg {
  padding: 10px 20px;
  font-size: 14px;
}

/* =====================
   Primary (연한 블루)
===================== */
.btn.primary {
  background: linear-gradient(135deg, #e0ecff, #d4e4ff);
  color: #1e3a8a;
  box-shadow: 0 3px 8px rgba(59, 130, 246, 0.15);
}

.btn.primary:hover {
  background: linear-gradient(135deg, #d4e4ff, #c7dbff);
  box-shadow: 0 5px 12px rgba(59, 130, 246, 0.22);
}

/* =====================
   Warning (연한 오렌지)
===================== */
.btn.warning {
  background: linear-gradient(135deg, #fff2e0, #ffe7cc);
  color: #9a4a00;
  box-shadow: 0 3px 8px rgba(234, 88, 12, 0.15);
}

.btn.warning:hover {
  background: linear-gradient(135deg, #ffe7cc, #ffddb3);
  box-shadow: 0 5px 12px rgba(234, 88, 12, 0.22);
}

/* =====================
   Danger (연한 레드)
===================== */
.btn.danger {
  background: linear-gradient(135deg, #fde8e8, #fcdede);
  color: #991b1b;
  box-shadow: 0 3px 8px rgba(239, 68, 68, 0.15);
}

.btn.danger:hover {
  background: linear-gradient(135deg, #fcdede, #facaca);
  box-shadow: 0 5px 12px rgba(239, 68, 68, 0.22);
}

/* =====================
   Ghost (보조)
===================== */
.btn.ghost {
  background: #f9fafb;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn.ghost:hover {
  background: #f3f4f6;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}
</style>
