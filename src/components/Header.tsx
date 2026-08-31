import React, { useState } from 'react';
import { PromoLogo } from './PromoLogo';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  Users,
  Search,
  Receipt,
  MessageSquareCode,
  ArrowRightLeft,
  Settings,
  Sparkles,
  Edit2,
  Check,
  Save,
  User,
  ChevronDown,
  LogOut,
  ExternalLink,
  Copy,
  TrendingDown,
  ArrowDownRight,
} from 'lucide-react';
import { formatUSD, formatVES } from '../utils/calculations';
import { ExpenseConfig } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bcvRate: number;
  setBcvRate: (rate: number) => void;
  onRefreshBcv: () => void;
  isRefreshingBcv: boolean;
  totalCollectedUSD: number;
  totalCollectedVES: number;
  totalDollarPurchasesUSD: number;
  onOpenPaymentModal: () => void;
  onManualSave?: () => void;
  isSaving?: boolean;
  tenantName?: string | null;
  tenantLogoUrl?: string | null;
  tenantLogoCircularUrl?: string | null;
  tenantId?: string | null;
  onLogout?: () => void;
  expenseConfig?: ExpenseConfig;
  rateSource?: 'usd_bcv' | 'eur_bcv' | 'custom';
  rateLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  bcvRate,
  setBcvRate,
  onRefreshBcv,
  isRefreshingBcv,
  totalCollectedUSD,
  totalCollectedVES,
  totalDollarPurchasesUSD,
  onOpenPaymentModal,
  onManualSave,
  isSaving,
  tenantName,
  tenantLogoUrl,
  tenantLogoCircularUrl,
  tenantId,
  onLogout,
  expenseConfig = { enabled: false },
  rateSource = 'usd_bcv',
  rateLabel,
}) => {

  const [isEditingBcv, setIsEditingBcv] = useState(false);
  const [tempBcv, setTempBcv] = useState(bcvRate.toString());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentTenant = tenantId || sessionStorage.getItem('tenantId') || 'original';
  const publicQueryUrl = `${window.location.origin}/${currentTenant}/consulta`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicQueryUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveBcv = () => {
    const parsed = parseFloat(tempBcv);
    if (!isNaN(parsed) && parsed > 0) {
      setBcvRate(parsed);
      setIsEditingBcv(false);
    }
  };

  return (
    <header className="glass-card text-slate-900 sticky top-0 z-30 border-b border-white/60 shadow-lg">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <PromoLogo className="h-16 sm:h-20 md:h-24" logoUrl={tenantLogoUrl} />
          </div>

          {/* Quick Stats & BCV Rate Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Tasa BCV / Referencia Box */}
            <div className="bg-white/80 border border-slate-200/90 rounded-xl px-3.5 py-1.5 flex items-center space-x-2.5 shadow-sm backdrop-blur-md">
              <div className="flex items-center text-slate-700 space-x-1.5 text-[10px] font-bold uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-[#b53c00]" />
                <span>
                  {rateSource === 'eur_bcv'
                    ? 'Tasa Euro BCV:'
                    : rateSource === 'custom'
                    ? 'Tasa Personalizada:'
                    : 'Tasa BCV del Día:'}
                </span>
              </div>
              {isEditingBcv ? (
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.01"
                    value={tempBcv}
                    onChange={(e) => setTempBcv(e.target.value)}
                    className="w-20 bg-white text-emerald-700 font-bold px-2 py-0.5 rounded text-xs border border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveBcv}
                    className="bg-emerald-600 hover:bg-emerald-500 p-1 rounded-lg text-white cursor-pointer"
                    title="Guardar Tasa"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-800 font-mono font-bold text-xs bg-emerald-50/90 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-xs">
                    {rateSource === 'eur_bcv'
                      ? `1 EUR = ${bcvRate.toFixed(2)} BS`
                      : rateSource === 'custom'
                      ? `1 REF = ${bcvRate.toFixed(2)} BS`
                      : `1 USD = ${bcvRate.toFixed(2)} BS`}
                  </span>
                  <button
                    onClick={() => {
                      setTempBcv(bcvRate.toString());
                      setIsEditingBcv(true);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer"
                    title="Modificar Tasa Manualmente"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={onRefreshBcv}
                    disabled={isRefreshingBcv}
                    className="text-slate-400 hover:text-[#b53c00] p-0.5 rounded transition-colors cursor-pointer"
                    title="Actualizar Tasa automáticamente"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isRefreshingBcv ? 'animate-spin text-[#b53c00]' : ''}`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Public Query Portal Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className={`font-bold text-xs px-3 py-2 rounded-xl shadow-md flex items-center space-x-1.5 transition-all transform active:scale-95 cursor-pointer border ${
                copiedLink
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white hover:bg-slate-50 text-indigo-900 border-indigo-200'
              }`}
              title="Copiar link de consulta pública para enviar a los integrantes"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
              <span>{copiedLink ? '¡Link Copiado!' : 'Link Consulta'}</span>
            </button>

            {/* Manual Save Button */}
            {onManualSave && (
              <button
                onClick={onManualSave}
                disabled={isSaving}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md flex items-center space-x-1.5 transition-all transform active:scale-95 cursor-pointer border border-emerald-500/30 disabled:opacity-50"
                title="Guardar todos los cambios en el servidor y almacenamiento local"
              >
                <Save className={`w-4 h-4 ${isSaving ? 'animate-bounce' : ''}`} />
                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            )}

            {/* User Profile Dropdown */}
            {tenantName && (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 rounded-full w-[38px] h-[38px] shadow-sm text-slate-800 transition-all cursor-pointer overflow-hidden"
                  title="Menú de Usuario"
                >
                  {tenantLogoCircularUrl ? (
                    <img src={tenantLogoCircularUrl} alt="Logo Circular" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-indigo-700" />
                  )}
                </button>

                {isUserMenuOpen && (
                  <>
                    {/* Backdrop to close */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    
                    {/* Dropdown Card */}
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs">
                      <div className="px-3.5 py-2 border-b border-slate-100 flex items-center space-x-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Espacio Activo</span>
                          <span className="font-extrabold text-slate-900 truncate block text-xs font-mono" title={`Promo: ${tenantName || ''}`}>Promo: {tenantName}</span>
                        </div>
                      </div>
                      
                      <div className="p-1">
                        <button
                          onClick={() => {
                            setActiveTab('config');
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg font-semibold transition-all text-left ${
                            activeTab === 'config'
                              ? 'bg-indigo-50 text-indigo-950 font-bold'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Configuración</span>
                        </button>
                      </div>
                      
                      <div className="border-t border-slate-100 my-1"></div>
                      
                      <div className="p-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onLogout) onLogout();
                          }}
                          className="w-full flex items-center space-x-2.5 px-2.5 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-bold transition-all text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200/60 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 py-1.5 min-w-max">
          <button
            onClick={() => setActiveTab('solvencia')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'solvencia'
                ? 'bg-[#162e58] text-white shadow-sm border border-[#162e58]'
                : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Resumen Solvencia</span>
          </button>

          <button
            onClick={() => setActiveTab('buscador')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'buscador'
                ? 'bg-[#162e58] text-white shadow-sm border border-[#162e58]'
                : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Buscar Integrante</span>
          </button>

          <button
            onClick={() => setActiveTab('movimientos')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'movimientos'
                ? 'bg-[#162e58] text-white shadow-sm border border-[#162e58]'
                : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Movimientos</span>
          </button>

          <button
            onClick={() => setActiveTab('registro_pagos')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'registro_pagos'
                ? 'bg-[#162e58] text-white shadow-sm border border-[#162e58]'
                : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>Registro de Pagos</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
