import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";

import CustomerMemoView from "@/views/customer/view/CustomerMemoView.vue";

vi.mock("@/api/customer/customerMemoApi.js", () => {
    return {
        getCustomerMemosApi: vi.fn(),
        getCustomerMemoDetailApi: vi.fn(),
        createCustomerMemoApi: vi.fn(),
        updateCustomerMemoApi: vi.fn(),
        deleteCustomerMemoApi: vi.fn(),
    };
});

let allowPermission = true;

vi.mock("@/composables/usePermissionGuard", () => {
    return {
        usePermissionGuard: () => ({
            withPermission: (perm, cb) => {
                if (allowPermission) return cb();
            },
        }),
    };
});

import {
    getCustomerMemosApi,
    getCustomerMemoDetailApi,
    createCustomerMemoApi,
    updateCustomerMemoApi,
    deleteCustomerMemoApi,
} from "@/api/customer/customerMemoApi.js";

const BaseButtonStub = {
    name: "BaseButton",
    props: ["disabled", "type", "size"],
    template: `<button :disabled="disabled" @click="$emit('click')"><slot /></button>`,
};

const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
      <div class="modal">
        <div class="title">{{ title }}</div>
        <button class="close" @click="$emit('close')">close</button>
        <div class="body"><slot /></div>
        <div class="footer"><slot name="footer" /></div>
      </div>
    `,
};

const flush = async () => {
    await Promise.resolve();
    await nextTick();
};

const listRes = (over = {}) => ({
    data: {
        data: {
            content: [],
            page: 1,
            size: 20,
            totalElements: 0,
            totalPages: 1,
            ...over,
        },
    },
});

const findModal = (w, title) => w.findAll(".modal").find((m) => m.text().includes(title));
const findBtn = (root, text) => root.findAll("button").find((b) => b.text().includes(text));

/**
 * 호출 파라미터 검증: lastCall 의존 제거 + 타입/키 존재 흔들림 방어
 * expected.fromDate/toDate:
 *  - undefined: 검증 안함
 *  - null: "없음(키없음/undefined/null/빈문자열)"이면 OK
 *  - string: 정확히 일치
 */
const hasMemosCall = (expected) => {
    const calls = getCustomerMemosApi.mock.calls.map(([arg]) => arg);

    const isNilLike = (v) => v === undefined || v === null || v === "";

    return calls.some((arg) => {
        if (!arg) return false;

        if (expected.customerCode !== undefined) {
            if (String(arg.customerCode) !== String(expected.customerCode)) return false;
        }
        if (expected.page !== undefined) {
            if (Number(arg.page) !== Number(expected.page)) return false;
        }
        if (expected.size !== undefined) {
            if (Number(arg.size) !== Number(expected.size)) return false;
        }

        if (expected.fromDate !== undefined) {
            if (expected.fromDate === null) {
                if (!isNilLike(arg.fromDate)) return false;
            } else {
                if (arg.fromDate !== expected.fromDate) return false;
            }
        }

        if (expected.toDate !== undefined) {
            if (expected.toDate === null) {
                if (!isNilLike(arg.toDate)) return false;
            } else {
                if (arg.toDate !== expected.toDate) return false;
            }
        }

        return true;
    });
};

describe("CustomerMemoView", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        allowPermission = true;

        // 기본값들
        getCustomerMemosApi.mockResolvedValue(listRes()); // recent/list 기본
        getCustomerMemoDetailApi.mockResolvedValue({ data: { data: null } });
        createCustomerMemoApi.mockResolvedValue({ data: { data: null } });
        updateCustomerMemoApi.mockResolvedValue({ data: { data: null } });
        deleteCustomerMemoApi.mockResolvedValue({ data: { data: null } });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const mountView = (props = { customerCode: 1 }) =>
        mount(CustomerMemoView, {
            props,
            global: {
                stubs: {
                    BaseButton: BaseButtonStub,
                    BaseModal: BaseModalStub,
                },
            },
        });

    it("mount 시 loadRecent 호출 + recent 비어있으면 empty 표시", async () => {
        const w = mountView();
        await flush();

        expect(getCustomerMemosApi).toHaveBeenCalledWith({ customerCode: 1, page: 1, size: 3 });
        expect(w.text()).toContain("메모가 없습니다.");
    });

    it("recent memo 클릭 -> detail 조회 후 상세 모달 렌더링", async () => {
        // 인자 기반 mock: size=3이면 recent, size=20이면 list
        getCustomerMemosApi.mockImplementation(({ size }) => {
            if (Number(size) === 3) {
                return Promise.resolve(
                    listRes({
                        content: [
                            {
                                customerMemoCode: 10,
                                customerMemoContent: "memo-1",
                                createdAt: "2026-02-03T10:00:00",
                            },
                        ],
                    })
                );
            }
            return Promise.resolve(listRes());
        });

        getCustomerMemoDetailApi.mockResolvedValueOnce({
            data: {
                data: {
                    customerMemoCode: 10,
                    customerMemoContent: "memo-1",
                    createdAt: "2026-02-03T10:00:00",
                },
            },
        });

        const w = mountView();
        await flush();

        await w.find(".memo").trigger("click");
        await flush();

        expect(getCustomerMemoDetailApi).toHaveBeenCalledWith({ customerCode: 1, memoCode: 10 });
        expect(w.text()).toContain("메모 상세");
        expect(w.text()).toContain("memo-1");
    });

    it("메모 작성: 빈값이면 create API 호출 안함", async () => {
        const w = mountView();
        await flush();

        const createOpenBtn = findBtn(w, "메모 작성");
        expect(createOpenBtn).toBeTruthy();
        await createOpenBtn.trigger("click");
        await flush();

        const createModal = findModal(w, "메모 작성");
        expect(createModal).toBeTruthy();

        await createModal.find("textarea").setValue("   ");
        const saveBtn = findBtn(createModal, "저장");
        expect(saveBtn).toBeTruthy();

        await saveBtn.trigger("click");
        await flush();

        expect(createCustomerMemoApi).not.toHaveBeenCalled();
    });

    it("메모 작성: 정상 저장 -> create API 호출 + changed emit + recent 재로딩", async () => {
        const w = mountView();
        await flush();

        const createOpenBtn = findBtn(w, "메모 작성");
        await createOpenBtn.trigger("click");
        await flush();

        const createModal = findModal(w, "메모 작성");
        await createModal.find("textarea").setValue("새 메모");

        const saveBtn = findBtn(createModal, "저장");
        await saveBtn.trigger("click");
        await flush();
        await flush();

        expect(createCustomerMemoApi).toHaveBeenCalledWith({
            customerCode: 1,
            body: { customerMemoContent: "새 메모" },
        });

        // mount recent 1번 + create 후 recent 1번 = 최소 2번
        expect(getCustomerMemosApi.mock.calls.length).toBeGreaterThanOrEqual(2);
        expect(w.emitted("changed")).toBeTruthy();
    });

    it("권한 거부면 create 콜백 실행 안됨", async () => {
        allowPermission = false;

        const w = mountView();
        await flush();

        const createOpenBtn = findBtn(w, "메모 작성");
        await createOpenBtn.trigger("click");
        await flush();

        const createModal = findModal(w, "메모 작성");
        await createModal.find("textarea").setValue("새 메모");

        const saveBtn = findBtn(createModal, "저장");
        await saveBtn.trigger("click");
        await flush();

        expect(createCustomerMemoApi).not.toHaveBeenCalled();
    });

    it("전체 보기 open -> loadList(1) 호출 + paging next", async () => {
        // 순서에 흔들리지 않도록 인자 기반으로 응답
        getCustomerMemosApi.mockImplementation(({ page, size }) => {
            // recent
            if (Number(size) === 3) return Promise.resolve(listRes());

            // list
            if (Number(page) === 1) {
                return Promise.resolve(
                    listRes({
                        content: [{ customerMemoCode: 1, customerMemoContent: "a", createdAt: "2026-02-03T10:00:00" }],
                        page: 1,
                        size: 20,
                        totalPages: 2,
                    })
                );
            }
            if (Number(page) === 2) {
                return Promise.resolve(
                    listRes({
                        content: [{ customerMemoCode: 2, customerMemoContent: "b", createdAt: "2026-02-03T10:00:00" }],
                        page: 2,
                        size: 20,
                        totalPages: 2,
                    })
                );
            }

            return Promise.resolve(listRes());
        });

        const w = mountView();
        await flush();

        const openListBtn = findBtn(w, "전체 보기");
        expect(openListBtn).toBeTruthy();
        await openListBtn.trigger("click");
        await flush();

        expect(
            hasMemosCall({
                customerCode: 1,
                page: 1,
                size: 20,
                fromDate: null,
                toDate: null,
            })
        ).toBe(true);

        const listModal = findModal(w, "고객 메모 전체 보기");
        expect(listModal).toBeTruthy();

        const nextBtn = findBtn(listModal, "다음");
        expect(nextBtn).toBeTruthy();

        await nextBtn.trigger("click");
        await flush();

        expect(
            hasMemosCall({
                customerCode: 1,
                page: 2,
                size: 20,
                fromDate: null,
                toDate: null,
            })
        ).toBe(true);
    });

    it("기간 프리셋(3개월) 적용 -> from/to 세팅 + loadList(1) 호출", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-03T12:00:00"));

        getCustomerMemosApi.mockImplementation(({ size }) => {
            if (Number(size) === 3) return Promise.resolve(listRes()); // recent
            return Promise.resolve(listRes()); // list는 일단 빈값
        });

        const w = mountView();
        await flush();

        const openListBtn = findBtn(w, "전체 보기");
        await openListBtn.trigger("click");
        await flush();

        const listModal = findModal(w, "고객 메모 전체 보기");
        expect(listModal).toBeTruthy();

        const preset3Btn = findBtn(listModal, "3개월");
        expect(preset3Btn).toBeTruthy();

        await preset3Btn.trigger("click");
        await flush();

        const lastArg = getCustomerMemosApi.mock.calls.at(-1)?.[0];
        expect(String(lastArg.customerCode)).toBe("1");
        expect(Number(lastArg.page)).toBe(1);
        expect(Number(lastArg.size)).toBe(20);
        expect(lastArg.fromDate).toMatch(/T00:00:00$/);
        expect(lastArg.toDate).toMatch(/T23:59:59$/);
    });

    it("기간 범위 조회/초기화 버튼 분기", async () => {
        getCustomerMemosApi.mockImplementation(({ size }) => {
            if (Number(size) === 3) return Promise.resolve(listRes()); // recent
            return Promise.resolve(listRes()); // list
        });

        const w = mountView();
        await flush();

        const openListBtn = findBtn(w, "전체 보기");
        await openListBtn.trigger("click");
        await flush();

        const listModal = findModal(w, "고객 메모 전체 보기");
        expect(listModal).toBeTruthy();

        const inputs = listModal.findAll('input[type="date"]');
        expect(inputs).toHaveLength(2);

        await inputs[0].setValue("2026-02-01");
        await inputs[1].setValue("2026-02-03");

        const searchBtn = findBtn(listModal, "조회");
        expect(searchBtn).toBeTruthy();

        await searchBtn.trigger("click");
        await flush();

        expect(
            hasMemosCall({
                customerCode: 1,
                page: 1,
                size: 20,
                fromDate: "2026-02-01T00:00:00",
                toDate: "2026-02-03T23:59:59",
            })
        ).toBe(true);

        const resetBtn = findBtn(listModal, "초기화");
        expect(resetBtn).toBeTruthy();

        await resetBtn.trigger("click");
        await flush();

        expect(
            hasMemosCall({
                customerCode: 1,
                page: 1,
                size: 20,
                fromDate: null,
                toDate: null,
            })
        ).toBe(true);
    });

    it("수정/삭제 플로우: update 호출 + delete 호출", async () => {
        // recent에 memo 1개가 뜨도록 (수정/삭제 버튼이 생김)
        getCustomerMemosApi.mockImplementation(({ size }) => {
            if (Number(size) === 3) {
                return Promise.resolve(
                    listRes({
                        content: [
                            {
                                customerMemoCode: 10,
                                customerMemoContent: "memo-1",
                                createdAt: "2026-02-03T10:00:00",
                            },
                        ],
                    })
                );
            }
            return Promise.resolve(listRes());
        });

        const w = mountView();
        await flush();

        const memoActionBtns = w.findAll(".memo .memo-actions button");
        const editBtn = memoActionBtns.at(0);
        const deleteBtn = memoActionBtns.at(1);

        expect(editBtn).toBeTruthy();
        expect(deleteBtn).toBeTruthy();

        await editBtn.trigger("click");
        await flush();

        const editModal = findModal(w, "메모 수정");
        expect(editModal).toBeTruthy();

        await editModal.find("textarea").setValue("수정된 메모");

        const updateBtn = findBtn(editModal, "저장");
        expect(updateBtn).toBeTruthy();

        await updateBtn.trigger("click");
        await flush();
        await flush();

        expect(updateCustomerMemoApi).toHaveBeenCalledWith({
            customerCode: 1,
            memoCode: 10,
            body: { customerMemoContent: "수정된 메모" },
        });

        await deleteBtn.trigger("click");
        await flush();

        const deleteModal = findModal(w, "메모 삭제");
        expect(deleteModal).toBeTruthy();

        const confirmBtn = findBtn(deleteModal, "확인");
        expect(confirmBtn).toBeTruthy();

        await confirmBtn.trigger("click");
        await flush();
        await flush();

        expect(deleteCustomerMemoApi).toHaveBeenCalledWith({
            customerCode: 1,
            memoCode: 10,
        });
    });
});
