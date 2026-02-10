import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, nextTick } from "vue";

/* =========================
   helpers
   ========================= */
const flush = async () => {
    await Promise.resolve();
    await nextTick();
    await Promise.resolve();
    await nextTick();
};

const mustFindButtonByText = (wrapper, text) => {
    const btn = wrapper.findAll("button").find((b) => b.text().includes(text));
    expect(btn, `button not found: ${text}`).toBeTruthy();
    return btn;
};

const mustFindButtonInCard = (wrapper, cardTitleText, buttonText) => {
    const cards = wrapper.findAll(".card");
    const card = cards.find((c) => c.text().includes(cardTitleText));
    expect(card, `card not found: ${cardTitleText}`).toBeTruthy();

    const btn = card.findAll("button").find((b) => b.text().includes(buttonText));
    expect(btn, `button not found in card(${cardTitleText}): ${buttonText}`).toBeTruthy();
    return btn;
};

/* =========================
   module mocks (hoisted)
   ========================= */
const routerPushMock = vi.fn();

vi.mock("vue-router", () => ({
    useRoute: () => ({ params: { id: "101" } }),
    useRouter: () => ({ push: routerPushMock }),
}));

vi.mock("@/stores/authStore.js", () => ({
    useAuthStore: () => ({
        hotel: { hotelGroupCode: "HG001" },
    }),
}));

// axios api mock
const apiPatchMock = vi.fn();
const apiGetMock = vi.fn();
vi.mock("@/api/axios.js", () => ({
    default: {
        patch: (...args) => apiPatchMock(...args),
        get: (...args) => apiGetMock(...args),
    },
}));

// membership grade list mock
const getMembershipGradeListMock = vi.fn();
vi.mock("@/api/setting/membershipGrade.js", () => ({
    getMembershipGradeList: () => getMembershipGradeListMock(),
}));

// status histories api mock
const getCustomerStatusHistoriesApiMock = vi.fn();
vi.mock("@/api/customer/customerDetailApi", () => ({
    getCustomerStatusHistoriesApi: (args) => getCustomerStatusHistoriesApiMock(args),
}));

// permission guard: always allow
vi.mock("@/composables/usePermissionGuard", () => ({
    usePermissionGuard: () => ({
        withPermission: (_perm, fn) => fn(),
    }),
}));

/* =========================
   composables mocks
   ========================= */
const loadAllMock = vi.fn().mockResolvedValue();
const loadTimelineMock = vi.fn().mockResolvedValue();

const loadReservationsTop5Mock = vi.fn().mockResolvedValue();
const onReservationAllMock = vi.fn();
const openReservationModalMock = vi.fn();

const loadInquiriesTop3Mock = vi.fn().mockResolvedValue();
const onInquiryAllMock = vi.fn();
const openInquiryModalMock = vi.fn();

const saveCardSettingMock = vi.fn();
const resetCardSettingMock = vi.fn();
const onToggleEnabledMock = vi.fn();

const detailRef = ref({
    customerName: "홍길동",
    customerCode: 101,
    status: "ACTIVE",
    inflowChannel: "OTA",
    contacts: [
        { contactType: "PHONE", contactValue: "01012345678", isPrimary: true, marketingOptIn: true },
        { contactType: "EMAIL", contactValue: "test@example.com", isPrimary: false, marketingOptIn: false },
    ],
});
const snapshotRef = ref({
    totalStayCount: 3,
    ltvAmount: 1000000,
    lastUsedAt: "2026-02-01T10:00:00",
    unresolvedInquiryCount: 2,
});
const timelineItemsRef = ref([
    { text: "예약 생성", at: "2026-02-01", type: "RESERVATION" },
    { text: "멤버십 변경", at: "2026-02-02", type: "MEMBERSHIP" },
]);
const chipsRef = ref(["단골", "VIP후보"]);
const primaryPhoneRef = ref("010-1234-5678");
const primaryEmailRef = ref("test@example.com");

const membershipRef = ref({
    gradeName: "VIP",
    membershipStatus: "ACTIVE",
    joinedAt: "2026-01-01T00:00:00",
    expiredAt: "2026-12-31T00:00:00",
    calculatedAt: "2026-02-01T00:00:00",
});
const loyaltyRef = ref({
    gradeName: "EXCELLENT",
    loyaltyStatus: "ACTIVE",
    joinedAt: "2026-01-10T00:00:00",
    calculatedAt: "2026-02-01T00:00:00",
});

vi.mock("@/views/customer/composables/useCustomerDetailPage.js", () => ({
    useCustomerDetailPage: () => ({
        detail: detailRef,
        snapshot: snapshotRef,
        timelineItems: timelineItemsRef,
        badges: ref([]),
        chips: chipsRef,
        primaryPhone: primaryPhoneRef,
        primaryEmail: primaryEmailRef,
        membership: membershipRef,
        loyalty: loyaltyRef,
        loadAll: loadAllMock,
        loadTimeline: loadTimelineMock,
    }),
}));

vi.mock("@/views/customer/composables/useCustomerReservations.js", () => ({
    useCustomerReservations: () => ({
        reservationColumns: ref([{ key: "reservationCode", label: "예약코드" }]),
        reservationLoading: ref(false),
        reservationRows: ref([{ reservationCode: 1 }, { reservationCode: 2 }]),
        loadReservationsTop5: loadReservationsTop5Mock,

        showReservationModal: ref(false),
        selectedReservationDetail: ref(null),
        openReservationModal: openReservationModalMock,
        closeReservationModal: vi.fn(),

        showReservationAllModal: ref(false),
        reservationAllLoading: ref(false),
        reservationAllRows: ref([]),
        onReservationAll: onReservationAllMock,
        closeReservationAllModal: vi.fn(),

        reservationRange: ref({}),
        setReservationMonths: vi.fn(),
        resetReservationRange: vi.fn(),
        applyReservationRange: vi.fn(),
    }),
}));

vi.mock("@/views/customer/composables/useCustomerInquiries.js", () => ({
    useCustomerInquiries: () => ({
        inquiryColumns: ref([{ key: "inquiryCode", label: "문의코드" }]),
        inquiryLoading: ref(false),
        inquiryRows: ref([{ inquiryCode: 10 }, { inquiryCode: 11 }]),
        loadInquiriesTop3: loadInquiriesTop3Mock,

        showInquiryModal: ref(false),
        selectedInquiryDetail: ref(null),
        openInquiryModal: openInquiryModalMock,
        closeInquiryModal: vi.fn(),

        showInquiryAllModal: ref(false),
        inquiryAllLoading: ref(false),
        inquiryAllRows: ref([]),
        onInquiryAll: onInquiryAllMock,
        closeInquiryAllModal: vi.fn(),

        inquiryRange: ref({}),
        setInquiryMonths: vi.fn(),
        resetInquiryRange: vi.fn(),
        applyInquiryRange: vi.fn(),
    }),
}));

vi.mock("@/views/customer/composables/useCardSettingDnd.js", () => ({
    useCardSettingDnd: () => {
        const showCardSettingModal = ref(false);

        const leftCards = ref([
            { id: "snapshot", label: "고객 스냅샷", enabled: true },
            { id: "timeline", label: "최근 타임라인", enabled: true },
            { id: "reservation", label: "예약/이용(최근 5건)", enabled: true },
            { id: "voc", label: "문의/클레임(최근 3건)", enabled: true },
        ]);
        const rightCards = ref([
            { id: "memo", label: "고객 메모", enabled: true },
            { id: "statusHistory", label: "고객 상태 변경 이력", enabled: true },
            { id: "membership", label: "멤버십", enabled: true },
            { id: "loyalty", label: "로열티", enabled: true },
        ]);

        const draftLeft = ref([
            { id: "snapshot", label: "고객 스냅샷", enabled: true },
            { id: "timeline", label: "최근 타임라인", enabled: true },
        ]);
        const draftRight = ref([
            { id: "memo", label: "고객 메모", enabled: true },
            { id: "membership", label: "멤버십", enabled: true },
        ]);

        return {
            showCardSettingModal,
            onCardSetting: () => (showCardSettingModal.value = true),
            saveCardSetting: saveCardSettingMock,
            resetCardSetting: resetCardSettingMock,

            leftCards,
            rightCards,
            draftLeft,
            draftRight,

            onToggleEnabled: onToggleEnabledMock,
            dragState: ref({ id: null }),
            isOver: () => false,
            showIndicator: () => false,
            onDragStart: vi.fn(),
            onDragEnter: vi.fn(),
            onDragOver: vi.fn(),
            onDragLeave: vi.fn(),
            onDropAt: vi.fn(),
            onDragEnd: vi.fn(),
        };
    },
}));

/* =========================
   stubs
   ========================= */
const BaseButtonStub = {
    name: "BaseButton",
    props: ["type", "size", "disabled"],
    emits: ["click"],
    template: `<button :disabled="disabled" @click="$emit('click')"><slot /></button>`,
};

const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
    <div class="modal">
      <div class="modal-title">{{ title }}</div>
      <div class="modal-content"><slot /></div>
      <div class="modal-footer"><slot name="footer" /></div>
      <button class="modal-close" @click="$emit('close')">X</button>
    </div>
  `,
};

const TableWithPagingStub = {
    name: "TableWithPaging",
    props: ["columns", "rows", "pageSize"],
    emits: ["row-click"],
    template: `
    <div class="table">
      <button
        v-for="(r, i) in rows"
        :key="i"
        class="row-btn"
        @click="$emit('row-click', r)"
      >
        row-{{ i }}
      </button>
    </div>
  `,
};

const CustomerMemoViewStub = {
    name: "CustomerMemoView",
    props: ["customerCode"],
    emits: ["changed"],
    template: `<button class="memo-changed" @click="$emit('changed')">memo-changed</button>`,
};

/* =========================
   SUT import (after mocks)
   ========================= */
import CustomerDetailView from "@/views/customer/view/CustomerDetailView.vue";

const mountView = () =>
    mount(CustomerDetailView, {
        global: {
            stubs: {
                BaseButton: BaseButtonStub,
                BaseModal: BaseModalStub,
                TableWithPaging: TableWithPagingStub,
                CustomerMemoView: CustomerMemoViewStub,
            },
        },
    });

/* =========================
   tests
   ========================= */
describe("CustomerDetailView", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // 기본: SYSTEM 이력
        getCustomerStatusHistoriesApiMock.mockResolvedValue({
            data: {
                data: {
                    content: [
                        {
                            beforeStatus: "ACTIVE",
                            afterStatus: "CAUTION",
                            changeSource: "SYSTEM",
                            employeeName: null,
                            employeeCode: null,
                            changedAt: "2026-02-02T10:00:00",
                            changeReason: "AUTO_RULE",
                        },
                    ],
                },
            },
        });

        getMembershipGradeListMock.mockResolvedValue([
            { membershipGradeCode: 1, gradeName: "VIP", membershipGradeStatus: "ACTIVE" },
            { membershipGradeCode: 2, gradeName: "GOLD", membershipGradeStatus: "ACTIVE" },
            { membershipGradeCode: 9, gradeName: "OLD", membershipGradeStatus: "INACTIVE" },
        ]);

        apiPatchMock.mockResolvedValue({ data: { data: {} } });
        globalThis.alert = vi.fn();
    });

    it("mount 시 loadAll/loadReservationsTop5/loadInquiriesTop3/loadStatusTop1 호출", async () => {
        mountView();
        await flush();

        expect(loadAllMock).toHaveBeenCalledTimes(1);
        expect(loadReservationsTop5Mock).toHaveBeenCalledTimes(1);
        expect(loadInquiriesTop3Mock).toHaveBeenCalledTimes(1);
        expect(getCustomerStatusHistoriesApiMock).toHaveBeenCalledTimes(1);
    });

    it("헤더 렌더 + tag class 분기(VIP/EXCELLENT/ACTIVE)", async () => {
        const w = mountView();
        await flush();

        expect(w.text()).toContain("홍길동");
        expect(w.text()).toContain("고객코드 #101");

        // 고객상태 tag--ok
        const statusTag = w.findAll(".badges .tag")[0];
        expect(statusTag.classes()).toContain("tag--ok");

        // 멤버십 VIP tag--vip
        const membershipTag = w.findAll(".badges .tag")[1];
        expect(membershipTag.classes()).toContain("tag--vip");

        // 로열티 EXCELLENT tag--excellent
        const loyaltyTag = w.findAll(".badges .tag")[2];
        expect(loyaltyTag.classes()).toContain("tag--excellent");

        // chips
        expect(w.findAll(".chips .tag--chip").length).toBeGreaterThan(0);
    });

    it("목록으로 클릭 시 router.push 호출", async () => {
        const w = mountView();
        await flush();

        await mustFindButtonByText(w, "목록으로").trigger("click");
        expect(routerPushMock).toHaveBeenCalledWith({ name: "CustomerList" });
    });

    it("연락처 전체보기 -> 모달 열림/닫힘 + contacts 렌더", async () => {
        const w = mountView();
        await flush();

        await mustFindButtonByText(w, "연락처 전체보기").trigger("click");
        await flush();

        expect(w.find(".modal-title").text()).toBe("연락처 전체보기");
        expect(w.text()).toContain("PHONE");
        expect(w.text()).toContain("EMAIL");
        expect(w.text()).toContain("마케팅 동의");

        // 닫기 버튼
        await mustFindButtonByText(w, "닫기").trigger("click");
        await flush();

        expect(w.find(".modal-title").exists()).toBe(false);
    });

    it("타임라인 empty 분기", async () => {
        // 타임라인 비우고 mount
        timelineItemsRef.value = [];
        const w = mountView();
        await flush();

        expect(w.text()).toContain("타임라인 데이터가 없습니다.");

        // 복구
        timelineItemsRef.value = [
            { text: "예약 생성", at: "2026-02-01", type: "RESERVATION" },
        ];
    });

    it("예약/문의 전체보기 클릭 시 onReservationAll/onInquiryAll 호출", async () => {
        const w = mountView();
        await flush();

        // 카드별로 정확히 클릭
        await mustFindButtonInCard(w, "예약/이용 (최근 5건)", "전체보기").trigger("click");
        await mustFindButtonInCard(w, "문의/클레임 (최근 3건)", "전체보기").trigger("click");

        expect(onReservationAllMock).toHaveBeenCalledTimes(1);
        expect(onInquiryAllMock).toHaveBeenCalledTimes(1);
    });

    it("상태이력 SYSTEM 분기: 변경 주체 SYSTEM, 변경자 '-'", async () => {
        const w = mountView();
        await flush();

        const card = w.findAll(".card").find((c) => c.text().includes("고객 상태 변경 이력"));
        expect(card).toBeTruthy();
        expect(card.text()).toContain("SYSTEM");
        expect(card.text()).toContain("변경자");
    });

    it("상태이력 MANUAL 분기: 변경 주체 MANUAL, 변경자 employeeName/employeeCode 렌더", async () => {
        getCustomerStatusHistoriesApiMock.mockResolvedValueOnce({
            data: {
                data: {
                    content: [
                        {
                            beforeStatus: "ACTIVE",
                            afterStatus: "INACTIVE",
                            changeSource: "MANUAL",
                            employeeName: "관리자A",
                            employeeCode: 10001,
                            changedAt: "2026-02-02T10:00:00",
                            changeReason: "CS",
                        },
                    ],
                },
            },
        });

        const w = mountView();
        await flush();

        const card = w.findAll(".card").find((c) => c.text().includes("고객 상태 변경 이력"));
        expect(card.text()).toContain("MANUAL");
        expect(card.text()).toContain("관리자A");
    });

    it("카드 설정 모달: 열기 + 체크박스 토글 + 기본값/저장 호출", async () => {
        const w = mountView();
        await flush();

        await mustFindButtonByText(w, "카드 설정").trigger("click");
        await flush();

        expect(w.find(".modal-title").text()).toBe("카드 설정");

        // 체크박스 하나 토글 (v-model + onToggleEnabled 호출)
        const firstCheckbox = w.find('input[type="checkbox"]');
        expect(firstCheckbox.exists()).toBe(true);
        await firstCheckbox.setValue(false);
        expect(onToggleEnabledMock).toHaveBeenCalled();

        await mustFindButtonByText(w, "기본값").trigger("click");
        expect(resetCardSettingMock).toHaveBeenCalledTimes(1);

        await mustFindButtonByText(w, "저장").trigger("click");
        expect(saveCardSettingMock).toHaveBeenCalledTimes(1);
    });

    it("멤버십 변경 성공 플로우: 모달 열기 -> 저장 -> api.patch payload 검증 -> alert + 재조회", async () => {
        const w = mountView();
        await flush();

        await mustFindButtonByText(w, "멤버십 변경").trigger("click");
        await flush();

        expect(w.find(".modal-title").text()).toBe("멤버십 변경");

        // 입력 채우기
        const inputs = w.findAll("input");
        const employeeInput = inputs.find((i) => i.attributes("placeholder")?.includes("10001"));
        expect(employeeInput).toBeTruthy();
        await employeeInput.setValue("10001");

        const selects = w.findAll("select");
        // 첫 select: grade, 두번째: status
        expect(selects.length).toBeGreaterThanOrEqual(2);
        await selects[0].setValue("2"); // GOLD
        await selects[1].setValue("INACTIVE");

        const dateInput = w.find('input[type="date"]');
        await dateInput.setValue("2026-12-31");

        const textarea = w.find("textarea");
        await textarea.setValue("CS보상");

        await mustFindButtonByText(w, "저장").trigger("click");
        await flush();

        expect(apiPatchMock).toHaveBeenCalledTimes(1);
        expect(apiPatchMock.mock.calls[0][0]).toBe("/memberships/customers/101/manual");

        // payload 검증
        const payload = apiPatchMock.mock.calls[0][1];
        expect(payload).toEqual({
            membershipGradeCode: 2,
            membershipStatus: "INACTIVE",
            expiredAt: "2026-12-31T00:00:00",
            changeReason: "CS보상",
            employeeCode: 10001,
        });

        expect(globalThis.alert).toHaveBeenCalledWith("멤버십 변경 완료");
        // loadAll은 mount 때 1번 + 저장 후 1번 더
        expect(loadAllMock).toHaveBeenCalledTimes(2);
        expect(getCustomerStatusHistoriesApiMock).toHaveBeenCalledTimes(2);

        // 모달 닫힘 확인
        expect(w.find(".modal-title").exists()).toBe(false);
    });

    it("멤버십 변경 실패 플로우: api.patch reject -> 실패 alert", async () => {
        apiPatchMock.mockRejectedValueOnce(new Error("fail"));

        const w = mountView();
        await flush();

        await mustFindButtonByText(w, "멤버십 변경").trigger("click");
        await flush();

        // 최소 입력만 넣고 저장
        const inputs = w.findAll("input");
        const employeeInput = inputs.find((i) => i.attributes("placeholder")?.includes("10001"));
        await employeeInput.setValue("10001");

        const selects = w.findAll("select");
        await selects[0].setValue("1");

        await mustFindButtonByText(w, "저장").trigger("click");
        await flush();

        expect(globalThis.alert).toHaveBeenCalledWith("멤버십 변경 실패(형식/값 확인)");
        // 실패 시 모달은 그대로 존재
        expect(w.find(".modal-title").text()).toBe("멤버십 변경");
    });

    it("고객 메모 changed 이벤트 -> loadTimeline + loadStatusTop1 재호출", async () => {
        const w = mountView();
        await flush();

        await w.find(".memo-changed").trigger("click");
        await flush();

        expect(loadTimelineMock).toHaveBeenCalledTimes(1);
        // mount에서 1번 + memo changed로 1번
        expect(getCustomerStatusHistoriesApiMock).toHaveBeenCalledTimes(2);
    });
});
