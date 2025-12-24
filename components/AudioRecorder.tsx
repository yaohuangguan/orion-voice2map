import React, { useState, useRef, useEffect } from 'react';
import { ProcessingStatus } from '../types';
import { translations, Language } from '../utils/translations';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  status: ProcessingStatus;
  language: Language;
  mini?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, status, language, mini = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const t = translations[language];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop()); // Stop stream
        cleanupVisualizer();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Visualizer setup
      setupVisualizer(stream);

      // Timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const setupVisualizer = (stream: MediaStream) => {
    if (!canvasRef.current) return;
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyzerRef.current = audioContextRef.current.createAnalyser();
    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
    
    sourceRef.current.connect(analyzerRef.current);
    analyzerRef.current.fftSize = 256;
    
    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const draw = () => {
      if (!analyzerRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      analyzerRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#818cf8'); // Indigo 400
        gradient.addColorStop(1, '#c084fc'); // Purple 400

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };
    
    draw();
  };

  const cleanupVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isDisabled = status === 'processing';

  // Compact Mini Mode
  if (mini) {
      return (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isDisabled}
            className={`
              relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 shadow-md
              ${isRecording 
                ? 'bg-red-500 animate-pulse' 
                : 'bg-indigo-600 hover:bg-indigo-700'}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title={isRecording ? t.stop : t.start_recording}
          >
            {isRecording ? (
               <div className="w-4 h-4 bg-white rounded-sm" />
            ) : (
               <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" /></svg>
            )}
          </button>
      );
  }

  // Full Landing Page Mode
  return (
    <div className="flex flex-col items-center justify-center w-full">
      
      {/* Visualizer / Status Area */}
      <div className="relative h-20 w-full flex items-center justify-center mb-6 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
        {isRecording ? (
           <canvas ref={canvasRef} width={300} height={80} className="w-full h-full" />
        ) : (
          <div className="text-slate-400 text-sm font-medium">
            {status === 'processing' ? t.processing : t.start_recording}
          </div>
        )}
      </div>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isDisabled}
        className={`
          relative group flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-xl shadow-indigo-200
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 scale-110 ring-4 ring-red-100' 
            : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'}
          ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
        `}
      >
        {isRecording ? (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
             <rect x="6" y="6" width="8" height="8" rx="1" />
           </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}
        
        {isRecording && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
        )}
      </button>

      {isRecording && (
        <div className="mt-4 text-slate-700 font-mono text-xl animate-pulse">
          {formatTime(recordingTime)}
        </div>
      )}
      
      {status === 'processing' && (
        <div className="mt-4 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-indigo-600 text-sm mt-2 font-medium">{t.processing}</p>
        </div>
      )}

    </div>
  );
};