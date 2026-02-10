import { computed, ref, unref } from "vue";
import { getCustomerTimelineApi } from "@/api/customer/customerApi.js"; // 너가 정리한 customerApi.js 기준
import { formatDate } from "@/views/customer/utils/customerDetail.utils.js";

export function useCustomerTimeline({ customerCode, hotelGroupCode, limit = 50 }) {
    const timelineItems = ref([]);
    const loading = ref(false);

    const timelineTop5 = computed(() => (timelineItems.value ?? []).slice(0, 5));

    const loadTimeline = async () => {
        const cc = unref(customerCode);
        const hgc = unref(hotelGroupCode);
        if (!cc || !hgc) return;

        loading.value = true;
        try {
            const res = await getCustomerTimelineApi({
                customerCode: cc,
                hotelGroupCode: hgc,
                limit,
            });

            const data = res?.data?.data;
            const items = data?.items ?? [];

            const now = new Date();
            timelineItems.value = items
                .filter(it => {
                    if (!it.occurredAt) return true;
                    return new Date(it.occurredAt) <= now;
                })
                .map((it) => ({
                    occurredAtRaw: it.occurredAt,
                    at: formatDate(it.occurredAt),
                    type: it.eventType || "-",
                    text: `${it.title || "-"} · ${it.summary || ""}`.trim(),
                    refId: it.refId,
                }));
        } finally {
            loading.value = false;
        }
    };

    //  모달 상태도 여기서 관리
    const showTimelineAllModal = ref(false);
    const openTimelineAllModal = () => (showTimelineAllModal.value = true);
    const closeTimelineAllModal = () => (showTimelineAllModal.value = false);

    return {
        timelineItems,
        timelineTop5,
        timelineLoading: loading,
        loadTimeline,

        showTimelineAllModal,
        openTimelineAllModal,
        closeTimelineAllModal,
    };
}
