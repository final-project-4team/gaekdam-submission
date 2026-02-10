<template>
  <BaseModal :title="isCreate ? '직원 등록' : `직원 상세 정보 (${localEmployee?.employeeName || '-'})`" @close="close">
    <div class="detail-container">
      <!-- 1행: 성명 / 아이디 -->
      <div class="row">
        <div class="col">
          <label>성명</label>
          <input 
            type="text" 
            v-model="form.employeeName" 
            :readonly="!isCreate" 
            :class="{ 'read-only': !isCreate }" 
          />
        </div>
        <div class="col">
          <label>아이디</label>
          <input 
            type="text" 
            v-model="form.loginId" 
            :readonly="!isCreate" 
            :class="{ 'read-only': !isCreate }" 
          />
        </div>
      </div>

      <!-- 2행: 사원번호 / 입사일자 -->
      <div class="row">
        <div class="col">
          <label>사원번호</label>
          <input 
            type="text" 
            v-model="form.employeeNumber" 
            :readonly="!isCreate" 
            :class="{ 'read-only': !isCreate }" 
          />
        </div>
        <div class="col">
          <label>입사일자</label>
          <!-- Create mode: Input (YYYY-MM-DD), Edit mode: Read-only formatted -->
          <input 
            v-if="isCreate"
            type="date" 
            v-model="form.hiredAt" 
          />
          <input 
            v-else
            type="text" 
            :value="formatDate(localEmployee.hiredAt)" 
            readonly 
            class="read-only" 
          />
        </div>
      </div>

      <!-- 3행: 부서 / 직급 -->
      <div class="row">
        <div class="col">
          <label>부서(Code)</label>
          <select v-model="form.departmentId">
             <option :value="null">선택</option>
             <option v-for="dept in departmentList" :key="dept.departmentCode" :value="Number(dept.departmentCode)">
               {{ dept.departmentName }}
             </option>
          </select>
        </div>
        <div class="col">
          <label>직급(Code)</label>
            <select v-model="form.hotelPositionId">
             <option :value="null">선택</option>
             <option v-for="pos in filteredHotelPositionList" :key="pos.hotelPositionCode" :value="Number(pos.hotelPositionCode)">
               {{ pos.hotelPositionName }}
             </option>
          </select>
        </div>
      </div>

      <!-- 4행: 권한 / 전화번호 -->
      <div class="row">
        <div class="col">
          <label>권한</label>
           <select v-model="form.permissionId">
             <option :value="null">선택</option>
             <option v-for="perm in permissionList" :key="perm.permissionCode" :value="Number(perm.permissionCode)">
               {{ perm.permissionName }}
             </option>
          </select>
        </div>
        <div class="col">
          <label>전화번호</label>
          <div class="phone-input-group">
            <input 
              id="phonePart1"
              type="text" 
              :value="phonePart1"
              @input="onPhonePartInput($event, 1)"
              maxlength="3"
              class="phone-part"
            />
            <span class="dash">-</span>
            <input 
              id="phonePart2"
              type="text" 
              :value="phonePart2"
              @input="onPhonePartInput($event, 2)"
              maxlength="4"
              class="phone-part"
            />
            <span class="dash">-</span>
            <input 
              id="phonePart3"
              type="text" 
              :value="phonePart3" 
              @input="onPhonePartInput($event, 3)"
              maxlength="4"
              class="phone-part"
            />
          </div>
        </div>
      </div>

      <!-- 5행: 이메일 (Full Width) -->
      <div class="row">
        <div class="col full-width">
          <label>이메일</label>
          <input type="text" v-model="form.email" />
        </div>
      </div>

      <!-- 6행: 사용자 상태 (Button) - Only in Edit Mode -->
      <div class="row" v-if="!isCreate">
        <div class="col full-width status-col">
          <label>사용자 상태</label>
          <div class="status-content">
            <span :class="statusClass(localEmployee.employeeStatus)">{{ localEmployee.employeeStatus }}</span>
            
            <BaseButton 
              v-if="localEmployee.employeeStatus === 'ACTIVE'" 
              type="danger" 
              size="small"
              @click="toggleStatus('LOCKED')"
            >
              사용자 비활성화
            </BaseButton>

            <BaseButton 
              v-else
              type="primary" 
              size="small" 
              @click="toggleStatus('ACTIVE')"
            >
              사용자 활성화
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <BaseButton type="ghost" @click="close">취소</BaseButton>
      <BaseButton type="primary" @click="save">
        {{ isCreate ? '직원 등록' : '사원 정보 수정' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import {
  getEmployeeDetail,
  updateEmployee,
  updateEmployeeStatus,
  createEmployee,
  unlockEmployee,
  getDepartmentList,
  getHotelPositionList,
  inactiveEmployee
} from '@/api/setting/employeeApi.js'
import {getPermissionNameList} from "@/api/setting/permissionApi.js";



const props = defineProps({
  employeeCode: {
    type: [String, Number],
    required: false,
    default: null
  },
  reason: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'refresh'])

const localEmployee = ref({})
// Form Data
const form = ref({
  employeeName: '',
  loginId: '',
  employeeNumber: '',
  hiredAt: '',
  departmentId: null,
  hotelPositionId: null,
  permissionId: null,
  permissionName: '',
  phoneNumber: '',
  email: '',
})

const permissionList = ref([])
// 직급 목록 상태
const allHotelPositionList = ref([])

// 부서 선택에 따른 직급 필터링
const filteredHotelPositionList = computed(() => {
    if (!form.value.departmentId) return allHotelPositionList.value
    return allHotelPositionList.value.filter(pos => pos.departmentCode === form.value.departmentId)
})

const isCreate = computed(() => !props.employeeCode)

// 날짜 포맷팅
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return dateStr.substring(0, 10)
}

const statusClass = (status) => {
  if (status === 'ACTIVE') return 'text-green'
  if (status === 'LOCKED') return 'text-red'
  return 'text-gray'
}

// 상세 정보 조회
const fetchDetail = async () => {
  // 생성 모드면 초기화 후 리턴
  if (isCreate.value) {
    localEmployee.value = {}
    form.value = {
        employeeName: '',
        loginId: '', 
        employeeNumber: '',
        hiredAt: new Date().toISOString().substring(0,10), // 오늘 날짜 기본
        departmentId: null,
        hotelPositionId: null,
        permissionId: null,
        permissionName: '', 
        phoneNumber: '',
        email: ''
    }
    return
  }

  try {
    const detail = await getEmployeeDetail(props.employeeCode, props.reason)
    localEmployee.value = detail
    
    // Form 초기화
    form.value = {
        employeeName: detail.employeeName,
        loginId: detail.loginId,
        employeeNumber: detail.employeeNumber,
        hiredAt: detail.hiredAt,
        departmentId: detail.departmentCode ? Number(detail.departmentCode) : null,
        hotelPositionId: detail.hotelPositionCode ? Number(detail.hotelPositionCode) : null,
        permissionId: detail.permissionCode ? Number(detail.permissionCode) : null,
        permissionName: detail.permissionName,
        phoneNumber: detail.phoneNumber,
        email: detail.email
    }
    setPhoneParts(detail.phoneNumber) // 전화번호 분리 할당
  } catch (e) {
    console.error("상세 정보 조회 실패", e)
    alert("직원 정보를 불러오는데 실패했습니다.")
    close()
  }
}

// 전화번호 분리 입력을 위한 상태
const phonePart1 = ref('010') // 기본값 010
const phonePart2 = ref('')
const phonePart3 = ref('')

// 상세 조회 시 전화번호 분리
const setPhoneParts = (fullNumber) => {
    if (!fullNumber) {
        phonePart1.value = '010'
        phonePart2.value = ''
        phonePart3.value = ''
        return
    }
    const parts = fullNumber.split('-')
    if (parts.length === 3) {
        phonePart1.value = parts[0]
        phonePart2.value = parts[1]
        phonePart3.value = parts[2]
    } else {
        // 형식이 다를 경우 최대한 맞춰봄 (단순 파싱)
        // 기존 데이터가 01012345678 형식이면 분리 등 처리 가능하나, 
        // 현재는 표준 포맷(000-0000-0000)을 따른다고 가정
        phonePart1.value = '010'
        phonePart2.value = ''
        phonePart3.value = ''
    }
}

// 입력 시 자동 포커스 이동 (편의성)
const onPhonePartInput = (e, partIndex) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    
    if (partIndex === 1) {
        phonePart1.value = val.substring(0, 3)
        if (val.length >= 3) {
             document.getElementById('phonePart2')?.focus()
        }
    } else if (partIndex === 2) {
        phonePart2.value = val.substring(0, 4)
        if (val.length >= 4) {
             document.getElementById('phonePart3')?.focus()
        }
    } else if (partIndex === 3) {
        phonePart3.value = val.substring(0, 4)
    }
}


const saving = ref(false)

const isValidPhone = (phone) => {
  const regex = /^\d{3}-\d{4}-\d{4}$/;
  return regex.test(phone);
}

// 저장 (생성/수정 분기)
const save = async () => {
    //  중복 클릭 방지
    if (saving.value) return;

    // 전화번호 합치기
    const combinedPhone = `${phonePart1.value}-${phonePart2.value}-${phonePart3.value}`
    form.value.phoneNumber = combinedPhone

    // 유효성 검사
    if (!isValidPhone(combinedPhone)) {
        alert('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
        return;
    }

    //  즉시 잠금
    saving.value = true;

    try {
      const modeName = isCreate.value ? "등록" : "수정"
      if(!confirm(`직원을 ${modeName}하시겠습니까?`)) return;

      if (isCreate.value) {
            // Payload Mapping
            const payload = {
                employeeNumber: Number(form.value.employeeNumber),
                loginId: form.value.loginId,
                password: "password123", // Default password
                email: form.value.email,
                phoneNumber: form.value.phoneNumber,
                name: form.value.employeeName,
                departmentCode: Number(form.value.departmentId),
                positionCode: Number(form.value.hotelPositionId),
                propertyCode: 1, // Default
                hotelGroupCode: 1, // Default
                permissionCode: Number(form.value.permissionId)
            }
            await createEmployee(payload)
        } else {
            const payload = {

                employeeNumber: Number(form.value.employeeNumber), // 수정 불가라면 제외해도 되지만, 일단 포함
                email: form.value.email,
                phoneNumber: form.value.phoneNumber,
                name: form.value.employeeName,
                departmentCode: Number(form.value.departmentId),
                positionCode: Number(form.value.hotelPositionId),
                permissionCode: Number(form.value.permissionId)
            }
            await updateEmployee(props.employeeCode, payload)
        }
        
        alert(`${modeName}되었습니다.`)
        emit('refresh')
        close()
    } catch(e) {
      console.error(e)
    //  const errorCode = e.response?.data?.code || 'UNKNOWN';
      const errorMsg = e.response?.data?.message || e.message || '요청 처리에 실패했습니다.';
      alert(` ${errorMsg}`);
    } finally {

        saving.value = false;
    }
}

// 상태 변경
const toggleStatus = async (targetStatus) => {
    if(!confirm(targetStatus === 'LOCKED' ? "사용자를 비활성화하시겠습니까?" : "사용자를 활성화 하시겠습니까?")) return;
    try {
        if (targetStatus === 'ACTIVE') {
            await unlockEmployee(props.employeeCode)
        } else {
            await inactiveEmployee(props.employeeCode)
        }
        await fetchDetail() 
    } catch(e) {
        console.error(e)
        alert("상태 변경 실패")
    }
}

const close = () => emit('close')

// 부서 목록 상태
const departmentList = ref([])

onMounted(async () => {
    try {
        const perms = await getPermissionNameList()
        permissionList.value = perms
    } catch (e) {
        console.error("권한 목록 조회 실패", e)
    }

    try {
        const depts = await getDepartmentList()
        departmentList.value = depts
    } catch (e) {
      console.error("부서 목록 조회 실패", e)
    }

    try {
        const positions = await getHotelPositionList()
        allHotelPositionList.value = positions
    } catch (e) {
        console.error("직급 목록 조회 실패", e)
    }

    await fetchDetail()
})
</script>

<style scoped>
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 24px; /* Increased from 16px to match MyPage */
  padding: 10px 0;
}

.row {
  display: flex;
  gap: 24px; /* Increased from 16px to give more breadth */
}

.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.col.full-width {
  flex: none;
  width: 100%;
}

label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

input, select {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

input.read-only {
  background-color: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.phone-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.phone-part {
  width: 100%;
  text-align: center;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.dash {
  font-weight: 600;
  color: #6b7280;
}

.text-green { color: #10b981; font-weight: 600; }
.text-red { color: #ef4444; font-weight: 600; }
.text-gray { color: #6b7280; font-weight: 600; }
</style>
