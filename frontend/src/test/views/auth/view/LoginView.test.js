import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginView from "@/views/auth/LoginView.vue";

// Mock router
const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: pushMock, replace: replaceMock }),
    useRoute: () => ({ query: {} }),
}));

// Mock authStore
const loginMock = vi.fn();
vi.mock("@/stores/authStore", () => ({
    useAuthStore: () => ({
        login: loginMock,
    }),
}));

// Stub BaseButton
const BaseButtonStub = {
    name: "BaseButton",
    props: ["loading", "disabled"],
    template: `<button @click="$emit('click')" :disabled="disabled"><slot/></button>`,
};

describe("LoginView UI/UX 단위 테스트", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("초기 렌더링 시 입력 필드가 비어있어야 한다", () => {
        const wrapper = mount(LoginView, {
            global: { stubs: { BaseButton: BaseButtonStub } }
        });

        const inputs = wrapper.findAll("input");
        expect(inputs[0].element.value).toBe("");
        expect(inputs[1].element.value).toBe("");
        expect(wrapper.find(".error").exists()).toBe(false);
    });

    it("아이디와 비밀번호 입력 후 로그인 성공 시 리다이렉트 된다", async () => {
        loginMock.mockResolvedValue({ success: true });

        const wrapper = mount(LoginView, {
            global: { stubs: { BaseButton: BaseButtonStub } }
        });

        const [idInput, pwInput] = wrapper.findAll("input");
        await idInput.setValue("testUser");
        await pwInput.setValue("password123");

        await wrapper.findComponent(BaseButtonStub).trigger("click");

        await flushPromises();

        expect(loginMock).toHaveBeenCalledWith({
            loginId: "testUser",
            password: "password123"
        });
        expect(replaceMock).toHaveBeenCalledWith("/");
    });

    it("로그인 실패 시 에러 메시지가 표시된다", async () => {
        loginMock.mockResolvedValue({ success: false, message: "로그인 실패" });

        const wrapper = mount(LoginView, {
            global: { stubs: { BaseButton: BaseButtonStub } }
        });

        const [idInput, pwInput] = wrapper.findAll("input");
        await idInput.setValue("failUser");
        await pwInput.setValue("wrongPw");

        await wrapper.find("button").trigger("click");
        await flushPromises();

        expect(wrapper.find(".error").text()).toBe("로그인 실패");
        expect(replaceMock).not.toHaveBeenCalled();
    });
});
