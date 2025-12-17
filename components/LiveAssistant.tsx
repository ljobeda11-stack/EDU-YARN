import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Activity, MessageSquare, Volume2 } from 'lucide-react';
import { decodeAudioData, encodeBytesToBase64, decodeBase64ToBytes } from '../services/audioUtils';

interface LiveAssistantProps {
  apiKey: string;
}

const VOICES = [
  { id: 'Puck', name: 'Puck', desc: 'Neutral' },
  { id: 'Kore', name: 'Kore', desc: 'Calm' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Deep' },
  { id: 'Charon', name: 'Charon', desc: 'Authoritative' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Friendly' },
];

// Helper for PCM blob creation for input
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ apiKey }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState('Kore');

  // Refs for audio handling to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);

  // Clean up function
  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }

    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    setIsActive(false);
    setStatus('disconnected');
    setVolumeLevel(0);
  }, []);

  const startSession = async () => {
    try {
      setStatus('connecting');
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      
      audioContextRef.current = outputCtx;
      inputContextRef.current = inputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // Setup Analyzer for visualization
      const analyzer = outputCtx.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      // Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setIsActive(true);

            // Setup Input Stream
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
              
              // Simple input visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolumeLevel(Math.sqrt(sum/inputData.length) * 5);
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
              const audioBuffer = await decodeAudioData(
                decodeBase64ToBytes(base64Audio),
                outputCtx,
                24000,
                1
              );
              
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.connect(analyzer); // Connect to analyzer
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              // Schedule playback
              const now = outputCtx.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(src => src.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = outputCtx.currentTime;
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (e) => {
            console.error(e);
            stopSession();
            setStatus('error');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          },
          systemInstruction: `You are an experienced, empathetic, and highly capable Teaching Assistant named "EduMate". 
          Your goal is to help teachers with:
          1. Brainstorming creative lesson plans.
          2. Roleplaying difficult conversations with parents or students.
          3. Simplifying complex topics for specific grade levels.
          4. Providing emotional support and stress management tips.
          Keep responses concise, encouraging, and professional.`,
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error("Connection failed", err);
      setStatus('error');
      stopSession();
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 animate-fade-in py-12">
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-white drop-shadow-lg">Live Teaching Assistant</h2>
        <p className="text-blue-200/80 max-w-lg mx-auto text-lg font-light">
          Have a real-time conversation to brainstorm lesson ideas, roleplay scenarios, or get quick answers.
        </p>
      </div>

      {/* Voice Selector */}
      <div className="flex flex-col items-center space-y-3 z-20">
        <div className="flex items-center space-x-2 text-blue-200/60 text-xs font-medium uppercase tracking-wider">
           <Volume2 className="w-3 h-3" />
           <span>Select Assistant Voice</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
          {VOICES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              disabled={isActive || status === 'connecting'}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                selectedVoice === voice.id
                  ? 'bg-blue-600/30 border-blue-400/50 text-white shadow-lg shadow-blue-900/20'
                  : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {voice.name}
            </button>
          ))}
        </div>
      </div>

      <div className="relative group">
        {/* Pulse rings */}
        {isActive && (
          <>
             <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-75 blur-xl" style={{ animationDuration: '3s' }}></div>
             <div className="absolute inset-0 rounded-full bg-blue-400/10 animate-ping opacity-50 blur-lg" style={{ animationDuration: '2s', transform: `scale(${1 + volumeLevel})` }}></div>
          </>
        )}
        
        {/* Glow effect behind button */}
        <div className={`absolute inset-0 rounded-full blur-[40px] transition-all duration-500 ${
          isActive ? 'bg-red-500/30' : 'bg-blue-500/20 group-hover:bg-blue-500/40'
        }`} />

        <button
          onClick={isActive ? stopSession : startSession}
          disabled={status === 'connecting'}
          className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md border-2 shadow-2xl ${
            isActive 
              ? 'bg-gradient-to-br from-red-600/90 to-red-800/90 border-red-400/30 hover:shadow-red-500/50' 
              : 'bg-gradient-to-br from-blue-600/90 to-indigo-800/90 border-blue-400/30 hover:scale-105 hover:shadow-blue-500/50'
          } ${status === 'connecting' ? 'opacity-80 cursor-wait' : ''}`}
        >
          {isActive ? (
            <MicOff className="w-16 h-16 text-white drop-shadow-md" />
          ) : (
            <Mic className="w-16 h-16 text-white drop-shadow-md" />
          )}
        </button>
      </div>

      <div className="h-12 flex items-center justify-center space-x-2">
        {status === 'connecting' && (
          <div className="flex items-center space-x-2 px-4 py-2 rounded-full glass-panel border-blue-500/20 text-blue-300">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"/>
            <span className="font-medium animate-pulse">Connecting to AI...</span>
          </div>
        )}
        {status === 'connected' && (
          <div className="flex items-center space-x-3 text-green-300 bg-green-500/10 px-6 py-2 rounded-full border border-green-500/20 backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="font-semibold tracking-wide">Live & Listening</span>
          </div>
        )}
        {status === 'error' && (
          <div className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 font-medium">
            Connection Error. Please try again.
          </div>
        )}
        {status === 'disconnected' && (
          <span className="text-gray-400 font-light tracking-wide">Tap microphone to start</span>
        )}
      </div>

      <div className="glass-panel p-6 rounded-2xl max-w-lg w-full transform hover:scale-[1.01] transition-transform duration-300">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/20">
            <MessageSquare className="w-5 h-5 text-blue-300 flex-shrink-0" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-white mb-2">Try asking EduMate:</p>
            <ul className="space-y-2 text-gray-300/90 font-light">
              <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full mr-2"></span>"Help me plan a 4th-grade lesson on photosynthesis."</li>
              <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full mr-2"></span>"Let's roleplay a parent-teacher conference about a disruptive student."</li>
              <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full mr-2"></span>"Give me 3 ice-breaker activities for high school history."</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
