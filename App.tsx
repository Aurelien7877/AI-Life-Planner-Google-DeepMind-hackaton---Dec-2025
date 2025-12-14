
import React, { useState, useEffect, useMemo } from 'react';
import InputArea from './components/InputArea';
import EventCard from './components/EventCard';
import Calendar from './components/Calendar';
import CategoryFilter from './components/CategoryFilter';
import BackgroundBubbles from './components/BackgroundBubbles';
import Toast from './components/Toast';
import ConflictResolver from './components/ConflictResolver';
import { LifeEvent, ProcessingStatus, Category } from './types';
import { analyzeDocument, analyzeText, fileToBase64 } from './services/geminiService';
import { playSound } from './services/audioService';

const App: React.FC = () => {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false });
  const [filter, setFilter] = useState<Category | 'ALL'>('ALL');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // User Profile State
  const [userName, setUserName] = useState("John Doe");
  const [isEditingName, setIsEditingName] = useState(false);

  // --- Automatic Local Conflict & Past Detection ---
  useEffect(() => {
    const detectIssues = () => {
        const today = new Date().toISOString().split('T')[0];
        let hasChanges = false;

        // Create a map of updates to apply
        const updates = new Map<string, Partial<LifeEvent>>();

        // Helper to mark update
        const markUpdate = (id: string, changes: Partial<LifeEvent>) => {
            const current = events.find(e => e.id === id);
            if (!current) return;
            // Only update if value is different
            let changed = false;
            if (changes.isPast !== undefined && current.isPast !== changes.isPast) changed = true;
            if (changes.isConflict !== undefined && current.isConflict !== changes.isConflict) changed = true;
            
            if (changed) {
                updates.set(id, { ...(updates.get(id) || {}), ...changes });
                hasChanges = true;
            }
        };

        // 1. Check Past Events (For display styling only)
        events.forEach(e => {
            const isPast = !!(e.date && e.date < today);
            markUpdate(e.id, { isPast });
        });

        // 2. Check Conflicts (Overlaps)
        const byDate: Record<string, LifeEvent[]> = {};
        events.forEach(e => {
            if (e.date) {
                if (!byDate[e.date]) byDate[e.date] = [];
                byDate[e.date].push(e);
            }
        });
        
        const conflictingIds = new Set<string>();

        Object.values(byDate).forEach(dayEvents => {
            if (dayEvents.length < 2) return;
            for (let i = 0; i < dayEvents.length; i++) {
                for (let j = i + 1; j < dayEvents.length; j++) {
                    const a = dayEvents[i];
                    const b = dayEvents[j];
                    
                    // SKIP PAST EVENTS FOR CONFLICT DETECTION
                    const isAPast = !!(a.date && a.date < today);
                    const isBPast = !!(b.date && b.date < today);
                    if (isAPast || isBPast) continue;

                    // Check time overlap
                    if (a.startTime && a.endTime && b.startTime && b.endTime) {
                        if (a.startTime < b.endTime && a.endTime > b.startTime) {
                            conflictingIds.add(a.id);
                            conflictingIds.add(b.id);
                        }
                    }
                    // Same exact start time
                    else if (a.startTime && b.startTime && a.startTime === b.startTime) {
                         conflictingIds.add(a.id);
                         conflictingIds.add(b.id);
                    }
                }
            }
        });

        // Apply Conflict Updates
        events.forEach(e => {
            const isConflict = conflictingIds.has(e.id);
            markUpdate(e.id, { isConflict });
        });

        // Apply all updates in one batch
        if (hasChanges) {
            setEvents(prev => prev.map(e => updates.has(e.id) ? { ...e, ...updates.get(e.id) } : e));
        }
    };

    detectIssues();
  }, [events]); 

  const addEvent = (partialEvents: Omit<LifeEvent, 'id' | 'sourceType'>[] | Omit<LifeEvent, 'id' | 'sourceType'>, source: 'file' | 'text') => {
    const inputs = Array.isArray(partialEvents) ? partialEvents : [partialEvents];
    
    const newEvents: LifeEvent[] = inputs.map(partial => ({
      ...partial,
      id: crypto.randomUUID(),
      sourceType: source,
      description: partial.description || '',
    }));
    
    setEvents(prev => [...newEvents, ...prev]);
  };

  const handleTextSubmit = async (text: string) => {
    setStatus({ isProcessing: true });
    try {
      const results = await analyzeText(text);
      if (results && results.length > 0) {
          addEvent(results, 'text');
          
          // Check if all added events are in the past
          const today = new Date().toISOString().split('T')[0];
          const allPast = results.every(e => e.date && e.date < today);
          
          if (allPast) {
              setToastMessage("Past event detected & archived 🗄️");
              playSound('paper'); // Archiving sound
          } else {
              playSound('success');
          }
      } else {
          setToastMessage("Nothing to add here, type something else ;)");
          playSound('pop');
      }
      setStatus({ isProcessing: false });
    } catch (e) {
      console.error(e);
      setStatus({ isProcessing: false, error: 'Failed to analyze text.' });
    }
  };

  const handleFileSubmit = async (file: File) => {
    setStatus({ isProcessing: true });
    try {
      const base64 = await fileToBase64(file);
      const results = await analyzeDocument(base64, file.type);
      if (results && results.length > 0) {
          addEvent(results, 'file');
          
          // Check if all added events are in the past
          const today = new Date().toISOString().split('T')[0];
          const allPast = results.every(e => e.date && e.date < today);

          if (allPast) {
            setToastMessage("Past event detected & archived 🗄️");
            playSound('paper');
          } else {
            playSound('success');
          }
      } else {
          setToastMessage("Couldn't find an event in this document.");
          playSound('pop');
      }
      setStatus({ isProcessing: false });
    } catch (e) {
      console.error(e);
      setStatus({ isProcessing: false, error: 'Failed to analyze file.' });
    }
  };

  const handleDelete = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdate = (id: string, updated: Partial<LifeEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
  };

  // 1. Basic Filter Logic (Category & Date/Future)
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
        const matchesCategory = filter === 'ALL' || e.category === filter;
        
        if (selectedDate) {
            // Show EVERYTHING for specific date (past or future)
            return matchesCategory && e.date === selectedDate;
        } else {
            // Default view: Show only TODAY or FUTURE events.
            const today = new Date().toISOString().split('T')[0];
            const isFutureOrToday = e.date ? e.date >= today : true; // Keep undated items
            return matchesCategory && isFutureOrToday;
        }
    });
  }, [events, filter, selectedDate]);

  // 2. Sort Events by Date (Ascending)
  const sortedEvents = useMemo(() => {
      return [...filteredEvents].sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return a.date.localeCompare(b.date);
      });
  }, [filteredEvents]);

  // 3. Unique Display Logic (Grouping Recurrences)
  // If selectedDate is NULL, we group items by `groupId` and show only the FIRST (soonest).
  // If selectedDate IS set, we show all (so you see the specific instance for that day).
  const displayEvents = useMemo(() => {
      if (selectedDate) return sortedEvents;

      const seenGroups = new Set<string>();
      return sortedEvents.filter(e => {
          if (!e.groupId) return true; // Not recurrent, show it
          if (seenGroups.has(e.groupId)) return false; // Already showed the next instance of this series
          seenGroups.add(e.groupId);
          return true; // This is the first/soonest instance found
      });
  }, [sortedEvents, selectedDate]);

  return (
    <div className="min-h-screen font-sans relative overflow-hidden bg-gray-50/50">
      <BackgroundBubbles />
      
      {toastMessage && (
        <Toast 
            message={toastMessage} 
            onClose={() => setToastMessage(null)} 
        />
      )}
      
      <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:h-screen lg:overflow-hidden relative z-10">
        
        {/* LEFT COLUMN: Sidebar (Calendar & Profile) */}
        <aside className="lg:col-span-5 flex flex-col gap-6 lg:h-full lg:overflow-y-auto no-scrollbar pb-10">
          
          {/* Header Title Mobile Only */}
          <div className="lg:hidden mb-4 text-center">
             <h1 className="text-4xl font-display font-black text-gray-800 tracking-tight">AI Life Planner</h1>
             <p className="text-[#CF4B00] font-medium text-sm mt-1">Organize your chaos, beautifully.</p>
          </div>

          {/* User Profile - Static with Editable Name */}
          <div className="glass-panel p-5 rounded-3xl flex items-center gap-4">
             <div className="w-14 h-14 bg-gradient-cool rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-white">
               {userName.charAt(0)}
             </div>
             <div className="flex-1">
                {isEditingName ? (
                    <input 
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                        autoFocus
                        className="font-bold text-gray-800 text-lg bg-white/50 border-b border-[#CF4B00] outline-none w-full"
                    />
                ) : (
                    <h2 
                        className="font-bold text-gray-800 text-lg cursor-pointer hover:text-[#CF4B00] transition-colors flex items-center gap-2 group"
                        onClick={() => setIsEditingName(true)}
                        title="Click to edit name"
                    >
                        {userName}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                    </h2>
                )}
                <p className="text-xs text-[#CF4B00] font-semibold tracking-wide uppercase">Premium Plan</p>
             </div>
          </div>

          <Calendar events={events} selectedDate={selectedDate} onDateSelect={setSelectedDate} />

          {/* Assistant Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-gradient-to-br from-white/60 to-[#9CC6DB]/20">
            <h3 className="font-bold text-[#CF4B00] mb-2 text-lg">Daily Insight</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {displayEvents.length > 0 
                ? `You have ${displayEvents.length} items upcoming.`
                : selectedDate 
                    ? `You have nothing planned for ${selectedDate}.` 
                    : "Your schedule is clear. Add an event to get started."}
            </p>
          </div>
        </aside>

        {/* RIGHT COLUMN: Main Content */}
        <main className="lg:col-span-7 flex flex-col h-full lg:overflow-hidden">
          
          <header className="mb-8 hidden lg:block flex items-end justify-between">
            <div className="flex justify-between items-end w-full">
                <div>
                    <h1 className="text-7xl font-display font-black text-gray-800 tracking-tight mb-2 drop-shadow-sm">AI Life Planner</h1>
                    <p className="text-[#CF4B00] font-medium text-xl ml-1 tracking-wide">Organize your chaos, beautifully.</p>
                </div>
                <ConflictResolver 
                    events={events} 
                    onUpdateEvent={handleUpdate} 
                    onDeleteEvent={handleDelete} 
                />
            </div>
          </header>

          <InputArea 
            onTextSubmit={handleTextSubmit} 
            onFileSubmit={handleFileSubmit} 
            isProcessing={status.isProcessing} 
          />

          <CategoryFilter selected={filter} onSelect={setFilter} />
          
          {selectedDate && (
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                  <span>Filtered by date: <span className="font-bold text-gray-800">{selectedDate}</span></span>
                  <button onClick={() => setSelectedDate(null)} className="text-[#CF4B00] hover:underline text-xs">Clear Date</button>
              </div>
          )}

          {status.isProcessing && (
               <div className="text-[#CF4B00] text-sm font-bold animate-pulse text-center my-4 tracking-widest uppercase">
                 AI Analysis in Progress...
               </div>
          )}

          <div className="mt-4 flex-1 lg:overflow-y-auto no-scrollbar pb-20">
            {displayEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {displayEvents.map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                    />
                  ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                    <div className="w-32 h-32 rounded-full bg-gradient-cool flex items-center justify-center mb-6 animate-float">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="white" className="w-16 h-16">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                    <p className="font-display font-bold text-gray-800 text-2xl mb-2">No Upcoming Plans</p>
                    <p className="text-gray-500 max-w-xs mx-auto">
                        {selectedDate ? "Nothing scheduled for this specific date." : "Type a task (e.g., 'Pills every Sunday') or drop a bill to organize your life."}
                    </p>
                </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;
