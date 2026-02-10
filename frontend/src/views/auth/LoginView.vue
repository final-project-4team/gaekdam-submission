<template>
  <div class="login-page">
    <div class="bg-accent" />

    <div class="login-wrapper">
      <div class="login-card">
        <!-- 카드 헤더 (브랜드) -->
        <div class="card-header">
          <img src="../../assets/logo_login.png" alt="고객을 담다" class="brand-logo" />
        </div>

        <!-- 로그인 폼 -->
        <div class="form-row">
          <label>아이디</label>
          <input
              v-model="loginId"
              type="text"
              placeholder="아이디 입력"
              @keyup.enter="onLogin"
          />
        </div>

        <div class="form-row">
          <label>비밀번호</label>
          <input
              v-model="password"
              type="password"
              placeholder="비밀번호 입력"
              @keyup.enter="onLogin"
          />
        </div>

        <!-- 공통 버튼 -->
        <BaseButton
            type="primary"
            size="lg"
            :disabled="loading"
            @click="onLogin"
            class="login-btn"
        >
          {{ loading ? "로그인 중..." : "로그인" }}
        </BaseButton>

        <p v-if="errorMessage" class="error">
          {{ errorMessage }}
        </p>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import BaseButton from "@/components/common/button/BaseButton.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const loginId = ref("");
const password = ref("");
const errorMessage = ref("");
const loading = ref(false);

const onLogin = async () => {
  if (loading.value) return;

  errorMessage.value = "";
  loading.value = true;

  const result = await authStore.login({
    loginId: loginId.value,
    password: password.value,
  });

  loading.value = false;

  if (!result.success) {
    errorMessage.value = result.message || "아이디 또는 비밀번호가 올바르지 않습니다.";
    return;
  }

  //const redirectPath = route.query.redirect || "/customers";
  const redirectPath =
      route.query.redirect ||  authStore.defaultRouteByPermission();

  router.replace(redirectPath);
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* 은은한 배경 */
.bg-accent {
  position: absolute;
  top: -220px;
  right: -220px;
  width: 520px;
  height: 520px;
  background: radial-gradient(
      circle,
      rgba(96,165,250,0.12),
      transparent 70%
  );
}

.login-wrapper {
  width: 380px;
  z-index: 1;
}

/* 카드 */
.login-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 22px 28px 28px 28px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 카드 헤더 */
.card-header {
  text-align: center;
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.brand-title {
  font-size: 12px;
  color: #64748b;
  letter-spacing: 0.1em;
}

.brand-name {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.18em;
}

/* 입력 */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.form-row input {
  height: 42px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  transition: 0.15s;
}

.form-row input:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96,165,250,0.15);
}

/* 버튼 정렬 */
.login-btn {
  margin-top: 10px;
}

/* 에러 */
.error {
  margin-top: 6px;
  font-size: 13px;
  color: #dc2626;
  text-align: center;
}

</style>
