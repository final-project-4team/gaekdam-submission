import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingEmployee from "@/views/setting/SettingEmployee.vue";

/** -----------------------------
 *  mocks (외부 의존성 전부 차단)
 *  ----------------------------- */

// permission guard: 그냥 콜백 실행
vi.mock("@/composables/usePermissionGuard", () => ({
    usePermissionGuard: () => ({
        withPermission: (_perm, cb) => cb(),
    }),
}));

// API mocks
const getEmployeeListMock = vi.fn();
const updateEmployeeStatusMock = vi.fn();
const resetEmployeePasswordMock = vi.fn();
const unlockEmployeeMock = vi.fn();
const lockEmployeeMock = vi.fn();

vi.mock("@/api/setting/employeeApi.js", () => ({
    getEmployeeList: (...args) => getEmployeeListMock(...args),
    updateEmployeeStatus: (...args) => updateEmployeeStatusMock(...args),
    resetEmployeePassword: (...args) => resetEmployeePasswordMock(...args),
    unlockEmployee: (...args) => unlockEmployeeMock(...args),
    lockEmployee: (...args) => lockEmployeeMock(...args),
}));

/** -----------------------------
 *  stubs (UI 컴포넌트 단순화)
 *  ----------------------------- */
const ListViewStub = {
    name: "ListView",
    props: [
        "columns",
        "rows",
        "filters",
        "searchTypes",
        "page",
        "pageSize",
        "total",
        "detail",
    ],
    emits: [
        "update:detail",
        "search",
        "filter",
        "sort-change",
        "page-change",
        "row-click",
        "detail-reset",
    ],
    template: `
    <div data-test="listview">
      <div data-test="columns-count">{{ columns?.length ?? 0 }}</div>
      <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>

      <!-- slot -->
      <div data-test="detail-form">
        <slot name="detail-form"></slot>
      </div>

      <div data-test="cell-actions">
        <slot name="cell-actions" :row="rows[0]"></slot>
      </div>

      <!-- test buttons to emit events -->
      <button data-test="emit-search" @click="$emit('search', { key: 'employeeName', value: '홍길동' })">emit-search</button>
      <button data-test="emit-filter" @click="$emit('filter', { employeeStatus: 'ACTIVE' })">emit-filter</button>
      <button data-test="emit-sort" @click="$emit('sort-change', { sortBy: 'employeeNumber', direction: 'asc' })">emit-sort</button>
      <button data-test="emit-page" @click="$emit('page-change', 2)">emit-page</button>
      <button data-test="emit-row-click" @click="$emit('row-click', rows[0])">emit-row-click</button>
      <button data-test="emit-detail-reset" @click="$emit('detail-reset')">emit-detail-reset</button>
    </div>
  `,
};

const BaseButtonStub = {
    name: "BaseButton",
    emits: ["click"],
    template: `<button data-test="basebutton" @click="$emit('click')"><slot/></button>`,
};

const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
    <div data-test="basemodal">
      <div data-test="modal-title">{{ title }}</div>
      <button data-test="modal-close" @click="$emit('close')">close</button>
      <slot></slot>
      <slot name="footer"></slot>
    </div>
  `,
};

const EmployeeDetailModalStub = {
    name: "EmployeeDetailModal",
    props: ["employeeCode", "reason"],
    emits: ["close", "refresh"],
    template: `
    <div data-test="employee-detail-modal">
      <div data-test="employee-code">{{ employeeCode }}</div>
      <div data-test="reason">{{ reason }}</div>
      <button data-test="detail-close" @click="$emit('close')">x</button>
      <button data-test="detail-refresh" @click="$emit('refresh')">refresh</button>
    </div>
  `,
};

const ReasonRequestModalStub = {
    name: "ReasonRequestModal",
    emits: ["close", "confirm"],
    template: `
    <div data-test="reason-modal">
      <button data-test="reason-close" @click="$emit('close')">x</button>
      <button data-test="reason-confirm" @click="$emit('confirm','직원 정보 조회')">ok</button>
    </div>
  `,
};

function mountPage() {
    return mount(SettingEmployee, {
        global: {
            stubs: {
                ListView: ListViewStub,
                BaseButton: BaseButtonStub,
                BaseModal: BaseModalStub,
                EmployeeDetailModal: EmployeeDetailModalStub,
                ReasonRequestModal: ReasonRequestModalStub,
                Teleport: true, // Teleport는 true로 stub
            },
        },
    });
}

beforeEach(() => {
    getEmployeeListMock.mockReset();
    updateEmployeeStatusMock.mockReset();
    resetEmployeePasswordMock.mockReset();
    unlockEmployeeMock.mockReset();
    lockEmployeeMock.mockReset();

    // 기본 API 응답
    getEmployeeListMock.mockResolvedValue({
        content: [
            {
                employeeCode: "EMP001",
                employeeNumber: "2024001",
                employeeName: "김철수",
                phoneNumber: "010-1234-5678",
                loginId: "kim.cs",
                email: "kim@example.com",
                employeeStatus: "ACTIVE",
                permissionName: "관리자",
            },
            {
                employeeCode: "EMP002",
                employeeNumber: "2024002",
                employeeName: "이영희",
                phoneNumber: "010-9876-5432",
                loginId: "lee.yh",
                email: "lee@example.com",
                employeeStatus: "LOCKED",
                permissionName: "사용자",
            },
        ],
        totalElements: 2,
    });
});

describe("SettingEmployee UI/UX unit", () => {
    it("초기 로딩: 목록 API 호출하고 rows/total 매핑된다", async () => {
        const wrapper = mountPage();

        await flushPromises();

        expect(getEmployeeListMock).toHaveBeenCalledTimes(1);

        // rows 매핑 확인
        const rowsCount = wrapper.get('[data-test="rows-count"]').text();
        expect(rowsCount).toBe("2");
    });

    it("직원 등록 버튼 클릭: 권한 통과 시 생성 모달이 열린다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.find('[data-test="employee-detail-modal"]').exists()).toBe(false);

        // "직원 등록" 버튼 클릭
        await wrapper.get('[data-test="basebutton"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="employee-detail-modal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="employee-code"]').text()).toBe("");
    });

    it("검색: onSearch 이벤트가 오면 page=1로 리셋 + employeeName 파라미터로 재조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();

        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();

        expect(getEmployeeListMock).toHaveBeenCalledTimes(1);
        const params = getEmployeeListMock.mock.calls[0][0];
        expect(params.page).toBe(1);
        expect(params.detail.employeeName).toBe("홍길동");
    });

    it("필터: employeeStatus 필터 적용되어 조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();

        await wrapper.get('[data-test="emit-filter"]').trigger("click");
        await flushPromises();

        const params = getEmployeeListMock.mock.calls[0][0];
        expect(params.page).toBe(1);
        expect(params.filters.employeeStatus).toBe("ACTIVE");
    });

    it("정렬: sortState 업데이트되어 조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();

        await wrapper.get('[data-test="emit-sort"]').trigger("click");
        await flushPromises();

        const params = getEmployeeListMock.mock.calls[0][0];
        expect(params.sort.sortBy).toBe("employeeNumber");
        expect(params.sort.direction).toBe("asc");
    });

    it("페이지: page-change 발생 시 해당 page로 조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();

        await wrapper.get('[data-test="emit-page"]').trigger("click");
        await flushPromises();

        const params = getEmployeeListMock.mock.calls[0][0];
        expect(params.page).toBe(2);
    });

    it("행 클릭: 권한 통과 시 사유 모달이 열린다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(false);

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(true);
    });

    it("사유 confirm: 직원 상세 모달이 열리고 reason이 전달된다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        await wrapper.get('[data-test="reason-confirm"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="employee-detail-modal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="reason"]').text()).toBe("직원 정보 조회");
    });

    it("사유 모달 닫기: 모달이 닫힌다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(true);

        await wrapper.get('[data-test="reason-close"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(false);
    });

    it("직원 상세 모달 닫기: 모달이 닫힌다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        // 등록 버튼 클릭
        await wrapper.get('[data-test="basebutton"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="employee-detail-modal"]').exists()).toBe(true);

        await wrapper.get('[data-test="detail-close"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="employee-detail-modal"]').exists()).toBe(false);
    });

    it("직원 상세 모달 refresh: 목록이 재조회된다", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();

        // 등록 버튼 클릭
        await wrapper.get('[data-test="basebutton"]').trigger("click");
        await flushPromises();

        await wrapper.get('[data-test="detail-refresh"]').trigger("click");
        await flushPromises();

        expect(getEmployeeListMock).toHaveBeenCalledTimes(1);
    });

    it("상세검색 초기화: detailForm과 quickSearch가 초기화되고 재조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();

        await wrapper.get('[data-test="emit-detail-reset"]').trigger("click");
        await flushPromises();

        expect(getEmployeeListMock).toHaveBeenCalledTimes(1);
        const params = getEmployeeListMock.mock.calls[0][0];
        expect(params.page).toBe(1);
    });

    it("비밀번호 초기화 성공: 결과 모달이 표시된다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        resetEmployeePasswordMock.mockResolvedValue({
            data: "TempPass123!",
        });

        // confirm mock
        global.confirm = vi.fn(() => true);

        // handleAction('resetPassword', row) 호출을 시뮬레이트
        const vm = wrapper.vm;
        await vm.handleAction("resetPassword", {
            employeeCode: "EMP001",
            employeeName: "김철수",
            employeeStatus: "ACTIVE",
        });
        await flushPromises();

        expect(resetEmployeePasswordMock).toHaveBeenCalledWith("EMP001");
        expect(wrapper.find('[data-test="basemodal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("비밀번호 초기화 결과");
    });

    it("사용자 잠금 성공: API 호출 후 목록 재조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();

        lockEmployeeMock.mockResolvedValue({});

        global.confirm = vi.fn(() => true);
        global.alert = vi.fn();

        const vm = wrapper.vm;
        await vm.handleAction("lock", {
            employeeCode: "EMP001",
            employeeName: "김철수",
            employeeStatus: "ACTIVE",
        });
        await flushPromises();

        expect(lockEmployeeMock).toHaveBeenCalledWith("EMP001");
        expect(global.alert).toHaveBeenCalledWith("잠금 처리되었습니다.");
        expect(getEmployeeListMock).toHaveBeenCalledTimes(1);
    });

    it("사용자 활성화 성공: API 호출 후 목록 재조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();

        unlockEmployeeMock.mockResolvedValue({});

        global.confirm = vi.fn(() => true);
        global.alert = vi.fn();

        const vm = wrapper.vm;
        await vm.handleAction("activate", {
            employeeCode: "EMP002",
            employeeName: "이영희",
            employeeStatus: "LOCKED",
        });
        await flushPromises();

        expect(unlockEmployeeMock).toHaveBeenCalledWith("EMP002");
        expect(global.alert).toHaveBeenCalledWith("활성화되었습니다.");
        expect(getEmployeeListMock).toHaveBeenCalledTimes(1);
    });

    it("사용자 확인 취소: API 호출하지 않음", async () => {
        const wrapper = mountPage();
        await flushPromises();

        global.confirm = vi.fn(() => false);

        const vm = wrapper.vm;
        await vm.handleAction("lock", {
            employeeCode: "EMP001",
            employeeName: "김철수",
            employeeStatus: "ACTIVE",
        });
        await flushPromises();

        expect(lockEmployeeMock).not.toHaveBeenCalled();
    });

    it("컨텍스트 메뉴: kebab 버튼 클릭 시 메뉴가 열린다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        // activeMenuRow가 null이어야 함
        expect(wrapper.vm.activeMenuRow).toBeNull();

        // toggleMenu 호출
        const vm = wrapper.vm;
        const mockEvent = {
            stopPropagation: vi.fn(),
            currentTarget: {
                getBoundingClientRect: () => ({
                    bottom: 100,
                    right: 200,
                }),
            },
        };

        vm.toggleMenu(
            {
                employeeCode: "EMP001",
                employeeName: "김철수",
                employeeStatus: "ACTIVE",
            },
            mockEvent
        );
        await flushPromises();

        expect(wrapper.vm.activeMenuRow).not.toBeNull();
        expect(wrapper.vm.activeMenuRow.employeeCode).toBe("EMP001");
    });

    it("컨텍스트 메뉴: 같은 행 클릭 시 메뉴가 닫힌다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        const vm = wrapper.vm;
        const mockEvent = {
            stopPropagation: vi.fn(),
            currentTarget: {
                getBoundingClientRect: () => ({
                    bottom: 100,
                    right: 200,
                }),
            },
        };

        const row = {
            employeeCode: "EMP001",
            employeeName: "김철수",
            employeeStatus: "ACTIVE",
        };

        // 첫 번째 클릭: 열림
        vm.toggleMenu(row, mockEvent);
        await flushPromises();
        expect(wrapper.vm.activeMenuRow).not.toBeNull();

        // 두 번째 클릭: 닫힘
        vm.toggleMenu(row, mockEvent);
        await flushPromises();
        expect(wrapper.vm.activeMenuRow).toBeNull();
    });

    it("window 클릭 시 메뉴가 닫힌다 (onMounted에서 등록)", async () => {
        const wrapper = mountPage();
        await flushPromises();

        const vm = wrapper.vm;
        const mockEvent = {
            stopPropagation: vi.fn(),
            currentTarget: {
                getBoundingClientRect: () => ({
                    bottom: 100,
                    right: 200,
                }),
            },
        };

        vm.toggleMenu(
            {
                employeeCode: "EMP001",
                employeeName: "김철수",
                employeeStatus: "ACTIVE",
            },
            mockEvent
        );
        await flushPromises();

        expect(wrapper.vm.activeMenuRow).not.toBeNull();

        // window click 이벤트 트리거
        window.dispatchEvent(new Event("click"));
        await flushPromises();

        expect(wrapper.vm.activeMenuRow).toBeNull();
    });
    it("loadEmployeeList: API 에러 시 콘솔 에러 출력", async () => {
        const wrapper = mountPage();
        await flushPromises();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        getEmployeeListMock.mockRejectedValue(new Error("Network Error"));

        // Trigger load via filter
        await wrapper.get('[data-test="emit-filter"]').trigger("click");
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        consoleSpy.mockRestore();
    });

    it("onSearch: payload가 없으면 목록 재조회 (검색 초기화)", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();

        const vm = wrapper.vm;
        vm.onSearch(null);
        await flushPromises();

        expect(getEmployeeListMock).toHaveBeenCalledTimes(1);
        // Expect quickSearch to be reset
        expect(vm.quickSearch.keyword).toBeNull();
    });

    it("onSearch: 각 키워드별 quickSearch 업데이트 확인", async () => {
        const wrapper = mountPage();
        await flushPromises();
        const vm = wrapper.vm;

        // keyword
        vm.onSearch({ key: 'keyword', value: 'kw' });
        expect(vm.quickSearch.keyword).toBe('kw');

        // employeeName
        vm.onSearch({ key: 'employeeName', value: 'nm' });
        expect(vm.quickSearch.employeeName).toBe('nm');

        // departmentName
        vm.onSearch({ key: 'departmentName', value: 'dept' });
        expect(vm.quickSearch.departmentName).toBe('dept');

        // hotelPositionName
        vm.onSearch({ key: 'hotelPositionName', value: 'pos' });
        expect(vm.quickSearch.hotelPositionName).toBe('pos');
    });

    it("watch detailForm: 값이 변경되면 page=1 리셋 및 재조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getEmployeeListMock.mockClear();
        const vm = wrapper.vm;

        vm.page = 5;
        vm.detailForm.employeeName = "New Search";
        await flushPromises();

        expect(vm.page).toBe(1);
        expect(getEmployeeListMock).toHaveBeenCalled();
    });

    it("openRowModal: row.employeeCode가 없으면 바로 상세 모달 오픈 (else 분기)", async () => {
        const wrapper = mountPage();
        await flushPromises();
        const vm = wrapper.vm;

        const rowWithoutCode = { employeeName: 'Test' }; // No code
        vm.openRowModal(rowWithoutCode);
        await flushPromises();

        expect(vm.showRowModal).toBe(true);
        expect(vm.selectedEmployee).toEqual(rowWithoutCode);
        expect(vm.showReasonModal).toBe(false);
    });

    it("handleAction: edit 액션 시 openRowModal 호출", async () => {
        const wrapper = mountPage();
        await flushPromises();
        const vm = wrapper.vm;

        vm.handleAction('edit', { employeeCode: 'EMP', employeeName: 'Kim' });
        await flushPromises();

        // Should open ReasonModal because EMP exists and openRowModal logic handles it
        expect(vm.showReasonModal).toBe(true);
    });

    it("handleAction: activate 취소 시 리턴", async () => {
        const wrapper = mountPage();
        await flushPromises();
        global.confirm.mockReturnValue(false);
        const vm = wrapper.vm;

        await vm.handleAction('activate', { employeeCode: 'EMP' });
        expect(unlockEmployeeMock).not.toHaveBeenCalled();
    });

    it("handleAction: resetPassword 취소 시 리턴", async () => {
        const wrapper = mountPage();
        await flushPromises();
        global.confirm.mockReturnValue(false);
        const vm = wrapper.vm;

        await vm.handleAction('resetPassword', { employeeCode: 'EMP' });
        expect(resetEmployeePasswordMock).not.toHaveBeenCalled();
    });

    it("handleAction: 에러 발생 시 alert", async () => {
        const wrapper = mountPage();
        await flushPromises();
        global.confirm.mockReturnValue(true);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        lockEmployeeMock.mockRejectedValue(new Error("Fail"));

        const vm = wrapper.vm;
        await vm.handleAction('lock', { employeeCode: 'EMP' });
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith("요청 처리에 실패했습니다.");
        consoleSpy.mockRestore();
    });

    it("closeResetModal: 상태 초기화", async () => {
        const wrapper = mountPage();
        const vm = wrapper.vm;

        vm.showResetModal = true;
        vm.resetPasswordResult = "1234";

        vm.closeResetModal();

        expect(vm.showResetModal).toBe(false);
        expect(vm.resetPasswordResult).toBe("");
    });
});
