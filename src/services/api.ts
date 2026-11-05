// Frontend API service for interacting with the backend Gemini and API management endpoints
import { ApiKeyItem } from '../types';

export interface TTSRequest {
  text: string;
  voice: string;
  style: string;
  language?: string;
}

export interface TTSResponse {
  status: string;
  audioBase64: string;
  mimeType: string;
  voice: string;
  language: string;
  timestamp: number;
}

export interface TranscribeRequest {
  audioBase64: string;
  mimeType: string;
  language?: string;
  enhancePunctuation?: boolean;
  romanUrdu?: boolean;
}

export interface TranscribeResponse {
  status: string;
  transcription: string;
  wordCount: number;
  targetLanguage: string;
  timestamp: number;
}

export interface TranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslateResponse {
  status: string;
  translatedText: string;
  targetLanguage: string;
}

export interface EnhanceRequest {
  text: string;
  mode: 'punctuate' | 'bullet_summary' | 'script_cleanup' | 'refine';
  language?: string;
}

export interface EnhanceResponse {
  status: string;
  result: string;
}

export async function checkServerStatus(): Promise<{
  status: string;
  hasApiKey: boolean;
  keysCount: number;
  endpoints: string[];
}> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Server not reachable');
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      hasApiKey: false,
      keysCount: 0,
      endpoints: [],
    };
  }
}

export async function generateSpeechApi(payload: TTSRequest): Promise<TTSResponse> {
  const res = await fetch('/api/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vox-internal': 'true',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate speech');
  }

  return data;
}

export async function transcribeAudioApi(payload: TranscribeRequest): Promise<TranscribeResponse> {
  const res = await fetch('/api/v1/stt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vox-internal': 'true',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to transcribe audio');
  }

  return data;
}

export async function translateTextApi(payload: TranslateRequest): Promise<TranslateResponse> {
  const res = await fetch('/api/v1/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vox-internal': 'true',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to translate text');
  }

  return data;
}

export async function enhanceTextApi(payload: EnhanceRequest): Promise<EnhanceResponse> {
  const res = await fetch('/api/v1/enhance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vox-internal': 'true',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to enhance text');
  }

  return data;
}

// API Key Management APIs
export async function getApiKeysApi(): Promise<ApiKeyItem[]> {
  const res = await fetch('/api/v1/keys');
  if (!res.ok) throw new Error('Failed to load API keys');
  const data = await res.json();
  return data.keys || [];
}

export async function createApiKeyApi(name: string): Promise<ApiKeyItem> {
  const res = await fetch('/api/v1/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create API key');
  const data = await res.json();
  return data.key;
}

export async function deleteApiKeyApi(id: string): Promise<void> {
  const res = await fetch(`/api/v1/keys/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete API key');
}
