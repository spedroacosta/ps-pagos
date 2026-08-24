import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void;
  placeholder?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  placeholder = 'Filtrar por fecha...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view date (default to current date or startDate)
  const initialDate = startDate ? new Date(startDate + 'T00:00:00') : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Selection state while picker is open
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format YYYY-MM-DD
  const formatDateString = (year: number, month: number, day: number) => {
    const mm = (month + 1).toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Days in month calculation
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // First day of week (0 = Sun, 1 = Mon, ...)
  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleDayClick = (dayStr: string) => {
    if (!startDate || (startDate && endDate)) {
      // First click or reset
      onChange(dayStr, '');
    } else if (startDate && !endDate) {
      // Second click
      if (dayStr < startDate) {
        onChange(dayStr, startDate);
      } else {
        onChange(startDate, dayStr);
      }
      setIsOpen(false);
    }
  };

  // Check if date is in range
  const isInRange = (dayStr: string) => {
    if (startDate && endDate) {
      return dayStr >= startDate && dayStr <= endDate;
    }
    if (startDate && hoverDate && !endDate) {
      const min = startDate < hoverDate ? startDate : hoverDate;
      const max = startDate > hoverDate ? startDate : hoverDate;
      return dayStr >= min && dayStr <= max;
    }
    return false;
  };

  // Display label for trigger button
  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const monthShort = MONTH_NAMES[monthIdx]?.slice(0, 3) || '';
    return `${day} ${monthShort} ${year}`;
  };

  const triggerLabel = startDate
    ? endDate
      ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
      : `${formatDisplayDate(startDate)} - ...`
    : placeholder;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs">
        <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-bold text-slate-800 text-left focus:outline-none"
        >
          {triggerLabel}
        </button>
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('', '');
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            title="Limpiar fechas"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Popover Calendar Window matching screenshot design */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-blue-900" />
            </button>
            <h3 className="text-base font-bold text-blue-950 tracking-tight">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-blue-900" />
            </button>
          </div>

          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {DAY_NAMES.map((d) => (
              <span key={d} className="text-[11px] font-extrabold text-blue-900 tracking-wider">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {/* Empty padding cells for first week offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}

            {/* Day numbers */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayStr = formatDateString(currentYear, currentMonth, dayNum);

              const isStart = dayStr === startDate;
              const isEnd = dayStr === endDate;
              const inRange = isInRange(dayStr);

              // Determine container styling
              let bgClass = '';
              let textClass = 'text-slate-700 hover:bg-blue-50 hover:text-blue-600';
              let shapeClass = 'rounded-full';

              if (isStart || isEnd) {
                bgClass = 'bg-blue-600 text-white font-bold shadow-md';
                textClass = 'text-white';
                shapeClass = 'rounded-full';
              } else if (inRange) {
                bgClass = 'bg-blue-50/90 text-blue-900 font-semibold';
                textClass = 'text-blue-900';
                shapeClass = 'rounded-none';
              }

              return (
                <div
                  key={dayStr}
                  className={`relative h-9 flex items-center justify-center cursor-pointer transition-all ${
                    inRange && !isStart && !isEnd ? 'bg-blue-50' : ''
                  }`}
                  onMouseEnter={() => setHoverDate(dayStr)}
                  onClick={() => handleDayClick(dayStr)}
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center text-xs font-semibold ${shapeClass} ${bgClass} ${textClass}`}
                  >
                    {dayNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Preset Actions */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const start = formatDateString(now.getFullYear(), now.getMonth(), 1);
                const end = formatDateString(now.getFullYear(), now.getMonth(), getDaysInMonth(now.getFullYear(), now.getMonth()));
                onChange(start, end);
                setIsOpen(false);
              }}
              className="hover:text-blue-600"
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const end = formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
                const past = new Date(now);
                past.setDate(past.getDate() - 30);
                const start = formatDateString(past.getFullYear(), past.getMonth(), past.getDate());
                onChange(start, end);
                setIsOpen(false);
              }}
              className="hover:text-blue-600"
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('', '');
                setIsOpen(false);
              }}
              className="text-red-500 hover:text-red-700"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
