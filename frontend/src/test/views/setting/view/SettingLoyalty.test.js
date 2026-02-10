import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingLoyalty from "@/views/setting/SettingLoyalty.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */

// API mocks
const getLoyaltyGradeListMock = vi.fn();
const getLoyaltyGradeDetailMock = vi.fn();
const createLoyaltyGradeMock = vi.fn();
const updateLoyaltyGradeMock = vi.fn();
const deleteLoyaltyGradeMock = vi.fn();

vi.mock("@/api/setting/loyaltyGrade.js", () => ({
    getLoyaltyGradeList: (...args) => getLoyaltyGradeListMock(...args),
    getLoyaltyGradeDetail: (...args) => getLoyaltyGradeDetailMock(...args),
    createLoyaltyGrade: (...args) => createLoyaltyGradeMock(...args),
    updateLoyaltyGrade: (...args) => updateLoyaltyGradeMock(...args),
    deleteLoyaltyGrade: (...args) => deleteLoyaltyGradeMock(...args),
}));

// Permission mock
vi.mock("@/composables/usePermissionGuard", () => ({
    usePermissionGuard: () => ({
        withPermission: (_perm, cb) => cb(),
    }),
}));

/** -----------------------------
 *  stubs
 *  ----------------------------- */
const ListViewStub = {
    name: "ListView",
    props: ["columns", "rows", "filters"],
    emits: ["row-click", "filter"],
    template: `
    <div data-test="list-view">
        <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>
        
        <!-- Action Buttons Slot (Cell) -->
        <div v-if="rows && rows.length > 0" class="row-actions">
           <!-- Simulate cell-loyaltyGradeStatus scoped slot for the first row -->
           <slot name="cell-loyaltyGradeStatus" :row="rows[0]"></slot>
        </div>

        <button data-test="emit-row-click" @click="$emit('row-click', rows[0])">row-click</button>
        <button data-test="emit-filter" @click="$emit('filter', { status: 'ACTIVE' })">emit-filter</button>
    </div>
    `,
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
        <div class="footer">
            <slot name="footer"></slot>
        </div>
    </div>
    `,
};

const BaseButtonStub = {
    name: "BaseButton",
    props: ["type"],
    emits: ["click"],
    template: `
    <button class="base-btn" :class="type" @click="$emit('click')">
        <slot></slot>
    </button>
    `,
};

describe("SettingLoyalty", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.alert = vi.fn();
        global.confirm = vi.fn(() => true);

        // Reset API mocks
        getLoyaltyGradeDetailMock.mockReset();
        createLoyaltyGradeMock.mockReset();
        updateLoyaltyGradeMock.mockReset();
        deleteLoyaltyGradeMock.mockReset();

        // Default list response
        getLoyaltyGradeListMock.mockResolvedValue([
            {
                loyaltyGradeCode: 1,
                loyaltyGradeName: "Bronze",
                status: "ACTIVE",
                loyaltyTierLevel: 1
            },
            {
                loyaltyGradeCode: 2,
                loyaltyGradeName: "Silver",
                status: "INACTIVE",
                loyaltyTierLevel: 2
            }
        ]);
    });

    const mountComponent = () => {
        return mount(SettingLoyalty, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    BaseModal: BaseModalStub,
                    BaseButton: BaseButtonStub,
                },
            },
        });
    };

    it("초기 로딩: API 호출 후 리스트 데이터 바인딩", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(getLoyaltyGradeListMock).toHaveBeenCalledTimes(1);
        expect(wrapper.get('[data-test="rows-count"]').text()).toBe("2");
    });

    it("필터링: computed 속성이 필터 상태에 따라 반응한다", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(wrapper.vm.filteredLoyaltyList.length).toBe(2);

        // Emit filter event
        await wrapper.get('[data-test="emit-filter"]').trigger("click");
        await flushPromises();

        // Check if filter applied (only ACTIVE status should remain)
        // Mock data: Bronze (ACTIVE), Silver (INACTIVE)
        // If logic is correct, filtered length should be 1
        expect(wrapper.vm.filteredLoyaltyList.length).toBe(1);
        expect(wrapper.vm.filteredLoyaltyList[0].loyaltyGradeName).toBe("Bronze");
    });

    it("정책 추가 모달 열기: 입력 폼 초기화 확인", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // "로열티 정책 추가" 버튼 찾기 (top button-row)
        const addBtn = wrapper.findAll('.base-btn.primary').filter(b => b.text().includes('로열티 정책 추가'))[0];

        await addBtn.trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="modal-title"]').text()).toContain("로열티 정책 추가");

        // 폼 초기화 확인
        expect(wrapper.vm.newPolicy.loyaltyGradeName).toBe("");
        expect(wrapper.vm.isEditMode).toBe(false);
    });

    it("정책 수정: 수정 모달 열기 + 데이터 바인딩 + 업데이트 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Mock row for modification
        const mockRow = {
            loyaltyGradeCode: 1,
            loyaltyGradeName: "Bronze",
            loyaltyTierLevel: 1,
            loyaltyTierComment: "Basic",
            loyaltyCalculationAmount: 1000,
            loyaltyCalculationCount: 5,
            loyaltyCalculationTermMonth: 6,
            loyaltyCalculationRenewalDay: 1
        };

        // stub의 slot을 통해 렌더링 된 "수정" 버튼 찾기
        // ListViewStub가 row[0] (Bronze)를 slot으로 제공
        const editBtn = wrapper.findAll('.action-btn').filter(b => b.text() === "수정")[0];

        // Row 데이터 주입을 위해 editBtn 클릭 시 넘어가는 row가 mockRow와 같다고 가정하거나 
        // 실제로는 stub가 rows[0]을 넘기므로 getLoyaltyGradeListMock의 첫번째 요소가 사용됨.
        await editBtn.trigger("click");
        await flushPromises();

        expect(wrapper.vm.isEditMode).toBe(true);
        expect(wrapper.vm.newPolicy.loyaltyGradeName).toBe("Bronze");

        // 수정 사항 입력
        wrapper.vm.newPolicy.loyaltyGradeName = "Bronze Plus";

        // 저장 버튼 클릭 ("수정 완료")
        const saveBtn = wrapper.findAll('.footer-btn').filter(b => b.text().includes("수정 완료"))[0];
        await saveBtn.trigger("click");
        await flushPromises();

        expect(updateLoyaltyGradeMock).toHaveBeenCalledTimes(1);
        // payload verification (Types converted to Number)
        const payload = updateLoyaltyGradeMock.mock.calls[0][0];
        expect(payload.loyaltyGradeName).toBe("Bronze Plus");
        expect(typeof payload.loyaltyCalculationAmount).toBe("number");
    });

    it("정책 등록: 저장 버튼 클릭 시 생성 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Open Create Modal
        const addBtn = wrapper.findAll('.base-btn.primary').filter(b => b.text().includes('로열티 정책 추가'))[0];
        await addBtn.trigger("click");

        // Input Data
        wrapper.vm.newPolicy.loyaltyGradeName = "New Grade";
        wrapper.vm.newPolicy.loyaltyTierLevel = "2";

        // Save
        const saveBtn = wrapper.findAll('.footer-btn').filter(b => b.text() === "등록")[0];
        await saveBtn.trigger("click");
        await flushPromises();

        expect(createLoyaltyGradeMock).toHaveBeenCalledTimes(1);
        const payload = createLoyaltyGradeMock.mock.calls[0][0];
        expect(payload.loyaltyGradeName).toBe("New Grade");
        expect(payload.loyaltyTierLevel).toBe(2);
    });

    it("행 클릭: 상세 조회 API 호출 및 상세 모달 표시", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        getLoyaltyGradeDetailMock.mockResolvedValue({
            loyaltyGradeCode: 1,
            loyaltyGradeName: "Bronze Detail",
            loyaltyTierLevel: 1
        });

        // Trigger row click
        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(getLoyaltyGradeDetailMock).toHaveBeenCalledWith(1);
        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("로열티 정책 상세");
        expect(wrapper.text()).toContain("Bronze Detail");
    });

    it("정책 삭제: 확인 후 삭제 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Delete button in list
        const deleteBtn = wrapper.findAll('.action-btn').filter(b => b.text() === "삭제")[0];
        await deleteBtn.trigger("click");
        await flushPromises();

        expect(global.confirm).toHaveBeenCalled();
        expect(deleteLoyaltyGradeMock).toHaveBeenCalledWith(1);
        expect(global.alert).toHaveBeenCalledWith("정책이 비활성화되었습니다.");

        // Should refresh list
        expect(getLoyaltyGradeListMock).toHaveBeenCalledTimes(2); // Mounting + After delete
    });
    it("정책 삭제 실패: API 에러 발생 시 에러 로그 출력", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Spy on console.error
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Mock failure
        deleteLoyaltyGradeMock.mockRejectedValue(new Error("Network Error"));

        // Trigger delete
        const deleteBtn = wrapper.findAll('.action-btn').filter(b => b.text() === "삭제")[0];
        await deleteBtn.trigger("click");
        await flushPromises();

        expect(global.confirm).toHaveBeenCalled();
        expect(deleteLoyaltyGradeMock).toHaveBeenCalled();

        // Verify catch block execution
        expect(consoleSpy).toHaveBeenCalledWith('로열티 정책 비활성화 실패:', expect.any(Error));
        expect(global.alert).not.toHaveBeenCalledWith("정책이 비활성화되었습니다."); // Should not success alert

        consoleSpy.mockRestore();
    });

    it("정책 저장 실패: API 에러 발생 시 에러 로그 출력", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Spy on console.error
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Open Modal
        const addBtn = wrapper.findAll('.base-btn.primary').filter(b => b.text().includes('로열티 정책 추가'))[0];
        await addBtn.trigger("click");

        // Input
        wrapper.vm.newPolicy.loyaltyGradeName = "Fail Case";
        wrapper.vm.newPolicy.loyaltyTierLevel = "5";

        // Mock failure
        createLoyaltyGradeMock.mockRejectedValue(new Error("Server Error"));

        // Save
        const saveBtn = wrapper.findAll('.footer-btn').filter(b => b.text() === "등록")[0];
        await saveBtn.trigger("click");
        await flushPromises();

        expect(createLoyaltyGradeMock).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('로열티 정책 저장 실패:', expect.any(Error));
        expect(global.alert).not.toHaveBeenCalledWith(expect.stringContaining("[성공]"));

        consoleSpy.mockRestore();
    });
    it("모달 내부 삭제: deletePolicy 호출 시 deactivateLoyalty 로직 수행", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // 1. Open Detail Modal
        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);
        expect(wrapper.vm.selectedRow).not.toBeNull();

        // 2. Click "비활성화" button in modal footer
        // The modal footer has two buttons: "비활성화" (danger) and "확인" (primary)
        const deactivateBtn = wrapper.findAll('.modal-footer .base-btn').filter(b => b.text().includes('비활성화'))[0];
        expect(deactivateBtn).toBeDefined();

        await deactivateBtn.trigger("click");

        // Confirm dialog
        expect(global.confirm).toHaveBeenCalled();

        // 3. Verify delete API called
        expect(deleteLoyaltyGradeMock).toHaveBeenCalled();

        // 4. Verify modal closed (part of deactivateLoyalty success flow)
        await flushPromises();
        expect(wrapper.vm.showRowModal).toBe(false);
    });
});
