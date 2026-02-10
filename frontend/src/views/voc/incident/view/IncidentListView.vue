<template>
  <div class="incident-page">
    <ListView
        :columns="columns"
        :rows="rows"
        :filters="filters"
        :searchTypes="searchTypes"
        :page="page"
        :pageSize="pageSize"
        :total="total"
        show-search
        show-detail
        @search="onSearch"
        @filter="onFilter"
        @sort-change="onSortChange"
        @page-change="onPageChange"
        @row-click="openDetail"
    >
      <template #detail-form>
        <div class="detail-card">
          <div class="detail-grid">
            <div class="f">
              <label>기간 (From ~ To)</label>
              <div class="range-inputs">
                <input type="date" v-model="detailForm.fromDate" />
                <span class="dash">~</span>
                <input type="date" v-model="detailForm.toDate" />
              </div>
            </div>

            <div class="f">
              <label>처리상태</label>
              <select v-model="detailForm.status">
                <option value="">전체</option>
                <option value="IN_PROGRESS">조치중</option>
                <option value="CLOSED">종결</option>
              </select>
            </div>

            <div class="f">
              <label>심각도</label>
              <select v-model="detailForm.severity">
                <option value="">전체</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>
        </div>
      </template>

      <template #cell-incidentCode="{ row }">
        <span class="mono strong">{{ fmtIncidentNo(row.incidentCode) }}</span>
      </template>

      <template #cell-createdAt="{ row }">
        <span class="mono">{{ fmtDateTime(row.createdAt) }}</span>
      </template>

      <template #cell-inquiryCode="{ row }">
        <span class="mono">{{ row.inquiryCode ? fmtInquiryNo(row.inquiryCode) : "-" }}</span>
      </template>

      <template #cell-employee="{ row }">
        <span class="mono">
          {{ row.employeeName ? row.employeeName : (row.employeeLoginId || row.employeeCode || "-") }}
        </span>
      </template>

      <template #cell-incidentStatus="{ row }">
        <span :class="['badge', `badge--${row.incidentStatus || 'NEUTRAL'}`]">
          {{ fmtStatus(row.incidentStatus) }}
        </span>
      </template>

      <template #cell-severity="{ row }">
        <span :class="['badge', `badge--${row.severity || 'NEUTRAL'}`]">
          {{ row.severity || "-" }}
        </span>
      </template>
    </ListView>

    <!-- ✅ 버튼이 리스트를 가리지 않도록: 하단 sticky bar -->
    <div class="bottom-bar">
      <BaseButton type="primary" size="md" @click="openCreate">
        사건/사고 등록
      </BaseButton>
    </div>

    <IncidentDetailModal
        v-if="showDetail"
        :incidentCode="selectedIncidentCode"
        @close="closeDetail"
        @updated="onDetailUpdated"
    />

    <IncidentCreateModal
        v-if="showCreate"
        @close="closeCreate"
        @created="afterCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import ListView from "@/components/common/ListView.vue";
import BaseButton from "@/components/common/button/BaseButton.vue";
import IncidentCreateModal from "../modal/IncidentCreateModal.vue";
import IncidentDetailModal from "../modal/IncidentDetailModal.vue";
import { getIncidentListApi } from "@/api/voc/incidentApi.js";
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();
const columns = [
  { key: "incidentCode", label: "사건번호", sortable: true, align: "center" },
  { key: "createdAt", label: "등록일시", sortable: true, align: "center" },
  { key: "incidentTitle", label: "제목", sortable: false, align: "left" },
  { key: "inquiryCode", label: "연결 문의", sortable: false, align: "center" },
  { key: "employee", label: "담당자", sortable: false, align: "center" },
  { key: "incidentStatus", label: "상태", sortable: true, align: "center" },
  { key: "severity", label: "심각도", sortable: true, align: "center" },
];

const searchTypes = [
  { label: "전체", value: "ALL" },
  { label: "제목", value: "TITLE" },
  { label: "담당자명", value: "EMPLOYEE_NAME" },
  { label: "담당자ID", value: "EMPLOYEE_ID" },
];

const filters = [
  {
    key: "status",
    options: [
      { label: "처리상태", value: "" },
      { label: "조치중", value: "IN_PROGRESS" },
      { label: "종결", value: "CLOSED" },
    ],
  },
  {
    key: "severity",
    options: [
      { label: "심각도", value: "" },
      { label: "LOW", value: "LOW" },
      { label: "MEDIUM", value: "MEDIUM" },
      { label: "HIGH", value: "HIGH" },
      { label: "CRITICAL", value: "CRITICAL" },
    ],
  },
];

const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

const filterState = ref({ status: "", severity: "" });
const sortState = ref({ sortBy: "created_at", direction: "DESC" });
const searchState = ref({ key: "ALL", value: "" });

// ✅ Detailed Search Form
const defaultDetailForm = () => ({
  fromDate: "",
  toDate: "",
  status: "",
  severity: "",
});
const detailForm = ref(defaultDetailForm());

const showCreate = ref(false);
const showDetail = ref(false);
const selectedIncidentCode = ref(null);
const loadingRowClick = ref(false);

const t = (v) => String(v ?? "").trim();

const cleanParams = (obj) => {
  const out = { ...obj };
  Object.keys(out).forEach((k) => {
    if (out[k] === "" || out[k] == null) delete out[k];
  });
  return out;
};

const buildParams = () => {
  const params = {
    page: page.value,
    size: pageSize.value,
    sortBy: sortState.value.sortBy || "created_at",
    direction: sortState.value.direction || "DESC",
  };

  // 1. Simple Filter (Chip)
  if (filterState.value.status) params.status = filterState.value.status;
  if (filterState.value.severity) params.severity = filterState.value.severity;

  // 2. Detailed Form (Override or Merge) -> 여기서는 detailForm 값이 있으면 우선시
  if (detailForm.value.status) params.status = detailForm.value.status;
  if (detailForm.value.severity) params.severity = detailForm.value.severity;

  // Date Range (Inquiry API 패턴: fromDate, toDate raw string)
  if (detailForm.value.fromDate) params.fromDate = detailForm.value.fromDate;
  if (detailForm.value.toDate) params.toDate = detailForm.value.toDate;

  // 3. Search (Keyword)
  const searchType = t(searchState.value.key) || "ALL";
  const keyword = t(searchState.value.value);

  params.searchType = searchType;
  if (keyword) params.keyword = keyword;

  return cleanParams(params);
};

const load = async () => {
  const res = await getIncidentListApi(buildParams());
  const data = res.data?.data;

  rows.value = (data?.content ?? []).map((r) => ({
    ...r,
    employeeName: r.employeeName ?? "",
    employeeLoginId: r.employeeLoginId ?? "",
  }));

  total.value = data?.totalElements ?? 0;
};

onMounted(load);

// ✅ Watch Detail Form (Debounce)
let detailTimer = null;
watch(
    () => detailForm.value,
    (newVal) => {
      // 값 변경 시 페이지 1로
      page.value = 1;

      if (detailTimer) clearTimeout(detailTimer);
      detailTimer = setTimeout(() => {
        load();
      }, 300);
    },
    { deep: true }
);

// ✅ payload 호환( key/type/searchType 모두 처리 )
const onSearch = (payload) => {
  page.value = 1;

  const key =
      payload?.key ??
      payload?.type ??
      payload?.searchType ??
      "ALL";

  const value =
      payload?.value ??
      payload?.keyword ??
      "";

  searchState.value = { key, value };
  load();
};

const onFilter = (values) => {
  page.value = 1;
  filterState.value = { ...filterState.value, ...(values ?? {}) };
  load();
};

const onSortChange = ({ sortBy, direction }) => {
  const map = {
    createdAt: "created_at",
    severity: "severity",
    incidentStatus: "incident_status",
    incidentCode: "incident_code",
  };

  sortState.value = {
    sortBy: map[sortBy] || "created_at",
    direction: (direction || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC",
  };

  page.value = 1;
  load();
};

const onPageChange = (p) => {
  page.value = p;
  load();
};

const openCreate = () =>
    withPermission('INCIDENT_CREATE', async () => {
      (showCreate.value = true);
    });
const closeCreate = () => (showCreate.value = false);

const openDetail = (row) => {
  withPermission('INCIDENT_READ', async () => {
    if (loadingRowClick.value) return;
    const code = row?.incidentCode;
    if (!code) return;

    loadingRowClick.value = true;
    selectedIncidentCode.value = code;
    showDetail.value = true;

    setTimeout(() => {
      loadingRowClick.value = false;
    }, 250);
  });
};

const closeDetail = () => {
  showDetail.value = false;
  selectedIncidentCode.value = null;
};

const onDetailUpdated = async () => {
  await load();
};

const afterCreated = () => {
  showCreate.value = false;
  page.value = 1;
  load();
};

const pad2 = (n) => String(n).padStart(2, "0");
const fmtDateTime = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const fmtIncidentNo = (code) => (code ? `C-${code}` : "-");
const fmtInquiryNo = (code) => (code ? `Q-${code}` : "-");

const fmtStatus = (s) => {
  if (s === "IN_PROGRESS") return "조치중";
  if (s === "CLOSED") return "종결";
  return s || "-";
};
</script>

<style scoped>
/* ====== Design Tokens (이 페이지 전용) ====== */
.incident-page {
  --bg: #ffffff;
  --surface: #ffffff;
  --line: #e7edf4;
  --text: #111827;
  --muted: #6b7280;

  --r: 14px;
  --shadow: 0 1px 10px rgba(17, 24, 39, 0.06);

  position: relative;
  padding-bottom: 72px;
}

/* 숫자/강조 톤 통일 */
.mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.strong {
  font-weight: 800;
  color: var(--text);
}

/* ====== Badge (Inquiry/Incident 공통) ====== */
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
.badge--NEUTRAL {
  border-color: #e5e7eb;
  background: #f9fafb;
  color: #374151;
}

/* status */
.badge--IN_PROGRESS {
  border-color: #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
}
.badge--CLOSED {
  border-color: #dcfce7;
  background: #f0fdf4;
  color: #15803d;
}

/* severity */
.badge--LOW {
  border-color: #dcfce7;
  background: #f0fdf4;
  color: #15803d;
}
.badge--MEDIUM {
  border-color: #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
}
.badge--HIGH {
  border-color: #ffe4c7;
  background: #fff7ed;
  color: #c2410c;
}
.badge--CRITICAL {
  border-color: #fecaca;
  background: #fff5f5;
  color: #b91c1c;
}

/* ====== Bottom Sticky Bar ====== */
.bottom-bar {
  position: sticky;
  bottom: 0;
  z-index: 5;

  display: flex;
  justify-content: flex-end;
  padding: 12px 0;

  background: linear-gradient(to top, rgba(255,255,255,0.98) 70%, rgba(255,255,255,0));
  border-top: 1px solid rgba(231, 237, 244, 0.7);
  backdrop-filter: blur(6px);
}

/* ====== Detailed Search Form (InquiryListView 톤) ====== */
.detail-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: var(--shadow);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
}

@media (max-width: 900px) {
  .detail-grid { grid-template-columns: 1fr; }
}

.f {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.f label {
  font-size: 13px;
  font-weight: 800;
  color: #374151;
}

.f input,
.f select {
  height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  font-size: 14px;
  outline: none;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.f input:focus,
.f select:focus {
  border-color: #cfe3ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}
.range-inputs input {
  flex: 1;
}
.dash {
  font-weight: 800;
  color: var(--muted);
}
</style>
