<!-- src/views/customer/modal/CustomerStatusHistoryModal.vue -->
<template>
  <BaseModal v-if="open" title="고객 상태 변경 이력" @close="$emit('close')">
    <div class="customer-status-history-scope">
      <div class="modal-body">
        <div class="filter-bar">
          <div class="left">
            <div class="quick">
              <button class="pill" :class="{ active: range.months === 1 }" @click="setMonths(1)">1개월</button>
              <button class="pill" :class="{ active: range.months === 3 }" @click="setMonths(3)">3개월</button>
              <button class="pill" :class="{ active: range.months === 6 }" @click="setMonths(6)">6개월</button>
              <button class="pill" :class="{ active: range.months === 12 }" @click="setMonths(12)">12개월</button>
            </div>
          </div>

          <div class="right">
            <input class="date" type="date" v-model="range.from" />
            <span class="sep">~</span>
            <input class="date" type="date" v-model="range.to" />
            <BaseButton type="ghost" size="sm" @click="resetRange">초기화</BaseButton>
            <BaseButton type="primary" size="sm" @click="applyRange">적용</BaseButton>
          </div>
        </div>

        <div v-if="loading" class="state">불러오는 중...</div>
        <div v-else-if="error" class="state state--error">{{ error }}</div>
        <div v-else-if="rows.length === 0" class="state">이력이 없습니다.</div>

        <TableWithPaging
            v-else
            :columns="columns"
            :rows="rows"
            :pageSize="20"
        />
      </div>
    </div>

    <template #footer>
      <BaseButton type="ghost" size="sm" @click="$emit('close')">닫기</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";

import BaseModal from "@/components/common/modal/BaseModal.vue";
import BaseButton from "@/components/common/button/BaseButton.vue";
import TableWithPaging from "@/components/common/table/TableWithPaging.vue";

import { getCustomerStatusHistoriesApi } from "@/api/customer/customerDetailApi";

const props = defineProps({
  open: { type: Boolean, default: false },
  customerCode: { type: [Number, String], required: true },
});

defineEmits(["close"]);

const loading = ref(false);
const error = ref("");
const raw = ref([]);
const rows = ref([]);

const columns = [
  { key: "changedAt", label: "변경일시", sortable: true, align: "center" },
  { key: "beforeStatus", label: "변경 전", sortable: true, align: "center" },
  { key: "afterStatus", label: "변경 후", sortable: true, align: "center" },
  { key: "actor", label: "변경 주체", sortable: true, align: "center" },
  { key: "changedBy", label: "변경자", sortable: false, align: "center" },
  { key: "reason", label: "사유", sortable: false },
];

const todayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addMonthsFromTodayYmd = (monthsAgo) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseYmdDate = (ymd) => {
  if (!ymd) return null;
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const inRange = (dateValue, fromYmd, toYmd) => {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;

  const from = parseYmdDate(fromYmd);
  const to = parseYmdDate(toYmd);
  if (!from || !to) return true;

  const end = new Date(to);
  end.setDate(end.getDate() + 1);
  return d >= from && d < end;
};

const formatDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

/**
 * 디폴트 12개월로 맞춤
 */
const range = ref({
  months: 12,
  from: addMonthsFromTodayYmd(12),
  to: todayYmd(),
});

const setMonths = (m) => {
  range.value.months = m;
  range.value.from = addMonthsFromTodayYmd(m);
  range.value.to = todayYmd();
};

const resetRange = () => setMonths(12);

const buildRows = () => {
  const filtered = (raw.value ?? []).filter((x) => {
    const changedAt = x?.changed_at ?? x?.changedAt;
    if (!changedAt) return true;
    return inRange(changedAt, range.value.from, range.value.to);
  });

  rows.value = filtered.map((x, idx) => {
    const src = String(x?.change_source ?? x?.changeSource ?? "").toUpperCase();
    const actor = src === "SYSTEM" ? "SYSTEM" : "MANUAL";

    const employeeName = x?.employee_name ?? x?.employeeName ?? null;
    const employeeCode = x?.employee_code ?? x?.employeeCode ?? null;

    // 요구사항: SYSTEM이면 변경자 이름 표시하지 않음, MANUAL일 때만 표시
    const changedBy =
        actor === "SYSTEM"
            ? "-"
            : (employeeName ?? (employeeCode === null || employeeCode === undefined ? "-" : String(employeeCode)));

    return {
      id: idx + 1,
      changedAt: formatDate(x?.changed_at ?? x?.changedAt),
      beforeStatus: x?.before_status ?? x?.beforeStatus ?? "-",
      afterStatus: x?.after_status ?? x?.afterStatus ?? "-",
      actor,
      changedBy,
      reason: x?.change_reason ?? x?.changeReason ?? "-",
      _raw: x,
    };
  });
};

const load = async () => {
  if (!props.customerCode) return;

  loading.value = true;
  error.value = "";
  try {
    const res = await getCustomerStatusHistoriesApi({
      customerCode: Number(props.customerCode),
      params: { size: 200, offset: 0, sortBy: "changed_at", direction: "DESC" },
    });

    const items =
        res?.data?.data?.items ??
        res?.data?.data?.content ??
        res?.data?.data?.list ??
        res?.data?.data ??
        [];

    raw.value = Array.isArray(items) ? items : [];
    buildRows();
  } catch {
    raw.value = [];
    rows.value = [];
    error.value = "상태 변경 이력을 불러오지 못했습니다.";
  } finally {
    loading.value = false;
  }
};

const applyRange = () => buildRows();

watch(
    () => props.open,
    async (v) => {
      if (!v) return;
      setMonths(12);
      await load();
    }
);

onMounted(() => {
  if (props.open) load();
});
</script>

<style scoped>
/* 이 모달만 폭 확장 (BaseModal 수정 X) */
:global(.modal:has(.customer-status-history-scope)) {
  width: min(1200px, calc(100vw - 80px)) !important;
  max-width: none !important;
}

/* 테이블 줄바꿈 + 사유 컬럼 확보 */
:global(.modal:has(.customer-status-history-scope) .base-table) {
  width: 100%;
  table-layout: fixed;
}
:global(.modal:has(.customer-status-history-scope) .base-table th:nth-child(1)),
:global(.modal:has(.customer-status-history-scope) .base-table td:nth-child(1)) {
  width: 170px;
  white-space: nowrap;
}
:global(.modal:has(.customer-status-history-scope) .base-table th:nth-child(2)),
:global(.modal:has(.customer-status-history-scope) .base-table td:nth-child(2)),
:global(.modal:has(.customer-status-history-scope) .base-table th:nth-child(3)),
:global(.modal:has(.customer-status-history-scope) .base-table td:nth-child(3)) {
  width: 110px;
  white-space: nowrap;
}
:global(.modal:has(.customer-status-history-scope) .base-table th:nth-child(4)),
:global(.modal:has(.customer-status-history-scope) .base-table td:nth-child(4)) {
  width: 110px;
  white-space: nowrap;
}
:global(.modal:has(.customer-status-history-scope) .base-table th:nth-child(5)),
:global(.modal:has(.customer-status-history-scope) .base-table td:nth-child(5)) {
  width: 140px;
  white-space: nowrap;
}
:global(.modal:has(.customer-status-history-scope) .base-table th:nth-child(6)),
:global(.modal:has(.customer-status-history-scope) .base-table td:nth-child(6)) {
  white-space: normal !important;
  word-break: break-word;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.quick {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
}

.pill.active {
  background: #eef6ff;
  border-color: #bfdbfe;
  color: #2563eb;
}

.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.date {
  height: 30px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.sep {
  color: #6b7280;
  font-weight: 700;
}

.state {
  padding: 10px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  color: #6b7280;
  font-size: 13px;
}

.state--error {
  border-color: #fecaca;
  color: #b91c1c;
  background: #fff5f5;
}
</style>
