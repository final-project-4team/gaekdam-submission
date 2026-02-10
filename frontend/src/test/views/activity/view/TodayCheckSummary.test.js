import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import TodayCheckSummary from "@/views/activity/view/TodayCheckSummary.vue";

describe("TodayCheckSummary UI/UX unit", () => {
    it("summary 값으로 4개 카드가 렌더되고 label/value가 표시된다", () => {
        const wrapper = mount(TodayCheckSummary, {
            props: {
                summary: {
                    ALL_TODAY: 5,
                    CHECKIN_PLANNED: 2,
                    CHECKOUT_PLANNED: 1,
                    STAYING: 3,
                },
                active: "ALL_TODAY",
            },
        });

        const cards = wrapper.findAll(".summary-card");
        expect(cards.length).toBe(4);

        expect(cards[0].text()).toContain("전체");
        expect(cards[0].text()).toContain("5");

        expect(cards[1].text()).toContain("체크인 예정");
        expect(cards[1].text()).toContain("2");

        expect(cards[2].text()).toContain("체크아웃 예정");
        expect(cards[2].text()).toContain("1");

        expect(cards[3].text()).toContain("현재 투숙");
        expect(cards[3].text()).toContain("3");
    });

    it("active props에 해당하는 카드에 active 클래스가 붙는다", () => {
        const wrapper = mount(TodayCheckSummary, {
            props: {
                summary: {
                    ALL_TODAY: 0,
                    CHECKIN_PLANNED: 0,
                    CHECKOUT_PLANNED: 0,
                    STAYING: 0,
                },
                active: "STAYING",
            },
        });

        const cards = wrapper.findAll(".summary-card");
        // 순서: ALL_TODAY, CHECKIN_PLANNED, CHECKOUT_PLANNED, STAYING
        expect(cards[3].classes()).toContain("active");
        expect(cards[0].classes()).not.toContain("active");
    });

    it("카드 클릭 시 select 이벤트로 card.type이 emit 된다", async () => {
        const wrapper = mount(TodayCheckSummary, {
            props: {
                summary: {
                    ALL_TODAY: 1,
                    CHECKIN_PLANNED: 1,
                    CHECKOUT_PLANNED: 1,
                    STAYING: 1,
                },
                active: "",
            },
        });

        const cards = wrapper.findAll(".summary-card");

        await cards[1].trigger("click"); // CHECKIN_PLANNED
        expect(wrapper.emitted("select")).toBeTruthy();
        expect(wrapper.emitted("select")[0]).toEqual(["CHECKIN_PLANNED"]);

        await cards[2].trigger("click"); // CHECKOUT_PLANNED
        expect(wrapper.emitted("select")[1]).toEqual(["CHECKOUT_PLANNED"]);
    });
});
