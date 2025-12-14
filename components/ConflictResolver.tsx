
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LifeEvent, ConflictResolution } from '../types';
import { playSound } from '../services/audioService';

interface ConflictResolverProps {
  events: LifeEvent[];
  onUpdateEvent: (id: string, updates: Partial<LifeEvent>) => void;
  onDeleteEvent: (id: string) => void;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({ events, onUpdateEvent, onDeleteEvent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);

  // Derived state: IGNORE PAST events for conflict resolution as requested.
  const conflictCount = events.filter(e => e.isConflict).length;
  const hasIssues = conflictCount > 0;

  const getSmartSuggestion = (event: LifeEvent): ConflictResolution => {
    const today = new Date().toISOString().split('T')[0];
    let newDate = today;
    let message = '';
    
    // Only handling CONFLICT type now, no PAST.
    message = "Time overlap detected.";
    // Suggest moving to tomorrow (simple heuristic)
    const d = new Date(event.date || today);
    d.setDate(d.getDate() + 1);
    newDate = d.toISOString().split('T')[0];

    return {
        eventId: event.id,
        issueType: 'CONFLICT',
        message,
        action: 'RESCHEDULE', // Default action
        newDate,
        newStartTime: event.startTime || undefined,
        newEndTime: event.endTime || undefined
    };
  };

  const handleAudit = () => {
    playSound('pop');
    if (!hasIssues) {
        alert("Nothing to declare, chief! Your schedule is clean.");
        return;
    }

    // Local Smart Logic (Instant) - Only filtering conflicts
    const issues = events.filter(e => e.isConflict);
    const generatedResolutions = issues.map(getSmartSuggestion);
    
    setResolutions(generatedResolutions);
    setIsOpen(true);
    playSound('paper');
  };

  const applyFix = (res: ConflictResolution, manualDate?: string) => {
    playSound('success');
    if (res.action === 'DELETE') {
        onDeleteEvent(res.eventId);
    } else if (res.action === 'RESCHEDULE') {
        onUpdateEvent(res.eventId, {
            date: manualDate || res.newDate, // Use manual override if provided
            startTime: res.newStartTime,
            endTime: res.newEndTime,
            isConflict: false,
            // isPast remains unchanged or recalculated elsewhere
            aiSuggestion: undefined // Clear any old suggestion
        });
    }
    
    // Remove from list
    const remaining = resolutions.filter(r => r.eventId !== res.eventId);
    setResolutions(remaining);
    if (remaining.length === 0) {
        setTimeout(() => setIsOpen(false), 300);
    }
  };

  return (
    <>
        <button
            onClick={handleAudit}
            className={`
                relative flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg
                bg-white text-gray-700 hover:bg-gray-50 border border-gray-200
            `}
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
            Audit Schedule
            
            {hasIssues && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
        </button>

        {isOpen && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300">
                <div 
                    className="glass-panel w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative bg-white transform transition-all"
                    style={{ animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                >
                    <style>{`
                        @keyframes popIn {
                            0% { opacity: 0; transform: scale(0.9); }
                            100% { opacity: 1; transform: scale(1); }
                        }
                    `}</style>

                    <button 
                        onClick={() => setIsOpen(false)}
                        className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                    
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#9CC6DB] to-[#FCF6D9] text-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                           </svg>
                        </div>
                        <h3 className="text-2xl font-display font-bold text-gray-800">Schedule Audit</h3>
                        <p className="text-gray-500 mt-1 text-sm">Found {resolutions.length} items needing attention.</p>
                    </div>
                    
                    <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                        {resolutions.map((res) => {
                            const event = events.find(e => e.id === res.eventId);
                            if (!event) return null;
                            
                            // Generate suggestion text
                            const suggestionText = "Move to +1 Day";

                            return (
                                <ResolutionCard 
                                    key={res.eventId} 
                                    resolution={res} 
                                    eventTitle={event.title}
                                    suggestionText={suggestionText}
                                    onApply={(date) => applyFix(res, date)}
                                    onDelete={() => applyFix({ ...res, action: 'DELETE' })}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>,
            document.body
        )}
    </>
  );
};

// Sub-component for individual resolution item to handle local state (date picker)
const ResolutionCard: React.FC<{
    resolution: ConflictResolution;
    eventTitle: string;
    suggestionText: string;
    onApply: (date?: string) => void;
    onDelete: () => void;
}> = ({ resolution, eventTitle, suggestionText, onApply, onDelete }) => {
    const [manualDate, setManualDate] = useState(resolution.newDate || '');

    return (
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-gray-800 text-base truncate pr-2">{eventTitle}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0 bg-red-50 text-red-500`}>
                    {resolution.issueType}
                </span>
            </div>
            
            <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-[#CF4B00]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
                </svg>
                {resolution.message}
            </p>

            <div className="grid grid-cols-2 gap-2">
                 {/* Smart Fix Button */}
                <button 
                    onClick={() => onApply()}
                    className="col-span-2 py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-indigo-100"
                >
                    <span>✨</span> {suggestionText}
                </button>

                {/* Manual Reprogram */}
                <div className="col-span-2 flex gap-2">
                    <input 
                        type="date" 
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-[#9CC6DB]"
                    />
                    <button 
                        onClick={() => onApply(manualDate)}
                        className="bg-gray-100 hover:bg-[#9CC6DB] hover:text-white text-gray-600 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                    >
                        Set
                    </button>
                </div>

                {/* Delete Option */}
                <button 
                    onClick={onDelete}
                    className="col-span-2 mt-1 text-[10px] text-gray-400 hover:text-red-500 hover:underline text-center"
                >
                    Delete Event
                </button>
            </div>
        </div>
    );
};

export default ConflictResolver;
