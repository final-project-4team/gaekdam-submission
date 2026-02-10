<template>
  <div class="today-facility-summary">

    <!-- ===================== -->
    <!-- ALL -->
    <!-- ===================== -->
    <div
        class="summary-card"
        :class="{ active: active === null }"
        @click="selectAll"
    >
      <div class="title">ALL</div>
      <div class="count">{{ totalCount }}</div>
    </div>

    <!-- ===================== -->
    <!-- Facility Cards -->
    <!-- ===================== -->
    <div
        v-for="item in summary"
        :key="item.facilityCode"
        class="summary-card"
        :class="{ active: active === item.facilityCode }"
        @click="selectFacility(item.facilityCode)"
    >
      <div class="title">{{ item.facilityName }}</div>
      <div class="count">{{ item.usageCount }}</div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({

  summary: {
    type: Array,
    required: true,
    default: () => [],
  },


  active: {
    type: [Number, null],
    default: null,
  },
})

const emit = defineEmits(['select'])

/* ===================== */
/* Computed */
/* ===================== */
const totalCount = computed(() =>
    props.summary.reduce((sum, item) => sum + (item.usageCount || 0), 0)
)

/* ===================== */
/* Events */
/* ===================== */
const selectAll = () => {
  emit('select', null)
}

const selectFacility = (facilityCode) => {
  emit('select', facilityCode)
}
</script>

<style scoped>
.today-facility-summary {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  overflow-x: auto;
}

.summary-card {
  min-width: 140px;
  padding: 14px 16px;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  transition: all 0.15s ease;
}

.summary-card:hover {
  border-color: #2563eb;
}

.summary-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.count {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}
</style>
