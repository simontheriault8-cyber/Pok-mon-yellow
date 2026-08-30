import React, { useEffect, useRef } from 'react';
import { GameBoy } from '../emulator/gameboy';
import { VideoFilter } from '../emulator/types';
import { Play, Pause } from 'lucide-react';
import { GameGuidePanel } from './GameGuidePanel';

interface GbcDisplayProps {
  emulator: GameBoy | null;
  filter: VideoFilter;
  speed: number;
  notification: string | null;
  onScreenCapture?: (dataUrl: string) => void;
  onOpenRomLibrary?: () => void;
}

export const GbcDisplay = React.memo(function GbcDisplay({
  emulator,
  filter,
  notification,
  onScreenCapture,
  onOpenRomLibrary
}: GbcDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!emulator || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true,
      willReadFrequently: false 
    });
    if (!ctx) return;

    const imgData = ctx.createImageData(160, 144);
    const data32 = new Uint32Array(imgData.data.buffer);

    emulator.onFrameRender = (frameBuffer: Uint32Array) => {
      data32.set(frameBuffer);
      ctx.putImageData(imgData, 0, 0);
    };

    return () => {
      emulator.onFrameRender = undefined;
    };
  }, [emulator]);

  // Capture current canvas as screenshot data URL
  useEffect(() => {
    if (onScreenCapture && canvasRef.current) {
      // Expose screenshot capture capability
      (window as unknown as { __gbcCaptureScreenshot?: () => string }).__gbcCaptureScreenshot = () => {
        return canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
      };
    }
  }, [onScreenCapture]);

  return (
    <div className="relative w-full h-full flex-1 flex flex-col items-center justify-start bg-black overflow-y-auto overflow-x-hidden select-none p-0 sm:p-4 custom-scrollbar">
      {/* 160x144 Native Aspect Ratio Frame (10:9) scaled to fit comfortably directly below the top bar */}
      <div className="relative aspect-[10/9] w-full max-w-[540px] shrink-0 flex items-center justify-center bg-black overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] rounded-none sm:rounded-2xl border-b sm:border border-white/[0.06]">
        {/* Main GBC Framebuffer Canvas */}
        <canvas
          ref={canvasRef}
          width={160}
          height={144}
          id="gbc-canvas"
          className="w-full h-full max-w-full max-h-full object-contain pointer-events-none"
          style={{
            imageRendering: filter === 'smooth' ? 'auto' : 'pixelated',
            filter: filter === 'dmg-green' ? 'sepia(100%) hue-rotate(55deg) saturate(220%)' :
                    filter === 'gbc-color' ? 'saturate(130%) contrast(105%)' : undefined
          }}
        />

        {/* LCD Grid Pixel Matrix Overlay */}
        {filter === 'lcd-grid' && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-multiply"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.4) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(0,0,0,0.4) 1px, transparent 1px)`,
              backgroundSize: 'calc(100% / 160) calc(100% / 144)'
            }}
          />
        )}

        {/* CRT Scanline Overlay */}
        {filter === 'crt-scanlines' && (
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0px, rgba(0, 0, 0, 0.7) 1px, transparent 1px, transparent 3px)'
            }}
          />
        )}

        {/* Real-time Save/Load Notification Toast */}
        {notification && (
          <div className="absolute bottom-3 inset-x-3 text-center py-1.5 px-3 rounded-xl bg-[#0f111a]/95 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md transition-all duration-300">
            {notification}
          </div>
        )}

        {/* Paused Overlay */}
        {emulator?.isPaused && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px] flex flex-col items-center justify-center text-white gap-2">
            <Pause className="w-10 h-10 text-amber-400 animate-pulse drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-200">En Pause</span>
          </div>
        )}

        {/* No Rom Loaded State */}
        {!emulator?.cart && (
          <div 
            onClick={onOpenRomLibrary}
            className="absolute inset-0 bg-[#0d0e15] flex flex-col items-center justify-center text-zinc-400 p-6 text-center cursor-pointer group hover:bg-[#12141e] transition-colors pointer-events-auto"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.1] group-hover:border-violet-500/50 group-hover:scale-110 flex items-center justify-center mb-3 text-amber-400 shadow-inner transition-all">
              <Play className="w-6 h-6 ml-0.5 fill-current" />
            </div>
            <p className="text-sm font-bold text-zinc-100 group-hover:text-violet-300 transition-colors">
              Aucune ROM active
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-[240px]">
              Cliquez ici pour ouvrir la bibliothèque ou glissez-déposez un jeu (.gb, .gbc, .zip)
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenRomLibrary?.();
              }}
              className="mt-3 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
            >
              Choisir un jeu
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Contextual Game Guide below the screen */}
      {emulator?.cart && (
        <div className="w-full flex justify-center px-2 py-2 pb-24 sm:pb-4 pointer-events-auto">
          <GameGuidePanel emulator={emulator} />
        </div>
      )}
    </div>
  );
});
