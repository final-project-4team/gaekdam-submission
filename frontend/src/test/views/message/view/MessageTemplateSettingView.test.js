import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MessageTemplateSettingView from "@/views/message/MessageTemplateSettingView.vue";

// API 모킹
vi.mock("@/api/message/messageTemplateApi", () => ({
    getMessageTemplateSettingApi: vi.fn(),
    getMessageTemplateApi: vi.fn(),
}));
import {
    getMessageTemplateSettingApi,
    getMessageTemplateApi
} from "@/api/message/messageTemplateApi";

// 자식 컴포넌트 스텁
const MessageTemplateCardStub = {
    name: "MessageTemplateCard",
    props: ["stage", "visitorType", "template"],
    emits: ["edit"],
    template: `
    <div class="card-stub">
      <button class="emit-edit" @click="$emit('edit', { stage, template, visitorType })">Edit</button>
    </div>
  `
};

const MessageTemplateModalStub = {
    name: "MessageTemplateModal",
    props: ["mode", "stage", "visitorType", "template", "showModal"],
    emits: ["close", "saved"],
    template: `
    <div class="modal-stub">
      <button class="emit-close" @click="$emit('close')">Close</button>
      <button class="emit-saved" @click="$emit('saved')">Saved</button>
    </div>
  `
};

describe("MessageTemplateSettingView UI/UX 단위 테스트", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // 기본 데이터 설정
        getMessageTemplateSettingApi.mockResolvedValue({
            data: {
                data: [
                    {
                        stageCode: "S1",
                        stageNameKor: "예약시점",
                        templates: {
                            FIRST: { templateCode: "TP_01", title: "첫방문" },
                            REPEAT: { templateCode: "TP_02", title: "재방문" }
                        }
                    }
                ]
            }
        });

        getMessageTemplateApi.mockResolvedValue({
            data: { data: { templateCode: "TP_01", content: "상세내용" } }
        });
    });

    it("초기 로딩 시 템플릿 설정 목록을 가져와 렌더링한다", async () => {
        const wrapper = mount(MessageTemplateSettingView, {
            global: {
                stubs: {
                    MessageTemplateCard: MessageTemplateCardStub,
                    MessageTemplateModal: MessageTemplateModalStub
                }
            }
        });

        await flushPromises();

        expect(getMessageTemplateSettingApi).toHaveBeenCalled();
        // 타임라인 로우가 1개 렌더링되었는지 확인
        expect(wrapper.findAll(".timeline-row").length).toBe(1);
    });

    it("템플릿 카드에서 edit 이벤트 발생 시 모달을 연다", async () => {
        const wrapper = mount(MessageTemplateSettingView, {
            global: {
                stubs: {
                    MessageTemplateCard: MessageTemplateCardStub,
                    MessageTemplateModal: MessageTemplateModalStub
                }
            }
        });

        await flushPromises();

        // 카드에서 edit 이벤트 발생
        await wrapper.find(".emit-edit").trigger("click");
        await flushPromises();

        // 상세 조회 API 호출 확인
        expect(getMessageTemplateApi).toHaveBeenCalledWith("TP_01");

        // 모달 표시 확인
        expect(wrapper.find(".modal-stub").exists()).toBe(true);
    });

    it("모달에서 saved 이벤트 발생 시 목록을 다시 불러온다", async () => {
        const wrapper = mount(MessageTemplateSettingView, {
            global: {
                stubs: {
                    MessageTemplateCard: MessageTemplateCardStub,
                    MessageTemplateModal: MessageTemplateModalStub
                }
            }
        });

        await flushPromises();
        getMessageTemplateSettingApi.mockClear();

        // 모달 진입
        await wrapper.find(".emit-edit").trigger("click");
        await flushPromises();

        // 저장 완료 이벤트
        await wrapper.find(".emit-saved").trigger("click");
        await flushPromises();

        // 목록 재조회 확인
        expect(getMessageTemplateSettingApi).toHaveBeenCalledTimes(1);
        // 모달 닫힘 확인
        expect(wrapper.find(".modal-stub").exists()).toBe(false);
    });
});
