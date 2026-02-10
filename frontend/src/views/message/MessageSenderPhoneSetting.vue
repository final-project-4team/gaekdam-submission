<template>
  <div class="sender-phone-setting">

    <!-- 헤더 -->
    <div class="page-header">
      <div class="title">발신번호 설정</div>
      <div class="desc">
        발신번호를 선택하고, 여정별 메시지를 시연합니다.
      </div>
    </div>

    <!-- 발신번호 등록 -->
    <div class="card">
      <div class="card-title">발신번호 등록</div>

      <div class="form-row">
        <input v-model="newPhone.phoneNumber" placeholder="01012345678" />
        <input v-model="newPhone.label" placeholder="표시 이름" />
        <button @click="createSenderPhone">등록</button>
      </div>
    </div>

    <!-- 발신번호 선택 -->
    <div class="card">
      <div class="card-title">발신번호 선택</div>

      <div
          v-for="phone in senderPhones"
          :key="phone.senderPhoneCode"
          class="phone-row"
      >
        <label>
          <input
              type="radio"
              name="senderPhone"
              :value="phone.senderPhoneCode"
              v-model="selectedSenderPhoneCode"
          />
        </label>

        <div class="info">
          <div class="number">{{ phone.phoneNumber }}</div>
          <div class="label">{{ phone.label }}</div>
        </div>
      </div>
    </div>

    <!-- 시연 대상 예약 -->
    <div v-if="demoReservation" class="card">
      <div class="card-title">시연 대상 예약</div>

      <div class="reservation-info">
        <div><b>예약코드</b> : {{ demoReservation.reservationCode }}</div>

        <div>
          <b>수신번호</b> :
          <input
              v-model="toPhone"
              placeholder="01012345678"
              class="phone-input"
          />
        </div>

        <div>
          <b>현재 상태</b> : {{ demoReservation.reservationStatus }}
        </div>
      </div>

      <div class="stage-buttons">
        <button
            v-for="stage in stages"
            :key="stage.stageCode"
            :disabled="!canSend"
            @click="sendStage(stage)"
        >
          {{ stage.stageNameKor }} 문자 보내기
        </button>
      </div>
    </div>

    <!-- 힌트 -->
    <div v-if="!selectedSenderPhoneCode" class="hint">
      발신번호를 하나 선택하세요.
    </div>

    <div v-else-if="!toPhone" class="hint">
      수신번호를 입력해야 문자 발송이 가능합니다.
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

import {
  getMessageSenderPhoneListApi,
  createMessageSenderPhoneApi,
} from '@/api/message/messageSenderPhoneApi'

import { getMessageJourneyStagesApi } from '@/api/message/messageStageApi'
import { getDemoReservationApi } from '@/api/message/demoReservationApi'
import { sendDemoSmsApi } from '@/api/message/demoSmsApi'

/* 상태 */
const demoReservation = ref(null)
const toPhone = ref('')

const senderPhones = ref([])
const selectedSenderPhoneCode = ref(null)

const newPhone = ref({ phoneNumber: '', label: '' })
const stages = ref([])

/* 계산 */
const canSend = computed(() =>
    !!selectedSenderPhoneCode.value && !!toPhone.value
)

/* Demo 예약 */
const loadDemoReservation = async () => {
  const res = await getDemoReservationApi()
  demoReservation.value = res.data
}

/* 발신번호 */
const loadSenderPhones = async () => {
  const res = await getMessageSenderPhoneListApi()
  senderPhones.value = res.data || []
}

const createSenderPhone = async () => {
  if (!newPhone.value.phoneNumber) return
  await createMessageSenderPhoneApi(newPhone.value)
  newPhone.value = { phoneNumber: '', label: '' }
  await loadSenderPhones()
}

/* 여정 */
const loadStages = async () => {
  const res = await getMessageJourneyStagesApi()
  stages.value = res.data.data || []
}

/* 문자 발송 */
const sendStage = async (stage) => {
  if (!canSend.value) return

  await sendDemoSmsApi({
    reservationCode: demoReservation.value.reservationCode,
    stageCode: stage.stageCode,
    senderPhoneCode: selectedSenderPhoneCode.value,
    toPhone: toPhone.value,
  })

  alert(`${stage.stageNameKor} 문자 발송 완료`)
}

/* 생명주기 */
onMounted(async () => {
  await loadSenderPhones()
  await loadStages()
  await loadDemoReservation()
})
</script>

<style scoped>
.sender-phone-setting {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header .title {
  font-size: 18px;
  font-weight: 700;
}

.page-header .desc {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #fff;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  gap: 8px;
}

.phone-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.info .number {
  font-weight: 600;
}

.info .label {
  font-size: 12px;
  color: #6b7280;
}

.stage-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.phone-input {
  margin-left: 8px;
  padding: 4px 6px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.hint {
  font-size: 12px;
  color: #ef4444;
}
</style>
