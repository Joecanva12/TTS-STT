import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Terminal,
  Code,
  Radio,
  FileText,
  Play,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { ApiKeyItem } from '../types';
import { getApiKeysApi, createApiKeyApi, deleteApiKeyApi } from '../services/api';

interface DeveloperApiHubProps {
  appUrl?: string;
}

export const DeveloperApiHub: React.FC<DeveloperApiHubProps> = ({
  appUrl = window.location.origin,
}) => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [selectedSnippetLang, setSelectedSnippetLang] = useState<'curl' | 'python' | 'javascript' | 'html'>('curl');
  const [activeEndpoint, setActiveEndpoint] = useState<'tts' | 'stt' | 'translate'>('tts');

  // Test runner state
  const [testText, setTestText] = useState('السلام علیکم! ووکس کنورٹ اے پی آئی میں خوش آمدید۔');
  const [testLang, setTestLang] = useState('ur-PK');
  const [testVoice, setTestVoice] = useState('Kore');
  const [testRunning, setTestRunning] = useState(false);
  const [testResultAudio, setTestResultAudio] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const data = await getApiKeysApi();
      setKeys(data);
    } catch (err) {
      console.error('Failed to load keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setIsCreating(true);
      const created = await createApiKeyApi(newKeyName.trim());
      setKeys((prev) => [created, ...prev]);
      setNewKeyName('');
    } catch (err) {
      console.error('Failed to create key:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? External apps using this key will immediately stop working.')) {
      return;
    }
    try {
      await deleteApiKeyApi(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  };

  const handleCopyKey = (keyString: string, id: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const activeKey = keys[0]?.key || 'vox_live_your_api_key_here';

  // Live test runner execution
  const runLiveTest = async () => {
    setTestRunning(true);
    setTestError(null);
    setTestResultAudio(null);

    try {
      const res = await fetch('/api/v1/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': activeKey,
        },
        body: JSON.stringify({
          text: testText,
          language: testLang,
          voice: testVoice,
          style: testLang === 'ur-PK' ? 'Natural, polite and expressive Pakistani Urdu' : 'Natural, clear American English',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setTestResultAudio(`data:audio/wav;base64,${data.audioBase64}`);
    } catch (err: any) {
      setTestError(err.message || 'API call failed');
    } finally {
      setTestRunning(false);
    }
  };

  // Code snippets generator
  const getSnippets = () => {
    const origin = appUrl.replace(/\/$/, '');

    if (activeEndpoint === 'tts') {
      return {
        curl: `# Text-to-Speech API (Urdu & English)
curl -X POST "${origin}/api/v1/tts" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${activeKey}" \\
  -d '{
    "text": "السلام علیکم! پاکستان زندہ باد!",
    "language": "ur-PK",
    "voice": "Kore",
    "style": "Natural, polite and expressive Pakistani Urdu"
  }' \\
  --output speech.json

# Or stream audio/wav directly to a file:
curl -X POST "${origin}/api/v1/tts" \\
  -H "Content-Type: application/json" \\
  -H "Accept: audio/wav" \\
  -H "x-api-key: ${activeKey}" \\
  -d '{"text": "Hello from VoxConvert API!", "language": "en-US", "voice": "Zephyr"}' \\
  --output voiceover.wav`,

        python: `import requests
import base64

VOX_API_URL = "${origin}/api/v1/tts"
API_KEY = "${activeKey}"

# 1. Generate Urdu (Pakistan) Voice
payload = {
    "text": "السلام علیکم! یہ پاکستانی اردو آواز ہے",
    "language": "ur-PK",
    "voice": "Kore",
    "style": "Natural, polite and expressive Pakistani Urdu"
}

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

response = requests.post(VOX_API_URL, json=payload, headers=headers)
data = response.json()

if response.status_code == 200:
    # Save the 24kHz studio WAV audio file
    audio_bytes = base64.b64decode(data["audioBase64"])
    with open("urdu_speech.wav", "wb") as f:
        f.write(audio_bytes)
    print("Success! Audio saved as urdu_speech.wav")
else:
    print("Error:", data.get("error"))`,

        javascript: `// Node.js / Browser (Fetch)
const response = await fetch("${origin}/api/v1/tts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${activeKey}",
  },
  body: JSON.stringify({
    text: "Welcome to our AI platform powered by VoxConvert API.",
    language: "en-US", // or "ur-PK" for Pakistani Urdu
    voice: "Fenrir",
    style: "Professional and authoritative",
  }),
});

const data = await response.json();
if (response.ok) {
  // Play directly in browser:
  const audio = new Audio(\`data:audio/wav;base64,\${data.audioBase64}\`);
  audio.play();
}`,

        html: `<!-- Direct HTML5 Audio Tag Stream Embedding -->
<audio controls>
  <source 
    src="${origin}/api/v1/tts/audio?key=${activeKey}&text=Welcome%20to%20our%20project&language=en-US&voice=Kore" 
    type="audio/wav" 
  />
  Your browser does not support the audio element.
</audio>`,
      };
    } else if (activeEndpoint === 'stt') {
      return {
        curl: `# Speech-to-Text API (Urdu & English)
curl -X POST "${origin}/api/v1/stt" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${activeKey}" \\
  -d '{
    "audioBase64": "<BASE64_ENCODED_AUDIO_STRING>",
    "mimeType": "audio/wav",
    "language": "ur-PK",
    "romanUrdu": false
  }'`,

        python: `import requests
import base64

VOX_STT_URL = "${origin}/api/v1/stt"
API_KEY = "${activeKey}"

# Read local audio file (WAV, MP3, M4A, WebM)
with open("my_recording.wav", "rb") as f:
    audio_base64 = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "audioBase64": audio_base64,
    "mimeType": "audio/wav",
    "language": "ur-PK",  # or "en-US"
    "enhancePunctuation": True
}

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

response = requests.post(VOX_STT_URL, json=payload, headers=headers)
result = response.json()
print("Transcription:", result.get("transcription"))`,

        javascript: `// Transcribe audio base64
const res = await fetch("${origin}/api/v1/stt", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${activeKey}",
  },
  body: JSON.stringify({
    audioBase64: base64String,
    mimeType: "audio/webm",
    language: "ur-PK",
  }),
});

const data = await res.json();
console.log("Transcribed Text:", data.transcription);`,

        html: `<!-- Note: STT requires POST request with audio data -->
<script>
  // Post audio recording Blob to /api/v1/stt
</script>`,
      };
    } else {
      return {
        curl: `# Translation API
curl -X POST "${origin}/api/v1/translate" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${activeKey}" \\
  -d '{
    "text": "Hello, thank you for contacting our customer service.",
    "targetLanguage": "Urdu (Pakistan)"
  }'`,

        python: `import requests

response = requests.post(
    "${origin}/api/v1/translate",
    headers={"Content-Type": "application/json", "x-api-key": "${activeKey}"},
    json={
        "text": "How can I assist you today?",
        "targetLanguage": "Urdu (Pakistan)"
    }
)
print(response.json()["translatedText"])`,

        javascript: `const res = await fetch("${origin}/api/v1/translate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${activeKey}",
  },
  body: JSON.stringify({
    text: "Welcome to Pakistan!",
    targetLanguage: "Urdu (Pakistan)",
  }),
});
const data = await res.json();
console.log(data.translatedText);`,

        html: `<!-- Translation API snippet -->`,
      };
    }
  };

  const snippets = getSnippets();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold mb-3">
              <Key className="w-3.5 h-3.5" />
              <span>VoxConvert REST API & SDK Hub</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Integrate Natural Urdu & English Audio Into Your Projects
            </h2>
            <p className="mt-2 text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Use your VoxConvert API keys to programmatically generate studio-grade natural Pakistani Urdu (اردو) and American English speech, transcribe audio recordings, or embed live voice streaming into web apps, mobile apps, bots, and backends.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-left w-full sm:w-auto">
              <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">Base API Endpoint</span>
              <code className="text-xs font-mono font-semibold text-cyan-300">{appUrl}/api/v1</code>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>Your Project API Keys</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Include this key in your request headers as <code className="text-cyan-300 font-mono">x-api-key: vox_live_...</code> or <code className="text-cyan-300 font-mono">Authorization: Bearer vox_live_...</code>
            </p>
          </div>

          {/* Create new key form */}
          <form onSubmit={handleCreateKey} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. My Flutter App, Discord Bot"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-52 sm:w-64"
            />
            <button
              type="submit"
              disabled={isCreating || !newKeyName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Key</span>
            </button>
          </form>
        </div>

        {/* Keys List */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-xs">Loading API keys...</div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No API keys found. Generate your first API key above to start using VoxConvert in external projects.
            </div>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{k.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <code className="text-cyan-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {k.key}
                    </code>
                    <span>• {k.requestsCount} requests</span>
                    <span>• Created {new Date(k.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleCopyKey(k.key, k.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    {copiedKeyId === k.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    title="Revoke Key"
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Interactive API Explorer & Code Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Code Snippets & Endpoints */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Endpoint Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveEndpoint('tts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeEndpoint === 'tts'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                POST /api/v1/tts
              </button>
              <button
                onClick={() => setActiveEndpoint('stt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeEndpoint === 'stt'
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                POST /api/v1/stt
              </button>
              <button
                onClick={() => setActiveEndpoint('translate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeEndpoint === 'translate'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                POST /api/v1/translate
              </button>
            </div>

            {/* Language format tab */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs font-mono">
              {(['curl', 'python', 'javascript', 'html'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedSnippetLang(lang)}
                  className={`px-2.5 py-1 rounded transition ${
                    selectedSnippetLang === lang
                      ? 'bg-slate-700 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="relative group">
            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed max-h-[380px]">
              {snippets[selectedSnippetLang]}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(snippets[selectedSnippetLang]);
                setCopiedKeyId('snippet');
                setTimeout(() => setCopiedKeyId(null), 2000);
              }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
            >
              {copiedKeyId === 'snippet' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Notes */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Urdu (Pakistan) & English (US) Voice Parameter Guide:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>
                <strong className="text-white">language: "ur-PK"</strong>: Triggers Pakistani Urdu speech engine with natural lahja, correct adab, and Lahore/Karachi pronunciation.
              </li>
              <li>
                <strong className="text-white">language: "en-US"</strong>: Triggers natural American English speaker.
              </li>
              <li>
                <strong className="text-white">voices:</strong> "Kore" (Warm Female), "Fenrir" (Authoritative Male Baritone), "Puck" (Energetic Youth), "Charon" (Poetic/Calm), "Zephyr" (Modern Crisp).
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Live In-Browser API Test Runner */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Live API Test Runner</h3>
          </div>
          <p className="text-xs text-slate-400">
            Execute an authentic authenticated request right now using your active API key.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Language
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTestLang('ur-PK');
                    setTestText('السلام علیکم! ووکس کنورٹ کی قدرتی اردو صوتی ٹیکنالوجی۔');
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    testLang === 'ur-PK'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🇵🇰 Urdu (Pakistan)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestLang('en-US');
                    setTestText('Welcome to VoxConvert API! Ready to power your apps.');
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    testLang === 'en-US'
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🇺🇸 English (US)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Voice Character
              </label>
              <select
                value={testVoice}
                onChange={(e) => setTestVoice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Kore">Kore (Warm, Respectful - Recommended for Urdu & US)</option>
                <option value="Fenrir">Fenrir (Deep, Authoritative - News & Speeches)</option>
                <option value="Puck">Puck (Energetic, Youthful - Casual Chat)</option>
                <option value="Charon">Charon (Poetic, Calm - Urdu Adab & Meditation)</option>
                <option value="Zephyr">Zephyr (Modern, Crisp - Tech & Conversational)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Text Payload
              </label>
              <textarea
                rows={3}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                dir={testLang === 'ur-PK' ? 'rtl' : 'ltr'}
                className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 resize-none ${
                  testLang === 'ur-PK' ? 'font-urdu text-sm' : 'font-sans'
                }`}
              />
            </div>

            <button
              onClick={runLiveTest}
              disabled={testRunning || !testText.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50 transition"
            >
              {testRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Calling /api/v1/tts...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute API Test</span>
                </>
              )}
            </button>

            {testError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {testError}
              </div>
            )}

            {testResultAudio && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
                  <span>API Response 200 OK</span>
                  <span>audio/wav (24kHz)</span>
                </div>
                <audio controls src={testResultAudio} className="w-full h-9 rounded" autoPlay />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
