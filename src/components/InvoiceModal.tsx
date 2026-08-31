  import React, { useState } from 'react';
import { X, Printer, Mail, CheckCircle2, AlertTriangle, GraduationCap, FileText, Calendar, Download, Send } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Member, MonthConfig, SpecialQuota, MemberSolvencySummary, PaymentEntry, CustomPaymentMethod } from '../types';
import { formatUSD, formatVES, getMethodLabel, getCaracasDateString, getAllPaymentMethods } from '../utils/calculations';
import { getTenantHeaders } from '../utils/api';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  solvencySummary: MemberSolvencySummary;
  months: MonthConfig[];
  quotas: SpecialQuota[];
  payments: PaymentEntry[];
  initialTargetId?: string;
  customPaymentMethods?: CustomPaymentMethod[];
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  member,
  solvencySummary,
  months,
  quotas,
  payments,
  initialTargetId,
  customPaymentMethods = [],
}) => {
  const rawMemberPaymentsInit = payments.filter(p => p.memberId === member?.id);
  const latestTx = rawMemberPaymentsInit.length > 0 ? rawMemberPaymentsInit[rawMemberPaymentsInit.length - 1] : null;
  const [selectedTargetId, setSelectedTargetId] = useState<string>(initialTargetId || (latestTx ? 'tx-' + latestTx.id : (months[5]?.id || months[0]?.id || '2026-06')));
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const selectedMonth = months.find((m) => m.id === selectedTargetId);
  const selectedQuota = quotas.find((q) => q.id === selectedTargetId);

  const rawMemberPayments = payments.filter((p) => p.memberId === member.id);
  const flattenedPayments: PaymentEntry[] = [];
  rawMemberPayments.forEach((p) => {
    if (p.breakdown && p.breakdown.length > 0) {
      p.breakdown.forEach((b, idx) => {
        flattenedPayments.push({
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
      flattenedPayments.push(p);
    }
  });

  const targetPayments = flattenedPayments.filter(
    (p) => p.targetId === selectedTargetId
  );

  // Retrieve bulk or initial payments that might contribute to this member's solvency
  const memberBulkPayments = flattenedPayments.filter(
    (p) => (
      p.reference === 'INICIAL' ||
      p.id.startsWith('init-p-') ||
      (p.notes && p.notes.toLowerCase().includes('carga masiva inicial')) ||
      (p.notes && p.notes.toLowerCase().includes('masiva'))
    )
  );

  const computedStatus = selectedMonth
    ? solvencySummary.monthsStatus[selectedTargetId]
    : selectedQuota
      ? solvencySummary.quotasStatus[selectedTargetId]
      : null;

  let requiredFee = 12;
  let feeDirect = 12;
  let feeBcv = 16;
  let targetTitle = 'Mensualidad';
  const isTransactionMode = selectedTargetId.startsWith('tx-');
  const selectedTx = isTransactionMode ? rawMemberPayments.find(p => p.id === selectedTargetId.replace('tx-', '')) : null;

  if (isTransactionMode && selectedTx) {
    targetTitle = selectedTx.targetLabel || 'Pago de Transacción';
    requiredFee = selectedTx.amountUSD;
  } else if (selectedMonth) {
    feeDirect = selectedMonth.feeUSD_direct || selectedMonth.feeUSD || 12;
    feeBcv = selectedMonth.feeUSD_bcv || selectedMonth.feeUSD_direct || 12;
    targetTitle = `Mensualidad de ${selectedMonth.name} ${selectedMonth.year}`;
    const hasDirectUsd = targetPayments.some((p) =>
      ['efectivo_usd', 'binance'].includes(p.method) || p.currency === 'USD'
    );
    // Also check if any of the bulk payments was in USD if the user is solvent due to bulk
    const bulkIsDirectUsd = memberBulkPayments.some((p) => 
      ['efectivo_usd', 'binance'].includes(p.method) || p.currency === 'USD'
    );
    requiredFee = (hasDirectUsd || bulkIsDirectUsd) ? feeDirect : feeBcv;
  } else if (selectedQuota) {
    requiredFee = selectedQuota.feeUSD;
    feeDirect = selectedQuota.feeUSD;
    feeBcv = selectedQuota.feeUSD;
    targetTitle = `Cuota Especial: ${selectedQuota.title}`;
  }

  // Determine actual paid and debt from pre-calculated solvency summary to account for bulk/initial imports
  const totalPaidForTarget = isTransactionMode && selectedTx 
    ? selectedTx.amountUSD 
    : computedStatus ? computedStatus.paidUSD : targetPayments.reduce((sum, p) => sum + p.amountUSD, 0);
  const isSolventForTarget = computedStatus ? (computedStatus.status === 'solvente') : (totalPaidForTarget >= requiredFee - 0.01);
  const debtForTarget = computedStatus ? computedStatus.owedUSD : Math.max(0, requiredFee - totalPaidForTarget);

  const directPaidUSD = targetPayments.reduce((sum, p) => sum + p.amountUSD, 0);
  const hasBulkContribution = computedStatus && computedStatus.paidUSD > directPaidUSD + 0.01;

  // Build the list of display transactions including bulk payments if they helped cover this concept
  const displayPayments = isTransactionMode && selectedTx 
    ? (selectedTx.breakdown ? selectedTx.breakdown.map((b, i) => ({
        id: selectedTx.id + '-' + i,
        reference: selectedTx.reference,
        paymentDate: selectedTx.paymentDate,
        amountUSD: b.amountUSD,
        amountOriginal: b.amountOriginal,
        currency: selectedTx.currency,
        method: selectedTx.method,
        notes: b.targetLabel,
      } as PaymentEntry)) : [selectedTx])
    : [...targetPayments];

  if (hasBulkContribution && !isTransactionMode) {
    memberBulkPayments.forEach((bp) => {
      if (!displayPayments.some((dp) => dp.id === bp.id)) {
        displayPayments.push(bp);
      }
    });
  }

  const invoiceNumber = `REC-${member.cedula?.replace(/\./g, '') || '000'}-${selectedTargetId.replace('-', '')}`;
  const dateStr = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const generatePDFFile = async (): Promise<{ fileName: string; pdfBase64: string; pdf: jsPDF } | null> => {
    const element = document.getElementById('printable-invoice');
    if (!element) return null;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const printable = clonedDoc.getElementById('printable-invoice');
        if (printable) {
          printable.style.backgroundColor = '#ffffff';
          printable.style.color = '#0f172a';
        }

        // Deep-copy resolved computed styles (including converted rgb/rgba colors)
        // from original elements to cloned elements. This perfectly preserves Tailwind v4 OKLCH colors
        // since the browser computes them into standard RGB for active screen display.
        const originalElement = document.getElementById('printable-invoice');
        if (originalElement && printable) {
          const originalAll = originalElement.getElementsByTagName('*');
          const clonedAll = printable.getElementsByTagName('*');

          // Copy root computed styles
          const rootComputed = window.getComputedStyle(originalElement);
          printable.style.color = rootComputed.color;
          printable.style.backgroundColor = rootComputed.backgroundColor;
          printable.style.borderColor = rootComputed.borderColor;

          for (let i = 0; i < originalAll.length; i++) {
            const orig = originalAll[i] as HTMLElement;
            const clone = clonedAll[i] as HTMLElement;
            if (orig && clone) {
              const computed = window.getComputedStyle(orig);

              // Copy core layout-defining computed colors
              clone.style.color = computed.color;
              clone.style.backgroundColor = computed.backgroundColor;
              clone.style.borderColor = computed.borderColor;
              clone.style.borderTopColor = computed.borderTopColor;
              clone.style.borderBottomColor = computed.borderBottomColor;
              clone.style.borderLeftColor = computed.borderLeftColor;
              clone.style.borderRightColor = computed.borderRightColor;
              clone.style.opacity = computed.opacity;

              // Handle SVG paths (Lucide icons like check, warning, etc.)
              const tagName = orig.tagName.toLowerCase();
              if (['svg', 'path', 'circle', 'polyline', 'rect', 'line'].includes(tagName)) {
                if (computed.fill && computed.fill !== 'none') {
                  clone.setAttribute('fill', computed.fill);
                  clone.style.fill = computed.fill;
                }
                if (computed.stroke && computed.stroke !== 'none') {
                  clone.setAttribute('stroke', computed.stroke);
                  clone.style.stroke = computed.stroke;
                }
              }
            }
          }
        }
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Center and fit on a single page if height exceeds A4 bounds, preserving aspect ratio
    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      const scaledWidth = (pdfHeight * canvas.width) / canvas.height;
      const xOffset = (pdfWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, pdfHeight);
    }

    const fileName = `Comprobante_${member.lastName}_${member.firstName}_${selectedTargetId}.pdf`.replace(/\s+/g, '_');
    const pdfBase64 = pdf.output('datauristring');
    return { fileName, pdfBase64, pdf };
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const res = await generatePDFFile();
      if (res) {
        res.pdf.save(res.fileName);
      }
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const pdfData = await generatePDFFile();
      if (!pdfData) {
        throw new Error('No se pudo encontrar el comprobante para generar el PDF');
      }
      const { fileName, pdfBase64, pdf } = pdfData;
      pdf.save(fileName);

      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({
          member,
          targetTitle,
          totalPaidUSD: totalPaidForTarget,
          requiredFeeUSD: requiredFee,
          invoiceNumber,
          payments: targetPayments,
          pdfBase64,
          pdfFileName: fileName,
        }),
      });

      const data = await res.json();
      const recipientEmail = member.email || 'correo del integrante';

      if (res.ok && data.success) {
        if (data.sentViaSmtp) {
          setEmailStatus(`✅ Comprobante enviado directamente por correo SMTP a ${recipientEmail}`);
        } else {
          if (data.mailtoUrl) {
            window.open(data.mailtoUrl);
          }
          setEmailStatus(`ℹ️ PDF descargado (${fileName}). Para envío automático sin abrir cliente local, configura el servidor SMTP en la sección de Configuración.`);
        }
      } else {
        setEmailStatus(`⚠️ Error preparando correo: ${data.error || 'Error desconocido'}`);
      }
    } catch (e: any) {
      setEmailStatus(`⚠️ Error procesando el comprobante: ${e.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="glass-card rounded-2xl w-full max-w-2xl shadow-2xl text-slate-900 overflow-hidden my-6 border border-white/60 print:border-0 print:shadow-none print:w-full">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#162e58] text-white flex flex-wrap items-center justify-between gap-3 print:hidden border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#d95c0f]" />
            <span className="font-bold text-sm">Comprobante Individual (Recibo PDF)</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-[#b53c00] hover:bg-[#963000] disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              title="Descargar comprobante en PDF"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPDF ? 'Generando...' : 'Descargar PDF'}</span>
            </button>

            {/* Email PDF Button */}
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              title="Enviar comprobante PDF por correo electrónico al estudiante"
            >
              <Send className="w-4 h-4" />
              <span>{isSendingEmail ? 'Enviando PDF...' : 'Enviar por Email'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Close Button X */}
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-1 border border-slate-700"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Month / Quota Selector Bar */}
        <div className="bg-slate-100/80 border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-orange-600" />
            Seleccionar Mes a Consultar:
          </label>
          <select
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            className="w-full sm:w-72 bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            {rawMemberPayments.length > 0 && (
              <optgroup label="Facturas por Movimiento / Transacción">
                {rawMemberPayments.map((p) => (
                  <option key={'tx-' + p.id} value={'tx-' + p.id}>
                    {p.paymentDate} - Ref: {p.reference || 'S/R'} - {p.targetLabel || 'Pago'} ({p.currency === 'VES' ? p.amountOriginal + ' Bs' : '$' + p.amountUSD + ' USD'})
                  </option>
                ))} 
              </optgroup>
            )}
            <optgroup label="Resumen por Mensualidad">
              {months.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.year} (${m.feeUSD_direct || m.feeUSD || 12} directos / ${m.feeUSD_bcv || 16} BCV)
                </option>
              ))}
            </optgroup>
            {quotas.length > 0 && (
              <optgroup label="Resumen por Cuota Especial">
                {quotas.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} (${q.feeUSD})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {/* Email status feedback message */}
        {emailStatus && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between print:hidden shadow-xs">
            <span>{emailStatus}</span>
            <button onClick={() => setEmailStatus(null)} className="text-emerald-700 font-bold cursor-pointer">✕</button>
          </div>
        )}
        {/* Printable Receipt Canvas */}
        <div id="printable-invoice" className="p-10 bg-white text-slate-900 font-sans max-w-[800px] mx-auto select-none border border-slate-100 space-y-6">
          {/* Header Row */}
          <div className="flex justify-between items-start">
            {/* Left: Receipt Title & Promotion Name */}
            <div className="space-y-4">
              <h1 className="text-3xl font-black tracking-tight uppercase text-slate-950 font-sans">
                Recibo de Pago
              </h1>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-slate-900 tracking-wide uppercase">
                  {sessionStorage.getItem('tenantName') || "PROMOCIÓN 106"}
                </h2>
                <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                  SISTEMA DE GESTIÓN
                </p>
              </div>
            </div>
            {/* Right: Logos */}
            <div className="flex items-center space-x-3">
              <img
                src={sessionStorage.getItem('tenantLogoUrl') || "/logo.jpg"}
                alt="Logo Promoción"
                className="h-16 w-auto max-w-[180px] object-contain"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Dividing Line */}
          <div className="border-t-2 border-slate-950 my-2"></div>

          {/* Receipt Info: N° recibo & Fecha */}
          <div className="flex justify-between items-center text-xs font-bold my-4">
            {/* N° recibo badge */}
            <div className="flex items-center space-x-2">
              <span className="bg-[#fef7e0] border border-[#fbd38d]/50 text-slate-800 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                N° recibo
              </span>
              <span className="border-b border-slate-950 px-4 py-0.5 font-mono text-slate-950 text-sm tracking-wider min-w-[100px] text-center">
                {invoiceNumber.replace('REC-', '')}
              </span>
            </div>

            {/* Fecha slashes */}
            <div className="flex items-center space-x-2 text-xs font-bold">
              <span>Fecha:</span>
              <span className="border-b border-slate-950 px-3 py-0.5 font-mono text-slate-950 text-sm tracking-wider">
                {(() => {
                  const pDate = targetPayments[0]?.paymentDate || getCaracasDateString();
                  const parts = pDate.split('-');
                  if (parts.length === 3) {
                    return `${parts[2]}  /  ${parts[1]}  /  ${parts[0]}`;
                  }
                  return '    /    /    ';
                })()}
              </span>
            </div>
          </div>

          {/* Banner: INFORMACIÓN DE CONTACTO */}
          <div className="bg-[#fef7e0] text-slate-950 font-black tracking-widest py-1.5 px-4 text-center text-[10px] uppercase border border-[#fbd38d]/40 rounded-sm my-3">
            Información de Contacto
          </div>

          {/* Contact lines */}
          <div className="space-y-4 my-4 text-xs font-bold text-slate-900">
            <div className="flex items-end">
              <span className="mr-2 select-none text-[11px] uppercase tracking-wider text-slate-700">Nombre:</span>
              <div className="flex-1 border-b border-slate-400 pb-0.5 px-2 font-black text-slate-950 text-xs">
                {member.lastName}, {member.firstName}
              </div>
            </div>
            <div className="flex items-end">
              <span className="mr-2 select-none text-[11px] uppercase tracking-wider text-slate-700">Email:</span>
              <div className="flex-1 border-b border-slate-400 pb-0.5 px-2 text-slate-800 font-semibold text-xs">
                {member.email || 'No registrado'}
              </div>
            </div>
          </div>

          {/* Main Description Table */}
          <div className="border-2 border-slate-950 rounded-sm overflow-hidden my-4">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-950 bg-slate-50 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-center border-r-2 border-slate-950 w-3/4">Descripción</th>
                  <th className="px-4 py-2.5 text-center w-1/4">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="px-4 py-4 border-r-2 border-slate-950 h-[180px] min-h-[180px]">
                    <div className="space-y-3">
                      <div className="font-black text-slate-950 text-xs uppercase tracking-wide">
                        {targetTitle}
                      </div>
                      <div className="text-slate-600 font-medium space-y-1">
                        {displayPayments.map((p) => (
                          <div key={p.id} className="flex justify-between text-[10px] bg-slate-50 p-2 rounded-sm border border-slate-200/60">
                            <div>
                              <span className="font-bold text-slate-800">
                                {isTransactionMode 
                                  ? p.notes || `Abono (${getMethodLabel(p.method)})`
                                  : p.reference === 'INICIAL' || p.id.startsWith('init-p-') || (p.notes && p.notes.toLowerCase().includes('masiva'))
                                  ? 'Abono de Solvencia Inicial'
                                  : `Pago (${getMethodLabel(p.method)})`}
                              </span>
                              <span className="text-slate-400 ml-1.5">| Ref: {p.reference} | {p.paymentDate}</span>
                            </div>
                            <span className="font-black text-slate-950">
                              {p.currency === 'VES' ? `${p.amountOriginal.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs` : `$${p.amountUSD.toFixed(2)} USD`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-black text-slate-950 text-xs h-[180px] min-h-[180px]">
                    ${totalPaidForTarget.toFixed(2)} USD
                  </td>
                </tr>
                {/* Total Row */}
                <tr className="border-t-2 border-slate-950">
                  <td className="px-4 py-2 text-right bg-[#fef7e0] font-black border-r-2 border-slate-950 text-[10px] uppercase tracking-wider">
                    TOTAL:
                  </td>
                  <td className="px-4 py-2 text-right font-black text-slate-950 text-xs bg-[#fef7e0]">
                    ${totalPaidForTarget.toFixed(2)} USD
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Method Checkboxes */}
          <div className="pt-2">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-950 mb-3">
              Método de Pago
            </h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-black text-slate-950 uppercase tracking-wide">
              {(() => {
                const allMethods = getAllPaymentMethods(customPaymentMethods);
                const usedMethodKeys = new Set(displayPayments.map((p) => p.method));
                if (usedMethodKeys.size === 0 && selectedTx) {
                  usedMethodKeys.add(selectedTx.method);
                }

                return allMethods.map((m) => {
                  const isUsed = usedMethodKeys.has(m.id);
                  return (
                    <div key={m.id} className="flex items-center space-x-1.5">
                      <span>{m.name}</span>
                      <div className="w-4 h-4 border border-slate-950 flex items-center justify-center font-bold text-[10px] bg-white">
                        {isUsed ? '✓' : ''}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
