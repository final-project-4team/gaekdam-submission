<template>
  <div class="filters">
    <div
        v-for="filter in filters"
        :key="filter.key"
        class="select-wrap"
    >
      <select
          :value="values[filter.key]"
          @change="e => onChange(filter.key, e.target.value)"
      >
        <option
            v-for="opt in filter.options"
            :key="opt.value"
            :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const props = defineProps({
  filters: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['change'])

const values = reactive({})

props.filters.forEach(f => {
  values[f.key] = ''
})

const onChange = (key, value) => {
  values[key] = value
  emit('change', { ...values })
}
</script>

<style scoped>
/* =====================
   Filters container
===================== */
.filters {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* =====================
   Select wrapper
===================== */
.select-wrap {
  position: relative;
}

/* =====================
   Select base
===================== */
select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;

  height: 30px;
  line-height: 30px;
  padding: 0 20px 0 10px; /* 오른쪽 화살표 공간 */

  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-size: 13px;
  color: #374151;
  background-color: #ffffff;

  cursor: pointer;
  flex-shrink: 0;
}

/* =====================
   Dropdown arrow
===================== */
.select-wrap::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 10px;

  width: 6px;
  height: 6px;

  border-right: 2px solid #6b7280;
  border-bottom: 2px solid #6b7280;

  transform: translateY(-50%) rotate(45deg);
  pointer-events: none;
}

/* =====================
   Hover / Focus
===================== */
select:hover {
  background-color: #f9fafb;
}

select:focus {
  outline: none;
  border-color: #508bba;
}

/* =====================
   Disabled (optional)
===================== */
select:disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}
</style>
