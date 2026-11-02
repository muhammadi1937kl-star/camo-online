import React, { useState, useEffect, useRef } from 'react';
import { UserSession } from '../types';
import { 
  Play, 
  Pause, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Volume2, 
  X,
  Gauge
} from 'lucide-react';

interface SecureVideoPlayerProps {
  videoId: string;
  lessonTitle: string;
  lessonId: number;
  partNum: number;
  totalParts: number;
  user: UserSession;
  onPartComplete?: () => void;
  onNextPart?: () => void;
  onClose?: () => void;
}

export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  videoId,
  lessonTitle,
  lessonId,
  partNum,
  totalParts,
  user,
  onPartComplete,
  onNextPart,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showWatermark, setShowWatermark] = useState(true);

  // Dynamic session watermark token
  const watermarkText = `${user.userName} · ${user.login} · ID:${user.session.slice(0, 6)}`;

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Timer to mark part as completed after sufficient viewing
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasCompleted(true);
      onPartComplete?.();
    }, 45000); // через 45 сек считаем просмотренным

    return () => clearTimeout(timer);
  }, [lessonId, partNum]);

  // Anti-inspection: Disable context menu & inspect key shortcuts inside player
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Блокируем F12, Ctrl+U, Ctrl+Shift+I, Ctrl+S
      if (
        e.key === 'F12' ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'))
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Google Drive embed preview URL with no download / preview parameters
  const embedUrl = `https://drive.google.com/file/d/${videoId}/preview`;

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      className={`relative w-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl select-none transition-all duration-300 ${
        isFullscreen ? 'h-screen rounded-none' : 'aspect-video'
      }`}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950 text-white">
          <div className="w-12 h-12 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
          <div className="font-serif text-lg font-semibold tracking-wide text-amber-100">
            Загрузка защищенного видео...
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Часть {partNum} из {totalParts} · Подключение к Google Диску
          </div>
        </div>
      )}

      {/* Actual Video Iframe with Google Drive preview (no external redirection!) */}
      <iframe
        src={embedUrl}
        title={`${lessonTitle} - Часть ${partNum}`}
        className="w-full h-full border-0 relative z-10"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />

      {/* Floating Anti-Recording Dynamic Watermark */}
      {showWatermark && (
        <div
          className="absolute z-25 pointer-events-none select-none text-[11px] font-mono tracking-wider font-semibold text-white/40 bg-black/35 px-2.5 py-1 rounded-md backdrop-blur-xs border border-white/10 animate-watermark"
          style={{ willChange: 'top, left' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-pulse" />
            <span>{watermarkText}</span>
          </div>
        </div>
      )}

      {/* Top Overlay Bar */}
      <div className="absolute top-0 inset-x-0 z-20 p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between text-white pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-md bg-amber-600/90 text-white text-[11px] font-bold tracking-wider uppercase">
            Часть {partNum} из {totalParts}
          </div>
          <h3 className="text-sm font-semibold text-white/95 truncate max-w-md">
            {lessonTitle}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Защита активна</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Закрыть плеер"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Floating Bar with Next Part and Fullscreen */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 pointer-events-auto">
        {partNum < totalParts && onNextPart && (
          <button
            onClick={onNextPart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-semibold shadow-md transition-all cursor-pointer backdrop-blur-sm"
          >
            <span>Следующая часть</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white/90 hover:text-white transition-colors cursor-pointer backdrop-blur-sm"
          title={isFullscreen ? 'Свернуть' : 'Во весь экран'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
