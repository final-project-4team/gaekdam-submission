import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CustomerStatusHistoryModal from "@/views/customer/modal/CustomerStatusHistoryModal.vue";

vi.mock("@/api/customer/customerDetailApi", () => ({
    getCustomerStatusHistoriesApi: vi.fn(),
}));
import { getCustomerStatusHistoriesApi } from "@/api/customer/customerDetailApi";

const stubs = {
    BaseModal: {
        props: ["title"],
        template: `
          <div class="base-modal">
            <div class="title">{{ title }}</div>
            <slot />
            <slot name="footer" />
          </div>
        `,
    },
    TableWithPaging: {
        props: ["columns", "rows", "pageSize", "page", "total"],
        template: `
          <div class="table">
            <div v-for="r in (rows || [])" :key="r.id" class="row">
              {{ r.changedAt }} {{ r.beforeStatus }} {{ r.afterStatus }} {{ r.changedBy }} {{ r.reason }}
            </div>
          </div>
        `,
    },
};


describe("CustomerStatusHistoryModal", () => {
    beforeEach(() => vi.clearAllMocks());

    it("open=true면 API 호출하고 rows 렌더링", async () => {
        getCustomerStatusHistoriesApi.mockResolvedValue({
            data: { data: { content: [{ changed_at: "2026-01-01T10:00:00", before_status: "A", after_status: "B", change_source: "MANUAL", employee_name: "Kim", change_reason: "test" }] } }
        });

        const wrapper = mount(CustomerStatusHistoryModal, {
            props: { open: true, customerCode: 123 },
            global: { stubs }, //
        });

        await flushPromises();

        expect(getCustomerStatusHistoriesApi).toHaveBeenCalledTimes(1);
        expect(wrapper.text()).toContain("고객 상태 변경 이력");
        expect(wrapper.text()).toContain("A");
        expect(wrapper.text()).toContain("B");
        expect(wrapper.text()).toContain("Kim");
        expect(wrapper.text()).toContain("test");
    });

    it("API 실패하면 에러 문구 노출", async () => {
        getCustomerStatusHistoriesApi.mockRejectedValue(new Error("fail"));

        const wrapper = mount(CustomerStatusHistoryModal, {
            props: { open: true, customerCode: 123 },
            global: { stubs }, //
        });

        await flushPromises();
        expect(wrapper.text()).toContain("상태 변경 이력을 불러오지 못했습니다.");
    });

    it("rows가 0이면 '이력이 없습니다.' 노출", async () => {
        getCustomerStatusHistoriesApi.mockResolvedValue({
            data: { data: { content: [] } }
        });

        const wrapper = mount(CustomerStatusHistoryModal, {
            props: { open: true, customerCode: 123 },
            global: { stubs }, //
        });

        await flushPromises();
        expect(wrapper.text()).toContain("이력이 없습니다.");
    });
});
