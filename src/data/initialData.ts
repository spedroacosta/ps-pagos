import { Member, MonthConfig, SpecialQuota, PaymentEntry, DollarPurchase } from '../types';

export const INITIAL_MONTHS: MonthConfig[] = [
  { id: '2026-01', name: 'Enero', monthNumber: 1, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
  { id: '2026-02', name: 'Febrero', monthNumber: 2, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
  { id: '2026-03', name: 'Marzo', monthNumber: 3, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
  { id: '2026-04', name: 'Abril', monthNumber: 4, year: 2026, feeUSD_direct: 8, feeUSD_bcv: 12, feeUSD: 8 },
  { id: '2026-05', name: 'Mayo', monthNumber: 5, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
  { id: '2026-06', name: 'Junio', monthNumber: 6, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
  { id: '2026-07', name: 'Julio', monthNumber: 7, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
  { id: '2026-08', name: 'Agosto', monthNumber: 8, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
  { id: '2026-09', name: 'Septiembre', monthNumber: 9, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
  { id: '2026-10', name: 'Octubre', monthNumber: 10, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
  { id: '2026-11', name: 'Noviembre', monthNumber: 11, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
  { id: '2026-12', name: 'Diciembre', monthNumber: 12, year: 2026, feeUSD_direct: 12, feeUSD_bcv: 16, feeUSD: 12 },
];

export const INITIAL_SPECIAL_QUOTAS: SpecialQuota[] = [];

export const INITIAL_MEMBERS: Member[] = [];

export const INITIAL_PAYMENTS: PaymentEntry[] = [];

export const INITIAL_DOLLAR_PURCHASES: DollarPurchase[] = [];
