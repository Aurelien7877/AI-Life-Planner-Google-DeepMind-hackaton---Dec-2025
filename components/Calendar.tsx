
import React, { useState } from 'react';
import { LifeEvent, Category } from '../types';
import { playSound } from '../services/audioService';

interface CalendarProps {
  events: LifeEvent[];
  selectedDate: string | null;
  onDateSelect: (dateStr: string | null) => void;
}

const Calendar: React.FC<CalendarProps> = ({ events, selectedDate, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    playSound('pop');
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    playSound('pop');
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    playSound('pop');
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (selectedDate === dateStr) {
        onDateSelect(null); // Deselect
    } else {
        onDateSelect(dateStr);
    }
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const getCategoryColor = (cat: Category) => {
    switch (cat) {
        case Category.HEALTH: return '#F43F5E';
        case Category.FINANCE: return '#10B981';
        case Category.WORK: return '#3B82F6';
        case Category.SOCIAL: return '#A855F7';
        case Category.HOME: return '#F97316';
        case Category.TRAVEL: return '#EAB308';
        case Category.RENEWAL: return '#CF4B00';
        default: return '#9CA3AF';
    }
  };

  const renderDays = () => {
    const days = [];
    // Padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 sm:h-24" />);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayEvents = getEventsForDay(i);
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      
      days.push(
        <div 
            key={i} 
            onClick={() => handleDateClick(i)}
            className={`
                h-20 sm:h-24 p-2 border-t border-r border-gray-100/50 relative group transition-all duration-200 cursor-pointer
                ${isSelected ? 'bg-[#FCF6D9] shadow-inner' : 'hover:bg-white/40'}
                ${isToday && !isSelected ? 'bg-gradient-to-br from-white/80 to-white/20' : ''}
            `}
        >
            <div className="flex justify-between items-start">
                <span className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all
                    ${isToday ? 'bg-[#CF4B00] text-white shadow-lg' : ''}
                    ${isSelected && !isToday ? 'bg-[#9CC6DB] text-white' : ''}
                    ${!isToday && !isSelected ? 'text-gray-500 group-hover:text-[#CF4B00]' : ''}
                `}>
                    {i}
                </span>
                {isSelected && (
                    <span className="w-2 h-2 bg-[#CF4B00] rounded-full animate-pulse"></span>
                )}
            </div>
            
            <div className="flex flex-col gap-1 mt-1.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((e) => (
                    <div 
                        key={e.id} 
                        className="h-1.5 rounded-full w-full opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: getCategoryColor(e.category) }}
                        title={e.title}
                    />
                ))}
                {dayEvents.length > 3 && (
                    <div className="text-[9px] text-gray-400 pl-1">+ {dayEvents.length - 3} more</div>
                )}
            </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-white/60">
      {/* Header */}
      <div className="p-6 flex justify-between items-center bg-gradient-to-r from-[#9CC6DB]/20 to-[#FCF6D9]/50 backdrop-blur-md">
        <h2 className="text-2xl font-display font-bold text-gray-800">
          {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 rounded-full hover:bg-white/50 text-[#CF4B00] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={nextMonth} className="p-2 rounded-full hover:bg-white/50 text-[#CF4B00] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center py-3 bg-white/30 border-b border-gray-100 text-xs font-bold text-[#DDBA7D] tracking-wider uppercase">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 bg-white/20">
        {renderDays()}
      </div>
      
      {/* Legend */}
      <div className="px-6 py-4 bg-white/40 flex gap-4 text-xs text-gray-500 overflow-x-auto no-scrollbar">
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F43F5E]"></div>Health</div>
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div>Finance</div>
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>Work</div>
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F97316]"></div>Home</div>
         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#CF4B00]"></div>Renewal</div>
      </div>
    </div>
  );
};

export default Calendar;
