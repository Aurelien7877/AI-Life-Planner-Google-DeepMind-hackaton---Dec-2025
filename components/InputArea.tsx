import React, { useState, useRef } from 'react';
import { playSound } from '../services/audioService';
import { transcribeAudio } from '../services/geminiService';

interface InputAreaProps {
  onTextSubmit: (text: string) => void;
  onFileSubmit: (file: File) => void;
  isProcessing: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onTextSubmit, onFileSubmit, isProcessing }) => {
  const [text, setText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isProcessing || isTranscribing) return;
    playSound('pop');
    onTextSubmit(text);
    setText('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    playSound('paper');
    onFileSubmit(file);
  };

  const toggleRecording = async () => {
      if (isRecording) {
          // STOP RECORDING
          if (mediaRecorderRef.current) {
              mediaRecorderRef.current.stop();
              setIsRecording(false);
              playSound('pop');
          }
      } else {
          // START RECORDING
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mediaRecorder = new MediaRecorder(stream);
              mediaRecorderRef.current = mediaRecorder;
              audioChunksRef.current = [];

              mediaRecorder.ondataavailable = (e) => {
                  if (e.data.size > 0) audioChunksRef.current.push(e.data);
              };

              mediaRecorder.onstop = async () => {
                  stream.getTracks().forEach(track => track.stop());
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  
                  setIsTranscribing(true);
                  try {
                      const transcription = await transcribeAudio(audioBlob);
                      if (transcription) {
                          setText(prev => prev ? `${prev} ${transcription}` : transcription);
                          playSound('success');
                      }
                  } catch (error) {
                      console.error("Transcription failed", error);
                      alert("Could not transcribe audio.");
                  } finally {
                      setIsTranscribing(false);
                  }
              };

              mediaRecorder.start();
              setIsRecording(true);
              playSound('pop');
          } catch (err) {
              console.error("Microphone denied", err);
              alert("Microphone access denied. Please enable permissions.");
          }
      }
  };

  return (
    <div className="relative mb-8 z-20">
      <form 
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex items-center glass-panel rounded-full transition-all duration-300 p-2 pr-3
          ${isDragOver 
            ? 'ring-4 ring-[#CF4B00]/20 scale-[1.02]' 
            : 'hover:bg-white/80'}
          ${(isProcessing || isTranscribing) ? 'opacity-80' : ''}
        `}
      >
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3.5 text-gray-400 hover:text-[#9CC6DB] hover:bg-[#9CC6DB]/10 rounded-full transition-all duration-300 group shrink-0"
          title="Upload Document"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 transform group-hover:rotate-12 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
          </svg>
        </button>

        <button
            type="button"
            onClick={toggleRecording}
            disabled={isProcessing || isTranscribing}
            className={`
                p-3.5 rounded-full transition-all duration-300 shrink-0
                ${isRecording 
                    ? 'bg-red-50 text-red-500 hover:bg-red-100 animate-pulse' 
                    : 'text-gray-400 hover:text-[#CF4B00] hover:bg-[#CF4B00]/10'}
            `}
            title={isRecording ? "Stop Recording" : "Voice Input"}
        >
            {isRecording ? (
                <div className="w-6 h-6 flex items-center justify-center">
                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                </div>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
            )}
        </button>

        <input 
          type="text"
          value={text}
          onChange={(e) => {
             setText(e.target.value);
             playSound('typing');
          }}
          placeholder={
              isRecording ? "Listening..." :
              isTranscribing ? "Transcribing audio..." :
              isDragOver ? "Release to analyze file..." : 
              "Describe a task or drop a file..."
          }
          className="flex-1 bg-transparent border-none focus:ring-0 text-gray-700 placeholder-gray-400 px-2 py-3 outline-none text-lg font-light tracking-wide min-w-0"
          disabled={isProcessing || isTranscribing}
        />

        <button 
          type="submit"
          disabled={!text.trim() || isProcessing || isTranscribing}
          className={`
            p-3.5 rounded-full transition-all duration-300 flex items-center justify-center shrink-0
            ${text.trim() && !isProcessing && !isTranscribing
              ? 'bg-gradient-warm text-white hover:scale-110 active:scale-95' 
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'}
          `}
        >
          {(isProcessing || isTranscribing) ? (
             <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
             </svg>
          )}
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,application/pdf"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
        />
        
        {/* Drag Overlay Effect */}
        {isDragOver && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FCF6D9]/90 to-white/90 backdrop-blur-sm z-10 flex items-center justify-center">
                <p className="text-[#CF4B00] font-bold text-lg animate-pulse">Drop to Scan</p>
            </div>
        )}
      </form>
      
      {/* Decorative glow below input - Reduced opacity to remove shadow feel */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#CF4B00] to-[#DDBA7D] rounded-full blur opacity-0 -z-10 pointer-events-none transition duration-500 group-hover:opacity-10"></div>
    </div>
  );
};

export default InputArea;