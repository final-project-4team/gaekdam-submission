import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";

import CustomerBasicModal from "@/views/activity/modal/CustomerBasicModal.vue";

const BaseModalStub = {
    name: "BaseModal",
    props: ["title", "width"],
    emits: ["close"],
    template: `
    <div data-test="basemodal">
      <div data-test="modal-title">{{ title }}</div>
      <div data-test="modal-width">{{ width }}</div>
      <button data-test="modal-x" @click="$emit('close')">x</button>
      <slot></slot>
      <div data-test="footer"><slot name="footer"></slot></div>
    </div>
  `,
};

const BaseButtonStub = {
    name: "BaseButton",
    emits: ["click"],
    template: `<button data-test="basebutton" @click="$emit('click')"><slot/></button>`,
};

function mountPage(customer = { customerName: "홍길동", phoneNumber: "01011112222" }) {
    return mount(CustomerBasicModal, {
        props: { customer },
        global: {
            stubs: {
                BaseModal: BaseModalStub,
                BaseButton: BaseButtonStub,
            },
        },
    });
}

describe("CustomerBasicModal UI/UX unit", () => {
    it("기본 렌더: 제목/width/고객명/포맷된 전화번호가 표시된다", () => {
        const wrapper = mountPage();

        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("고객 정보");
        expect(wrapper.get('[data-test="modal-width"]').text()).toBe("420px");

        expect(wrapper.text()).toContain("홍길동");
        expect(wrapper.text()).toContain("010-1111-2222");
    });

    it("전화번호가 없으면 '-'가 표시된다", () => {
        const wrapper = mountPage({ customerName: "홍길동", phoneNumber: "" });
        expect(wrapper.text()).toContain("-");
    });

    it("확인 버튼 클릭 시 close emit 된다", async () => {
        const wrapper = mountPage();

        await wrapper.get('[data-test="basebutton"]').trigger("click");

        expect(wrapper.emitted("close")).toBeTruthy();
        expect(wrapper.emitted("close").length).toBe(1);
    });

    it("x 닫기 클릭 시 close emit 된다", async () => {
        const wrapper = mountPage();

        await wrapper.get('[data-test="modal-x"]').trigger("click");

        expect(wrapper.emitted("close")).toBeTruthy();
        expect(wrapper.emitted("close").length).toBe(1);
    });
});
