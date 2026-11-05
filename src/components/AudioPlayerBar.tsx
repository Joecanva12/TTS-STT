import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Repeat,
  Share2,
  Check,
} from 'lucide-react';
import { formatSeconds, downloadAudioFile } from '../utils/audioUtils';
import { AudioVisualizer } from './AudioVisualizer';

interface AudioPlayerBarProps {
  audioUrl: string;
  audioBlob?: Blob | null;
  title?: string;
  voiceName?: string;
  language?: string;
  onSendToStt?: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  audioUrl,
  audioBlob,
  title = 'Generated Audio',
  voiceName,
  language,
  onSendToStt,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = audioUrl;
    audio.load();
    setCurrentTime(0);
    setIsPlaying(false);

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl, isLooping]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.error('Play failed:', e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume || 1;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleLoop = () => {
    const newLoop = !isLooping;
    setIsLooping(newLoop);
    if (audioRef.current) {
      audioRef.current.loop = newLoop;
    }
  };

  const handleDownload = () => {
    if (audioBlob) {
      const filename = `vox-${voiceName || 'voice'}-${Date.now()}.wav`;
      downloadAudioFile(audioBlob, filename);
    } else {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `vox-speech-${Date.now()}.wav`;
      a.click();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(audioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <audio ref={audioRef} preload="metadata" />

      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
            {language?.includes('ur') ? '🇵🇰' : '🇺🇸'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">{title}</h4>
              {voiceName && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                  Voice: {voiceName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Studio Quality WAV • 24kHz • Mono 16-bit
            </p>
          </div>
        </div>

        {/* Visualizer widget */}
        <div className="w-36 sm:w-48 hidden xs:block">
          <AudioVisualizer isPlaying={isPlaying} height={32} />
        </div>
      </div>

      {/* Scrub Bar & Time */}
      <div className="space-y-1 mb-4">
        <div className="relative group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 focus:outline-none"
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>{formatSeconds(currentTime)}</span>
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>

      {/* Control Buttons & Options */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            title="Rewind to start"
            className="p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={toggleLoop}
            title={isLooping ? 'Loop enabled' : 'Loop disabled'}
            className={`p-2 rounded-lg transition ${
              isLooping
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/50 text-xs text-slate-300 font-mono">
            {[0.75, 1, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 rounded transition ${
                  playbackRate === rate
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume & Actions */}
        <div className="flex items-center gap-3">
          {/* Volume */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 px-2 py-1 rounded-lg">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Download Audio */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold shadow-sm hover:border-cyan-500/40 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download WAV</span>
          </button>

          {onSendToStt && (
            <button
              onClick={onSendToStt}
              title="Verify or transcribe this audio in STT Studio"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send to STT</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
