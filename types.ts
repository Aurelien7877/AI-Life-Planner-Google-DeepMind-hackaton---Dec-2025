
export enum Category {
  HEALTH = 'HEALTH',
  FINANCE = 'FINANCE',
  HOME = 'HOME',
  WORK = 'WORK',
  SOCIAL = 'SOCIAL',
  TRAVEL = 'TRAVEL',
  RENEWAL = 'RENEWAL',
  OTHER = 'OTHER'
}

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  until?: string;
  count?: number;
}

export interface LifeEvent {
  id: string;
  title: string;
  date: string | null; // ISO Date string YYYY-MM-DD
  startTime?: string | null; // HH:MM
  endTime?: string | null;   // HH:MM
  category: Category;
  description: string;
  amount?: string;
  currency?: string;
  sourceType: 'file' | 'text';
  
  // Recurrence
  recurrence?: RecurrenceRule;
  // Recurrence Grouping
  groupId?: string;
  seriesIndex?: number;
  seriesTotal?: number;

  // Smart Cost Warning fields
  isRenewal?: boolean;
  expiryDate?: string | null;

  // Smart Conflict & AI Suggestion fields
  isConflict?: boolean;
  isPast?: boolean;
  aiSuggestion?: string;
  suggestedDate?: string;
  suggestedStartTime?: string;
  suggestedEndTime?: string;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  message?: string;
  error?: string;
}

export interface ConflictResolution {
  eventId: string;
  issueType: 'CONFLICT'; // Removed PAST
  message: string;
  action: 'DELETE' | 'RESCHEDULE' | 'NONE';
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
}
