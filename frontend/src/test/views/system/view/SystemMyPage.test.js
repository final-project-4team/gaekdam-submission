import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MyPage from "@/views/myPage/MyPage.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */
const getMyPageMock = vi.fn();
const changePasswordMock = vi.fn();

vi.mock("@/api/setting/employeeApi.js", () => ({
    getMyPage: () => getMyPageMock(),
}));

vi.mock("@/api/system/myPageApi.js", () => ({
    changePassword: (...args) => changePasswordMock(...args),
}));

vi.mock("@/stores/authStore", () => ({
    useAuthStore: () => ({
        // Mock any store properties if accessed in future, currently seemingly unused in script logic
    }),
}));

/** -----------------------------
 *  stubs
 *  ----------------------------- */
const BaseButtonStub = {
    template: `<button @click="$emit('click')"><slot/></button>`
};

describe("MyPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.alert = vi.fn();

        // Default Mock Response
        getMyPageMock.mockResolvedValue({
            loginId: "user123",
            employeeName: "Hong Gildong",
            phoneNumber: "010-1234-5678",
            departmentName: "Marketing",
            email: "hong@test.com",
            hotelPositionName: "Manager",
            employeeStatus: "Active",
            employeeNumber: "EMP001",
            hiredAt: "2024-01-01T09:00:00",
            permissionName: "Admin"
        });
    });

    const mountComponent = () => {
        return mount(MyPage, {
            global: {
                stubs: {
                    BaseButton: BaseButtonStub
                }
            }
        });
    };

    it("초기 로딩: 내 정보 조회 API 호출 및 데이터 바인딩", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(getMyPageMock).toHaveBeenCalledTimes(1);

        // Verify ReadOnly Inputs
        const inputs = wrapper.findAll('input.read-only');

        // Name
        expect(inputs[0].element.value).toBe("Hong Gildong");
        // LoginId
        expect(inputs[1].element.value).toBe("user123");

        // Need to check specific bindings if order changes, but generally:
        const departmentInput = inputs.find(i => i.element.value === "Marketing");
        expect(departmentInput).toBeDefined();
    });

    it("날짜 포맷팅: hiriedAt 날짜가 YYYY-MM-DD 형태로 표시", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // hiredAt: "2024-01-01T09:00:00" -> "2024-01-01"
        const inputs = wrapper.findAll('input.read-only');
        const hiredAtInput = inputs.find(i => i.element.value === "2024-01-01");

        expect(hiredAtInput).toBeDefined();
    });

    it("비밀번호 변경: 입력값 누락 시 알림", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Click Change Password without input
        const changeBtn = wrapper.findComponent(BaseButtonStub);
        await changeBtn.trigger("click");

        expect(global.alert).toHaveBeenCalledWith("비밀번호를 입력해주세요.");
        expect(changePasswordMock).not.toHaveBeenCalled();
    });

    it("비밀번호 변경: 신규 비밀번호 불일치 시 알림 및 에러 표시", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        const vm = wrapper.vm;
        vm.passwordForm.currentPassword = "oldPass";
        vm.passwordForm.newPassword = "newPass";
        vm.passwordForm.confirmPassword = "differentPass";

        await wrapper.vm.$nextTick();

        // Check computed property or error message
        expect(vm.isPasswordMismatch).toBe(true);
        expect(wrapper.find('.error-text').exists()).toBe(true);

        // Try to submit
        const changeBtn = wrapper.findComponent(BaseButtonStub);
        await changeBtn.trigger("click");

        expect(global.alert).toHaveBeenCalledWith("새 비밀번호가 일치하지 않습니다.");
        expect(changePasswordMock).not.toHaveBeenCalled();
    });

    it("비밀번호 변경: 성공 시 API 호출 및 성공 알림", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Mock Success
        changePasswordMock.mockResolvedValue({ data: "비밀번호가 변경되었습니다." });

        const vm = wrapper.vm;
        vm.passwordForm.currentPassword = "oldPass";
        vm.passwordForm.newPassword = "newPass";
        vm.passwordForm.confirmPassword = "newPass";

        await wrapper.findComponent(BaseButtonStub).trigger("click");
        await flushPromises();

        expect(changePasswordMock).toHaveBeenCalledWith({
            currentPassword: "oldPass",
            newPassword: "newPass"
        });
        expect(global.alert).toHaveBeenCalledWith("비밀번호가 변경되었습니다.");

        // Form reset check
        expect(vm.passwordForm.currentPassword).toBe("");
    });

    it("비밀번호 변경: 실패 시 에러 알림", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        changePasswordMock.mockRejectedValue(new Error("Change Failed"));

        const vm = wrapper.vm;
        vm.passwordForm.currentPassword = "oldPass";
        vm.passwordForm.newPassword = "newPass";
        vm.passwordForm.confirmPassword = "newPass";

        await wrapper.findComponent(BaseButtonStub).trigger("click");
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith("비밀번호 변경 실패", expect.any(Error));
        expect(global.alert).toHaveBeenCalledWith("비밀번호 변경에 실패했습니다.");

        consoleSpy.mockRestore();
    });

    it("초기 로딩 실패: API 에러 시 콘솔 에러 출력", async () => {
        const wrapper = mountComponent();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        getMyPageMock.mockRejectedValue(new Error("Fetch Failed"));

        // re-mount to trigger onMounted again with rejected mock
        // or just mount new one
        const wrapperFail = mountComponent();
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith("내 정보 불러오기 실패", expect.any(Error));

        consoleSpy.mockRestore();
    });
});

