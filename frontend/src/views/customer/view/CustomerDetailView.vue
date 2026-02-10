<template>
  <div class="customer-detail-page">

    <!-- 상단 내비게이션 (탭 + 공통 액션) -->
    <div class="page-top-nav">
      <div class="nav-tabs">
        <button
            class="nav-tab-btn"
            :class="{ active: activeTab === 'basic' }"
            @click="setTab('basic')"
        >
          기본 정보
        </button>
        <button
            class="nav-tab-btn"
            :class="{ active: activeTab === 'report' }"
            @click="setTab('report')"
        >
          분석 리포트
        </button>
      </div>
      <div class="nav-actions">
        <button class="action-btn outline" @click="goBack">
          목록으로
        </button>
      </div>
    </div>

    <!-- 헤더 섹션 (기본 정보만) -->
    <header class="detail-header" v-show="activeTab === 'basic'">
      <div class="header-main">
        <!-- 좌측: 프로필 정보 -->
        <div class="header-left">
          <!-- Membership Avatar -->
          <div class="membership-avatar" :class="membershipAvatarClass">
            <span class="avatar-text">{{ membershipInitial }}</span>
          </div>
          <div class="profile-info">
            <div class="info-top">
              <h1 class="customer-name">{{ detail.customerName || "-" }}</h1>
              <div class="badge-list">
                <!-- Status Badge -->
                <span class="badge-pill" :class="statusTagClass(detail.status)">{{ detail.status }}</span>
                <!-- Membership Badge (Removed) -->
                <!-- Loyalty Badge (if exists) -->
                <span v-if="loyalty.gradeName" class="badge-pill" :style="loyaltyTagStyle(loyalty.gradeName)">
                  {{ loyalty.gradeName }}
                </span>
              </div>
            </div>

            <div class="info-middle">
              <span class="customer-code">고객코드 #{{ detail.customerCode ?? "-" }}</span>
              <div class="chip-list">
                <span v-for="c in chips.filter(c => c !== detail.inflowChannel)" :key="c" class="chip-item">{{ c }}</span>
              </div>
            </div>

            <!-- (Empty info-bottom removed as combined above or unused) -->
          </div>
        </div>

        <!-- 중간: 메타 정보 (그리드: 라벨 & 값) -->
        <div class="header-middle">
          <div class="meta-grid">
            <span class="meta-label">대표 연락처</span>
            <div class="meta-value-row">
              <span>{{ primaryPhone }}</span>
              <button class="text-btn" @click="openContactModal">연락처 전체보기</button>
            </div>

            <span class="meta-label">이메일</span>
            <div class="meta-value-row">
              <span>{{ primaryEmail }}</span>
            </div>

            <span class="meta-label">유입경로</span> <!-- 또는 엄격한 매핑 시 '외부 ID' -->
            <div class="meta-value-row">
              <span>{{ detail.inflowChannel || "-" }}</span>
            </div>
          </div>
        </div>

        <!-- 우측: 액션 -->
        <div class="header-actions">
          <!-- 'Back to List' removed as it is now in top-nav -->
          <button class="action-btn" @click="onMembershipChange">
            멤버십 변경
          </button>
          <button class="action-btn" @click="onCardSetting">
            카드 설정
          </button>
        </div>
      </div>

      <!-- 구 버전 탭 제거됨 -->
    </header>

    <!-- 탭 1: 기본 정보 -->
    <main class="dashboard-grid" v-show="activeTab === 'basic'">
      <!-- 좌측 컬럼 -->
      <div class="column left-column">
        <template v-for="card in leftCards" :key="card.id">

          <!-- Snapshot Card -->
          <section v-if="card.id === 'snapshot'" class="dashboard-card snapshot-card">
            <h3 class="card-heading">고객 스냅샷</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">총 이용횟수</span>
                <span class="stat-value">{{ snapshot.totalStayCount ?? 0 }}<small>회</small></span>
              </div>
              <div class="stat-item">
                <span class="stat-label">누적 결제(LTV)</span>
                <span class="stat-value highlight">{{ formatMoney(snapshot.ltvAmount) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">최근 이용일</span>
                <span class="stat-value">{{ formatDate(snapshot.lastUsedAt) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">미해결 이슈</span>
                <span class="stat-value alert">{{ snapshot.unresolvedInquiryCount ?? 0 }}<small>건</small></span>
              </div>
            </div>
          </section>

          <!-- Timeline Card -->
          <section v-else-if="card.id === 'timeline'" class="dashboard-card timeline-card">
            <div class="card-header">
              <h3 class="card-heading">최근 타임라인</h3>
              <button class="text-btn" @click="openTimelineAllModal">전체보기</button>
            </div>
            <div class="timeline-container">
              <ul class="timeline-list">
                <li v-for="(t, idx) in timelineTop5" :key="idx" class="timeline-item">
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <p class="timeline-text">{{ t.text }}</p>
                    <span class="timeline-date">{{ t.at }} · {{ t.type }}</span>
                  </div>
                </li>
                <li v-if="timelineTop5.length === 0" class="empty-state">데이터가 없습니다.</li>
              </ul>
            </div>
          </section>

          <!-- Reservation Card -->
          <section v-else-if="card.id === 'reservation'" class="dashboard-card">
            <div class="card-header">
              <h3 class="card-heading">예약/이용 <span class="sub-count">(최근 5건)</span></h3>
              <button class="text-btn" @click="onReservationAll">전체보기</button>
            </div>
            <div class="table-wrapper">
              <div v-if="reservationLoading" class="loading-state">로딩 중...</div>
              <div v-else-if="reservationRows.length === 0" class="empty-state">내역이 없습니다.</div>
              <TableWithPaging
                  v-else
                  :columns="reservationColumns"
                  :rows="reservationRows"
                  :page="1"
                  :pageSize="5"
                  :total="reservationRows.length"
                  @row-click="openReservationModal"
              />
            </div>
          </section>

          <!-- VOC Card -->
          <section v-else-if="card.id === 'voc'" class="dashboard-card">
            <div class="card-header">
              <h3 class="card-heading">문의/클레임 <span class="sub-count">(최근 3건)</span></h3>
              <button class="text-btn" @click="onInquiryAll">전체보기</button>
            </div>
            <div class="table-wrapper">
              <div v-if="inquiryLoading" class="loading-state">로딩 중...</div>
              <div v-else-if="inquiryRows.length === 0" class="empty-state">내역이 없습니다.</div>
              <TableWithPaging
                  v-else
                  :columns="inquiryColumns"
                  :rows="inquiryRows"
                  :page="1"
                  :pageSize="3"
                  :total="inquiryRows.length"
                  @row-click="openInquiryModal"
              />
            </div>
          </section>

        </template>
      </div>

      <!-- 우측 컬럼 -->
      <div class="column right-column">
        <template v-for="card in rightCards" :key="card.id">

          <!-- Memo -->
          <CustomerMemoView
              v-if="card.id === 'memo'"
              :customerCode="customerCode"
              class="dashboard-card"
              @changed="onMemoChanged"
          />

          <!-- Status History -->
          <section v-else-if="card.id === 'statusHistory'" class="dashboard-card">
            <div class="card-header">
              <h3 class="card-heading">상태 변경 이력</h3>
              <button class="text-btn" @click="onStatusHistory">이력 보기({{ statusHistoryTotalCount }})</button>
            </div>
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">현재 상태</span>
                <span class="info-value status-badge" :class="statusTagClass(detail.status)">
                  {{ detail.status || "Unknown" }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">마지막 변경일</span>
                <span class="info-value">{{ statusChangedAtLabel }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">변경 주체</span>
                <span class="info-value">{{ statusActorLabel }}</span>
              </div>
            </div>
          </section>

          <!-- Membership -->
          <section v-else-if="card.id === 'membership'" class="dashboard-card membership-card">
            <div class="card-header">
              <h3 class="card-heading">멤버십</h3>
              <button class="text-btn" @click="onMembershipHistory">이력 보기</button>
            </div>
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">등급</span>
                <span class="info-value highlight-text" :class="membershipTagClass(membership.gradeName)">
                  {{ membership.gradeName || "미가입" }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">상태</span>
                <span class="info-value" :class="statusTagClass(membership.membershipStatus)">
                  {{ membership.membershipStatus || "-" }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">가입일</span>
                <span class="info-value">{{ formatDate(membership.joinedAt) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">산정일</span>
                <span class="info-value">{{ formatDate(membership.calculatedAt) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">만료일</span>
                <span class="info-value">{{ formatDate(membership.expiredAt) }}</span>
              </div>
            </div>
          </section>

          <!-- Loyalty -->
          <section v-else-if="card.id === 'loyalty'" class="dashboard-card loyalty-card">
            <div class="card-header">
              <h3 class="card-heading">로열티</h3>
              <button class="text-btn" @click="onLoyaltyHistory">이력 보기</button>
            </div>
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">등급</span>
                <span class="info-value highlight-text" :style="loyaltyTagStyle(loyalty.gradeName)">
                  {{ loyalty.gradeName || "-" }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">상태</span>
                <span class="info-value" :class="statusTagClass(loyalty.loyaltyStatus)">
                  {{ loyalty.loyaltyStatus || "-" }}
                </span>
              </div>

              <div class="info-row">
                <span class="info-label">산정일</span>
                <span class="info-value">{{ formatDate(loyalty.calculatedAt) }}</span>
              </div>
            </div>
          </section>

        </template>
      </div>
    </main>

    <!-- 모달 (기존 구조 유지) -->
    <BaseModal v-if="showContactModal" title="연락처 전체보기" @close="showContactModal = false">
      <div class="modal-body">
        <div v-if="(detail.contacts?.length || 0) === 0" class="empty-state">연락처 데이터가 없습니다.</div>
        <div v-else class="contact-list">
          <div v-for="(c, i) in detail.contacts" :key="i" class="contact-item">
            <span class="contact-type">{{ c.contactType }}</span>
            <span class="contact-val">
              {{ c.contactType === 'PHONE' ? formatPhone(c.contactValue) : c.contactValue }}
            </span>
            <!-- Marketing Badge -->
            <span v-if="c.marketingOptIn" class="badge-pill tag--ok">마케팅 수신 동의</span>
            <span v-else class="badge-pill tag--mute">마케팅 미동의</span>
          </div>
        </div>
      </div>
      <template #footer>
        <BaseButton type="ghost" size="sm" @click="showContactModal = false">닫기</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-if="showMembershipModal" title="멤버십 변경" @close="showMembershipModal=false">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>고객명</label>
            <input :value="detail.customerName || '-'" disabled class="input-disabled" />
          </div>
          <div class="form-group">
            <label>변경자(직원코드)</label>
            <input v-model="membershipChange.employeeCode" placeholder="예) 10001" class="input-base" />
          </div>
          <div class="form-group">
            <label>변경 등급</label>
            <select v-model="membershipChange.membershipGradeCode" class="input-base">
              <option value="">선택</option>
              <option v-for="g in membershipGradeOptions" :key="g.value" :value="g.value">{{ g.label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>변경 상태</label>
            <select v-model="membershipChange.membershipStatus" class="input-base">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div class="form-group">
            <label>만료일</label>
            <select v-model="membershipChange.expiredAt" class="input-base">
              <option v-for="date in expirationDateOptions" :key="date" :value="date">{{ date }}</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label>변경 사유</label>
            <textarea
                v-model="membershipChange.changeReason"
                class="input-base textarea"
                placeholder="예) CS보상 / VIP 고객 대상 기준 상향"
            />
          </div>
        </div>
        <p class="form-hint">* 저장 시 멤버십 변경 및 이력이 업데이트됩니다.</p>
      </div>
      <template #footer>
        <BaseButton type="ghost" size="sm" @click="showMembershipModal=false">취소</BaseButton>
        <BaseButton type="primary" size="sm" :disabled="savingMembership" @click="submitMembershipChange">저장</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-if="showCardSettingModal" title="카드 설정" @close="showCardSettingModal=false">
      <div class="modal-body">
        <div class="dnd-wrapper">
          <div class="dnd-column">
            <h4 class="dnd-title">왼쪽 영역</h4>
            <div class="dnd-list">
              <!-- Draggable Items -->
              <div
                  v-for="(c, idx) in draftLeft" :key="c.id"
                  class="dnd-item"
                  :class="{ disabled: !c.enabled, dragging: dragState.id === c.id, over: isOver('left', idx) }"
                  draggable="true"
                  @dragstart="onDragStart($event, c.id, 'left')"
                  @dragenter.prevent
                  @dragover.prevent="onDragOver('left', idx)"
                  @drop="onDropAt('left', idx)"
                  @dragend="onDragEnd"
              >
                <div class="dnd-content">
                  <span class="dnd-handle">⋮⋮</span>
                  <label class="dnd-check">
                    <input type="checkbox" v-model="c.enabled" @change="onToggleEnabled('left')" />
                    <span>{{ c.label }}</span>
                  </label>
                </div>
                <div v-if="showIndicator('left', idx)" class="dnd-indicator" />
              </div>
              <!-- Dropzone -->
              <div
                  class="dnd-dropzone"
                  :class="{ over: isOver('left', draftLeft.length) }"
                  @dragenter.prevent
                  @dragover.prevent="onDragOver('left', draftLeft.length)"
                  @drop="onDropAt('left', draftLeft.length)"
              >
                맨 아래로 이동
                <div v-if="showIndicator('left', draftLeft.length)" class="dnd-indicator" />
              </div>
            </div>
          </div>

          <div class="dnd-column">
            <h4 class="dnd-title">오른쪽 영역</h4>
            <div class="dnd-list">
              <div
                  v-for="(c, idx) in draftRight" :key="c.id"
                  class="dnd-item"
                  :class="{ disabled: !c.enabled, dragging: dragState.id === c.id, over: isOver('right', idx) }"
                  draggable="true"
                  @dragstart="onDragStart($event, c.id, 'right')"
                  @dragenter.prevent
                  @dragover.prevent="onDragOver('right', idx)"
                  @drop="onDropAt('right', idx)"
                  @dragend="onDragEnd"
              >
                <div class="dnd-content">
                  <span class="dnd-handle">⋮⋮</span>
                  <label class="dnd-check">
                    <input type="checkbox" v-model="c.enabled" @change="onToggleEnabled('right')" />
                    <span>{{ c.label }}</span>
                  </label>
                </div>
                <div v-if="showIndicator('right', idx)" class="dnd-indicator" />
              </div>
              <div
                  class="dnd-dropzone"
                  :class="{ over: isOver('right', draftRight.length) }"
                  @dragenter.prevent
                  @dragover.prevent="onDragOver('right', draftRight.length)"
                  @drop="onDropAt('right', draftRight.length)"
              >
                맨 아래로 이동
                <div v-if="showIndicator('right', draftRight.length)" class="dnd-indicator" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <BaseButton type="ghost" size="sm" @click="resetCardSetting">기본값</BaseButton>
        <BaseButton type="primary" size="sm" @click="saveCardSetting">저장</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-if="showReservationAllModal" title="예약 / 이용 전체" @close="closeReservationAllModal">
      <div class="modal-body">
        <div class="filter-bar">
          <div class="left">
            <div class="quick">
              <BaseButton
                  v-for="m in [1, 3, 6, 12]"
                  :key="m"
                  type="ghost"
                  size="sm"
                  :class="['pill', { active: reservationRange.months === m }]"
                  @click="setReservationMonths(m)"
              >
                {{ m }}개월
              </BaseButton>
              <BaseButton
                  type="ghost"
                  size="sm"
                  :class="['pill', { active: reservationRange.months === 'ALL' }]"
                  @click="setReservationAllPast()"
              >
                전체
              </BaseButton>
            </div>
          </div>
          <div class="right">
            <input class="date" type="date" v-model="reservationRange.from" />
            <span class="tilde">~</span>
            <input class="date" type="date" v-model="reservationRange.to" />
            <BaseButton type="ghost" size="sm" @click="resetReservationRange">초기화</BaseButton>
            <BaseButton type="primary" size="sm" @click="applyReservationRange">적용</BaseButton>
          </div>
        </div>
        <div v-if="reservationAllLoading" class="loading-state">로딩 중...</div>
        <div v-else-if="reservationAllRows.length === 0" class="empty-state">데이터가 없습니다.</div>
        <TableWithPaging v-else
                         :columns="reservationColumns"
                         :rows="reservationAllRows"
                         :page="1"
                         :pageSize="20"
                         :total="reservationAllRows.length"
        />
      </div>
    </BaseModal>

    <BaseModal v-if="showInquiryAllModal" title="문의 / 클레임 전체" @close="closeInquiryAllModal">
      <div class="modal-body">
        <div class="filter-bar">
          <div class="left">
            <div class="quick">
              <BaseButton
                  v-for="m in [1, 3, 6, 12]"
                  :key="m"
                  type="ghost"
                  size="sm"
                  :class="['pill', { active: inquiryRange.months === m }]"
                  @click="setInquiryMonths(m)"
              >
                {{ m }}개월
              </BaseButton>
              <BaseButton
                  type="ghost"
                  size="sm"
                  :class="['pill', { active: inquiryRange.months === 'ALL' }]"
                  @click="setInquiryAllPast()"
              >
                전체
              </BaseButton>
            </div>
          </div>
          <div class="right">
            <input class="date" type="date" v-model="inquiryRange.from" />
            <span class="tilde">~</span>
            <input class="date" type="date" v-model="inquiryRange.to" />
            <BaseButton type="ghost" size="sm" @click="resetInquiryRange">초기화</BaseButton>
            <BaseButton type="primary" size="sm" @click="applyInquiryRange">적용</BaseButton>
          </div>
        </div>
        <div v-if="inquiryAllLoading" class="loading-state">로딩 중...</div>
        <div v-else-if="inquiryAllRows.length === 0" class="empty-state">데이터가 없습니다.</div>
        <TableWithPaging v-else
                         :columns="inquiryColumns"
                         :rows="inquiryAllRows"
                         :page="1"
                         :pageSize="20"
                         :total="inquiryAllRows.length"
        />
      </div>
    </BaseModal>

    <TimelineAllModal :open="showTimelineAllModal" :items="timelineItems" @close="closeTimelineAllModal" />

    <BaseModal v-if="showReservationModal" title="예약 상세" @close="closeReservationModal">
      <div class="modal-body detail-view-body" v-if="selectedReservationDetail">
        <div class="detail-row"><span class="label">예약번호</span> <span class="val">{{ selectedReservationDetail.reservationCode }}</span></div>
        <div class="detail-row"><span class="label">상태</span> <span class="val">{{ selectedReservationDetail.reservationStatus }}</span></div>
        <div class="detail-row"><span class="label">채널</span> <span class="val">{{ selectedReservationDetail.reservationChannel }}</span></div>
        <div class="detail-row"><span class="label">투숙기간</span> <span class="val">{{ selectedReservationDetail.checkinDate }} ~ {{ selectedReservationDetail.checkoutDate }}</span></div>
        <div class="detail-row"><span class="label">객실</span> <span class="val">{{ selectedReservationDetail.roomLabel }}</span></div>
        <div class="detail-row"><span class="label">인원</span> <span class="val">{{ selectedReservationDetail.guestCount }} ({{ selectedReservationDetail.guestType }})</span></div>
        <div class="detail-row"><span class="label">총금액</span> <span class="val price">{{ selectedReservationDetail.totalPrice }}</span></div>
      </div>
      <div class="modal-body" v-else>로딩 중...</div>
    </BaseModal>

    <BaseModal v-if="showInquiryModal" title="문의/클레임 상세" @close="closeInquiryModal">
      <div class="modal-body detail-view-body" v-if="selectedInquiryDetail">
        <div class="detail-row"><span class="label">문의번호</span> <span class="val">{{ selectedInquiryDetail.inquiryCode }}</span></div>
        <div class="detail-row"><span class="label">상태</span> <span class="val">{{ selectedInquiryDetail.inquiryStatus }}</span></div>
        <div class="detail-row"><span class="label">카테고리</span> <span class="val">{{ selectedInquiryDetail.inquiryCategoryName }}</span></div>
        <div class="detail-row"><span class="label">제목</span> <span class="val">{{ selectedInquiryDetail.inquiryTitle }}</span></div>

        <div class="content-box">
          <h5 class="content-title">문의 내용</h5>
          <p class="content-text">{{ selectedInquiryDetail.inquiryContent }}</p>
        </div>

        <div class="content-box answer" v-if="selectedInquiryDetail.answerContent">
          <h5 class="content-title">답변</h5>
          <p class="content-text">{{ selectedInquiryDetail.answerContent }}</p>
        </div>
      </div>
      <div class="modal-body" v-else>로딩 중...</div>
    </BaseModal>

    <!-- 탭 2: 분석 리포트 -->
    <div v-if="activeTab === 'report'" class="report-tab-wrapper">
      <CustomerReportView
          :customerCode="customerCode"
          :membershipGrade="membership?.gradeName"
          :loyaltyGrade="loyalty?.gradeName"
          :joinedAt="formatDate(membership?.joinedAt)"
          :lastVisitedAt="formatDate(snapshot?.lastUsedAt)"
      />
    </div>

    <!-- 모달 -->
    <MembershipHistoryModal
        :open="showMembershipHistoryModal"
        :customerCode="customerCode"
        :membership="membership"
        @close="showMembershipHistoryModal = false"
    />
    <LoyaltyHistoryModal
        :open="showLoyaltyHistoryModal"
        :customerCode="customerCode"
        :loyalty="loyalty"
        @close="showLoyaltyHistoryModal = false"
    />
    <CustomerStatusHistoryModal
        :open="showStatusHistoryModal"
        :customerCode="customerCode"
        @close="showStatusHistoryModal = false"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import BaseButton from "@/components/common/button/BaseButton.vue";
import BaseModal from "@/components/common/modal/BaseModal.vue";
import TableWithPaging from "@/components/common/table/TableWithPaging.vue";

import CustomerReportView from "@/views/customer/view/CustomerReportView.vue";
import CustomerMemoView from "@/views/customer/view/CustomerMemoView.vue";
import MembershipHistoryModal from "@/views/customer/modal/MembershipHistoryModal.vue";
import LoyaltyHistoryModal from "@/views/customer/modal/LoyaltyHistoryModal.vue";
import TimelineAllModal from "@/views/customer/modal/TimelineAllModal.vue";
import CustomerStatusHistoryModal from "@/views/customer/modal/CustomerStatusHistoryModal.vue";

import { useAuthStore } from "@/stores/authStore.js";
import api from "@/api/axios.js";
import { getMembershipGradeList } from "@/api/setting/membershipGrade.js";
import { getCustomerStatusHistoriesApi } from "@/api/customer/customerDetailApi"; // Fix import path if needed
import { formatDate, formatMoney, formatPhone, toYmd } from "@/views/customer/utils/customerDetail.utils.js";
import { useCustomerDetailPage } from "@/views/customer/composables/useCustomerDetailPage.js";
import { useCustomerReservations } from "@/views/customer/composables/useCustomerReservations.js";
import { useCustomerInquiries } from "@/views/customer/composables/useCustomerInquiries.js";
import { useCardSettingDnd } from "@/views/customer/composables/useCardSettingDnd.js";
import { usePermissionGuard } from '@/composables/usePermissionGuard';

const { withPermission } = usePermissionGuard();
const route = useRoute();
const useRouterInstance = useRouter(); // renamed to avoid conflict
const router = useRouterInstance; // consistent usage
const authStore = useAuthStore();

const activeTab = computed(() => route.query.tab || 'basic');
const setTab = (tab) => {
  router.replace({ query: { ...route.query, tab } });
};
const hotelGroupCode = computed(() => authStore.hotel?.hotelGroupCode);
const customerCode = computed(() => Number(route.params.id));

/* 컴포저블 */
const {
  detail, snapshot, timelineItems, badges, chips,
  primaryPhone, primaryEmail, membership, loyalty,
  loadAll, loadTimeline,
} = useCustomerDetailPage({ hotelGroupCode, customerCode });

/* 아바타 로직: 기본 아이콘 사용 */
// 텍스트 아바타 로직 제거 (아이콘 선호)

/* 배지 및 태그 로직 */
const statusTagClass = (status) => {
  const s = String(status ?? "").toUpperCase();
  if (s === "ACTIVE") return "tag--ok";
  if (s === "CAUTION") return "tag--warn";
  if (s === "INACTIVE") return "tag--mute";
  return "tag--base";
};

const membershipTagClass = (gradeName) => {
  const g = String(gradeName ?? "").toUpperCase();
  if (!g || g === "-" || g === "미가입") return "tag--mute";
  if (g.includes("VIP")) return "tag--vip";
  if (g.includes("GOLD")) return "tag--gold";
  if (g.includes("SILVER")) return "tag--silver";
  if (g.includes("BRONZE")) return "tag--bronze";
  return "tag--base";
};

const membershipInitial = computed(() => {
  const g = String(membership.value?.gradeName ?? "").trim().toUpperCase();
  if (!g || g === "-" || g === "미가입") return "-";
  return g.charAt(0);
});

const membershipAvatarClass = computed(() => {
  const g = String(membership.value?.gradeName ?? "").toUpperCase();
  if (g.includes("VIP")) return "avatar--vip";
  if (g.includes("GOLD")) return "avatar--gold";
  if (g.includes("SILVER")) return "avatar--silver";
  if (g.includes("BRONZE")) return "avatar--bronze";
  return "avatar--base";
});

const loyaltyTagStyle = (gradeName) => {
  const g = String(gradeName ?? "").toUpperCase().trim();
  if (g.includes("EXCELLENT")) {
    return { background: "#e0e7ff", borderColor: "#a5b4fc", color: "#3730a3" }; // Indigo (Distinct from VIP Purple)
  }
  if (g.includes("GENERAL")) {
    return { background: "#ecfeff", borderColor: "#67e8f9", color: "#155e75" }; // Cyan
  }
  return {};
};

const timelineTop5 = computed(() => (timelineItems.value ?? []).slice(0, 5));

/* 상태 변경 이력 최신 1건 */
const statusHistoryTop1 = ref(null);
const statusHistoryTotalCount = ref(0);
const statusBeforeLabel = computed(() => statusHistoryTop1.value?.beforeStatus ?? "-");
const statusAfterLabel = computed(() => statusHistoryTop1.value?.afterStatus ?? "-");
const statusActorLabel = computed(() => {
  if (!statusHistoryTop1.value) return "-";
  const src = String(statusHistoryTop1.value?.changeSource ?? "").toUpperCase();
  return src === "SYSTEM" ? "SYSTEM" : (src ? "MANUAL" : "-");
});
const statusEmployeeLabel = computed(() => {
  if (statusActorLabel.value === "SYSTEM") return "-";
  return statusHistoryTop1.value?.employeeName || (statusHistoryTop1.value?.employeeCode ?? "-");
});
const statusChangedAtLabel = computed(() => {
  const v = statusHistoryTop1.value?.changedAt;
  return v ? formatDate(v) : "-";
});
const statusReasonLabel = computed(() => statusHistoryTop1.value?.changeReason ?? "-");

const loadStatusTop1 = async () => {
  try {
    const res = await getCustomerStatusHistoriesApi({
      customerCode: Number(customerCode.value),
      params: { size: 1, offset: 0, sortBy: "changed_at", direction: "DESC" },
    });
    const content = res?.data?.data?.content ?? [];
    statusHistoryTotalCount.value = res?.data?.data?.totalElements ?? 0;
    statusHistoryTop1.value = Array.isArray(content) ? content[0] ?? null : null;
  } catch {
    statusHistoryTop1.value = null;
    statusHistoryTotalCount.value = 0;
  }
};

/* API 래퍼 접근 */
const patchMembershipManually = async (customerCode, payload) => {
  const res = await api.patch(`/memberships/customers/${customerCode}/manual`, payload);
  return res.data?.data;
};
const getReservationsByCustomerApi = async ({ customerCode, size, offset }) => {
  const res = await api.get("/reservations", { params: { customerCode, size, offset } });
  return res.data?.data;
};
const getReservationDetailApi = async (code) => {
  const res = await api.get(`/reservations/detail/${code}`);
  return res.data?.data;
};
const getInquiryListApi = async (params) => {
  const res = await api.get("/inquiries", { params });
  return res.data?.data;
};
const getInquiryDetailApi = async (code) => {
  const res = await api.get(`/inquiries/${code}`);
  return res.data?.data;
};

/* 컴포저블 연결 */
const {
  reservationColumns, reservationLoading, reservationRows, loadReservationsTop5,
  showReservationModal, selectedReservationDetail, openReservationModal, closeReservationModal,
  showReservationAllModal, reservationAllLoading, reservationAllRows, onReservationAll, closeReservationAllModal,
  reservationRange, setReservationMonths, setReservationAllPast, resetReservationRange, applyReservationRange,
} = useCustomerReservations({ customerCodeRef: customerCode, getReservationsByCustomerApi, getReservationDetailApi });

const {
  inquiryColumns, inquiryLoading, inquiryRows, loadInquiriesTop3,
  showInquiryModal, selectedInquiryDetail, openInquiryModal, closeInquiryModal,
  showInquiryAllModal, inquiryAllLoading, inquiryAllRows, onInquiryAll, closeInquiryAllModal,
  inquiryRange, setInquiryMonths, setInquiryAllPast, resetInquiryRange, applyInquiryRange,
} = useCustomerInquiries({ customerCodeRef: customerCode, getInquiryListApi, getInquiryDetailApi });

/* DnD 설정 */
const LS_KEY = "customer_detail_card_setting_v2";
const defaultCardSetting = () => [
  { id: "snapshot", label: "고객 스냅샷", enabled: true, column: "left", order: 1 },
  { id: "timeline", label: "최근 타임라인", enabled: true, column: "left", order: 2 },
  { id: "reservation", label: "예약/이용(최근 5건)", enabled: true, column: "left", order: 3 },
  { id: "voc", label: "문의/클레임(최근 3건)", enabled: true, column: "left", order: 4 },
  { id: "memo", label: "고객 메모", enabled: true, column: "right", order: 1 },
  { id: "membership", label: "멤버십", enabled: true, column: "right", order: 2 },
  { id: "loyalty", label: "로열티", enabled: true, column: "right", order: 3 },
  { id: "statusHistory", label: "고객 상태 변경 이력", enabled: true, column: "right", order: 4 },
];
const {
  showCardSettingModal, onCardSetting, saveCardSetting, resetCardSetting,
  leftCards, rightCards, draftLeft, draftRight, onToggleEnabled,
  dragState, isOver, showIndicator, onDragStart, onDragEnter, onDragOver, onDragLeave, onDropAt, onDragEnd,
} = useCardSettingDnd({ lsKey: LS_KEY, defaultCardSetting });

/* 페이지 로드 */
const loadPage = async () => {
  await Promise.all([loadAll(), loadReservationsTop5(), loadInquiriesTop3(), loadStatusTop1()]);
};
onMounted(loadPage);

/* 액션 */
const goBack = () => router.push({ name: "CustomerList" });
const showContactModal = ref(false);
const openContactModal = () => (showContactModal.value = true);
const onMemoChanged = async () => { await Promise.all([loadTimeline(), loadStatusTop1()]); };

/* 멤버십 */
const showMembershipModal = ref(false);
const savingMembership = ref(false);
const membershipGrades = ref([]);
const membershipGradeOptions = computed(() =>
    membershipGrades.value.filter((g) => g?.membershipGradeStatus !== "INACTIVE")
        .map((g) => ({ label: g.gradeName, value: g.membershipGradeCode }))
);

const loadMembershipGrades = async () => {
  try {
    const list = await getMembershipGradeList();
    membershipGrades.value = Array.isArray(list) ? list : [];
  } catch { membershipGrades.value = []; }
};

const membershipChange = ref({
  membershipGradeCode: null, membershipStatus: "ACTIVE", expiredAt: "", changeReason: "", employeeCode: null,
});

import { getMyPage } from "@/api/setting/employeeApi.js";

const expirationDateOptions = computed(() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => `${current + i}-12-31`);
});

const onMembershipChange = () => {
  withPermission('CUSTOMER_UPDATE', async () => {
    await loadMembershipGrades();

    // Calculate current or default expiration date (always ending in 12-31)
    const currentExpired = new Date(membership.value?.expiredAt);
    let defaultYear = new Date().getFullYear();
    if (!isNaN(currentExpired.getTime())) {
      defaultYear = currentExpired.getFullYear();
    }
    const defaultDate = `${defaultYear}-12-31`;

    membershipChange.value = {
      membershipGradeCode: null,
      membershipStatus: membership.value?.membershipStatus || "ACTIVE",
      expiredAt: defaultDate,
      changeReason: "",
      employeeCode: null,
    };

    // ✅ getMyPage를 사용한 자동 채우기
    try {
      const me = await getMyPage();
      if (me && me.employeeCode) {
        membershipChange.value.employeeCode = me.employeeCode;
      }
    } catch (e) {
      console.warn("Failed to auto-fill employee code:", e);
    }

    showMembershipModal.value = true;
  });
};

const submitMembershipChange = async () => {
  if (savingMembership.value) return;
  savingMembership.value = true;
  try {
    const payload = {
      membershipGradeCode: Number(membershipChange.value.membershipGradeCode),
      membershipStatus: membershipChange.value.membershipStatus,
      // expiredAt은 이미 "YYYY-12-31" 형식이므로 시간만 추가
      expiredAt: membershipChange.value.expiredAt ? `${membershipChange.value.expiredAt}T23:59:59` : null,
      changeReason: (membershipChange.value.changeReason || "").trim(),
      employeeCode: Number(membershipChange.value.employeeCode),
    };
    await patchMembershipManually(customerCode.value, payload);
    alert("멤버십 변경 완료");
    showMembershipModal.value = false;
    await Promise.all([loadAll(), loadStatusTop1()]);
  } catch { alert("멤버십 변경 실패"); }
  finally { savingMembership.value = false; }
};

/* 서브 모달 */
const showMembershipHistoryModal = ref(false);
const showLoyaltyHistoryModal = ref(false);
const showStatusHistoryModal = ref(false);
const showTimelineAllModal = ref(false);
const onMembershipHistory = () => (showMembershipHistoryModal.value = true);
const onLoyaltyHistory = () => (showLoyaltyHistoryModal.value = true);
const onStatusHistory = () => (showStatusHistoryModal.value = true);
const openTimelineAllModal = () => (showTimelineAllModal.value = true);
const closeTimelineAllModal = () => (showTimelineAllModal.value = false);

</script>

<style scoped>
/* 페이지 레이아웃 */
.customer-detail-page {
  --primary-color: #2563eb;
  --bg-color: #f8fafc;
  --card-bg: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --border-color: #e2e8f0;

  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: var(--bg-color);
  min-height: 100vh;
  font-family: Pretendard, sans-serif;
  color: var(--text-main);
}



/* 헤더 */
.detail-header {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header-main {
  display: grid;
  grid-template-columns: 1.2fr 2fr auto;
  gap: 32px;
  align-items: center;
}

/* 좌측: 프로필 */
.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 100%;
}

.membership-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  color: white;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  background: #e2e8f0; /* Default */
  flex-shrink: 0;
  border: 4px solid white;
  outline: 2px solid transparent;
}

/* Avatar Gradients */
.avatar--vip {
  background: linear-gradient(135deg, #a855f7, #7e22ce);
  outline-color: #d8b4fe;
  box-shadow: 0 4px 12px rgba(126, 34, 206, 0.3);
}
.avatar--gold {
  background: linear-gradient(135deg, #facc15, #ca8a04);
  outline-color: #fde047;
  box-shadow: 0 4px 12px rgba(202, 138, 4, 0.3);
}
.avatar--silver {
  background: linear-gradient(135deg, #94a3b8, #475569);
  outline-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(71, 85, 105, 0.25);
}
.avatar--bronze {
  background: linear-gradient(135deg, #fdba74, #ea580c);
  outline-color: #ffedd5;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);
}
.avatar--base {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  color: #64748b;
}

.profile-info {
  display: flex;
  flex-direction: column;
  justify-content: center; /* 수직 중앙 정렬 */
  gap: 8px; /* 간격 좁게 */
  height: 100%;
}

.info-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.customer-name {
  font-size: 32px; /* 크기 확대 */
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  line-height: 1;
}

.badge-list {
  display: flex;
  gap: 6px;
  align-items: center;
}

.badge-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid transparent;
}

/* 배지 색상 */
.tag--ok { background-color: #dcfce7 !important; color: #166534 !important; border-color: #bbf7d0 !important; }
.tag--warn { background-color: #ffedd5 !important; color: #c2410c !important; border-color: #fed7aa !important; }
.tag--mute { background-color: #f1f5f9 !important; color: #94a3b8 !important; }
.tag--vip { background-color: #f3e8ff !important; color: #7e22ce !important; border-color: #d8b4fe !important; }
.tag--gold { background-color: #fefce8 !important; color: #a16207 !important; border-color: #fde047 !important; }
.tag--silver { background-color: #f8fafc !important; color: #475569 !important; border-color: #cbd5e1 !important; }
.tag--bronze { background-color: #fff7ed !important; color: #9a3412 !important; border-color: #ffedd5 !important; }
.tag--base { background-color: #eff6ff !important; color: #2563eb !important; border-color: #bfdbfe !important; }

.info-middle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-code {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.chip-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip-item {
  font-size: 12px;
  padding: 4px 10px;
  background: #eff6ff;
  border-radius: 6px;
  color: #1e293b;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* 중간: 메타 정보 */
.header-middle {
  display: flex;
  justify-content: flex-start;
  height: 100%;
  align-items: center;
  padding-left: 24px;
}

.meta-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 24px;
  row-gap: 12px;
  width: 100%;
}

.meta-label {
  font-size: 13px;
  color: #1e293b;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  padding-top: 2px;
}

.meta-value-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #0f172a;
}

/* 액션 그룹 */
.header-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  height: 100%;
}

.action-btn {
  background: white;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  min-width: 110px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.action-btn:hover {
  background: #f8fafc;
  color: #1e293b;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.action-btn.primary:hover {
  background: #2563eb;
  border-color: #1d4ed8;
}

/* [MODIFIED] Unifying text-btn style with CustomerMemoView */
.text-btn {
  background: #f1f5f9;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.text-btn:hover {
  background: #e2e8f0;
  color: #3b82f6;
  text-decoration: none;
}

.divider {
  display: none;
}

/* 대시보드 그리드 */
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); /* 약간의 입체감 */
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-heading {
  font-size: 18px; /* 헤더 크기 확대 */
  font-weight: 800; /* Extra Bold */
  color: #0f172a; /* 더 진한 색 */
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.02em;
}

.sub-count {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}


/* 통계 그리드 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 2열 유지하되 꽉 차게 */
  gap: 16px;
}

.stat-item {
  background: #f8fafc;
  padding: 20px 24px; /* 패딩 확대 */
  border-radius: 16px; /* 둥글게 */
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: row; /* 가로 배치 */
  justify-content: space-between; /* 양끝 정렬 */
  align-items: center;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background: #fff;
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  transform: translateY(-2px);
}

.stat-label {
  font-size: 15px; /* 크기 확대 */
  color: #64748b;
  font-weight: 700; /* 볼드 */
}

.stat-value {
  font-size: 22px; /* 훨씬 크게 */
  font-weight: 800; /* Extra Bold */
  color: #1e293b;
  letter-spacing: -0.5px;
}

.stat-value small {
  font-size: 15px;
  color: #94a3b8;
  font-weight: 600;
  margin-left: 2px;
}

.stat-value.highlight { color: #2563eb; }
.stat-value.alert { color: #f59e0b; }

/* 필터 바 (TimelineAllModal에서 가져옴) */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  width: 100%;
  margin-bottom: 12px;
}

.filter-bar .left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.filter-bar .quick {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}

.filter-bar .right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
  flex: 1;
  justify-content: flex-end;
}

.filter-bar .date {
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
}

.filter-bar .tilde {
  color: #6b7280;
  font-weight: 600;
}

/* 알약 스타일을 위한 BaseButton 오버라이드 */
.pill {
  border-radius: 999px !important;
  font-weight: 600;
}

.pill.active {
  border-color: #93c5fd !important;
  background: #eef6ff !important;
  color: #1d4ed8 !important;
}

/* 타임라인 */
.timeline-container {
  padding-left: 8px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: #e2e8f0;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-marker {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  border: 4px solid #3b82f6;
  z-index: 1;
  flex-shrink: 0;
  margin-top: 3px;
  box-shadow: 0 0 0 2px white;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-text {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin: 0;
  line-height: 1.4;
}

.timeline-date {
  font-size: 12px;
  color: #94a3b8;
}

/* 상태 및 정보 리스트 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: #64748b;
  font-weight: 500;
}

.info-value {
  color: #1e293b;
  font-weight: 600;
  text-align: right;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid transparent;
}

.arrow {
  color: #cbd5e1;
  font-size: 12px;
}

.highlight-text {
  color: #2563eb;
  font-weight: 700;
}

.text-ellipsis {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 모달 */
.modal-body {
  padding: 4px 0;
}

/* 연락처 목록 모달 */
.contact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.contact-type {
  font-size: 12px;
  font-weight: 700;
  width: 50px;
  color: #64748b;
}

.contact-val {
  flex: 1;
  font-weight: 600;
  color: #334155;
}

.tag-primary {
  background: #eff6ff;
  color: #2563eb;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.tag-optin {
  color: #94a3b8;
  font-size: 11px;
}

/* 폼 스타일 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.input-base, .input-disabled {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.input-base:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.input-disabled {
  background: #f1f5f9;
  color: #64748b;
}

.textarea {
  min-height: 80px;
  resize: vertical;
}

.form-hint {
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
}

/* 모달 내 상세 보기 */
.detail-view-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}

.detail-row .label {
  color: #64748b;
  font-weight: 500;
  font-size: 14px;
}

.detail-row .val {
  color: #1e293b;
  font-weight: 600;
  font-size: 14px;
}

.val.price {
  color: #2563eb;
  font-weight: 700;
}

.content-box {
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
}

.content-title {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 4px 0;
}

.content-text {
  font-size: 14px;
  line-height: 1.5;
  color: #334155;
  margin: 0;
  white-space: pre-wrap;
}

/* DnD 스타일 */
.dnd-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 300px;
}

.dnd-column {
  background: #f8fafc;
  padding: 12px;
  border-radius: 12px;
}

.dnd-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #64748b;
}

.dnd-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dnd-item {
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: grab;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.dnd-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dnd-item.dragging {
  opacity: 0.8;
  border-color: #3b82f6;
  background: #eff6ff;
}

.dnd-item.over {
  border-top: 2px solid #3b82f6;
  transform: translateY(-2px);
}

.dnd-handle {
  color: #cbd5e1;
  cursor: grab;
  font-weight: 800;
  font-size: 16px;
}

.dnd-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
}

.dnd-dropzone {
  padding: 12px;
  border: 2px dashed #e2e8f0;
  border-radius: 8px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

.dnd-dropzone.over {
  background: #eff6ff;
  border-color: #3b82f6;
}

/* 상단 내비게이션 */
.page-top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid #eef2f7;
  padding: 0 4px;
}

.nav-tabs {
  display: flex;
  gap: 28px;
}

.nav-tab-btn {
  background: none;
  border: none;
  padding: 16px 4px; /* Slightly taller for top nav */
  font-size: 16px;   /* Slightly larger text */
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  position: relative;
  transition: color 0.15s ease;
}

.nav-tab-btn:hover {
  color: #334155;
}

.nav-tab-btn.active {
  color: #577ce6;
  font-weight: 700;
}

.nav-tab-btn.active::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 100%;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(to right, #7bb0f1, #6f93f6);
}

.report-tab-wrapper {
  margin-top: 0; /* Remove margin as it's now top-level */
}

/* 기존 스타일은 유지하고, 모달 크기 관련 스타일 추가 */
:deep(.modal) {
  width: 1200px !important; /* 모달 너비 확장 (BaseModal의 720px 덮어쓰기) */
  max-width: 95vw;
}

/* 모달 내부 테이블 영역 최소 높이 확보 및 스크롤 */
:deep(.modal-body) {
  min-height: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

/* 필터 바 스타일 (2줄 레이아웃 적용) */
.filter-bar {
  display: flex;
  flex-direction: column; /* 2줄로 변경 (Vertical Stack) */
  gap: 12px;
  margin-bottom: 24px;
  align-items: flex-start; /* [MODIFIED] Cross-axis alignment to left */
}

.filter-bar .left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap; /* 버튼 줄바꿈 허용 */
  width: 100%; /* [MODIFIED] Full width */
  justify-content: flex-start; /* [MODIFIED] Left align */
}

/* 오른쪽 필터(날짜, 버튼) */
.filter-bar .right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap; /* 필요시 줄바꿈 */
  width: 100%; /* [MODIFIED] Full width */
  justify-content: flex-start; /* [MODIFIED] Left align */
}

/* 날짜 입력 너비 고정 및 가독성 확보 */
.filter-bar .date {
  width: 140px;
  text-align: center;
}

.filter-bar .tilde {
  margin: 0 4px;
}

/* 스냅샷 카드 제목 간격 조정 */
.snapshot-card .card-heading {
  margin-bottom: 20px; /* 기존보다 여백 추가 */
}
</style>
