<template>
  <div>
    <button @click="checkHealth">health check</button>
    <pre>{{ result }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";

const result = ref("");

async function checkHealth() {
  const res = await axios.get(
      `${import.meta.env.VITE_API_BASE}/health`
  );
  result.value = JSON.stringify(res.data, null, 2);
}
</script>
