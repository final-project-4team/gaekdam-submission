<template>
  <aside class="side">
    <div class="hotel">
      <strong>{{ hotelName }}</strong>
    </div>

    <nav class="menu-list">
      <div
          v-for="item in menus"
          :key="item.path"
          class="menu"
          :class="{ active: isActive(item.path) }"
          @click="go(item.path)"
      >
        {{ item.label }}
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from "@/stores/authStore";
import {computed} from "vue";
const router = useRouter()
const route = useRoute()


const authStore = useAuthStore();

const hotelName = computed(() => {
  return authStore.hotel?.hotelGroupName || "Hotel";
});

const menus = computed(() => {
  // 기본 메뉴 (항상 보임)
  const list = [
  ];
  const reportPermission=[
   'REPORT_LAYOUT_LIST'
  ]
  if(reportPermission.some(p=>authStore.hasPermission(p))){
    list.push({label:'리포트',path:'/reports'})
  }
  const customerPermission=[
      'CUSTOMER_LIST',
    'CUSTOMER_DETAIL'
  ]
  if(customerPermission.some(p=>authStore.hasPermission(p))){
    list.push({label:'고객 관리',path:'/customers'})
  }
  const activitiesPermission = [
      'RESERVATION_LIST',
    'TODAY_RESERVATION_LIST',
    'TODAY_FACILITY_USAGE_LIST',
    'CUSTOMER_TIMELINE_READ'
  ]
  if(activitiesPermission.some(p=>authStore.hasPermission(p))){
    list.push({label:'고객 활동',path:'/activities'})
  }
  const vocPermission=[
    'INQUIRY_LIST',
    'INCIDENT_LIST'
  ];
  if(vocPermission.some(p=>authStore.hasPermission(p))){
   list.push({label:'고객의소리',path:'/voc'})
  }
  const messagePermissions = [
    'MESSAGE_LIST'
  ];
  if (messagePermissions.some(p => authStore.hasPermission(p))) {
    list.push({ label: '메시지', path: '/messages' });
  }
  // list.push({ label: '마이페이지', path: '/myPage' });

  //  세팅 메뉴 권한 그룹 ( 하나라도 만족하면 표시)
  const settingPermissions = [
    'EMPLOYEE_LIST',
    'SETTING_OBJECTIVE_LIST',
    'PERMISSION_LIST',
    'MEMBERSHIP_POLICY_LIST',
    'LOYALTY_POLICY_LIST'
  ];
  // hasPermission이 단일 문자열에 대해 true 반환하는지 확인하여 검사
  if (settingPermissions.some(p => authStore.hasPermission(p))) {
    list.push({ label: '세팅', path: '/setting' });
  }
  // 시스템 설정 메뉴 권한 그룹 (하나라도 만족하면 표시)
  const systemPermissions = [
    'LOG_LOGIN_LIST',
    'LOG_AUDIT_LIST',
    'LOG_PERMISSION_CHANGED_LIST',
    'LOG_PERSONAL_INFORMATION_LIST'
  ];
  if (systemPermissions.some(p => authStore.hasPermission(p))) {
    list.push({ label: '시스템 로그', path: '/system' });
  }
  return list;
});

const go = (path) => router.push(path)
const isActive = (path) => route.path.startsWith(path)
</script>

<style scoped>
.side {
  width: 220px;
  background: #ffffff;
  border-right: 1px solid #eef2f7;
  height: 100%;
  padding: 12px 0 0 0;
}

.hotel {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #eef2f7;
  font-size: 15px;
}

/* 메뉴 리스트 */
.menu-list {
  padding: 12px 10px;
}

/* 메뉴 아이템 */
.menu {
  position: relative;
  padding: 11px 14px;
  margin-bottom: 6px;
  border-radius: 10px;
  cursor: pointer;
  color: #475569;
  font-size: 14px;
  transition: all 0.15s ease;
}

/* hover */
.menu:hover {
  background: #f8fafc;
}

/* active */
.menu.active {
  background: #f1f5ff;
  color: #7191e6;
  font-weight: 600;
}

/* 왼쪽 포인트 바 */
.menu.active::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 70%;
  border-radius: 4px;
  background: linear-gradient(
      to bottom,
      #60a5fa,
      #2563eb
  );
}
</style>
