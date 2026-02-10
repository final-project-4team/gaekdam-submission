import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingObjective from "@/views/setting/SettingObjective.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */
const listKpiCodesMock = vi.fn();
const listByHotelGroupMock = vi.fn();
const createTargetMock = vi.fn();
const updateTargetMock = vi.fn();
const uploadExcelTemplateMock = vi.fn();
const downloadExcelTemplateMock = vi.fn();

vi.mock("@/api/report/targetApi.js", () => ({
    listKpiCodes: (...args) => listKpiCodesMock(...args),
    listByHotelGroup: (...args) => listByHotelGroupMock(...args),
    createTarget: (...args) => createTargetMock(...args),
    updateTarget: (...args) => updateTargetMock(...args),
    uploadExcelTemplate: (...args) => uploadExcelTemplateMock(...args),
    downloadExcelTemplate: (...args) => downloadExcelTemplateMock(...args),
}));

vi.mock("@/composables/usePermissionGuard", () => ({
    usePermissionGuard: () => ({
        withPermission: (_perm, cb) => cb(),
    }),
}));

const BaseButtonStub = {
    name: "BaseButton",
    props: ["type", "disabled"],
    emits: ["click"],
    template: `
    <button class="base-btn" :class="type" :disabled="disabled" @click="$emit('click')">
        <slot></slot>
    </button>
    `,
};

const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
    <div data-test="base-modal">
        <h1>{{ title }}</h1>
        <button data-test="modal-close" @click="$emit('close')">X</button>
        <slot></slot>
        <div class="footer"><slot name="footer"></slot></div>
    </div>
    `
};

describe("SettingObjective", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.alert = vi.fn();
        global.confirm = vi.fn(() => true);
        global.URL.createObjectURL = vi.fn(() => "blob:url");
        global.URL.revokeObjectURL = vi.fn();

        listKpiCodesMock.mockResolvedValue([
            { kpiCode: "KPI_001", kpiName: "Sales", unit: "KRW" },
            { kpiCode: "KPI_002", kpiName: "Occupancy", unit: "%" }
        ]);

        listByHotelGroupMock.mockResolvedValue({
            data: {
                data: []
            }
        });
    });

    const mountComponent = () => {
        return mount(SettingObjective, {
            global: {
                stubs: {
                    BaseButton: BaseButtonStub,
                    BaseModal: BaseModalStub
                }
            }
        });
    };

    /**
     * Period & Loading
     */
    it("기간 변경: MONTH 타입 변경 및 Date 선택 변경 시 API 재호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        listByHotelGroupMock.mockClear();

        // Change Period Type -> MONTH
        const typeSelect = wrapper.find('select.select-period');
        await typeSelect.setValue("MONTH");

        // Change Year
        const yearSelect = wrapper.find('.select-year');
        await yearSelect.setValue(2025);

        // Change Month
        const monthSelect = wrapper.find('.select-month');
        await monthSelect.setValue(5);

        await flushPromises();

        expect(listByHotelGroupMock).toHaveBeenCalled();
        expect(wrapper.vm.formattedPeriod).toBe("2025-05");
    });

    /**
     * Save Logic (Create / Update / Format)
     */
    it("목표값 저장 (Create): 콤마 제거 및 숫자 변환", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        const input = wrapper.findAll('input.kpi-input')[0];
        await input.setValue("2,000"); // With comma

        const saveBtn = wrapper.findAll('button').find(b => b.text().includes("저장"));
        await saveBtn.trigger("click");
        await flushPromises();

        expect(createTargetMock).toHaveBeenCalled();
        const payload = createTargetMock.mock.calls[0][0];
        expect(payload.targetValue).toBe(2000); // Converted
        expect(global.alert).toHaveBeenCalledWith("저장되었습니다.");
    });

    it("목표값 저장 (Update): 기존 데이터가 있을 경우 Update API 호출", async () => {
        // Setup existing data
        listByHotelGroupMock.mockResolvedValue({
            data: {
                data: [
                    { kpiCode: "KPI_001", targetId: 99, targetValue: 500, periodType: "YEAR", periodValue: String(new Date().getFullYear()) }
                ]
            }
        });

        const wrapper = mountComponent();
        await flushPromises();

        // Check initial value populated
        const input = wrapper.findAll('input.kpi-input')[0];
        expect(input.element.value).toBe("500.00"); // toFixed(2)

        // Change value
        await input.setValue("1500");

        const saveBtn = wrapper.findAll('button').find(b => b.text().includes("저장"));
        await saveBtn.trigger("click");
        await flushPromises();

        expect(updateTargetMock).toHaveBeenCalled();
        const args = updateTargetMock.mock.calls[0];
        expect(args[1]).toBe(99); // targetId
        expect(args[2]).toEqual({ targetValue: 1500 });
    });

    it("목표값 저장 에러 처리", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        createTargetMock.mockRejectedValue(new Error("Save Fail"));
        const saveBtn = wrapper.findAll('button').find(b => b.text().includes("저장"));
        await saveBtn.trigger("click");
        await flushPromises();

        expect(global.alert).toHaveBeenCalledWith("저장에 실패했습니다.");
    });

    /**
     * Reset
     */
    it("초기화: 취소 시 초기화 안됨", async () => {
        global.confirm = vi.fn(() => false); // Cancel
        const wrapper = mountComponent();
        await flushPromises();

        const input = wrapper.findAll('input.kpi-input')[0];
        await input.setValue("123");

        const resetBtn = wrapper.findAll('button').find(b => b.text().includes("초기화"));
        await resetBtn.trigger("click");

        expect(input.element.value).toBe("123");
    });

    it("초기화: 확인 시 입력 필드 초기화", async () => {
        global.confirm = vi.fn(() => true); // Confirm OK
        const wrapper = mountComponent();
        await flushPromises();

        const input = wrapper.findAll('input.kpi-input')[0];
        await input.setValue("123");

        const resetBtn = wrapper.findAll('button').find(b => b.text().includes("초기화"));
        await resetBtn.trigger("click");
        await flushPromises();

        expect(global.confirm).toHaveBeenCalled();
        expect(input.element.value).toBe("");
    });

    /**
     * Excel Export
     */
    it("엑셀 양식 다운로드 Success", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        downloadExcelTemplateMock.mockResolvedValue(new Blob(["data"]));

        const downloadBtn = wrapper.findAll('button').find(b => b.text().includes("양식다운로드"));
        await downloadBtn.trigger("click");
        await flushPromises();

        expect(downloadExcelTemplateMock).toHaveBeenCalled();
        expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it("엑셀 양식 다운로드 Fail", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        downloadExcelTemplateMock.mockRejectedValue(new Error("DL Fail"));

        const downloadBtn = wrapper.findAll('button').find(b => b.text().includes("양식다운로드"));
        await downloadBtn.trigger("click");
        await flushPromises();

        expect(global.alert).toHaveBeenCalledWith("양식 다운로드에 실패했습니다.");
    });

    /**
     * Excel Import
     */
    it("엑셀 입력 모달 오픈 및 파일 업로드 (Success)", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Open Modal
        const openBtn = wrapper.findAll('button').find(b => b.text().includes("엑셀입력"));
        await openBtn.trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);

        // Select File
        const fileInput = wrapper.find('input[type="file"]');
        const file = new File(["content"], "test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        Object.defineProperty(fileInput.element, 'files', { value: [file] });
        await fileInput.trigger('change');

        // Upload
        uploadExcelTemplateMock.mockResolvedValue({ created: 1, updated: 0, skipped: 0, errors: [] });
        const uploadBtn = wrapper.findAll('button').find(b => b.text() === "업로드");
        await uploadBtn.trigger("click");
        await flushPromises();

        expect(uploadExcelTemplateMock).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith("업로드가 완료되었습니다.");
        expect(wrapper.vm.showImportModal).toBe(false);
    });

    it("엑셀 업로드: 파일 미선택 시 경고", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        wrapper.vm.showImportModal = true;
        await flushPromises();

        const uploadBtn = wrapper.findAll('button').find(b => b.text() === "업로드");
        await uploadBtn.trigger("click");

        expect(global.alert).toHaveBeenCalledWith("파일 선택 필요");
        expect(uploadExcelTemplateMock).not.toHaveBeenCalled();
    });

    it("엑셀 업로드: 부분 실패(Errors) 응답 처리", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        wrapper.vm.showImportModal = true;
        wrapper.vm.importFile = new File([""], "test.xlsx");
        await flushPromises();

        uploadExcelTemplateMock.mockResolvedValue({
            created: 0, updated: 0, skipped: 1,
            errors: [{ row: 1, message: "Invalid Data" }]
        });

        const uploadBtn = wrapper.findAll('button').find(b => b.text() === "업로드");
        await uploadBtn.trigger("click");
        await flushPromises();

        expect(global.alert).toHaveBeenCalledWith("일부 항목에서 오류가 발생했습니다. 상세 정보를 확인하세요.");
        expect(wrapper.find('.import-result').exists()).toBe(true);
        expect(wrapper.text()).toContain("Invalid Data");
    });

    it("엑셀 업로드: API 에러(Exception) 처리", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        wrapper.vm.showImportModal = true;
        wrapper.vm.importFile = new File([""], "test.xlsx");
        await flushPromises();

        uploadExcelTemplateMock.mockRejectedValue(new Error("Upload Error"));

        const uploadBtn = wrapper.findAll('button').find(b => b.text() === "업로드");
        await uploadBtn.trigger("click");
        await flushPromises();

        expect(global.alert).toHaveBeenCalledWith("업로드 실패");
    });

    it("데이터 로딩 실패 처리 (KPI Meta)", async () => {
        listKpiCodesMock.mockRejectedValue(new Error("KPI Fail"));
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        mountComponent();
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith('failed to load KPI meta', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it("데이터 로딩 실패 처리 (Targets)", async () => {
        listByHotelGroupMock.mockRejectedValue(new Error("Target Fail"));

        mountComponent();
        await flushPromises();

        expect(global.alert).toHaveBeenCalledWith("목표값 불러오기에 실패했습니다.");
    });
});
