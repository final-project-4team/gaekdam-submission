<template>
  <div class="tabs">
    <div
        v-for="tab in tabs"
        :key="tab.path"
        class="tab"
        :class="{ active: isActive(tab) }"
        @click="go(tab.path)"
    >
      {{ tab.label }}
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

defineProps({
  tabs: {
    type: Array,
    required: true,
  },
})

const router = useRouter()
const route = useRoute()

const go = (path) => router.push(path)
const isActive = (tab) => {
  if (tab.activeMatches) {
    return tab.activeMatches.some(match => route.path.startsWith(match))
  }
  return route.path === tab.path
}
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 28px;
  padding: 0 20px;
  border-bottom: 1px solid #eef2f7;

  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y : hidden;
}

.tab {
  position: relative;
  padding: 14px 2px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.15s ease;

  white-space: nowrap;   /* 핵심 */
  flex-shrink: 0;        /* 줄어들며 찌그러지지 않게 */
}

/* hover */
.tab:hover {
  color: #334155;
}

/* active */
.tab.active {
  color: #577ce6;
  font-weight: 600;
}

/* 하단 인디케이터 */
.tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 100%;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(
      to right,
      #7bb0f1,
      #6f93f6
  );
}

</style>
