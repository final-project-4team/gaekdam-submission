import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ActivityAllView  from "@/views/activity/view/ActivityAllView.vue";


const withPermissionMock = vi.fn((_perms, cb) => cb());
vi.mock("@/composables/usePermissionGuard", () => ({
    usePermissionGuard: () => ({ withPermission: withPermissionMock }),
}));

const getOperationBoardApiMock = vi.fn();
vi.mock("@/api/reservation/operationApi.js", () => ({
    getOperationBoardApi: (...args) => getOperationBoardApiMock(...args),
}));

const getPropertyListByHotelGroupApiMock = vi.fn();
vi.mock("@/api/property/propertyApi.js", () => ({
    getPropertyListByHotelGroupApi: (...args) => getPropertyListByHotelGroupApiMock(...args),
}));

/** -----------------------------
 * stubs (UI 컴포넌트 단순화)
 * ----------------------------- */
const ListViewStub = {
    name: "ListView",
    props: [
        "columns",
        "rows",
        "total",
        "page",
        "pageSize",
        "filters",
        "searchTypes",
        "detail",
    ],
    emits: [
        "search",
        "filter",
        "sort-change",
        "page-change",
        "row-click",
        "detail-reset",
        "update:detail",
    ],
    template: `
    <div data-test="listview">
      <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>

      <!-- slot: cell-status (첫 행만 렌더링) -->
      <div data-test="cell-status">
        <template v-if="rows && rows.length">
          <slot name="cell-status" :row="rows[0]"></slot>
        </template>
      </div>

      <!-- slot: detail-form -->
      <div data-test="detail-form">
        <slot name="detail-form"></slot>
      </div>

      <!-- events -->
      <button data-test="emit-search-reservation" @click="$emit('search',{ key:'RESERVATION_NO', value:'123' })">search-reservation</button>
      <button data-test="emit-search-customer" @click="$emit('search',{ key:'CUSTOMER_NAME', value:'김철수' })">search-customer</button>
      <button data-test="emit-filter" @click="$emit('filter',{ propertyCode:'P1', status:'STAYING' })">filter</button>
      <button data-test="emit-sort" @click="$emit('sort-change',{ sortBy:'reservationNo', direction:'ASC' })">sort</button>
      <button data-test="emit-page" @click="$emit('page-change',3)">page</button>
      <button data-test="emit-row-click" @click="$emit('row-click',{ reservationNo: 1001 })">row</button>
      <button data-test="emit-detail-update" @click="$emit('update:detail',{ customerName:'김철수', reservationNo:'' })">detail-update</button>
      <button data-test="emit-detail-reset" @click="$emit('detail-reset')">detail-reset</button>
    </div>
  `,
};

const ActivityDetailModalStub = {
    name: "ActivityDetailModal",
    props: ["reservationCode", "reason"],
    emits: ["close"],
    template: `
    <div data-test="activity-detail-modal">
      <div data-test="detail-reservation">{{ reservationCode }}</div>
      <div data-test="detail-reason">{{ reason }}</div>
      <button data-test="detail-close" @click="$emit('close')">close</button>
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
    return mount(ActivityAllView, {
        global: {
            stubs: {
                ListView: ListViewStub,
                ActivityDetailModal: ActivityDetailModalStub,
                ReasonRequestModal: ReasonRequestModalStub,
            },
        },
    });
}

const lastOpParams = () => getOperationBoardApiMock.mock.calls.at(-1)?.[0];

beforeEach(() => {
    vi.clearAllMocks();

    getPropertyListByHotelGroupApiMock.mockResolvedValue({
        data: {
            data: [
                { propertyName: "강남점", propertyCode: "P1" },
                { propertyName: "해운대점", propertyCode: "P2" },
            ],
        },
    });

    getOperationBoardApiMock.mockResolvedValue({
        data: {
            data: {
                content: [
                    {
                        reservationCode: 1001,
                        propertyName: "강남점",
                        customerName: "홍길동",
                        roomType: "디럭스",
                        plannedCheckinDate: "2026-02-01",
                        plannedCheckoutDate: "2026-02-02",
                        operationStatus: "RESERVED",
                    },
                ],
                totalElements: 1,
            },
        },
    });
});

describe("ActivityAllPage UI/UX unit", () => {
    it("초기 로딩: 지점목록 호출 후 운영보드 호출 + rows 매핑 + status 라벨/색상 렌더", async () => {
        const wrapper = mountPage();
        await flushPromises();

        expect(getPropertyListByHotelGroupApiMock).toHaveBeenCalledTimes(1);
        expect(getOperationBoardApiMock).toHaveBeenCalledTimes(1);

        expect(wrapper.get('[data-test="rows-count"]').text()).toBe("1");

        // RESERVED -> '예약중' 매핑 + color(#111827)
        const statusEl = wrapper.get('[data-test="cell-status"] .status-text');
        expect(statusEl.text()).toBe("예약중");
        expect(statusEl.attributes("style")).toContain("color: rgb"); // 환경별 변환 대비
    });

    it("검색(예약번호): page=1 리셋 + detail.reservationCode(Number)로 조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getOperationBoardApiMock.mockClear();

        await wrapper.get('[data-test="emit-search-reservation"]').trigger("click");
        await flushPromises();

        expect(getOperationBoardApiMock).toHaveBeenCalledTimes(1);
        const params = lastOpParams();

        expect(params.page).toBe(1);
        expect(params.detail.reservationCode).toBe(123);
    });

    it("필터: filters.propertyCode/status로 조회 + page=1 리셋", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getOperationBoardApiMock.mockClear();

        await wrapper.get('[data-test="emit-filter"]').trigger("click");
        await flushPromises();

        const params = lastOpParams();
        expect(params.page).toBe(1);
        expect(params.filters).toEqual({ propertyCode: "P1", status: "STAYING" });
    });

    it("정렬: sort 객체가 그대로 API sort로 전달", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getOperationBoardApiMock.mockClear();

        await wrapper.get('[data-test="emit-sort"]').trigger("click");
        await flushPromises();

        const params = lastOpParams();
        expect(params.sort).toEqual({ sortBy: "reservationNo", direction: "ASC" });
    });

    it("페이지 이동: page-change 발생 시 해당 page로 조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getOperationBoardApiMock.mockClear();

        await wrapper.get('[data-test="emit-page"]').trigger("click");
        await flushPromises();

        const params = lastOpParams();
        expect(params.page).toBe(3);
    });

    it("row-click: 권한 통과 시 사유 모달이 열린다", async () => {
        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(false);

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(true);
        expect(withPermissionMock).toHaveBeenCalledTimes(1);
    });

    it("사유 confirm: ActivityDetailModal 열리고 reservationCode + reason 전달, 사유모달 닫힘", async () => {
        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        await wrapper.get('[data-test="reason-confirm"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(false);

        const detail = wrapper.get('[data-test="activity-detail-modal"]');
        expect(detail.get('[data-test="detail-reservation"]').text()).toBe("1001");
        expect(detail.get('[data-test="detail-reason"]').text()).toBe("테스트사유");
    });

    it("권한 실패: row-click 해도 사유 모달이 안 열린다", async () => {
        withPermissionMock.mockImplementationOnce((_perms, _cb) => {}); // 콜백 미실행

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="reason-modal"]').exists()).toBe(false);
    });

    it("상세검색 v-model 변경: watch 트리거로 page=1 리셋 + detail.customerName로 재조회", async () => {
        const wrapper = mountPage();
        await flushPromises();
        getOperationBoardApiMock.mockClear();

        await wrapper.get('[data-test="emit-detail-update"]').trigger("click");
        await flushPromises();

        expect(getOperationBoardApiMock).toHaveBeenCalledTimes(1);

        const params = lastOpParams();
        expect(params.page).toBe(1);
        expect(params.detail.customerName).toBe("김철수");
        expect(params.detail.reservationCode).toBe(null);
    });

    it("detail-reset: 상세/기본검색 초기화 + page=1 + 전체 재조회(reservationCode null)", async () => {
        const wrapper = mountPage();
        await flushPromises();

        // 먼저 기본검색(예약번호)로 reservationCode를 만들어둠
        await wrapper.get('[data-test="emit-search-reservation"]').trigger("click");
        await flushPromises();

        getOperationBoardApiMock.mockClear();

        // reset
        await wrapper.get('[data-test="emit-detail-reset"]').trigger("click");
        await flushPromises();

        const params = lastOpParams();
        expect(params.page).toBe(1);
        expect(params.detail.customerName).toBe(null);
        expect(params.detail.reservationCode).toBe(null);
    });
});
