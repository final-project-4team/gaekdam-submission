// src/views/customer/utils/customerDetail.utils.js

export const formatPhone = (v) => {
    const digits = (v ?? "").toString().replace(/\D/g, "");
    if (!digits) return "-";
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return v;
};

export const formatDate = (v) => {
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

export const formatMoney = (v) => {
    if (v === null || v === undefined || v === "") return "-";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return `${n.toLocaleString()}원`;
};

export const toYmd = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

export const formatYmdSlash = (v) => {
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

/* 기간 필터 공통 */
export const todayYmd = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

export const addMonthsFromTodayYmd = (monthsAgo) => {
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

export const inRange = (dateValue, fromYmd, toYmd) => {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return false;

    const from = parseYmdDate(fromYmd);
    const to = parseYmdDate(toYmd);
    if (!from || !to) return true;

    const end = new Date(to);
    end.setDate(end.getDate() + 1); // to inclusive
    return d >= from && d < end;
};
