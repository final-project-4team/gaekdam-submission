import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";

//권한이 있을 때만 callback을 실행하는 가드 함수를 반환합니다.

export function usePermissionGuard() {
    const authStore = useAuthStore();
    const toastStore = useToastStore();

    //
    const withPermission = (permission, callback) => {
        if (!authStore.hasPermission(permission)) {
            toastStore.showToast("이 작업을 수행할 권한이 없습니다.", "error");
            return;
        }

        // 권한이 있으면 콜백 실행
        if (callback && typeof callback === 'function') {
            callback();
        }
    };

    return {
        withPermission
    };
}
