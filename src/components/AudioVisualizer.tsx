import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser?: AnalyserNode | null;
  isPlaying?: boolean;
  barColor?: string;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isPlaying = false,
  barColor = '#06b6d4',
  height = 54,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      const barCount = 36;
      const barWidth = Math.max(3, (width / barCount) - 3);

      if (analyser && isPlaying) {
        // Real-time audio frequency data
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] || 0;
          const percent = value / 255;
          const barHeight = Math.max(4, percent * (h - 8));

          const x = i * (barWidth + 3) + 2;
          const y = (h - barHeight) / 2;

          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#38bdf8');
          gradient.addColorStop(0.5, '#6366f1');
          gradient.addColorStop(1, '#a855f7');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else if (isPlaying) {
        // Simulated rhythmic music visualization
        phase += 0.08;
        for (let i = 0; i < barCount; i++) {
          const wave1 = Math.sin(phase + i * 0.3);
          const wave2 = Math.cos(phase * 1.5 + i * 0.2);
          const heightFactor = Math.abs(wave1 * 0.6 + wave2 * 0.4);
          const barHeight = Math.max(4, heightFactor * (h - 10));

          const x = i * (barWidth + 3) + 2;
          const y = (h - barHeight) / 2;

          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(0.5, '#3b82f6');
          gradient.addColorStop(1, '#8b5cf6');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else {
        // Idle state: gentle low level bars
        for (let i = 0; i < barCount; i++) {
          const barHeight = 4 + (Math.sin(i * 0.4) + 1) * 2;
          const x = i * (barWidth + 3) + 2;
          const y = (h - barHeight) / 2;

          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyser, isPlaying, barColor, height]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={height}
      className="w-full max-w-full h-auto block rounded-lg"
    />
  );
};
