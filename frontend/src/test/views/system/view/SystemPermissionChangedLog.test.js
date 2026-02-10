import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SystemPermissionChangedLog from "@/views/system/SystemPermissionChangedLog.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */
const getPermissionLogListMock = vi.fn();

vi.mock("@/api/system/systemLogApi.js", () => ({
    getPermissionLogList: (...args) => getPermissionLogListMock(...args),
}));

/** -----------------------------
 *  stubs
 *  ----------------------------- */
const ListViewStub = {
    name: "ListView",
    props: ["columns", "rows", "total", "page", "pageSize", "searchTypes"],
    emits: ["search", "sort-change", "page-change"],
    template: `
    <div data-test="list-view">
        <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>
        
        <button data-test="emit-search" @click="$emit('search', { key: 'targetId', value: 'user1' })">search</button>
        <button data-test="emit-sort" @click="$emit('sort-change', { sortBy: 'changeName', direction: 'asc' })">sort</button>
        <button data-test="emit-page" @click="$emit('page-change', 2)">page</button>
    </div>
    `
};

const ContentTabsStub = { template: '<div data-test="content-tabs"></div>' };

describe("SystemPermissionChangedLog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.console.error = vi.fn();

        getPermissionLogListMock.mockResolvedValue({
            content: [
                {
                    permissionChangedLogCode: 10,
                    employeeChangedName: "TargetUser",
                    beforePermissionName: "User",
                    afterPermissionName: "Admin",
                    employeeChangedLoginId: "target123",
                    employeeAccessorLoginId: "admin01",
                    changedAt: "2024-01-01"
                }
            ],
            totalElements: 1
        });
    });

    const mountComponent = () => {
        return mount(SystemPermissionChangedLog, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    ContentTabs: ContentTabsStub
                }
            }
        });
    };

    it("초기 로딩: 권한 로그 목록 조회 API 호출 및 매핑 확인", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(getPermissionLogListMock).toHaveBeenCalledTimes(1);

        // Data Mapping Check
        const row = wrapper.vm.permissionLogList[0];
        expect(row.permissionLogCode).toBe(10);
        expect(row.changeName).toBe("TargetUser 권한 변경");
        expect(row.beforePermission).toBe("User");
        expect(row.afterPermission).toBe("Admin");
        expect(row.targetId).toBe("target123");
        expect(row.modifierId).toBe("admin01");
        expect(row.occurredAt).toBe("2024-01-01");
    });

    it("날짜 필터: 날짜 변경 시 목록 재조회", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        // Change Date
        wrapper.vm.dateFilter.fromDate = '2024-02-01';
        wrapper.vm.dateFilter.toDate = '2024-02-28';

        // Trigger generic @change handler (finding inputs by type date)
        const inputs = wrapper.findAll('input[type="date"]');
        await inputs[0].trigger('change');
        await flushPromises();

        expect(getPermissionLogListMock).toHaveBeenCalled();
        const params = getPermissionLogListMock.mock.calls[0][0].detail;
        expect(params.fromDate).toBe('2024-02-01');
    });

    it("검색: Empty Payload -> Load Default", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSearch(null); // or empty object
        await flushPromises();

        expect(getPermissionLogListMock).toHaveBeenCalled();
    });

    it("검색: Target ID 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'targetId', value: 'tgt' });
        await flushPromises();

        const params = getPermissionLogListMock.mock.calls[0][0].detail;
        expect(params.targetId).toBe('tgt');
    });

    it("검색: Modifier ID 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'modifierId', value: 'mod' });
        await flushPromises();

        const params = getPermissionLogListMock.mock.calls[0][0].detail;
        expect(params.modifierId).toBe('mod');
    });

    it("검색: Before Permission 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'beforePermission', value: 'ROLE_USER' });
        await flushPromises();

        const params = getPermissionLogListMock.mock.calls[0][0].detail;
        expect(params.beforePermission).toBe('ROLE_USER');
    });

    it("검색: After Permission 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'afterPermission', value: 'ROLE_ADMIN' });
        await flushPromises();

        const params = getPermissionLogListMock.mock.calls[0][0].detail;
        expect(params.afterPermission).toBe('ROLE_ADMIN');
    });

    it("검색: 기타(Keyword) 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'random', value: 'KeywordSearch' });
        await flushPromises();

        const params = getPermissionLogListMock.mock.calls[0][0].detail;
        expect(params.keyword).toBe('KeywordSearch');
    });

    it("페이지 변경: page 파라미터 업데이트", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.get('[data-test="emit-page"]').trigger("click");
        await flushPromises();

        const pageArg = getPermissionLogListMock.mock.calls[0][0].page;
        expect(pageArg).toBe(2);
    });

    /**
     * Sorting Tests (Coverage for all if-branches in loadPermissionLogs)
     */
    it("정렬: permissionLogCode -> permissionChangedLogCode", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'permissionLogCode', direction: 'asc' });
        await flushPromises();

        const sortArg = getPermissionLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('permissionChangedLogCode');
    });

    it("정렬: changeName -> employeeChangedName", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'changeName', direction: 'asc' });
        await flushPromises();

        const sortArg = getPermissionLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('employeeChangedName');
    });

    it("정렬: beforePermission -> beforePermissionName", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'beforePermission', direction: 'asc' });
        await flushPromises();

        const sortArg = getPermissionLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('beforePermissionName');
    });

    it("정렬: afterPermission -> afterPermissionName", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'afterPermission', direction: 'asc' });
        await flushPromises();

        const sortArg = getPermissionLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('afterPermissionName');
    });

    it("정렬: targetId -> employeeChangedLoginId", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'targetId', direction: 'asc' });
        await flushPromises();

        const sortArg = getPermissionLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('employeeChangedLoginId');
    });

    it("정렬: modifierId -> employeeAccessorLoginId", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'modifierId', direction: 'asc' });
        await flushPromises();

        const sortArg = getPermissionLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('employeeAccessorLoginId');
    });

    it("정렬: occurredAt -> changedAt", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'occurredAt', direction: 'asc' });
        await flushPromises();

        const sortArg = getPermissionLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('changedAt');
    });

    it("정렬: 기타 필드 (매핑 없음)", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'randomField', direction: 'asc' });
        await flushPromises();

        const sortArg = getPermissionLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('randomField');
    });

    it("에러 핸들링: API 실패 시 콘솔 에러 및 빈 리스트 처리", async () => {
        const wrapper = mountComponent();
        getPermissionLogListMock.mockRejectedValue(new Error("Network Error"));

        await wrapper.vm.loadPermissionLogs();
        await flushPromises();

        expect(console.error).toHaveBeenCalledWith('권한 변경 로그 조회 실패:', expect.any(Error));
        expect(wrapper.vm.permissionLogList).toEqual([]);
        expect(wrapper.vm.totalCount).toBe(0);
    });
});
