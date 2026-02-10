<template>
  <section class="inquiry-detail">
    <div class="top">
      <button class="back" @click="router.back()">←</button>
      <div class="title-pill">문의 상세</div>
      <div class="spacer" />
    </div>

    <div v-if="loading" class="state">불러오는 중...</div>
    <div v-else-if="error" class="state state--error">{{ error }}</div>

    <template v-else>
      <div class="card">
        <div class="card-title">기본정보</div>

        <div class="grid">
          <div class="row">
            <span class="k">문의번호</span>
            <span class="v mono strong">Q-{{ detail?.inquiryCode ?? "-" }}</span>
          </div>

          <div class="row">
            <span class="k">고객명</span>
            <span class="v strong">{{ detail?.customerName ?? "-" }}</span>
          </div>

          <div class="row">
            <span class="k">접수일시</span>
            <span class="v mono">{{ formatDateTime(detail?.createdAt) }}</span>
          </div>

          <div class="row">
            <span class="k">연락처</span>
            <span class="v">-</span>
          </div>

          <div class="row">
            <span class="k">문의유형</span>
            <span class="v">
              <span class="badge" :class="`badge--cat-${detail?.inquiryCategoryCode ?? '0'}`">
                {{ detail?.inquiryCategoryName ?? "-" }}
              </span>
            </span>
          </div>

          <div class="row">
            <span class="k">담당자</span>
            <span class="v mono">{{ detail?.employeeCode ?? "미지정" }}</span>
          </div>

          <div class="row">
            <span class="k">처리상태</span>
            <span class="v">
              <span class="badge" :class="`badge--${detail?.inquiryStatus || 'NEUTRAL'}`">
                {{ statusLabel(detail?.inquiryStatus) }}
              </span>
            </span>
          </div>

          <div class="row">
            <span class="k">참조사건</span>
            <span class="v mono">{{ detail?.linkedIncidentCode ?? "-" }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">문의내용</div>
        <div class="panel">
          <div class="content-title">{{ detail?.inquiryTitle ?? "-" }}</div>
          <pre class="content">{{ detail?.inquiryContent ?? "-" }}</pre>
        </div>
      </div>

      <div class="card">
        <div class="card-title">답변(처리)내용</div>
        <div class="panel">
          <pre class="content">{{ detail?.answerContent ?? "답변이 없습니다." }}</pre>
        </div>
      </div>

      <div class="footer">
        <BaseButton type="ghost" size="md" @click="router.back()">확인</BaseButton>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseButton from "@/components/common/button/BaseButton.vue";
import { getInquiryDetailApi } from "@/api/voc/inquiryApi.js";

const route = useRoute();
const router = useRouter();

const detail = ref(null);
const loading = ref(false);
const error = ref("");

const statusLabel = (v) => {
  if (v === "IN_PROGRESS") return "처리중";
  if (v === "ANSWERED") return "답변완료";
  return v ?? "-";
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  return String(iso).replace("T", " ").slice(0, 16);
};

const resolveHotelGroupCode = () => {
  const q = route.query.hotelGroupCode;
  if (q != null && q !== "") return Number(q);
  const ls = localStorage.getItem("hotelGroupCode");
  if (ls != null && ls !== "") return Number(ls);
  return null;
};

onMounted(async () => {
  loading.value = true;
  error.value = "";

  try {
    const inquiryCode = Number(route.params.inquiryCode);
    const hotelGroupCode = resolveHotelGroupCode();

    if (!inquiryCode || !hotelGroupCode) {
      throw new Error("hotelGroupCode 또는 inquiryCode가 없습니다.");
    }

    const res = await getInquiryDetailApi(inquiryCode, { hotelGroupCode });
    detail.value = res?.data?.data ?? null;
  } catch (e) {
    error.value = e?.message || "상세 조회에 실패했습니다.";
    detail.value = null;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.inquiry-detail {
  --bg: #ffffff;
  --surface: #ffffff;
  --line: #e7edf4;
  --text: #111827;
  --muted: #6b7280;

  --r: 14px;
  --pad: 16px;
  --shadow: 0 1px 10px rgba(17, 24, 39, 0.06);

  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* top */
.top {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
}

.back {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: #111827;
}

.title-pill {
  justify-self: center;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 10px 18px;
  border-radius: 12px;
  font-weight: 900;
  letter-spacing: -0.2px;
}

.spacer { width: 40px; }

/* state */
.state {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--bg);
  text-align: center;
  color: #374151;
  font-size: 14px;
}
.state--error {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff5f5;
}

/* cards */
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  padding: 18px;
  box-shadow: var(--shadow);
}

.card-title {
  font-weight: 900;
  font-size: 15px;
  letter-spacing: -0.2px;
  margin-bottom: 12px;
}

/* grid */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 22px;
}

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
}

.row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 14px;
  line-height: 1.55;
}

.k {
  width: 90px;
  font-weight: 900;
  color: #374151;
  flex: 0 0 auto;
}

.v {
  color: var(--text);
  min-width: 0;
}

.mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.strong {
  font-weight: 800;
}

/* badge */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;

  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #374151;
  white-space: nowrap;
}

.badge--IN_PROGRESS {
  border-color: #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
}
.badge--ANSWERED {
  border-color: #dcfce7;
  background: #f0fdf4;
  color: #15803d;
}
.badge--NEUTRAL {
  border-color: #e5e7eb;
  background: #f9fafb;
  color: #374151;
}

.badge--cat-1 {
  border-color: #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
}
.badge--cat-2 {
  border-color: #ffe4c7;
  background: #fff7ed;
  color: #c2410c;
}
.badge--cat-0 {
  border-color: #e5e7eb;
  background: #f9fafb;
  color: #374151;
}

/* content panel */
.panel {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  background: #fafbfc;
}

.content-title {
  font-weight: 900;
  margin-bottom: 10px;
  color: #111827;
}

.content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 14px;
  color: #111827;
}

/* footer */
.footer {
  display: flex;
  justify-content: center;
  padding-top: 6px;
}
</style>
