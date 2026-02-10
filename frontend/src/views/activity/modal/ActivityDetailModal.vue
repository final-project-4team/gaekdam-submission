<template>
  <BaseModal
      title="운영 상세"
      size="xxl"
      @close="$emit('close')"
  >
    <div class="wrap">

      <div v-if="loading" class="state">상세 정보를 불러오는 중입니다.</div>
      <div v-else-if="!detail" class="state">상세 정보가 없습니다.</div>

      <div v-else>

        <!-- 상단 요약 -->
        <section class="summary">
          <div class="summary-left">
            <div class="name-row">
              <div class="name">{{ displayCustomerName }}</div>

              <span
                  v-if="detail.customer.isMember"
                  class="member-badge"
              >
                MEMBER
              </span>
            </div>

            <div class="sub">
              {{ detail.customer.isMember ? '멤버 고객' : '비멤버 고객' }}
            </div>
          </div>

          <div class="summary-right">
            <div class="meta">
              <span>날짜</span>
              <b>{{ detail.reservation.checkinDate }} ~ {{ detail.reservation.checkoutDate }}</b>
            </div>
            <div class="meta">
              <span>운영 상태</span>
              <span class="status-badge" :class="stayStatus">
              {{ stayStatus }}
              </span>
            </div>
            <div class="meta">
              <span>객실</span>
              <b>{{ detail.room.roomNumber }}</b>
            </div>
          </div>
        </section>

        <!-- 카드 그리드 -->
        <div class="grid">

          <!-- 예약 정보 (가로 전체) -->
          <section class="card accent-blue reservation-wide">
            <h3 class="title">예약 정보</h3>

            <dl class="kv two-col">
              <dt>예약번호</dt>
              <dd>{{ detail.reservation.reservationCode }}</dd>

              <dt>예약상태</dt>
              <dd>{{ detail.reservation.reservationStatus }}</dd>

              <dt>예약채널</dt>
              <dd>{{ detail.reservation.reservationChannel }}</dd>

              <dt>인원</dt>
              <dd>{{ detail.reservation.guestCount }}</dd>

              <dt>체크인</dt>
              <dd>{{ detail.reservation.checkinDate }}</dd>

              <dt>체크아웃</dt>
              <dd>{{ detail.reservation.checkoutDate }}</dd>

              <dt>객실 요금</dt>
              <dd>{{ formatPrice(detail.reservation.reservationRoomPrice) }}</dd>

              <dt>패키지 요금</dt>
              <dd>{{ formatPrice(detail.reservation.reservationPackagePrice) }}</dd>

              <dt>총 금액</dt>
              <dd class="price-strong">
                {{ formatPrice(detail.reservation.totalPrice) }}
              </dd>

              <dt>요청사항</dt>
              <dd>{{ detail.reservation.requestNote || "-" }}</dd>
            </dl>
          </section>

          <section class="card accent-purple fixed">
            <h3 class="title">패키지 정보</h3>

            <template v-if="detail.packageInfo">
              <dl class="kv">
                <dt>패키지명</dt>
                <dd>{{ detail.packageInfo.packageName }}</dd>

                <dt>구성</dt>
                <dd>{{ detail.packageInfo.packageContent }}</dd>

                <dt>가격</dt>
                <dd>{{ formatPrice(detail.packageInfo.packagePrice) }}</dd>
              </dl>

              <div
                  v-if="detail.packageInfo.facilities?.length"
                  class="package-facilities"
              >
                <div
                    v-for="(f, i) in detail.packageInfo.facilities"
                    :key="i"
                    class="facility-item"
                >
                  <span class="fname">{{ f.facilityName }}</span>
                  <span class="qty">x{{ f.includedQuantity }}</span>
                </div>
              </div>
            </template>

            <div v-else class="empty-package">
              패키지 정보가 없습니다
            </div>
          </section>

          <!-- 고객 정보 -->
          <section class="card accent-indigo fixed">
            <h3 class="title">고객 정보</h3>
            <dl class="kv">
              <dt>고객명</dt>
              <dd>{{ displayCustomerName }}</dd>
              <dt>전화번호</dt>
              <dd class="phone">{{ formatPhone(detail.customer.phoneNumber) }}</dd>
              <dt>국적</dt>
              <dd>{{ detail.customer.nationalityType }}</dd>
              <dt>계약유형</dt>
              <dd>{{ detail.customer.contractType }}</dd>
              <dt>상태</dt>
              <dd>{{ detail.customer.customerStatus }}</dd>
            </dl>
          </section>

          <!-- 객실 정보 -->
          <section class="card accent-teal fixed">
            <h3 class="title">객실 정보</h3>
            <dl class="kv">
              <dt>객실 번호</dt>
              <dd>{{ detail.room.roomNumber }}</dd>
              <dt>층</dt>
              <dd>{{ detail.room.floor }}</dd>
              <dt>타입</dt>
              <dd>{{ detail.room.roomTypeName }}</dd>
              <dt>객실 기본 요금</dt>
              <dd>{{ formatPrice(detail.room.roomBasePrice) }}</dd>
            </dl>
          </section>

          <!-- 투숙 정보 -->
          <section class="card accent-green fixed">
            <h3 class="title">투숙 정보</h3>
            <dl class="kv">
              <dt>투숙 상태</dt>
              <dd>{{ stayStatus }}</dd>
              <dt>인원</dt>
              <dd>{{ stayGuestCount }}</dd>
              <dt>체크인</dt>
              <dd>{{ actualCheckinAt }}</dd>
              <dt>체크아웃</dt>
              <dd>{{ actualCheckoutAt }}</dd>
            </dl>
          </section>

        </div>

        <!-- 부대시설 -->
        <section class="card accent-gray facility">
          <h3 class="title">부대시설 이용 현황</h3>

          <div class="facility-box">
            <table v-if="detail.facilityUsages?.length" class="table">
              <thead>
              <tr>
                <th>시설명</th>
                <th class="c">이용 횟수</th>
                <th>마지막 이용</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(f, i) in detail.facilityUsages" :key="i">
                <td class="ellipsis">{{ f.facilityName }}</td>
                <td class="c">{{ f.usageCount }}</td>
                <td class="ellipsis">{{ f.lastUsedAt }}</td>
              </tr>
              </tbody>
            </table>

            <div v-else class="empty-sub">이용 내역이 없습니다.</div>
          </div>
        </section>

      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import {ref, computed, onMounted} from "vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";
import {getReservationDetailApi} from "@/api/reservation/reservationDetailApi";

const props = defineProps({
  reservationCode: Number,
  reason: {type: String, default: ''}
});
defineEmits(["close"]);

const loading = ref(false);
const detail = ref(null);

const stayStatus = computed(() => {
  return detail.value?.stay?.stayStatus ?? 'RESERVED'
})

const stayGuestCount = computed(() => {
  return detail.value?.stay?.guestCount ?? '-'
})

const actualCheckinAt = computed(() => {
  return detail.value?.stay?.actualCheckinAt ?? '-'
})

const actualCheckoutAt = computed(() => {
  return detail.value?.stay?.actualCheckoutAt ?? '-'
})

const displayCustomerName = computed(() =>
    detail.value?.customer?.customerName || "-"
);
const formatPrice = (value) => {
  if (value == null) return "-";
  return Number(value).toLocaleString("ko-KR") + "원";
};

const formatPhone = (value) => {
  if (!value) return "-";

  const digits = value.replace(/\D/g, "");

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }

  return value;
};

onMounted(async () => {
  loading.value = true;
  try {
    const res = await getReservationDetailApi(props.reservationCode, props.reason);
    detail.value = res.data.data;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
:deep(.base-modal) {
  max-width: 980px; /* ← 핵심 */
  width: 100%;
}

/* ============================= */
/* BaseModal 세로 크기 줄이기 */
/* ============================= */
:deep(.base-modal-body) {
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 4px;
}

/* 모바일/작은 화면 대비 */
@media (max-width: 1200px) {
  :deep(.base-modal) {
    max-width: 900px;
  }
}

@media (max-width: 1024px) {
  :deep(.base-modal) {
    max-width: 860px;
  }
}

@media (max-height: 800px) {
  .wrap {
    max-height: calc(100vh - 140px);
  }
}


/* ============================= */
/* 전체 래퍼 */
/* ============================= */
.wrap {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 4px 6px;

  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
  color: #111827;
}

/* ============================= */
/* 상단 요약 */
/* ============================= */
.summary {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px; /* ↓ */
  border-radius: 12px;
  background: linear-gradient(
      135deg,
      #ffffff 0%,
      #f8fafc 50%,
      #f1f5f9 100%
  );
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.04),
  0 3px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 6px; /* ↓ */
}

.price-strong {
  font-weight: 700 !important;
  color: #2561ee !important
}

.name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.2px;
}

.sub {
  margin-top: 1px; /* ↓ */
  font-size: 11px;
  color: #6b7280;
}

.summary-right {
  font-size: 11px;
  color: #374151;
  display: flex;
  flex-direction: column;
  gap: 2px; /* ↓ */
}

.meta span {
  color: #6b7280;
  margin-right: 4px;
}

/* ============================= */
/* 상태 뱃지 */
/* ============================= */
.status-badge {
  padding: 1px 8px; /* ↓ */
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  background: #f1f5f9;
  color: #334155;
}

.status-badge.STAYING {
  background: #ecfdf5;
  color: #047857;
}

.status-badge.COMPLETED {
  background: #f8fafc;
  color: #64748b;
}

.status-badge.RESERVED {
  background: #f8fafc;
  color: #475569;
}

/* ============================= */
/* 카드 그리드 */
/* ============================= */
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px; /* ↓ 14 → 10 */
  margin-bottom: 8px; /* ↓ */
}

/* ============================= */
/* 카드 공통 */
/* ============================= */
.card {
  position: relative;
  border-radius: 12px;
  background: #ffffff;
  padding: 6px 10px; /* ↓ */
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.03),
  0 4px 10px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* 예약 정보 전체 폭 */
.reservation-wide {
  grid-column: 1 / -1;
}

/* 고정 높이 카드 */
.fixed {
  height: 160px; /* ↓ 170 → 160 */
}

/* ============================= */
/* 카드 상단 포인트 라인 */
/* ============================= */
.card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
}

.accent-blue::before {
  background: #c7d2fe;
}

.accent-indigo::before {
  background: #dcdafe;
}

.accent-teal::before {
  background: #ccfbf1;
}

.accent-green::before {
  background: #dcfce7;
}

.accent-gray::before {
  background: #e5e7eb;
}

/* ============================= */
/* 카드 제목 */
/* ============================= */
.title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 5px; /* ↓ */
  margin-top: 5px; /* ↓ */
  letter-spacing: -0.15px;
}

/* ============================= */
/* 키-값 레이아웃 */
/* ============================= */
.kv {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr); /* ↓ */
  gap: 5px 8px; /* ↓ */
}

.kv.two-col {
  grid-template-columns:
    82px minmax(0, 1fr)
    82px minmax(0, 1fr);
}

.kv dt {
  font-size: 10px;
  color: #6b7280;
  white-space: nowrap;
}

.kv dd {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: #111827;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kv dd.phone {
  font-weight: 750;
  color: #263345;
  letter-spacing: 0.3px;
}

/* ============================= */
/* 패키지 카드 포인트 컬러 */
/* ============================= */
.accent-purple::before {
  background: #e9d5ff;
}

/* ============================= */
/* 패키지 포함 시설 */
/* ============================= */
.package-facilities {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.facility-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 10px;
  border-radius: 999px;
  background: #faf5ff;
  color: #6b21a8;
  border: 1px solid #e9d5ff;
}

.facility-item .fname {
  white-space: nowrap;
}

.facility-item .qty {
  font-weight: 600;
}

/* ============================= */
/* 부대시설 */
/* ============================= */
.facility-box {
  max-height: 96px; /* ↓ */
  overflow-y: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.table th,
.table td {
  padding: 5px 6px; /* ↓ */
  border-bottom: 1px solid #e5e7eb;
  text-align: center;
}

.table th {
  color: #6b7280;
  font-weight: 600;
}

.c {
  text-align: center;
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.member-badge {
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2px;
  border-radius: 999px;

  background: #e2eeff;
  color: #4e8fed;
  border: 1px solid #e2e8f0; /* slate-200 */

  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.04);
}

.empty-package {
  height: 75%;
  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 12px;
  color: #94a3b8; /* slate-400 */
  letter-spacing: -0.1px;
}


/* ============================= */
/* 로딩 / 빈 상태 */
/* ============================= */
.state {
  padding: 18px; /* ↓ */
  text-align: center;
  color: #6b7280;
  font-size: 12px;
}
</style>
