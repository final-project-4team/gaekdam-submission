<template>
  <div class="main-card">
    <!-- 상단 탭 -->
    <div class="tabs-area">
      <slot name="tabs" />
    </div>

    <!-- 실제 컨텐츠 -->
    <div class="content-area">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.main-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);

  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* 탭 영역 */
.tabs-area {
  padding: 12px 20px 0 20px;
  border-bottom: 1px solid #e6eaf0;
}

/* 컨텐츠 영역 */
.content-area {
  padding: 10px 14px;
  flex: 1;
}
</style>