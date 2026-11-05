import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TTSStudio } from './components/TTSStudio';
import { STTStudio } from './components/STTStudio';
import { VoiceTranslator } from './components/VoiceTranslator';
import { DeveloperApiHub } from './components/DeveloperApiHub';
import { HistoryVault } from './components/HistoryVault';
import { ConversionMode, HistoryItem } from './types';
import { checkServerStatus } from './services/api';
import { Sparkles, Terminal, Volume2, Mic, Code2, Globe } from 'lucide-react';

const STORAGE_KEY = 'voxconvert_studio_history_v1';

export default function App() {
  const [currentMode, setCurrentMode] = useState<ConversionMode>('tts');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [hasApiKey, setHasApiKey] = useState(true);

  // Cross-component state transfers
  const [ttsInputText, setTtsInputText] = useState<string>('');
  const [ttsInputLang, setTtsInputLang] = useState<string>('ur-PK');

  const [sttAudioBlob, setSttAudioBlob] = useState<Blob | null>(null);
  const [sttAudioUrl, setSttAudioUrl] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistoryItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse history:', e);
    }

    // Check server status
    checkServerStatus().then((res) => {
      setHasApiKey(res.hasApiKey);
    });
  }, []);

  // Save history helper
  const handleSaveHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    setHistoryItems((prev) => {
      const updated = [newItem, ...prev].slice(0, 100); // keep last 100 items
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage limit reached for history:', e);
      }
      return updated;
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistoryItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    setHistoryItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Cross-studio handoffs
  const handleSendToSttFromTts = (blob: Blob, url: string) => {
    setSttAudioBlob(blob);
    setSttAudioUrl(url);
    setCurrentMode('stt');
  };

  const handleSendToTtsFromStt = (text: string, language: string) => {
    setTtsInputText(text);
    setTtsInputLang(language);
    setCurrentMode('tts');
  };

  const handleOpenInTtsFromHistory = (text: string, language?: string) => {
    setTtsInputText(text);
    if (language) setTtsInputLang(language);
    setCurrentMode('tts');
  };

  const handleOpenInSttFromHistory = (blob: Blob) => {
    setSttAudioBlob(blob);
    setSttAudioUrl(URL.createObjectURL(blob));
    setCurrentMode('stt');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Background radial gradient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-500/10 via-indigo-500/5 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        hasApiKey={hasApiKey}
        historyCount={historyItems.length}
      />

      {/* Main Studio Workspace */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {currentMode === 'tts' && (
          <TTSStudio
            onSaveHistory={handleSaveHistory}
            onSendToStt={handleSendToSttFromTts}
            initialText={ttsInputText}
            initialLanguage={ttsInputLang}
          />
        )}

        {currentMode === 'stt' && (
          <STTStudio
            onSaveHistory={handleSaveHistory}
            onSendToTts={handleSendToTtsFromStt}
            externalAudioBlob={sttAudioBlob}
            externalAudioUrl={sttAudioUrl}
          />
        )}

        {currentMode === 'translator' && (
          <VoiceTranslator onSaveHistory={handleSaveHistory} />
        )}

        {currentMode === 'api' && (
          <DeveloperApiHub appUrl={typeof window !== 'undefined' ? window.location.origin : ''} />
        )}

        {currentMode === 'history' && (
          <HistoryVault
            items={historyItems}
            onDeleteItem={handleDeleteHistoryItem}
            onClearAll={handleClearAllHistory}
            onOpenInTts={handleOpenInTtsFromHistory}
            onOpenInStt={handleOpenInSttFromHistory}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 py-8 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-slate-300">
              <span className="text-sm">🇵🇰 اردو (Pakistan)</span>
              <span>•</span>
              <span className="text-sm">🇺🇸 English (US)</span>
            </div>
            <span>—</span>
            <span>Studio Voice Generation & Precision Transcription</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setCurrentMode('api')}
              className="hover:text-cyan-400 font-semibold transition flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Developer API Docs & Keys</span>
            </button>
            <button
              onClick={() => setCurrentMode('tts')}
              className="hover:text-slate-300 transition"
            >
              Text to Speech
            </button>
            <button
              onClick={() => setCurrentMode('stt')}
              className="hover:text-slate-300 transition"
            >
              Speech to Text
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
