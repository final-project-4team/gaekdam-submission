import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

import LoyaltyDetailModal from "@/views/customer/modal/LoyaltyHistoryModal.vue";
import { getCustomerLoyaltyHistoriesApi } from "@/api/customer/loyaltyApi";

vi.mock("@/api/customer/loyaltyApi", () => ({
    getCustomerLoyaltyHistoriesApi: vi.fn(),
}));

const stubs = {
    BaseModal: {
        props: ["title"],
        template: `
          <div class="base-modal">
            <h1>{{ title }}</h1>
            <button class="close" @click="$emit('close')">닫기</button>
            <div class="body"><slot /></div>
            <div class="footer"><slot name="footer" /></div>
          </div>
        `,
    },
    BaseButton: {
        template: `<button @click="$emit('click')"><slot /></button>`,
    },
};

describe("LoyaltyDetailModal", () => {
    beforeEach(() => vi.clearAllMocks());

    it("open=true면 기본 12개월 preset으로 API 호출하고 rows 렌더링", async () => {
        getCustomerLoyaltyHistoriesApi.mockResolvedValue({
            content: [
                {
                    changedAt: "2026-01-01T10:00:00",
                    changeType: "UPGRADE",
                    content: "GOLD",
                    changeSource: "MANUAL",
                    changedByEmployeeCode: "E001",
                },
            ],
            page: 1,
            size: 20,
            totalElements: 1,
            totalPages: 1,
        });

        const wrapper = mount(LoyaltyDetailModal, {
            props: {
                open: false, // 중요: watch 트리거용
                customerCode: 123,
                loyalty: {
                    gradeName: "GOLD",
                    loyaltyStatus: "ACTIVE",
                    joinedAt: "2026-01-01",
                    calculatedAt: "2026-01-02",
                },
            },
            global: { stubs },
        });

        await wrapper.setProps({ open: true }); // 중요: open 변경 발생
        await nextTick();
        await flushPromises();

        expect(getCustomerLoyaltyHistoriesApi).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain("로열티 상세");
        expect(wrapper.text()).toContain("변경 이력");
        expect(wrapper.text()).toContain("UPGRADE");
        expect(wrapper.text()).toContain("GOLD");
        expect(wrapper.text()).toContain("MANUAL(E001)");
    });

    it("rows가 0이면 '조회 결과가 없습니다.' 노출", async () => {
        getCustomerLoyaltyHistoriesApi.mockResolvedValue({
            content: [],
            page: 1,
            size: 20,
            totalElements: 0,
            totalPages: 1,
        });

        const wrapper = mount(LoyaltyDetailModal, {
            props: { open: false, customerCode: 123, loyalty: null },
            global: { stubs },
        });

        await wrapper.setProps({ open: true });
        await nextTick();
        await flushPromises();

        expect(getCustomerLoyaltyHistoriesApi).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain("조회 결과가 없습니다.");
    });
});
