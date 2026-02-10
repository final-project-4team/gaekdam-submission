<template>
  <BaseModal title="사건/사고 등록" @close="$emit('close')">
    <div class="modal-scope">
      <div class="content">
        <div class="section-grid">
          <section class="card">

            <div class="form-grid">
              <div class="field full">
                <label>지점</label>
                <input :value="propertyLabel" readonly />
              </div>

              <div class="field full">
                <label>담당자 <span class="req">*</span></label>
                <div class="inline">
                  <input :value="employeeLabel" readonly placeholder="직원을 선택하세요" />
                  <BaseButton type="ghost" size="sm" @click="showEmployeeModal = true">
                    직원 선택
                  </BaseButton>
                  <BaseButton
                      v-if="form.employeeCode"
                      type="danger"
                      size="sm"
                      @click="clearEmployee"
                  >
                    해제
                  </BaseButton>
                </div>
              </div>

              <div class="field full">
                <label>제목 <span class="req">*</span></label>
                <input v-model="form.incidentTitle" placeholder="사건/사고 제목" />
              </div>

              <div class="field full">
                <label>요약</label>
                <input v-model="form.incidentSummary" placeholder="한 줄 요약(선택)" />
              </div>

              <div class="field">
                <label>유형</label>
                <select v-model="form.incidentType">
                  <option value="FACILITY">시설</option>
                  <option value="PAYMENT">결제</option>
                  <option value="CUSTOMER">고객</option>
                  <option value="EMPLOYEE">직원</option>
                  <option value="ETC">기타</option>
                </select>
              </div>

              <div class="field">
                <label>심각도</label>
                <select v-model="form.severity">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>
          </section>

          <section class="card">

            <div class="form-grid">
              <div class="field full">
                <label>발생일시</label>

                <!-- 날짜(위) -> 시간(아래) -->
                <div class="dt-stack">
                  <div class="dt-row">
                    <input type="date" v-model="form.occurredDate" />
                  </div>

                  <div class="dt-row time">
                    <input type="time" v-model="form.occurredTime" step="60" />
                    <BaseButton
                        type="ghost"
                        size="sm"
                        class="dt-clear"
                        @click="clearOccurredAt"
                    >
                      비우기
                    </BaseButton>
                  </div>
                </div>
              </div>

              <div class="field full">
                <label>내용 <span class="req">*</span></label>
                <textarea
                    v-model="form.incidentContent"
                    rows="10"
                    placeholder="상세 내용을 입력하세요."
                />
                <div class="counter">{{ (form.incidentContent || "").length }} chars</div>
              </div>

              <div class="field full">
                <label>문의 연결(선택)</label>
                <div class="inline">
                  <input :value="linkedInquiryText" readonly placeholder="연결된 문의 없음" />
                  <BaseButton type="ghost" size="sm" @click="showInquiryModal = true">
                    문의 선택
                  </BaseButton>
                  <BaseButton
                      v-if="form.inquiryCode"
                      type="danger"
                      size="sm"
                      @click="clearInquiry"
                  >
                    해제
                  </BaseButton>
                </div>
              </div>
            </div>
          </section>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </div>

      <div class="footer">
        <BaseButton type="ghost" size="sm" @click="$emit('close')">취소</BaseButton>
        <BaseButton type="primary" size="sm" :disabled="saving" @click="submit">
          {{ saving ? "등록중..." : "등록" }}
        </BaseButton>
      </div>

      <IncidentEmployeeSelectModal
          v-if="showEmployeeModal"
          @close="showEmployeeModal = false"
          @select="onSelectEmployee"
      />
      <InquirySelectModal
          v-if="showInquiryModal"
          @close="showInquiryModal = false"
          @select="onSelectInquiry"
      />
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore.js";
import BaseModal from "@/components/common/modal/BaseModal.vue";
import BaseButton from "@/components/common/button/BaseButton.vue";

import IncidentEmployeeSelectModal from "./IncidentEmployeeSelectModal.vue";
import InquirySelectModal from "../../inquiry/modal/InquirySelectModal.vue";
import { createIncidentApi } from "@/api/voc/incidentApi.js";

const emit = defineEmits(["close", "created"]);
const authStore = useAuthStore();

const showEmployeeModal = ref(false);
const showInquiryModal = ref(false);
const saving = ref(false);
const errorMsg = ref("");

const form = reactive({
  propertyCode: null,
  employeeCode: null,
  employeeName: "",
  employeeLoginId: "",

  incidentTitle: "",
  incidentSummary: "",
  incidentContent: "",
  incidentType: "FACILITY",
  severity: "MEDIUM",

  occurredDate: "",
  occurredTime: "",
  inquiryCode: null,
});

const resolvePropertyCode = () => {
  return (
      authStore.propertyCode ??
      authStore.hotel?.propertyCode ??
      authStore.user?.propertyCode ??
      null
  );
};

onMounted(() => {
  form.propertyCode = resolvePropertyCode();
});

const propertyLabel = computed(() => (form.propertyCode ? String(form.propertyCode) : "-"));

const employeeLabel = computed(() => {
  if (!form.employeeCode) return "";
  const n = (form.employeeName || "").trim();
  const id = (form.employeeLoginId || "").trim();
  if (n && id) return `${n} (${id})`;
  if (n) return n;
  if (id) return id;
  return `#${form.employeeCode}`;
});

const linkedInquiryText = computed(() => (form.inquiryCode ? `Q-${form.inquiryCode}` : ""));

const onSelectEmployee = (e) => {
  form.employeeCode = e?.employeeCode ?? null;
  form.employeeName = e?.employeeName ?? "";
  form.employeeLoginId = e?.loginId ?? "";
  showEmployeeModal.value = false;
};

const clearEmployee = () => {
  form.employeeCode = null;
  form.employeeName = "";
  form.employeeLoginId = "";
};

const onSelectInquiry = (q) => {
  form.inquiryCode = q?.inquiryCode ?? null;
  showInquiryModal.value = false;
};

const clearInquiry = () => {
  form.inquiryCode = null;
};

const clearOccurredAt = () => {
  form.occurredDate = "";
  form.occurredTime = "";
};

const buildOccurredAtIso = () => {
  if (!form.occurredDate) return null;
  const time = form.occurredTime?.trim() ? form.occurredTime.trim() : "00:00";
  const local = `${form.occurredDate}T${time}`;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const submit = async () => {
  errorMsg.value = "";

  if (!form.propertyCode) return (errorMsg.value = "지점 정보가 없습니다. 로그인 정보를 확인하세요.");
  if (!form.employeeCode) return (errorMsg.value = "담당자를 선택해야 등록됩니다.");
  if (!form.incidentTitle.trim()) return (errorMsg.value = "제목을 입력하세요.");
  if (!form.incidentContent.trim()) return (errorMsg.value = "내용을 입력하세요.");

  saving.value = true;
  try {
    const payload = {
      propertyCode: form.propertyCode,
      employeeCode: form.employeeCode,
      incidentTitle: form.incidentTitle.trim(),
      incidentSummary: form.incidentSummary?.trim() || null,
      incidentContent: form.incidentContent.trim(),
      incidentType: form.incidentType,
      severity: form.severity,
      occurredAt: buildOccurredAtIso(),
      inquiryCode: form.inquiryCode ?? null,
    };

    const res = await createIncidentApi(payload);
    const incidentCode = res.data?.data?.incidentCode;
    emit("created", incidentCode);
  } catch (e) {
    console.error(e);
    errorMsg.value = e?.message || "등록에 실패했습니다.";
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.modal-scope {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content {
  max-height: 72vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 6px;
}

.section-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
@media (max-width: 980px) {
  .section-grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: #fff;
  border: 1px solid #e7edf4;
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
  min-width: 0;
}

.card-title {
  font-weight: 900;
  color: #111827;
  margin-bottom: 12px;
  text-align: left;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 620px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.field.full {
  grid-column: 1 / -1;
}

label {
  font-size: 13px;
  font-weight: 800;
  color: #374151;
}
.req {
  color: #ef4444;
  margin-left: 4px;
}

input,
select,
textarea {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  min-width: 0;
}
input[readonly] {
  background: #f9fafb;
}

.inline {
  display: flex;
  gap: 8px;
  align-items: center;
}
.inline input {
  flex: 1;
}

/* 발생일시: 날짜 위 / 시간 아래 */
.dt-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dt-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  align-items: center;
}

.dt-row.time {
  grid-template-columns: 1fr auto;
}

.dt-clear {
  white-space: nowrap;
}

.counter {
  font-size: 12px;
  color: #6b7280;
  text-align: right;
}

.error {
  margin: 8px 2px 0;
  color: #b91c1c;
  font-weight: 800;
  font-size: 13px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}
</style>
