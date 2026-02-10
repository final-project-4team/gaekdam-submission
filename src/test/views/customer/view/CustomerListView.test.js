import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CustomerListView from "@/views/customer/view/CustomerListView.vue";

const routerPushMock = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPushMock }),
}));

// authStore: hotelGroupCode만 필요
vi.mock("@/stores/authStore.js", () => ({
    useAuthStore: () => ({
        hotel: { hotelGroupCode: "HG001" },
    }),
}));

// permission guard: 그냥 콜백 실행
vi.mock("@/composables/usePermissionGuard", () => ({
    usePermissionGuard: () => ({
        withPermission: (_perm, cb) => cb(),
    }),
}));

// API mocks
const getCustomerListApiMock = vi.fn();
vi.mock("@/api/customer/customerApi.js", () => ({
    getCustomerListApi: (...args) => getCustomerListApiMock(...args),
}));

vi.mock("@/api/setting/membershipGrade.js", () => ({
    getMembershipGradeList: vi.fn(async () => [
        { membershipGradeCode: 1, gradeName: "SILVER" },
        { membershipGradeCode: 2, gradeName: "GOLD" },
    ]),
}));

vi.mock("@/api/setting/loyaltyGrade.js", () => ({
    getLoyaltyGradeList: vi.fn(async () => [
        { loyaltyGradeCode: 10, loyaltyGradeName: "BRONZE" },
        { loyaltyGradeCode: 20, loyaltyGradeName: "PLATINUM" },
    ]),
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
        "searchType",
    ],
    emits: [
        "update:searchType",
        "search",
        "filter",
        "sort-change",
        "page-change",
        "row-click",
        "update:detail",
    ],
    template: `
    <div data-test="listview">
      <div data-test="columns-count">{{ columns?.length ?? 0 }}</div>
      <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>

      <!-- slot -->
      <div data-test="detail-form">
        <slot name="detail-form"></slot>
      </div>

      <!-- test buttons to emit events -->
      <button data-test="emit-search" @click="$emit('search', { key: 'customerName', value: '  홍길동  ' })">emit-search</button>
      <button data-test="emit-filter" @click="$emit('filter', { status: { value: 'ACTIVE' }, membershipGrade: { value: 2 } })">emit-filter</button>
      <button data-test="emit-sort" @click="$emit('sort-change', { sortBy: 'customerCode', direction: 'asc' })">emit-sort</button>
      <button data-test="emit-page" @click="$emit('page-change', 3)">emit-page</button>
      <button data-test="emit-row-click" @click="$emit('row-click', { customerCode: 101 })">emit-row-click</button>
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
    </div>
  `,
};

const ReasonRequestModalStub = {
    name: "ReasonRequestModal",
    emits: ["close", "confirm"],
    template: `
    <div data-test="reason-modal">
      <button data-test="reason-close" @click="$emit('close')">x</button>
      <button data-test="reason-confirm" @click="$emit('confirm','테스트사유')">ok</button>
    </div>
  `,
};

function mountPage() {
    return mount(CustomerListView, {
        global: {
            stubs: {
                ListView: ListViewStub,
                BaseButton: BaseButtonStub,
                BaseModal: BaseModalStub,
                ReasonRequestModal: ReasonRequestModalStub,
            },
        },
    });
}

beforeEach(() => {
    routerPushMock.mockClear();
    getCustomerListApiMock.mockReset();

    // 기본 API 응답
    getCustomerListApiMock.mockResolvedValue({
        data: {
            data: {
                content: [
                    {
                        customerCode: 101,
                        customerName: "홍길동",
                        primaryContact: "010-1111-2222",
                        status: "ACTIVE",
                        membershipGrade: null,
                        loyaltyGrade: null,
                        lastUsedDate: null,
                        inflowChannel: null,
                        contractType: null,
                        nationalityType: null,
                    },
                ],
                totalElements: 1,
            },
        },
    });
});

describe("CustomerListView UI/UX unit", () => {
    it("초기 로딩: hotelGroupCode가 있으면 목록 API 호출하고 rows/total 매핑된다", async () => {
        const wrapper = mountPage();

        await flushPromises();

        expect(getCustomerListApiMock).toHaveBeenCalledTimes(1);

        // rows 매핑 확인 (미가입/ - / - 대체값)
        const rowsCount = wrapper.get('[data-test="rows-count"]').text();
        expect(rowsCount).toBe("1");
    });

    it("검색: onSearch 이벤트가 오면 page=1로 리셋 + customerName 파라미터로 재조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getCustomerListApiMock.mockClear();

        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();

        expect(getCustomerListApiMock).toHaveBeenCalledTimes(1);
        const params = getCustomerListApiMock.mock.calls[0][0];
        expect(params.page).toBe(1);
        expect(params.customerName).toBe("홍길동"); // trim 적용
    });

    it("필터: normalizeFilterValues 적용되어 membershipGradeCode/ status로 조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getCustomerListApiMock.mockClear();

        await wrapper.get('[data-test="emit-filter"]').trigger("click");
        await flushPromises();

        const params = getCustomerListApiMock.mock.calls[0][0];
        expect(params.page).toBe(1);
        expect(params.status).toBe("ACTIVE");
        expect(params.membershipGradeCode).toBe(2);
    });

    it("정렬: customerCode + asc 입력이면 customer_code + ASC로 매핑되어 조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getCustomerListApiMock.mockClear();

        await wrapper.get('[data-test="emit-sort"]').trigger("click");
        await flushPromises();

        const params = getCustomerListApiMock.mock.calls[0][0];
        expect(params.page).toBe(1);
        expect(params.sortBy).toBe("customer_code");
        expect(params.direction).toBe("ASC");
    });

    it("페이지: page-change 발생 시 해당 page로 조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getCustomerListApiMock.mockClear();

        await wrapper.get('[data-test="emit-page"]').trigger("click");
        await flushPromises();

        const params = getCustomerListApiMock.mock.calls[0][0];
        expect(params.page).toBe(3);
    });

    it("행 클릭: 권한 통과 시 사유 모달이 열린다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(false);

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(true);
    });

    it("사유 confirm: CustomerDetail 라우팅(push) + query reason 포함", async () => {
        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        await wrapper.get('[data-test="reason-confirm"]').trigger("click");
        await flushPromises();

        expect(routerPushMock).toHaveBeenCalledTimes(1);
        expect(routerPushMock).toHaveBeenCalledWith({
            name: "CustomerDetail",
            params: { id: 101 },
            query: { reason: "테스트사유" },
        });
    });

    it("표시 항목 선택 버튼 클릭 시 컬럼 모달이 열린다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        // "표시 항목 선택" 버튼은 BaseButtonStub로 렌더됨
        const btns = wrapper.findAll('[data-test="basebutton"]');
        // 첫 번째 버튼이 top-actions의 "표시 항목 선택"이라고 가정(현재 템플릿 상 그렇다)
        await btns[0].trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="basemodal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("표시 항목 선택");
    });
});
