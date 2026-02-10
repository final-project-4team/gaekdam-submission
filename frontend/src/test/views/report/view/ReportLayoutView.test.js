import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ReportLayoutView from "@/views/report/ReportLayoutView.vue";
import { ref } from "vue";

// Composable 모킹: 확실한 경로 매칭을 위해 두 가지 경로 모두 모킹
vi.mock("@/composables/useReportLayouts", () => ({ useReportLayouts: vi.fn() }));
vi.mock("@/composables/useReportLayouts.js", () => ({ useReportLayouts: vi.fn() }));

import { useReportLayouts } from "@/composables/useReportLayouts";

// Auth 모킹
vi.mock("@/stores/authStore", () => ({ useAuthStore: () => ({ employeeCode: 99 }) }));
vi.mock("@/stores/authStore.js", () => ({ useAuthStore: () => ({ employeeCode: 99 }) }));

// 자식 컴포넌트 스텁
const ReportTopTabsStub = {
    name: "ReportTopTabs",
    props: ["layouts", "selectedIndex"],
    emits: ["create", "delete", "select"],
    template: `
      <div class="tabs-stub">
        <div class="layout-count">{{ layouts?.length || 0 }}</div>
        <button class="emit-select" @click="$emit('select', 1)">Select 1</button>
        <button class="emit-create" @click="$emit('create')">Create</button>
        <button class="emit-delete" @click="$emit('delete', layouts[selectedIndex])">Delete</button>
      </div>
    `,
};

const TemplateListStub = {
    name: "TemplateList",
    props: ["templates", "selectedIndex"],
    emits: ["add", "select", "delete"],
    template: `
      <div class="template-list-stub">
        <div class="template-count">{{ templates?.length || 0 }}</div>
        <button class="emit-add-tpl" @click="$emit('add')">Add Tpl</button>
        <button class="emit-sel-tpl" @click="$emit('select', 0)">Sel Tpl 0</button>
      </div>
    `,
};

const CreateLayoutModalStub = {
    name: "CreateLayoutModal",
    props: ["visible"],
    emits: ["create", "close"],
    template: `
      <div v-if="visible" class="create-layout-modal-stub">
        <button class="confirm-create" @click="$emit('create', { name: 'New Layout' })">Confirm</button>
      </div>
    `,
};

const CreateTemplateModalStub = {
    name: "CreateTemplateModal",
    props: ["visible"],
    emits: ["add", "close"],
    template: `
      <div v-if="visible" class="create-template-modal-stub">
        <button @click="$emit('add', { templateId: 1 })">Confirm</button>
      </div>
    `,
};

const ConfirmModalStub = {
    name: "ConfirmModal",
    props: ["visible", "title"],
    emits: ["confirm", "close"],
    template: `
      <div v-if="visible && title === '레이아웃 삭제'" class="delete-layout-modal-stub">
        <button @click="$emit('confirm')">Yes</button>
      </div>
    `,
};

// 동적 컴포넌트 스텁
const TemplateGridStub = { template: "<div>Grid</div>" };
const OPSTemplateGridStub = { template: "<div>OPS</div>" };
const CUSTTemplateGridStub = { template: "<div>CUST</div>" };

describe("ReportLayoutView UI/UX 단위 테스트", () => {
    let mockLayoutsHelper;

    beforeEach(() => {
        vi.clearAllMocks();

        // Ref로 감싸진 배열을 확실하게 반환하도록 설정
        mockLayoutsHelper = {
            layouts: ref([{ id: 10, name: "Default Layout", templates: [] }]),
            selectedIndex: ref(0),
            selectedTemplateIndex: ref(0),
            currentLayout: ref({ id: 10, name: "Default Layout", templates: [] }),
            selectedTemplate: ref([{ templateId: 1, widgets: [] }]),
            periodType: ref("연간"),
            years: ref([2025, 2026]),
            months: ref([1, 2]),
            selectedYear: ref(2026),
            selectedMonth: ref(1),
            loadLayouts: vi.fn(),
            loadTemplatesForLayout: vi.fn(),
            loadWidgetsForTemplate: vi.fn(),
            createLayout: vi.fn(),
            deleteLayout: vi.fn(),
            applyPeriodToLayout: vi.fn(),
            addTemplate: vi.fn(),
            deleteTemplate: vi.fn(),
        };

        useReportLayouts.mockReturnValue(mockLayoutsHelper);
    });

    it("초기 렌더링 시 레이아웃 목록을 로드하고 탑 탭을 표시한다", async () => {
        const wrapper = mount(ReportLayoutView, {
            global: {
                stubs: {
                    ReportTopTabs: ReportTopTabsStub,
                    TemplateList: TemplateListStub,
                    CreateLayoutModal: CreateLayoutModalStub,
                    CreateTemplateModal: CreateTemplateModalStub,
                    ConfirmModal: ConfirmModalStub,
                    TemplateGrid: TemplateGridStub,
                    OPSTemplateGrid: OPSTemplateGridStub,
                    CUSTTemplateGrid: CUSTTemplateGridStub,
                },
            },
        });

        await flushPromises();

        expect(mockLayoutsHelper.loadLayouts).toHaveBeenCalled();
        expect(wrapper.find(".layout-count").text()).toBe("1");
    });

    it("레이아웃 생성 모달을 열고 생성 이벤트를 처리한다", async () => {
        const wrapper = mount(ReportLayoutView, {
            global: {
                stubs: {
                    ReportTopTabs: ReportTopTabsStub,
                    CreateLayoutModal: CreateLayoutModalStub,
                    TemplateList: TemplateListStub,
                    TemplateGrid: TemplateGridStub,
                    ConfirmModal: ConfirmModalStub,
                    CreateTemplateModal: CreateTemplateModalStub,
                },
            },
        });

        await wrapper.find(".emit-create").trigger("click");
        await flushPromises();

        expect(wrapper.find(".create-layout-modal-stub").exists()).toBe(true);

        await wrapper.find(".confirm-create").trigger("click");
        await flushPromises();

        expect(mockLayoutsHelper.createLayout).toHaveBeenCalled();
    });

    it("레이아웃 삭제 확인 시 삭제 API를 호출한다", async () => {
        const wrapper = mount(ReportLayoutView, {
            global: {
                stubs: {
                    ReportTopTabs: ReportTopTabsStub,
                    CreateLayoutModal: CreateLayoutModalStub,
                    TemplateList: TemplateListStub,
                    TemplateGrid: TemplateGridStub,
                    ConfirmModal: ConfirmModalStub,
                    CreateTemplateModal: CreateTemplateModalStub,
                },
            },
        });

        await wrapper.find(".emit-delete").trigger("click");
        await flushPromises();

        expect(wrapper.find(".delete-layout-modal-stub").exists()).toBe(true);

        await wrapper.find(".delete-layout-modal-stub button").trigger("click");
        await flushPromises();

        expect(mockLayoutsHelper.deleteLayout).toHaveBeenCalledWith(10);
    });

    it("템플릿 리스트에서 추가 클릭 시 템플릿 추가 모달이 열린다", async () => {
        const wrapper = mount(ReportLayoutView, {
            global: {
                stubs: {
                    ReportTopTabs: ReportTopTabsStub,
                    CreateLayoutModal: CreateLayoutModalStub,
                    TemplateList: TemplateListStub,
                    TemplateGrid: TemplateGridStub,
                    ConfirmModal: ConfirmModalStub,
                    CreateTemplateModal: CreateTemplateModalStub,
                },
            },
        });

        await wrapper.find(".emit-add-tpl").trigger("click");
        await flushPromises();

        expect(wrapper.find(".create-template-modal-stub").exists()).toBe(true);

        await wrapper.find(".create-template-modal-stub button").trigger("click");
        await flushPromises();

        expect(mockLayoutsHelper.addTemplate).toHaveBeenCalled();
    });
});
