import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingHotel from "@/views/setting/SettingHotel.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */
const hotelGroupListMock = vi.fn();
vi.mock("@/api/hotelGroupApi.js", () => ({
    hotelGroupList: () => hotelGroupListMock(),
}));

/** -----------------------------
 *  stubs
 *  ----------------------------- */
const ListViewStub = {
    name: "ListView",
    props: ["columns", "rows", "detail"],
    emits: ["update:detail", "row-click"],
    template: `
    <div data-test="list-view">
        <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>
        
        <!-- Detail Form Slot -->
        <slot name="detail-form"></slot>
        
        <!-- Helper to emit row-click -->
        <button 
            v-if="rows && rows.length > 0" 
            data-test="row-click-btn" 
            @click="$emit('row-click', rows[0])"
        >
            Row Click
        </button>
    </div>
    `,
};

const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
    <div data-test="base-modal">
        <h1 data-test="modal-title">{{ title }}</h1>
        <button data-test="modal-close" @click="$emit('close')">X</button>
        <slot></slot>
    </div>
    `,
};

describe("SettingHotel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mountComponent = () => {
        return mount(SettingHotel, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    BaseModal: BaseModalStub,
                },
            },
        });
    };

    it("초기 로딩: API 호출 후 리스트 데이터 바인딩", async () => {
        const mockData = [
            { hotelGroupCode: "HG001", hotelGroupName: "Group A" },
            { hotelGroupCode: "HG002", hotelGroupName: "Group B" }
        ];
        hotelGroupListMock.mockResolvedValue(mockData);

        const wrapper = mountComponent();
        await flushPromises();

        expect(hotelGroupListMock).toHaveBeenCalledTimes(1);
        expect(wrapper.get('[data-test="rows-count"]').text()).toBe("2");
    });

    it("행 클릭: 모달이 열리고 데이터가 표시된다", async () => {
        const mockRow = {
            hotelGroupCode: "HG001",
            hotelGroupName: "Group A",
            reservationNo: "RV001",
            customerName: "홍길동",
            roomType: "스위트",
            checkinDate: "2024-01-01",
            checkoutDate: "2024-01-02",
            status: "투숙중"
        };
        hotelGroupListMock.mockResolvedValue([mockRow]);

        const wrapper = mountComponent();
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(false);

        // Row Click 시뮬레이션
        await wrapper.get('[data-test="row-click-btn"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);
        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("예약 상세");

        // 데이터 바인딩 확인
        const detailText = wrapper.find('.detail-view').text();
        expect(detailText).toContain("RV001");
        expect(detailText).toContain("홍길동");
    });

    it("모달 닫기: 모달이 사라진다", async () => {
        const mockRow = { hotelGroupCode: "HG001" };
        hotelGroupListMock.mockResolvedValue([mockRow]);

        const wrapper = mountComponent();
        await flushPromises();

        // Open
        await wrapper.get('[data-test="row-click-btn"]').trigger("click");
        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(true);

        // Close
        await wrapper.get('[data-test="modal-close"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="base-modal"]').exists()).toBe(false);
    });

    it("상세 검색 폼: 입력 필드 바인딩 (v-model) 동작 확인", async () => {
        hotelGroupListMock.mockResolvedValue([]);
        const wrapper = mountComponent();
        await flushPromises();

        // ListView slot(detail-form)이 렌더링되었는지 확인
        const customerInput = wrapper.find('input'); // 첫번째 인풋 (고객명)
        await customerInput.setValue("테스트고객");

        // detailForm ref가 업데이트 되었는지 확인
        expect(wrapper.vm.detailForm.customerName).toBe("테스트고객");
    });
});
