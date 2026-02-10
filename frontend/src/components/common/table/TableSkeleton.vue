<template>
  <div class="table-wrapper">
    <table class="base-table">
      <thead>
      <tr>
        <th
            v-for="col in columns"
            :key="col.key"
        >
          <div class="skeleton skeleton-header"></div>
        </th>
      </tr>
      </thead>

      <tbody>
      <tr v-for="n in rows" :key="n">
        <td v-for="col in columns" :key="col.key">
          <div class="skeleton skeleton-cell"></div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Number, default: 10 }, // 보여줄 가짜 row 수
})
</script>

<style scoped>
.table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e6eaf0;
}

.base-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

th, td {
  padding: 12px;
  border-top: 1px solid #eef2f7;
}

/* Skeleton 공통 */
.skeleton {
  background: linear-gradient(
      90deg,
      #f1f5f9 25%,
      #e5e7eb 37%,
      #f1f5f9 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: 6px;
}

.skeleton-header {
  height: 14px;
}

.skeleton-cell {
  height: 12px;
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
