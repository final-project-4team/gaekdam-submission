<template>
  <BaseModal title="직원 검색" @close="$emit('close')">
    <div class="wrap">
      <div class="search">
        <input
            v-model="keyword"
            placeholder="이름으로 검색(정확히)"
            @keyup.enter="search"
        />
        <BaseButton type="primary" size="sm" @click="search">검색</BaseButton>
      </div>

      <div class="list">
        <div
            v-for="e in rows"
            :key="e.employeeCode"
            class="item"
            @click="select(e)"
        >
          <div class="name">{{ e.employeeName || "-" }}</div>
          <div class="sub">{{ e.loginId || "-" }}</div>
        </div>

        <div v-if="searched && !rows.length" class="empty">검색 결과가 없습니다.</div>
      </div>

      <div class="paging">
        <BaseButton type="ghost" size="sm" :disabled="page <= 1" @click="prev">이전</BaseButton>
        <span class="p">{{ page }}</span>
        <BaseButton type="ghost" size="sm" :disabled="!canNext" @click="next">다음</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from "vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";
import BaseButton from "@/components/common/button/BaseButton.vue";
import api from "@/api/axios"; // ✅ employeeApi.js 우회: 입력값 가공 없이 직접 호출

const emit = defineEmits(["close", "select"]);

const keyword = ref("");
const rows = ref([]);

const page = ref(1);
const size = ref(10);

const searched = ref(false);
const total = ref(0);

const t = (v) => String(v ?? "").trim();

const cleanParams = (obj) => {
  const out = { ...obj };
  Object.keys(out).forEach((k) => {
    if (out[k] === "" || out[k] == null) delete out[k];
  });
  return out;
};

const canNext = computed(() => page.value * size.value < (total.value || 0));

const buildParams = () => {
  const name = t(keyword.value);

  // ✅ "완전 일치 검색"만: name 그대로 보냄 (홍길동123 그대로)
  return cleanParams({
    page: page.value,
    size: size.value,
    name: name || undefined,

    // ✅ EmployeeQueryMapper.xml 기준(sortBy == 'createdAt' / 'updatedAt')
    sortBy: "createdAt",
    direction: "DESC",
  });
};

const load = async () => {
  searched.value = true;

  const params = buildParams();
  if (!params.name) {
    rows.value = [];
    total.value = 0;
    return;
  }

  // ✅ 디버깅용(원하면 지워)
  console.log("[EMPLOYEE_SEARCH params]", params);

  const res = await api.get("/employee", { params });
  const data = res?.data?.data;

  rows.value = data?.content ?? [];
  total.value = data?.totalElements ?? 0;
};

const search = async () => {
  page.value = 1;
  await load();
};

const prev = async () => {
  if (page.value <= 1) return;
  page.value -= 1;
  await load();
};

const next = async () => {
  if (!canNext.value) return;
  page.value += 1;
  await load();
};

const select = (e) => {
  emit("select", e);
};
</script>

<style scoped>
.wrap { display: flex; flex-direction: column; gap: 12px; }
.search { display: flex; gap: 8px; align-items: center; }
.search input {
  flex: 1; padding: 9px 10px; border-radius: 10px;
  border: 1px solid #e5e7eb; font-size: 14px;
}
.list { border: 1px solid #e7edf4; border-radius: 12px; overflow: hidden; }
.item {
  padding: 12px 14px; cursor: pointer;
  border-bottom: 1px solid #eef2f7;
}
.item:hover { background: #f9fafb; }
.name { font-weight: 800; }
.sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
.empty { padding: 14px; text-align: center; color: #6b7280; }
.paging { display: flex; justify-content: center; align-items: center; gap: 10px; }
.p { font-weight: 800; }
</style>
