<template>
  <div class="report-container">
    <div v-if="loading" class="loading-state">
      데이터를 분석하고 있습니다...
    </div>

    <div v-else-if="!reportData" class="empty-state">
      데이터를 불러올 수 없습니다. <br>
      (API 연결 상태를 확인해주세요)
    </div>

    <template v-else>
      <!-- Combined Header: Profile + KPI (User Requested Layout) -->
      <header class="detail-header combined-header">
        <div class="header-main-row">
          <!-- Left: Profile Info -->
          <div class="header-left">
            <div class="membership-avatar" :class="membershipAvatarClass">
              <span class="avatar-text">{{ membershipGradeInitial }}</span>
            </div>

            <div class="profile-info">
              <div class="info-top">
                <h1 class="customer-name">
                  {{ reportData.profile.customerName }}
                  <!-- Membership Badge (Restored) -->
                  <span class="badge-pill" :class="membershipTagClass(membershipGrade || reportData.profile.membershipGrade || reportData.profile.grade)">
                    {{ membershipGrade || reportData.profile.membershipGrade || reportData.profile.grade }}
                  </span>
                  <!-- Loyalty Badge -->
                  <span v-if="loyaltyGrade || reportData.profile.loyaltyGrade" class="badge-pill outline" :style="loyaltyTagStyle(loyaltyGrade || reportData.profile.loyaltyGrade)">
                    {{ loyaltyGrade || reportData.profile.loyaltyGrade }}
                  </span>
                </h1>
              </div>

              <div class="info-middle">
                <span class="customer-code">#{{ props.customerCode }}</span>
                <span class="separator">|</span>
                <span class="customer-meta">
                  가입일: {{ props.joinedAt || reportData.profile.joinedAt }} <span class="dot">·</span> 최근 방문: {{ props.lastVisitedAt || reportData.profile.lastVisitedAt || '-' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right: KPI Cards (Restored inline) -->
          <div class="header-right kpi-summary">
            <div class="kpi-group">
              <div class="kpi-item">
                <div class="kpi-label">누적 지출 (LTV)</div>
                <div class="kpi-value">₩ {{ formatNumber(reportData.kpi.totalSpending) }}</div>
                <div class="kpi-trend" :class="{ up: reportData.kpi.totalSpendingTrend > 1 }">
                  <span v-if="reportData.kpi.totalSpendingTrend > 1">▲</span>
                  <span v-else>▼</span>
                  {{ Math.abs(reportData.kpi.totalSpendingTrend) }}% (전년 대비)
                </div>
              </div>
              <div class="kpi-divider"></div>
              <div class="kpi-item">
                <div class="kpi-label">총 투숙일</div>
                <div class="kpi-value">{{ reportData.kpi.totalStayDays }}박</div>
                <div class="kpi-trend">평균 {{ reportData.kpi.avgStayDuration }}박/회</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Content Grid -->
      <div class="report-grid">
        <!-- Section 1: Spending Trend -->
        <section class="card span-2">
          <div class="card-header">
            <h3>월별 매출 추이</h3>
            <p class="subtitle">최근 1년 간의 결제 금액 변화</p>
          </div>
          <div class="chart-wrapper">
            <canvas ref="spendingChartRef"></canvas>
          </div>
        </section>

        <!-- Section 2: AI Insight -->
        <section class="card insight-card">
          <div class="card-header">
            <h3>마케팅 인사이트</h3>
            <div class="ai-badge">분석 완료</div>
          </div>
          <div class="insight-content">
            <p class="insight-text" v-html="highlightInsight(reportData.marketingInsight.summary)">
            </p>
            <ul class="insight-list">
              <li v-for="(detail, idx) in reportData.marketingInsight.details" :key="idx">
                💡 {{ detail }}
              </li>
            </ul>
          </div>
        </section>

        <!-- Section 3: Spending Category -->
        <section class="card">
          <div class="card-header">
            <h3>지출 카테고리</h3>
            <p class="subtitle">어디에 돈을 많이 썼을까요?</p>
          </div>
          <div class="chart-with-legend">
            <div class="chart-wrapper doughnut">
              <canvas ref="categoryChartRef"></canvas>
              <!-- Center Text (Optional, implies Total) -->
              <div class="doughnut-center">
                <span class="center-label">Total</span>
              </div>
            </div>

            <div class="custom-legend" v-if="reportData?.chartData?.spendingCategory">
              <div v-for="(item, i) in reportData.chartData.spendingCategory" :key="i" class="legend-item">
                <div class="legend-left">
                  <span class="dot" :style="{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#64748b'][i] }"></span>
                  <span class="label">{{ item.label }}</span>
                </div>
                <div class="legend-right">
                  <span class="percent">{{ item.value }}%</span>
                  <span class="amount">{{ formatNumber(item.amount) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section 4: Stay Pattern -->
        <section class="card">
          <div class="card-header">
            <h3>요일별 투숙 패턴</h3>
            <p class="subtitle">선호하는 요일 분석</p>
          </div>
          <div class="chart-wrapper">
            <canvas ref="stayChartRef"></canvas>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import Chart from 'chart.js/auto';
import { getCustomerInsightApi } from '@/api/customer/customerInsightApi';

const props = defineProps({
  customerCode: {
    type: String,
    required: true
  },
  membershipGrade: String,
  loyaltyGrade: String,
  joinedAt: String, // From Detail View
  lastVisitedAt: String // From Detail View
});

const loading = ref(true);
const reportData = ref(null);

const spendingChartRef = ref(null);
const categoryChartRef = ref(null);
const stayChartRef = ref(null);

let spendingChart = null;
let categoryChart = null;
let stayChart = null;

const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  // If string has commas, remove them before formatting
  const n = typeof num === 'string' ? Number(num.replace(/,/g, '')) : Number(num);
  return isNaN(n) ? '0' : n.toLocaleString();
};

const highlightInsight = (text) => {
  if (!text) return '';
  // Simple highlighting logic: wrap text in *...* with strong tags if API supported markdown,
  // but here we just return text or could implement simple regex if needed.
  // For now, assume backend sends plain text, we can bold keywords if specific format matches
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

/* Badge Logic (Same as CustomerDetailView) */
const membershipTagClass = (grade) => {
  const g = String(grade ?? "").toUpperCase();
  if (!g || g === "-" || g === "미가입") return "tag--mute";
  if (g.includes("VIP")) return "tag--vip";
  if (g.includes("GOLD")) return "tag--gold";
  if (g.includes("SILVER")) return "tag--silver";
  if (g.includes("BRONZE")) return "tag--bronze";
  return "tag--base";
};

const loyaltyTagStyle = (grade) => {
  const g = String(grade ?? "").toUpperCase().trim();
  if (g.includes("EXCELLENT")) {
    return { background: "#e0e7ff", borderColor: "#a5b4fc", color: "#3730a3" };
  }
  if (g.includes("GENERAL")) {
    return { background: "#ecfeff", borderColor: "#67e8f9", color: "#155e75" };
  }
  return {};
};

/* Unification Logic: Membership Avatar from DetailView */
const membershipGradeInitial = computed(() => {
  const g = props.membershipGrade || reportData.value?.profile?.membershipGrade || "";
  if (!g || g === "미가입") return "N";
  return g.charAt(0).toUpperCase();
});

const membershipAvatarClass = computed(() => {
  const g = String(props.membershipGrade || reportData.value?.profile?.membershipGrade || "").toUpperCase();
  if (g.includes("VIP")) return "avatar--vip";
  if (g.includes("GOLD")) return "avatar--gold";
  if (g.includes("SILVER")) return "avatar--silver";
  if (g.includes("BRONZE")) return "avatar--bronze";
  return "avatar--base";
});

const fetchData = async () => {
  if (!props.customerCode) return;

  loading.value = true;
  reportData.value = null; // Reset

  try {
    console.log(`[Report] Fetching data for customer: ${props.customerCode}`);
    const res = await getCustomerInsightApi(props.customerCode);
    console.log("[Report] Response:", res);

    const raw = res?.data;
    // Handle ApiResponse structure: { success: true, data: { ... } }
    const data = raw?.data || raw;

    if (data && data.profile) {
      // [Visual Enhancement] Transform Spending Categories to fixed list (Room, F&B, Activity, Etc)
      if (data.chartData && data.chartData.spendingCategory) {
        const rawCats = data.chartData.spendingCategory;

        // Initialize Buckets
        const buckets = {
          room: { value: 0, amount: 0 },
          dining: { value: 0, amount: 0 },
          facility: { value: 0, amount: 0 },
          etc: { value: 0, amount: 0 }
        };

        // Aggregate Logic
        rawCats.forEach(c => {
          const label = (c.label || '').trim();
          // 1. Dining (식음, 식사)
          if (label.includes('식사') || label.includes('식음') || label.includes('F&B')) {
            buckets.dining.value += c.value || 0;
            buckets.dining.amount += c.amount || 0;
          }
          // 2. Facilities (운동, 휴식, 여가, 레저, 스파)
          else if (label.includes('운동') || label.includes('휴식') || label.includes('여가') || label.includes('레저') || label.includes('스파') || label.includes('부대시설')) {
            buckets.facility.value += c.value || 0;
            buckets.facility.amount += c.amount || 0;
          }
          // 3. Room (객실)
          else if (label.includes('객실') || label.includes('숙박')) {
            buckets.room.value += c.value || 0;
            buckets.room.amount += c.amount || 0;
          }
          // 4. Others (기타 & Anything else)
          else {
            buckets.etc.value += c.value || 0;
            buckets.etc.amount += c.amount || 0;
          }
        });

        // Enforce 4 fixed categories
        data.chartData.spendingCategory = [
          { label: '객실', value: buckets.room.value, amount: buckets.room.amount },
          { label: '식음(식사)', value: buckets.dining.value, amount: buckets.dining.amount },
          { label: '부대시설(운동,휴식,여가)', value: buckets.facility.value, amount: buckets.facility.amount },
          { label: '기타', value: buckets.etc.value, amount: buckets.etc.amount }
        ];
      }


      reportData.value = data;
    } else {
      console.warn("[Report] Invalid structure:", data);
      throw new Error("Invalid API response structure");
    }
  } catch (e) {
    console.error("[Report] API Error:", e);
  } finally {
    loading.value = false;
    await nextTick();
    if (reportData.value) {
      renderCharts();
    }
  }
};



onMounted(() => {
  fetchData();
});

watch(() => props.customerCode, () => {
  fetchData();
});

const renderCharts = () => {
  if (spendingChart) spendingChart.destroy();
  if (categoryChart) categoryChart.destroy();
  if (stayChart) stayChart.destroy();

  const chartData = reportData.value.chartData;

  // 1. Spending Chart
  const labels = chartData.monthlySpending.map(d => d.month);
  const amounts = chartData.monthlySpending.map(d => d.amount);

  spendingChart = new Chart(spendingChartRef.value, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '월별 매출',
        data: amounts,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#2563eb',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  });

  // 2. Category Chart
  categoryChart = new Chart(categoryChartRef.value, {
    type: 'doughnut',
    data: {
      labels: chartData.spendingCategory.map(d => d.label),
      datasets: [{
        data: chartData.spendingCategory.map(d => d.value), // Percentage
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#64748b'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%', // Thinner ring
      plugins: {
        legend: { display: false }, // Hide default legend
        tooltip: {
          callbacks: {
            label: function(context) {
              const idx = context.dataIndex;
              const item = chartData.spendingCategory[idx];
              return `${item.label}: ${item.value}% (${formatNumber(item.amount)}원)`;
            }
          }
        }
      }
    }
  });

  // 3. Stay Chart
  // Map Day Map to Array order
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dayValues = days.map(day => chartData.stayDayPattern[day] || 0);

  stayChart = new Chart(stayChartRef.value, {
    type: 'bar',
    data: {
      labels: ['월', '화', '수', '목', '금', '토', '일'],
      datasets: [{
        label: '방문 횟수',
        data: dayValues,
        backgroundColor: '#6366f1',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { display: false },
        x: { grid: { display: false } }
      }
    }
  });
};
</script>

<style scoped>
.loading-state, .empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  font-size: 16px;
  color: #64748b;
  font-weight: 600;
}
/* Existing styles... */
.report-container {
  padding: 24px;
  background: #f8fafc;
  min-height: 100%;
  box-sizing: border-box;
}

/* Removed .report-header styles */

/* Ported Styles from CustomerDetailView for Header/Profile Card */
.detail-header {
  background: white;
  border-radius: 16px;
  padding: 24px 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 24px;
}

.header-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

/* Membership Avatar */
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

.customer-name {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-middle {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
  margin-top: 4px;
}

.separator {
  color: #cbd5e1;
  font-size: 12px;
}

.dot {
  margin: 0 4px;
}

.customer-code {
  font-weight: 600;
  color: #334155;
}

/* KPI Group (Inline) */
.header-right {
  display: flex;
  align-items: center;
}

.kpi-group {
  display: flex;
  align-items: center;
  gap: 32px;
}

.kpi-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end; /* Text align right */
  gap: 4px;
}

.kpi-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.kpi-value {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.kpi-trend {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.kpi-divider {
  width: 1px;
  height: 40px;
  background: #e2e8f0;
}

/* Badge Styles */
.badge-pill {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  border: 1px solid transparent;
}

.badge-pill.outline {
  background: white !important;
  border: 1px solid currentColor !important;
  padding: 2px 8px;
}

/* Badge Colors Match CustomerDetailView */
.tag--ok { background-color: #dcfce7 !important; color: #166534 !important; border-color: #bbf7d0 !important; }
.tag--warn { background-color: #ffedd5 !important; color: #c2410c !important; border-color: #fed7aa !important; }
.tag--mute { background-color: #f1f5f9 !important; color: #94a3b8 !important; }
.tag--vip { background-color: #f3e8ff !important; color: #7e22ce !important; border-color: #d8b4fe !important; }
.tag--gold { background-color: #fefce8 !important; color: #a16207 !important; border-color: #fde047 !important; }
.tag--silver { background-color: #f8fafc !important; color: #475569 !important; border-color: #cbd5e1 !important; }
.tag--bronze { background-color: #fff7ed !important; color: #9a3412 !important; border-color: #ffedd5 !important; }
.tag--base { background-color: #eff6ff !important; color: #2563eb !important; border-color: #bfdbfe !important; }

.customer-meta {
  margin: 4px 0 0;
  font-size: 13px;
  color: #94a3b8;
}

/* Grid Layout */
.report-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.span-2 {
  grid-column: span 2;
}

.card-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #94a3b8;
}

.chart-wrapper {
  position: relative;
  height: 250px;
  width: 100%;
}

.chart-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

/* Custom Legend Layout */
.chart-with-legend {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 16px;
}

.chart-wrapper.doughnut {
  flex: 0 0 160px; /* Fixed width for better ratio */
  height: 160px;
  position: relative;
}

.doughnut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}
.center-label { font-size: 12px; color: #94a3b8; font-weight: 600; }

.custom-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #f1f5f9;
}
.legend-item:last-child { border-bottom: none; }

.legend-left { display: flex; align-items: center; gap: 8px; }
.dot { width: 10px; height: 10px; border-radius: 4px; }
.label { color: #64748b; font-weight: 500; }

.legend-right { text-align: right; display: flex; align-items: center; gap: 4px; }
.percent { font-weight: 800; color: #0f172a; }
.amount { color: #94a3b8; font-size: 13px; font-weight: 400; }

/* Insight Card Special Style */
.insight-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #eef2f7;
}

.ai-badge {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
}

.insight-text {
  font-size: 16px;
  line-height: 1.6;
  color: #334155;
  margin-bottom: 20px;
}

.insight-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.insight-list li {
  background: #fff;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  color: #475569;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
</style>
