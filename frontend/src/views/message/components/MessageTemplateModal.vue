<template>
  <BaseModal title="메시지 템플릿" @close="$emit('close')">

    <!-- 컨텍스트 -->
    <div class="context">
      <strong>{{ stage.stageNameKor }}</strong>
      <span class="dot">·</span>
      <span class="visitor">
        {{ visitorType === 'FIRST' ? '첫방문자' : '재방문자' }}
      </span>
    </div>

    <!-- 설정 -->
    <div class="setting-box">
      <div class="toggle-row">
        <span class="toggle-label">사용 여부</span>

        <label class="switch">
          <input type="checkbox" v-model="form.active" />
          <span class="slider"></span>
        </label>

        <span
            class="toggle-state"
            :class="{ on: form.active }"
        >
          {{ form.active ? '사용중' : '비활성' }}
        </span>
      </div>

      <div class="language-row">
        <label class="lang-label">언어</label>
        <select v-model="form.languageCode">
          <option value="KOR">한국어</option>
          <option value="ENG">영어</option>
        </select>
      </div>
    </div>

    <!-- 제목 -->
    <div class="field">
      <label class="label">제목</label>
      <input
          type="text"
          v-model="form.title"
          class="input"
          placeholder="메시지 제목을 입력하세요"
      />
    </div>

    <!-- 내용 -->
    <div class="field">
      <label class="label">메시지 내용</label>
      <textarea
          v-model="form.content"
          class="textarea"
          rows="8"
          placeholder="실제로 고객에게 발송될 메시지 내용을 입력하세요"
      />
    </div>

    <!-- FOOTER -->
    <template #footer>
      <button class="btn ghost" @click="$emit('close')">
        취소
      </button>
      <button class="btn primary" @click="save">
        저장
      </button>
    </template>

  </BaseModal>
</template>


<script setup>
import { reactive, watch } from 'vue'
import {
  createMessageTemplateApi,
  updateMessageTemplateApi
} from '@/api/message/messageTemplateApi'
import BaseModal from '@/components/common/modal/BaseModal.vue'

import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();
const props = defineProps({
  mode: String,          // 'create' | 'edit'
  stage: Object,
  visitorType: String,
  template: Object,      // edit 시 존재
})

const emit = defineEmits(['saved', 'close'])

const form = reactive({
  title: '',
  content: '',
  languageCode: 'KOR',
  active: true,
})

/**
 * mode / template 변경 시 단일 진입점
 */
watch(
    () => [props.mode, props.template],
    ([mode, tpl]) => {
      if (mode === 'edit' && tpl) {
        // EDIT: 서버 값 그대로 세팅
        form.title = tpl.title ?? ''
        form.content = tpl.content ?? ''
        form.languageCode = tpl.languageCode ?? 'KOR'
        form.active = !!tpl.active
      }

      if (mode === 'create') {
        // CREATE: 기본값
        form.title = ''
        form.content = ''
        form.languageCode = 'KOR'
        form.active = true
      }
    },
    { immediate: true }
)

/**
 * 저장
 */
const save =  () => {
  withPermission('MESSAGE_UPDATE', async () => {
    if (props.mode === 'create') {
      await createMessageTemplateApi({
        stageCode: props.stage.stageCode,
        visitorType: props.visitorType,
        languageCode: form.languageCode,
        title: form.title,
        content: form.content,
        isActive: form.active,
      })
    } else {
      await updateMessageTemplateApi(props.template.templateCode, {
        title: form.title,
        content: form.content,
        languageCode: form.languageCode,
        isActive: form.active,
      })
    }

    emit('saved')
  });
}
</script>

<style scoped>
.context {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.context .dot {
  opacity: 0.5;
}

.context .visitor {
  color: #635dec;
}

/* ===== 설정 박스 ===== */

.setting-box {
  background: #f9fafb;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-label {
  font-size: 13px;
  font-weight: 500;
  min-width: 60px;
}

.toggle-state {
  font-size: 12px;
  color: #9ca3af;
}

.toggle-state.on {
  color: #16a34a;
  font-weight: 500;
}

/* ===== 토글 스위치 ===== */

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #d1d5db;
  border-radius: 999px;
  transition: background-color 0.2s;
}

.slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  top: 3px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.switch input:checked + .slider {
  background-color: rgba(105, 101, 204, 0.8);
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}

/* ===== 언어 ===== */

.language-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lang-label {
  font-size: 13px;
  font-weight: 500;
}

.language-row select {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-size: 13px;
}

/* ===== 입력 ===== */

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.label {
  font-size: 13px;
  font-weight: 500;
}

.input,
.textarea {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
}

.textarea {
  resize: vertical;
}

/* ===== 버튼 ===== */

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn.primary {
  background: #4f46e5;
  color: white;
  border: none;
}

.btn.ghost {
  background: transparent;
  border: 1px solid #d1d5db;
}

</style>
