
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LifeEvent, Category } from "../types";
import { addDays, addWeeks, addMonths, addYears, parseISO, format, isValid } from 'date-fns';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    is_event: {
      type: Type.BOOLEAN,
      description: "Set to true if the input describes a specific event, task, deadline, or plan.",
    },
    is_renewal: {
      type: Type.BOOLEAN,
      description: "Set to true if this is a recurring contract, warranty, insurance, subscription, or renewable document.",
    },
    title: {
      type: Type.STRING,
      description: "A short, clear title for the event. MUST BE TRANSLATED TO ENGLISH.",
    },
    date: {
      type: Type.STRING,
      description: "The date of the event in ISO 8601 format (YYYY-MM-DD).",
    },
    start_time: {
      type: Type.STRING,
      description: "The start time in HH:MM format (24h) if specified. e.g., '14:30'. Return null if not specified.",
    },
    end_time: {
      type: Type.STRING,
      description: "The end time in HH:MM format (24h) if specified. Return null if not specified.",
    },
    expiration_date: {
        type: Type.STRING,
        description: "If this is a warranty or contract, extract the specific expiration/end date (YYYY-MM-DD)."
    },
    amount: {
      type: Type.STRING,
      description: "Any monetary amount mentioned.",
    },
    currency: {
      type: Type.STRING,
      description: "The currency symbol or code.",
    },
    description: {
      type: Type.STRING,
      description: "A friendly, concise description. MUST BE TRANSLATED TO ENGLISH.",
    },
    category: {
      type: Type.STRING,
      enum: ["HEALTH", "FINANCE", "HOME", "WORK", "SOCIAL", "TRAVEL", "RENEWAL", "OTHER"],
      description: "The category of the life event.",
    },
    recurrence: {
      type: Type.OBJECT,
      description: "If the event repeats (e.g. 'every sunday', 'weekly', 'until May'), define the rule.",
      properties: {
        frequency: { type: Type.STRING, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
        interval: { type: Type.NUMBER, description: "e.g. 1 for every week, 2 for every other week." },
        until: { type: Type.STRING, description: "Date to stop repeating (YYYY-MM-DD). If user says 'until May 5th', put that date here." },
        count: { type: Type.NUMBER }
      }
    }
  },
  required: ["is_event", "title", "description", "category"],
};

const getSystemInstruction = () => {
  const today = new Date().toISOString().split('T')[0];
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return `You are a helpful Life Planner AI. 
  Today is ${dayName}, ${today}. 
  
  CRITICAL INSTRUCTION: 
  ALL OUTPUT FIELDS (Title, Description) MUST BE IN ENGLISH. 
  If the user types in French, Spanish, German, etc., you MUST translate the content to English before creating the JSON.

  Your job is to extract life events, appointments, and tasks from text or images.
  
  SPECIAL INSTRUCTION FOR WARRANTIES/CONTRACTS:
  If you detect a bill, insurance contract, warranty slip, or subscription:
  1. Identify the expiration or renewal date.
  2. Set 'is_renewal' to true.
  3. Set 'expiration_date' to that date.
  4. Categorize as 'RENEWAL'.
  
  RECURRENCE:
  If the user says "every sunday", "daily", "weekly", set the 'recurrence' object.
  Example: "Pills every sunday" -> frequency: WEEKLY, interval: 1.
  Example: "Visit Marie until 2025-05-01" -> frequency: [detect interval], until: "2025-05-01".
  
  TIMEFRAMES:
  If a time range is given (e.g. "9 to 10am"), extract start_time and end_time in HH:MM 24h format.
  
  If the input is just a greeting or irrelevant text, set is_event to false.
  If the user says "tomorrow", calculate the date based on today's date (${today}).`;
};

// Helper to clean AI response and Expand Recurrences
const processAiResponse = (event: any): Omit<LifeEvent, 'id' | 'sourceType'>[] => {
  if (!event || !event.is_event) return [];

  let baseDate = (event.date && event.date !== 'null') ? event.date : new Date().toISOString().split('T')[0];
  let isRenewal = event.is_renewal === true;
  let expiryDate = (event.expiration_date && event.expiration_date !== 'null') ? event.expiration_date : null;

  // Renewal Logic: Reminder 30 days before
  if (isRenewal && expiryDate) {
      try {
          const exp = new Date(expiryDate);
          if (!isNaN(exp.getTime())) {
              const reminderDate = new Date(exp);
              reminderDate.setDate(exp.getDate() - 30);
              baseDate = reminderDate.toISOString().split('T')[0];
          }
      } catch (e) {
          console.error("Date calculation error", e);
      }
  } else if (isRenewal && baseDate && !expiryDate) {
      // If renewal but only one date found, treat as expiry and set reminder
      expiryDate = baseDate;
      try {
        const exp = new Date(baseDate);
        if (!isNaN(exp.getTime())) {
            const reminderDate = new Date(exp);
            reminderDate.setDate(exp.getDate() - 30);
            baseDate = reminderDate.toISOString().split('T')[0];
        }
    } catch (e) {
        console.error("Date calculation error", e);
    }
  }

  const cleanString = (val: any) => {
    if (!val) return null;
    if (typeof val !== 'string') return null;
    if (val.toLowerCase() === 'null') return null;
    if (val.trim() === '') return null;
    return val;
  };

  const baseEvent: Omit<LifeEvent, 'id' | 'sourceType'> = {
    title: event.title,
    description: event.description,
    category: event.category,
    amount: cleanString(event.amount),
    currency: cleanString(event.currency),
    date: baseDate,
    startTime: cleanString(event.start_time),
    endTime: cleanString(event.end_time),
    isRenewal: isRenewal,
    expiryDate: expiryDate,
    recurrence: event.recurrence
  };

  // RECURRENCE EXPANSION
  if (event.recurrence && baseDate) {
      const freq = event.recurrence.frequency;
      const interval = event.recurrence.interval || 1;
      
      let count = event.recurrence.count || 20; // Default max limit
      // Default duration 3 months if no end date
      let until = event.recurrence.until ? parseISO(event.recurrence.until) : addMonths(new Date(), 3);

      let currentDate = parseISO(baseDate);
      
      // Safety check
      if (!isValid(currentDate)) return [baseEvent];

      // If 'until' is invalid, fallback to 3 months
      if (!isValid(until)) until = addMonths(new Date(), 3);

      const groupId = crypto.randomUUID();
      const seriesEvents: Omit<LifeEvent, 'id' | 'sourceType'>[] = [];

      let iterations = 0;
      // Loop while date is before 'until' AND count is not exceeded
      while (currentDate <= until && iterations < count) {
          seriesEvents.push({
              ...baseEvent,
              date: format(currentDate, 'yyyy-MM-dd'),
              groupId: groupId,
              seriesIndex: iterations + 1,
              // seriesTotal will be set after loop
          });

          // Increment date
          switch(freq) {
              case 'DAILY': currentDate = addDays(currentDate, interval); break;
              case 'WEEKLY': currentDate = addWeeks(currentDate, interval); break;
              case 'MONTHLY': currentDate = addMonths(currentDate, interval); break;
              case 'YEARLY': currentDate = addYears(currentDate, interval); break;
              default: iterations = count; // Break loop
          }
          iterations++;
      }
      // Assign total count to all items in this generated series
      return seriesEvents.map(e => ({ ...e, seriesTotal: seriesEvents.length }));
  }

  return [baseEvent];
};

export const analyzeText = async (text: string): Promise<Omit<LifeEvent, 'id' | 'sourceType'>[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: text }] },
      config: {
        systemInstruction: getSystemInstruction(),
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini");
    const parsed = JSON.parse(jsonText);
    return processAiResponse(parsed);
  } catch (error) {
    console.error("Gemini Text Analysis Error:", error);
    throw error;
  }
}

export const analyzeDocument = async (fileBase64: string, mimeType: string): Promise<Omit<LifeEvent, 'id' | 'sourceType'>[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType: mimeType } },
          { text: `Analyze this document/image. Extract the main event, deadline, timeframes or task. Check if it is a warranty or renewal. TRANSLATE OUTPUT TO ENGLISH.` },
        ],
      },
      config: {
        systemInstruction: getSystemInstruction(),
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini");
    const parsed = JSON.parse(jsonText);
    return processAiResponse(parsed);
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    throw error;
  }
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
  });
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType: audioBlob.type || "audio/webm" } },
          { text: "Transcribe this audio precisely into text. Return only the transcription text, no other comments." },
        ],
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};
