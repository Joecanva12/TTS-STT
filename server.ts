import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Shared Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// -------------------------------------------------------------
// API Key Storage & Management
// -------------------------------------------------------------
interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  createdAt: number;
  lastUsedAt: number | null;
  requestsCount: number;
}

const KEYS_DIR = path.join(__dirname, 'data');
const KEYS_FILE = path.join(KEYS_DIR, 'api-keys.json');

function ensureDataDir() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }
}

function loadApiKeys(): ApiKeyRecord[] {
  try {
    ensureDataDir();
    if (fs.existsSync(KEYS_FILE)) {
      const data = fs.readFileSync(KEYS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading api keys:', err);
  }

  // Initial seed key if none exists
  const initialKey: ApiKeyRecord = {
    id: 'key_default_demo',
    name: 'Default Project Key',
    key: `vox_live_${crypto.randomBytes(18).toString('hex')}`,
    keyPrefix: 'vox_live_',
    createdAt: Date.now(),
    lastUsedAt: null,
    requestsCount: 0,
  };
  saveApiKeys([initialKey]);
  return [initialKey];
}

function saveApiKeys(keys: ApiKeyRecord[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving api keys:', err);
  }
}

let apiKeysStore: ApiKeyRecord[] = loadApiKeys();

// Middleware to authenticate API keys for /api/v1/* routes
function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  // Allow internal web-ui requests without key check
  const isDirectWebCall = req.headers['x-vox-internal'] === 'true' || req.query.internal === 'true';
  if (isDirectWebCall) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-api-key'] as string | undefined;
  const queryKey = req.query.key as string | undefined;

  let providedKey: string | undefined = customHeader || queryKey;
  if (!providedKey && authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  }

  if (!providedKey) {
    return res.status(401).json({
      error: 'API key is missing. Please provide your key via "x-api-key" header or "Authorization: Bearer <key>". Generate a key in the VoxConvert API Hub.',
      code: 'AUTH_KEY_REQUIRED',
    });
  }

  const matched = apiKeysStore.find((k) => k.key === providedKey);
  if (!matched) {
    return res.status(403).json({
      error: 'Invalid API key. Please check your key or create a new one in the Developer API Hub.',
      code: 'AUTH_INVALID_KEY',
    });
  }

  // Update usage metrics
  matched.lastUsedAt = Date.now();
  matched.requestsCount += 1;
  saveApiKeys(apiKeysStore);

  (req as any).apiKeyRecord = matched;
  next();
}

// -------------------------------------------------------------
// Voice & Language Prompts Engine
// Special emphasis on Urdu (Pakistan) & English (US)
// -------------------------------------------------------------
function buildTtsStylePrompt(userStyle: string, language: string, voice: string): string {
  const isUrdu =
    language.toLowerCase().includes('ur') ||
    language.toLowerCase().includes('urdu') ||
    language.toLowerCase().includes('pk');

  const isEnglishUS =
    language.toLowerCase().includes('en-us') ||
    language.toLowerCase().includes('us') ||
    language.toLowerCase().includes('american');

  let style = userStyle?.trim() || 'Clear, natural, and expressive';

  if (isUrdu) {
    return `You are a native Pakistani Urdu voice artist. Speak natural, authentic, fluent Pakistani Urdu (اردو) with correct lahja (cadence), polite tone (adab), clear articulation of Pakistani pronunciation, and emotional depth. Style instruction: ${style}`;
  }

  if (isEnglishUS) {
    return `You are a native American English voice artist with a natural, crisp, standard US accent. Style instruction: ${style}`;
  }

  return `Speak in ${language || 'the input language'} naturally with expressive pacing. Style instruction: ${style}`;
}

// -------------------------------------------------------------
// API Key Management Routes
// -------------------------------------------------------------
app.get('/api/v1/keys', (req, res) => {
  const sanitized = apiKeysStore.map((k) => ({
    id: k.id,
    name: k.name,
    key: k.key,
    preview: `${k.key.substring(0, 13)}...${k.key.substring(k.key.length - 4)}`,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    requestsCount: k.requestsCount,
  }));
  res.json({ keys: sanitized });
});

app.post('/api/v1/keys', (req, res) => {
  const { name = 'New Project Key' } = req.body;
  const newKey: ApiKeyRecord = {
    id: `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    name: name.trim() || 'Project API Key',
    key: `vox_live_${crypto.randomBytes(20).toString('hex')}`,
    keyPrefix: 'vox_live_',
    createdAt: Date.now(),
    lastUsedAt: null,
    requestsCount: 0,
  };

  apiKeysStore.unshift(newKey);
  saveApiKeys(apiKeysStore);

  res.status(201).json({
    status: 'created',
    key: newKey,
    message: 'New VoxConvert API key generated successfully.',
  });
});

app.delete('/api/v1/keys/:id', (req, res) => {
  const { id } = req.params;
  const index = apiKeysStore.findIndex((k) => k.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'API key not found.' });
  }

  apiKeysStore.splice(index, 1);
  saveApiKeys(apiKeysStore);
  res.json({ status: 'deleted', id });
});

// -------------------------------------------------------------
// Public Developer API: Text-to-Speech
// -------------------------------------------------------------
app.post(['/api/tts', '/api/v1/tts'], authenticateApiKey, async (req, res) => {
  try {
    const {
      text,
      voice = 'Kore',
      style = 'Clear, natural, and expressive',
      language = 'en-US',
      returnAudioBuffer = false,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Field "text" is required.' });
    }

    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please check Settings > Secrets.',
      });
    }

    // Supported voices: Puck, Charon, Kore, Fenrir, Zephyr
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

    const fullStyle = buildTtsStylePrompt(style, language, chosenVoice);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: fullStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const base64Audio = candidate?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(502).json({
        error: 'No audio generated by the AI model. Please verify the prompt and try again.',
      });
    }

    // Check if client wants raw audio/wav directly (e.g. for streaming or curl pipe)
    const acceptsAudio = req.headers['accept']?.includes('audio/wav') || returnAudioBuffer;
    if (acceptsAudio) {
      const buffer = Buffer.from(base64Audio, 'base64');
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="voxconvert-speech.wav"');
      return res.send(buffer);
    }

    return res.json({
      status: 'success',
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voice: chosenVoice,
      language: language || 'en-US',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('TTS error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to synthesize speech.' });
  }
});

// GET direct audio stream endpoint for easy integration into <audio src="..."> or HTML5
app.get('/api/v1/tts/audio', authenticateApiKey, async (req, res) => {
  try {
    const text = req.query.text as string;
    const voice = (req.query.voice as string) || 'Kore';
    const language = (req.query.language as string) || 'en-US';
    const style = (req.query.style as string) || 'Clear, natural, and expressive';

    if (!text || !text.trim()) {
      return res.status(400).send('Query parameter "text" is required');
    }

    const fullStyle = buildTtsStylePrompt(style, language, voice);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: fullStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).send('Audio generation failed');
    }

    const buffer = Buffer.from(base64Audio, 'base64');
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', 'inline; filename="speech.wav"');
    return res.send(buffer);
  } catch (err: any) {
    console.error('Audio stream error:', err);
    return res.status(500).send(err?.message || 'Audio generation failed');
  }
});

// -------------------------------------------------------------
// Public Developer API: Speech-to-Text (Transcription)
// -------------------------------------------------------------
app.post(['/api/transcribe', '/api/v1/stt', '/api/v1/transcribe'], authenticateApiKey, async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType = 'audio/webm',
      language = '',
      enhancePunctuation = true,
      romanUrdu = false,
    } = req.body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Field "audioBase64" is required.' });
    }

    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please check Settings > Secrets.',
      });
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+;base64,/, '');

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: cleanBase64,
      },
    };

    const isUrdu =
      language?.toLowerCase().includes('ur') ||
      language?.toLowerCase().includes('urdu') ||
      language?.toLowerCase().includes('pk');

    let instructionParts: string[] = [
      'Transcribe this audio faithfully and accurately into text.',
    ];

    if (isUrdu) {
      if (romanUrdu) {
        instructionParts.push(
          'The audio is Pakistani Urdu. Transcribe it into clean, readable Roman Urdu (English alphabet).'
        );
      } else {
        instructionParts.push(
          'The audio is Pakistani Urdu (اردو). Transcribe it accurately in standard Urdu Arabic script with authentic Pakistani vocabulary, spelling, and grammar.'
        );
      }
    } else if (language) {
      instructionParts.push(`The audio language is expected to be: ${language}.`);
    } else {
      instructionParts.push(
        'Automatically detect the spoken language (especially Pakistani Urdu or English US if spoken).'
      );
    }

    if (enhancePunctuation) {
      instructionParts.push('Apply clean punctuation, capitalization, and natural sentence structures.');
    }

    instructionParts.push(
      'Output ONLY the transcribed text. Do NOT wrap in quotes, do not add introductory remarks.'
    );

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [audioPart, { text: instructionParts.join(' ') }],
      },
    });

    const transcription = response.text?.trim() || '';

    // Calculate word count
    const wordCount = transcription ? transcription.trim().split(/\s+/).length : 0;

    return res.json({
      status: 'success',
      transcription,
      wordCount,
      targetLanguage: language || 'auto-detected',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Transcribe error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to transcribe audio.' });
  }
});

// -------------------------------------------------------------
// Public Developer API: Translation
// -------------------------------------------------------------
app.post(['/api/translate', '/api/v1/translate'], authenticateApiKey, async (req, res) => {
  try {
    const { text, targetLanguage = 'Urdu (Pakistan)', sourceLanguage = 'auto' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Field "text" is required.' });
    }

    if (!apiKey) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const prompt = `You are a professional linguist. Translate the following text from ${sourceLanguage} into ${targetLanguage}.
If translating to Pakistani Urdu, use natural, contemporary, respectful Pakistani Urdu phrasing (سلیس اور معیاری اردو).
Maintain tone, punctuation, and meaning. Return ONLY the translated text without extra explanation:\n\n${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({
      status: 'success',
      translatedText: response.text?.trim() || '',
      targetLanguage,
    });
  } catch (err: any) {
    console.error('Translation error:', err);
    return res.status(500).json({ error: err?.message || 'Translation failed.' });
  }
});

// Enhance text endpoint
app.post(['/api/enhance', '/api/v1/enhance'], authenticateApiKey, async (req, res) => {
  try {
    const { text, mode = 'punctuate', language = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    let instruction = '';
    const isUrdu =
      language.toLowerCase().includes('ur') ||
      language.toLowerCase().includes('urdu') ||
      language.toLowerCase().includes('pk');

    if (mode === 'punctuate') {
      instruction = isUrdu
        ? 'اس اردو متن کی علامات اوقاف (رموزِ اوقاف)، املا، اور جملہ بندی درست کریں۔ صرف درست شدہ اردو متن واپس کریں:'
        : 'Fix punctuation, grammar, and formatting of this spoken transcription while keeping words natural and accurate. Output only the revised text:';
    } else if (mode === 'bullet_summary') {
      instruction = isUrdu
        ? 'اس متن کا جامع اور اہم نکات (بلیٹ پوائنٹس) پر مبنی خلاصہ اردو میں پیش کریں:'
        : 'Provide a concise bullet-point summary of this transcript. Keep it clean and clear:';
    } else if (mode === 'script_cleanup') {
      instruction = isUrdu
        ? 'اس متن کو براڈکاسٹ اور ریکارڈنگ کے لیے ایک معیاری، شائستہ تقریری اسکرپٹ کی شکل دیں:'
        : 'Format and polish this text into a broadcast-ready speech script with natural phrasing:';
    } else {
      instruction = 'Refine and proofread this text for speech synthesis:';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `${instruction}\n\n${text}`,
    });

    return res.json({
      status: 'success',
      result: response.text?.trim() || '',
    });
  } catch (err: any) {
    console.error('Enhance error:', err);
    return res.status(500).json({ error: err?.message || 'Enhance failed.' });
  }
});

// App status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    keysCount: apiKeysStore.length,
    endpoints: [
      'POST /api/v1/tts',
      'GET /api/v1/tts/audio',
      'POST /api/v1/stt',
      'POST /api/v1/translate',
      'GET /api/v1/keys',
      'POST /api/v1/keys',
    ],
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VoxConvert server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
