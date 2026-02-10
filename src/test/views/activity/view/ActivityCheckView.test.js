import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ActivityCheckView from "@/views/activity/view/ActivityCheckView.vue";

/** -----------------------------
 * mocks (외부 의존성 차단)
 * ----------------------------- */
const withPermissionMock = vi.fn((_perm, cb) => cb());
vi.mock("@/composables/usePermissionGuard", () => ({
    usePermissionGuard: () => ({ withPermission: withPermissionMock }),
}));

const getPropertyListByHotelGroupApiMock = vi.fn();
vi.mock("@/api/property/propertyApi.js", () => ({
    getPropertyListByHotelGroupApi: (...args) => getPropertyListByHotelGroupApiMock(...args),
}));

const getTodayOperationSummaryApiMock = vi.fn();
const getTodayOperationListApiMock = vi.fn();
vi.mock("@/api/reservation", () => ({
    getTodayOperationSummaryApi: (...args) => getTodayOperationSummaryApiMock(...args),
    getTodayOperationListApi: (...args) => getTodayOperationListApiMock(...args),
}));

const getCustomerBasicApiMock = vi.fn();
vi.mock("@/api/customer/customerApi", () => ({
    getCustomerBasicApi: (...args) => getCustomerBasicApiMock(...args),
}));

/** -----------------------------
 * stubs (UI 컴포넌트 단순화)
 * ----------------------------- */
const TodayCheckSummaryStub = {
    name: "TodayCheckSummary",
    props: ["summary", "active"],
    emits: ["select"],
    template: `
    <div data-test="summary">
      <div data-test="active">{{ active }}</div>
      <button data-test="select-checkin" @click="$emit('select','CHECKIN_PLANNED')">select</button>
      <button data-test="select-all" @click="$emit('select','ALL_TODAY')">select</button>
    </div>
  `,
};

const BaseButtonStub = {
    name: "BaseButton",
    emits: ["press", "click"],
    template: `<button data-test="basebutton" @click="$emit('press')"><slot /></button>`,
};

const ListViewStub = {
    name: "ListView",
    props: ["columns", "rows", "page", "pageSize", "total", "filters", "searchTypes"],
    emits: ["filter", "search", "sort-change", "page-change", "row-click"],
    template: `
    <div data-test="listview">
      <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>

      <div v-if="rows && rows.length">
        <!-- 1) 상태 슬롯 (첫 row) -->
        <div data-test="cell-operationStatus">
          <slot name="cell-operationStatus" :value="rows[0].operationStatus"></slot>
        </div>

        <!-- 2) action 슬롯 (첫 row) -->
        <div data-test="cell-action">
          <slot name="cell-action" :row="rows[0]"></slot>
        </div>
      </div>

      <!-- emit buttons -->
      <button data-test="emit-filter" @click="$emit('filter',{ propertyCode:'P1' })">filter</button>
      <button data-test="emit-search-name" @click="$emit('search',{ key:'customerName', value:'김철수' })">search-name</button>
      <button data-test="emit-search-empty" @click="$emit('search',{ key:'customerName', value:'' })">search-empty</button>
      <button data-test="emit-sort" @click="$emit('sort-change',{ sortBy:'reservationCode', direction:'DESC' })">sort</button>
      <button data-test="emit-page" @click="$emit('page-change',3)">page</button>
      <button data-test="emit-row-click" @click="$emit('row-click', rows?.[0])">row</button>
      <button data-test="emit-row-click-no-customer" @click="$emit('row-click', { reservationCode: 1 })">row-no-customer</button>
    </div>
  `,
};

const CheckInModalStub = {
    name: "CheckInModal",
    props: ["reservationCode"],
    emits: ["close", "success"],
    template: `
    <div data-test="checkin-modal">
      <div data-test="checkin-reservation">{{ reservationCode }}</div>
      <button data-test="checkin-success" @click="$emit('success')">ok</button>
      <button data-test="checkin-close" @click="$emit('close')">x</button>
    </div>
  `,
};

const CheckOutModalStub = {
    name: "CheckOutModal",
    props: ["stayCode"],
    emits: ["close", "success"],
    template: `
    <div data-test="checkout-modal">
      <div data-test="checkout-stay">{{ stayCode }}</div>
      <button data-test="checkout-success" @click="$emit('success')">ok</button>
      <button data-test="checkout-close" @click="$emit('close')">x</button>
    </div>
  `,
};

const CustomerBasicModalStub = {
    name: "CustomerBasicModal",
    props: ["customer"],
    emits: ["close"],
    template: `
    <div data-test="customer-modal">
      <div data-test="customer-name">{{ customer?.customerName }}</div>
      <button data-test="customer-close" @click="$emit('close')">x</button>
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
    return mount(ActivityCheckView, {
        global: {
            stubs: {
                ListView: ListViewStub,
                BaseButton: BaseButtonStub,
                TodayCheckSummary: TodayCheckSummaryStub,
                CheckInModal: CheckInModalStub,
                CheckOutModal: CheckOutModalStub,
                CustomerBasicModal: CustomerBasicModalStub,
                ReasonRequestModal: ReasonRequestModalStub,
            },
        },
    });
}

const lastListParams = () => getTodayOperationListApiMock.mock.calls.at(-1)?.[0];

beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(globalThis, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    getPropertyListByHotelGroupApiMock.mockResolvedValue({
        data: { data: [{ propertyName: "강남점", propertyCode: "P1" }] },
    });

    getTodayOperationSummaryApiMock.mockResolvedValue({
        data: { data: { CHECKIN_PLANNED: 2, STAYING: 3, CHECKOUT_PLANNED: 1 } },
    });

    getTodayOperationListApiMock.mockResolvedValue({
        data: {
            data: {
                content: [
                    {
                        reservationCode: 1001,
                        customerCode: 777,
                        customerName: "홍길동",
                        roomType: "디럭스",
                        plannedCheckinDate: "2026-02-01",
                        plannedCheckoutDate: "2026-02-02",
                        operationStatus: "CHECKIN_PLANNED",
                        stayCode: 555, // checkout 케이스에서 사용
                    },
                ],
                totalElements: 1,
            },
        },
    });

    getCustomerBasicApiMock.mockResolvedValue({
        data: { data: { customerName: "홍길동" } },
    });
});

describe("ActivityCheckView UI/UX unit", () => {
    it("초기 로딩: property + summary + list 호출되고 rows/total 세팅된다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        expect(getPropertyListByHotelGroupApiMock).toHaveBeenCalledTimes(1);
        expect(getTodayOperationSummaryApiMock).toHaveBeenCalledTimes(1);
        expect(getTodayOperationListApiMock).toHaveBeenCalledTimes(1);

        expect(wrapper.get('[data-test="rows-count"]').text()).toBe("1");

        // ALL_TODAY이면 summaryType은 undefined로 전송 (코드 로직)
        const params = lastListParams();
        expect(params.summaryType).toBeUndefined();
    });

    it("Summary 선택: type 변경 + page=1 + list 재조회(summaryType 적용)", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getTodayOperationListApiMock.mockClear();

        await wrapper.get('[data-test="select-checkin"]').trigger("click");
        await flushPromises();

        const params = lastListParams();
        expect(params.page).toBe(1);
        expect(params.summaryType).toBe("CHECKIN_PLANNED");
    });

    it("Filter: page=1 리셋 + Summary/List 둘 다 갱신, propertyCode 전달", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getTodayOperationSummaryApiMock.mockClear();
        getTodayOperationListApiMock.mockClear();

        await wrapper.get('[data-test="emit-filter"]').trigger("click");
        await flushPromises();

        expect(getTodayOperationSummaryApiMock).toHaveBeenCalledTimes(1);
        expect(getTodayOperationListApiMock).toHaveBeenCalledTimes(1);

        expect(getTodayOperationSummaryApiMock.mock.calls[0][0]).toEqual({ propertyCode: "P1" });

        const params = lastListParams();
        expect(params.page).toBe(1);
        expect(params.propertyCode).toBe("P1");
    });

    it("Search(고객명): detail 초기화 후 customerName 세팅 + list 재조회(page=1)", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getTodayOperationListApiMock.mockClear();

        await wrapper.get('[data-test="emit-search-name"]').trigger("click");
        await flushPromises();

        const params = lastListParams();
        expect(params.page).toBe(1);
        expect(params.detail.customerName).toBe("김철수");
        expect(params.detail.reservationCode).toBe(null);
    });

    it("Search(빈값): 전체 재조회(detail 비우고 list 호출)", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getTodayOperationListApiMock.mockClear();

        await wrapper.get('[data-test="emit-search-empty"]').trigger("click");
        await flushPromises();

        expect(getTodayOperationListApiMock).toHaveBeenCalledTimes(1);
    });

    it("Sort: sortState 반영 + page=1 + list 재조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getTodayOperationListApiMock.mockClear();

        await wrapper.get('[data-test="emit-sort"]').trigger("click");
        await flushPromises();

        const params = lastListParams();
        expect(params.page).toBe(1);
        expect(params.sort).toEqual({ sortBy: "reservationCode", direction: "DESC" });
    });

    it("Page change: 해당 page로 list 재조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getTodayOperationListApiMock.mockClear();

        await wrapper.get('[data-test="emit-page"]').trigger("click");
        await flushPromises();

        const params = lastListParams();
        expect(params.page).toBe(3);
    });

    it("Row click: 권한 통과 + customerCode 있으면 사유 모달 오픈", async () => {
        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(false);

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(withPermissionMock).toHaveBeenCalledTimes(1);
        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(true);
    });

    it("Row click: customerCode 없으면 사유 모달 오픈 안 함", async () => {
        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click-no-customer"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(false);
    });

    it("사유 confirm: getCustomerBasicApi(customerCode, reason) 호출 + 고객 모달 오픈", async () => {
        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        await wrapper.get('[data-test="reason-confirm"]').trigger("click");
        await flushPromises();

        expect(getCustomerBasicApiMock).toHaveBeenCalledTimes(1);
        expect(getCustomerBasicApiMock).toHaveBeenCalledWith(777, "테스트사유");

        expect(wrapper.find('[data-test="customer-modal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="customer-name"]').text()).toBe("홍길동");
    });

    it("고객 조회 실패: alert 호출", async () => {
        getCustomerBasicApiMock.mockRejectedValueOnce(new Error("fail"));

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        await wrapper.get('[data-test="reason-confirm"]').trigger("click");
        await flushPromises();

        expect(globalThis.alert).toHaveBeenCalledTimes(1);
    });

    it("체크인 버튼: CHECKIN_PLANNED면 버튼 노출 + press 시 CheckInModal 오픈", async () => {
        const wrapper = mountPage();
        await flushPromises();

        // ListViewStub이 첫 row의 cell-action 슬롯을 렌더함 → BaseButtonStub이 버튼으로 렌더됨
        const btn = wrapper.get('[data-test="cell-action"] [data-test="basebutton"]');
        await btn.trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="checkin-modal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="checkin-reservation"]').text()).toBe("1001");
    });

    it("체크아웃 버튼: STAYING이면 checkout 버튼 흐름 + stayCode 없으면 alert", async () => {
        // STAYING + stayCode 누락 케이스로 응답 바꿈
        getTodayOperationListApiMock.mockResolvedValueOnce({
            data: {
                data: {
                    content: [
                        {
                            reservationCode: 2002,
                            customerCode: 1,
                            customerName: "A",
                            operationStatus: "STAYING",
                            stayCode: null, // 누락
                        },
                    ],
                    totalElements: 1,
                },
            },
        });

        const wrapper = mountPage();
        await flushPromises();

        const btn = wrapper.get('[data-test="cell-action"] [data-test="basebutton"]');
        await btn.trigger("click");
        await flushPromises();

        expect(globalThis.alert).toHaveBeenCalledTimes(1);
        expect(wrapper.find('[data-test="checkout-modal"]').exists()).toBe(false);
    });

    it("권한 실패: row click 해도 사유모달 안 열린다", async () => {
        withPermissionMock.mockImplementationOnce((_perm, _cb) => {}); // 콜백 미실행

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(false);
    });
});
