<template>
  <div class="card chart-card">
    <div class="card-title-row">
      <div class="card-title"><slot name="title"></slot></div>
      <div class="card-toolbar"><slot name="toolbar"></slot></div>
    </div>
    <div class="card-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
// 단순 래퍼 컴포넌트: KPI 카드와 동일한 스타일을 재사용하기 위한 컨테이너
</script>

<style scoped>
.card.chart-card { padding: 12px; position: relative; background:#fff; border-radius:8px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); border: 1px solid #e5e7eb }
.card-title-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px }
.card-title { font-weight:700; font-size:14px }
.card-toolbar { display:flex; align-items:center; gap:8px }
.card-body { width:100%; min-height:180px; display:flex; align-items:center; justify-content:center }

/* 내부 차트는 100% 크기 선언을 권장합니다 */
.chart-wrapper { width:100%; height:100%; }
</style>
