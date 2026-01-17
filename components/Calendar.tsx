import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  selectedDates: Date[];
  onSelect: (date: Date, isMulti: boolean) => void;
}

// Simplified map of Taiwan Holidays for late 2025 and 2026
const HOLIDAYS: Record<string, string> = {
  // 2025
  "2025-12-25": "行憲紀念日",

  // 2026
  "2026-01-01": "元旦",
  "2026-02-16": "小年夜", // Adjusted holiday
  "2026-02-17": "除夕",
  "2026-02-18": "春節",
  "2026-02-19": "初二",
  "2026-02-20": "初三",
  "2026-02-28": "和平紀念日",
  "2026-04-04": "兒童節",
  "2026-04-05": "清明節", // Will likely be observed on Monday if falls on weekend, but keeping simple for now
  "2026-05-01": "勞動節",
  "2026-06-19": "端午節",
  "2026-09-25": "中秋節",
  "2026-09-28": "教師節",
  "2026-10-10": "國慶日",
  "2026-10-25": "光復節",
  "2026-12-25": "行憲紀念日",
};

const Calendar: React.FC<CalendarProps> = ({ selectedDates, onSelect }) => {
  // Start date constraint: Dec 1, 2025
  const MIN_DATE = new Date(2025, 11, 1); // Month is 0-indexed (11 = Dec)
  // End date constraint: Dec 31, 2026
  const MAX_DATE = new Date(2026, 11, 31);
  
  // Today's date with time stripped for comparison
  const TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState<Date>(new Date(2025, 11, 1));

  // Sync view when the first selected date changes, if applicable
  useEffect(() => {
    if (selectedDates.length > 0) {
      // Focus on the most recently added date (last in array) or first
      const focusDate = selectedDates[selectedDates.length - 1];
      setViewDate(new Date(focusDate.getFullYear(), focusDate.getMonth(), 1));
    }
  }, [selectedDates.length]); // Only change view on count change to avoid jumping around too much

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    if (newDate >= MIN_DATE) {
      setViewDate(newDate);
    }
  };

  const handleNextMonth = () => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    if (newDate <= MAX_DATE) {
      setViewDate(newDate);
    }
  };

  const isPrevDisabled = viewDate.getFullYear() === 2025 && viewDate.getMonth() === 11;
  const isNextDisabled = viewDate.getFullYear() === 2026 && viewDate.getMonth() === 11;

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(year, month, d);
      
      const isSelected = selectedDates.some(
        selected => selected.toDateString() === currentDate.toDateString()
      );
      
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const isPast = currentDate < TODAY;

      // Check for holiday
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const holidayName = HOLIDAYS[dateString];

      days.push(
        <button
          key={d}
          onClick={(e) => !isPast && onSelect(currentDate, e.shiftKey)}
          disabled={isPast}
          className={`
            relative h-14 w-full flex flex-col items-center justify-start pt-1 text-sm font-medium transition-all rounded-lg select-none
            ${isPast 
              ? 'text-slate-300 bg-slate-50 cursor-not-allowed decoration-slate-300' 
              : isSelected 
                ? 'bg-brand-600 text-white shadow-md z-10 scale-[1.02]' 
                : 'hover:bg-brand-50 text-slate-700'
            }
            ${(isWeekend || holidayName) && !isSelected && !isPast ? 'text-red-500' : ''}
          `}
        >
          <span>{d}</span>
          {holidayName && (
            <span className={`text-[9px] mt-0.5 leading-tight ${isSelected ? 'text-white' : 'text-red-500 font-bold'}`}>
              {holidayName}
            </span>
          )}
          {isSelected && (
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 w-full max-w-sm mx-auto select-none">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={handlePrevMonth} 
          disabled={isPrevDisabled}
          className={`p-2 rounded-full hover:bg-slate-100 ${isPrevDisabled ? 'opacity-30 cursor-not-allowed' : 'text-slate-600'}`}
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-lg font-bold text-slate-800">
          {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button 
          onClick={handleNextMonth} 
          disabled={isNextDisabled}
          className={`p-2 rounded-full hover:bg-slate-100 ${isNextDisabled ? 'opacity-30 cursor-not-allowed' : 'text-slate-600'}`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-semibold text-slate-400 uppercase">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
      
      <div className="mt-4 text-xs text-center text-slate-400">
        <span className="font-semibold text-brand-600">Hold Shift</span> to select multiple dates.<br/>
        Please select dates between Dec 2025 and Dec 2026.
      </div>
    </div>
  );
};

export default Calendar;