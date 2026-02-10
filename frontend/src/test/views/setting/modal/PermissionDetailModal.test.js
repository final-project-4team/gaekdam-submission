import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PermissionDetailModal from "@/views/setting/modal/PermissionDetailModal.vue";

// === Mocks ===

// API mock
const createPermissionMock = vi.fn();
const updatePermissionMock = vi.fn();

vi.mock("@/api/setting/permissionApi.js", () => ({
    createPermission: (...args) => createPermissionMock(...args),
    updatePermission: (...args) => updatePermissionMock(...args),
}));

// BaseModal stub
const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
    <div data-test="base-modal">
        <h1 data-test="modal-title">{{ title }}</h1>
        <button data-test="close-btn" @click="$emit('close')">X</button>
        <slot></slot>
        <div class="footer">
            <slot name="footer"></slot>
        </div>
    </div>
    `,
};

// BaseButton stub
const BaseButtonStub = {
    name: "BaseButton",
    props: ["type"],
    emits: ["click"],
    template: `
    <button :class="type" @click="$emit('click')">
        <slot></slot>
    </button>
    `,
};

describe("PermissionDetailModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // window.alert mock
        global.alert = vi.fn();
    });

    // Helper to mount the component
    const mountModal = (props = {}) => {
        return mount(PermissionDetailModal, {
            props,
            global: {
                stubs: {
                    BaseModal: BaseModalStub,
                    BaseButton: BaseButtonStub,
                },
            },
        });
    };

    it("렌더링: 생성 모드일 때 타이틀이 '권한 등록'이고 폼이 비어있다", () => {
        const wrapper = mountModal();

        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("권한 등록");

        const input = wrapper.find('input[placeholder*="권한 이름"]');
        expect(input.element.value).toBe("");

        // 체크박스들이 모두 unchecked인지 샘플 확인
        const checkbox = wrapper.find('.matrix-checkbox');
        expect(checkbox.element.checked).toBe(false);
    });

    it("렌더링: 수정 모드일 때 타이틀이 '권한 상세 정보'이고 데이터가 채워져 있다", async () => {
        const mockPermission = {
            permissionCode: 100,
            permissionName: "매니저",
            permissionTypes: [
                { permissionTypeKey: "EMPLOYEE_READ" },
                { permissionTypeKey: "CUSTOMER_LIST" }
            ]
        };

        const wrapper = mountModal({ permission: mockPermission });
        await flushPromises(); // v-model 바인딩 대기

        expect(wrapper.get('[data-test="modal-title"]').text()).toBe("권한 상세 정보");

        const input = wrapper.find('input[placeholder*="권한 이름"]');
        expect(input.element.value).toBe("매니저");

        // EMPLOYEE_READ 체크박스 확인 (Key: EMPLOYEE_READ)
        // 로직: isChecked('직원', '상세조회') -> key: EMPLOYEE_READ (MENU_MAP['직원'] + '_' + ACTION_MAP['상세조회'])
        // 하지만 view 코드상 MENU_MAP이 key, ACTION_MAP이 value로 조합됨
        // MENU_MAP['직원'] = 'EMPLOYEE', ACTION_MAP['상세조회'] = 'READ' => 'EMPLOYEE_READ'

        // DOM에서 특정 체크박스를 찾기는 어려우므로 vm state나 class로 간접 확인 가능하지만
        // 여기서는 computed/logic 검증을 위해 vm을 통해 확인하거나, 
        // 템플릿의 :checked 바인딩을 믿고 변경 이벤트를 테스트하는 것이 나음.

        // 또는 checkbox의 :checked 속성을 확인 (모든 체크박스 중 checked가 2개여야 함)
        const checkedBoxes = wrapper.findAll('.matrix-checkbox').filter(w => w.element.checked);
        expect(checkedBoxes.length).toBe(2);
    });

    it("인터랙션: 체크박스 토글 시 permissionTypeKeys 업데이트", async () => {
        const wrapper = mountModal();

        // 초기 상태: 0개
        expect(wrapper.vm.form.permissionTypeKeys.length).toBe(0);

        // '직원' (EMPLOYEE) + '리스트조회' (LIST) => EMPLOYEE_LIST (Valid permission)
        // MENU_MAP 순서와 ACTION_MAP 순서에 따라 렌더링되므로, nth-child로 찾기보다는
        // togglePermission 메소드를 직접 호출하거나, 
        // 간단히 첫번째 valid한 체크박스를 찾아 클릭해보는 방식 사용.

        // 유효한 권한 키 조합 찾기: EMPLOYEE_LIST는 PERMISSION_ENUM_ORDER에 있음.
        // 강제로 vm 메소드 호출 테스트 (UI click은 DOM 구조 의존성이 높음)
        wrapper.vm.togglePermission('EMPLOYEE', 'LIST');
        expect(wrapper.vm.form.permissionTypeKeys).toContain('EMPLOYEE_LIST');

        // 다시 토글 -> 제거
        wrapper.vm.togglePermission('EMPLOYEE', 'LIST');
        expect(wrapper.vm.form.permissionTypeKeys).not.toContain('EMPLOYEE_LIST');
    });

    it("저장(Create): 권한 이름과 변환된 ID 목록으로 생성 API 호출", async () => {
        const wrapper = mountModal();

        // 입력
        await wrapper.find('input[placeholder*="권한 이름"]').setValue("슈퍼관리자");

        // 권한 선택: REPORT_LAYOUT_CREATE (Enum Index: 0 -> ID: 1 가정)
        // PERMISSION_ENUM_ORDER[0] = 'REPORT_LAYOUT_CREATE'
        // IndexOf = 0, ID = 1
        wrapper.vm.form.permissionTypeKeys = ['REPORT_LAYOUT_CREATE'];

        // 저장 버튼 클릭
        const saveBtn = wrapper.findAll('button.primary').find(b => b.text() === '저장');
        await saveBtn.trigger('click');
        await flushPromises();

        expect(createPermissionMock).toHaveBeenCalledTimes(1);
        expect(createPermissionMock).toHaveBeenCalledWith({
            permissionName: "슈퍼관리자",
            permissionTypeList: [1] // 0 + 1
        });

        // 완료 후 닫기
        expect(wrapper.emitted()).toHaveProperty('refresh');
        expect(wrapper.emitted()).toHaveProperty('close');
        expect(global.alert).toHaveBeenCalledWith('권한이 생성되었습니다.');
    });

    it("저장(Update): 권한 ID와 변환된 목록으로 수정 API 호출", async () => {
        const mockPermission = {
            permissionCode: 99,
            permissionName: "기존권한",
            permissionTypes: []
        };
        const wrapper = mountModal({ permission: mockPermission });

        // 권한 추가: MEMBER_LIST (Index 확인 필요)
        // PERMISSION_ENUM_ORDER에서 MEMBER_LIST는 index 11 (앞에 11개 있음) -> ID: 12
        // 코드상 순서: REPORT...(11개) -> MEMBER_LIST 
        // REPORT_LAYOUT_... (5) + REPORT_LAYOUT_TEMPLATE_... (5) + LIBRARY (1) = 11개
        // MEMBER_LIST index = 11 -> ID = 12
        wrapper.vm.form.permissionTypeKeys = ['MEMBER_LIST'];

        // 저장 버튼 클릭
        const saveBtn = wrapper.findAll('button.primary').find(b => b.text() === '저장');
        await saveBtn.trigger('click');
        await flushPromises();

        expect(updatePermissionMock).toHaveBeenCalledTimes(1);
        expect(updatePermissionMock).toHaveBeenCalledWith(99, {
            permissionTypeList: [12]
        });

        expect(global.alert).toHaveBeenCalledWith('권한이 수정되었습니다.');
    });

    it("유효성 검사: 이름이 없으면 저장되지 않음", async () => {
        const wrapper = mountModal();

        // 이름 비어있음

        const saveBtn = wrapper.findAll('button.primary').find(b => b.text() === '저장');
        await saveBtn.trigger('click');

        expect(createPermissionMock).not.toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('권한 이름을 입력해주세요.');
    });
    it("인터랙션: 유효하지 않은 권한 키는 토글되지 않음", () => {
        const wrapper = mountModal();

        // 유효하지 않은 키 조합 (예: EMPLOYEE_INVALID_ACTION)
        wrapper.vm.togglePermission('EMPLOYEE', 'INVALID_ACTION'); // Key: EMPLOYEE_INVALID_ACTION

        expect(wrapper.vm.form.permissionTypeKeys.length).toBe(0);
    });

    it("로직: isDisabled 함수 검증 - 유효하지 않은 키는 disabled true", () => {
        const wrapper = mountModal();

        // Valid
        expect(wrapper.vm.isDisabled('EMPLOYEE', 'LIST')).toBe(false);
        // Invalid
        expect(wrapper.vm.isDisabled('EMPLOYEE', 'INVALID')).toBe(true);
    });

    it("에러 핸들링: 저장 중 API 에러 발생 시 알림", async () => {
        const wrapper = mountModal();
        await wrapper.find('input[placeholder*="권한 이름"]').setValue("에러테스트");
        wrapper.vm.form.permissionTypeKeys = ['EMPLOYEE_LIST'];

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        createPermissionMock.mockRejectedValue(new Error("API Fail"));

        const saveBtn = wrapper.findAll('button.primary').find(b => b.text() === '저장');
        await saveBtn.trigger('click');
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        expect(global.alert).toHaveBeenCalledWith('저장 중 오류가 발생했습니다.');

        consoleSpy.mockRestore();
    });

    it("초기화: permissionTypes가 없는 경우(빈 배열 등) 처리", async () => {
        const mockPermission = {
            permissionCode: 101,
            permissionName: "빈 권한",
            permissionTypes: null // or undefined
        };
        const wrapper = mountModal({ permission: mockPermission });
        await flushPromises();

        expect(wrapper.vm.form.permissionName).toBe("빈 권한");
        expect(wrapper.vm.form.permissionTypeKeys).toEqual([]);
    });

    it("닫기: 취소 버튼 클릭 시 close emit", async () => {
        const wrapper = mountModal();

        // Footer Cancel Button (Ghost type)
        const cancelBtn = wrapper.findAll('button.ghost').find(b => b.text() === '취소');
        await cancelBtn.trigger('click');

        expect(wrapper.emitted()).toHaveProperty('close');
    });
});
