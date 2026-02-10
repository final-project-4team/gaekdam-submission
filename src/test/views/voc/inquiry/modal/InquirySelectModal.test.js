// src/test/views/voc/inquiry/modal/InquirySelectModal.test.js
import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import InquirySelectModal from "@/views/voc/inquiry/modal/InquirySelectModal.vue";
import { fetchInquiriesForSelect } from "@/api/voc/inquiryApi.js";

vi.mock("@/api/voc/inquiryApi.js", () => ({
    fetchInquiriesForSelect: vi.fn(),
}));

const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
      <div class="base-modal-stub">
        <div class="title">{{ title }}</div>
        <button class="emit-close" @click="$emit('close')">close</button>
        <slot />
      </div>
    `,
};

const BaseButtonStub = {
    name: "BaseButton",
    props: ["type", "size", "disabled"],
    emits: ["click"],
    template: `
      <button class="base-btn-stub" :disabled="disabled" @click="$emit('click')">
        <slot />
      </button>
    `,
};

const makeRows = (n, startCode = 100) =>
    Array.from({ length: n }).map((_, i) => ({
        inquiryCode: startCode + i,
        inquiryTitle: `문의 제목 ${startCode + i}`,
        customerName: i % 2 === 0 ? "Kim" : "Lee",
        inquiryStatus: i % 2 === 0 ? "IN_PROGRESS" : "ANSWERED",
    }));

const pageRes = (content) => ({
    data: {
        data: {
            content,
        },
    },
});

describe("InquirySelectModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("검색 버튼 클릭 시 API 호출 + 목록 렌더", async () => {
        fetchInquiriesForSelect.mockResolvedValueOnce(pageRes(makeRows(2, 101)));

        const wrapper = mount(InquirySelectModal, {
            global: { stubs: { BaseModal: BaseModalStub, BaseButton: BaseButtonStub } },
        });

        expect(wrapper.text()).toContain("검색 결과가 없습니다.");

        await wrapper.find("input").setValue("hello");
        const searchBtn = wrapper.findAll(".base-btn-stub").find((b) => b.text() === "검색");
        await searchBtn.trigger("click");
        await flushPromises();

        expect(fetchInquiriesForSelect).toHaveBeenCalledTimes(1);
        expect(fetchInquiriesForSelect).toHaveBeenCalledWith({
            page: 1,
            size: 10,
            keyword: "hello",
            sortBy: "created_at",
            direction: "DESC",
        });

        expect(wrapper.text()).toContain("문의 제목 101");
        expect(wrapper.text()).toContain("Q-101");
    });

    it("엔터(Enter)로도 검색 동작", async () => {
        fetchInquiriesForSelect.mockResolvedValueOnce(pageRes(makeRows(2, 201)));

        const wrapper = mount(InquirySelectModal, {
            global: { stubs: { BaseModal: BaseModalStub, BaseButton: BaseButtonStub } },
        });

        await wrapper.find("input").setValue("abc");
        await wrapper.find("input").trigger("keyup.enter");
        await flushPromises();

        expect(fetchInquiriesForSelect).toHaveBeenCalledTimes(1);
        expect(fetchInquiriesForSelect).toHaveBeenCalledWith({
            page: 1,
            size: 10,
            keyword: "abc",
            sortBy: "created_at",
            direction: "DESC",
        });
    });

    it("item 클릭 시 select 이벤트 emit", async () => {
        fetchInquiriesForSelect.mockResolvedValueOnce(pageRes(makeRows(2, 301)));

        const wrapper = mount(InquirySelectModal, {
            global: { stubs: { BaseModal: BaseModalStub, BaseButton: BaseButtonStub } },
        });

        await wrapper.find("input").trigger("keyup.enter");
        await flushPromises();

        await wrapper.find(".item").trigger("click");

        expect(wrapper.emitted("select")).toBeTruthy();
        expect(wrapper.emitted("select")[0][0]).toMatchObject({ inquiryCode: 301 });
    });

    it("페이징: next 버튼 누르면 page 증가 + API 호출", async () => {
        // ✅ 첫 페이지 rows를 10개로 만들어 next 버튼 활성화
        fetchInquiriesForSelect
            .mockResolvedValueOnce(pageRes(makeRows(10, 401))) // page=1
            .mockResolvedValueOnce(pageRes(makeRows(3, 501))); // page=2

        const wrapper = mount(InquirySelectModal, {
            global: { stubs: { BaseModal: BaseModalStub, BaseButton: BaseButtonStub } },
        });

        // 첫 로드(검색) 수행
        await wrapper.find("input").trigger("keyup.enter");
        await flushPromises();
        expect(fetchInquiriesForSelect).toHaveBeenCalledTimes(1);

        const nextBtn = wrapper.findAll(".base-btn-stub").find((b) => b.text() === "다음");
        expect(nextBtn.attributes("disabled")).toBeUndefined(); // ✅ 활성화 확인

        await nextBtn.trigger("click");
        await flushPromises();

        expect(fetchInquiriesForSelect).toHaveBeenCalledTimes(2);
        expect(fetchInquiriesForSelect.mock.calls[1][0]).toMatchObject({ page: 2, size: 10 });

        expect(wrapper.text()).toContain("2"); // 페이지 표시
    });

    it("prev 버튼: page=1일 땐 API 추가 호출 안 함", async () => {
        const wrapper = mount(InquirySelectModal, {
            global: { stubs: { BaseModal: BaseModalStub, BaseButton: BaseButtonStub } },
        });

        const prevBtn = wrapper.findAll(".base-btn-stub").find((b) => b.text() === "이전");
        await prevBtn.trigger("click");
        await flushPromises();

        expect(fetchInquiriesForSelect).toHaveBeenCalledTimes(0);
        expect(wrapper.text()).toContain("1");
    });

    it("BaseModal close 이벤트가 올라오면 close emit", async () => {
        const wrapper = mount(InquirySelectModal, {
            global: { stubs: { BaseModal: BaseModalStub, BaseButton: BaseButtonStub } },
        });

        await wrapper.find(".emit-close").trigger("click");
        expect(wrapper.emitted("close")).toBeTruthy();
    });
});
