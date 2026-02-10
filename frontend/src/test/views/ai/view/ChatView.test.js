import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChatView from "@/views/ai/ChatView.vue";

// API 모킹
vi.mock("@/api/ai", () => ({
    askChat: vi.fn(),
}));
import { askChat } from "@/api/ai";

describe("ChatView UI/UX 단위 테스트", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("초기 렌더링 시 메시지 목록은 비어있어야 한다", () => {
        const wrapper = mount(ChatView);
        const messages = wrapper.findAll(".messages > div");
        expect(messages.length).toBe(0);
    });

    it("텍스트 입력 후 전송 버튼을 누르면 메시지가 추가되고 API가 호출된다", async () => {
        askChat.mockResolvedValue({ answer: "안녕하세요" });

        const wrapper = mount(ChatView);
        const input = wrapper.find("input");
        const button = wrapper.find("button");

        // 사용자 입력
        await input.setValue("반가워");
        await button.trigger("submit"); // form submit 이벤트 트리거

        // 로딩 상태 및 사용자 메시지 추가 확인
        expect(wrapper.vm.messages).toContainEqual({ role: "user", text: "반가워" });

        // API 호출 기다림
        await flushPromises();

        // API 호출 확인
        expect(askChat).toHaveBeenCalledWith("반가워");

        // 봇 응답 확인
        expect(wrapper.vm.messages).toContainEqual({ role: "bot", text: "안녕하세요" });
    });

    it("입력값이 없으면 전송되지 않아야 한다", async () => {
        const wrapper = mount(ChatView);
        const button = wrapper.find("button");

        await button.trigger("click"); // 버튼 클릭 (submit)

        // 메시지 변화 없음
        expect(wrapper.vm.messages.length).toBe(0);
        expect(askChat).not.toHaveBeenCalled();
    });

    it("API 에러 발생 시 에러 메시지가 표시되어야 한다", async () => {
        askChat.mockRejectedValue(new Error("API 오류"));

        const wrapper = mount(ChatView);
        const input = wrapper.find("input");

        await input.setValue("에러 테스트");
        await wrapper.find("form").trigger("submit");

        await flushPromises();

        // 에러 메시지 확인
        const messages = wrapper.findAll(".messages > div");
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.text()).toContain("Error: API 오류");
    });
});
