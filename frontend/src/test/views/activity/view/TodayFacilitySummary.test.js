import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import TodayFacilitySummary from "@/views/activity/view/TodayFacilitySummary.vue";

describe("TodayFacilitySummary UI/UX unit", () => {
    it("ALL + 시설 카드가 렌더되고 totalCount가 summary 합으로 표시된다", () => {
        const wrapper = mount(TodayFacilitySummary, {
            props: {
                summary: [
                    { facilityCode: 10, facilityName: "수영장", usageCount: 3 },
                    { facilityCode: 20, facilityName: "사우나", usageCount: 2 },
                ],
                active: null,
            },
        });

        const cards = wrapper.findAll(".summary-card");
        // ALL 1개 + 시설 2개
        expect(cards.length).toBe(3);

        // ALL 카드
        expect(cards[0].text()).toContain("ALL");
        expect(cards[0].text()).toContain("5"); // 3+2

        // 시설 카드
        expect(cards[1].text()).toContain("수영장");
        expect(cards[1].text()).toContain("3");

        expect(cards[2].text()).toContain("사우나");
        expect(cards[2].text()).toContain("2");
    });

    it("usageCount가 null/undefined여도 totalCount 계산이 안전하다(0 처리)", () => {
        const wrapper = mount(TodayFacilitySummary, {
            props: {
                summary: [
                    { facilityCode: 10, facilityName: "수영장", usageCount: null },
                    { facilityCode: 20, facilityName: "사우나" }, // undefined
                    { facilityCode: 30, facilityName: "헬스", usageCount: 4 },
                ],
                active: null,
            },
        });

        const allCard = wrapper.findAll(".summary-card")[0];
        expect(allCard.text()).toContain("4");
    });

    it("active가 null이면 ALL 카드에 active 클래스가 붙는다", () => {
        const wrapper = mount(TodayFacilitySummary, {
            props: {
                summary: [{ facilityCode: 10, facilityName: "수영장", usageCount: 1 }],
                active: null,
            },
        });

        const cards = wrapper.findAll(".summary-card");
        expect(cards[0].classes()).toContain("active"); // ALL
        expect(cards[1].classes()).not.toContain("active");
    });

    it("active가 facilityCode면 해당 시설 카드에 active 클래스가 붙는다", () => {
        const wrapper = mount(TodayFacilitySummary, {
            props: {
                summary: [
                    { facilityCode: 10, facilityName: "수영장", usageCount: 1 },
                    { facilityCode: 20, facilityName: "사우나", usageCount: 2 },
                ],
                active: 20,
            },
        });

        const cards = wrapper.findAll(".summary-card");
        // ALL, 수영장(10), 사우나(20)
        expect(cards[2].classes()).toContain("active");
        expect(cards[0].classes()).not.toContain("active");
    });

    it("ALL 클릭 시 select(null) emit 된다", async () => {
        const wrapper = mount(TodayFacilitySummary, {
            props: {
                summary: [{ facilityCode: 10, facilityName: "수영장", usageCount: 1 }],
                active: 10,
            },
        });

        const allCard = wrapper.findAll(".summary-card")[0];
        await allCard.trigger("click");

        expect(wrapper.emitted("select")).toBeTruthy();
        expect(wrapper.emitted("select")[0]).toEqual([null]);
    });

    it("시설 카드 클릭 시 select(facilityCode) emit 된다", async () => {
        const wrapper = mount(TodayFacilitySummary, {
            props: {
                summary: [
                    { facilityCode: 10, facilityName: "수영장", usageCount: 3 },
                    { facilityCode: 20, facilityName: "사우나", usageCount: 2 },
                ],
                active: null,
            },
        });

        const cards = wrapper.findAll(".summary-card");
        await cards[2].trigger("click"); // 사우나(20)

        expect(wrapper.emitted("select")).toBeTruthy();
        expect(wrapper.emitted("select")[0]).toEqual([20]);
    });
});
