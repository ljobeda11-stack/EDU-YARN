import React, { useState } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Play, Download, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { decodeBase64ToBytes, decodeAudioData, pcmToWav } from '../services/audioUtils';

interface TextToSpeechStudioProps {
  apiKey: string;
}

const VOICES = [
  { id: 'Puck', name: 'Puck', desc: 'Neutral' },
  { id: 'Kore', name: 'Kore', desc: 'Calm' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Deep' },
  { id: 'Charon', name: 'Charon', desc: 'Authoritative' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Friendly' },
];

export const TextToSpeechStudio: React.FC<TextToSpeechStudioProps> = ({ apiKey }) => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        throw new Error("No audio data returned");
      }

      // Process audio for playback and download
      const audioBytes = decodeBase64ToBytes(base64Audio);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
      
      // Convert buffer data back to WAV blob for the <audio> element src
      const channelData = audioBuffer.getChannelData(0);
      const wavBlob = pcmToWav(1, 24000, channelData.length, channelData);
      const url = URL.createObjectURL(wavBlob);
      
      setAudioUrl(url);
      audioContext.close();

    } catch (err) {
      console.error(err);
      setError("Failed to generate speech. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto p-6 space-y-8 animate-fade-in pb-12">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white drop-shadow-md">TTS Studio</h2>
        <p className="text-blue-200/80 font-light">
          Turn your lesson notes, quizzes, or announcements into high-quality audio for your students.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        {/* Left Column: Input */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="flex-1 glass-panel p-1 rounded-2xl shadow-xl flex flex-col relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 opacity-50"></div>
             <div className="flex-1 bg-black/20 rounded-xl m-1 flex flex-col">
               <label className="text-sm font-medium text-blue-200 p-4 pb-2">Script Text</label>
               <textarea 
                 className="flex-1 w-full p-4 bg-transparent border-none focus:ring-0 resize-none text-white placeholder-gray-500 leading-relaxed custom-scrollbar"
                 placeholder="Enter the text you want to convert to speech here... (e.g. 'Hello class, today we are learning about gravity.')"
                 value={text}
                 onChange={(e) => setText(e.target.value)}
                 spellCheck={false}
               />
               <div className="p-4 pt-2 text-right text-xs text-gray-500 font-mono border-t border-white/5">
                 {text.length} characters
               </div>
             </div>
          </div>
        </div>

        {/* Right Column: Controls & Output */}
        <div className="space-y-6">
          
          {/* Voice Selector */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl">
            <label className="text-sm font-semibold text-white block mb-4 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-blue-400" />
              Select Voice
            </label>
            <div className="space-y-3">
              {VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 border ${
                    selectedVoice === voice.id 
                      ? 'bg-blue-600/30 border-blue-400/50 text-white shadow-lg shadow-blue-900/20' 
                      : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="font-medium">{voice.name}</span>
                  <span className={`text-xs ${selectedVoice === voice.id ? 'text-blue-200' : 'text-gray-500'}`}>{voice.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={!text.trim() || isGenerating}
            className={`w-full py-4 rounded-xl flex items-center justify-center space-x-2 font-bold text-white shadow-lg transition-all transform active:scale-[0.98] border border-white/10 ${
              !text.trim() || isGenerating
                ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/30'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>Generate Audio</span>
              </>
            )}
          </button>

          {/* Result Player */}
          {error && (
            <div className="p-4 bg-red-500/10 text-red-200 text-sm rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          {audioUrl && (
            <div className="glass-panel p-6 rounded-2xl shadow-xl animate-slide-up border border-green-500/20 bg-green-900/10">
              <h3 className="text-sm font-semibold text-green-300 mb-4 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Ready to play
              </h3>
              
              <audio controls src={audioUrl} className="w-full mb-4 opacity-90 invert-[.95] sepia-[.2] hue-rotate-[180deg]" />
              
              <a 
                href={audioUrl} 
                download="lesson-audio.wav"
                className="flex items-center justify-center w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors border border-white/5"
              >
                <Download className="w-4 h-4 mr-2" />
                Download WAV
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
