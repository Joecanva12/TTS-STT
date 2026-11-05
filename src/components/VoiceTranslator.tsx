import React, { useState, useRef } from 'react';
import {
  Languages,
  Mic,
  Square,
  Volume2,
  ArrowRightLeft,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import {
  transcribeAudioApi,
  translateTextApi,
  generateSpeechApi,
} from '../services/api';
import { blobToBase64, base64ToBlob } from '../utils/audioUtils';
import { AudioVisualizer } from './AudioVisualizer';
import { HistoryItem } from '../types';

interface MessageBubble {
  id: string;
  sender: 'A' | 'B';
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  audioBase64?: string;
  timestamp: number;
}

interface VoiceTranslatorProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

export const VoiceTranslator: React.FC<VoiceTranslatorProps> = ({ onSaveHistory }) => {
  // Languages for Speaker A and Speaker B
  // Default: Speaker A = Urdu (Pakistan), Speaker B = English (US)
  const [langA, setLangA] = useState('ur-PK');
  const [langB, setLangB] = useState('en-US');
  const [voiceA, setVoiceA] = useState('Kore'); // Voice for translating to Urdu
  const [voiceB, setVoiceB] = useState('Zephyr'); // Voice for translating to English

  // Conversation history
  const [messages, setMessages] = useState<MessageBubble[]>([
    {
      id: 'demo-1',
      sender: 'A',
      originalText: 'السلام علیکم! کیا آپ مجھے راستہ بتا سکتے ہیں؟',
      translatedText: 'Hello! Could you please guide me with the directions?',
      sourceLang: 'ur-PK',
      targetLang: 'en-US',
      timestamp: Date.now() - 30000,
    },
    {
      id: 'demo-2',
      sender: 'B',
      originalText: 'Yes of course! Turn right at the next intersection and the station is straight ahead.',
      translatedText: 'جی بالکل! اگلے چوراہے سے دائیں مڑیں اور اسٹیشن بالکل سامنے ہے۔',
      sourceLang: 'en-US',
      targetLang: 'ur-PK',
      timestamp: Date.now() - 15000,
    },
  ]);

  // Recording state
  const [activeRecordingSender, setActiveRecordingSender] = useState<'A' | 'B' | null>(null);
  const [processingState, setProcessingState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioElemRef = useRef<HTMLAudioElement | null>(null);

  // Swap languages
  const handleSwap = () => {
    setLangA(langB);
    setLangB(langA);
  };

  const [isMicPermissionBlocked, setIsMicPermissionBlocked] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [typedSender, setTypedSender] = useState<'A' | 'B'>('A');

  // Handle direct text/simulation turn (e.g. if mic is blocked or user prefers typing)
  const handleSimulateTurn = async (sender: 'A' | 'B', textOverride?: string) => {
    setError(null);
    const sourceLang = sender === 'A' ? langA : langB;
    const targetLang = sender === 'A' ? langB : langA;
    const targetVoice = sender === 'A' ? voiceB : voiceA;

    const sampleUrdu = [
      'السلام علیکم! کیا آپ مجھے قریبی میٹرو اسٹیشن کا راستہ بتا سکتے ہیں؟',
      'جی شکریہ! کیا آپ مجھے ہوائی اڈے کا کرایہ بتا سکتے ہیں؟',
      'پاکستان ایک خوبصورت ملک ہے، آپ کا یہاں سفر کیسا رہا؟',
    ];
    const sampleEnglish = [
      'Hello! You can take the green subway line directly to the city center.',
      'Thank you! The fare is around twenty dollars and takes about 15 minutes.',
      'My trip has been fantastic, the hospitality here is wonderful!',
    ];

    const originalText =
      textOverride?.trim() ||
      (sender === 'A'
        ? sampleUrdu[Math.floor(Math.random() * sampleUrdu.length)]
        : sampleEnglish[Math.floor(Math.random() * sampleEnglish.length)]);

    try {
      setProcessingState(`Translating to ${targetLang === 'ur-PK' ? 'Urdu' : 'English'}...`);
      const targetLangLabel = targetLang === 'ur-PK' ? 'Urdu (Pakistan)' : 'English (US)';
      const translateRes = await translateTextApi({
        text: originalText,
        targetLanguage: targetLangLabel,
        sourceLanguage: sourceLang === 'ur-PK' ? 'Urdu' : 'English',
      });

      const translatedText = translateRes.translatedText.trim();

      setProcessingState('Synthesizing target voice...');
      let speechBase64: string | undefined = undefined;
      try {
        const ttsRes = await generateSpeechApi({
          text: translatedText,
          language: targetLang,
          voice: targetVoice,
          style: targetLang === 'ur-PK' ? 'Natural, polite Pakistani Urdu' : 'Natural American English',
        });
        speechBase64 = ttsRes.audioBase64;

        const audio = new Audio(`data:audio/wav;base64,${speechBase64}`);
        audio.play().catch(() => {});
        currentAudioElemRef.current = audio;
      } catch (speechErr) {
        console.warn('TTS auto play failed, text translation succeeded:', speechErr);
      }

      const newMsg: MessageBubble = {
        id: `msg-${Date.now()}`,
        sender,
        originalText,
        translatedText,
        sourceLang,
        targetLang,
        audioBase64: speechBase64,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, newMsg]);

      onSaveHistory({
        type: 'translation',
        title: `Dialogue: ${originalText.substring(0, 30)}...`,
        text: originalText,
        secondaryText: translatedText,
        language: `${sourceLang} -> ${targetLang}`,
      });
    } catch (err: any) {
      console.error('Simulate turn error:', err);
      setError(err?.message || 'Failed to process turn.');
    } finally {
      setProcessingState(null);
    }
  };

  const startRecording = async (sender: 'A' | 'B') => {
    setError(null);
    setActiveRecordingSender(sender);
    setProcessingState('Listening...');
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsMicPermissionBlocked(true);
      setError('Microphone recording is not supported in this frame. Use the simulation buttons below to test conversations.');
      setActiveRecordingSender(null);
      setProcessingState(null);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsMicPermissionBlocked(false);
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await processTurn(sender, blob);
      };

      recorder.start();
    } catch (err: any) {
      console.error('Recording error:', err);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.name === 'SecurityError' ||
        err?.message?.toLowerCase().includes('permission');

      if (isDenied) {
        setIsMicPermissionBlocked(true);
        setError('Microphone permission blocked. Click the lock/camera icon in your address bar to Allow Microphone, or use the Simulate Turn buttons below!');
      } else {
        setError('Could not access microphone: ' + (err?.message || 'Permission denied'));
      }
      setActiveRecordingSender(null);
      setProcessingState(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && activeRecordingSender) {
      mediaRecorderRef.current.stop();
      setActiveRecordingSender(null);
    }
  };

  const processTurn = async (sender: 'A' | 'B', audioBlob: Blob) => {
    try {
      const sourceLang = sender === 'A' ? langA : langB;
      const targetLang = sender === 'A' ? langB : langA;
      const targetVoice = sender === 'A' ? voiceB : voiceA;

      // 1. Transcribe
      setProcessingState('Transcribing speech...');
      const base64Audio = await blobToBase64(audioBlob);
      const sttRes = await transcribeAudioApi({
        audioBase64: base64Audio,
        mimeType: audioBlob.type || 'audio/webm',
        language: sourceLang,
      });

      const originalText = sttRes.transcription.trim();
      if (!originalText) {
        throw new Error('No audible speech detected. Please speak louder into the microphone.');
      }

      // 2. Translate
      setProcessingState(`Translating to ${targetLang === 'ur-PK' ? 'Urdu' : 'English'}...`);
      const targetLangLabel = targetLang === 'ur-PK' ? 'Urdu (Pakistan)' : 'English (US)';
      const translateRes = await translateTextApi({
        text: originalText,
        targetLanguage: targetLangLabel,
        sourceLanguage: sourceLang === 'ur-PK' ? 'Urdu' : 'English',
      });

      const translatedText = translateRes.translatedText.trim();

      // 3. Generate Speech in Target Language
      setProcessingState('Synthesizing target voice...');
      let speechBase64: string | undefined = undefined;
      try {
        const ttsRes = await generateSpeechApi({
          text: translatedText,
          language: targetLang,
          voice: targetVoice,
          style: targetLang === 'ur-PK' ? 'Natural, polite Pakistani Urdu' : 'Natural American English',
        });
        speechBase64 = ttsRes.audioBase64;

        // Auto-play the translated response aloud!
        const audio = new Audio(`data:audio/wav;base64,${speechBase64}`);
        audio.play().catch(() => {});
        currentAudioElemRef.current = audio;
      } catch (speechErr) {
        console.warn('TTS auto play failed, text translation succeeded:', speechErr);
      }

      const newMsg: MessageBubble = {
        id: `msg-${Date.now()}`,
        sender,
        originalText,
        translatedText,
        sourceLang,
        targetLang,
        audioBase64: speechBase64,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, newMsg]);

      // Save to history
      onSaveHistory({
        type: 'translation',
        title: `Dialogue: ${originalText.substring(0, 30)}...`,
        text: originalText,
        secondaryText: translatedText,
        language: `${sourceLang} -> ${targetLang}`,
      });
    } catch (err: any) {
      console.error('Translation turn error:', err);
      setError(err?.message || 'Failed to process voice turn.');
    } finally {
      setProcessingState(null);
    }
  };

  const playVoice = (base64Audio?: string) => {
    if (!base64Audio) return;
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    audio.play().catch(() => {});
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Dual Voice-to-Voice Translator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Walkie-Talkie
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Speak in Pakistani Urdu or American English and hear the instant spoken reply
              </p>
            </div>
          </div>

          {/* Language Pair Indicators */}
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 self-start sm:self-center">
            <div className="text-center">
              <span className="text-base">🇵🇰</span>
              <span className="block text-[11px] font-bold text-emerald-400 font-urdu">اردو</span>
            </div>

            <button
              onClick={handleSwap}
              title="Swap Languages"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>

            <div className="text-center">
              <span className="text-base">🇺🇸</span>
              <span className="block text-[11px] font-bold text-cyan-400">English</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl min-h-[380px] flex flex-col justify-between space-y-4">
        {/* Messages List */}
        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
          {messages.map((msg) => {
            const isSpeakerA = msg.sender === 'A';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isSpeakerA ? 'items-start' : 'items-end'
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 shadow-lg ${
                    isSpeakerA
                      ? 'bg-slate-950 border border-emerald-500/30 text-left'
                      : 'bg-indigo-950/70 border border-indigo-500/30 text-left'
                  }`}
                >
                  {/* Sender Tag */}
                  <div className="flex items-center justify-between gap-3 mb-1.5 text-[11px] font-bold">
                    <span className={isSpeakerA ? 'text-emerald-400' : 'text-cyan-400'}>
                      {isSpeakerA ? '🇵🇰 Urdu Speaker (اردو)' : '🇺🇸 English Speaker (US)'}
                    </span>
                    {msg.audioBase64 && (
                      <button
                        onClick={() => playVoice(msg.audioBase64)}
                        title="Replay Spoken Translation"
                        className="flex items-center gap-1 text-slate-400 hover:text-white transition"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[10px]">Play Voice</span>
                      </button>
                    )}
                  </div>

                  {/* Original Spoken Text */}
                  <p
                    dir={msg.sourceLang === 'ur-PK' ? 'rtl' : 'ltr'}
                    className={`text-slate-300 text-sm mb-2 ${
                      msg.sourceLang === 'ur-PK' ? 'font-urdu text-base' : ''
                    }`}
                  >
                    "{msg.originalText}"
                  </p>

                  {/* Translated Audio Text */}
                  <div
                    dir={msg.targetLang === 'ur-PK' ? 'rtl' : 'ltr'}
                    className={`p-2.5 rounded-2xl bg-black/40 border border-slate-800/80 text-white font-semibold text-sm ${
                      msg.targetLang === 'ur-PK' ? 'font-urdu text-base text-emerald-300' : 'text-cyan-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-mono text-slate-500 mb-0.5">
                      Translation & Audio:
                    </div>
                    {msg.translatedText}
                  </div>
                </div>
              </div>
            );
          })}

          {processingState && (
            <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-semibold animate-pulse">
              <Sparkles className="w-4 h-4 mr-2" />
              <span>{processingState}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Talk Buttons: Speaker A (Urdu) & Speaker B (English) */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Speaker A: Urdu (Pakistan) */}
          <button
            onClick={() => {
              if (activeRecordingSender === 'A') {
                stopRecording();
              } else {
                startRecording('A');
              }
            }}
            disabled={activeRecordingSender === 'B' || Boolean(processingState)}
            className={`flex items-center justify-center gap-3 p-4 rounded-2xl border font-bold text-sm transition-all duration-200 shadow-xl ${
              activeRecordingSender === 'A'
                ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-red-500/30'
                : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 border-emerald-500/40 text-white shadow-emerald-500/20 active:scale-95'
            } disabled:opacity-40 disabled:pointer-events-none`}
          >
            {activeRecordingSender === 'A' ? (
              <>
                <Square className="w-5 h-5 fill-current" />
                <span>اردو ریکارڈنگ روکیں (Stop)</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <div className="text-left">
                  <span className="block leading-tight font-urdu text-base">بولیں: اردو (پاکستان)</span>
                  <span className="block text-[10px] text-emerald-200 opacity-80">
                    Speaks Urdu &rarr; Translates to English
                  </span>
                </div>
              </>
            )}
          </button>

          {/* Speaker B: English (US) */}
          <button
            onClick={() => {
              if (activeRecordingSender === 'B') {
                stopRecording();
              } else {
                startRecording('B');
              }
            }}
            disabled={activeRecordingSender === 'A' || Boolean(processingState)}
            className={`flex items-center justify-center gap-3 p-4 rounded-2xl border font-bold text-sm transition-all duration-200 shadow-xl ${
              activeRecordingSender === 'B'
                ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-red-500/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:brightness-110 border-blue-500/40 text-white shadow-blue-500/20 active:scale-95'
            } disabled:opacity-40 disabled:pointer-events-none`}
          >
            {activeRecordingSender === 'B' ? (
              <>
                <Square className="w-5 h-5 fill-current" />
                <span>Stop US English Recording</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <div className="text-left">
                  <span className="block leading-tight">Speak: English (US)</span>
                  <span className="block text-[10px] text-blue-200 opacity-80 font-urdu">
                    انگریزی بولیں &rarr; اردو میں ترجمہ اور آواز
                  </span>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Zero-friction Testing Fallback / Simulation Bar */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulate dialogue without microphone:</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={Boolean(processingState) || activeRecordingSender !== null}
                onClick={() => handleSimulateTurn('A')}
                className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1"
              >
                <span>🇵🇰</span>
                <span className="font-urdu">اردو جملہ بولیں</span>
              </button>

              <button
                type="button"
                disabled={Boolean(processingState) || activeRecordingSender !== null}
                onClick={() => handleSimulateTurn('B')}
                className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1"
              >
                <span>🇺🇸</span>
                <span>Speak English Turn</span>
              </button>
            </div>
          </div>

          {/* Quick text typing input for custom turns */}
          <div className="flex items-center gap-2 pt-1">
            <select
              value={typedSender}
              onChange={(e) => setTypedSender(e.target.value as 'A' | 'B')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none"
            >
              <option value="A">🇵🇰 Speaker A (Urdu)</option>
              <option value="B">🇺🇸 Speaker B (English)</option>
            </select>

            <input
              type="text"
              placeholder={typedSender === 'A' ? 'یہاں اردو میں ٹائپ کریں...' : 'Type English message here...'}
              dir={typedSender === 'A' ? 'rtl' : 'ltr'}
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typedMessage.trim()) {
                  handleSimulateTurn(typedSender, typedMessage);
                  setTypedMessage('');
                }
              }}
              className={`flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 ${
                typedSender === 'A' ? 'font-urdu' : ''
              }`}
            />

            <button
              type="button"
              disabled={Boolean(processingState) || !typedMessage.trim()}
              onClick={() => {
                if (typedMessage.trim()) {
                  handleSimulateTurn(typedSender, typedMessage);
                  setTypedMessage('');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 disabled:opacity-50 transition"
            >
              Send Turn
            </button>
          </div>

          {isMicPermissionBlocked && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left text-xs text-amber-300">
              <strong>Notice:</strong> Microphone access was denied by your browser. You can still test the full walkie-talkie conversation above via the simulation buttons or text input! To use live voice, allow microphone access in your browser address bar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
