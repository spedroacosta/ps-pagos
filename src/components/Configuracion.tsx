declare const google: any;
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Calendar,
  Sparkles,
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  Save,
  Mail,
  Send,
  Server,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Download,
  Upload,
  Database,
  Building,
  Image as ImageIcon,
  User,
  ExternalLink,
  Copy,
  Share2,
  X,
  TrendingDown,
  Tag,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { MonthConfig, SpecialQuota, Member, PaymentEntry, DollarPurchase, LateFeeConfig, ExpenseConfig } from '../types';
import { getTenantHeaders } from '../utils/api';
import { ConversionCalculator } from './ConversionCalculator';

interface ConfiguracionProps {
  months: MonthConfig[];
  onUpdateMonthFee: (monthId: string, feeUSD_direct: number, feeUSD_bcv: number) => void;
  quotas: SpecialQuota[];
  onAddQuota: (quota: Omit<SpecialQuota, 'id'>) => void;
  onDeleteQuota: (quotaId: string) => void;
  members: Member[];
  onAddMember: (member: Omit<Member, 'id'>) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (memberId: string) => void;
  payments: PaymentEntry[];
  dollarPurchases: DollarPurchase[];
  onRestoreFullDatabase: (data: {
    members: Member[];
    months: MonthConfig[];
    quotas: SpecialQuota[];
    payments: PaymentEntry[];
    dollarPurchases: DollarPurchase[];
  }) => Promise<boolean>;
  tenantId: string;
  tenantName: string;
  setTenantName: (name: string) => void;
  tenantLogoUrl: string | null;
  setTenantLogoUrl: (logo: string | null) => void;
  tenantLogoCircularUrl: string | null;
  setTenantLogoCircularUrl: (logo: string | null) => void;
  lateFeeConfig: LateFeeConfig | null;
  onUpdateLateFeeConfig: (config: LateFeeConfig) => void;
  bcvRate?: number;
  expenseConfig?: ExpenseConfig;
  onUpdateExpenseConfig?: (config: ExpenseConfig) => void;
  expenseCategories?: string[];
  onAddExpenseCategory?: (categoryName: string) => void;
  onDeleteExpenseCategory?: (categoryName: string) => void;
}

export const Configuracion: React.FC<ConfiguracionProps> = ({
  months,
  onUpdateMonthFee,
  quotas,
  onAddQuota,
  onDeleteQuota,
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  payments,
  dollarPurchases,
  onRestoreFullDatabase,
  tenantId,
  tenantName,
  setTenantName,
  tenantLogoUrl,
  setTenantLogoUrl,
  tenantLogoCircularUrl,
  setTenantLogoCircularUrl,
  lateFeeConfig,
  onUpdateLateFeeConfig,
  bcvRate = 61.5,
  expenseConfig = { enabled: false },
  onUpdateExpenseConfig,
  expenseCategories = ['Logística', 'Eventos', 'Administrativo', 'Protocolo', 'Imprevistos'],
  onAddExpenseCategory,
  onDeleteExpenseCategory,
}) => {

  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'members' | 'fees' | 'notifications' | 'database'>('profile');

  // --- Profile Settings State ---
  const [promoNameInput, setPromoNameInput] = useState(tenantName);
  const [profileEmailInput, setProfileEmailInput] = useState('contacto@controlsaas.com');
  const [logoPreview, setLogoPreview] = useState<string | null>(tenantLogoUrl);
  const [logoCircularPreview, setLogoCircularPreview] = useState<string | null>(tenantLogoCircularUrl);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragCircularActive, setDragCircularActive] = useState(false);

  // Sync profile values when props change
  useEffect(() => {
    setPromoNameInput(tenantName);
  }, [tenantName]);

  useEffect(() => {
    setLogoPreview(tenantLogoUrl);
  }, [tenantLogoUrl]);

  useEffect(() => {
    setLogoCircularPreview(tenantLogoCircularUrl);
  }, [tenantLogoCircularUrl]);

  // Load profile read-only detail (like email)
  useEffect(() => {
    fetch('/api/tenant/profile', {
      headers: getTenantHeaders()
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.email) {
          setProfileEmailInput(data.email);
        }
      })
      .catch((err) => console.error('Error fetching admin profile info:', err));
  }, [tenantId]);

  // --- Drag & Drop Handlers ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleCircularDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragCircularActive(true);
    } else if (e.type === 'dragleave') {
      setDragCircularActive(false);
    }
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
      alert('Formatos admitidos únicamente: JPG o PNG.');
      return;
    }
    // Max size 4MB
    if (file.size > 4 * 1024 * 1024) {
      alert('La imagen supera el límite máximo de 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const processCircularImageFile = (file: File) => {
    if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
      alert('Formatos admitidos únicamente: JPG o PNG.');
      return;
    }
    // Max size 4MB
    if (file.size > 4 * 1024 * 1024) {
      alert('La imagen supera el límite máximo de 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoCircularPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleCircularDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCircularActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCircularImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleCircularFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCircularImageFile(e.target.files[0]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoNameInput.trim()) {
      setProfileStatus({ type: 'error', msg: 'El nombre de la promoción no puede estar vacío.' });
      return;
    }

    setIsSavingProfile(true);
    setProfileStatus(null);

    try {
      const res = await fetch('/api/tenant/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders(),
          ...(localStorage.getItem('driveToken') ? { 'Authorization': 'Bearer ' + localStorage.getItem('driveToken') } : {})
        },
        body: JSON.stringify({
          name: promoNameInput.trim(),
          logoUrl: logoPreview,
          logoCircularUrl: logoCircularPreview
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTenantName(data.tenant.name);
        setTenantLogoUrl(data.tenant.logoUrl);
        setTenantLogoCircularUrl(data.tenant.logoCircularUrl);
        setProfileStatus({ type: 'success', msg: '🎉 ¡Cambios guardados exitosamente! Tu logo, logo circular y nombre de promoción se han actualizado.' });
      } else {
        setProfileStatus({ type: 'error', msg: data.error || 'Error al guardar cambios de perfil.' });
      }
    } catch (err: any) {
      setProfileStatus({ type: 'error', msg: `Error de conexión: ${err.message}` });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Quota Form State ---
  const [quotaTitle, setQuotaTitle] = useState('');
  const [quotaFeeDirect, setQuotaFeeDirect] = useState('');
  const [quotaFeeBcv, setQuotaFeeBcv] = useState('');
  const [quotaDate, setQuotaDate] = useState(new Date().toISOString().split('T')[0]);
  const [quotaDesc, setQuotaDesc] = useState('');

  // --- Member Form State ---
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newLastName, setNewLastName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Editing month fee inline state
  const [editingMonthId, setEditingMonthId] = useState<string | null>(null);
  const [tempFeeDirect, setTempFeeDirect] = useState<string>('12');
  const [tempFeeBcv, setTempFeeBcv] = useState<string>('16');

  // SMTP Config state
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('Comité de Finanzas - Promoción 2026');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpEnabled, setSmtpEnabled] = useState(true);

  // Telegram Bot config states
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatIdAllowed, setTelegramChatIdAllowed] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [telegramLogs, setTelegramLogs] = useState<Array<{ timestamp: string; message: string; success: boolean }>>([]);

  const [testRecipient, setTestRecipient] = useState('');
  const [smtpStatus, setSmtpStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  // Backup & Restore states
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDriveBackingUp, setIsDriveBackingUp] = useState(false);

  const handleDriveBackup = async () => {
    try {
      setIsDriveBackingUp(true);
      const backupData = {
        members,
        months,
        quotas,
        payments,
        dollarPurchases,
        exportedAt: new Date().toISOString(),
        version: '2.0'
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `control_pagos_respaldo_${dateStr}.json`;

      const response = await fetch('/api/backup/drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({ fileName, fileContent: dataStr })
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          // Drive OAuth token not present - trigger local JSON download fallback seamlessly
          handleDownloadBackup();
          alert('💡 Notificación de Respaldo:\n\nPara subir automáticamente a tu unidad personal de Google Drive se requiere iniciar sesión con OAuth de Google Workspace.\n\nSin embargo, ¡tu copia de seguridad completa (.json) ha sido descargada automáticamente a tu dispositivo para mantener tus datos a salvo!');
          return;
        }
        throw new Error(result.error || 'Error al respaldar en Google Drive');
      }

      alert('¡Respaldo guardado exitosamente en Google Drive!');
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setIsDriveBackingUp(false);
    }
  };
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);

  // Late Fee editing states
  const [lateFeeDirect, setLateFeeDirect] = useState('2');
  const [lateFeeBcv, setLateFeeBcv] = useState('3');
  const [lateFeePaused, setLateFeePaused] = useState(false);
  const [lateFeePausedUntil, setLateFeePausedUntil] = useState('');
  const [lateFeeStartDay, setLateFeeStartDay] = useState('6');
  const [lateFeeGraceMonths, setLateFeeGraceMonths] = useState('2');
  const [lateFeeOverrideMonth, setLateFeeOverrideMonth] = useState('');
  const [lateFeeOverrideDay, setLateFeeOverrideDay] = useState('');
  const [isSavingLateFee, setIsSavingLateFee] = useState(false);
  const [lateFeeStatus, setLateFeeStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (lateFeeConfig) {
      setLateFeeDirect(String(lateFeeConfig.feeUSD_direct));
      setLateFeeBcv(String(lateFeeConfig.feeUSD_bcv));
      setLateFeePaused(lateFeeConfig.paused);
      setLateFeePausedUntil(lateFeeConfig.pausedUntil || '');
      setLateFeeStartDay(String(lateFeeConfig.startDay ?? 6));
      setLateFeeGraceMonths(String(lateFeeConfig.graceMonths ?? 2));
      setLateFeeOverrideMonth(lateFeeConfig.overrideMonth || '');
      setLateFeeOverrideDay(lateFeeConfig.overrideDay ? String(lateFeeConfig.overrideDay) : '');
    }
  }, [lateFeeConfig]);

  // Delete Member Confirmation State
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [isVerifyingDelete, setIsVerifyingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDeleteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToDelete) return;
    if (!deleteConfirmPassword.trim()) {
      setDeleteError('Por favor ingresa tu contraseña de administrador.');
      return;
    }

    setIsVerifyingDelete(true);
    setDeleteError(null);

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({ password: deleteConfirmPassword })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onDeleteMember(memberToDelete.id);
        setMemberToDelete(null);
        setDeleteConfirmPassword('');
        setDeleteError(null);
      } else {
        setDeleteError(data.error || 'Contraseña incorrecta de la promoción.');
      }
    } catch (err: any) {
      setDeleteError(`Error de red: ${err.message}`);
    } finally {
      setIsVerifyingDelete(false);
    }
  };

  const handleDownloadBackup = () => {
    try {
      const backupData = {
        members,
        months,
        quotas,
        payments,
        dollarPurchases,
        exportedAt: new Date().toISOString(),
        version: '2.0'
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `control_pagos_respaldo_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupSuccess('✅ Copia de seguridad descargada exitosamente en formato JSON.');
      setBackupError(null);
    } catch (err: any) {
      setBackupError(`Error al exportar: ${err.message}`);
      setBackupSuccess(null);
    }
  };

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('El archivo no contiene un JSON válido.');
        }

        if (!Array.isArray(parsed.members) || !Array.isArray(parsed.payments)) {
          throw new Error('El archivo no parece ser una copia de seguridad válida de Control de Pagos.');
        }

        const confirmRestore = confirm(
          `⚠️ ATENCIÓN: Estás a punto de RESTAURAR una copia de seguridad.\n\n` +
          `Esto reemplazará COMPLETAMENTE todos los datos actuales en el sistema:\n` +
          `- ${parsed.members.length} Integrantes\n` +
          `- ${parsed.payments.length} Pagos\n` +
          `- ${parsed.quotas?.length || 0} Cuotas Especiales\n` +
          `- ${parsed.dollarPurchases?.length || 0} Compras de Dólares\n\n` +
          `¿Deseas continuar? Esta acción no se puede deshacer.`
        );

        if (!confirmRestore) {
          e.target.value = '';
          return;
        }

        setIsRestoring(true);
        setBackupSuccess(null);
        setBackupError(null);

        const success = await onRestoreFullDatabase({
          members: parsed.members,
          months: parsed.months || [],
          quotas: parsed.quotas || [],
          payments: parsed.payments || [],
          dollarPurchases: parsed.dollarPurchases || []
        });

        if (success) {
          setBackupSuccess('🎉 ¡Base de datos restaurada exitosamente! Todos los integrantes, pagos y configuraciones han sido actualizados.');
          setBackupError(null);
        } else {
          throw new Error('El servidor rechazó la restauración.');
        }
      } catch (err: any) {
        setBackupError(`❌ Error al restaurar: ${err.message}`);
        setBackupSuccess(null);
      } finally {
        setIsRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    fetch('/api/smtp-config', {
      headers: getTenantHeaders()
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.host) setSmtpHost(data.host);
          if (data.port) setSmtpPort(data.port.toString());
          if (data.secure !== undefined) setSmtpSecure(data.secure);
          if (data.user) setSmtpUser(data.user);
          if (data.pass) setSmtpPass(data.pass);
          if (data.fromName) setSmtpFromName(data.fromName);
          if (data.fromEmail) setSmtpFromEmail(data.fromEmail);
          if (data.enabled !== undefined) setSmtpEnabled(data.enabled);
        }
      })
      .catch((err) => console.error('Error cargando configuración SMTP:', err));
  }, []);

  useEffect(() => {
    fetch('/api/telegram-config', {
      headers: getTenantHeaders()
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.botToken) setTelegramBotToken(data.botToken);
          if (data.chatIdAllowed) setTelegramChatIdAllowed(data.chatIdAllowed);
          if (data.enabled !== undefined) setTelegramEnabled(data.enabled);
        }
      })
      .catch((err) => console.error('Error cargando configuración Telegram:', err));

    const fetchLogs = () => {
      fetch('/api/telegram-logs', {
        headers: getTenantHeaders()
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.logs)) {
            setTelegramLogs(data.logs);
          }
        })
        .catch((err) => console.error('Error cargando logs de Telegram:', err));
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSmtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSmtp(true);
    setSmtpStatus(null);
    try {
      const res = await fetch('/api/smtp-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({
          host: smtpHost,
          port: parseInt(smtpPort, 10) || 587,
          secure: smtpSecure,
          user: smtpUser,
          pass: smtpPass,
          fromName: smtpFromName,
          fromEmail: smtpFromEmail || smtpUser,
          enabled: smtpEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpStatus({ type: 'success', msg: '✅ Configuración SMTP guardada exitosamente.' });
      } else {
        setSmtpStatus({ type: 'error', msg: `Error al guardar: ${data.error || 'Error desconocido'}` });
      }
    } catch (err: any) {
      setSmtpStatus({ type: 'error', msg: `Error guardando configuración SMTP: ${err.message}` });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTelegram(true);
    setTelegramStatus(null);
    try {
      const res = await fetch('/api/telegram-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({
          botToken: telegramBotToken,
          chatIdAllowed: telegramChatIdAllowed,
          enabled: telegramEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramStatus({ type: 'success', msg: '✅ Configuración del Bot de Telegram guardada exitosamente.' });
      } else {
        setTelegramStatus({ type: 'error', msg: `Error al guardar: ${data.error || 'Error desconocido'}` });
      }
    } catch (err: any) {
      setTelegramStatus({ type: 'error', msg: `Error guardando configuración de Telegram: ${err.message}` });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpHost || !smtpUser || !smtpPass) {
      setSmtpStatus({ type: 'error', msg: 'Por favor completa Servidor SMTP, Usuario y Contraseña antes de probar la conexión.' });
      return;
    }
    setIsTestingSmtp(true);
    setSmtpStatus({ type: 'info', msg: 'Conectando con el servidor SMTP...' });
    try {
      const res = await fetch('/api/smtp-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({
          host: smtpHost,
          port: parseInt(smtpPort, 10) || 587,
          secure: smtpSecure,
          user: smtpUser,
          pass: smtpPass,
          fromName: smtpFromName,
          fromEmail: smtpFromEmail || smtpUser,
          testRecipient: testRecipient || smtpUser,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpStatus({ type: 'success', msg: data.message });
      } else {
        setSmtpStatus({ type: 'error', msg: `❌ ${data.error || 'Fallo en la prueba de conexión'}` });
      }
    } catch (err: any) {
      setSmtpStatus({ type: 'error', msg: `❌ Error al conectar con SMTP: ${err.message}` });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSaveQuota = (e: React.FormEvent) => {
    e.preventDefault();
    const feeDirect = parseFloat(quotaFeeDirect);
    const feeBcv = parseFloat(quotaFeeBcv) || feeDirect;
    if (!quotaTitle.trim() || isNaN(feeDirect) || feeDirect <= 0) {
      alert('Por favor ingresa un título de cuota y un monto válido');
      return;
    }
    onAddQuota({
      title: quotaTitle,
      feeUSD: feeDirect,
      feeUSD_direct: feeDirect,
      feeUSD_bcv: feeBcv,
      date: quotaDate,
      description: quotaDesc,
    });
    setQuotaTitle('');
    setQuotaFeeDirect('');
    setQuotaFeeBcv('');
    setQuotaDesc('');
  };

  const handleSaveLateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLateFee(true);
    setLateFeeStatus(null);

    try {
      const res = await fetch('/api/late-fee-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders(),
        },
        body: JSON.stringify({
          feeUSD_direct: Number(lateFeeDirect) || 0,
          feeUSD_bcv: Number(lateFeeBcv) || 0,
          paused: lateFeePaused,
          pausedUntil: lateFeePausedUntil.trim() || undefined,
          startDay: Number(lateFeeStartDay) || 6,
          graceMonths: Number(lateFeeGraceMonths) || 2,
          overrideMonth: lateFeeOverrideMonth.trim() || undefined,
          overrideDay: lateFeeOverrideDay ? Number(lateFeeOverrideDay) : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLateFeeStatus({ type: 'success', msg: '¡Configuración de multas guardada con éxito!' });
        if (onUpdateLateFeeConfig) {
          onUpdateLateFeeConfig(data.config);
        }
      } else {
        setLateFeeStatus({ type: 'error', msg: data.error || 'Error al guardar la configuración de multas.' });
      }
    } catch (err: any) {
      setLateFeeStatus({ type: 'error', msg: `Error de red: ${err.message}` });
    } finally {
      setIsSavingLateFee(false);
    }
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLastName.trim() || !newFirstName.trim()) {
      alert('Por favor ingresa al menos apellidos y nombres del integrante.');
      return;
    }
    
    if (editingMemberId) {
      onUpdateMember({
        id: editingMemberId,
        lastName: newLastName.toUpperCase(),
        firstName: newFirstName.toUpperCase(),
        cedula: newCedula,
        email: newEmail,
      });
    } else {
      onAddMember({
        lastName: newLastName.toUpperCase(),
        firstName: newFirstName.toUpperCase(),
        cedula: newCedula,
        email: newEmail,
      });
    }

    setEditingMemberId(null);
    setNewLastName('');
    setNewFirstName('');
    setNewCedula('');
    setNewEmail('');
  };

  const handleEditMemberClick = (member: Member) => {
    setEditingMemberId(member.id);
    setNewLastName(member.lastName);
    setNewFirstName(member.firstName);
    setNewCedula(member.cedula || '');
    setNewEmail(member.email || '');
    setActiveSubTab('members');
  };

  const handleCancelEditMember = () => {
    setEditingMemberId(null);
    setNewLastName('');
    setNewFirstName('');
    setNewCedula('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#162e58] text-white rounded-2xl p-4 shadow-md flex items-center space-x-4 border border-[#162e58]">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
          <Settings className="w-6 h-6 stroke-[1.8]" />
        </div>
        <div>
          <h2 className="text-base font-extrabold tracking-tight">Panel de Configuración General</h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            Personaliza el perfil de tu promoción, gestiona integrantes, cuotas mensuales, y canales de notificación.
          </p>
        </div>
      </div>

      {/* Horizontal Sub-Tabs bar */}
      <div className="flex border-b border-slate-200/80 bg-slate-50/50 p-1.5 rounded-xl gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'profile'
              ? 'bg-[#162e58] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-950'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Perfil de Promoción</span>
        </button>

        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'members'
              ? 'bg-[#162e58] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-950'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Integrantes ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fees')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'fees'
              ? 'bg-[#162e58] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-950'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Aranceles y Cuotas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notifications')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'notifications'
              ? 'bg-[#162e58] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-950'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Notificaciones & Bot</span>
        </button>

        <button
          onClick={() => setActiveSubTab('database')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'database'
              ? 'bg-[#162e58] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-950'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base de Datos</span>
        </button>
      </div>

      {/* --- Tab Panel: Profile (Logo, Name, Metadata) --- */}
      {activeSubTab === 'profile' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6">
          {/* Public Member Query Portal Link Card */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-lg space-y-3 border border-indigo-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-700/40 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
                  <Share2 className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white tracking-wide">Link Público de Consulta para Integrantes</h4>
                  <p className="text-[11px] text-indigo-200">
                    Comparte este enlace directo con tus integrantes para que consulten su estado de cuenta ingresando solo su cédula.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const tenantId = sessionStorage.getItem('tenantId') || 'original';
                    const link = `${window.location.origin}/${tenantId}/consulta`;
                    navigator.clipboard.writeText(link);
                    setProfileStatus({ type: 'success', msg: '🔗 ¡Enlace de consulta copiado al portapapeles!' });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-md cursor-pointer border border-indigo-400/30"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link</span>
                </button>

                <a
                  href={`/${sessionStorage.getItem('tenantId') || 'original'}/consulta`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer border border-white/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Probar Link</span>
                </a>
              </div>
            </div>

            <div className="flex items-center bg-indigo-950/80 border border-indigo-800/60 rounded-lg px-3 py-2 space-x-2">
              <span className="text-[11px] font-mono text-indigo-300 select-all truncate flex-1">
                {`${window.location.origin}/${sessionStorage.getItem('tenantId') || 'original'}/consulta`}
              </span>
            </div>
          </div>

          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2">
              <User className="w-4 h-4 text-[#162e58]" />
              <span>Personalizar Perfil de Promoción</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Administra el logo de graduación, el nombre oficial de la promoción y tus credenciales administrativas.
            </p>
          </div>

          {profileStatus && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-start space-x-2.5 ${
                profileStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {profileStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <span>{profileStatus.msg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Name & Metadata */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nombre de la Promoción (Personalizable)
                  </label>
                  <input
                    type="text"
                    value={promoNameInput}
                    onChange={(e) => setPromoNameInput(e.target.value)}
                    placeholder="ej: Promoción CVI Médicos Cirujanos UDO ANZ"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#162e58] font-semibold"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Este nombre aparecerá en la parte superior del sistema y en los recibos emitidos.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800 block border-b border-slate-200 pb-1.5">
                    Datos del Perfil (No personalizables)
                  </span>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Nombre de Usuario (ID de la Promo)</span>
                      <span className="font-mono bg-slate-200/50 px-2.5 py-1 rounded-md text-slate-700 inline-block font-bold mt-1">
                        {tenantId}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Correo Electrónico Administrador</span>
                      <span className="font-mono bg-slate-200/50 px-2.5 py-1 rounded-md text-slate-700 inline-block font-bold mt-1">
                        {profileEmailInput}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Logo Upload with Drag-and-drop / Click */}
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Logo de la Promoción (JPG o PNG)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Current Preview */}
                  <div className="sm:col-span-1 flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl h-32">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-2">Vista Previa</span>
                    <div className="h-20 w-20 flex items-center justify-center bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo Vista Previa"
                          className="h-full w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                  </div>

                  {/* Drag-and-drop target zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`sm:col-span-2 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer h-32 transition-all select-none ${
                      dragActive
                        ? 'border-[#162e58] bg-indigo-50/50'
                        : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                    onClick={() => document.getElementById('logo-file-picker')?.click()}
                  >
                    <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                    <p className="text-[11px] font-bold text-slate-700">
                      Arrastra tu imagen aquí, o <span className="text-[#162e58] underline">búscala</span>
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1">
                      Admite JPG o PNG (Recomendado cuadrado, Máx. 4MB)
                    </p>
                    <input
                      id="logo-file-picker"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {logoPreview && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setLogoPreview(null)}
                      className="text-[10px] text-red-600 hover:text-red-800 font-bold uppercase hover:underline"
                    >
                      Restablecer al logo predeterminado
                    </button>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Logo Circular de la Promoción (Avatar / Menú)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    {/* Current Preview */}
                    <div className="sm:col-span-1 flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl h-32">
                      <span className="text-[9px] font-bold text-slate-400 uppercase mb-2">Vista Previa</span>
                      <div className="h-20 w-20 flex items-center justify-center bg-white border border-slate-200/80 rounded-full overflow-hidden shadow-xs">
                        {logoCircularPreview ? (
                          <img
                            src={logoCircularPreview}
                            alt="Logo Circular Vista Previa"
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <User className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                    </div>

                    {/* Drag-and-drop target zone */}
                    <div
                      onDragEnter={handleCircularDrag}
                      onDragOver={handleCircularDrag}
                      onDragLeave={handleCircularDrag}
                      onDrop={handleCircularDrop}
                      className={`sm:col-span-2 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer h-32 transition-all select-none ${
                        dragCircularActive
                          ? 'border-[#162e58] bg-indigo-50/50'
                          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                      onClick={() => document.getElementById('logo-circular-file-picker')?.click()}
                    >
                      <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                      <p className="text-[11px] font-bold text-slate-700">
                        Arrastra tu imagen aquí, o <span className="text-[#162e58] underline">búscala</span>
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        Admite JPG o PNG (Se recortará a círculo, Máx. 4MB)
                      </p>
                      <input
                        id="logo-circular-file-picker"
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={handleCircularFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {logoCircularPreview && (
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => setLogoCircularPreview(null)}
                        className="text-[10px] text-red-600 hover:text-red-800 font-bold uppercase hover:underline"
                      >
                        Restablecer al logo circular predeterminado
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="bg-[#162e58] hover:bg-[#0a1e3f] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isSavingProfile ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Guardar Perfil de Promoción</span>
              </button>
            </div>
          </form>

          {/* Module: Egresos y Gastos Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 pt-6 mt-6 border-t border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Módulo de Egresos y Gastos de la Promoción
                  </h4>
                  <p className="text-xs text-slate-500">
                    Activa o desactiva la gestión de gastos y personaliza sus categorías para este perfil
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => {
                  if (onUpdateExpenseConfig) {
                    onUpdateExpenseConfig({ enabled: !expenseConfig.enabled });
                  }
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  expenseConfig.enabled ? 'bg-rose-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    expenseConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Estado del Módulo:</span>
              <span
                className={`font-black uppercase px-2.5 py-0.5 rounded-md ${
                  expenseConfig.enabled
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {expenseConfig.enabled ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </div>

            {/* Custom Expense Categories Manager in Settings */}
            {expenseConfig.enabled && (
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center space-x-1.5">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    <span>Categorías Personalizadas de Egresos</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {expenseCategories.map((cat) => (
                    <div
                      key={cat}
                      className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 flex items-center space-x-2 shadow-2xs"
                    >
                      <span>{cat}</span>
                      {expenseCategories.length > 1 && onDeleteExpenseCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar la categoría "${cat}"?`)) {
                              onDeleteExpenseCategory(cat);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Eliminar Categoría"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {onAddExpenseCategory && (
                  <div className="pt-2">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const input = form.elements.namedItem('newCat') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          onAddExpenseCategory(input.value.trim());
                          input.value = '';
                        }
                      }}
                      className="flex gap-2 max-w-md"
                    >
                      <input
                        name="newCat"
                        type="text"
                        placeholder="Añadir nueva categoría..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        type="submit"
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Tab Panel: Members Management --- */}
      {activeSubTab === 'members' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Add Member */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                  {editingMemberId ? 'Editar Integrante' : 'Agregar Integrante'}
                </h3>
              </div>

              <form onSubmit={handleSaveMember} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    placeholder="ej. PEREZ RODRÍGUEZ"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    placeholder="ej. JOSÉ EDUARDO"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Número de Cédula
                  </label>
                  <input
                    type="text"
                    placeholder="ej. 12.345.678"
                    value={newCedula}
                    onChange={(e) => setNewCedula(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="ej. correo@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 rounded-md shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    {editingMemberId ? (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Actualizar Integrante</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Guardar Integrante</span>
                      </>
                    )}
                  </button>
                  {editingMemberId && (
                    <button
                      type="button"
                      onClick={handleCancelEditMember}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs py-2 rounded-md shadow-2xs flex items-center justify-center transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right: Members List */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                  Integrantes Registrados ({members.length})
                </h3>
              </div>

              <div className="overflow-y-auto max-h-96 space-y-1.5 pr-1">
                {members.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No hay integrantes registrados aún en la promoción.</p>
                ) : (
                  members.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-lg flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-400 font-mono text-[10px] font-bold w-5">{idx + 1}.</span>
                        <div>
                          <span className="font-bold text-slate-950 block">
                            {m.lastName}, {m.firstName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            C.I: {m.cedula || 'N/A'} — {m.email || 'Sin correo registrado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditMemberClick(m)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                          title="Editar Integrante"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setMemberToDelete(m);
                            setDeleteConfirmPassword('');
                            setDeleteError(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Eliminar Integrante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Tab Panel: Monthly Fees & Special Quotas --- */}
      {activeSubTab === 'fees' && (
        <div className="space-y-6">
          {/* Conversions & Rule of 3 Calculator */}
          <ConversionCalculator months={months} currentBcvRate={bcvRate} />

          {/* Monthly Fees Manager */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#b53c00]" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                  Tarifas Mensuales (Dólares Directos vs. Tasa BCV)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Determina el costo exigido en $ directo y $ indexado al BCV.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {months.map((m) => {
                const isEditing = editingMonthId === m.id;
                const directVal = m.feeUSD_direct || m.feeUSD || 12;
                const bcvVal = m.feeUSD_bcv || directVal || 16;
                return (
                  <div
                    key={m.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-col justify-between space-y-2.5 hover:shadow-xs transition-shadow"
                  >
                    <div className="font-bold text-[#162e58] text-center text-[11px] uppercase tracking-wider border-b border-slate-200 pb-1.5">
                      {m.name} {m.year}
                    </div>

                    {isEditing ? (
                      <div className="space-y-1.5 pt-1">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">Directo ($):</span>
                          <input
                            type="number"
                            step="0.5"
                            value={tempFeeDirect}
                            onChange={(e) => setTempFeeDirect(e.target.value)}
                            className="w-full bg-white border border-orange-500 text-orange-700 font-bold text-center py-0.5 rounded text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">Tasa BCV ($):</span>
                          <input
                            type="number"
                            step="0.5"
                            value={tempFeeBcv}
                            onChange={(e) => setTempFeeBcv(e.target.value)}
                            className="w-full bg-white border border-orange-500 text-orange-700 font-bold text-center py-0.5 rounded text-xs focus:outline-none"
                          />
                        </div>
                        <div className="flex justify-end space-x-1 pt-1">
                          <button
                            onClick={() => {
                              const d = parseFloat(tempFeeDirect);
                              const b = parseFloat(tempFeeBcv);
                              if (!isNaN(d) && !isNaN(b)) {
                                onUpdateMonthFee(m.id, d, b);
                              }
                              setEditingMonthId(null);
                            }}
                            className="w-full py-1 bg-[#162e58] text-white font-semibold text-[10px] rounded hover:bg-[#0a1e3f] flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Guardar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium">USD Directo:</span>
                          <span className="font-extrabold text-emerald-700">${directVal}.00</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium">USD Tasa BCV:</span>
                          <span className="font-extrabold text-orange-600">${bcvVal}.00</span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingMonthId(m.id);
                            setTempFeeDirect(directVal.toString());
                            setTempFeeBcv(bcvVal.toString());
                          }}
                          className="w-full mt-1.5 py-1 bg-white hover:bg-slate-100 text-[#162e58] border border-slate-200 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-orange-600" />
                          <span>Editar</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Quotas Manager */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create quota */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">Crear Cuota Especial</h3>
              </div>

              <form onSubmit={handleSaveQuota} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Título del Aporte / Evento
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Toga y Birrete, Fiesta Graduación"
                    value={quotaTitle}
                    onChange={(e) => setQuotaTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      USD Directo ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="ej. 20.00"
                      value={quotaFeeDirect}
                      onChange={(e) => setQuotaFeeDirect(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-emerald-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      USD Tasa BCV ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="ej. 25.00"
                      value={quotaFeeBcv}
                      onChange={(e) => setQuotaFeeBcv(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-orange-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={quotaDate}
                    onChange={(e) => setQuotaDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Descripción / Detalle
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Alquiler de indumentaria y estand"
                    value={quotaDesc}
                    onChange={(e) => setQuotaDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-2 rounded-md shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Cuota Especial</span>
                </button>
              </form>
            </div>

            {/* Quotas list */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                Cuotas Especiales Vigentes
              </h3>

              {quotas.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No hay cuotas especiales registradas aún.</p>
              ) : (
                <div className="space-y-2">
                  {quotas.map((q) => (
                    <div
                      key={q.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <span className="font-extrabold text-slate-900 text-xs block">{q.title}</span>
                        <p className="text-slate-500 text-[11px] leading-relaxed">{q.description || 'Sin descripción'}</p>
                        <span className="text-[10px] text-slate-400 font-mono">Fecha límite: {q.date}</span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-emerald-700 block">${q.feeUSD_direct || q.feeUSD}.00 Dir</span>
                          <span className="text-[10px] font-bold text-orange-600 block">${q.feeUSD_bcv || q.feeUSD}.00 BCV</span>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar la cuota especial "${q.title}"?`)) {
                              onDeleteQuota(q.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar Cuota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Late Fees Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                    Multas por Atraso de Mensualidades
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Configura las reglas automáticas de multas aplicadas a los integrantes según su solvencia.
                </span>
              </div>

              <form onSubmit={handleSaveLateFee} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left block: General parameters (Amounts & Rules) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 h-full flex flex-col justify-between">
                      <div>
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-3.5 flex items-center space-x-1.5 border-b border-slate-200/50 pb-2">
                          <span>📋 Reglas y Montos Generales</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Monto de Multa ($ Directos)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="2.00"
                                value={lateFeeDirect}
                                onChange={(e) => setLateFeeDirect(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs text-emerald-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 h-[38px]"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Monto de Multa ($ Equivalente BCV)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="3.00"
                                value={lateFeeBcv}
                                onChange={(e) => setLateFeeBcv(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs text-orange-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 h-[38px]"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Día del Mes que Aplica la Multa
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={lateFeeStartDay}
                              onChange={(e) => setLateFeeStartDay(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 h-[38px]"
                              required
                            />
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              Día estándar a partir del cual se calcula el atraso (ej. 6).
                            </p>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Meses Vencidos Requeridos
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={lateFeeGraceMonths}
                              onChange={(e) => setLateFeeGraceMonths(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 h-[38px]"
                              required
                            />
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              Cantidad de meses sin pagar para aplicar la multa (ej. 2).
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right block: Control status and Exemption Override */}
                  <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-4 h-full flex flex-col justify-between">
                      {/* Status Box */}
                      <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 flex-1">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-3 flex items-center space-x-1.5 border-b border-slate-200/50 pb-2">
                          <span>⚙️ Control y Estado</span>
                        </h4>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Estado de las Multas
                          </label>
                          <div className="flex flex-col gap-2">
                            <select
                              value={lateFeePaused ? 'paused' : lateFeePausedUntil ? 'until' : 'active'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'active') {
                                  setLateFeePaused(false);
                                  setLateFeePausedUntil('');
                                } else if (val === 'paused') {
                                  setLateFeePaused(true);
                                  setLateFeePausedUntil('');
                                } else if (val === 'until') {
                                  setLateFeePaused(false);
                                  const future = new Date();
                                  future.setDate(future.getDate() + 7);
                                  setLateFeePausedUntil(future.toISOString().split('T')[0]);
                                }
                              }}
                              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 h-[38px] w-full"
                            >
                              <option value="active">▶️ Activas</option>
                              <option value="paused">⏸️ Pausadas Indefinidamente</option>
                              <option value="until">⏳ Pausadas hasta Fecha...</option>
                            </select>

                            {lateFeePausedUntil !== '' && !lateFeePaused && (
                              <input
                                type="date"
                                value={lateFeePausedUntil}
                                onChange={(e) => setLateFeePausedUntil(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 h-[38px]"
                                required
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Exceptions Box */}
                      <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 flex-1">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center space-x-1.5 border-b border-slate-200/50 pb-2">
                          <span>🗓️ Prórroga o Excepción Única por Mes</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-normal mb-3">
                          Retrasa la aplicación de multas para un mes particular (ej: Agosto 2026 al día 16, en lugar del estándar).
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Mes
                            </label>
                            <input
                              type="month"
                              value={lateFeeOverrideMonth}
                              onChange={(e) => setLateFeeOverrideMonth(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 h-[34px]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Día de Inicio
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              placeholder="Ej: 16"
                              value={lateFeeOverrideDay}
                              onChange={(e) => setLateFeeOverrideDay(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 h-[34px]"
                            />
                          </div>
                        </div>
                        {(lateFeeOverrideMonth || lateFeeOverrideDay) && (
                          <div className="flex justify-start pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setLateFeeOverrideMonth('');
                                setLateFeeOverrideDay('');
                              }}
                              className="text-[9px] uppercase font-bold text-red-600 hover:text-red-800 cursor-pointer flex items-center gap-1"
                            >
                              <span>❌ Borrar Excepción</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {lateFeeStatus && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold ${
                      lateFeeStatus.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {lateFeeStatus.msg}
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSavingLateFee}
                    className="px-5 py-2.5 bg-[#162e58] hover:bg-[#0a1e3f] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {isSavingLateFee ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Configuración de Multas</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
        </div>
      )}

      {/* --- Tab Panel: Notifications (SMTP & Telegram Bot) --- */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-6">
          {/* SMTP Server Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Servidor SMTP (Envío de Comprobantes)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Envía de forma automatizada los PDF de comprobantes a los integrantes de la promoción.
                  </p>
                </div>
              </div>

              <label className="text-xs font-bold text-slate-600 flex items-center space-x-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={smtpEnabled}
                  onChange={(e) => setSmtpEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Habilitar Envío SMTP</span>
              </label>
            </div>

            {smtpStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  smtpStatus.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : smtpStatus.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                }`}
              >
                <span>{smtpStatus.msg}</span>
                <button
                  onClick={() => setSmtpStatus(null)}
                  className="text-slate-400 hover:text-slate-600 text-[10px] uppercase font-bold"
                >
                  Cerrar
                </button>
              </div>
            )}

            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Host Servidor SMTP</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="ej. smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Puerto</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="ej. 587"
                  />
                </div>

                <div className="flex items-center h-full pt-4">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Seguro SSL/TLS (Puerto 465)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Usuario / Email SMTP</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                    placeholder="ej. correo@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contraseña SMTP</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Remitente</label>
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="ej. Comité de Finanzas"
                  />
                </div>
              </div>

              {/* SMTP test block */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800 block">Probar Conexión de Correo</span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="Email destinatario de prueba"
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTestingSmtp ? 'Verificando...' : 'Enviar Correo Prueba'}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingSmtp}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSmtp ? 'Guardando...' : 'Guardar Configuración SMTP'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Telegram Bot config */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold text-xs">
                  TG
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1">
                    Bot Conciliador de Telegram
                    <span className="bg-[#b53c00] text-white font-black text-[9px] px-1.5 py-0.2 rounded-full tracking-wider uppercase">IA Gemini</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Concilia automáticamente reportes de pago directo desde mensajes de WhatsApp o capturas de pantalla reenviadas a tu grupo de Telegram.
                  </p>
                </div>
              </div>

              <label className="text-xs font-bold text-slate-600 flex items-center space-x-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span>Habilitar Bot de Telegram</span>
              </label>
            </div>

            {telegramStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  telegramStatus.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <span>{telegramStatus.msg}</span>
                <button
                  onClick={() => setTelegramStatus(null)}
                  className="text-slate-400 hover:text-slate-600 text-[10px] uppercase font-bold"
                >
                  Cerrar
                </button>
              </div>
            )}

            <form onSubmit={handleSaveTelegram} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Token de Bot de Telegram</label>
                  <input
                    type="password"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-orange-500 font-mono"
                    placeholder="ej. 8192738127:AAFlkasjdhKjasdh-asiduhqw"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ID del Chat Grupal Permitido</label>
                  <input
                    type="text"
                    value={telegramChatIdAllowed}
                    onChange={(e) => setTelegramChatIdAllowed(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-orange-500 font-mono"
                    placeholder="ej. -100123456789"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800 block">Logs de Eventos del Bot (En tiempo real)</span>
                
                <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-lg max-h-48 overflow-y-auto space-y-1.5">
                  {telegramLogs.length === 0 ? (
                    <p className="text-slate-500 italic text-center py-2">No se han registrado eventos recientes.</p>
                  ) : (
                    telegramLogs.map((log, lIdx) => (
                      <div key={lIdx} className="flex items-start space-x-1.5">
                        <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
                        <span className={log.success ? 'text-emerald-400' : 'text-rose-400'}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingTelegram}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingTelegram ? 'Guardando...' : 'Guardar Configuración Bot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Tab Panel: Database Backup & Restore --- */}
      {activeSubTab === 'database' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Respaldar & Restaurar Base de Datos</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Descarga copias locales completas o restaura registros previos en formato estructurado JSON.
            </p>
          </div>

          {backupSuccess && (
            <div className="p-3.5 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{backupSuccess}</span>
            </div>
          )}

          {backupError && (
            <div className="p-3.5 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{backupError}</span>
            </div>
          )}

          {isRestoring && (
            <div className="p-3.5 rounded-xl text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-800 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
              <span>Restaurando base de datos, por favor espera...</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Download Backup card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 text-xs block flex items-center space-x-1.5">
                  <Download className="w-4 h-4 text-[#162e58]" />
                  <span>1. Exportar Respaldo Completo</span>
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Genera y descarga un archivo estructurado <code className="bg-slate-200/50 px-1 py-0.5 rounded font-mono font-bold text-slate-800">.json</code> que contiene de forma unificada todos tus integrantes registrados, mensualidades configuradas, cuotas adicionales, transacciones y compras de divisas.
                </p>
              </div>
              <div className="flex flex-col gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="bg-[#162e58] hover:bg-[#0a1e3f] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer w-full"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Copia de Seguridad (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
                      alert('El script de Google no se ha cargado. Por favor, recarga la página. Si estás en la vista previa, intenta abrir la app en una nueva pestaña.');
                      return;
                    }
                    const client = google.accounts.oauth2.initTokenClient({
                      client_id: "753906353358-ld8k47do0qkqfsnmidk4t50ojrbaihre.apps.googleusercontent.com",
                      scope: 'https://www.googleapis.com/auth/drive.file',
                      callback: (tokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                          localStorage.setItem('driveToken', tokenResponse.access_token);
                          alert('¡Conectado exitosamente con Google! Ahora puedes hacer respaldos automáticos en Drive.');
                        }
                      },
                    });
                    client.requestAccessToken();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer w-full"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 1.493l-4.47 7.732h8.941l4.47-7.732h-8.94m-5.462 1.706L2.073 10.93l4.472 7.73 4.47-7.73-4.467-7.73zM18.442 12.637l-4.47 7.732H5.03l4.47-7.732h8.942z"/></svg>
                  <span>Iniciar Sesión con Google</span>
                </button>
                <button
                  type="button"
                  onClick={handleDriveBackup}
                  disabled={isDriveBackingUp}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer w-full disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isDriveBackingUp ? 'Subiendo...' : 'Respaldar en Google Drive'}</span>
                </button>
              </div>
            </div>

            {/* Upload/Restore card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 text-xs block flex items-center space-x-1.5">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>2. Restaurar Copia de Seguridad</span>
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sube una copia previamente exportada para reescribir y restablecer la base de datos de tu promoción. <span className="text-red-600 font-extrabold">¡Cuidado! Esta acción sobrescribirá todos los datos ingresados actualmente sin posibilidad de retroceso.</span>
                </p>
              </div>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleUploadBackup}
                  disabled={isRestoring}
                  className="hidden"
                  id="restore-upload-input"
                />
                <label
                  htmlFor="restore-upload-input"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer w-full text-center"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir y Restaurar Base de Datos</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-xl animate-scale-up">
            {/* Header */}
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Confirmar Eliminación</h3>
              </div>
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmDeleteMember} className="p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Estás a punto de eliminar de forma permanente al integrante:
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-extrabold text-slate-900 block text-xs">
                    {memberToDelete.lastName}, {memberToDelete.firstName}
                  </span>
                  {memberToDelete.cedula && (
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                      Cédula de Identidad: {memberToDelete.cedula}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-rose-700 font-bold leading-relaxed">
                  ⚠️ ADVERTENCIA: Esta acción es irreversible. Se eliminará el registro de este integrante, pero se mantendrán los pagos asociados bajo su referencia para no alterar la contabilidad de la promoción.
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Contraseña de Administrador *
                </label>
                <input
                  type="password"
                  value={deleteConfirmPassword}
                  onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                  placeholder="Ingresa la contraseña de la promoción"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                  autoFocus
                  required
                />
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  disabled={isVerifyingDelete}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingDelete || !deleteConfirmPassword.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isVerifyingDelete ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar de forma permanente</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
