// src/test/views/voc/incident/modal/IncidentDetailModal.test.js
import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import IncidentDetailModal from "@/views/voc/incident/modal/IncidentDetailModal.vue";

/** -----------------------------
 *  window alert/confirm mock
 *  ----------------------------- */
beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
    vi.restoreAllMocks();
});

/** -----------------------------
 *  API mocks
 *  ----------------------------- */
const getIncidentDetailApiMock = vi.fn();
const getIncidentActionsApiMock = vi.fn();
const createIncidentActionApiMock = vi.fn();
const closeIncidentApiMock = vi.fn();

vi.mock("@/api/voc/incidentApi.js", () => ({
    getIncidentDetailApi: (...args) => getIncidentDetailApiMock(...args),
    getIncidentActionsApi: (...args) => getIncidentActionsApiMock(...args),
    createIncidentActionApi: (...args) => createIncidentActionApiMock(...args),
    closeIncidentApi: (...args) => closeIncidentApiMock(...args),
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
        <div data-test="modal-footer">
          <slot name="footer"></slot>
        </div>
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

function mountModal(props = { incidentCode: 1001 }) {
    return mount(IncidentDetailModal, {
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
    getIncidentDetailApiMock.mockReset();
    getIncidentActionsApiMock.mockReset();
    createIncidentActionApiMock.mockReset();
    closeIncidentApiMock.mockReset();

    getIncidentDetailApiMock.mockResolvedValue({
        data: {
            data: {
                incidentCode: 1001,
                incidentTitle: "에어컨 고장",
                createdAt: "2026-02-02T10:00:00",
                propertyCode: "P001",
                employeeCode: 777,
                employeeName: "홍길동",
                employeeLoginId: "hong",
                incidentStatus: "IN_PROGRESS",
                severity: "HIGH",
                incidentSummary: "객실 에어컨 미작동",
                incidentContent: "상세 내용\n줄바꿈",
                inquiryCode: 1234,
            },
        },
    });

    getIncidentActionsApiMock.mockResolvedValue({
        data: {
            data: [
                {
                    incidentActionHistoryCode: 1,
                    createdAt: "2026-02-02T11:00:00",
                    writerEmployeeName: "담당자A",
                    writerLoginId: "a",
                    writerEmployeeCode: 10,
                    actionContent: "초기 점검 완료",
                },
            ],
        },
    });

    createIncidentActionApiMock.mockResolvedValue({ data: { data: true } });
    closeIncidentApiMock.mockResolvedValue({ data: { data: true } });
});

describe("IncidentDetailModal UI/UX unit", () => {
    it("초기 로딩: incidentCode watch immediate로 상세/이력 API 호출", async () => {
        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        expect(getIncidentDetailApiMock).toHaveBeenCalledTimes(1);
        expect(getIncidentDetailApiMock).toHaveBeenCalledWith(1001);

        expect(getIncidentActionsApiMock).toHaveBeenCalledTimes(1);
        expect(getIncidentActionsApiMock).toHaveBeenCalledWith(1001);

        expect(wrapper.text()).toContain("사건/사고 상세");
        expect(wrapper.text()).toContain("에어컨 고장");
        expect(wrapper.text()).toContain("C-1001");
        expect(wrapper.text()).toContain("P001");
        expect(wrapper.text()).toContain("홍길동 (hong)");
        expect(wrapper.text()).toContain("Q-1234");
    });

    it("loading 상태: detail API가 pending이면 '불러오는 중...' 노출", async () => {
        getIncidentDetailApiMock.mockImplementationOnce(() => new Promise(() => {})); // pending

        const wrapper = mountModal({ incidentCode: 1001 });

        expect(wrapper.text()).toContain("불러오는 중...");
    });

    it("detail 에러: 상세 조회 실패 시 에러 문구 노출", async () => {
        getIncidentDetailApiMock.mockRejectedValueOnce(new Error("상세 조회 실패"));

        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        expect(wrapper.text()).toContain("상세 조회 실패");
    });

    it("actions 에러: 조치 이력 조회 실패 시 mini error 노출 (empty 문구는 렌더링 안됨)", async () => {
        getIncidentActionsApiMock.mockRejectedValueOnce(new Error("조치 이력 조회 실패"));

        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        // actionError가 있으면 else-if로 에러만 보여주고 action-list(= empty 포함)는 안 나옴
        expect(wrapper.text()).toContain("조치 이력 조회 실패");
        expect(wrapper.text()).not.toContain("조치 이력이 없습니다.");
    });

    it("조치 완료 버튼: 상태 IN_PROGRESS이면 footer에 '조치 완료' 버튼이 보인다", async () => {
        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        const closeBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("조치 완료"));

        expect(closeBtn).toBeTruthy();
    });

    it("조치 완료 버튼: 상태 CLOSED면 버튼이 숨겨진다", async () => {
        getIncidentDetailApiMock.mockResolvedValueOnce({
            data: { data: { incidentCode: 1001, incidentStatus: "CLOSED" } },
        });

        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        const hasCloseBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .some((b) => b.text().includes("조치 완료"));

        expect(hasCloseBtn).toBe(false);
    });

    it("조치 이력 추가: textarea 입력 후 클릭하면 createIncidentActionApi 호출 + actions reload + updated emit", async () => {
        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        const ta = wrapper.find("textarea");
        await ta.setValue("  조치 내용  ");
        await flushPromises();

        const addBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("조치 이력 추가"));
        await addBtn.trigger("click");
        await flushPromises();

        expect(createIncidentActionApiMock).toHaveBeenCalledTimes(1);
        expect(createIncidentActionApiMock).toHaveBeenCalledWith(1001, {
            actionContent: "조치 내용",
        });

        expect(getIncidentActionsApiMock).toHaveBeenCalledTimes(2);
        expect(wrapper.emitted("updated")).toBeTruthy();
    });

    it("조치 이력 추가: 빈값이면 alert 호출 + API 호출 안함", async () => {
        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        const ta = wrapper.find("textarea");
        await ta.setValue("   ");
        await flushPromises();

        const addBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("조치 이력 추가"));
        await addBtn.trigger("click");
        await flushPromises();

        expect(window.alert).toHaveBeenCalledTimes(1);
        expect(createIncidentActionApiMock).toHaveBeenCalledTimes(0);
    });

    it("종결 처리: confirm(true)면 closeIncidentApi 호출 → detail/actions reload → updated emit → close emit", async () => {
        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        const closeBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("조치 완료"));

        await closeBtn.trigger("click");
        await flushPromises();

        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(closeIncidentApiMock).toHaveBeenCalledTimes(1);
        expect(closeIncidentApiMock).toHaveBeenCalledWith(1001);

        expect(getIncidentDetailApiMock).toHaveBeenCalledTimes(2);
        expect(getIncidentActionsApiMock).toHaveBeenCalledTimes(2);

        expect(wrapper.emitted("updated")).toBeTruthy();
        expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("종결 처리: confirm(false)면 closeIncidentApi 호출 안함", async () => {
        window.confirm.mockReturnValueOnce(false);

        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        const closeBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("조치 완료"));

        await closeBtn.trigger("click");
        await flushPromises();

        expect(closeIncidentApiMock).toHaveBeenCalledTimes(0);
    });

    it("footer 닫기: '닫기' 클릭하면 close emit", async () => {
        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        const btn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("닫기"));

        await btn.trigger("click");
        await flushPromises();

        expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("incidentCode 변경: props 변경되면 상세/이력 다시 로드된다", async () => {
        const wrapper = mountModal({ incidentCode: 1001 });
        await flushPromises();

        getIncidentDetailApiMock.mockClear();
        getIncidentActionsApiMock.mockClear();

        await wrapper.setProps({ incidentCode: 2002 });
        await flushPromises();

        expect(getIncidentDetailApiMock).toHaveBeenCalledTimes(1);
        expect(getIncidentDetailApiMock).toHaveBeenCalledWith(2002);

        expect(getIncidentActionsApiMock).toHaveBeenCalledTimes(1);
        expect(getIncidentActionsApiMock).toHaveBeenCalledWith(2002);
    });
});
