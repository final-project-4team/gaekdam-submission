import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import IncidentEmployeeSelectModal from "@/views/voc/incident/modal/IncidentEmployeeSelectModal.vue";

/** -----------------------------
 *  api(axios instance) mock
 *  ----------------------------- */
const apiGetMock = vi.fn();
vi.mock("@/api/axios", () => ({
    default: {
        get: (...args) => apiGetMock(...args),
    },
}));

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
    return mount(IncidentEmployeeSelectModal, {
        global: {
            stubs: {
                BaseModal: BaseModalStub,
                BaseButton: BaseButtonStub,
            },
        },
    });
}

beforeEach(() => {
    apiGetMock.mockReset();
});

describe("IncidentEmployeeSelectModal UI/UX unit", () => {
    it("초기 렌더: 타이틀 노출 + page=1 + prev disabled, next disabled", async () => {
        const wrapper = mountModal();
        await flushPromises();

        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("직원 검색");
        expect(wrapper.get(".p").text()).toBe("1");

        const prevBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("이전"));
        const nextBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("다음"));

        expect(prevBtn.attributes("disabled")).toBeDefined();
        expect(nextBtn.attributes("disabled")).toBeDefined(); // total=0이라 canNext=false
    });

    it("검색: keyword 공백이면 API 호출 안하고 rows/total 비워짐 + empty 문구 노출", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const input = wrapper.get('input[placeholder="이름으로 검색(정확히)"]');
        await input.setValue("   ");
        await flushPromises();

        const searchBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("검색"));
        await searchBtn.trigger("click");
        await flushPromises();

        expect(apiGetMock).toHaveBeenCalledTimes(0);
        expect(wrapper.text()).toContain("검색 결과가 없습니다.");
    });

    it("검색 버튼: 정상 keyword면 /employee 호출 + params(name trim, sortBy/direction 포함)", async () => {
        apiGetMock.mockResolvedValueOnce({
            data: {
                data: {
                    content: [
                        { employeeCode: 1, employeeName: "홍길동", loginId: "hong" },
                    ],
                    totalElements: 1,
                },
            },
        });

        const wrapper = mountModal();
        await flushPromises();

        const input = wrapper.get('input[placeholder="이름으로 검색(정확히)"]');
        await input.setValue("  홍길동  ");
        await flushPromises();

        const searchBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("검색"));
        await searchBtn.trigger("click");
        await flushPromises();

        expect(apiGetMock).toHaveBeenCalledTimes(1);

        const [url, config] = apiGetMock.mock.calls[0];
        expect(url).toBe("/employee");
        expect(config.params.page).toBe(1);
        expect(config.params.size).toBe(10);
        expect(config.params.name).toBe("홍길동");
        expect(config.params.sortBy).toBe("createdAt");
        expect(config.params.direction).toBe("DESC");

        // 렌더링 확인
        expect(wrapper.text()).toContain("홍길동");
        expect(wrapper.text()).toContain("hong");
        expect(wrapper.text()).not.toContain("검색 결과가 없습니다.");
    });

    it("Enter 키: keyup.enter로도 search 실행된다", async () => {
        apiGetMock.mockResolvedValueOnce({
            data: { data: { content: [], totalElements: 0 } },
        });

        const wrapper = mountModal();
        await flushPromises();

        const input = wrapper.get('input[placeholder="이름으로 검색(정확히)"]');
        await input.setValue("홍길동");
        await flushPromises();

        await input.trigger("keyup.enter");
        await flushPromises();

        expect(apiGetMock).toHaveBeenCalledTimes(1);
    });

    it("empty: 검색은 했는데 결과가 없으면 empty 문구 노출", async () => {
        apiGetMock.mockResolvedValueOnce({
            data: { data: { content: [], totalElements: 0 } },
        });

        const wrapper = mountModal();
        await flushPromises();

        const input = wrapper.get('input[placeholder="이름으로 검색(정확히)"]');
        await input.setValue("없는사람");
        await flushPromises();

        const searchBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("검색"));
        await searchBtn.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("검색 결과가 없습니다.");
    });

    it("row 클릭: item 클릭하면 select emit으로 직원 객체 전달", async () => {
        apiGetMock.mockResolvedValueOnce({
            data: {
                data: {
                    content: [
                        { employeeCode: 77, employeeName: "담당자A", loginId: "a" },
                    ],
                    totalElements: 1,
                },
            },
        });

        const wrapper = mountModal();
        await flushPromises();

        await wrapper.get('input[placeholder="이름으로 검색(정확히)"]').setValue("담당자A");
        await flushPromises();

        const searchBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("검색"));
        await searchBtn.trigger("click");
        await flushPromises();

        const item = wrapper.get(".item");
        await item.trigger("click");
        await flushPromises();

        expect(wrapper.emitted("select")).toBeTruthy();
        expect(wrapper.emitted("select")[0]).toEqual([
            { employeeCode: 77, employeeName: "담당자A", loginId: "a" },
        ]);
    });

    it("페이징: totalElements가 25면 page=1에서 next enabled, next 클릭 시 page=2로 재조회", async () => {
        // page=1 응답: total 25 -> canNext true
        apiGetMock.mockResolvedValueOnce({
            data: { data: { content: [{ employeeCode: 1 }], totalElements: 25 } },
        });
        // page=2 응답
        apiGetMock.mockResolvedValueOnce({
            data: { data: { content: [{ employeeCode: 2 }], totalElements: 25 } },
        });

        const wrapper = mountModal();
        await flushPromises();

        await wrapper.get('input[placeholder="이름으로 검색(정확히)"]').setValue("홍길동");
        await flushPromises();

        const searchBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("검색"));
        await searchBtn.trigger("click");
        await flushPromises();

        // next enabled 확인
        const nextBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("다음"));
        expect(nextBtn.attributes("disabled")).toBeUndefined();

        await nextBtn.trigger("click");
        await flushPromises();

        // 두 번째 호출(page=2) 확인
        expect(apiGetMock).toHaveBeenCalledTimes(2);
        const [, config2] = apiGetMock.mock.calls[1];
        expect(config2.params.page).toBe(2);
        expect(wrapper.get(".p").text()).toBe("2");
    });

    it("페이징: page=1에서 prev는 disabled, page=2로 간 후 prev 클릭 시 page=1로 재조회", async () => {
        // page=1 응답(총 25 -> next 가능)
        apiGetMock.mockResolvedValueOnce({
            data: { data: { content: [{ employeeCode: 1 }], totalElements: 25 } },
        });
        // next -> page=2 응답
        apiGetMock.mockResolvedValueOnce({
            data: { data: { content: [{ employeeCode: 2 }], totalElements: 25 } },
        });
        // prev -> page=1 응답
        apiGetMock.mockResolvedValueOnce({
            data: { data: { content: [{ employeeCode: 3 }], totalElements: 25 } },
        });

        const wrapper = mountModal();
        await flushPromises();

        await wrapper.get('input[placeholder="이름으로 검색(정확히)"]').setValue("홍길동");
        await flushPromises();

        const searchBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("검색"));
        await searchBtn.trigger("click");
        await flushPromises();

        // next로 2페이지 이동
        const nextBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("다음"));
        await nextBtn.trigger("click");
        await flushPromises();

        expect(wrapper.get(".p").text()).toBe("2");

        // prev enabled 확인 후 클릭
        const prevBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("이전"));
        expect(prevBtn.attributes("disabled")).toBeUndefined();

        await prevBtn.trigger("click");
        await flushPromises();

        expect(apiGetMock).toHaveBeenCalledTimes(3);
        const [, config3] = apiGetMock.mock.calls[2];
        expect(config3.params.page).toBe(1);
        expect(wrapper.get(".p").text()).toBe("1");
    });

    it("BaseModal close: x 클릭하면 close emit 전달", async () => {
        const wrapper = mountModal();
        await flushPromises();

        await wrapper.get('[data-test="modal-close"]').trigger("click");
        await flushPromises();

        expect(wrapper.emitted("close")).toBeTruthy();
    });
});
