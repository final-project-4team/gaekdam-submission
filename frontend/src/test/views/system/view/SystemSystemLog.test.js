import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SystemSystemLog from "@/views/system/SystemSystemLog.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */
const getSystemLogListMock = vi.fn();
// const getSystemLogDetailMock = vi.fn(); // Unused in component, but imported.

vi.mock("@/api/system/systemLogApi.js", () => ({
    getSystemLogList: (...args) => getSystemLogListMock(...args),
    getSystemLogDetail: vi.fn(), // Mock even if unused to avoid import errors
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
        <button data-test="emit-filter" @click="$emit('filter', { result: 'FAIL' })">filter</button>
        <button data-test="emit-sort" @click="$emit('sort-change', { sortBy: 'occurredAt', direction: 'desc' })">sort</button>
        <button data-test="emit-page" @click="$emit('page-change', 2)">page</button>
        
        <!-- Simulate action slot usage if needed, but for unit test buttons work fine -->
        <div v-for="row in rows" :key="row.loginLogCode">
             <button :data-test="'open-modal-' + row.loginLogCode" @click="$emit('row-click', row)">row-click</button>
        </div>
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

describe("SystemSystemLog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.console.error = vi.fn();
        global.console.log = vi.fn();

        getSystemLogListMock.mockResolvedValue({
            content: [
                {
                    loginLogCode: 1,
                    action: "LOGIN",
                    loginId: "user1",
                    userIp: "127.0.0.1",
                    occurredAt: "2024-01-01",
                    result: "SUCCESS"
                },
                {
                    loginLogCode: 2,
                    action: "LOGIN",
                    loginId: "user2",
                    userIp: "192.168.1.1",
                    occurredAt: "2024-01-02",
                    result: "FAIL",
                    failedReason: "Bad Password"
                }
            ],
            totalElements: 2
        });
    });

    const mountComponent = () => {
        return mount(SystemSystemLog, {
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

    it("초기 로딩: 로그인 로그 목록 조회 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(getSystemLogListMock).toHaveBeenCalledTimes(1);
        expect(wrapper.vm.systemLogList.length).toBe(2);
    });

    it("날짜 필터: 날짜 변경 시 목록 재조회", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getSystemLogListMock.mockClear();

        // Change Date
        wrapper.vm.dateFilter.fromDate = '2024-02-01';
        wrapper.vm.dateFilter.toDate = '2024-02-28';

        const inputs = wrapper.findAll('input[type="date"]');
        await inputs[0].trigger('change');
        await flushPromises();

        expect(getSystemLogListMock).toHaveBeenCalled();
        const params = getSystemLogListMock.mock.calls[0][0].detail;
        expect(params.fromDate).toBe('2024-02-01');
    });

    it("검색: Empty Payload -> Load Default and Clear QuickSearch", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getSystemLogListMock.mockClear();

        await wrapper.vm.onSearch(null);
        await flushPromises();

        expect(getSystemLogListMock).toHaveBeenCalled();
        expect(wrapper.vm.quickSearch.loginId).toBeNull();
    });

    it("검색: loginId 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getSystemLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'loginId', value: 'admin' });
        await flushPromises();

        const params = getSystemLogListMock.mock.calls[0][0].detail;
        expect(params.loginId).toBe('admin');
        expect(wrapper.vm.quickSearch.loginId).toBe('admin');
    });

    it("검색: userIp 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getSystemLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'userIp', value: '1.2.3.4' });
        await flushPromises();

        const params = getSystemLogListMock.mock.calls[0][0].detail;
        expect(params.userIp).toBe('1.2.3.4');
    });

    it("검색: keyword (전체) 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getSystemLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'random', value: 'Any' });
        await flushPromises();

        const params = getSystemLogListMock.mock.calls[0][0].detail;
        expect(params.keyword).toBe('Any');
    });

    it("필터: 결과 필터링 (SUCCESS/FAIL)", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getSystemLogListMock.mockClear();

        // Simulate filter event from ListView
        await wrapper.vm.onFilter({ result: 'FAIL' });
        await flushPromises();

        expect(getSystemLogListMock).toHaveBeenCalled();
        const filters = getSystemLogListMock.mock.calls[0][0].filters;
        expect(filters.result).toBe('FAIL');
    });

    it("필터: 빈 값일 경우 undefined 처리", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getSystemLogListMock.mockClear();

        await wrapper.vm.onFilter({ result: '' });
        await flushPromises();

        const filters = getSystemLogListMock.mock.calls[0][0].filters;
        expect(filters.result).toBeUndefined();
    });

    it("필터: payload가 없을 경우 초기화", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Set some filter first
        wrapper.vm.filterValues.result = 'SUCCESS';

        getSystemLogListMock.mockClear();
        await wrapper.vm.onFilter(null);
        await flushPromises();

        const filters = getSystemLogListMock.mock.calls[0][0].filters;
        expect(filters.result).toBeUndefined();
    });

    it("페이지 변경", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getSystemLogListMock.mockClear();

        await wrapper.vm.onPageChange(2);
        await flushPromises();

        const pageArg = getSystemLogListMock.mock.calls[0][0].page;
        expect(pageArg).toBe(2);
    });

    it("정렬 변경", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getSystemLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'occurredAt', direction: 'desc' });
        await flushPromises();

        const sortArg = getSystemLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('occurredAt');
    });

    it("모달: 행 클릭 시 모달 오픈 및 데이터 확인", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Click row 2 (Fail case) to see details
        await wrapper.vm.openRowModal(wrapper.vm.systemLogList[1]);
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);
        expect(wrapper.vm.systemLogDetail.failedReason).toBe("Bad Password");
    });

    it("모달 닫기", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        await wrapper.vm.openRowModal(wrapper.vm.systemLogList[0]);
        await flushPromises();
        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);

        await wrapper.vm.closeRowModal();
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(false);
        expect(wrapper.vm.selectedRow).toBeNull();
    });

    it("에러 핸들링: API 실패 시 콘솔 에러 및 빈 리스트 처리", async () => {
        const wrapper = mountComponent();
        getSystemLogListMock.mockRejectedValue(new Error("Fail"));

        await wrapper.vm.loadSystemLogs();
        await flushPromises();

        expect(console.error).toHaveBeenCalledWith('시스템 로그 조회 실패:', expect.any(Error));
        expect(wrapper.vm.systemLogList).toEqual([]);
        expect(wrapper.vm.totalCount).toBe(0);
    });
});
