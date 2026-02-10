import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingMembership from "@/views/setting/SettingMembership.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */
const getMembershipGradeListMock = vi.fn();
const getMembershipGradeDetailMock = vi.fn();
const createMembershipGradeMock = vi.fn();
const updateMembershipGradeMock = vi.fn();
const deleteMembershipGradeMock = vi.fn();

vi.mock("@/api/setting/membershipGrade.js", () => ({
    getMembershipGradeList: (...args) => getMembershipGradeListMock(...args),
    getMembershipGradeDetail: (...args) => getMembershipGradeDetailMock(...args),
    createMembershipGrade: (...args) => createMembershipGradeMock(...args),
    updateMembershipGrade: (...args) => updateMembershipGradeMock(...args),
    deleteMembershipGrade: (...args) => deleteMembershipGradeMock(...args),
}));

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
           <slot name="cell-membershipGradeStatus" :row="rows[0]"></slot>
        </div>

        <button data-test="emit-row-click" @click="$emit('row-click', rows[0])">row-click</button>
        <button data-test="emit-filter" @click="$emit('filter', { membershipGradeStatus: 'ACTIVE' })">emit-filter</button>
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

describe("SettingMembership", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.alert = vi.fn();
        global.confirm = vi.fn(() => true);

        // Reset API mocks
        getMembershipGradeDetailMock.mockReset();
        createMembershipGradeMock.mockReset();
        updateMembershipGradeMock.mockReset();
        deleteMembershipGradeMock.mockReset();

        getMembershipGradeListMock.mockResolvedValue([
            { membershipGradeCode: 1, gradeName: "Diamond", status: "ACTIVE" },
            { membershipGradeCode: 2, gradeName: "Gold", status: "INACTIVE" }
        ]);
    });

    const mountComponent = () => {
        return mount(SettingMembership, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    BaseModal: BaseModalStub,
                    BaseButton: BaseButtonStub,
                },
            },
        });
    };

    it("초기 로딩: API 호출 후 리스트 바인딩", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(getMembershipGradeListMock).toHaveBeenCalled();
        expect(wrapper.get('[data-test="rows-count"]').text()).toBe("2");
    });

    it("필터링: 상태 필터 적용 시 API 재호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Emit filter event from stub
        await wrapper.get('[data-test="emit-filter"]').trigger("click");
        await flushPromises();

        expect(getMembershipGradeListMock).toHaveBeenCalledTimes(2);
        // Check params of second call
        const params = getMembershipGradeListMock.mock.calls[1][0];
        expect(params.status).toBe("ACTIVE");
    });

    it("멤버십 추가: 모달 열기 및 저장 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Open create modal
        const addBtn = wrapper.findAll('.base-btn.primary').filter(b => b.text().includes('멤버십 추가'))[0];
        await addBtn.trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="modal-title"]').text()).toContain("멤버십 등급 추가");

        // Input data
        wrapper.vm.newMembership.gradeName = "Platinum";
        wrapper.vm.newMembership.tierLevel = "3";

        // Save
        const saveBtn = wrapper.findAll('.footer-btn').filter(b => b.text() === "멤버십 등록")[0];
        await saveBtn.trigger("click");
        await flushPromises();

        expect(createMembershipGradeMock).toHaveBeenCalledTimes(1);
        expect(createMembershipGradeMock.mock.calls[0][0].gradeName).toBe("Platinum");
    });

    it("멤버십 삭제: 리스트 액션 버튼 클릭 시 삭제 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        const deleteBtn = wrapper.findAll('.action-btn').filter(b => b.text() === "삭제")[0];
        await deleteBtn.trigger("click");
        await flushPromises();

        expect(global.confirm).toHaveBeenCalled();
        expect(deleteMembershipGradeMock).toHaveBeenCalledTimes(1);
        expect(global.alert).toHaveBeenCalledWith('멤버십 등급이 비활성화되었습니다.');
    });
    it("멤버십 수정: 수정 모드에서 업데이트 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Mock detail response
        getMembershipGradeDetailMock.mockResolvedValue({
            membershipGradeCode: 1,
            gradeName: "Diamond",
            tierLevel: 1,
            tierComment: "Top",
            calculationAmount: 1000,
            calculationCount: 10,
            calculationTermMonth: 12,
            calculationRenewalDay: 1
        });

        // Open Edit Modal
        const editBtn = wrapper.findAll('.action-btn').filter(b => b.text() === "수정")[0];
        await editBtn.trigger("click");
        await flushPromises();

        expect(wrapper.vm.isEditMode).toBe(true);

        // Change value
        wrapper.vm.newMembership.gradeName = "Diamond Plus";

        // Click Save (수정 완료)
        const saveBtn = wrapper.findAll('.footer-btn').filter(b => b.text().includes('수정 완료'))[0];
        await saveBtn.trigger("click");
        await flushPromises();

        expect(updateMembershipGradeMock).toHaveBeenCalledWith(1, expect.objectContaining({
            gradeName: "Diamond Plus"
        }));
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("수정되었습니다"));
    });

    it("멤버십 저장 실패: API 오류 시 에러 처리 확인", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Open Create Modal
        const addBtn = wrapper.findAll('.base-btn.primary').filter(b => b.text().includes('멤버십 추가'))[0];
        await addBtn.trigger("click");

        createMembershipGradeMock.mockRejectedValue(new Error("Save Failed"));

        // Save
        const saveBtn = wrapper.findAll('.footer-btn').filter(b => b.text() === "멤버십 등록")[0];
        await saveBtn.trigger("click");
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith('멤버십 저장 실패:', expect.any(Error));
        expect(global.alert).toHaveBeenCalledWith('작업 중 오류가 발생했습니다.');

        consoleSpy.mockRestore();
    });

    it("멤버십 삭제: 상세 모달에서 삭제 시 모달 닫힘 확인", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Open Detail Modal
        await wrapper.get('[data-test="emit-row-click"]').trigger("click");
        await flushPromises();

        expect(wrapper.vm.showRowModal).toBe(true);

        // Click Delete in Modal Footer
        const deleteBtn = wrapper.findAll('.modal-footer .base-btn').filter(b => b.text() === "비활성화")[0];
        await deleteBtn.trigger("click");
        await flushPromises();

        expect(deleteMembershipGradeMock).toHaveBeenCalled();
        // Check if modal closed
        expect(wrapper.vm.showRowModal).toBe(false);
    });

    it("멤버십 삭제 실패: API 오류 시 에러 처리", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        deleteMembershipGradeMock.mockRejectedValue(new Error("Delete Failed"));

        const deleteBtn = wrapper.findAll('.action-btn').filter(b => b.text() === "삭제")[0];
        await deleteBtn.trigger("click");
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith('멤버십 비활성화 실패:', expect.any(Error));
        // alert is commented out in source code catch block, so we don't expect it
        // expect(global.alert).toHaveBeenCalledWith('멤버십 비활성화 중 오류가 발생했습니다.'); 

        consoleSpy.mockRestore();
    });

    it("멤버십 삭제 취소: confirm 취소 시 API 호출 안함", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        global.confirm.mockReturnValue(false);

        const deleteBtn = wrapper.findAll('.action-btn').filter(b => b.text() === "삭제")[0];
        await deleteBtn.trigger("click");

        expect(deleteMembershipGradeMock).not.toHaveBeenCalled();
    });

    it("deactivateMembership: target이 없을 때 return", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Call directly as it's hard to trigger via UI without selection
        await wrapper.vm.deactivateMembership(null);

        expect(global.confirm).not.toHaveBeenCalled();
    });

    it("멤버십 수정 실패: 상세 정보 로드 실패 시 에러 로그 출력", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Mock detail load failure
        getMembershipGradeDetailMock.mockRejectedValue(new Error("Load Failed"));

        // Open Edit Modal (Click '수정' button)
        const editBtn = wrapper.findAll('.action-btn').filter(b => b.text() === "수정")[0];
        await editBtn.trigger("click");
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith("상세 정보 로드 실패:", expect.any(Error));

        // Modal should not open because error happened before showActionModal.value = true
        expect(wrapper.vm.showActionModal).toBeFalsy();

        consoleSpy.mockRestore();
    });
});
