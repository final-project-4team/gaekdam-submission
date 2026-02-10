import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MessageHistoryView from "@/views/message/MessageHistoryView.vue";

// API 모킹
vi.mock("@/api/message/messageSendHistoryApi", () => ({
    getMessageSendHistoryApi: vi.fn(),
    getMessageSendHistoryDetailApi: vi.fn(),
}));
import {
    getMessageSendHistoryApi,
    getMessageSendHistoryDetailApi
} from "@/api/message/messageSendHistoryApi";

vi.mock("@/api/property/propertyApi", () => ({
    getPropertyListByHotelGroupApi: vi.fn(),
}));
import { getPropertyListByHotelGroupApi } from "@/api/property/propertyApi";

vi.mock("@/api/message/messageStageApi", () => ({
    getMessageJourneyStagesApi: vi.fn(),
}));
import { getMessageJourneyStagesApi } from "@/api/message/messageStageApi";

// 자식 컴포넌트 스텁
const ListViewStub = {
    name: "ListView",
    props: ["columns", "rows", "page", "pageSize", "total", "filters"],
    emits: ["filter", "sort-change", "page-change", "row-click"],
    template: `
    <div class="list-view-stub">
      <div class="row-count">{{ rows.length }}</div>
      <button class="emit-filter" @click="$emit('filter', { status: 'SENT' })">Filter</button>
      <button class="emit-page" @click="$emit('page-change', 2)">Page</button>
      <button class="emit-row-click" @click="$emit('row-click', { sendCode: 'MSG_001' })">Row</button>
    </div>
  `
};

const MessageHistoryDetailDrawerStub = {
    name: "MessageHistoryDetailDrawer",
    props: ["visible", "detail"],
    emits: ["close"],
    template: `
    <div v-if="visible" class="drawer-stub">
      Detail: {{ detail?.sendCode }}
      <button @click="$emit('close')">Close</button>
    </div>
  `
};

describe("MessageHistoryView UI/UX 단위 테스트", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // 기본 데이터 모킹
        getMessageSendHistoryApi.mockResolvedValue({
            data: {
                data: {
                    content: [
                        { sendCode: "MSG_001", status: "SENT", templateTitle: "예약확인" }
                    ],
                    totalElements: 1
                }
            }
        });

        getPropertyListByHotelGroupApi.mockResolvedValue({
            data: { data: [{ propertyName: "서울점", propertyCode: "SEOUL" }] }
        });

        getMessageJourneyStagesApi.mockResolvedValue({
            data: { data: [{ stageNameKor: "예약시점", stageCode: "RESERVED" }] }
        });
    });

    it("초기 로딩 시 필터 옵션과 목록 데이터를 가져온다", async () => {
        const wrapper = mount(MessageHistoryView, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    MessageHistoryDetailDrawer: MessageHistoryDetailDrawerStub
                }
            }
        });

        await flushPromises();

        // API 호출 확인
        expect(getPropertyListByHotelGroupApi).toHaveBeenCalled();
        expect(getMessageJourneyStagesApi).toHaveBeenCalled();
        expect(getMessageSendHistoryApi).toHaveBeenCalled();

        // 데이터 바인딩 확인 (ListView setup)
        expect(wrapper.find(".row-count").text()).toBe("1");
    });

    it("필터 변경 시 목록을 다시 조회한다", async () => {
        const wrapper = mount(MessageHistoryView, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    MessageHistoryDetailDrawer: MessageHistoryDetailDrawerStub
                }
            }
        });

        await flushPromises();
        getMessageSendHistoryApi.mockClear();

        // 필터 이벤트 발생
        await wrapper.find(".emit-filter").trigger("click");
        await flushPromises();

        expect(getMessageSendHistoryApi).toHaveBeenCalled();
        const callArgs = getMessageSendHistoryApi.mock.calls[0][0];
        expect(callArgs.search.status).toBe("SENT");
        expect(callArgs.page).toBe(1); // 필터 변경 시 1페이지로 리셋
    });

    it("페이지 변경 시 해당 페이지 데이터를 조회한다", async () => {
        const wrapper = mount(MessageHistoryView, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    MessageHistoryDetailDrawer: MessageHistoryDetailDrawerStub
                }
            }
        });

        await flushPromises();
        getMessageSendHistoryApi.mockClear();

        await wrapper.find(".emit-page").trigger("click");
        await flushPromises();

        expect(getMessageSendHistoryApi).toHaveBeenCalled();
        const callArgs = getMessageSendHistoryApi.mock.calls[0][0];
        expect(callArgs.page).toBe(2);
    });

    it("목록 클릭 시 상세 정보를 조회하고 드로어를 연다", async () => {
        getMessageSendHistoryDetailApi.mockResolvedValue({
            data: { data: { sendCode: "MSG_001", content: "내용" } }
        });

        const wrapper = mount(MessageHistoryView, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    MessageHistoryDetailDrawer: MessageHistoryDetailDrawerStub
                }
            }
        });

        await flushPromises();

        // 행 클릭
        await wrapper.find(".emit-row-click").trigger("click");
        await flushPromises();

        expect(getMessageSendHistoryDetailApi).toHaveBeenCalledWith("MSG_001");

        // 드로어 열림 확인
        const drawer = wrapper.find(".drawer-stub");
        expect(drawer.exists()).toBe(true);
        expect(drawer.text()).toContain("Detail: MSG_001");
    });
});
