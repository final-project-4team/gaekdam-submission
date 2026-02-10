// src/views/customer/constants/customerDetail.constants.js

export const LS_KEY = "customer_detail_card_setting_v2";

export const RESERVATION_COLUMNS = [
    { key: "reservationNo", label: "예약번호", sortable: true, align: "center" },
    { key: "roomType", label: "객실유형", sortable: false, align: "center" },
    { key: "checkin", label: "투숙예정일", sortable: true, align: "center" },
    { key: "checkout", label: "투숙종료일", sortable: true, align: "center" },
    { key: "status", label: "예약상태", sortable: true, align: "center" },
    { key: "channel", label: "예약채널", sortable: true, align: "center" },
];

export const INQUIRY_COLUMNS = [
    { key: "inquiryNo", label: "문의 번호", sortable: true, align: "center" },
    { key: "title", label: "제목", sortable: false },
    { key: "status", label: "상태", sortable: true, align: "center" },
    { key: "date", label: "일자", sortable: true, align: "center" },
];

export const TIMELINE_COLUMNS = [
    { key: "at", label: "일시", sortable: true, align: "center" },
    { key: "type", label: "유형", sortable: true, align: "center" },
    { key: "text", label: "내용", sortable: false },
];

export const defaultCardSetting = () => [
    { id: "snapshot", label: "고객 스냅샷", enabled: true, column: "left", order: 1 },
    { id: "timeline", label: "최근 타임라인", enabled: true, column: "left", order: 2 },
    { id: "reservation", label: "예약/이용(최근 5건)", enabled: true, column: "left", order: 3 },
    { id: "voc", label: "문의/클레임(최근 3건)", enabled: true, column: "left", order: 4 },
    { id: "memo", label: "고객 메모", enabled: true, column: "right", order: 1 },
    { id: "membership", label: "멤버십", enabled: true, column: "right", order: 2 },
    { id: "loyalty", label: "로열티", enabled: true, column: "right", order: 3 },
];
