<!-- src/views/customer/modal/TimelineAllModal.vue -->
<template>
  <BaseModal v-if="open" title="타임라인 전체" @close="$emit('close')">
    <!-- 이 scope가 있는 모달만 CSS로 폭 늘림 -->
    <div class="timeline-all-scope">
      <div class="modal-body">
        <!-- 상단 필터바 -->
        <div class="filter-bar">
          <div class="left">
            <div class="quick">
              <BaseButton
                  v-for="m in [1, 3, 6, 12]"
                  :key="m"
                  type="ghost"
                  size="sm"
                  :class="['pill', { active: quickMonths === m }]"
                  @click="setQuick(m)"
              >
                {{ m }}개월
              </BaseButton>
            </div>
          </div>

          <div class="right">
            <input class="date" type="date" v-model="from" />
            <span class="tilde">~</span>
            <input class="date" type="date" v-model="to" />

            <BaseButton type="ghost" size="sm" @click="reset">초기화</BaseButton>
            <BaseButton type="primary" size="sm" @click="apply">적용</BaseButton>
          </div>
        </div>

        <!-- 테이블 -->
        <div v-if="filteredRows.length === 0" class="empty">타임라인 데이터가 없습니다.</div>

        <TableWithPaging
            v-else
            :key="tableKey"
            :columns="columns"
            :rows="pagedRows"
            :pageSize="pageSize"
        />

        <!-- 페이지네이션 -->
        <div v-if="filteredRows.length > 0" class="paging">
          <!-- 10페이지 뒤로 -->
          <span class="nav" :class="{ disabled: page <= jump }" @click="jumpPrev">&laquo;</span>

          <!-- 이전 -->
          <span class="nav" :class="{ disabled: page === 1 }" @click="goPrev">&lsaquo;</span>

          <!-- 처음 -->
          <span v-if="startPage > 1" @click="change(1)">1</span>
          <span v-if="startPage > 2" class="ellipsis">...</span>

          <!-- 중간 -->
          <span
              v-for="p in visiblePages"
              :key="p"
              :class="{ active: p === page }"
              @click="change(p)"
          >
            {{ p }}
          </span>

          <span v-if="endPage < totalPages - 1" class="ellipsis">...</span>

          <!-- 마지막 -->
          <span v-if="endPage < totalPages" @click="change(totalPages)">{{ totalPages }}</span>

          <!-- 다음 -->
          <span class="nav" :class="{ disabled: page === totalPages }" @click="goNext">&rsaquo;</span>

          <!-- 10페이지 앞으로 -->
          <span class="nav" :class="{ disabled: page + jump > totalPages }" @click="jumpNext">&raquo;</span>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton type="ghost" size="sm" @click="$emit('close')">닫기</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";
import BaseButton from "@/components/common/button/BaseButton.vue";
import TableWithPaging from "@/components/common/table/TableWithPaging.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] }, // [{ at, type, text, refId }]
});
defineEmits(["close"]);

const quickMonths = ref(12);
const from = ref("");
const to = ref("");

const page = ref(1);
const pageSize = ref(10); // 필요하면 20으로 바꿔도 됨

const toYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const setQuick = (m) => {
  quickMonths.value = m;
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - m);
  from.value = toYmd(start);
  to.value = toYmd(end);
  page.value = 1;
};

const reset = () => setQuick(12);
const apply = () => {
  // 로컬 필터라서 실질적 noop지만 UX상 page만 1로
  page.value = 1;
};

watch(
    () => props.open,
    (v) => {
      if (v) reset();
    }
);

/* =========================
   columns
   ========================= */
const columns = [
  { key: "at", label: "일시", sortable: true, align: "center" },
  { key: "type", label: "유형", sortable: true, align: "center" },
  { key: "text", label: "내용", sortable: false, align: "left" }
];

/* rows */
const rows = computed(() =>
    (props.items ?? []).map((t, idx) => ({
      id: t.refId ?? idx,
      at: t.at ?? "-",
      type: t.type ?? "-",
      text: t.text ?? "-",
      _raw: t
    }))
);

/* 기간 필터 */
const filteredRows = computed(() => {
  if (!from.value || !to.value) return rows.value;

  const fromTs = new Date(`${from.value}T00:00:00`).getTime();
  const toTs = new Date(`${to.value}T23:59:59`).getTime();

  return rows.value.filter((r) => {
    const ts = new Date(String(r.at).replace(" ", "T")).getTime();
    if (Number.isNaN(ts)) return true;
    return ts >= fromTs && ts <= toTs;
  });
});

/* =========================
    페이지네이션
   ========================= */
const totalPages = computed(() => {
  const total = filteredRows.value.length;
  return Math.max(1, Math.ceil(total / pageSize.value));
});

watch([filteredRows, pageSize], () => {
  page.value = 1;
});

watch(page, (p) => {
  if (p < 1) page.value = 1;
  if (p > totalPages.value) page.value = totalPages.value;
});

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

/* 테이블 내부 상태 초기화용 key */
const tableKey = computed(() => `${from.value}-${to.value}-${page.value}-${pageSize.value}`);

/* 숫자 페이지 UI 계산 */
const MAX_VISIBLE = 10;
const jump = 10;
const HALF = Math.floor(MAX_VISIBLE / 2);

const startPage = computed(() => {
  if (totalPages.value <= MAX_VISIBLE) return 1;
  const rawStart = page.value - HALF;
  const maxStart = totalPages.value - MAX_VISIBLE + 1;
  return Math.min(Math.max(1, rawStart), maxStart);
});

const endPage = computed(() =>
    Math.min(totalPages.value, startPage.value + MAX_VISIBLE - 1)
);

const visiblePages = computed(() =>
    Array.from({ length: endPage.value - startPage.value + 1 }, (_, i) => startPage.value + i)
);

const change = (p) => {
  if (p !== page.value) page.value = p;
};

const goPrev = () => {
  if (page.value > 1) page.value -= 1;
};

const goNext = () => {
  if (page.value < totalPages.value) page.value += 1;
};

const jumpPrev = () => {
  page.value = Math.max(1, page.value - jump);
};

const jumpNext = () => {
  page.value = Math.min(totalPages.value, page.value + jump);
};
</script>

<style scoped>
/*  모달 폭 확장 (BaseModal 수정 X) */
:global(.modal:has(.timeline-all-scope)) {
  width: min(1300px, calc(100vw - 80px)) !important;
  max-width: none !important;
}

/*  열 폭 고정 + 내용 최대 확보 */
:global(.modal:has(.timeline-all-scope) .base-table) {
  width: 100%;
  table-layout: fixed;
}

:global(.modal:has(.timeline-all-scope) .base-table th:nth-child(1)),
:global(.modal:has(.timeline-all-scope) .base-table td:nth-child(1)) {
  width: 180px;
  white-space: nowrap;
}

:global(.modal:has(.timeline-all-scope) .base-table th:nth-child(2)),
:global(.modal:has(.timeline-all-scope) .base-table td:nth-child(2)) {
  width: 220px;
  white-space: nowrap;
}

/*  내용은 “다 보이게” 줄바꿈 */
:global(.modal:has(.timeline-all-scope) .base-table th:nth-child(3)),
:global(.modal:has(.timeline-all-scope) .base-table td:nth-child(3)) {
  text-align: left !important;
  white-space: normal !important;
  word-break: break-word;
}

/* 상단 필터바 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  width: 100%;
  margin-bottom: 12px;
}

.left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.quick {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}

.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
  flex: 1;
  justify-content: flex-end;
}

.date {
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 13px;
}

.tilde {
  color: #6b7280;
  font-weight: 600;
}

:global(.modal:has(.timeline-all-scope) .btn.pill.active) {
  border-color: #93c5fd !important;
  background: #eef6ff !important;
  color: #1d4ed8 !important;
  font-weight: 600;
}

.empty {
  padding: 12px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  color: #6b7280;
  font-size: 13px;
}

/*  하단 페이지네이션(피그마 스타일) */
.paging {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
}

.paging span {
  cursor: pointer;
  font-size: 13px;
  padding: 4px 6px;
}

.paging .active {
  color: #1d4ed8;
  font-weight: 600;
}

.paging .nav {
  font-size: 18px;
  font-weight: 500;
}

.paging .disabled {
  opacity: 0.35;
  pointer-events: none;
}

.paging .ellipsis {
  cursor: default;
  opacity: 0.6;
}
</style>
