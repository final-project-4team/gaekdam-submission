// src/test/views/voc/inquiry/modal/InquiryDetailModal.test.js
import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

import InquiryDetailModal from "@/views/voc/inquiry/modal/InquiryDetailModal.vue";
import { getInquiryDetailApi } from "@/api/voc/inquiryApi.js";

vi.mock("@/api/voc/inquiryApi.js", () => ({
    getInquiryDetailApi: vi.fn(),
}));

const stubs = {
    BaseModal: {
        props: ["title"],
        template: `
      <div class="base-modal">
        <h1 class="title">{{ title }}</h1>
        <button class="close" @click="$emit('close')">닫기</button>
        <div class="body"><slot /></div>
      </div>
    `,
    },
};

describe("InquiryDetailModal", () => {
    beforeEach(() => vi.clearAllMocks());

    it("inquiryCode 변경/마운트 시 API 호출 후 상세 렌더링", async () => {
        getInquiryDetailApi.mockResolvedValueOnce({
            data: {
                data: {
                    inquiryTitle: "제목A",
                    inquiryCode: 123,
                    createdAt: "2026-01-01T10:00:00",
                    customerName: "Kim",
                    inquiryCategoryName: "문의",
                    inquiryStatus: "IN_PROGRESS",
                    employeeName: "Lee",
                    employeeLoginId: "lee01",
                    linkedIncidentCode: "INC-1",
                    inquiryContent: "문의내용입니다",
                    answerContent: "답변입니다",
                },
            },
        });

        const wrapper = mount(InquiryDetailModal, {
            props: { inquiryCode: 123 },
            global: { stubs },
        });

        await flushPromises();

        // watch(immediate)로 호출됨
        expect(getInquiryDetailApi).toHaveBeenCalledTimes(1);
        expect(getInquiryDetailApi).toHaveBeenCalledWith(123);

        // 타이틀/기본 섹션 텍스트
        expect(wrapper.text()).toContain("문의 상세");
        expect(wrapper.text()).toContain("기본정보");
        expect(wrapper.text()).toContain("문의내용");
        expect(wrapper.text()).toContain("답변(처리)내용");

        // 값 렌더링
        expect(wrapper.text()).toContain("제목A");
        expect(wrapper.text()).toContain("123");
        expect(wrapper.text()).toContain("Kim");
        expect(wrapper.text()).toContain("문의");
        expect(wrapper.text()).toContain("INC-1");
        expect(wrapper.text()).toContain("문의내용입니다");
        expect(wrapper.text()).toContain("답변입니다");

        // 상태 라벨(IN_PROGRESS -> 접수)
        expect(wrapper.text()).toContain("접수");

        // 담당자 표시(값 있으면 그대로)
        expect(wrapper.text()).toContain("Lee");
        expect(wrapper.text()).toContain("lee01");
    });

    it("employeeName/employeeLoginId 없으면 기본값(미지정 / -) 노출", async () => {
        getInquiryDetailApi.mockResolvedValueOnce({
            data: {
                data: {
                    inquiryTitle: "제목B",
                    inquiryCode: 555,
                    inquiryStatus: "ANSWERED",
                    inquiryContent: "c",
                    answerContent: null,
                    employeeName: "",
                    employeeLoginId: "",
                },
            },
        });

        const wrapper = mount(InquiryDetailModal, {
            props: { inquiryCode: 555 },
            global: { stubs },
        });

        await flushPromises();

        expect(wrapper.text()).toContain("답변완료");
        expect(wrapper.text()).toContain("미지정");
        expect(wrapper.text()).toContain("-");

        // answerContent 없으면 기본 문구
        expect(wrapper.text()).toContain("답변이 없습니다.");
    });

    it("API 실패하면 에러 문구 노출", async () => {
        getInquiryDetailApi.mockRejectedValueOnce(new Error("boom"));

        const wrapper = mount(InquiryDetailModal, {
            props: { inquiryCode: 999 },
            global: { stubs },
        });

        await flushPromises();

        expect(getInquiryDetailApi).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain("boom");
    });

    it("inquiryCode가 바뀌면 다시 API 호출", async () => {
        getInquiryDetailApi
            .mockResolvedValueOnce({ data: { data: { inquiryTitle: "A" } } })
            .mockResolvedValueOnce({ data: { data: { inquiryTitle: "B" } } });

        const wrapper = mount(InquiryDetailModal, {
            props: { inquiryCode: 1 },
            global: { stubs },
        });

        await flushPromises();
        expect(getInquiryDetailApi).toHaveBeenCalledWith(1);
        expect(wrapper.text()).toContain("A");

        await wrapper.setProps({ inquiryCode: 2 });
        await flushPromises();

        expect(getInquiryDetailApi).toHaveBeenCalledTimes(2);
        expect(getInquiryDetailApi).toHaveBeenLastCalledWith(2);
        expect(wrapper.text()).toContain("B");
    });
});
