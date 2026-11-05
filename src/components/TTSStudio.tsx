import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Sparkles,
  Sliders,
  Languages,
  Play,
  RotateCcw,
  Clock,
  FileText,
  Wand2,
  Download,
  Check,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  GEMINI_VOICES,
  STYLE_PRESETS,
  SAMPLE_SCRIPTS,
} from '../constants/voices';
import {
  SUPPORTED_LANGUAGES,
  ExtendedLanguageOption,
  getLanguageByCode,
} from '../constants/languages';
import {
  generateSpeechApi,
  enhanceTextApi,
  translateTextApi,
} from '../services/api';
import {
  base64ToBlob,
  speakBrowserUtterance,
} from '../utils/audioUtils';
import { AudioPlayerBar } from './AudioPlayerBar';
import { HistoryItem } from '../types';

interface TTSStudioProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  onSendToStt?: (blob: Blob, url: string) => void;
  initialText?: string;
  initialLanguage?: string;
}

export const TTSStudio: React.FC<TTSStudioProps> = ({
  onSaveHistory,
  onSendToStt,
  initialText = '',
  initialLanguage = 'ur-PK',
}) => {
  // Primary configuration
  const [text, setText] = useState(
    initialText ||
      'السلام علیکم! ووکس کنورٹ میں خوش آمدید۔ یہ ایک جدید صوتی کنورٹر ہے جو اردو اور انگریزی دونوں زبانوں کو نہایت قدرتی انداز میں بول سکتا ہے۔'
  );
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedStyle, setSelectedStyle] = useState('natural');
  const [customStyle, setCustomStyle] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Browser engine options
  const [engine, setEngine] = useState<'gemini' | 'browser'>('gemini');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string>('');

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Load browser voices if available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setBrowserVoices(voices);
        if (voices.length > 0 && !selectedBrowserVoiceURI) {
          const match =
            voices.find((v) => v.lang.startsWith(selectedLanguage.split('-')[0])) ||
            voices[0];
          setSelectedBrowserVoiceURI(match.voiceURI);
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedLanguage]);

  // Sync initialText if passed from external component (e.g. STT send-to-tts)
  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
    if (initialLanguage) {
      setSelectedLanguage(initialLanguage);
    }
  }, [initialText, initialLanguage]);

  const activeLangOption = getLanguageByCode(selectedLanguage);
  const isUrdu = selectedLanguage === 'ur-PK';

  // Words and character calculation
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 2.5)); // ~150 wpm = 2.5 wps

  const handleGenerateSpeech = async () => {
    if (!text.trim()) {
      setError('Please provide text to convert to speech.');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      if (engine === 'gemini') {
        const stylePrompt =
          customStyle.trim() ||
          STYLE_PRESETS.find((s) => s.id === selectedStyle)?.prompt ||
          'Clear, natural, and expressive speaker';

        const data = await generateSpeechApi({
          text: text.trim(),
          voice: selectedVoice,
          style: stylePrompt,
          language: selectedLanguage,
        });

        const blob = base64ToBlob(data.audioBase64, 'audio/wav');
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);

        // Record history
        onSaveHistory({
          type: 'tts',
          title: text.substring(0, 40) + (text.length > 40 ? '...' : ''),
          text: text.trim(),
          audioBase64: data.audioBase64,
          audioMime: 'audio/wav',
          language: selectedLanguage,
          voiceName: selectedVoice,
          duration: estimatedReadTime,
        });
      } else {
        // Browser Web Speech API
        const voiceObj = browserVoices.find((v) => v.voiceURI === selectedBrowserVoiceURI);
        speakBrowserUtterance(text, {
          voice: voiceObj,
          pitch,
          rate,
          volume,
          lang: activeLangOption.speechCode,
          onError: (e) => setError('Browser speech error: ' + (e?.message || 'Failed to speak')),
        });
      }
    } catch (err: any) {
      console.error('Speech generation error:', err);
      setError(err?.message || 'Failed to generate speech. Please verify settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickTranslate = async (targetLang: 'ur-PK' | 'en-US') => {
    if (!text.trim()) return;
    try {
      setIsPolishing(true);
      const targetLangName = targetLang === 'ur-PK' ? 'Urdu (Pakistan)' : 'English (US)';
      const res = await translateTextApi({
        text,
        targetLanguage: targetLangName,
      });
      setText(res.translatedText);
      setSelectedLanguage(targetLang);
    } catch (err: any) {
      setError('Translation failed: ' + err.message);
    } finally {
      setIsPolishing(false);
    }
  };

  const handlePolishText = async () => {
    if (!text.trim()) return;
    try {
      setIsPolishing(true);
      const res = await enhanceTextApi({
        text,
        mode: 'punctuate',
        language: selectedLanguage,
      });
      setText(res.result);
    } catch (err: any) {
      setError('Enhance failed: ' + err.message);
    } finally {
      setIsPolishing(false);
    }
  };

  const insertPause = (pauseTag: string) => {
    setText((prev) => prev + ` ${pauseTag} `);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Primary Focus Header: Urdu & English Quick Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Natural Text-to-Speech Studio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI Voice Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Optimized for authentic Pakistani Urdu (اردو) and American English (US)
              </p>
            </div>
          </div>

          {/* Quick Dual Language Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 self-start sm:self-center">
            <button
              onClick={() => {
                setSelectedLanguage('ur-PK');
                if (text.startsWith('Welcome') || text.includes('Hello')) {
                  setText('السلام علیکم! ووکس کنورٹ میں خوش آمدید۔ آپ کی آواز، آپ کی زبان میں۔');
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedLanguage === 'ur-PK'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇵🇰</span>
              <span>اردو (Pakistan)</span>
            </button>

            <button
              onClick={() => {
                setSelectedLanguage('en-US');
                if (text.startsWith('السلام علیکم')) {
                  setText('Welcome to VoxConvert! State of the art neural speech synthesis and recognition.');
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedLanguage === 'en-US'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇺🇸</span>
              <span>English (US)</span>
            </button>

            <div className="relative group">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="appearance-none bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 pr-6 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ur-PK">🇵🇰 Urdu (Pakistan)</option>
                <option value="en-US">🇺🇸 English (US)</option>
                <optgroup label="Other Global Languages">
                  {SUPPORTED_LANGUAGES.filter(
                    (l) => l.code !== 'ur-PK' && l.code !== 'en-US'
                  ).map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Input Area + Voice Customization Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Textarea & Toolbar */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            {/* Sample Scripts Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Load Sample Script:</span>
              </span>

              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_SCRIPTS.filter((s) =>
                  isUrdu ? s.lang === 'ur-PK' : s.lang === 'en-US'
                ).map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setText(sample.text);
                      setSelectedVoice(sample.suggestedVoice);
                      setSelectedStyle(sample.suggestedStyle);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 border border-slate-700/80 hover:border-cyan-500/40 transition"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Script Textarea */}
            <div className="relative">
              <textarea
                rows={7}
                value={text}
                onChange={(e) => setText(e.target.value)}
                dir={isUrdu ? 'rtl' : 'ltr'}
                placeholder={
                  isUrdu
                    ? 'یہاں اپنا اردو متن لکھیں یا چسپاں کریں...'
                    : 'Type or paste your text script here...'
                }
                className={`w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none transition leading-relaxed ${
                  isUrdu ? 'font-urdu text-base sm:text-lg' : 'font-sans text-sm sm:text-base'
                }`}
              />
            </div>

            {/* Editing tools: Pause tags, Polish, Quick Translate */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Add Pause:</span>
                <button
                  onClick={() => insertPause('[pause 500ms]')}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                >
                  +0.5s
                </button>
                <button
                  onClick={() => insertPause('[pause 1s]')}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                >
                  +1.0s
                </button>
                <button
                  onClick={() => insertPause('[pause 2s]')}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                >
                  +2.0s
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePolishText}
                  disabled={isPolishing || !text.trim()}
                  title="Fix punctuation and grammar"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition disabled:opacity-50"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Polish</span>
                </button>

                <button
                  onClick={() => handleQuickTranslate(isUrdu ? 'en-US' : 'ur-PK')}
                  disabled={isPolishing || !text.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition disabled:opacity-50"
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'Translate to US English' : 'Translate to Urdu'}</span>
                </button>
              </div>
            </div>

            {/* Script statistics */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-4">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Est. ~{estimatedReadTime}s</span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Generate Button */}
          <button
            onClick={handleGenerateSpeech}
            disabled={isGenerating || !text.trim()}
            className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-extrabold text-base shadow-xl shadow-cyan-500/25 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Synthesizing Natural Voice with Gemini 3.8...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Generate Natural Speech ({isUrdu ? 'اردو' : 'English'})</span>
              </>
            )}
          </button>

          {/* Audio Player Result */}
          {audioUrl && (
            <AudioPlayerBar
              audioUrl={audioUrl}
              audioBlob={audioBlob}
              title={isUrdu ? 'پاکستانی اردو صوتی ریکارڈنگ' : 'Generated American English Voiceover'}
              voiceName={selectedVoice}
              language={selectedLanguage}
              onSendToStt={
                onSendToStt && audioBlob
                  ? () => onSendToStt(audioBlob, audioUrl)
                  : undefined
              }
            />
          )}
        </div>

        {/* Right Column: Voice Customization Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Voice Customization</span>
              </h3>

              {/* Engine Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setEngine('gemini')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    engine === 'gemini'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Gemini Neural
                </button>
                <button
                  onClick={() => setEngine('browser')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    engine === 'browser'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Browser Native
                </button>
              </div>
            </div>

            {/* Neural Voices Picker */}
            {engine === 'gemini' ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Voice Persona
                </label>
                <div className="space-y-2">
                  {GEMINI_VOICES.map((v) => {
                    const isSelected = selectedVoice === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVoice(v.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                isSelected
                                  ? 'bg-cyan-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {v.name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {v.name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                  {v.gender}
                                </span>
                              </div>
                              <p className="text-[11px] text-cyan-300/80 font-medium">
                                {v.character}
                              </p>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
                          {v.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Voice Style Preset */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Voice Tone & Style Preset
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_PRESETS.map((preset) => {
                      const isPresetSelected = selectedStyle === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedStyle(preset.id);
                            setCustomStyle('');
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
                            isPresetSelected
                              ? 'bg-indigo-500/20 border-indigo-500/60 text-white'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="truncate">{preset.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Style Prompt */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-slate-400">
                    Or custom style prompt:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Energetic Pakistani sports commentator, or calm whisper"
                    value={customStyle}
                    onChange={(e) => {
                      setCustomStyle(e.target.value);
                      setSelectedStyle('');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            ) : (
              /* Browser Native Voices and Sliders */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    System Browser Voice
                  </label>
                  <select
                    value={selectedBrowserVoiceURI}
                    onChange={(e) => setSelectedBrowserVoiceURI(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {browserVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sliders */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Speed (Rate)</span>
                      <span className="font-mono text-cyan-400">{rate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={rate}
                      onChange={(e) => setRate(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Pitch</span>
                      <span className="font-mono text-cyan-400">{pitch}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.1"
                      value={pitch}
                      onChange={(e) => setPitch(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Volume</span>
                      <span className="font-mono text-cyan-400">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
