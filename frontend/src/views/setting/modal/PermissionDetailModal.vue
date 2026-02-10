
<template>
  <BaseModal
    :title="isCreate ? '권한 등록' : '권한 상세 정보'" 
    @close="close"
    width="900px" 
  >
    <div class="permission-detail">
      <!-- 상단: 권한 이름 입력 -->
      <div class="header-section" >
        <label>권한 이름</label>
        <input 
          v-model="form.permissionName" 
          placeholder="권한 이름을 입력하세요 (예: 관리자)" 
          class="name-input"
          :readonly="!isCreate"
          :class="{ 'read-only': !isCreate }"
        />
      </div>

      <!-- 본문: 권한 매트릭스 -->
      <div class="matrix-container">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="th-resource">리소스</th>
              <th v-for="(label, key) in ACTION_MAP" :key="key">{{ key }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(resource, label) in MENU_MAP" :key="resource">
              <td class="td-resource">{{ label }}</td>
              <td v-for="(actionCode, actionLabel) in ACTION_MAP" :key="actionLabel + resource" class="td-check">
                <input 
                  type="checkbox"
                  :checked="isChecked(resource, actionCode)"
                  :disabled="isDisabled(resource, actionCode)"
                  @change="togglePermission(resource, actionCode)"
                  class="matrix-checkbox"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>


    <template #footer>
      <div class="footer-buttons">
        <BaseButton type="ghost" @click="close">취소</BaseButton>
        <BaseButton type="primary" @click="save">저장</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import { createPermission, updatePermission } from '@/api/setting/permissionApi.js'

const props = defineProps({
  permission: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'refresh'])

const isCreate = computed(() => !props.permission)

const form = ref({
  permissionName: '',
  permissionTypeKeys: [] // EMPLOYEE_READ", "EMPLOYEE_UPDATE",
})

// 순서는 화면에 보여질 순서대로 정의 (객체 순서는 보장되지 않으므로 필요시 배열로 관리 가능하나, 여기선 단순화)
const MENU_MAP = {
  // 보고서(리포트)
  '보고서(레이아웃)': 'REPORT_LAYOUT',
  '보고서(레이아웃 템플릿)': 'REPORT_LAYOUT_TEMPLATE',
  '보고서(템플릿 라이브러리)': 'REPORT_LAYOUT_TEMPLATE_LIBRARY',

  // 기본
  '직원': 'EMPLOYEE',
  '고객': 'CUSTOMER',
  '고객 메모': 'CUSTOMER_MEMO',
  '회원':'MEMBER',
  '멤버십 정책': 'MEMBERSHIP_POLICY',
  '로열티 정책': 'LOYALTY_POLICY',

  // 고객 활동/예약/체크인아웃/시설
  '고객 타임라인': 'CUSTOMER_TIMELINE',
  '예약': 'RESERVATION',
  '당일 예약': 'TODAY_RESERVATION',
  '체크인': 'CHECK_IN',
  '체크아웃': 'CHECK_OUT',
  '당일 시설 이용': 'TODAY_FACILITY_USAGE',

  // 운영
  '문의': 'INQUIRY',
  '사건사고': 'INCIDENT',
  '메시지': 'MESSAGE',
  '권한 관리': 'PERMISSION',

  // (선택) 로그/세팅 메뉴를 UI에 둘 거면 추가
  '로그인 로그': 'LOG_LOGIN',
  '활동 로그': 'LOG_AUDIT',
  '권한 변경 로그': 'LOG_PERMISSION_CHANGED',
  '개인 정보 조회 로그': 'LOG_PERSONAL_INFORMATION',
  '목표 관리': 'SETTING_OBJECTIVE',
};


const ACTION_MAP = {
    '생성': 'CREATE',
    '수정': 'UPDATE',
    '삭제': 'DELETE',
    '리스트조회': 'LIST',
    '상세조회': 'READ'
}


const PERMISSION_ENUM_ORDER = [
  // 리포트 (REPORT)
  'REPORT_LAYOUT_CREATE',
  'REPORT_LAYOUT_LIST',
  'REPORT_LAYOUT_READ',
  'REPORT_LAYOUT_UPDATE',
  'REPORT_LAYOUT_DELETE',
  'REPORT_LAYOUT_TEMPLATE_CREATE',
  'REPORT_LAYOUT_TEMPLATE_LIST',
  'REPORT_LAYOUT_TEMPLATE_READ',
  'REPORT_LAYOUT_TEMPLATE_UPDATE',
  'REPORT_LAYOUT_TEMPLATE_DELETE',
  'REPORT_LAYOUT_TEMPLATE_LIBRARY_LIST',

  // 회원 (MEMBER)
  'MEMBER_LIST',

  // 직원 (EMPLOYEE)
  'EMPLOYEE_LIST',
  'EMPLOYEE_READ',
  'EMPLOYEE_CREATE',
  'EMPLOYEE_UPDATE',
  'EMPLOYEE_DELETE',

  // 고객 (CUSTOMER)
  'CUSTOMER_READ',
  'CUSTOMER_LIST',
  'CUSTOMER_UPDATE',
  'CUSTOMER_DELETE',

  // 고객 메모 (CUSTOMER_MEMO)
  'CUSTOMER_MEMO_CREATE',
  'CUSTOMER_MEMO_LIST',
  'CUSTOMER_MEMO_READ',
  'CUSTOMER_MEMO_UPDATE',
  'CUSTOMER_MEMO_DELETE',

  // 멤버십 기준 (MEMBERSHIP_POLICY)
  'MEMBERSHIP_POLICY_LIST',
  'MEMBERSHIP_POLICY_READ',
  'MEMBERSHIP_POLICY_CREATE',
  'MEMBERSHIP_POLICY_UPDATE',
  'MEMBERSHIP_POLICY_DELETE',

  // 로열티 기준 (LOYALTY_POLICY)
  'LOYALTY_POLICY_LIST',
  'LOYALTY_POLICY_READ',
  'LOYALTY_POLICY_CREATE',
  'LOYALTY_POLICY_UPDATE',
  'LOYALTY_POLICY_DELETE',

  // 고객 활동 및 타임라인
  'CUSTOMER_TIMELINE_READ',
  'RESERVATION_LIST',
  'RESERVATION_READ',
  'TODAY_RESERVATION_LIST',
  'TODAY_RESERVATION_READ',
  'CHECK_IN_CREATE',
  'CHECK_OUT_CREATE',
  'TODAY_FACILITY_USAGE_LIST',
  'TODAY_FACILITY_USAGE_READ',

  // 문의 (INQUIRY)
  'INQUIRY_LIST',
  'INQUIRY_READ',

  // 사건사고 (INCIDENT)
  'INCIDENT_CREATE',
  'INCIDENT_LIST',
  'INCIDENT_READ',
  'INCIDENT_DELETE',
  'INCIDENT_ACTION_CREATE',
  'INCIDENT_ACTION_READ',

  // 메시지 (MESSAGE)
  'MESSAGE_CREATE',
  'MESSAGE_LIST',
  'MESSAGE_READ',
  'MESSAGE_UPDATE',
  'MESSAGE_DELETE',

  // 로그
  'LOG_LOGIN_LIST',
  'LOG_LOGIN_READ',
  'LOG_AUDIT_LIST',
  'LOG_AUDIT_READ',
  'LOG_PERMISSION_CHANGED_LIST',
  'LOG_PERSONAL_INFORMATION_LIST',
  'LOG_PERSONAL_INFORMATION_READ',

  // 권한
  'PERMISSION_CREATE',
  'PERMISSION_LIST',
  'PERMISSION_UPDATE',
  'PERMISSION_DELETE',

  // 세팅 - 목표관리
  'SETTING_OBJECTIVE_CREATE',
  'SETTING_OBJECTIVE_LIST',
  'SETTING_OBJECTIVE_UPDATE',
  'SETTING_OBJECTIVE_DELETE',

  // 부서/직급
  'DEPARTMENT_LIST',
  'HOTEL_POSITION_LIST',

  // 사건사고 (INCIDENT) - 수정 (ID 매핑 유지를 위해 맨 뒤에 추가)
  'INCIDENT_UPDATE',
];

const DISABLED_UI_PERMISSIONS = [
  'REPORT_LAYOUT_READ', 'REPORT_LAYOUT_UPDATE',
  'REPORT_LAYOUT_TEMPLATE_LIST', 'REPORT_LAYOUT_TEMPLATE_UPDATE',
  'REPORT_LAYOUT_TEMPLATE_LIBRARY_LIST',
  'MEMBER_LIST',
  'CUSTOMER_DELETE',
  'CUSTOMER_MEMO_CREATE', 'CUSTOMER_MEMO_LIST', 'CUSTOMER_MEMO_READ', 'CUSTOMER_MEMO_UPDATE', 'CUSTOMER_MEMO_DELETE',
  'INCIDENT_DELETE',
  'MESSAGE_CREATE', 'MESSAGE_DELETE',
  'LOG_LOGIN_READ',
  'LOG_PERSONAL_INFORMATION_READ',
  'SETTING_OBJECTIVE_CREATE', 'SETTING_OBJECTIVE_DELETE',
  'INCIDENT_UPDATE'
];


// === Initialization ===
onMounted(() => {
  if (props.permission) {
    form.value.permissionName = props.permission.permissionName
    // props.permission.permissionTypes는 [{permissionTypeKey: '...'}, ...] 형태라고 가정 (SettingPermission.vue 참조)
    if (props.permission.permissionTypes) {
      form.value.permissionTypeKeys = props.permission.permissionTypes.map(pt => pt.permissionTypeKey)
    }
  }
})

// === Logic ===
const isValidPermission = (key) => {
  return PERMISSION_ENUM_ORDER.includes(key)
}

const isChecked = (resource, actionCode) => {
  const key = `${resource}_${actionCode}`
  // 비활성화 목록에 있으면 체크 안 된 것으로 표시
  if (DISABLED_UI_PERMISSIONS.includes(key)) return false
  return form.value.permissionTypeKeys.includes(key)
}

const isDisabled = (resource, actionCode) => {
  const key = `${resource}_${actionCode}`
  // 비활성화 목록에 있거나 유효하지 않은 키면 disabled
  return DISABLED_UI_PERMISSIONS.includes(key) || !isValidPermission(key)
}

const togglePermission = (resource, actionCode) => {
  const key = `${resource}_${actionCode}`
  if (!isValidPermission(key)) return // 유효하지 않은 키는 토글 불가
  if (DISABLED_UI_PERMISSIONS.includes(key)) return // UI 비활성화 키는 토글 불가

  const idx = form.value.permissionTypeKeys.indexOf(key)
  if (idx > -1) {
    form.value.permissionTypeKeys.splice(idx, 1)
  } else {
    form.value.permissionTypeKeys.push(key)
  }
}

const close = () => {
  emit('close')
}

const save = async () => {
  if (!form.value.permissionName.trim()) {
    alert('권한 이름을 입력해주세요.')
    return
  }

  try {
    // 백엔드는 Integer List (ENUM Index + 1)를 기대함 (SettingPermission.vue 기반)
    const permissionTypeList = form.value.permissionTypeKeys
      .map(key => PERMISSION_ENUM_ORDER.indexOf(key) + 1)
      .filter(id => id > 0)

    const payload = {
        permissionName: form.value.permissionName, // create 시 필요
        // , update 시에는? SettingPermission에서는 update 시 payload에 permissionTypeList만 넣었음.
        // 하지만 이름 수정도 가능해야 하므로 확인 필요.
        // SettingPermission.vue의 savePermission을 보면 updatePermission(code, { permissionTypeList }) 만 보냄.
        // 이름 수정이 가능한지 확인해야 함. 일단 이름도 같이 보내본다.
        permissionTypeList 
    }
    
    // 만약 update api가 이름을 안 받으면, 별도 이름 수정 API가 있거나 현재 수정 불가일 수 있음.
    // 기존 코드 SettingPermission.vue:354 `await updatePermission(row.permissionCode, { permissionTypeList })`
    // 이름 수정 로직이 없어보임. 하지만 요구사항은 "권한 상세 모달"이므로 이름 수정도 기대할 것임.
    // 일단 payload에 포함해서 보내고, Backend가 무시하면 어쩔 수 없음. (createPermission은 당연히 이름 필요)

    if (isCreate.value) {
      await createPermission({
        permissionName: form.value.permissionName,
        permissionTypeList
      })
      alert('권한이 생성되었습니다.')
    } else {
      // update
      // 백엔드 Update DTO가 permissionName을 받지 못해 500 에러 발생 추정.
      // permissionTypeList만 담아서 전송.
      await updatePermission(props.permission.permissionCode, {
         permissionTypeList
      })
      alert('권한이 수정되었습니다.')
    }

    emit('refresh')
    close()
  } catch(e) {
    //console.error(e)
    const errorMsg = e.response?.data?.message || e.message || '요청 처리에 실패했습니다.';
    alert(` ${errorMsg}`);
  }
}
</script>

<style scoped>
.permission-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px 0;
}

.header-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-section label {
  font-weight: 600;
  font-size: 14px;
  color: #374151;
}

.name-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  width: 300px;
}

.name-input.read-only {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
  border-color: #e5e7eb;
}

.matrix-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  max-height: 60vh;
  overflow-y: auto;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.matrix-table th, .matrix-table td {
  border: 1px solid #e5e7eb;
  padding: 10px;
  text-align: center;
  vertical-align: middle;
}

.matrix-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #111827;
}

.th-resource {
  width: 120px;
  background: #f3f4f6;
}

.td-resource {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  text-align: left;
  padding-left: 16px;
}

.td-check {
  background: white;
}

.matrix-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #2563eb;
}

.footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
