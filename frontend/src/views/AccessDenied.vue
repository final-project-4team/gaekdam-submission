<template>
  <div class="access-denied-container">
    <div class="icon-wrapper">
      <!-- Red X Icon SVG -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="error-icon"
      >
        <path
          fill-rule="evenodd"
          d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
    
    <h1 class="error-title">접근할 수 없는 페이지입니다</h1>
    <p class="error-message">
      요청하신 페이지에 대한 접근 권한이 없거나,<br />
      존재하지 않는 페이지입니다.
    </p>

    <div class="button-wrapper">
      <BaseButton type="primary" size="lg" @click="goToMyPage">
        마이페이지로 돌아가기
      </BaseButton>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import BaseButton from '@/components/common/button/BaseButton.vue';

const router = useRouter();

const goToMyPage = () => {
  router.push('/myPage');
};
</script>

<style scoped>
.access-denied-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  background-color: #f9fafb;
}

.icon-wrapper {
  margin-bottom: 24px;
}

.error-icon {
  width: 120px;
  height: 120px;
  color: #ef4444; /* Red color */
}

.error-title {
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.error-message {
  font-size: 18px;
  color: #6b7280;
  margin: 0 0 40px 0;
  line-height: 1.6;
}

.button-wrapper {
  display: flex;
  gap: 16px;
}
</style>