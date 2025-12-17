import React, { useState } from 'react';
import { Mic, Volume2, BookOpen, GraduationCap } from 'lucide-react';
import { LiveAssistant } from './components/LiveAssistant';
import { TextToSpeechStudio } from './components/TextToSpeechStudio';
import { AppMode } from './types';

// Ensure API Key is available
const API_KEY = process.env.API_KEY || '';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);

  if (!API_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center glass-panel p-8 rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white">API Key Missing</h1>
          <p className="text-gray-300">
            Please ensure <code>process.env.API_KEY</code> is configured in your environment to use EduVoice AI.
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (mode) {
      case AppMode.LIVE_ASSISTANT:
        return <LiveAssistant apiKey={API_KEY} />;
      case AppMode.TTS_STUDIO:
        return <TextToSpeechStudio apiKey={API_KEY} />;
      case AppMode.HOME:
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 space-y-12 animate-fade-in py-16">
             <div className="text-center space-y-6 max-w-2xl">
               <div className="inline-block p-4 glass-panel rounded-2xl mb-2 shadow-lg shadow-blue-500/10">
                 <GraduationCap className="w-12 h-12 text-blue-400" />
               </div>
               <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-indigo-200 tracking-tight drop-shadow-sm">
                 Welcome to EduVoice AI
               </h1>
               <p className="text-xl text-blue-200/80 font-light">
                 Your intelligent teaching companion. Brainstorm lessons in real-time or create engaging audio content for your classroom instantly.
               </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
               <button 
                 onClick={() => setMode(AppMode.LIVE_ASSISTANT)}
                 className="group relative overflow-hidden p-8 glass-panel rounded-2xl glass-panel-hover transition-all duration-300 text-left"
               >
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Mic className="w-40 h-40 text-blue-500 blur-sm" />
                 </div>
                 <div className="w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                   <Mic className="w-7 h-7 text-blue-300" />
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-2">Live Assistant</h3>
                 <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                   Roleplay scenarios, brainstorm ideas, and get instant answers with a real-time voice conversation.
                 </p>
               </button>

               <button 
                 onClick={() => setMode(AppMode.TTS_STUDIO)}
                 className="group relative overflow-hidden p-8 glass-panel rounded-2xl glass-panel-hover transition-all duration-300 text-left"
               >
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Volume2 className="w-40 h-40 text-indigo-500 blur-sm" />
                 </div>
                 <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
                   <Volume2 className="w-7 h-7 text-indigo-300" />
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-2">TTS Studio</h3>
                 <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                   Convert lesson notes and quizzes into clear, natural-sounding audio files for your students.
                 </p>
               </button>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen font-sans flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-b-0 border-white/5 shadow-lg shadow-black/5 backdrop-blur-xl bg-[#0f172a]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setMode(AppMode.HOME)}
          >
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20 group-hover:shadow-blue-600/40 transition-shadow">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-wide">
              EduVoice<span className="text-blue-400">AI</span>
            </span>
          </div>
          
          <nav className="flex space-x-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
            <button 
              onClick={() => setMode(AppMode.LIVE_ASSISTANT)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                mode === AppMode.LIVE_ASSISTANT 
                  ? 'bg-blue-600/30 text-blue-200 shadow-sm border border-blue-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Live Assistant
            </button>
            <button 
              onClick={() => setMode(AppMode.TTS_STUDIO)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                mode === AppMode.TTS_STUDIO 
                  ? 'bg-indigo-600/30 text-indigo-200 shadow-sm border border-indigo-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              TTS Studio
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden pt-20">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;