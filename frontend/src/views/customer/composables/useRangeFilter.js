// src/views/customer/composables/useRangeFilter.js
import { ref } from "vue";

export function useRangeFilter({ defaultMonths = 3 } = {}) {
    /* =========================
       utils
       ========================= */
    const todayYmd = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const addMonthsFromTodayYmd = (monthsAgo) => {
        const d = new Date();
        d.setMonth(d.getMonth() - monthsAgo);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const parseYmdDate = (ymd) => {
        if (!ymd) return null;
        const d = new Date(`${ymd}T00:00:00`);
        if (Number.isNaN(d.getTime())) return null;
        return d;
    };

    const inRangeByYmd = (dateValue, fromYmd, toYmd) => {
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return false;

        const from = parseYmdDate(fromYmd);
        const to = parseYmdDate(toYmd);
        if (!from || !to) return true;

        const end = new Date(to);
        end.setDate(end.getDate() + 1); // to inclusive
        return d >= from && d < end;
    };

    /* =========================
       state
       ========================= */
    const range = ref({
        months: defaultMonths,
        from: addMonthsFromTodayYmd(defaultMonths),
        to: todayYmd(),
    });

    /* =========================
       actions
       ========================= */
    const syncByMonths = (m) => {
        range.value.months = m;
        range.value.from = addMonthsFromTodayYmd(m);
        range.value.to = todayYmd();
    };

    const setMonths = (m) => {
        syncByMonths(m);
    };

    const reset = () => {
        syncByMonths(defaultMonths);
    };

    // consumer가 filter 할 때 그대로 쓰라고 제공
    const inRange = (dateValue) => {
        return inRangeByYmd(dateValue, range.value.from, range.value.to);
    };

    const setAllPast = () => {
        range.value.months = 'ALL';
        range.value.from = ""; // [MODIFIED] Empty string for UI (API will handle default)
        range.value.to = todayYmd();
    };

    return {
        range,
        setMonths,
        reset,
        syncByMonths,
        setAllPast,
        inRange,
        inRangeByYmd, // [MODIFIED] Export for manual use
    };
}
