
import React, { useState } from 'react';
import { LifeEvent, Category } from '../types';
import { playSound } from '../services/audioService';

interface EventCardProps {
  event: LifeEvent;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updatedEvent: Partial<LifeEvent>) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);
  const [editDate, setEditDate] = useState(event.date || '');
  const [editStart, setEditStart] = useState(event.startTime || '');
  const [editEnd, setEditEnd] = useState(event.endTime || '');

  const getCategoryStyles = (c: Category) => {
    switch (c) {
      case Category.HEALTH: return { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' };
      case Category.FINANCE: return { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' };
      case Category.WORK: return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' };
      case Category.SOCIAL: return { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' };
      case Category.HOME: return { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-500' };
      case Category.TRAVEL: return { bg: 'bg-yellow-50', text: 'text-yellow-600', dot: 'bg-yellow-500' };
      case Category.RENEWAL: return { bg: 'bg-[#CF4B00]/10', text: 'text-[#CF4B00]', dot: 'bg-[#CF4B00]' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
    }
  };

  const styles = getCategoryStyles(event.category);

  const addToGoogleCalendar = () => {
    playSound('pop');
    if (!event.date) return alert('No date specified for this event.');
    
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description + (event.isRenewal ? `\n\nExpiration Date: ${event.expiryDate}` : ''));
    
    // Format dates for Google Calendar
    let startDateTime = event.date.replace(/-/g, '');
    let endDateTime = event.date.replace(/-/g, '');

    if (event.startTime && event.endTime) {
        // THHMMSS format
        startDateTime += 'T' + event.startTime.replace(':', '') + '00';
        endDateTime += 'T' + event.endTime.replace(':', '') + '00';
    } else {
        // All day event, start date is inclusive, end date is exclusive (next day)
        // Simple hack: just use same day for start/end if no time
    }

    const dates = `${startDateTime}/${endDateTime}`;
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
    window.open(url, '_blank');
  };

  const handleSave = () => {
    onUpdate(event.id, { 
        title: editTitle, 
        date: editDate || null,
        startTime: editStart || null,
        endTime: editEnd || null
    });
    setIsEditing(false);
    playSound('success');
  };

  const hasAmount = event.amount && event.amount.trim() !== '' && event.amount.toLowerCase() !== 'null';
  
  // Logic to prevent duplicate tags:
  // If category is RENEWAL, we don't show the secondary badge, but we make sure the main badge has the warning look.
  const showSecondaryRenewalTag = event.isRenewal && event.category !== Category.RENEWAL;

  return (
    <div className={`
        glass-card rounded-2xl p-6 relative group animate-slide-in
        ${event.isConflict ? '!border-red-400 !border-2 shadow-[0_0_15px_rgba(248,113,113,0.15)]' : ''}
        ${event.isPast ? 'opacity-60 grayscale-[0.5]' : ''}
    `}>
      
      {/* Top Row: Category & Actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-wrap gap-2">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-2 ${styles.bg} ${styles.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></div>
                {/* If it's a Renewal category, add the warning icon here directly */}
                {event.category === Category.RENEWAL ? (
                    <>
                        <span>⚠️</span> RENEWAL
                    </>
                ) : (
                    event.category
                )}
            </div>
            
            {showSecondaryRenewalTag && (
                <div className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-50 text-red-600 flex items-center gap-1">
                    <span>⚠️</span> Renewal
                </div>
            )}
            
            {event.isConflict && (
                 <div className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-500 text-white animate-pulse">
                    Conflict
                 </div>
            )}
            {event.isPast && (
                 <div className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-gray-200 text-gray-500">
                    Past
                 </div>
            )}
            
            {event.groupId && event.seriesIndex && event.seriesTotal && (
                 <div className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-600 flex items-center gap-1">
                    <span>🔄</span> {event.seriesIndex}/{event.seriesTotal}
                 </div>
            )}
        </div>
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          <button 
            onClick={() => { setIsEditing(!isEditing); playSound('pop'); }}
            className="p-1.5 rounded-full hover:bg-black/5 text-gray-400 hover:text-[#9CC6DB] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          </button>
          <button 
            onClick={() => { onDelete(event.id); playSound('delete'); }}
            className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="mb-5">
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <input 
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-lg font-bold text-gray-800 bg-white/50 border-b-2 border-[#9CC6DB] focus:border-[#CF4B00] outline-none py-1 transition-colors"
              autoFocus
            />
            <div className="flex gap-2">
                <input 
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="flex-1 text-sm text-gray-600 bg-white/50 border-b-2 border-[#9CC6DB] focus:border-[#CF4B00] outline-none py-1"
                />
                <input 
                  type="time"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-20 text-sm text-gray-600 bg-white/50 border-b-2 border-[#9CC6DB] focus:border-[#CF4B00] outline-none py-1"
                />
                <input 
                  type="time"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-20 text-sm text-gray-600 bg-white/50 border-b-2 border-[#9CC6DB] focus:border-[#CF4B00] outline-none py-1"
                />
            </div>
            <button 
                onClick={handleSave} 
                className="text-xs font-bold bg-[#9CC6DB] hover:bg-[#CF4B00] text-white px-4 py-1.5 rounded-full self-start mt-1 transition-colors shadow-md"
            >
                Save Changes
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-gray-800 leading-tight mb-1">{event.title}</h3>
            {hasAmount && (
               <div className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#CF4B00] to-[#DDBA7D] my-2">
                  {event.currency}{event.amount}
               </div>
            )}
            <p className="text-sm text-gray-500 leading-relaxed font-light">{event.description}</p>
            
            {event.startTime && (
                 <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#CF4B00]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    {event.startTime} {event.endTime ? `- ${event.endTime}` : ''}
                 </div>
            )}
            
            {event.isRenewal && event.expiryDate && (
                <p className="text-xs text-red-500 mt-2 font-medium">
                    ⚠️ Expires on: {event.expiryDate} (Reminder set for {event.date})
                </p>
            )}
            
            {event.aiSuggestion && (
                <div className="mt-3 p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <div>
                        <span className="font-bold">AI Suggestion:</span> {event.aiSuggestion}
                    </div>
                </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#DDBA7D]">
             <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0h18M5.25 12h13.5" />
           </svg>
           {event.date || "Anytime"}
        </div>

        <button 
           onClick={addToGoogleCalendar}
           className="group/btn flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0F9FF] hover:bg-[#9CC6DB] text-[#9CC6DB] hover:text-white transition-all duration-300"
        >
            <span className="text-[10px] font-bold hidden group-hover/btn:inline-block">Add to Calendar</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        </button>
      </div>
    </div>
  );
};

export default EventCard;
