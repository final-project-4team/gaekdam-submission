import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import IncidentListView from "@/views/voc/incident/view/IncidentListView.vue";
import { getIncidentListApi } from "@/api/voc/incidentApi.js";

vi.mock("@/api/voc/incidentApi.js", () => ({
    getIncidentListApi: vi.fn(),
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
        "showSearch",
    ],
    emits: ["search", "filter", "sort-change", "page-change", "row-click"],
    template: `
    <div class="listview-stub">
      <div class="meta">
        <div class="page">page: {{ page }}</div>
        <div class="total">total: {{ total }}</div>
      </div>

      <div class="rows">
        <div v-for="(r, i) in rows" :key="r.incidentCode ?? i" class="row"
             @click="$emit('row-click', r)">
          <slot name="cell-incidentCode" :row="r" />
          <slot name="cell-createdAt" :row="r" />
          <slot name="cell-inquiryCode" :row="r" />
          <slot name="cell-employee" :row="r" />
          <slot name="cell-incidentStatus" :row="r" />
          <slot name="cell-severity" :row="r" />
        </div>
      </div>

      <button class="emit-search-key" @click="$emit('search', { key:'TITLE', value:'hello' })">emit-search-key</button>
      <button class="emit-search-type" @click="$emit('search', { type:'EMPLOYEE_ID', value:'lee' })">emit-search-type</button>
      <button class="emit-search-searchType" @click="$emit('search', { searchType:'EMPLOYEE_NAME', keyword:'kim' })">emit-search-searchType</button>

      <button class="emit-filter" @click="$emit('filter', { status:'IN_PROGRESS', severity:'HIGH' })">emit-filter</button>
      <button class="emit-sort" @click="$emit('sort-change', { sortBy:'createdAt', direction:'ASC' })">emit-sort</button>
      <button class="emit-page" @click="$emit('page-change', 3)">emit-page</button>
    </div>
  `,
};

const BaseButtonStub = {
    name: "BaseButton",
    props: ["type", "size"],
    emits: ["click"],
    template: `<button data-test="base-btn" @click="$emit('click')"><slot /></button>`,
};

const IncidentDetailModalStub = {
    name: "IncidentDetailModal",
    props: ["incidentCode"],
    emits: ["close", "updated"],
    template: `<div class="detail-modal-stub">detail: {{ incidentCode }}</div>`,
};

const IncidentCreateModalStub = {
    name: "IncidentCreateModal",
    emits: ["close", "created"],
    template: `<div class="create-modal-stub">create</div>`,
};

const mockPage = (overrides = {}) => ({
    data: {
        data: {
            content: [
                {
                    incidentCode: 100,
                    createdAt: "2026-02-02T10:00:00",
                    incidentTitle: "title-100",
                    inquiryCode: 777,
                    employeeName: "Lee",
                    employeeLoginId: "lee01",
                    incidentStatus: "IN_PROGRESS",
                    severity: "HIGH",
                },
            ],
            totalElements: 1,
            ...overrides,
        },
    },
});

function mountPage() {
    return mount(IncidentListView, {
        global: {
            stubs: {
                ListView: ListViewStub,
                BaseButton: BaseButtonStub,
                IncidentDetailModal: IncidentDetailModalStub,
                IncidentCreateModal: IncidentCreateModalStub,
                teleport: true,
            },
        },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("IncidentListView UI/UX unit", () => {
    it("mount 시 기본 파라미터로 목록 API 호출 + rows/total 렌더", async () => {
        getIncidentListApi.mockResolvedValueOnce(mockPage());

        const wrapper = mountPage();
        await flushPromises();

        expect(getIncidentListApi).toHaveBeenCalledTimes(1);

        const params = getIncidentListApi.mock.calls[0][0];
        expect(params).toMatchObject({
            page: 1,
            size: 10,
            sortBy: "created_at",
            direction: "DESC",
            searchType: "ALL",
        });

        expect(wrapper.text()).toContain("page: 1");
        expect(wrapper.text()).toContain("total: 1");
    });

    it("search payload {key,value} 오면 page=1 + searchType/keyword 포함", async () => {
        getIncidentListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.find("button.emit-search-key").trigger("click");
        await flushPromises();

        const params = getIncidentListApi.mock.calls[1][0];
        expect(params).toMatchObject({
            page: 1,
            searchType: "TITLE",
            keyword: "hello",
        });
    });

    it("search payload {type,value} 오면 searchType로 적용", async () => {
        getIncidentListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.find("button.emit-search-type").trigger("click");
        await flushPromises();

        const params = getIncidentListApi.mock.calls[1][0];
        expect(params).toMatchObject({
            page: 1,
            searchType: "EMPLOYEE_ID",
            keyword: "lee",
        });
    });

    it("search payload {searchType,keyword} 오면 그대로 적용", async () => {
        getIncidentListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.find("button.emit-search-searchType").trigger("click");
        await flushPromises();

        const params = getIncidentListApi.mock.calls[1][0];
        expect(params).toMatchObject({
            page: 1,
            searchType: "EMPLOYEE_NAME",
            keyword: "kim",
        });
    });

    it("filter 이벤트 오면 status/severity 반영해서 API 호출", async () => {
        getIncidentListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.find("button.emit-filter").trigger("click");
        await flushPromises();

        const params = getIncidentListApi.mock.calls[1][0];
        expect(params).toMatchObject({
            page: 1,
            status: "IN_PROGRESS",
            severity: "HIGH",
            searchType: "ALL",
        });
    });

    it("sort-change 이벤트 오면 createdAt -> created_at 매핑 + ASC/DESC 정규화", async () => {
        getIncidentListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.find("button.emit-sort").trigger("click");
        await flushPromises();

        const params = getIncidentListApi.mock.calls[1][0];
        expect(params).toMatchObject({
            page: 1,
            sortBy: "created_at",
            direction: "ASC",
        });
    });

    it("page-change 이벤트 오면 해당 페이지로 API 호출", async () => {
        getIncidentListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.find("button.emit-page").trigger("click");
        await flushPromises();

        const params = getIncidentListApi.mock.calls[1][0];
        expect(params).toMatchObject({ page: 3 });
    });

    it("row-click 시 IncidentDetailModal 오픈 + incidentCode 전달", async () => {
        getIncidentListApi.mockResolvedValueOnce(
            mockPage({
                content: [
                    {
                        incidentCode: 777,
                        createdAt: "2026-02-02T10:00:00",
                        incidentTitle: "open-detail",
                        inquiryCode: null,
                        employeeName: null,
                        employeeLoginId: "lee01",
                        incidentStatus: "IN_PROGRESS",
                        severity: "LOW",
                    },
                ],
                totalElements: 1,
            })
        );

        const wrapper = mountPage();
        await flushPromises();

        const list = wrapper.getComponent(ListViewStub);
        await list.vm.$emit("row-click", { incidentCode: 777 });
        await wrapper.vm.$nextTick();

        const modal = wrapper.findComponent(IncidentDetailModalStub);
        expect(modal.exists()).toBe(true);
        expect(modal.props("incidentCode")).toBe(777);
    });

    it("row-click 연타 방지: 250ms 안에는 두 번째 클릭 무시", async () => {
        vi.useFakeTimers();

        getIncidentListApi.mockResolvedValueOnce(
            mockPage({
                content: [{ incidentCode: 111 }],
                totalElements: 1,
            })
        );

        const wrapper = mountPage();
        await flushPromises();

        const list = wrapper.getComponent(ListViewStub);

        await list.vm.$emit("row-click", { incidentCode: 111 });
        await wrapper.vm.$nextTick();

        await list.vm.$emit("row-click", { incidentCode: 222 });
        await wrapper.vm.$nextTick();

        // 두 번째는 무시 -> 여전히 111
        let modal = wrapper.findComponent(IncidentDetailModalStub);
        expect(modal.props("incidentCode")).toBe(111);

        vi.advanceTimersByTime(251);
        await wrapper.vm.$nextTick();

        await list.vm.$emit("row-click", { incidentCode: 222 });
        await wrapper.vm.$nextTick();

        modal = wrapper.findComponent(IncidentDetailModalStub);
        expect(modal.props("incidentCode")).toBe(222);
    });

    it("하단 '사건/사고 등록' 버튼 클릭 시 create 모달 오픈", async () => {
        getIncidentListApi.mockResolvedValueOnce(mockPage());

        const wrapper = mountPage();
        await flushPromises();

        const btn = wrapper
            .findAll('[data-test="base-btn"]')
            .find((b) => b.text().includes("사건/사고 등록"));

        await btn.trigger("click");
        await wrapper.vm.$nextTick();

        expect(wrapper.findComponent(IncidentCreateModalStub).exists()).toBe(true);
    });

    it("detail modal updated 이벤트 오면 목록 재조회(load)한다", async () => {
        getIncidentListApi
            .mockResolvedValueOnce(mockPage())
            .mockResolvedValueOnce(mockPage({ content: [], totalElements: 0 }));

        const wrapper = mountPage();
        await flushPromises();

        const list = wrapper.getComponent(ListViewStub);
        await list.vm.$emit("row-click", { incidentCode: 100 });
        await wrapper.vm.$nextTick();

        const modal = wrapper.findComponent(IncidentDetailModalStub);
        await modal.vm.$emit("updated");
        await flushPromises();

        expect(getIncidentListApi).toHaveBeenCalledTimes(2);
    });
});
