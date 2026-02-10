import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

import ActivityDetailModal from "@/views/activity/modal/ActivityDetailModal.vue";

/** -----------------------------
 * mocks
 * ----------------------------- */
const getReservationDetailApiMock = vi.fn();
vi.mock("@/api/reservation/reservationDetailApi", () => ({
    getReservationDetailApi: (...args) => getReservationDetailApiMock(...args),
}));

/** -----------------------------
 * stubs
 * ----------------------------- */
const BaseModalStub = {
    name: "BaseModal",
    props: ["title", "size"],
    emits: ["close"],
    template: `
      <div data-test="basemodal">
        <div data-test="modal-title">{{ title }}</div>
        <div data-test="modal-size">{{ size }}</div>
        <button data-test="modal-close" @click="$emit('close')">x</button>
        <slot></slot>
      </div>
    `,
};

function mountPage(props = { reservationCode: 1001, reason: "R" }) {
    return mount(ActivityDetailModal, {
        props,
        global: {
            stubs: { BaseModal: BaseModalStub },
        },
    });
}

function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

beforeEach(() => {
    vi.clearAllMocks();
});

/** 샘플 detail */
const sampleDetail = (overrides = {}) => ({
    customer: {
        customerName: "홍길동",
        isMember: true,
        phoneNumber: "01011112222",
        nationalityType: "KOR",
        contractType: "PERSONAL",
        customerStatus: "ACTIVE",
        ...(overrides.customer || {}),
    },
    reservation: {
        reservationCode: 9001,
        reservationStatus: "CONFIRMED",
        reservationChannel: "OTA",
        guestCount: 2,
        checkinDate: "2026-02-01",
        checkoutDate: "2026-02-02",
        reservationRoomPrice: 100000,
        reservationPackagePrice: 20000,
        totalPrice: 120000,
        requestNote: "고층 요청",
        ...(overrides.reservation || {}),
    },
    room: {
        roomNumber: "1203",
        floor: 12,
        roomTypeName: "디럭스",
        roomBasePrice: 150000,
        ...(overrides.room || {}),
    },
    stay: {
        stayStatus: "STAYING",
        guestCount: 2,
        actualCheckinAt: "2026-02-01 15:00",
        actualCheckoutAt: null,
        ...(overrides.stay || {}),
    },
    packageInfo: {
        packageName: "허니문",
        packageContent: "조식+수영장",
        packagePrice: 20000,
        facilities: [
            { facilityName: "수영장", includedQuantity: 2 },
            { facilityName: "사우나", includedQuantity: 1 },
        ],
        ...(overrides.packageInfo || {}),
    },
    facilityUsages: [
        { facilityName: "수영장", usageCount: 2, lastUsedAt: "2026-02-01 18:00" },
    ],
    ...overrides,
});

describe("ActivityDetailModal UI/UX unit", () => {
    it("로딩: pending 동안 로딩 문구 → 응답 후 상세 렌더", async () => {
        const d = deferred();

        // ✅ pending으로 로딩 화면 확정
        getReservationDetailApiMock.mockReturnValueOnce(d.promise);

        const wrapper = mountPage();

        // onMounted가 1 tick 뒤 실행
        await nextTick();

        expect(wrapper.text()).toContain("상세 정보를 불러오는 중입니다.");

        // 응답 완료
        d.resolve({ data: { data: sampleDetail() } });
        await flushPromises();

        expect(getReservationDetailApiMock).toHaveBeenCalledTimes(1);
        expect(getReservationDetailApiMock).toHaveBeenCalledWith(1001, "R");

        expect(wrapper.text()).toContain("홍길동");
        expect(wrapper.text()).toContain("멤버 고객");
        expect(wrapper.find(".member-badge").exists()).toBe(true);
    });

    it("detail이 null이면: '상세 정보가 없습니다.' 상태가 보인다", async () => {
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: { data: null },
        });

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.text()).toContain("상세 정보가 없습니다.");
    });

    it("MEMBER 뱃지: isMember=true일 때만 보인다", async () => {
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail({ customer: { isMember: true } }) },
        });

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.find(".member-badge").exists()).toBe(true);
        expect(wrapper.text()).toContain("멤버 고객");
    });

    it("MEMBER 뱃지: isMember=false면 뱃지 없고 '비멤버 고객' 표시", async () => {
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail({ customer: { isMember: false } }) },
        });

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.find(".member-badge").exists()).toBe(false);
        expect(wrapper.text()).toContain("비멤버 고객");
    });

    it("status-badge: stayStatus computed 값이 class/텍스트로 반영된다", async () => {
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail({ stay: { stayStatus: "COMPLETED" } }) },
        });

        const wrapper = mountPage();
        await flushPromises();

        const badge = wrapper.get(".status-badge");
        expect(badge.text()).toContain("COMPLETED");
        expect(badge.classes()).toContain("COMPLETED");
    });

    it("formatPrice: 숫자는 '원' 포함, null이면 '-'로 표시된다", async () => {
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: {
                data: sampleDetail({
                    reservation: {
                        reservationRoomPrice: null,
                        reservationPackagePrice: 0,
                        totalPrice: 120000,
                    },
                }),
            },
        });

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.text()).toContain("-"); // null
        expect(wrapper.text()).toContain("0원"); // 0
        expect(wrapper.text()).toContain("120,000원"); // 120000
    });

    it("formatPhone: 11자리 숫자면 010-xxxx-xxxx로 포맷된다", async () => {
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail({ customer: { phoneNumber: "01011112222" } }) },
        });

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.text()).toContain("010-1111-2222");
    });

    it("패키지: packageInfo 있으면 패키지명/가격/시설 구성 렌더", async () => {
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail() },
        });

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.text()).toContain("패키지 정보");
        expect(wrapper.text()).toContain("허니문");
        expect(wrapper.text()).toContain("20,000원");
        expect(wrapper.text()).toContain("수영장");
        expect(wrapper.text()).toContain("x2");
    });

    it("패키지: packageInfo 없으면 '패키지 정보가 없습니다'가 렌더", async () => {
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail({ packageInfo: null }) },
        });

        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.text()).toContain("패키지 정보가 없습니다");
    });

    it("부대시설: facilityUsages 있으면 테이블 렌더, 없으면 빈 문구 렌더", async () => {
        // 1) 테이블
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: {
                data: sampleDetail({
                    facilityUsages: [{ facilityName: "수영장", usageCount: 1, lastUsedAt: "x" }],
                }),
            },
        });

        const wrapper1 = mountPage();
        await flushPromises();

        expect(wrapper1.find("table.table").exists()).toBe(true);
        expect(wrapper1.text()).toContain("이용 횟수");

        // 2) 빈
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail({ facilityUsages: [] }) },
        });

        const wrapper2 = mountPage();
        await flushPromises();

        expect(wrapper2.find("table.table").exists()).toBe(false);
        expect(wrapper2.text()).toContain("이용 내역이 없습니다.");
    });

    it("닫기: BaseModal close 이벤트가 부모로 emit된다", async () => {
        getReservationDetailApiMock.mockResolvedValueOnce({
            data: { data: sampleDetail() },
        });

        const wrapper = mountPage();
        await flushPromises();

        await wrapper.get('[data-test="modal-close"]').trigger("click");

        expect(wrapper.emitted("close")).toBeTruthy();
        expect(wrapper.emitted("close").length).toBe(1);
    });
});
