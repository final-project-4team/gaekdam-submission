import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ActivityTimelineView from "@/views/activity/view/ActivityTimelineView.vue";

/** -----------------------------
 * API mocks
 * ----------------------------- */
const getTimelineCustomerListApiMock = vi.fn();
const getCustomerStayListApiMock = vi.fn();
const getStayTimelineApiMock = vi.fn();

vi.mock("@/api/reservation/timelineApi", () => ({
    getTimelineCustomerListApi: (...args) => getTimelineCustomerListApiMock(...args),
    getCustomerStayListApi: (...args) => getCustomerStayListApiMock(...args),
    getStayTimelineApi: (...args) => getStayTimelineApiMock(...args),
}));

/** -----------------------------
 * stubs
 * ----------------------------- */
const ListViewStub = {
    name: "ListView",
    props: ["columns", "rows", "page", "pageSize", "total", "searchTypes"],
    emits: ["search", "row-click", "page-change"],
    template: `
    <div data-test="listview">
      <div data-test="customers-count">{{ rows?.length ?? 0 }}</div>

      <button data-test="emit-search" @click="$emit('search', { value: '홍' })">search</button>
      <button data-test="emit-page" @click="$emit('page-change', 2)">page</button>

      <button
        data-test="emit-row-click"
        @click="$emit('row-click', rows?.[0])"
      >row</button>
    </div>
  `,
};

const TableWithPagingStub = {
    name: "TableWithPaging",
    props: ["columns", "rows", "page", "pageSize", "total"],
    emits: ["row-click"],
    template: `
    <div data-test="stay-table">
      <div data-test="stays-count">{{ rows?.length ?? 0 }}</div>
      <button
        data-test="emit-stay-click"
        v-if="rows && rows.length"
        @click="$emit('row-click', rows[0])"
      >stay</button>
    </div>
  `,
};

function mountPage() {
    return mount(ActivityTimelineView, {
        global: {
            stubs: {
                ListView: ListViewStub,
                TableWithPaging: TableWithPagingStub,
            },
        },
    });
}

const lastCustomerParams = () => getTimelineCustomerListApiMock.mock.calls.at(-1)?.[0];
const lastStayListParams = () => getCustomerStayListApiMock.mock.calls.at(-1)?.[0];
const lastTimelineParams = () => getStayTimelineApiMock.mock.calls.at(-1)?.[0];

beforeEach(() => {
    vi.clearAllMocks();

    // 고객 목록
    getTimelineCustomerListApiMock.mockResolvedValue({
        data: {
            data: [
                { customerCode: 1, customerName: "홍길동", phone: "010-1111-2222" },
                { customerCode: 2, customerName: "홍영희", phone: "010-3333-4444" },
            ],
        },
    });

    // 투숙 목록
    getCustomerStayListApiMock.mockResolvedValue({
        data: {
            data: [
                {
                    stayCode: 101,
                    roomNumber: "1203",
                    actualCheckinAt: "2026-02-01 14:00",
                    actualCheckoutAt: "2026-02-02 11:00",
                    stayStatus: "COMPLETED",
                },
            ],
        },
    });

    // 타임라인
    getStayTimelineApiMock.mockResolvedValue({
        data: {
            data: {
                summary: { summaryText: "예약 → 체크인 → 시설이용 → 체크아웃" },
                events: [
                    {
                        eventType: "RESERVATION_CREATED",
                        occurredAt: "2026-02-01T01:00:00.000Z",
                        roomNumber: "1203",
                        count: 2,
                    },
                    { eventType: "CHECK_IN", occurredAt: "2026-02-01T05:00:00.000Z", channel: "FRONT" },
                    { eventType: "FACILITY_USAGE", occurredAt: "2026-02-01T06:00:00.000Z", facilityName: "수영장", count: 2 },
                    { eventType: "CHECK_OUT", occurredAt: "2026-02-02T01:00:00.000Z", channel: "FRONT" },
                ],
            },
        },
    });
});

describe("ActivityTimelineView UI/UX unit", () => {
    it("고객 검색: page=1 리셋 + 상태 초기화 후 고객 목록 조회(keyword 전달)", async () => {
        const wrapper = mountPage();

        // search 이벤트
        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();

        expect(getTimelineCustomerListApiMock).toHaveBeenCalledTimes(1);
        expect(lastCustomerParams()).toEqual({ keyword: "홍" });

        // 고객 리스트 반영
        expect(wrapper.get('[data-test="customers-count"]').text()).toBe("2");
    });

    it("페이지 변경: page 변경 후 고객 목록 재조회(기본 keyword='')", async () => {
        const wrapper = mountPage();

        // 먼저 한번 검색해서 고객이 생긴 상태로
        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();
        getTimelineCustomerListApiMock.mockClear();

        await wrapper.get('[data-test="emit-page"]').trigger("click");
        await flushPromises();

        expect(getTimelineCustomerListApiMock).toHaveBeenCalledTimes(1);
        // fetchCustomers() 호출 시 keyword 기본값 '' 사용
        expect(lastCustomerParams()).toEqual({ keyword: "" });
    });

    it("고객 선택: 투숙 목록 조회(customerCode 전달) + 투숙 섹션 렌더", async () => {
        const wrapper = mountPage();

        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(getCustomerStayListApiMock).toHaveBeenCalledTimes(1);
        expect(lastStayListParams()).toEqual({ customerCode: 1 });

        // 투숙 테이블 렌더
        expect(wrapper.find('[data-test="stay-table"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="stays-count"]').text()).toBe("1");
    });

    it("투숙 선택: 타임라인 조회(stayCode 전달) + 요약/이벤트 렌더", async () => {
        const wrapper = mountPage();

        // 고객 목록 로드 → 고객 선택 → 투숙 로드
        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();

        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        // 투숙 선택
        await wrapper.get('[data-test="emit-stay-click"]').trigger("click");
        await flushPromises();

        expect(getStayTimelineApiMock).toHaveBeenCalledTimes(1);
        expect(lastTimelineParams()).toEqual({ stayCode: 101 });

        // 타임라인 요약 텍스트 렌더 확인
        expect(wrapper.text()).toContain("예약 → 체크인 → 시설이용 → 체크아웃");

        // renderTitle 결과(예약/체크인/수영장/체크아웃) 일부 확인
        expect(wrapper.text()).toContain("예약");
        expect(wrapper.text()).toContain("체크인");
        expect(wrapper.text()).toContain("수영장");
        expect(wrapper.text()).toContain("체크아웃");

        // renderDesc 결과 확인
        expect(wrapper.text()).toContain("객실 1203호 · 2명");
        expect(wrapper.text()).toContain("2명 이용");
    });

    it("고객 재검색: 선택된 고객/투숙/타임라인 상태 초기화", async () => {
        const wrapper = mountPage();

        // 검색 → 고객선택 → 투숙선택(타임라인까지 띄움)
        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();
        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();
        await wrapper.get('[data-test="emit-stay-click"]').trigger("click");
        await flushPromises();

        // 타임라인이 떠있는 상태 확인
        expect(wrapper.text()).toContain("투숙 타임라인");

        // 다시 검색 → 상태 초기화되어 타임라인 섹션이 사라져야 함
        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();

        expect(wrapper.text()).not.toContain("투숙 타임라인");
    });

    it("타임라인 이벤트 타입 default: 알 수 없는 eventType이면 eventType 그대로 출력", async () => {
        getStayTimelineApiMock.mockResolvedValueOnce({
            data: {
                data: {
                    summary: { summaryText: "unknown" },
                    events: [{ eventType: "SOMETHING_NEW", occurredAt: "2026-02-01T00:00:00.000Z" }],
                },
            },
        });

        const wrapper = mountPage();
        await wrapper.get('[data-test="emit-search"]').trigger("click");
        await flushPromises();
        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();
        await wrapper.get('[data-test="emit-stay-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("SOMETHING_NEW");
    });
});
