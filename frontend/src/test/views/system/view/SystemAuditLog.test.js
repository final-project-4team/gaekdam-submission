import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SystemAuditLog from "@/views/system/SystemAuditLog.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */
const getActivityLogListMock = vi.fn();
const getSystemLogDetailMock = vi.fn();

vi.mock("@/api/system/systemLogApi.js", () => ({
    getActivityLogList: (...args) => getActivityLogListMock(...args),
    getSystemLogDetail: (...args) => getSystemLogDetailMock(...args),
}));

vi.mock("@/composables/usePermissionGuard", () => ({
    usePermissionGuard: () => ({
        withPermission: (_perm, cb) => cb(),
    }),
}));

/** -----------------------------
 *  stubs
 *  ----------------------------- */
const ListViewStub = {
    name: "ListView",
    props: ["columns", "rows", "total", "page", "pageSize", "searchTypes", "filters"],
    emits: ["search", "filter", "sort-change", "page-change", "row-click"],
    template: `
    <div data-test="list-view">
        <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>
        
        <button data-test="emit-search" @click="$emit('search', { key: 'loginId', value: 'admin' })">search</button>
        <button data-test="emit-filter" @click="$emit('filter', { resource: 'MEMBER' })">filter</button>
        <button data-test="emit-sort" @click="$emit('sort-change', { sortBy: 'occurredAt', direction: 'desc' })">sort</button>
        <button data-test="emit-page" @click="$emit('page-change', 2)">page</button>
        <button data-test="emit-row-click" @click="$emit('row-click', rows[0])">row-click</button>
    </div>
    `
};

const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
    <div data-test="base-modal">
        <h1 data-test="modal-title">{{ title }}</h1>
        <button data-test="modal-close" @click="$emit('close')">X</button>
        <slot></slot>
        <div class="footer"><slot name="footer"></slot></div>
    </div>
    `
};

const BaseButtonStub = {
    template: `<button @click="$emit('press')"><slot/></button>`
};

const ContentTabsStub = { template: '<div data-test="content-tabs"></div>' };

describe("SystemAuditLog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.alert = vi.fn();

        getActivityLogListMock.mockResolvedValue({
            content: [
                { auditLogCode: 100, action: "CREATE", detail: "Created User", loginId: "admin", occurredAt: "2024-01-01" },
                { auditLogCode: 101, action: "DELETE", detail: "Deleted User", loginId: "manager", occurredAt: "2024-01-02" }
            ],
            totalElements: 2
        });

        getSystemLogDetailMock.mockResolvedValue({
            auditLogCode: 100,
            menuName: "User Mgmt",
            action: "CREATE",
            detail: "Created User",
            previousValue: null,
            newValue: "{ name: 'Kim' }",
            loginId: "admin",
            occurredAt: "2024-01-01"
        });
    });

    const mountComponent = () => {
        return mount(SystemAuditLog, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    BaseModal: BaseModalStub,
                    BaseButton: BaseButtonStub,
                    ContentTabs: ContentTabsStub
                }
            }
        });
    };

    it("초기 로딩: 활동 로그 목록 조회 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalledTimes(1);
        expect(wrapper.vm.activityLogList.length).toBe(2);
        expect(wrapper.get('[data-test="rows-count"]').text()).toBe("2");
    });

    it("날짜 필터: 날짜 변경 시 목록 재조회", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getActivityLogListMock.mockClear();

        // Change Date
        wrapper.vm.dateFilter.fromDate = '2024-02-01';
        wrapper.vm.dateFilter.toDate = '2024-02-28';

        // Trigger generic @change handler on inputs can be tricky if we don't look up inputs by type
        // The component uses @change="handleDateChange"
        await wrapper.findAll('input[type="date"]')[0].trigger('change');
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalled();
        const params = getActivityLogListMock.mock.calls[0][0].detail;
        expect(params.fromDate).toBe('2024-02-01');
    });

    it("검색: 검색어 입력 시 API 호출 (loginId)", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getActivityLogListMock.mockClear();

        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalled();
        const params = getActivityLogListMock.mock.calls[0][0].detail;
        expect(params.loginId).toBe('admin');
        expect(wrapper.vm.page).toBe(1);
    });

    it("검색: action 키워드 검색 시 API 파라미터 매핑", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getActivityLogListMock.mockClear();

        const vm = wrapper.vm;
        vm.onSearch({ key: 'action', value: 'CREATE' });
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalled();
        // action param logic in loadActivityLogs:
        // if (resource && action) -> key = resource_action
        // if (action) -> key = action
        const params = getActivityLogListMock.mock.calls[0][0].detail;
        expect(params.action).toBe('CREATE');
    });

    it("필터: 리소스/액션 필터 적용 시 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getActivityLogListMock.mockClear();

        await wrapper.get('[data-test="emit-filter"]').trigger("click");
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalled();
        // Logic: if (resource) permissionTypeKey = resource (since action is empty in emit-filter mock)
        const params = getActivityLogListMock.mock.calls[0][0].detail;
        expect(params.action).toBe('MEMBER');
    });

    it("페이지 변경: page 파라미터 업데이트", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getActivityLogListMock.mockClear();

        await wrapper.get('[data-test="emit-page"]').trigger("click");
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalled();
        const pageArg = getActivityLogListMock.mock.calls[0][0].page;
        expect(pageArg).toBe(2);
    });

    it("정렬 변경: sort 파라미터 매핑 확인", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getActivityLogListMock.mockClear();

        await wrapper.get('[data-test="emit-sort"]').trigger("click");
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalled();
        const sortArg = getActivityLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('occurredAt');
        expect(sortArg.direction).toBe('desc');
    });

    it("상세 조회: 행 클릭 시 상세 API 호출 및 모달 오픈", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(getSystemLogDetailMock).toHaveBeenCalledWith(100); // 1st row ID
        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);
        expect(wrapper.vm.activityLogDetail.newValue).toBe("{ name: 'Kim' }");
    });

    it("상세 조회 실패: API 에러 시 catch 블록 실행 및 기본 데이터 바인딩", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        getSystemLogDetailMock.mockRejectedValue(new Error("Detail Error"));

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith("활동 로그 상세 조회 실패:", expect.any(Error));
        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);
        // Fallback to row data
        expect(wrapper.vm.activityLogDetail.auditLogCode).toBe(100);

        consoleSpy.mockRestore();
    });

    it("모달 닫기: 데이터 초기화", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();
        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);

        await wrapper.get('[data-test="modal-close"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(false);
        expect(wrapper.vm.selectedRow).toBeNull();
    });

    it("목록 조회 실패: API 에러 시 빈 배열 처리", async () => {
        const wrapper = mountComponent();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        getActivityLogListMock.mockRejectedValue(new Error("List Error"));

        // Re-call load
        await wrapper.vm.loadActivityLogs();
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith("활동 로그 조회 실패:", expect.any(Error));
        expect(wrapper.vm.activityLogList).toEqual([]);
        expect(wrapper.vm.totalCount).toBe(0);

        consoleSpy.mockRestore();
    });
    it("필터: 리소스와 액션이 모두 있을 때 permissionTypeKey 조합 검증", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getActivityLogListMock.mockClear();

        // Set both resource and action filters
        wrapper.vm.filterValues.resource = "MEMBER";
        wrapper.vm.filterValues.action = "CREATE";

        // Trigger load
        await wrapper.vm.loadActivityLogs();
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalled();
        const params = getActivityLogListMock.mock.calls[0][0].detail;

        // Expected: "MEMBER_CREATE"
        expect(params.action).toBe("MEMBER_CREATE");
    });

    it("검색: detail 키워드 검색 시 API 파라미터 매핑", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getActivityLogListMock.mockClear();

        // Emit search with key='detail'
        await wrapper.vm.onSearch({ key: 'detail', value: 'Some Detail' });
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalled();
        const params = getActivityLogListMock.mock.calls[0][0].detail;
        expect(params.detail).toBe('Some Detail');
    });

    it("검색: 그 외 키워드(else branch)는 전체 검색(keyword)으로 매핑", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getActivityLogListMock.mockClear();

        // Emit search with no special key (e.g., 'all' or undefined key treated as keyword)
        // Code logic: key = payload.key ?? payload.type
        // if key != loginId, userIp, detail, action -> else -> keyword

        await wrapper.vm.onSearch({ key: 'randomKey', value: 'General Search' });
        await flushPromises();

        expect(getActivityLogListMock).toHaveBeenCalled();
        const params = getActivityLogListMock.mock.calls[0][0].detail;

        // Check that quickSearch.keyword was set
        expect(wrapper.vm.quickSearch.keyword).toBe('General Search');
        // valid check for state change only
    });
});
