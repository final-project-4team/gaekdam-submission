<template>
  <div class="paging">
    <!-- 10페이지 뒤로 -->
    <span
        class="nav"
        :class="{ disabled: current <= jump }"
        @click="jumpPrev"
    >
      &laquo;
    </span>

    <!-- 이전 -->
    <span
        class="nav"
        :class="{ disabled: current === 1 }"
        @click="goPrev"
    >
      &lsaquo;
    </span>

    <!-- 처음 -->
    <span
        v-if="startPage > 1"
        @click="change(1)"
    >
      1
    </span>

    <span v-if="startPage > 2" class="ellipsis">...</span>

    <!-- 중간 페이지 -->
    <span
        v-for="p in visiblePages"
        :key="p"
        :class="{ active: p === current }"
        @click="change(p)"
    >
      {{ p }}
    </span>

    <span v-if="endPage < totalPages - 1" class="ellipsis">...</span>

    <!-- 마지막 -->
    <span
        v-if="endPage < totalPages"
        @click="change(totalPages)"
    >
      {{ totalPages }}
    </span>

    <!-- 다음 -->
    <span
        class="nav"
        :class="{ disabled: current === totalPages }"
        @click="goNext"
    >
      &rsaquo;
    </span>

    <!-- 10페이지 앞으로 -->
    <span
        class="nav"
        :class="{ disabled: current + jump > totalPages }"
        @click="jumpNext"
    >
      &raquo;
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})

const emit = defineEmits(['change'])

/* ===================== */
/* 설정 */
/* ===================== */
const MAX_VISIBLE = 10
const jump = 10
const HALF = Math.floor(MAX_VISIBLE / 2)

/* ===================== */
/* 페이지 범위 계산 (보정 포함) */
/* ===================== */
const startPage = computed(() => {
  if (props.totalPages <= MAX_VISIBLE) return 1

  const rawStart = props.current - HALF
  const maxStart = props.totalPages - MAX_VISIBLE + 1

  return Math.min(
      Math.max(1, rawStart),
      maxStart
  )
})

const endPage = computed(() =>
    Math.min(props.totalPages, startPage.value + MAX_VISIBLE - 1)
)

const visiblePages = computed(() =>
    Array.from(
        { length: endPage.value - startPage.value + 1 },
        (_, i) => startPage.value + i
    )
)

/* ===================== */
/* Actions */
/* ===================== */
const change = (p) => {
  if (p !== props.current) emit('change', p)
}

const goPrev = () => {
  if (props.current > 1) emit('change', props.current - 1)
}

const goNext = () => {
  if (props.current < props.totalPages) emit('change', props.current + 1)
}

const jumpPrev = () => {
  emit('change', Math.max(1, props.current - jump))
}

const jumpNext = () => {
  emit('change', Math.min(props.totalPages, props.current + jump))
}
</script>

<style scoped>
.paging {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

span {
  cursor: pointer;
  font-size: 13px;
  padding: 4px 6px;
}

.active {
  color: #1d4ed8;
  font-weight: 600;
}

.nav {
  font-size: 18px;
  font-weight: 500;
}

.disabled {
  opacity: 0.35;
  pointer-events: none;
}

.ellipsis {
  cursor: default;
  opacity: 0.6;
}
</style>
