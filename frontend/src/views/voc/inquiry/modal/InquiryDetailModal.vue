<template>
  <BaseModal title="문의 상세" @close="$emit('close')">
    <div class="modal">
      <div v-if="loading" class="state">불러오는 중...</div>
      <div v-else-if="error" class="state state--error">{{ error }}</div>

      <div v-else class="body">
        <!-- 기본정보 -->
        <section class="card">
          <header class="card-head">
            <div class="card-title">기본정보</div>
          </header>

          <div class="grid">
            <!-- 제목을 기본정보 최상단(첫번째)로 이동 -->
            <div class="row span2">
              <span class="k">제목</span>
              <span class="v">{{ detail?.inquiryTitle ?? "-" }}</span>
            </div>

            <div class="row">
              <span class="k">문의번호</span>
              <span class="v mono">{{ detail?.inquiryCode ?? "-" }}</span>
            </div>

            <div class="row">
              <span class="k">접수일시</span>
              <span class="v mono">{{ fmt(detail?.createdAt) }}</span>
            </div>

            <div class="row">
              <span class="k">고객명</span>
              <span class="v">{{ detail?.customerName ?? "-" }}</span>
            </div>

            <div class="row">
              <span class="k">연락처</span>
              <span class="v">-</span>
            </div>

            <div class="row">
              <span class="k">문의유형</span>
              <span class="v">{{ detail?.inquiryCategoryName ?? "-" }}</span>
            </div>

            <!-- 처리상태만 남김(상단 우측 배지 제거) -->
            <div class="row">
              <span class="k">처리상태</span>
              <span class="v">
                <span class="badge" :class="`badge--${detail?.inquiryStatus || 'NEUTRAL'}`">
                  {{ statusLabel(detail?.inquiryStatus) }}
                </span>
              </span>
            </div>

            <div class="row">
              <span class="k">담당자명</span>
              <span class="v">{{ employeeNameLabel }}</span>
            </div>

            <div class="row">
              <span class="k">담당자ID</span>
              <span class="v mono">{{ employeeLoginIdLabel }}</span>
            </div>

            <div v-if="detail?.linkedIncidentCode" class="row span2">
              <span class="k">연결된 사건</span>
              <span class="v link mono">{{ detail.linkedIncidentCode }}</span>
            </div>
          </div>
        </section>

        <!-- 문의내용 (제목은 위로 올렸으니 내용만) -->
        <section class="card">
          <header class="card-head">
            <div class="card-title">문의내용</div>
          </header>

          <div class="panel">
            <pre class="content">{{ detail?.inquiryContent ?? "-" }}</pre>
          </div>
        </section>

        <!-- 답변 -->
        <section class="card">
          <header class="card-head">
            <div class="card-title">답변(처리)내용</div>
          </header>

          <div class="panel">
            <pre class="content">{{ detail?.answerContent ?? "답변이 없습니다." }}</pre>
          </div>
        </section>
      </div>

      <!-- 모달 안 닫기 버튼 제거 (BaseModal 공통 닫기 사용) -->
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";
import { getInquiryDetailApi } from "@/api/voc/inquiryApi.js";

const props = defineProps({
  inquiryCode: { type: [Number, String], required: true },
});
defineEmits(["close"]);

const detail = ref(null);
const loading = ref(false);
const error = ref("");

const statusLabel = (v) => {
  if (v === "IN_PROGRESS") return "접수";
  if (v === "ANSWERED") return "답변완료";
  return v ?? "-";
};

const fmt = (iso) => {
  if (!iso) return "-";
  return String(iso).replace("T", " ").slice(0, 16);
};

const employeeNameLabel = computed(() => (detail.value?.employeeName ?? "").trim() || "미지정");
const employeeLoginIdLabel = computed(() => (detail.value?.employeeLoginId ?? "").trim() || "-");

const fetchDetail = async () => {
  loading.value = true;
  error.value = "";
  detail.value = null;

  try {
    const res = await getInquiryDetailApi(props.inquiryCode);
    detail.value = res?.data?.data ?? null;
  } catch (e) {
    error.value = e?.message || "상세 조회에 실패했습니다.";
  } finally {
    loading.value = false;
  }
};

watch(() => props.inquiryCode, fetchDetail, { immediate: true });
</script>

<style scoped>
.modal {
  --bg: #ffffff;
  --line: #e7edf4;
  --muted: #6b7280;
  --text: #111827;

  --r: 14px;
  --pad: 16px;

  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--text);
}

.body {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 6px;
}

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

.card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--r);
  padding: var(--pad);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.05);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.card-title {
  font-weight: 800;
  font-size: 15px;
  letter-spacing: -0.2px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 22px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .span2 {
    grid-column: auto;
  }
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  line-height: 1.4;
}

.span2 {
  grid-column: 1 / -1;
}

.k {
  width: 90px;
  font-weight: 800;
  color: #374151;
  flex: 0 0 auto;
}

.v {
  color: var(--text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mono {
  font-variant-numeric: tabular-nums;
}

.link {
  color: #1d4ed8;
  font-weight: 800;
  cursor: pointer;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #374151;
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

.panel {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  background: #fafbfc;
}

.content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 14px;
  color: #111827;
}
</style>
