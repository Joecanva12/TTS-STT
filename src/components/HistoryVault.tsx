import React, { useState } from 'react';
import {
  History,
  Volume2,
  Mic,
  Languages,
  Trash2,
  Download,
  Copy,
  Check,
  Play,
  RotateCcw,
  Search,
  ExternalLink,
} from 'lucide-react';
import { HistoryItem } from '../types';
import { downloadAudioFile, base64ToBlob, downloadTextFile } from '../utils/audioUtils';

interface HistoryVaultProps {
  items: HistoryItem[];
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onOpenInTts: (text: string, language?: string) => void;
  onOpenInStt: (blob: Blob, text?: string) => void;
}

export const HistoryVault: React.FC<HistoryVaultProps> = ({
  items,
  onDeleteItem,
  onClearAll,
  onOpenInTts,
  onOpenInStt,
}) => {
  const [filter, setFilter] = useState<'all' | 'tts' | 'stt' | 'translation'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const filtered = items.filter((item) => {
    const matchesType = filter === 'all' || item.type === filter;
    const matchesQuery =
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.secondaryText && item.secondaryText.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesQuery;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePlay = (item: HistoryItem) => {
    if (!item.audioBase64) return;
    const audio = new Audio(`data:${item.audioMime || 'audio/wav'};base64,${item.audioBase64}`);
    setPlayingAudioId(item.id);
    audio.play();
    audio.onended = () => setPlayingAudioId(null);
  };

  const handleDownloadAudio = (item: HistoryItem) => {
    if (!item.audioBase64) return;
    const blob = base64ToBlob(item.audioBase64, item.audioMime || 'audio/wav');
    downloadAudioFile(blob, `vox-${item.type}-${item.id}.wav`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar with Filter & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Audio Vault & History Log</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {items.length} saved
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Review, replay, and export your previous speech conversions and transcripts
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all conversion history?')) {
                  onClearAll();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Vault</span>
            </button>
          )}
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'all' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter('tts')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'tts' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Text to Speech
            </button>
            <button
              onClick={() => setFilter('stt')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'stt' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Speech to Text
            </button>
            <button
              onClick={() => setFilter('translation')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'translation' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Translations
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search transcript or audio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Vault Items List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
            <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No items found in vault</p>
            <p className="text-xs text-slate-500 mt-1">
              Convert text to speech or transcribe audio to see your history logged here.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isUrdu = item.language?.includes('ur') || item.text.match(/[\u0600-\u06FF]/);
            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg hover:border-slate-700 transition space-y-3"
              >
                {/* Item Top Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        item.type === 'tts'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : item.type === 'stt'
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {item.type === 'tts' ? (
                        <Volume2 className="w-3.5 h-3.5" />
                      ) : item.type === 'stt' ? (
                        <Mic className="w-3.5 h-3.5" />
                      ) : (
                        <Languages className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {item.type === 'tts'
                        ? 'TTS Audio'
                        : item.type === 'stt'
                        ? 'STT Transcript'
                        : 'Translation'}
                    </span>
                    {item.language && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {item.language}
                      </span>
                    )}
                    {item.voiceName && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Voice: {item.voiceName}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Primary Content Text */}
                <div
                  dir={isUrdu ? 'rtl' : 'ltr'}
                  className={`p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-slate-200 text-sm leading-relaxed ${
                    isUrdu ? 'font-urdu text-base' : 'font-sans'
                  }`}
                >
                  {item.text}
                </div>

                {/* Secondary Content Text if translation */}
                {item.secondaryText && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-emerald-500/20 text-emerald-300 text-sm font-semibold">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Translation Output:
                    </span>
                    {item.secondaryText}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    {item.audioBase64 && (
                      <>
                        <button
                          onClick={() => handlePlay(item)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                            playingAudioId === item.id
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{playingAudioId === item.id ? 'Playing...' : 'Play Audio'}</span>
                        </button>

                        <button
                          onClick={() => handleDownloadAudio(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>WAV</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleCopy(item.text, item.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenInTts(item.text, item.language)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Open in TTS
                    </button>

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      title="Delete record"
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
