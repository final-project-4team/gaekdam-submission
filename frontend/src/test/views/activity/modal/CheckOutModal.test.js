import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import CheckOutModal from "@/views/activity/modal/CheckOutModal.vue";

/** -----------------------------
 * mocks
 * ----------------------------- */
const createCheckOutApiMock = vi.fn();
vi.mock("@/api/reservation/checkinoutApi.js", () => ({
    createCheckOutApi: (...args) => createCheckOutApiMock(...args),
}));

/** -----------------------------
 * stubs
 * ----------------------------- */
const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
      <div data-test="basemodal">
        <div data-test="modal-title">{{ title }}</div>
        <button data-test="modal-x" @click="$emit('close')">x</button>
        <slot></slot>
        <div data-test="footer"><slot name="footer"></slot></div>
      </div>
    `,
};

// BaseButton은 @press를 쓰니까 press emit으로 맞춰야 함
const BaseButtonStub = {
    name: "BaseButton",
    emits: ["press"],
    template: `<button data-test="basebutton" @click="$emit('press')"><slot/></button>`,
};

function mountPage(props = { stayCode: 777 }) {
    return mount(CheckOutModal, {
        props,
        global: {
            stubs: {
                BaseModal: BaseModalStub,
                BaseButton: BaseButtonStub,
            },
        },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    createCheckOutApiMock.mockResolvedValue({ data: { data: true } });
});

describe("CheckOutModal UI/UX unit", () => {
    it("초기 렌더: 제목/기본값(settlementYn=N)이 표시된다", () => {
        const wrapper = mountPage();

        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("체크아웃 등록");

        // carNumber, recordedAt
        const inputs = wrapper.findAll("input");
        expect(inputs.length).toBe(2);

        const settlement = wrapper.find("select");
        expect(settlement.element.value).toBe("N");
    });

    it("취소 버튼: press 시 close emit 된다", async () => {
        const wrapper = mountPage();

        const btns = wrapper.findAll('[data-test="basebutton"]');
        // footer: [취소, 체크아웃 등록]
        await btns[0].trigger("click");

        expect(wrapper.emitted("close")).toBeTruthy();
        expect(wrapper.emitted("close").length).toBe(1);
    });

    it("BaseModal 닫기(x): close 이벤트가 그대로 emit(close) 된다", async () => {
        const wrapper = mountPage();

        await wrapper.get('[data-test="modal-x"]').trigger("click");
        expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("submit: 입력값을 payload로 createCheckOutApi 호출 후 success emit + close emit", async () => {
        const wrapper = mountPage({ stayCode: 1234 });

        await wrapper.find('input[type="text"]').setValue("12가3456");
        await wrapper.find('input[type="datetime-local"]').setValue("2026-02-02T11:45");
        await wrapper.find("select").setValue("Y");

        const btns = wrapper.findAll('[data-test="basebutton"]');
        await btns[1].trigger("click"); // 체크아웃 등록
        await flushPromises();

        expect(createCheckOutApiMock).toHaveBeenCalledTimes(1);

        const payload = createCheckOutApiMock.mock.calls[0][0];
        expect(payload).toEqual({
            stayCode: 1234,
            carNumber: "12가3456",
            recordedAt: "2026-02-02T11:45",
            settlementYn: "Y",
        });

        expect(wrapper.emitted("success")).toBeTruthy();
        expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("submit: carNumber가 빈 문자열이면 null로 전송된다", async () => {
        const wrapper = mountPage({ stayCode: 555 });

        await wrapper.find('input[type="text"]').setValue("");
        await wrapper.find('input[type="datetime-local"]').setValue("2026-02-02T09:00");

        const btns = wrapper.findAll('[data-test="basebutton"]');
        await btns[1].trigger("click");
        await flushPromises();

        const payload = createCheckOutApiMock.mock.calls[0][0];
        expect(payload.carNumber).toBe(null);
    });
});
