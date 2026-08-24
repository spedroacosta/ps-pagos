import { Member, MonthConfig, SpecialQuota, PaymentEntry, MemberSolvencySummary, LateFeeConfig } from '../types';

/**
 * Helper to normalize USD amount if difference to nearest whole dollar or target is <= 0.10 (1 décima max difference)
 */
export function normalizeUsdAmount(rawUSD: number): number {
  if (!rawUSD || rawUSD <= 0) return 0;
  const nearest = Math.round(rawUSD);
  if (Math.abs(rawUSD - nearest) <= 0.10) {
    return nearest;
  }
  return rawUSD;
}

/**
 * Calculates member solvency summary for all months and special quotas
 */
export function calculateMemberSolvency(
  member: Member,
  months: MonthConfig[],
  quotas: SpecialQuota[],
  payments: PaymentEntry[],
  lateFeeConfig?: LateFeeConfig
): MemberSolvencySummary {
  const rawMemberPayments = payments.filter((p) => p.memberId === member.id);
  const memberPayments: PaymentEntry[] = [];

  rawMemberPayments.forEach((p) => {
    if (p.breakdown && p.breakdown.length > 0) {
      p.breakdown.forEach((b, idx) => {
        memberPayments.push({
          ...p,
          id: `${p.id}-bd-${idx}`,
          amountOriginal: b.amountOriginal,
          amountUSD: b.amountUSD,
          targetType: b.targetType,
          targetId: b.targetId,
          targetLabel: b.targetLabel,
        });
      });
    } else {
      memberPayments.push(p);
    }
  });

  const monthsStatus: MemberSolvencySummary['monthsStatus'] = {};
  const quotasStatus: MemberSolvencySummary['quotasStatus'] = {};
  let totalOwedUSD = 0;
  let totalPaidUSD = 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  // Separate direct target month payments vs bulk / initial payments
  const isInitialOrBulkPayment = (p: PaymentEntry) =>
    p.reference === 'INICIAL' ||
    p.id.startsWith('init-p-') ||
    (p.notes && p.notes.toLowerCase().includes('carga masiva inicial')) ||
    (p.notes && p.notes.toLowerCase().includes('masiva'));

  const directMonthPayments = memberPayments.filter(
    (p) => p.targetType === 'month' && !isInitialOrBulkPayment(p)
  );

  const bulkPayments = memberPayments.filter(
    (p) => isInitialOrBulkPayment(p) || (p.targetType === 'month' && !p.targetId)
  );

  let bulkPoolUSD = bulkPayments.reduce((sum, p) => sum + normalizeUsdAmount(p.amountUSD), 0);

  // Process months in chronological order
  months.forEach((month) => {
    const directForThisMonth = directMonthPayments.filter((p) => p.targetId === month.id);
    const directPaidUSD = directForThisMonth.reduce(
      (sum, p) => sum + normalizeUsdAmount(p.amountUSD),
      0
    );

    const feeUSD_direct = month.feeUSD_direct || month.feeUSD || 12;

    let status: 'solvente' | 'parcial' | 'deuda' | 'na' = 'deuda';
    let paidUSD_display = 0;
    let owedUSD = 0;

    if (feeUSD_direct === 0) {
      status = 'na';
      paidUSD_display = 0;
      owedUSD = 0;
    } else {
      let totalEffectivePaidUSD = directPaidUSD;

      if (totalEffectivePaidUSD < feeUSD_direct - 0.80 && bulkPoolUSD > 0) {
        const needed = feeUSD_direct - totalEffectivePaidUSD;
        const fromPool = Math.min(bulkPoolUSD, needed);
        bulkPoolUSD -= fromPool;
        totalEffectivePaidUSD += fromPool;
      }

      if (totalEffectivePaidUSD >= feeUSD_direct - 0.80) {
        status = 'solvente';
        paidUSD_display = feeUSD_direct;
        owedUSD = 0;
      } else if (totalEffectivePaidUSD > 0) {
        status = 'parcial';
        paidUSD_display = Math.round(totalEffectivePaidUSD * 100) / 100;
        owedUSD = Math.max(0, feeUSD_direct - paidUSD_display);
      } else {
        status = 'deuda';
        paidUSD_display = 0;
        owedUSD = feeUSD_direct;
      }
    }

    totalPaidUSD += paidUSD_display;

    // Accumulate total debt ONLY for past or current months dynamically
    const isPastOrCurrentMonth =
      month.year < currentYear ||
      (month.year === currentYear && month.monthNumber <= currentMonthNum);

    if (isPastOrCurrentMonth) {
      totalOwedUSD += owedUSD;
    }

    monthsStatus[month.id] = {
      feeUSD: feeUSD_direct,
      paidUSD: paidUSD_display,
      owedUSD,
      status,
    };
  });

  // Process special quotas
  quotas.forEach((quota) => {
    const quotaPayments = memberPayments.filter(
      (p) => p.targetType === 'quota' && p.targetId === quota.id
    );
    const rawPaidUSD = quotaPayments.reduce((sum, p) => sum + normalizeUsdAmount(p.amountUSD), 0);

    const hasDirectUsdPayment = quotaPayments.some((p) =>
      ['efectivo_usd', 'binance', 'zelle', 'banesco_panama'].includes(p.method) ||
      p.currency === 'USD' ||
      (p.notes && p.notes.toLowerCase().includes('masiva'))
    );

    const feeUSD_direct = quota.feeUSD_direct || quota.feeUSD || 0;
    const feeUSD_bcv = quota.feeUSD_bcv || quota.feeUSD_direct || quota.feeUSD || 0;

    let status: 'solvente' | 'parcial' | 'deuda' | 'na' = 'deuda';
    let paidUSD_display = 0;
    let owedUSD = 0;

    if (feeUSD_direct === 0 && feeUSD_bcv === 0) {
      status = 'na';
    } else if (hasDirectUsdPayment) {
      if (rawPaidUSD >= feeUSD_direct - 0.80) {
        status = 'solvente';
        paidUSD_display = feeUSD_direct;
        owedUSD = 0;
      } else if (rawPaidUSD > 0) {
        status = 'parcial';
        paidUSD_display = Math.round(rawPaidUSD * 100) / 100;
        owedUSD = Math.max(0, feeUSD_direct - paidUSD_display);
      } else {
        status = 'deuda';
        paidUSD_display = 0;
        owedUSD = feeUSD_direct;
      }
    } else {
      const targetBcv = feeUSD_bcv || feeUSD_direct;
      if (rawPaidUSD >= targetBcv - 0.80) {
        status = 'solvente';
        paidUSD_display = feeUSD_direct;
        owedUSD = 0;
      } else if (rawPaidUSD > 0) {
        status = 'parcial';
        const ratio = targetBcv > 0 ? Math.min(1, rawPaidUSD / targetBcv) : 1;
        paidUSD_display = Math.round(ratio * feeUSD_direct * 100) / 100;
        owedUSD = Math.max(0, feeUSD_direct - paidUSD_display);
      } else {
        status = 'deuda';
        paidUSD_display = 0;
        owedUSD = feeUSD_direct;
      }
    }

    totalPaidUSD += paidUSD_display;

    const isPastOrCurrentQuota = !quota.date || new Date(quota.date) <= now;
    if (isPastOrCurrentQuota) {
      totalOwedUSD += owedUSD;
    }

    quotasStatus[quota.id] = {
      feeUSD: feeUSD_direct,
      paidUSD: paidUSD_display,
      owedUSD,
      status,
    };
  });

  // Late fees calculation
  let lateFeesSummary: MemberSolvencySummary['lateFeesSummary'] = undefined;

  let isLateFeePaused = false;
  if (lateFeeConfig) {
    if (lateFeeConfig.paused) {
      isLateFeePaused = true;
    } else if (lateFeeConfig.pausedUntil) {
      let caracasDateStr = '';
      try {
        caracasDateStr = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'America/Caracas',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now);
      } catch (e) {
        caracasDateStr = now.toISOString().split('T')[0];
      }
      if (caracasDateStr <= lateFeeConfig.pausedUntil) {
        isLateFeePaused = true;
      }
    }
  }

  if (lateFeeConfig && !isLateFeePaused) {
    let currentYear = now.getFullYear();
    let currentMonthNum = now.getMonth() + 1;
    let currentDay = now.getDate();

    try {
      const caracasStr = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
      const [y, m, d] = caracasStr.split('-').map(Number);
      currentYear = y;
      currentMonthNum = m;
      currentDay = d;
    } catch (e) {}

    const startDay = (lateFeeConfig.startDay !== undefined) ? lateFeeConfig.startDay : 6;
    const graceMonths = (lateFeeConfig.graceMonths !== undefined) ? lateFeeConfig.graceMonths : 2;

    const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
    let activeStartDay = startDay;
    if (lateFeeConfig.overrideMonth === currentMonthKey && lateFeeConfig.overrideDay !== undefined) {
      activeStartDay = lateFeeConfig.overrideDay;
    }

    let todayStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    try {
      todayStr = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
    } catch (e) {}

    const lateFeeMonths: string[] = [];
    months.forEach((month) => {
      const isPastOrCurrent =
        month.year < currentYear ||
        (month.year === currentYear && month.monthNumber <= currentMonthNum);

      if (!isPastOrCurrent) return;

      if (member.forgivenLateFees?.[month.id]) {
        return; // Multa perdonada para este mes
      }

      // Calculate the exact deadline date when this month incurs a late fee (e.g., month + graceMonths)
      const targetMonthLinear = month.year * 12 + month.monthNumber + graceMonths;
      const deadlineYear = Math.floor((targetMonthLinear - 1) / 12);
      const deadlineMonthNum = ((targetMonthLinear - 1) % 12) + 1;

      let deadlineStartDay = activeStartDay;
      const deadlineMonthKey = `${deadlineYear}-${String(deadlineMonthNum).padStart(2, '0')}`;
      if (lateFeeConfig.overrideMonth === deadlineMonthKey && lateFeeConfig.overrideDay !== undefined) {
        deadlineStartDay = lateFeeConfig.overrideDay;
      }

      const fineDeadlineDate = `${deadlineYear}-${String(deadlineMonthNum).padStart(2, '0')}-${String(deadlineStartDay).padStart(2, '0')}`;

      const mStatus = monthsStatus[month.id];
      
      if (mStatus && (mStatus.status === 'deuda' || mStatus.status === 'parcial')) {
        if (todayStr >= fineDeadlineDate) {
          lateFeeMonths.push(month.id);
        }
      } else if (mStatus && mStatus.status === 'solvente') {
        const monthPays = memberPayments.filter((p) => p.targetType === 'month' && p.targetId === month.id);
        
        // Find the LATEST payment date for this month to see when it was fully paid
        let lastPayDate = '';
        if (monthPays.length > 0) {
          lastPayDate = monthPays.map((p) => p.paymentDate || p.dateEntered).filter(Boolean).sort().pop() || '';
        }

        // Check if the bulk payments also cover it (if it was paid in bulk)
        if (!lastPayDate && bulkPayments.length > 0) {
          lastPayDate = bulkPayments.map((p) => p.paymentDate || p.dateEntered).filter(Boolean).sort().pop() || '';
        }

        // If the date it was finally paid is on or after the deadline, the fine stays
        if (lastPayDate && lastPayDate >= fineDeadlineDate) {
          lateFeeMonths.push(month.id);
        }
      }
    });

    const lateFeesCount = lateFeeMonths.length;
    const totalLateFeesUSD_direct = lateFeesCount * (lateFeeConfig.feeUSD_direct ?? 2);
    const totalLateFeesUSD_bcv = lateFeesCount * (lateFeeConfig.feeUSD_bcv ?? 3);

    const lateFeePayments = memberPayments.filter((p) => p.targetType === 'late_fee');
    const paidLateFeesUSD = lateFeePayments.reduce((sum, p) => sum + normalizeUsdAmount(p.amountUSD), 0);
    const owedLateFeesUSD = Math.max(0, totalLateFeesUSD_direct - paidLateFeesUSD);

    lateFeesSummary = {
      lateFeesCount,
      totalLateFeesUSD_direct,
      totalLateFeesUSD_bcv,
      paidLateFeesUSD,
      owedLateFeesUSD,
      lateFeeMonths,
    };

    totalOwedUSD += owedLateFeesUSD;
    totalPaidUSD += paidLateFeesUSD;
  }

  const isUpToDate = totalOwedUSD <= 0.01;

  return {
    member,
    monthsStatus,
    quotasStatus,
    totalOwedUSD,
    totalPaidUSD,
    isUpToDate,
    lateFeesSummary,
  };
}

/**
 * Format currency in USD e.g. "$12.00"
 */
export function formatUSD(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val || 0);
}

/**
 * Format currency in VES e.g. "Bs. 502,20"
 */
export function formatVES(val: number): string {
  return (
    'Bs. ' +
    new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0)
  );
}

/**
 * Format payment method label in Spanish
 */
export function getMethodLabel(method: string): string {
  switch (method) {
    case 'pago_movil':
      return 'Pago Móvil';
    case 'transferencia_ves':
      return 'Transferencia';
    case 'efectivo_usd':
      return 'Efectivo $';
    case 'binance':
      return 'Binance';
    case 'efectivo_ves':
      return 'Efectivo Bs';

      return 'Banesco Panamá';
    default:
      return 'Otro';
  }
}

export interface ConceptDistributionItem {
  targetType: 'month' | 'quota' | 'late_fee';
  targetId: string;
  targetLabel: string;
  amountOriginal: number;
  amountUSD: number;
}

/**
 * Sequential waterfall distribution: fills each selected concept month by month up to its required fee
 */
export function distributePaymentAcrossConcepts(params: {
  memberId: string;
  selectedConcepts: string[];
  amountOriginal: number;
  currency: 'USD' | 'VES';
  method: string;
  bcvRate: number;
  months: MonthConfig[];
  quotas: SpecialQuota[];
  existingPayments?: PaymentEntry[];
  manualAllocationsOriginal?: Record<string, number>;
}): ConceptDistributionItem[] {
  const {
    memberId,
    selectedConcepts,
    amountOriginal,
    currency,
    method,
    bcvRate,
    months,
    quotas,
    existingPayments = [],
  } = params;

  if (!selectedConcepts || selectedConcepts.length === 0 || amountOriginal <= 0) {
    return [];
  }

  const isDirectUsd = currency === 'USD' || ['efectivo_usd', 'binance', 'zelle', 'banesco_panama'].includes(method);
  
  if (params.manualAllocationsOriginal && Object.keys(params.manualAllocationsOriginal).length > 0) {
    const results: ConceptDistributionItem[] = [];
    for (const key of selectedConcepts) {
      const alloc = params.manualAllocationsOriginal[key];
      if (alloc && alloc > 0) {
        const [type, id] = key.split(':');
        const tType = type as 'month' | 'quota' | 'late_fee';
        let targetLabel = id;
        if (tType === 'month') {
          const m = months.find((m) => m.id === id);
          if (m) targetLabel = `${m.name} ${m.year}`;
        } else if (tType === 'quota') {
          const q = quotas.find((q) => q.id === id);
          if (q) targetLabel = q.title;
        } else if (tType === 'late_fee') {
          if (id === 'global') {
            targetLabel = 'Multas por Atraso';
          } else {
            const m = months.find((m) => m.id === id);
            targetLabel = m ? `Multa de ${m.name} ${m.year}` : `Multa ${id}`;
          }
        }
        
        results.push({
          targetType: tType,
          targetId: id,
          targetLabel,
          amountOriginal: alloc,
          amountUSD: isDirectUsd ? alloc : (alloc / bcvRate)
        });
      }
    }
    return results;
  }
  
  // Total original currency pool to distribute (either USD or VES)
  let remainingPoolOriginal = amountOriginal;
  const count = selectedConcepts.length;
  const results: ConceptDistributionItem[] = [];

  for (let i = 0; i < count; i++) {
    if (remainingPoolOriginal <= 0) break;

    const key = selectedConcepts[i];
    const [type, id] = key.split(':');
    const tType = type as 'month' | 'quota' | 'late_fee';

    let targetLabel = id;
    let requiredFee_direct = 12;
    let requiredFee_bcv = 16;

    if (tType === 'month') {
      const m = months.find((m) => m.id === id);
      targetLabel = m ? `${m.name} ${m.year}` : id;
      if (m) {
        requiredFee_direct = m.feeUSD_direct || m.feeUSD || 12;
        requiredFee_bcv = m.feeUSD_bcv || m.feeUSD || 16;
      }
    } else if (tType === 'late_fee') {
      if (id === 'global') {
        targetLabel = 'Multas por Atraso';
      } else {
        const m = months.find((m) => m.id === id);
        targetLabel = m ? `Multa de ${m.name} ${m.year}` : `Multa ${id}`;
      }
      requiredFee_direct = 2; // Default fallback for waterfall
      requiredFee_bcv = 3;    // Default fallback for waterfall
    } else {
      const q = quotas.find((q) => q.id === id);
      targetLabel = q ? q.title : id;
      if (q) {
        requiredFee_direct = q.feeUSD_direct || q.feeUSD || 0;
        requiredFee_bcv = q.feeUSD_bcv || q.feeUSD_direct || 0;
      }
    }

    // Check how much member ALREADY paid for this target in direct USD equivalent
    const currentPayments = existingPayments.filter(
      (p) => p.memberId === memberId && p.targetType === tType && p.targetId === id
    );
    const alreadyPaidUSD_direct = currentPayments.reduce((s, p) => s + p.amountUSD, 0);
    const neededUSD_direct = Math.max(0, requiredFee_direct - alreadyPaidUSD_direct);

    // If it's fully paid already (or late_fee), just target what's required (for display or overpayment)
    const targetUSD_direct = neededUSD_direct > 0 ? neededUSD_direct : requiredFee_direct;
    
    // Determine how much is required in the ORIGINAL currency (USD or VES)
    let targetOriginalNeeded = 0;
    if (isDirectUsd) {
      targetOriginalNeeded = targetUSD_direct;
    } else {
      // Rule of 3 for VES payments: (direct_usd_needed * fee_bcv / fee_direct) * bcvRate
      // Or simply: portion of fee_bcv needed * bcvRate
      const proportion = requiredFee_direct > 0 ? (targetUSD_direct / requiredFee_direct) : 1;
      targetOriginalNeeded = proportion * requiredFee_bcv * bcvRate;
    }

    // Allocate from pool
    let allocOriginal = 0;

    if (i === count - 1) {
      // Last item gets all the remaining pool
      allocOriginal = remainingPoolOriginal;
      
      // Apply tolerance logic for single or last item
      if (targetOriginalNeeded > 0) {
        const toleranceOriginal = isDirectUsd ? 0.80 : (0.80 * bcvRate);
        if (allocOriginal >= targetOriginalNeeded - toleranceOriginal && allocOriginal < targetOriginalNeeded) {
          allocOriginal = targetOriginalNeeded; 
        }
      }
    } else {
      // Waterfall allocation up to what's needed
      allocOriginal = Math.min(remainingPoolOriginal, targetOriginalNeeded);
      
      // Apply tolerance logic for intermediate items
      if (targetOriginalNeeded > 0) {
        const toleranceOriginal = isDirectUsd ? 0.80 : (0.80 * bcvRate);
        if (remainingPoolOriginal >= targetOriginalNeeded - toleranceOriginal && remainingPoolOriginal < targetOriginalNeeded) {
          allocOriginal = targetOriginalNeeded; 
        }
      }
      
      remainingPoolOriginal = Math.max(0, remainingPoolOriginal - allocOriginal);
    }

    // Convert allocated original currency back to direct USD equivalent
    let allocDirectUSD = 0;
    if (isDirectUsd) {
      allocDirectUSD = allocOriginal;
    } else {
      // allocOriginal is in VES. Convert to direct USD using rule of 3:
      if (requiredFee_bcv > 0 && bcvRate > 0) {
        allocDirectUSD = (allocOriginal / bcvRate) * (requiredFee_direct / requiredFee_bcv);
      } else {
        allocDirectUSD = (allocOriginal / bcvRate);
      }
    }

    results.push({
      targetType: tType,
      targetId: id,
      targetLabel,
      amountOriginal: Math.round(allocOriginal * 100) / 100,
      amountUSD: Math.round(allocDirectUSD * 100) / 100,
    });
  }

  return results;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the America/Caracas timezone.
 * Avoids the "+1 day" offset issue caused by standard UTC conversions.
 */
export function getCaracasDateString(): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formatter = new Intl.DateTimeFormat('sv-SE', options);
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
