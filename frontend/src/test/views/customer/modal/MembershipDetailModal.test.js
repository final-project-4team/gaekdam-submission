import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

import MembershipDetailModal from "@/views/customer/modal/MembershipHistoryModal.vue";
import { getCustomerMembershipHistoriesApi } from "@/api/customer/membershipApi";

vi.mock("@/api/customer/membershipApi", () => ({
    getCustomerMembershipHistoriesApi: vi.fn(),
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

describe("MembershipDetailModal", () => {
    beforeEach(() => vi.clearAllMocks());

    it("open=true면 API 호출하고 rows 렌더링", async () => {
        getCustomerMembershipHistoriesApi.mockResolvedValue({
            content: [
                {
                    changedAt: "2026-01-01T10:00:00",
                    changeType: "JOIN",
                    content: "SILVER",
                    changeSource: "SYSTEM",
                },
            ],
            page: 1,
            size: 20,
            totalElements: 1,
            totalPages: 1,
        });

        const wrapper = mount(MembershipDetailModal, {
            props: {
                open: false, // 중요
                customerCode: 123,
                membership: {
                    gradeName: "SILVER",
                    membershipStatus: "ACTIVE",
                    joinedAt: "2026-01-01",
                    calculatedAt: "2026-01-02",
                },
            },
            global: { stubs },
        });

        await wrapper.setProps({ open: true }); // 중요
        await nextTick();
        await flushPromises();

        expect(getCustomerMembershipHistoriesApi).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain("멤버십 상세");
        expect(wrapper.text()).toContain("JOIN");
        expect(wrapper.text()).toContain("SILVER");
        expect(wrapper.text()).toContain("SYSTEM");
    });

    it("rows가 0이면 '조회 결과가 없습니다.' 노출", async () => {
        getCustomerMembershipHistoriesApi.mockResolvedValue({
            content: [],
            page: 1,
            size: 20,
            totalElements: 0,
            totalPages: 1,
        });

        const wrapper = mount(MembershipDetailModal, {
            props: { open: false, customerCode: 123, membership: null },
            global: { stubs },
        });

        await wrapper.setProps({ open: true });
        await nextTick();
        await flushPromises();

        expect(getCustomerMembershipHistoriesApi).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain("조회 결과가 없습니다.");
    });
});
