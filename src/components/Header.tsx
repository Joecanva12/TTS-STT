import React from 'react';
import { Volume2, Mic, Languages, History, Radio, Key, Sparkles } from 'lucide-react';
import { ConversionMode } from '../types';

interface HeaderProps {
  currentMode: ConversionMode;
  onSelectMode: (mode: ConversionMode) => void;
  hasApiKey: boolean;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  hasApiKey,
  historyCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onSelectMode('tts')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white">
                  Vox<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Convert</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  Studio & API
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Urdu (Pakistan) 🇵🇰 & English (US) 🇺🇸 Audio Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/70 p-1 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => onSelectMode('tts')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                currentMode === 'tts'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Text to Speech</span>
            </button>

            <button
              onClick={() => onSelectMode('stt')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                currentMode === 'stt'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Speech to Text</span>
            </button>

            <button
              onClick={() => onSelectMode('translator')}
              className={`hidden md:flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                currentMode === 'translator'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Languages className="w-4 h-4" />
              <span>Voice Talk</span>
            </button>

            <button
              onClick={() => onSelectMode('api')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                currentMode === 'api'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-slate-800/50'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>API Hub</span>
            </button>

            <button
              onClick={() => onSelectMode('history')}
              className={`relative flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                currentMode === 'history'
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Vault</span>
              {historyCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-cyan-500/20 text-cyan-400 font-bold">
                  {historyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Quick Language focus badge */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className="text-sm">🇵🇰</span>
              <span className="text-emerald-400 font-bold font-urdu">اردو</span>
              <span className="text-slate-500">•</span>
              <span className="text-sm">🇺🇸</span>
              <span className="text-cyan-300 font-bold">English</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
