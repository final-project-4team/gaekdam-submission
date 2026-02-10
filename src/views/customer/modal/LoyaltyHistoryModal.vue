<template>
  <BaseModal v-if="open" title="로열티 상세" @close="emitClose">
    <div class="modal-body">
      <section class="box">
        <div class="summary">
          <div class="row"><div class="k">등급</div><div class="v">{{ loyaltyView.gradeName || "-" }}</div></div>
          <div class="row"><div class="k">상태</div><div class="v">{{ loyaltyView.loyaltyStatus || "-" }}</div></div>
          <div class="row"><div class="k">가입일</div><div class="v">{{ fmtDate(loyaltyView.joinedAt) }}</div></div>
          <div class="row"><div class="k">최근 변경일</div><div class="v">{{ fmtDate(loyaltyView.calculatedAt) }}</div></div>
        </div>
      </section>

      <section class="box">
        <div class="box-title">변경 이력</div>

        <div class="filter-bar">
          <div class="preset">
            <BaseButton
                v-for="m in presetMonths"
                :key="m"
                type="ghost"
                size="sm"
                :class="{ active: selectedPreset === m }"
                @click="applyPreset(m)"
            >
              {{ m }}개월
            </BaseButton>
          </div>

          <div class="range">
            <input type="date" v-model="fromDate" />
            <span class="dash">-</span>
            <input type="date" v-model="toDate" />
            <BaseButton type="ghost" size="sm" :disabled="loading" @click="resetRange">초기화</BaseButton>
            <BaseButton type="primary" size="sm" :disabled="loading" @click="applyRange">적용</BaseButton>
          </div>
        </div>

        <div v-if="loading" class="loading">불러오는 중...</div>

        <div v-else>
          <div class="table">
            <div class="tr th">
              <div class="td w1">변경일시</div>
              <div class="td w2">유형</div>
              <div class="td w3">변경 내용</div>
              <div class="td w4">변경 주체</div>
            </div>

            <div v-for="h in list.content" :key="h.id" class="tr">
              <div class="td w1">{{ fmtDateTime(h.changedAt) }}</div>
              <div class="td w2">{{ h.changeType || "-" }}</div>
              <div class="td w3">{{ h.content || "-" }}</div>
              <div class="td w4">{{ renderChangedBy(h) }}</div>
            </div>

            <div v-if="list.content.length === 0" class="empty">조회 결과가 없습니다.</div>
          </div>

          <div class="paging">
            <BaseButton type="ghost" size="sm" :disabled="list.page <= 1" @click="goPage(list.page - 1)">이전</BaseButton>
            <div class="page-info">{{ list.page }} / {{ list.totalPages }}</div>
            <BaseButton type="ghost" size="sm" :disabled="list.page >= list.totalPages" @click="goPage(list.page + 1)">
              다음
            </BaseButton>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <BaseButton type="primary" size="sm" @click="emitClose">확인</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";
import BaseButton from "@/components/common/button/BaseButton.vue";
import { getCustomerLoyaltyHistoriesApi } from "@/api/customer/loyaltyApi";

const props = defineProps({
  open: { type: Boolean, required: true },
  customerCode: { type: [Number, String], required: true },
  loyalty: { type: Object, default: null },
});

const emit = defineEmits(["close"]);
const emitClose = () => emit("close");

const loyaltyView = computed(() => props.loyalty || ({
  gradeName: null,
  loyaltyStatus: null,
  joinedAt: null,
  calculatedAt: null,
}));

const loading = ref(false);
const list = ref({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 1 });

const presetMonths = [1, 3, 6, 12];
const selectedPreset = ref(null);
const fromDate = ref("");
const toDate = ref("");

const loadHistories = async (page = 1) => {
  if (!fromDate.value || !toDate.value) return;
  loading.value = true;
  try {
    const data = await getCustomerLoyaltyHistoriesApi({
      customerCode: props.customerCode,
      page,
      size: list.value.size,
      from: fromDate.value,
      to: toDate.value,
    });

    list.value = {
      ...(data ?? list.value),
      content: (data?.content ?? []).map((it, idx) => ({ id: `${page}-${idx}`, ...it })),
    };
  } finally {
    loading.value = false;
  }
};

const applyPreset = async (m) => {
  selectedPreset.value = m;
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - m);
  fromDate.value = toYmd(start);
  toDate.value = toYmd(end);
  await loadHistories(1);
};

const applyRange = async () => {
  selectedPreset.value = null;
  await loadHistories(1);
};

const resetRange = async () => {
  selectedPreset.value = null;
  await applyPreset(12);
};

const goPage = async (p) => loadHistories(p);

watch(() => props.open, (v) => { if (v) applyPreset(12); });

const renderChangedBy = (h) => {
  if (h.changeSource === "SYSTEM") return "SYSTEM";
  return h.changedByEmployeeCode ? `MANUAL(${h.changedByEmployeeCode})` : "MANUAL";
};

const toYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return toYmd(d);
};

const fmtDateTime = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${toYmd(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
</script>

<style scoped>
.box { border: 1px solid #eef2f7; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.box-title { font-weight: 900; margin-bottom: 10px; }
.summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
.row { display: grid; grid-template-columns: 90px 1fr; gap: 10px; font-size: 12px; align-items: center; }
.k { color: #6b7280; font-weight: 900; }
.v { color: #111827; font-weight: 800; }
.filter-bar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.preset { display: flex; gap: 8px; flex-wrap: wrap; }
.preset :deep(button.active) { border: 2px solid #2563eb !important; }
.range { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.range input[type="date"] { border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; font-weight: 700; }
.dash { color: #6b7280; font-weight: 900; }
.loading { padding: 10px; font-weight: 800; color: #6b7280; }
.table { border: 1px solid #eef2f7; border-radius: 12px; overflow: hidden; }
.tr { display: grid; grid-template-columns: 160px 120px 1fr 140px; border-top: 1px solid #eef2f7; }
.tr.th { border-top: none; background: #f9fafb; }
.td { padding: 10px; font-size: 12px; font-weight: 700; color: #111827; }
.tr.th .td { font-weight: 900; color: #374151; }
.empty { padding: 10px; border-top: 1px solid #eef2f7; color: #6b7280; font-size: 13px; }
.paging { margin-top: 12px; display: flex; justify-content: center; align-items: center; gap: 10px; }
.page-info { font-weight: 900; color: #374151; }
</style>
