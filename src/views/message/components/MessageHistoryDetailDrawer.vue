<template>
  <div class="drawer" :class="{ open: visible }">
    <!-- HEADER -->
    <div class="drawer-header">
      <div class="header-left">
        <div class="title">메시지 발송 상세</div>
        <span class="stage">{{ detail?.stageNameKor }}</span>
      </div>

      <span
          v-if="detail"
          class="status-badge"
          :class="detail.status"
      >
        {{ STATUS_LABEL[detail.status] }}
      </span>

      <button class="close" @click="$emit('close')">✕</button>
    </div>

    <!-- BODY -->
    <div v-if="detail" class="drawer-body">

      <!-- 대상 정보 -->
      <div class="section card">
        <div class="section-title">대상 정보</div>

        <div class="row">
          <span class="label">지점</span>
          <span class="value">{{ detail.propertyName }}</span>
        </div>

        <div class="row">
          <span class="label">예약 코드</span>
          <span class="value mono">{{ detail.reservationCode ?? '-' }}</span>
        </div>

        <div class="row">
          <span class="label">투숙 코드</span>
          <span class="value mono">{{ detail.stayCode ?? '-' }}</span>
        </div>
      </div>

      <!-- 템플릿 -->
      <div class="section card">
        <div class="section-title">메시지 템플릿</div>

        <div class="row">
          <span class="label">제목</span>
          <span class="value">{{ detail.templateTitle }}</span>
        </div>

        <div class="message-box">
          {{ detail.templateContent }}
        </div>
      </div>

      <!-- 시간 -->
      <div class="section card">
        <div class="section-title">발송 시점</div>

        <div class="row">
          <span class="label">예약 시각</span>
          <span class="value">{{ detail.scheduledAt }}</span>
        </div>

        <div class="row">
          <span class="label">발송 시각</span>
          <span class="value">{{ detail.sentAt ?? '-' }}</span>
        </div>
      </div>

      <!-- 실패 -->
      <div
          v-if="detail.failReason"
          class="section card error"
      >
        <div class="section-title">실패 사유</div>
        <div class="error-box">
          {{ detail.failReason }}
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: Boolean,
  detail: Object,
})

const STATUS_LABEL = {
  SCHEDULED: '예약됨',
  SENT: '발송완료',
  FAILED: '실패',
}
</script>

<style scoped>
/* =====================
   Drawer
   ===================== */
.drawer {
  position: fixed;
  top: 0;
  right: -460px;
  width: 460px;
  height: 100%;
  background: #ffffff;
  border-left: 1px solid #e5e7eb;
  box-shadow: -12px 0 24px rgba(0,0,0,0.08);
  transition: right 0.25s ease;
  z-index: 50;
}

.drawer.open {
  right: 0;
}

/* =====================
   Header
   ===================== */
.drawer-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  flex: 1;
}

.drawer-header .title {
  font-size: 16px;
  font-weight: 600;
}

.drawer-header .stage {
  font-size: 12px;
  color: #6b7280;
}

.close {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
}

/* =====================
   Status Badge
   ===================== */
.status-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
}

.status-badge.SENT {
  background: #ecfdf5;
  color: #047857;
}

.status-badge.SCHEDULED {
  background: #f3f4f6;
  color: #374151;
}

.status-badge.FAILED {
  background: #fef2f2;
  color: #b91c1c;
}

/* =====================
   Body
   ===================== */
.drawer-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
}

/* =====================
   Sections
   ===================== */
.card {
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #111827;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.label {
  font-size: 12px;
  color: #6b7280;
}

.value {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
}

.value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* =====================
   Message
   ===================== */
.message-box {
  margin-top: 10px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  white-space: pre-line;
  font-size: 13px;
  line-height: 1.5;
}

/* =====================
   Error
   ===================== */
.card.error {
  background: #fff5f5;
  border-color: #fecaca;
}

.error-box {
  font-size: 12px;
  color: #991b1b;
  line-height: 1.4;
}
</style>
