import { computed, ref } from "vue";
import { getMembershipGradeList } from "@/api/setting/membershipGrade.js";
import { patchMembershipManuallyApi } from "@/api/customer/membershipApi.js";

export const useMembershipManualChange = ({ customerCode, membership, toYmd, afterSuccess }) => {
    const showMembershipModal = ref(false);
    const savingMembership = ref(false);

    const membershipGrades = ref([]);

    const membershipGradeOptions = computed(() =>
        membershipGrades.value
            .filter((g) => g?.membershipGradeStatus !== "INACTIVE")
            .map((g) => ({ label: g.gradeName, value: g.membershipGradeCode }))
    );

    const membershipChange = ref({
        membershipGradeCode: null,
        membershipStatus: "ACTIVE",
        expiredAt: "",
        changeReason: "",
        employeeCode: null,
    });

    const loadMembershipGrades = async () => {
        try {
            const list = await getMembershipGradeList();
            membershipGrades.value = Array.isArray(list) ? list : [];
        } catch {
            membershipGrades.value = [];
        }
    };

    const onMembershipChange = async () => {
        await loadMembershipGrades();

        membershipChange.value = {
            membershipGradeCode: null,
            membershipStatus: membership.value?.membershipStatus || "ACTIVE",
            expiredAt: toYmd(membership.value?.expiredAt) || "",
            changeReason: "",
            employeeCode: null,
        };

        showMembershipModal.value = true;
    };

    const submitMembershipChange = async () => {
        if (savingMembership.value) return;

        savingMembership.value = true;
        try {
            const payload = {
                membershipGradeCode: Number(membershipChange.value.membershipGradeCode),
                membershipStatus: membershipChange.value.membershipStatus,
                expiredAt: membershipChange.value.expiredAt ? `${membershipChange.value.expiredAt}T00:00:00` : null,
                changeReason: (membershipChange.value.changeReason || "").trim(),
                employeeCode: Number(membershipChange.value.employeeCode),
            };

            await patchMembershipManuallyApi(customerCode.value, payload);

            alert("멤버십 변경 완료");
            showMembershipModal.value = false;

            if (afterSuccess) await afterSuccess();
        } catch {
            alert("멤버십 변경 실패(형식/값 확인)");
        } finally {
            savingMembership.value = false;
        }
    };

    return {
        showMembershipModal,
        savingMembership,
        membershipChange,
        membershipGradeOptions,
        onMembershipChange,
        submitMembershipChange,
    };
};
