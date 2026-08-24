export type PaymentMethod = 
  | 'pago_movil' 
  | 'transferencia_ves' 
  | 'efectivo_usd' 
  | 'efectivo_ves' 
  
  | 'binance'
  | 'otro';

export interface Member {
  id: string;
  lastName: string;
  firstName: string;
  cedula: string;
  email: string;
  phone?: string;
  notes?: string;
  forgivenLateFees?: { [monthId: string]: boolean };
}

export interface MonthConfig {
  id: string; // e.g. "2026-01"
  name: string; // e.g. "Enero"
  monthNumber: number; // 1 - 12
  year: number; // e.g. 2026
  feeUSD_direct: number; // Fee in direct USD (efectivo/dólares directos, ej 12)
  feeUSD_bcv: number; // Fee in USD equivalent when paid in VES at BCV rate (ej 16)
  feeUSD?: number; // legacy optional fallback
}

export interface SpecialQuota {
  id: string;
  title: string;
  feeUSD: number;
  feeUSD_direct?: number;
  feeUSD_bcv?: number;
  date: string;
  description?: string;
}

export interface LateFeeConfig {
  feeUSD_direct: number;
  feeUSD_bcv: number;
  paused: boolean;
  pausedUntil?: string;
  startDay: number;
  graceMonths: number;
  overrideMonth?: string;
  overrideDay?: number;
}

export interface PaymentEntry {
  id: string;
  dateEntered: string; // YYYY-MM-DD
  memberId: string;
  memberName: string;
  method: PaymentMethod;
  paymentDate: string; // YYYY-MM-DD
  amountOriginal: number;
  currency: 'USD' | 'VES';
  bcvRate: number; // BCV exchange rate at payment time
  amountUSD: number; // Converted USD equivalent
  reference: string;
  notes: string;
  targetType: 'month' | 'quota' | 'late_fee';
  targetId: string; // month ID or special quota ID or 'late_fee'
  targetLabel: string; // display string
  breakdown?: {
    targetType: 'month' | 'quota' | 'late_fee';
    targetId: string;
    targetLabel: string;
    amountOriginal: number;
    amountUSD: number;
  }[];
}

export interface DollarPurchase {
  id: string;
  date: string; // YYYY-MM-DD
  bsAmount: number; // Bolívares invertidos
  usdAmount: number; // Dólares comprados
  rate: number; // Tasa implícita (Bs/$)
  notes: string;
}

export interface ParsedWhatsAppItem {
  id: string;
  rawText: string;
  matchedMemberId?: string;
  matchedMemberName?: string;
  matchConfidence: number; // 0 - 100
  paymentDate: string;
  method: PaymentMethod;
  amountOriginal: number;
  currency: 'USD' | 'VES';
  bcvRate: number;
  reference: string;
  targetType: 'month' | 'quota' | 'late_fee';
  targetId: string;
  targetLabel: string;
  selectedConcepts?: string[]; // e.g. ["month:2026-06", "quota:sq-1"]
  notes: string;
  approved: boolean;
  isDollarPurchase?: boolean;
  usdAmount?: number;
}

export interface BcvRateInfo {
  rate: number;
  date: string;
  source: string;
}

export interface MemberSolvencySummary {
  member: Member;
  monthsStatus: Record<string, {
    feeUSD: number;
    paidUSD: number;
    owedUSD: number;
    status: 'solvente' | 'parcial' | 'deuda' | 'na';
  }>;
  quotasStatus: Record<string, {
    feeUSD: number;
    paidUSD: number;
    owedUSD: number;
    status: 'solvente' | 'parcial' | 'deuda' | 'na';
  }>;
  totalOwedUSD: number;
  totalPaidUSD: number;
  isUpToDate: boolean;
  lateFeesSummary?: {
    lateFeesCount: number;
    totalLateFeesUSD_direct: number;
    totalLateFeesUSD_bcv: number;
    paidLateFeesUSD: number;
    owedLateFeesUSD: number;
    lateFeeMonths: string[];
  };
}

export interface ExpenseEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  amount: number;
  currency: 'USD' | 'VES';
  bcvRate?: number;
  reference?: string;
  notes?: string;
}

export interface ExpenseConfig {
  enabled: boolean;
}
