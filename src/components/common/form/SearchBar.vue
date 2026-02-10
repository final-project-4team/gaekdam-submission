<template>
  <div class="search-bar">
    <!-- 검색 기준 -->
    <div v-if="props.searchTypes?.length" class="select-wrap">
      <select v-model="selectedKey">
        <option
            v-for="item in props.searchTypes"
            :key="item.value"
            :value="item.value"
        >
          {{ item.label }}
        </option>
      </select>
    </div>

    <!-- 입력 -->
    <div class="input-wrap">
      <!-- select 타입 -->
      <select
          v-if="current?.type === 'select'"
          class="input"
          v-model="value"
      >
        <option
            v-for="opt in current.options"
            :key="opt.value"
            :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <!-- 일반 입력 -->
      <input
          v-else
          class="input"
          :type="current?.type === 'number' ? 'number' : 'text'"
          :placeholder="props.placeholder"
          v-model="value"
          @keyup.enter="submit"
      />
    </div>

    <!-- 버튼 -->
    <BaseButton type="ghost" size="sm" @click="submit">
      검색
    </BaseButton>

    <BaseButton
        v-if="props.showDetail"
        type="primary"
        size="sm"
        @click="$emit('detail')"
    >
      상세 검색
    </BaseButton>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseButton from '@/components/common/button/BaseButton.vue'

/* =====================
   Props (중요)
===================== */
const props = defineProps({
  placeholder: {
    type: String,
    default: '검색어 입력',
  },
  searchTypes: {
    type: Array,
    default: () => [],
    // [{ label, value, type, options? }]
  },
  showDetail: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['search', 'detail'])

/* =====================
   State
===================== */
const selectedKey = ref('')
const value = ref(null)

/* =====================
   Computed
===================== */
const current = computed(() =>
    props.searchTypes.find(t => t.value === selectedKey.value)
)

/* =====================
   Watch: searchTypes 바뀌면 기본값 재설정
===================== */
watch(
    () => props.searchTypes,
    (list) => {
      if (!list?.length) return
      if (!selectedKey.value) {
        selectedKey.value = list[0].value
      }
    },
    { immediate: true }
)

/* =====================
   Actions
===================== */
const submit = () => {
  emit('search', {
    key: selectedKey.value ?? '',
    value: value.value ?? '',
  })
}
</script>

<style scoped>
/* =====================
   Search bar (줄바꿈 방지)
===================== */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;

  flex-wrap: nowrap;
  white-space: nowrap;
}

/* =====================
   Select
===================== */
.select-wrap select {
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 13px;
}

/* =====================
   Input
===================== */
.input-wrap {
  position: relative;
}

.input {
  height: 32px;
  padding: 0 36px 0 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  font-size: 13px;

  width: 220px;
  min-width: 160px;

  transition: all 0.2s;
}

@media (max-width: 1200px) {
  .input {
    width: 180px;
  }
}

.input:focus {
  outline: none;
  border-color: #bfdbfe;
  box-shadow: 0 0 0 1px rgba(191,219,254,.4);
}
</style>
