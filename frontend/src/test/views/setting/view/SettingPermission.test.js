import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingPermission from "@/views/setting/SettingPermission.vue";

/** -----------------------------
 *  mocks
 *  ----------------------------- */
const getPermissionListMock = vi.fn();
const deletePermissionMock = vi.fn();

vi.mock("@/api/setting/permissionApi.js", () => ({
    getPermissionList: () => getPermissionListMock(),
    deletePermission: (id) => deletePermissionMock(id),
}));

vi.mock("@/composables/usePermissionGuard", () => ({
    usePermissionGuard: () => ({
        withPermission: (_perm, cb) => cb(),
    }),
}));

const ListViewStub = {
    name: "ListView",
    props: ["rows", "searchTypes"],
    emits: ["search", "page-change", "row-click"],
    template: `
    <div data-test="list-view">
        <div data-test="rows-count">{{ rows?.length ?? 0 }}</div>
        <!-- Action Slot Mock -->
        <div v-if="rows && rows.length > 0">
             <slot name="cell-actions" :row="rows[0]"></slot>
        </div>
        <button data-test="emit-search" @click="$emit('search', { value: 'TEST' })">search</button>
        <button data-test="emit-open" @click="$emit('row-click', rows[0])">open</button>
    </div>
    `,
};

const PermissionDetailModalStub = {
    name: "PermissionDetailModal",
    props: ["permission"],
    emits: ["close", "refresh"],
    template: `<div data-test="detail-modal">Mock Modal</div>`
};

const BaseButtonStub = {
    template: `<button @click="$emit('click')"><slot/></button>`
};


describe("SettingPermission", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.alert = vi.fn();
        global.confirm = vi.fn(() => true);

        getPermissionListMock.mockResolvedValue({
            content: [
                { permissionCode: 1, permissionName: "Admin" },
                { permissionCode: 2, permissionName: "User" }
            ]
        });
    });

    const mountComponent = () => {
        return mount(SettingPermission, {
            global: {
                stubs: {
                    ListView: ListViewStub,
                    PermissionDetailModal: PermissionDetailModalStub,
                    BaseButton: BaseButtonStub
                }
            }
        });
    };

    it("초기 로딩: 권한 목록 조회", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(getPermissionListMock).toHaveBeenCalled();
        expect(wrapper.get('[data-test="rows-count"]').text()).toBe("2");
    });

    it("검색: 검색어 입력 시 리스트 필터링", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Emit search 'TEST' -> should match nothing if case sensitive, 
        // but test mock has logic: item.permissionName.toLowerCase().includes...
        // 'TEST' matches nothing in "Admin", "User" ?? "User" has no 'test'.
        // Wait, logic is simulated in component:
        //    if (searchKeyword.value) { allData = allData.filter(...) }
        // Let's search "Admin"

        // Setup wrapper to search 'Admin'
        // Simulating search event payload manually via stub
        const listView = wrapper.findComponent(ListViewStub);
        listView.vm.$emit('search', { value: 'Admin' });
        await flushPromises();

        // getPermissionList called again (refetch logic in component calls fetchPermissions which calls API then filters)
        // Correct.
        expect(getPermissionListMock).toHaveBeenCalledTimes(2);

        // Filter result check: data bind to rows
        // filtered rows should be 1
        expect(wrapper.get('[data-test="rows-count"]').text()).toBe("1");
    });

    it("삭제: 삭제 버튼 클릭 시 API 호출", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        const deleteBtn = wrapper.findAll('.action-btn')[0]; // stubbed slot
        await deleteBtn.trigger("click");
        await flushPromises();

        expect(global.confirm).toHaveBeenCalled();
        expect(deletePermissionMock).toHaveBeenCalledWith(1); // params: row.permissionCode
        expect(global.alert).toHaveBeenCalledWith("권한이 삭제되었습니다.");
    });

    it("모달 열기: 등록 버튼 및 행 클릭", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        // Open Create
        const createBtn = wrapper.findAll('button').filter(b => b.text() === "권한 등록")[0];
        await createBtn.trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="detail-modal"]').exists()).toBe(true);
        expect(wrapper.vm.selectedPermission).toBeNull();

        // Close
        wrapper.vm.closeModal();
        await flushPromises();
        expect(wrapper.find('[data-test="detail-modal"]').exists()).toBe(false);

        // Open Edit (Row Click)
        await wrapper.get('[data-test="emit-open"]').trigger("click");
        await flushPromises();

        expect(wrapper.find('[data-test="detail-modal"]').exists()).toBe(true);
        expect(wrapper.vm.selectedPermission).not.toBeNull();
        expect(wrapper.vm.selectedPermission.permissionName).toBe("Admin");
    });
    it("fetchPermissions: API 에러 시 콘솔 에러 출력", async () => {
        const wrapper = mountComponent();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        getPermissionListMock.mockRejectedValue(new Error("Fetch Failed"));

        // Trigger fetch manually or re-mount with failure mock
        // Since fetches on mount, we can clean and mount again in this test context

        await wrapper.vm.fetchPermissions();
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith("Permissions Fetch Failed", expect.any(Error));
        consoleSpy.mockRestore();
    });

    it("검색: 검색어(payload)가 없으면 searchKeyword 초기화", async () => {
        const wrapper = mountComponent();
        await flushPromises();

        const vm = wrapper.vm;
        vm.searchKeyword = "OLD_KEYWORD";
        vm.rows = []; // Rows cleared

        // Call onSearch with null to hit else block
        vm.onSearch(null);
        await flushPromises();

        expect(vm.searchKeyword).toBe('');
        expect(getPermissionListMock).toHaveBeenCalled();
    });

    it("페이지 변경: onPageChange 호출 시 page 업데이트 및 재조회", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        getPermissionListMock.mockClear();

        const vm = wrapper.vm;
        vm.onPageChange(3);
        await flushPromises();

        expect(vm.page).toBe(3);
        expect(getPermissionListMock).toHaveBeenCalled();
    });

    it("삭제 실패: API 에러 시 Alert 및 콘솔 에러", async () => {
        const wrapper = mountComponent();
        await flushPromises();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        deletePermissionMock.mockRejectedValue(new Error("Delete Error"));
        global.alert = vi.fn();

        // Stub logic for click -> deletePermission
        // Since we don't have row actions fully rendered in stub logic easily accessible without slot props
        // We can call method directly or fake click if slot works.
        // Let's use direct method call or fake the click on action button if feasible. 
        // Existing delete test "findAll('.action-btn')[0]" implies there is a button.
        // But ListViewMock slot template: <slot name="cell-actions" :row="rows[0]"></slot>
        // We need to verify if "action-btn" is inside the actual component's slot content.
        // Yes, SettingPermission.vue template has <BaseButton class="action-btn" ...>

        // Let's rely on finding action button as in previous test
        const deleteBtn = wrapper.findAll('.action-btn')[0];
        expect(deleteBtn).toBeDefined();

        await deleteBtn.trigger("click");
        await flushPromises();

        expect(consoleSpy).toHaveBeenCalledWith("Delete failed", expect.any(Error));
        expect(global.alert).toHaveBeenCalledWith('권한 삭제 중 오류가 발생했습니다.');

        consoleSpy.mockRestore();
    });
});
