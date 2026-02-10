import {createRouter, createWebHistory} from 'vue-router'
import {useAuthStore} from '@/stores/authStore'
import {useToastStore} from '@/stores/toastStore'

import CrmLayout from '@/layouts/CrmLayout.vue'
import ActivityLayout from '@/views/activity/view/ActivityLayout.vue'
import ReportLayout from '@/views/report/ReportLayout.vue'
import CustomerLayout from '@/views/customer/view/CustomerLayout.vue'
import MessageLayout from '@/views/message/MessageLayout.vue'
import SettingLayout from '@/views/setting/SettingLayout.vue'
import SystemLayout from '@/views/system/SystemLayout.vue'
import VocLayout from '@/views/voc/VocLayout.vue'
import TestView from '@/views/TestView.vue'
import LoginView from '@/views/auth/LoginView.vue'
import HealthTest from "@/views/HealthTest.vue";
import myPageLayout from "@/views/myPage/myPageLayout.vue";
import AccessDenied from "@/views/AccessDenied.vue";

const routes = [

    {
        path: "/health-test",
        name: "HealthTest",
        component: HealthTest,
    },
    {
        path: "/access-denied",
        name: "AccessDenied",
        component: AccessDenied,
    },
    {
        path: '/login',
        component: LoginView,
        meta: {public: true}, // 인증 예외
    },

  {
    path: '/',
    component: CrmLayout,
    children: [


      {
        path: ''
      },
      {
        path: 'reports',
        component: ReportLayout,
        children: [
          {
            path: '',
            component: () => import('@/views/report/ReportLayoutView.vue'),
            meta: { permission: 'REPORT_LAYOUT_LIST' },//인증 권한 설정
          },
        ]
      },

            {
                path: 'customers',
                component: CustomerLayout,
                redirect: () => {
                    const authStore = useAuthStore()
                    // 권한 목록 순차 확인 후 접근 가능한 첫 번째 메뉴로 이동
                    if (authStore.hasPermission('CUSTOMER_LIST')) {
                        return '/customers/all'
                    }

                    return '/customers/id'
                },
                children: [
                    //  {path: '', redirect: '/customers/all'},
                    {
                        path: 'all',
                        name: 'CustomerList',
                        component: () => import('@/views/customer/view/CustomerListView.vue'),
                        meta: {permission: 'CUSTOMER_LIST'}
                    },

                    {
                        path: ':id',
                        name: 'CustomerDetail',
                        component: () => import('@/views/customer/view/CustomerDetailView.vue'),
                        meta: {permission: ['CUSTOMER_READ', 'CUSTOMER_LIST']}
                    },
                ],
            },

            {
                path: 'voc',
                component: VocLayout,
                redirect: to => {
                    const authStore = useAuthStore()
                    // 권한 목록 순차 확인 후 접근 가능한 첫 번째 메뉴로 이동
                    if (authStore.hasPermission('INQUIRY_LIST')) {
                        return '/voc/inquiries'
                    }
                    return '/voc/incidents'
                },
                children: [
                    // {path: '', redirect: '/voc/inquiries'},
                    {
                        path: 'inquiries',
                        name: 'InquiryList',
                        component: () => import('@/views/voc/inquiry/view/InquiryListView.vue'),
                        meta: {permission: 'INQUIRY_LIST'}
                    },
                    {
                        path: 'incidents',
                        name: 'IncidentList',
                        component: () => import('@/views/voc/incident/view/IncidentListView.vue'),
                        meta: {permission: 'INCIDENT_LIST'}
                    },
                ]
            },

            {
                path: 'activities',
                component: ActivityLayout,
                redirect: to => {
                    const authStore = useAuthStore()
                    // 권한 목록 순차 확인 후 접근 가능한 첫 번째 메뉴로 이동
                    if (authStore.hasPermission('RESERVATION_LIST')) {
                        return '/activities/all'
                    }
                    if (authStore.hasPermission(
                        'TODAY_RESERVATION_LIST')) {
                        return '/activities/check'
                    }
                    if (authStore.hasPermission(
                        'TODAY_FACILITY_USAGE_LIST')) {
                        return '/activities/facility'
                    }
                    {
                        return '/activities/timeline'
                    }
                },
                children: [
                    {
                        path: 'all',
                        component: () => import('@/views/activity/view/ActivityAllView.vue'),
                        meta: {permission: 'RESERVATION_LIST'}
                    },
                    {
                        path: 'check',
                        component: () => import('@/views/activity/view/ActivityCheckView.vue'),
                        meta: {permission: 'TODAY_RESERVATION_LIST'}
                    },
                    {
                        path: 'facility',
                        component: () => import('@/views/activity/view/ActivityFacilityView.vue'),
                        meta: {permission: 'TODAY_FACILITY_USAGE_LIST'}
                    },
                    {
                        path: 'timeline',
                        component: () => import('@/views/activity/view/ActivityTimelineView.vue'),
                        meta: {permission: 'CUSTOMER_TIMELINE_READ'}
                    },
                ],
            },

            {
                path: 'messages',
                component: MessageLayout,
                redirect: to => {
                    const authStore = useAuthStore()

                    if (authStore.hasPermission('MESSAGE_LIST')) {
                        return '/messages/templates'
                    }
                    return '/messages/histories'
                },
                children: [
                    {
                        path: 'templates',
                        component: () => import('@/views/message/MessageTemplateSettingView.vue'),
                        meta: {permission: 'MESSAGE_LIST'}
                    },
                    {
                        path: 'histories',
                        component: () => import('@/views/message/MessageHistoryView.vue'),
                        meta: {permission: 'MESSAGE_LIST'}

                    },
                    {
                        path: 'sender-phones',
                        component: () => import('@/views/message/MessageSenderPhoneSetting.vue'),
                        meta: {permission: 'MESSAGE_LIST'}

                    }
                ]
            },

            {
                path: 'setting',
                component: SettingLayout,
                redirect: to => {
                    const authStore = useAuthStore()

                    // 권한 목록 순차 확인 후 접근 가능한 첫 번째 메뉴로 이동
                    if (authStore.hasPermission(
                        'EMPLOYEE_LIST')) {
                        return '/setting/employee'
                    }
                    //OBJECTIVE_LIST대신 권한 명 다른걸로 대체 필요
                    if (authStore.hasPermission(
                        'SETTING_OBJECTIVE_LIST')) {
                        return '/setting/objective'
                    }
                    if (authStore.hasPermission(
                        'PERMISSION_LIST')) {
                        return '/setting/permission'
                    }
                    if (authStore.hasPermission(
                        'MEMBERSHIP_POLICY_LIST')) {
                        return '/setting/membership'
                    }
                    if (authStore.hasPermission(
                        'LOYALTY_POLICY_LIST')) {
                        return '/setting/loyalty'
                    }

                    // 모든 권한이 없을 경우 (접근 차단 또는 기본 페이지)
                    // 현재는 편의상 /setting/employee로 보내서 router guard에서 튕기게 =
                    return '/setting/employee'
                },
                children: [
                    {
                        path: 'employee',
                        component: () => import('@/views/setting/SettingEmployee.vue'),
                        meta: {permission: 'EMPLOYEE_LIST'}
                    },
                    {
                        path: 'objective',
                        component: () => import('@/views/setting/SettingObjective.vue'),
                        meta: {permission: 'SETTING_OBJECTIVE_LIST'}
                    },
                    {
                        path: 'permission',
                        component: () => import('@/views/setting/SettingPermission.vue'),
                        meta: {permission: 'PERMISSION_LIST'}
                    },
                    {
                        path: 'membership',
                        component: () => import('@/views/setting/SettingMembership.vue'),
                        meta: {permission: 'MEMBERSHIP_POLICY_LIST'}
                    },
                    {
                        path: 'loyalty',
                        component: () => import('@/views/setting/SettingLoyalty.vue'),
                        meta: {permission: 'LOYALTY_POLICY_LIST'}
                    },

                ]
            },
            {
                path: 'system',
                component: SystemLayout,

                redirect: to => {
                    const authStore = useAuthStore()

                    // 권한 목록 순차 확인 후 접근 가능한 첫 번째 메뉴로 이동
                    if (authStore.hasPermission('LOG_LOGIN_LIST')) {
                        return '/system/log'
                    }
                    if (authStore.hasPermission(
                        'LOG_AUDIT_LIST')) {
                        return '/system/activity'
                    }
                    if (authStore.hasPermission(
                        'LOG_PERMISSION_CHANGED_LIST')) {
                        return '/system/permission'
                    }
                    if (authStore.hasPermission(
                        'LOG_PERSONAL_INFORMATION_LIST')) {
                        return '/system/privacy'
                    } else return '/myPage'
                },
                children: [
                    {
                        path: 'log',
                        component: () => import('@/views/system/SystemSystemLog.vue'),
                        meta: {permission: 'LOG_LOGIN_LIST'}
                    },
                    {
                        path: 'activity',
                        component: () => import('@/views/system/SystemAuditLog.vue'),
                        meta: {permission: 'LOG_AUDIT_LIST'}
                    },
                    {
                        path: 'permission',
                        component: () => import('@/views/system/SystemPermissionChangedLog.vue'),
                        meta: {permission: 'LOG_PERMISSION_CHANGED_LIST'}
                    },
                    {
                        path: 'privacy',
                        component: () => import('@/views/system/SystemPersonalInformationLog.vue'),
                        meta: {permission: 'LOG_PERSONAL_INFORMATION_LIST'}
                    },
                ]
            },
            {
                path: 'myPage',
                component: myPageLayout,
                children: [
                    {
                        path: '',
                        component: () => import('@/views/myPage/MyPage.vue')
                    }
                ]
            }
        ],
    },
]

// Router instance
const router = createRouter({
    history: createWebHistory(),
    routes,
})

//Auth Guard
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    //  저장소 복원 새로고침 시 복구 로직이 먼저 실행
    // authStore.loadFromStorage()

    // /login 페이지는 누구나 접근 가능
    const publicPages = ['/login'];
    const authRequired = !publicPages.includes(to.path);

    // 로그인하지 않은 상태에서 인증이 필요한 페이지 접근 시
    if (authRequired && !authStore.isLoggedIn) {
        return next({
            path: '/login',
            query: {redirect: to.fullPath},
        })
    }
    //로그인 후 기본 경로로 왔을 때
    if (to.path === '/' && authStore.isLoggedIn) {
        return next(authStore.defaultRouteByPermission());
    }

    // 이미 로그인한 상태에서 로그인 페이지 접근 시 -> 메인으로 이동
    if (to.path === '/login' && authStore.isLoggedIn) {
        return next('/')
    }

    //  권한 체크 (Permission-based Access Control)
    // 라우트 메타데이터(meta.permission)에 필요한 권한이 명시되어 있는지 확인
    const requiredPermission = to.meta.permission;

    if (requiredPermission) {
        console.log(`[Router] Checking Permission: Required=${requiredPermission}`);

        // 해당 권한이 없는 경우
        if (!authStore.hasPermission(requiredPermission)) {
            console.warn(
                `[Router] Access Denied. Missing permission: ${requiredPermission}`);
            const toastStore = useToastStore();
            toastStore.showToast("이 페이지에 접근할 권한이 없습니다.", "error");

            // URL 직접 접근 (새로고침 등 Initial Navigation)인 경우 -> 접근 거부 페이지로 이동
            if (from.matched.length === 0) {
                return next('/access-denied');
            }

            // 내부 링크 클릭 등 앱 내 이동인 경우 -> 이동 취소 (현재 페이지 유지)
            return next(false);
        }
    }

    // 모든 검사 통과 시 페이지 이동 허용
    next()
})

export default router
