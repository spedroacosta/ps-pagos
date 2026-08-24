import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  Filter,
  Search,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Check,
  X,
  Settings2,
  ListPlus,
  Layers,
  ArrowDownRight,
  Receipt,
  Download,
} from 'lucide-react';
import { ExpenseEntry } from '../types';
import { formatUSD, formatVES, getCaracasDateString } from '../utils/calculations';

interface EgresosModuleProps {
  expenses: ExpenseEntry[];
  expenseCategories: string[];
  onAddExpense: (expense: Omit<ExpenseEntry, 'id'>) => void;
  onEditExpense: (id: string, expense: Omit<ExpenseEntry, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onAddCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  bcvRate: number;
}

export const EgresosModule: React.FC<EgresosModuleProps> = ({
  expenses,
  expenseCategories,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAddCategory,
  onDeleteCategory,
  bcvRate,
}) => {
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(getCaracasDateString());
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(expenseCategories[0] || 'Logística');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Category Manager Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState<'all' | 'USD' | 'VES'>('all');

  // Calculated Totals
  const totalExpensesVES = useMemo(() => {
    return expenses
      .filter((e) => e.currency === 'VES')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalExpensesUSD = useMemo(() => {
    return expenses
      .filter((e) => e.currency === 'USD')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Filtered Expenses List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.reference && e.reference.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryFilter === 'all' || e.category === selectedCategoryFilter;

      const matchesCurr =
        selectedCurrencyFilter === 'all' || e.currency === selectedCurrencyFilter;

      return matchesSearch && matchesCat && matchesCurr;
    });
  }, [expenses, searchQuery, selectedCategoryFilter, selectedCurrencyFilter]);

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor introduce una descripción válida y un monto mayor a 0.');
      return;
    }

    const payload: Omit<ExpenseEntry, 'id'> = {
      date: date || getCaracasDateString(),
      description: description.trim(),
      category: category || 'Logística',
      amount: numAmount,
      currency,
      bcvRate: currency === 'VES' ? bcvRate : undefined,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingId) {
      onEditExpense(editingId, payload);
      setEditingId(null);
    } else {
      onAddExpense(payload);
    }

    // Reset Form
    setDescription('');
    setAmount('');
    setReference('');
    setNotes('');
  };

  const handleStartEdit = (item: ExpenseEntry) => {
    setEditingId(item.id);
    setDate(item.date);
    setDescription(item.description);
    setCategory(item.category);
    setAmount(item.amount.toString());
    setCurrency(item.currency);
    setReference(item.reference || '');
    setNotes(item.notes || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setReference('');
    setNotes('');
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatInput.trim()) {
      onAddCategory(newCatInput.trim());
      setNewCatInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider block">
              Egresos en Bolívares (VES)
            </span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">
              {formatVES(totalExpensesVES)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Afecta el saldo en Bs del mes correspondiente
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider block">
              Egresos en Dólares Directos (USD)
            </span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">
              {formatUSD(totalExpensesUSD)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              Efectivo USD o Binance
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Total Registros de Gastos
            </span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">
              {expenses.length}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
              {expenseCategories.length} categorías configuradas
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Register Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {editingId ? 'Editar Egreso' : 'Registrar Nuevo Egreso'}
                </h3>
                <p className="text-slate-500 text-[11px]">Gastos o pagos realizados por la promoción</p>
              </div>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
              >
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha del Gasto</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Concepto / Descripción del Gasto *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Impresión de distintivos y planillas"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Category & Category Manager Trigger */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Categoría *</label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Personalizar Categorías</span>
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Moneda *</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'USD' | 'VES')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="USD">USD ($ Dólares Directos)</option>
                  <option value="VES">VES (Bs Bolívares)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {currency === 'VES' && (
              <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 font-medium">
                <span className="font-bold block">Tasa BCV de Referencia:</span>
                <span>1 USD = {bcvRate.toFixed(2)} Bs (Equivalente: ~{formatUSD(parseFloat(amount || '0') / (bcvRate || 1))})</span>
              </div>
            )}

            {/* Reference */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ref. Bancaria / Nro Comprobante (Opcional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej. #84920"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notas Adicionales</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Detalle o proveedor del servicio..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? 'Guardar Cambios del Egreso' : 'Registrar Egreso'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Table and Filters */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
              <Layers className="w-4 h-4 text-rose-600" />
              <span>Histórico de Egresos</span>
            </h3>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar egreso..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 w-36 sm:w-44"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Todas las Categorías</option>
                {expenseCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Currency Filter */}
              <select
                value={selectedCurrencyFilter}
                onChange={(e) => setSelectedCurrencyFilter(e.target.value as 'all' | 'USD' | 'VES')}
                className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Todas las Monedas</option>
                <option value="USD">USD ($)</option>
                <option value="VES">VES (Bs)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <TrendingDown className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p className="text-xs font-bold text-slate-600">No se encontraron egresos registrados</p>
              <p className="text-[11px] text-slate-400">
                Usa el formulario lateral para añadir gastos de la promoción.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3">Concepto / Descripción</th>
                    <th className="py-2.5 px-3 text-right">Monto</th>
                    <th className="py-2.5 px-3">Ref.</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {exp.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200/60">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{exp.description}</span>
                        {exp.notes && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                            {exp.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700 whitespace-nowrap">
                        {exp.currency === 'VES' ? formatVES(exp.amount) : formatUSD(exp.amount)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                        {exp.reference || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleStartEdit(exp)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Seguro que deseas eliminar el egreso "${exp.description}"?`)) {
                              onDeleteExpense(exp.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Managing Custom Categories */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Personalizar Categorías de Egresos
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategorySubmit} className="flex gap-2">
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="Nombre de nueva categoría..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Categorías Actuales ({expenseCategories.length})
              </label>
              {expenseCategories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <span>{cat}</span>
                  {expenseCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `¿Eliminar categoría "${cat}"? Los egresos existentes mantendrán el texto.`
                          )
                        ) {
                          onDeleteCategory(cat);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Eliminar Categoría"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
