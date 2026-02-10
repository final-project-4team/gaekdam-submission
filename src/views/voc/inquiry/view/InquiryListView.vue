<!-- src/views/voc/view/InquiryListView.vue -->
<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue";
import ListView from "@/components/common/ListView.vue";
import { getInquiryListApi } from "@/api/voc/inquiryApi.js";
import InquiryDetailModal from "@/views/voc/inquiry/modal/InquiryDetailModal.vue";

import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();

/* Search Types */
const searchTypes = [
  { label: "전체", value: "ALL" },
  { label: "키워드(제목)", value: "TITLE" },
  { label: "고객명", value: "CUSTOMER_NAME" },
  { label: "담당자명", value: "EMPLOYEE_NAME" },
  { label: "담당자ID", value: "EMPLOYEE_ID" },
];

/* Filters */
const filters = [
  {
    key: "inquiryCategoryCode",
    options: [
      { label: "문의유형", value: "" },
      { label: "문의", value: "1" },
      { label: "클레임", value: "2" },
    ],
  },
  {
    key: "status",
    options: [
      { label: "문의상태", value: "" },
      { label: "접수", value: "IN_PROGRESS" },
      { label: "답변완료", value: "ANSWERED" },
    ],
  },
];

/* Columns */
const columns = [
  { key: "inquiryCode", label: "번호", sortable: true, align: "center" },
  { key: "createdAt", label: "접수일시", sortable: true, align: "center" },
  { key: "customerName", label: "고객명", sortable: false, align: "center" },
  { key: "inquiryTitle", label: "제목", sortable: false, align: "left" },
  { key: "inquiryCategoryName", label: "유형", sortable: false, align: "center" },
  { key: "inquiryStatus", label: "상태", sortable: true, align: "center" },
  { key: "employeeName", label: "담당자", sortable: false, align: "center" },
];

/* State */
const rows = ref([]);
const total = ref(0);

const page = ref(1);
const pageSize = ref(10);

const sortState = ref({ sortBy: "created_at", direction: "DESC" });
const filterValues = ref({});

// SearchBar payload 저장
const quickSearch = ref({ key: "ALL", value: "" });

// Detail Search form
const defaultDetailForm = () => ({
  fromDate: "",
  toDate: "",
  propertyCode: "",
  inquiryCategoryCode: "",
});
const detailForm = ref(defaultDetailForm());

/* Detail Modal */
const showDetailModal = ref(false);
const selectedInquiryCode = ref(null);

const openDetailModal = (row) => {
  withPermission('INQUIRY_READ', async () => {
      selectedInquiryCode.value = row?.inquiryCode ?? null;
      if (!selectedInquiryCode.value) return;
      showDetailModal.value = true;
  })
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedInquiryCode.value = null;
};

/* Format */
const statusLabel = (v) => {
  if (v === "IN_PROGRESS") return "접수";
  if (v === "ANSWERED") return "답변완료";
  return v ?? "-";
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  return String(iso).replace("T", " ").slice(0, 16);
};

const fmtInquiryNo = (code) => (code ? `Q-${code}` : "-");

/* Normalize */
const t = (v) => String(v ?? "").trim();

const toNumberOrNull = (v) => {
  const s = t(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const cleanParams = (obj) => {
  const out = { ...obj };
  Object.keys(out).forEach((k) => {
    if (out[k] === "" || out[k] == null) delete out[k];
  });
  return out;
};

/* Build params */
const buildParams = () => {
  const params = {
    page: page.value,
    size: pageSize.value,
    sortBy: sortState.value.sortBy || "created_at",
    direction: sortState.value.direction || "DESC",
  };

  // filters
  const fv = filterValues.value || {};
  if (fv.status) params.status = fv.status;

  const cat = fv.inquiryCategoryCode || detailForm.value.inquiryCategoryCode;
  const catNum = toNumberOrNull(cat);
  if (catNum != null) params.inquiryCategoryCode = catNum;

  // detail
  if (t(detailForm.value.fromDate)) params.fromDate = t(detailForm.value.fromDate);
  if (t(detailForm.value.toDate)) params.toDate = t(detailForm.value.toDate);

  const propNum = toNumberOrNull(detailForm.value.propertyCode);
  if (propNum != null) params.propertyCode = propNum;

  // search
  const searchType = t(quickSearch.value.key) || "ALL";
  const keyword = t(quickSearch.value.value);

  params.searchType = searchType;
  if (keyword) params.keyword = keyword;

  return cleanParams(params);
};

/* API */
const fetchList = async () => {
  const res = await getInquiryListApi(buildParams());
  const pageData = res?.data?.data;

  rows.value = pageData?.content ?? [];
  total.value = pageData?.totalElements ?? 0;
};

const displayRows = computed(() => rows.value);

/* Events */
const onSearch = async (payload) => {
  page.value = 1;

  const key = payload?.key ?? payload?.type ?? payload?.searchType ?? "ALL";
  const value = payload?.value ?? payload?.keyword ?? "";

  quickSearch.value = { key, value };
  await fetchList();
};

const onFilter = async (values) => {
  page.value = 1;
  filterValues.value = values ?? {};
  await fetchList();
};

const onSortChange = async ({ sortBy, direction }) => {
  const map = {
    inquiryCode: "inquiry_code",
    createdAt: "created_at",
    inquiryStatus: "inquiry_status",
  };

  sortState.value = {
    sortBy: map[sortBy] ?? "created_at",
    direction: (direction || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC",
  };

  page.value = 1;
  await fetchList();
};

const onPageChange = async (p) => {
  page.value = p;
  await fetchList();
};

const onDetailReset = async () => {
  page.value = 1;
  filterValues.value = {};
  quickSearch.value = { key: "ALL", value: "" };
  sortState.value = { sortBy: "created_at", direction: "DESC" };
  detailForm.value = defaultDetailForm();
  await fetchList();
};

/* Detail debounce */
let detailTimer = null;
let lastDetailKey = "";

const normalizeDetailForKey = (d) => ({
  fromDate: t(d.fromDate),
  toDate: t(d.toDate),
  propertyCode: t(d.propertyCode),
  inquiryCategoryCode: t(d.inquiryCategoryCode),
});

watch(
    () => ({ ...detailForm.value }),
    (v) => {
      if (!v || Object.keys(v).length === 0) {
        detailForm.value = defaultDetailForm();
        return;
      }

      const key = JSON.stringify(normalizeDetailForKey(v));
      if (key === lastDetailKey) return;
      lastDetailKey = key;

      page.value = 1;

      clearTimeout(detailTimer);
      detailTimer = setTimeout(() => {
        fetchList();
      }, 450);
    },
    { deep: true }
);

onBeforeUnmount(() => {
  if (detailTimer) clearTimeout(detailTimer);
});

onMounted(fetchList);
</script>

<template>
  <section class="inquiry-page">
    <ListView
        :columns="columns"
        :rows="displayRows"
        :filters="filters"
        :searchTypes="searchTypes"
        :page="page"
        :pageSize="pageSize"
        :total="total"
        show-search
        show-detail
        v-model:detail="detailForm"
        @search="onSearch"
        @filter="onFilter"
        @sort-change="onSortChange"
        @page-change="onPageChange"
        @detail-reset="onDetailReset"
        @row-click="openDetailModal"
    >
      <template #cell-inquiryCode="{ row }">
        <span class="mono strong">{{ fmtInquiryNo(row.inquiryCode) }}</span>
      </template>

      <template #cell-createdAt="{ row }">
        <span class="mono">{{ formatDateTime(row.createdAt) }}</span>
      </template>

      <template #cell-inquiryStatus="{ row }">
        <span :class="['badge', `badge--${row.inquiryStatus || 'NEUTRAL'}`]">
          {{ statusLabel(row.inquiryStatus) }}
        </span>
      </template>

      <template #cell-inquiryCategoryName="{ row }">
        <span :class="['badge', `badge--cat-${row.inquiryCategoryCode ?? '0'}`]">
          {{ row.inquiryCategoryName ?? "-" }}
        </span>
      </template>

      <template #cell-customerName="{ row }">
        <span class="strong">{{ row.customerName ?? "-" }}</span>
      </template>

      <template #cell-inquiryTitle="{ row }">
        <span class="ellipsis" :title="row.inquiryTitle ?? ''">
          {{ row.inquiryTitle ?? "-" }}
        </span>
      </template>

      <template #cell-employeeName="{ row }">
        <span class="mono">{{ row.employeeName ? row.employeeName : "미지정" }}</span>
      </template>

      <template #detail-form>
        <div class="detail-card">
          <div class="detail-grid">
            <div class="f">
              <label>기간 From</label>
              <input v-model="detailForm.fromDate" placeholder="2026-01-01" />
            </div>

            <div class="f">
              <label>기간 To</label>
              <input v-model="detailForm.toDate" placeholder="2026-01-31" />
            </div>

            <div class="f">
              <label>지점(PropertyCode)</label>
              <input v-model="detailForm.propertyCode" placeholder="예: 1" />
            </div>

            <div class="f">
              <label>카테고리 코드</label>
              <input v-model="detailForm.inquiryCategoryCode" placeholder="예: 1(문의), 2(클레임)" />
            </div>
          </div>
        </div>
      </template>
    </ListView>

    <InquiryDetailModal
        v-if="showDetailModal"
        :inquiryCode="selectedInquiryCode"
        @close="closeDetailModal"
    />
  </section>
</template>

<style scoped>
/* 사건/사고 톤과 동일한 토큰 */
.inquiry-page {
  --bg: #ffffff;
  --surface: #ffffff;
  --line: #e7edf4;
  --text: #111827;
  --muted: #6b7280;

  --r: 14px;
  --shadow: 0 1px 10px rgba(17, 24, 39, 0.06);

  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 폰트/숫자 톤 통일 */
.mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.strong {
  font-weight: 800;
  color: var(--text);
}

/* 제목 ellipsis */
.ellipsis {
  display: inline-block;
  max-width: 460px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
}

/* 배지 통일 */
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

/* 카테고리 배지(문의/클레임) */
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

/* 상세검색 폼 카드화 */
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

.f input {
  height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  font-size: 14px;
  outline: none;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.f input:focus {
  border-color: #cfe3ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
</style>
