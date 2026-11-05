export type ConversionMode = 'tts' | 'stt' | 'translator' | 'api' | 'history';

export type TTSEngine = 'gemini' | 'browser';

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  preview: string;
  createdAt: number;
  lastUsedAt: number | null;
  requestsCount: number;
}

export interface GeminiVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  character: string;
  description: string;
  recommendedStyles: string[];
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string; // e.g. en-US, es-ES
}

export interface VoiceStylePreset {
  id: string;
  name: string;
  prompt: string;
  iconName: string;
}

export interface TTSState {
  text: string;
  engine: TTSEngine;
  geminiVoice: string;
  browserVoiceURI: string;
  language: string;
  stylePreset: string;
  customStyle: string;
  rate: number;      // 0.5 - 2.0
  pitch: number;     // 0.5 - 2.0
  volume: number;    // 0.0 - 1.0
  audioUrl: string | null;
  audioBlob: Blob | null;
  audioBase64: string | null;
  isGenerating: boolean;
  error: string | null;
}

export interface STTState {
  audioBlob: Blob | null;
  audioUrl: string | null;
  mimeType: string;
  fileName: string | null;
  durationSeconds: number;
  isRecording: boolean;
  recordingDuration: number;
  isTranscribing: boolean;
  transcription: string;
  language: string;
  autoDetectLanguage: boolean;
  enhancePunctuation: boolean;
  generateTimestamps: boolean;
  error: string | null;
  liveInterimText: string;
}

export interface HistoryItem {
  id: string;
  type: 'tts' | 'stt' | 'translation';
  title: string;
  text: string;
  secondaryText?: string;
  audioBase64?: string;
  audioMime?: string;
  language?: string;
  voiceName?: string;
  timestamp: number;
  duration?: number;
}
