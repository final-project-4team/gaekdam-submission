<template>
  <BaseModal title="문의 선택" @close="$emit('close')">
    <div class="wrap">
      <div class="search">
        <input v-model="keyword" placeholder="제목/내용 검색" @keyup.enter="search" />
        <BaseButton type="primary" size="sm" @click="search">검색</BaseButton>
      </div>

      <div class="list">
        <div
            v-for="q in rows"
            :key="q.inquiryCode"
            class="item"
            @click="select(q)"
        >
          <div class="top">
            <div class="title">{{ q.inquiryTitle || "-" }}</div>
            <div class="code">Q-{{ q.inquiryCode }}</div>
          </div>
          <div class="sub">
            <span>{{ q.customerName || "-" }}</span>
            <span class="dot">·</span>
            <span :class="statusClass(q.inquiryStatus)">{{ statusLabel(q.inquiryStatus) }}</span>
          </div>
        </div>

        <div v-if="!rows.length" class="empty">검색 결과가 없습니다.</div>
      </div>

      <div class="paging">
        <BaseButton type="ghost" size="sm" :disabled="page<=1" @click="prev">이전</BaseButton>
        <span class="p">{{ page }}</span>
        <BaseButton type="ghost" size="sm" :disabled="rows.length < size" @click="next">다음</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref } from "vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";
import BaseButton from "@/components/common/button/BaseButton.vue";
import { fetchInquiriesForSelect } from "@/api/voc/inquiryApi.js";

const emit = defineEmits(["close", "select"]);

const keyword = ref("");
const rows = ref([]);

const page = ref(1);
const size = ref(10);

const statusLabel = (s) => {
  if (s === "IN_PROGRESS") return "접수";
  if (s === "ANSWERED") return "답변완료";
  return s || "-";
};

const statusClass = (s) => {
  if (s === "IN_PROGRESS") return "st-ing";
  if (s === "ANSWERED") return "st-done";
  return "";
};

const search = async () => {
  page.value = 1;
  await load();
};

const load = async () => {
  const res = await fetchInquiriesForSelect({
    page: page.value,
    size: size.value,
    keyword: keyword.value || undefined,
    sortBy: "created_at",
    direction: "DESC",
  });

  const data = res.data?.data;
  rows.value = data?.content ?? [];
};

const prev = async () => {
  if (page.value <= 1) return;
  page.value -= 1;
  await load();
};

const next = async () => {
  page.value += 1;
  await load();
};

const select = (q) => emit("select", q);
</script>

<style scoped>
.wrap { display: flex; flex-direction: column; gap: 12px; }
.search { display: flex; gap: 8px; align-items: center; }
.search input {
  flex: 1; padding: 9px 10px; border-radius: 10px;
  border: 1px solid #e5e7eb; font-size: 14px;
}
.list { border: 1px solid #e7edf4; border-radius: 12px; overflow: hidden; }
.item { padding: 12px 14px; cursor: pointer; border-bottom: 1px solid #eef2f7; }
.item:hover { background: #f9fafb; }
.top { display: flex; justify-content: space-between; gap: 10px; }
.title { font-weight: 800; }
.code { font-weight: 800; color: #1d4ed8; }
.sub { font-size: 12px; color: #6b7280; margin-top: 4px; display: flex; gap: 8px; align-items: center; }
.dot { opacity: .6; }

/* Status colors */
.st-ing { color: #1d4ed8; font-weight: 800; }
.st-done { color: #15803d; font-weight: 800; }

.empty { padding: 14px; text-align: center; color: #6b7280; }
.paging { display: flex; justify-content: center; align-items: center; gap: 10px; }
.p { font-weight: 800; }
</style>
