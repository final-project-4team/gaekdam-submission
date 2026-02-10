// src/test/views/voc/incident/modal/IncidentCreateModal.test.js
import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import IncidentCreateModal from "@/views/voc/incident/modal/IncidentCreateModal.vue";

/** -----------------------------
 *  authStore mock (propertyCode만 필요)
 *  ----------------------------- */
vi.mock("@/stores/authStore.js", () => ({
    useAuthStore: () => ({
        propertyCode: "P001",
        hotel: { propertyCode: "P001" },
        user: { propertyCode: "P001" },
    }),
}));

/** -----------------------------
 *  API mock
 *  ----------------------------- */
const createIncidentApiMock = vi.fn();
vi.mock("@/api/voc/incidentApi.js", () => ({
    createIncidentApi: (...args) => createIncidentApiMock(...args),
}));

/** -----------------------------
 *  stubs (UI 컴포넌트 단순화)
 *  ----------------------------- */
const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
      <div data-test="basemodal">
        <div data-test="modal-title">{{ title }}</div>
        <button data-test="modal-close" @click="$emit('close')">close</button>
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
      >
        <slot/>
      </button>
    `,
};

const IncidentEmployeeSelectModalStub = {
    name: "IncidentEmployeeSelectModal",
    emits: ["close", "select"],
    template: `
    <div data-test="employee-modal">
      <button data-test="employee-close" @click="$emit('close')">x</button>
      <button
        data-test="employee-select"
        @click="$emit('select', { employeeCode: 777, employeeName: '홍길동', loginId: 'hong' })"
      >
        pick
      </button>
    </div>
  `,
};

const InquirySelectModalStub = {
    name: "InquirySelectModal",
    emits: ["close", "select"],
    template: `
    <div data-test="inquiry-modal">
      <button data-test="inquiry-close" @click="$emit('close')">x</button>
      <button
        data-test="inquiry-select"
        @click="$emit('select', { inquiryCode: 1234 })"
      >
        pick
      </button>
    </div>
  `,
};

function mountModal() {
    return mount(IncidentCreateModal, {
        global: {
            stubs: {
                BaseModal: BaseModalStub,
                BaseButton: BaseButtonStub,
                IncidentEmployeeSelectModal: IncidentEmployeeSelectModalStub,
                InquirySelectModal: InquirySelectModalStub,
            },
        },
    });
}

beforeEach(() => {
    createIncidentApiMock.mockReset();
    createIncidentApiMock.mockResolvedValue({
        data: { data: { incidentCode: 999 } },
    });
});

describe("IncidentCreateModal UI/UX unit", () => {
    it("초기 로딩: authStore.propertyCode로 지점이 세팅된다", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const inputs = wrapper.findAll("input");
        // 첫번째 readonly input이 지점
        expect(inputs[0].attributes("readonly")).toBeDefined();
        expect(inputs[0].element.value).toBe("P001");
    });

    it("직원 선택: '직원 선택' 클릭 → 직원 모달 오픈 → select 시 라벨 표시 + 모달 닫힘 + 해제 버튼 노출", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const pickBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("직원 선택"));
        await pickBtn.trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="employee-modal"]').exists()).toBe(true);

        await wrapper.get('[data-test="employee-select"]').trigger("click");
        await flushPromises();

        // 직원 모달 닫힘
        expect(wrapper.find('[data-test="employee-modal"]').exists()).toBe(false);

        // 직원 라벨 input 값 (홍길동 (hong))
        const employeeInput = wrapper.findAll("input")[1];
        expect(employeeInput.element.value).toBe("홍길동 (hong)");

        // 해제 버튼 노출
        expect(
            wrapper
                .findAll('[data-test="basebutton"]')
                .some((b) => b.text().includes("해제"))
        ).toBe(true);
    });

    it("직원 해제: 해제 클릭 시 라벨 비워지고 해제 버튼 사라진다", async () => {
        const wrapper = mountModal();
        await flushPromises();

        // 직원 선택까지 먼저
        const pickBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("직원 선택"));
        await pickBtn.trigger("click");
        await flushPromises();
        await wrapper.get('[data-test="employee-select"]').trigger("click");
        await flushPromises();

        // 해제 클릭
        const clearBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("해제"));
        await clearBtn.trigger("click");
        await flushPromises();

        const employeeInput = wrapper.findAll("input")[1];
        expect(employeeInput.element.value).toBe("");

        expect(
            wrapper
                .findAll('[data-test="basebutton"]')
                .some((b) => b.text().includes("해제"))
        ).toBe(false);
    });

    it("문의 선택: '문의 선택' 클릭 → 문의 모달 오픈 → select 시 Q-1234 표시 + 해제 버튼 노출", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const pickInquiryBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("문의 선택"));
        await pickInquiryBtn.trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="inquiry-modal"]').exists()).toBe(true);

        await wrapper.get('[data-test="inquiry-select"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="inquiry-modal"]').exists()).toBe(false);

        // 문의 readonly input은 "문의 연결" 섹션의 input
        // input 순서: [지점, 담당자, 제목, 요약, 발생date, 발생time, 문의연결]
        const inquiryInput = wrapper.findAll("input")[6];
        expect(inquiryInput.element.value).toBe("Q-1234");

        expect(
            wrapper
                .findAll('[data-test="basebutton"]')
                .some((b) => b.text().includes("해제"))
        ).toBe(true);
    });

    it("발생일시 비우기: occurredDate/occurredTime 입력 후 '비우기' 클릭하면 둘 다 초기화된다", async () => {
        const wrapper = mountModal();
        await flushPromises();

        const dateInput = wrapper.find('input[type="date"]');
        const timeInput = wrapper.find('input[type="time"]');

        await dateInput.setValue("2026-02-02");
        await timeInput.setValue("10:30");
        await flushPromises();

        const clearDtBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("비우기"));
        await clearDtBtn.trigger("click");
        await flushPromises();

        expect(dateInput.element.value).toBe("");
        expect(timeInput.element.value).toBe("");
    });

    it("필수값 검증: 직원 없으면 등록 눌러도 API 호출 안되고 에러 표시", async () => {
        const wrapper = mountModal();
        await flushPromises();

        // 제목/내용은 채우고 직원만 안고름
        await wrapper.findAll("input")[2].setValue("  테스트 제목  ");
        await wrapper.find("textarea").setValue("  테스트 내용  ");
        await flushPromises();

        const submitBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("등록"));
        await submitBtn.trigger("click");
        await flushPromises();

        expect(createIncidentApiMock).toHaveBeenCalledTimes(0);
        expect(wrapper.text()).toContain("담당자를 선택해야 등록됩니다.");
    });

    it("등록 성공: payload trim/occurredAt ISO 생성 + created emit(incidentCode) 발생", async () => {
        const wrapper = mountModal();
        await flushPromises();

        // 직원 선택
        const pickBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("직원 선택"));
        await pickBtn.trigger("click");
        await flushPromises();
        await wrapper.get('[data-test="employee-select"]').trigger("click");
        await flushPromises();

        // 제목/요약/내용
        await wrapper.findAll("input")[2].setValue("  제목  ");
        await wrapper.findAll("input")[3].setValue("  요약  ");
        await wrapper.find("textarea").setValue("  내용  ");
        // 발생일시
        await wrapper.find('input[type="date"]').setValue("2026-02-02");
        await wrapper.find('input[type="time"]').setValue("10:30");

        // 문의 선택(선택값)
        const pickInquiryBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("문의 선택"));
        await pickInquiryBtn.trigger("click");
        await flushPromises();
        await wrapper.get('[data-test="inquiry-select"]').trigger("click");
        await flushPromises();

        // 등록
        const submitBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("등록"));
        await submitBtn.trigger("click");
        await flushPromises();

        expect(createIncidentApiMock).toHaveBeenCalledTimes(1);
        const payload = createIncidentApiMock.mock.calls[0][0];

        expect(payload.propertyCode).toBe("P001");
        expect(payload.employeeCode).toBe(777);
        expect(payload.incidentTitle).toBe("제목");
        expect(payload.incidentSummary).toBe("요약");
        expect(payload.incidentContent).toBe("내용");
        expect(payload.inquiryCode).toBe(1234);

        // ISO는 timezone 때문에 값 고정 비교 대신 형식만 체크
        expect(payload.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

        // emit created 확인
        expect(wrapper.emitted("created")).toBeTruthy();
        expect(wrapper.emitted("created")[0]).toEqual([999]);
    });

    it("등록 실패: API throw 시 에러 메시지 노출", async () => {
        createIncidentApiMock.mockRejectedValueOnce(new Error("서버 에러"));

        const wrapper = mountModal();
        await flushPromises();

        // 직원 선택
        const pickBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("직원 선택"));
        await pickBtn.trigger("click");
        await flushPromises();
        await wrapper.get('[data-test="employee-select"]').trigger("click");
        await flushPromises();

        // 제목/내용만 최소 입력
        await wrapper.findAll("input")[2].setValue("제목");
        await wrapper.find("textarea").setValue("내용");
        await flushPromises();

        const submitBtn = wrapper
            .findAll('[data-test="basebutton"]')
            .find((b) => b.text().includes("등록"));
        await submitBtn.trigger("click");
        await flushPromises();

        expect(createIncidentApiMock).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain("서버 에러");
    });

    it("close: BaseModal close emit이 들어오면 close 이벤트가 위로 전달된다", async () => {
        const wrapper = mountModal();
        await flushPromises();

        await wrapper.get('[data-test="modal-close"]').trigger("click");
        await flushPromises();

        expect(wrapper.emitted("close")).toBeTruthy();
    });
});
