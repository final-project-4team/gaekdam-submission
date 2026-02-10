import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import ReportControls from "@/views/report/ReportControls.vue";

// BaseButton Stub
const BaseButtonStub = {
    name: "BaseButton",
    emits: ["click"],
    template: `<button @click="$emit('click')"><slot/></button>`,
};

describe("ReportControls UI/UX 단위 테스트", () => {
    it("기간 타입 변경 시 월 선택 셀렉트 박스 표시 여부가 변경된다", async () => {
        const wrapper = mount(ReportControls, {
            global: {
                stubs: { BaseButton: BaseButtonStub }
            }
        });

        // 초기값: year -> 월 선택 없음
        expect(wrapper.vm.periodType).toBe('year');
        expect(wrapper.findAll("select").length).toBe(2); // type, year

        // month로 변경
        await wrapper.findAll("select")[0].setValue("month");

        // 월 선택 박스 추가됨
        expect(wrapper.vm.periodType).toBe('month');
        expect(wrapper.findAll("select").length).toBe(3); // type, year, month
    });

    it("공유 버튼 클릭 시 콘솔 로그가 출력된다 (기능 확인)", async () => {
        const consoleSpy = vi.spyOn(console, 'log');

        const wrapper = mount(ReportControls, {
            global: {
                stubs: { BaseButton: BaseButtonStub }
            }
        });

        await wrapper.findComponent(BaseButtonStub).trigger("click");

        expect(consoleSpy).toHaveBeenCalledWith('공유', expect.any(Object));
    });
});
