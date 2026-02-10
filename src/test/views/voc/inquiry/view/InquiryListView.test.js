// src/test/views/voc/inquiry/view/InquiryListView.test.js
import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import InquiryListView from "@/views/voc/inquiry/view/InquiryListView.vue";
import { getInquiryListApi } from "@/api/voc/inquiryApi.js";

vi.mock("@/api/voc/inquiryApi.js", () => ({
    getInquiryListApi: vi.fn(),
}));

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
        "showSearch",
        "showDetail",
    ],
    emits: [
        "search",
        "filter",
        "sort-change",
        "page-change",
        "detail-reset",
        "detail-apply",
        "row-click",
        "update:detail",
    ],
    template: `
      <div class="list-view-stub">
        <div class="meta">
          <div class="page">page: {{ page }}</div>
          <div class="total">total: {{ total }}</div>
        </div>

        <div class="detail-form"><slot name="detail-form" /></div>
        <div class="detail-footer"><slot name="detail-footer" /></div>

        <div class="rows">
          <div v-for="(r, i) in rows" :key="r.inquiryCode ?? i" class="row" @click="$emit('row-click', r)">
            <div v-for="c in columns" :key="c.key" class="cell">
              <slot :name="'cell-' + c.key" :row="r">
                {{ r[c.key] ?? '' }}
              </slot>
            </div>
          </div>
        </div>

        <button class="emit-search" @click="$emit('search', { key: 'TITLE', value: 'hello' })">emit-search</button>
        <button class="emit-filter" @click="$emit('filter', { status: 'IN_PROGRESS', inquiryCategoryCode: '2' })">emit-filter</button>
        <button class="emit-sort" @click="$emit('sort-change', { sortBy: 'createdAt', direction: 'ASC' })">emit-sort</button>
        <button class="emit-page" @click="$emit('page-change', 3)">emit-page</button>
        <button class="emit-detail-reset" @click="$emit('detail-reset')">emit-detail-reset</button>

        <button class="emit-update-detail"
                @click="$emit('update:detail', { fromDate:'2026-01-01', toDate:'2026-01-31', propertyCode:'1', inquiryCategoryCode:'1' })">
          emit-update-detail
        </button>
      </div>
    `,
};

const InquiryDetailModalStub = {
    name: "InquiryDetailModal",
    props: ["inquiryCode"],
    emits: ["close"],
    template: `<div class="inquiry-detail-modal-stub">InquiryDetailModal: {{ inquiryCode }}</div>`,
};

const mockPage = (overrides = {}) => ({
    data: {
        data: {
            content: [
                {
                    inquiryCode: 100,
                    createdAt: "2026-01-01T10:00:00",
                    customerName: "Kim",
                    inquiryTitle: "title-100",
                    inquiryCategoryName: "문의",
                    inquiryStatus: "IN_PROGRESS",
                    employeeName: "Lee",
                },
            ],
            totalElements: 1,
            ...overrides,
        },
    },
});

describe("InquiryListView", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("mount 시 기본 파라미터로 목록 API 호출하고 rows/total 세팅", async () => {
        getInquiryListApi.mockResolvedValueOnce(mockPage());

        const wrapper = mount(InquiryListView, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    InquiryDetailModal: InquiryDetailModalStub,
                    teleport: true,
                },
            },
        });

        await flushPromises();

        expect(getInquiryListApi).toHaveBeenCalledTimes(1);
        const params = getInquiryListApi.mock.calls[0][0];

        expect(params).toMatchObject({
            page: 1,
            size: 10,
            sortBy: "created_at",
            direction: "DESC",
            searchType: "ALL",
        });

        expect(wrapper.text()).toContain("title-100");
        expect(wrapper.text()).toContain("page: 1");
        expect(wrapper.text()).toContain("total: 1");
    });

    it("search 이벤트 오면 page=1로 리셋되고 keyword 포함해서 API 호출", async () => {
        getInquiryListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mount(InquiryListView, {
            global: { stubs: { ListView: ListViewStub, InquiryDetailModal: InquiryDetailModalStub, teleport: true } },
        });

        await flushPromises();

        await wrapper.find("button.emit-search").trigger("click");
        await flushPromises();

        const params = getInquiryListApi.mock.calls[1][0];
        expect(params).toMatchObject({ page: 1, searchType: "TITLE", keyword: "hello" });
    });

    it("filter 이벤트 오면 status/category 숫자 변환해서 API 호출", async () => {
        getInquiryListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mount(InquiryListView, {
            global: { stubs: { ListView: ListViewStub, InquiryDetailModal: InquiryDetailModalStub, teleport: true } },
        });

        await flushPromises();

        await wrapper.find("button.emit-filter").trigger("click");
        await flushPromises();

        const params = getInquiryListApi.mock.calls[1][0];
        expect(params).toMatchObject({ status: "IN_PROGRESS", inquiryCategoryCode: 2, searchType: "ALL" });
    });

    it("sort-change 이벤트 오면 createdAt -> created_at 매핑되어 API 호출", async () => {
        getInquiryListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mount(InquiryListView, {
            global: { stubs: { ListView: ListViewStub, InquiryDetailModal: InquiryDetailModalStub, teleport: true } },
        });

        await flushPromises();

        await wrapper.find("button.emit-sort").trigger("click");
        await flushPromises();

        const params = getInquiryListApi.mock.calls[1][0];
        expect(params).toMatchObject({ sortBy: "created_at", direction: "ASC" });
    });

    it("page-change 이벤트 오면 해당 페이지로 API 호출", async () => {
        getInquiryListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mount(InquiryListView, {
            global: { stubs: { ListView: ListViewStub, InquiryDetailModal: InquiryDetailModalStub, teleport: true } },
        });

        await flushPromises();

        await wrapper.find("button.emit-page").trigger("click");
        await flushPromises();

        const params = getInquiryListApi.mock.calls[1][0];
        expect(params).toMatchObject({ page: 3 });
    });

    it("detail v-model 업데이트 하면(디바운스 후) from/to/property/category 반영해서 API 호출", async () => {
        vi.useFakeTimers();

        getInquiryListApi
            .mockResolvedValueOnce(mockPage()) // mount 1회
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 })); // detail 변경 후 1회

        const wrapper = mount(InquiryListView, {
            global: { stubs: { ListView: ListViewStub, InquiryDetailModal: InquiryDetailModalStub, teleport: true } },
        });

        await flushPromises();

        await wrapper.find("button.emit-update-detail").trigger("click");

        vi.advanceTimersByTime(500);
        await flushPromises();

        expect(getInquiryListApi).toHaveBeenCalledTimes(2);

        const params = getInquiryListApi.mock.calls[1][0];
        expect(params).toMatchObject({
            page: 1,
            fromDate: "2026-01-01",
            toDate: "2026-01-31",
            propertyCode: 1,
            inquiryCategoryCode: 1,
        });
    });

    it("detail-reset 하면 초기 파라미터로 다시 API 호출", async () => {
        getInquiryListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mount(InquiryListView, {
            global: { stubs: { ListView: ListViewStub, InquiryDetailModal: InquiryDetailModalStub, teleport: true } },
        });

        await flushPromises();

        await wrapper.find("button.emit-detail-reset").trigger("click");
        await flushPromises();

        const params = getInquiryListApi.mock.calls[1][0];
        expect(params).toMatchObject({ page: 1, sortBy: "created_at", direction: "DESC", searchType: "ALL" });
        expect(params.keyword).toBeUndefined();
        expect(params.status).toBeUndefined();
        expect(params.propertyCode).toBeUndefined();
        expect(params.inquiryCategoryCode).toBeUndefined();
    });

    it("row-click 시 InquiryDetailModal 열리고 inquiryCode가 전달됨", async () => {
        getInquiryListApi.mockResolvedValueOnce(
            mockPage({
                content: [
                    {
                        inquiryCode: 777,
                        createdAt: "2026-01-01T10:00:00",
                        customerName: "Kim",
                        inquiryTitle: "open-modal",
                        inquiryCategoryName: "문의",
                        inquiryStatus: "IN_PROGRESS",
                        employeeName: "Lee",
                    },
                ],
                totalElements: 1,
            })
        );

        const wrapper = mount(InquiryListView, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    InquiryDetailModal: InquiryDetailModalStub,
                    teleport: true,
                },
            },
        });

        await flushPromises();

        const listView = wrapper.getComponent(ListViewStub);
        await listView.vm.$emit("row-click", { inquiryCode: 777 });
        await wrapper.vm.$nextTick();

        const modal = wrapper.findComponent(InquiryDetailModalStub);
        expect(modal.exists()).toBe(true);
        expect(modal.props("inquiryCode")).toBe(777);
    });
});
