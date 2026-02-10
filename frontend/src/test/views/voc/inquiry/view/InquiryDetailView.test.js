import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import InquiryDetailView from "@/views/voc/inquiry/view/InquiryDetailView.vue";

/* api mock */
const getInquiryDetailApiMock = vi.fn();
vi.mock("@/api/voc/inquiryApi.js", () => ({
    getInquiryDetailApi: (...args) => getInquiryDetailApiMock(...args),
}));

/* router mock */
const routeMock = {
    params: { inquiryCode: "777" },
    query: { hotelGroupCode: "1" },
};
const routerMock = {
    back: vi.fn(),
};

vi.mock("vue-router", () => ({
    useRoute: () => routeMock,
    useRouter: () => routerMock,
}));

const BaseButtonStub = {
    name: "BaseButton",
    props: ["type", "size"],
    emits: ["click"],
    template: `<button data-test="base-btn" @click="$emit('click')"><slot /></button>`,
};


const sampleDetail = (overrides = {}) => ({
    inquiryCode: 777,
    customerName: "홍길동",
    createdAt: "2026-02-02T10:11:12",
    inquiryCategoryCode: 1,
    inquiryCategoryName: "문의",
    employeeCode: null,
    inquiryStatus: "IN_PROGRESS",
    linkedIncidentCode: null,
    inquiryTitle: "제목입니다",
    inquiryContent: "문의내용\n2줄",
    answerContent: null,
    ...overrides,
});

function mountPage() {
    return mount(InquiryDetailView, {
        global: {
            stubs: {
                BaseButton: BaseButtonStub,
            },
        },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    routeMock.params = { inquiryCode: "777" };
    routeMock.query = { hotelGroupCode: "1" };
    localStorage.clear();
});

afterEach(() => {
    localStorage.clear();
});

describe("InquiryDetailView UI/UX unit", () => {
    it("로딩 -> API 호출 -> 기본정보/내용 렌더", async () => {
        let resolveApi;
        getInquiryDetailApiMock.mockReturnValueOnce(
            new Promise((r) => {
                resolveApi = r;
            })
        );

        const wrapper = mountPage();

        // loading=true 렌더 타이밍 확보
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).toContain("불러오는 중...");

        // API 응답 완료
        resolveApi({ data: { data: sampleDetail() } });
        await flushPromises();

        expect(getInquiryDetailApiMock).toHaveBeenCalledTimes(1);
        expect(getInquiryDetailApiMock).toHaveBeenCalledWith(777, { hotelGroupCode: 1 });

        expect(wrapper.text()).toContain("문의 상세");
        expect(wrapper.text()).toContain("Q-777");
        expect(wrapper.text()).toContain("홍길동");
        expect(wrapper.text()).toContain("2026-02-02 10:11");
        expect(wrapper.text()).toContain("제목입니다");
        expect(wrapper.text()).toContain("문의내용");
        expect(wrapper.text()).toContain("답변이 없습니다.");
    });

    it("query hotelGroupCode 없으면 localStorage hotelGroupCode 사용", async () => {
        routeMock.query = {};
        localStorage.setItem("hotelGroupCode", "9");

        getInquiryDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail() },
        });

        const wrapper = mountPage();
        await flushPromises();

        expect(getInquiryDetailApiMock).toHaveBeenCalledWith(777, { hotelGroupCode: 9 });
        expect(wrapper.text()).toContain("문의 상세");
    });

    it("hotelGroupCode 또는 inquiryCode 없으면 error 상태 렌더", async () => {
        routeMock.query = {};
        routeMock.params = {}; // inquiryCode도 없음
        localStorage.removeItem("hotelGroupCode");

        const wrapper = mountPage();
        await flushPromises();

        expect(getInquiryDetailApiMock).toHaveBeenCalledTimes(0);
        expect(wrapper.text()).toContain("hotelGroupCode 또는 inquiryCode가 없습니다.");
        expect(wrapper.find(".state--error").exists()).toBe(true);
    });

    it("API 실패 시 error 상태 렌더", async () => {
        getInquiryDetailApiMock.mockRejectedValueOnce(new Error("boom"));

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.text()).toContain("boom");
        expect(wrapper.find(".state--error").exists()).toBe(true);
    });

    it("상태 뱃지: IN_PROGRESS면 '처리중', ANSWERED면 '답변완료'", async () => {
        getInquiryDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail({ inquiryStatus: "IN_PROGRESS" }) },
        });

        const w1 = mountPage();
        await flushPromises();

        expect(w1.text()).toContain("처리중");
        expect(w1.find(".badge--IN_PROGRESS").exists()).toBe(true);

        getInquiryDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail({ inquiryStatus: "ANSWERED", answerContent: "답변내용" }) },
        });

        const w2 = mountPage();
        await flushPromises();

        expect(w2.text()).toContain("답변완료");
        expect(w2.find(".badge--ANSWERED").exists()).toBe(true);
        expect(w2.text()).toContain("답변내용");
    });

    it("카테고리 뱃지 class: inquiryCategoryCode에 따라 badge--cat-N 적용", async () => {
        getInquiryDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail({ inquiryCategoryCode: 2, inquiryCategoryName: "클레임" }) },
        });

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.find(".badge--cat-2").exists()).toBe(true);
        expect(wrapper.text()).toContain("클레임");
    });

    it("뒤로가기: 상단 back 버튼, 하단 확인 버튼 모두 router.back 호출", async () => {
        getInquiryDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail() },
        });

        const wrapper = mountPage();
        await flushPromises();

        const before = routerMock.back.mock.calls.length;

        await wrapper.get("button.back").trigger("click");
        expect(routerMock.back.mock.calls.length).toBe(before + 1);

        const confirmBtn = wrapper.findAll('[data-test="base-btn"]').find((b) => b.text().includes("확인"));
        await confirmBtn.trigger("click");

        expect(routerMock.back.mock.calls.length).toBe(before + 2);

    });
});
