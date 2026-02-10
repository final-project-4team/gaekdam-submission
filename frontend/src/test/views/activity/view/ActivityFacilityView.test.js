import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ActivityFacilityView from "@/views/activity/view/ActivityFacilityView.vue";

/** -----------------------------
 * mocks (외부 의존성 차단)
 * ----------------------------- */
const withPermissionMock = vi.fn((_perm, cb) => cb());
vi.mock("@/composables/usePermissionGuard", () => ({
  usePermissionGuard: () => ({ withPermission: withPermissionMock }),
}));

const getPropertyListByHotelGroupApiMock = vi.fn();
vi.mock("@/api/property/propertyApi", () => ({
  getPropertyListByHotelGroupApi: (...args) => getPropertyListByHotelGroupApiMock(...args),
}));

const getTodayFacilityUsageSummaryApiMock = vi.fn();
const getFacilityUsageListApiMock = vi.fn();
vi.mock("@/api/facility/facilityUsageApi", () => ({
  getTodayFacilityUsageSummaryApi: (...args) => getTodayFacilityUsageSummaryApiMock(...args),
  getFacilityUsageListApi: (...args) => getFacilityUsageListApiMock(...args),
}));

const getCustomerBasicApiMock = vi.fn();
vi.mock("@/api/customer/customerApi", () => ({
  getCustomerBasicApi: (...args) => getCustomerBasicApiMock(...args),
}));

/** -----------------------------
 * stubs (UI 컴포넌트 단순화)
 * ----------------------------- */
const TodayFacilitySummaryStub = {
  name: "TodayFacilitySummary",
  props: ["summary", "active"],
  emits: ["select"],
  template: `
    <div data-test="facility-summary">
      <div data-test="active">{{ active }}</div>
      <button data-test="select-facility" @click="$emit('select', 10)">select</button>
      <button data-test="select-null" @click="$emit('select', null)">select-null</button>
    </div>
  `,
};

const ListViewStub = {
  name: "ListView",
  props: ["columns", "rows", "page", "pageSize", "total", "filters", "searchTypes"],
  emits: ["filter", "search", "sort-change", "page-change", "row-click"],
  template: `
    <div data-test="listview">
      <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>

      <!-- emit buttons -->
      <button data-test="emit-filter-empty" @click="$emit('filter',{ propertyCode:'' })">filter-empty</button>
      <button data-test="emit-filter-p2" @click="$emit('filter',{ propertyCode:'2' })">filter-p2</button>

      <button data-test="emit-search-name" @click="$emit('search',{ key:'customerName', value:'김철수' })">search-name</button>
      <button data-test="emit-search-stay" @click="$emit('search',{ key:'stayCode', value:'123' })">search-stay</button>
      <button data-test="emit-search-empty" @click="$emit('search',{ key:'customerName', value:'' })">search-empty</button>

      <button data-test="emit-sort" @click="$emit('sort-change',{ sortBy:'usageAt', direction:'ASC' })">sort</button>
      <button data-test="emit-page" @click="$emit('page-change', 3)">page</button>

      <button
        data-test="emit-row-click"
        @click="$emit('row-click', { customerCode: 777 })"
      >row</button>

      <button
        data-test="emit-row-click-no-customer"
        @click="$emit('row-click', { facilityUsageCode: 1 })"
      >row-no-customer</button>
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

function mountPage() {
  return mount(ActivityFacilityView, {
    global: {
      stubs: {
        ListView: ListViewStub,
        TodayFacilitySummary: TodayFacilitySummaryStub,
        CustomerBasicModal: CustomerBasicModalStub,
      },
    },
  });
}

const lastListParams = () => getFacilityUsageListApiMock.mock.calls.at(-1)?.[0];
const lastSummaryParams = () => getTodayFacilityUsageSummaryApiMock.mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.clearAllMocks();

  getPropertyListByHotelGroupApiMock.mockResolvedValue({
    data: { data: [{ propertyName: "강남점", propertyCode: 1 }, { propertyName: "해운대점", propertyCode: 2 }] },
  });

  getTodayFacilityUsageSummaryApiMock.mockResolvedValue({
    data: { data: [{ facilityCode: 10, facilityName: "수영장", count: 3 }] },
  });

  getFacilityUsageListApiMock.mockResolvedValue({
    data: {
      data: {
        content: [
          {
            facilityUsageCode: 1,
            customerCode: 777,
            customerName: "홍길동",
            usageAt: "2026-02-02 10:00",
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

describe("ActivityFacilityView UI/UX unit", () => {
  it("초기 로딩: 첫 지점 강제 세팅 → ready=true 후 summary/list 호출", async () => {
    const wrapper = mountPage();
    await flushPromises();

    // ready 이후 화면 렌더가 되는지(요소 존재로 간접 확인)
    expect(wrapper.find('[data-test="facility-summary"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="listview"]').exists()).toBe(true);

    expect(getPropertyListByHotelGroupApiMock).toHaveBeenCalledTimes(1);
    expect(getTodayFacilityUsageSummaryApiMock).toHaveBeenCalledTimes(1);
    expect(getFacilityUsageListApiMock).toHaveBeenCalledTimes(1);

    // 첫 지점(1)로 강제 → Number 변환되어 전달
    const params = lastListParams();
    expect(params.propertyCode).toBe(1);
  });

  it("필터: propertyCode ''(전체) 선택 시 첫 지점으로 강제하고 API 호출하지 않는다", async () => {
    const wrapper = mountPage();
    await flushPromises();

    getTodayFacilityUsageSummaryApiMock.mockClear();
    getFacilityUsageListApiMock.mockClear();

    await wrapper.get('[data-test="emit-filter-empty"]').trigger("click");
    await flushPromises();

    expect(getTodayFacilityUsageSummaryApiMock).toHaveBeenCalledTimes(0);
    expect(getFacilityUsageListApiMock).toHaveBeenCalledTimes(0);
  });

  it("필터: 지점 변경 시 activeFacilityCode 초기화 + page=1 + summary/list 재조회", async () => {
    const wrapper = mountPage();
    await flushPromises();

    getTodayFacilityUsageSummaryApiMock.mockClear();
    getFacilityUsageListApiMock.mockClear();

    await wrapper.get('[data-test="emit-filter-p2"]').trigger("click");
    await flushPromises();

    expect(getTodayFacilityUsageSummaryApiMock).toHaveBeenCalledTimes(1);
    expect(getFacilityUsageListApiMock).toHaveBeenCalledTimes(1);

    expect(lastSummaryParams()).toEqual({ propertyCode: "2" });

    const params = lastListParams();
    expect(params.page).toBe(1);
    expect(params.propertyCode).toBe(2); // Number("2") => 2
    expect(params.facilityCode).toBe(null); // activeFacilityCode 초기화
  });

  it("Summary 선택: facilityCode 설정 + page=1 + list 재조회", async () => {
    const wrapper = mountPage();
    await flushPromises();

    getFacilityUsageListApiMock.mockClear();

    await wrapper.get('[data-test="select-facility"]').trigger("click");
    await flushPromises();

    const params = lastListParams();
    expect(params.page).toBe(1);
    expect(params.facilityCode).toBe(10);
  });

  it("Search(고객명): detail.customerName 세팅 + page=1 + list 재조회", async () => {
    const wrapper = mountPage();
    await flushPromises();
    getFacilityUsageListApiMock.mockClear();

    await wrapper.get('[data-test="emit-search-name"]').trigger("click");
    await flushPromises();

    const params = lastListParams();
    expect(params.page).toBe(1);
    expect(params.detail.customerName).toBe("김철수");
    expect(params.detail.stayCode).toBe(null);
  });

  it("Search(투숙코드): detail.stayCode Number 변환 + page=1", async () => {
    const wrapper = mountPage();
    await flushPromises();
    getFacilityUsageListApiMock.mockClear();

    await wrapper.get('[data-test="emit-search-stay"]').trigger("click");
    await flushPromises();

    const params = lastListParams();
    expect(params.page).toBe(1);
    expect(params.detail.customerName).toBe(null);
    expect(params.detail.stayCode).toBe(123);
  });

  it("Search(빈값): detail 초기화 후 list 재조회", async () => {
    const wrapper = mountPage();
    await flushPromises();
    getFacilityUsageListApiMock.mockClear();

    await wrapper.get('[data-test="emit-search-empty"]').trigger("click");
    await flushPromises();

    expect(getFacilityUsageListApiMock).toHaveBeenCalledTimes(1);
  });

  it("Sort: sortState 반영 + page=1 + list 재조회", async () => {
    const wrapper = mountPage();
    await flushPromises();
    getFacilityUsageListApiMock.mockClear();

    await wrapper.get('[data-test="emit-sort"]').trigger("click");
    await flushPromises();

    const params = lastListParams();
    expect(params.page).toBe(1);
    expect(params.sort).toEqual({ sortBy: "usageAt", direction: "ASC" });
  });

  it("Page change: 해당 page로 list 재조회", async () => {
    const wrapper = mountPage();
    await flushPromises();
    getFacilityUsageListApiMock.mockClear();

    await wrapper.get('[data-test="emit-page"]').trigger("click");
    await flushPromises();

    const params = lastListParams();
    expect(params.page).toBe(3);
  });

  it("Row click: 권한 통과 + customerCode 있으면 고객 모달 오픈(getCustomerBasicApi 호출)", async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-test="customer-modal"]').exists()).toBe(false);

    await wrapper.get('[data-test="emit-row-click"]').trigger("click");
    await flushPromises();

    expect(withPermissionMock).toHaveBeenCalledTimes(1);
    expect(getCustomerBasicApiMock).toHaveBeenCalledTimes(1);
    expect(getCustomerBasicApiMock).toHaveBeenCalledWith(777);

    expect(wrapper.find('[data-test="customer-modal"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="customer-name"]').text()).toBe("홍길동");
  });

  it("Row click: customerCode 없으면 고객 조회/모달 오픈 안 함", async () => {
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('[data-test="emit-row-click-no-customer"]').trigger("click");
    await flushPromises();

    expect(getCustomerBasicApiMock).toHaveBeenCalledTimes(0);
    expect(wrapper.find('[data-test="customer-modal"]').exists()).toBe(false);
  });

  it("권한 실패: row click 해도 고객 조회/모달 오픈 안 함", async () => {
    withPermissionMock.mockImplementationOnce((_perm, _cb) => {}); // 콜백 미실행

    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('[data-test="emit-row-click"]').trigger("click");
    await flushPromises();

    expect(getCustomerBasicApiMock).toHaveBeenCalledTimes(0);
    expect(wrapper.find('[data-test="customer-modal"]').exists()).toBe(false);
  });

  it("property list가 빈 배열이면 ready=false 유지 → summary/list 호출 안 함", async () => {
    getPropertyListByHotelGroupApiMock.mockResolvedValueOnce({
      data: { data: [] },
    });

    const wrapper = mountPage();
    await flushPromises();

    // ready가 false라 summary/list 뷰가 렌더되지 않음
    expect(wrapper.find('[data-test="facility-summary"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="listview"]').exists()).toBe(false);

    expect(getTodayFacilityUsageSummaryApiMock).toHaveBeenCalledTimes(0);
    expect(getFacilityUsageListApiMock).toHaveBeenCalledTimes(0);
  });
});
