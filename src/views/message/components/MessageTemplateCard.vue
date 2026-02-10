<!-- /src/views/message/components/MessageTemplateCard.vue -->
<template>
  <div
      class="card"
      :class="{
      inactive: template && !template.active,
      disabled: !template
    }"
      @click="onClick"
      role="button"
      :aria-disabled="!template"
  >
    <div class="top">
      <div class="badge" :class="visitorType === 'FIRST' ? 'first' : 'repeat'">
        {{ visitorType === 'FIRST' ? '첫방문자' : '재방문자' }}
      </div>

      <!-- 상태 칩 -->
      <div v-if="template" class="chip" :class="{ on: template.active, off: !template.active }">
        <span class="dot"></span>
        {{ template.active ? '사용중' : '비활성' }}
      </div>
      <div v-else class="chip off">
        <span class="dot"></span>
        없음
      </div>
    </div>

    <div class="body">
      <div class="title">
        {{ template?.title ?? '템플릿이 없습니다' }}
      </div>
      <div class="sub">
        {{ template?.languageCode ?? '-' }}
        <span v-if="template?.templateCode"> · #{{ template.templateCode }}</span>
      </div>
    </div>

    <div class="footer">
      <span class="hint">
        {{
          !template
              ? '템플릿이 없어 수정할 수 없습니다'
              : template.active
                  ? '클릭하여 수정'
                  : '클릭하여 활성화/수정'
        }}
      </span>
      <span class="arrow">→</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  stage: Object,
  visitorType: String,
  template: Object,
})

const emit = defineEmits(['edit'])

const onClick = () => {
  if (!props.template) return

  emit('edit', {
    stage: props.stage,
    template: props.template,
    visitorType: props.visitorType,
  })
}
</script>

<style scoped>
/* =====================
   Card Base
===================== */
.card {
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 12px 12px 10px;
  cursor: pointer;
  transition:
      background-color 0.15s,
      border-color 0.15s,
      box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* =====================
   Hover (기본)
===================== */
.card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 6px 16px rgba(17, 24, 39, 0.06);
}

/* =====================
   Disabled (템플릿 없음)
===================== */
.card.disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.card.disabled:hover {
  box-shadow: none;
  border-color: #e5e7eb;
}

/* =====================
   Inactive (비활성 · 클릭 가능)
===================== */
.card.inactive {
  background: #f8fafc;
  border-color: #e5e7eb;
  filter: grayscale(0.45) brightness(0.98);
}

/* hover는 있지만 거의 느낌만 */
.card.inactive:hover {
  box-shadow: 0 2px 6px rgba(17, 24, 39, 0.04);
  border-color: #d1d5db;
}

/* 텍스트 더 강하게 톤 다운 */
.card.inactive .title {
  color: #6b7280;
}

.card.inactive .sub,
.card.inactive .hint {
  color: #9ca3af;
}

/* 화살표도 거의 힘 빼기 */
.card.inactive .arrow {
  color: #d1d5db;
}

/* 뱃지도 살짝 죽이기 */
.card.inactive .badge {
  opacity: 0.75;
}

/* =====================
   Top
===================== */
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.badge {
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
}

.badge.first {
  color: #656565;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: rgba(163, 160, 255, 0.05);
}

.badge.repeat {
  color: #6a6a6a;
  border: 1px solid rgba(108, 136, 207, 0.2);
  background: rgba(108, 136, 207, 0.05);
}

/* =====================
   Chip
===================== */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  background: #f9fafb;
}

.chip .dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #9ca3af;
}

.chip.on {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.08);
  border-color: rgba(22, 163, 74, 0.2);
}

.chip.on .dot {
  background: #16a34a;
}

.chip.off {
  color: #9ca3af;
}

/* inactive 상태에서 chip도 힘 빼기 */
.card.inactive .chip {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.card.inactive .chip .dot {
  background: #d1d5db;
}

/* =====================
   Body
===================== */
.body {
  margin-top: 12px;
}

.title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  line-height: 1.35;
  min-height: 38px;
}

.sub {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

/* =====================
   Footer
===================== */
.footer {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #6b7280;
}

.hint {
  font-size: 12px;
}

.arrow {
  font-size: 14px;
  color: #4f46e5;
}
</style>
