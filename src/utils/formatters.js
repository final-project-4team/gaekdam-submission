// src/utils/formatters.js
export function safeNumber(v){
  if (v === null || v === undefined) return NaN
  if (typeof v === 'number') return v
  const s = String(v).replace(/[^0-9.-]+/g,'')
  const n = Number(s)
  return isNaN(n) ? NaN : n
}

export function formatCurrency(v){
  const n = safeNumber(v)
  if (isNaN(n)) return String(v ?? '-')
  // 소수 둘째 자리 고정
  return n.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '원'
}

export function formatPercent(v){
  const n = safeNumber(v)
  if (isNaN(n)) return String(v ?? '-')
  return (n % 1 === 0 ? String(n) : n.toFixed(1)) + '%'
}

export function formatCount(v){
  const n = safeNumber(v)
  if (isNaN(n)) return String(v ?? '-')
  return Math.round(n).toLocaleString('ko-KR') + '회'
}
