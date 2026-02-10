// src/views/customer/composables/useCustomerInquiries.js
import { ref } from "vue";
import { useRangeFilter } from "./useRangeFilter";

/**
 * @param {object} args
 * @param {import('vue').Ref<number>} args.customerCodeRef
 * @param {function} args.getInquiryListApi   (params) => pageData
 * @param {function} args.getInquiryDetailApi (inquiryCode) => detailData
 */
export function useCustomerInquiries({
                                         customerCodeRef,
                                         getInquiryListApi,
                                         getInquiryDetailApi,
                                     }) {
    /* =========================
       columns
       ========================= */
    const inquiryColumns = [
        { key: "inquiryNo", label: "문의 번호", sortable: true, align: "center" },
        { key: "title", label: "제목", sortable: false },
        { key: "status", label: "상태", sortable: true, align: "center" },
        { key: "date", label: "일자", sortable: true, align: "center" },
    ];

    /* =========================
       utils (local)
       ========================= */
    const formatDate = (v) => {
        if (!v) return "-";
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return String(v);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${y}-${m}-${day} ${hh}:${mm}`;
    };

    const formatYmdSlash = (v) => {
        if (!v) return "-";
        const s = String(v);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replaceAll("-", "/");

        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return s;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}/${m}/${day}`;
    };

    const mapInquiryStatusLabel = (s) => {
        if (!s) return "-";
        if (s === "IN_PROGRESS") return "InProgress";
        if (s === "ANSWERED") return "Answered";
        return s;
    };

    /* =========================
       top3
       ========================= */
    const inquiryLoading = ref(false);
    const inquiryRows = ref([]);

    const loadInquiriesTop3 = async () => {
        const customerCode = Number(customerCodeRef.value);
        if (!customerCode) return;

        inquiryLoading.value = true;
        try {
            const pageData = await getInquiryListApi({
                size: 50,
                offset: 0,
                sortBy: "created_at",
                direction: "DESC",
                customerCode, // 서버가 무시해도 OK(프론트에서 필터)
            });

            const items = pageData?.items ?? pageData?.content ?? pageData?.list ?? [];

            // [MODIFIED] Filter out future inquiries ( > today )
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const pastItems = items.filter(x => {
                const created = x.createdAt ?? x.created_at;
                if (!created) return true;
                const d = new Date(created);
                return d <= today;
            });

            const filtered = pastItems
                .filter((x) => Number(x?.customerCode) === Number(customerCode))
                .slice(0, 3);

            inquiryRows.value = filtered.map((x) => ({
                id: x.inquiryCode,
                inquiryNo: String(x.inquiryCode ?? "-"),
                title: x.inquiryTitle ?? "-",
                status: mapInquiryStatusLabel(x.inquiryStatus),
                date: formatYmdSlash(x.createdAt),
                _raw: x,
            }));
        } catch (e) {
            inquiryRows.value = [];
        } finally {
            inquiryLoading.value = false;
        }
    };

    /* =========================
       detail modal
       ========================= */
    const showInquiryModal = ref(false);
    const selectedInquiryDetail = ref(null);

    const openInquiryModal = async (row) => {
        showInquiryModal.value = true;
        selectedInquiryDetail.value = null;

        try {
            const inquiryCode = Number(row?.id ?? row?.inquiryNo);
            const d = await getInquiryDetailApi(inquiryCode);

            selectedInquiryDetail.value = {
                inquiryCode: d?.inquiryCode ?? row?.inquiryNo ?? "-",
                inquiryStatus: mapInquiryStatusLabel(d?.inquiryStatus ?? row?.status),
                inquiryTitle: d?.inquiryTitle ?? row?.title ?? "-",
                inquiryContent: d?.inquiryContent ?? "-",
                answerContent: d?.answerContent ?? "",
                inquiryCategoryName: d?.inquiryCategoryName ?? "-",
                createdAt: formatDate(d?.createdAt),
                updatedAt: formatDate(d?.updatedAt),
                linkedIncidentCode: d?.linkedIncidentCode ?? null,
            };
        } catch (e) {
            selectedInquiryDetail.value = {
                inquiryCode: row?.inquiryNo ?? "-",
                inquiryStatus: row?.status ?? "-",
                inquiryTitle: row?.title ?? "-",
                inquiryContent: "-",
                answerContent: "",
                inquiryCategoryName: "-",
                createdAt: "-",
                updatedAt: "-",
                linkedIncidentCode: null,
            };
        }
    };

    const closeInquiryModal = () => {
        showInquiryModal.value = false;
        selectedInquiryDetail.value = null;
    };

    /* =========================
       all modal + range filter
       ========================= */
    const showInquiryAllModal = ref(false);
    const inquiryAllLoading = ref(false);
    const inquiryAllRaw = ref([]);
    const inquiryAllRows = ref([]);

    const range = useRangeFilter({ defaultMonths: 12 });

    const loadInquiriesAllRaw = async () => {
        const customerCode = Number(customerCodeRef.value);

        inquiryAllLoading.value = true;
        try {
            const pageData = await getInquiryListApi({
                size: 200,
                offset: 0,
                sortBy: "created_at",
                direction: "DESC",
                customerCode,
            });
            const items = pageData?.items ?? pageData?.content ?? pageData?.list ?? [];
            inquiryAllRaw.value = Array.isArray(items) ? items : [];
        } catch (e) {
            inquiryAllRaw.value = [];
        } finally {
            inquiryAllLoading.value = false;
        }
    };

    const buildInquiryAllRows = () => {
        const customerCode = Number(customerCodeRef.value);

        const items = (inquiryAllRaw.value ?? [])
            .filter((x) => Number(x?.customerCode) === Number(customerCode))
            .filter((x) => {
                const created = x?.createdAt ?? x?.created_at;
                if (!created) return true;

                // [MODIFIED] If from is empty, treat as 1900-01-01 for filtering
                const effectiveFrom = range.range.value.from || "1900-01-01";
                return range.inRangeByYmd(created, effectiveFrom, range.range.value.to);
            });

        inquiryAllRows.value = items.map((x) => ({
            id: x.inquiryCode,
            inquiryNo: String(x.inquiryCode ?? "-"),
            title: x.inquiryTitle ?? "-",
            status: mapInquiryStatusLabel(x.inquiryStatus),
            date: formatYmdSlash(x.createdAt),
            _raw: x,
        }));
    };

    const applyInquiryRange = () => {
        buildInquiryAllRows();
    };

    const onInquiryAll = async () => {
        showInquiryAllModal.value = true;
        // [MODIFIED] Default to ALL past history (empty from)
        range.setAllPast();
        await loadInquiriesAllRaw();
        buildInquiryAllRows();
    };

    const closeInquiryAllModal = () => {
        showInquiryAllModal.value = false;
    };

    return {
        inquiryColumns,

        // top3
        inquiryLoading,
        inquiryRows,
        loadInquiriesTop3,

        // detail modal
        showInquiryModal,
        selectedInquiryDetail,
        openInquiryModal,
        closeInquiryModal,

        // all modal
        showInquiryAllModal,
        inquiryAllLoading,
        inquiryAllRows,
        onInquiryAll,
        closeInquiryAllModal,

        // range
        inquiryRange: range.range,
        setInquiryMonths: range.setMonths,
        setInquiryAllPast: range.setAllPast,
        resetInquiryRange: range.reset,
        applyInquiryRange,
    };
}
