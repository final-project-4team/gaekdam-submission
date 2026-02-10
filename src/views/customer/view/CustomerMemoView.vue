<template>
  <!-- 우측 메모 카드 -->
  <section class="dashboard-card">
    <div class="card-header">
      <h3 class="card-heading">고객 메모</h3>
      <div class="header-actions">
        <button class="text-btn action-primary" @click="openCreate">메모 작성</button>
        <button class="text-btn" @click="openList">전체 보기</button>
      </div>
    </div>

    <div class="memo-list">
      <div
          v-for="m in recent"
          :key="m.customerMemoCode"
          class="memo-item"
          @click="openDetail(m.customerMemoCode)"
      >
        <div class="memo-head">
          <span class="memo-date">{{ fmt(m.createdAt) }}</span>
          <div class="memo-actions" @click.stop>
            <button class="icon-btn edit" @click="openEdit(m)">수정</button>
            <button class="icon-btn delete" @click="openDelete(m)">삭제</button>
          </div>
        </div>
        <div class="memo-text">{{ m.customerMemoContent }}</div>
      </div>

      <div v-if="recent.length === 0" class="empty">메모가 없습니다.</div>
    </div>
  </section>

  <!-- 작성 -->
  <BaseModal v-if="showCreate" title="메모 작성" @close="showCreate = false">
    <div class="modal-body">
      <textarea v-model="createText" class="textarea" placeholder="메모 내용을 입력하세요" />
    </div>
    <template #footer>
      <BaseButton type="ghost" size="sm" @click="showCreate = false">취소</BaseButton>
      <BaseButton type="primary" size="sm" :disabled="saving" @click="create">저장</BaseButton>
    </template>
  </BaseModal>

  <!-- 전체 보기 -->
  <BaseModal v-if="showList" title="고객 메모 전체 보기" @close="closeList">
    <div class="modal-body">
      <!-- 기간 필터 -->
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
          <!-- [MODIFIED] Added '전체' button matches other modals -->
          <BaseButton
              type="ghost"
              size="sm"
              :class="{ active: selectedPreset === 'ALL' }"
              @click="applyPreset('ALL')"
          >
            전체
          </BaseButton>
        </div>

        <div class="range">
          <input type="date" v-model="fromDate" />
          <span class="dash">-</span>
          <input type="date" v-model="toDate" />
          <BaseButton type="ghost" size="sm" :disabled="loading" @click="resetRange">
            초기화
          </BaseButton>
          <BaseButton type="primary" size="sm" :disabled="loading" @click="applyRange">
            적용
          </BaseButton>
        </div>
      </div>

      <div v-if="loading" class="loading">불러오는 중...</div>

      <div v-else class="list-container">
        <div class="list-scroll-area">
          <div
              v-for="m in list.content"
              :key="m.customerMemoCode"
              class="list-item"
              @click="openDetail(m.customerMemoCode)"
          >
            <div class="list-head">
              <div class="list-at">{{ fmt(m.createdAt) }}</div>
              <div class="list-actions" @click.stop>
                <button class="text-btn text-btn-sm warning" @click="openEdit(m)">수정</button>
                <button class="text-btn text-btn-sm danger" @click="openDelete(m)">삭제</button>
              </div>
            </div>
            <div class="list-text">{{ m.customerMemoContent }}</div>
          </div>

          <div v-if="list.content.length === 0" class="empty">조회 결과가 없습니다.</div>
        </div>

        <div class="paging">
          <BaseButton type="ghost" size="sm" :disabled="list.page <= 1" @click="goPage(list.page - 1)">
            이전
          </BaseButton>
          <div class="page-info">{{ list.page }} / {{ list.totalPages }}</div>
          <BaseButton
              type="ghost"
              size="sm"
              :disabled="list.page >= list.totalPages"
              @click="goPage(list.page + 1)"
          >
            다음
          </BaseButton>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton type="ghost" size="sm" @click="closeList">닫기</BaseButton>
    </template>
  </BaseModal>

  <!-- 상세 -->
  <BaseModal v-if="showDetail" title="메모 상세" @close="closeDetail">
    <div class="modal-body">
      <div v-if="detailLoading" class="loading">불러오는 중...</div>
      <div v-else-if="!detail" class="empty">데이터가 없습니다.</div>
      <div v-else>
        <div class="detail-at">{{ fmt(detail.createdAt) }}</div>
        <div class="detail-text">{{ detail.customerMemoContent }}</div>
      </div>
    </div>
    <template #footer>
      <BaseButton type="ghost" size="sm" @click="closeDetail">닫기</BaseButton>
    </template>
  </BaseModal>

  <!-- 수정 -->
  <BaseModal v-if="showEdit" title="메모 수정" @close="closeEdit">
    <div class="modal-body">
      <textarea v-model="editText" class="textarea" placeholder="메모 내용을 입력하세요" />
    </div>
    <template #footer>
      <BaseButton type="ghost" size="sm" @click="closeEdit">취소</BaseButton>
      <BaseButton type="warning" size="sm" :disabled="saving" @click="update">저장</BaseButton>
    </template>
  </BaseModal>

  <!-- 삭제 확인 -->
  <BaseModal v-if="showDelete" title="메모 삭제" @close="showDelete = false">
    <div class="modal-body">삭제하시겠습니까? </div>
    <template #footer>
      <BaseButton type="ghost" size="sm" @click="showDelete = false">취소</BaseButton>
      <BaseButton type="danger" size="sm" :disabled="saving" @click="remove">확인</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { onMounted, ref } from "vue";
import BaseButton from "@/components/common/button/BaseButton.vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";

import {
  getCustomerMemosApi,
  getCustomerMemoDetailApi,
  createCustomerMemoApi,
  updateCustomerMemoApi,
  deleteCustomerMemoApi,
} from "@/api/customer/customerMemoApi.js";
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();

const props = defineProps({
  customerCode: { type: [Number, String], required: true },
});

// CustomerDetailView에게 “메모 변경됨” 알리기
const emit = defineEmits(["changed"]);

/* state */
const recent = ref([]);

const showCreate = ref(false);
const createText = ref("");

const showList = ref(false);
const loading = ref(false);
const list = ref({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 1 });

const showDetail = ref(false);
const detailLoading = ref(false);
const detail = ref(null);

const showEdit = ref(false);
const editTarget = ref(null);
const editText = ref("");

const showDelete = ref(false);
const deleteTarget = ref(null);

const saving = ref(false);

/* 기간 필터 state */
const presetMonths = [1, 3, 6, 12];
const selectedPreset = ref(null);
const fromDate = ref(""); // yyyy-MM-dd
const toDate = ref("");   // yyyy-MM-dd

const toIsoStart = (yyyyMMdd) => (yyyyMMdd ? `${yyyyMMdd}T00:00:00` : undefined);
const toIsoEnd = (yyyyMMdd) => (yyyyMMdd ? `${yyyyMMdd}T23:59:59` : undefined);

/* loaders */
const loadRecent = async () => {
  const res = await getCustomerMemosApi({ customerCode: props.customerCode, page: 1, size: 3 });
  recent.value = res.data?.data?.content ?? [];
};

/* [MODIFIED] Moved toYmd to module scope for access in loadList */
const toYmd = (d) => {
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
};

const loadList = async (page = list.value.page) => {
  loading.value = true;
  try {
    const res = await getCustomerMemosApi({
      customerCode: props.customerCode,
      page,
      size: list.value.size,
      fromDate: toIsoStart(fromDate.value || "1900-01-01"), // [MODIFIED] Default if empty
      toDate: toIsoEnd(toDate.value || toYmd(new Date())),  // [MODIFIED] Revert to Today (exclude future)
    });
    list.value = res.data?.data ?? list.value;
  } finally {
    loading.value = false;
  }
};

/* create */
const openCreate = () => {
  createText.value = "";
  showCreate.value = true;
};

const create = () => {
  withPermission('CUSTOMER_UPDATE', async () => {
    if (saving.value) return;

    const content = createText.value.trim();
    if (!content) return;

    saving.value = true;
    try {
      await createCustomerMemoApi({
        customerCode: props.customerCode,
        body: {customerMemoContent: content},
      });

      showCreate.value = false;

      await Promise.all([loadRecent(), showList.value ? loadList(1) : Promise.resolve()]);
      emit("changed"); // 타임라인 즉시 반영
    } finally {
      saving.value = false;
    }
  });
};

/* list modal */
const openList = async () => {
  showList.value = true;
  // [MODIFIED] Default to showing all (clear filters)
  selectedPreset.value = 'ALL';
  fromDate.value = "";
  toDate.value = "";
  await loadList(1);
};

const closeList = () => {
  showList.value = false;
};

const goPage = async (p) => {
  await loadList(p);
};

/* 기간 필터 액션 */
const applyPreset = async (m) => {
  selectedPreset.value = m;

  if (m === 'ALL') {
    // [MODIFIED] Handle 'ALL' preset
    fromDate.value = "";
    toDate.value = "";
  } else {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setMonth(start.getMonth() - m);

    fromDate.value = toYmd(start);
    toDate.value = toYmd(end);
  }

  await loadList(1);
};

const applyRange = async () => {
  selectedPreset.value = null;
  await loadList(1);
};

const resetRange = async () => {
  selectedPreset.value = null;
  fromDate.value = "";
  toDate.value = "";
  await loadList(1);
};

/* detail */
const openDetail = async (memoCode) => {
  showDetail.value = true;
  detailLoading.value = true;
  detail.value = null;

  try {
    const res = await getCustomerMemoDetailApi({ customerCode: props.customerCode, memoCode });
    detail.value = res.data?.data ?? null;
  } finally {
    detailLoading.value = false;
  }
};

const closeDetail = () => {
  showDetail.value = false;
  detail.value = null;
};

/* edit */
const openEdit = (m) => {
  editTarget.value = m;
  editText.value = m?.customerMemoContent ?? "";
  showEdit.value = true;
};

const closeEdit = () => {
  showEdit.value = false;
  editTarget.value = null;
  editText.value = "";
};

const update =  () => {
  withPermission('CUSTOMER_UPDATE', async () => {

    if (saving.value) return;
    if (!editTarget.value) return;

    const content = editText.value.trim();
    if (!content) return;

    saving.value = true;
    try {
      await updateCustomerMemoApi({
        customerCode: props.customerCode,
        memoCode: editTarget.value.customerMemoCode,
        body: {customerMemoContent: content},
      });

      closeEdit();

      await Promise.all(
          [loadRecent(), showList.value ? loadList(list.value.page) : Promise.resolve()]);
      emit("changed"); // 타임라인 즉시 반영
    } finally {
      saving.value = false;
    }
  });
};

/* delete */
const openDelete = (m) => {
  if (!m) return;
  deleteTarget.value = m;
  showDelete.value = true;
};

const remove =  () => {
  withPermission('CUSTOMER_UPDATE', async() => {
    if (saving.value) return;
    if (!deleteTarget.value) return;

    saving.value = true;
    try {
      await deleteCustomerMemoApi({
        customerCode: props.customerCode,
        memoCode: deleteTarget.value.customerMemoCode,
      });

      showDelete.value = false;
      deleteTarget.value = null;

      if (showEdit.value) closeEdit();

      await Promise.all([loadRecent(), showList.value ? loadList(1) : Promise.resolve()]);
      emit("changed"); // 타임라인 즉시 반영
    } finally {
      saving.value = false;
    }
  });
};

onMounted(loadRecent);

/* utils */
const fmt = (v) => {
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
</script>

<style scoped>
/* Dashboard Card Style (Global Unification) */
.dashboard-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  /* height: 100%;  [MODIFIED] Remove fixed height to adapt to content */
  display: flex;
  flex-direction: column;
}

.dashboard-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-heading {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: #f1f5f9;
}

.text-btn:hover {
  background: #e2e8f0;
  color: #3b82f6;
}

.text-btn.action-primary {
  background: #eff6ff;
  color: #3b82f6;
}
.text-btn.action-primary:hover {
  background: #dbeafe;
  color: #2563eb;
}

/* Memo List */
.memo-list {
  display: flex;
  flex-direction: column;
  gap: 8px; /* [MODIFIED] Reduce gap for compactness */
}

.memo-item {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  padding: 12px; /* [MODIFIED] Reduce padding */
  cursor: pointer;
  transition: all 0.2s ease;
}

.memo-item:hover {
  background: #fff;
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  transform: translateY(-1px);
}

.memo-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.memo-date {
  font-size: 13px;
  color: #64748b;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.memo-actions {
  display: flex;
  gap: 6px;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.memo-item:hover .memo-actions {
  opacity: 1;
}

.icon-btn {
  border: none;
  background: #e2e8f0;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
}
.icon-btn.edit:hover { background: #fcd34d; color: #92400e; }
.icon-btn.delete:hover { background: #fca5a5; color: #991b1b; }

.memo-text {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty {
  text-align: center;
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
}

/* Other Modals Styles skipped for brevity but generally inherit global modal styles */
.textarea {
  width: 100%;
  min-height: 140px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  font-size: 15px;
  outline: none;
  resize: vertical;
  background: #f8fafc;
  display: block;
  box-sizing: border-box; /* [MODIFIED] Include padding/border in width */
  margin-bottom: 8px; /* Maintain user preference */
}
.textarea:focus {
  background: #fff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* List Modal Typography */
.list-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
}
.list-head { margin-bottom: 8px; }
.list-at { font-size: 13px; font-weight: 700; color: #64748b; }
.list-text { font-size: 14px; color: #334155; }


.filter-bar { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.preset { display: flex; gap: 8px; flex-wrap: wrap; }
.range { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.range input { border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 8px; font-size: 13px; }

/* Scroll Area for Modal List */
.list-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-scroll-area {
  max-height: 50vh;
  overflow-y: auto;
  padding-right: 4px; /* Scrollbar space */
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Custom Scrollbar */
.list-scroll-area::-webkit-scrollbar { width: 6px; }
.list-scroll-area::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
.list-scroll-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.list-scroll-area::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.list-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.list-item:hover { border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.05); }

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.list-at { font-size: 13px; font-weight: 700; color: #64748b; }

.list-actions { display: flex; gap: 8px; }
.text-btn-sm { font-size: 12px; padding: 4px 8px; }
.text-btn-sm.warning { color: #d97706; background: #fffbeb; }
.text-btn-sm.warning:hover { background: #fef3c7; }
.text-btn-sm.danger { color: #dc2626; background: #fef2f2; }
.text-btn-sm.danger:hover { background: #fee2e2; }

.list-text { font-size: 14px; color: #334155; line-height: 1.5; white-space: pre-wrap; word-break: break-all; }

/* Pagination Centering */
.paging {
  display: flex;
  align-items: center;
  justify-content: center; /* Center horizontally */
  gap: 16px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.page-info {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}
</style>
