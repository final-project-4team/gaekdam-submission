// src/views/customer/composables/useCustomerReservations.js
import { computed, ref } from "vue";
import { useRangeFilter } from "./useRangeFilter";

/**
 * @param {object} args
 * @param {import('vue').Ref<number>} args.customerCodeRef
 * @param {function} args.getReservationsByCustomerApi  ({ customerCode, size, offset }) => pageData
 * @param {function} args.getReservationDetailApi       (reservationCode) => detailData
 */
export function useCustomerReservations({
                                            customerCodeRef,
                                            getReservationsByCustomerApi,
                                            getReservationDetailApi,
                                        }) {
    /* =========================
       columns
       ========================= */
    const reservationColumns = [
        { key: "reservationNo", label: "예약번호", sortable: true, align: "center" },
        { key: "roomType", label: "객실유형", sortable: false, align: "center" },
        { key: "checkin", label: "투숙예정일", sortable: true, align: "center" },
        { key: "checkout", label: "투숙종료일", sortable: true, align: "center" },
        { key: "status", label: "예약상태", sortable: true, align: "center" },
        { key: "channel", label: "예약채널", sortable: true, align: "center" },
    ];

    /* =========================
       utils (local)
       ========================= */
    const formatMoney = (v) => {
        if (v === null || v === undefined || v === "") return "-";
        const n = Number(v);
        if (Number.isNaN(n)) return String(v);
        return `${n.toLocaleString()}원`;
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

    /* =========================
       top5
       ========================= */
    const reservationLoading = ref(false);
    const reservationRows = ref([]);

    const loadReservationsTop5 = async () => {
        const customerCode = Number(customerCodeRef.value);
        if (!customerCode) return;

        reservationLoading.value = true;
        try {
            const pageData = await getReservationsByCustomerApi({
                customerCode,
                size: 50, // [MODIFIED] Fetch more to filter future items effectively
                offset: 0,
            });

            const items = pageData?.items ?? pageData?.content ?? pageData?.list ?? [];
            if (!items.length) {
                reservationRows.value = [];
                return;
            }

            // [MODIFIED] Filter out future checkins ( > today )
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const pastItems = items.filter(r => {
                const checkin = r.checkinDate ?? r.checkin;
                if (!checkin) return true;
                const d = new Date(checkin);
                return d <= today;
            });

            // Sort by checkin date DESC (latest past first)
            pastItems.sort((a, b) => {
                const dA = new Date(a.checkinDate ?? a.checkin);
                const dB = new Date(b.checkinDate ?? b.checkin);
                return dB - dA;
            });

            // Take top 5 from filtered list
            const top5 = pastItems.slice(0, 5);

            const codes = top5
                .map((r) => Number(r.reservationCode))
                .filter((v) => Number.isFinite(v));

            const detailResults = await Promise.all(
                codes.map(async (code) => {
                    try {
                        const d = await getReservationDetailApi(code);
                        const room = d?.roomInfo ?? d?.room ?? {};
                        return { code, roomTypeName: room?.roomTypeName ?? null };
                    } catch (_) {
                        return { code, roomTypeName: null };
                    }
                })
            );

            const roomTypeMap = new Map(detailResults.map((x) => [x.code, x.roomTypeName]));

            reservationRows.value = top5.map((r) => {
                const code = Number(r.reservationCode);
                const roomTypeName = roomTypeMap.get(code) || "-";

                return {
                    id: r.reservationCode,
                    reservationNo: String(r.reservationCode ?? "-"),
                    roomType: roomTypeName,
                    checkin: formatYmdSlash(r.checkinDate),
                    checkout: formatYmdSlash(r.checkoutDate),
                    status: r.reservationStatus ?? "-",
                    channel: r.reservationChannel ?? "-",
                    _raw: r,
                };
            });
        } catch (e) {
            reservationRows.value = [];
        } finally {
            reservationLoading.value = false;
        }
    };

    /* =========================
       detail modal
       ========================= */
    const showReservationModal = ref(false);
    const selectedReservationDetail = ref(null);

    const openReservationModal = async (row) => {
        showReservationModal.value = true;
        selectedReservationDetail.value = null;

        try {
            const reservationCode = Number(row?.id ?? row?.reservationNo);
            const detailRes = await getReservationDetailApi(reservationCode);

            const info = detailRes?.reservationInfo ?? detailRes?.reservation ?? detailRes?.info ?? {};
            const room = detailRes?.roomInfo ?? detailRes?.room ?? {};

            selectedReservationDetail.value = {
                reservationCode: info.reservationCode ?? row?.reservationNo ?? "-",
                reservationStatus: info.reservationStatus ?? row?.status ?? "-",
                reservationChannel: info.reservationChannel ?? row?.channel ?? "-",
                checkinDate: formatYmdSlash(info.checkinDate ?? row?.checkin),
                checkoutDate: formatYmdSlash(info.checkoutDate ?? row?.checkout),
                guestCount: info.guestCount ?? "-",
                guestType: info.guestType ?? "-",
                totalPrice: info.totalPrice !== undefined ? formatMoney(info.totalPrice) : "-",
                roomLabel: room.roomTypeName
                    ? `${room.roomTypeName}${room.roomNumber ? ` (${room.roomNumber})` : ""}`
                    : row?.roomType ?? "-",
            };
        } catch (e) {
            selectedReservationDetail.value = {
                reservationCode: row?.reservationNo ?? "-",
                reservationStatus: row?.status ?? "-",
                reservationChannel: row?.channel ?? "-",
                checkinDate: row?.checkin ?? "-",
                checkoutDate: row?.checkout ?? "-",
                guestCount: "-",
                guestType: "-",
                totalPrice: "-",
                roomLabel: row?.roomType ?? "-",
            };
        }
    };

    const closeReservationModal = () => {
        showReservationModal.value = false;
        selectedReservationDetail.value = null;
    };

    /* =========================
       all modal + range filter
       ========================= */
    const showReservationAllModal = ref(false);
    const reservationAllLoading = ref(false);
    const reservationAllRaw = ref([]);
    const reservationAllRows = ref([]);

    const range = useRangeFilter({ defaultMonths: 12 });

    const loadReservationsAllRaw = async () => {
        const customerCode = Number(customerCodeRef.value);
        if (!customerCode) return;

        reservationAllLoading.value = true;
        try {
            const pageData = await getReservationsByCustomerApi({
                customerCode,
                size: 200,
                offset: 0,
            });
            const items = pageData?.items ?? pageData?.content ?? pageData?.list ?? [];
            reservationAllRaw.value = Array.isArray(items) ? items : [];
        } catch (e) {
            reservationAllRaw.value = [];
        } finally {
            reservationAllLoading.value = false;
        }
    };

    const buildReservationAllRows = async () => {
        const filtered = (reservationAllRaw.value ?? []).filter((r) => {
            const checkin = r?.checkinDate ?? r?.checkin ?? r?.checkin_at;
            if (!checkin) return true;

            // [MODIFIED] If from is empty, treat as 1900-01-01
            const effectiveFrom = range.range.value.from || "1900-01-01";
            return range.inRangeByYmd(checkin, effectiveFrom, range.range.value.to);
        });

        const codes = filtered
            .map((r) => Number(r.reservationCode))
            .filter((v) => Number.isFinite(v));

        const detailResults = await Promise.all(
            codes.map(async (code) => {
                try {
                    const d = await getReservationDetailApi(code);
                    const room = d?.roomInfo ?? d?.room ?? {};
                    return { code, roomTypeName: room?.roomTypeName ?? null };
                } catch (_) {
                    return { code, roomTypeName: null };
                }
            })
        );

        const roomTypeMap = new Map(detailResults.map((x) => [x.code, x.roomTypeName]));

        reservationAllRows.value = filtered.map((r) => {
            const code = Number(r.reservationCode);
            const roomTypeName = roomTypeMap.get(code) || "-";
            return {
                id: r.reservationCode,
                reservationNo: String(r.reservationCode ?? "-"),
                roomType: roomTypeName,
                checkin: formatYmdSlash(r.checkinDate),
                checkout: formatYmdSlash(r.checkoutDate),
                status: r.reservationStatus ?? "-",
                channel: r.reservationChannel ?? "-",
                _raw: r,
            };
        });
    };

    const applyReservationRange = async () => {
        await buildReservationAllRows();
    };

    const onReservationAll = async () => {
        showReservationAllModal.value = true;
        // [MODIFIED] Default to ALL past history (empty from)
        range.setAllPast();
        await loadReservationsAllRaw();
        await buildReservationAllRows();
    };

    const closeReservationAllModal = () => {
        showReservationAllModal.value = false;
    };

    return {
        // columns
        reservationColumns,

        // top5
        reservationLoading,
        reservationRows,
        loadReservationsTop5,

        // detail modal
        showReservationModal,
        selectedReservationDetail,
        openReservationModal,
        closeReservationModal,

        // all modal
        showReservationAllModal,
        reservationAllLoading,
        reservationAllRows,
        onReservationAll,
        closeReservationAllModal,

        // range filter state + actions (외부에서 UI에 그대로 바인딩)
        reservationRange: range.range, // { months, from, to }
        setReservationMonths: range.setMonths,
        setReservationAllPast: range.setAllPast,
        resetReservationRange: range.reset,
        applyReservationRange,
    };
}
