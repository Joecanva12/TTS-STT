import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  FileAudio,
  Play,
  Pause,
  Copy,
  Check,
  Download,
  Languages,
  Wand2,
  Volume2,
  Trash2,
  Info,
  Clock,
  Sparkles,
  FileText,
  Radio,
} from 'lucide-react';
import {
  transcribeAudioApi,
  translateTextApi,
  enhanceTextApi,
} from '../services/api';
import {
  blobToBase64,
  formatSeconds,
  downloadTextFile,
  generateSrtFromText,
  getSpeechRecognition,
} from '../utils/audioUtils';
import { AudioVisualizer } from './AudioVisualizer';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../constants/languages';
import { HistoryItem } from '../types';

interface STTStudioProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  onSendToTts?: (text: string, language: string) => void;
  externalAudioBlob?: Blob | null;
  externalAudioUrl?: string | null;
}

export const STTStudio: React.FC<STTStudioProps> = ({
  onSaveHistory,
  onSendToTts,
  externalAudioBlob,
  externalAudioUrl,
}) => {
  // Input mode: 'mic' | 'file'
  const [inputMode, setInputMode] = useState<'mic' | 'file'>('mic');

  // Language settings: primary focus Urdu (Pakistan) & English (US)
  const [selectedLanguage, setSelectedLanguage] = useState('ur-PK');
  const [romanUrdu, setRomanUrdu] = useState(false);
  const [enhancePunctuation, setEnhancePunctuation] = useState(true);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

  // Audio player state for recorded/uploaded file
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Live real-time speech recognition (Web Speech API)
  const [liveInterimText, setLiveInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  // Audio context & analyser for live microphone waveform
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // File drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const isUrdu = selectedLanguage === 'ur-PK';

  // Handle external audio blob passed from TTS Studio
  useEffect(() => {
    if (externalAudioBlob && externalAudioUrl) {
      setAudioBlob(externalAudioBlob);
      setAudioUrl(externalAudioUrl);
      setInputMode('file');
      setUploadedFileName('TTS-Synthesized-Audio.wav');
    }
  }, [externalAudioBlob, externalAudioUrl]);

  // Clean up timers and audio contexts
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  const [isMicPermissionBlocked, setIsMicPermissionBlocked] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  // Load sample speech for immediate zero-friction testing
  const handleLoadSampleAudio = async (sampleLang: 'ur' | 'en') => {
    setError(null);
    setLoadingSample(true);
    try {
      const sampleText =
        sampleLang === 'ur'
          ? 'السلام علیکم! ووکس کنورٹ کی صوتی شناخت اور ترجمہ کا کامیاب ٹیسٹ۔ پاکستان زندہ باد!'
          : 'Welcome to VoxConvert Speech to Text Studio. This is a clear American English audio sample for transcription testing.';
      
      const langCode = sampleLang === 'ur' ? 'ur-PK' : 'en-US';
      const voice = sampleLang === 'ur' ? 'Kore' : 'Zephyr';

      const res = await fetch(
        `/api/v1/tts/audio?text=${encodeURIComponent(sampleText)}&language=${langCode}&voice=${voice}&internal=true`
      );

      if (!res.ok) {
        throw new Error('Could not fetch sample audio');
      }

      const blob = await res.blob();
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setUploadedFileName(sampleLang === 'ur' ? 'Urdu-Pakistan-Sample.wav' : 'English-US-Sample.wav');
      setSelectedLanguage(langCode);
      setIsMicPermissionBlocked(false);
    } catch (e: any) {
      setError('Could not load sample audio: ' + (e?.message || 'Network error'));
    } finally {
      setLoadingSample(false);
    }
  };

  // Start live microphone recording
  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setLiveInterimText('');
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsMicPermissionBlocked(true);
      setError('Microphone API is not supported in this browser window. You can load a sample audio or upload an audio file below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      setIsMicPermissionBlocked(false);

      // Web Audio Analyser for live wave visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Determine supported mime type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(recordedBlob);
        setAudioBlob(recordedBlob);
        setAudioUrl(url);

        // Stop mic tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Web Speech recognition for live real-time transcript streaming
      const SpeechRecognition = getSpeechRecognition();
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = isUrdu ? 'ur-PK' : 'en-US';

          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              current += event.results[i][0].transcript;
            }
            if (current) {
              setLiveInterimText(current);
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Live SpeechRecognition not supported or permission denied:', e);
        }
      }
    } catch (err: any) {
      console.error('Microphone error:', err);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.name === 'SecurityError' ||
        err?.message?.toLowerCase().includes('permission');

      if (isDenied) {
        setIsMicPermissionBlocked(true);
        setError(
          'Microphone permission was denied by the browser or iframe. To enable: click the lock/camera icon in your address bar and select "Allow Microphone". Or click below to test immediately with sample audio!'
        );
      } else {
        setError('Could not access microphone: ' + (err?.message || 'Device error.'));
      }
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    }
  };

  // File Upload Handler
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|webm|flac|aac)$/i)) {
      setError('Please select a valid audio file (MP3, WAV, M4A, WebM, OGG, FLAC).');
      return;
    }

    setError(null);
    setUploadedFileName(file.name);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const handleTranscribe = async () => {
    if (!audioBlob) {
      setError('No audio available to transcribe. Record your voice or upload a file.');
      return;
    }

    setError(null);
    setIsTranscribing(true);

    try {
      const base64Data = await blobToBase64(audioBlob);

      const res = await transcribeAudioApi({
        audioBase64: base64Data,
        mimeType: audioBlob.type || 'audio/webm',
        language: selectedLanguage,
        enhancePunctuation,
        romanUrdu: isUrdu && romanUrdu,
      });

      setTranscription(res.transcription);

      // Save to history vault
      onSaveHistory({
        type: 'stt',
        title: (uploadedFileName || 'Voice Recording') + ` (${res.wordCount} words)`,
        text: res.transcription,
        language: selectedLanguage,
        duration: recordingSeconds || undefined,
      });
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err?.message || 'Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTranslateTranscript = async (targetLang: 'ur-PK' | 'en-US') => {
    if (!transcription.trim()) return;
    try {
      setIsTranslating(true);
      const targetLangName = targetLang === 'ur-PK' ? 'Urdu (Pakistan)' : 'English (US)';
      const res = await translateTextApi({
        text: transcription,
        targetLanguage: targetLangName,
      });
      setTranscription(res.translatedText);
      setSelectedLanguage(targetLang);
    } catch (err: any) {
      setError('Translation failed: ' + err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSummarize = async () => {
    if (!transcription.trim()) return;
    try {
      setIsTranslating(true);
      const res = await enhanceTextApi({
        text: transcription,
        mode: 'bullet_summary',
        language: selectedLanguage,
      });
      setTranscription((prev) => `${prev}\n\n--- خلاصہ / Summary ---\n${res.result}`);
    } catch (err: any) {
      setError('Summarize failed: ' + err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = transcription.trim() ? transcription.trim().split(/\s+/).length : 0;
  const charCount = transcription.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Primary Focus Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Precision Speech-to-Text Studio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini 3.5 Transcribe
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ultra-accurate transcription for Pakistani Urdu (اردو) and American English
              </p>
            </div>
          </div>

          {/* Quick Dual Language Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 self-start sm:self-center">
            <button
              onClick={() => setSelectedLanguage('ur-PK')}
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
              onClick={() => setSelectedLanguage('en-US')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedLanguage === 'en-US'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇺🇸</span>
              <span>English (US)</span>
            </button>

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-slate-800 text-slate-300 text-xs font-medium px-2 py-1.5 rounded-xl border border-slate-700 focus:outline-none"
            >
              <option value="ur-PK">🇵🇰 Urdu (Pakistan)</option>
              <option value="en-US">🇺🇸 English (US)</option>
              {SUPPORTED_LANGUAGES.filter(
                (l) => l.code !== 'ur-PK' && l.code !== 'en-US'
              ).map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Options Bar: Roman Urdu vs Arabic Script, Punctuation */}
        {isUrdu && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
            <span className="text-slate-400 font-medium">Urdu Output Script:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRomanUrdu(false)}
                className={`px-3 py-1 rounded-lg border font-semibold transition ${
                  !romanUrdu
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                اردو رسم الخط (Nastaliq Arabic Script)
              </button>
              <button
                type="button"
                onClick={() => setRomanUrdu(true)}
                className={`px-3 py-1 rounded-lg border font-semibold transition ${
                  romanUrdu
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Roman Urdu (English Alphabet)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Audio Capture & Source */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            {/* Input Mode Selector */}
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setInputMode('mic')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                  inputMode === 'mic'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Microphone Record</span>
              </button>

              <button
                onClick={() => setInputMode('file')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                  inputMode === 'file'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Audio File Drop</span>
              </button>
            </div>

            {/* Microphone Recording View */}
            {inputMode === 'mic' && (
              <div className="text-center py-6 space-y-5">
                {/* Big Pulsing Mic Button */}
                <div className="relative inline-flex items-center justify-center">
                  {isRecording && (
                    <div className="absolute w-32 h-32 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
                  )}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
                      isRecording
                        ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-500/40 scale-105'
                        : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-indigo-500/30 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-8 h-8 fill-current" />
                        <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">
                          Stop
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-8 h-8" />
                        <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">
                          Record
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Timer & Live Frequency Wave */}
                <div className="space-y-2">
                  <div className="font-mono text-xl font-bold text-white">
                    {formatSeconds(recordingSeconds)}
                  </div>
                  <p className="text-xs text-slate-400">
                    {isRecording
                      ? `Recording in ${isUrdu ? 'Urdu (Pakistan)' : 'English (US)'}... Speak into mic`
                      : 'Click record to start speaking'}
                  </p>
                </div>

                {/* Visualizer during recording */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <AudioVisualizer
                    analyser={analyserRef.current}
                    isPlaying={isRecording}
                    height={40}
                  />
                </div>

                {/* Live Interim Transcript Stream */}
                {liveInterimText && (
                  <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-left">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">
                      Live Dictation Stream:
                    </span>
                    <p
                      dir={isUrdu ? 'rtl' : 'ltr'}
                      className={`text-xs text-slate-200 ${isUrdu ? 'font-urdu' : ''}`}
                    >
                      {liveInterimText}
                    </p>
                  </div>
                )}

                {/* Instant Sample Speech Loaders & Permission Notice */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Or test without mic:</span>
                    {loadingSample && (
                      <span className="text-cyan-400 flex items-center gap-1 font-mono">
                        <div className="w-2.5 h-2.5 rounded-full border border-cyan-400 border-t-transparent animate-spin" />
                        Loading audio...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadSampleAudio('ur')}
                      disabled={loadingSample || isRecording}
                      className="px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <span>🇵🇰</span>
                      <span className="font-urdu">پاکستانی اردو آڈیو</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadSampleAudio('en')}
                      disabled={loadingSample || isRecording}
                      className="px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <span>🇺🇸</span>
                      <span>US English Audio</span>
                    </button>
                  </div>

                  {isMicPermissionBlocked && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1.5 mt-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Info className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Microphone Permission Blocked</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        To enable live speaking: click the lock or camera icon in your browser URL bar, set <strong>Microphone</strong> to <strong>Allow</strong>, and try again.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setInputMode('file')}
                          className="text-[10px] font-bold text-cyan-300 hover:underline"
                        >
                          &rarr; Use Audio File Drop Instead
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audio File Upload View */}
            {inputMode === 'file' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                }`}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac';
                  input.onchange = (e: any) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  };
                  input.click();
                }}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Drag & Drop Audio File Here
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Supports MP3, WAV, M4A, WebM, OGG, FLAC
                </p>
                <span className="inline-block px-3 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">
                  Or Browse Files
                </span>
              </div>
            )}

            {/* Recorded / Uploaded Audio Preview Player */}
            {audioUrl && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white truncate max-w-[180px]">
                      {uploadedFileName || 'Recorded Audio Clip'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {audioBlob?.size ? `${Math.round(audioBlob.size / 1024)} KB` : ''}
                  </span>
                </div>

                <audio
                  ref={audioPreviewRef}
                  src={audioUrl}
                  controls
                  className="w-full h-9 rounded"
                />
              </div>
            )}

            {/* Transcribe Trigger Button */}
            <button
              onClick={handleTranscribe}
              disabled={!audioBlob || isTranscribing || isRecording}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/25 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition"
            >
              {isTranscribing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Transcribing with Gemini 3.5...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Transcribe Spoken Audio</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Transcription Output & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            {/* Header info & copy */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Transcribed Text
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {transcription && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
                  >
                    {copied ? (
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
                )}
              </div>
            </div>

            {/* Transcription Editor Textarea */}
            <div className="relative">
              <textarea
                rows={10}
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                dir={isUrdu && !romanUrdu ? 'rtl' : 'ltr'}
                placeholder={
                  isTranscribing
                    ? 'AI ماڈل آپ کی صوتی گفتگو کو تحریر میں تبدیل کر رہا ہے... / AI is analyzing and transcribing speech...'
                    : 'Transcribed text will appear here. You can edit, format, translate, or export as subtitles.'
                }
                className={`w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none transition leading-relaxed ${
                  isUrdu && !romanUrdu
                    ? 'font-urdu text-base sm:text-lg'
                    : 'font-sans text-sm sm:text-base'
                }`}
              />
            </div>

            {/* Quick Actions Bar */}
            {transcription && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                {/* Stats */}
                <div className="flex items-center gap-3 text-slate-400 font-mono">
                  <span>{wordCount} words</span>
                  <span>{charCount} chars</span>
                </div>

                {/* Subtitle / Text Export options */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => downloadTextFile(transcription, `transcript-${Date.now()}.txt`)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>.TXT</span>
                  </button>

                  <button
                    onClick={() => {
                      const srt = generateSrtFromText(transcription);
                      downloadTextFile(srt, `subtitles-${Date.now()}.srt`);
                    }}
                    title="Export as video subtitles with timestamps"
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>.SRT (Subtitles)</span>
                  </button>

                  <button
                    onClick={() => downloadTextFile(transcription, `transcript-${Date.now()}.md`)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>.MD</span>
                  </button>
                </div>
              </div>
            )}

            {/* Secondary actions: Send to TTS or Translate */}
            {transcription && (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
                {onSendToTts && (
                  <button
                    onClick={() => onSendToTts(transcription, selectedLanguage)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Voice This Transcript in TTS Studio</span>
                  </button>
                )}

                <button
                  onClick={() => handleTranslateTranscript(isUrdu ? 'en-US' : 'ur-PK')}
                  disabled={isTranslating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition"
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>
                    {isUrdu ? 'Translate to US English' : 'Translate to Pakistani Urdu'}
                  </span>
                </button>

                <button
                  onClick={handleSummarize}
                  disabled={isTranslating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Key Points Summary</span>
                </button>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
