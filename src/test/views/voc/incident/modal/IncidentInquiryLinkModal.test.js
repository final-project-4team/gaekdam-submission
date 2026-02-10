import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import IncidentInquiryLinkModal from "@/views/voc/incident/modal/IncidentInquiryLinkModal.vue";

/** -----------------------------
 *  stubs
 *  ----------------------------- */
const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
      <div data-test="basemodal">
        <div data-test="modal-title">{{ title }}</div>
        <button data-test="modal-close" @click="$emit('close')">x</button>
        <slot></slot>
      </div>
    `,
};

const BaseButtonStub = {
    name: "BaseButton",
    props: ["type", "size", "disabled"],
    emits: ["click"],
    template: `
      <button
          data-test="basebutton"
          :data-type="type"
          :data-size="size"
          :disabled="disabled"
          @click="$emit('click')"
      ><slot/></button>
    `,
};

function mountModal() {
    return mount(IncidentInquiryLinkModal, {
        global: {
            stubs: {
                BaseModal: BaseModalStub,
                BaseButton: BaseButtonStub,
            },
        },
    });
}

describe("IncidentInquiryLinkModal UI/UX unit", () => {
    it("초기 렌더: 타이틀 노출 + 검색 input은 disabled", async () => {
        const wrapper = mountModal();
        await flushPromises();

        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("문의 선택");

        const searchInput = wrapper.find('input[placeholder="문의번호/제목 검색 (준비중)"]');
        expect(searchInput.exists()).toBe(true);
        expect(searchInput.attributes("disabled")).toBeDefined();
    });

    it("수동 입력: 초기엔 선택 버튼 disabled", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const btn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("선택"));

        expect(btn.attributes("disabled")).toBeDefined();
    });

    it("수동 입력: 0/음수/빈값이면 pick emit 안됨 + 버튼 disabled 유지", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const manualInput = wrapper.get('input[type="number"]');
        const pickBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("선택"));

        await manualInput.setValue("0");
        await flushPromises();
        expect(pickBtn.attributes("disabled")).toBeDefined();
        await pickBtn.trigger("click");
        expect(wrapper.emitted("pick")).toBeFalsy();

        await manualInput.setValue("-3");
        await flushPromises();
        expect(pickBtn.attributes("disabled")).toBeDefined();
        await pickBtn.trigger("click");
        expect(wrapper.emitted("pick")).toBeFalsy();

        await manualInput.setValue("");
        await flushPromises();
        expect(pickBtn.attributes("disabled")).toBeDefined();
        await pickBtn.trigger("click");
        expect(wrapper.emitted("pick")).toBeFalsy();
    });

    it("수동 입력: 양수면 버튼 enabled + 클릭 시 pick(inquiryCode) + close emit", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const manualInput = wrapper.get('input[type="number"]');
        const pickBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("선택"));

        await manualInput.setValue("1234");
        await flushPromises();

        // enabled
        expect(pickBtn.attributes("disabled")).toBeUndefined();

        await pickBtn.trigger("click");
        await flushPromises();

        expect(wrapper.emitted("pick")).toBeTruthy();
        expect(wrapper.emitted("pick")[0]).toEqual([1234]);

        expect(wrapper.emitted("close")).toBeTruthy(); // 선택 후 닫기
    });

    it("Enter 키: @keyup.enter로도 pick + close emit", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const manualInput = wrapper.get('input[type="number"]');
        await manualInput.setValue("55");
        await flushPromises();

        await manualInput.trigger("keyup.enter");
        await flushPromises();

        expect(wrapper.emitted("pick")).toBeTruthy();
        expect(wrapper.emitted("pick")[0]).toEqual([55]);
        expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("닫기 버튼: 클릭하면 close emit", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const closeBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("닫기"));

        await closeBtn.trigger("click");
        await flushPromises();

        expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("BaseModal close: 모달 x 클릭 시 close 이벤트가 위로 전달된다", async () => {
        const wrapper = mountModal();
        await flushPromises();

        await wrapper.get('[data-test="modal-close"]').trigger("click");
        await flushPromises();

        expect(wrapper.emitted("close")).toBeTruthy();
    });
});
