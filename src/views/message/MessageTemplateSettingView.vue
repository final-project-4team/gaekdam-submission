<!-- /src/views/message/MessageTemplateSetting.vue (예시 경로) -->
<template>
  <div class="message-template-setting">
    <div class="page-header">
      <div class="title">메시지 템플릿 설정</div>
      <div class="desc">여정(Stage)별 · 첫방문/재방문 템플릿을 관리합니다.</div>
    </div>

    <div class="timeline">
      <div
          v-for="(stage, idx) in stages"
          :key="stage.stageCode"
          class="timeline-row"
      >
        <!-- 왼쪽: 타임라인 레일 -->
        <div class="rail">
          <div class="dot" :class="{ first: idx === 0, last: idx === stages.length - 1 }"></div>
          <div class="line" v-if="idx !== stages.length - 1"></div>
        </div>

        <!-- 가운데: 스테이지 라벨 -->
        <div class="stage">
          <div class="stage-name">{{ stage.stageNameKor }}</div>
          <div class="stage-sub">StageCode: {{ stage.stageCode }}</div>
        </div>

        <!-- 오른쪽: 카드 2개 (FIRST/REPEAT) -->
        <div class="cards">
          <MessageTemplateCard
              :stage="stage"
              visitorType="FIRST"
              :template="findTemplate(stage, 'FIRST')"
              @edit="openEdit"
          />
          <MessageTemplateCard
              :stage="stage"
              visitorType="REPEAT"
              :template="findTemplate(stage, 'REPEAT')"
              @edit="openEdit"
          />
        </div>
      </div>
    </div>

    <MessageTemplateModal
        v-if="showModal && selectedStage"
        :mode="modalMode"
        :stage="selectedStage"
        :visitorType="selectedVisitorType"
        :template="selectedTemplate"
        @close="closeModal"
        @saved="reload"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MessageTemplateCard from './components/MessageTemplateCard.vue'
import MessageTemplateModal from './components/MessageTemplateModal.vue'
import { getMessageTemplateApi, getMessageTemplateSettingApi } from '@/api/message/messageTemplateApi'
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();


const stages = ref([])
const showModal = ref(false)
const modalMode = ref('edit') // create UX 없으니 기본 edit
const selectedStage = ref(null)
const selectedVisitorType = ref(null)
const selectedTemplate = ref(null)

const load = async () => {
  const res = await getMessageTemplateSettingApi()
  stages.value = res.data.data || []
}

const findTemplate =  (stage, visitorType) => {
  withPermission('MESSAGE_LIST', async () => {
    return null
  });

  return stage.templates?.[visitorType] || null

}


const openEdit =  ({ stage, template, visitorType }) => {
  // 템플릿 추가가 없다면, null인 경우는 그냥 막아두기
  withPermission('MESSAGE_READ',  async () => {
    if (!template?.templateCode) return

    modalMode.value = 'edit'
    selectedStage.value = stage
    selectedVisitorType.value = visitorType

    const res = await getMessageTemplateApi(template.templateCode)
    selectedTemplate.value = res.data.data

    showModal.value = true
  });
}

const closeModal = () => {
  showModal.value = false
  selectedTemplate.value = null
  selectedStage.value = null
  selectedVisitorType.value = null
}

const reload = async () => {
  closeModal()
  await load()
}

onMounted(load)
</script>

<style scoped>
.message-template-setting {
  padding: 18px 22px;
}

.page-header {
  margin-bottom: 18px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.desc {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.timeline-row {
  display: grid;
  grid-template-columns: 56px 220px 1fr;
  gap: 18px;
  align-items: stretch;
}

.rail {
  position: relative;
  display: flex;
  justify-content: center;
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #e5e7eb;
  border: 2px solid #c7d2fe;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.08);
  margin-top: 10px;
  z-index: 2;
}

.line {
  position: absolute;
  top: 28px;
  bottom: -18px;
  width: 2px;
  background: linear-gradient(to bottom, #c7d2fe, #e5e7eb);
  border-radius: 999px;
}

.stage {
  padding: 12px 14px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #eef2ff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stage-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.stage-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  min-height: 86px;
}

/* 화면 넓으면 더 시원하게 */
@media (min-width: 1200px) {
  .timeline-row {
    grid-template-columns: 56px 260px 1fr;
  }
  .message-template-setting {
    padding: 22px 28px;
  }
}
</style>
