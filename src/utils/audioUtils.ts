// Audio utility helpers

export function base64ToBlob(base64: string, mimeType = 'audio/wav'): Blob {
  const cleanBase64 = base64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data url prefix
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function downloadAudioFile(blob: Blob, filename = 'voxconvert-audio.wav') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

export function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function generateSrtFromText(text: string, wordsPerSegment = 8): string {
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return '';

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerSegment) {
    chunks.push(words.slice(i, i + wordsPerSegment).join(' '));
  }

  let srt = '';
  let currentTime = 1; // start at 1s
  const durationPerChunk = 3.2; // approx 3.2s per 8 words

  chunks.forEach((chunk, index) => {
    const startTime = formatSrtTime(currentTime);
    const endTime = formatSrtTime(currentTime + durationPerChunk);
    srt += `${index + 1}\n${startTime} --> ${endTime}\n${chunk}\n\n`;
    currentTime += durationPerChunk + 0.3;
  });

  return srt;
}

function formatSrtTime(totalSecs: number): string {
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = Math.floor(totalSecs % 60);
  const milliseconds = Math.floor((totalSecs % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds
    .toString()
    .padStart(3, '0')}`;
}

// Browser Web Speech API Speech Recognition helper
export function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
}

// Browser Web Speech API SpeechSynthesis helper
export function speakBrowserUtterance(
  text: string,
  options: {
    voice?: SpeechSynthesisVoice | null;
    pitch?: number;
    rate?: number;
    volume?: number;
    lang?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.(new Error('Browser Speech Synthesis is not supported in this environment.'));
    return null;
  }

  window.speechSynthesis.cancel(); // Stop any pending utterance

  const utterance = new SpeechSynthesisUtterance(text);
  if (options.voice) utterance.voice = options.voice;
  if (options.pitch !== undefined) utterance.pitch = options.pitch;
  if (options.rate !== undefined) utterance.rate = options.rate;
  if (options.volume !== undefined) utterance.volume = options.volume;
  if (options.lang) utterance.lang = options.lang;

  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = (e) => options.onError?.(e);

  window.speechSynthesis.speak(utterance);
  return utterance;
}
