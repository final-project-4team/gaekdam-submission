import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SystemPersonalInformationLog from "@/views/system/SystemPersonalInformationLog.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */
const getPrivacyLogListMock = vi.fn();

vi.mock("@/api/system/systemLogApi.js", () => ({
    getPrivacyLogList: (...args) => getPrivacyLogListMock(...args),
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
        <button data-test="emit-filter" @click="$emit('filter', { targetType: 'EMPLOYEE' })">filter</button>
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

describe("SystemPersonalInformationLog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.console.error = vi.fn();

        getPrivacyLogListMock.mockResolvedValue({
            content: [
                {
                    personalInformationLogCode: 1,
                    permissionTypeKey: "VIEW",
                    targetType: "CUSTOMER",
                    targetCode: "CUST01",
                    targetName: "John Doe",
                    employeeAccessorName: "Admin User",
                    employeeAccessorLoginId: "admin",
                    occurredAt: "2024-01-01",
                    purpose: "Check In"
                }
            ],
            totalElements: 1
        });
    });

    const mountComponent = () => {
        return mount(SystemPersonalInformationLog, {
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

    it("초기 로딩: 개인정보 로그 목록 조회 API 호출 및 매핑 확인", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(getPrivacyLogListMock).toHaveBeenCalledTimes(1);

        const row = wrapper.vm.privacyLogList[0];
        expect(row.privacyLogCode).toBe(1);
        expect(row.action).toBe("VIEW");
        expect(row.targetType).toBe("CUSTOMER");
        expect(row.accessorName).toBe("Admin User");
        expect(row.purpose).toBe("Check In");
    });

    it("날짜 필터: 날짜 변경 시 목록 재조회", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        // Change Date
        wrapper.vm.dateFilter.fromDate = '2024-02-01';
        wrapper.vm.dateFilter.toDate = '2024-02-28';

        const inputs = wrapper.findAll('input[type="date"]');
        await inputs[0].trigger('change');
        await flushPromises();

        expect(getPrivacyLogListMock).toHaveBeenCalled();
        const params = getPrivacyLogListMock.mock.calls[0][0].detail;
        expect(params.fromDate).toBe('2024-02-01');
    });

    it("검색: Empty Payload -> Load Default", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSearch(null); // or empty obj
        await flushPromises();

        expect(getPrivacyLogListMock).toHaveBeenCalled();
    });

    /**
     * Search Branches Coverage
     */
    it("검색: loginId 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'loginId', value: 'admin' });
        await flushPromises();

        const params = getPrivacyLogListMock.mock.calls[0][0].detail;
        expect(params.loginId).toBe('admin');
    });

    it("검색: accessorName 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'accessorName', value: 'Admin' });
        await flushPromises();

        const params = getPrivacyLogListMock.mock.calls[0][0].detail;
        expect(params.accessorName).toBe('Admin');
    });

    it("검색: privacyLogCode 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'privacyLogCode', value: '123' });
        await flushPromises();

        const params = getPrivacyLogListMock.mock.calls[0][0].detail;
        expect(params.privacyLogCode).toBe('123');
    });

    it("검색: action 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'action', value: 'READ' });
        await flushPromises();

        const params = getPrivacyLogListMock.mock.calls[0][0].detail;
        expect(params.action).toBe('READ');
    });

    it("검색: targetCode 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'targetCode', value: 'T01' });
        await flushPromises();

        const params = getPrivacyLogListMock.mock.calls[0][0].detail;
        expect(params.targetCode).toBe('T01');
    });

    it("검색: targetName 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'targetName', value: 'Target' });
        await flushPromises();

        const params = getPrivacyLogListMock.mock.calls[0][0].detail;
        expect(params.targetName).toBe('Target');
    });

    it("검색: 기타(Keyword) 검색", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSearch({ key: 'random', value: 'Keyword' });
        await flushPromises();

        const params = getPrivacyLogListMock.mock.calls[0][0].detail;
        expect(params.keyword).toBe('Keyword');
    });

    it("필터: TargetType 필터링", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.get('[data-test="emit-filter"]').trigger("click");
        await flushPromises();

        expect(getPrivacyLogListMock).toHaveBeenCalled();
        const params = getPrivacyLogListMock.mock.calls[0][0].detail;
        expect(params.targetType).toBe('EMPLOYEE');
    });

    it("페이지 변경: page 업데이트", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.get('[data-test="emit-page"]').trigger("click");
        await flushPromises();

        const pageArg = getPrivacyLogListMock.mock.calls[0][0].page;
        expect(pageArg).toBe(2);
    });

    /**
     * Sort Mapping Coverage
     */
    it("정렬: privacyLogCode -> personalInformationLogCode", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'privacyLogCode', direction: 'asc' });
        await flushPromises();

        const sortArg = getPrivacyLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('personalInformationLogCode');
    });

    it("정렬: action -> permissionTypeKey", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'action', direction: 'asc' });
        await flushPromises();

        const sortArg = getPrivacyLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('permissionTypeKey');
    });

    it("정렬: accessorName -> employeeAccessorName", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'accessorName', direction: 'asc' });
        await flushPromises();

        const sortArg = getPrivacyLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('employeeAccessorName');
    });

    it("정렬: loginId -> employeeAccessorLoginId", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'loginId', direction: 'asc' });
        await flushPromises();

        const sortArg = getPrivacyLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('employeeAccessorLoginId');
    });

    it("정렬: 기타 필드 (매핑 없음)", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPrivacyLogListMock.mockClear();

        await wrapper.vm.onSortChange({ sortBy: 'targetType', direction: 'asc' });
        await flushPromises();

        const sortArg = getPrivacyLogListMock.mock.calls[0][0].sort;
        expect(sortArg.sortBy).toBe('targetType');
    });


    it("모달: 행 클릭 시 모달 오픈 및 데이터 확인", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);
        expect(wrapper.vm.selectedRow).not.toBeNull();
        expect(wrapper.vm.logDetail).not.toBeNull();

        // Check binding in modal (since stubs render slots)
        // Note: Slot content might not render fully in basic stub unless slot is handled carefully.
        // But vm state check is reliable.
    });

    it("모달 닫기: 데이터 초기화", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // open
        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();
        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);

        // close
        await wrapper.get('[data-test="modal-close"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(false);
        expect(wrapper.vm.selectedRow).toBeNull();
    });

    it("에러 핸들링: API 실패 시 콘솔 에러 및 빈 리스트 처리", async () => {
        const wrapper = mountComponent();
        getPrivacyLogListMock.mockRejectedValue(new Error("Fail"));

        await wrapper.vm.loadPrivacyLogs();
        await flushPromises();

        expect(console.error).toHaveBeenCalledWith('개인정보 조회 이력 조회 실패:', expect.any(Error));
        expect(wrapper.vm.privacyLogList).toEqual([]);
        expect(wrapper.vm.totalCount).toBe(0);
    });
});
