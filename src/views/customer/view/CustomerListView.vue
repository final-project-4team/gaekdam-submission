<template>
  <div class="customer-list-page">



    <div class="list-controls">
      <BaseButton type="ghost" size="sm" @click="openColumnModal" class="btn-setting">
        <span class="icon">⚙️</span> 표시 항목 설정
      </BaseButton>
    </div>

    <div class="content-area">
      <ListView
          :key="filtersKey"
          :columns="visibleColumns"
          :rows="rows"
          :filters="filters"
          :searchTypes="searchTypes"
          :page="page"
          :pageSize="pageSize"
          :total="totalCount"
          :searchType="searchType"
          :show-search="true"
          :show-detail="true"
          v-model:detail="detailForm"
          @update:searchType="(v) => (searchType.value = normalizeSearchType(v))"
          @search="onSearch"
          @filter="onFilter"
          @sort-change="onSortChange"
          @page-change="onPageChange"
          @row-click="goDetail"
          class="premium-list-view"
      >
        <template #detail-form>
          <div class="detail-panel">
            <h3 class="panel-title">상세 필터</h3>
            <p class="panel-desc">상세 조건으로 고객을 검색합니다.</p>

            <div class="form-group">
              <label class="form-label">고객명</label>
              <input v-model="detailForm.customerName" placeholder="예) 홍길동" class="input-modern" />
            </div>

            <div class="form-group">
              <label class="form-label">연락처</label>
              <input v-model="detailForm.phoneNumber" placeholder="010-0000-0000" class="input-modern" />
            </div>

            <div class="form-group">
              <label class="form-label">이메일</label>
              <input v-model="detailForm.email" placeholder="email@example.com" class="input-modern" />
            </div>

            <div class="form-group">
              <label class="form-label">고객코드</label>
              <input v-model="detailForm.customerCode" placeholder="숫자 입력" class="input-modern" />
            </div>

            <div class="form-group">
              <label class="form-label">상태</label>
              <div class="select-wrapper">
                <select v-model="detailForm.status" class="input-modern select-modern">
                  <option value="">전체 상태</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="CAUTION">CAUTION</option>
                </select>
                <span class="select-arrow">▼</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 뱃지를 위한 커스텀 컬럼 슬롯 -->
        <template #cell-status="{ value }">
          <span class="badge-pill" :class="statusTagClass(value)">{{ value }}</span>
        </template>
        <template #cell-membershipGrade="{ value }">
          <span class="badge-pill" :class="membershipTagClass(value)">{{ value }}</span>
        </template>
        <template #cell-loyaltyGrade="{ value }">
          <span class="badge-pill" :style="loyaltyTagStyle(value)">{{ value }}</span>
        </template>

      </ListView>
    </div>

    <!-- 컬럼 설정 모달 -->
    <BaseModal v-if="showColumnModal" title="테이블 표시 항목 설정" @close="showColumnModal = false">
      <div class="column-picker-body">
        <p class="picker-desc">목록에 표시할 항목을 선택해주세요.</p>
        <div class="picker-grid">
          <label v-for="c in columns" :key="c.key" class="chk-item" :class="{ checked: columnKeySet.includes(c.key) }">
            <input type="checkbox" v-model="columnKeySet" :value="c.key" class="chk-input" />
            <span class="chk-label">{{ c.label }}</span>
          </label>
        </div>
      </div>
      <template #footer>
        <div class="modal-footer-actions">
          <BaseButton type="ghost" size="sm" @click="resetColumns">초기화</BaseButton>
          <BaseButton type="primary" size="sm" @click="showColumnModal = false">설정 적용</BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- 사유 입력 모달 -->
    <ReasonRequestModal
        v-if="showReasonModal"
        @close="closeReasonModal"
        @confirm="onReasonConfirmed"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";

import ListView from "@/components/common/ListView.vue";
import BaseButton from "@/components/common/button/BaseButton.vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";
import ReasonRequestModal from "@/views/setting/modal/ReasonRequestModal.vue";

import { useAuthStore } from "@/stores/authStore.js";
import { getCustomerListApi } from "@/api/customer/customerApi.js";
import { getMembershipGradeList } from "@/api/setting/membershipGrade.js";
import { getLoyaltyGradeList } from "@/api/setting/loyaltyGrade.js";
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();

/* 태그 헬퍼 함수 */
const statusTagClass = (status) => {
  const s = String(status ?? "").toUpperCase();
  if (s === "ACTIVE") return "tag--ok";
  if (s === "CAUTION") return "tag--warn";
  if (s === "INACTIVE") return "tag--mute";
  return "tag--base";
};

const membershipTagClass = (gradeName) => {
  const g = String(gradeName ?? "").toUpperCase();
  if (!g || g === "-" || g === "미가입") return "tag--mute";
  if (g.includes("VIP")) return "tag--vip";
  if (g.includes("GOLD")) return "tag--gold";
  if (g.includes("SILVER")) return "tag--silver";
  if (g.includes("BRONZE")) return "tag--bronze";
  return "tag--base";
};

const loyaltyTagStyle = (gradeName) => {
  const g = String(gradeName ?? "").toUpperCase().trim();
  if (g.includes("EXCELLENT")) {
    return { background: "#e0e7ff", borderColor: "#a5b4fc", color: "#3730a3" }; // Indigo (Distinct from VIP Purple)
  }
  if (g.includes("GENERAL")) {
    return { background: "#ecfeff", borderColor: "#67e8f9", color: "#155e75" }; // Cyan
  }
  return {};
};

const router = useRouter();
const authStore = useAuthStore();

/* 검색 유형 */
const searchTypes = [
  { label: "전체", value: "" },
  { label: "고객명", value: "customerName" },
  { label: "대표 연락처", value: "phoneNumber" },
  { label: "이메일", value: "email" },
  { label: "고객코드", value: "customerCode" },
];

const DEFAULT_SEARCH_TYPE = "";
const normalizeSearchType = (v) => {
  const vv = (v ?? "").toString();
  return searchTypes.some((t) => t.value === vv) ? vv : DEFAULT_SEARCH_TYPE;
};

/* 등급 옵션 동적 로드 */
const membershipGradeOptions = ref([{ label: "멤버십(전체)", value: "" }, { label: "미가입", value: -1 }]);
const loyaltyGradeOptions = ref([{ label: "로열티(전체)", value: "" }, { label: "미가입", value: -1 }]);

const loadGradeOptions = async () => {
  try {
    const [mList, lList] = await Promise.all([getMembershipGradeList(), getLoyaltyGradeList()]);
    membershipGradeOptions.value = [
      { label: "멤버십(전체)", value: "" },
      { label: "미가입", value: -1 },
      ...(Array.isArray(mList) ? mList : [])
          .filter((g) => g && g.membershipGradeCode != null && g.gradeName)
          .map((g) => ({ label: g.gradeName, value: g.membershipGradeCode })),
    ];
    loyaltyGradeOptions.value = [
      { label: "로열티(전체)", value: "" },
      // 미가입 제외
      ...(Array.isArray(lList) ? lList : [])
          .filter((g) => g && g.loyaltyGradeCode != null && g.loyaltyGradeName)
          .map((g) => ({ label: g.loyaltyGradeName, value: g.loyaltyGradeCode })),
    ];
  } catch (e) {
    console.error("등급 옵션 로딩 실패:", e);
  }
};
onMounted(loadGradeOptions);

/* 필터 설정 */
const filters = computed(() => [
  {
    key: "status",
    options: [
      { label: "상태(전체)", value: "" },
      { label: "ACTIVE", value: "ACTIVE" },
      { label: "INACTIVE", value: "INACTIVE" },
      { label: "CAUTION", value: "CAUTION" },
    ],
  },
  {
    key: "contractType",
    options: [
      { label: "계약주체(전체)", value: "" },
      { label: "INDIVIDUAL", value: "INDIVIDUAL" },
      { label: "CORPORATE", value: "CORPORATE" },
    ],
  },
  {
    key: "nationalityType",
    options: [
      { label: "국적(전체)", value: "" },
      { label: "DOMESTIC", value: "DOMESTIC" },
      { label: "FOREIGN", value: "FOREIGN" },
    ],
  },
  {
    key: "inflowChannel",
    options: [
      { label: "유입채널(전체)", value: "" },
      { label: "WEB", value: "WEB" },
      { label: "OTA", value: "OTA" },
    ],
  },
  { key: "membershipGrade", options: membershipGradeOptions.value },
  { key: "loyaltyGrade", options: loyaltyGradeOptions.value },
]);

const filtersKey = computed(() => `m:${membershipGradeOptions.value.length}-l:${loyaltyGradeOptions.value.length}`);

/* 컬럼 정의 */
const columns = [
  { key: "customerCode", label: "고객코드", sortable: true, align: "center" },
  { key: "customerName", label: "고객명", sortable: true, align: "center" },
  { key: "primaryContact", label: "대표 연락처", sortable: false, align: "center" },
  { key: "status", label: "상태", sortable: true, align: "center" },
  { key: "membershipGrade", label: "멤버십", sortable: true, align: "center" },
  { key: "loyaltyGrade", label: "로열티", sortable: true, align: "center" },
  { key: "lastUsedDate", label: "최근 이용", sortable: true, align: "center" },
  { key: "inflowChannel", label: "유입 채널", sortable: true, align: "center" },
  { key: "contractType", label: "계약 주체", sortable: true, align: "center" },
  { key: "nationalityType", label: "국적", sortable: true, align: "center" },
];

const showColumnModal = ref(false);
const columnKeySet = ref(columns.map((c) => c.key));
const visibleColumns = computed(() => {
  const set = new Set(columnKeySet.value);
  return columns.filter((c) => set.has(c.key));
});
const openColumnModal = () => (showColumnModal.value = true);
const resetColumns = () => (columnKeySet.value = columns.map((c) => c.key));

/* 상태값 */
const rows = ref([]);
const totalCount = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchType = ref(DEFAULT_SEARCH_TYPE);
const searchValue = ref("");
const filterValues = ref({});
const sortState = ref({ sortBy: "customer_code", direction: "DESC" });

const defaultDetailForm = () => ({
  customerName: "", phoneNumber: "", email: "", customerCode: "", status: "",
});
const detailForm = ref(defaultDetailForm());

/* 정규화 헬퍼 */
const t = (v) => (v ?? "").toString().trim();
const phoneDigits = (v) => (v ?? "").toString().replace(/\D/g, "");
const emailLower = (v) => (v ?? "").toString().trim().toLowerCase();
const cleanParams = (obj) => {
  const out = { ...obj };
  Object.keys(out).forEach((k) => {
    if (out[k] === "" || out[k] == null) delete out[k];
  });
  return out;
};
const unwrapFilterValue = (v) => {
  if (v && typeof v === "object" && "value" in v) return v.value;
  return v;
};
const normalizeFilterValues = (values = {}) => {
  const out = {};
  Object.keys(values).forEach((k) => {
    out[k] = unwrapFilterValue(values[k]);
  });
  return out;
};

/* API 호출 */
const hotelGroupCode = computed(() => authStore.hotel?.hotelGroupCode);
const buildParams = () => {
  const d = detailForm.value && Object.keys(detailForm.value).length ? detailForm.value : defaultDetailForm();
  const fg = filterValues.value;
  const params = cleanParams({
    hotelGroupCode: hotelGroupCode.value,
    page: page.value,
    size: pageSize.value,
    status: fg.status,
    contractType: fg.contractType,
    nationalityType: fg.nationalityType,
    inflowChannel: fg.inflowChannel,
    membershipGradeCode: fg.membershipGrade,
    loyaltyGradeCode: fg.loyaltyGrade,
    customerName: t(d.customerName) || undefined,
    phoneNumber: phoneDigits(d.phoneNumber) || undefined,
    email: emailLower(d.email) || undefined,
    customerCode: t(d.customerCode) ? Number(t(d.customerCode)) : undefined,
    sortBy: sortState.value.sortBy || "created_at",
    direction: sortState.value.direction || "DESC",
  });
  const v = t(searchValue.value);
  const st = normalizeSearchType(searchType.value);
  if (v) {
    if (st === "") params.keyword = v;
    if (st === "customerName") params.customerName = v;
    if (st === "phoneNumber") params.phoneNumber = phoneDigits(v);
    if (st === "email") params.email = emailLower(v);
    if (st === "customerCode") params.customerCode = Number(v);
  }
  return cleanParams(params);
};

const loadCustomers = async () => {
  if (!hotelGroupCode.value) return;
  const res = await getCustomerListApi(buildParams());
  const data = res.data?.data;
  rows.value = (data?.content ?? []).map((it) => ({
    customerCode: it.customerCode,
    customerName: it.customerName,
    primaryContact: it.primaryContact,
    status: it.status,
    membershipGrade: it.membershipGrade ?? "미가입",
    loyaltyGrade: it.loyaltyGrade ?? "-",
    lastUsedDate: it.lastUsedDate ?? "-",
    inflowChannel: it.inflowChannel ?? "-",
    contractType: it.contractType ?? "-",
    nationalityType: it.nationalityType ?? "-",
  }));
  totalCount.value = data?.totalElements ?? 0;
};

/* 핸들러 */
const onSearch = ({ key, value }) => {
  page.value = 1;
  searchType.value = normalizeSearchType(key);
  searchValue.value = value ?? "";
  loadCustomers();
};
const onFilter = (values) => {
  filterValues.value = normalizeFilterValues(values);
  page.value = 1;
  loadCustomers();
};
const onSortChange = ({ sortBy, direction }) => {
  const map = {
    createdAt: "created_at", customerCode: "customer_code", customerName: "customer_name", lastUsedDate: "last_used_date",
  };
  sortState.value = {
    sortBy: map[sortBy] || sortBy || "created_at",
    direction: (direction || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC",
  };
  page.value = 1;
  loadCustomers();
};
const onPageChange = (p) => {
  page.value = p;
  loadCustomers();
};
watch(() => hotelGroupCode.value, (v) => { if (v) loadCustomers(); }, { immediate: true });

/* 디바운스 처리 */
let detailTimer = null;
let lastDetailKey = "";
const normalizeDetailForKey = (d) => ({
  customerName: t(d.customerName),
  phoneNumber: phoneDigits(d.phoneNumber),
  email: emailLower(d.email),
  customerCode: t(d.customerCode),
  status: t(d.status),
});
watch(() => ({ ...detailForm.value }), (v) => {
  if (!v || Object.keys(v).length === 0) {
    detailForm.value = defaultDetailForm();
    return;
  }
  const key = JSON.stringify(normalizeDetailForKey(v));
  if (key === lastDetailKey) return;
  lastDetailKey = key;
  page.value = 1;
  clearTimeout(detailTimer);
  detailTimer = setTimeout(() => { loadCustomers(); }, 450);
}, { deep: true });
onBeforeUnmount(() => { if (detailTimer) clearTimeout(detailTimer); });

const goDetail = (row) => {
  withPermission('CUSTOMER_READ', () => {
    if (!row?.customerCode) return;
    selectedCustomerCode.value = row.customerCode;
    showReasonModal.value = true;
  });
};

/* 사유 입력 모달 */
const showReasonModal = ref(false);
const selectedCustomerCode = ref(null);
const closeReasonModal = () => {
  showReasonModal.value = false;
  selectedCustomerCode.value = null;
};
const onReasonConfirmed = (reason) => {
  if (selectedCustomerCode.value) {
    router.push({ name: "CustomerDetail", params: { id: selectedCustomerCode.value }, query: { reason: reason } });
  }
  closeReasonModal();
};
</script>

<style scoped>
.customer-list-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
  font-family: Pretendard, sans-serif;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 8px;
}

.header-left .page-title {
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 6px 0;
}

.header-left .page-description {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.btn-setting {
  font-weight: 600;
  color: #475569;
}

.btn-setting .icon {
  margin-right: 4px;
  font-size: 14px;
}

.content-area {
  background: transparent;
  flex: 1;
}

/* 상세 패널 스타일 */
.detail-panel {
  background: white;
  padding: 24px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  margin-top: 10px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.panel-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0 0 8px 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.input-modern {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  background: #f8fafc;
}

.input-modern:focus {
  background: white;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.select-wrapper {
  position: relative;
}

.select-modern {
  appearance: none;
  padding-right: 32px;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #94a3b8;
  pointer-events: none;
}

/* 컬럼 설정 모달 스타일 */
.column-picker-body {
  padding: 0 8px;
}

.picker-desc {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 20px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.chk-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.chk-item:hover {
  background: #f1f5f9;
}

.chk-item.checked {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.chk-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.chk-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.chk-item.checked .chk-label {
  color: #2563eb;
}

.modal-footer-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 프리미엄 배지 스타일 */
.badge-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid transparent;
  display: inline-block;
}

.tag--ok { background-color: #dcfce7 !important; color: #166534 !important; border-color: #bbf7d0 !important; }
.tag--warn { background-color: #ffedd5 !important; color: #c2410c !important; border-color: #fed7aa !important; } /* Orange for Caution */
.tag--mute { background-color: #f1f5f9 !important; color: #94a3b8 !important; }
.tag--vip { background-color: #f3e8ff !important; color: #7e22ce !important; border-color: #d8b4fe !important; } /* Purple */
.tag--gold { background-color: #fefce8 !important; color: #a16207 !important; border-color: #fde047 !important; } /* Yellow/Gold */
.tag--silver { background-color: #f8fafc !important; color: #475569 !important; border-color: #cbd5e1 !important; }
.tag--bronze { background-color: #fff7ed !important; color: #9a3412 !important; border-color: #ffedd5 !important; }
.tag--base { background-color: #eff6ff !important; color: #2563eb !important; border-color: #bfdbfe !important; }

.list-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

</style>
