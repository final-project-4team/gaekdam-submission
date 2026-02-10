import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ReportTabsWrapper from "@/views/report/ReportTabsWrapper.vue";

const pushMock = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: pushMock }),
}));

// Stubs
const ContentTabsStub = {
    name: "ContentTabs",
    props: ["tabs"],
    template: `<div class="tabs-stub">{{ tabs.length }}</div>`
};
const BaseButtonStub = {
    name: "BaseButton",
    emits: ["click"],
    template: `<button class="base-btn" @click="$emit('click')"><slot/></button>`
};
const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
    <div class="modal-stub">
      <div class="title">{{ title }}</div>
      <button class="close-btn" @click="$emit('close')">x</button>
      <slot/>
    </div>`
};

describe("ReportTabsWrapper UI/UX 단위 테스트", () => {
    beforeEach(() => {
        pushMock.mockClear();
    });

    it("초기 렌더링 시 탭 목록을 표시하고 '+' 버튼이 있다", () => {
        const wrapper = mount(ReportTabsWrapper, {
            global: {
                stubs: {
                    ContentTabs: ContentTabsStub,
                    BaseButton: BaseButtonStub,
                    BaseModal: BaseModalStub
                }
            }
        });

        // 기본 탭 1개 ('문서')
        expect(wrapper.find(".tabs-stub").text()).toBe("1");
        expect(wrapper.find(".base-btn").text()).toBe("+");
    });

    it("+ 버튼 클릭 시 모달이 열리고, 생성 클릭 시 새 탭 추가 및 라우팅된다", async () => {
        const wrapper = mount(ReportTabsWrapper, {
            global: {
                stubs: {
                    ContentTabs: ContentTabsStub,
                    BaseButton: BaseButtonStub,
                    BaseModal: BaseModalStub
                }
            }
        });

        // + 버튼 클릭
        await wrapper.find(".base-btn").trigger("click");
        expect(wrapper.find(".modal-stub").exists()).toBe(true);

        // 입력 (생략 가능, 기본값 사용)
        const input = wrapper.find("input");
        await input.setValue("새 리포트");

        // 생성 버튼 (모달 내부의 BaseButton)
        // 모달 Stub 내부의 slot에 렌더링 된 BaseButton을 찾아야 함
        // BaseModalStub slot -> div -> BaseButton
        const modalBtn = wrapper.findAllComponents(BaseButtonStub)[1];
        // 0번은 +버튼, 1번은 생성 버튼

        await modalBtn.trigger("click");

        // 라우터 이동 확인
        expect(pushMock).toHaveBeenCalled();
        const callArgs = pushMock.mock.calls[0][0];
        expect(callArgs).toMatch(/^\/report\/layout\/\d+/);

        // 탭 추가 확인
        expect(wrapper.find(".tabs-stub").text()).toBe("2");
        expect(wrapper.find(".modal-stub").exists()).toBe(false);
    });
});
